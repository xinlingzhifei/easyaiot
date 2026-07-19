#!/usr/bin/env bash
# 停止虚拟串口对 + Modbus RTU 从站
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
RUNTIME="$ROOT/.runtime"
PID_FILE="$RUNTIME/slave.pid"
LINK="${LINK:-/tmp/easyaiot-modbus-rtu-u}"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${PID}" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    for _ in $(seq 1 30); do
      kill -0 "$PID" 2>/dev/null || break
      sleep 0.1
    done
    if kill -0 "$PID" 2>/dev/null; then
      kill -9 "$PID" 2>/dev/null || true
    fi
    echo "stopped pid=$PID"
  else
    echo "not running (stale pid file)"
  fi
  rm -f "$PID_FILE"
else
  # 兜底：按脚本名杀
  pkill -f "$ROOT/00_virtual_rtu_slave.py" 2>/dev/null || true
  echo "no pid file; attempted pkill"
fi

rm -f "$LINK" 2>/dev/null || true
rm -f "$RUNTIME/ports.env" "$RUNTIME/ports.json" 2>/dev/null || true
echo "cleaned runtime / link"
