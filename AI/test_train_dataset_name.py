import json
import os
import tempfile

from app.utils.train_dataset_name import (
    LOCAL_DATASET_FALLBACK,
    extract_path_display_hint,
    is_legacy_bad_dataset_name,
    is_upload_storage_stem,
    read_upload_original_name,
    resolve_dataset_display_name,
    save_upload_meta,
)


def test_is_upload_storage_stem():
    assert is_upload_storage_stem('d1fafdad41e140739061a1afda8e6c10')
    assert not is_upload_storage_stem('人类头部')
    assert not is_upload_storage_stem('dataset-3')


def test_is_legacy_bad_dataset_name():
    assert is_legacy_bad_dataset_name('d1fafdad41e140739061a1afda8e6c10')
    assert is_legacy_bad_dataset_name('download?prefix=dataset-3')
    assert is_legacy_bad_dataset_name('download?prefix=dataset-3.zip')
    assert not is_legacy_bad_dataset_name('人类头部')
    assert not is_legacy_bad_dataset_name('人')


def test_resolve_prefers_human_readable_dataset_name():
    assert resolve_dataset_display_name(
        '/tmp/uploads/uuid.zip',
        '人类头部',
    ) == '人类头部'


def test_resolve_reads_upload_meta_for_uuid_name():
    with tempfile.TemporaryDirectory() as tmp:
        zip_path = os.path.join(tmp, 'd1fafdad41e140739061a1afda8e6c10.zip')
        with open(zip_path, 'wb') as fp:
            fp.write(b'zip')
        save_upload_meta(zip_path, '人类头部.zip')

        assert read_upload_original_name(zip_path) == '人类头部.zip'
        assert resolve_dataset_display_name(
            zip_path,
            'd1fafdad41e140739061a1afda8e6c10',
        ) == '人类头部'


def test_resolve_falls_back_for_uuid_without_meta():
    with tempfile.TemporaryDirectory() as tmp:
        zip_path = os.path.join(tmp, 'd1fafdad41e140739061a1afda8e6c10.zip')
        with open(zip_path, 'wb') as fp:
            fp.write(b'zip')

        assert resolve_dataset_display_name(
            zip_path,
            'd1fafdad41e140739061a1afda8e6c10',
        ) == LOCAL_DATASET_FALLBACK


def test_resolve_minio_path_replaces_legacy_bad_name():
    minio_path = '/api/v1/buckets/datasets/objects/download?prefix=dataset-3.zip'
    assert extract_path_display_hint(minio_path) == 'dataset-3'
    assert resolve_dataset_display_name(
        minio_path,
        'download?prefix=dataset-3',
    ) == 'dataset-3'
