#!/bin/bash

# DEVICE模块 Docker Compose 管理脚本
# 两阶段构建：Dockerfile.base（Maven 一次）→ target/jars → 各模块运行时 Dockerfile

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YFEIEYE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=../.scripts/docker/init-build-cache-dirs.sh
source "${YFEIEYE_ROOT}/.scripts/docker/init-build-cache-dirs.sh"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# 检查docker-compose是否存在
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未找到docker或docker-compose命令${NC}"
    exit 1
fi

# 使用docker compose（新版本）或docker-compose（旧版本）
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif docker-compose version &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}错误: 未找到docker compose或docker-compose命令${NC}"
    exit 1
fi

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# compose 文件中定义的服务数量（用于启动前提示）
compose_service_count() {
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" config --services 2>/dev/null | wc -l | tr -d '[:space:]'
}

# 后台启动 compose 服务。
# TTY 下 compose 会用 \r 刷新 [+] up x/y，分母残留时易显示成 9/100（实际共 10 个服务）。
compose_up_detached() {
    local count
    count=$(compose_service_count)
    if [ -n "$count" ] && [ "$count" -gt 0 ] 2>/dev/null; then
        print_info "正在启动服务（共 ${count} 个）..."
    else
        print_info "正在启动服务..."
    fi
    COMPOSE_ANSI=never $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d --no-color "$@"
}

# 检查docker-compose.yml是否存在
check_compose_file() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "docker-compose.yml文件不存在: $COMPOSE_FILE"
        exit 1
    fi
    
    # 验证文件是否可读
    if [ ! -r "$COMPOSE_FILE" ]; then
        print_error "docker-compose.yml 文件不可读: $COMPOSE_FILE"
        exit 1
    fi
}

# 检查 Docker daemon 是否运行
check_docker_daemon() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker daemon 未运行，请先启动 Docker 服务"
        print_info "尝试启动: sudo systemctl start docker"
        exit 1
    fi
}

JARS_DIR="${SCRIPT_DIR}/target/jars"
MAVEN_CACHE_DIR="$(maven_repository_dir "$YFEIEYE_ROOT")"

# 运行时镜像：dockerfile 路径 | 镜像 tag
RUNTIME_IMAGE_SPECS=(
    "iot-gateway/Dockerfile|iot-gateway:latest"
    "iot-system/iot-system-biz/Dockerfile|iot-module-system-biz:latest"
    "iot-infra/iot-infra-biz/Dockerfile|iot-module-infra-biz:latest"
    "iot-device/iot-device-biz/Dockerfile|iot-module-device-biz:latest"
    "iot-dataset/iot-dataset-biz/Dockerfile|iot-module-dataset-biz:latest"
    "iot-tdengine/iot-tdengine-biz/Dockerfile|iot-module-tdengine-biz:latest"
    "iot-file/iot-file-biz/Dockerfile|iot-module-file-biz:latest"
    "iot-message/iot-message-biz/Dockerfile|iot-module-message-biz:latest"
    "iot-sink/iot-sink-biz/Dockerfile|iot-sink-biz:latest"
    "iot-gb28181/iot-gb28181-biz/Dockerfile|iot-gb28181-biz:latest"
)

# 与 RUNTIME_IMAGE_SPECS 中 COPY 的 Jar 一一对应
REQUIRED_RUNTIME_JARS=(
    iot-gateway.jar
    iot-system-biz.jar
    iot-infra-biz.jar
    iot-device-biz.jar
    iot-dataset-biz.jar
    iot-tdengine-biz.jar
    iot-file-biz.jar
    iot-message-biz.jar
    iot-sink-biz.jar
    iot-gb28181-biz.jar
)

check_jars_exist() {
    if [ ! -d "$JARS_DIR" ]; then
        return 1
    fi
    find "$JARS_DIR" -maxdepth 1 -name "*.jar" -type f 2>/dev/null | grep -q .
}

# 第二阶段构建前检查，避免 Docker 日志里出现误导性的「错误: xxx.jar 不存在」RUN 步骤
verify_runtime_jars() {
    local missing=()
    local jar
    for jar in "${REQUIRED_RUNTIME_JARS[@]}"; do
        if [ ! -f "${JARS_DIR}/${jar}" ]; then
            missing+=("$jar")
        fi
    done
    if [ "${#missing[@]}" -gt 0 ]; then
        print_error "缺少运行时 Jar（共 ${#missing[@]} 个）: ${missing[*]}"
        print_info "请先执行: ./install_linux.sh build-base"
        exit 1
    fi
}

