from pathlib import Path
import unittest


VIDEO_ROOT = Path(__file__).resolve().parents[1]


class VideoRuntimeConfigTest(unittest.TestCase):
    def test_video_service_uses_kafka_external_listener_by_default(self):
        compose = (VIDEO_ROOT / "docker-compose.yaml").read_text(encoding="utf-8")

        self.assertIn(
            "KAFKA_BOOTSTRAP_SERVERS=${KAFKA_BOOTSTRAP_SERVERS:-localhost:9094}",
            compose,
        )
        for env_file in (".env", ".env.docker", ".env.prod"):
            with self.subTest(env_file=env_file):
                content = (VIDEO_ROOT / env_file).read_text(encoding="utf-8")
                self.assertIn("KAFKA_BOOTSTRAP_SERVERS=localhost:9094", content)
                self.assertNotIn("KAFKA_BOOTSTRAP_SERVERS=localhost:9092", content)

    def test_realtime_ai_uses_full_detection_resolution_for_small_people(self):
        compose = (VIDEO_ROOT / "docker-compose.yaml").read_text(encoding="utf-8")

        self.assertIn("YOLO_IMG_SIZE=640", compose)
        self.assertIn("OVERLAY_YOLO_IMG_SIZE=640", compose)
        self.assertNotIn("YOLO_IMG_SIZE=320", compose)
        self.assertNotIn("OVERLAY_YOLO_IMG_SIZE=320", compose)

        for env_file in (".env", ".env.docker", ".env.prod"):
            with self.subTest(env_file=env_file):
                content = (VIDEO_ROOT / env_file).read_text(encoding="utf-8")
                self.assertIn("YOLO_IMG_SIZE=640", content)
                self.assertIn("OVERLAY_YOLO_IMG_SIZE=640", content)
                self.assertNotIn("YOLO_IMG_SIZE=320", content)
                self.assertNotIn("OVERLAY_YOLO_IMG_SIZE=320", content)

    def test_host_network_video_scripts_do_not_write_kafka_internal_port(self):
        runtime_files = [
            "install_linux.sh",
            "install_linux_arm.sh",
            "install_linux_kylin.sh",
            "install_mac.sh",
        ]

        for runtime_file in runtime_files:
            with self.subTest(runtime_file=runtime_file):
                content = (VIDEO_ROOT / runtime_file).read_text(encoding="utf-8")
                self.assertNotIn("KAFKA_BOOTSTRAP_SERVERS=localhost:9092", content)


if __name__ == "__main__":
    unittest.main()
