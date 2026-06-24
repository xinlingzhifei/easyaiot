"""
GPU 节点 Qwen 大模型远程部署服务。
"""
from __future__ import annotations

import logging
import os
import socket
from typing import Optional

from db_models import db, LLMDeployService, LLMModel, beijing_now
from app.config.qwen_models import get_qwen_preset, list_qwen_presets
from app.services.llm_node_capacity import check_node_vram_for_llm, required_vram_gb
from app.utils.node_remote_python import resolve_ai_bundle_python

logger = logging.getLogger(__name__)

WORKLOAD_TYPE_LLM = 'llm_service'
BUNDLE_LLM = 'llm_service'


def _check_port_available(host: str, port: int) -> bool:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind((host, port))
        return True
    except OSError:
        return False
    finally:
        try:
            sock.close()
        except OSError:
            pass


def _find_available_port(start_port: int = 8100, max_attempts: int = 50) -> int:
    for offset in range(max_attempts):
        port = start_port + offset
        if _check_port_available('0.0.0.0', port):
            return port
    raise ValueError(f'在 {start_port} 起 {max_attempts} 个端口内未找到可用端口')


def _ai_api_base() -> str:
    return (
        os.getenv('AI_SERVICE_API')
        or os.getenv('AI_PUBLIC_URL')
        or os.getenv('MODEL_AI_PUSH_URL', '').replace('/model/deploy_service/heartbeat', '')
        or 'http://127.0.0.1:5000'
    ).rstrip('/')


def _build_llm_deploy_env(
    service: LLMDeployService,
    host: str,
    ai_root: str,
) -> dict:
    env = {}
    for key in (
        'DATABASE_URL', 'MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_SECURE',
        'CUDA_VISIBLE_DEVICES', 'AI_ENV', 'JAVA_BACKEND_URL',
        'CLUSTER_MODE', 'AI_MODELS_DIR', 'LLM_MODELS_DIR', 'HF_ENDPOINT', 'HF_HOME',
    ):
        val = os.getenv(key)
        if val:
            env[key] = val
    env['AI_ROOT'] = ai_root
    env['AI_SERVICE_API'] = _ai_api_base()
    env['SERVICE_ID'] = str(service.id)
    env['LLM_MODEL_KEY'] = service.qwen_model_key
    env['LLM_HF_MODEL_ID'] = service.hf_model_id
    env['PORT'] = str(service.port)
    env['TENSOR_PARALLEL_SIZE'] = str(service.tensor_parallel_size or 1)
    env['MAX_MODEL_LEN'] = str(service.max_model_len or 8192)
    env['SERVER_IP'] = host
    env['LOG_PATH'] = service.log_path or ''
    return env


def _upsert_llm_config(service: LLMDeployService) -> LLMModel:
    name = f'本地-{service.service_name}'
    existing = LLMModel.query.filter_by(name=name).first()
    preset = get_qwen_preset(service.qwen_model_key)
    model_type = preset.model_type if preset else 'text'
    base_url = service.api_endpoint or (
        f'http://{service.server_ip}:{service.port}/v1' if service.server_ip and service.port else ''
    )
    if existing:
        existing.base_url = base_url
        existing.model_name = service.hf_model_id
        existing.service_type = 'local'
        existing.vendor = 'local'
        existing.model_type = model_type
        existing.status = 'active' if service.status == 'running' else existing.status
        existing.updated_at = beijing_now()
        llm = existing
    else:
        llm = LLMModel(
            name=name,
            service_type='local',
            vendor='local',
            model_type=model_type,
            model_name=service.hf_model_id,
            base_url=base_url,
            api_key='',
            temperature=0.7,
            max_tokens=2000,
            timeout=120,
            is_active=False,
            status='active' if service.status == 'running' else 'inactive',
            description=f'GPU 节点自动注册，部署实例 #{service.id}',
        )
        db.session.add(llm)
    db.session.flush()
    service.llm_config_id = llm.id
    return llm


def check_llm_deploy_vram(
    qwen_model_key: str,
    *,
    target_node_id: Optional[int] = None,
    tensor_parallel_size: int = 1,
) -> dict:
    preset = get_qwen_preset(qwen_model_key)
    if not preset:
        raise ValueError(f'未知的 Qwen 模型: {qwen_model_key}')
    if not target_node_id:
        raise ValueError('请指定 target_node_id 进行显存预检')

    from app.utils import node_client

    node = node_client.get_node(int(target_node_id))
    tp = max(1, int(tensor_parallel_size or 1))
    ok, message, details = check_node_vram_for_llm(preset, tp, node)
    return {
        'code': 0,
        'msg': message,
        'data': {
            'ok': ok,
            'model_key': preset.key,
            'model_label': preset.label,
            **details,
        },
    }


