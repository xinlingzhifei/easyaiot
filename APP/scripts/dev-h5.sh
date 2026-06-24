#!/usr/bin/env bash
# H5 浏览器开发模式启动脚本
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "错误: 未找到 pnpm，请先安装 Node.js >= 20 与 pnpm >= 9"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "首次运行，正在安装依赖..."
  pnpm install
fi

echo "启动 H5 开发服务器（浏览器访问 http://localhost:9010 ）"
exec pnpm dev:h5
