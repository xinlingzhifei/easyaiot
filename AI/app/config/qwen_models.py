"""
Qwen 大模型预置目录 — GPU 节点一键部署可选版本。
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass(frozen=True)
class QwenModelPreset:
    key: str
    label: str
    hf_model_id: str
    model_type: str  # text | vision | multimodal
    min_vram_gb: int
    recommended_gpu_count: int
    max_model_len_default: int
    description: str = ''


QWEN_MODEL_PRESETS: List[QwenModelPreset] = [
    # ---------- Qwen3 文本（推荐 Instruct-2507，纯指令模式、长上下文） ----------
    QwenModelPreset(
        key='qwen3-0.6b',
        label='Qwen3-0.6B',
        hf_model_id='Qwen/Qwen3-0.6B',
        model_type='text',
        min_vram_gb=2,
        recommended_gpu_count=1,
        max_model_len_default=32768,
        description='Qwen3 超轻量模型，支持思考/非思考双模式（vLLM 可关闭思考）',
    ),
    QwenModelPreset(
        key='qwen3-1.7b',
        label='Qwen3-1.7B',
        hf_model_id='Qwen/Qwen3-1.7B',
        model_type='text',
        min_vram_gb=4,
        recommended_gpu_count=1,
        max_model_len_default=32768,
        description='Qwen3 小型模型，32K 上下文',
    ),
    QwenModelPreset(
        key='qwen3-4b-instruct-2507',
        label='Qwen3-4B-Instruct-2507',
        hf_model_id='Qwen/Qwen3-4B-Instruct-2507',
        model_type='text',
        min_vram_gb=10,
        recommended_gpu_count=1,
        max_model_len_default=32768,
        description='Qwen3 推荐入门版，纯 Instruct 模式，原生 262K 上下文，性能对标 Qwen2.5-72B',
    ),
    QwenModelPreset(
        key='qwen3-8b',
        label='Qwen3-8B',
        hf_model_id='Qwen/Qwen3-8B',
        model_type='text',
        min_vram_gb=18,
        recommended_gpu_count=1,
        max_model_len_default=32768,
        description='Qwen3 通用 8B，128K 上下文，支持思考/非思考切换',
    ),
    QwenModelPreset(
        key='qwen3-14b',
        label='Qwen3-14B',
        hf_model_id='Qwen/Qwen3-14B',
        model_type='text',
        min_vram_gb=30,
        recommended_gpu_count=1,
        max_model_len_default=32768,
        description='Qwen3 中等规模，128K 上下文',
    ),
    QwenModelPreset(
        key='qwen3-32b',
        label='Qwen3-32B',
        hf_model_id='Qwen/Qwen3-32B',
        model_type='text',
        min_vram_gb=68,
        recommended_gpu_count=2,
        max_model_len_default=32768,
        description='Qwen3 大规模稠密模型，建议 2 卡张量并行',
    ),
    QwenModelPreset(
        key='qwen3-30b-a3b-instruct-2507',
        label='Qwen3-30B-A3B-Instruct-2507',
        hf_model_id='Qwen/Qwen3-30B-A3B-Instruct-2507',
        model_type='text',
        min_vram_gb=24,
        recommended_gpu_count=1,
        max_model_len_default=32768,
        description='Qwen3 MoE（激活 3B），高性价比，超越 QwQ-32B',
    ),
    QwenModelPreset(
        key='qwen3-235b-a22b-instruct-2507',
        label='Qwen3-235B-A22B-Instruct-2507',
        hf_model_id='Qwen/Qwen3-235B-A22B-Instruct-2507',
        model_type='text',
        min_vram_gb=160,
        recommended_gpu_count=8,
        max_model_len_default=32768,
        description='Qwen3 旗舰 MoE（激活 22B），需 8 卡及以上张量并行',
    ),
    # ---------- Qwen3 视觉多模态 ----------
    QwenModelPreset(
        key='qwen3-vl-4b',
        label='Qwen3-VL-4B-Instruct',
        hf_model_id='Qwen/Qwen3-VL-4B-Instruct',
        model_type='multimodal',
        min_vram_gb=10,
        recommended_gpu_count=1,
        max_model_len_default=32768,
        description='Qwen3 视觉语言模型，图文/视频理解，均衡性能',
    ),
    QwenModelPreset(
        key='qwen3-vl-8b',
        label='Qwen3-VL-8B-Instruct',
        hf_model_id='Qwen/Qwen3-VL-8B-Instruct',
        model_type='multimodal',
        min_vram_gb=18,
        recommended_gpu_count=1,
        max_model_len_default=32768,
        description='Qwen3 视觉语言模型，推荐单卡 24GB 部署',
    ),
    QwenModelPreset(
        key='qwen3-vl-32b',
        label='Qwen3-VL-32B-Instruct',
        hf_model_id='Qwen/Qwen3-VL-32B-Instruct',
        model_type='multimodal',
        min_vram_gb=68,
        recommended_gpu_count=2,
        max_model_len_default=32768,
        description='Qwen3 视觉旗舰，建议 2 卡张量并行',
    ),
    # ---------- Qwen2.5 / Qwen2-VL（兼容保留） ----------
    QwenModelPreset(
        key='qwen2.5-0.5b',
        label='Qwen2.5-0.5B-Instruct',
        hf_model_id='Qwen/Qwen2.5-0.5B-Instruct',
        model_type='text',
        min_vram_gb=2,
        recommended_gpu_count=1,
        max_model_len_default=8192,
        description='轻量文本模型，适合开发测试与低显存环境',
    ),
    QwenModelPreset(
        key='qwen2.5-1.5b',
        label='Qwen2.5-1.5B-Instruct',
        hf_model_id='Qwen/Qwen2.5-1.5B-Instruct',
        model_type='text',
        min_vram_gb=4,
        recommended_gpu_count=1,
        max_model_len_default=8192,
        description='小型文本模型，响应快、占用低',
    ),
    QwenModelPreset(
        key='qwen2.5-7b',
        label='Qwen2.5-7B-Instruct',
        hf_model_id='Qwen/Qwen2.5-7B-Instruct',
        model_type='text',
        min_vram_gb=16,
        recommended_gpu_count=1,
        max_model_len_default=8192,
        description='通用文本大模型，推荐单卡 24GB 部署',
    ),
    QwenModelPreset(
        key='qwen2.5-14b',
        label='Qwen2.5-14B-Instruct',
        hf_model_id='Qwen/Qwen2.5-14B-Instruct',
        model_type='text',
        min_vram_gb=28,
        recommended_gpu_count=1,
        max_model_len_default=8192,
        description='中等规模文本模型，需 32GB+ 显存',
    ),
    QwenModelPreset(
        key='qwen2.5-32b',
        label='Qwen2.5-32B-Instruct',
        hf_model_id='Qwen/Qwen2.5-32B-Instruct',
        model_type='text',
        min_vram_gb=64,
        recommended_gpu_count=2,
        max_model_len_default=8192,
        description='大规模文本模型，建议 2 卡张量并行',
    ),
    QwenModelPreset(
        key='qwen2.5-72b',
        label='Qwen2.5-72B-Instruct',
        hf_model_id='Qwen/Qwen2.5-72B-Instruct',
        model_type='text',
        min_vram_gb=144,
        recommended_gpu_count=4,
        max_model_len_default=8192,
        description='旗舰文本模型，需 4 卡及以上张量并行',
    ),
    QwenModelPreset(
        key='qwen2.5-vl-7b',
        label='Qwen2.5-VL-7B-Instruct',
        hf_model_id='Qwen/Qwen2.5-VL-7B-Instruct',
        model_type='multimodal',
        min_vram_gb=18,
        recommended_gpu_count=1,
        max_model_len_default=8192,
        description='多模态视觉语言模型，支持图文理解',
    ),
    QwenModelPreset(
        key='qwen2-vl-7b',
        label='Qwen2-VL-7B-Instruct',
        hf_model_id='Qwen/Qwen2-VL-7B-Instruct',
        model_type='vision',
        min_vram_gb=16,
        recommended_gpu_count=1,
        max_model_len_default=8192,
        description='视觉大模型，适合视频帧/图像语义理解',
    ),
]

_PRESET_BY_KEY = {p.key: p for p in QWEN_MODEL_PRESETS}


def get_qwen_preset(key: str) -> Optional[QwenModelPreset]:
    if not key:
        return None
    return _PRESET_BY_KEY.get(key.strip().lower())


def list_qwen_presets() -> List[dict]:
    return [asdict(p) for p in QWEN_MODEL_PRESETS]
