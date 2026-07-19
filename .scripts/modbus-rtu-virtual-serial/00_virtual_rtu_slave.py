#!/usr/bin/env python3
"""虚拟串口对 + Modbus RTU 从站模拟器（零第三方依赖）。

创建一对 PTY（类似 null-modem），一端跑 RTU 从站，另一端暴露给 Sink /
modbus-rtu-demo 作为 master 串口，便于无 USB-RS485 硬件时完整联调。

默认寄存器与 modbus-tcp-demo 一致：
  holding[0]=temperature=25, holding[1]=setpoint=20, coil[0]=running
支持功能码：FC01 / FC03 / FC05 / FC06 / FC16。
"""

from __future__ import annotations

import argparse
import json
import os
import pty
import select
import signal
import struct
import sys
import termios
import threading
import time
import tty
from pathlib import Path
from typing import List, Optional


RUNTIME_DIR = Path(__file__).resolve().parent / ".runtime"
DEFAULT_LINK = "/tmp/easyaiot-modbus-rtu-u"


def crc16_modbus(data: bytes) -> int:
    crc = 0xFFFF
    for value in data:
        crc ^= value
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return crc


def add_crc(frame: bytes) -> bytes:
    return frame + struct.pack("<H", crc16_modbus(frame))


def hex_bytes(data: bytes) -> str:
    return " ".join(f"{value:02X}" for value in data)


class PtyBridge:
    """两对 PTY 的 master 侧互拷，对外暴露两个 slave 设备节点。

    注意：两端 slave fd 必须保持打开，否则对端 master 读会 EIO。
    从站直接使用 slave_a；Sink/demo 再按路径打开 slave_b。
    """

    def __init__(self) -> None:
        self.master_a, self.slave_a = pty.openpty()
        self.master_b, self.slave_b = pty.openpty()
        self.port_a = os.ttyname(self.slave_a)
        self.port_b = os.ttyname(self.slave_b)
        for fd in (self.master_a, self.master_b, self.slave_a, self.slave_b):
            tty.setraw(fd, when=termios.TCSANOW)
        # 放宽 master 侧权限，便于 Sink（其他用户）打开符号链接指向的 pts
        try:
            os.chmod(self.port_b, 0o666)
        except OSError as exc:
            print(f"[WARN] chmod {self.port_b} failed: {exc}", flush=True)
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._loop, name="pty-bridge", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        for fd in (self.master_a, self.master_b, self.slave_a, self.slave_b):
            try:
                os.close(fd)
            except OSError:
                pass

    def _loop(self) -> None:
        fds = [self.master_a, self.master_b]
        while not self._stop.is_set():
            try:
                readable, _, _ = select.select(fds, [], [], 0.2)
            except (ValueError, OSError):
                break
            for src in readable:
                try:
                    data = os.read(src, 4096)
                except OSError:
                    self._stop.set()
                    break
                if not data:
                    continue
                dst = self.master_b if src == self.master_a else self.master_a
                try:
                    os.write(dst, data)
                except OSError:
                    self._stop.set()
                    break


