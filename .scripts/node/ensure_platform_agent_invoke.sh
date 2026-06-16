#!/usr/bin/env bash
# 供 install_linux.sh / install_business_linux.sh 在栈启动后同步控制面 Agent 凭据。

ensure_platform_agent_if_needed() {
    local project_root="${EASYAIOT_PROJECT_ROOT:-${EASYAIOT_ROOT:-}}"
    if [[ -z "$project_root" ]]; then
        project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    fi
    local script="${project_root}/.scripts/node/ensure_platform_agent.sh"
    if [[ ! -f "$script" ]]; then
        return 0
    fi

    if [[ "${EASYAIOT_SKIP_PLATFORM_AGENT_SYNC:-}" == "1" ]]; then
        return 0
    fi

    local has_business_stack=false
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -qE 'iot-gateway|iot-node'; then
        has_business_stack=true
    fi
    if [[ "$has_business_stack" != "true" && "${EASYAIOT_FORCE_PLATFORM_AGENT_SYNC:-}" != "1" ]]; then
        return 0
    fi

    local info_fn="${ENSURE_PLATFORM_AGENT_INFO:-echo}"
    local ok_fn="${ENSURE_PLATFORM_AGENT_OK:-echo}"
    local warn_fn="${ENSURE_PLATFORM_AGENT_WARN:-echo}"

    "$info_fn" "同步宿主机控制面 Node Agent 凭据..."
    export AGENT_BOOTSTRAP_WAIT_SECONDS="${AGENT_BOOTSTRAP_WAIT_SECONDS:-180}"
    export AGENT_BOOTSTRAP_RETRY_INTERVAL="${AGENT_BOOTSTRAP_RETRY_INTERVAL:-3}"
    if bash "$script"; then
        "$ok_fn" "控制面 Node Agent 已就绪"
        return 0
    fi
    "$warn_fn" "控制面 Node Agent 未自动同步，请手动执行: bash $script"
    return 1
}
