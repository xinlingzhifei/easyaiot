"""
推流转发任务服务启动器
用于自动启动推流转发任务相关的服务（本机守护进程或 iot-node 远程部署）

多摄像头 + auto/node 调度时默认按设备分片（每分片独立 workload），分散到集群节点拉流推流。

@author 翱翔的雄库鲁
@email andywebjava@163.com
"""
import json
import os
import subprocess
import logging
import threading
import signal
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from models import db, StreamForwardTask
from .stream_forward_daemon import StreamForwardDaemon

logger = logging.getLogger(__name__)

WORKLOAD_TYPE_STREAM_FORWARD = 'stream_forward'

_running_daemons: Dict[int, StreamForwardDaemon] = {}
_daemons_lock = threading.Lock()
_starting_tasks: Dict[int, threading.Lock] = {}
_starting_lock = threading.Lock()


def _get_video_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _use_remote_deploy(task: StreamForwardTask) -> bool:
    from app.utils.node_client import is_remote_deploy_enabled
    if not is_remote_deploy_enabled():
        return False
    policy = getattr(task, 'schedule_policy', None) or 'local'
    return policy in ('auto', 'node')


def _devices_per_shard() -> int:
    try:
        return max(1, int(os.getenv('STREAM_FORWARD_DEVICES_PER_SHARD', '1')))
    except (TypeError, ValueError):
        return 1


def _use_device_level_schedule(task: StreamForwardTask) -> bool:
    """多路摄像头远程部署时按设备/分片拆分 workload。"""
    if not _use_remote_deploy(task):
        return False
    device_count = len(task.devices or [])
    if device_count <= 1:
        return False
    flag = os.getenv('STREAM_FORWARD_DEVICE_LEVEL_SCHEDULE', 'true').strip().lower()
    return flag in ('1', 'true', 'yes', 'on')


def _parse_device_deployments(task: Optional[StreamForwardTask]) -> List[Dict[str, Any]]:
    if not task:
        return []
    if hasattr(task, '_parse_device_deployments'):
        return task._parse_device_deployments()
    raw = getattr(task, 'device_deployments', None)
    if not raw:
        return []
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _serialize_device_deployments(deployments: List[Dict[str, Any]]) -> str:
    return json.dumps(deployments, ensure_ascii=False)


def _make_device_shards(device_ids: List[str]) -> List[List[str]]:
    shard_size = _devices_per_shard()
    return [device_ids[i:i + shard_size] for i in range(0, len(device_ids), shard_size)]


def _workload_id(task_id: int, shard_index: int, device_ids: List[str]) -> str:
    if len(device_ids) == 1:
        safe_id = str(device_ids[0]).replace(':', '_')
        return f'{task_id}:{safe_id}'
    return f'{task_id}:s{shard_index}'


def _shard_log_suffix(shard_index: int, device_ids: List[str]) -> str:
    if len(device_ids) == 1:
        safe_id = str(device_ids[0]).replace('/', '_').replace(':', '_')
        return f'device_{safe_id}'
    return f'shard_{shard_index}'


def _task_has_active_remote_deployments(task: StreamForwardTask) -> bool:
    deployments = _parse_device_deployments(task)
    if deployments:
        return True
    return bool(getattr(task, 'node_id', None))


def _resolve_video_control_url() -> str:
    gateway = os.getenv('JAVA_BACKEND_URL', os.getenv('GATEWAY_URL', 'http://localhost:48080')).rstrip('/')
    return f'{gateway}/admin-api/video'