def deploy_llm(
    qwen_model_key: str,
    *,
    start_port: int = 8100,
    target_node_id: Optional[int] = None,
    auto_schedule: bool = False,
    tensor_parallel_size: int = 1,
    max_model_len: int = 8192,
    service_name: Optional[str] = None,
) -> dict:
    preset = get_qwen_preset(qwen_model_key)
    if not preset:
        raise ValueError(f'未知的 Qwen 模型: {qwen_model_key}')

    tp = max(1, int(tensor_parallel_size or preset.recommended_gpu_count))

    from app.utils import node_client

    if not node_client.is_remote_deploy_enabled():
        raise ValueError('远程部署未启用，请设置 NODE_REMOTE_DEPLOY=true')

    # 指定节点：部署前校验 GPU 数量与可用显存
    if target_node_id and not auto_schedule:
        node = node_client.get_node(int(target_node_id))
        ok, message, _ = check_node_vram_for_llm(preset, tp, node)
        if not ok:
            raise ValueError(message)

    port = _find_available_port(int(start_port))
    display_name = service_name or f'{preset.label}@{port}'

    service = LLMDeployService(
        service_name=display_name,
        qwen_model_key=preset.key,
        hf_model_id=preset.hf_model_id,
        port=port,
        tensor_parallel_size=tp,
        max_model_len=int(max_model_len or preset.max_model_len_default),
        status='deploying',
    )
    db.session.add(service)
    db.session.commit()

    if not node_client.is_remote_deploy_enabled():
        service.status = 'error'
        service.error_message = '远程部署未启用，请设置 NODE_REMOTE_DEPLOY=true'
        db.session.commit()
        raise ValueError(service.error_message)

    try:
        allocation = node_client.allocate_node(
            WORKLOAD_TYPE_LLM,
            str(service.id),
            capabilities=['llm_inference'],
            gpu_count=tp,
            target_node_id=target_node_id if not auto_schedule else None,
            prefer_gpu=True,
            sticky=True,
        )
    except Exception as exc:
        service.status = 'error'
        service.error_message = str(exc)
        db.session.commit()
        raise

    node_id = allocation['nodeId']
    host = allocation['host']
    gpu_ids = allocation.get('gpuIds')

    # 自动调度：分配后再校验目标节点显存
    if auto_schedule or not target_node_id:
        node = node_client.get_node(node_id)
        ok, message, _ = check_node_vram_for_llm(preset, tp, node)
        if not ok:
            service.status = 'error'
            service.error_message = message
            db.session.commit()
            try:
                node_client.release_binding(WORKLOAD_TYPE_LLM, str(service.id))
            except Exception:
                pass
            raise ValueError(message)

    ai_root_remote = os.getenv('NODE_REMOTE_AI_ROOT', '/opt/easyaiot/AI')
    work_dir = os.path.join(ai_root_remote, 'services', 'llm_service')
    log_dir = os.path.join(ai_root_remote, 'logs', 'llm', str(service.id))
    python_exec = resolve_ai_bundle_python(ai_root_remote, BUNDLE_LLM)
    deploy_script = os.path.join(ai_root_remote, 'services', 'llm_service', 'run_deploy.py')
    command = [python_exec, deploy_script]

    service.log_path = log_dir
    service.node_id = node_id
    service.server_ip = host
    env = _build_llm_deploy_env(service, host, ai_root_remote)

    result = node_client.deploy_workload(
        node_id=node_id,
        workload_type=WORKLOAD_TYPE_LLM,
        workload_id=str(service.id),
        command=command,
        work_dir=work_dir,
        log_dir=log_dir,
        env=env,
        gpu_ids=gpu_ids,
    )

    service.status = 'deploying'
    db.session.commit()

    logger.info(
        'LLM 远程部署已下发 service_id=%s node_id=%s host=%s pid=%s',
        service.id, node_id, host, result.get('pid'),
    )
    return {
        'code': 0,
        'msg': f'已下发到 GPU 节点 {host}，vLLM 正在启动',
        'data': service.to_dict(),
    }


def receive_llm_heartbeat(data: dict) -> dict:
    service_id = data.get('service_id')
    if not service_id:
        raise ValueError('缺少 service_id')

    service = LLMDeployService.query.get(int(service_id))
    if not service:
        raise ValueError(f'部署实例不存在: {service_id}')

    status = data.get('status') or 'running'
    if data.get('server_ip'):
        service.server_ip = data['server_ip']
    if data.get('port'):
        service.port = int(data['port'])
    if data.get('api_endpoint'):
        service.api_endpoint = data['api_endpoint']
    elif service.server_ip and service.port:
        service.api_endpoint = f'http://{service.server_ip}:{service.port}/v1'
    if data.get('process_id'):
        service.process_id = int(data['process_id'])
    if data.get('log_path'):
        service.log_path = data['log_path']

    service.status = status
    service.last_heartbeat = beijing_now()
    service.error_message = None if status == 'running' else data.get('error_message')

    if status == 'running' and service.api_endpoint:
        _upsert_llm_config(service)

    db.session.commit()
    return {'code': 0, 'msg': 'success', 'data': service.to_dict()}


def list_deployed_llm_services(page: int = 1, page_size: int = 20) -> dict:
    query = LLMDeployService.query.order_by(LLMDeployService.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        'code': 0,
        'msg': 'success',
        'data': {
            'list': [s.to_dict() for s in items],
            'total': total,
        },
    }


def stop_llm_deploy(service_id: int) -> dict:
    service = LLMDeployService.query.get(service_id)
    if not service:
        raise ValueError(f'部署实例不存在: {service_id}')

    if service.node_id:
        from app.utils import node_client
        try:
            node_client.stop_workload(service.node_id, WORKLOAD_TYPE_LLM, str(service.id))
        except Exception as exc:
            logger.warning('远程停止 LLM 服务失败 service_id=%s: %s', service_id, exc)

    service.status = 'stopped'
    service.last_heartbeat = beijing_now()
    db.session.commit()
    return {'code': 0, 'msg': '已停止', 'data': service.to_dict()}


def delete_llm_deploy(service_id: int) -> dict:
    service = LLMDeployService.query.get(service_id)
    if not service:
        raise ValueError(f'部署实例不存在: {service_id}')
    if service.status in ('deploying', 'running'):
        stop_llm_deploy(service_id)
    db.session.delete(service)
    db.session.commit()
    return {'code': 0, 'msg': '已删除'}


def get_llm_catalog() -> dict:
    presets = list_qwen_presets()
    for item in presets:
        preset = get_qwen_preset(item.get('key', ''))
        if preset:
            item['required_vram_gb'] = required_vram_gb(
                preset,
                preset.recommended_gpu_count,
            )
    return {'code': 0, 'msg': 'success', 'data': presets}
