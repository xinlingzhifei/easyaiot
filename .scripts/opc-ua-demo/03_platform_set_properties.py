#!/usr/bin/env python3
"""通过平台 API 下发属性（OPC UA 下行全链路）。"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser(description="Call setProperties for OPC UA downlink")
    parser.add_argument("--api-base", default="http://localhost:48080/admin-api")
    parser.add_argument("--token", required=True)
    parser.add_argument("--device-id", type=int, required=True)
    parser.add_argument("--props", default='{"setpoint":30}')
    args = parser.parse_args()
    payload = json.loads(args.props)
    url = f"{args.api_base.rstrip('/')}/device/{args.device_id}/setProperties"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {args.token}",
            "X-Authorization": f"Bearer {args.token}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"HTTP {resp.status}: {resp.read().decode('utf-8', errors='replace')}")
            return 0
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"request failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
