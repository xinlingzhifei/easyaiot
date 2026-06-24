"""
GPU 节点 Qwen 大模型推理服务（vLLM OpenAI 兼容 API）。

由 NODE Agent 以子进程方式启动，周期性向 AI 控制面上报心跳与接入信息。
"""
from __future__ import annotations

import atexit
import logging
import os
import signal
import socket
import subprocess
import sys
import threading
import time
from logging.handlers import TimedRotatingFileHandler

import requests

SERVICE_ID = os.getenv('SERVICE_ID', '')
LLM_MODEL_KEY = os.getenv('LLM_MODEL_KEY', '')
LLM_HF_MODEL_ID = os.getenv('LLM_HF_MODEL_ID', '')
PORT = int(os.getenv('PORT', '8100'))
TENSOR_PARALLEL_SIZE = int(os.getenv('TENSOR_PARALLEL_SIZE', '1'))
MAX_MODEL_LEN = int(os.getenv('MAX_MODEL_LEN', '8192'))
MODEL_PATH = os.getenv('MODEL_PATH', '').strip()
AI_SERVICE_API = (os.getenv('AI_SERVICE_API') or os.getenv('AI_API_BASE') or '').rstrip('/')
LOG_PATH = os.getenv('LOG_PATH', '')

_vllm_proc: subprocess.Popen | None = None
logger = logging.getLogger('llm_service')


def _setup_logging() -> None:
    log_dir = LOG_PATH or os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        'logs', 'llm', SERVICE_ID or 'unknown',
    )
    os.makedirs(log_dir, exist_ok=True)
    handler = TimedRotatingFileHandler(
        os.path.join(log_dir, 'llm-service.log'),
        when='midnight',
        backupCount=7,
        encoding='utf-8',
    )
    handler.setFormatter(logging.Formatter('[LLM] %(asctime)s %(levelname)s %(message)s'))
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    logger.addHandler(handler)
    console = logging.StreamHandler(sys.stderr)
    console.setFormatter(handler.formatter)
    logger.addHandler(console)


def _local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return '127.0.0.1'


def _wait_for_vllm_ready(timeout: float = 600.0) -> bool:
    url = f'http://127.0.0.1:{PORT}/v1/models'
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                return True
        except requests.RequestException:
            pass
        if _vllm_proc and _vllm_proc.poll() is not None:
            logger.error('vLLM 进程已退出，退出码=%s', _vllm_proc.returncode)
            return False
        time.sleep(3)
    return False


def _start_vllm() -> subprocess.Popen:
    model_ref = MODEL_PATH or LLM_HF_MODEL_ID
    if not model_ref:
        raise RuntimeError('LLM_HF_MODEL_ID 或 MODEL_PATH 未设置')

    cmd = [
        sys.executable, '-m', 'vllm.entrypoints.openai.api_server',
        '--model', model_ref,
        '--host', '0.0.0.0',
        '--port', str(PORT),
        '--tensor-parallel-size', str(TENSOR_PARALLEL_SIZE),
        '--max-model-len', str(MAX_MODEL_LEN),
        '--trust-remote-code',
        '--served-model-name', LLM_HF_MODEL_ID or model_ref,
    ]
    logger.info('启动 vLLM: %s', ' '.join(cmd))
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    def _pipe_reader() -> None:
        assert proc.stdout is not None
        for line in proc.stdout:
            logger.info('[vLLM] %s', line.rstrip())

    threading.Thread(target=_pipe_reader, daemon=True).start()
    return proc


def _send_heartbeat(status: str = 'running') -> None:
    if not AI_SERVICE_API or not SERVICE_ID:
        logger.warning('跳过心跳：AI_SERVICE_API 或 SERVICE_ID 未配置')
        return
    server_ip = _local_ip()
    api_endpoint = f'http://{server_ip}:{PORT}/v1'
    payload = {
        'service_id': int(SERVICE_ID),
        'server_ip': server_ip,
        'port': PORT,
        'api_endpoint': api_endpoint,
        'status': status,
        'qwen_model_key': LLM_MODEL_KEY,
        'hf_model_id': LLM_HF_MODEL_ID,
        'process_id': _vllm_proc.pid if _vllm_proc else None,
        'log_path': LOG_PATH,
    }
    url = f'{AI_SERVICE_API}/model/llm_deploy/heartbeat'
    try:
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code >= 400:
            logger.warning('心跳上报失败 HTTP %s: %s', resp.status_code, resp.text[:200])
        else:
            logger.debug('心跳上报成功')
    except requests.RequestException as exc:
        logger.warning('心跳上报异常: %s', exc)


def _heartbeat_loop() -> None:
    while True:
        if _vllm_proc and _vllm_proc.poll() is not None:
            _send_heartbeat('error')
            break
        _send_heartbeat('running')
        time.sleep(20)


def _shutdown(*_args) -> None:
    global _vllm_proc
    _send_heartbeat('stopped')
    if _vllm_proc and _vllm_proc.poll() is None:
        logger.info('停止 vLLM 进程 pid=%s', _vllm_proc.pid)
        _vllm_proc.terminate()
        try:
            _vllm_proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            _vllm_proc.kill()
    _vllm_proc = None


def main() -> int:
    global _vllm_proc
    _setup_logging()
    if not SERVICE_ID:
        logger.error('SERVICE_ID 未设置')
        return 1
    if not LLM_HF_MODEL_ID and not MODEL_PATH:
        logger.error('LLM_HF_MODEL_ID 或 MODEL_PATH 未设置')
        return 1

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)
    atexit.register(_shutdown)

    _send_heartbeat('deploying')
    _vllm_proc = _start_vllm()
    if not _wait_for_vllm_ready():
        logger.error('vLLM 启动超时或失败')
        _send_heartbeat('error')
        return 1

    logger.info('vLLM 已就绪: http://%s:%s/v1', _local_ip(), PORT)
    _send_heartbeat('running')
    threading.Thread(target=_heartbeat_loop, daemon=True).start()

    while _vllm_proc.poll() is None:
        time.sleep(5)
    logger.error('vLLM 进程退出 code=%s', _vllm_proc.returncode)
    _send_heartbeat('error')
    return _vllm_proc.returncode or 1


if __name__ == '__main__':
    raise SystemExit(main())
