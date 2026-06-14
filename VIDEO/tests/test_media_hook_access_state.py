import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from flask import Flask, jsonify


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

sys.modules.setdefault(
    "app.services.dvr_device_resolver",
    types.SimpleNamespace(resolve_device_from_hook=Mock(return_value=("cam-001", None))),
)
sys.modules.setdefault(
    "app.services.dvr_upload_service",
    types.SimpleNamespace(process_dvr_event=Mock()),
)
sys.modules.setdefault(
    "app.services.media_kafka_service",
    types.SimpleNamespace(
        build_event_from_srs_hook=Mock(return_value={}),
        build_event_from_zlm_hook=Mock(return_value={}),
        enqueue_srs_dvr_hook=Mock(),
        enqueue_zlm_record_hook=Mock(),
        is_kafka_upload_mode=Mock(return_value=False),
        is_snap_kafka_mode=Mock(return_value=False),
        publish_dvr_event=Mock(),
        publish_snap_event=Mock(),
    ),
)
sys.modules.setdefault(
    "app.services.snap_upload_service",
    types.SimpleNamespace(build_snap_event=Mock(return_value={}), process_snap_event=Mock()),
)
sys.modules.setdefault(
    "app.services.device_access_state_service",
    types.SimpleNamespace(record_srs_publish_online=Mock()),
)
sys.modules.setdefault(
    "app.services.rtmp_ingest_auth_service",
    types.SimpleNamespace(verify_rtmp_publish_hook=Mock(return_value={"accepted": True})),
)

camera_module = types.SimpleNamespace()


def _ok_publish_callback():
    return jsonify({"code": 0, "msg": None})


camera_module.on_publish_callback = _ok_publish_callback
sys.modules["app.blueprints.camera"] = camera_module

from app.blueprints import media_hook


class MediaHookAccessStateTest(unittest.TestCase):

    def test_srs_on_publish_verifies_signed_ingest_before_delegating(self):
        app = Flask(__name__)
        payload = {
            "app": "live",
            "stream": "cam-001",
            "param": "?tenant=tenant-a&exp=1700000060&ver=1&sig=abc",
        }

        with app.test_request_context("/hook/srs/on_publish", method="POST", json=payload):
            with patch("app.blueprints.media_hook.verify_rtmp_publish_hook", return_value={"accepted": True}) as verify:
                response = media_hook.srs_on_publish()

        self.assertEqual(200, response.status_code)
        verify.assert_called_once_with(payload, remote_ip=None)

    def test_srs_on_publish_rejects_unsigned_ingest_without_delegating(self):
        app = Flask(__name__)
        payload = {"app": "live", "stream": "cam-001", "param": ""}
        camera_module.on_publish_callback = Mock(side_effect=_ok_publish_callback)

        with app.test_request_context("/hook/srs/on_publish", method="POST", json=payload):
            with patch(
                "app.blueprints.media_hook.verify_rtmp_publish_hook",
                return_value={
                    "accepted": False,
                    "reason_code": "rtmp_missing_sig",
                    "reason_message": "RTMP ingest signature is required",
                },
            ) as verify:
                response = media_hook.srs_on_publish()

        self.assertEqual(403, response[1])
        self.assertEqual({"code": 403, "msg": "RTMP ingest signature is required"}, response[0].get_json())
        verify.assert_called_once_with(payload, remote_ip=None)
        camera_module.on_publish_callback.assert_not_called()

    def test_zlm_on_publish_uses_same_signed_ingest_validation(self):
        app = Flask(__name__)
        payload = {
            "app": "live",
            "stream": "cam-001",
            "param": "?tenant=tenant-a&exp=1700000060&ver=1&sig=abc",
        }

        with app.test_request_context("/hook/zlm/on_publish", method="POST", json=payload):
            with patch("app.blueprints.media_hook.verify_rtmp_publish_hook", return_value={"accepted": True}) as verify:
                response = media_hook.zlm_on_publish()

        self.assertEqual({"code": 0, "msg": None}, response.get_json())
        verify.assert_called_once_with(payload, remote_ip=None)


if __name__ == "__main__":
    unittest.main()
