"""
AI 后处理集群 Launcher：按副本数将 Worker / Sink 部署到计算节点。
"""
from __future__ import annotations

import logging
import os
import subprocess
import sys
import threading
from typing import Dict, List, Optional, Tuple

from models import db, AlgorithmTask
from app.utils.node_remote_python import resolve_video_bundle_python

logger = logging.getLogger(__name__)

WORKLOAD_TYPE_POST_PROCESS = 'post_process'
WORKLOAD_TYPE_POST_PROCESS_SINK = 'post_process_sink'

_local_workers: Dict[str, subprocess.Popen] = {}
_remote_nodes: Dict[str, int] = {}
_local_lock = threading.Lock()
_sink_started = False
_sink_lock = threading.Lock()


def _get_video_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _spread_replicas_enabled() -> bool:
    return os.getenv('POST_PROCESS_SPREAD_REPLICAS', 'true').strip().lower() in ('1', 'true', 'yes', 'on')


def _sink_replicas() -> int:
    try:
        return max(1, int(os.getenv('POST_PROCESS_SINK_REPLICAS', '1')))
    except (TypeError, ValueError):
        return 1


def _task_replicas(task: AlgorithmTask) -> int:
    raw = getattr(task, 'post_process_replicas', None)
    try:
        return max(1, int(raw or 1))
    except (TypeError, ValueError):
        return 1


def _workload_id(task_id: int, replica: int) -> str:
    return f'pp_{task_id}_r{replica}'


def _sink_workload_id(replica: int) -> str:
    return f'sink_{replica}'


def _resolve_workspace_root() -> str:
    explicit = (os.getenv('POST_PROCESS_WORKSPACE_ROOT') or '').strip()
    if explicit:
        return explicit
    try:
        from cluster_storage import get_staging_dir, is_cluster_mode
        if is_cluster_mode():
            return os.path.join(get_staging_dir(), 'post-process-workspaces')
    except ImportError:
        pass
    return os.path.abspath(os.path.join(_get_video_root(), '..', '.scripts', 'docker', 'vscode_data', 'workspaces'))


def _build_worker_env(task: AlgorithmTask, replica: int, log_dir: str, host: str) -> dict:
    gateway = os.getenv('JAVA_BACKEND_URL', os.getenv('GATEWAY_URL', 'http://localhost:48080')).rstrip('/')
    env = {
        'POST_PROCESS_TASK_ID': str(task.id),
        'POST_PROCESS_REPLICA': str(replica),
        'KAFKA_POST_PROCESS_CONSUMER_GROUP': f'post-process-task-{task.id}',
        'KAFKA_POST_PROCESS_REQUEST_TOPIC': os.getenv('KAFKA_POST_PROCESS_REQUEST_TOPIC', 'iot-post-process-request'),
        'KAFKA_POST_PROCESS_RESULT_TOPIC': os.getenv('KAFKA_POST_PROCESS_RESULT_TOPIC', 'iot-post-process-result'),
        'KAFKA_BOOTSTRAP_SERVERS': os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
        'POST_PROCESS_WORKSPACE_ROOT': _resolve_workspace_root(),
        'JAVA_BACKEND_URL': gateway,
        'DATABASE_URL': os.getenv('DATABASE_URL', ''),
        'LOG_PATH': log_dir,
        'SERVICE_HOST': host,
        'PYTHONUNBUFFERED': '1',
    }
    return env


def _build_sink_env(replica: int, log_dir: str, host: str) -> dict:
    gateway = os.getenv('JAVA_BACKEND_URL', os.getenv('GATEWAY_URL', 'http://localhost:48080')).rstrip('/')
    return {
        'POST_PROCESS_SINK_REPLICA': str(replica),
        'KAFKA_POST_PROCESS_SINK_GROUP': os.getenv('KAFKA_POST_PROCESS_SINK_GROUP', 'video-post-process-sink'),
        'KAFKA_POST_PROCESS_RESULT_TOPIC': os.getenv('KAFKA_POST_PROCESS_RESULT_TOPIC', 'iot-post-process-result'),
        'KAFKA_BOOTSTRAP_SERVERS': os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
        'JAVA_BACKEND_URL': gateway,
        'DATABASE_URL': os.getenv('DATABASE_URL', ''),
        'ALERT_HOOK_URL': os.getenv('ALERT_HOOK_URL', ''),
        'LOG_PATH': log_dir,
        'SERVICE_HOST': host,
        'PYTHONUNBUFFERED': '1',
    }


