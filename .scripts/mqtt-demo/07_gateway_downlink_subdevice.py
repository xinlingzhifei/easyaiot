#!/usr/bin/env python3
"""
网关下行演示：模拟网关订阅并转发子设备控制指令。

网关连接后订阅:
  /iot/{gwProduct}/{gwDevice}/sub/#

当 Web 对「子设备」下发属性/服务时，平台会把指令发到上述 Topic（payload 含子设备标识）。
本脚本打印下行并自动 ACK / service response，证明「云 → 网关 → 子设备」闭环。

用法 A（配合页面）:
  1. 先跑 06 确保子设备已创建
  2. 启动本脚本
  3. Web → 子设备详情 → 设备控制 → 下发

用法 B（HTTP 自动触发，针对子设备数字主键）:
  python3 07_gateway_downlink_subdevice.py ... \\
    --invoke-api --api-base http://localhost:48080/admin-api \\
    --token 'JWT' --sub-device-id <子设备主键> --service-id <服务标识>
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
    build_gateway_arg_parser,
    build_message,
    connect_mqtt,
    device_all_filter,
    publish_json,
    sub_all_filter,
    sub_property_desired_set_ack_topic,
    sub_service_response_topic,
)


def extract_service_identifier(topic: str) -> str:
    # /iot/{p}/{d}/sub/service/downstream/invoke/{identifier}
    parts = topic.strip("/").split("/")
    if (
        len(parts) >= 8
        and parts[3] == "sub"
        and parts[4] == "service"
        and parts[5] == "downstream"
    ):
        return parts[7]
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


def http_set_properties(
    api_base: str,
    token: str,
    device_id: int,
    props: Dict[str, Any],
) -> None:
    url = f"{api_base.rstrip('/')}/device/{device_id}/setProperties"
    data = json.dumps(props).encode("utf-8")
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
            print(f"[API] setProperties HTTP {resp.status}: {body}")
    except urllib.error.HTTPError as e:
        print(f"[API] 失败 HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}")
    except Exception as e:
        print(f"[API] 调用异常: {e}")


def main() -> None:
    parser = build_gateway_arg_parser(
        "网关监听子设备下行并自动回执",
        client_id_role="gw-down",
    )
    parser.add_argument("--auto-reply", action="store_true", default=True)
    parser.add_argument("--no-auto-reply", action="store_false", dest="auto_reply")
    parser.add_argument("--invoke-api", action="store_true", help="启动后 HTTP 触发一次服务下发")
    parser.add_argument("--set-props-api", action="store_true", help="启动后 HTTP 触发一次属性下发")
    parser.add_argument("--api-base", default="http://localhost:48080/admin-api")
    parser.add_argument("--token", default="")
    parser.add_argument(
        "--sub-device-id",
        type=int,
        default=0,
        help="子设备数字主键（invoke-api / set-props-api 时必填）",
    )
    parser.add_argument("--service-id", default="demo_switch")
    parser.add_argument(
        "--service-params",
        default='{"action":"on"}',
        help="invoke-api 的 JSON 参数",
    )
    parser.add_argument(
        "--props-json",
        default='{"temperature":26.5}',
        help="set-props-api 的 JSON 属性",
    )
    args = parser.parse_args()

    counter = {"n": 0}

    def on_message(client, userdata, msg):
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except Exception:
            payload = {"raw": msg.payload.decode("utf-8", errors="replace")}
        counter["n"] += 1
        print(f"\n[DOWN #{counter['n']}] topic={topic}")
        print(f"payload={json.dumps(payload, ensure_ascii=False)}")

        if not args.auto_reply:
            return

        # 仅处理经网关代理的子设备下行
        if "/sub/service/downstream/invoke/" in topic:
            identifier = extract_service_identifier(topic)
            req_id = payload.get("requestId")
            # 回执时带回子设备标识，便于平台归属
            body = build_message(
                tenant_id=args.tenant_id,
                method="thing.service.invoke",
                params={
                    "productIdentification": args.sub_product,
                    "deviceIdentification": args.sub_device,
                    "input": {"result": "ok", "via": "gateway-proxy"},
                },
                request_id=req_id,
                data={"success": True},
                code=0,
                msg="gateway demo ok",
            )
            publish_json(
                client,
                sub_service_response_topic(args.product, args.device, identifier),
                body,
                args.qos,
            )
            print(f"[ACK] 已回执子设备服务 {identifier}")
        elif topic.endswith("/sub/property/downstream/desired/set"):
            req_id = payload.get("requestId")
            body = build_message(
                tenant_id=args.tenant_id,
                method="thing.property.set",
                params={
                    "productIdentification": args.sub_product,
                    "deviceIdentification": args.sub_device,
                    "input": {"acked": True},
                },
                request_id=req_id,
                data={"success": True},
                code=0,
                msg="gateway property ack",
            )
            publish_json(
                client,
                sub_property_desired_set_ack_topic(args.product, args.device),
                body,
                args.qos,
            )
            print("[ACK] 已回执子设备属性期望设置")

    client = connect_mqtt(args, on_message=on_message)
    filters = [
        sub_all_filter(args.product, args.device),
        device_all_filter(args.product, args.device),
    ]
    for f in filters:
        client.subscribe(f, qos=args.qos)
        print(f"[SUB] {f}")

    stop = {"flag": False}

    def _stop(*_):
        stop["flag"] = True

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    def trigger_api():
        time.sleep(1.5)
        if not args.token:
            print("[API] 未提供 --token，跳过 HTTP 触发")
            return
        if not args.sub_device_id:
            print("[API] 未提供 --sub-device-id，跳过 HTTP 触发")
            return
        if args.invoke_api:
            try:
                params = json.loads(args.service_params)
            except Exception:
                params = {}
            http_invoke(
                args.api_base, args.token, args.sub_device_id, args.service_id, params
            )
        if args.set_props_api:
            try:
                props = json.loads(args.props_json)
            except Exception:
                props = {}
            http_set_properties(args.api_base, args.token, args.sub_device_id, props)

    if args.invoke_api or args.set_props_api:
        threading.Thread(target=trigger_api, daemon=True).start()

    print(
        f"[READY] 网关已监听子设备下行。请在 Web 对子设备 {args.sub_device} 下发控制，"
        f"或使用 --invoke-api / --set-props-api"
    )
    try:
        while not stop["flag"]:
            time.sleep(0.3)
    finally:
        client.loop_stop()
        client.disconnect()
        print(f"[DONE] 共收到下行 {counter['n']} 条")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print(f"[FATAL] {e}", file=sys.stderr)
        raise
