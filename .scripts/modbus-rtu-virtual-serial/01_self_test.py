#!/usr/bin/env python3
"""对已启动的虚拟串口做一次 FC03/FC06 自检（依赖 pyserial）。"""

from __future__ import annotations

import argparse
import json
import struct
import sys
import time
from pathlib import Path

try:
    import serial
except ImportError as exc:  # pragma: no cover
    raise SystemExit("请先安装: pip install pyserial") from exc

RUNTIME = Path(__file__).resolve().parent / ".runtime" / "ports.json"


def crc16_modbus(data: bytes) -> int:
    crc = 0xFFFF
    for value in data:
        crc ^= value
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return crc


def add_crc(frame: bytes) -> bytes:
    return frame + struct.pack("<H", crc16_modbus(frame))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="")
    parser.add_argument("--unit", type=int, default=0)
    args = parser.parse_args()

    port = args.port
    unit = args.unit
    if RUNTIME.exists():
        meta = json.loads(RUNTIME.read_text(encoding="utf-8"))
        port = port or meta.get("link") or meta.get("master_port")
        unit = unit or int(meta.get("unit_id", 1))
    if not port:
        print("缺少 --port，且未找到 .runtime/ports.json", file=sys.stderr)
        return 2
    unit = unit or 1

    req = add_crc(struct.pack(">BBHH", unit, 0x03, 0, 2))
    with serial.Serial(port=port, baudrate=9600, timeout=1.5) as ser:
        ser.reset_input_buffer()
        ser.write(req)
        ser.flush()
        time.sleep(0.05)
        resp = ser.read(9)
        print(f"READ  req={req.hex(' ')} resp={resp.hex(' ')}")
        if len(resp) < 9 or resp[1] != 0x03:
            print("FAIL read", file=sys.stderr)
            return 1
        values = struct.unpack(">HH", resp[3:7])
        print(f"holding[0..1]={values}")

        write_req = add_crc(struct.pack(">BBHH", unit, 0x06, 1, 30))
        ser.reset_input_buffer()
        ser.write(write_req)
        ser.flush()
        time.sleep(0.05)
        write_resp = ser.read(8)
        print(f"WRITE req={write_req.hex(' ')} resp={write_resp.hex(' ')}")
        if write_resp[:6] != write_req[:6]:
            print("FAIL write", file=sys.stderr)
            return 1

    print("SELF TEST OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
