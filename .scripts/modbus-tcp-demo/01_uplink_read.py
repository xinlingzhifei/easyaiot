#!/usr/bin/env python3
"""Modbus TCP 上行读取（FC03），验证现场侧可读；对应 Sink 轮询采集链路。"""

from __future__ import annotations

import argparse
import csv
import json
import socket
import struct
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import BinaryIO


@dataclass
class TestRecord:
    timestamp: str
    success: bool
    transaction_id: int
    host: str
    port: int
    unit_id: int
    function_code: int
    address: int
    quantity: int
    request_hex: str
    response_hex: str
    register_hex: list[str]
    register_values: list[int]
    elapsed_ms: float
    error: str = ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test Modbus TCP FC03 and save every result")
    parser.add_argument("--host", default="127.0.0.1", help="Modbus server address")
    parser.add_argument("--port", type=int, default=502, help="Modbus server port")
    parser.add_argument("--unit", type=int, default=1, help="Unit/slave ID (0-255)")
    parser.add_argument("--address", type=int, default=0, help="Starting holding-register address")
    parser.add_argument("--quantity", type=int, default=3, help="Number of registers (1-125)")
    parser.add_argument("--count", type=int, default=10, help="Read count; 0 means run until Ctrl+C")
    parser.add_argument("--interval", type=float, default=1.0, help="Seconds between reads")
    parser.add_argument("--timeout", type=float, default=3.0, help="Socket timeout in seconds")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results",
        help="Parent directory for timestamped result folders",
    )
    args = parser.parse_args()
    if not 0 <= args.unit <= 255:
        parser.error("--unit must be between 0 and 255")
    if not 0 <= args.address <= 65535:
        parser.error("--address must be between 0 and 65535")
    if not 1 <= args.quantity <= 125:
        parser.error("--quantity must be between 1 and 125")
    if args.count < 0:
        parser.error("--count cannot be negative")
    if args.interval < 0 or args.timeout <= 0:
        parser.error("--interval must be >= 0 and --timeout must be > 0")
    return args


def hex_bytes(data: bytes) -> str:
    return " ".join(f"{value:02X}" for value in data)


def receive_exact(stream: BinaryIO, size: int) -> bytes:
    chunks = bytearray()
    while len(chunks) < size:
        chunk = stream.read(size - len(chunks))
        if not chunk:
            raise ConnectionError(f"connection closed after {len(chunks)}/{size} bytes")
        chunks.extend(chunk)
    return bytes(chunks)


def read_holding_registers(args: argparse.Namespace, transaction_id: int) -> TestRecord:
    timestamp = datetime.now().astimezone().isoformat(timespec="milliseconds")
    pdu = struct.pack(">BHH", 0x03, args.address, args.quantity)
    request = struct.pack(">HHHB", transaction_id, 0, len(pdu) + 1, args.unit) + pdu
    response = b""
    started = time.perf_counter()
    try:
        with socket.create_connection((args.host, args.port), timeout=args.timeout) as client:
            client.settimeout(args.timeout)
            client.sendall(request)
            with client.makefile("rb", buffering=0) as stream:
                header = receive_exact(stream, 7)
                response_transaction, protocol_id, length, response_unit = struct.unpack(">HHHB", header)
                if length < 2:
                    raise ValueError(f"invalid MBAP length: {length}")
                body = receive_exact(stream, length - 1)
                response = header + body

        if response_transaction != transaction_id:
            raise ValueError(f"transaction ID mismatch: {response_transaction} != {transaction_id}")
        if protocol_id != 0:
            raise ValueError(f"unexpected protocol ID: {protocol_id}")
        if response_unit != args.unit:
            raise ValueError(f"unit ID mismatch: {response_unit} != {args.unit}")

        function_code = body[0]
        if function_code & 0x80:
            exception_code = body[1] if len(body) > 1 else -1
            raise RuntimeError(f"Modbus exception response: function=0x{function_code:02X}, code=0x{exception_code:02X}")
        if function_code != 0x03:
            raise ValueError(f"unexpected function code: 0x{function_code:02X}")
        byte_count = body[1]
        register_bytes = body[2:]
        expected_bytes = args.quantity * 2
        if byte_count != expected_bytes or len(register_bytes) != expected_bytes:
            raise ValueError(
                f"register byte count mismatch: declared={byte_count}, actual={len(register_bytes)}, expected={expected_bytes}"
            )
        values = list(struct.unpack(f">{args.quantity}H", register_bytes))
        register_hex = [f"0x{value:04X}" for value in values]
        return TestRecord(
            timestamp=timestamp,
            success=True,
            transaction_id=transaction_id,
            host=args.host,
            port=args.port,
            unit_id=args.unit,
            function_code=0x03,
            address=args.address,
            quantity=args.quantity,
            request_hex=hex_bytes(request),
            response_hex=hex_bytes(response),
            register_hex=register_hex,
            register_values=values,
            elapsed_ms=round((time.perf_counter() - started) * 1000, 3),
        )
    except Exception as exc:
        return TestRecord(
            timestamp=timestamp,
            success=False,
            transaction_id=transaction_id,
            host=args.host,
            port=args.port,
            unit_id=args.unit,
            function_code=0x03,
            address=args.address,
            quantity=args.quantity,
            request_hex=hex_bytes(request),
            response_hex=hex_bytes(response),
            register_hex=[],
            register_values=[],
            elapsed_ms=round((time.perf_counter() - started) * 1000, 3),
            error=f"{type(exc).__name__}: {exc}",
        )


