#!/usr/bin/env python3
"""
上行演示：模拟设备周期性上报属性。

运行后到 Web 打开该设备详情，刷新查看：
  - 影子 Shadow：params 会更新
  - 运行状态 / 历史：st_property_upstream_report 有新数据
  - 设备列表：应变为 ONLINE

示例（本地库已有设备）:
  python3 01_uplink_property.py \\
    --product 9820630576939008 --device 9720084293632004 --tenant-id 1 \\
    --password 32423

若本地 EMQX 还没配 HTTP 鉴权，可先:
  python3 01_uplink_property.py \\
    --product 9820630576939008 --device 9720084293632004 --tenant-id 1 \\
    --auth-mode broker --password 123456

默认 clientId=demo-up-{device}，可与 02/03 对同一设备并行运行。
一键常驻：bash start_mqtt_demo.sh
"""

from __future__ import annotations

import signal
import time

from common import (
    build_arg_parser,
    build_demo_property_params,
    build_message,
    connect_mqtt,
    event_topic,
    log_topic,
    property_topic,
    publish_json,
)


def main() -> None:
    parser = build_arg_parser(
        "模拟设备属性上行，便于在页面看到数值变化",
        client_id_role="up",
    )
    parser.add_argument("--interval", type=float, default=3.0, help="上报间隔秒")
    parser.add_argument(
        "--rounds",
        type=int,
        default=0,
        help="上报轮数，0=一直跑直到 Ctrl+C",
    )
    parser.add_argument(
        "--with-event",
        action="store_true",
        help="每 5 轮额外上报一次事件（设备事件页可见）",
    )
    parser.add_argument(
        "--with-log",
        action="store_true",
        help="每 5 轮额外上报一次设备日志",
    )
    args = parser.parse_args()

    client = connect_mqtt(args)
    topic = property_topic(args.product, args.device)
    print("=" * 60)
    print("上行 Topic:", topic)
    print("请打开 Web → 设备详情 → 影子 / 运行状态 / 历史，观察数值变化")
    print("默认 params 对齐本机物模型: deviceId/serviceId/Vbatt/eventTime/PVAngle_*/RSSI")
    print("=" * 60)

    stop = {"flag": False}

    def _stop(*_):
        stop["flag"] = True

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    i = 0
    while not stop["flag"]:
        i += 1
        params = build_demo_property_params(args.device, i)
        payload = build_message(
            tenant_id=args.tenant_id,
            method="thing.property.post",
            params=params,
        )
        publish_json(client, topic, payload, qos=args.qos)

        if args.with_event and i % 5 == 0:
            evt = build_message(
                tenant_id=args.tenant_id,
                method="thing.event.post",
                params={
                    "eventName": "demo_alarm",
                    "eventType": "INFO",
                    "level": "INFO",
                    "message": f"demo event #{i}",
                    "counter": i,
                },
            )
            publish_json(
                client,
                event_topic(args.product, args.device, "alarm"),
                evt,
                qos=args.qos,
            )

        if args.with_log and i % 5 == 0:
            log_payload = build_message(
                tenant_id=args.tenant_id,
                method="thing.log.post",
                params={
                    "level": "INFO",
                    "content": f"demo log line {i}",
                    "message": f"demo log line {i}",
                },
            )
            publish_json(
                client,
                log_topic(args.product, args.device),
                log_payload,
                qos=args.qos,
            )

        if args.rounds and i >= args.rounds:
            break
        time.sleep(args.interval)

    client.loop_stop()
    client.disconnect()
    print("[DONE] 上行演示结束")


if __name__ == "__main__":
    main()
