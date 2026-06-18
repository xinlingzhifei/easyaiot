"""
后处理结果告警派发（由 Sink Worker 消费结果主题后触发）
"""
from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


def _alert_hook_url() -> str:
    gateway = os.getenv('JAVA_BACKEND_URL', os.getenv('GATEWAY_URL', 'http://localhost:48080')).rstrip('/')
    video_port = os.getenv('VIDEO_SERVICE_PORT', '6000')
    explicit = os.getenv('ALERT_HOOK_URL', '').strip()
    if explicit:
        return explicit
    if gateway and 'localhost:48080' not in gateway:
        return f'{gateway}/admin-api/video/alert/hook'
    return f'http://localhost:{video_port}/video/alert/hook'


def _send_alert_async(alert_data: Dict[str, Any]) -> None:
    def _send():
        try:
            response = requests.post(
                _alert_hook_url(),
                json=alert_data,
                timeout=5,
                headers={'Content-Type': 'application/json'},
            )
            if response.status_code != 200:
                logger.warning('后处理告警投递失败 status=%s body=%s', response.status_code, response.text[:200])
        except Exception as exc:
            logger.warning('后处理告警投递异常: %s', exc)

    threading.Thread(target=_send, daemon=True).start()


def _build_default_alert(
    message: Dict[str, Any],
    detections: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if not detections:
        return None
    object_counts: Dict[str, int] = {}
    all_info = []
    for det in detections:
        class_name = det.get('class_name') or det.get('className') or 'unknown'
        object_counts[class_name] = object_counts.get(class_name, 0) + 1
        all_info.append({
            'track_id': det.get('track_id', det.get('trackId', 0)),
            'class_name': class_name,
            'confidence': det.get('confidence', 0),
            'bbox': det.get('bbox', []),
            'duration': det.get('duration', 0),
        })
    primary = max(object_counts.items(), key=lambda x: x[1])[0] if object_counts else 'unknown'
    task_type = message.get('taskType') or message.get('task_type') or 'realtime'
    correlation_id = message.get('correlationId') or message.get('correlation_id')
    return {
        'object': primary,
        'event': message.get('taskName') or message.get('task_name') or 'post_process',
        'device_id': message.get('deviceId') or message.get('device_id'),
        'device_name': message.get('deviceName') or message.get('device_name'),
        'task_type': task_type,
        'correlation_id': correlation_id,
        'time': message.get('timestamp') or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S'),
        'information': json.dumps({
            'total_count': len(detections),
            'object_counts': object_counts,
            'detections': all_info,
            'frame_number': message.get('frameNumber') or message.get('frame_number'),
            'correlation_id': correlation_id,
            'source': 'post_process_sink',
        }, ensure_ascii=False),
        'image_path': message.get('alertImagePath') or message.get('alert_image_path'),
    }


def dispatch_post_process_alerts(message: Dict[str, Any]) -> None:
    payload = message.get('payload') if isinstance(message.get('payload'), dict) else message
    task_type = message.get('taskType') or message.get('task_type') or 'realtime'
    device_id = message.get('deviceId') or message.get('device_id')
    device_name = message.get('deviceName') or message.get('device_name')

    custom_alerts = payload.get('alerts') or message.get('alerts') or []
    if custom_alerts and not isinstance(custom_alerts, list):
        custom_alerts = []

    for alert in custom_alerts:
        if not isinstance(alert, dict):
            continue
        merged = {
            'device_id': device_id,
            'device_name': device_name,
            'task_type': task_type,
        }
        merged.update(alert)
        _send_alert_async(merged)

    suppress = payload.get('suppress_default_alert')
    if suppress is None:
        suppress = message.get('suppressDefaultAlert') or message.get('suppress_default_alert')
    if suppress:
        return

    detections = payload.get('detections')
    if detections is None:
        detections = message.get('detections') or []
    alert_data = _build_default_alert(message, detections)
    if alert_data:
        _send_alert_async(alert_data)
