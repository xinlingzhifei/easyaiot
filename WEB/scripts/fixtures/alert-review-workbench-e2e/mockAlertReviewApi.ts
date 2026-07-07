export type AlertReviewAiSummary = any
export type AlertReviewCase = any
export type AlertReviewCaseTimelineItem = any
export type AlertReviewCoverageSegment = any
export type AlertReviewDetailStreamItem = any
export type AlertReviewEvidence = any
export type AlertReviewEvidenceAuditEntry = any
export type AlertReviewEvidenceExportJob = any
export type AlertReviewEvidenceExportPackage = any
export type AlertReviewEvidenceVerification = any
export type AlertReviewIntegrationSmokeResult = any
export type AlertReviewItem = any
export type AlertReviewReconciliationResult = any
export type AlertReviewRuntimeHealth = any
export type AlertReviewRuleGeometryEvaluation = any
export type AlertReviewRuleReplayResult = any
export type AlertReviewRuleSuggestionPreview = any
export type AlertReviewSemanticHit = any
export type AlertReviewSegment = any
export type AlertReviewSummary = any

declare global {
  interface Window {
    __alertReviewE2EApiCalls?: Array<{ name: string; payload?: unknown }>
  }
}

const reviewItem = {
  id: 101,
  reviewItemNo: 'RV-20260702-001',
  sourceSystem: 'frigate',
  ruleCode: 'person_loitering',
  sourceAlertType: 'object',
  deviceId: 'device-east-gate',
  cameraId: 'cam-east-gate',
  zoneCode: 'gate-zone',
  objectLabel: 'person',
  firstAlertTime: '2026-07-02T08:00:00',
  lastAlertTime: '2026-07-02T08:02:30',
  alertCount: 2,
  sourceAlertIds: ['frigate-event-1', 'frigate-event-2'],
  reviewStatus: 'pending_review',
  recordEvidenceStatus: 'missing',
  recordEvidenceMessage: 'video_url_not_configured',
  eventStatus: 'pending',
  closeCheckStatus: 'waiting',
  evidenceStatus: 'complete',
  eventReviewStatus: 'pending',
  inReviewCase: false,
  ruleSuggestionStatus: 'pending',
  reviewData: {
    correlationId: 'corr-east-gate-001',
    labels: ['person'],
    zones: ['gate-zone'],
    objectIds: ['person-1'],
    confidence: 0.92,
    bbox: [0.12, 0.18, 0.42, 0.74],
  },
  ruleSuggestion: {
    proposedRule: {
      minStaySeconds: 15,
    },
    minimumSampleCount: 3,
    currentSampleCount: 1,
    sampleRequirementMet: false,
    riskNote: 'low_sample_requires_more_review',
    impactScope: {
      cameraIds: ['cam-east-gate'],
      zoneCodes: ['gate-zone'],
      objectLabels: ['person'],
    },
    beforeAfterComparison: {
      beforeHitCount: 4,
      afterEstimatedHitCount: 0,
      falsePositiveBeforeCount: 1,
      falsePositiveAfterCount: 0,
      possibleMissedCount: 3,
    },
  },
}

const topologyCandidate = {
  id: 102,
  reviewItemNo: 'RV-20260702-002',
  sourceSystem: 'frigate',
  ruleCode: 'person_loitering',
  sourceAlertType: 'object',
  deviceId: 'device-yard-east',
  cameraId: 'cam-yard-east',
  zoneCode: 'yard-zone',
  objectLabel: 'person',
  firstAlertTime: '2026-07-02T08:01:10',
  lastAlertTime: '2026-07-02T08:02:10',
  alertCount: 1,
  sourceAlertIds: ['frigate-event-3'],
  reviewStatus: 'pending_review',
  recordEvidenceStatus: 'found',
  eventStatus: 'pending',
  closeCheckStatus: 'waiting',
  evidenceStatus: 'complete',
  eventReviewStatus: 'pending',
  inReviewCase: false,
  reviewData: {
    objectIds: ['person-1'],
    zones: ['yard-zone'],
    correlationId: 'corr-east-gate-001',
    caseCandidateMatch: {
      source: 'configured_camera_topology',
      regulatoryArea: 'yard-east',
      adjacentCameras: ['cam-east-gate'],
    },
  },
}

