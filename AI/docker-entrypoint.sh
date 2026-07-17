#!/bin/sh
# 容器启动时用当前 Python 解析 pip 安装的 nvidia/*/lib，避免硬编码 site-packages 路径。
set -e

PYTHON_BIN="${PYTHON:-python}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  PYTHON_BIN=python3
fi

# Docker 设备申请决定容器可见 GPU；训练任务再通过 device 参数选择单卡或多卡。
# 兼容旧镜像内置的 CUDA_VISIBLE_DEVICES=0：当 NVIDIA 暴露全部设备时，
# 根据 nvidia-smi 动态生成完整数字列表，确保主进程及其 DDP 子进程环境一致。
if [ -n "${EASYAIOT_CUDA_VISIBLE_DEVICES:-}" ]; then
  export CUDA_VISIBLE_DEVICES="${EASYAIOT_CUDA_VISIBLE_DEVICES}"
elif [ "${NVIDIA_VISIBLE_DEVICES:-}" = "all" ] && command -v nvidia-smi >/dev/null 2>&1; then
  DETECTED_CUDA_DEVICES="$(nvidia-smi --query-gpu=index --format=csv,noheader,nounits 2>/dev/null \
    | awk '{$1=$1; print}' | paste -sd, -)"
  if [ -n "$DETECTED_CUDA_DEVICES" ]; then
    export CUDA_VISIBLE_DEVICES="$DETECTED_CUDA_DEVICES"
  else
    unset CUDA_VISIBLE_DEVICES
  fi
else
  unset CUDA_VISIBLE_DEVICES
fi

export MPLCONFIGDIR="${MPLCONFIGDIR:-/tmp/matplotlib}"
mkdir -p "$MPLCONFIGDIR"
if "$PYTHON_BIN" - <<'PY'
from app.utils.yolo_chinese_font import ensure_ultralytics_training_fonts

raise SystemExit(0 if ensure_ultralytics_training_fonts() else 1)
PY
then
  echo "[ai-entrypoint] Ultralytics 训练字体已离线准备"
else
  echo "[ai-entrypoint] 警告: Ultralytics 训练字体准备失败，训练任务将快速报错而不会联网等待" >&2
fi

if [ "${_ONNX_NVIDIA_LD_PATH_DONE:-}" != "1" ]; then
  NVIDIA_ORT_LD="$("$PYTHON_BIN" -c "
import glob
import os
import site

paths = sorted({
    d
    for root in site.getsitepackages()
    for d in glob.glob(os.path.join(root, 'nvidia', '*', 'lib'))
    if os.path.isdir(d)
})
print(':'.join(paths))
" 2>/dev/null || true)"

  if [ -n "$NVIDIA_ORT_LD" ]; then
    if [ -n "${LD_LIBRARY_PATH:-}" ]; then
      export LD_LIBRARY_PATH="${NVIDIA_ORT_LD}:${LD_LIBRARY_PATH}"
    else
      export LD_LIBRARY_PATH="${NVIDIA_ORT_LD}"
    fi
  fi
  export _ONNX_NVIDIA_LD_PATH_DONE=1
fi

exec "$@"