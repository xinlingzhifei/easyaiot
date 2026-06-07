#!/bin/bash
# ============================================
# yFeiEye ARM Python 离线 wheel（按模块隔离）
# 目录: .build-cache/arm/{ai,video}/pip-wheels
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() { command -v "$1" >/dev/null 2>&1; }

image_to_tar_name() {
    echo "$1" | sed 's#[/:]#_#g'
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YFEIEYE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=init-build-cache-dirs.sh
source "${SCRIPT_DIR}/init-build-cache-dirs.sh"

AI_DIR="${YFEIEYE_ROOT}/AI"
VIDEO_DIR="${YFEIEYE_ROOT}/VIDEO"

ARM_BASE_IMAGE="${ARM_BASE_IMAGE:-pytorch/manylinuxaarch64-builder:cuda12.9}"
DOCKER_IMAGES_DIR="$(arm_docker_images_dir "$YFEIEYE_ROOT")"

# 参数: AI | VIDEO（模块名，映射到 ai / video 缓存目录）
MODULE_ARG="${1:-AI}"
case "${MODULE_ARG^^}" in
    AI) CACHE_MODULE="ai"; REQ_SOURCE="${AI_DIR}/requirements.txt" ;;
    VIDEO) CACHE_MODULE="video"; REQ_SOURCE="${VIDEO_DIR}/requirements.txt" ;;
    *)
        print_error "未知模块: $MODULE_ARG（支持 AI、VIDEO）"
        exit 1
        ;;
esac

PIP_WHEELS_DIR="$(arm_pip_wheels_build_context_dir_for "$YFEIEYE_ROOT" "$CACHE_MODULE")"
ARM_REQUIREMENTS_FILE="$(yfeieye_build_cache_base "$YFEIEYE_ROOT")/arm/${CACHE_MODULE}/requirements.arm.txt"

init_yfeieye_build_cache_dirs "$YFEIEYE_ROOT"

if ! check_command docker; then
    print_error "未检测到 docker，请先安装 Docker"
    exit 1
fi

download_docker_image() {
    local image="$1"
    local tar_file="${DOCKER_IMAGES_DIR}/$(image_to_tar_name "$image").tar"

    print_info "拉取镜像: $image"
    docker pull "$image"
    print_info "保存镜像到: $tar_file"
    docker save -o "$tar_file" "$image"
    print_success "镜像已保存: $image"
}

if [ "${CACHE_DOCKER_IMAGE:-0}" = "1" ]; then
    print_info "下载并保存 Docker 基础镜像..."
    download_docker_image "$ARM_BASE_IMAGE"
else
    print_info "跳过 Docker 镜像缓存（启用: CACHE_DOCKER_IMAGE=1 $0）"
fi

mkdir -p "$(dirname "$ARM_REQUIREMENTS_FILE")"
sed 's/onnxruntime-gpu>=/onnxruntime>=/g' "$REQ_SOURCE" > "$ARM_REQUIREMENTS_FILE"

if [ "${CLEAR_PIP_WHEELS:-0}" = "1" ]; then
    print_info "[${CACHE_MODULE}] 清理旧 ARM pip wheel..."
    find "$PIP_WHEELS_DIR" -maxdepth 1 -type f -delete 2>/dev/null || true
fi

download_pip_packages() {
    print_info "[${CACHE_MODULE}] ARM pip wheel → ${PIP_WHEELS_DIR}"
    set +e
    docker run --rm \
        -v "${ARM_REQUIREMENTS_FILE}:/tmp/requirements.arm.txt:ro" \
        -v "${PIP_WHEELS_DIR}:/wheels" \
        "$ARM_BASE_IMAGE" \
        /bin/bash -lc '
set -e
if [ -x /opt/python/cp311-cp311/bin/pip3.11 ]; then
    PIP_BIN=/opt/python/cp311-cp311/bin/pip3.11
elif [ -x /opt/python/cp310-cp310/bin/pip3.10 ]; then
    PIP_BIN=/opt/python/cp310-cp310/bin/pip3.10
elif command -v pip3 >/dev/null 2>&1; then
    PIP_BIN=$(command -v pip3)
else
    echo "未找到可用 pip3"
    exit 1
fi
"$PIP_BIN" --version
"$PIP_BIN" download -r /tmp/requirements.arm.txt -d /wheels --timeout 120 --retries 3 -i https://pypi.tuna.tsinghua.edu.cn/simple
'
    local docker_download_status=$?
    set -e

    if [ $docker_download_status -eq 0 ]; then
        print_success "[${CACHE_MODULE}] pip wheel 下载完成（与目标容器 ABI 一致）"
        return 0
    fi

    if [ "${ALLOW_HOST_PIP_FALLBACK:-0}" != "1" ]; then
        print_error "[${CACHE_MODULE}] 容器内下载失败（默认禁用本机回退，避免 ABI 不匹配）"
        print_info "如确需回退: ALLOW_HOST_PIP_FALLBACK=1 $0 $MODULE_ARG"
        return 1
    fi

    print_warning "[${CACHE_MODULE}] 容器内下载失败，使用本机 python3 回退..."
    python3 -m pip download -r "$ARM_REQUIREMENTS_FILE" -d "$PIP_WHEELS_DIR" --timeout 120 --retries 3
    print_warning "已使用本机环境回退下载，可能与目标容器 ABI 不一致"
    return 0
}

download_pip_packages

du -sh "$(yfeieye_build_cache_base "$YFEIEYE_ROOT")/arm" 2>/dev/null || true
print_success "ARM 预下载完成: ${PIP_WHEELS_DIR}"
