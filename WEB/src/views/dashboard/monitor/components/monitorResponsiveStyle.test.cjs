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

test('dashboard frame uses responsive columns instead of fixed side panels', () => {
  const dashboard = read('../index.vue')
  const sidebar = read('Sidebar.vue')
  const alarmPanel = read('AlarmPanel.vue')

  assert.match(dashboard, /grid-template-columns:\s*clamp\(/)
  assert.match(dashboard, /minmax\(0,\s*1fr\)/)
  assert.match(dashboard, /@media\s*\(max-width:\s*1280px\)/)
  assert.match(sidebar, /width:\s*clamp\(/)
  assert.match(alarmPanel, /width:\s*clamp\(/)
})

test('dashboard title bar does not force title, date, or action text to wrap', () => {
  const source = read('Header.vue')

  assert.match(source, /grid-template-columns:\s*minmax\(/)
  assert.match(source, /\.platform-title\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.match(source, /\.date-time\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.match(source, /\.user-role\s*\{[\s\S]*white-space:\s*nowrap;/)
  assert.doesNotMatch(source, /letter-spacing:\s*-\d/)
})
