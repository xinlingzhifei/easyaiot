#!/usr/bin/env bash
# 停止 start_mqtt_demo.sh 拉起的 01/02/03
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${SCRIPT_DIR}/run"

stop_one() {
    local role="$1"
    local pid_file="${RUN_DIR}/${role}.pid"
    if [ ! -f "$pid_file" ]; then
        echo "[mqtt-demo] ${role}: 无 pid 文件"
        return 0
    fi
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        # 等最多 5s
        for _ in 1 2 3 4 5; do
            kill -0 "$pid" 2>/dev/null || break
            sleep 1
        done
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
        echo "[mqtt-demo] ${role}: 已停止 pid=${pid}"
    else
        echo "[mqtt-demo] ${role}: 进程不存在"
    fi
    rm -f "$pid_file"
}

for role in up down full codec-up codec-down; do
    stop_one "$role"
done
echo "[mqtt-demo] 全部已停止"
