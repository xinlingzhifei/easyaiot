-- VISUALIZE 大屏管理菜单（WEB 动态路由）
-- 执行库：ruoyi-vue-pro20（system 库）
-- 用法示例：
--   docker exec -i postgres-server psql -U postgres -d ruoyi-vue-pro20 < .scripts/go-view/patches/visualize_menu.sql

BEGIN;

-- 目录：可视化管理
INSERT INTO system_menu (
  id, name, permission, type, sort, parent_id, path, icon, component, component_name,
  status, visible, keep_alive, always_show, creator, create_time, updater, update_time, deleted
) VALUES (
  3100, '可视化管理', '', 1, 46, 0, '/visualize', 'ant-design:fund-projection-screen-outlined', NULL, NULL,
  0, true, true, true, '1', NOW(), '1', NOW(), 0
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  sort = EXCLUDED.sort,
  visible = EXCLUDED.visible,
  update_time = NOW();

-- 菜单：可视化管理（Tabs：项目/模板/素材/数据源/服务部署；项目含大屏与组态）
INSERT INTO system_menu (
  id, name, permission, type, sort, parent_id, path, icon, component, component_name,
  status, visible, keep_alive, always_show, creator, create_time, updater, update_time, deleted
) VALUES (
  3101, '可视化管理', 'visualize:project:query', 2, 1, 3100, 'index',
  'ant-design:appstore-outlined', 'visualize/index', 'Visualize',
  0, true, true, true, '1', NOW(), '1', NOW(), 0
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  permission = EXCLUDED.permission,
  parent_id = EXCLUDED.parent_id,
  path = EXCLUDED.path,
  component = EXCLUDED.component,
  component_name = EXCLUDED.component_name,
  visible = EXCLUDED.visible,
  update_time = NOW();

-- 按钮权限：项目
INSERT INTO system_menu (
  id, name, permission, type, sort, parent_id, path, icon, component, component_name,
  status, visible, keep_alive, always_show, creator, create_time, updater, update_time, deleted
) VALUES
  (3102, '项目查询', 'visualize:project:query', 3, 1, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3103, '项目创建', 'visualize:project:create', 3, 2, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3104, '项目更新', 'visualize:project:update', 3, 3, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3105, '项目删除', 'visualize:project:delete', 3, 4, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3106, '项目发布', 'visualize:project:publish', 3, 5, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  -- 模板
  (3107, '模板查询', 'visualize:template:query', 3, 10, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3108, '模板创建', 'visualize:template:create', 3, 11, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3109, '模板更新', 'visualize:template:update', 3, 12, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3110, '模板删除', 'visualize:template:delete', 3, 13, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  -- 素材
  (3111, '素材查询', 'visualize:asset:query', 3, 20, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3112, '素材创建', 'visualize:asset:create', 3, 21, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3113, '素材更新', 'visualize:asset:update', 3, 22, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3114, '素材删除', 'visualize:asset:delete', 3, 23, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  -- 数据源
  (3115, '数据源查询', 'visualize:datasource:query', 3, 30, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3116, '数据源创建', 'visualize:datasource:create', 3, 31, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3117, '数据源更新', 'visualize:datasource:update', 3, 32, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3118, '数据源删除', 'visualize:datasource:delete', 3, 33, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  -- 服务部署
  (3119, '部署查询', 'visualize:deploy:query', 3, 40, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3120, '部署创建', 'visualize:deploy:create', 3, 41, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3121, '部署更新', 'visualize:deploy:update', 3, 42, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3122, '部署删除', 'visualize:deploy:delete', 3, 43, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3123, '部署上线', 'visualize:deploy:online', 3, 44, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3124, '部署下线', 'visualize:deploy:offline', 3, 45, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  permission = EXCLUDED.permission,
  parent_id = EXCLUDED.parent_id,
  update_time = NOW();

-- 赋权超级管理员（role_id=1）
INSERT INTO system_role_menu (id, role_id, menu_id, creator, create_time, updater, update_time, deleted, tenant_id)
SELECT nextval('system_role_menu_seq'), 1, m.id, '1', NOW(), '1', NOW(), 0, 1
FROM system_menu m
WHERE m.id BETWEEN 3100 AND 3124
  AND NOT EXISTS (
    SELECT 1 FROM system_role_menu rm WHERE rm.role_id = 1 AND rm.menu_id = m.id AND rm.deleted = 0
  );

-- 隐藏旧 go-view / visualis 菜单（若存在）
UPDATE system_menu
SET visible = false, update_time = NOW()
WHERE id IN (2153, 2958, 2959) AND deleted = 0;

SELECT setval('system_menu_seq', GREATEST((SELECT MAX(id) FROM system_menu), 3124), true);

COMMIT;
