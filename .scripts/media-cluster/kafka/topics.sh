#!/usr/bin/env bash
# 创建流媒体相关 Kafka Topic
set -euo pipefail

BOOTSTRAP="${KAFKA_BOOTSTRAP:-localhost:9092}"

kafka-topics.sh --bootstrap-server "${BOOTSTRAP}" --create --if-not-exists \
  --topic media.dvr.completed --partitions 32 --replication-factor 3

kafka-topics.sh --bootstrap-server "${BOOTSTRAP}" --create --if-not-exists \
  --topic media.snap.completed --partitions 16 --replication-factor 3

kafka-topics.sh --bootstrap-server "${BOOTSTRAP}" --create --if-not-exists \
  --topic media.dvr.dlq --partitions 4 --replication-factor 3

kafka-topics.sh --bootstrap-server "${BOOTSTRAP}" --list | grep media
