-- 设备属性阈值、告警策略、关联子设备、阈值告警记录
-- 已建库先删后建（无外键依赖，按建表逆序删除）

DROP TABLE IF EXISTS public.device_associated_link;
DROP TABLE IF EXISTS public.device_threshold_alarm;
DROP TABLE IF EXISTS public.device_alarm_strategy;
DROP TABLE IF EXISTS public.device_property_threshold;

CREATE TABLE IF NOT EXISTS public.device_property_threshold (
    id                  BIGSERIAL PRIMARY KEY,
    device_identification VARCHAR(255) NOT NULL,
    property_code       VARCHAR(255) NOT NULL,
    property_name       VARCHAR(255) NULL,
    min_value           DOUBLE PRECISION NULL,
    max_value           DOUBLE PRECISION NULL,
    enabled             SMALLINT DEFAULT 1 NOT NULL,
    alarm_level         VARCHAR(32) DEFAULT 'WARNING' NOT NULL,
    remark              VARCHAR(500) NULL,
    rules_json          TEXT NULL,
    health_weight       INTEGER DEFAULT 10 NOT NULL,
    critical            SMALLINT DEFAULT 0 NOT NULL,
    tenant_id           BIGINT NOT NULL,
    create_by           VARCHAR(64) NULL,
    create_time         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_by           VARCHAR(64) NULL,
    update_time         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uk_device_property_threshold UNIQUE (device_identification, property_code)
);

CREATE INDEX IF NOT EXISTS idx_dpt_device ON public.device_property_threshold(device_identification);
CREATE INDEX IF NOT EXISTS idx_dpt_enabled ON public.device_property_threshold(device_identification, enabled);

COMMENT ON TABLE public.device_property_threshold IS '设备属性阈值配置';
COMMENT ON COLUMN public.device_property_threshold.alarm_level IS '告警级别 INFO/WARNING/CRITICAL';
COMMENT ON COLUMN public.device_property_threshold.rules_json IS '运算符阈值规则JSON数组';
COMMENT ON COLUMN public.device_property_threshold.health_weight IS '健康权重1-100';
COMMENT ON COLUMN public.device_property_threshold.critical IS '关键属性超限健康归零';

CREATE TABLE IF NOT EXISTS public.device_alarm_strategy (
    id                  BIGSERIAL PRIMARY KEY,
    device_identification VARCHAR(255) NOT NULL,
    strategy_name       VARCHAR(255) DEFAULT '默认告警策略' NOT NULL,
    enabled             SMALLINT DEFAULT 0 NOT NULL,
    notify_methods      TEXT NULL,
    notify_users        TEXT NULL,
    channels            TEXT NULL,
    silence_seconds     INTEGER DEFAULT 300 NOT NULL,
    include_offline     SMALLINT DEFAULT 1 NOT NULL,
    remark              VARCHAR(500) NULL,
    tenant_id           BIGINT NOT NULL,
    create_by           VARCHAR(64) NULL,
    create_time         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_by           VARCHAR(64) NULL,
    update_time         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uk_device_alarm_strategy UNIQUE (device_identification)
);

CREATE INDEX IF NOT EXISTS idx_das_device ON public.device_alarm_strategy(device_identification);

COMMENT ON TABLE public.device_alarm_strategy IS '设备告警策略（以设备为单位）';
COMMENT ON COLUMN public.device_alarm_strategy.notify_methods IS '通知方式JSON数组 sms/email/wxcp/ding/feishu/http';
COMMENT ON COLUMN public.device_alarm_strategy.notify_users IS '通知人JSON（由消息模板用户分组解析写入）';
COMMENT ON COLUMN public.device_alarm_strategy.channels IS '渠道模板配置JSON [{method,template_id,template_name,userless?}]';
COMMENT ON COLUMN public.device_alarm_strategy.silence_seconds IS '同类告警静默秒数';

CREATE TABLE IF NOT EXISTS public.device_threshold_alarm (
    id                  BIGSERIAL PRIMARY KEY,
    device_identification VARCHAR(255) NOT NULL,
    device_name         VARCHAR(255) NULL,
    property_code       VARCHAR(255) NOT NULL,
    property_name       VARCHAR(255) NULL,
    alarm_value         VARCHAR(255) NULL,
    min_value           DOUBLE PRECISION NULL,
    max_value           DOUBLE PRECISION NULL,
    alarm_level         VARCHAR(32) DEFAULT 'WARNING' NOT NULL,
    alarm_status        VARCHAR(32) DEFAULT 'OPEN' NOT NULL,
    message             VARCHAR(1000) NULL,
    kafka_sent          SMALLINT DEFAULT 0 NOT NULL,
    tenant_id           BIGINT NOT NULL,
    create_time         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    clear_time          TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_dta_device ON public.device_threshold_alarm(device_identification);
CREATE INDEX IF NOT EXISTS idx_dta_status ON public.device_threshold_alarm(device_identification, alarm_status);
CREATE INDEX IF NOT EXISTS idx_dta_create ON public.device_threshold_alarm(create_time);

COMMENT ON TABLE public.device_threshold_alarm IS '设备阈值告警记录';

CREATE TABLE IF NOT EXISTS public.device_associated_link (
    id                          BIGSERIAL PRIMARY KEY,
    center_device_identification VARCHAR(255) NOT NULL,
    associated_device_id         BIGINT NOT NULL,
    associated_device_identification VARCHAR(255) NOT NULL,
    sort_order                  INTEGER DEFAULT 0 NOT NULL,
    tenant_id                   BIGINT NOT NULL,
    create_time                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_time                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uk_device_associated_link UNIQUE (center_device_identification, associated_device_identification)
);

CREATE INDEX IF NOT EXISTS idx_dal_center ON public.device_associated_link(center_device_identification);
CREATE INDEX IF NOT EXISTS idx_dal_associated ON public.device_associated_link(associated_device_identification);

COMMENT ON COLUMN public.device_associated_link.associated_device_identification IS '关联设备标识';
