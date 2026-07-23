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

    def test_realtime_ai_docker_profile_preserves_hd_motion_quality(self):
        compose = (VIDEO_ROOT / "docker-compose.yaml").read_text(encoding="utf-8")
        docker_env = (VIDEO_ROOT / ".env.docker").read_text(encoding="utf-8")

        expected_compose_defaults = (
            "AI_OUTPUT_FPS=${AI_OUTPUT_FPS:-25}",
            "AI_TARGET_WIDTH=${AI_TARGET_WIDTH:-1280}",
            "AI_TARGET_HEIGHT=${AI_TARGET_HEIGHT:-720}",
            "AI_FFMPEG_PRESET=${AI_FFMPEG_PRESET:-veryfast}",
            "AI_FFMPEG_VIDEO_BITRATE=${AI_FFMPEG_VIDEO_BITRATE:-3500k}",
            "AI_FFMPEG_GOP_SIZE=${AI_FFMPEG_GOP_SIZE:-50}",
            "FFMPEG_THREADS=${FFMPEG_THREADS:-}",
        )
        for expected in expected_compose_defaults:
            with self.subTest(expected=expected):
                self.assertTrue(
                    expected in compose,
                    f"docker-compose.yaml 缺少高清实时流配置：{expected}",
                )

        for legacy_value in (
            "AI_SOURCE_FPS=5",
            "AI_TARGET_WIDTH=640",
            "AI_TARGET_HEIGHT=360",
            "AI_FFMPEG_VIDEO_BITRATE=800k",
            "FFMPEG_THREADS=1",
        ):
            with self.subTest(legacy_value=legacy_value):
                self.assertTrue(
                    legacy_value not in compose,
                    f"docker-compose.yaml 仍强制低画质配置：{legacy_value}",
                )

        docker_values = dict(
            line.split("=", 1)
            for line in docker_env.splitlines()
            if line and not line.startswith("#") and "=" in line
        )
        expected_docker_values = {
            "SOURCE_FPS": "25",
            "TARGET_WIDTH": "1280",
            "TARGET_HEIGHT": "720",
            "FFMPEG_PRESET": "veryfast",
            "FFMPEG_VIDEO_BITRATE": "3500k",
            "FFMPEG_THREADS": "",
            "FFMPEG_GOP_SIZE": "50",
        }
        for key, expected in expected_docker_values.items():
            with self.subTest(key=key):
                self.assertEqual(docker_values.get(key), expected)

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