def _use_remote_for_task(task: AlgorithmTask) -> bool:
    from app.utils.node_client import is_remote_deploy_enabled
    if not is_remote_deploy_enabled():
        return False
    policy = getattr(task, 'schedule_policy', None) or 'local'
    return policy in ('auto', 'node')


def _deploy_worker_remote(
    task: AlgorithmTask,
    replica: int,
    exclude_node_ids: Optional[List[int]] = None,
) -> Dict:
    from app.utils import node_client

    workload_id = _workload_id(task.id, replica)
    target_node_id = getattr(task, 'target_node_id', None) if getattr(task, 'schedule_policy', None) == 'node' else None
    allocation = node_client.allocate_node(
        workload_type=WORKLOAD_TYPE_POST_PROCESS,
        workload_id=workload_id,
        capabilities=['post_process'],
        gpu_count=0,
        prefer_gpu=False,
        sticky=True,
        target_node_id=target_node_id,
        exclude_node_ids=exclude_node_ids,
    )
    node_id = allocation['nodeId']
    host = allocation['host']
    video_root_remote = os.getenv('NODE_REMOTE_VIDEO_ROOT', '/opt/easyaiot/VIDEO')
    work_dir = os.path.join(video_root_remote, 'services', 'post_process_worker')
    log_dir = os.path.join(video_root_remote, 'logs', f'post_process_task_{task.id}', f'replica_{replica}')
    python_exec = resolve_video_bundle_python('post_process', video_root_remote)
    command = [python_exec, os.path.join(work_dir, 'run_worker.py')]
    env = _build_worker_env(task, replica, log_dir, host)
    env['VIDEO_ROOT'] = video_root_remote

    result = node_client.deploy_workload(
        node_id=node_id,
        workload_type=WORKLOAD_TYPE_POST_PROCESS,
        workload_id=workload_id,
        command=command,
        work_dir=work_dir,
        log_dir=log_dir,
        env=env,
        gpu_ids=None,
    )
    with _local_lock:
        _remote_nodes[workload_id] = int(node_id)
    logger.info(
        '后处理 Worker 远程部署成功 task=%s replica=%s node=%s host=%s pid=%s',
        task.id, replica, node_id, host, result.get('pid'),
    )
    return {'node_id': node_id, 'host': host, 'replica': replica, 'pid': result.get('pid')}


