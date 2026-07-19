#!/usr/bin/env python3
"""Probe vendor-specific Modbus MBAP-over-UDP devices and save the result."""

from __future__ import annotations

import argparse
import json
import socket
import struct
import time
from datetime import datetime
from pathlib import Path


def hex_bytes(data: bytes) -> str:
    return " ".join(f"{value:02X}" for value in data)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Probe a Modbus MBAP-over-UDP endpoint")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=502)
    parser.add_argument("--unit", type=int, default=1)
    parser.add_argument("--address", type=int, default=0)
    parser.add_argument("--quantity", type=int, default=3)
    parser.add_argument("--timeout", type=float, default=3.0)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "udp",
    )
    args = parser.parse_args()
    if not 0 <= args.unit <= 255:
        parser.error("--unit must be between 0 and 255")
    if not 0 <= args.address <= 65535:
        parser.error("--address must be between 0 and 65535")
    if not 1 <= args.quantity <= 125:
        parser.error("--quantity must be between 1 and 125")
    return args


def main() -> int:
    args = parse_args()
    transaction_id = int(time.time() * 1000) & 0xFFFF
    pdu = struct.pack(">BHH", 0x03, args.address, args.quantity)
    request = struct.pack(">HHHB", transaction_id, 0, len(pdu) + 1, args.unit) + pdu
    started = time.perf_counter()
    result = {
        "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
        "target": f"{args.host}:{args.port}",
        "transport": "UDP",
        "unit_id": args.unit,
        "function_code": "0x03",
        "address": args.address,
        "quantity": args.quantity,
        "request_hex": hex_bytes(request),
        "response_hex": "",
        "source": "",
        "register_values": [],
        "elapsed_ms": 0,
        "success": False,
        "error": "",
    }

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
            client.settimeout(args.timeout)
            client.sendto(request, (args.host, args.port))
            response, source = client.recvfrom(65535)
        result["response_hex"] = hex_bytes(response)
        result["source"] = f"{source[0]}:{source[1]}"
        if len(response) < 9:
            raise ValueError(f"response is too short: {len(response)} bytes")
        response_transaction, protocol_id, length, response_unit = struct.unpack(">HHHB", response[:7])
        if response_transaction != transaction_id:
            raise ValueError("transaction ID mismatch")
        if protocol_id != 0 or response_unit != args.unit:
            raise ValueError("unexpected protocol ID or unit ID")
        body = response[7:]
        if body[0] & 0x80:
            raise RuntimeError(f"Modbus exception code 0x{body[1]:02X}")
        if body[0] != 0x03 or body[1] != args.quantity * 2:
            raise ValueError("unexpected function code or byte count")
        expected_length = 6 + length
        if len(response) != expected_length:
            raise ValueError(f"MBAP length mismatch: expected {expected_length}, got {len(response)}")
        result["register_values"] = list(struct.unpack(f">{args.quantity}H", body[2:]))
        result["success"] = True
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        result["elapsed_ms"] = round((time.perf_counter() - started) * 1000, 3)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output = args.output_dir / f"udp_probe_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output}")
    return 0 if result["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
