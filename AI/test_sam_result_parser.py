"""SAM 结果解析与合并逻辑单元测试"""
import pytest

from app.utils.sam_result_parser import to_annotations


def test_to_annotations_rectangle():
    result = {
        'predictions': [
            {'class_name': 'car', 'confidence': 0.9, 'bbox': [10, 20, 110, 120]},
        ],
    }
    annos = to_annotations(result, 200, 200, annotation_type='rectangle')
    assert len(annos) == 1
    assert annos[0]['type'] == 'rectangle'
    assert annos[0]['label'] == 'car'
    assert annos[0]['points'][0]['x'] == pytest.approx(0.05)


def test_to_annotations_polygon():
    result = {
        'predictions': [],
        'masks': [{
            'class_name': 'person',
            'confidence': 0.8,
            'xyn': [[{'x': 0.1, 'y': 0.2}, {'x': 0.3, 'y': 0.2}, {'x': 0.3, 'y': 0.4}]],
        }],
    }
    annos = to_annotations(result, 100, 100, annotation_type='polygon')
    assert len(annos) == 1
    assert annos[0]['type'] == 'polygon'
    assert len(annos[0]['points']) == 3
