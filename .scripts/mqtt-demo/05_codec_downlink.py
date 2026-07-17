#!/usr/bin/env python3
"""私有协议下行演示：订阅并解析 EA|DN|…，自动回 EA|UP|SVC_ACK / DESIRED_ACK。

前置:
  1. 产品已启用 compact_text 协议脚本（protocolToRawData 编码下行）
  2. 用 Web「下发服务」或 --invoke-api 触发下行

验收:
  - 终端打印解析后的 EA|DN|…（不是标准 JSON）
  - 自动上行 ACK 后，平台服务调用有响应记录
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (  # noqa: E402
    build_arg_parser,
    connect_mqtt,
    device_all_filter,
    property_desired_set_ack_topic,
    service_response_topic,
)
from protocol_ea import (  # noqa: E402
    decode_downlink,
    encode_desired_ack,
    encode_service_ack,
    try_decode_any,
)


def http_invoke(api_base: str, token: str, device_id: int, service: str, body: dict) -> None:
    url = f"{api_base.rstrip('/')}/device/{device_id}/invokeService?serviceIdentifier={service}"
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}" if token else "",
            "X-Authorization": f"Bearer {token}" if token else "",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"[API] invokeService HTTP {resp.status}: {resp.read()[:300]!r}")
    except urllib.error.HTTPError as e:
        print(f"[API] invokeService 失败 HTTP {e.code}: {e.read()[:300]!r}")
    except Exception as e:
        print(f"[API] invokeService 异常: {e}")


def main() -> None:
    p = build_arg_parser(
        "私有协议下行：订阅 EA|DN|… 并 ACK",
        client_id_role="down",
    )
    p.add_argument("--auto-ack", action="store_true", default=True, help="自动 ACK（默认开）")
    p.add_argument("--no-auto-ack", action="store_false", dest="auto_ack")
    p.add_argument("--invoke-api", action="store_true", help="启动后 HTTP 触发一次服务调用")
    p.add_argument("--device-id", type=int, default=0, help="invoke-api 用的设备主键 id")
    p.add_argument("--api-base", default="http://localhost:48080/admin-api")
    p.add_argument("--token", default="", help="JWT")
    p.add_argument("--service", default="reboot", help="服务标识")
    args = p.parse_args()

    if not args.client_id:
        args.client_id = f"demo-codec-down-{args.device}"

    state = {"count": 0}

    def on_message(client, userdata, msg):
        topic = msg.topic
        if "/upstream/" in topic:
            return
        kind, data = try_decode_any(msg.payload)
        state["count"] += 1
        print(f"\n[DOWN#{state['count']}] topic={topic} kind={kind}")
        if kind == "ea_down":
            print(f"      raw={data['raw']}")
            print(
                f"      requestId={data['requestId']} type={data['type']} "
                f"id={data['identifier']} payload={data['payload']!r}"
            )
            if not args.auto_ack:
                return
            rid = data["requestId"]
            if data["type"] == "SET":
                ack_topic = property_desired_set_ack_topic(args.product, args.device)
                raw = encode_desired_ack(tenant_id=args.tenant_id, request_id=rid)
            else:
                ack_topic = service_response_topic(
                    args.product, args.device, data["identifier"] or args.service
                )
                raw = encode_service_ack(
                    tenant_id=args.tenant_id,
                    request_id=rid,
                    params={"result": "ok", "echo": str(data["payload"])},
                )
            client.publish(ack_topic, raw, qos=args.qos)
            print(f"[ACK] {ack_topic}\n      {raw.decode('utf-8')}")
        else:
            print(f"      payload={data!r}")
            print("      （未识别为 EA|DN|… — 请确认产品脚本已启用 protocolToRawData）")

    client = connect_mqtt(args, on_message=on_message)
    sub = device_all_filter(args.product, args.device)
    client.subscribe(sub, qos=args.qos)
    print(
        f"[CODEC-DOWN] subscribed {sub}\n"
        f"      请确认产品 {args.product} 已启用协议脚本；下行应为 EA|DN|… 而非 JSON"
    )

    if args.invoke_api:
        if not args.device_id:
            raise SystemExit("--invoke-api 需要 --device-id")
        time.sleep(1)
        http_invoke(
            args.api_base,
            args.token,
            args.device_id,
            args.service,
            {"action": "on", "from": "mqtt-demo/05_codec_downlink"},
        )

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[CODEC-DOWN] 停止")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
