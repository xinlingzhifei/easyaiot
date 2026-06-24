"""本地上传训练数据集的显示名解析（UUID 存储名 -> 原始文件名）。"""
import json
import os
import re

UPLOAD_STORAGE_STEM_RE = re.compile(r'^[0-9a-f]{32}$', re.IGNORECASE)


def is_upload_storage_stem(name: str) -> bool:
    """判断是否为 uploads 目录下的 UUID 存储文件名（不含扩展名）。"""
    return bool(UPLOAD_STORAGE_STEM_RE.match((name or '').strip()))


def _strip_zip_suffix(name: str) -> str:
    text = (name or '').strip()
    if text.lower().endswith('.zip'):
        return text[:-4]
    return text


def upload_meta_path(dataset_zip_path: str) -> str:
    return f'{dataset_zip_path}.meta.json'


def save_upload_meta(dataset_zip_path: str, original_filename: str) -> None:
    """保存上传 zip 对应的原始文件名元数据。"""
    original = (original_filename or '').strip()
    if not original or not dataset_zip_path:
        return
    meta_path = upload_meta_path(dataset_zip_path)
    with open(meta_path, 'w', encoding='utf-8') as fp:
        json.dump({'originalFileName': original}, fp, ensure_ascii=False)


def read_upload_original_name(dataset_zip_path: str) -> str | None:
    """从 sidecar 元数据读取原始上传文件名。"""
    if not dataset_zip_path:
        return None
    meta_path = upload_meta_path(dataset_zip_path)
    if not os.path.isfile(meta_path):
        return None
    try:
        with open(meta_path, encoding='utf-8') as fp:
            payload = json.load(fp)
        original = (payload.get('originalFileName') or '').strip()
        return original or None
    except (OSError, json.JSONDecodeError, TypeError, AttributeError):
        return None


def resolve_dataset_display_name(
    dataset_path: str | None,
    dataset_name: str | None = None,
) -> str | None:
    """
    解析用于展示/任务命名的数据集名称。
    优先保留已有可读名；若为 UUID 存储名则尝试读取上传元数据。
    """
    stored = _strip_zip_suffix(dataset_name or '')
    if stored and not is_upload_storage_stem(stored):
        return stored

    if dataset_path:
        original = read_upload_original_name(dataset_path)
        if original:
            resolved = _strip_zip_suffix(original)
            if resolved and not is_upload_storage_stem(resolved):
                return resolved

        path_stem = _strip_zip_suffix(os.path.basename(dataset_path.rstrip('/')))
        if path_stem and not is_upload_storage_stem(path_stem):
            return path_stem

    return stored or None
