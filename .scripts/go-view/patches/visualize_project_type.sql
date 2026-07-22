-- 增量：visualize_project 支持组态（FUXA）项目类型
-- 执行库：iot-visualize20
-- 用法示例：
--   docker exec -i postgres-server psql -U postgres -d iot-visualize20 < .scripts/go-view/patches/visualize_project_type.sql

BEGIN;

ALTER TABLE public.visualize_project
    ADD COLUMN IF NOT EXISTS project_type character varying(32) DEFAULT 'dashboard'::character varying NOT NULL;

ALTER TABLE public.visualize_project
    ADD COLUMN IF NOT EXISTS editor_ref character varying(256);

COMMENT ON TABLE public.visualize_project IS 'VISUALIZE 可视化项目（大屏 / 组态）';
COMMENT ON COLUMN public.visualize_project.project_type IS '项目类型：dashboard 大屏，scada 组态（FUXA）';
COMMENT ON COLUMN public.visualize_project.content IS '画布 JSON（大屏 ChartEditStorage；组态可为空）';
COMMENT ON COLUMN public.visualize_project.editor_ref IS '外部编辑器引用（组态可选：FUXA 画面名或相对路径）';

UPDATE public.visualize_project
SET project_type = 'dashboard'
WHERE project_type IS NULL OR project_type = '';

CREATE INDEX IF NOT EXISTS idx_visualize_project_type ON public.visualize_project (project_type);

COMMIT;
