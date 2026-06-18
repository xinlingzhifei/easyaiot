"""自动标注模型历史上限配置测试"""
import os
from unittest import mock

from app.services.auto_label_config import (
    MODEL_HISTORY_MAX_CAP,
    get_model_history_max,
)


def test_get_model_history_max_override():
    assert get_model_history_max(25) == 25
    assert get_model_history_max(MODEL_HISTORY_MAX_CAP + 50) == MODEL_HISTORY_MAX_CAP
    assert get_model_history_max(0) == 1


def test_get_model_history_max_from_env():
    with mock.patch.dict(os.environ, {'AUTO_LABEL_MODEL_HISTORY_MAX': '30'}):
        assert get_model_history_max() == 30