def main() -> int:
    args = parse_args()
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = args.output_dir.resolve() / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    jsonl_path = run_dir / "records.jsonl"
    csv_path = run_dir / "records.csv"
    summary_path = run_dir / "summary.json"
    fieldnames = list(TestRecord.__dataclass_fields__)
    success_count = 0
    failure_count = 0
    started_at = datetime.now().astimezone()
    interrupted = False

    print(f"Testing Modbus TCP {args.host}:{args.port}, unit={args.unit}, address={args.address}, quantity={args.quantity}")
    print(f"Results: {run_dir}")

    try:
        with jsonl_path.open("w", encoding="utf-8", buffering=1) as jsonl_file, csv_path.open(
            "w", encoding="utf-8-sig", newline="", buffering=1
        ) as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
            sequence = 0
            while args.count == 0 or sequence < args.count:
                sequence += 1
                transaction_id = ((int(time.time() * 1000) + sequence) & 0xFFFF) or 1
                record = read_holding_registers(args, transaction_id)
                payload = asdict(record)
                jsonl_file.write(json.dumps(payload, ensure_ascii=False) + "\n")
                csv_payload = {**payload}
                csv_payload["register_hex"] = " ".join(record.register_hex)
                csv_payload["register_values"] = " ".join(map(str, record.register_values))
                writer.writerow(csv_payload)
                jsonl_file.flush()
                csv_file.flush()

                if record.success:
                    success_count += 1
                    print(
                        f"[{sequence:04d}] OK {record.elapsed_ms:8.3f} ms | "
                        f"values={record.register_values} | response={record.response_hex}"
                    )
                else:
                    failure_count += 1
                    print(f"[{sequence:04d}] FAIL {record.elapsed_ms:8.3f} ms | {record.error}", file=sys.stderr)

                if args.count == 0 or sequence < args.count:
                    time.sleep(args.interval)
    except KeyboardInterrupt:
        interrupted = True
        print("\nInterrupted; saved collected results.")
    finally:
        finished_at = datetime.now().astimezone()
        summary = {
            "run_id": run_id,
            "started_at": started_at.isoformat(timespec="seconds"),
            "finished_at": finished_at.isoformat(timespec="seconds"),
            "duration_seconds": round((finished_at - started_at).total_seconds(), 3),
            "interrupted": interrupted,
            "configuration": {
                "host": args.host,
                "port": args.port,
                "unit_id": args.unit,
                "function_code": "0x03",
                "address": args.address,
                "quantity": args.quantity,
                "requested_count": args.count,
                "interval_seconds": args.interval,
                "timeout_seconds": args.timeout,
            },
            "result": {
                "total": success_count + failure_count,
                "success": success_count,
                "failure": failure_count,
                "success_rate": round(success_count / max(1, success_count + failure_count), 4),
            },
            "files": {"jsonl": str(jsonl_path), "csv": str(csv_path)},
        }
        summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Summary: {summary_path}")
    return 0 if failure_count == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
