"""
算法任务 AI 后处理 Kafka 投递（请求/结果双主题，与执行和落库完全解耦）
"""
from __future__ import annotations

import logging
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from flask import current_app

from app.services.alert_hook_service import get_kafka_producer

logger = logging.getLogger(__name__)


def _request_topic() -> str:
    try:
        return current_app.config.get('KAFKA_POST_PROCESS_REQUEST_TOPIC', 'iot-post-process-request')
    except RuntimeError:
        import os
        return os.getenv('KAFKA_POST_PROCESS_REQUEST_TOPIC', 'iot-post-process-request')


def _result_topic() -> str:
    try:
        return current_app.config.get('KAFKA_POST_PROCESS_RESULT_TOPIC', 'iot-post-process-result')
    except RuntimeError:
        import os
        return os.getenv('KAFKA_POST_PROCESS_RESULT_TOPIC', 'iot-post-process-result')


def _should_publish_result(result: Dict[str, Any]) -> bool:
    if not result:
        return False
    if result.get('suppress_kafka'):
        return False
    if result.get('publish_kafka') is True:
        return True
    for key in ('counts', 'events', 'alerts', 'payload', 'detections'):
        if result.get(key):
            return True
    return False


def build_post_process_request_message(
    ctx: Dict[str, Any],
    *,
    correlation_id: Optional[str] = None,
    alert_image_path: Optional[str] = None,
) -> Dict[str, Any]:
    ts = ctx.get('timestamp')
    timestamp_epoch = ts if isinstance(ts, (int, float)) else None
    if timestamp_epoch is not None:
        event_time = datetime.fromtimestamp(timestamp_epoch, tz=timezone.utc).isoformat()
    else:
        event_time = datetime.now(timezone.utc).isoformat()

    return {
        'taskId': ctx.get('task_id'),
        'taskName': ctx.get('task_name'),
        'taskCode': ctx.get('task_code'),
        'taskType': ctx.get('task_type'),
        'deviceId': ctx.get('device_id'),
        'deviceName': ctx.get('device_name'),
        'frameNumber': ctx.get('frame_number'),
        'timestamp': event_time,
        'timestampEpoch': timestamp_epoch,
        'detections': ctx.get('detections') or [],
        'trackedDetections': ctx.get('tracked_detections') or [],
        'trackingEnabled': bool(ctx.get('tracking_enabled')),
        'regions': ctx.get('regions') or [],
        'modelIds': ctx.get('model_ids') or [],
        'alertImagePath': alert_image_path or ctx.get('alert_image_path'),
        'correlationId': correlation_id or ctx.get('correlation_id') or str(uuid.uuid4()),
    }


def build_post_process_result_message(
    request: Dict[str, Any],
    result: Dict[str, Any],
    *,
    ctx: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    message = dict(request)
    message.update({
        'counts': result.get('counts'),
        'events': result.get('events'),
        'alerts': result.get('alerts'),
        'payload': result,
        'processedAt': datetime.now(timezone.utc).isoformat(),
    })
    if result.get('detections') is not None:
        message['detections'] = result.get('detections')
    if result.get('suppress_default_alert') is not None:
        message['suppressDefaultAlert'] = bool(result.get('suppress_default_alert'))
    if ctx and ctx.get('alert_image_path'):
        message['alertImagePath'] = ctx.get('alert_image_path')
    return message


def _send_kafka(topic: str, message: Dict[str, Any]) -> bool:
    producer = get_kafka_producer()
    if producer is None:
        logger.warning(
            'Kafka 生产者不可用: topic=%s taskId=%s deviceId=%s',
            topic,
            message.get('taskId'),
            message.get('deviceId'),
        )
        return False
    key = message.get('deviceId') or str(message.get('taskId') or 'post-process')
    try:
        future = producer.send(topic, key=key, value=message)
        future.get(timeout=10)
        return True
    except Exception as exc:
        logger.error('Kafka 投递失败 topic=%s: %s', topic, exc, exc_info=True)
        return False


def publish_post_process_request(
    ctx: Dict[str, Any],
    *,
    alert_image_path: Optional[str] = None,
) -> bool:
    message = build_post_process_request_message(ctx, alert_image_path=alert_image_path)
    return _send_kafka(_request_topic(), message)


def publish_post_process_request_async(
    ctx: Dict[str, Any],
    *,
    alert_image_path: Optional[str] = None,
) -> None:
    thread = threading.Thread(
        target=lambda: publish_post_process_request(ctx, alert_image_path=alert_image_path),
        daemon=True,
    )
    thread.start()


def publish_post_process_result_message(
    request: Dict[str, Any],
    result: Dict[str, Any],
    *,
    ctx: Optional[Dict[str, Any]] = None,
) -> bool:
    if not _should_publish_result(result):
        return False
    message = build_post_process_result_message(request, result, ctx=ctx)
    return _send_kafka(_result_topic(), message)