const summary = {
  total: 1,
  pendingReview: 1,
  reviewedByMe: 0,
  missingRecord: 0,
  converted: 0,
  inReviewCase: 0,
}

let currentReviewItem = { ...reviewItem }

function updateReviewItem(patch: Record<string, unknown>) {
  currentReviewItem = { ...currentReviewItem, ...patch }
  return currentReviewItem
}

const timeline = [
  {
    reviewItemId: 101,
    sourceAlertId: 'frigate-event-1',
    materialType: 'snapshot',
    materialUri: 'mock://snapshot/east-gate-080000.jpg',
    happenedAt: '2026-07-02T08:00:00',
  },
  {
    reviewItemId: 101,
    sourceAlertId: 'frigate-event-1',
    materialType: 'record',
    materialUri: 'mock://record/east-gate-080000.mp4',
    happenedAt: '2026-07-02T08:00:00',
  },
]

const detailStream = [
  {
    reviewItemId: 101,
    sourceAlertId: 'frigate-event-1',
    cameraId: 'cam-east-gate',
    zoneCode: 'gate-zone',
    objectId: 'person-1',
    label: 'person',
    lifecycleEvent: 'entered',
    happenedAt: '2026-07-02T08:00:02',
    seekTime: '2026-07-02T08:00:02',
    bbox: [0.12, 0.18, 0.42, 0.74],
    path: [{ x: 0.2, y: 0.4, t: '2026-07-02T08:00:02' }],
    materialType: 'record',
    materialUri: 'mock://record/east-gate-080000.mp4',
    metadata: { confidence: 0.92 },
  },
]

const reviewSegment = {
  reviewItemId: 101,
  segmentId: 'RS-cam-east-gate-20260702080000',
  cameraId: 'cam-east-gate',
  severity: 'alert',
  status: 'ended',
  startTime: '2026-07-02T08:00:00',
  endTime: '2026-07-02T08:02:30',
  objectIds: ['person-1'],
  zones: ['gate-zone'],
  sourceAlertIds: ['frigate-event-1', 'frigate-event-2'],
  events: [
    { event: 'start', happenedAt: '2026-07-02T08:00:00' },
    { event: 'update', happenedAt: '2026-07-02T08:01:00' },
    { event: 'ended', happenedAt: '2026-07-02T08:02:30' },
  ],
  metadata: { correlationId: 'corr-east-gate-001' },
}

const coverage = [
  {
    status: 'available',
    startTime: '2026-07-02T07:59:45',
    endTime: '2026-07-02T08:01:00',
    motion: 1,
    recordUri: 'mock://record/east-gate-075945.mp4',
    objects: 1,
    metadata: { source: 'video-storage' },
  },
  {
    status: 'missing',
    startTime: '2026-07-02T08:01:00',
    endTime: '2026-07-02T08:01:15',
    motion: 0,
    objects: 0,
    metadata: { reason: 'retention-gap' },
  },
]

const reviewCase = {
  id: 501,
  caseNo: 'RC-20260702-001',
  title: 'cam-east-gate review',
  status: 'open',
  primaryReviewItemId: 101,
  reviewItemIds: [101],
  cameraIds: ['cam-east-gate'],
  startTime: '2026-07-02T08:00:00',
  endTime: '2026-07-02T08:02:30',
  ownerUserId: 9001,
  notes: 'correlationId=corr-east-gate-001',
}

const caseTimeline = [
  {
    reviewCaseId: 501,
    reviewItemId: 101,
    cameraId: 'cam-east-gate',
    sourceAlertId: 'frigate-event-1',
    materialType: 'record',
    materialUri: 'mock://record/east-gate-080000.mp4',
    happenedAt: '2026-07-02T08:00:00',
    actionNote: 'primary evidence',
  },
]

