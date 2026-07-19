# Modbus RTU 虚拟串口联调

无 USB-RS485 硬件时，用 **PTY 虚拟串口对 + RTU 从站** 把 `modbus-rtu-demo` 与 Sink `MODBUS_RTU` 完整跑通。

```text
Sink / 01_uplink_read.py  --打开-->  /tmp/easyaiot-modbus-rtu-u  (master)
                                              |
                                         PTY bridge
                                              |
                                    RTU 从站 (本目录脚本)
```

## 快速开始

```bash
cd .scripts/modbus-rtu-virtual-serial
chmod +x start.sh stop.sh 00_virtual_rtu_slave.py 01_self_test.py

# 1. 启动虚拟串口 + 从站
./start.sh

# 2. 自检（可选，需 pyserial）
pip install -r requirements.txt
python3 01_self_test.py

# 3. 用现有 demo 读寄存器
python3 ../modbus-rtu-demo/01_uplink_read.py \
  --port /tmp/easyaiot-modbus-rtu-u --baudrate 9600 --unit 1 --count 3

# 4. 写 setpoint
python3 ../modbus-rtu-demo/02_downlink_write.py \
  --port /tmp/easyaiot-modbus-rtu-u --baud 9600 --address 1 --value 30

# 5. 停止
./stop.sh
```

前台调试：

```bash
python3 00_virtual_rtu_slave.py --link /tmp/easyaiot-modbus-rtu-u --unit 1
```

## 对接 Sink

把设备 `protocolConfig` 改为（或与 `.runtime/ports.json` 中 hint 对齐）：

```json
{
  "enabled": true,
  "serialPort": "/tmp/easyaiot-modbus-rtu-u",
  "baudRate": 9600,
  "dataBits": 8,
  "stopBits": "1",
  "parity": "NONE",
  "rs485Mode": false,
  "unitId": 1,
  "pollIntervalMs": 3000,
  "points": [
    {"identifier": "temperature", "function": "HOLDING_REGISTER", "address": 0, "writable": false},
    {"identifier": "setpoint", "function": "HOLDING_REGISTER", "address": 1, "writable": true},
    {"identifier": "running", "function": "COIL", "address": 0, "writable": true}
  ]
}
```

注意：

- **`rs485Mode` 必须为 `false`**：虚拟 PTY 不支持 RS485 ioctl。
- 默认链接是 `/tmp/easyaiot-modbus-rtu-u`（会 `chmod 666` 底层 pts，方便 Sink 打开）。
- 若一定要用 `/dev/ttyUSB0`：

```bash
sudo DEV_LINK=/dev/ttyUSB0 LINK=/tmp/easyaiot-modbus-rtu-u ./start.sh
```

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `LINK` | `/tmp/easyaiot-modbus-rtu-u` | master 侧稳定路径 |
| `UNIT` | `1` | 从站地址 |
| `DEV_LINK` | 空 | 额外链到的设备节点（常需 root） |

## 运行时文件

| 路径 | 说明 |
|---|---|
| `.runtime/ports.json` | master/slave 路径、推荐 protocolConfig |
| `.runtime/ports.env` | 可 `source` 的环境变量 |
| `.runtime/slave.log` | 后台日志 |
| `.runtime/slave.pid` | 进程 PID |

## 依赖

- 从站本身：**仅 Python3 标准库**（不需要 socat）
- 自检 / `modbus-rtu-demo`：`pyserial`
