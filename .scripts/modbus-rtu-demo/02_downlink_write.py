#!/usr/bin/env python3
"""Modbus RTU 下行写入：FC06 / FC05（依赖 pyserial）。"""

from __future__ import annotations

import argparse
import json
import struct
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

import serial


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


@dataclass
class WriteRecord:
    timestamp: str
    success: bool
    port: str
    unit_id: int
    function_code: int
    address: int
    value: str
    request_hex: str
    response_hex: str
    elapsed_ms: float
    error: str = ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Write Modbus RTU holding register or coil")
    parser.add_argument("--port", default="/dev/ttyUSB0", help="串口，Windows 如 COM4")
    parser.add_argument("--baud", type=int, default=9600)
    parser.add_argument("--unit", type=int, default=1)
    parser.add_argument("--address", type=int, default=1)
    parser.add_argument("--value", default="30")
    parser.add_argument("--coil", action="store_true")
    parser.add_argument("--timeout", type=float, default=1.5)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "downlink",
    )
    return parser.parse_args()


def write_once(args: argparse.Namespace) -> WriteRecord:
    timestamp = datetime.now().astimezone().isoformat(timespec="milliseconds")
    response = b""
    started = time.perf_counter()
    try:
        if args.coil:
            on = str(args.value).lower() in {"1", "true", "on", "yes"}
            pdu = struct.pack(">BBHH", args.unit, 0x05, args.address, 0xFF00 if on else 0x0000)
            function_code = 0x05
            value_text = "ON" if on else "OFF"
            expect = 8
        else:
            raw = int(float(args.value)) & 0xFFFF
            pdu = struct.pack(">BBHH", args.unit, 0x06, args.address, raw)
            function_code = 0x06
            value_text = str(raw)
            expect = 8
        request = add_crc(pdu)
        with serial.Serial(
            port=args.port,
            baudrate=args.baud,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=args.timeout,
        ) as ser:
            ser.reset_input_buffer()
            ser.write(request)
            ser.flush()
            response = ser.read(expect)
        if len(response) < 5:
            raise TimeoutError("no response or short frame")
        if crc16_modbus(response[:-2]) != struct.unpack("<H", response[-2:])[0]:
            raise ValueError("CRC mismatch")
        if response[1] & 0x80:
            raise RuntimeError(f"Modbus exception code=0x{response[2]:02X}")
        return WriteRecord(
            timestamp=timestamp,
            success=True,
            port=args.port,
            unit_id=args.unit,
            function_code=function_code,
            address=args.address,
            value=value_text,
            request_hex=hex_bytes(request),
            response_hex=hex_bytes(response),
            elapsed_ms=round((time.perf_counter() - started) * 1000, 3),
        )
    except Exception as exc:
        return WriteRecord(
            timestamp=timestamp,
            success=False,
            port=args.port,
            unit_id=args.unit,
            function_code=0x05 if args.coil else 0x06,
            address=args.address,
            value=str(args.value),
            request_hex="",
            response_hex=hex_bytes(response),
            elapsed_ms=round((time.perf_counter() - started) * 1000, 3),
            error=f"{type(exc).__name__}: {exc}",
        )


def main() -> int:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    record = write_once(args)
    out = args.output_dir / f"write_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    out.write_text(json.dumps(asdict(record), ensure_ascii=False, indent=2), encoding="utf-8")
    if record.success:
        print(f"OK wrote {record.value} @ {record.address} in {record.elapsed_ms} ms")
        print(f"saved={out}")
        return 0
    print(f"FAIL {record.error}", file=sys.stderr)
    print(f"saved={out}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
