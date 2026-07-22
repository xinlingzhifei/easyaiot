-- 增量：菜单「可视化 / 可视化管理」更名为「大屏管理」
-- 执行库：ruoyi-vue-pro20（system 库）
-- 用法示例：
--   docker exec -i postgres-server psql -U postgres -d ruoyi-vue-pro20 < .scripts/go-view/patches/visualize_menu_rename_dashboard.sql

BEGIN;

UPDATE system_menu
SET name = '大屏管理', update_time = NOW()
WHERE id IN (3100, 3101)
  AND deleted = 0
  AND name IN ('可视化', '可视化管理');

COMMIT;
