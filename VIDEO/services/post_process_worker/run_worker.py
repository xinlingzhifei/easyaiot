#!/usr/bin/env python3
"""
AI 后处理 Worker：消费 iot-post-process-request，执行用户脚本，投递 iot-post-process-result。
由 iot-node 按任务副本数部署到集群计算节点，同任务多副本共享 consumer group 水平扩展。
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
_repo_root = os.path.abspath(os.path.join(VIDEO_ROOT, '..'))
_lib_root = os.path.join(_repo_root, '.scripts', 'lib')
for _p in (_lib_root,):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from app.utils.video_env import load_video_env

load_video_env(override=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('post-process-worker')

TASK_ID = os.getenv('POST_PROCESS_TASK_ID', '')
REPLICA = os.getenv('POST_PROCESS_REPLICA', '0')
REQUEST_TOPIC = os.getenv('KAFKA_POST_PROCESS_REQUEST_TOPIC', 'iot-post-process-request')
RESULT_TOPIC = os.getenv('KAFKA_POST_PROCESS_RESULT_TOPIC', 'iot-post-process-result')
GROUP = os.getenv(
    'KAFKA_POST_PROCESS_CONSUMER_GROUP',
    f'post-process-task-{TASK_ID}' if TASK_ID else 'post-process-worker',
)
BOOTSTRAP = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
if 'Kafka' in BOOTSTRAP or 'kafka-server' in BOOTSTRAP:
    BOOTSTRAP = 'localhost:9092'


def _create_app():
    from run import create_app
    return create_app()


def _message_to_ctx(message: dict) -> dict:
    return {
        'task_id': message.get('taskId') or message.get('task_id'),
        'task_name': message.get('taskName') or message.get('task_name'),
        'task_code': message.get('taskCode') or message.get('task_code'),
        'task_type': message.get('taskType') or message.get('task_type'),
        'device_id': message.get('deviceId') or message.get('device_id'),
        'device_name': message.get('deviceName') or message.get('device_name'),
        'frame_number': message.get('frameNumber') or message.get('frame_number'),
        'timestamp': message.get('timestampEpoch') or message.get('timestamp'),
        'detections': message.get('detections') or [],
        'tracked_detections': message.get('trackedDetections') or message.get('tracked_detections') or [],
        'tracking_enabled': bool(message.get('trackingEnabled') or message.get('tracking_enabled')),
        'regions': message.get('regions') or [],
        'state': message.get('state') or {},
        'model_ids': message.get('modelIds') or message.get('model_ids') or [],
        'alert_image_path': message.get('alertImagePath') or message.get('alert_image_path'),
        'correlation_id': message.get('correlationId') or message.get('correlation_id'),
    }


def _load_task_config(task_id: int):
    from models import AlgorithmTask
    return AlgorithmTask.query.get(task_id)


def run():
    from kafka import KafkaConsumer
    from app.services.post_process_kafka_service import publish_post_process_result_message
    from app.utils.post_process_runner import run_post_process

    if not TASK_ID:
        logger.error('缺少环境变量 POST_PROCESS_TASK_ID')
        sys.exit(1)

    task_id = int(TASK_ID)
    app = _create_app()

    consumer = KafkaConsumer(
        REQUEST_TOPIC,
        bootstrap_servers=BOOTSTRAP.split(','),
        group_id=GROUP,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        key_deserializer=lambda k: k.decode('utf-8') if k else None,
        auto_offset_reset='latest',
        enable_auto_commit=False,
        max_poll_records=10,
        session_timeout_ms=60000,
        heartbeat_interval_ms=10000,
    )
    logger.info(
        '后处理 Worker 启动 task=%s replica=%s topic=%s group=%s',
        task_id, REPLICA, REQUEST_TOPIC, GROUP,
    )

    with app.app_context():
        task_config = _load_task_config(task_id)
        if not task_config:
            logger.error('算法任务不存在: %s', task_id)
            sys.exit(1)

        while True:
            try:
                records = consumer.poll(timeout_ms=1000, max_records=10)
                if not records:
                    continue
                for _tp, messages in records.items():
                    for msg in messages:
                        request = msg.value or {}
                        req_task_id = request.get('taskId') or request.get('task_id')
                        if req_task_id is not None and int(req_task_id) != task_id:
                            consumer.commit()
                            continue
                        ctx = _message_to_ctx(request)
                        try:
                            result = run_post_process(task_config, ctx)
                            if result is not None:
                                publish_post_process_result_message(request, result, ctx=ctx)
                            consumer.commit()
                        except Exception as exc:
                            logger.error(
                                '后处理失败 task=%s device=%s frame=%s: %s',
                                task_id,
                                ctx.get('device_id'),
                                ctx.get('frame_number'),
                                exc,
                                exc_info=True,
                            )
            except Exception as exc:
                logger.error('Consumer 轮询异常: %s', exc, exc_info=True)
                time.sleep(5)


if __name__ == '__main__':
    run()
