import os
from typing import Any, Dict

from models import Device, db
from app.utils.media_client import allocate_device_media, enqueue_agent_command


def ensure_edge_rtsp_forward(device_id: str, *, edge_node_id: int, transport: str = "tcp") -> Dict[str, Any]:
    device = Device.query.get(device_id)
    if not device:
        raise ValueError(f"device not found: {device_id}")

    source = (device.source or "").strip()
    if not source.lower().startswith("rtsp://"):
        raise ValueError("edge rtsp forwarding requires a rtsp:// device source")
    if not edge_node_id:
        raise ValueError("edge_node_id is required")

    binding = allocate_device_media(device_id, need_srs_live=True, need_srs_ai=True, need_zlm=False)
    rtmp_stream = binding.get("rtmpStream") or device.rtmp_stream
    http_stream = binding.get("httpStream") or device.http_stream
    if not rtmp_stream:
        raise ValueError("media allocation did not return rtmpStream")

    normalized_transport = transport if transport in ("tcp", "udp") else "tcp"
    payload = {
        "deviceId": device_id,
        "rtspUrl": source,
        "rtmpPushUrl": rtmp_stream,
        "streamName": f"live/{device_id}",
        "transport": normalized_transport,
        "heartbeatUrl": os.getenv("VIDEO_EDGE_HEARTBEAT_URL", ""),
        "logDir": os.path.join(
            os.getenv("EDGE_STREAM_LOG_ROOT", "/opt/easyaiot/logs/edge-stream"),
            device_id,
        ),
    }
    command = enqueue_agent_command(
        node_id=int(edge_node_id),
        command_type="stream_forward.deploy",
        command_key=f"stream_forward:{device_id}",
        payload=payload,
    )

    device.rtmp_stream = rtmp_stream
    device.http_stream = http_stream or device.http_stream
    device.ai_rtmp_stream = binding.get("aiRtmpStream") or device.ai_rtmp_stream
    device.ai_http_stream = binding.get("aiHttpStream") or device.ai_http_stream
    device.enable_forward = True
    db.session.commit()

    return {
        "deviceId": device_id,
        "edgeNodeId": edge_node_id,
        "payload": payload,
        "command": command,
    }