const evidenceExportJob = {
  jobNo: 'EXP-20260702-001',
  status: 'ready',
  exportPackage: {
    packageNo: 'PKG-20260702-001',
    format: 'manifest',
    reviewCaseId: 501,
    reviewItemIds: [101],
    evidenceUris: ['mock://record/east-gate-080000.mp4', 'mock://snapshot/east-gate-080000.jpg'],
    timeline: caseTimeline,
    manifest: {
      checksum: 'sha256:manifest-hash',
      signature: 'sha256:manifest-signature',
      generatedBy: 'alert-review-e2e',
    },
    generatedAt: '2026-07-02T08:05:00',
  },
  fileHash: 'sha256:package-hash',
  expiresAt: '2026-07-09T08:05:00',
  operatorUserId: 9001,
  reason: 'review_case_export',
  boundEventIds: [7001],
  createdAt: '2026-07-02T08:05:00',
}

const evidenceAudit = [
  {
    reviewCaseId: 501,
    reviewItemId: 101,
    actionType: 'export_created',
    jobNo: 'EXP-20260702-001',
    fileHash: 'sha256:package-hash',
    operatorUserId: 9001,
    actionNote: 'review_case_export',
    evidenceUris: evidenceExportJob.exportPackage.evidenceUris,
    boundEventIds: [7001],
    happenedAt: '2026-07-02T08:05:00',
    metadata: { manifestHash: 'sha256:manifest-hash' },
  },
]

function record(name: string, payload?: unknown) {
  window.__alertReviewE2EApiCalls ||= []
  window.__alertReviewE2EApiCalls.push({ name, payload })
}

export async function listAlertReviewItems(payload?: unknown) {
  record('listAlertReviewItems', payload)
  return [currentReviewItem]
}

export async function getAlertReviewSummary(payload?: unknown) {
  record('getAlertReviewSummary', payload)
  return summary
}

export async function getAlertReviewRuntimeHealth(payload?: unknown) {
  record('getAlertReviewRuntimeHealth', payload)
  return {
    totalCount: 1,
    missingRecordCount: 0,
    staleSemanticIndexCount: 0,
    failedExportJobCount: 0,
    missingRecordRate: 0,
    exportFailureRate: 0,
    semanticBacklogCount: 0,
    repairableCount: 0,
    alerts: [],
    measuredAt: '2026-07-02T08:07:00',
  }
}

export async function reconcileAlertReviewRuntime(payload?: unknown) {
  record('reconcileAlertReviewRuntime', payload)
  return {
    scannedCount: 1,
    repairedRecordCount: 0,
    repairedSemanticIndexCount: 0,
    failedExportJobCount: 0,
    findings: [],
    healthReport: await getAlertReviewRuntimeHealth(payload),
    reconciledAt: '2026-07-02T08:07:10',
  }
}

export async function semanticSearchAlertReview(payload?: unknown) {
  record('semanticSearchAlertReview', payload)
  return [{ item: reviewItem, score: 0.99, matchedTerms: ['person'], snippet: 'person in gate-zone' }]
}

export async function evaluateAlertReviewSemanticIndex(payload?: unknown) {
  record('evaluateAlertReviewSemanticIndex', payload)
  return {
    totalCount: 2,
    pendingCount: 0,
    indexedCount: 1,
    failedCount: 1,
    coverageRate: 0.5,
    staleReviewItemIds: [102],
    recommendedActions: ['retry_failed_semantic_index', 'inspect_semantic_index_backlog_alarm'],
    rebuildProgressRate: 0.5,
    backlogAlarmLevel: 'critical',
    evaluatedAt: '2026-07-02T08:07:05',
  }
}

export async function getAlertReviewTimeline(reviewItemId: number) {
  record('getAlertReviewTimeline', reviewItemId)
  return timeline
}

export async function getAlertReviewDetailStream(reviewItemId: number) {
  record('getAlertReviewDetailStream', reviewItemId)
  return detailStream
}

export async function getAlertReviewSegment(reviewItemId: number) {
  record('getAlertReviewSegment', reviewItemId)
  return reviewSegment
}

export async function getAlertReviewRecordCoverage(reviewItemId: number) {
  record('getAlertReviewRecordCoverage', reviewItemId)
  return coverage
}

export async function suggestAlertReviewCaseCandidates(reviewItemId: number) {
  record('suggestAlertReviewCaseCandidates', reviewItemId)
  return [topologyCandidate]
}

export async function createAlertReviewCase(payload: unknown) {
  record('createAlertReviewCase', payload)
  return reviewCase
}

