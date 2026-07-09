"""Record evidence export contract tests."""
import hashlib
import importlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from datetime import datetime

from flask import Flask


class TestRecordExportService(unittest.TestCase):
    def test_create_record_export_reuses_local_record_uri_as_download_url(self):
        from app.services.record_export_service import create_record_export, get_record_export_manifest

        result = create_record_export({
            'review_case_id': 3000,
            'review_item_id': 1000,
            'device_id': 'device-01',
            'camera_id': 'camera-01',
            'source_alert_id': 'alert-export-001',
            'start_time': '2026-06-30T10:10',
            'end_time': '2026-06-30T10:12',
            'record_uri': '/data/playbacks/live/device-01/2026/06/30/clip.flv',
            'format': 'mp4',
        })

        self.assertEqual('ready', result['status'])
        self.assertEqual('existing_record_uri', result['source'])
        self.assertTrue(result['export_id'].startswith('review-3000-1000-'))
        self.assertEqual(
            '/video/alert/record?path=%2Fdata%2Fplaybacks%2Flive%2Fdevice-01%2F2026%2F06%2F30%2Fclip.flv',
            result['download_url'],
        )
        self.assertEqual('/video/record/export/' + result['export_id'] + '/manifest', result['manifest_url'])
        manifest = get_record_export_manifest(result['export_id'])
        self.assertEqual(2, manifest['manifestVersion'])
        self.assertEqual(result['export_id'], manifest['exportId'])

    def test_create_record_export_resolves_record_uri_from_time_window(self):
        from app.services.record_export_service import create_record_export

        resolver_calls = []

        def fake_resolver(payload):
            resolver_calls.append(payload)
            return {
                'record_uri': '/video/record/space/7/video/live/device-01/clip.flv',
                'source': 'record_window',
                'space_id': 7,
                'object_name': 'live/device-01/clip.flv',
                'segment_start_time': '2026-06-30T10:10:10',
                'segment_end_time': '2026-06-30T10:11:10',
            }

        result = create_record_export({
            'review_case_id': 3000,
            'review_item_id': 1000,
            'device_id': 'device-01',
            'start_time': '2026-06-30T10:10:30',
            'end_time': '2026-06-30T10:11:30',
        }, record_resolver=fake_resolver)

        self.assertEqual(1, len(resolver_calls))
        self.assertEqual('ready', result['status'])
        self.assertEqual('record_window', result['source'])
        self.assertEqual('/video/record/space/7/video/live/device-01/clip.flv', result['download_url'])
        self.assertEqual(7, result['space_id'])
        self.assertEqual('live/device-01/clip.flv', result['object_name'])

    def test_select_record_for_window_prefers_nearest_overlapping_segment(self):
        from app.services.record_export_service import _select_record_for_window

        early = types.SimpleNamespace(
            url='/video/record/early.mp4',
            event_time=datetime(2026, 6, 30, 10, 0, 0),
            duration=60,
        )
        matched = types.SimpleNamespace(
            url='/video/record/matched.mp4',
            event_time=datetime(2026, 6, 30, 10, 4, 30),
            duration=180,
        )

        result = _select_record_for_window(
            [early, matched],
            datetime(2026, 6, 30, 10, 5, 0),
            datetime(2026, 6, 30, 10, 6, 0),
        )

        self.assertIs(matched, result)

    def test_async_record_export_worker_moves_job_to_ready_with_hash_and_download(self):
        from app.services.record_export_service import create_record_export, poll_record_export

        runner_calls = []

        def fake_worker(job):
            runner_calls.append(job)
            return {
                'content': b'clipped-video-bytes',
                'download_url': f'/video/record/export/{job["export_id"]}/download',
                'message': 'ffmpeg clipped and stitched evidence',
            }

        started = create_record_export({
            'review_case_id': 3000,
            'review_item_id': 1000,
            'device_id': 'device-01',
            'camera_id': 'camera-01',
            'source_alert_id': 'alert-export-async',
            'start_time': '2026-06-30T10:10',
            'end_time': '2026-06-30T10:12',
            'record_uri': '/video/record/space/7/video/live/device-01/clip.flv',
            'format': 'mp4',
        }, async_worker=True, worker_runner=fake_worker)

        self.assertEqual('pending', started['status'])
        self.assertIn('export_id', started)
        self.assertEqual('/video/record/export/' + started['export_id'], started['status_url'])
        self.assertEqual('/video/record/export/' + started['export_id'] + '/manifest', started['manifest_url'])

        ready = poll_record_export(started['export_id'])

        self.assertEqual(1, len(runner_calls))
        self.assertEqual('ready', ready['status'])
        self.assertTrue(ready['file_hash'].startswith('sha256:'))
        self.assertEqual('/video/record/export/' + started['export_id'] + '/download', ready['download_url'])
        self.assertEqual('/video/record/export/' + started['export_id'] + '/manifest', ready['manifest_url'])
        self.assertEqual('ffmpeg clipped and stitched evidence', ready['message'])

    def test_failed_async_record_export_can_retry_and_records_download_audit(self):
        from app.services.record_export_service import (
            create_record_export,
            download_record_export,
            get_record_export_audit,
            poll_record_export,
            retry_record_export,
        )

        calls = []

        def flaky_worker(job):
            calls.append(job)
            if len(calls) == 1:
                raise RuntimeError('ffmpeg segment missing')
            return {
                'content': b'recovered-video-bytes',
                'message': 'retry clipped evidence',
            }

        started = create_record_export({
            'review_case_id': 3000,
            'review_item_id': 1000,
            'device_id': 'device-01',
            'camera_id': 'camera-01',
            'source_alert_id': 'alert-export-retry',
            'start_time': '2026-06-30T10:10',
            'end_time': '2026-06-30T10:12',
            'record_uri': '/video/record/space/7/video/live/device-01/retry.flv',
            'format': 'mp4',
        }, async_worker=True, worker_runner=flaky_worker)

        failed = poll_record_export(started['export_id'])
        self.assertEqual('failed', failed['status'])
        self.assertEqual(1, failed['retry_count'])
        self.assertEqual('ffmpeg segment missing', failed['last_error'])

        retrying = retry_record_export(started['export_id'])
        ready = poll_record_export(retrying['export_id'])
        downloaded = download_record_export(started['export_id'], operator_user_id='9004', reason='handoff')
        audit = get_record_export_audit(started['export_id'])

        self.assertEqual('pending', retrying['status'])
        self.assertEqual('ready', ready['status'])
        self.assertEqual(2, ready['retry_count'])
        self.assertTrue(ready['file_hash'].startswith('sha256:'))
        self.assertEqual(b'recovered-video-bytes', downloaded['content'])
        self.assertTrue(any(entry['action'] == 'downloaded'
                            and entry['operator_user_id'] == '9004'
                            and entry['reason'] == 'handoff'
                            for entry in audit))

    def test_async_record_export_persists_manifest_content_and_audit_across_restart(self):
        with tempfile.TemporaryDirectory() as store_dir:
            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = store_dir
            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)

            def fake_worker(job):
                return {
                    'content': b'persistent-video-bytes',
                    'message': 'persisted evidence package',
                }

            started = export_service.create_record_export({
                'review_case_id': 3000,
                'review_item_ids': [1000, 1001],
                'event_ids': [7500],
                'device_id': 'device-01',
                'camera_id': 'camera-01',
                'source_alert_id': 'alert-export-persist',
                'start_time': '2026-06-30T10:10',
                'end_time': '2026-06-30T10:12',
                'record_uris': [
                    '/video/record/space/7/video/live/device-01/a.mp4',
                    '/video/record/space/7/video/live/device-01/b.mp4',
                ],
                'record_uri': '/video/record/space/7/video/live/device-01/a.mp4',
                'snapshot_uris': ['snap-a.jpg', 'snap-b.jpg'],
                'operator_user_id': 9004,
                'format': 'mp4',
            }, async_worker=True, worker_runner=fake_worker)
            ready = export_service.poll_record_export(started['export_id'])
            manifest = export_service.get_record_export_manifest(started['export_id'])

            self.assertEqual('ready', ready['status'])
            self.assertEqual('3000', manifest['reviewCaseId'])
            self.assertEqual(['1000', '1001'], manifest['reviewItemIds'])
            self.assertEqual(['7500'], manifest['eventIds'])
            self.assertEqual(['snap-a.jpg', 'snap-b.jpg'], manifest['snapshots'])
            self.assertEqual(2, len(manifest['recordSegments']))
            self.assertTrue(manifest['fileHash'].startswith('sha256:'))

            export_service = importlib.reload(export_service)
            reloaded = export_service.poll_record_export(started['export_id'])
            downloaded = export_service.download_record_export(
                started['export_id'],
                operator_user_id='9005',
                reason='restart verification',
            )
            audit = export_service.get_record_export_audit(started['export_id'])
            manifest_after_download = export_service.get_record_export_manifest(started['export_id'])

            self.assertEqual('ready', reloaded['status'])
            self.assertEqual(b'persistent-video-bytes', downloaded['content'])
            self.assertTrue(any(entry['action'] == 'downloaded'
                                and entry['operator_user_id'] == '9005'
                                for entry in audit))
            self.assertTrue(any(record['operatorUserId'] == '9005'
                                and record['reason'] == 'restart verification'
                                for record in manifest_after_download['downloadRecords']))

            os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
            importlib.reload(export_service)

    def test_record_export_manifest_is_tamper_evident_and_links_approval_downloads(self):
        with tempfile.TemporaryDirectory() as store_dir:
            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = store_dir
            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)

            def fake_worker(job):
                return {
                    'content': b'audit-chain-video',
                    'message': 'immutable evidence package',
                }

            started = export_service.create_record_export({
                'review_case_id': 3000,
                'review_item_ids': [1000, 1001],
                'event_ids': [7500, 7501],
                'device_id': 'device-01',
                'camera_id': 'camera-01',
                'source_alert_id': 'alert-export-chain',
                'start_time': '2026-06-30T10:10',
                'end_time': '2026-06-30T10:12',
                'record_uri': '/video/record/space/7/video/live/device-01/a.mp4',
                'snapshot_uris': ['snap-a.jpg'],
                'operator_user_id': 9004,
                'approved_by': 9008,
                'approval_note': 'supervisor approved',
                'expires_at': '2026-07-07T10:12:00Z',
            }, async_worker=True, worker_runner=fake_worker)
            ready = export_service.poll_record_export(started['export_id'])
            manifest = export_service.get_record_export_manifest(started['export_id'])

            self.assertEqual(ready['file_hash'], manifest['packageChecksum'])
            self.assertTrue(manifest['manifestHash'].startswith('sha256:'))
            self.assertEqual('9004', manifest['generatedBy'])
            self.assertEqual('9008', manifest['approval']['approvedBy'])
            self.assertEqual('supervisor approved', manifest['approval']['approvalNote'])
            self.assertEqual('2026-07-07T10:12:00Z', manifest['expiresAt'])
            self.assertEqual(['7500', '7501'], [ref['eventId'] for ref in manifest['eventReferences']])
            self.assertTrue(any(file['name'] == 'content.bin'
                                and file['hash'] == ready['file_hash']
                                and file['sizeBytes'] == len(b'audit-chain-video')
                                for file in manifest['files']))
            self.assertTrue(all(entry['entryHash'].startswith('sha256:')
                                and entry['previousHash']
                                for entry in manifest['audit']))
            self.assertEqual('GENESIS', manifest['audit'][0]['previousHash'])
            self.assertEqual(manifest['audit'][-1]['entryHash'], manifest['immutableAudit']['headHash'])

            export_service.download_record_export(
                started['export_id'],
                operator_user_id='9010',
                reason='court package download',
            )
            manifest_after_download = export_service.get_record_export_manifest(started['export_id'])

            self.assertNotEqual(
                manifest['immutableAudit']['headHash'],
                manifest_after_download['immutableAudit']['headHash'],
            )
            self.assertEqual(
                manifest['immutableAudit']['headHash'],
                manifest_after_download['audit'][-1]['previousHash'],
            )
            self.assertTrue(any(record['operatorUserId'] == '9010'
                                and record['reason'] == 'court package download'
                                for record in manifest_after_download['downloadRecords']))

            os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
            importlib.reload(export_service)

    def test_record_export_manifest_tracks_storage_lifecycle_for_persisted_artifacts(self):
        with tempfile.TemporaryDirectory() as store_dir:
            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = store_dir
            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)

            def fake_worker(job):
                return {
                    'content': b'lifecycle-video-bytes',
                    'message': 'persisted lifecycle evidence package',
                }

            started = export_service.create_record_export({
                'review_case_id': 3001,
                'review_item_id': 1002,
                'device_id': 'device-01',
                'camera_id': 'camera-01',
                'source_alert_id': 'alert-export-lifecycle',
                'start_time': '2026-07-08T10:10',
                'end_time': '2026-07-08T10:12',
                'record_uri': '/video/record/space/7/video/live/device-01/lifecycle.mp4',
                'expires_at': '2026-07-20T00:00:00Z',
                'retention_days': 12,
            }, async_worker=True, worker_runner=fake_worker)
            ready = export_service.poll_record_export(started['export_id'])
            manifest = export_service.get_record_export_manifest(started['export_id'])

            lifecycle = manifest['storageLifecycle']
            self.assertEqual('local_filesystem', lifecycle['storageType'])
            self.assertEqual(store_dir, lifecycle['storeRoot'])
            self.assertEqual('2026-07-20T00:00:00Z', lifecycle['expiresAt'])
            self.assertEqual('retained', lifecycle['status'])
            self.assertEqual(
                started['export_id'] + '/content.bin',
                lifecycle['artifactKeys']['exportPackage'],
            )
            content_file = next(file for file in manifest['files'] if file['role'] == 'export_package')
            self.assertEqual(ready['file_hash'], content_file['hash'])
            self.assertTrue(os.path.exists(content_file['path']))
            self.assertEqual('export_package', content_file['storage']['artifactRole'])
            self.assertEqual('local_filesystem', content_file['storage']['storageType'])
            self.assertEqual(started['export_id'] + '/content.bin', content_file['storage']['objectKey'])
            self.assertEqual(lifecycle['expiresAt'], content_file['storage']['expiresAt'])
            self.assertEqual('retained', content_file['storage']['lifecycleStatus'])

            os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
            importlib.reload(export_service)

    def test_record_export_defaults_to_configured_retention_policy(self):
        with tempfile.TemporaryDirectory() as store_dir:
            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = store_dir
            os.environ['YFEIEYE_RECORD_EXPORT_RETENTION_DAYS'] = '30'
            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)
            try:
                started = export_service.create_record_export({
                    'review_case_id': 3002,
                    'review_item_id': 1003,
                    'device_id': 'device-01',
                    'record_uri': '/video/record/space/7/video/live/device-01/default-retention.mp4',
                }, async_worker=True, worker_runner=lambda job: {'content': b'default-retention-video'})
                export_service.poll_record_export(started['export_id'])
                manifest = export_service.get_record_export_manifest(started['export_id'])

                created_at = export_service._parse_time(manifest['generatedAt'])
                expires_at = export_service._parse_time(manifest['storageLifecycle']['expiresAt'])
                self.assertEqual('30', manifest['storageLifecycle']['retentionDays'])
                self.assertEqual(30, (expires_at - created_at).days)
                self.assertEqual(expires_at.isoformat(), manifest['storageLifecycle']['cleanupPolicy']['deleteAfter'])
            finally:
                os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
                os.environ.pop('YFEIEYE_RECORD_EXPORT_RETENTION_DAYS', None)
                importlib.reload(export_service)

    def test_manifest_verifier_cli_validates_canonical_hash_signature_and_tampering(self):
        with tempfile.TemporaryDirectory() as store_dir:
            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = store_dir
            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)

            started = export_service.create_record_export({
                'review_case_id': 3000,
                'review_item_id': 1000,
                'device_id': 'device-01',
                'camera_id': 'camera-01',
                'source_alert_id': 'alert-export-verifier',
                'start_time': '2026-06-30T10:10',
                'end_time': '2026-06-30T10:12',
                'record_uri': '/video/record/space/7/video/live/device-01/clip.flv',
                'format': 'mp4',
                'operator_user_id': '9004',
                'approved_by': '9008',
            }, async_worker=True, worker_runner=lambda job: {'content': b'verifier-content'})
            export_service.poll_record_export(started['export_id'])
            manifest = export_service.get_record_export_manifest(started['export_id'])
            manifest_path = os.path.join(store_dir, 'manifest.json')
            with open(manifest_path, 'w', encoding='utf-8') as file_obj:
                json.dump(manifest, file_obj, ensure_ascii=False, sort_keys=True)

            from app.services.record_export_manifest_verifier import main, verify_manifest_file

            report = verify_manifest_file(manifest_path)
            self.assertEqual(2, manifest['manifestVersion'])
            self.assertEqual('yfeieye.record-export.manifest.v2', manifest['schema'])
            self.assertTrue(report['valid'])
            self.assertEqual('yfeieye.record-export.manifest.v2', report['manifestSchema'])
            self.assertTrue(report['canonicalHash'].startswith('sha256:'))
            self.assertEqual(manifest['manifestHash'], report['canonicalHash'])
            self.assertTrue(report['signatureValid'])
            self.assertEqual(0, main(['--manifest', manifest_path]))

            tampered = dict(manifest)
            tampered['reviewCaseId'] = 'tampered-case'
            with open(manifest_path, 'w', encoding='utf-8') as file_obj:
                json.dump(tampered, file_obj, ensure_ascii=False, sort_keys=True)
            tampered_report = verify_manifest_file(manifest_path)
            self.assertFalse(tampered_report['valid'])
            self.assertIn('manifest_hash_mismatch', tampered_report['violations'])

            os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
            importlib.reload(export_service)

    def test_manifest_hmac_signature_verifier_checks_files_source_segments_and_clip_params(self):
        with tempfile.TemporaryDirectory() as store_dir:
            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = store_dir
            os.environ['YFEIEYE_RECORD_EXPORT_HMAC_SECRET'] = 'unit-test-manifest-secret'
            os.environ['YFEIEYE_RECORD_EXPORT_KEY_ID'] = 'unit-test-key'
            source_path = os.path.join(store_dir, 'source.mp4')
            with open(source_path, 'wb') as source_file:
                source_file.write(b'source-video-content')

            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)

            started = export_service.create_record_export({
                'review_case_id': 3001,
                'review_item_id': 1001,
                'device_id': 'device-01',
                'camera_id': 'camera-01',
                'source_alert_id': 'alert-export-hmac',
                'start_time': '2026-06-30T10:10:10',
                'end_time': '2026-06-30T10:10:40',
                'record_uri': source_path,
                'format': 'mp4',
                'operator_user_id': '9004',
                'approved_by': '9008',
                'record_segments': [{
                    'recordUri': source_path,
                    'sourceHash': 'sha256:' + __import__('hashlib').sha256(b'source-video-content').hexdigest(),
                    'clipStartTime': '2026-06-30T10:10:10',
                    'clipEndTime': '2026-06-30T10:10:40',
                    'ffmpegCommandHash': 'sha256:clip-command',
                }],
            }, async_worker=True, worker_runner=lambda job: {'content': b'hmac-export-content'})
            export_service.poll_record_export(started['export_id'])
            manifest = export_service.get_record_export_manifest(started['export_id'])
            manifest_path = os.path.join(store_dir, 'manifest.json')
            with open(manifest_path, 'w', encoding='utf-8') as file_obj:
                json.dump(manifest, file_obj, ensure_ascii=False, sort_keys=True)

            from app.services.record_export_manifest_verifier import verify_manifest_file

            report = verify_manifest_file(manifest_path)
            self.assertTrue(report['valid'])
            self.assertEqual('hmac-sha256', manifest['signature']['algorithm'])
            self.assertEqual('unit-test-key', manifest['signature']['keyId'])
            self.assertEqual('v1', manifest['signature']['algorithmVersion'])
            self.assertTrue(report['fileChecks'][0]['valid'])
            self.assertTrue(report['recordSegmentChecks'][0]['valid'])
            self.assertEqual('sha256:clip-command', manifest['recordSegments'][0]['ffmpegCommandHash'])

            tampered = dict(manifest)
            tampered['files'] = [dict(manifest['files'][0], hash='sha256:tampered')]
            with open(manifest_path, 'w', encoding='utf-8') as file_obj:
                json.dump(tampered, file_obj, ensure_ascii=False, sort_keys=True)
            tampered_report = verify_manifest_file(manifest_path)
            self.assertFalse(tampered_report['valid'])
            self.assertIn('file_hash_mismatch', tampered_report['violations'])

            os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
            os.environ.pop('YFEIEYE_RECORD_EXPORT_HMAC_SECRET', None)
            os.environ.pop('YFEIEYE_RECORD_EXPORT_KEY_ID', None)
            importlib.reload(export_service)

    def test_manifest_hmac_keyring_verifier_uses_manifest_key_id_after_rotation(self):
        with tempfile.TemporaryDirectory() as store_dir:
            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = store_dir
            os.environ.pop('YFEIEYE_RECORD_EXPORT_HMAC_SECRET', None)
            os.environ.pop('YFEIEYE_RECORD_EXPORT_KEY_ID', None)
            os.environ['YFEIEYE_RECORD_EXPORT_HMAC_KEYS'] = json.dumps({
                '2026-q2': 'old-manifest-secret',
                '2026-q3': 'new-manifest-secret',
            }, sort_keys=True)
            os.environ['YFEIEYE_RECORD_EXPORT_ACTIVE_KEY_ID'] = '2026-q2'

            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)

            try:
                started = export_service.create_record_export({
                    'review_case_id': 3002,
                    'review_item_id': 1002,
                    'device_id': 'device-01',
                    'camera_id': 'camera-01',
                    'source_alert_id': 'alert-export-keyring',
                    'start_time': '2026-06-30T10:10:10',
                    'end_time': '2026-06-30T10:10:40',
                    'record_uri': '/video/record/space/7/video/live/device-01/clip.flv',
                    'format': 'mp4',
                    'operator_user_id': '9004',
                    'approved_by': '9008',
                }, async_worker=True, worker_runner=lambda job: {'content': b'keyring-export-content'})
                export_service.poll_record_export(started['export_id'])
                manifest = export_service.get_record_export_manifest(started['export_id'])
                self.assertEqual('hmac-sha256', manifest['signature']['algorithm'])
                self.assertEqual('2026-q2', manifest['signature']['keyId'])
                self.assertEqual('v2', manifest['signature']['algorithmVersion'])
                self.assertEqual('v2', manifest['signature']['signatureVersion'])

                manifest_path = os.path.join(store_dir, 'manifest-keyring.json')
                with open(manifest_path, 'w', encoding='utf-8') as file_obj:
                    json.dump(manifest, file_obj, ensure_ascii=False, sort_keys=True)

                os.environ['YFEIEYE_RECORD_EXPORT_ACTIVE_KEY_ID'] = '2026-q3'
                from app.services.record_export_manifest_verifier import verify_manifest_file

                rotated_report = verify_manifest_file(manifest_path)
                self.assertTrue(rotated_report['valid'])
                self.assertTrue(rotated_report['signatureValid'])
                self.assertTrue(rotated_report['signatureKeyAvailable'])
                self.assertEqual('keyring', rotated_report['signatureKeySource'])
                self.assertEqual('2026-q2', rotated_report['keyId'])

                os.environ['YFEIEYE_RECORD_EXPORT_HMAC_KEYS'] = json.dumps({
                    '2026-q3': 'new-manifest-secret',
                }, sort_keys=True)
                missing_key_report = verify_manifest_file(manifest_path)
                self.assertFalse(missing_key_report['valid'])
                self.assertFalse(missing_key_report['signatureKeyAvailable'])
                self.assertIn('missing_hmac_key', missing_key_report['violations'])
            finally:
                os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
                os.environ.pop('YFEIEYE_RECORD_EXPORT_HMAC_KEYS', None)
                os.environ.pop('YFEIEYE_RECORD_EXPORT_ACTIVE_KEY_ID', None)
                importlib.reload(export_service)

    def test_real_ffmpeg_export_keeps_original_source_hash_after_download_audit(self):
        ffmpeg = shutil.which('ffmpeg')
        if not ffmpeg:
            self.skipTest('ffmpeg is required for real record export smoke')

        with tempfile.TemporaryDirectory() as work_dir:
            store_dir = os.path.join(work_dir, 'exports')
            source_path = os.path.join(work_dir, 'source.mp4')
            subprocess.run([
                ffmpeg,
                '-y',
                '-f',
                'lavfi',
                '-i',
                'testsrc=size=32x32:rate=1',
                '-t',
                '2',
                '-pix_fmt',
                'yuv420p',
                source_path,
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            with open(source_path, 'rb') as source_file:
                original_source_hash = 'sha256:' + hashlib.sha256(source_file.read()).hexdigest()

            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = store_dir
            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)

            started = export_service.create_record_export({
                'review_case_id': 3002,
                'review_item_id': 1002,
                'event_ids': [7502],
                'device_id': 'device-01',
                'camera_id': 'camera-01',
                'source_alert_id': 'alert-export-real-ffmpeg',
                'segment_start_time': '2026-06-30T10:00:00',
                'segment_end_time': '2026-06-30T10:00:02',
                'start_time': '2026-06-30T10:00:00',
                'end_time': '2026-06-30T10:00:01',
                'record_uri': source_path,
                'format': 'mp4',
                'operator_user_id': '9004',
            }, async_worker=True)
            ready = export_service.poll_record_export(started['export_id'])
            manifest = export_service.get_record_export_manifest(started['export_id'])

            self.assertEqual('ready', ready['status'])
            self.assertEqual('ffmpeg clipped and stitched evidence', ready['message'])
            self.assertGreater(os.path.getsize(manifest['files'][0]['path']), 0)
            self.assertEqual(original_source_hash, manifest['recordSegments'][0]['sourceHash'])
            self.assertTrue(manifest['recordSegments'][0]['ffmpegCommandHash'].startswith('sha256:'))
            persisted_source_path = manifest['recordSegments'][0]['recordUri']
            self.assertTrue(os.path.isfile(persisted_source_path))
            self.assertTrue(any(file['role'] == 'source_record_segment'
                                and file['path'] == persisted_source_path
                                and file['hash'] == original_source_hash
                                for file in manifest['files']))

            with open(source_path, 'wb') as source_file:
                source_file.write(b'tampered-after-export')

            downloaded = export_service.download_record_export(
                started['export_id'],
                operator_user_id='9011',
                reason='source-retention-expired verification',
            )
            manifest_after_download = export_service.get_record_export_manifest(started['export_id'])

            self.assertEqual(ready['file_hash'], downloaded['file_hash'])
            self.assertEqual(
                original_source_hash,
                manifest_after_download['recordSegments'][0]['sourceHash'],
            )
            from app.services.record_export_manifest_verifier import verify_manifest
            self.assertTrue(verify_manifest(manifest_after_download)['valid'])
            self.assertTrue(any(record['operatorUserId'] == '9011'
                                for record in manifest_after_download['downloadRecords']))

            os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
            importlib.reload(export_service)

    def test_real_ffmpeg_export_materializes_minio_source_by_space_and_object(self):
        ffmpeg = shutil.which('ffmpeg')
        if not ffmpeg:
            self.skipTest('ffmpeg is required for real record export smoke')

        with tempfile.TemporaryDirectory() as work_dir:
            source_path = os.path.join(work_dir, 'source.mp4')
            subprocess.run([
                ffmpeg,
                '-y',
                '-f',
                'lavfi',
                '-i',
                'testsrc=size=32x32:rate=1',
                '-t',
                '2',
                '-pix_fmt',
                'yuv420p',
                source_path,
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            with open(source_path, 'rb') as source_file:
                source_content = source_file.read()
            source_hash = 'sha256:' + hashlib.sha256(source_content).hexdigest()

            os.environ['YFEIEYE_RECORD_EXPORT_STORE_DIR'] = os.path.join(work_dir, 'exports')
            import app.services.record_export_service as export_service
            export_service = importlib.reload(export_service)
            loaded = []

            def load_record(space_id, object_name):
                loaded.append((space_id, object_name))
                return source_content, 'video/mp4', 'source.mp4'

            module_name = 'app.services.record_video_service'
            original_module = sys.modules.get(module_name)
            video_service = types.ModuleType(module_name)
            video_service.get_record_video = load_record
            sys.modules[module_name] = video_service
            try:
                started = export_service.create_record_export({
                    'review_case_id': 3003,
                    'review_item_id': 1003,
                    'device_id': 'device-01',
                    'space_id': 7,
                    'object_name': 'live/device-01/source.mp4',
                    'record_uri': '/video/record/space/7/video/live/device-01/source.mp4',
                    'segment_start_time': '2026-07-10T05:00:00',
                    'segment_end_time': '2026-07-10T05:00:02',
                    'start_time': '2026-07-10T05:00:00',
                    'end_time': '2026-07-10T05:00:01',
                    'format': 'mp4',
                }, async_worker=True)

                ready = export_service.poll_record_export(started['export_id'])
                manifest = export_service.get_record_export_manifest(started['export_id'])

                self.assertEqual([(7, 'live/device-01/source.mp4')], loaded)
                self.assertEqual('ready', ready['status'])
                self.assertEqual('ffmpeg clipped and stitched evidence', ready['message'])
                self.assertEqual(source_hash, manifest['recordSegments'][0]['sourceHash'])
                self.assertTrue(manifest['recordSegments'][0]['ffmpegCommandHash'].startswith('sha256:'))
                self.assertTrue(os.path.isfile(manifest['recordSegments'][0]['recordUri']))
                self.assertEqual(
                    '/video/record/space/7/video/live/device-01/source.mp4',
                    manifest['recordSegments'][0]['originalRecordUri'],
                )
            finally:
                if original_module is None:
                    sys.modules.pop(module_name, None)
                else:
                    sys.modules[module_name] = original_module
                os.environ.pop('YFEIEYE_RECORD_EXPORT_STORE_DIR', None)
                importlib.reload(export_service)


class TestRecordExportBlueprint(unittest.TestCase):
    def test_record_export_route_posts_to_service(self):
        record_module = self._import_record_blueprint_with_stubs()

        app = Flask(__name__)
        app.register_blueprint(record_module.record_bp, url_prefix='/video/record')

        captured = {}

        def fake_create_record_export(payload):
            captured.update(payload)
            return {
                'export_id': 'review-3000-1000-test',
                'download_url': '/video/alert/record?path=%2Fdata%2Fclip.flv',
                'status': 'ready',
                'message': 'using existing record',
            }

        original = getattr(record_module, 'create_record_export', None)
        record_module.create_record_export = fake_create_record_export
        try:
            response = app.test_client().post('/video/record/export', json={
                'review_case_id': 3000,
                'review_item_id': 1000,
                'device_id': 'device-01',
                'camera_id': 'camera-01',
                'source_alert_id': 'alert-export-001',
                'start_time': '2026-06-30T10:10',
                'end_time': '2026-06-30T10:12',
                'record_uri': '/data/clip.flv',
                'format': 'mp4',
            })
        finally:
            if original is None:
                delattr(record_module, 'create_record_export')
            else:
                record_module.create_record_export = original

        self.assertEqual(200, response.status_code)
        body = response.get_json()
        self.assertEqual(0, body['code'])
        self.assertEqual('review-3000-1000-test', body['data']['export_id'])
        self.assertEqual('device-01', captured['device_id'])
        self.assertEqual('alert-export-001', captured['source_alert_id'])

    def test_record_export_status_route_polls_worker_job(self):
        record_module = self._import_record_blueprint_with_stubs()

        app = Flask(__name__)
        app.register_blueprint(record_module.record_bp, url_prefix='/video/record')

        def fake_poll_record_export(export_id):
            return {
                'export_id': export_id,
                'status': 'ready',
                'download_url': f'/video/record/export/{export_id}/download',
                'file_hash': 'sha256:test',
            }

        original = getattr(record_module, 'poll_record_export', None)
        record_module.poll_record_export = fake_poll_record_export
        try:
            response = app.test_client().get('/video/record/export/review-3000-1000-test')
        finally:
            if original is None:
                delattr(record_module, 'poll_record_export')
            else:
                record_module.poll_record_export = original

        self.assertEqual(200, response.status_code)
        body = response.get_json()
        self.assertEqual(0, body['code'])
        self.assertEqual('ready', body['data']['status'])
        self.assertEqual('sha256:test', body['data']['file_hash'])

    def test_record_export_retry_route_requeues_failed_job(self):
        record_module = self._import_record_blueprint_with_stubs()

        app = Flask(__name__)
        app.register_blueprint(record_module.record_bp, url_prefix='/video/record')

        def fake_retry_record_export(export_id):
            return {
                'export_id': export_id,
                'status': 'pending',
                'retry_count': 1,
            }

        original = getattr(record_module, 'retry_record_export', None)
        record_module.retry_record_export = fake_retry_record_export
        try:
            response = app.test_client().post('/video/record/export/review-3000-1000-test/retry')
        finally:
            if original is None:
                delattr(record_module, 'retry_record_export')
            else:
                record_module.retry_record_export = original

        self.assertEqual(200, response.status_code)
        body = response.get_json()
        self.assertEqual(0, body['code'])
        self.assertEqual('pending', body['data']['status'])
        self.assertEqual(1, body['data']['retry_count'])

    def test_record_export_audit_route_lists_job_audit_entries(self):
        record_module = self._import_record_blueprint_with_stubs()

        app = Flask(__name__)
        app.register_blueprint(record_module.record_bp, url_prefix='/video/record')

        def fake_get_record_export_audit(export_id):
            return [{
                'export_id': export_id,
                'action': 'downloaded',
                'operator_user_id': '9004',
                'reason': 'handoff',
            }]

        original = getattr(record_module, 'get_record_export_audit', None)
        record_module.get_record_export_audit = fake_get_record_export_audit
        try:
            response = app.test_client().get('/video/record/export/review-3000-1000-test/audit')
        finally:
            if original is None:
                delattr(record_module, 'get_record_export_audit')
            else:
                record_module.get_record_export_audit = original

        self.assertEqual(200, response.status_code)
        body = response.get_json()
        self.assertEqual(0, body['code'])
        self.assertEqual('downloaded', body['data'][0]['action'])
        self.assertEqual('9004', body['data'][0]['operator_user_id'])

    def test_record_export_manifest_route_returns_persistent_evidence_manifest(self):
        record_module = self._import_record_blueprint_with_stubs()

        app = Flask(__name__)
        app.register_blueprint(record_module.record_bp, url_prefix='/video/record')

        def fake_get_record_export_manifest(export_id):
            return {
                'exportId': export_id,
                'reviewCaseId': '3000',
                'reviewItemIds': ['1000'],
                'eventIds': ['7500'],
                'fileHash': 'sha256:test',
            }

        original = getattr(record_module, 'get_record_export_manifest', None)
        record_module.get_record_export_manifest = fake_get_record_export_manifest
        try:
            response = app.test_client().get('/video/record/export/review-3000-1000-test/manifest')
        finally:
            if original is None:
                delattr(record_module, 'get_record_export_manifest')
            else:
                record_module.get_record_export_manifest = original

        self.assertEqual(200, response.status_code)
        body = response.get_json()
        self.assertEqual(0, body['code'])
        self.assertEqual('3000', body['data']['reviewCaseId'])
        self.assertEqual(['7500'], body['data']['eventIds'])

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
        video_service.create_record_export = lambda payload: {
            'export_id': 'stub',
            'download_url': '/stub',
            'status': 'ready',
        }
        sys.modules['app.services.record_video_service'] = video_service

        sys.modules.pop('app.blueprints.record', None)
        return importlib.import_module('app.blueprints.record')


if __name__ == '__main__':
    unittest.main()