# 第一阶段：Maven 只编译一次，依赖写入 .build-cache/device/m2/repository，Jar 提取到 target/jars
build_base_jars() {
    local force="${1:-0}"

    print_info "========== 第一阶段：Maven 编译（Dockerfile.base）=========="

    if [ "$force" != "1" ] && check_jars_exist; then
        local jar_count
        jar_count=$(find "$JARS_DIR" -maxdepth 1 -name "*.jar" -type f 2>/dev/null | wc -l)
        print_success "Jar 已存在于 $JARS_DIR（$jar_count 个），跳过 Maven 编译"
        echo
        return 0
    fi

    check_compose_file
    check_docker_daemon
    cd "$SCRIPT_DIR"
    init_yfeieye_build_cache_dirs "$YFEIEYE_ROOT"
    enable_docker_buildkit

    mkdir -p "$JARS_DIR"
    print_info "Maven 本地仓库: $MAVEN_CACHE_DIR"

    mkdir -p "$MAVEN_CACHE_DIR"
    print_info "构建 device-base-builder（mvn 仅执行一次）..."
    # --target builder：mvn 结束后 Dockerfile.base 已将 host-cache 拷入镜像层 /m2/repository，再 docker cp 到宿主机
    local docker_nocache=()
    if [ ! -d "${MAVEN_CACHE_DIR}/com" ]; then
        print_info "宿主机 Maven 缓存为空，本次禁用 Docker 层缓存（确保使用最新 Dockerfile.base）"
        docker_nocache=(--no-cache)
    fi
    if ! docker build \
        "${docker_nocache[@]}" \
        -f Dockerfile.base \
        --target builder \
        -t device-base-builder:latest \
        --build-context "maven-repo=${MAVEN_CACHE_DIR}" \
        .; then
        print_error "Dockerfile.base 构建失败"
        exit 1
    fi

    print_info "提取 Jar 与 Maven 缓存到宿主机 ..."
    local temp_container="device-base-builder-temp-$(date +%s)"
    if ! docker create --name "$temp_container" device-base-builder:latest >/dev/null 2>&1; then
        print_error "创建临时容器失败"
        exit 1
    fi
    if ! docker cp "${temp_container}:/target/jars/." "$JARS_DIR/"; then
        docker rm -f "$temp_container" >/dev/null 2>&1 || true
        print_error "复制 Jar 失败"
        exit 1
    fi
    # 优先 /m2/repository；旧镜像误配置时依赖在 /root/.m2/repository
    if docker cp "${temp_container}:/m2/repository/." "$MAVEN_CACHE_DIR/" 2>/dev/null; then
        :
    elif docker cp "${temp_container}:/root/.m2/repository/." "$MAVEN_CACHE_DIR/" 2>/dev/null; then
        print_warning "已从 /root/.m2/repository 回退导出 Maven 缓存（请用最新 Dockerfile.base 重建）"
    else
        docker rm -f "$temp_container" >/dev/null 2>&1 || true
        print_error "复制 Maven 缓存失败"
        exit 1
    fi
    docker rm -f "$temp_container" >/dev/null 2>&1 || true

    local m2_kb m2_sample
    m2_kb=$(du -sk "$MAVEN_CACHE_DIR" 2>/dev/null | awk '{print $1}')
    m2_sample=$(find "$MAVEN_CACHE_DIR" -mindepth 2 -maxdepth 3 -type d 2>/dev/null | head -1)
    if [ -z "$m2_kb" ] || [ "$m2_kb" -lt 10240 ] || [ -z "$m2_sample" ]; then
        print_warning "Maven 缓存偏小（${m2_kb:-0}KB）: $MAVEN_CACHE_DIR"
        print_info "请无缓存重编: ./install_linux.sh build-base（需 BuildKit）"
    else
        print_success "Maven 依赖已缓存: $MAVEN_CACHE_DIR（约 $((m2_kb / 1024))MB）"
    fi

    local jar_count=0
    while IFS= read -r jar_file; do
        [ -f "$jar_file" ] || continue
        jar_count=$((jar_count + 1))
        print_success "  ✓ $(basename "$jar_file")"
    done < <(find "$JARS_DIR" -maxdepth 1 -name "*.jar" -type f 2>/dev/null | sort)

    if [ "$jar_count" -eq 0 ]; then
        print_error "未找到任何 Jar，请检查 Dockerfile.base 编译日志"
        exit 1
    fi

    print_success "========== 第一阶段完成（共 $jar_count 个 Jar）=========="
    echo
}

