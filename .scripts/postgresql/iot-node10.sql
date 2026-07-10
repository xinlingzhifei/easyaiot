--
-- PostgreSQL database dump
--

\restrict ydQCTxntCcwL3rprVBYtTQsYYuGs2TxrOzFspOo510JOjbdiuvv4Mh6xwgJW0oa

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS "iot-node20";
--
-- Name: iot-node20; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE "iot-node20" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


\unrestrict ydQCTxntCcwL3rprVBYtTQsYYuGs2TxrOzFspOo510JOjbdiuvv4Mh6xwgJW0oa
\encoding SQL_ASCII
\connect -reuse-previous=on "dbname='iot-node20'"
\restrict ydQCTxntCcwL3rprVBYtTQsYYuGs2TxrOzFspOo510JOjbdiuvv4Mh6xwgJW0oa

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: compute_node_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compute_node_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: compute_node; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compute_node (
    id bigint DEFAULT nextval('public.compute_node_id_seq'::regclass) NOT NULL,
    name character varying(64) NOT NULL,
    host character varying(128) NOT NULL,
    ssh_port integer DEFAULT 22,
    agent_port integer DEFAULT 9100,
    status character varying(16) DEFAULT 'pending'::character varying,
    node_role character varying(32) NOT NULL,
    region character varying(64),
    tags jsonb,
    capabilities jsonb,
    max_gpu_count integer DEFAULT 0,
    max_task_count integer DEFAULT 50,
    weight integer DEFAULT 100,
    agent_token character varying(128),
    remark character varying(256),
    last_heartbeat_at timestamp without time zone,
    creator character varying(64),
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updater character varying(64),
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted smallint DEFAULT 0,
    control_plane_id bigint
);


--
-- Name: COLUMN compute_node.control_plane_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compute_node.control_plane_id IS '所属中心节点（平台节点）ID';


--
-- Name: control_plane_peer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.control_plane_peer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_plane_peer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_plane_peer (
    id bigint DEFAULT nextval('public.control_plane_peer_id_seq'::regclass) NOT NULL,
    name character varying(128) NOT NULL,
    api_base_url character varying(512) NOT NULL,
    host character varying(128),
    peer_token character varying(128),
    status character varying(32) DEFAULT 'pending'::character varying,
    remote_platform_node_id bigint,
    last_sync_at timestamp without time zone,
    remark character varying(256),
    creator character varying(64),
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updater character varying(64),
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted smallint DEFAULT 0
);


--
-- Name: device_media_binding_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_media_binding_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_media_binding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_media_binding (
    id bigint DEFAULT nextval('public.device_media_binding_id_seq'::regclass) NOT NULL,
    device_id character varying(100) NOT NULL,
    srs_live_node_id bigint,
    srs_ai_node_id bigint,
    zlm_node_id bigint,
    rtmp_stream character varying(512),
    http_stream character varying(512),
    ai_rtmp_stream character varying(512),
    ai_http_stream character varying(512),
    zlm_host character varying(128),
    zlm_http_port integer,
    zlm_rtmp_port integer,
    region character varying(64),
    status character varying(16) DEFAULT 'active'::character varying,
    creator character varying(64),
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updater character varying(64),
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted smallint DEFAULT 0
);


--
-- Name: node_metric_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.node_metric_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: node_metric_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.node_metric_snapshot (
    id bigint DEFAULT nextval('public.node_metric_snapshot_id_seq'::regclass) NOT NULL,
    node_id bigint NOT NULL,
    cpu_percent numeric(5,2),
    mem_percent numeric(5,2),
    disk_percent numeric(5,2),
    gpu_info jsonb,
    active_tasks integer DEFAULT 0,
    bandwidth_mbps numeric(10,2),
    collected_at timestamp without time zone NOT NULL,
    creator character varying(64),
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updater character varying(64),
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted smallint DEFAULT 0,
    mem_used_bytes bigint,
    mem_total_bytes bigint,
    disk_used_bytes bigint,
    disk_total_bytes bigint
);


--
-- Name: node_ssh_credential_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.node_ssh_credential_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: node_ssh_credential; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.node_ssh_credential (
    id bigint DEFAULT nextval('public.node_ssh_credential_id_seq'::regclass) NOT NULL,
    node_id bigint NOT NULL,
    auth_type character varying(16) DEFAULT 'password'::character varying NOT NULL,
    username character varying(64) NOT NULL,
    credential_enc text NOT NULL,
    public_key_fp character varying(64),
    last_test_at timestamp without time zone,
    last_test_ok boolean,
    creator character varying(64),
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updater character varying(64),
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted smallint DEFAULT 0
);


