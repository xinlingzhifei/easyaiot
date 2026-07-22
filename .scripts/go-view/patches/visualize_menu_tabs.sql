-- 增量：补充大屏管理模板/素材/数据源/服务部署按钮权限（已执行过旧版 visualize_menu.sql 时使用）
-- docker exec -i postgres-server psql -U postgres -d ruoyi-vue-pro20 < .scripts/go-view/patches/visualize_menu_tabs.sql

BEGIN;

UPDATE system_menu
SET name = '大屏管理', update_time = NOW()
WHERE id IN (3100, 3101) AND deleted = 0;

INSERT INTO system_menu (
  id, name, permission, type, sort, parent_id, path, icon, component, component_name,
  status, visible, keep_alive, always_show, creator, create_time, updater, update_time, deleted
) VALUES
  (3107, '模板查询', 'visualize:template:query', 3, 10, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3108, '模板创建', 'visualize:template:create', 3, 11, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3109, '模板更新', 'visualize:template:update', 3, 12, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3110, '模板删除', 'visualize:template:delete', 3, 13, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3111, '素材查询', 'visualize:asset:query', 3, 20, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3112, '素材创建', 'visualize:asset:create', 3, 21, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3113, '素材更新', 'visualize:asset:update', 3, 22, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3114, '素材删除', 'visualize:asset:delete', 3, 23, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3115, '数据源查询', 'visualize:datasource:query', 3, 30, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3116, '数据源创建', 'visualize:datasource:create', 3, 31, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3117, '数据源更新', 'visualize:datasource:update', 3, 32, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
  (3118, '数据源删除', 'visualize:datasource:delete', 3, 33, 3101, '', '', '', NULL, 0, true, true, true, '1', NOW(), '1', NOW(), 0),
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

INSERT INTO system_role_menu (id, role_id, menu_id, creator, create_time, updater, update_time, deleted, tenant_id)
SELECT nextval('system_role_menu_seq'), 1, m.id, '1', NOW(), '1', NOW(), 0, 1
FROM system_menu m
WHERE m.id BETWEEN 3107 AND 3124
  AND NOT EXISTS (
    SELECT 1 FROM system_role_menu rm WHERE rm.role_id = 1 AND rm.menu_id = m.id AND rm.deleted = 0
  );

SELECT setval('system_menu_seq', GREATEST((SELECT MAX(id) FROM system_menu), 3124), true);

COMMIT;