export async function getAlertReviewCaseTimeline(reviewCaseId: number) {
  record('getAlertReviewCaseTimeline', reviewCaseId)
  return caseTimeline
}

export async function getAlertReviewEvidenceAudit(reviewCaseId: number) {
  record('getAlertReviewEvidenceAudit', reviewCaseId)
  return evidenceAudit
}

export async function getAlertReviewItemEvidenceAudit(reviewItemId: number) {
  record('getAlertReviewItemEvidenceAudit', reviewItemId)
  return evidenceAudit
}

export async function auditAlertReviewMediaAccess(reviewCaseId: number, payload?: unknown) {
  record('auditAlertReviewMediaAccess', { reviewCaseId, payload })
  return {
    reviewCaseId,
    reviewItemId: (payload as any)?.reviewItemId,
    operatorUserId: (payload as any)?.operatorUserId,
    cameraId: (payload as any)?.cameraId,
    materialUri: (payload as any)?.materialUri,
    actionType: (payload as any)?.actionType || 'playback',
    decision: 'granted',
    deniedReasons: [],
    happenedAt: '2026-07-02T08:04:00',
    metadata: { source: 'e2e-media-audit' },
  }
}

export async function auditAlertReviewItemMediaAccess(reviewItemId: number, payload?: unknown) {
  record('auditAlertReviewItemMediaAccess', { reviewItemId, payload })
  return {
    reviewItemId,
    operatorUserId: (payload as any)?.operatorUserId,
    cameraId: (payload as any)?.cameraId,
    materialUri: (payload as any)?.materialUri,
    actionType: (payload as any)?.actionType || 'playback',
    decision: 'granted',
    deniedReasons: [],
    happenedAt: '2026-07-02T08:03:00',
    metadata: { source: 'e2e-item-media-audit' },
  }
}

export async function summarizeAlertReviewCase(reviewCaseId: number, operatorUserId?: number) {
  record('summarizeAlertReviewCase', { reviewCaseId, operatorUserId })
  return {
    reviewCaseId,
    reviewItemIds: [101],
    title: 'AI review summary',
    summary: 'person object stayed in the gate zone with complete primary evidence',
    keyFacts: ['person-1 entered gate-zone', 'record evidence available'],
    evidenceGaps: ['15 seconds missing coverage'],
    recommendedActions: ['verify retention policy'],
    generatedAt: '2026-07-02T08:06:00',
    generatedBy: 'alert-review-e2e',
    structuredData: {
      threatLevel: 'medium',
      responsibilityUnit: 'security',
      convertibleToEvent: true,
    },
  }
}

export async function createAlertReviewEvidenceExportJob(reviewCaseId: number, payload?: unknown) {
  record('createAlertReviewEvidenceExportJob', { reviewCaseId, payload })
  return evidenceExportJob
}

export async function verifyAlertReviewEvidencePackage(jobNo: string, operatorUserId?: number) {
  record('verifyAlertReviewEvidencePackage', { jobNo, operatorUserId })
  return {
    jobNo,
    valid: true,
    manifestVerification: {
      jobNo,
      valid: true,
      expectedManifestHash: 'sha256:manifest-hash',
      actualManifestHash: 'sha256:manifest-hash',
      packageChecksum: 'sha256:package-checksum',
      violations: [],
      verifiedAt: '2026-07-02T08:08:00',
    },
    manifestV2: evidenceExportJob.exportPackage.manifest,
    decisionTrail: [{ reviewItemId: 101, reviewStatus: 'pending_review' }],
    replayableReasons: ['manifest_hash_valid', 'decision_trail_reconstructed'],
    auditTrail: evidenceAudit,
    verifiedAt: '2026-07-02T08:08:00',
    operatorUserId,
  }
}

export async function runAlertReviewIntegrationSmoke(payload?: unknown) {
  record('runAlertReviewIntegrationSmoke', payload)
  return {
    status: 'passed',
    reviewItemId: 101,
    reviewCaseId: 501,
    exportJobNo: 'EXP-20260702-001',
    manifestValid: true,
    videoExportRequested: true,
    checkpoints: ['ingest_review_item', 'record_coverage_synced', 'review_case_created', 'evidence_export_ready', 'manifest_verified', 'evidence_download_audited'],
    executedAt: '2026-07-02T08:08:30',
    profile: 'device-video-web',
  }
}

