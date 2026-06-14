from datetime import datetime
from typing import Any, Dict, Optional

from models import DeviceAccessStateCurrent, DeviceAccessStateEvent, db


ACCESS_STATES = {
    "pending_config",
    "registering",
    "registered",
    "stream_online",
    "play_ready",
    "ai_ready",
    "error",
}

ACCESS_PROTOCOLS = {
    "gb28181",
    "rtsp",
    "rtmp",
    "http_flv",
    "webrtc",
    "edge_agent",
}

STATE_PRIORITY = {
    "pending_config": 0,
    "registering": 10,
    "registered": 20,
    "stream_online": 30,
    "play_ready": 40,
    "ai_ready": 50,
    "error": 100,
}


def _format_time(value: Any) -> Optional[str]:
    return value.isoformat() if value is not None and hasattr(value, "isoformat") else None


def record_device_access_event(
    *,
    device_id: str,
    protocol: str,
    state: str,
    reason_code: Optional[str] = None,
    reason_message: Optional[str] = None,
    source_event: Optional[str] = None,
    event_time: Optional[datetime] = None,
    stream_id: Optional[str] = None,
    node_id: Optional[int] = None,
    tenant_id: Optional[str] = None,
    commit: bool = True,
) -> Dict[str, Any]:
    clean_device_id = (device_id or "").strip()
    clean_protocol = (protocol or "").strip().lower()
    clean_state = (state or "").strip().lower()
    if not clean_device_id:
        raise ValueError("device_id is required")
    if clean_protocol not in ACCESS_PROTOCOLS:
        raise ValueError(f"unsupported access protocol: {protocol}")
    if clean_state not in ACCESS_STATES:
        raise ValueError(f"unsupported access state: {state}")

    transition_time = event_time or datetime.utcnow()
    event = DeviceAccessStateEvent(
        device_id=clean_device_id,
        protocol=clean_protocol,
        state=clean_state,
        reason_code=reason_code,
        reason_message=reason_message,
        source_event=source_event,
        event_time=transition_time,
        stream_id=stream_id,
        node_id=node_id,
        tenant_id=tenant_id,
    )
    db.session.add(event)

    current = DeviceAccessStateCurrent.query.filter_by(
        device_id=clean_device_id,
        protocol=clean_protocol,
    ).one_or_none()
    if current is None:
        current = DeviceAccessStateCurrent(device_id=clean_device_id, protocol=clean_protocol)
        db.session.add(current)

    current.state = clean_state
    current.reason_code = reason_code
    current.reason_message = reason_message
    current.source_event = source_event
    current.last_transition_time = transition_time
    current.stream_id = stream_id
    current.node_id = node_id
    current.tenant_id = tenant_id

    if commit:
        db.session.commit()
    return {"event": event, "current": current}


def record_srs_publish_online(
    hook_payload: Dict[str, Any],
    *,
    node_id: Optional[int] = None,
    tenant_id: Optional[str] = None,
    commit: bool = True,
) -> Dict[str, Any]:
    app = str(hook_payload.get("app") or "").strip().strip("/")
    stream = str(hook_payload.get("stream") or "").strip().strip("/")
    stream_url = str(hook_payload.get("stream_url") or "").strip().strip("/")
    if not app or not stream:
        parts = [part for part in stream_url.split("/") if part]
        if len(parts) >= 2:
            app = app or parts[-2]
            stream = stream or parts[-1]
    if not stream:
        raise ValueError("SRS publish hook stream is required")

    device_id = stream.rsplit("/", 1)[-1]
    stream_id = f"{app}/{stream}" if app else stream
    protocol = "rtmp"
    edge_current = DeviceAccessStateCurrent.query.filter_by(
        device_id=device_id,
        protocol="edge_agent",
    ).one_or_none()
    if edge_current is not None and edge_current.state in {"registering", "registered"}:
        protocol = "edge_agent"

    return record_device_access_event(
        device_id=device_id,
        protocol=protocol,
        state="stream_online",
        reason_code="srs_publish_online",
        reason_message="SRS publish hook confirmed live stream",
        source_event="srs.on_publish",
        stream_id=stream_id,
        node_id=node_id,
        tenant_id=tenant_id,
        commit=commit,
    )


def get_device_access_summary(device_id: str) -> Dict[str, Any]:
    clean_device_id = (device_id or "").strip()
    if not clean_device_id:
        raise ValueError("device_id is required")

    rows = DeviceAccessStateCurrent.query.filter_by(device_id=clean_device_id).all()
    if not rows:
        return {
            "state": "pending_config",
            "reason_code": "missing_access_state",
            "reason_message": "Device access has not reported state yet",
            "play_ready": False,
            "ai_ready": False,
            "last_transition_time": None,
            "protocols": [],
        }

    selected = max(rows, key=lambda row: STATE_PRIORITY.get(row.state, -1))
    ai_ready = any(row.state == "ai_ready" for row in rows)
    play_ready = ai_ready or any(row.state in {"play_ready", "ai_ready"} for row in rows)
    return {
        "state": selected.state,
        "reason_code": selected.reason_code,
        "reason_message": selected.reason_message,
        "play_ready": play_ready,
        "ai_ready": ai_ready,
        "last_transition_time": _format_time(selected.last_transition_time),
        "protocols": [row.protocol for row in rows],
    }
