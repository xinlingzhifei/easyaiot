from pathlib import Path
import unittest


VIDEO_ROOT = Path(__file__).resolve().parents[1]


class RealtimeAlgorithmContextTest(unittest.TestCase):
    def test_face_matching_threshold_uses_script_db_session(self):
        source = (
            VIDEO_ROOT / "services" / "realtime_algorithm_service" / "run_deploy.py"
        ).read_text(encoding="utf-8")

        self.assertNotIn("FaceLibrary.query.get", source)
        self.assertIn("db_session.get(FaceLibrary", source)

    def test_face_capture_queue_accepts_realtime_source_event(self):
        queue_source = (
            VIDEO_ROOT / "app" / "utils" / "face_capture_queue_service.py"
        ).read_text(encoding="utf-8")
        realtime_source = (
            VIDEO_ROOT / "services" / "realtime_algorithm_service" / "run_deploy.py"
        ).read_text(encoding="utf-8")

        self.assertIn("source_event: Optional[str] = None", queue_source)
        self.assertIn("task['source_event'] = source_event", queue_source)
        self.assertIn("source_event=source_event", realtime_source)

    def test_gb28181_realtime_uses_cached_input_stream_when_play_fails(self):
        source = (
            VIDEO_ROOT / "services" / "realtime_algorithm_service" / "run_deploy.py"
        ).read_text(encoding="utf-8")

        self.assertIn("resolve_gb28181_source(device.source", source)
        self.assertIn("gb28181_device_stream_urls(device.id)", source)
        self.assertIn("using generated GB28181 HTTP stream", source)
        self.assertIn("for cached_attr in ('http_stream', 'rtmp_stream')", source)
        self.assertIn("using cached {cached_attr}", source)


if __name__ == "__main__":
    unittest.main()
