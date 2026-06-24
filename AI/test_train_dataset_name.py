import json
import os
import tempfile

from app.utils.train_dataset_name import (
    is_upload_storage_stem,
    read_upload_original_name,
    resolve_dataset_display_name,
    save_upload_meta,
)


def test_is_upload_storage_stem():
    assert is_upload_storage_stem('d1fafdad41e140739061a1afda8e6c10')
    assert not is_upload_storage_stem('人类头部')
    assert not is_upload_storage_stem('dataset-3')


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


def test_resolve_keeps_uuid_when_meta_missing():
    with tempfile.TemporaryDirectory() as tmp:
        zip_path = os.path.join(tmp, 'd1fafdad41e140739061a1afda8e6c10.zip')
        with open(zip_path, 'wb') as fp:
            fp.write(b'zip')

        assert resolve_dataset_display_name(
            zip_path,
            'd1fafdad41e140739061a1afda8e6c10',
        ) == 'd1fafdad41e140739061a1afda8e6c10'
