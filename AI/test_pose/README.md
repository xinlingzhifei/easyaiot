# 姿态分析测试

## 测试素材（fixtures）

| 文件 | 说明 |
|------|------|
| `fixtures/pose_sample.jpg` | 含多人的公交场景图（ultralytics 官方样例 bus.jpg） |
| `fixtures/pose_sample.mp4` | 3 秒测试视频（由样例图生成，用于验证视频流水线） |

可自行替换为任意含人物的图片/视频进行测试。

## 快速运行

```bash
cd AI
python test_pose/test_pose_inference.py
```

## 指定文件

```bash
python test_pose/test_pose_inference.py \
  --image test_pose/fixtures/pose_sample.jpg \
  --video test_pose/fixtures/pose_sample.mp4 \
  --model yolo26n-pose.pt
```

## 仅测图片

```bash
python test_pose/test_pose_inference.py --skip-video
```

## 顺带测 HTTP API（需先启动 AI 服务）

```bash
python run.py
# 另开终端
python test_pose/test_pose_inference.py --api http://127.0.0.1:5000
```

## 输出（output）

| 文件 | 说明 |
|------|------|
| `output/pose_image_result.jpg` | 图片姿态骨架标注图 |
| `output/pose_image_result.json` | 图片关键点 JSON |
| `output/pose_video_result.mp4` | 视频姿态输出 |
| `output/pose_video_result.json` | 视频处理统计 |

## 前端联调

1. 启动 AI 服务：`cd AI && python run.py`
2. WEB → 训练 → 模型推理 → 分析类型选 **姿态分析**
3. 上传 `fixtures/pose_sample.jpg` 或 `fixtures/pose_sample.mp4` 测试
