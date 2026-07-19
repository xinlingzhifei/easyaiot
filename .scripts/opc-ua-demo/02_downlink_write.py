#!/usr/bin/env python3
"""OPC UA 下行写入：写可写 NodeId，验证现场侧可写。"""

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


def coerce(value: str):
    lowered = value.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value


async def write_once(endpoint: str, node_id: str, value, username: str, password: str) -> None:
    client = Client(url=endpoint)
    if username:
        client.set_user(username)
        client.set_password(password or "")
    async with client:
        node = client.get_node(node_id)
        await node.write_value(value)
        read_back = await node.read_value()
        print(f"wrote {value!r}, read_back={read_back!r}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Write OPC UA node")
    parser.add_argument("--endpoint", default="opc.tcp://127.0.0.1:4840/freeopcua/server/")
    parser.add_argument("--node", default="ns=2;s=Setpoint")
    parser.add_argument("--value", default="30")
    parser.add_argument("--username", default="")
    parser.add_argument("--password", default="")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "downlink",
    )
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    value = coerce(args.value)
    try:
        asyncio.run(write_once(args.endpoint, args.node, value, args.username, args.password))
    except Exception as exc:
        print(f"FAIL {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    out = args.output_dir / f"write_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    out.write_text(
        json.dumps(
            {
                "endpoint": args.endpoint,
                "node": args.node,
                "value": value,
                "timestamp": datetime.now().astimezone().isoformat(timespec="seconds"),
            },
            ensure_ascii=False,
            indent=2,
            default=str,
        ),
        encoding="utf-8",
    )
    print(f"saved={out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
