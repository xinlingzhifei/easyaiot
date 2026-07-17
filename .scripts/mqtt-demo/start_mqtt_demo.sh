#!/usr/bin/env bash
# 并行常驻启动 01 / 02 / 03（各自独立 clientId，互不踢线）
# 用法:
#   bash start_mqtt_demo.sh
#   MQTT_DEMO_SCRIPTS=up,down bash start_mqtt_demo.sh   # 只启部分
#   EASYAIOT_ENABLE_MQTT_DEMO=0 bash start_mqtt_demo.sh # 显式跳过
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="${SCRIPT_DIR}/run"
LOG_DIR="${RUN_DIR}/logs"
mkdir -p "$RUN_DIR" "$LOG_DIR"

if [ "${EASYAIOT_ENABLE_MQTT_DEMO:-1}" = "0" ]; then
    echo "[mqtt-demo] EASYAIOT_ENABLE_MQTT_DEMO=0，跳过启动"
    exit 0
fi

# 参数：优先环境变量，其次同目录 .env，再次 env.example 默认
load_kv() {
    local file="$1"
    [ -f "$file" ] || return 0
    # shellcheck disable=SC1090
    set -a
    # 只导入 KEY=VALUE 行，忽略注释
    # shellcheck disable=SC2046
    eval "$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$file" | sed 's/\r$//')"
    set +a
}

load_kv "${SCRIPT_DIR}/env.example"
load_kv "${SCRIPT_DIR}/.env"

MQTT_HOST="${MQTT_HOST:-localhost}"
MQTT_PORT="${MQTT_PORT:-1883}"
PRODUCT="${PRODUCT:-9820630576939008}"
DEVICE="${DEVICE:-9720084293632004}"
TENANT_ID="${TENANT_ID:-1}"
PASSWORD="${PASSWORD:-32423}"
AUTH_MODE="${AUTH_MODE:-device}"
MQTT_DEMO_SCRIPTS="${MQTT_DEMO_SCRIPTS:-up,down,full}"
MQTT_DEMO_INTERVAL="${MQTT_DEMO_INTERVAL:-3}"
SUB_PRODUCT="${SUB_PRODUCT:-}"
SUB_DEVICE="${SUB_DEVICE:-demo-sub-001}"
SUB_NAME="${SUB_NAME:-演示子设备-001}"
GATEWAY_PRODUCT="${GATEWAY_PRODUCT:-$PRODUCT}"
GATEWAY_DEVICE="${GATEWAY_DEVICE:-$DEVICE}"

resolve_python() {
    if [ -n "${MQTT_DEMO_PYTHON:-}" ] && command -v "$MQTT_DEMO_PYTHON" >/dev/null 2>&1; then
        echo "$MQTT_DEMO_PYTHON"
        return
    fi
    for cand in python3 python; do
        if command -v "$cand" >/dev/null 2>&1; then
            if "$cand" -c "import paho.mqtt.client" 2>/dev/null; then
                echo "$cand"
                return
            fi
        fi
    done
    # 尝试安装到当前可用 python3
    if command -v python3 >/dev/null 2>&1; then
        python3 -m pip install --user -q paho-mqtt 2>/dev/null \
            || python3 -m pip install -q paho-mqtt 2>/dev/null \
            || true
        if python3 -c "import paho.mqtt.client" 2>/dev/null; then
            echo "python3"
            return
        fi
    fi
    echo ""
}

