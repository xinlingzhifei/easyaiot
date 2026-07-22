--
-- PostgreSQL database dump for iot-visualize20
-- VISUALIZE companion backend (independent database)
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS "iot-visualize20";
--
-- Name: iot-visualize20; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE "iot-visualize20" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';

\connect -reuse-previous=on "dbname='iot-visualize20'"

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = heap;

--
-- Sequences
--

CREATE SEQUENCE public.visualize_project_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.visualize_template_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.visualize_asset_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.visualize_datasource_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.visualize_deploy_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: visualize_project; Type: TABLE
--

CREATE TABLE public.visualize_project (
    id bigint DEFAULT nextval('public.visualize_project_seq'::regclass) NOT NULL,
    project_name character varying(128) NOT NULL,
    project_type character varying(32) DEFAULT 'dashboard'::character varying NOT NULL,
    state integer DEFAULT '-1'::integer NOT NULL,
    index_image character varying(512),
    remarks character varying(512),
    content text,
    editor_ref character varying(256),
    tenant_id bigint DEFAULT 0 NOT NULL,
    creator character varying(64) DEFAULT ''::character varying,
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updater character varying(64) DEFAULT ''::character varying,
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted smallint DEFAULT 0 NOT NULL,
    CONSTRAINT visualize_project_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.visualize_project IS 'VISUALIZE 可视化项目（大屏 / 组态）';
COMMENT ON COLUMN public.visualize_project.project_name IS '项目名称';
COMMENT ON COLUMN public.visualize_project.project_type IS '项目类型：dashboard 大屏，scada 组态（FUXA）';
COMMENT ON COLUMN public.visualize_project.state IS '发布状态：-1 未发布，1 已发布';
COMMENT ON COLUMN public.visualize_project.index_image IS '缩略图 URL';
COMMENT ON COLUMN public.visualize_project.remarks IS '备注';
COMMENT ON COLUMN public.visualize_project.content IS '画布 JSON（大屏 ChartEditStorage；组态可为空）';
COMMENT ON COLUMN public.visualize_project.editor_ref IS '外部编辑器引用（组态可选：FUXA 画面名或相对路径）';

CREATE INDEX idx_visualize_project_tenant ON public.visualize_project (tenant_id);
CREATE INDEX idx_visualize_project_name ON public.visualize_project (project_name);
CREATE INDEX idx_visualize_project_type ON public.visualize_project (project_type);

--
-- Name: visualize_template; Type: TABLE
--

CREATE TABLE public.visualize_template (
    id bigint DEFAULT nextval('public.visualize_template_seq'::regclass) NOT NULL,
    template_name character varying(128) NOT NULL,
    category character varying(64),
    cover_image character varying(512),
    remarks character varying(512),
    content text,
    sort integer DEFAULT 0 NOT NULL,
    tenant_id bigint DEFAULT 0 NOT NULL,
    creator character varying(64) DEFAULT ''::character varying,
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updater character varying(64) DEFAULT ''::character varying,
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted smallint DEFAULT 0 NOT NULL,
    CONSTRAINT visualize_template_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.visualize_template IS 'VISUALIZE 模板市场';
COMMENT ON COLUMN public.visualize_template.template_name IS '模板名称';
COMMENT ON COLUMN public.visualize_template.category IS '分类';
COMMENT ON COLUMN public.visualize_template.cover_image IS '封面图 URL';
COMMENT ON COLUMN public.visualize_template.content IS '模板画布 JSON';

CREATE INDEX idx_visualize_template_tenant ON public.visualize_template (tenant_id);
CREATE INDEX idx_visualize_template_category ON public.visualize_template (category);

--
-- Name: visualize_asset; Type: TABLE
--

CREATE TABLE public.visualize_asset (
    id bigint DEFAULT nextval('public.visualize_asset_seq'::regclass) NOT NULL,
    asset_name character varying(256) NOT NULL,
    asset_type character varying(32) DEFAULT 'image'::character varying NOT NULL,
    file_url character varying(1024) NOT NULL,
    file_size bigint,
    remarks character varying(512),
    tenant_id bigint DEFAULT 0 NOT NULL,
    creator character varying(64) DEFAULT ''::character varying,
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updater character varying(64) DEFAULT ''::character varying,
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted smallint DEFAULT 0 NOT NULL,
    CONSTRAINT visualize_asset_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.visualize_asset IS 'VISUALIZE 用户素材库';
COMMENT ON COLUMN public.visualize_asset.asset_name IS '素材名称';
COMMENT ON COLUMN public.visualize_asset.asset_type IS '素材类型：image 等';
COMMENT ON COLUMN public.visualize_asset.file_url IS '文件 URL';

CREATE INDEX idx_visualize_asset_tenant ON public.visualize_asset (tenant_id);
CREATE INDEX idx_visualize_asset_type ON public.visualize_asset (asset_type);

--
-- Name: visualize_datasource; Type: TABLE
--

CREATE TABLE public.visualize_datasource (
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

COMMENT ON TABLE public.visualize_datasource IS 'VISUALIZE 数据源';
COMMENT ON COLUMN public.visualize_datasource.ds_name IS '数据源名称';
COMMENT ON COLUMN public.visualize_datasource.ds_type IS '类型：http/sql/static/device';
COMMENT ON COLUMN public.visualize_datasource.status IS '状态：0 启用，1 停用';

CREATE INDEX idx_visualize_datasource_tenant ON public.visualize_datasource (tenant_id);
CREATE INDEX idx_visualize_datasource_type ON public.visualize_datasource (ds_type);

--
-- Name: visualize_deploy; Type: TABLE
--

CREATE TABLE public.visualize_deploy (
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
    CONSTRAINT visualize_deploy_pkey PRIMARY KEY (id),
    CONSTRAINT uk_visualize_deploy_code UNIQUE (deploy_code)
);

COMMENT ON TABLE public.visualize_deploy IS 'VISUALIZE 服务部署（大屏投放）';
COMMENT ON COLUMN public.visualize_deploy.deploy_name IS '部署名称';
COMMENT ON COLUMN public.visualize_deploy.project_id IS '关联大屏项目 ID';
COMMENT ON COLUMN public.visualize_deploy.deploy_code IS '投放编码（对外唯一）';
COMMENT ON COLUMN public.visualize_deploy.status IS '状态：0 草稿，1 已上线，2 已下线';
COMMENT ON COLUMN public.visualize_deploy.access_path IS '访问路径（相对预览地址）';

CREATE INDEX idx_visualize_deploy_tenant ON public.visualize_deploy (tenant_id);
CREATE INDEX idx_visualize_deploy_project ON public.visualize_deploy (project_id);
CREATE INDEX idx_visualize_deploy_status ON public.visualize_deploy (status);
