-- 增量：菜单「大屏管理」更名为「可视化管理」（覆盖大屏 + 组态）
-- 执行库：ruoyi-vue-pro20（system 库）
-- 用法示例：
--   docker exec -i postgres-server psql -U postgres -d ruoyi-vue-pro20 < .scripts/go-view/patches/visualize_menu_scada.sql

BEGIN;

UPDATE system_menu
SET name = '可视化管理', update_time = NOW()
WHERE id IN (3100, 3101)
  AND deleted = 0;

COMMIT;
