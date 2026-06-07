# yFeiEye 平台部署文檔

## 📋 目錄

- [概述](#概述)
- [環境要求](#環境要求)
- [快速開始](#快速開始)
- [腳本使用說明](#腳本使用說明)
- [模組說明](#模組說明)
- [服務端口](#服務端口)
- [常見問題](#常見問題)
- [日誌管理](#日誌管理)

## 概述

yFeiEye 是一個雲邊一體化智能算法應用平台，採用統一安裝腳本進行一鍵部署。該平台支持 Docker 容器化部署，可以快速安裝和啟動所有服務模組。

### 平台架構

yFeiEye 平台由以下核心模組組成：

- **基礎服務** (`.scripts/docker`): 包含 Nacos、PostgreSQL、Redis、TDEngine、Kafka、MinIO 等中間件
- **DEVICE 服務**: 設備管理和網關服務（基於 Java）
- **AI 服務**: 人工智能處理服務（基於 Python）
- **VIDEO 服務**: 視頻處理服務（基於 Python）
- **WEB 服務**: Web 前端服務（基於 Vue）

## 環境要求

### 系統要求

- **操作系統**: 
  - Linux (推薦 Ubuntu 24.04)
  - macOS (推薦 macOS 10.15+)
  - Windows (推薦 Windows 10/11，需要 PowerShell 5.1+)
- **內存**: 推薦 32GB（最低 16GB）
- **磁盤**: 建議 200GB 以上可用空間
- **CPU**: 推薦 8 核（最低 4 核）
- **顯卡**: 推薦 NVIDIA GPU（最低 CPU）

### 軟件依賴

在運行部署腳本之前，需要確保已安裝以下軟件：

1. **Docker** (必須版本 v29.0.0+)
   - 安裝指南: https://docs.docker.com/get-docker/
   - 驗證安裝: `docker --version`
   - **注意**: Docker 版本必須為 v29.0.0 或更高版本，低於此版本將無法正常運行

2. **Docker Compose** (必須版本 v2.35.0+)
   - 安裝指南: https://docs.docker.com/compose/install/
   - 驗證安裝: `docker compose version`
   - **注意**: Docker Compose 版本必須為 v2.35.0 或更高版本，低於此版本將無法正常運行

3. **其他依賴**:
   - **Linux/macOS**: `curl` (用於健康檢查，通常系統已自帶)
   - **Windows**: PowerShell 5.1+ (通常系統已自帶)

### Docker 權限配置

#### Linux

確保當前用戶有權限訪問 Docker daemon：

```bash
# 方法1: 將用戶添加到 docker 組（推薦）
sudo usermod -aG docker $USER
# 然後重新登錄或運行
newgrp docker

# 方法2: 使用 sudo 運行腳本（不推薦）
sudo ./install_linux.sh [命令]
```

驗證 Docker 權限：

```bash
docker ps
```

#### macOS

macOS 通常不需要特殊權限配置，Docker Desktop 會自動處理權限。

#### Windows

Windows 上 Docker Desktop 會自動處理權限，確保以管理員身份運行 PowerShell（如需要）。

## 快速開始

### Linux 部署

#### 1. 獲取項目代碼

```bash
# 克隆項目（如果還沒有）
git clone <repository-url>
cd yfeieye
```

#### 2. 進入腳本目錄

```bash
cd .scripts/docker
```

#### 3. 賦予腳本執行權限

```bash
chmod +x install_linux.sh
```

#### 4. 一鍵安裝所有服務

```bash
./install_linux.sh install
```

該命令會：
- 檢查 Docker 和 Docker Compose 環境
- 創建統一網絡 `yfeieye-network`
- 按依賴順序安裝所有模組
- 啟動所有服務容器

#### 5. 驗證服務狀態

```bash
./install_linux.sh verify
```

如果所有服務正常運行，將顯示服務訪問地址。

### macOS 部署

#### 1. 獲取項目代碼

```bash
# 克隆項目（如果還沒有）
git clone <repository-url>
cd yfeieye
```

#### 2. 進入腳本目錄

```bash
cd .scripts/docker
```

#### 3. 賦予腳本執行權限

```bash
chmod +x install_mac.sh
```

#### 4. 一鍵安裝所有服務

```bash
./install_mac.sh install
```

該命令會：
- 檢查 Docker 和 Docker Compose 環境
- 創建統一網絡 `yfeieye-network`
- 按依賴順序安裝所有模組
- 啟動所有服務容器

#### 5. 驗證服務狀態

```bash
./install_mac.sh verify
```

如果所有服務正常運行，將顯示服務訪問地址。

### Windows 部署

有關 Windows 部署的詳細說明，包括環境準備、中間件部署、服務啟動和故障排除等內容，請參閱專門的 [Windows 部署指南](平台Windows部署文档_zh_tw.md)。

Windows 部署指南提供了全面的分步說明，涵蓋：
- 系統要求和環境配置
- 中間件安裝與配置
- 服務啟動流程
- 視訊串流媒體配置
- 常見問題與解決方案
- 常用命令參考

該指南專門針對 Windows 10/11 系統，並涵蓋本地部署場景。

## 腳本使用說明

### 腳本位置

統一安裝腳本位於項目根目錄下的 `.scripts/docker/` 目錄：

- **Linux**: `install_linux.sh`
- **macOS**: `install_mac.sh`
- **Windows**: `install_win.ps1`

### 可用命令

所有操作系統支持相同的命令，但腳本名稱不同：

| 命令 | 說明 | Linux 示例 | macOS 示例 | Windows 示例 |
|------|------|-----------|-----------|-------------|
| `install` | 安裝並啟動所有服務（首次運行） | `./install_linux.sh install` | `./install_mac.sh install` | `.\install_win.ps1 install` |
| `start` | 啟動所有服務 | `./install_linux.sh start` | `./install_mac.sh start` | `.\install_win.ps1 start` |
| `stop` | 停止所有服務 | `./install_linux.sh stop` | `./install_mac.sh stop` | `.\install_win.ps1 stop` |
| `restart` | 重啟所有服務 | `./install_linux.sh restart` | `./install_mac.sh restart` | `.\install_win.ps1 restart` |
| `status` | 查看所有服務狀態 | `./install_linux.sh status` | `./install_mac.sh status` | `.\install_win.ps1 status` |
| `logs` | 查看所有服務日誌 | `./install_linux.sh logs` | `./install_mac.sh logs` | `.\install_win.ps1 logs` |
| `build` | 重新構建所有鏡像 | `./install_linux.sh build` | `./install_mac.sh build` | `.\install_win.ps1 build` |
| `clean` | 清理所有容器和鏡像（危險操作） | `./install_linux.sh clean` | `./install_mac.sh clean` | `.\install_win.ps1 clean` |
| `update` | 更新並重啟所有服務 | `./install_linux.sh update` | `./install_mac.sh update` | `.\install_win.ps1 update` |
| `verify` | 驗證所有服務是否啟動成功 | `./install_linux.sh verify` | `./install_mac.sh verify` | `.\install_win.ps1 verify` |

### 命令詳細說明

#### install - 安裝服務

首次部署時使用，會安裝並啟動所有服務模組：

**Linux/macOS**:
```bash
./install_linux.sh install    # Linux
./install_mac.sh install       # macOS
```

**Windows**:
```powershell
.\install_win.ps1 install
```

**執行流程**:
1. 檢查 Docker 和 Docker Compose 環境
2. 創建 Docker 網絡 `yfeieye-network`
3. 按依賴順序安裝各模組：
   - 基礎服務（Nacos、PostgreSQL、Redis 等）
   - DEVICE 服務
   - AI 服務
   - VIDEO 服務
   - WEB 服務
4. 顯示安裝結果統計

#### start - 啟動服務

啟動所有已安裝的服務：

**Linux/macOS**:
```bash
./install_linux.sh start    # Linux
./install_mac.sh start      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 start
```

#### stop - 停止服務

停止所有運行中的服務（按逆序停止）：

**Linux/macOS**:
```bash
./install_linux.sh stop    # Linux
./install_mac.sh stop      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 stop
```

#### restart - 重啟服務

重啟所有服務：

**Linux/macOS**:
```bash
./install_linux.sh restart    # Linux
./install_mac.sh restart      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 restart
```

#### status - 查看狀態

查看所有服務的運行狀態：

**Linux/macOS**:
```bash
./install_linux.sh status    # Linux
./install_mac.sh status      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 status
```

#### logs - 查看日誌

查看所有服務的日誌（最近 100 行）：

**Linux/macOS**:
```bash
./install_linux.sh logs    # Linux
./install_mac.sh logs      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 logs
```

#### build - 構建鏡像

重新構建所有服務的 Docker 鏡像（使用 `--no-cache` 選項）：

**Linux/macOS**:
```bash
./install_linux.sh build    # Linux
./install_mac.sh build      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 build
```

**注意**: 構建過程可能需要較長時間，請耐心等待。

#### clean - 清理服務

**⚠️ 危險操作**: 刪除所有容器、鏡像和數據卷

**Linux/macOS**:
```bash
./install_linux.sh clean    # Linux
./install_mac.sh clean      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 clean
```

執行前會要求確認，輸入 `y` 或 `Y` 繼續，其他輸入將取消操作。

**清理內容**:
- 所有服務容器
- 所有服務鏡像
- 所有數據卷
- Docker 網絡 `yfeieye-network`

#### update - 更新服務

拉取最新鏡像並重啟所有服務：

**Linux/macOS**:
```bash
./install_linux.sh update    # Linux
./install_mac.sh update      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 update
```

**執行流程**:
1. 拉取各模組的最新鏡像
2. 重啟所有服務以使用新鏡像

#### verify - 驗證服務

驗證所有服務是否正常啟動並可訪問：

**Linux/macOS**:
```bash
./install_linux.sh verify    # Linux
./install_mac.sh verify      # macOS
```

**Windows**:
```powershell
.\install_win.ps1 verify
```

**驗證內容**:
- 檢查服務端口是否可訪問
- 檢查健康檢查端點是否正常響應
- 顯示服務訪問地址

**成功輸出示例**:
```
[SUCCESS] 所有服務運行正常！

服務訪問地址:
  基礎服務 (Nacos):     http://localhost:8848/nacos
  基礎服務 (MinIO):     http://localhost:9000 (API), http://localhost:9001 (Console)
  Device服務 (Gateway):  http://localhost:48080
  AI服務:                http://localhost:5000
  Video服務:             http://localhost:6000
  Web前端:               http://localhost:8888
```

## 模組說明

### 基礎服務 (`.scripts/docker`)

**說明**: 包含平台運行所需的所有中間件服務

**包含服務**:
- **Nacos**: 服務註冊與配置中心
- **PostgreSQL**: 關係型數據庫
- **Redis**: 緩存數據庫
- **TDEngine**: 時序數據庫
- **Kafka**: 消息隊列
- **MinIO**: 對象存儲服務

**部署方式**: 
- **Linux**: 使用 `install_middleware_linux.sh` 腳本
- **macOS**: 使用 `install_middleware_mac.sh` 腳本
- **Windows**: 使用 `install_middleware_win.ps1` 腳本

### DEVICE 服務

**說明**: 設備管理和網關服務，提供設備接入、產品管理、數據標註、規則引擎等功能

**技術棧**: Java (Spring Cloud)

**部署方式**: 
- **Linux**: 使用 `install_linux.sh` 腳本
- **macOS**: 使用 `install_mac.sh` 腳本
- **Windows**: 使用 `install_win.ps1` 腳本

**主要功能**:
- 設備管理
- 產品管理
- 數據標註
- 規則引擎
- 算法商店
- 系統管理

### AI 服務

**說明**: 人工智能處理服務，負責視頻分析和 AI 算法執行

**技術棧**: Python

**部署方式**: 
- **Linux**: 使用 `install_linux.sh` 腳本
- **macOS**: 使用 `install_mac.sh` 腳本
- **Windows**: 使用 `install_win.ps1` 腳本

**主要功能**:
- 視頻分析
- AI 算法執行
- 模型推理

### VIDEO 服務

**說明**: 視頻處理服務，負責視頻流處理與傳輸

**技術棧**: Python

**部署方式**: 
- **Linux**: 使用 `install_linux.sh` 腳本
- **macOS**: 使用 `install_mac.sh` 腳本
- **Windows**: 使用 `install_win.ps1` 腳本

**主要功能**:
- 視頻流處理
- 視頻傳輸
- 流媒體服務

### WEB 服務

**說明**: Web 前端服務，提供用戶界面

**技術棧**: Vue.js

**部署方式**: 
- **Linux**: 使用 `install_linux.sh` 腳本
- **macOS**: 使用 `install_mac.sh` 腳本
- **Windows**: 使用 `install_win.ps1` 腳本

**主要功能**:
- 用戶界面
- 數據可視化
- 系統管理界面

## 服務端口

| 服務模組 | 端口 | 說明 | 訪問地址 |
|---------|------|------|----------|
| Nacos | 8848 | 服務註冊與配置中心 | http://localhost:8848/nacos |
| MinIO API | 9000 | 對象存儲 API | http://localhost:9000 |
| MinIO Console | 9001 | 對象存儲控制台 | http://localhost:9001 |
| DEVICE Gateway | 48080 | 設備服務網關 | http://localhost:48080 |
| AI 服務 | 5000 | AI 處理服務 | http://localhost:5000 |
| VIDEO 服務 | 6000 | 視頻處理服務 | http://localhost:6000 |
| WEB 前端 | 8888 | Web 前端界面 | http://localhost:8888 |

### 健康檢查端點

各服務的健康檢查端點：

| 服務模組 | 健康檢查端點 |
|---------|-------------|
| 基礎服務 (Nacos) | `/nacos/actuator/health` |
| DEVICE 服務 | `/actuator/health` |
| AI 服務 | `/actuator/health` |
| VIDEO 服務 | `/actuator/health` |
| WEB 服務 | `/health` |

## 常見問題

### 1. Docker 權限問題

**問題**: 執行腳本時提示 "沒有權限訪問 Docker daemon"

**解決方案**:

**Linux**:
```bash
# 將用戶添加到 docker 組
sudo usermod -aG docker $USER

# 重新登錄或運行
newgrp docker

# 驗證權限
docker ps
```

**macOS**: 
macOS 通常不需要特殊配置，確保 Docker Desktop 正在運行即可。

**Windows**: 
Windows 上 Docker Desktop 會自動處理權限，確保 Docker Desktop 正在運行。

### 2. 端口被佔用

**問題**: 啟動服務時提示端口已被佔用

**解決方案**:

**Linux**:
```bash
# 查看端口佔用情況
sudo netstat -tulpn | grep <端口號>
# 或
sudo lsof -i :<端口號>

# 停止佔用端口的進程或修改服務配置中的端口
```

**macOS**:
```bash
# 查看端口佔用情況
lsof -i :<端口號>

# 停止佔用端口的進程或修改服務配置中的端口
```

**Windows**:
```powershell
# 查看端口佔用情況
netstat -ano | findstr :<端口號>

# 停止佔用端口的進程或修改服務配置中的端口
```

### 3. 服務啟動失敗

**問題**: 某個服務模組啟動失敗

**解決方案**:

**Linux/macOS**:
```bash
# 1. 查看服務日誌
./install_linux.sh logs    # Linux
./install_mac.sh logs      # macOS

# 2. 查看特定模組的詳細日誌
cd <模組目錄>
docker-compose logs

# 3. 檢查 Docker 資源
docker ps -a
docker images

# 4. 檢查網絡
docker network ls
docker network inspect yfeieye-network
```

**Windows**:
```powershell
# 1. 查看服務日誌
.\install_win.ps1 logs

# 2. 查看特定模組的詳細日誌
cd <模組目錄>
docker-compose logs

# 3. 檢查 Docker 資源
docker ps -a
docker images

# 4. 檢查網絡
docker network ls
docker network inspect yfeieye-network
```

### 4. 鏡像構建失敗

**問題**: 構建鏡像時失敗

**解決方案**:

**Linux/macOS**:
```bash
# 1. 檢查 Docker 磁盤空間
docker system df

# 2. 清理未使用的資源
docker system prune -a

# 3. 檢查網絡連接（如需拉取基礎鏡像）
ping registry-1.docker.io

# 4. 單獨構建失敗模組的鏡像
cd <模組目錄>
docker-compose build --no-cache
```

**Windows**:
```powershell
# 1. 檢查 Docker 磁盤空間
docker system df

# 2. 清理未使用的資源
docker system prune -a

# 3. 檢查網絡連接（如需拉取基礎鏡像）
Test-NetConnection registry-1.docker.io -Port 443

# 4. 單獨構建失敗模組的鏡像
cd <模組目錄>
docker-compose build --no-cache
```

### 5. 服務無法訪問

**問題**: 服務已啟動但無法通過瀏覽器訪問

**解決方案**:

**Linux**:
```bash
# 1. 驗證服務是否正常運行
./install_linux.sh verify

# 2. 檢查防火牆設置
sudo ufw status
# 如需開放端口
sudo ufw allow <端口號>

# 3. 檢查服務日誌
./install_linux.sh logs

# 4. 檢查容器狀態
docker ps
```

**macOS**:
```bash
# 1. 驗證服務是否正常運行
./install_mac.sh verify

# 2. 檢查防火牆設置（系統偏好設置 > 安全性與隱私 > 防火牆）

# 3. 檢查服務日誌
./install_mac.sh logs

# 4. 檢查容器狀態
docker ps
```

**Windows**:
```powershell
# 1. 驗證服務是否正常運行
.\install_win.ps1 verify

# 2. 檢查防火牆設置（Windows 防火牆設置）

# 3. 檢查服務日誌
.\install_win.ps1 logs

# 4. 檢查容器狀態
docker ps
```

### 6. 數據丟失問題

**問題**: 清理服務後數據丟失

**說明**: `clean` 命令會刪除所有數據卷，導致數據丟失。這是預期行為。

**預防措施**:
- 執行 `clean` 前請備份重要數據
- 生產環境謹慎使用 `clean` 命令
- 建議使用數據卷備份工具

## 日誌管理

### 日誌文件位置

腳本執行日誌保存在 `.scripts/docker/logs/` 目錄下：

- **Linux**: `install_linux_YYYYMMDD_HHMMSS.log`
- **macOS**: `install_mac_YYYYMMDD_HHMMSS.log`
- **Windows**: `install_win_YYYYMMDD_HHMMSS.log`

日誌文件名包含時間戳，便於區分不同執行記錄。

### 查看日誌

#### 查看腳本執行日誌

**Linux/macOS**:
```bash
# 查看最新的日誌文件
ls -lt .scripts/docker/logs/ | head -5

# 查看特定日誌文件
tail -f .scripts/docker/logs/install_linux_20240101_120000.log    # Linux
tail -f .scripts/docker/logs/install_mac_20240101_120000.log      # macOS
```

**Windows**:
```powershell
# 查看最新的日誌文件
Get-ChildItem .scripts\docker\logs\ | Sort-Object LastWriteTime -Descending | Select-Object -First 5

# 查看特定日誌文件
Get-Content .scripts\docker\logs\install_win_20240101_120000.log -Wait
```

#### 查看服務容器日誌

**Linux/macOS**:
```bash
# 查看所有服務日誌
./install_linux.sh logs    # Linux
./install_mac.sh logs      # macOS

# 查看特定服務的日誌（需要進入對應模組目錄）
cd DEVICE
docker-compose logs -f
```

**Windows**:
```powershell
# 查看所有服務日誌
.\install_win.ps1 logs

# 查看特定服務的日誌（需要進入對應模組目錄）
cd DEVICE
docker-compose logs -f
```

### 日誌內容

腳本日誌包含：
- 執行時間戳
- 執行的命令
- 各模組的執行結果
- 錯誤信息和警告
- 服務狀態信息

## 部署流程建議

### 首次部署

#### Linux

1. **環境準備**
   ```bash
   # 檢查系統要求
   uname -a
   free -h
   df -h
   
   # 安裝 Docker 和 Docker Compose
   # 參考: https://docs.docker.com/get-docker/
   ```

2. **獲取代碼**
   ```bash
   git clone <repository-url>
   cd yfeieye
   ```

3. **執行安裝**
   ```bash
   cd .scripts/docker
   chmod +x install_linux.sh
   ./install_linux.sh install
   ```

4. **驗證部署**
   ```bash
   ./install_linux.sh verify
   ```

5. **訪問服務**
   - 打開瀏覽器訪問各服務地址
   - 檢查服務是否正常運行

#### macOS

1. **環境準備**
   ```bash
   # 檢查系統要求
   uname -a
   system_profiler SPHardwareDataType | grep Memory
   df -h
   
   # 安裝 Docker Desktop for Mac
   # 參考: https://docs.docker.com/desktop/install/mac-install/
   ```

2. **獲取代碼**
   ```bash
   git clone <repository-url>
   cd yfeieye
   ```

3. **執行安裝**
   ```bash
   cd .scripts/docker
   chmod +x install_mac.sh
   ./install_mac.sh install
   ```

4. **驗證部署**
   ```bash
   ./install_mac.sh verify
   ```

5. **訪問服務**
   - 打開瀏覽器訪問各服務地址
   - 檢查服務是否正常運行

#### Windows

Windows 部署請參閱專門的 [Windows 部署指南](平台Windows部署文档_zh_tw.md)，該指南提供了全面的分步說明。指南涵蓋 Windows 10/11 系統上的本地部署場景，包括：

- 環境準備和系統要求
- 中間件安裝與配置
- 服務啟動流程
- 視訊串流媒體配置
- 故障排除和常見問題

**注意**：Windows 部署指南主要關注本地部署。如需在 Windows 上進行基於 Docker 的部署，可以使用 `install_win.ps1` 腳本，詳細說明請參閱 Windows 部署指南。

### 日常運維

#### Linux/macOS

1. **啟動服務**
   ```bash
   ./install_linux.sh start    # Linux
   ./install_mac.sh start      # macOS
   ```

2. **停止服務**
   ```bash
   ./install_linux.sh stop    # Linux
   ./install_mac.sh stop      # macOS
   ```

3. **重啟服務**
   ```bash
   ./install_linux.sh restart    # Linux
   ./install_mac.sh restart      # macOS
   ```

4. **查看狀態**
   ```bash
   ./install_linux.sh status    # Linux
   ./install_mac.sh status      # macOS
   ```

5. **查看日誌**
   ```bash
   ./install_linux.sh logs    # Linux
   ./install_mac.sh logs      # macOS
   ```

#### Windows

1. **啟動服務**
   ```powershell
   .\install_win.ps1 start
   ```

2. **停止服務**
   ```powershell
   .\install_win.ps1 stop
   ```

3. **重啟服務**
   ```powershell
   .\install_win.ps1 restart
   ```

4. **查看狀態**
   ```powershell
   .\install_win.ps1 status
   ```

5. **查看日誌**
   ```powershell
   .\install_win.ps1 logs
   ```

### 更新部署

#### Linux/macOS

1. **拉取最新代碼**
   ```bash
   git pull
   ```

2. **更新服務**
   ```bash
   cd .scripts/docker
   ./install_linux.sh update    # Linux
   ./install_mac.sh update      # macOS
   ```

3. **驗證更新**
   ```bash
   ./install_linux.sh verify    # Linux
   ./install_mac.sh verify      # macOS
   ```

#### Windows

1. **拉取最新代碼**
   ```powershell
   git pull
   ```

2. **更新服務**
   ```powershell
   cd .scripts\docker
   .\install_win.ps1 update
   ```

3. **驗證更新**
   ```powershell
   .\install_win.ps1 verify
   ```

## 注意事項

1. **版本要求**: **必須**安裝 Docker v29.0.0+ 和 Docker Compose v2.35.0+，低於此版本將無法正常運行
2. **網絡要求**: 確保服務器可以訪問 Docker Hub 或配置的鏡像倉庫
3. **資源要求**: 確保服務器有足夠的 CPU、內存和磁盤空間
4. **端口衝突**: 確保所需端口未被其他服務佔用
5. **數據備份**: 生產環境部署前請做好數據備份
6. **安全配置**: 生產環境請配置防火牆和安全組規則
7. **日誌管理**: 定期清理舊日誌文件，避免磁盤空間不足

## 技術支持

如遇到問題，請：

1. 查看本文檔的 [常見問題](#常見問題) 部分
2. 查看服務日誌: `./install_all.sh logs`
3. 檢查 Docker 狀態: `docker ps -a`
4. 提交 Issue 到項目倉庫

---

**文檔版本**: 1.0  
**最後更新**: 2024-01-01  
**腳本位置**: `.scripts/docker/install_all.sh`

