"""Recording availability contract tests."""
import importlib
import os
import sys
import tempfile
import types
import unittest
from datetime import datetime, timedelta

from flask import Flask


class TestRecordAvailabilityService(unittest.TestCase):
    def test_build_recording_availability_returns_available_missing_motion_and_export(self):
        service = self._import_record_video_service_with_stubs()

        record = types.SimpleNamespace(
            id=11,
            space_id=7,
            object_name='live/device-01/clip.mp4',
            url='',
            event_time=datetime(2026, 6, 30, 10, 0, 0),
            duration=60,
        )
        alert = types.SimpleNamespace(
            id=21,
            object='person',
            event='intrusion',
            region='gate',
            information='',
            time=datetime(2026, 6, 30, 10, 0, 30),
            device_id='device-01',
            device_name='camera-01',
            image_path='',
            image_url='',
            record_path='',
            task_type='realtime',
            task_id=None,
            task_name='',
            notify_users='',
            channels='',
            notification_sent=False,
            notification_sent_time=None,
            business_tags='',
            correlation_id='corr-001',
        )

        result = service.build_recording_availability(
            records=[record],
            alerts=[alert],
            space_id=7,
            device_id='device-01',
            camera_id='camera-01',
            begin_time=datetime(2026, 6, 30, 10, 0, 0),
            end_time=datetime(2026, 6, 30, 10, 2, 0),
        )

        self.assertEqual('device-01', result['device_id'])
        self.assertEqual('camera-01', result['camera_id'])
        self.assertEqual(2, len(result['segments']))
        self.assertEqual('motion', result['segments'][0]['status'])
        self.assertEqual('/video/record/space/7/video/live/device-01/clip.mp4', result['segments'][0]['play_url'])
        self.assertEqual('/video/record/export', result['segments'][0]['export_url'])
        self.assertEqual(1, result['segments'][0]['motion'])
        self.assertEqual(1, result['segments'][0]['object_count'])
        self.assertEqual('missing', result['segments'][1]['status'])
        self.assertEqual('2026-06-30T10:01:00', result['segments'][1]['start_time'])
        self.assertEqual('2026-06-30T10:02:00', result['segments'][1]['end_time'])
        self.assertEqual(1, len(result['available']))
        self.assertEqual(1, len(result['motion']))
        self.assertEqual(1, len(result['missing']))
        self.assertEqual(60, result['summary']['available_seconds'])
        self.assertEqual(60, result['summary']['missing_seconds'])
        self.assertEqual(1, result['summary']['object_count'])

    def test_missing_segments_classify_operational_gap_reasons(self):
        service = self._import_record_video_service_with_stubs()
        expected_categories = {
            'retention_expired': 'retention',
            'stream_interrupted': 'stream',
            'recording_disabled': 'configuration',
            'video_url_not_configured': 'configuration',
            'record_space_not_found': 'configuration',
            'file_missing': 'filesystem',
            'probe_failed': 'probe',
            'permission_denied': 'permission',
            'service_unavailable': 'service',
            'disk_full': 'storage',
            'cache_flush_failed': 'cache',
        }

        for reason_code, category in expected_categories.items():
            with self.subTest(reason_code=reason_code):
                result = service.build_recording_availability(
                    records=[],
                    alerts=[],
                    space_id=7,
                    device_id='device-01',
                    camera_id='camera-01',
                    begin_time=datetime(2026, 6, 30, 10, 0, 0),
                    end_time=datetime(2026, 6, 30, 10, 1, 0),
                    missing_reason=reason_code,
                )

                missing = result['missing'][0]
                self.assertEqual(reason_code, missing['gap_reason'])
                self.assertEqual(category, missing['gap_reason_category'])
                self.assertIn('retryable', missing)
                self.assertEqual(60, result['summary']['gap_reasons'][reason_code])

    def test_missing_segments_normalize_legacy_gap_reason_aliases(self):
        service = self._import_record_video_service_with_stubs()
        aliases = {
            'file_expired': 'retention_expired',
            'file-expired': 'retention_expired',
            'FILE EXPIRED': 'retention_expired',
            'VIDEO URL NOT CONFIGURED': 'video_url_not_configured',
        }

        for alias, canonical in aliases.items():
            with self.subTest(alias=alias):
                result = service.build_recording_availability(
                    records=[],
                    alerts=[],
                    space_id=7,
                    device_id='device-01',
                    camera_id='camera-01',
                    begin_time=datetime(2026, 6, 30, 10, 0, 0),
                    end_time=datetime(2026, 6, 30, 10, 1, 0),
                    missing_reason=alias,
                )

                missing = result['missing'][0]
                self.assertEqual(canonical, missing['gap_reason'])
                self.assertNotIn(alias, result['summary']['gap_reasons'])
                self.assertEqual({canonical: 60}, result['summary']['gap_reasons'])

    def test_availability_uses_review_overlap_retention_capture_and_probe_facts(self):
        service = self._import_record_video_service_with_stubs()

        valid_record = types.SimpleNamespace(
            id=31,
            space_id=7,
            object_name='live/device-01/valid.mp4',
            url='',
            event_time=datetime(2026, 6, 30, 10, 0, 0),
            duration=60,
            retention_mode='motion',
            pre_capture_seconds=5,
            post_capture_seconds=10,
            probe_result={
                'has_valid_video': True,
                'duration': 60,
                'codec': 'h264',
            },
        )
        corrupt_record = types.SimpleNamespace(
            id=32,
            space_id=7,
            object_name='live/device-01/corrupt.mp4',
            url='',
            event_time=datetime(2026, 6, 30, 10, 1, 20),
            duration=30,
            retention_mode='alerts',
            pre_capture_seconds=5,
            post_capture_seconds=5,
            probe_result={
                'has_valid_video': False,
                'error': 'corrupt_segment',
            },
        )

        result = service.build_recording_availability(
            records=[valid_record, corrupt_record],
            alerts=[],
            space_id=7,
            device_id='device-01',
            camera_id='camera-01',
            begin_time=datetime(2026, 6, 30, 9, 59, 55),
            end_time=datetime(2026, 6, 30, 10, 2, 0),
        )

        self.assertEqual(1, len(result['available']))
        self.assertEqual('2026-06-30T09:59:55', result['available'][0]['segment_start_time'])
        self.assertEqual('2026-06-30T10:01:10', result['available'][0]['segment_end_time'])
        self.assertEqual('motion', result['available'][0]['retention_mode'])
        self.assertEqual(5, result['available'][0]['pre_capture_seconds'])
        self.assertEqual(10, result['available'][0]['post_capture_seconds'])
        self.assertTrue(result['available'][0]['review_overlap'])
        self.assertEqual('h264', result['available'][0]['probe']['codec'])
        self.assertTrue(any(segment['gap_reason'] == 'corrupt_segment'
                            and segment['source'] == 'file_probe_failed'
                            and segment['probe']['error'] == 'corrupt_segment'
                            for segment in result['missing']))
        self.assertEqual('motion', result['summary']['retention_modes'][0])
        self.assertEqual(1, result['summary']['probe_failed_count'])

    def test_recording_storage_drift_patrol_reports_missing_expired_disk_and_cache_failures(self):
        service = self._import_record_video_service_with_stubs()

        with tempfile.TemporaryDirectory() as record_dir:
            existing_path = os.path.join(record_dir, 'existing.mp4')
            with open(existing_path, 'wb') as file_obj:
                file_obj.write(b'recording-bytes')
            missing_path = os.path.join(record_dir, 'missing.mp4')
            now = datetime(2026, 7, 2, 12, 0, 0)
            records = [
                types.SimpleNamespace(
                    id=41,
                    space_id=7,
                    device_id='device-01',
                    object_name='live/device-01/existing.mp4',
                    url=existing_path,
                    event_time=now - timedelta(hours=1),
                    duration=60,
                ),
                types.SimpleNamespace(
                    id=42,
                    space_id=7,
                    device_id='device-01',
                    object_name='live/device-01/missing.mp4',
                    url=missing_path,
                    event_time=now - timedelta(hours=2),
                    duration=60,
                ),
                types.SimpleNamespace(
                    id=43,
                    space_id=7,
                    device_id='device-01',
                    object_name='live/device-01/expired.mp4',
                    url=existing_path,
                    event_time=now - timedelta(days=9),
                    duration=60,
                ),
            ]

            report = service.inspect_recording_storage_drift(
                records=records,
                space_id=7,
                device_id='device-01',
                now=now,
                retention_hours=24,
                disk_probe={
                    'path': record_dir,
                    'total_bytes': 1000,
                    'free_bytes': 20,
                },
                cache_flush_events=[{
                    'device_id': 'device-01',
                    'cache_path': os.path.join(record_dir, 'cache.ts'),
                    'error': 'copy timeout',
                    'happened_at': '2026-07-02T11:59:00',
                }],
            )

            self.assertEqual('device-01', report['device_id'])
            self.assertEqual(7, report['space_id'])
            self.assertEqual(3, report['summary']['record_count'])
            self.assertEqual(4, report['summary']['issue_count'])
            self.assertEqual(1, report['summary']['issue_reasons']['file_missing'])
            self.assertEqual(1, report['summary']['issue_reasons']['file_expired'])
            self.assertEqual(1, report['summary']['issue_reasons']['disk_full'])
            self.assertEqual(1, report['summary']['issue_reasons']['cache_flush_failed'])
            self.assertTrue(any(issue['record_id'] == 42
                                and issue['reason'] == 'file_missing'
                                and issue['suggested_action'] == 'delete_db_metadata_after_review'
                                for issue in report['issues']))
            self.assertTrue(any(issue['record_id'] == 43
                                and issue['reason'] == 'file_expired'
                                and issue['category'] == 'retention'
                                for issue in report['issues']))
            self.assertTrue(any(issue['reason'] == 'disk_full'
                                and issue['category'] == 'storage'
                                and issue['retryable']
                                for issue in report['issues']))
            self.assertTrue(any(issue['reason'] == 'cache_flush_failed'
                                and issue['source'] == 'record_cache'
                                and issue['detail']['error'] == 'copy timeout'
                                for issue in report['issues']))

    @staticmethod
    def _import_record_video_service_with_stubs():
        sys.modules.pop('app.services.record_video_service', None)
        minio_module = types.ModuleType('minio')
        minio_error_module = types.ModuleType('minio.error')

        class S3Error(Exception):
            pass

        minio_error_module.S3Error = S3Error
        sys.modules['minio'] = minio_module
        sys.modules['minio.error'] = minio_error_module

        sys.modules['models'] = types.SimpleNamespace(
            db=types.SimpleNamespace(session=types.SimpleNamespace(rollback=lambda: None)),
            RecordSpace=types.SimpleNamespace(),
            RecordFile=types.SimpleNamespace(),
            Alert=types.SimpleNamespace(),
        )

        alert_service = types.ModuleType('app.services.alert_service')
        alert_service._alert_to_dict = lambda alert: {
            'id': getattr(alert, 'id', None),
            'object': getattr(alert, 'object', None),
            'event': getattr(alert, 'event', None),
            'region': getattr(alert, 'region', None),
            'time': getattr(alert, 'time', None).isoformat() if getattr(alert, 'time', None) else None,
        }
        sys.modules['app.services.alert_service'] = alert_service

        record_space_service = types.ModuleType('app.services.record_space_service')
        record_space_service.get_minio_client = lambda: None
        sys.modules['app.services.record_space_service'] = record_space_service

        metadata_service = types.ModuleType('app.services.space_file_metadata_service')
        metadata_service.delete_record_files_metadata = lambda *args, **kwargs: None
        metadata_service.sync_record_files_from_minio = lambda *args, **kwargs: None
        metadata_service.extract_prefix_from_url = lambda url: url
        sys.modules['app.services.space_file_metadata_service'] = metadata_service

        return importlib.import_module('app.services.record_video_service')


