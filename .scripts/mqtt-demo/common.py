#!/usr/bin/env python3
"""MQTT 联调公共配置与工具。"""

from __future__ import annotations

import argparse
import json
import time
import uuid
from typing import Any, Dict, Optional

try:
    import paho.mqtt.client as mqtt
except ImportError as e:  # pragma: no cover
    raise SystemExit(
        "缺少依赖: pip install paho-mqtt\n" + str(e)
    ) from e


# 各脚本默认角色 → 互不冲突的 clientId: demo-{role}-{device}
CLIENT_ID_ROLES = ("up", "down", "full", "gw-up", "gw-down")


def build_arg_parser(
    description: str,
    *,
    client_id_role: str = "up",
) -> argparse.ArgumentParser:
    if client_id_role not in CLIENT_ID_ROLES:
        raise ValueError(f"client_id_role 须为 {CLIENT_ID_ROLES}，收到: {client_id_role}")
    p = argparse.ArgumentParser(description=description)
    p.set_defaults(client_id_role=client_id_role)
    p.add_argument("--host", default="localhost", help="EMQX 地址")
    p.add_argument("--port", type=int, default=1883, help="EMQX 端口")
    p.add_argument("--product", required=True, help="产品标识 productIdentification")
    p.add_argument("--device", required=True, help="设备标识 deviceIdentification")
    p.add_argument(
        "--tenant-id",
        type=int,
        required=True,
        help="租户 ID（payload 必填，与库里该设备 tenant_id 一致）",
    )
    p.add_argument(
        "--password",
        default="",
        help="MQTT 密码。设备鉴权模式为产品/设备密码；broker 模式可用 emqx 用户密码",
    )
    p.add_argument(
        "--auth-mode",
        choices=("device", "broker"),
        default="device",
        help="device=用户名 device&product；broker=任意 broker 账号（本地无 HTTP 鉴权时可用）",
    )
    p.add_argument(
        "--broker-user",
        default="emqx",
        help="auth-mode=broker 时的用户名",
    )
    p.add_argument(
        "--client-id",
        default="",
        help=(
            f"MQTT ClientId，默认 demo-{client_id_role}-{{device}}。"
            "01/02/03 默认角色不同，可对同一设备并行连接"
        ),
    )
    p.add_argument("--qos", type=int, default=1, choices=(0, 1, 2))
    return p


def mqtt_username(args: argparse.Namespace) -> str:
    if args.auth_mode == "broker":
        return args.broker_user
    # 平台约定: {deviceIdentification}&{productIdentification}
    return f"{args.device}&{args.product}"


def mqtt_password(args: argparse.Namespace) -> str:
    if args.password:
        return args.password
    if args.auth_mode == "broker":
        return "123456"
    raise SystemExit("auth-mode=device 时必须通过 --password 传入产品/设备密码")


def mqtt_client_id(args: argparse.Namespace) -> str:
    if args.client_id:
        return args.client_id
    role = getattr(args, "client_id_role", "up") or "up"
    return f"demo-{role}-{args.device}"


def property_topic(product: str, device: str) -> str:
    return f"/iot/{product}/{device}/property/upstream/report"


def event_topic(product: str, device: str, identifier: str = "alarm") -> str:
    return f"/iot/{product}/{device}/event/upstream/report/{identifier}"


def log_topic(product: str, device: str) -> str:
    return f"/iot/{product}/{device}/log/upstream/report"


def service_down_filter(product: str, device: str) -> str:
    return f"/iot/{product}/{device}/service/downstream/#"


def property_down_filter(product: str, device: str) -> str:
    return f"/iot/{product}/{device}/property/downstream/#"


def all_down_filter(product: str, device: str) -> str:
    return f"/iot/{product}/{device}/+"


def device_all_filter(product: str, device: str) -> str:
    return f"/iot/{product}/{device}/#"


def service_response_topic(product: str, device: str, identifier: str) -> str:
    return (
        f"/iot/{product}/{device}/service/upstream/invoke/{identifier}/response"
    )


def property_desired_set_ack_topic(product: str, device: str) -> str:
    return f"/iot/{product}/{device}/property/upstream/desired/set/ack"


# ---------- 网关 / 子设备代理 Topic ----------


def topo_add_topic(gateway_product: str, gateway_device: str) -> str:
    return f"/iot/{gateway_product}/{gateway_device}/topo/upstream/add"


def topo_delete_topic(gateway_product: str, gateway_device: str) -> str:
    return f"/iot/{gateway_product}/{gateway_device}/topo/upstream/delete"


def topo_status_topic(gateway_product: str, gateway_device: str) -> str:
    return f"/iot/{gateway_product}/{gateway_device}/topo/upstream/status"


def sub_property_up_topic(gateway_product: str, gateway_device: str) -> str:
    return f"/iot/{gateway_product}/{gateway_device}/sub/property/upstream/report"


def sub_event_up_topic(
    gateway_product: str, gateway_device: str, identifier: str = "alarm"
) -> str:
    return (
        f"/iot/{gateway_product}/{gateway_device}/sub/event/upstream/report/{identifier}"
    )


def sub_service_down_filter(gateway_product: str, gateway_device: str) -> str:
    return f"/iot/{gateway_product}/{gateway_device}/sub/service/downstream/#"


def sub_property_down_filter(gateway_product: str, gateway_device: str) -> str:
    return f"/iot/{gateway_product}/{gateway_device}/sub/property/downstream/#"


