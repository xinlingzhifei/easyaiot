import { createApp, defineComponent, h, nextTick } from 'vue'
import AlertReviewWorkbench from '@/views/alert/components/AlertReviewWorkbench.vue'
import { getAlertReviewE2EMessages } from './messageStub'

declare global {
  interface Window {
    __alertReviewE2EApiCalls?: Array<{ name: string; payload?: unknown }>
  }
}

const viewVideoEvents: unknown[] = []
const viewImageEvents: unknown[] = []
const convertedEvents: unknown[] = []
const e2eMode = new URLSearchParams(window.location.search).get('mode') || 'all'

if (e2eMode === 'dev-api-real-drawer') {
  const NativeImage = window.Image
  const loadedImageSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"%3E%3Crect width="320" height="180" fill="%23f6f7f9"/%3E%3C/svg%3E'
  window.Image = class AlertReviewE2EImage extends NativeImage {
    private originalSrc = ''

    set src(value: string) {
      this.originalSrc = value
      super.src = loadedImageSrc
    }

    get src() {
      return this.originalSrc || super.src
    }
  } as typeof Image
}

function resultElement() {
  const element = document.querySelector<HTMLPreElement>('#alert-review-e2e-result')
  if (!element)
    throw new Error('missing result element')
  return element
}

function writeResult(status: 'passed' | 'failed', payload: unknown) {
  const element = resultElement()
  element.dataset.status = status
  element.textContent = JSON.stringify(payload, null, 2)
}

function text() {
  return document.body.textContent || ''
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitFor(assertion: () => boolean, label: string, timeoutMs = 5000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    await nextTick()
    if (assertion())
      return
    await wait(25)
  }
  throw new Error(`timed out waiting for ${label}`)
}

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element)
    throw new Error(`missing ${selector}`)
  return element
}

function click(selector: string) {
  requiredElement<HTMLElement>(selector).click()
}

async function clickAndWaitForVideo(selector: string, label: string) {
  const before = viewVideoEvents.length
  click(selector)
  await waitFor(() => viewVideoEvents.length > before, label)
}

function clickButtonByText(label: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find(candidate => candidate.textContent?.trim() === label)
  if (!button)
    throw new Error(`missing button ${label}`)
  button.click()
}

function hasButtonByText(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .some(candidate => candidate.textContent?.trim() === label)
}

function buttonByText(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find(candidate => candidate.textContent?.trim() === label)
}

