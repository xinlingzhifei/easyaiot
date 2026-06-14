import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

models_stub = sys.modules.setdefault("models", types.SimpleNamespace())
models_stub.Device = object
models_stub.DeviceAccessStateCurrent = object
models_stub.DeviceAccessStateEvent = object
models_stub.StreamForwardTask = getattr(models_stub, "StreamForwardTask", object)
models_stub.db = getattr(models_stub, "db", types.SimpleNamespace(session=Mock()))

from app.services.edge_stream_forward_service import ensure_edge_rtsp_forward


class EdgeStreamForwardServiceTest(unittest.TestCase):

    @patch("app.services.edge_stream_forward_service.record_device_access_event")
    @patch("app.services.edge_stream_forward_service.enqueue_agent_command")
    @patch("app.services.edge_stream_forward_service.allocate_device_media")
    @patch("app.services.edge_stream_forward_service.db")
    @patch("app.services.edge_stream_forward_service.Device")
    def test_ensure_edge_rtsp_forward_allocates_media_and_enqueues_command(
        self,
        device_model,
        db,
        allocate_media,
        enqueue,
        record_state,
    ):
        device = Mock()
        device.id = "cam-001"
        device.name = "Gate Camera"
        device.source = "rtsp://user:pass@10.0.0.8/live"
        device.rtmp_stream = ""
        device.http_stream = ""
        device.ai_rtmp_stream = ""
        device.ai_http_stream = ""
        device_model.query.get.return_value = device
        allocate_media.return_value = {
            "rtmpStream": "rtmp://media.example.com/live/cam-001",
            "httpStream": "https://eye.example.com/live/cam-001.flv",
        }
        enqueue.return_value = {"id": 101, "status": "pending"}

        result = ensure_edge_rtsp_forward("cam-001", edge_node_id=7)

        self.assertEqual(101, result["command"]["id"])
        enqueue.assert_called_once()
        payload = enqueue.call_args.kwargs["payload"]
        self.assertEqual("cam-001", payload["deviceId"])
        self.assertEqual("rtsp://user:pass@10.0.0.8/live", payload["rtspUrl"])
        self.assertEqual("rtmp://media.example.com/live/cam-001", payload["rtmpPushUrl"])
        record_state.assert_called_once_with(
            device_id="cam-001",
            protocol="edge_agent",
            state="registering",
            reason_code="edge_command_queued",
            reason_message="Edge Agent stream-forward command queued",
            source_event="stream_forward.deploy.enqueued",
            stream_id="live/cam-001",
            node_id=7,
            tenant_id=None,
            commit=False,
        )
        db.session.commit.assert_called_once()

    @patch("app.services.edge_stream_forward_service.Device")
    def test_ensure_edge_rtsp_forward_rejects_non_rtsp_source(self, device_model):
        device = Mock()
        device.source = "gb28181://34020000001320000001"
        device_model.query.get.return_value = device

        with self.assertRaises(ValueError):
            ensure_edge_rtsp_forward("cam-001", edge_node_id=7)


if __name__ == "__main__":
    unittest.main()