export async function runAlertReviewRuntimePatrol(payload?: unknown) {
  record('runAlertReviewRuntimePatrol', payload)
  return {
    status: 'alerted',
    lockAcquired: true,
    maxAttempts: 2,
    attemptCount: 1,
    healthReport: {
      totalCount: 1,
      missingRecordCount: 1,
      staleSemanticIndexCount: 0,
      failedExportJobCount: 0,
      missingRecordRate: 1,
      exportFailureRate: 0,
      semanticBacklogCount: 0,
      repairableCount: 1,
      alerts: ['record_evidence_gap'],
      measuredAt: '2026-07-02T08:08:35',
    },
    reconciliationResult: {
      scannedCount: 1,
      repairedRecordCount: 0,
      repairedSemanticIndexCount: 0,
      failedExportJobCount: 0,
      findings: ['record_unresolved:101:missing'],
      healthReport: {
        totalCount: 1,
        missingRecordCount: 1,
        staleSemanticIndexCount: 0,
        failedExportJobCount: 0,
        missingRecordRate: 1,
        exportFailureRate: 0,
        semanticBacklogCount: 0,
        repairableCount: 1,
        alerts: ['record_evidence_gap'],
        measuredAt: '2026-07-02T08:08:35',
      },
      reconciledAt: '2026-07-02T08:08:35',
    },
    alerts: ['record_evidence_gap'],
    notifications: ['review_runtime_alert:record_evidence_gap'],
    recommendedActions: ['backfill_record_evidence'],
    executedAt: '2026-07-02T08:08:35',
    metadata: { scheduled: true, lockName: 'alert-review-runtime-patrol' },
  }
}

export async function addAlertReviewItemToCase(reviewCaseId: number, reviewItemId: number) {
  record('addAlertReviewItemToCase', { reviewCaseId, reviewItemId })
  return reviewCase
}

export async function assignAlertReviewCaseOwner(reviewCaseId: number, payload: any) {
  record('assignAlertReviewCaseOwner', { reviewCaseId, payload })
  return { ...reviewCase, ownerUserId: payload?.ownerUserId ?? reviewCase.ownerUserId }
}

export async function closeAlertReviewCase(reviewCaseId: number, payload?: unknown) {
  record('closeAlertReviewCase', { reviewCaseId, payload })
  return { ...reviewCase, status: 'closed' }
}

export async function mergeAlertReviewCases(targetReviewCaseId: number, payload: any) {
  record('mergeAlertReviewCases', { targetReviewCaseId, payload })
  return {
    targetCase: { ...reviewCase, id: targetReviewCaseId, reviewItemIds: [101, 102] },
    sourceCase: { ...reviewCase, id: payload?.sourceReviewCaseId ?? 502, status: 'merged' },
  }
}

export async function splitAlertReviewCase(sourceReviewCaseId: number, payload: any) {
  record('splitAlertReviewCase', { sourceReviewCaseId, payload })
  return {
    sourceCase: { ...reviewCase, id: sourceReviewCaseId, reviewItemIds: [] },
    newCase: {
      ...reviewCase,
      id: 503,
      caseNo: 'RC-20260702-003',
      title: payload?.title || 'split follow-up',
      reviewItemIds: payload?.reviewItemIds || [101],
      ownerUserId: payload?.ownerUserId ?? reviewCase.ownerUserId,
    },
  }
}

export async function markAlertReviewFalsePositive(reviewItemId: number, payload?: unknown) {
  record('markAlertReviewFalsePositive', { reviewItemId, payload })
  return updateReviewItem({ reviewStatus: 'false_positive' })
}

export async function markAlertReviewReviewed(reviewItemId: number) {
  record('markAlertReviewReviewed', reviewItemId)
  return updateReviewItem({ reviewStatus: 'reviewed' })
}

export async function markAlertReviewUserStatus(reviewItemId: number, payload: unknown) {
  record('markAlertReviewUserStatus', { reviewItemId, payload })
  return { reviewItemId, userId: 9001, hasBeenReviewed: true, reviewedAt: '2026-07-02T08:07:00' }
}