--
-- Name: node_workload_binding_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.node_workload_binding_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: node_workload_binding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.node_workload_binding (
    id bigint DEFAULT nextval('public.node_workload_binding_id_seq'::regclass) NOT NULL,
    node_id bigint NOT NULL,
    workload_type character varying(32) NOT NULL,
    workload_id character varying(64) NOT NULL,
    status character varying(16) DEFAULT 'running'::character varying,
    process_pid integer,
    bind_at timestamp without time zone,
    creator character varying(64),
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updater character varying(64),
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted smallint DEFAULT 0
);


--
-- Data for Name: compute_node; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.compute_node (id, name, host, ssh_port, agent_port, status, node_role, region, tags, capabilities, max_gpu_count, max_task_count, weight, agent_token, remark, last_heartbeat_at, creator, create_time, updater, update_time, deleted, control_plane_id) FROM stdin;
\.


--
-- Data for Name: control_plane_peer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.control_plane_peer (id, name, api_base_url, host, peer_token, status, remote_platform_node_id, last_sync_at, remark, creator, create_time, updater, update_time, deleted) FROM stdin;
\.


--
-- Data for Name: device_media_binding; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.device_media_binding (id, device_id, srs_live_node_id, srs_ai_node_id, zlm_node_id, rtmp_stream, http_stream, ai_rtmp_stream, ai_http_stream, zlm_host, zlm_http_port, zlm_rtmp_port, region, status, creator, create_time, updater, update_time, deleted) FROM stdin;
\.


--
-- Data for Name: node_metric_snapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.node_metric_snapshot (id, node_id, cpu_percent, mem_percent, disk_percent, gpu_info, active_tasks, bandwidth_mbps, collected_at, creator, create_time, updater, update_time, deleted, mem_used_bytes, mem_total_bytes, disk_used_bytes, disk_total_bytes) FROM stdin;
\.


--
-- Data for Name: node_ssh_credential; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.node_ssh_credential (id, node_id, auth_type, username, credential_enc, public_key_fp, last_test_at, last_test_ok, creator, create_time, updater, update_time, deleted) FROM stdin;
\.


--
-- Data for Name: node_workload_binding; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.node_workload_binding (id, node_id, workload_type, workload_id, status, process_pid, bind_at, creator, create_time, updater, update_time, deleted) FROM stdin;
\.


--
-- Name: compute_node_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.compute_node_id_seq', 1, false);


--
-- Name: control_plane_peer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.control_plane_peer_id_seq', 1, false);


--
-- Name: device_media_binding_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.device_media_binding_id_seq', 1, false);


--
-- Name: node_metric_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.node_metric_snapshot_id_seq', 1, false);


--
-- Name: node_ssh_credential_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.node_ssh_credential_id_seq', 1, false);


--
-- Name: node_workload_binding_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.node_workload_binding_id_seq', 1, false);


--
-- Name: compute_node compute_node_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compute_node
    ADD CONSTRAINT compute_node_pkey PRIMARY KEY (id);


--
-- Name: control_plane_peer control_plane_peer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_plane_peer
    ADD CONSTRAINT control_plane_peer_pkey PRIMARY KEY (id);


--
-- Name: device_media_binding device_media_binding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_media_binding
    ADD CONSTRAINT device_media_binding_pkey PRIMARY KEY (id);


--
-- Name: node_metric_snapshot node_metric_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_metric_snapshot
    ADD CONSTRAINT node_metric_snapshot_pkey PRIMARY KEY (id);


--
-- Name: node_ssh_credential node_ssh_credential_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_ssh_credential
    ADD CONSTRAINT node_ssh_credential_pkey PRIMARY KEY (id);


--
-- Name: node_workload_binding node_workload_binding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_workload_binding
    ADD CONSTRAINT node_workload_binding_pkey PRIMARY KEY (id);


--
-- Name: idx_node_metric_node_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_node_metric_node_time ON public.node_metric_snapshot USING btree (node_id, collected_at DESC);


--
-- Name: uk_compute_node_host; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_compute_node_host ON public.compute_node USING btree (host) WHERE (deleted = 0);


--
-- Name: uk_control_plane_peer_api_base_url; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_control_plane_peer_api_base_url ON public.control_plane_peer USING btree (api_base_url) WHERE (deleted = 0);


--
-- Name: uk_device_media_binding_device; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_device_media_binding_device ON public.device_media_binding USING btree (device_id) WHERE (deleted = 0);


--
-- Name: uk_node_ssh_credential_node; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_node_ssh_credential_node ON public.node_ssh_credential USING btree (node_id) WHERE (deleted = 0);


--
-- Name: uk_node_workload; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_node_workload ON public.node_workload_binding USING btree (workload_type, workload_id) WHERE (deleted = 0);


--
-- PostgreSQL database dump complete
--

\unrestrict ydQCTxntCcwL3rprVBYtTQsYYuGs2TxrOzFspOo510JOjbdiuvv4Mh6xwgJW0oa
