"""
推流转发任务服务启动器
用于自动启动推流转发任务相关的服务

@author reese
@email reese
"""
import os
import sys
import subprocess
import logging
import threading
import signal
import time
from typing import Dict, Optional, Tuple
from datetime import datetime

from models import db, StreamForwardTask
from .stream_forward_daemon import StreamForwardDaemon

logger = logging.getLogger(__name__)

# 存储已启动的守护进程对象
_running_daemons: Dict[int, StreamForwardDaemon] = {}
_daemons_lock = threading.Lock()
# 启动锁：防止并发启动同一个任务
_starting_tasks: Dict[int, threading.Lock] = {}
_starting_lock = threading.Lock()


def get_service_script_path() -> str:
    """获取服务脚本路径
    
    Returns:
        str: 服务脚本的绝对路径
    """
    # 当前文件: VIDEO/app/services/stream_forward_launcher_service.py
    # 需要得到: VIDEO/ 目录
    video_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    service_path = os.path.join(video_root, 'services', 'stream_forward_service', 'run_deploy.py')
    return service_path


def _get_log_path(task_id: int) -> str:
    """获取日志文件路径（按任务ID）
    
    Args:
        task_id: 任务ID
    
    Returns:
        str: 日志目录路径
    """
    video_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    log_base_dir = os.path.join(video_root, 'logs')
    log_dir = os.path.join(log_base_dir, f'stream_forward_task_{task_id}')
    os.makedirs(log_dir, exist_ok=True)
    return log_dir