wait_tcp() {
    local host="$1" port="$2" tries="${3:-60}"
    local i=0
    while [ "$i" -lt "$tries" ]; do
        if (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
            return 0
        fi
        # bash /dev/tcp 不可用时退回 python
        if python3 - <<PY >/dev/null 2>&1
import socket
s=socket.socket()
s.settimeout(1)
s.connect(("${host}", int("${port}")))
s.close()
PY
        then
            return 0
        fi
        i=$((i + 1))
        sleep 1
    done
    return 1
}

PY="$(resolve_python)"
if [ -z "$PY" ]; then
    echo "[mqtt-demo] 错误: 找不到带 paho-mqtt 的 Python，请先: pip install paho-mqtt" >&2
    exit 1
fi

echo "[mqtt-demo] 等待 EMQX ${MQTT_HOST}:${MQTT_PORT} ..."
if ! wait_tcp "$MQTT_HOST" "$MQTT_PORT" 90; then
    echo "[mqtt-demo] 错误: EMQX 未就绪，放弃启动" >&2
    exit 1
fi

COMMON_ARGS=(
    --host "$MQTT_HOST"
    --port "$MQTT_PORT"
    --product "$PRODUCT"
    --device "$DEVICE"
    --tenant-id "$TENANT_ID"
    --password "$PASSWORD"
    --auth-mode "$AUTH_MODE"
)

is_running() {
    local pid_file="$1"
    [ -f "$pid_file" ] || return 1
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

start_one() {
    local role="$1" script="$2"
    shift 2
    local pid_file="${RUN_DIR}/${role}.pid"
    local log_file="${LOG_DIR}/${role}.log"
    if is_running "$pid_file"; then
        echo "[mqtt-demo] ${role} 已在运行 pid=$(cat "$pid_file")"
        return 0
    fi
    echo "[mqtt-demo] 启动 ${role}: ${script}"
    # 无 TTY 时强制行缓冲，否则日志长时间空白
    PYTHONUNBUFFERED=1 nohup "$PY" -u "${SCRIPT_DIR}/${script}" "${COMMON_ARGS[@]}" "$@" \
        >>"$log_file" 2>&1 &
    echo $! >"$pid_file"
    sleep 0.3
    if is_running "$pid_file"; then
        echo "[mqtt-demo] ${role} 已启动 pid=$(cat "$pid_file") log=${log_file}"
    else
        echo "[mqtt-demo] ${role} 启动失败，见 ${log_file}" >&2
        return 1
    fi
}

IFS=',' read -r -a ROLES <<<"$MQTT_DEMO_SCRIPTS"
ok=0
fail=0
for role in "${ROLES[@]}"; do
    role="$(echo "$role" | tr -d '[:space:]')"
    [ -n "$role" ] || continue
    case "$role" in
        up|01|01_uplink)
            if start_one up 01_uplink_property.py \
                --interval "$MQTT_DEMO_INTERVAL" --rounds 0 --with-event --with-log; then
                ok=$((ok + 1))
            else
                fail=$((fail + 1))
            fi
            ;;
        down|02|02_downlink)
            if start_one down 02_downlink_listen.py; then
                ok=$((ok + 1))
            else
                fail=$((fail + 1))
            fi
            ;;
        full|03|03_full)
            if start_one full 03_full_loop.py \
                --interval "$MQTT_DEMO_INTERVAL" --rounds 0; then
                ok=$((ok + 1))
            else
                fail=$((fail + 1))
            fi
            ;;
        codec-up|04|04_codec)
            if start_one codec-up 04_codec_uplink.py \
                --interval "$MQTT_DEMO_INTERVAL" --rounds 0; then
                ok=$((ok + 1))
            else
                fail=$((fail + 1))
            fi
            ;;
        codec-down|05|05_codec)
            if start_one codec-down 05_codec_downlink.py; then
                ok=$((ok + 1))
            else
                fail=$((fail + 1))
            fi
            ;;
        gw-up|06|06_gateway_up)
            if [ -z "$SUB_PRODUCT" ]; then
                echo "[mqtt-demo] gw-up 需要 SUB_PRODUCT（SUBSET 产品标识）" >&2
                fail=$((fail + 1))
            elif start_one gw-up 06_gateway_uplink_subdevice.py \
                --product "$GATEWAY_PRODUCT" --device "$GATEWAY_DEVICE" \
                --sub-product "$SUB_PRODUCT" --sub-device "$SUB_DEVICE" \
                --sub-name "$SUB_NAME" \
                --interval "$MQTT_DEMO_INTERVAL" --rounds 0 --with-event; then
                ok=$((ok + 1))
            else
                fail=$((fail + 1))
            fi
            ;;
        gw-down|07|07_gateway_down)
            if [ -z "$SUB_PRODUCT" ]; then
                echo "[mqtt-demo] gw-down 需要 SUB_PRODUCT（SUBSET 产品标识）" >&2
                fail=$((fail + 1))
            elif start_one gw-down 07_gateway_downlink_subdevice.py \
                --product "$GATEWAY_PRODUCT" --device "$GATEWAY_DEVICE" \
                --sub-product "$SUB_PRODUCT" --sub-device "$SUB_DEVICE" \
                --sub-name "$SUB_NAME"; then
                ok=$((ok + 1))
            else
                fail=$((fail + 1))
            fi
            ;;
        *)
            echo "[mqtt-demo] 未知角色: ${role}（支持 up,down,full,codec-up,codec-down,gw-up,gw-down）" >&2
            fail=$((fail + 1))
            ;;
    esac
done

echo "[mqtt-demo] 完成: 成功 ${ok}，失败 ${fail}"
echo "[mqtt-demo] clientId: demo-up/down/full/codec/gw-* -${DEVICE}（可并行）"
echo "[mqtt-demo] 停止: bash ${SCRIPT_DIR}/stop_mqtt_demo.sh"
[ "$fail" -eq 0 ]
