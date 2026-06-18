"""自动标注相关可配置项（无 DB 依赖，便于单测）。"""
from __future__ import annotations

import os

DEFAULT_MODEL_HISTORY_MAX = 15
MODEL_HISTORY_MAX_MIN = 1
MODEL_HISTORY_MAX_CAP = 100


def get_model_history_max(override: int | float | str | None = None) -> int:
    """
    自动标注模型历史保留上限。
    优先级：显式 override > 环境变量 AUTO_LABEL_MODEL_HISTORY_MAX > 默认 15。
    有效范围：1–100。
    """
    if override is not None:
        try:
            val = int(override)
            return max(MODEL_HISTORY_MAX_MIN, min(val, MODEL_HISTORY_MAX_CAP))
        except (TypeError, ValueError):
            pass
    try:
        val = int(os.getenv('AUTO_LABEL_MODEL_HISTORY_MAX', str(DEFAULT_MODEL_HISTORY_MAX)))
    except ValueError:
        val = DEFAULT_MODEL_HISTORY_MAX
    return max(MODEL_HISTORY_MAX_MIN, min(val, MODEL_HISTORY_MAX_CAP))
