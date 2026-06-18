"""SAM 冷启动识别率评估单元测试"""
import json
from types import SimpleNamespace

from app.services.sam_bootstrap_quality import (
    annotation_count,
    assess_sam_bootstrap_quality,
)


def test_annotation_count_parses_list():
    assert annotation_count('[{"type":"rectangle"}]') == 1
    assert annotation_count('[]') == 0
    assert annotation_count(None) == 0


def test_assess_sam_bootstrap_quality_pass():
    task = SimpleNamespace(
        id=1,
        pipeline_config=json.dumps({'sam_hit_count': 80, 'sam_empty_count': 20}),
    )
    result = assess_sam_bootstrap_quality(task, min_hit_rate=0.3)
    assert result['recognition_rate'] == 0.8
    assert result['sam_quality_passed'] is True
    assert result['review_recommended'] is False


def test_assess_sam_bootstrap_quality_fail():
    task = SimpleNamespace(
        id=2,
        pipeline_config=json.dumps({'sam_hit_count': 15, 'sam_empty_count': 85}),
    )
    result = assess_sam_bootstrap_quality(task, min_hit_rate=0.3)
    assert result['recognition_rate'] == 0.15
    assert result['sam_quality_passed'] is False
    assert result['review_recommended'] is True
