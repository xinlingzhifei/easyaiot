#!/bin/bash
# yFeiEye Docker Compose GPU 配置辅助（AI / VIDEO 共用）

GPU_AVAILABLE=false
GPU_HARDWARE_DETECTED=false

type print_info >/dev/null 2>&1 || print_info() { echo "[INFO] $1"; }
type print_warning >/dev/null 2>&1 || print_warning() { echo "[WARN] $1"; }
type print_success >/dev/null 2>&1 || print_success() { echo "[OK] $1"; }

check_gpu() {
    if ! command -v nvidia-smi >/dev/null 2>&1; then
        print_warning "未检测到 NVIDIA GPU，将使用 CPU 模式运行"
        GPU_HARDWARE_DETECTED=false
        GPU_AVAILABLE=false
        return
    fi

    GPU_HARDWARE_DETECTED=true
    print_info "检测到 NVIDIA GPU:"
    nvidia-smi --query-gpu=name,driver_version --format=csv,noheader,nounits 2>/dev/null | while IFS=, read -r name version; do
        echo "  - GPU: $name (驱动版本: $version)"
    done

    if ! nvidia-smi >/dev/null 2>&1; then
        print_warning "nvidia-smi 不可用，将使用 CPU 模式运行"
        GPU_AVAILABLE=false
        return
    fi

    if ! docker info --format '{{.Runtimes}}' 2>/dev/null | grep -q "nvidia"; then
        print_warning "Docker 未配置 NVIDIA runtime，将使用 CPU 模式运行"
        GPU_AVAILABLE=false
        return
    fi

    if docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi >/dev/null 2>&1; then
        print_success "NVIDIA Container Toolkit 已正确配置"
        GPU_AVAILABLE=true
        return
    fi

    print_warning "GPU 容器测试失败（NVML/CDI 不可用），将使用 CPU 模式运行"
    GPU_AVAILABLE=false
}

configure_compose_gpu() {
    local compose_file="${1:-docker-compose.yaml}"
    local env_file="${2:-.env.docker}"

    if [ ! -f "$compose_file" ]; then
        print_warning "未找到 compose 文件: $compose_file"
        return
    fi

    if [ "$GPU_AVAILABLE" = true ]; then
        print_info "启用 GPU 支持..."
        if grep -qE '^[[:space:]]*# runtime: nvidia' "$compose_file"; then
            sed -i 's/^\([[:space:]]*\)# runtime: nvidia/\1runtime: nvidia/' "$compose_file"
        fi
        if grep -qE '^[[:space:]]*# deploy:' "$compose_file"; then
            sed -i '/^[[:space:]]*# deploy:/,/capabilities:.*gpu/ s/^\([[:space:]]*\)# /\1/' "$compose_file"
        fi
        if [ -f "$env_file" ] && grep -q '^USE_GPU=' "$env_file"; then
            sed -i 's/^USE_GPU=.*/USE_GPU=True/' "$env_file"
        fi
        print_success "GPU 配置已启用"
    else
        print_info "使用 CPU 模式（GPU 配置已禁用）"
        if grep -qE '^[[:space:]]*runtime: nvidia' "$compose_file"; then
            sed -i 's/^\([[:space:]]*\)runtime: nvidia/\1# runtime: nvidia/' "$compose_file"
        fi
        if grep -qE '^[[:space:]]*deploy:' "$compose_file" && ! grep -qE '^[[:space:]]*# deploy:' "$compose_file"; then
            sed -i '/^[[:space:]]*deploy:/,/capabilities:.*gpu/ s/^\([[:space:]]*\)/\1# /' "$compose_file"
        fi
        if [ -f "$env_file" ] && grep -q '^USE_GPU=' "$env_file"; then
            sed -i 's/^USE_GPU=.*/USE_GPU=False/' "$env_file"
        fi
    fi
}
