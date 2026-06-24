"""
GPU 节点显存容量解析与大模型部署前置校验。
"""
from __future__ import annotations

import json
import math
from typing import Any, Dict, List, Optional, Tuple

from app.config.qwen_models import QwenModelPreset

# vLLM 启动 KV cache 等额外开销预留
VRAM_SAFETY_BUFFER_GB = 2.0


def parse_gpu_info(raw: Any) -> List[Dict[str, Any]]:
    if not raw:
        return []
    if isinstance(raw, list):
        data = raw
    elif isinstance(raw, str):
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return []
    else:
        return []
    if not isinstance(data, list):
        return []
    gpus: List[Dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        total_mb = _to_float(item.get('mem_total_mb'))
        used_mb = _to_float(item.get('mem_used_mb'))
        gpus.append({
            'id': item.get('id'),
            'name': item.get('name') or '',
            'util': _to_float(item.get('util')),
            'mem_total_mb': total_mb,
            'mem_used_mb': used_mb,
            'mem_free_mb': max(0.0, total_mb - used_mb),
        })
    return gpus


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return 0.0


def _mb_to_gb(mb: float) -> float:
    return mb / 1024.0


def required_vram_gb(preset: QwenModelPreset, tensor_parallel_size: int) -> float:
    """根据模型预置与张量并行数计算所需总可用显存（GB）。"""
    tp = max(1, int(tensor_parallel_size or 1))
    rec_tp = max(1, preset.recommended_gpu_count)
    base = float(preset.min_vram_gb)
    if tp < rec_tp:
        base *= rec_tp / tp
    return math.ceil((base + VRAM_SAFETY_BUFFER_GB) * 10) / 10


def summarize_node_gpus(node: Dict[str, Any]) -> Dict[str, Any]:
    gpus = parse_gpu_info(node.get('gpuInfo'))
    total_free_mb = sum(g['mem_free_mb'] for g in gpus)
    total_vram_mb = sum(g['mem_total_mb'] for g in gpus)
    return {
        'gpu_count': len(gpus),
        'max_gpu_count': int(node.get('maxGpuCount') or 0),
        'total_vram_gb': round(_mb_to_gb(total_vram_mb), 1),
        'free_vram_gb': round(_mb_to_gb(total_free_mb), 1),
        'gpus': [
            {
                'id': g['id'],
                'name': g['name'],
                'mem_total_gb': round(_mb_to_gb(g['mem_total_mb']), 1),
                'mem_free_gb': round(_mb_to_gb(g['mem_free_mb']), 1),
                'util': g['util'],
            }
            for g in gpus
        ],
    }


def check_node_vram_for_llm(
    preset: QwenModelPreset,
    tensor_parallel_size: int,
    node: Dict[str, Any],
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    校验节点是否满足大模型部署的 GPU 数量与显存要求。

    Returns:
        (ok, message, details)
    """
    tp = max(1, int(tensor_parallel_size or 1))
    required_gb = required_vram_gb(preset, tp)
    node_name = node.get('name') or node.get('host') or f"#{node.get('id')}"
    summary = summarize_node_gpus(node)
    details: Dict[str, Any] = {
        'node_id': node.get('id'),
        'node_name': node_name,
        'node_host': node.get('host'),
        'tensor_parallel_size': tp,
        'required_vram_gb': required_gb,
        'required_gpu_count': tp,
        **summary,
    }

    status = (node.get('status') or '').lower()
    if status and status not in ('online',):
        return False, f'节点 {node_name} 当前状态为 {status}，无法部署', details

    gpus = parse_gpu_info(node.get('gpuInfo'))
    if not gpus:
        max_gpu = int(node.get('maxGpuCount') or 0)
        if max_gpu > 0 and max_gpu < tp:
            return (
                False,
                f'节点 {node_name} 配置 {max_gpu} 张 GPU，张量并行需要 {tp} 张',
                details,
            )
        return (
            False,
            f'节点 {node_name} 暂无 GPU 显存上报数据，请确认监测代理在线且 nvidia-smi 可用',
            details,
        )

    if len(gpus) < tp:
        return (
            False,
            f'节点 {node_name} 检测到 {len(gpus)} 张 GPU，张量并行需要 {tp} 张',
            details,
        )

    selected = sorted(gpus, key=lambda g: g['mem_free_mb'], reverse=True)[:tp]
    free_gb = _mb_to_gb(sum(g['mem_free_mb'] for g in selected))
    details['selected_free_vram_gb'] = round(free_gb, 1)
    details['selected_gpus'] = [
        {
            'id': g['id'],
            'name': g['name'],
            'mem_free_gb': round(_mb_to_gb(g['mem_free_mb']), 1),
            'mem_total_gb': round(_mb_to_gb(g['mem_total_mb']), 1),
        }
        for g in selected
    ]

    if free_gb + 0.05 < required_gb:
        return (
            False,
            (
                f'节点 {node_name} 显存不足：{preset.label} 部署约需 {required_gb:.1f} GB 可用显存'
                f'（{tp} 卡张量并行），所选 GPU 剩余合计 {free_gb:.1f} GB'
            ),
            details,
        )

    fair_share_gb = required_gb / tp
    for g in selected:
        gpu_free_gb = _mb_to_gb(g['mem_free_mb'])
        if gpu_free_gb + 0.05 < fair_share_gb * 0.85:
            return (
                False,
                (
                    f'节点 {node_name} GPU #{g["id"]} 剩余显存 {gpu_free_gb:.1f} GB 偏低，'
                    f'无法满足 {tp} 卡张量并行的均衡分配（每卡约需 {fair_share_gb:.1f} GB）'
                ),
                details,
            )

    details['sufficient'] = True
    return (
        True,
        (
            f'节点 {node_name} 显存满足要求：需要 {required_gb:.1f} GB，'
            f'所选 {tp} 张 GPU 剩余合计 {free_gb:.1f} GB'
        ),
        details,
    )
