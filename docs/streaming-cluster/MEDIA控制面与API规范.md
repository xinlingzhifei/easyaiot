# MEDIA 控制面与 API 规范

## 1. 服务定位

**MEDIA Scheduler**（建议新建 `MEDIA/` Python FastAPI 模块）是全平台流媒体 **控制面**，职责：

- SRS / ZLM 节点注册、心跳、负载采集
- 设备 ↔ 节点 **Sticky 绑定**
- 生成推流/播放 URL
- 接收 SRS/ZLM Hook，写入 Kafka
- 与 WVP `MediaServer` Redis 键空间同步

**非职责**：音视频转码、MinIO 上传、Playback 写库（由 Upload Worker / VIDEO 完成）。

## 2. 服务部署

| 项 | 值 |
|----|-----|
| 端口 | 8090 |
| 实例数 | 3+（无状态） |
| 依赖 | PostgreSQL、Redis、Kafka |
| 注册 | Nacos `media-scheduler` |

## 3. REST API 完整规范

Base URL: `http://media-api.internal:8090/api/v1`

统一响应：

```json
{
  "code": 0,
  "msg": "success",
  "data": { }
}
```

### 3.1 节点管理

#### POST `/nodes/register`

SRS/ZLM 启动时调用，或 `register.sh` 定时心跳。

**Request**

```json
{
  "id": "srs-live-01",
  "type": "srs_live",
  "host": "10.10.20.11",
  "rtmp_port": 1935,
  "http_port": 8080,
  "api_port": 1985,
  "webrtc_port": 8000,
  "rtp_port_min": null,
  "rtp_port_max": null,
  "secret": "xxx",
  "weight": 100,
  "metadata": {
    "region": "dc-a",
    "pool": "live"
  }
}
```

`type` 枚举：`srs_live` | `srs_ai` | `zlm`

**Response**：`{ "code": 0, "data": { "ttl_sec": 30 } }`

#### POST `/nodes/heartbeat`

```json
{
  "id": "srs-live-01",
  "load": {
    "active_streams": 320,
    "publish_count": 280,
    "play_count": 450,
    "bandwidth_mbps": 2100,
    "cpu_percent": 45
  }
}
```

#### GET `/nodes`

Query: `type`, `status=online|offline|all`

#### DELETE `/nodes/{id}`

运维下线节点（需无绑定设备或已迁移）。

### 3.2 设备绑定

#### POST `/bindings/allocate`

新设备注册或批量导入时调用。

**Request**

```json
{
  "device_id": "1764341204704370850",
  "need_srs_live": true,
  "need_srs_ai": true,
  "need_zlm": false,
  "region": "dc-a"
}
```

**Response**

```json
{
  "code": 0,
  "data": {
    "device_id": "1764341204704370850",
    "srs_live_node_id": "srs-live-01",
    "srs_ai_node_id": "srs-ai-02",
    "zlm_node_id": null,
    "urls": {
      "rtmp_stream": "rtmp://10.10.20.11:1935/live/1764341204704370850",
      "http_stream": "https://stream-play.example.com/live/1764341204704370850.flv",
      "ai_rtmp_stream": "rtmp://10.10.20.21:1935/ai/1764341204704370850",
      "ai_http_stream": "https://stream-play.example.com/ai/1764341204704370850.flv"
    }
  }
}
```

#### GET `/bindings/{device_id}`

#### POST `/bindings/migrate`

**Request**

```json
{
  "device_id": "1764341204704370850",
  "reason": "node_offline",
  "target_srs_live_node_id": "srs-live-05",
  "target_srs_ai_node_id": "srs-ai-03"
}
```

迁移步骤（Scheduler 编排）：

1. 更新 DB 绑定
2. 通知 VIDEO 刷新设备 URL（Webhook 或 Nacos 配置推送）
3. 算法 Worker 下次拉配置时获取新 `ai_rtmp_stream`
4. 旧节点上 `kickoff` 该流（SRS API）

#### POST `/bindings/batch-allocate`

批量导入，body: `{ "device_ids": ["...", "..."], "need_srs_live": true, ... }`

