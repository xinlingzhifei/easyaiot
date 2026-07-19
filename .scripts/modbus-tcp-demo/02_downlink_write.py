#!/usr/bin/env python3
"""Modbus TCP 下行写入：FC06 单寄存器 / FC05 单线圈，验证平台写入前的现场侧可写性。"""

from __future__ import annotations

import argparse
import json
import socket
import struct
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path


@dataclass
class WriteRecord:
    timestamp: str
    success: bool
    host: str
    port: int
    unit_id: int
    function_code: int
    address: int
    value: str
    request_hex: str
    response_hex: str
    elapsed_ms: float
    error: str = ""


def hex_bytes(data: bytes) -> str:
    return " ".join(f"{value:02X}" for value in data)


def receive_exact(stream, size: int) -> bytes:
    chunks = bytearray()
    while len(chunks) < size:
        chunk = stream.read(size - len(chunks))
        if not chunk:
            raise ConnectionError(f"connection closed after {len(chunks)}/{size} bytes")
        chunks.extend(chunk)
    return bytes(chunks)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Write Modbus TCP holding register or coil")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=502)
    parser.add_argument("--unit", type=int, default=1)
    parser.add_argument("--address", type=int, default=1, help="寄存器/线圈地址（从 0 开始）")
    parser.add_argument("--value", default="30", help="写入值；线圈用 true/false/0/1")
    parser.add_argument("--coil", action="store_true", help="写线圈 FC05，默认写保持寄存器 FC06")
    parser.add_argument("--timeout", type=float, default=3.0)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "downlink",
    )
    return parser.parse_args()


def write_once(args: argparse.Namespace) -> WriteRecord:
    timestamp = datetime.now().astimezone().isoformat(timespec="milliseconds")
    transaction_id = (int(time.time() * 1000) & 0xFFFF) or 1
    response = b""
    started = time.perf_counter()
    try:
        if args.coil:
            on = str(args.value).lower() in {"1", "true", "on", "yes"}
            pdu = struct.pack(">BHH", 0x05, args.address, 0xFF00 if on else 0x0000)
            function_code = 0x05
            value_text = "ON" if on else "OFF"
        else:
            raw = int(float(args.value)) & 0xFFFF
            pdu = struct.pack(">BHH", 0x06, args.address, raw)
            function_code = 0x06
            value_text = str(raw)

        request = struct.pack(">HHHB", transaction_id, 0, len(pdu) + 1, args.unit) + pdu
        with socket.create_connection((args.host, args.port), timeout=args.timeout) as client:
            client.settimeout(args.timeout)
            client.sendall(request)
            with client.makefile("rb", buffering=0) as stream:
                header = receive_exact(stream, 7)
                _, protocol_id, length, _ = struct.unpack(">HHHB", header)
                if protocol_id != 0 or length < 2:
                    raise ValueError(f"invalid MBAP: protocol={protocol_id}, length={length}")
                body = receive_exact(stream, length - 1)
                response = header + body
        if body[0] & 0x80:
            raise RuntimeError(f"Modbus exception: 0x{body[0]:02X} / 0x{body[1]:02X}")
        return WriteRecord(
            timestamp=timestamp,
            success=True,
            host=args.host,
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
            host=args.host,
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
        print(f"response={record.response_hex}")
        print(f"saved={out}")
        return 0
    print(f"FAIL {record.error}", file=sys.stderr)
    print(f"saved={out}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
