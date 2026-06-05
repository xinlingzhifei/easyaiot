"""AI 根目录环境变量加载：优先 .env.{AI_ENV}，供 run.py 与 ai_service 子进程共用。"""
from __future__ import annotations

import os

from dotenv import load_dotenv


def ai_root_dir() -> str:
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load_ai_env(*, override: bool = True) -> str | None:
    """加载 AI/.env.{AI_ENV} 或 AI/.env；返回实际加载的文件路径。"""
    root = ai_root_dir()
    candidates: list[str] = []
    env_name = os.getenv('AI_ENV', '').strip()
    if env_name:
        candidates.append(os.path.join(root, f'.env.{env_name}'))
    candidates.append(os.path.join(root, '.env'))
    for path in candidates:
        if os.path.isfile(path):
            load_dotenv(path, override=override)
            return path
    load_dotenv(override=override)
    return None