def _deploy_worker_local(task: AlgorithmTask, replica: int) -> None:
    video_root = _get_video_root()
    worker_script = os.path.join(video_root, 'services', 'post_process_worker', 'run_worker.py')
    log_dir = os.path.join(video_root, 'logs', f'post_process_task_{task.id}', f'replica_{replica}')
    os.makedirs(log_dir, exist_ok=True)
    env = os.environ.copy()
    env.update(_build_worker_env(task, replica, log_dir, '127.0.0.1'))
    env['VIDEO_ROOT'] = video_root
    proc = subprocess.Popen(
        [sys.executable, worker_script],
        cwd=video_root,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    key = _workload_id(task.id, replica)
    with _local_lock:
        old = _local_workers.pop(key, None)
        if old and old.poll() is None:
            old.terminate()
        _local_workers[key] = proc
    logger.info('后处理 Worker 本机启动 task=%s replica=%s pid=%s', task.id, replica, proc.pid)


def _stop_worker_local(task_id: int, replica: int) -> None:
    key = _workload_id(task_id, replica)
    with _local_lock:
        proc = _local_workers.pop(key, None)
    if proc and proc.poll() is None:
        proc.terminate()


def _stop_worker_remote(task_id: int, replica: int) -> None:
    from app.utils import node_client
    workload_id = _workload_id(task_id, replica)
    with _local_lock:
        node_id = _remote_nodes.pop(workload_id, None)
    if node_id:
        try:
            node_client.stop_workload(node_id, WORKLOAD_TYPE_POST_PROCESS, workload_id)
        except Exception as exc:
            logger.warning('远程停止后处理 Worker 失败 %s: %s', workload_id, exc)
    try:
        node_client.release_workload(WORKLOAD_TYPE_POST_PROCESS, workload_id)
    except Exception as exc:
        logger.warning('释放后处理绑定失败 %s: %s', workload_id, exc)


def start_post_process_workers(task: AlgorithmTask) -> Tuple[bool, str]:
    if not bool(getattr(task, 'post_process_enabled', False)):
        return True, '后处理未启用'
    replicas = _task_replicas(task)
    assigned_nodes: List[int] = []
    try:
        for replica in range(replicas):
            exclude = assigned_nodes if _spread_replicas_enabled() else None
            if _use_remote_for_task(task):
                dep = _deploy_worker_remote(task, replica, exclude_node_ids=exclude)
                node_id = dep.get('node_id')
                if node_id and node_id not in assigned_nodes:
                    assigned_nodes.append(int(node_id))
            else:
                _deploy_worker_local(task, replica)
        return True, f'已启动 {replicas} 个后处理 Worker'
    except Exception as exc:
        logger.error('启动后处理 Worker 失败 task=%s: %s', task.id, exc, exc_info=True)
        return False, str(exc)


def stop_post_process_workers(task_id: int, task: Optional[AlgorithmTask] = None) -> None:
    replicas = _task_replicas(task) if task else 1
    for replica in range(replicas):
        if task and _use_remote_for_task(task):
            _stop_worker_remote(task_id, replica)
        else:
            _stop_worker_local(task_id, replica)


def _deploy_sink_remote(replica: int, exclude_node_ids: Optional[List[int]] = None) -> None:
    from app.utils import node_client

    workload_id = _sink_workload_id(replica)
    allocation = node_client.allocate_node(
        workload_type=WORKLOAD_TYPE_POST_PROCESS_SINK,
        workload_id=workload_id,
        capabilities=['post_process'],
        gpu_count=0,
        prefer_gpu=False,
        sticky=True,
        exclude_node_ids=exclude_node_ids,
    )
    node_id = allocation['nodeId']
    host = allocation['host']
    video_root_remote = os.getenv('NODE_REMOTE_VIDEO_ROOT', '/opt/easyaiot/VIDEO')
    work_dir = os.path.join(video_root_remote, 'services', 'post_process_sink_worker')
    log_dir = os.path.join(video_root_remote, 'logs', 'post_process_sink', f'replica_{replica}')
    python_exec = resolve_video_bundle_python('post_process', video_root_remote)
    command = [python_exec, os.path.join(work_dir, 'run_worker.py')]
    env = _build_sink_env(replica, log_dir, host)
    env['VIDEO_ROOT'] = video_root_remote
    node_client.deploy_workload(
        node_id=node_id,
        workload_type=WORKLOAD_TYPE_POST_PROCESS_SINK,
        workload_id=workload_id,
        command=command,
        work_dir=work_dir,
        log_dir=log_dir,
        env=env,
        gpu_ids=None,
    )
    logger.info('后处理 Sink 远程部署成功 replica=%s node=%s', replica, node_id)


def _deploy_sink_local(replica: int) -> None:
    video_root = _get_video_root()
    script = os.path.join(video_root, 'services', 'post_process_sink_worker', 'run_worker.py')
    log_dir = os.path.join(video_root, 'logs', 'post_process_sink', f'replica_{replica}')
    os.makedirs(log_dir, exist_ok=True)
    env = os.environ.copy()
    env.update(_build_sink_env(replica, log_dir, '127.0.0.1'))
    proc = subprocess.Popen([sys.executable, script], cwd=video_root, env=env)
    key = _sink_workload_id(replica)
    with _local_lock:
        _local_workers[key] = proc
    logger.info('后处理 Sink 本机启动 replica=%s pid=%s', replica, proc.pid)


def ensure_post_process_sink_workers() -> None:
    global _sink_started
    with _sink_lock:
        if _sink_started:
            return
        _sink_started = True

    if os.getenv('POST_PROCESS_SINK_ENABLED', 'true').strip().lower() in ('0', 'false', 'no', 'off'):
        logger.info('后处理 Sink 已禁用 (POST_PROCESS_SINK_ENABLED=false)')
        return

    replicas = _sink_replicas()
    use_remote = os.getenv('NODE_REMOTE_DEPLOY', 'true').lower() in ('1', 'true', 'yes') and os.getenv(
        'POST_PROCESS_SINK_REMOTE', 'auto'
    ).strip().lower() in ('1', 'true', 'yes', 'auto')
    assigned: List[int] = []
    for replica in range(replicas):
        try:
            if use_remote:
                _deploy_sink_remote(replica, exclude_node_ids=assigned if _spread_replicas_enabled() else None)
            else:
                _deploy_sink_local(replica)
        except Exception as exc:
            logger.warning('后处理 Sink 部署失败 replica=%s，尝试本机: %s', replica, exc)
            _deploy_sink_local(replica)
