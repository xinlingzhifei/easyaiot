#!/usr/bin/env bash
# AI 生产环境启动：强制使用 .env.prod，清除 shell 中残留的旧中间件地址
set -euo pipefail
cd "$(dirname "$0")"

unset DATABASE_URL NACOS_SERVER KAFKA_BOOTSTRAP_SERVERS MINIO_ENDPOINT 2>/dev/null || true

PYTHON="${PYTHON:-python}"
if command -v conda >/dev/null 2>&1; then
  PYTHON="conda run -n AI --no-capture-output python"
fi

exec $PYTHON run.py --env=prod "$@"