### 3.3 URL 服务

#### GET `/urls/play`

Query: `device_id`, `format=flv|webrtc|hls`, `lane=live|ai`

#### GET `/urls/publish`

Query: `device_id`, `lane=live|ai`

VIDEO `camera_service._default_stream_urls()` 改造为调用此接口。

### 3.4 Hook 入口（SRS / ZLM 调用）

#### POST `/hook/srs/on_publish`

- 校验 `device_id` 是否已注册、是否允许推流
- 可选：流冲突处理（迁移现网 `on_publish_callback` 逻辑）
- 更新 Redis `media:stream:{app}:{stream}`
- **必须快速返回** `{ "code": 0 }`

#### POST `/hook/srs/on_unpublish`

清理 Redis 流状态。

#### POST `/hook/srs/on_dvr`

**Request**（SRS 原始 body）

```json
{
  "action": "on_dvr",
  "app": "live",
  "stream": "1764341204704370850",
  "file": "/mnt/easyaiot-media/playbacks/live/1764341204704370850/2026/06/04/1717488000123.flv",
  "cwd": "/",
  "url": "rtmp://..."
}
```

**处理**：

1. 规范化路径（兼容 `/data` → GlusterFS 映射）
2. 写 Kafka `media.dvr.completed`
3. 返回 `{ "code": 0 }`（< 50ms）

**Kafka Message**

```json
{
  "event_id": "uuid",
  "device_id": "1764341204704370850",
  "app": "live",
  "stream": "1764341204704370850",
  "file_path": "/mnt/easyaiot-media/playbacks/live/.../xxx.flv",
  "media_node_id": "srs-live-01",
  "segment_start_ms": 1717488000123,
  "created_at": "2026-06-04T12:00:00Z"
}
```

Partition key: `device_id`（保证同设备有序）。

#### POST `/hook/zlm/on_record_mp4` / `on_record_ts`

与 SRS 类似，统一为 `media.dvr.completed` 事件（增加 `source: zlm` 字段）。

### 3.5 运维 API

| API | 说明 |
|-----|------|
| GET `/stats/overview` | 集群总览：节点数、流数、队列 lag |
| GET `/stats/node/{id}` | 单节点详情 |
| POST `/admin/rebalance` | 手动触发负载再平衡（慎用） |
| POST `/admin/sync-wvp` | 从 WVP Redis 同步 ZLM 节点 |

## 4. 数据库 Schema（PostgreSQL）

```sql
CREATE SCHEMA IF NOT EXISTS media;

CREATE TABLE media.media_node (
    id              VARCHAR(64) PRIMARY KEY,
    type            VARCHAR(16) NOT NULL,
    host            VARCHAR(255) NOT NULL,
    rtmp_port       INT NOT NULL DEFAULT 1935,
    http_port       INT NOT NULL DEFAULT 8080,
    api_port        INT NOT NULL DEFAULT 1985,
    webrtc_port     INT DEFAULT 8000,
    rtp_port_min    INT,
    rtp_port_max    INT,
    secret          VARCHAR(128),
    weight          INT NOT NULL DEFAULT 100,
    region          VARCHAR(32),
    pool            VARCHAR(32),
    status          VARCHAR(16) NOT NULL DEFAULT 'online',
    last_heartbeat  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE media.device_media_binding (
    device_id           VARCHAR(64) PRIMARY KEY,
    srs_live_node_id    VARCHAR(64) REFERENCES media.media_node(id),
    srs_ai_node_id      VARCHAR(64) REFERENCES media.media_node(id),
    zlm_node_id         VARCHAR(64) REFERENCES media.media_node(id),
    version             INT NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE media.stream_session (
    id              BIGSERIAL PRIMARY KEY,
    app             VARCHAR(32) NOT NULL,
    stream          VARCHAR(128) NOT NULL,
    device_id       VARCHAR(64),
    media_node_id   VARCHAR(64) NOT NULL,
    state           VARCHAR(16) NOT NULL,
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    UNIQUE(app, stream, media_node_id)
);

CREATE INDEX idx_binding_srs_live ON media.device_media_binding(srs_live_node_id);
CREATE INDEX idx_binding_zlm ON media.device_media_binding(zlm_node_id);
```

