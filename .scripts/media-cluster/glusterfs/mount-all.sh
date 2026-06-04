#!/usr/bin/env bash
# 客户端挂载 GlusterFS 卷
set -euo pipefail

GLUSTER_HOST="${GLUSTER_HOST:-storage-gv}"
MOUNT_ROOT="${MOUNT_ROOT:-/mnt/easyaiot-media}"

mkdir -p "${MOUNT_ROOT}/playbacks" "${MOUNT_ROOT}/snaps" "${MOUNT_ROOT}/logs"

mountpoint -q "${MOUNT_ROOT}/playbacks" || \
  mount -t glusterfs "${GLUSTER_HOST}:/gv-playbacks" "${MOUNT_ROOT}/playbacks"

mountpoint -q "${MOUNT_ROOT}/snaps" || \
  mount -t glusterfs "${GLUSTER_HOST}:/gv-snaps" "${MOUNT_ROOT}/snaps"

mkdir -p "${MOUNT_ROOT}/playbacks/live" "${MOUNT_ROOT}/playbacks/ai" "${MOUNT_ROOT}/playbacks/gb28181"

df -h "${MOUNT_ROOT}/playbacks" "${MOUNT_ROOT}/snaps"
echo "GlusterFS mounted under ${MOUNT_ROOT}"
