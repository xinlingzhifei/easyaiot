#!/usr/bin/env python3
"""私有协议上行演示：设备发 EA|UP|…，依赖产品协议脚本 rawDataToProtocol 解码入库。

前置:
  1. 在「产品管理 → 协议脚本」启用并保存 compact_text 模板
     （或上传本目录 product_script_compact_text.js）
  2. --product / --device / --tenant-id 与库中真实设备一致

验收:
  - sink 日志出现「JS 上行解码生效」
  - 设备影子 / 运行状态出现 Vbatt、RSSI 等属性
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    build_arg_parser,
    build_demo_property_params,
    connect_mqtt,
    property_topic,
)
from protocol_ea import encode_property_report  # noqa: E402


def main() -> None:
    p = build_arg_parser(
        "私有协议上行：发布 EA|UP|PROP|… 验证产品脚本解码",
        client_id_role="up",
    )
    p.add_argument("--interval", type=float, default=3.0, help="上报间隔秒")
    p.add_argument("--rounds", type=int, default=0, help="轮数，0=无限")
    args = p.parse_args()

    # 与标准演示区分 clientId，避免与 01 冲突；允许用户覆盖
    if not args.client_id:
        args.client_id = f"demo-codec-up-{args.device}"

    client = connect_mqtt(args)
    topic = property_topic(args.product, args.device)
    print(
        f"[CODEC-UP] topic={topic}\n"
        f"      请确认产品 {args.product} 已启用协议脚本（compact_text）"
    )

    i = 0
    try:
        while True:
            i += 1
            params = build_demo_property_params(args.device, i)
            raw = encode_property_report(tenant_id=args.tenant_id, params=params)
            info = client.publish(topic, raw, qos=args.qos)
            try:
                info.wait_for_publish(timeout=5)
            except RuntimeError as e:
                raise SystemExit(f"MQTT 发布失败: {e}") from e
            print(f"[PUB#{i}] {topic}\n      {raw.decode('utf-8')}")

            if args.rounds > 0 and i >= args.rounds:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n[CODEC-UP] 停止")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
