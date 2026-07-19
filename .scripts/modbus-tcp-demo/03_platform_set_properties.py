#!/usr/bin/env python3
"""通过平台 API 下发属性（工业下行全链路：Web/API → device → sink → Modbus 写入）。"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser(description="Call setProperties for industrial downlink")
    parser.add_argument("--api-base", default="http://localhost:48080/admin-api")
    parser.add_argument("--token", required=True, help="JWT Bearer token")
    parser.add_argument("--device-id", type=int, required=True, help="设备主键 ID")
    parser.add_argument(
        "--props",
        default='{"setpoint":30}',
        help='属性 JSON，例如 {"setpoint":30,"running":true}',
    )
    args = parser.parse_args()

    try:
        payload = json.loads(args.props)
    except json.JSONDecodeError as exc:
        print(f"invalid --props JSON: {exc}", file=sys.stderr)
        return 2

    url = f"{args.api_base.rstrip('/')}/device/{args.device_id}/setProperties"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {args.token}",
            "X-Authorization": f"Bearer {args.token}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            print(f"HTTP {resp.status}: {body}")
            return 0
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"request failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
