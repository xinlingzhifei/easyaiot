import types
import unittest
from urllib.parse import quote


class AlertMediaSerializationTest(unittest.TestCase):

    def test_raw_minio_media_urls_are_rewritten_to_authorized_video_routes(self):
        from app.services.alert_service import _alert_to_dict

        image_url = (
            '/api/v1/buckets/alert-images/objects/download?'
            'prefix=tenants%2F7%2Fcameras%2Fcamera-01%2Falert.jpg')
        record_path = (
            '/api/v1/buckets/record-space/objects/download?'
            'prefix=tenants%2F7%2Fcamera-01%2Fclip.flv')
        alert = types.SimpleNamespace(
            id=1,
            object='person',
            event='intrusion',
            region='zone-a',
            device_id='camera-01',
            device_name='camera',
            image_path='/data/alerts/alert.jpg',
            image_url=image_url,
            record_path=record_path,
            information=None,
            task_type='realtime',
            time=None,
            notify_users=None,
            channels=None,
        )

        serialized = _alert_to_dict(alert)

        self.assertEqual(
            '/video/alert/image?alert_id=1',
            serialized['image_url'],
        )
        self.assertEqual(
            '/video/alert/record?alert_id=1',
            serialized['record_path'],
        )
        self.assertNotIn('image_path', serialized)
        self.assertNotIn('/api/v1/buckets/', str(serialized))
        self.assertNotIn('/data/alerts/', str(serialized))

    def test_alert_record_resolver_never_returns_raw_minio_download_url(self):
        from app.services.alert_service import _record_path_playback_payload

        record_path = (
            '/api/v1/buckets/record-space/objects/download?'
            'prefix=tenants%2F7%2Fcamera-01%2Fclip.flv')

        payload = _record_path_playback_payload(record_path, 'camera-01')

        self.assertNotIn('file_path', payload)
        self.assertEqual(
            f'/video/alert/record?path={quote(record_path, safe="")}',
            payload['video_url'],
        )


if __name__ == '__main__':
    unittest.main()