# 第二阶段：仅打包运行时镜像（COPY target/jars，不再执行 Maven）
build_runtime_images() {
    local force="${1:-0}"

    print_info "========== 第二阶段：构建运行时镜像 ==========="

    if [ "$force" != "1" ] && check_images_exist; then
        print_success "所有运行时镜像已存在，跳过第二阶段"
        echo
        return 0
    fi

    if ! check_jars_exist; then
        print_warning "未找到 Jar，先执行第一阶段..."
        build_base_jars 1
    fi

    check_compose_file
    check_docker_daemon
    cd "$SCRIPT_DIR"
    verify_runtime_jars

    local spec dockerfile tag
    for spec in "${RUNTIME_IMAGE_SPECS[@]}"; do
        dockerfile="${spec%%|*}"
        tag="${spec##*|}"
        print_info "构建运行时镜像: $tag ($dockerfile)"
        if ! docker build -f "$dockerfile" -t "$tag" .; then
            print_error "构建失败: $tag"
            exit 1
        fi
    done

    print_success "========== 第二阶段完成 ==========="
    echo
}

# 检查所有运行时镜像是否已存在
check_images_exist() {
    local images=(
        "iot-gateway:latest"
        "iot-module-system-biz:latest"
        "iot-module-infra-biz:latest"
        "iot-module-device-biz:latest"
        "iot-module-dataset-biz:latest"
        "iot-module-tdengine-biz:latest"
        "iot-module-file-biz:latest"
        "iot-module-message-biz:latest"
        "iot-sink-biz:latest"
        "iot-gb28181-biz:latest"
    )
    
    local missing_count=0
    
    for image in "${images[@]}"; do
        if ! docker image inspect "$image" > /dev/null 2>&1; then
            missing_count=$((missing_count + 1))
        fi
    done
    
    if [ "$missing_count" -eq 0 ]; then
        return 0  # 所有镜像都存在
    else
        return 1  # 有镜像缺失
    fi
}

# 构建所有镜像（检查镜像是否存在，如果存在则跳过）
build_images() {
    print_info "========== 构建所有运行时镜像 =========="
    
    # 检查镜像是否已存在
    if check_images_exist; then
        print_success "所有运行时镜像已存在，跳过构建阶段"
        print_success "========== 构建完成（跳过）=========="
        echo
        return 0
    fi
    
    # 确保权限正确
    check_compose_file
    check_docker_daemon
    
    build_base_jars 0
    build_runtime_images 0
}

# 强制重新构建（install / update）
build_images_force() {
    print_info "========== 强制重新构建（两阶段）=========="
    check_compose_file
    check_docker_daemon
    build_base_jars 1
    build_runtime_images 1
}

