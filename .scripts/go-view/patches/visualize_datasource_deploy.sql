-- 增量：为已存在的 iot-visualize20 增加数据源、服务部署表
-- docker exec -i postgres-server psql -U postgres -d iot-visualize20 < .scripts/go-view/patches/visualize_datasource_deploy.sql

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.visualize_datasource_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.visualize_deploy_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.visualize_datasource (
    id bigint DEFAULT nextval('public.visualize_datasource_seq'::regclass) NOT NULL,
    ds_name character varying(128) NOT NULL,
    ds_type character varying(32) DEFAULT 'http'::character varying NOT NULL,
    request_method character varying(16) DEFAULT 'GET'::character varying,
    request_url character varying(1024),
    request_headers text,
    request_body text,
    sql_content text,
    static_data text,
    status integer DEFAULT 0 NOT NULL,
    remarks character varying(512),
    tenant_id bigint DEFAULT 0 NOT NULL,
    creator character varying(64) DEFAULT ''::character varying,
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updater character varying(64) DEFAULT ''::character varying,
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted smallint DEFAULT 0 NOT NULL,
    CONSTRAINT visualize_datasource_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_visualize_datasource_tenant ON public.visualize_datasource (tenant_id);
CREATE INDEX IF NOT EXISTS idx_visualize_datasource_type ON public.visualize_datasource (ds_type);

CREATE TABLE IF NOT EXISTS public.visualize_deploy (
    id bigint DEFAULT nextval('public.visualize_deploy_seq'::regclass) NOT NULL,
    deploy_name character varying(128) NOT NULL,
    project_id bigint NOT NULL,
    project_name character varying(128),
    deploy_code character varying(64) NOT NULL,
    status integer DEFAULT 0 NOT NULL,
    access_path character varying(512),
    expire_time timestamp without time zone,
    remarks character varying(512),
    tenant_id bigint DEFAULT 0 NOT NULL,
    creator character varying(64) DEFAULT ''::character varying,
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updater character varying(64) DEFAULT ''::character varying,
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted smallint DEFAULT 0 NOT NULL,
    CONSTRAINT visualize_deploy_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_visualize_deploy_code'
  ) THEN
    ALTER TABLE public.visualize_deploy ADD CONSTRAINT uk_visualize_deploy_code UNIQUE (deploy_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visualize_deploy_tenant ON public.visualize_deploy (tenant_id);
CREATE INDEX IF NOT EXISTS idx_visualize_deploy_project ON public.visualize_deploy (project_id);
CREATE INDEX IF NOT EXISTS idx_visualize_deploy_status ON public.visualize_deploy (status);

COMMIT;
