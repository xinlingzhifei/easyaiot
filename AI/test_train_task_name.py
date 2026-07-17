from types import SimpleNamespace

from app.blueprints.train_task import (
    build_train_task_name,
    is_legacy_bad_task_base_name,
    resolve_task_base_name,
)


def _task(**kwargs):
    defaults = {
        'id': 20,
        'name': 'train_download?prefix=dataset-3_人_v1.0.0_20',
        'dataset_name': '人',
        'dataset_version': 'v1.0.0',
        'hyperparameters': '{"epochs": 100}',
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_build_train_task_name_uses_base_and_id_only():
    assert build_train_task_name('xxx', '人类头部', 'v1.0.0', 22) == 'xxx_22'
    assert build_train_task_name('train', '人', 'v1.0.0', 20) == 'train_20'


def test_is_legacy_bad_task_base_name():
    assert is_legacy_bad_task_base_name('train_download?prefix=dataset-3')
    assert is_legacy_bad_task_base_name('download?prefix=dataset-3')
    assert not is_legacy_bad_task_base_name('xxx')


def test_resolve_task_base_name_from_hyperparameters():
    task = _task(
        hyperparameters='{"task_base_name": "xxx"}',
        name='train_download?prefix=dataset-3_人_v1.0.0_20',
    )
    assert resolve_task_base_name(task) == 'xxx'


def test_resolve_task_base_name_from_legacy_concatenated_name():
    task = _task(
        id=20,
        name='train_download?prefix=dataset-3_人_v1.0.0_20',
        hyperparameters='{"epochs": 100}',
    )
    assert resolve_task_base_name(task) == 'train'
