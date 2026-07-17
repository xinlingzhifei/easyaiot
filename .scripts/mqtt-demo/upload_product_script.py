#!/usr/bin/env python3
"""将 product_script_compact_text.js 上传到平台并启用热加载。

用法:
  export TOKEN=...   # 管理端 JWT
  python3 upload_product_script.py --product 9820630576939008 --product-id 1

也可用 Web「产品管理 → 协议脚本 → 应用模板 → 保存并热加载」。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

SCRIPT_FILE = Path(__file__).resolve().parent / "product_script_compact_text.js"


def main() -> None:
    p = argparse.ArgumentParser(description="上传并启用产品协议脚本")
    p.add_argument("--api-base", default=os.getenv("API_BASE", "http://localhost:48080/admin-api"))
    p.add_argument("--token", default=os.getenv("TOKEN", ""))
    p.add_argument("--product", required=True, help="productIdentification")
    p.add_argument("--product-id", type=int, required=True, help="产品主键 id")
    p.add_argument("--script", default=str(SCRIPT_FILE), help="脚本文本路径")
    p.add_argument("--disable", action="store_true", help="保存但禁用")
    args = p.parse_args()

    if not args.token:
        raise SystemExit("需要 JWT：--token 或环境变量 TOKEN")

    content = Path(args.script).read_text(encoding="utf-8")
    body = {
        "productId": args.product_id,
        "productIdentification": args.product,
        "scriptEnabled": not args.disable,
        "scriptContent": content,
    }
    url = f"{args.api_base.rstrip('/')}/sink/product-script"
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
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
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"HTTP {resp.status}: {resp.read().decode('utf-8', errors='replace')}")
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        raise SystemExit(1) from e


if __name__ == "__main__":
    main()
