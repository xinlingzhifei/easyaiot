#!/usr/bin/env python3
"""Modbus RTU 上行读取（FC03），验证现场侧可读；对应 Sink 轮询采集链路。"""

from __future__ import annotations

import argparse
import csv
import json
import struct
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

import serial


@dataclass
class TestRecord:
    timestamp: str
    success: bool
    port: str
    unit_id: int
    function_code: int
    address: int
    quantity: int
    request_hex: str
    response_hex: str
    data_hex: str
    register_hex: list[str]
    register_values: list[int]
    elapsed_ms: float
    error: str = ""


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test Modbus RTU FC03 and save every result")
    parser.add_argument("--port", required=True, help="Serial port, for example COM2")
    parser.add_argument("--baudrate", type=int, default=9600)
    parser.add_argument("--bytesize", type=int, choices=(7, 8), default=8)
    parser.add_argument("--parity", choices=("N", "E", "O"), default="N")
    parser.add_argument("--stopbits", type=float, choices=(1, 1.5, 2), default=1)
    parser.add_argument("--unit", type=int, default=1)
    parser.add_argument("--address", type=int, default=0)
    parser.add_argument("--quantity", type=int, default=3)
    parser.add_argument("--count", type=int, default=10, help="0 means run until Ctrl+C")
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--timeout", type=float, default=1.5)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "rtu",
    )
    args = parser.parse_args()
    if not 1 <= args.unit <= 247:
        parser.error("--unit must be between 1 and 247")
    if not 0 <= args.address <= 65535:
        parser.error("--address must be between 0 and 65535")
    if not 1 <= args.quantity <= 125:
        parser.error("--quantity must be between 1 and 125")
    return args


def read_response(client: serial.Serial, quantity: int) -> bytes:
    header = client.read(3)
    if len(header) != 3:
        raise TimeoutError(f"response header timeout: received {len(header)}/3 bytes")
    remaining = 2 if header[1] & 0x80 else header[2] + 2
    tail = client.read(remaining)
    if len(tail) != remaining:
        raise TimeoutError(f"response body timeout: received {len(tail)}/{remaining} bytes")
    response = header + tail
    if crc16_modbus(response[:-2]) != struct.unpack("<H", response[-2:])[0]:
        raise ValueError("response CRC mismatch")
    if not header[1] & 0x80 and header[2] != quantity * 2:
        raise ValueError(f"unexpected byte count: {header[2]}")
    return response


def execute_read(client: serial.Serial, args: argparse.Namespace) -> TestRecord:
    timestamp = datetime.now().astimezone().isoformat(timespec="milliseconds")
    request = add_crc(struct.pack(">BBHH", args.unit, 0x03, args.address, args.quantity))
    response = b""
    started = time.perf_counter()
    try:
        client.reset_input_buffer()
        client.write(request)
        client.flush()
        response = read_response(client, args.quantity)
        if response[0] != args.unit:
            raise ValueError(f"unit ID mismatch: {response[0]} != {args.unit}")
        if response[1] & 0x80:
            raise RuntimeError(f"Modbus exception code 0x{response[2]:02X}")
        if response[1] != 0x03:
            raise ValueError(f"unexpected function code: 0x{response[1]:02X}")
        data = response[3:-2]
        values = list(struct.unpack(f">{args.quantity}H", data))
        return TestRecord(
            timestamp, True, args.port, args.unit, 3, args.address, args.quantity,
            hex_bytes(request), hex_bytes(response), hex_bytes(data),
            [f"0x{value:04X}" for value in values], values,
            round((time.perf_counter() - started) * 1000, 3),
        )
    except Exception as exc:
        return TestRecord(
            timestamp, False, args.port, args.unit, 3, args.address, args.quantity,
            hex_bytes(request), hex_bytes(response), "", [], [],
            round((time.perf_counter() - started) * 1000, 3), f"{type(exc).__name__}: {exc}",
        )


def main() -> int:
    args = parse_args()
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = args.output_dir.resolve() / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    records_path = run_dir / "records.jsonl"
    csv_path = run_dir / "records.csv"
    summary_path = run_dir / "summary.json"
    success_count = 0
    failure_count = 0
    interrupted = False
    started_at = datetime.now().astimezone()

    print(
        f"Testing {args.port}: {args.baudrate} {args.bytesize}{args.parity}{args.stopbits:g}, "
        f"unit={args.unit}, address={args.address}, quantity={args.quantity}"
    )
    print(f"Results: {run_dir}")

    try:
        with serial.Serial(
            port=args.port,
            baudrate=args.baudrate,
            bytesize=args.bytesize,
            parity=args.parity,
            stopbits=args.stopbits,
            timeout=args.timeout,
            write_timeout=args.timeout,
        ) as client, records_path.open("w", encoding="utf-8", buffering=1) as records_file, csv_path.open(
            "w", encoding="utf-8-sig", newline="", buffering=1
        ) as csv_file:
            fields = list(TestRecord.__dataclass_fields__)
            writer = csv.DictWriter(csv_file, fieldnames=fields)
            writer.writeheader()
            sequence = 0
            while args.count == 0 or sequence < args.count:
                sequence += 1
                record = execute_read(client, args)
                payload = asdict(record)
                records_file.write(json.dumps(payload, ensure_ascii=False) + "\n")
                csv_payload = {**payload}
                csv_payload["register_hex"] = " ".join(record.register_hex)
                csv_payload["register_values"] = " ".join(map(str, record.register_values))
                writer.writerow(csv_payload)
                records_file.flush()
                csv_file.flush()
                if record.success:
                    success_count += 1
                    print(
                        f"[{sequence:04d}] OK {record.elapsed_ms:8.3f} ms | values={record.register_values} "
                        f"| response={record.response_hex}"
                    )
                else:
                    failure_count += 1
                    print(f"[{sequence:04d}] FAIL {record.elapsed_ms:8.3f} ms | {record.error}", file=sys.stderr)
                if args.count == 0 or sequence < args.count:
                    time.sleep(args.interval)
    except KeyboardInterrupt:
        interrupted = True
        print("\nInterrupted; saved collected results.")
    except Exception as exc:
        failure_count += 1
        print(f"Unable to open or use serial port: {type(exc).__name__}: {exc}", file=sys.stderr)
    finally:
        finished_at = datetime.now().astimezone()
        summary = {
            "run_id": run_id,
            "started_at": started_at.isoformat(timespec="seconds"),
            "finished_at": finished_at.isoformat(timespec="seconds"),
            "interrupted": interrupted,
            "configuration": vars(args) | {"output_dir": str(args.output_dir)},
            "result": {
                "total": success_count + failure_count,
                "success": success_count,
                "failure": failure_count,
                "success_rate": round(success_count / max(1, success_count + failure_count), 4),
            },
            "files": {"jsonl": str(records_path), "csv": str(csv_path)},
        }
        summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Summary: {summary_path}")
    return 0 if failure_count == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