def sub_all_filter(gateway_product: str, gateway_device: str) -> str:
    return f"/iot/{gateway_product}/{gateway_device}/sub/#"


def sub_service_response_topic(
    gateway_product: str, gateway_device: str, identifier: str
) -> str:
    return (
        f"/iot/{gateway_product}/{gateway_device}/sub/service/upstream/invoke/"
        f"{identifier}/response"
    )


def sub_property_desired_set_ack_topic(gateway_product: str, gateway_device: str) -> str:
    return (
        f"/iot/{gateway_product}/{gateway_device}/sub/property/upstream/desired/set/ack"
    )


def build_gateway_arg_parser(
    description: str,
    *,
    client_id_role: str = "gw-up",
) -> argparse.ArgumentParser:
    """网关脚本参数：网关用 --product/--device，子设备用 --sub-product/--sub-device。"""
    p = build_arg_parser(description, client_id_role=client_id_role)
    p.add_argument(
        "--sub-product",
        required=True,
        help="子设备产品标识（库中须存在且 productType=SUBSET）",
    )
    p.add_argument(
        "--sub-device",
        required=True,
        help="子设备标识（可不预先建档，上行会自动创建）",
    )
    p.add_argument(
        "--sub-name",
        default="",
        help="子设备名称（topo add / 自动创建时使用）",
    )
    return p


def build_demo_property_params(device: str, i: int) -> Dict[str, Any]:
    """与本地物模型 propertyCode 对齐，供 01 / 03 共用。"""
    import math

    angle_x = round(math.sin(i / 3.0) * 5, 2)
    angle_y = round(math.cos(i / 4.0) * 3, 2)
    angle_z = round(math.sin(i / 5.0) * 1.5, 2)
    vbatt = round(3.6 + 0.3 * math.sin(i / 6.0), 2)
    rssi = int(-55 - 15 * abs(math.sin(i / 7.0)))
    return {
        "deviceId": device,
        "serviceId": "demo-svc",
        "Vbatt": str(vbatt),
        "eventTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "PVAngle_X": str(angle_x),
        "PVAngle_Y": str(angle_y),
        "PVAngle_Z": str(angle_z),
        "RSSI": str(rssi),
    }


def build_message(
    *,
    tenant_id: int,
    method: str,
    params: Any,
    request_id: Optional[str] = None,
    data: Any = None,
    code: Optional[int] = None,
    msg: Optional[str] = None,
) -> Dict[str, Any]:
    body: Dict[str, Any] = {
        "tenantId": tenant_id,
        "requestId": request_id or str(uuid.uuid4()).replace("-", "")[:16],
        "method": method,
        "params": params,
    }
    if data is not None:
        body["data"] = data
    if code is not None:
        body["code"] = code
    if msg is not None:
        body["msg"] = msg
    return body


def dumps(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def connect_mqtt(args: argparse.Namespace, on_message=None) -> mqtt.Client:
    client_id = mqtt_client_id(args)
    # paho-mqtt 2.x / 1.x 兼容
    try:
        client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION1,  # type: ignore[attr-defined]
            client_id=client_id,
            clean_session=True,
        )
    except Exception:
        client = mqtt.Client(client_id=client_id, clean_session=True)

    user = mqtt_username(args)
    pwd = mqtt_password(args)
    client.username_pw_set(user, pwd)

    connected = {"ok": False, "ever": False}

    def on_connect(c, userdata, flags, rc, properties=None):
        if rc == 0:
            if connected["ever"]:
                print(
                    f"[MQTT] 已重连 {args.host}:{args.port} clientId={client_id} user={user}"
                )
            else:
                print(
                    f"[MQTT] 已连接 {args.host}:{args.port} clientId={client_id} user={user}"
                )
            connected["ok"] = True
            connected["ever"] = True
        else:
            connected["ok"] = False
            print(
                f"[MQTT] 连接失败 rc={rc}（检查 EMQX、鉴权账号、HTTP Auth 是否指向 sink）"
            )

    def on_disconnect(c, userdata, rc, properties=None):
        connected["ok"] = False
        if rc != 0:
            print(
                f"[MQTT] 意外断开 rc={rc} clientId={client_id}。"
                f"若与其它进程 clientId 冲突，请检查是否手动指定了相同 --client-id"
            )

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    if on_message is not None:
        client.on_message = on_message

    client.connect(args.host, args.port, keepalive=60)
    client.loop_start()

    for _ in range(50):
        if connected["ok"]:
            break
        time.sleep(0.1)
    if not connected["ok"]:
        client.loop_stop()
        raise SystemExit("MQTT 连接超时，请确认 Broker 可达且账号正确")
    return client


def publish_json(
    client: mqtt.Client, topic: str, payload: Dict[str, Any], qos: int = 1
) -> None:
    raw = dumps(payload)
    if not client.is_connected():
        for _ in range(30):
            if client.is_connected():
                break
            time.sleep(0.1)
        if not client.is_connected():
            raise SystemExit(
                "MQTT 未连接，无法发布。"
                "请确认 Broker 可达，且没有其它进程占用同一 --client-id"
            )
    info = client.publish(topic, raw, qos=qos)
    try:
        info.wait_for_publish(timeout=5)
    except RuntimeError as e:
        raise SystemExit(
            f"MQTT 发布失败: {e}\n"
            "请确认 Broker 可达，且没有其它进程占用同一 --client-id"
        ) from e
    print(f"[PUB] {topic}\n      {raw}")
