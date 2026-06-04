#!/usr/bin/env bash
set -euo pipefail

MEDIA_SCHEDULER_URL="${MEDIA_SCHEDULER_URL:-http://127.0.0.1:8090}"
MEDIA_NODE_ID="${MEDIA_NODE_ID:?MEDIA_NODE_ID required}"
MEDIA_NODE_HOST="${MEDIA_NODE_HOST:-$(hostname -I | awk '{print $1}')}"
HTTP_PORT="${HTTP_PORT:-6080}"
ZLM_RTP_PORT_MIN="${ZLM_RTP_PORT_MIN:-30000}"
ZLM_RTP_PORT_MAX="${ZLM_RTP_PORT_MAX:-30500}"

payload=$(cat <<EOF
{
  "id": "${MEDIA_NODE_ID}",
  "type": "zlm",
  "host": "${MEDIA_NODE_HOST}",
  "http_port": ${HTTP_PORT},
  "rtmp_port": 10935,
  "rtp_port_min": ${ZLM_RTP_PORT_MIN},
  "rtp_port_max": ${ZLM_RTP_PORT_MAX},
  "weight": 100
}
EOF
)

curl -sf -X POST "${MEDIA_SCHEDULER_URL}/api/v1/nodes/register" \
  -H 'Content-Type: application/json' \
  -d "${payload}"

curl -sf -X POST "${MEDIA_SCHEDULER_URL}/api/v1/nodes/heartbeat" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"${MEDIA_NODE_ID}\",\"load\":{\"active_streams\":0}}"

echo "Registered ZLM ${MEDIA_NODE_ID}"
