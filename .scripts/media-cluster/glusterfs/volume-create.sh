#!/usr/bin/env bash
# GlusterFS 卷创建（在 gluster 管理节点执行）
# 用法: BRICKS="brick01:/data/brick/playbacks brick02:... brick03:..." ./volume-create.sh
set -euo pipefail

BRICKS="${BRICKS:?Set BRICKS='host1:/path host2:/path host3:/path'}"

echo "Creating gv-playbacks (replica 3)..."
gluster volume create gv-playbacks replica 3 ${BRICKS} force
gluster volume start gv-playbacks
gluster volume set gv-playbacks performance.cache-size 256MB
gluster volume set gv-playbacks network.ping-timeout 10
gluster volume set gv-playbacks auth.allow '*'

echo "Creating gv-snaps (replica 3)..."
SNAP_BRICKS="${SNAP_BRICKS:-${BRICKS/playbacks/snaps}}"
gluster volume create gv-snaps replica 3 ${SNAP_BRICKS} force
gluster volume start gv-snaps
gluster volume set gv-snaps performance.cache-size 128MB

gluster volume list
echo "Done. Clients: mount -t glusterfs storage-gv:/gv-playbacks /mnt/easyaiot-media/playbacks"
