"""
SAM 模型配置
参考：https://github.com/facebookresearch/segment-anything
"""
import os


def _env_bool(key: str, default: bool = False) -> bool:
    return os.getenv(key, str(default)).lower() in ('1', 'true', 'yes', 'on')


def get_sam_config() -> dict:
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    default_checkpoint = os.path.join(base_dir, 'models', 'sam', 'sam_vit_b_01ec64.pth')

    return {
        'enabled': _env_bool('SAM_ENABLED', False),
        'model_type': os.getenv('SAM_MODEL_TYPE', 'vit_b'),
        'checkpoint_path': os.getenv('SAM_CHECKPOINT_PATH', default_checkpoint),
        'device': os.getenv('SAM_DEVICE', 'cuda'),
        'auto_mask_points_per_side': int(os.getenv('SAM_AUTO_MASK_POINTS_PER_SIDE', '32')),
        'min_mask_region_area': int(os.getenv('SAM_MIN_MASK_REGION_AREA', '100')),
        'text_enabled': _env_bool('SAM_TEXT_ENABLED', False),
        'text_service_url': os.getenv('SAM_TEXT_SERVICE_URL', ''),
        'minio_bucket': os.getenv('SAM_MINIO_BUCKET', 'sam-models'),
        'max_image_size_mb': int(os.getenv('SAM_MAX_IMAGE_SIZE_MB', '20')),
        'polygon_epsilon_ratio': float(os.getenv('SAM_POLYGON_EPSILON_RATIO', '0.002')),
    }


SUPPORTED_MODEL_TYPES = ('vit_b', 'vit_l', 'vit_h', 'default')
