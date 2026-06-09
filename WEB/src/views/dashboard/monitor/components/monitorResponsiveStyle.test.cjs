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