# 构建并启动所有服务
build_and_start() {
    print_info "========== 开始构建并启动所有服务 =========="
    echo
    
    # 确保权限正确
    print_info "检查 Docker Compose 配置文件..."
    check_compose_file
    check_docker_daemon
    print_success "配置文件检查完成"
    
    print_info "切换到脚本目录: $SCRIPT_DIR"
    if ! cd "$SCRIPT_DIR"; then
        print_error "无法切换到目录: $SCRIPT_DIR"
        exit 1
    fi
    print_success "当前工作目录: $(pwd)"
    
    # 验证 Docker Compose 可以读取配置文件
    print_info "验证 Docker Compose 可以读取配置文件..."
    local compose_test_output
    set +e  # 暂时关闭错误退出，以便捕获退出码
    compose_test_output=$($DOCKER_COMPOSE -f "$COMPOSE_FILE" config 2>&1)
    local compose_test_exit=$?
    set -e  # 重新开启错误退出
    
    if [ $compose_test_exit -ne 0 ]; then
        print_error "Docker Compose 无法读取配置文件"
        echo "$compose_test_output" | sed 's/^/  /'
        exit 1
    else
        print_success "Docker Compose 配置文件验证通过"
    fi
    
    echo
    
    # 强制重新构建所有镜像（install 时总是根据代码重新构建）
    build_images_force
    
    # 启动所有服务
    print_info "========== 启动所有服务 =========="
    
    print_info "准备启动所有服务..."
    echo
    
    # 启动所有服务
    print_info "启动所有服务..."
    set +e  # 暂时关闭错误退出，以便捕获退出码
    compose_up_detached
    exit_code=$?
    set -e  # 重新开启错误退出
    
    echo  # 添加空行分隔
    
    # 检查命令是否成功
    if [ $exit_code -ne 0 ]; then
        print_error "服务启动失败（退出码: $exit_code）"
        exit 1
    fi
    
    # 验证容器是否真的创建了
    local container_count
    container_count=$($DOCKER_COMPOSE ps -q 2>/dev/null | wc -l)
    if [ "$container_count" -eq 0 ]; then
        print_error "警告：没有检测到运行的容器"
        print_info "请检查 docker-compose.yml 配置和依赖服务（如 Nacos、PostgreSQL、Redis 等）"
        print_info "尝试查看服务状态："
        $DOCKER_COMPOSE ps
        exit 1
    fi
    
    print_success "========== 服务构建并启动完成 =========="
    print_success "服务构建并启动完成（共 $container_count 个容器）"
    echo
    print_info "Jar 包: $JARS_DIR"
    print_info "Maven 缓存: $MAVEN_CACHE_DIR"
    print_info "可以使用以下命令查看服务状态:"
    print_info "  $0 status"
    print_info "  $0 logs [服务名]"
}

# 启动所有服务
start_services() {
    print_info "启动所有服务..."
    cd "$SCRIPT_DIR"
    compose_up_detached --quiet-pull 2>&1 | grep -E "(Creating|Starting|Started|Healthy|ERROR|WARNING|Recreate)" || true
    print_success "服务启动完成"
}

# 停止所有服务
stop_services() {
    print_info "停止所有服务..."
    cd "$SCRIPT_DIR"
    $DOCKER_COMPOSE down
    print_success "服务已停止"
}

# 重启所有服务
restart_services() {
    print_info "重启所有服务..."
    cd "$SCRIPT_DIR"
    $DOCKER_COMPOSE restart
    print_success "服务重启完成"
}

# 查看服务状态
show_status() {
    print_info "服务状态:"
    cd "$SCRIPT_DIR"
    $DOCKER_COMPOSE ps
}

# 查看日志
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        print_info "查看所有服务日志（最近50行，按Ctrl+C退出）..."
        cd "$SCRIPT_DIR"
        $DOCKER_COMPOSE logs -f --tail=50
    else
        print_info "查看服务 $service 的日志（最近50行，按Ctrl+C退出）..."
        cd "$SCRIPT_DIR"
        $DOCKER_COMPOSE logs -f --tail=50 "$service"
    fi
}

# 查看特定服务的日志（最近50行）
show_logs_tail() {
    local service=$1
    if [ -z "$service" ]; then
        print_info "查看所有服务最近50行日志..."
        cd "$SCRIPT_DIR"
        $DOCKER_COMPOSE logs --tail=50
    else
        print_info "查看服务 $service 最近50行日志..."
        cd "$SCRIPT_DIR"
        $DOCKER_COMPOSE logs --tail=50 "$service"
    fi
}

# 重启特定服务
restart_service() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "请指定要重启的服务名称"
        echo "可用服务:"
        cd "$SCRIPT_DIR"
        $DOCKER_COMPOSE config --services
        exit 1
    fi
    print_info "重启服务: $service"
    cd "$SCRIPT_DIR"
    $DOCKER_COMPOSE restart "$service"
    print_success "服务 $service 重启完成"
}

# 停止特定服务
stop_service() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "请指定要停止的服务名称"
        echo "可用服务:"
        cd "$SCRIPT_DIR"
        $DOCKER_COMPOSE config --services
        exit 1
    fi
    print_info "停止服务: $service"
    cd "$SCRIPT_DIR"
    $DOCKER_COMPOSE stop "$service"
    print_success "服务 $service 已停止"
}

# 启动特定服务
start_service() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "请指定要启动的服务名称"
        echo "可用服务:"
        cd "$SCRIPT_DIR"
        $DOCKER_COMPOSE config --services
        exit 1
    fi
    print_info "启动服务: $service"
    cd "$SCRIPT_DIR"
    compose_up_detached "$service"
    print_success "服务 $service 启动完成"
}

