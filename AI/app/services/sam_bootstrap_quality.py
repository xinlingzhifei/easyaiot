"""SAM 冷启动识别率评估：判断行业数据是否适合继续智能标注。"""
from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from db_models import AutoLabelTask


def annotation_count(annotations_raw) -> int:
    if not annotations_raw:
        return 0
    try:
        data = json.loads(annotations_raw) if isinstance(annotations_raw, str) else annotations_raw
    except Exception:
        return 0
    if isinstance(data, list):
        return len(data)
    return 0


def compute_sam_bootstrap_stats(task: AutoLabelTask) -> dict[str, int]:
    """统计 SAM 冷启动命中（有检出）与空结果张数。"""
    from app.services.auto_label_strategy import parse_pipeline_state

    state = parse_pipeline_state(task)
    hit = int(state.get('sam_hit_count') or 0)
    empty = int(state.get('sam_empty_count') or 0)
    if hit + empty > 0:
        return {'sam_hit_count': hit, 'sam_empty_count': empty, 'processed': hit + empty}

    from db_models import AutoLabelResult

    hit = empty = 0
    for row in AutoLabelResult.query.filter_by(task_id=task.id, status='SUCCESS').all():
        if annotation_count(row.annotations) > 0:
            hit += 1
        else:
            empty += 1
    return {'sam_hit_count': hit, 'sam_empty_count': empty, 'processed': hit + empty}


def assess_sam_bootstrap_quality(
    task: AutoLabelTask,
    min_hit_rate: float = 0.3,
) -> dict[str, Any]:
    """
    评估 SAM 冷启动识别率。
    recognition_rate = 有检出的图片数 / 已处理图片数
    """
    stats = compute_sam_bootstrap_stats(task)
    processed = stats['processed']
    hit = stats['sam_hit_count']
    rate = (hit / processed) if processed > 0 else 0.0
    passed = processed == 0 or rate >= min_hit_rate
    return {
        **stats,
        'recognition_rate': round(rate, 4),
        'recognition_rate_pct': round(rate * 100, 1),
        'min_hit_rate': min_hit_rate,
        'min_hit_rate_pct': round(min_hit_rate * 100, 1),
        'sam_quality_passed': passed,
        'review_recommended': not passed,
    }


def record_sam_detection(task: AutoLabelTask, has_detections: bool) -> None:
    """增量记录单张 SAM 标注是否有检出。"""
    from app.services.auto_label_orchestrator import _save_pipeline_state
    from app.services.auto_label_strategy import parse_pipeline_state

    state = parse_pipeline_state(task)
    key = 'sam_hit_count' if has_detections else 'sam_empty_count'
    _save_pipeline_state(task, {key: int(state.get(key) or 0) + 1})