export async function retryAlertReviewRecordEvidence(reviewItemId: number) {
  record('retryAlertReviewRecordEvidence', reviewItemId)
  return updateReviewItem({ recordEvidenceStatus: 'found' })
}

export async function updateAlertReviewRuleSuggestionStatus(reviewItemId: number, payload: unknown) {
  record('updateAlertReviewRuleSuggestionStatus', { reviewItemId, payload })
  return updateReviewItem({ ruleSuggestionStatus: 'accepted' })
}

export async function previewAlertReviewRuleSuggestion(reviewItemId: number) {
  record('previewAlertReviewRuleSuggestion', reviewItemId)
  return {
    reviewItemId,
    currentRule: { minStaySeconds: 30 },
    proposedRule: { minStaySeconds: 15 },
    diff: ['minStaySeconds 30 -> 15'],
    affectedReviewItemNos: ['RV-20260702-001'],
  }
}

export async function replayAlertReviewRule(payload: unknown) {
  record('replayAlertReviewRule', payload)
  return {
    ruleCode: 'person_loitering',
    evaluatedReviewItemIds: [101],
    evaluatedCount: 1,
    matchBeforeCount: 1,
    matchAfterCount: 1,
    falsePositiveBeforeCount: 0,
    falsePositiveBeforeRate: 0,
    falsePositiveAfterRate: 0,
    recommendedActions: ['keep_rule'],
    scope: {},
    report: {
      decision: 'safe',
      shouldApply: true,
      falsePositiveReduction: 2,
      possibleMissedCount: 2,
      impactScope: {
        cameraIds: ['cam-east-gate'],
        zoneCodes: ['gate-zone'],
      },
      ruleVersion: {
        applicationMode: 'shadow',
        semanticEngine: 'yfeieye-rule-geometry-v1',
        zoneInertiaFrames: 3,
        loiteringSeconds: 20,
      },
      sampleWindow: {
        startTime: '2026-07-02T08:00:00',
        endTime: '2026-07-02T08:20:00',
        sampleCount: 2,
      },
      hitComparison: {
        beforeCount: 2,
        afterCount: 0,
        difference: 2,
      },
      falseNegativeEstimate: {
        riskLevel: 'review_required',
        possibleMissedCount: 2,
      },
    },
    replayedAt: '2026-07-02T08:08:00',
  }
}

export async function evaluateAlertReviewRuleGeometry(payload: unknown) {
  record('evaluateAlertReviewRuleGeometry', payload)
  return {
    geometryType: 'bottom_center',
    inside: true,
    evaluatedPoint: [0.27, 0.74],
    zoneCode: 'gate-zone',
    replayedReviewItemIds: [101],
    ruleVersion: { applicationMode: 'shadow' },
    consistencyChecks: ['front_back_replay_use_bottom_center'],
    evaluatedAt: '2026-07-02T08:08:10',
    matchTraces: [{
      bbox: [0.11, 0.22, 0.43, 0.74],
      bottomCenter: [0.27, 0.74],
      zoneCode: 'gate-zone',
      minStaySeconds: 15,
      ruleVersion: 'shadow',
      geometryType: 'bottom_center',
    }],
  }
}

export async function revertAlertReviewRuleSuggestion(reviewItemId: number, payload: unknown) {
  record('revertAlertReviewRuleSuggestion', { reviewItemId, payload })
  return updateReviewItem({ ruleSuggestionStatus: 'reverted' })
}

export async function saveAlertReviewRule(payload: unknown) {
  record('saveAlertReviewRule', payload)
  return payload
}

export async function ignoreAlertReviewItem(reviewItemId: number, payload?: unknown) {
  record('ignoreAlertReviewItem', { reviewItemId, payload })
  return updateReviewItem({ reviewStatus: 'ignored' })
}

export async function convertAlertReviewToEvent(reviewItemId: number) {
  record('convertAlertReviewToEvent', reviewItemId)
  updateReviewItem({
    reviewStatus: 'converted',
    eventId: 7001,
    eventStatus: 'created',
    eventReviewStatus: 'converted',
  })
  return { reviewItemId, reviewStatus: 'converted', eventId: 7001, reused: false }
}
