import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def reserve_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def request_json(method, url, payload=None):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=5) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


class TaskManagerApiTest(unittest.TestCase):
    def setUp(self):
        self.task_manager_bin = os.environ.get("TASK_MANAGER_BIN")
        if not self.task_manager_bin:
            self.fail("TASK_MANAGER_BIN must point to the TaskManager executable")

        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.config_dir = self.root / "generated-config"
        self.fake_task_log = self.root / "fake-task.log"
        if os.name == "nt":
            self.fake_task_bin = self.root / "fake-task.cmd"
            self.fake_task_bin.write_text(
                "@echo off\r\n"
                "echo %~1>> \"{}\"\r\n"
                ":loop\r\n"
                "timeout /t 1 /nobreak >nul\r\n"
                "goto loop\r\n".format(str(self.fake_task_log)),
                encoding="utf-8",
            )
        else:
            self.fake_task_bin = self.root / "fake-task.sh"
            self.fake_task_bin.write_text(
                "#!/bin/sh\n"
                "echo \"$1\" >> \"{}\"\n"
                "trap 'exit 0' TERM INT\n"
                "while true; do sleep 1; done\n".format(str(self.fake_task_log)),
                encoding="utf-8",
            )
            self.fake_task_bin.chmod(0o755)

        self.port = reserve_port()
        self.proc = subprocess.Popen(
            [
                self.task_manager_bin,
                "--host",
                "127.0.0.1",
                "--port",
                str(self.port),
                "--task-bin",
                str(self.fake_task_bin),
                "--config-dir",
                str(self.config_dir),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        self.base_url = f"http://127.0.0.1:{self.port}"
        self.wait_for_health()

    def tearDown(self):
        if getattr(self, "proc", None):
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
                self.proc.wait(timeout=5)
            if self.proc.stdout:
                self.proc.stdout.close()
        if hasattr(self, "temp_dir"):
            self.temp_dir.cleanup()

    def wait_for_health(self):
        deadline = time.time() + 5
        last_error = None
        while time.time() < deadline:
            if self.proc.poll() is not None:
                output = self.proc.stdout.read() if self.proc.stdout else ""
                self.fail(f"TaskManager exited early with code {self.proc.returncode}\n{output}")
            try:
                status, body = request_json("GET", f"{self.base_url}/health")
                if status == 200 and body.get("service") == "TaskManager":
                    return
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                last_error = exc
            time.sleep(0.1)
        self.fail(f"TaskManager did not become healthy: {last_error}")

    def wait_for_fake_task_log(self):
        deadline = time.time() + 5
        while time.time() < deadline:
            if self.fake_task_log.exists():
                text = self.fake_task_log.read_text(encoding="utf-8").strip()
                if text:
                    return text
            time.sleep(0.1)
        self.fail("Fake TASK process did not receive the config path")

    def test_generates_config_and_manages_task_process(self):
        payload = {
            "task_id": 7,
            "task_name": "gate_monitor",
            "video": {
                "source": "rtsp://admin:pass@192.168.1.10:554/stream1",
                "width": 1280,
                "height": 720,
                "fps": 20,
            },
            "model": {
                "model_path": "models/SafeHat.onnx",
                "classes_path": "models/coco.names",
                "confidence_threshold": 0.55,
                "threads": 2,
            },
            "rtmp": {
                "rtmp_url": "rtmp://127.0.0.1:1935/live/gate_monitor",
                "fps": 20,
                "enable": True,
                "enable_draw": True,
            },
            "alarm": {
                "enable": True,
                "hook_url": "http://127.0.0.1:48080/admin-api/device/alarm",
                "confidence_threshold": 0.6,
                "cooldown_time": 10,
            },
            "regions": [
                {
                    "region_id": "gate",
                    "polygon": [[10, 10], [200, 10], [200, 100], [10, 100]],
                }
            ],
        }

        status, body = request_json("POST", f"{self.base_url}/config/generate", payload)
        self.assertEqual(status, 200)
        self.assertEqual(body["code"], 0)
        config_path = Path(body["config_path"])
        self.assertTrue(config_path.exists())

        config_text = config_path.read_text(encoding="utf-8")
        self.assertIn("[task]", config_text)
        self.assertIn("id=7", config_text)
        self.assertIn("control_port=8007", config_text)
        self.assertIn("headless=true", config_text)
        self.assertIn("rtsp_url=rtsp://admin:pass@192.168.1.10:554/stream1", config_text)
        self.assertIn("gate=[[10,10],[200,10],[200,100],[10,100]]", config_text)

        status, body = request_json(
            "POST",
            f"{self.base_url}/task/start",
            {"task_id": 7, "config_path": str(config_path)},
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["code"], 0)
        self.assertEqual(body["task_id"], 7)

        logged_config = self.wait_for_fake_task_log()
        self.assertEqual(logged_config, str(config_path))

        status, body = request_json("GET", f"{self.base_url}/task/list")
        self.assertEqual(status, 200)
        self.assertEqual(body["code"], 0)
        self.assertEqual(body["data"][0]["task_id"], 7)
        self.assertEqual(body["data"][0]["status"], "running")
        self.assertGreater(body["data"][0]["pid"], 0)

        status, body = request_json(
            "GET",
            f"{self.base_url}/task/status?{urllib.parse.urlencode({'task_id': 7})}",
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["data"]["status"], "running")

        status, body = request_json("POST", f"{self.base_url}/task/stop", {"task_id": 7})
        self.assertEqual(status, 200)
        self.assertEqual(body["code"], 0)

        status, body = request_json(
            "GET",
            f"{self.base_url}/task/status?{urllib.parse.urlencode({'task_id': 7})}",
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["data"]["status"], "stopped")


if __name__ == "__main__":
    unittest.main(verbosity=2)
