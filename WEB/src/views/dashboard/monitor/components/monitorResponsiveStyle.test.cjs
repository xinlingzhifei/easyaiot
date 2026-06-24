const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const monitorDir = __dirname
const read = (file) => readFileSync(join(monitorDir, file), 'utf8')

test('video monitor toolbar keeps labels readable while allowing controls to wrap', () => {
  const source = read('VideoMonitor.vue')

  assert.match(source, /\.monitor-header\s*\{[\s\S]*height:\s*auto;/)
  assert.match(source, /\.monitor-header\s*\{[\s\S]*flex-wrap:\s*wrap;/)
  assert.match(source, /\.header-title\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.match(source, /\.header-time\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.match(source, /\.header-location\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.match(source, /\.split-toolbar\s*\{[\s\S]*flex-wrap:\s*wrap;/)
})

test('dashboard frame keeps the original big-screen layout outside the red-box toolbar text', () => {
  const dashboard = read('../index.vue')
  const sidebar = read('Sidebar.vue')
  const alarmPanel = read('AlarmPanel.vue')
  const topHeader = read('Header.vue')

  assert.match(dashboard, /\.monitor-content\s*\{[\s\S]*display:\s*flex;/)
  assert.doesNotMatch(dashboard, /grid-template-columns:\s*clamp\(/)
  assert.doesNotMatch(dashboard, /@media\s*\(max-width:\s*1280px\)/)
  assert.match(sidebar, /\.monitor-sidebar\s*\{[\s\S]*width:\s*350px;/)
  assert.doesNotMatch(sidebar, /width:\s*clamp\(/)
  assert.match(alarmPanel, /\.alarm-panel\s*\{[\s\S]*width:\s*320px;/)
  assert.doesNotMatch(alarmPanel, /width:\s*clamp\(/)
  assert.match(topHeader, /\.monitor-header\s*\{[\s\S]*display:\s*flex;/)
  assert.match(topHeader, /\.platform-title\s*\{[\s\S]*font-size:\s*32px;/)
  assert.doesNotMatch(topHeader, /grid-template-columns:\s*minmax\(/)
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
  assert.match(topHeader, /getAdminHomeRoute/)
  assert.match(topHeader, /router\.push\(target\.query \? \{ path: target\.path, query: target\.query \} : target\.path\)/)
})

test('dashboard controls expose stable selectors and keep text rendering crisp', () => {
  const dashboard = read('../index.vue')
  const topHeader = read('Header.vue')
  const videoMonitor = read('VideoMonitor.vue')
  const sidebar = read('Sidebar.vue')

  assert.match(dashboard, /data-testid="monitor-dashboard"/)
  assert.match(topHeader, /data-testid="monitor-platform-title"/)
  assert.match(sidebar, /data-testid="monitor-sidebar"/)
  assert.match(videoMonitor, /data-testid="monitor-split-toolbar"/)
  assert.match(videoMonitor, /:data-testid="`monitor-split-\$\{layout\.value\}`"/)
  assert.match(videoMonitor, /data-testid="monitor-ai-toggle"/)

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