class TestRecordAvailabilityBlueprint(unittest.TestCase):
    def test_record_storage_drift_route_passes_query_to_service(self):
        record_module = self._import_record_blueprint_with_stubs()

        app = Flask(__name__)
        app.register_blueprint(record_module.record_bp, url_prefix='/video/record')

        captured = {}

        def fake_inspect_recording_storage_drift(**kwargs):
            captured.update(kwargs)
            return {
                'space_id': kwargs['space_id'],
                'device_id': kwargs.get('device_id'),
                'issues': [{
                    'reason': 'file_missing',
                    'category': 'filesystem',
                    'record_id': 42,
                }],
                'summary': {
                    'record_count': 3,
                    'issue_count': 1,
                    'issue_reasons': {'file_missing': 1},
                    'healthy': False,
                },
            }

        original = getattr(record_module, 'inspect_recording_storage_drift', None)
        record_module.inspect_recording_storage_drift = fake_inspect_recording_storage_drift
        try:
            response = app.test_client().get(
                '/video/record/space/7/videos/drift'
                '?device_id=device-01'
                '&retention_hours=24'
            )
        finally:
            if original is None:
                delattr(record_module, 'inspect_recording_storage_drift')
            else:
                record_module.inspect_recording_storage_drift = original

        self.assertEqual(200, response.status_code)
        body = response.get_json()
        self.assertEqual(0, body['code'])
        self.assertEqual(7, body['data']['space_id'])
        self.assertEqual('device-01', body['data']['device_id'])
        self.assertEqual(7, captured['space_id'])
        self.assertEqual('device-01', captured['device_id'])
        self.assertEqual(24, captured['retention_hours'])

    def test_record_availability_route_passes_window_to_service(self):
        record_module = self._import_record_blueprint_with_stubs()

        app = Flask(__name__)
        app.register_blueprint(record_module.record_bp, url_prefix='/video/record')

        captured = {}

        def fake_query_recording_availability(**kwargs):
            captured.update(kwargs)
            return {
                'device_id': kwargs['device_id'],
                'camera_id': kwargs.get('camera_id'),
                'segments': [
                    {
                        'status': 'available',
                        'start_time': kwargs['begin_time'],
                        'end_time': kwargs['end_time'],
                        'play_url': '/video/record/space/7/video/live/device-01/clip.mp4',
                        'export_url': '/video/record/export',
                    }
                ],
            }

        original = getattr(record_module, 'query_recording_availability', None)
        record_module.query_recording_availability = fake_query_recording_availability
        try:
            response = app.test_client().get(
                '/video/record/availability'
                '?device_id=device-01'
                '&camera_id=camera-01'
                '&begin_time=2026-06-30%2010:00:00'
                '&end_time=2026-06-30%2010:02:00'
            )
        finally:
            if original is None:
                delattr(record_module, 'query_recording_availability')
            else:
                record_module.query_recording_availability = original

        self.assertEqual(200, response.status_code)
        body = response.get_json()
        self.assertEqual(0, body['code'])
        self.assertEqual('device-01', body['data']['device_id'])
        self.assertEqual('device-01', captured['device_id'])
        self.assertEqual('camera-01', captured['camera_id'])
        self.assertEqual('2026-06-30 10:00:00', captured['begin_time'])
        self.assertEqual('2026-06-30 10:02:00', captured['end_time'])

    @staticmethod
    def _import_record_blueprint_with_stubs():
        db = types.SimpleNamespace(session=types.SimpleNamespace(rollback=lambda: None))
        sys.modules['models'] = types.SimpleNamespace(db=db)

        space_service = types.ModuleType('app.services.record_space_service')
        for name in (
            'create_record_space',
            'update_record_space',
            'delete_record_space',
            'get_record_space',
            'list_record_spaces',
            'get_record_space_by_device_id',
            'sync_spaces_to_minio',
        ):
            setattr(space_service, name, lambda *args, **kwargs: None)
        sys.modules['app.services.record_space_service'] = space_service

        video_service = types.ModuleType('app.services.record_video_service')
        for name in (
            'list_record_videos',
            'delete_record_videos',
            'get_record_video',
            'cleanup_old_videos_by_save_time',
            'sync_record_videos_metadata',
            'list_record_video_dates',
            'list_record_videos_day_detail',
            'find_segment_for_alert',
            'query_recording_availability',
            'inspect_recording_storage_drift',
        ):
            setattr(video_service, name, lambda *args, **kwargs: None)
        sys.modules['app.services.record_video_service'] = video_service

        sys.modules.pop('app.blueprints.record', None)
        return importlib.import_module('app.blueprints.record')


if __name__ == '__main__':
    unittest.main()
