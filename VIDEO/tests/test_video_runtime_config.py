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
