#!/bin/bash
# yFeiEye Node Agent 安装脚本（目标机全程离线，不依赖网络 / apt / python3-venv）
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/easyaiot/node-agent}"
PYTHON="${PYTHON:-python3}"

echo "==> 安装目录: $INSTALL_DIR"
sudo mkdir -p "$INSTALL_DIR"
resolved_install_dir="$(readlink -f "$INSTALL_DIR")"
resolved_pwd="$(readlink -f "$(pwd)")"
if [ "$resolved_pwd" != "$resolved_install_dir" ]; then
  sudo cp run_agent.py agent_server.py media_manager.py workload_manager.py requirements.txt agent.env.example "$INSTALL_DIR/"
fi
cd "$resolved_install_dir"
WHEELS_DIR="$resolved_install_dir/pip-wheels"
if [ ! -d "$WHEELS_DIR" ] || ! compgen -G "$WHEELS_DIR"/*.{whl,tar.gz,zip} >/dev/null 2>&1; then
  echo "INSTALL_FAIL: 缺少离线 pip 包目录 pip-wheels/" >&2
  exit 1
fi

RUN_PYTHON=""
EXEC_PYTHON=""
SITE_PKG="$resolved_install_dir/site-packages"
VENV_DIR="$resolved_install_dir/venv"
PREFIX_DIR="$resolved_install_dir/python-prefix"

has_bootstrap_wheel() {
  compgen -G "$WHEELS_DIR/$1"*.whl >/dev/null 2>&1 \
    || compgen -G "$WHEELS_DIR/${1,,}"*.whl >/dev/null 2>&1
}

python_minor_version() {
  $PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "3.12"
}

describe_bootstrap_gaps() {
  local gaps=""
  if ! has_bootstrap_wheel pip; then
    gaps="${gaps} pip-*.whl"
  fi
  if ! has_bootstrap_wheel setuptools; then
    gaps="${gaps} setuptools-*.whl"
  fi
  if ! has_bootstrap_wheel wheel; then
    gaps="${gaps} wheel-*.whl"
  fi
  if [ -n "$gaps" ]; then
    echo "INSTALL_FAIL: 离线 bootstrap 包不完整，缺少:${gaps}" >&2
    echo "INSTALL_FAIL: 请在平台服务器重新执行 export_pip_wheels.sh 后再次部署" >&2
  fi
}

write_agent_launcher() {
  local launcher py_bin
  launcher="$resolved_install_dir/agent-python.sh"
  py_bin="$(command -v "$PYTHON" 2>/dev/null || echo "$PYTHON")"
  cat <<WRAP | sudo tee "$launcher" > /dev/null
#!/bin/bash
export PYTHONPATH="${SITE_PKG}\${PYTHONPATH:+:\$PYTHONPATH}"
exec ${py_bin} "${resolved_install_dir}/run_agent.py" "\$@"
WRAP
  sudo chmod +x "$launcher"
  EXEC_PYTHON="$launcher"
}

verify_agent_imports() {
  if [ -d "$SITE_PKG" ]; then
    sudo env PYTHONPATH="$SITE_PKG" $PYTHON -c "import flask, psutil, requests, minio" 2>/dev/null \
      && return 0
  fi
  if [ -n "$RUN_PYTHON" ] && [ -x "$RUN_PYTHON" ]; then
    sudo "$RUN_PYTHON" -c "import flask, psutil, requests, minio" 2>/dev/null \
      && return 0
  fi
  return 1
}

# 离线首选：从 wheel 解压 bootstrap pip，再 --target 安装（无需 venv / apt / get-pip）
setup_agent_site_packages() {
  if ! has_bootstrap_wheel pip || ! has_bootstrap_wheel setuptools || ! has_bootstrap_wheel wheel; then
    describe_bootstrap_gaps
    return 1
  fi

  echo "==> 离线 site-packages 安装（仅需同步 pip-wheels，无需 python-venv）..."
  sudo rm -rf "$SITE_PKG"
  sudo mkdir -p "$SITE_PKG"

  if ! sudo $PYTHON - "$SITE_PKG" "$WHEELS_DIR" <<'PY'
import glob, os, sys, zipfile
site, wheels_dir = sys.argv[1], sys.argv[2]
os.makedirs(site, exist_ok=True)
for pkg in ("pip", "setuptools", "wheel"):
    matches = glob.glob(os.path.join(wheels_dir, f"{pkg}-*.whl"))
    if not matches:
        print(f"INSTALL_FAIL: missing wheel for {pkg}", file=sys.stderr)
        sys.exit(1)
    with zipfile.ZipFile(matches[0]) as zf:
        zf.extractall(site)
PY
  then
    echo "INSTALL_FAIL: 解压 pip/setuptools/wheel 失败" >&2
    return 1
  fi

  if ! sudo env PYTHONPATH="$SITE_PKG" $PYTHON -m pip --version >/dev/null 2>&1; then
    echo "WARN: site-packages bootstrap pip 不可用，尝试其他路径..." >&2
    return 1
  fi

  if ! sudo env PYTHONPATH="$SITE_PKG" $PYTHON -m pip install \
      --target="$SITE_PKG" --no-index --find-links "$WHEELS_DIR" \
      -r requirements.txt -q; then
    echo "INSTALL_FAIL: site-packages 离线依赖安装失败" >&2
    return 1
  fi

  RUN_PYTHON="$(command -v "$PYTHON" 2>/dev/null || echo "$PYTHON")"
  write_agent_launcher
  echo "==> site-packages 已就绪: $SITE_PKG"
  return 0
}

try_install_python_venv() {
  if ! command -v apt-get >/dev/null 2>&1; then
    return 1
  fi
  local py_ver
  py_ver="$(python_minor_version)"
  echo "==> 尝试在线安装 python${py_ver}-venv（离线环境将跳过）..."
  if sudo apt-get update -qq >/dev/null 2>&1 \
    && { sudo apt-get install -y -qq "python${py_ver}-venv" 2>/dev/null \
      || sudo apt-get install -y -qq python3-venv 2>/dev/null; }; then
    return 0
  fi
  return 1
}

setup_agent_venv() {
  local get_pip="$resolved_install_dir/get-pip.py"
  if [ ! -f "$get_pip" ] || ! has_bootstrap_wheel pip; then
    return 1
  fi

  echo "==> 尝试 venv 备选路径..."
  sudo rm -rf "$VENV_DIR"
  if ! sudo $PYTHON -m venv --without-pip "$VENV_DIR" 2>/dev/null; then
    try_install_python_venv || true
    if ! sudo $PYTHON -m venv --without-pip "$VENV_DIR" 2>/dev/null; then
      return 1
    fi
  fi

  if ! sudo "$VENV_DIR/bin/python" "$get_pip" --no-index --find-links "$WHEELS_DIR" --no-warn-script-location -q; then
    return 1
  fi
  if [ ! -x "$VENV_DIR/bin/pip" ]; then
    return 1
  fi
  if ! sudo "$VENV_DIR/bin/pip" install --no-index --find-links "$WHEELS_DIR" -r requirements.txt -q; then
    echo "INSTALL_FAIL: venv 离线依赖安装失败" >&2
    return 1
  fi

  RUN_PYTHON="$VENV_DIR/bin/python"
  EXEC_PYTHON="$(readlink -f "$RUN_PYTHON" 2>/dev/null || echo "$RUN_PYTHON")"
  echo "==> venv 已就绪: $RUN_PYTHON"
  return 0
}

if setup_agent_site_packages; then
  :
elif setup_agent_venv; then
  :
else
  py_ver="$(python_minor_version)"
  echo "INSTALL_FAIL: 离线安装失败" >&2
  echo "INSTALL_FAIL: 请确认平台已同步完整 pip-wheels（含 pip/setuptools/wheel 及 Python ${py_ver} 依赖）" >&2
  exit 1
fi

echo "==> 验证关键依赖"
if ! verify_agent_imports; then
  echo "INSTALL_FAIL: 依赖安装后 import 验证失败" >&2
  exit 1
fi

if [ ! -f "$INSTALL_DIR/agent.env" ]; then
  sudo cp agent.env.example agent.env
  echo "请编辑 $INSTALL_DIR/agent.env 填入 NODE_ID 和 AGENT_TOKEN"
fi

cat <<UNIT | sudo tee /etc/systemd/system/easyaiot-node-agent.service > /dev/null
[Unit]
Description=yFeiEye Node Agent
After=network.target

[Service]
Type=simple
EnvironmentFile=${resolved_install_dir}/agent.env
ExecStart=${EXEC_PYTHON}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
echo "==> 安装完成"
echo "INSTALL_OK"