def _build_stream_forward_deploy_env(
    task_id: int,
    log_path: str,
    server_host: str,
    device_ids: Optional[List[str]] = None,
    workload_id: Optional[str] = None,
) -> dict:
    env = {}
    for key in (
        'DATABASE_URL', 'GATEWAY_URL', 'JWT_TOKEN', 'JAVA_BACKEND_URL', 'POD_IP', 'HOST_IP', 'VIDEO_ENV',
        'USE_GPU', 'GPU_IDS', 'GPU_POLICY', 'FFMPEG_GPU_POLICY', 'FFMPEG_HWACCEL', 'FFMPEG_THREADS',
        'CUDA_VISIBLE_DEVICES', 'NVIDIA_VISIBLE_DEVICES',
        'VIEW_SOURCE_FPS', 'VIEW_TARGET_WIDTH', 'VIEW_TARGET_HEIGHT', 'VIEW_FFMPEG_PRESET',
        'VIEW_FFMPEG_VIDEO_BITRATE', 'VIEW_FFMPEG_GOP_SIZE', 'VIEW_VIDEO_QUALITY_PROFILE',
        'VIEW_PUSH_FLUSH_EVERY', 'SOURCE_FPS', 'TARGET_WIDTH', 'TARGET_HEIGHT', 'EXTRACT_INTERVAL',
        'FFMPEG_PRESET', 'FFMPEG_VIDEO_BITRATE', 'FFMPEG_GOP_SIZE', 'VIDEO_QUALITY_PROFILE',
        'AUTO_QUALITY_ENABLED', 'AUTO_QUALITY_LOCK_PROFILE',
        'AI_RTSP_ASYNC_READ', 'AI_RTSP_ASYNC_QUEUE_MAX', 'AI_RTSP_TRANSPORT',
        'OPENCV_FFMPEG_RTSP_TRANSPORT', 'RTSP_OPEN_TIMEOUT_MSEC', 'RTSP_READ_TIMEOUT_MSEC',
        'PUSH_FLUSH_EVERY',
    ):
        val = os.getenv(key)
        if val is not None and val != '':
            env[key] = val

    video_control_url = _resolve_video_control_url()
    video_service_port = os.getenv('FLASK_RUN_PORT', '6000')
    env['PYTHONUNBUFFERED'] = '1'
    env['TASK_ID'] = str(task_id)
    env['VIDEO_SERVICE_PORT'] = video_service_port
    env['VIDEO_CONTROL_URL'] = video_control_url
    env['VIDEO_HEARTBEAT_URL'] = f'{video_control_url}/stream-forward/heartbeat'
    env['LOG_PATH'] = log_path
    env['POD_IP'] = server_host
    env['HOST_IP'] = server_host
    if device_ids:
        env['DEVICE_IDS'] = ','.join(device_ids)
    if workload_id:
        env['WORKLOAD_ID'] = workload_id
    return env


def _apply_task_service_fields_from_deployments(task: StreamForwardTask, deployments: List[Dict[str, Any]]) -> None:
    if not deployments:
        task.node_id = None
        task.service_server_ip = None
        task.service_process_id = None
        task.service_log_path = None
        task.device_deployments = None
        return

    task.device_deployments = _serialize_device_deployments(deployments)
    hosts = sorted({dep.get('host') for dep in deployments if dep.get('host')})
    node_ids = sorted({dep.get('node_id') for dep in deployments if dep.get('node_id') is not None})
    task.service_server_ip = ','.join(hosts) if hosts else None
    task.service_process_id = deployments[0].get('pid')
    task.service_log_path = deployments[0].get('log_dir')
    task.node_id = node_ids[0] if len(node_ids) == 1 else None