class ModbusRtuSlave:
    def __init__(self, unit_id: int = 1) -> None:
        self.unit_id = unit_id
        self.holding: List[int] = [25, 20, 0, 0, 0, 0, 0, 0, 0, 0]
        self.coils: List[bool] = [False] * 16
        self.lock = threading.Lock()

    def handle(self, request: bytes) -> Optional[bytes]:
        if len(request) < 4:
            return None
        payload, crc_bytes = request[:-2], request[-2:]
        if crc16_modbus(payload) != struct.unpack("<H", crc_bytes)[0]:
            print(f"[WARN] CRC mismatch: {hex_bytes(request)}", flush=True)
            return None
        unit = payload[0]
        if unit != self.unit_id:
            return None
        function = payload[1]
        data = payload[2:]
        try:
            with self.lock:
                body = self._dispatch(function, data)
        except ValueError:
            body = bytes([function | 0x80, 0x02])
        except Exception as exc:  # pragma: no cover
            print(f"[ERROR] handle failed: {exc}", flush=True)
            body = bytes([function | 0x80, 0x04])
        return add_crc(bytes([unit]) + body)

    def _dispatch(self, function: int, data: bytes) -> bytes:
        if function == 0x03:
            address, quantity = struct.unpack(">HH", data[:4])
            values = self.holding[address : address + quantity]
            if len(values) != quantity:
                raise ValueError("address out of range")
            return struct.pack(">BB", 0x03, quantity * 2) + struct.pack(f">{quantity}H", *values)
        if function == 0x01:
            address, quantity = struct.unpack(">HH", data[:4])
            bits = self.coils[address : address + quantity]
            if len(bits) != quantity:
                raise ValueError("address out of range")
            byte_count = (quantity + 7) // 8
            packed = bytearray(byte_count)
            for index, bit in enumerate(bits):
                if bit:
                    packed[index // 8] |= 1 << (index % 8)
            return bytes([0x01, byte_count]) + bytes(packed)
        if function == 0x06:
            address, value = struct.unpack(">HH", data[:4])
            if address >= len(self.holding):
                raise ValueError("address out of range")
            self.holding[address] = value
            print(f"[WRITE REG] addr={address} value={value}", flush=True)
            return bytes([0x06]) + data[:4]
        if function == 0x05:
            address, raw = struct.unpack(">HH", data[:4])
            if address >= len(self.coils):
                raise ValueError("address out of range")
            self.coils[address] = raw == 0xFF00
            print(f"[WRITE COIL] addr={address} value={self.coils[address]}", flush=True)
            return bytes([0x05]) + data[:4]
        if function == 0x10:
            address, quantity, byte_count = struct.unpack(">HHB", data[:5])
            raw = data[5 : 5 + byte_count]
            if byte_count != quantity * 2 or len(raw) != byte_count:
                raise ValueError("invalid FC16 payload")
            values = list(struct.unpack(f">{quantity}H", raw))
            if address + quantity > len(self.holding):
                raise ValueError("address out of range")
            self.holding[address : address + quantity] = values
            print(f"[WRITE REGS] addr={address} values={values}", flush=True)
            return struct.pack(">BHH", 0x10, address, quantity)
        return bytes([function | 0x80, 0x01])


def set_raw_port(fd: int) -> None:
    tty.setraw(fd, when=termios.TCSANOW)
    attrs = termios.tcgetattr(fd)
    # 关闭软件流控，尽量贴近工业串口默认行为
    attrs[0] &= ~(termios.IXON | termios.IXOFF | termios.IXANY)
    attrs[2] |= termios.CLOCAL
    termios.tcsetattr(fd, termios.TCSANOW, attrs)


def read_rtu_frame(fd: int, inter_frame_s: float = 0.05, idle_timeout_s: float = 2.0) -> bytes:
    """按 RTU 帧间静默拼包。"""
    deadline = time.monotonic() + idle_timeout_s
    buf = bytearray()
    while time.monotonic() < deadline:
        wait = max(0.0, min(inter_frame_s if buf else idle_timeout_s, deadline - time.monotonic()))
        readable, _, _ = select.select([fd], [], [], wait)
        if not readable:
            if buf:
                return bytes(buf)
            continue
        chunk = os.read(fd, 256)
        if not chunk:
            if buf:
                return bytes(buf)
            continue
        buf.extend(chunk)
        # 收到数据后继续拼到静默
        while True:
            readable, _, _ = select.select([fd], [], [], inter_frame_s)
            if not readable:
                return bytes(buf)
            chunk = os.read(fd, 256)
            if not chunk:
                return bytes(buf)
            buf.extend(chunk)
    return bytes(buf)


def ensure_symlink(link_path: Path, target: str) -> None:
    link_path.parent.mkdir(parents=True, exist_ok=True)
    if link_path.is_symlink() or link_path.exists():
        if link_path.is_symlink() or link_path.is_file():
            link_path.unlink()
        else:
            raise SystemExit(f"link path exists and is not a symlink/file: {link_path}")
    os.symlink(target, link_path)


def write_runtime(master_port: str, slave_port: str, link: str, unit_id: int, pid: int) -> Path:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "pid": pid,
        "master_port": master_port,
        "slave_port": slave_port,
        "link": link,
        "unit_id": unit_id,
        "serialPort_for_sink": link,
        "rs485Mode": False,
        "baudRate": 9600,
        "protocolConfig_hint": {
            "enabled": True,
            "serialPort": link,
            "baudRate": 9600,
            "dataBits": 8,
            "stopBits": "1",
            "parity": "NONE",
            "rs485Mode": False,
            "unitId": unit_id,
            "pollIntervalMs": 3000,
            "points": [
                {"identifier": "temperature", "function": "HOLDING_REGISTER", "address": 0, "writable": False},
                {"identifier": "setpoint", "function": "HOLDING_REGISTER", "address": 1, "writable": True},
                {"identifier": "running", "function": "COIL", "address": 0, "writable": True},
            ],
        },
    }
    path = RUNTIME_DIR / "ports.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    env_path = RUNTIME_DIR / "ports.env"
    env_path.write_text(
        f"EASYAIOT_MODBUS_RTU_MASTER={link}\n"
        f"EASYAIOT_MODBUS_RTU_SLAVE={slave_port}\n"
        f"EASYAIOT_MODBUS_RTU_UNIT={unit_id}\n"
        f"EASYAIOT_MODBUS_RTU_PID={pid}\n",
        encoding="utf-8",
    )
    pid_path = RUNTIME_DIR / "slave.pid"
    pid_path.write_text(str(pid), encoding="utf-8")
    return path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Virtual serial pair + Modbus RTU slave")
    parser.add_argument("--unit", type=int, default=1)
    parser.add_argument(
        "--link",
        default=DEFAULT_LINK,
        help=f"给 Sink / demo 使用的稳定符号链接（默认 {DEFAULT_LINK}）",
    )
    parser.add_argument(
        "--dev-link",
        default="",
        help="可选，尝试再链到 /dev/ttyUSB0（通常需要 root）",
    )
    parser.add_argument("--foreground", action="store_true", help="前台运行（默认）")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not 1 <= args.unit <= 247:
        print("--unit must be 1..247", file=sys.stderr)
        return 2

    bridge = PtyBridge()
    # port_a = slave 侧（本进程打开），port_b = master 侧（Sink/demo 打开）
    slave_port = bridge.port_a
    master_port = bridge.port_b
    link = str(Path(args.link).expanduser())

    ensure_symlink(Path(link), master_port)
    if args.dev_link:
        try:
            ensure_symlink(Path(args.dev_link), master_port)
            print(f"[OK] also linked {args.dev_link} -> {master_port}", flush=True)
        except OSError as exc:
            print(f"[WARN] cannot create {args.dev_link}: {exc}", file=sys.stderr)

    bridge.start()
    runtime_path = write_runtime(master_port, slave_port, link, args.unit, os.getpid())

    # 使用 bridge 已打开的 slave_a，避免关闭后 master 侧 EIO
    slave_fd = bridge.slave_a
    set_raw_port(slave_fd)
    slave = ModbusRtuSlave(args.unit)

    stop = threading.Event()

    def _handle_signal(signum, _frame) -> None:
        print(f"\n[stop] signal={signum}", flush=True)
        stop.set()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    print("=" * 60, flush=True)
    print("Modbus RTU virtual serial slave is running", flush=True)
    print(f"  slave PTY : {slave_port}", flush=True)
    print(f"  master PTY: {master_port}", flush=True)
    print(f"  Sink/demo : {link}  (symlink -> master)", flush=True)
    print(f"  unitId    : {args.unit}", flush=True)
    print(f"  runtime   : {runtime_path}", flush=True)
    print("请把设备 protocolConfig.serialPort 改为上面的 Sink/demo 路径，", flush=True)
    print('并设置 "rs485Mode": false（虚拟串口不支持 RS485 ioctl）。', flush=True)
    print("demo 验证示例：", flush=True)
    print(
        f"  python3 ../modbus-rtu-demo/01_uplink_read.py --port {link} --baudrate 9600 --unit {args.unit}",
        flush=True,
    )
    print("=" * 60, flush=True)

    try:
        while not stop.is_set():
            frame = read_rtu_frame(slave_fd)
            if not frame:
                continue
            print(f"[RX] {hex_bytes(frame)}", flush=True)
            response = slave.handle(frame)
            if not response:
                continue
            os.write(slave_fd, response)
            print(f"[TX] {hex_bytes(response)}", flush=True)
    finally:
        bridge.stop()
        for path in (Path(link), Path(args.dev_link) if args.dev_link else None):
            if path and path.is_symlink():
                try:
                    path.unlink()
                except OSError:
                    pass
        print("[stopped]", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