## 5. Redis 键设计

| Key | 类型 | 说明 |
|-----|------|------|
| `media:nodes:online:srs_live` | ZSet | score=综合负载 |
| `media:nodes:online:srs_ai` | ZSet | |
| `media:nodes:online:zlm` | ZSet | |
| `media:node:{id}` | Hash | 节点详情缓存 |
| `media:stream:{app}:{stream}` | Hash | 当前流所在节点 |
| `media:binding:{device_id}` | Hash | 绑定缓存 |

### 与 WVP 同步

WVP 现有键（参考 `VideoManagerConstants.ONLINE_MEDIA_SERVERS_PREFIX`）：

- 方案 A：**MEDIA 写 WVP 格式**，WVP 无感
- 方案 B：WVP 改调 MEDIA API（Phase 2）

同步字段映射：

| WVP MediaServer | MEDIA media_node |
|-----------------|------------------|
| id | id |
| ip | host |
| httpPort | http_port |
| rtmpPort | rtmp_port |
| secret | secret |
| rtpEnable | rtp_port_min/max 非空 |

## 6. 负载算法

```
score = w1 * active_streams + w2 * bandwidth_mbps/100 + w3 * cpu_percent
```

默认 `w1=1.0, w2=0.5, w3=0.3`

分配节点：ZSet `ZRANGEBYSCORE` 取最低；若最低分节点 `active_streams > SOFT_LIMIT`（如 450），继续向下取；全部超限则拒绝并告警。

## 7. MEDIA 模块目录结构（建议）

```
MEDIA/
├── run.py
├── requirements.txt
├── app/
│   ├── __init__.py
│   ├── config/
│   ├── models/           # SQLAlchemy
│   ├── api/
│   │   ├── nodes.py
│   │   ├── bindings.py
│   │   ├── urls.py
│   │   └── hooks.py
│   ├── services/
│   │   ├── allocator.py
│   │   ├── wvp_sync.py
│   │   └── kafka_producer.py
│   └── utils/
├── services/
│   └── upload_worker/    # 见 03 文档
└── deploy/
    └── Dockerfile
```

## 8. VIDEO 集成：`media_client.py` 伪代码

```python
class MediaClient:
    def __init__(self, base_url: str, timeout=3):
        self.base_url = base_url.rstrip('/')

    def allocate_device(self, device_id: str, need_zlm: bool = False) -> dict:
        r = requests.post(f'{self.base_url}/api/v1/bindings/allocate', json={
            'device_id': device_id,
            'need_srs_live': True,
            'need_srs_ai': True,
            'need_zlm': need_zlm,
        }, timeout=self.timeout)
        r.raise_for_status()
        return r.json()['data']

    def get_play_urls(self, device_id: str) -> dict:
        r = requests.get(f'{self.base_url}/api/v1/urls/play', params={'device_id': device_id})
        return r.json()['data']
```

在 `create_device` / `register_camera` 成功后调用 `allocate_device`，将返回的 `urls` 写入 `Device.rtmp_stream` 等字段。

## 9. 环境变量

```bash
MEDIA_SCHEDULER_URL=http://media-api.internal:8090
MEDIA_SCHEDULER_ENABLED=true
MEDIA_FALLBACK_LOCAL_SRS=false   # 集群模式必须 false
KAFKA_BROKERS=kafka1:9092,kafka2:9092
KAFKA_TOPIC_DVR=media.dvr.completed
KAFKA_TOPIC_SNAP=media.snap.completed
REDIS_URL=redis://...
DATABASE_URL=postgresql://...
```

## 10. 错误码

| code | 含义 |
|------|------|
| 0 | 成功 |
| 40001 | 无可用媒体节点 |
| 40002 | 设备未绑定 |
| 40003 | 节点不存在 |
| 40004 | Hook 签名校验失败 |
| 50001 | Kafka 写入失败 |
