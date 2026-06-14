import importlib
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

event_model = Mock()
current_model = Mock()
db = types.SimpleNamespace(session=Mock())
sys.modules["models"] = types.SimpleNamespace(
    Device=object,
    DeviceAccessStateEvent=event_model,
    DeviceAccessStateCurrent=current_model,
    StreamForwardTask=object,
    db=db,
)
sys.modules.pop("app.services.device_access_state_service", None)

state_service = importlib.import_module("app.services.device_access_state_service")
state_service = importlib.reload(state_service)
record_device_access_event = state_service.record_device_access_event
record_srs_publish_online = state_service.record_srs_publish_online
get_device_access_summary = state_service.get_device_access_summary


class DeviceAccessStateServiceTest(unittest.TestCase):

    def setUp(self):
        event_model.reset_mock()
        current_model.reset_mock()
        db.session.reset_mock()
        current_model.query.filter_by.return_value.one_or_none.return_value = None

    def test_records_transition_and_materializes_current_state(self):
        event = Mock()
        current = Mock()
        event_model.return_value = event
        current_model.return_value = current

        result = record_device_access_event(
            device_id="cam-001",
            protocol="edge_agent",
            state="registering",
            reason_code="edge_command_queued",
            reason_message="Edge Agent command queued",
            source_event="stream_forward.deploy.enqueued",
            stream_id="live/cam-001",
            node_id=7,
            tenant_id="tenant-a",
        )

        event_model.assert_called_once()
        current_model.assert_called_once_with(device_id="cam-001", protocol="edge_agent")
        self.assertEqual(event, result["event"])
        self.assertEqual(current, result["current"])
        self.assertEqual("registering", current.state)
        self.assertEqual("edge_command_queued", current.reason_code)
        self.assertEqual("Edge Agent command queued", current.reason_message)
        self.assertEqual("stream_forward.deploy.enqueued", current.source_event)
        self.assertEqual("live/cam-001", current.stream_id)
        self.assertEqual(7, current.node_id)
        self.assertEqual("tenant-a", current.tenant_id)
        db.session.add.assert_any_call(event)
        db.session.add.assert_any_call(current)
        db.session.commit.assert_called_once()

    def test_srs_publish_advances_edge_agent_stream_online_when_edge_is_registering(self):
        current = Mock()
        current.state = "registering"
        current_model.query.filter_by.return_value.one_or_none.return_value = current

        result = record_srs_publish_online(
            {"app": "live", "stream": "cam-001"},
            node_id=7,
            tenant_id="tenant-a",
        )

        self.assertEqual(current, result["current"])
        self.assertEqual("stream_online", current.state)
        self.assertEqual("srs_publish_online", current.reason_code)
        self.assertEqual("SRS publish hook confirmed live stream", current.reason_message)
        self.assertEqual("srs.on_publish", current.source_event)
        self.assertEqual("live/cam-001", current.stream_id)
        self.assertEqual(7, current.node_id)
        self.assertEqual("tenant-a", current.tenant_id)

    def test_device_access_summary_collapses_protocol_rows_for_ui(self):
        edge = Mock()
        edge.protocol = "edge_agent"
        edge.state = "stream_online"
        edge.reason_code = "srs_publish_online"
        edge.reason_message = "SRS publish hook confirmed live stream"
        edge.last_transition_time = None
        webrtc = Mock()
        webrtc.protocol = "webrtc"
        webrtc.state = "play_ready"
        webrtc.reason_code = "webrtc_probe_ok"
        webrtc.reason_message = "WebRTC playback probe passed"
        webrtc.last_transition_time = None
        current_model.query.filter_by.return_value.all.return_value = [edge, webrtc]

        summary = get_device_access_summary("cam-001")

        self.assertEqual("play_ready", summary["state"])
        self.assertTrue(summary["play_ready"])
        self.assertFalse(summary["ai_ready"])
        self.assertEqual("webrtc_probe_ok", summary["reason_code"])
        self.assertEqual("WebRTC playback probe passed", summary["reason_message"])
        self.assertEqual(["edge_agent", "webrtc"], summary["protocols"])


if __name__ == "__main__":
    unittest.main()
