# 自动化标注功能说明

> **详细设计文档**：[docs/AUTO_LABEL_DESIGN.md](docs/AUTO_LABEL_DESIGN.md)（架构、API、数据模型、部署、故障排查、前端易用性）  
> 本文档为快速上手指南。

## 功能概述

已实现完整的自动化标注功能，包括：

1. 数据库表结构设计（`auto_label_task` / `auto_label_result`）
2. 后端 Python Flask API（`app/blueprints/auto_label.py`）
3. 前端统一标注平台（`AnnotationTool` + `AILabelModal`）
4. 导入/导出（iot-dataset `/annotation/*`）

## 快速使用

1. **导入图片**：数据集详情 → 标注工具 →「添加」→ 导入/上传
2. **部署模型**：训练中心 → 模型部署（`/train?tab=4`）→ 部署并**启动**推理服务
3. **批量标注**：标注工具顶栏 →「AI 标注」→ 选择服务 → 开启
4. **查看进度**：顶栏与进度条显示 `已处理/总数`
5. **验收修正**：抽查误检 → 划分用途 → 同步 Minio → 导出/训练

## 后端 API 摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/model/dataset/dataset/{id}/auto-label/start` | 启动批量任务 |
| GET | `/model/dataset/dataset/{id}/auto-label/task/{task_id}` | 查询进度 |
| GET | `/model/dataset/dataset/{id}/auto-label/tasks` | 任务列表 |
| POST | `/model/dataset/dataset/{id}/auto-label/image/{image_id}` | 单张标注（前端待接入） |
| GET | `/model/deploy_service/list?status=running` | 可选推理服务 |

网关完整路径前缀：`/admin-api/model/...`

## 前端组件

| 组件 | 路径 |
|------|------|
| 标注主界面 | `WEB/src/views/dataset/components/AnnotationTool/index.vue` |
| AI 弹窗 | `WEB/src/views/dataset/components/AutoLabel/AILabelModal/index.vue` |
| 导入 | `AutoLabel/ImportDatasetModal/index.vue` |
| 导出 | `AutoLabel/ExportDatasetModal/index.vue` |
| API | `WEB/src/api/device/auto-label.ts` |

> 独立服务 `AI/services/auto-labeling`（端口 8000）已弃用。

## 配置

```bash
# AI model-server .env
JAVA_BACKEND_URL=http://iot-gateway:48080   # 或 Java 网关地址
```

数据库表见 `.scripts/postgresql/iot-ai10.sql`，或由 `db.create_all()` 自动创建。

## 注意事项

1. **必须先有 running 状态的部署服务**，否则 AI 标注无法启动
2. **Nacos** 需能发现模型推理实例（`ClusterInferenceService`）
3. **标注格式** 与手工标注一致（归一化矩形 + `label` 类别名）
4. **任务完成后** 前端会自动同步数据集标签（从标注扫描创建）
5. Java `POST /dataset/{id}/auto-label` 为空桩，**请勿使用**；请走 model-server 接口

## 相关文档

- [详细设计文档](docs/AUTO_LABEL_DESIGN.md)
- [AI 模块 README](README.md)