def _deploy_shard_with_workload_id(
    task_id: int,
    task: StreamForwardTask,
    device_ids: List[str],
    workload_id: str,
    *,
    shard_index: Optional[int] = None,
    exclude_node_ids: Optional[List[int]] = None,
) -> Dict[str, Any]:
    from app.utils import node_client

    policy = getattr(task, 'schedule_policy', None) or 'local'
    target_node_id = getattr(task, 'target_node_id', None)
    if policy == 'node' and not target_node_id:
        raise RuntimeError('已选择指定节点但未配置目标节点')

    if shard_index is None:
        if ':s' in workload_id:
            try:
                shard_index = int(workload_id.rsplit(':s', 1)[1])
            except (TypeError, ValueError):
                shard_index = 0
        else:
            shard_index = 0

    allocation = node_client.allocate_node(
        WORKLOAD_TYPE_STREAM_FORWARD,
        workload_id,
        capabilities=['stream_forward'],
        gpu_count=1,
        target_node_id=target_node_id if policy == 'node' else None,
        sticky=True,
        exclude_node_ids=exclude_node_ids,
    )

    node_id = allocation['nodeId']
    host = allocation['host']
    gpu_ids = allocation.get('gpuIds')

    video_root_remote = os.getenv('NODE_REMOTE_VIDEO_ROOT', '/opt/easyaiot/VIDEO')
    work_dir = os.path.join(video_root_remote, 'services', 'stream_forward_service')
    log_dir = os.path.join(
        video_root_remote,
        'logs',
        f'stream_forward_task_{task_id}',
        _shard_log_suffix(shard_index, device_ids),
    )
    python_exec = os.getenv('NODE_REMOTE_PYTHON', 'python3')
    deploy_script = os.path.join(work_dir, 'run_deploy.py')
    command = [python_exec, deploy_script]

    env = _build_stream_forward_deploy_env(task_id, log_dir, host, device_ids, workload_id)
    env['VIDEO_ROOT'] = video_root_remote

    result = node_client.deploy_workload(
        node_id=node_id,
        workload_type=WORKLOAD_TYPE_STREAM_FORWARD,
        workload_id=workload_id,
        command=command,
        work_dir=work_dir,
        log_dir=log_dir,
        env=env,
        gpu_ids=gpu_ids,
    )

    logger.info(
        '推流转发分片远程部署成功 task_id=%s workload_id=%s node_id=%s host=%s devices=%s pid=%s',
        task_id, workload_id, node_id, host, device_ids, result.get('pid'),
    )
    return {
        'device_ids': device_ids,
        'node_id': node_id,
        'host': host,
        'workload_id': workload_id,
        'pid': result.get('pid'),
        'log_dir': log_dir,
    }


def _deploy_shard_on_remote_node(
    task_id: int,
    task: StreamForwardTask,
    shard_index: int,
    device_ids: List[str],
) -> Dict[str, Any]:
    workload_id = _workload_id(task_id, shard_index, device_ids)
    return _deploy_shard_with_workload_id(
        task_id, task, device_ids, workload_id, shard_index=shard_index,
    )