# 清理（停止并删除容器）
clean() {
    if [ "${YFEIEYE_AUTO_YES:-}" != "1" ]; then
        print_warning "这将停止并删除所有容器，但保留镜像"
        local response
        while true; do
            read -r -p "确认继续? [y/n] " response
            case "$(echo "$response" | tr '[:upper:]' '[:lower:]')" in
                y|yes) break ;;
                n|no|'')
                    print_info "操作已取消"
                    return
                    ;;
                *) echo "请输入 y/yes 或 n/no" ;;
            esac
        done
    fi
    cd "$SCRIPT_DIR"
    $DOCKER_COMPOSE down
    print_success "容器清理完成"

    print_info "清理各模块 target 目录下的 .jar 包..."
    local modules=(
        "iot-dataset"
        "iot-device"
        "iot-file"
        "iot-gateway"
        "iot-gb28181"
        "iot-infra"
        "iot-message"
        "iot-sink"
        "iot-system"
        "iot-tdengine"
    )

    local jar_count=0
    for module in "${modules[@]}"; do
        local module_path="${SCRIPT_DIR}/${module}"
        if [ -d "$module_path" ]; then
            local found_jars
            found_jars=$(find "$module_path" -type f -name "*.jar" -path "*/target/*" 2>/dev/null || true)
            if [ -n "$found_jars" ]; then
                while IFS= read -r jar_file; do
                    if [ -f "$jar_file" ]; then
                        rm -f "$jar_file"
                        jar_count=$((jar_count + 1))
                        print_info "已删除: $jar_file"
                    fi
                done <<< "$found_jars"
            fi
        fi
    done

    if [ "$jar_count" -gt 0 ]; then
        print_success "已清理 $jar_count 个 .jar 文件"
    else
        print_info "未找到需要清理的 .jar 文件"
    fi

    print_success "清理完成"
}

# 完全清理（包括镜像）
clean_all() {
    if [ "${YFEIEYE_AUTO_YES:-}" != "1" ]; then
        print_warning "这将停止并删除所有容器和镜像"
        local response
        while true; do
            read -r -p "确认继续? [y/n] " response
            case "$(echo "$response" | tr '[:upper:]' '[:lower:]')" in
                y|yes) break ;;
                n|no|'')
                    print_info "操作已取消"
                    return
                    ;;
                *) echo "请输入 y/yes 或 n/no" ;;
            esac
        done
    fi
    cd "$SCRIPT_DIR"
    $DOCKER_COMPOSE down --rmi all
    print_success "完全清理完成"
}

# 更新服务（重新构建并重启）
update_services() {
    print_info "========== 更新所有服务 =========="
    
    # 确保权限正确
    check_compose_file
    check_docker_daemon
    
    build_images_force

    # 重启所有服务
    print_info "重启所有服务..."
    local exit_code
    
    # 强制重新创建并启动所有服务
    compose_up_detached --force-recreate
    exit_code=$?
    
    # 检查命令是否成功
    if [ $exit_code -ne 0 ]; then
        print_error "服务更新失败（退出码: $exit_code）"
        exit 1
    fi
    
    # 验证容器是否真的创建了
    local container_count
    container_count=$($DOCKER_COMPOSE ps -q 2>/dev/null | wc -l)
    if [ "$container_count" -eq 0 ]; then
        print_error "警告：没有检测到运行的容器"
        print_info "请检查 docker-compose.yml 配置和依赖服务（如 Nacos、PostgreSQL、Redis 等）"
        print_info "尝试查看服务状态："
        $DOCKER_COMPOSE ps
        exit 1
    fi
    
    print_success "========== 服务更新完成（共 $container_count 个容器）=========="
}

# 显示帮助信息
show_help() {
    cat << EOF
DEVICE模块 Docker Compose 管理脚本

用法: $0 [命令] [选项]

构建流程（两阶段，与最初设计一致）:
    1) Dockerfile.base：Maven 只编译一次，依赖缓存到 .build-cache/device/m2/repository，Jar 落到 target/jars
    2) 各模块 Dockerfile：仅从 target/jars 打运行时镜像，不再执行 Maven

