import unittest
from pathlib import Path


TASK_ROOT = Path(__file__).resolve().parents[1]


class TaskContainerPackagingTest(unittest.TestCase):
    def test_runtime_links_only_the_opencv_components_it_uses(self):
        cmake = (TASK_ROOT / "CMakeLists.txt").read_text(encoding="utf-8")

        self.assertIn(
            "find_package(OpenCV REQUIRED COMPONENTS core imgproc highgui videoio dnn)",
            cmake,
        )
        self.assertIn("${OpenCV_LIBS}", cmake)
        self.assertNotIn("OPENCV_PKG_LIBS", cmake)

    def test_image_contains_the_runtime_used_by_taskmanager(self):
        dockerfile = (TASK_ROOT / "Dockerfile").read_text(encoding="utf-8")

        self.assertIn("-DBUILD_TASK_RUNTIME=ON", dockerfile)
        self.assertIn("--target TaskManager TASK", dockerfile)
        self.assertIn(
            "COPY --from=build /src/build/TASK /usr/local/bin/TASK",
            dockerfile,
        )
        self.assertIn(
            "COPY --from=build /src/models/yolov11n.onnx /app/models/yolov11n.onnx",
            dockerfile,
        )
        self.assertIn(
            '"--task-bin", "/usr/local/bin/TASK"',
            dockerfile,
        )
        self.assertIn("--retry-all-errors", dockerfile)
        self.assertIn("-C -", dockerfile)
        self.assertIn("tar -tzf /tmp/onnxruntime.tgz", dockerfile)

    def test_compose_uses_release_safe_generated_config(self):
        compose = (TASK_ROOT / "docker-compose.yml").read_text(encoding="utf-8")

        self.assertIn(
            "${YFEIEYE_TASK_STATE_ROOT:-/opt/yfeieye-source/shared/task}"
            "/config/generated:/app/config/generated",
            compose,
        )
        self.assertNotIn("./build/linux/TASK", compose)
        self.assertIn('"127.0.0.1:7000:7000"', compose)


if __name__ == "__main__":
    unittest.main(verbosity=2)
