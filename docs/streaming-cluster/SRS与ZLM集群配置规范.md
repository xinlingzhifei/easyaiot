# SRS 与 ZLM 集群配置规范

## 1. 节点池与命名

| 节点 ID 前缀 | 类型 | App | 示例 |
|--------------|------|-----|------|
| `srs-live-` | srs_live | live | srs-live-01 |
| `srs-ai-` | srs_ai | ai | srs-ai-01 |
| `zlm-gb-` | zlm | - | zlm-gb-01 |

## 2. SRS 集群配置

模板文件：`.scripts/media-cluster/srs/cluster.conf.template`

### 2.1 完整配置要点

```nginx
listen              1935;
max_connections     500;
daemon              off;              # Docker 前台运行
srs_log_tank        file;
srs_log_file        /mnt/easyaiot-media/logs/srs-${MEDIA_NODE_ID}.log;

http_api {
    enabled         on;
    listen          1985;
}

http_server {
    enabled         on;
    listen          8080;
}

rtc_server {
    enabled         on;
    listen          8000;
    candidate       ${SRS_CANDIDATE_IP};
}

vhost __defaultVhost__ {
    tcp_nodelay     on;
    min_latency     on;

    play {
        gop_cache       off;
        queue_length    10;
    }

    publish {
        mr              off;
    }

    http_remux {
        enabled         on;
        mount           [vhost]/[app]/[stream].flv;
    }

    rtc {
        enabled         on;
        rtmp_to_rtc     on;
        rtc_to_rtmp     on;
    }

    dvr {
        enabled             on;
        dvr_path            /mnt/easyaiot-media/playbacks/[app]/[stream]/[2006]/[01]/[02]/[timestamp].flv;
        dvr_plan            segment;
        dvr_duration        60;          # 2万路建议 60~120s，降低文件数
        dvr_wait_keyframe   on;
        time_jitter         full;
    }

    http_hooks {
        enabled             on;
        on_publish          http://${MEDIA_SCHEDULER_HOST}:8090/api/v1/hook/srs/on_publish;
        on_unpublish        http://${MEDIA_SCHEDULER_HOST}:8090/api/v1/hook/srs/on_unpublish;
        on_dvr              http://${MEDIA_SCHEDULER_HOST}:8090/api/v1/hook/srs/on_dvr;
    }
}
```

### 2.2 与现网差异

| 项 | 现网 `.scripts/srs/conf/docker.conf` | 集群 |
|----|----------------------------------------|------|
| max_connections | 1000 | 500/节点 × N 节点 |
| dvr_path | /data/playbacks | GlusterFS 挂载路径 |
| on_dvr | localhost:48080 → VIDEO | MEDIA Scheduler |
| dvr_duration | 30 | 60~120（可配置） |
| network | host | host（保持） |

### 2.3 Docker 运行（单节点）

见 `.scripts/media-cluster/docker-compose.media-node.yml`

关键：

```yaml
network_mode: host
volumes:
  - /mnt/easyaiot-media/playbacks:/mnt/easyaiot-media/playbacks:rw
  - /mnt/easyaiot-media/logs:/mnt/easyaiot-media/logs:rw
  - ./srs/cluster.conf:/usr/local/srs/conf/docker.conf:ro
environment:
  MEDIA_NODE_ID: srs-live-01
  MEDIA_SCHEDULER_HOST: 10.10.40.10
  SRS_CANDIDATE_IP: 10.10.20.11
```

### 2.4 节点注册

启动后执行 `.scripts/media-cluster/srs/register.sh`（或 systemd timer 每 20s 心跳）。

## 3. ZLMediaKit 集群配置

模板：`.scripts/media-cluster/zlm/config.ini.template`

### 3.1 关键段落

```ini
[api]
secret=${ZLM_SECRET}

[general]
enableVhost=0
mediaServerId=${MEDIA_NODE_ID}

[http]
port=80

[rtmp]
port=10935

[rtsp]
port=5540

[rtp]
port=10000

[multicast]
udpTTL=64

[hook]
enable=1
on_publish=http://${MEDIA_SCHEDULER_HOST}:8090/api/v1/hook/zlm/on_publish
on_stream_changed=http://${MEDIA_SCHEDULER_HOST}:8090/api/v1/hook/zlm/on_stream_changed
on_record_mp4=http://${MEDIA_SCHEDULER_HOST}:8090/api/v1/hook/zlm/on_record_mp4
timeoutSec=10
alive_interval=30

[protocol]
enable_rtmp=1
enable_rtsp=1
enable_hls=0
enable_mp4=0
gop_cache=0
modify_stamp=1

[cluster]
origin_url=
timeout_sec=15

[record]
appName=record
sampleMS=500
filePath=/mnt/easyaiot-media/playbacks/gb28181/
```

