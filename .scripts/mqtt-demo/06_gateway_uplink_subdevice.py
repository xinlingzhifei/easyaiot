#!/usr/bin/env python3
"""
网关上行演示：模拟「仅网关有网」场景。

1) 网关以自身身份连接 EMQX
2) 上报 topo/upstream/add → 平台自动创建 SUBSET 子设备并绑定网关
3) 周期代报 sub/property/upstream/report → 子设备影子 / 运行状态可见

用法:
  python3 06_gateway_uplink_subdevice.py \\
    --product <网关产品> --device <网关设备> --tenant-id 1 --password <密码> \\
    --sub-product <SUBSET产品> --sub-device demo-sub-001

验收:
  - Web → 网关详情 → 子设备 Tab 出现 demo-sub-001
  - 打开该子设备 → 影子 / 运行状态随上报刷新
"""

from __future__ import annotations

import math
import signal
import sys
import time

from common import (
    build_gateway_arg_parser,
    build_message,
    connect_mqtt,
    publish_json,
    sub_event_up_topic,
    sub_property_up_topic,
    topo_add_topic,
    topo_status_topic,
)


def build_sub_properties(sub_device: str, i: int) -> dict:
    return {
        "deviceId": sub_device,
        "temperature": round(20 + 5 * math.sin(i / 4.0), 2),
        "humidity": round(50 + 10 * math.cos(i / 5.0), 2),
        "counter": i,
        "demoSource": "mqtt-demo/06_gateway_uplink_subdevice.py",
    }


def main() -> None:
    parser = build_gateway_arg_parser(
        "网关代报子设备上行（topo add + 属性）",
        client_id_role="gw-up",
    )
    parser.add_argument("--interval", type=float, default=3.0, help="上报间隔秒")
    parser.add_argument(
        "--rounds",
        type=int,
        default=0,
        help="上报轮数，0=常驻",
    )
    parser.add_argument(
        "--skip-topo",
        action="store_true",
        help="跳过 topo add（仅靠属性上报自动创建）",
    )
    parser.add_argument(
        "--with-event",
        action="store_true",
        help="同时代报子设备事件",
    )
    args = parser.parse_args()
    sub_name = args.sub_name or f"demo-sub-{args.sub_device[-4:]}"

    client = connect_mqtt(args)
    stop = {"flag": False}

    def _stop(*_):
        stop["flag"] = True

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    # 1) 拓扑添加 → 自动创建子设备
    if not args.skip_topo:
        topo_payload = build_message(
            tenant_id=args.tenant_id,
            method="thing.topology.add",
            params={
                "deviceInfos": [
                    {
                        "productIdentification": args.sub_product,
                        "deviceIdentification": args.sub_device,
                        "deviceName": sub_name,
                        "name": sub_name,
                    }
                ]
            },
        )
        publish_json(client, topo_add_topic(args.product, args.device), topo_payload, args.qos)
        time.sleep(0.5)

        status_payload = build_message(
            tenant_id=args.tenant_id,
            method="thing.topology.update",
            params={
                "deviceStatuses": [
                    {
                        "deviceIdentification": args.sub_device,
                        "status": "ONLINE",
                    }
                ]
            },
        )
        publish_json(
            client, topo_status_topic(args.product, args.device), status_payload, args.qos
        )
        time.sleep(0.3)

    # 2) 周期代报属性
    i = 0
    try:
        while not stop["flag"]:
            i += 1
            props = build_sub_properties(args.sub_device, i)
            body = build_message(
                tenant_id=args.tenant_id,
                method="thing.property.post",
                params={
                    "productIdentification": args.sub_product,
                    "deviceIdentification": args.sub_device,
                    "deviceName": sub_name,
                    "properties": props,
                },
            )
            publish_json(
                client,
                sub_property_up_topic(args.product, args.device),
                body,
                args.qos,
            )

            if args.with_event and i % 5 == 0:
                event_body = build_message(
                    tenant_id=args.tenant_id,
                    method="thing.event.post",
                    params={
                        "productIdentification": args.sub_product,
                        "deviceIdentification": args.sub_device,
                        "properties": {
                            "level": "INFO",
                            "message": f"gateway-proxy event #{i}",
                        },
                    },
                )
                publish_json(
                    client,
                    sub_event_up_topic(args.product, args.device, "alarm"),
                    event_body,
                    args.qos,
                )

            if args.rounds > 0 and i >= args.rounds:
                break
            time.sleep(max(args.interval, 0.2))
    finally:
        client.loop_stop()
        client.disconnect()
        print("[DONE] 网关上行演示结束")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print(f"[FATAL] {e}", file=sys.stderr)
        raise
