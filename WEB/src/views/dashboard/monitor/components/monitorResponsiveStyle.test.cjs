const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const monitorDir = __dirname
const read = (file) => readFileSync(join(monitorDir, file), 'utf8')

test('single-focus video monitor keeps labels readable while allowing controls to wrap', () => {
  const source = read('VideoMonitor.vue')

  assert.match(source, /class="video-monitor single-focus"/)
  assert.match(source, /\.monitor-header\s*\{[\s\S]*height:\s*auto;/)
  assert.match(source, /\.monitor-header\s*\{[\s\S]*flex-wrap:\s*wrap;/)
  assert.match(source, /\.header-title\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.match(source, /\.header-time\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.match(source, /\.header-location\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.match(source, /\.monitor-content\s*\{[\s\S]*display:\s*grid;/)
  assert.doesNotMatch(source, /data-testid="monitor-split-toolbar"/)
})

test('dashboard frame uses the responsive single-focus command-center grid', () => {
  const dashboard = read('../index.vue')
  const topHeader = read('Header.vue')

  assert.match(dashboard, /class="command-center-grid"/)
  assert.match(dashboard, /\.command-center-grid\s*\{[\s\S]*display:\s*grid;/)
  assert.match(
    dashboard,
    /grid-template-columns:\s*minmax\(240px,\s*300px\)\s*minmax\(0,\s*1fr\)\s*minmax\(280px,\s*340px\);/,
  )
  assert.match(dashboard, /@media\s*\(max-width:\s*1366px\)/)
  assert.match(dashboard, /@media\s*\(max-width:\s*1100px\)/)
  assert.match(topHeader, /\.monitor-header\s*\{[\s\S]*display:\s*flex;/)
  assert.match(topHeader, /\.platform-title\s*\{[\s\S]*font-size:\s*32px;/)
})

test('big-screen admin entry releases the overlay so normal navigation can be clicked', () => {
  const dashboard = read('../index.vue')
  const topHeader = read('Header.vue')

  assert.match(dashboard, /function\s+releaseDashboardOverlay\(\)/)
  assert.match(dashboard, /defineExpose\(\{\s*releaseDashboardOverlay\s*\}\)/)
  assert.match(dashboard, /\.monitor-dashboard--embedded/)
  assert.doesNotMatch(dashboard, /z-index:\s*9999;/)

  assert.match(topHeader, /<button[\s\S]*data-testid="monitor-admin-entry"/)
  assert.match(topHeader, /@click="handleGoToAdmin"/)
  assert.match(topHeader, /adminEntryLabel/)
  assert.match(topHeader, /emit\('admin-entry'\)/)
  assert.match(topHeader, /resolveAdminEntryTarget\(router\)/)
  assert.match(topHeader, /router\.push\(resolveAdminEntryTarget\(router\)\)/)
})

test('dashboard controls expose stable selectors and keep text rendering crisp', () => {
  const dashboard = read('../index.vue')
  const topHeader = read('Header.vue')
  const videoMonitor = read('VideoMonitor.vue')
  const sidebar = read('Sidebar.vue')

  assert.match(dashboard, /data-testid="monitor-dashboard"/)
  assert.match(topHeader, /data-testid="monitor-platform-title"/)
  assert.match(sidebar, /data-testid="monitor-sidebar"/)
  assert.match(videoMonitor, /data-testid="monitor-video"/)
  assert.match(videoMonitor, /class="video-monitor single-focus"/)
  assert.match(videoMonitor, /:data-testid="`monitor-video-window-\$\{index\}`"/)
  assert.match(videoMonitor, /data-testid="monitor-ai-toggle"/)
  assert.doesNotMatch(videoMonitor, /data-testid="monitor-split-toolbar"/)

  assert.match(dashboard, /text-rendering:\s*geometricPrecision;/)
  assert.match(dashboard, /-webkit-font-smoothing:\s*antialiased;/)
  assert.doesNotMatch(dashboard, /filter:\s*blur\(/)
  assert.doesNotMatch(topHeader, /letter-spacing:\s*\.06rem;/)
})

test('default main nav items expose route-based test ids for smoke clicks', () => {
  const mixSider = read('../../../../layouts/default/sider/MixSider.vue')

  assert.match(mixSider, /function\s+normalizeMenuTestId\(path:\s*string\)/)
  assert.match(mixSider, /:data-testid="`main-nav-\$\{normalizeMenuTestId\(item\.path\)\}`"/)
  assert.match(mixSider, /:data-testid="`main-nav-label-\$\{normalizeMenuTestId\(item\.path\)\}`"/)
})
