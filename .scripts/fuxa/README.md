# yFeiEye FUXA 组态演示工程

## 内容

工程文件 `easyaiot_scada_demo.fuxap` 含 **4 套高质量中文组态画面**（基于 FUXA 官方演示工艺图增强）：

| 画面名 | 说明 |
|--------|------|
| 水厂工艺总貌 | 水处理工艺：罐体 / 管线 / 阀门 |
| 产线运行看板 | 产线 KPI、电机与阀组状态 |
| 厂区管网组态 | 厂区管网拓扑（高细节工艺图） |
| 配电室电力监视 | 配电室负荷与开关监视 |

封面图位于 `WEB/public/resource/visualize-demo/scada-*-cover.svg`。

## 导入

```bash
# 1) FUXA 画面（需 fuxa-server 已启动）
bash .scripts/fuxa/seed_fuxa_demo.sh

# 2) 平台侧大屏×4 + 组态×4 元数据
bash .scripts/go-view/seed_visualize_demo.sh
```

默认 FUXA 账号：`admin` / `123456`（请在生产环境立即修改）。

平台项目 `editor_ref` 与画面名一致；预览打开对应运行态画面，编辑器打开时会写入 FUXA
`localStorage['@frango.webeditor.currentview']` 以自动选中该画面。

大屏 content 重新生成（纯 Python，秒级；勿用浏览器截图 gen）：

```bash
python3 .scripts/go-view/gen_visualize_dashboard_demo.py
```
## yFeiEye 免登跳转（SSO）

已开启 FUXA `secureEnabled` 时，平台通过代登录 + 同源桥接页免登进入：

1. 前端调用 `GET /visualize/project/fuxa-open?id=&mode=edit|preview`
2. 后端向 FUXA `/api/signin` 获取 token
3. 浏览器打开 `http://<fuxa>/easyaiot-sso.html?token=...&mode=...&view=...`
4. 桥接页写入 `sessionStorage.currentUser` 后跳转 `/editor` 或 `/home?view=...`

相关文件：

- 桥接页：`.scripts/fuxa/easyaiot-sso.html`（compose 挂载到 FUXA `client/dist`）
- 配置：`iot.fuxa.*`（`DEVICE/iot-visualize/.../application.yaml`）
- FUXA 鉴权：`fuxa_data/appdata/settings.js` 中 `secureEnabled` / `secretCode`