def redeploy_existing_shard(
    task_id: int,
    task: StreamForwardTask,
    deployment: Dict[str, Any],
    exclude_node_ids: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """在节点故障或进程异常时，将已有分片重新部署到其他节点。"""
    device_ids = list(deployment.get('device_ids') or [])
    workload_id = str(deployment.get('workload_id') or '')
    if not device_ids or not workload_id:
        raise ValueError('分片部署信息不完整')

    old_node_id = deployment.get('node_id')
    if old_node_id:
        _stop_remote_workload(int(old_node_id), workload_id)
    try:
        from app.utils import node_client
        node_client.release_workload(WORKLOAD_TYPE_STREAM_FORWARD, workload_id)
    except Exception as e:
        logger.warning('释放分片绑定失败 workload_id=%s: %s', workload_id, e)

    excludes = list(exclude_node_ids or [])
    if old_node_id and int(old_node_id) not in excludes:
        excludes.append(int(old_node_id))

    return _deploy_shard_with_workload_id(
        task_id,
        task,
        device_ids,
        workload_id,
        exclude_node_ids=excludes or None,
    )


def _is_compute_node_online(node_id: int) -> bool:
    from app.utils import node_client
    try:
        node = node_client.get_node(node_id)
        return str(node.get('status') or '').lower() == 'online'
    except Exception as e:
        logger.warning('查询节点状态失败 node_id=%s: %s', node_id, e)
        return False


def migrate_unhealthy_stream_forward_task(task_id: int) -> int:
    """检查并迁移离线节点分片或心跳超时任务，返回成功迁移的分片数。"""
    task = StreamForwardTask.query.get(task_id)
    if not task or not task.is_enabled or not _use_remote_deploy(task):
        return 0

    deployments = _parse_device_deployments(task)
    if not deployments:
        node_id = getattr(task, 'node_id', None)
        if not node_id:
            return 0
        device_ids = [d.id for d in (task.devices or []) if d.id]
        deployments = [{
            'device_ids': device_ids,
            'node_id': node_id,
            'workload_id': str(task_id),
            'host': task.service_server_ip,
        }]

    policy = getattr(task, 'schedule_policy', None) or 'local'
    heartbeat_timeout = max(30, int(os.getenv('STREAM_FORWARD_HEARTBEAT_FAILOVER_SECONDS', '90')))
    heartbeat_stale = False
    if task.service_last_heartbeat:
        heartbeat_stale = (
            datetime.utcnow() - task.service_last_heartbeat
        ).total_seconds() > heartbeat_timeout

    updated = list(deployments)
    migrated = 0
    offline_indices: List[int] = []

    for index, dep in enumerate(deployments):
        node_id = dep.get('node_id')
        if node_id and not _is_compute_node_online(int(node_id)):
            offline_indices.append(index)

    if offline_indices:
        for index in offline_indices:
            dep = deployments[index]
            node_id = dep.get('node_id')
            if policy == 'node':
                logger.error(
                    '推流转发指定节点离线，无法自动迁移 task_id=%s node_id=%s',
                    task_id, node_id,
                )
                continue
            try:
                updated[index] = redeploy_existing_shard(
                    task_id, task, dep, exclude_node_ids=[int(node_id)],
                )
                migrated += 1
            except Exception as e:
                logger.error(
                    '推流转发分片迁移失败 task_id=%s workload=%s: %s',
                    task_id, dep.get('workload_id'), e, exc_info=True,
                )
    elif heartbeat_stale and policy != 'node':
        for index, dep in enumerate(deployments):
            try:
                updated[index] = redeploy_existing_shard(task_id, task, dep)
                migrated += 1
            except Exception as e:
                logger.error(
                    '推流转发心跳超时重部署失败 task_id=%s workload=%s: %s',
                    task_id, dep.get('workload_id'), e, exc_info=True,
                )

    if migrated:
        _apply_task_service_fields_from_deployments(task, updated)
        db.session.commit()
        logger.info('推流转发任务分片迁移完成 task_id=%s migrated=%s', task_id, migrated)

    return migrated


def _deploy_task_on_remote_node(task_id: int, task: StreamForwardTask) -> Tuple[bool, str, bool]:
    device_ids = [d.id for d in (task.devices or []) if d.id]
    if not device_ids:
        return (False, '任务未关联可用摄像头', False)

    if _use_device_level_schedule(task):
        shards = _make_device_shards(device_ids)
        deployments: List[Dict[str, Any]] = []
        failed: List[str] = []

        for shard_index, shard_device_ids in enumerate(shards):
            try:
                deployments.append(_deploy_shard_on_remote_node(task_id, task, shard_index, shard_device_ids))
            except Exception as e:
                logger.error(
                    '推流转发分片部署失败 task_id=%s devices=%s: %s',
                    task_id, shard_device_ids, e, exc_info=True,
                )
                failed.append(','.join(shard_device_ids))

        if not deployments:
            return (False, f'所有分片部署失败: {"; ".join(failed)}', False)

        _apply_task_service_fields_from_deployments(task, deployments)
        db.session.commit()

        if failed:
            return (
                True,
                f'部分分片已下发（{len(deployments)}/{len(shards)}），失败: {"; ".join(failed)}',
                False,
            )
        hosts = sorted({dep.get('host') for dep in deployments if dep.get('host')})
        return (True, f'已按 {len(deployments)} 个分片下发到节点: {", ".join(hosts)}', False)

    from app.utils import node_client

    policy = getattr(task, 'schedule_policy', None) or 'local'
    target_node_id = getattr(task, 'target_node_id', None)
    if policy == 'node' and not target_node_id:
        return (False, '已选择指定节点但未配置目标节点', False)

    allocation = node_client.allocate_node(
        WORKLOAD_TYPE_STREAM_FORWARD,
        str(task_id),
        capabilities=['stream_forward'],
        gpu_count=1,
        target_node_id=target_node_id if policy == 'node' else None,
        sticky=True,
    )

    node_id = allocation['nodeId']
    host = allocation['host']
    gpu_ids = allocation.get('gpuIds')

    video_root_remote = os.getenv('NODE_REMOTE_VIDEO_ROOT', '/opt/easyaiot/VIDEO')
    work_dir = os.path.join(video_root_remote, 'services', 'stream_forward_service')
    log_dir = os.path.join(video_root_remote, 'logs', f'stream_forward_task_{task_id}')
    python_exec = os.getenv('NODE_REMOTE_PYTHON', 'python3')
    deploy_script = os.path.join(work_dir, 'run_deploy.py')
    command = [python_exec, deploy_script]

    env = _build_stream_forward_deploy_env(task_id, log_dir, host)
    env['VIDEO_ROOT'] = video_root_remote

    result = node_client.deploy_workload(
        node_id=node_id,
        workload_type=WORKLOAD_TYPE_STREAM_FORWARD,
        workload_id=str(task_id),
        command=command,
        work_dir=work_dir,
        log_dir=log_dir,
        env=env,
        gpu_ids=gpu_ids,
    )

    deployment = [{
        'device_ids': device_ids,
        'node_id': node_id,
        'host': host,
        'workload_id': str(task_id),
        'pid': result.get('pid'),
        'log_dir': log_dir,
    }]
    _apply_task_service_fields_from_deployments(task, deployment)
    task.node_id = node_id
    db.session.commit()

    logger.info(
        '推流转发任务远程部署成功 task_id=%s node_id=%s host=%s pid=%s',
        task_id, node_id, host, result.get('pid'),
    )
    return (True, f'已下发到节点 {host}', False)


def _stop_remote_workload(node_id: int, workload_id: str) -> None:
    from app.utils import node_client
    try:
        node_client.stop_workload(node_id, WORKLOAD_TYPE_STREAM_FORWARD, workload_id)
    except Exception as e:
        logger.warning('远程停止推流转发 workload 失败 node_id=%s workload_id=%s: %s', node_id, workload_id, e)


def _stop_all_remote_deployments(task: StreamForwardTask) -> None:
    deployments = _parse_device_deployments(task)
    if deployments:
        for dep in deployments:
            node_id = dep.get('node_id')
            workload_id = dep.get('workload_id')
            if node_id and workload_id:
                _stop_remote_workload(int(node_id), str(workload_id))
        return

    task_id = task.id
    node_id = getattr(task, 'node_id', None)
    if node_id:
        _stop_remote_workload(int(node_id), str(task_id))


def get_service_script_path() -> str:
    video_root = _get_video_root()
    return os.path.join(video_root, 'services', 'stream_forward_service', 'run_deploy.py')


def _get_log_path(task_id: int) -> str:
    log_base_dir = os.path.join(_get_video_root(), 'logs')
    log_dir = os.path.join(log_base_dir, f'stream_forward_task_{task_id}')
    os.makedirs(log_dir, exist_ok=True)
    return log_dir


def cleanup_orphaned_processes(task_id: int):
    """清理本机遗留的 run_deploy.py / FFmpeg 进程（远程任务跳过）"""
    try:
        import psutil

        protected_pids = set()
        with _daemons_lock:
            if task_id in _running_daemons:
                daemon = _running_daemons[task_id]
                if daemon._running and daemon._process and daemon._process.poll() is None:
                    protected_pids.add(daemon._process.pid)
                    try:
                        parent_proc = psutil.Process(daemon._process.pid)
                        for child in parent_proc.children(recursive=True):
                            protected_pids.add(child.pid)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass

        target_script = 'run_deploy.py'
        killed_count = 0
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'environ']):
            try:
                cmdline = proc.info.get('cmdline', [])
                if not cmdline:
                    continue

                is_target = False
                cmdline_str = ' '.join(cmdline)
                script_path_match = any(
                    str(arg).endswith(target_script) or str(arg).endswith(target_script.replace('.py', ''))
                    for arg in cmdline
                )

                if script_path_match:
                    try:
                        environ = proc.info.get('environ', {})
                        if environ and environ.get('TASK_ID') == str(task_id):
                            is_target = True
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue

                is_ffmpeg = False
                if 'ffmpeg' in cmdline_str.lower():
                    try:
                        parent = proc.parent()
                        if parent:
                            parent_cmdline = parent.cmdline()
                            if parent_cmdline and any(str(arg).endswith(target_script) for arg in parent_cmdline):
                                try:
                                    parent_environ = parent.environ()
                                    if parent_environ and parent_environ.get('TASK_ID') == str(task_id):
                                        is_ffmpeg = True
                                except (psutil.NoSuchProcess, psutil.AccessDenied):
                                    pass
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass

                if (is_target or is_ffmpeg) and proc.info['pid'] not in protected_pids:
                    try:
                        proc.terminate()
                        time.sleep(0.5)
                        if proc.is_running():
                            proc.kill()
                        killed_count += 1
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        if killed_count > 0:
            logger.info(f"🧹 清理了 {killed_count} 个遗留进程 (task_id={task_id})")

    except ImportError:
        try:
            protected_pids = set()
            with _daemons_lock:
                if task_id in _running_daemons:
                    daemon = _running_daemons[task_id]
                    if daemon._running and daemon._process and daemon._process.poll() is None:
                        protected_pids.add(daemon._process.pid)

            result = subprocess.run(['ps', 'aux'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if 'run_deploy.py' in line and f'TASK_ID={task_id}' in line:
                        parts = line.split()
                        if len(parts) > 1:
                            try:
                                pid = int(parts[1])
                                if pid not in protected_pids:
                                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                            except (ProcessLookupError, OSError, ValueError):
                                pass
        except Exception as e:
            logger.warning(f"清理遗留进程失败: {str(e)}")
    except Exception as e:
        logger.warning(f"清理遗留进程时出错: {str(e)}")


def stop_stream_forward_task(task_id: int):
    """停止推流转发任务（本机或远程，含设备级多分片）"""
    with _starting_lock:
        if task_id in _starting_tasks:
            task_start_lock = _starting_tasks[task_id]
            if task_start_lock.acquire(blocking=True, timeout=5):
                task_start_lock.release()

    task = StreamForwardTask.query.get(task_id)
    was_remote = bool(task and _task_has_active_remote_deployments(task))
    if was_remote and task:
        _stop_all_remote_deployments(task)
        _apply_task_service_fields_from_deployments(task, [])
        db.session.commit()

    with _daemons_lock:
        if task_id in _running_daemons:
            daemon = _running_daemons[task_id]
            try:
                daemon.stop()
                logger.info(f"✅ 停止推流转发服务成功: task_id={task_id}")
            except Exception as e:
                logger.error(f"❌ 停止推流转发服务失败: task_id={task_id}, error={str(e)}")
            finally:
                del _running_daemons[task_id]

    if not was_remote:
        cleanup_orphaned_processes(task_id)


def _collect_deployed_device_ids(deployments: List[Dict[str, Any]]) -> set:
    deployed = set()
    for dep in deployments:
        for device_id in dep.get('device_ids') or []:
            deployed.add(device_id)
    return deployed


def _next_shard_index(deployments: List[Dict[str, Any]]) -> int:
    max_index = -1
    for dep in deployments:
        workload_id = str(dep.get('workload_id') or '')
        if ':s' in workload_id:
            try:
                max_index = max(max_index, int(workload_id.rsplit(':s', 1)[1]))
            except (TypeError, ValueError):
                pass
    return max(max_index + 1, len(deployments))


def rebalance_stream_forward_task(task_id: int) -> bool:
    """设备列表变更后增量重平衡：仅停止移除分片、部署新增分片。"""
    task = StreamForwardTask.query.get(task_id)
    if not task:
        return False
    if not task.is_enabled:
        return True

    if not _use_remote_deploy(task):
        with _daemons_lock:
            daemon = _running_daemons.get(task_id)
            if daemon:
                try:
                    daemon.restart()
                    logger.info('推流转发本机任务已重启以同步设备列表: task_id=%s', task_id)
                    return True
                except Exception as e:
                    logger.error('推流转发本机任务重启失败 task_id=%s: %s', task_id, e)
                    return False
        start_stream_forward_task(task_id)
        return True

    if not _use_device_level_schedule(task):
        return restart_stream_forward_task_services(task_id)

    current_ids = {d.id for d in (task.devices or []) if d.id}
    deployments = _parse_device_deployments(task)
    deployed_ids = _collect_deployed_device_ids(deployments)
    removed_ids = deployed_ids - current_ids
    added_ids = sorted(current_ids - deployed_ids)

    if not removed_ids and not added_ids:
        logger.info('推流转发任务无需重平衡: task_id=%s', task_id)
        return True

    logger.info(
        '推流转发任务开始重平衡: task_id=%s, 新增=%s, 移除=%s',
        task_id, added_ids, sorted(removed_ids),
    )

    kept_deployments: List[Dict[str, Any]] = []
    for dep in deployments:
        dep_devices = set(dep.get('device_ids') or [])
        if dep_devices & removed_ids:
            node_id = dep.get('node_id')
            workload_id = dep.get('workload_id')
            if node_id and workload_id:
                _stop_remote_workload(int(node_id), str(workload_id))
            continue
        kept_deployments.append(dep)

    failed_added: List[str] = []
    if added_ids:
        shards = _make_device_shards(added_ids)
        shard_index = _next_shard_index(kept_deployments)
        for shard_device_ids in shards:
            try:
                kept_deployments.append(
                    _deploy_shard_on_remote_node(task_id, task, shard_index, shard_device_ids)
                )
                shard_index += 1
            except Exception as e:
                logger.error(
                    '推流转发新增分片部署失败 task_id=%s devices=%s: %s',
                    task_id, shard_device_ids, e, exc_info=True,
                )
                failed_added.extend(shard_device_ids)

    if not kept_deployments and current_ids:
        logger.warning('推流转发重平衡后无存活分片，回退全量部署: task_id=%s', task_id)
        return restart_stream_forward_task_services(task_id)

    _apply_task_service_fields_from_deployments(task, kept_deployments)
    db.session.commit()

    if failed_added:
        logger.warning('推流转发重平衡部分失败 task_id=%s failed=%s', task_id, failed_added)
        return False
    return True


def restart_stream_forward_task_services(task_id: int) -> bool:
    """重启推流转发任务服务"""
    task = StreamForwardTask.query.get(task_id)
    if task and _use_remote_deploy(task):
        _stop_all_remote_deployments(task)
        _apply_task_service_fields_from_deployments(task, [])
        db.session.commit()
        success, _, _ = _deploy_task_on_remote_node(task_id, task)
        return success

    with _daemons_lock:
        if task_id in _running_daemons:
            daemon = _running_daemons[task_id]
            try:
                daemon.restart()
                logger.info(f"✅ 重启推流转发任务 {task_id} 的服务成功")
                return True
            except Exception as e:
                logger.error(f"❌ 重启推流转发任务 {task_id} 的服务失败: {str(e)}")
                return False
    logger.warning(f"推流转发任务 {task_id} 的服务未运行，无法重启")
    return False


def start_stream_forward_task(task_id: int):
    """启动推流转发任务（本机守护进程或远程节点/设备级分片）"""
    task = StreamForwardTask.query.get(task_id)
    if not task:
        raise ValueError(f"推流转发任务不存在: task_id={task_id}")

    with _starting_lock:
        if task_id not in _starting_tasks:
            _starting_tasks[task_id] = threading.Lock()
        task_start_lock = _starting_tasks[task_id]

    with task_start_lock:
        if _use_remote_deploy(task):
            if _task_has_active_remote_deployments(task):
                logger.info('推流转发任务 %s 已有远程部署记录，跳过重复部署', task_id)
                return
            success, message, _ = _deploy_task_on_remote_node(task_id, task)
            if not success:
                raise RuntimeError(message)
            return

        with _daemons_lock:
            if task_id in _running_daemons:
                daemon = _running_daemons[task_id]
                if daemon._running and daemon._process and daemon._process.poll() is None:
                    logger.warning(f"推流转发任务已在运行: task_id={task_id}")
                    return

        cleanup_orphaned_processes(task_id)
        log_path = _get_log_path(task_id)

        with _daemons_lock:
            daemon = StreamForwardDaemon(task_id, log_path)
            _running_daemons[task_id] = daemon

        logger.info(f"✅ 启动推流转发服务成功: task_id={task_id}, log_path={log_path}")

        with _starting_lock:
            if task_id in _starting_tasks:
                del _starting_tasks[task_id]


def auto_start_all_tasks(app=None):
    """自动启动所有启用的推流转发任务的服务"""
    try:
        if app:
            with app.app_context():
                _auto_start_all_tasks_internal()
        else:
            _auto_start_all_tasks_internal()
    except Exception as e:
        logger.error(f"❌ 自动启动推流转发任务服务失败: {str(e)}", exc_info=True)


def _auto_start_all_tasks_internal():
    try:
        all_tasks = StreamForwardTask.query.all()
        if all_tasks:
            logger.info(f"📊 数据库中共有 {len(all_tasks)} 个推流转发任务")
            for task in all_tasks:
                device_count = len(task.devices) if task.devices else 0
                policy = getattr(task, 'schedule_policy', None) or 'local'
                dep_count = len(_parse_device_deployments(task))
                status = "运行中" if task.is_enabled else "已停止"
                logger.info(
                    f"  任务 {task.id} ({task.task_name}): is_enabled={task.is_enabled} ({status}), "
                    f"设备数={device_count}, schedule={policy}, 远程分片={dep_count}"
                )

        tasks = StreamForwardTask.query.filter(StreamForwardTask.is_enabled == True).all()
        if not tasks:
            logger.info("没有需要启动的推流转发任务（is_enabled=True）")
            return

        logger.info(f"发现 {len(tasks)} 个需要启动的推流转发任务，开始启动服务...")
        success_count = 0
        for task in tasks:
            try:
                if not task.devices:
                    logger.warning(f"任务 {task.id} ({task.task_name}) 没有关联的摄像头，跳过")
                    continue
                if _use_remote_deploy(task) and _task_has_active_remote_deployments(task):
                    logger.info(f"任务 {task.id} 已有远程部署记录，跳过自动启动")
                    success_count += 1
                    continue
                start_stream_forward_task(task.id)
                success_count += 1
                logger.info(f"✅ 任务 {task.id} ({task.task_name}) 的服务启动成功")
            except Exception as e:
                logger.error(f"❌ 启动任务 {task.id} 的服务时出错: {str(e)}", exc_info=True)

        logger.info(f"✅ 自动启动完成: {success_count}/{len(tasks)} 个任务的服务启动成功")
    except Exception as e:
        logger.error(f"❌ 自动启动推流转发任务服务失败: {str(e)}", exc_info=True)
