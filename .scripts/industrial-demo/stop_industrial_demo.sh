#!/usr/bin/env bash
# 停止 start_industrial_demo.sh 拉起的工业协议演示进程
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUN_DIR="${SCRIPT_DIR}/run"
MODBUS_RTU_VIRT_DIR="${SCRIPTS_ROOT}/modbus-rtu-virtual-serial"

stop_pid_file() {
    local role="$1"
    local pid_file="${RUN_DIR}/${role}.pid"
    if [ ! -f "$pid_file" ]; then
        echo "[industrial-demo] ${role}: 无 pid 文件"
        return 0
    fi
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        for _ in 1 2 3 4 5; do
            kill -0 "$pid" 2>/dev/null || break
            sleep 1
        done
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
        echo "[industrial-demo] ${role}: 已停止 pid=${pid}"
    else
        echo "[industrial-demo] ${role}: 进程不存在"
    fi
    rm -f "$pid_file"
}

stop_pid_file modbus-tcp
stop_pid_file opc-ua

# 兜底：按脚本路径杀残留
pkill -f "${SCRIPTS_ROOT}/modbus-tcp-demo/00_slave_simulator.py" 2>/dev/null || true
pkill -f "${SCRIPTS_ROOT}/opc-ua-demo/00_server_simulator.py" 2>/dev/null || true

if [ -f "${MODBUS_RTU_VIRT_DIR}/stop.sh" ]; then
    chmod +x "${MODBUS_RTU_VIRT_DIR}/stop.sh" 2>/dev/null || true
    bash "${MODBUS_RTU_VIRT_DIR}/stop.sh" || true
fi

rm -f "${RUN_DIR}/modbus-rtu-demo.ready" 2>/dev/null || true
echo "[industrial-demo] 全部已停止"
