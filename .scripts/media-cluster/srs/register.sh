#!/usr/bin/env bash
# SRS/ZLM 节点向 MEDIA Scheduler 注册并发送心跳
set -euo pipefail

MEDIA_SCHEDULER_URL="${MEDIA_SCHEDULER_URL:-http://127.0.0.1:8090}"
MEDIA_NODE_ID="${MEDIA_NODE_ID:?MEDIA_NODE_ID required}"
MEDIA_NODE_TYPE="${MEDIA_NODE_TYPE:-srs_live}"
MEDIA_NODE_HOST="${MEDIA_NODE_HOST:-$(hostname -I | awk '{print $1}')}"
RTMP_PORT="${RTMP_PORT:-1935}"
HTTP_PORT="${HTTP_PORT:-8080}"
API_PORT="${API_PORT:-1985}"
WEBRTC_PORT="${WEBRTC_PORT:-8000}"

payload=$(cat <<EOF
{
  "id": "${MEDIA_NODE_ID}",
  "type": "${MEDIA_NODE_TYPE}",
  "host": "${MEDIA_NODE_HOST}",
  "rtmp_port": ${RTMP_PORT},
  "http_port": ${HTTP_PORT},
  "api_port": ${API_PORT},
  "webrtc_port": ${WEBRTC_PORT},
  "weight": 100
}
EOF
)

curl -sf -X POST "${MEDIA_SCHEDULER_URL}/api/v1/nodes/register" \
  -H 'Content-Type: application/json' \
  -d "${payload}"

# 可选：采集 SRS 流数作为负载
active_streams=0
if curl -sf "http://127.0.0.1:${API_PORT}/api/v1/streams/" >/dev/null 2>&1; then
  active_streams=$(curl -s "http://127.0.0.1:${API_PORT}/api/v1/streams/" | grep -o '"streams":\[' | wc -l || echo 0)
fi

curl -sf -X POST "${MEDIA_SCHEDULER_URL}/api/v1/nodes/heartbeat" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"${MEDIA_NODE_ID}\",\"load\":{\"active_streams\":${active_streams}}}"

echo "Registered ${MEDIA_NODE_ID} @ ${MEDIA_NODE_HOST}"
