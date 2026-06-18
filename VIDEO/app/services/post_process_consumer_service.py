"""
算法任务 AI 后处理结果 Kafka 消费者：异步写入数据库
"""
from __future__ import annotations

import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from flask import current_app
from kafka import KafkaConsumer

from models import db, AlgorithmPostProcessResult

logger = logging.getLogger(__name__)

_consumer = None
_consumer_thread = None
_consumer_running = False
_consumer_init_failed = False
_last_init_attempt_time = 0


def _get_consumer_config() -> Dict[str, Any]:
    try:
        return {
            'bootstrap_servers': current_app.config.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
            'topic': current_app.config.get('KAFKA_POST_PROCESS_RESULT_TOPIC', 'iot-post-process-result'),
            'group_id': current_app.config.get(
                'KAFKA_POST_PROCESS_CONSUMER_GROUP',
                'video-post-process-consumer',
            ),
            'init_retry_interval': current_app.config.get('KAFKA_INIT_RETRY_INTERVAL', 60),
        }
    except RuntimeError:
        import os
        return {
            'bootstrap_servers': os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
            'topic': os.getenv('KAFKA_POST_PROCESS_RESULT_TOPIC', 'iot-post-process-result'),
            'group_id': os.getenv('KAFKA_POST_PROCESS_CONSUMER_GROUP', 'video-post-process-consumer'),
            'init_retry_interval': int(os.getenv('KAFKA_INIT_RETRY_INTERVAL', '60')),
        }


def get_kafka_consumer():
    global _consumer, _consumer_init_failed, _last_init_attempt_time

    cfg = _get_consumer_config()
    bootstrap_servers = cfg['bootstrap_servers']
    if 'Kafka' in bootstrap_servers or 'kafka-server' in bootstrap_servers:
        bootstrap_servers = 'localhost:9092'

    if _consumer is not None:
        return _consumer

    current_time = time.time()
    if _consumer_init_failed and (current_time - _last_init_attempt_time) < cfg['init_retry_interval']:
        return None

    try:
        import socket
        import uuid
        instance_id = f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
        _consumer = KafkaConsumer(
            cfg['topic'],
            bootstrap_servers=bootstrap_servers.split(','),
            group_id=cfg['group_id'],
            client_id=instance_id,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            key_deserializer=lambda k: k.decode('utf-8') if k else None,
            auto_offset_reset='latest',
            session_timeout_ms=60000,
            heartbeat_interval_ms=10000,
            max_poll_records=20,
            max_poll_interval_ms=300000,
            enable_auto_commit=True,
            auto_commit_interval_ms=5000,
            consumer_timeout_ms=1000,
            request_timeout_ms=100000,
            metadata_max_age_ms=300000,
            api_version=(2, 5, 0),
        )
        logger.info(
            '后处理 Kafka 消费者初始化成功: topic=%s, group=%s, servers=%s',
            cfg['topic'],
            cfg['group_id'],
            bootstrap_servers,
        )
        _consumer_init_failed = False
    except Exception as exc:
        _consumer = None
        _consumer_init_failed = True
        _last_init_attempt_time = current_time
        logger.warning(
            '后处理 Kafka 消费者初始化失败: %s，将在 %s 秒后重试',
            exc,
            cfg['init_retry_interval'],
        )
        return None

    return _consumer


def _parse_event_time(message: Dict[str, Any]) -> Optional[datetime]:
    raw = message.get('timestamp') or message.get('eventTime')
    if not raw:
        return None
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(raw, tz=timezone.utc)
    try:
        text = str(raw).replace('Z', '+00:00')
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _json_dump(value: Any) -> Optional[str]:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def process_post_process_message(message: Dict[str, Any]) -> None:
    task_id = message.get('taskId') or message.get('task_id')
    device_id = message.get('deviceId') or message.get('device_id')
    if task_id is None or not device_id:
        logger.warning('后处理消息缺少 taskId/deviceId: %s', message)
        return

    correlation_id = message.get('correlationId') or message.get('correlation_id')
    if correlation_id:
        exists = AlgorithmPostProcessResult.query.filter_by(correlation_id=correlation_id).first()
        if exists:
            logger.debug('后处理结果已存在，跳过: correlationId=%s', correlation_id)
            return

    payload = message.get('payload')
    if payload is None:
        payload = {
            k: message.get(k)
            for k in ('counts', 'events', 'alerts', 'detections', 'suppress_default_alert')
            if message.get(k) is not None
        }

    record = AlgorithmPostProcessResult(
        task_id=int(task_id),
        task_name=message.get('taskName') or message.get('task_name'),
        task_code=message.get('taskCode') or message.get('task_code'),
        task_type=message.get('taskType') or message.get('task_type'),
        device_id=str(device_id),
        device_name=message.get('deviceName') or message.get('device_name'),
        frame_number=message.get('frameNumber') or message.get('frame_number'),
        event_time=_parse_event_time(message),
        counts=_json_dump(message.get('counts')),
        events=_json_dump(message.get('events')),
        alerts=_json_dump(message.get('alerts')),
        payload=_json_dump(payload),
        correlation_id=correlation_id,
    )
    db.session.add(record)
    db.session.commit()
    logger.info(
        '后处理结果已入库: id=%s, taskId=%s, deviceId=%s, frame=%s',
        record.id,
        record.task_id,
        record.device_id,
        record.frame_number,
    )


def consume_post_process_messages():
    global _consumer_running, _consumer, _consumer_init_failed, _last_init_attempt_time

    _consumer_running = True
    logger.info('后处理 Kafka 消息消费已启动')

    while _consumer_running:
        consumer = get_kafka_consumer()
        if consumer is None:
            time.sleep(5)
            continue

        try:
            for message in consumer:
                if not _consumer_running:
                    break
                try:
                    process_post_process_message(message.value)
                except Exception as exc:
                    logger.error('处理后处理消息失败: %s', exc, exc_info=True)
                    db.session.rollback()
        except Exception as exc:
            error_msg = str(exc)
            logger.warning('后处理 Kafka 消费异常: %s', error_msg)
            if 'Closed' in error_msg or 'Disconnected' in error_msg:
                _consumer = None
                _consumer_init_failed = False
            time.sleep(5)

    logger.info('后处理 Kafka 消息消费已停止')


def start_post_process_consumer(app):
    global _consumer_thread

    if _consumer_thread is not None and _consumer_thread.is_alive():
        logger.info('后处理 Kafka 消费者线程已在运行')
        return

    def _run():
        with app.app_context():
            consume_post_process_messages()

    _consumer_thread = threading.Thread(
        target=_run,
        daemon=True,
        name='PostProcessConsumer',
    )
    _consumer_thread.start()
    logger.info('后处理 Kafka 消费者线程已启动')


def stop_post_process_consumer():
    global _consumer_running, _consumer, _consumer_thread

    _consumer_running = False
    if _consumer:
        try:
            _consumer.close(timeout=10)
        except Exception as exc:
            logger.warning('关闭后处理 Kafka 消费者异常: %s', exc)
        finally:
            _consumer = None

    if _consumer_thread and _consumer_thread.is_alive():
        _consumer_thread.join(timeout=10)

    logger.info('后处理 Kafka 消费者已停止')
