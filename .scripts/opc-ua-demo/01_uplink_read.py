#!/usr/bin/env python3
"""OPC UA 上行读取：批量读 NodeId，验证现场侧可读（对应 Sink 轮询上行）。"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

try:
    from asyncua import Client
except ImportError as exc:  # pragma: no cover
    raise SystemExit("请先安装: pip install asyncua") from exc


async def read_once(endpoint: str, node_ids: list[str], username: str, password: str) -> dict:
    client = Client(url=endpoint)
    if username:
        client.set_user(username)
        client.set_password(password or "")
    async with client:
        values = {}
        for node_id in node_ids:
            node = client.get_node(node_id)
            values[node_id] = await node.read_value()
        return values


def main() -> int:
    parser = argparse.ArgumentParser(description="Read OPC UA nodes")
    parser.add_argument("--endpoint", default="opc.tcp://127.0.0.1:4840/freeopcua/server/")
    parser.add_argument(
        "--nodes",
        default="ns=2;s=Temperature,ns=2;s=Setpoint,ns=2;s=Running",
        help="逗号分隔 NodeId",
    )
    parser.add_argument("--username", default="")
    parser.add_argument("--password", default="")
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "uplink",
    )
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    node_ids = [item.strip() for item in args.nodes.split(",") if item.strip()]
    records = []

    async def run() -> None:
        for index in range(args.count):
            values = await read_once(args.endpoint, node_ids, args.username, args.password)
            record = {
                "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
                "endpoint": args.endpoint,
                "values": values,
            }
            records.append(record)
            print(f"[{index + 1:03d}] {values}")
            if index + 1 < args.count:
                await asyncio.sleep(args.interval)

    try:
        asyncio.run(run())
    except Exception as exc:
        print(f"FAIL {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    out = args.output_dir / f"read_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    out.write_text(json.dumps(records, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"saved={out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