def cleanup_orphaned_processes(task_id: int):
    """清理遗留的进程（包括run_deploy.py和FFmpeg进程）
    
    Args:
        task_id: 推流转发任务ID
    """
    try:
        import psutil
        
        # 获取当前守护进程管理的进程PID（如果存在）
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
        
        # 查找所有相关的进程
        target_script = 'run_deploy.py'
        target_env = f'TASK_ID={task_id}'
        
        killed_count = 0
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'environ']):
            try:
                cmdline = proc.info.get('cmdline', [])
                if not cmdline:
                    continue
                
                is_target = False
                cmdline_str = ' '.join(cmdline)
                
                script_path_match = False
                for arg in cmdline:
                    arg_str = str(arg)
                    if arg_str.endswith(target_script) or arg_str.endswith(target_script.replace('.py', '')):
                        script_path_match = True
                        break
                
                if script_path_match:
                    try:
                        environ = proc.info.get('environ', {})
                        if environ:
                            proc_task_id = environ.get('TASK_ID')
                            if proc_task_id == str(task_id):
                                is_target = True
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                
                # 检查是否是FFmpeg进程（可能是run_deploy.py的子进程）
                is_ffmpeg = False
                if 'ffmpeg' in cmdline_str.lower():
                    try:
                        parent = proc.parent()
                        if parent:
                            try:
                                parent_cmdline = parent.cmdline()
                                if not parent_cmdline:
                                    continue
                                
                                parent_script_match = False
                                for arg in parent_cmdline:
                                    if str(arg).endswith(target_script):
                                        parent_script_match = True
                                        break
                                
                                if parent_script_match:
                                    try:
                                        parent_environ = parent.environ()
                                        if parent_environ and parent_environ.get('TASK_ID') == str(task_id):
                                            is_ffmpeg = True
                                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                                        continue
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                continue
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                
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
        # psutil未安装，使用ps命令（Linux）
        try:
            protected_pids = set()
            with _daemons_lock:
                if task_id in _running_daemons:
                    daemon = _running_daemons[task_id]
                    if daemon._running and daemon._process:
                        try:
                            if daemon._process.poll() is None:
                                protected_pids.add(daemon._process.pid)
                        except:
                            pass
            
            result = subprocess.run(
                ['ps', 'aux'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                pids_to_kill = []
                for line in lines:
                    if 'run_deploy.py' in line and f'TASK_ID={task_id}' in line:
                        parts = line.split()
                        if len(parts) > 1:
                            try:
                                pid = int(parts[1])
                                if pid not in protected_pids:
                                    pids_to_kill.append(pid)
                            except ValueError:
                                pass
                
                for pid in pids_to_kill:
                    try:
                        os.killpg(os.getpgid(pid), signal.SIGTERM)
                        time.sleep(1)
                        try:
                            os.killpg(os.getpgid(pid), signal.SIGKILL)
                        except:
                            pass
                        logger.info(f"🧹 清理遗留进程: PID={pid} (task_id={task_id})")
                    except (ProcessLookupError, OSError):
                        pass
        except Exception as e:
            logger.warning(f"清理遗留进程失败: {str(e)}")
    except Exception as e:
        logger.warning(f"清理遗留进程时出错: {str(e)}")


def stop_stream_forward_task(task_id: int):
    """停止推流转发任务
    
    Args:
        task_id: 推流转发任务ID
    """
    # 等待启动完成（如果正在启动）
    with _starting_lock:
        if task_id in _starting_tasks:
            task_start_lock = _starting_tasks[task_id]
            if task_start_lock.acquire(blocking=True, timeout=5):
                task_start_lock.release()
    
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
    
    # 清理可能遗留的进程（包括FFmpeg子进程）
    cleanup_orphaned_processes(task_id)


def start_stream_forward_task(task_id: int):
    """启动推流转发任务
    
    Args:
        task_id: 推流转发任务ID
    """
    # 检查任务是否存在
    task = StreamForwardTask.query.get(task_id)
    if not task:
        raise ValueError(f"推流转发任务不存在: task_id={task_id}")
    
    # 检查是否已经在运行
    with _daemons_lock:
        if task_id in _running_daemons:
            daemon = _running_daemons[task_id]
            if daemon._running and daemon._process and daemon._process.poll() is None:
                logger.warning(f"推流转发任务已在运行: task_id={task_id}")
                return
    
    # 获取启动锁
    with _starting_lock:
        if task_id not in _starting_tasks:
            _starting_tasks[task_id] = threading.Lock()
        task_start_lock = _starting_tasks[task_id]
    
    # 使用启动锁防止并发启动
    with task_start_lock:
        # 再次检查是否已经在运行（双重检查）
        with _daemons_lock:
            if task_id in _running_daemons:
                daemon = _running_daemons[task_id]
                if daemon._running and daemon._process and daemon._process.poll() is None:
                    logger.warning(f"推流转发任务已在运行: task_id={task_id}")
                    return
        
        # 清理遗留进程
        cleanup_orphaned_processes(task_id)
        
        # 获取日志路径
        log_path = _get_log_path(task_id)
        
        # 创建并启动守护进程
        with _daemons_lock:
            daemon = StreamForwardDaemon(task_id, log_path)
            _running_daemons[task_id] = daemon
        
        logger.info(f"✅ 启动推流转发服务成功: task_id={task_id}, log_path={log_path}")
        
        # 清理启动锁
        with _starting_lock:
            if task_id in _starting_tasks:
                del _starting_tasks[task_id]


def auto_start_all_tasks(app=None):
    """自动启动所有启用的推流转发任务的服务
    
    Args:
        app: Flask应用实例（用于应用上下文）
    """
    try:
        if app:
            with app.app_context():
                _auto_start_all_tasks_internal()
        else:
            _auto_start_all_tasks_internal()
    except Exception as e:
        logger.error(f"❌ 自动启动推流转发任务服务失败: {str(e)}", exc_info=True)


def _auto_start_all_tasks_internal():
    """内部函数：自动启动所有启用的推流转发任务的服务
    
    只根据 is_enabled 来判断任务是否需要启动：
    - is_enabled=True: 运行中，需要启动服务
    - is_enabled=False: 已停止，不需要启动服务
    """
    try:
        # 先查询所有任务，用于诊断
        all_tasks = StreamForwardTask.query.all()
        
        if all_tasks:
            logger.info(f"📊 数据库中共有 {len(all_tasks)} 个推流转发任务")
            # 输出所有任务的状态信息
            for task in all_tasks:
                device_count = len(task.devices) if task.devices else 0
                status = "运行中" if task.is_enabled else "已停止"
                logger.info(f"  任务 {task.id} ({task.task_name}): is_enabled={task.is_enabled} ({status}), 设备数={device_count}")
        
        # 查询所有启用的推流转发任务（只根据 is_enabled 判断）
        tasks = StreamForwardTask.query.filter(
            StreamForwardTask.is_enabled == True
        ).all()
        
        if not tasks:
            logger.info("没有需要启动的推流转发任务（is_enabled=True）")
            return
        
        logger.info(f"发现 {len(tasks)} 个需要启动的推流转发任务（is_enabled=True），开始启动服务...")
        
        success_count = 0
        for task in tasks:
            try:
                # 检查任务是否有关联的设备
                if not task.devices or len(task.devices) == 0:
                    logger.warning(f"任务 {task.id} ({task.task_name}) 没有关联的摄像头，跳过")
                    continue
                
                # 启动任务的服务
                start_stream_forward_task(task.id)
                success_count += 1
                logger.info(f"✅ 任务 {task.id} ({task.task_name}) 的服务启动成功")
                    
            except Exception as e:
                logger.error(f"❌ 启动任务 {task.id} 的服务时出错: {str(e)}", exc_info=True)
        
        logger.info(f"✅ 自动启动完成: {success_count}/{len(tasks)} 个任务的服务启动成功")
        
    except Exception as e:
        logger.error(f"❌ 自动启动推流转发任务服务失败: {str(e)}", exc_info=True)

