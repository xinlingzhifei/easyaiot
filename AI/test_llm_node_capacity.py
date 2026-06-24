"""llm_node_capacity 单元测试"""
from app.config.qwen_models import get_qwen_preset
from app.services.llm_node_capacity import check_node_vram_for_llm, required_vram_gb


def test_required_vram_scales_when_fewer_gpus_than_recommended():
    preset = get_qwen_preset('qwen3-32b')
    assert preset is not None
    two_gpu = required_vram_gb(preset, 2)
    one_gpu = required_vram_gb(preset, 1)
    assert one_gpu > two_gpu


def test_check_node_vram_insufficient():
    preset = get_qwen_preset('qwen3-4b-instruct-2507')
    assert preset is not None
    node = {
        'id': 1,
        'name': 'gpu-1',
        'host': '10.0.0.1',
        'status': 'online',
        'gpuInfo': [
            {'id': 0, 'name': 'RTX 4090', 'util': 10, 'mem_used_mb': 20000, 'mem_total_mb': 24576},
        ],
    }
    ok, message, details = check_node_vram_for_llm(preset, 1, node)
    assert not ok
    assert '显存不足' in message
    assert details['required_vram_gb'] > 0


def test_check_node_vram_sufficient():
    preset = get_qwen_preset('qwen3-0.6b')
    assert preset is not None
    node = {
        'id': 2,
        'name': 'gpu-2',
        'host': '10.0.0.2',
        'status': 'online',
        'gpuInfo': [
            {'id': 0, 'name': 'RTX 4090', 'util': 5, 'mem_used_mb': 500, 'mem_total_mb': 24576},
        ],
    }
    ok, message, _ = check_node_vram_for_llm(preset, 1, node)
    assert ok
    assert '满足' in message
