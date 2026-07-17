import os
import shutil
import subprocess
import sys
import tempfile
import unittest

try:
    import psutil
except ModuleNotFoundError:
    psutil = None

from app.utils.train_process_control import (
    discover_task_ddp_processes,
    extract_ultralytics_ddp_script,
    terminate_task_ddp_processes,
)


class FakeProcess:
    def __init__(self, pid, command_line):
        self.pid = pid
        self._command_line = command_line
        self.terminated = False
        self.killed = False

    def cmdline(self):
        return self._command_line

    def terminate(self):
        self.terminated = True

    def kill(self):
        self.killed = True


class FakeRootProcess:
    def __init__(self, children):
        self._children = children

    def children(self, recursive=False):
        return list(self._children)


class FakePsutil:
    class NoSuchProcess(Exception):
        pass

    class AccessDenied(Exception):
        pass

    def __init__(self, children, alive_pids=None):
        self.root = FakeRootProcess(children)
        self.alive_pids = set(alive_pids or ())

    def Process(self, _pid):
        return self.root

    def wait_procs(self, processes, timeout=None):
        gone = [process for process in processes if process.pid not in self.alive_pids]
        alive = [process for process in processes if process.pid in self.alive_pids]
        return gone, alive


class TrainProcessControlTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='easyaiot-ddp-test-')
        self.task_25_dir = '/app/data/datasets/train_25'
        self.task_26_dir = '/app/data/datasets/train_26'
        self.task_25_script = os.path.join(self.temp_dir, '_temp_task25.py')
        self.task_26_script = os.path.join(self.temp_dir, '_temp_task26.py')
        with open(self.task_25_script, 'w', encoding='utf-8') as script_file:
            script_file.write(f"overrides = {{'project': '{self.task_25_dir}'}}\n")
        with open(self.task_26_script, 'w', encoding='utf-8') as script_file:
            script_file.write(f"overrides = {{'project': '{self.task_26_dir}'}}\n")

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _process(self, pid, script_path):
        return FakeProcess(
            pid,
            [
                '/opt/conda/bin/python',
                '-m',
                'torch.distributed.run',
                '--nproc_per_node',
                '6',
                script_path,
            ],
        )

    def test_extracts_ultralytics_ddp_temp_script(self):
        self.assertEqual(
            self.task_25_script,
            extract_ultralytics_ddp_script(self._process(101, self.task_25_script).cmdline()),
        )

    def test_discovers_only_processes_for_requested_training_directory(self):
        task_25_process = self._process(101, self.task_25_script)
        task_26_process = self._process(202, self.task_26_script)
        psutil_module = FakePsutil([task_25_process, task_26_process])

        matches = discover_task_ddp_processes(
            self.task_25_dir,
            root_pid=999,
            psutil_module=psutil_module,
        )

        self.assertEqual([101], [process.pid for process in matches])

    def test_terminate_escalates_remaining_processes_to_kill(self):
        launcher = self._process(101, self.task_25_script)
        worker = self._process(102, self.task_25_script)
        unrelated = self._process(202, self.task_26_script)
        psutil_module = FakePsutil(
            [launcher, worker, unrelated],
            alive_pids={102},
        )

        terminated_pids = terminate_task_ddp_processes(
            self.task_25_dir,
            root_pid=999,
            timeout=0,
            psutil_module=psutil_module,
        )

        self.assertEqual([101, 102], terminated_pids)
        self.assertTrue(launcher.terminated)
        self.assertTrue(worker.terminated)
        self.assertTrue(worker.killed)
        self.assertFalse(unrelated.terminated)

    @unittest.skipIf(psutil is None, 'psutil is required for process integration test')
    def test_terminates_real_matching_child_process(self):
        sleeper_script = os.path.join(self.temp_dir, '_temp_real_ddp.py')
        with open(sleeper_script, 'w', encoding='utf-8') as script_file:
            script_file.write(
                f"MODEL_DIR = '{self.task_25_dir}'\n"
                "import time\n"
                "time.sleep(60)\n"
            )
        process = subprocess.Popen(
            ['torch.distributed.run', sleeper_script],
            executable=sys.executable,
        )
        try:
            terminated_pids = terminate_task_ddp_processes(
                self.task_25_dir,
                root_pid=os.getpid(),
                timeout=1,
            )

            self.assertIn(process.pid, terminated_pids)
            self.assertIsNotNone(process.wait(timeout=2))
        finally:
            if process.poll() is None:
                process.kill()
                process.wait(timeout=2)


if __name__ == '__main__':
    unittest.main()