命令:
    build-base          仅第一阶段（Maven 编译 + 提取 Jar）
    build               两阶段（Jar 已存在则跳过第一阶段）
    start               启动所有服务
    stop                停止所有服务
    restart             重启所有服务
    status              查看服务状态
    logs [服务名]       查看日志（所有服务或指定服务，最近50行）
    logs-tail [服务名]  查看最近50行日志
    restart-service     重启指定服务
    stop-service        停止指定服务
    start-service       启动指定服务
    clean               清理（停止并删除容器，保留镜像）
    clean-all           完全清理（停止并删除容器和镜像）
    update              更新服务（重新构建并重启）
    install             安装（构建并启动所有服务）
    help                显示此帮助信息

示例:
    $0 install                    # 构建并启动所有服务
    $0 build                      # 仅构建运行时镜像
    $0 start                      # 启动所有服务
    $0 logs iot-gateway           # 查看iot-gateway的日志
    $0 restart-service iot-system # 重启iot-system服务
    $0 status                     # 查看所有服务状态

可用服务:
    - iot-gateway
    - iot-system
    - iot-infra
    - iot-device
    - iot-dataset
    - iot-tdengine
    - iot-file
    - iot-message
    - iot-sink
    - iot-gb28181

EOF
}

# 主函数
main() {
    check_compose_file
    
    case "${1:-}" in
        build-base)
            build_base_jars 1
            ;;
        build)
            build_images
            ;;
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        logs-tail)
            show_logs_tail "$2"
            ;;
        restart-service)
            restart_service "$2"
            ;;
        stop-service)
            stop_service "$2"
            ;;
        start-service)
            start_service "$2"
            ;;
        clean)
            clean
            ;;
        clean-all)
            clean_all
            ;;
        update)
            update_services
            ;;
        install|build-and-start)
            build_and_start
            ;;
        help|--help|-h)
            show_help
            ;;
        "")
            # 如果没有参数，显示交互式菜单
            show_interactive_menu
            ;;
        *)
            print_error "未知命令: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 交互式菜单
show_interactive_menu() {
    while true; do
        echo
        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}  DEVICE模块 Docker Compose 管理${NC}"
        echo -e "${BLUE}========================================${NC}"
        echo "1) 安装/构建并启动所有服务"
        echo "2) 构建所有运行时镜像"
        echo "3) 启动所有服务"
        echo "4) 停止所有服务"
        echo "5) 重启所有服务"
        echo "6) 查看服务状态"
        echo "7) 查看日志（所有服务）"
        echo "8) 查看日志（指定服务）"
        echo "9) 重启指定服务"
        echo "10) 停止指定服务"
        echo "11) 启动指定服务"
        echo "12) 更新服务（重新构建并重启）"
        echo "13) 清理（删除容器，保留镜像）"
        echo "14) 完全清理（删除容器和镜像）"
        echo "0) 退出"
        echo
        read -p "请选择操作 [0-14]: " choice
        
        case $choice in
            1)
                build_and_start
                ;;
            2)
                build_images
                ;;
            3)
                start_services
                ;;
            4)
                stop_services
                ;;
            5)
                restart_services
                ;;
            6)
                show_status
                ;;
            7)
                show_logs
                ;;
            8)
                echo "可用服务:"
                cd "$SCRIPT_DIR"
                $DOCKER_COMPOSE config --services
                read -p "请输入服务名称: " service_name
                show_logs "$service_name"
                ;;
            9)
                echo "可用服务:"
                cd "$SCRIPT_DIR"
                $DOCKER_COMPOSE config --services
                read -p "请输入服务名称: " service_name
                restart_service "$service_name"
                ;;
            10)
                echo "可用服务:"
                cd "$SCRIPT_DIR"
                $DOCKER_COMPOSE config --services
                read -p "请输入服务名称: " service_name
                stop_service "$service_name"
                ;;
            11)
                echo "可用服务:"
                cd "$SCRIPT_DIR"
                $DOCKER_COMPOSE config --services
                read -p "请输入服务名称: " service_name
                start_service "$service_name"
                ;;
            12)
                update_services
                ;;
            13)
                clean
                ;;
            14)
                clean_all
                ;;
            0)
                print_info "退出"
                exit 0
                ;;
            *)
                print_error "无效选择，请重新输入"
                ;;
        esac
    done
}

# 执行主函数
main "$@"
