#!/usr/bin/env python3
"""
下行演示：模拟设备在线并订阅云端下行 Topic。

用法 A（推荐，配合页面）:
  1. 先启动本脚本保持在线监听
  2. Web → 设备详情 → 设备控制 → 下发属性 / 调用服务
  3. 终端应立刻打印收到的下行 MQTT，并自动回复 ACK
     （服务 response / 属性 desired set ack，便于链路闭环）

用法 B（本脚本 HTTP 自动触发下发，无需手点页面）:
  python3 02_downlink_listen.py ... \\
    --invoke-api \\
    --api-base http://localhost:48080/admin-api \\
    --token '你的JWT' \\
    --device-id 123 \\
    --service-id demo_switch

示例:
  python3 02_downlink_listen.py \\
    --product 9820630576939008 --device 9720084293632004 --tenant-id 1 \\
    --password 32423

默认 clientId=demo-down-{device}，可与 01/03 对同一设备并行运行。
一键常驻：bash start_mqtt_demo.sh
"""

from __future__ import annotations

import json
import signal
import sys
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

from common import (
    build_arg_parser,
    build_message,
    connect_mqtt,
    device_all_filter,
    property_down_filter,
    publish_json,
    property_desired_set_ack_topic,
    service_down_filter,
    service_response_topic,
)


def extract_service_identifier(topic: str) -> str:
    # /iot/{p}/{d}/service/downstream/invoke/{identifier}
    parts = topic.strip("/").split("/")
    if len(parts) >= 7 and parts[3] == "service" and parts[4] == "downstream":
        return parts[6]
    return "unknown"


def http_invoke(
    api_base: str,
    token: str,
    device_id: int,
    service_id: str,
    params: Dict[str, Any],
) -> None:
    url = f"{api_base.rstrip('/')}/device/{device_id}/invokeService?serviceIdentifier={service_id}"
    data = json.dumps(params).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "X-Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            print(f"[API] invokeService HTTP {resp.status}: {body}")
    except urllib.error.HTTPError as e:
        print(f"[API] 失败 HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}")
    except Exception as e:
        print(f"[API] 调用异常: {e}")


def main() -> None:
    parser = build_arg_parser(
        "模拟设备监听下行命令（验证云→设备打通）",
        client_id_role="down",
    )
    parser.add_argument(
        "--auto-reply",
        action="store_true",
        default=True,
        help="收到服务调用后自动上行 response（默认开）",
    )
    parser.add_argument(
        "--no-auto-reply",
        action="store_true",
        help="关闭自动回执",
    )
    parser.add_argument("--invoke-api", action="store_true", help="启动后自动调 HTTP 下发")
    parser.add_argument("--api-base", default="http://localhost:48080/admin-api")
    parser.add_argument("--token", default="", help="JWT（--invoke-api 时必填）")
    parser.add_argument("--device-id", type=int, default=0, help="设备主键 ID（数字）")
    parser.add_argument("--service-id", default="demo_switch", help="服务标识 identifier")
    parser.add_argument(
        "--invoke-delay",
        type=float,
        default=2.0,
        help="连接成功后延迟多少秒再调 API",
    )
    args = parser.parse_args()
    auto_reply = not args.no_auto_reply

    received = {"count": 0}

    def on_message(client, userdata, msg):
        # 订了 /iot/{p}/{d}/# 时会收到上行 echo，忽略以免刷屏
        if "/upstream/" in msg.topic:
            return
        received["count"] += 1
        text = msg.payload.decode("utf-8", errors="replace")
        print("=" * 60)
        print(f"[DOWN #{received['count']}] topic={msg.topic}")
        print(f"payload={text}")
        print("=" * 60)

        if not auto_reply:
            return

        try:
            body = json.loads(text) if text else {}
        except json.JSONDecodeError:
            body = {}
        request_id = body.get("requestId") or body.get("id")

        if "/property/downstream/desired/set" in msg.topic:
            reply = build_message(
                tenant_id=args.tenant_id,
                method="thing.property.set",
                params=body.get("params") or {},
                request_id=request_id,
                data={"success": True, "echo": body.get("params", body)},
                code=0,
                msg="demo property set ok",
            )
            publish_json(
                client,
                property_desired_set_ack_topic(args.product, args.device),
                reply,
                qos=args.qos,
            )
            print("[ACK] 已回执属性期望设置 desired/set/ack")
            return

        if "/service/downstream/invoke/" not in msg.topic:
            return

        identifier = extract_service_identifier(msg.topic)
        reply = build_message(
            tenant_id=args.tenant_id,
            method="thing.service.invoke",
            params={"result": "ok", "echo": body.get("params", body)},
            request_id=request_id,
            data={"success": True},
            code=0,
            msg="demo ok",
        )
        publish_json(
            client,
            service_response_topic(args.product, args.device, identifier),
            reply,
            qos=args.qos,
        )
        print(f"[ACK] 已回执服务 {identifier}")

    client = connect_mqtt(args, on_message=on_message)

    topics = [
        device_all_filter(args.product, args.device),
        service_down_filter(args.product, args.device),
        property_down_filter(args.product, args.device),
    ]
    for t in topics:
        client.subscribe(t, qos=args.qos)
        print(f"[SUB] {t}")

    print("=" * 60)
    print("设备已在线监听下行。请到 Web「设备控制」下发属性或服务。")
    print("或使用 --invoke-api --token ... --device-id ... 自动触发。")
    print("Ctrl+C 结束")
    print("=" * 60)

    if args.invoke_api:
        if not args.token or not args.device_id:
            raise SystemExit("--invoke-api 需要同时提供 --token 和 --device-id")

        def _trigger():
            time.sleep(args.invoke_delay)
            http_invoke(
                args.api_base,
                args.token,
                args.device_id,
                args.service_id,
                {"action": "on", "from": "mqtt-demo/02_downlink_listen.py"},
            )

        threading.Thread(target=_trigger, daemon=True).start()

    stop = {"flag": False}

    def _stop(*_):
        stop["flag"] = True

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    while not stop["flag"]:
        time.sleep(0.2)

    client.loop_stop()
    client.disconnect()
    print(f"[DONE] 共收到下行 {received['count']} 条")


if __name__ == "__main__":
    main()
