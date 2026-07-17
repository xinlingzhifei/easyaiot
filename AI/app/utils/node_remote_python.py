"""远程计算节点 Python 启动器（AI bundle 离线运行时）。"""
import logging
import os
import sys

logger = logging.getLogger(__name__)

_DEFAULT_AI_ROOT = '/opt/easyaiot/AI'


def _looks_like_ai_root(path: str) -> bool:
    if not path or not os.path.isdir(path):
        return False
    return os.path.isfile(os.path.join(path, 'db_models.py'))


def detect_local_ai_root() -> str:
    """解析控制面本机 AI 源码根目录（开发/非标准安装路径）。"""
    here = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if _looks_like_ai_root(here):
        return here
    for env_key in ('AI_ROOT', 'NODE_REMOTE_AI_ROOT'):
        val = (os.getenv(env_key) or '').strip()
        if _looks_like_ai_root(val):
            return val
    return _DEFAULT_AI_ROOT


def is_platform_node(node: dict | None) -> bool:
    if not node:
        return False
    caps = node.get('capabilities') or {}
    return bool(
        node.get('isPlatform') or node.get('is_platform') or caps.get('platform')
    )


def resolve_ai_root_for_deploy(node: dict | None = None) -> str:
    """按目标节点解析 AI 根目录：控制面节点用本机路径，远程节点用 NODE_REMOTE_AI_ROOT。"""
    if is_platform_node(node):
        return detect_local_ai_root()

    remote = (os.getenv('NODE_REMOTE_AI_ROOT') or '').strip()
    if _looks_like_ai_root(remote):
        return remote
    return remote or _DEFAULT_AI_ROOT


def resolve_ai_bundle_python(ai_root: str | None = None, bundle: str = 'ai_service') -> str:
    explicit = os.getenv('NODE_REMOTE_PYTHON', '').strip()
    if explicit:
        return explicit
    root = ai_root or detect_local_ai_root()
    bundle_key = (bundle or 'ai_service').strip()
    launcher = os.path.join(root, '.bundles', bundle_key, 'run-python.sh')
    if os.path.isfile(launcher):
        return launcher
    if _looks_like_ai_root(root) and os.path.isfile(sys.executable):
        logger.info(
            'bundle 启动器不存在 %s，回退控制面 Python: %s',
            launcher, sys.executable,
        )
        return sys.executable
    return launcher