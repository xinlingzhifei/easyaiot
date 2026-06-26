#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIDDLEWARE_COMPOSE="${ROOT_DIR}/.scripts/docker/docker-compose.yml"
DEVICE_COMPOSE="${ROOT_DIR}/DEVICE/docker-compose.yml"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

require_contains() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "${file} must contain: ${needle}"
}

reject_contains() {
  local file="$1"
  local needle="$2"
  if grep -Fq "$needle" "$file"; then
    fail "${file} must not contain release-relative runtime mount: ${needle}"
  fi
}

require_contains "${MIDDLEWARE_COMPOSE}" '${YFEIEYE_DOCKER_DATA_ROOT:-/opt/yfeieye-source/shared/docker}/redis_data/data:/data:rw'
require_contains "${MIDDLEWARE_COMPOSE}" '${YFEIEYE_DOCKER_DATA_ROOT:-/opt/yfeieye-source/shared/docker}/redis_data/logs:/logs:rw'
require_contains "${MIDDLEWARE_COMPOSE}" '${YFEIEYE_DOCKER_DATA_ROOT:-/opt/yfeieye-source/shared/docker}/mq_data/data:/var/lib/kafka/data:rw'

reject_contains "${MIDDLEWARE_COMPOSE}" './redis_data/data:/data:rw'
reject_contains "${MIDDLEWARE_COMPOSE}" './redis_data/logs:/logs:rw'
reject_contains "${MIDDLEWARE_COMPOSE}" './mq_data/data:/var/lib/kafka/data:rw'

require_contains "${DEVICE_COMPOSE}" 'http://localhost:48093/actuator/health'
reject_contains "${DEVICE_COMPOSE}" 'http://localhost:48093"]'

echo "release-safe runtime config checks passed"