### 3.2 RTP 多端口

```ini
[rtp_proxy]
port_range=30000-30500
```

每节点 500 端口；**禁止多节点端口重叠**。节点 `zlm-gb-01` 用 30000-30500，`zlm-gb-02` 用 30501-31000，以此类推。

### 3.3 与 WVP 集成

`DEVICE/iot-gb28181/.../application.yaml`：

```yaml
media:
  id: zlm-gb-01          # 与 MEDIA 节点 ID 一致
  ip: 10.10.20.101
  http-port: 6080        # 若 Docker 映射 6080:80
  secret: xxx
  rtp:
    enable: true
    port-range: 30000,30500
```

WVP `MediaServerServiceImpl.getMediaServerForMinimumLoad()` 从 Redis 选节点 → Phase 2 改为 MEDIA API。

### 3.4 ZLM → SRS 转推（推荐）

国标点播成功后，ZLM 执行 FFmpeg 或内置 forward：

```
rtmp://10.10.20.11:1935/live/{device_id}
```

使 WEB 播放器 **只对接 SRS HTTP-FLV**，国标细节对前端透明。

配置方式：WVP 点播回调 或 ZLM `on_stream_changed` Hook 触发 REST API 开始 forward。

## 4. Media Edge Nginx

模板：`.scripts/media-cluster/nginx/media-edge.conf.template`

### 4.1 播放 upstream（动态 map）

```nginx
# 需 lua 或 njs 查 MEDIA API；静态 POC 可用 map
map $device_id $srs_live_backend {
    default 10.10.20.11:8080;
    # 生产由 openapi 生成 include devices.map.conf
}

server {
    listen 443 ssl;
    server_name stream-play.example.com;

    location ~ ^/live/(?<device_id>[^/.]+)\.flv$ {
        proxy_pass http://$srs_live_backend/live/$device_id.flv;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    location ~ ^/ai/(?<device_id>[^/.]+)\.flv$ {
        # 类似，指向 srs_ai 节点
    }
}
```

### 4.2 SRS API 运维代理

```nginx
location /dev-api/srs/ {
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://srs-api-internal:1985/;
}
```

替换现网 `WEB/conf/nginx.conf` 中 `srs-host:1985`。

## 5. 推流鉴权（可选增强）

现网 `on_publish` 在 VIDEO 做流冲突检测。集群化后：

1. MEDIA Hook 校验 `device_id` 存在于 DB
2. 可选 RTMP URL 带 token：`rtmp://.../live/{id}?token=xxx`
3. SRS `refer` 或自定义 `on_publish` 返回 403

## 6. 节点故障行为

| 故障 | 检测 | 动作 |
|------|------|------|
| SRS 宕机 | 心跳 30s 丢失 | 标记 offline，新绑定停止分配 |
| 已有设备 | 推流失败 | VIDEO 算法重连 + Scheduler migrate API |
| ZLM RTP 端口耗尽 | API 监控 | 告警，扩容新 ZLM 节点 |
| GlusterFS 不可写 | SRS dvr 失败 | 节点 drain，告警 |

## 7. 单节点容量基线（压测得出）

| 指标 | 目标值 |
|------|--------|
| 并发 publish | 400~500 |
| 并发 play | 800~1000 |
| 出口带宽 | 8~10 Gbps |
| CPU | < 70% @ 400 路 |

**低于基线不扩容，高于 80% 触发扩容。**

## 8. 版本与镜像

| 组件 | 现网镜像 | 建议 |
|------|----------|------|
| SRS | ossrs/srs:5 | 固定 minor 版本，集群统一 |
| ZLM | zlmediakit/zlmediakit:master | **改固定 tag**，避免 master 漂移 |

## 9. 配置变更流程

1. 修改 `*.template`
2. Ansible 渲染到各节点
3. `docker compose restart` 滚动重启（每次 < 5% 节点）
4. 验证 Hook + 推流 + DVR + Upload 全链路
