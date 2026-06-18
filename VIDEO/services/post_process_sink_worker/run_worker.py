#!/usr/bin/env python3
"""
AI 后处理 Sink Worker：消费 iot-post-process-result，异步入库并派发告警。
全局集群部署，可配置副本数水平扩展落库吞吐。
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time

VIDEO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if VIDEO_ROOT not in sys.path:
    sys.path.insert(0, VIDEO_ROOT)

from app.utils.video_env import load_video_env

load_video_env(override=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('post-process-sink')

RESULT_TOPIC = os.getenv('KAFKA_POST_PROCESS_RESULT_TOPIC', 'iot-post-process-result')
GROUP = os.getenv('KAFKA_POST_PROCESS_SINK_GROUP', 'video-post-process-sink')
BOOTSTRAP = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
SINK_REPLICA = os.getenv('POST_PROCESS_SINK_REPLICA', '0')
if 'Kafka' in BOOTSTRAP or 'kafka-server' in BOOTSTRAP:
    BOOTSTRAP = 'localhost:9092'


def _create_app():
    from run import create_app
    return create_app()


def run():
    from kafka import KafkaConsumer
    from app.services.post_process_consumer_service import process_post_process_message
    from app.services.post_process_alert_service import dispatch_post_process_alerts

    app = _create_app()
    consumer = KafkaConsumer(
        RESULT_TOPIC,
        bootstrap_servers=BOOTSTRAP.split(','),
        group_id=GROUP,
        client_id=f'post-process-sink-{SINK_REPLICA}',
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        key_deserializer=lambda k: k.decode('utf-8') if k else None,
        auto_offset_reset='latest',
        enable_auto_commit=False,
        max_poll_records=20,
        session_timeout_ms=60000,
        heartbeat_interval_ms=10000,
    )
    logger.info('后处理 Sink 启动 replica=%s topic=%s group=%s', SINK_REPLICA, RESULT_TOPIC, GROUP)

    with app.app_context():
        while True:
            try:
                records = consumer.poll(timeout_ms=1000, max_records=20)
                if not records:
                    continue
                for _tp, messages in records.items():
                    for msg in messages:
                        message = msg.value or {}
                        try:
                            process_post_process_message(message)
                            dispatch_post_process_alerts(message)
                            consumer.commit()
                        except Exception as exc:
                            logger.error('Sink 处理失败: %s', exc, exc_info=True)
                            from models import db
                            db.session.rollback()
            except Exception as exc:
                logger.error('Sink 轮询异常: %s', exc, exc_info=True)
                time.sleep(5)


if __name__ == '__main__':
    run()
