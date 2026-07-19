#!/usr/bin/env bash
# 后台启动虚拟串口对 + Modbus RTU 从站
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
RUNTIME="$ROOT/.runtime"
mkdir -p "$RUNTIME"

UNIT="${UNIT:-1}"
LINK="${LINK:-/tmp/easyaiot-modbus-rtu-u}"
DEV_LINK="${DEV_LINK:-}"
PID_FILE="$RUNTIME/slave.pid"
LOG_FILE="$RUNTIME/slave.log"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${OLD_PID}" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "already running: pid=$OLD_PID"
    echo "master link: $LINK"
    [[ -f "$RUNTIME/ports.json" ]] && cat "$RUNTIME/ports.json"
    exit 0
  fi
fi

ARGS=(--unit "$UNIT" --link "$LINK")
if [[ -n "$DEV_LINK" ]]; then
  ARGS+=(--dev-link "$DEV_LINK")
fi

nohup python3 "$ROOT/00_virtual_rtu_slave.py" "${ARGS[@]}" >"$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

# 等待 runtime 文件写出
for _ in $(seq 1 50); do
  if [[ -f "$RUNTIME/ports.json" ]] && kill -0 "$NEW_PID" 2>/dev/null; then
    break
  fi
  sleep 0.1
done

if ! kill -0 "$NEW_PID" 2>/dev/null; then
  echo "start failed, see $LOG_FILE" >&2
  tail -n 40 "$LOG_FILE" >&2 || true
  exit 1
fi

echo "started pid=$NEW_PID"
echo "log: $LOG_FILE"
if [[ -f "$RUNTIME/ports.env" ]]; then
  # shellcheck disable=SC1091
  source "$RUNTIME/ports.env"
  echo "Sink/demo serialPort = ${EASYAIOT_MODBUS_RTU_MASTER}"
fi
echo
echo "下一步："
echo "  1) 设备 protocolConfig.serialPort 改为: $LINK"
echo "     并设置 rs485Mode=false"
echo "  2) 现场侧验证:"
echo "     python3 $ROOT/../modbus-rtu-demo/01_uplink_read.py --port $LINK --baudrate 9600 --unit $UNIT --count 3"
echo "  3) 查看运行信息: cat $RUNTIME/ports.json"
