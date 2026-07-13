"""Tenant isolation gates for VIDEO maintenance and drift paths."""
from __future__ import annotations

import importlib
import os
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock


class _Column:
    def __init__(self, name):
        self.name = name

    def __eq__(self, value):
        return ('eq', self.name, value)

    def in_(self, values):
        return ('in', self.name, tuple(values))

    def isnot(self, value):
        return ('isnot', self.name, value)


class _DeleteQuery:
    def __init__(self):
        self.filters = []

    def filter(self, *expressions):
        self.filters.extend(expressions)
        return self

    def delete(self, synchronize_session=False):
        del synchronize_session
        return 1


class TenantMaintenanceTest(unittest.TestCase):

    def test_production_runtime_rejects_missing_or_weak_application_secret(self):
        from app.utils.video_env import validate_production_runtime_secrets

        common = {
            'VIDEO_ENV': 'production',
            'MINIO_ACCESS_KEY': 'video-service-user',
            'MINIO_SECRET_KEY': 'm' * 32,
        }
        for secret in ('', 'your-secret-key-please-change-this-to-a-random-string', 'short'):
            with self.subTest(secret=secret), mock.patch.dict(
                    os.environ, {**common, 'SECRET_KEY': secret}, clear=True):
                with self.assertRaises(RuntimeError):
                    validate_production_runtime_secrets()
        for key, value in (
                ('MINIO_ACCESS_KEY', ''),
                ('MINIO_ACCESS_KEY', 'minioadmin'),
                ('MINIO_SECRET_KEY', ''),
                ('MINIO_SECRET_KEY', 'short')):
            with self.subTest(key=key, value=value), mock.patch.dict(
                    os.environ, {
                        **common,
                        'SECRET_KEY': 's' * 32,
                        key: value,
                    }, clear=True):
                with self.assertRaises(RuntimeError):
                    validate_production_runtime_secrets()

    def test_production_runtime_accepts_external_strong_secrets(self):
        from app.utils.video_env import validate_production_runtime_secrets

        with mock.patch.dict(os.environ, {
                'VIDEO_ENV': 'production',
                'SECRET_KEY': 's' * 32,
                'MINIO_ACCESS_KEY': 'video-service-user',
                'MINIO_SECRET_KEY': 'm' * 32,
        }, clear=True):
            validate_production_runtime_secrets()

    def test_video_runtime_state_mounts_live_outside_versioned_release_tree(self):
        compose = (Path(__file__).resolve().parent / 'docker-compose.yaml').read_text(
            encoding='utf-8')

        for directory in ('data', 'static', 'temp_uploads', 'model', 'alert_images', 'logs'):
            self.assertIn(
                f'${{YFEIEYE_VIDEO_STATE_ROOT:-/data/yfeieye-video}}/{directory}',
                compose,
            )
            self.assertNotIn(f'\n      - ./{directory}:/app/{directory}', compose)

    def test_video_compose_keeps_host_service_private_and_secrets_out_of_source(self):
        compose = (Path(__file__).resolve().parent / 'docker-compose.yaml').read_text(
            encoding='utf-8')
        example = (Path(__file__).resolve().parent / 'env.example').read_text(
            encoding='utf-8')

        self.assertIn('FLASK_RUN_HOST=${FLASK_RUN_HOST:-127.0.0.1}', compose)
        self.assertNotIn('ALLOWED_HOSTS=${ALLOWED_HOSTS:-[*]}', compose)
        self.assertNotIn('DATABASE_URL=postgresql://', compose)
        self.assertNotIn('SECRET_KEY=${SECRET_KEY:-', compose)
        self.assertNotRegex(compose, r'MINIO_ACCESS_KEY=\$\{MINIO_ACCESS_KEY:-[^}]+\}')
        self.assertNotRegex(compose, r'MINIO_SECRET_KEY=\$\{MINIO_SECRET_KEY:-[^}]+\}')
        self.assertIn('env_file:\n      - .env.docker', compose)
        self.assertIn(
            'http://$${FLASK_RUN_HOST:-127.0.0.1}:$${FLASK_RUN_PORT:-6000}/actuator/health',
            compose,
        )
        self.assertIn('FLASK_RUN_HOST=127.0.0.1', example)
        self.assertIn('ALLOWED_HOSTS=localhost,127.0.0.1', example)
        for unsafe in (
                'your-secret-key-please-change-this-to-a-random-string',
                'postgresql://postgres:iot45722414822@',
                'MINIO_ACCESS_KEY=minioadmin',
                'MINIO_SECRET_KEY=basiclab@iot975248395'):
            self.assertNotIn(unsafe, example)

    def test_minio_compose_binds_loopback_and_requires_external_credentials(self):
        compose = (
            Path(__file__).resolve().parents[1]
            / '.scripts' / 'docker' / 'docker-compose.yml'
        ).read_text(encoding='utf-8')

        self.assertIn('127.0.0.1:9000:9000', compose)
        self.assertIn('127.0.0.1:9001:9001', compose)
        self.assertNotIn('0.0.0.0:9000:9000', compose)
        self.assertNotIn('0.0.0.0:9001:9001', compose)
        self.assertIn('MINIO_ROOT_USER=${MINIO_ROOT_USER:?', compose)
        self.assertIn('MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:?', compose)
        self.assertNotIn('MINIO_ROOT_USER=minioadmin', compose)

    def test_minio_clients_do_not_override_external_credentials_with_defaults(self):
        root = Path(__file__).resolve().parents[1]
        ai_compose = (root / 'AI' / 'docker-compose.yaml').read_text(encoding='utf-8')
        device_compose = (root / 'DEVICE' / 'docker-compose.yml').read_text(
            encoding='utf-8')

        self.assertNotRegex(
            ai_compose, r'MINIO_ACCESS_KEY=\$\{MINIO_ACCESS_KEY:-[^}]+\}')
        self.assertNotRegex(
            ai_compose, r'MINIO_SECRET_KEY=\$\{MINIO_SECRET_KEY:-[^}]+\}')
        self.assertIn('env_file:\n      - .env.docker', ai_compose)
        self.assertIn('MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:?', device_compose)
        self.assertIn('MINIO_SECRET_KEY=${MINIO_SECRET_KEY:?', device_compose)
        self.assertNotIn('MINIO_ACCESS_KEY=minioadmin', device_compose)

    def test_downloadable_models_default_to_external_model_mount(self):
        utils_root = Path(__file__).resolve().parent / 'app' / 'utils'
        for filename in ('face_model_paths.py', 'plate_model_paths.py'):
            source = (utils_root / filename).read_text(encoding='utf-8')
            self.assertIn("os.path.join(_VIDEO_ROOT, 'model'", source)
            self.assertNotRegex(source, r"os\.path\.join\(_VIDEO_ROOT, '(?:face|plate)_[^']+\.onnx'\)")

    def test_cache_flush_failures_are_isolated_by_tenant_identity_and_filter(self):
        from app.services import record_cache_flush_event_service as cache_events

        with tempfile.TemporaryDirectory() as event_dir, mock.patch.dict(
                os.environ, {'YFEIEYE_RECORD_CACHE_EVENT_DIR': event_dir}):
            cache_events = importlib.reload(cache_events)
            common = {
                'event_id': 'event-1',
                'device_id': 'camera-01',
                'space_id': 3,
                'file_path': '/data/playbacks/live/camera-01/clip.flv',
            }
            first = cache_events.record_cache_flush_failure(
                {**common, 'tenant_id': 7}, 'tenant seven failure')
            second = cache_events.record_cache_flush_failure(
                {**common, 'tenant_id': 8}, 'tenant eight failure')

            self.assertNotEqual(first['identity'], second['identity'])
            self.assertEqual(
                [7],
                [item['tenant_id'] for item in cache_events.list_record_cache_flush_failures(
                    tenant_id=7, space_id=3, device_id='camera-01')],
            )
            cache_events.resolve_record_cache_flush_failure(
                {**common, 'tenant_id': 7})
            self.assertEqual(
                [8],
                [item['tenant_id'] for item in cache_events.list_record_cache_flush_failures(
                    tenant_id=8, space_id=3, device_id='camera-01')],
            )
            with self.assertRaisesRegex(ValueError, 'tenant'):
                cache_events.record_cache_flush_failure(common, 'unscoped')

    def test_janitor_requeue_preserves_explicit_tenant_for_dvr_and_snapshot(self):
        from app.services import media_janitor_service as janitor

        published = []

        def build_dvr(data, device_id=None):
            return {**data, 'device_id': device_id}

        snap_upload = importlib.import_module('app.services.snap_upload_service')
        with mock.patch.object(janitor, 'is_kafka_upload_mode', return_value=True), \
                mock.patch.object(janitor, 'build_event_from_srs_hook', side_effect=build_dvr), \
                mock.patch.object(janitor, 'publish_dvr_event', side_effect=lambda event: published.append(event) or True), \
                mock.patch.object(snap_upload, 'build_snap_event', side_effect=lambda device, path, source, tenant_id: {
                    'device_id': device, 'file_path': path, 'source': source,
                    'tenant_id': tenant_id,
                }), \
                mock.patch.object(janitor, 'is_snap_kafka_mode', return_value=True), \
                mock.patch.object(janitor, 'publish_snap_event', side_effect=lambda event: published.append(event) or True):
            self.assertTrue(janitor.requeue_orphan_dvr({
                'tenant_id': 7,
                'device_id': 'camera-01',
                'file_path': '/data/playbacks/live/camera-01/clip.flv',
            }))
            self.assertTrue(janitor.requeue_orphan_snap({
                'tenant_id': 8,
                'device_id': 'camera-01',
                'file_path': '/data/snaps/camera-01/frame.jpg',
            }))

        self.assertEqual(['7', '8'], [str(event['tenant_id']) for event in published])

    def test_retention_policy_query_is_scoped_to_configured_dvr_tenant(self):
        from app.services import playback_disk_guard_service as guard
        import models
        from app.services import space_save_time_service

        class Query:
            def __init__(self):
                self.filter_by_calls = []

            def filter_by(self, **values):
                self.filter_by_calls.append(values)
                return self

            def filter(self, *_expressions):
                return self

            def all(self):
                return [types.SimpleNamespace(device_id='camera-01', save_time=24)]

        query = Query()
        record_space = types.SimpleNamespace(
            query=query,
            device_id=_Column('device_id'),
        )
        with mock.patch.object(models, 'RecordSpace', record_space), \
                mock.patch.object(
                    space_save_time_service,
                    'enrich_record_space_dict',
                    return_value={'effective_save_time': 24}):
            result = guard._resolve_device_playback_max_age_map(tenant_id=7)

        self.assertEqual([{'tenant_id': 7}], query.filter_by_calls)
        self.assertEqual({'camera-01': 24}, result)

    def test_metadata_deletes_require_tenant_and_space_scope(self):
        from app.services import space_file_metadata_service as metadata

        record_query = _DeleteQuery()
        snap_query = _DeleteQuery()
        playback_query = _DeleteQuery()
        record_model = types.SimpleNamespace(
            query=record_query,
            tenant_id=_Column('tenant_id'),
            space_id=_Column('space_id'),
            bucket_name=_Column('bucket_name'),
            object_name=_Column('object_name'),
        )
        snap_model = types.SimpleNamespace(
            query=snap_query,
            tenant_id=_Column('tenant_id'),
            space_id=_Column('space_id'),
            bucket_name=_Column('bucket_name'),
            object_name=_Column('object_name'),
        )
        playback_model = types.SimpleNamespace(
            query=playback_query,
            file_path=_Column('file_path'),
        )
        session = types.SimpleNamespace(commit=lambda: None)
        with mock.patch.object(metadata, 'RecordFile', record_model), \
                mock.patch.object(metadata, 'SnapImage', snap_model), \
                mock.patch.object(metadata, 'Playback', playback_model), \
                mock.patch.object(metadata.db, 'session', session):
            metadata.delete_record_files_metadata(
                'record-space', ['tenants/7/camera-01/clip.flv'],
                tenant_id=7, space_id=11)
            metadata.delete_snap_images_metadata(
                'snap-space', ['tenants/7/cameras/camera-01/frame.jpg'],
                tenant_id=7, space_id=12)

        self.assertIn(('eq', 'tenant_id', 7), record_query.filters)
        self.assertIn(('eq', 'space_id', 11), record_query.filters)
        self.assertIn(('eq', 'tenant_id', 7), snap_query.filters)
        self.assertIn(('eq', 'space_id', 12), snap_query.filters)


if __name__ == '__main__':
    unittest.main()