function setInputValue(selector: string, value: string) {
  const input = requiredElement<HTMLInputElement>(selector)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function clickReviewRow() {
  const row = Array.from(document.querySelectorAll<HTMLTableRowElement>('tbody tr'))
    .find(candidate => candidate.textContent?.includes('RV-20260702-001'))
  if (!row)
    throw new Error('missing review item row')
  row.click()
}

function assertApiCalled(name: string) {
  const calls = window.__alertReviewE2EApiCalls || []
  if (!calls.some(call => call.name === name))
    throw new Error(`expected API call ${name}`)
}

function apiCall(name: string) {
  return (window.__alertReviewE2EApiCalls || []).find(call => call.name === name)
}

function lastVideoEvent() {
  const event = viewVideoEvents[viewVideoEvents.length - 1] as Record<string, unknown> | undefined
  if (!event)
    throw new Error('expected viewVideo event')
  return event
}

function assertLastVideoSeek(
  label: string,
  expectedSeekTime: string,
  expectedRecordPath: string,
  expectedRecordStartTime?: string,
) {
  const event = lastVideoEvent()
  if (event.seek_time !== expectedSeekTime)
    throw new Error(`${label} expected seek_time ${expectedSeekTime}, got ${String(event.seek_time)}`)
  if (event.record_path !== expectedRecordPath)
    throw new Error(`${label} expected record_path ${expectedRecordPath}, got ${String(event.record_path)}`)
  if (expectedRecordStartTime && event.record_start_time !== expectedRecordStartTime)
    throw new Error(`${label} expected record_start_time ${expectedRecordStartTime}, got ${String(event.record_start_time)}`)
}

function assertLastPlaybackPreparation(
  label: string,
  expected: {
    reviewCaseId?: number
    reviewItemId: number
    materialUri: string
  },
) {
  const calls = window.__alertReviewE2EApiCalls || []
  const call = calls[calls.length - 1]
  if (call?.name !== 'prepareAlertReviewPlaybackUrl')
    throw new Error(`${label} expected prepareAlertReviewPlaybackUrl before opening media, got ${String(call?.name)}`)
  const payload = call.payload as { reviewItemId?: number; params?: Record<string, unknown> } | undefined
  if (payload?.reviewItemId !== expected.reviewItemId)
    throw new Error(`${label} expected playback reviewItemId ${expected.reviewItemId}, got ${String(payload?.reviewItemId)}`)
  if (payload?.params?.materialUri !== expected.materialUri)
    throw new Error(`${label} expected playback materialUri ${expected.materialUri}, got ${String(payload?.params?.materialUri)}`)
  if (payload?.params?.reviewCaseId !== expected.reviewCaseId)
    throw new Error(`${label} expected playback reviewCaseId ${String(expected.reviewCaseId)}, got ${String(payload?.params?.reviewCaseId)}`)
}

async function runE2E() {
  const app = createApp(AlertReviewWorkbench, {
    onViewVideo: (payload: unknown) => viewVideoEvents.push(payload),
    onViewImage: (payload: unknown) => viewImageEvents.push(payload),
    onConverted: (payload: unknown) => convertedEvents.push(payload),
  })

  app.component('ADrawer', defineComponent({
    name: 'ADrawer',
    setup(_, { slots }) {
      return () => h('section', { 'data-testid': 'alert-review-drawer-stub' }, slots.default?.())
    },
  }))

  app.mount('#app')

  await waitFor(() => !!document.querySelector('[data-testid="alert-review-workbench"]'), 'workbench root')
  await waitFor(() => text().includes('RV-20260702-001'), 'initial review clue row')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-ops-semantic"]'), 'semantic ops cell')
  await waitFor(() => text().includes('critical'), 'semantic backlog alarm')
  await waitFor(() => text().includes('50%'), 'semantic rebuild progress')
  await waitFor(() => text().includes('stale 1 / failed 1'), 'semantic stale failed summary')

  await clickAndWaitForVideo('[data-testid="alert-review-list-playback"]', 'list playback video event')
  assertLastVideoSeek('list playback', '2026-07-02T08:00:00', 'mock://record/east-gate-080000.mp4')
  assertLastPlaybackPreparation('list playback', {
    reviewItemId: 101,
    materialUri: 'mock://record/east-gate-080000.mp4',
  })

  clickReviewRow()
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-unified-timeline"]'), 'unified timeline')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-detail-stream"]'), 'detail stream')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-review-segment"]'), 'review segment')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-record-coverage"]'), 'record coverage')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-case-candidate"]'), 'topology candidate')
  await waitFor(() => text().includes('RV-20260702-002'), 'topology candidate id')
  await waitFor(() => text().includes('topology area yard-east'), 'topology candidate area reason')
  await waitFor(() => text().includes('adjacent cam-east-gate -> cam-yard-east'), 'topology candidate adjacency reason')
  await waitFor(() => text().includes('shared object person-1'), 'topology candidate object reason')
  await waitFor(() => text().includes('待手动补证'), 'manual record evidence fallback label')
  await waitFor(() => text().includes('VIDEO URL 未配置'), 'missing VIDEO URL reason label')
  await waitFor(() => text().includes('sample 1/3'), 'rule suggestion sample safety summary')
  await waitFor(() => text().includes('risk low_sample_requires_more_review'), 'rule suggestion risk note')
  await waitFor(() => text().includes('impact cam-east-gate / gate-zone / person'), 'rule suggestion impact scope')
  await waitFor(() => text().includes('hits 4 -> 0'), 'rule suggestion before-after hit comparison')

  await clickAndWaitForVideo('[data-testid="alert-review-detail-seek"]', 'detail seek video event')
  assertLastVideoSeek(
    'detail stream seek',
    '2026-07-02T08:00:02',
    'mock://record/east-gate-080000.mp4',
    '2026-07-02T08:00:00',
  )
  assertLastPlaybackPreparation('detail stream seek before active case', {
    reviewItemId: 101,
    materialUri: 'mock://record/east-gate-080000.mp4',
  })

  await clickAndWaitForVideo('[data-testid="alert-review-unified-action"]', 'unified timeline video event')
  assertLastVideoSeek('unified timeline seek', '2026-07-02T07:59:45', 'mock://record/east-gate-075945.mp4')
  assertLastPlaybackPreparation('unified timeline seek before active case', {
    reviewItemId: 101,
    materialUri: 'mock://record/east-gate-075945.mp4',
  })

  await clickAndWaitForVideo('[data-testid="alert-review-coverage-seek"]', 'coverage seek video event')
  assertLastVideoSeek(
    'coverage seek',
    '2026-07-02T07:59:45',
    'mock://record/east-gate-075945.mp4',
    '2026-07-02T07:59:45',
  )
  assertLastPlaybackPreparation('coverage seek before active case', {
    reviewItemId: 101,
    materialUri: 'mock://record/east-gate-075945.mp4',
  })

  click('[data-testid="alert-review-open-rule-drawer"]')
  if (e2eMode === 'dev-api-real-drawer') {
    await waitFor(() => text().includes('检测区域 (1)'), 'real DeviceRegionDrawer region list')
    clickButtonByText('抓拍图片')
    await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'captureDeviceSnapshot'), 'real DeviceRegionDrawer capture snapshot')
    await waitFor(() => {
      const saveButton = buttonByText('保存区域')
      return !!saveButton && !saveButton.disabled
    }, 'real DeviceRegionDrawer save button')
    buttonByText('保存区域')?.click()
    await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'updateDeviceRegion'), 'real DeviceRegionDrawer writes device region')
  }
  else {
    await waitFor(() => !!document.querySelector('[data-testid="alert-review-region-drawer-stub"]'), 'region drawer')
    click('[data-testid="alert-review-region-drawer-save"]')
  }
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'saveAlertReviewRule'), 'region save writes rule')
  const saveRuleCall = apiCall('saveAlertReviewRule')
  const savedRule = saveRuleCall?.payload as Record<string, unknown> | undefined
  if (savedRule?.inertiaFrames !== 3)
    throw new Error(`region save expected inertiaFrames 3, got ${String(savedRule?.inertiaFrames)}`)
  if (savedRule?.loiteringSeconds !== 20)
    throw new Error(`region save expected loiteringSeconds 20, got ${String(savedRule?.loiteringSeconds)}`)

  clickButtonByText('Replay')
  await waitFor(() => text().includes('Rule replay report'), 'rule replay panel')
  await waitFor(() => text().includes('rule version shadow / yfeieye-rule-geometry-v1'), 'rule replay rule version')
  await waitFor(() => text().includes('sample window 2026-07-02T08:00:00 -> 2026-07-02T08:20:00 / 2'), 'rule replay sample window')
  await waitFor(() => text().includes('hit comparison 2 -> 0 / diff 2'), 'rule replay hit comparison')
  await waitFor(() => text().includes('false negative review_required / possible missed 2'), 'rule replay false negative estimate')

  if (!hasButtonByText('误报'))
    throw new Error('expected false-positive action before conversion')
  clickButtonByText('转事件')
  await waitFor(() => convertedEvents.length === 1, 'converted event emission')
  if (hasButtonByText('误报'))
    throw new Error('converted review item should hide false-positive action')
  if (!hasButtonByText('证据'))
    throw new Error('converted review item should keep evidence action')
  if (!hasButtonByText('覆盖度'))
    throw new Error('converted review item should keep record coverage action')

  click('[data-testid="alert-review-create-case"]')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-case-panel"]'), 'review case panel')
  click('[data-testid="alert-review-candidate-add"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'addAlertReviewItemToCase'), 'candidate add action')

  await clickAndWaitForVideo('[data-testid="alert-review-detail-seek"]', 'detail seek with active case video event')
  assertLastVideoSeek(
    'detail stream seek with active case',
    '2026-07-02T08:00:02',
    'mock://record/east-gate-080000.mp4',
    '2026-07-02T08:00:00',
  )
  assertLastPlaybackPreparation('detail stream seek with active case', {
    reviewCaseId: 501,
    reviewItemId: 101,
    materialUri: 'mock://record/east-gate-080000.mp4',
  })

  await clickAndWaitForVideo('[data-testid="alert-review-unified-action"]', 'unified timeline with active case video event')
  assertLastVideoSeek('unified timeline seek with active case', '2026-07-02T07:59:45', 'mock://record/east-gate-075945.mp4')
  assertLastPlaybackPreparation('unified timeline seek with active case', {
    reviewCaseId: 501,
    reviewItemId: 101,
    materialUri: 'mock://record/east-gate-075945.mp4',
  })

  await clickAndWaitForVideo('[data-testid="alert-review-coverage-seek"]', 'coverage seek with active case video event')
  assertLastVideoSeek(
    'coverage seek with active case',
    '2026-07-02T07:59:45',
    'mock://record/east-gate-075945.mp4',
    '2026-07-02T07:59:45',
  )
  assertLastPlaybackPreparation('coverage seek with active case', {
    reviewCaseId: 501,
    reviewItemId: 101,
    materialUri: 'mock://record/east-gate-075945.mp4',
  })

  click('[data-testid="alert-review-case-owner"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'assignAlertReviewCaseOwner'), 'case owner action')

  click('[data-testid="alert-review-case-close"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'closeAlertReviewCase'), 'case close action')

  setInputValue('[data-testid="alert-review-case-merge-source"]', '502')
  click('[data-testid="alert-review-case-merge"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'mergeAlertReviewCases'), 'case merge action')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-case-timeline-seek"]'), 'case timeline seek button')
  await clickAndWaitForVideo('[data-testid="alert-review-case-timeline-seek"]', 'case timeline seek video event')
  assertLastVideoSeek(
    'case timeline seek',
    '2026-07-02T08:00:00',
    'mock://record/east-gate-080000.mp4',
    '2026-07-02T08:00:00',
  )
  assertLastPlaybackPreparation('case timeline seek', {
    reviewCaseId: 501,
    reviewItemId: 101,
    materialUri: 'mock://record/east-gate-080000.mp4',
  })
  await waitFor(() => !requiredElement<HTMLButtonElement>('[data-testid="alert-review-case-split"]').disabled, 'case lifecycle idle')

  click('[data-testid="alert-review-case-split"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'splitAlertReviewCase'), 'case split action')

  click('[data-testid="alert-review-ai-summary-action"]')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-ai-summary"]'), 'AI summary panel')

  click('[data-testid="alert-review-export-action"]')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-evidence-export"]'), 'evidence export panel')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-evidence-audit"]'), 'evidence audit panel')

  assertApiCalled('listAlertReviewItems')
  assertApiCalled('getAlertReviewTimeline')
  assertApiCalled('getAlertReviewDetailStream')
  assertApiCalled('getAlertReviewSegment')
  assertApiCalled('getAlertReviewRecordCoverage')
  assertApiCalled('createAlertReviewCase')
  assertApiCalled('addAlertReviewItemToCase')
  assertApiCalled('assignAlertReviewCaseOwner')
  assertApiCalled('closeAlertReviewCase')
  assertApiCalled('mergeAlertReviewCases')
  assertApiCalled('splitAlertReviewCase')
  assertApiCalled('summarizeAlertReviewCase')
  assertApiCalled('createAlertReviewEvidenceExportJob')
  assertApiCalled('getAlertReviewEvidenceAudit')
  assertApiCalled('prepareAlertReviewPlaybackUrl')
  assertApiCalled('evaluateAlertReviewSemanticIndex')

  const errorMessages = getAlertReviewE2EMessages().filter(message => message.type === 'error')
  if (errorMessages.length)
    throw new Error(`unexpected UI error messages: ${JSON.stringify(errorMessages)}`)

  return {
    apiCalls: window.__alertReviewE2EApiCalls?.map(call => call.name) || [],
    viewVideoEvents,
    viewImageEvents,
    convertedEvents,
    panels: {
      unifiedTimeline: !!document.querySelector('[data-testid="alert-review-unified-timeline"]'),
      detailStream: !!document.querySelector('[data-testid="alert-review-detail-stream"]'),
      reviewSegment: !!document.querySelector('[data-testid="alert-review-review-segment"]'),
      recordCoverage: !!document.querySelector('[data-testid="alert-review-record-coverage"]'),
      reviewCase: !!document.querySelector('[data-testid="alert-review-case-panel"]'),
      aiSummary: !!document.querySelector('[data-testid="alert-review-ai-summary"]'),
      evidenceExport: !!document.querySelector('[data-testid="alert-review-evidence-export"]'),
      evidenceAudit: !!document.querySelector('[data-testid="alert-review-evidence-audit"]'),
    },
  }
}

try {
  writeResult('passed', await runE2E())
}
catch (error) {
  writeResult('failed', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    body: text().slice(0, 5000),
    apiCalls: window.__alertReviewE2EApiCalls || [],
  })
}
