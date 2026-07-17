"""
SAM3 推理结果可视化：mask 半透明叠加 + 绿框类别标签（与模型推理一致）。
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from app.utils.algorithm_detection_draw import draw_algorithm_detections

SAM_MASK_COLOR_BGR = (114, 46, 209)
SAM_MASK_ALPHA = 0.28


def _predictions_to_detections(predictions: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    detections: List[Dict[str, Any]] = []
    for pred in predictions or []:
        bbox = pred.get('bbox')
        if not bbox or len(bbox) != 4:
            continue
        class_name = pred.get('class_name')
        if class_name is None or str(class_name).strip() == '':
            class_name = f"class_{pred.get('class', 0)}"
        detections.append({
            'bbox': bbox,
            'class_name': str(class_name),
            'confidence': pred.get('confidence'),
        })
    return detections


def _draw_masks(frame: np.ndarray, masks: Optional[List[Dict[str, Any]]]) -> np.ndarray:
    if frame is None or not masks:
        return frame
    overlay = frame.copy()
    has_mask = False
    for mask in masks:
        contour = (mask.get('xy') or [[]])[0]
        if not contour or len(contour) < 3:
            continue
        pts = np.array([[int(x), int(y)] for x, y in contour], dtype=np.int32)
        cv2.fillPoly(overlay, [pts], SAM_MASK_COLOR_BGR)
        has_mask = True
    if not has_mask:
        return frame
    out = frame.copy()
    cv2.addWeighted(overlay, SAM_MASK_ALPHA, out, 1 - SAM_MASK_ALPHA, 0, out)
    return out


def render_sam_result_image(
    frame: np.ndarray,
    predictions: Optional[List[Dict[str, Any]]],
    masks: Optional[List[Dict[str, Any]]] = None,
    *,
    draw_masks: bool = True,
) -> np.ndarray:
    """在 BGR 图像上绘制 SAM 分割结果，返回标注图。"""
    if frame is None:
        return frame
    annotated = frame.copy()
    if draw_masks:
        annotated = _draw_masks(annotated, masks)
    return draw_algorithm_detections(annotated, _predictions_to_detections(predictions))
