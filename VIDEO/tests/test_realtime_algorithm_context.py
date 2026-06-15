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


if __name__ == "__main__":
    unittest.main()
