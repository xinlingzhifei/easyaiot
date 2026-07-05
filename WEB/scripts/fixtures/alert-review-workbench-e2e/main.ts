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

  clickReviewRow()
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-unified-timeline"]'), 'unified timeline')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-detail-stream"]'), 'detail stream')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-review-segment"]'), 'review segment')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-record-coverage"]'), 'record coverage')

  click('[data-testid="alert-review-detail-seek"]')
  await waitFor(() => viewVideoEvents.length > 0, 'detail seek video event')
  assertLastVideoSeek(
    'detail stream seek',
    '2026-07-02T08:00:02',
    'mock://record/east-gate-080000.mp4',
    '2026-07-02T08:00:00',
  )

  click('[data-testid="alert-review-unified-action"]')
  await waitFor(() => viewVideoEvents.length > 1, 'unified timeline video event')
  assertLastVideoSeek('unified timeline seek', '2026-07-02T07:59:45', 'mock://record/east-gate-075945.mp4')

  click('[data-testid="alert-review-coverage-seek"]')
  await waitFor(() => viewVideoEvents.length > 2, 'coverage seek video event')
  assertLastVideoSeek(
    'coverage seek',
    '2026-07-02T07:59:45',
    'mock://record/east-gate-075945.mp4',
    '2026-07-02T07:59:45',
  )

  click('[data-testid="alert-review-open-rule-drawer"]')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-region-drawer-stub"]'), 'region drawer')
  click('[data-testid="alert-review-region-drawer-save"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'saveAlertReviewRule'), 'region save writes rule')
  const saveRuleCall = apiCall('saveAlertReviewRule')
  const savedRule = saveRuleCall?.payload as Record<string, unknown> | undefined
  if (savedRule?.inertiaFrames !== 3)
    throw new Error(`region save expected inertiaFrames 3, got ${String(savedRule?.inertiaFrames)}`)
  if (savedRule?.loiteringSeconds !== 20)
    throw new Error(`region save expected loiteringSeconds 20, got ${String(savedRule?.loiteringSeconds)}`)

  click('[data-testid="alert-review-create-case"]')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-case-panel"]'), 'review case panel')

  click('[data-testid="alert-review-case-owner"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'assignAlertReviewCaseOwner'), 'case owner action')

  click('[data-testid="alert-review-case-close"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'closeAlertReviewCase'), 'case close action')

  setInputValue('[data-testid="alert-review-case-merge-source"]', '502')
  click('[data-testid="alert-review-case-merge"]')
  await waitFor(() => (window.__alertReviewE2EApiCalls || []).some(call => call.name === 'mergeAlertReviewCases'), 'case merge action')
  await waitFor(() => !!document.querySelector('[data-testid="alert-review-case-timeline-seek"]'), 'case timeline seek button')
  click('[data-testid="alert-review-case-timeline-seek"]')
  await waitFor(() => viewVideoEvents.length > 3, 'case timeline seek video event')
  assertLastVideoSeek(
    'case timeline seek',
    '2026-07-02T08:00:00',
    'mock://record/east-gate-080000.mp4',
    '2026-07-02T08:00:00',
  )
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
  assertApiCalled('assignAlertReviewCaseOwner')
  assertApiCalled('closeAlertReviewCase')
  assertApiCalled('mergeAlertReviewCases')
  assertApiCalled('splitAlertReviewCase')
  assertApiCalled('summarizeAlertReviewCase')
  assertApiCalled('createAlertReviewEvidenceExportJob')
  assertApiCalled('getAlertReviewEvidenceAudit')

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
