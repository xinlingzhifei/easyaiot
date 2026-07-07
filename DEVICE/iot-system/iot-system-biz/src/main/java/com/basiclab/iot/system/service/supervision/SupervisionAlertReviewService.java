package com.basiclab.iot.system.service.supervision;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public interface SupervisionAlertReviewService {

    String STATUS_PENDING_REVIEW = "pending_review";
    String STATUS_REVIEWED = "reviewed";
    String STATUS_IGNORED = "ignored";
    String STATUS_FALSE_POSITIVE = "false_positive";
    String STATUS_CONVERTED = "converted";
    String RECORD_EVIDENCE_NOT_REQUIRED = "not_required";
    String RECORD_EVIDENCE_FOUND = "found";
    String RECORD_EVIDENCE_MISSING = "missing";
    String RECORD_EVIDENCE_FAILED = "failed";
    String RECORD_GAP_RECORD_NOT_FOUND = "record_not_found";
    String RECORD_GAP_VIDEO_URL_NOT_CONFIGURED = "video_url_not_configured";
    String RECORD_GAP_MISSING_LOOKUP_FIELDS = "missing_lookup_fields";
    String RECORD_GAP_FILE_MISSING = "file_missing";
    String RECORD_GAP_RETENTION_EXPIRED = "retention_expired";
    String RECORD_GAP_RECORD_SPACE_NOT_FOUND = "record_space_not_found";
    String RECORD_GAP_PROBE_FAILED = "probe_failed";
    String RECORD_GAP_PERMISSION_DENIED = "permission_denied";
    String RECORD_GAP_DISK_FULL = "disk_full";
    String RECORD_GAP_CACHE_FLUSH_FAILED = "cache_flush_failed";
    String RECORD_COVERAGE_AVAILABLE = "available";
    String RECORD_COVERAGE_MISSING = "missing";
    String RECORD_COVERAGE_MOTION = "motion";
    String REVIEW_CASE_OPEN = "open";
    String REVIEW_CASE_CLOSED = "closed";
    String REVIEW_CASE_MERGED = "merged";
    String RULE_SUGGESTION_PENDING = "pending";
    String RULE_SUGGESTION_ACCEPTED = "accepted";
    String RULE_SUGGESTION_REJECTED = "rejected";
    String RULE_SUGGESTION_APPLIED = "applied";
    String RULE_SUGGESTION_REVERTED = "reverted";
    String EXPORT_JOB_PENDING = "pending";
    String EXPORT_JOB_RUNNING = "running";
    String EXPORT_JOB_READY = "ready";
    String EXPORT_JOB_FAILED = "failed";
    String SEMANTIC_INDEX_PENDING = "pending";
    String SEMANTIC_INDEX_INDEXED = "indexed";
    String SEMANTIC_INDEX_FAILED = "failed";

    ReviewItemAggregate ingestClue(AlertClueCommand command);

    List<ReviewItemAggregate> listWorkbench(ReviewQuery query);

    List<ReviewEvidenceItem> getTimeline(Long reviewItemId);

    List<ReviewEvidenceItem> getTimeline(Long reviewItemId,
                                         Long reviewCaseId,
                                         Long operatorUserId,
                                         List<String> allowedCameraIds);

    List<ReviewDetailStreamItem> getReviewDetailStream(Long reviewItemId);

    List<ReviewDetailStreamItem> getReviewDetailStream(Long reviewItemId,
                                                       Long reviewCaseId,
                                                       Long operatorUserId,
                                                       List<String> allowedCameraIds);

    ReviewSegmentView getReviewSegment(Long reviewItemId);

    ReviewItemAggregate updateReviewLifecycle(ReviewLifecycleCommand command);

    ReviewItemAggregate retryRecordEvidence(Long reviewItemId);

    ReviewItemAggregate markReviewed(ReviewOperationCommand command);

    ReviewUserStatusView markUserReviewStatus(ReviewUserStatusCommand command);

    ReviewItemAggregate ignore(ReviewOperationCommand command);

    ReviewItemAggregate markFalsePositive(ReviewOperationCommand command);

    ReviewItemAggregate updateRuleSuggestionStatus(RuleSuggestionOperationCommand command);

    RuleSuggestionPreview previewRuleSuggestion(Long reviewItemId);

    ReviewItemAggregate revertRuleSuggestion(RuleSuggestionOperationCommand command);

    List<RuleSuggestionStat> listRuleSuggestionStats(ReviewQuery query);

    List<RecordCoverageSegment> getRecordCoverage(Long reviewItemId);

    List<RecordCoverageSegment> getRecordCoverage(Long reviewItemId,
                                                  Long reviewCaseId,
                                                  Long operatorUserId,
                                                  List<String> allowedCameraIds);

    ReviewRecordStorageSyncResult syncRecordStorage(ReviewRecordStorageSyncCommand command);

    ReviewCaseView createReviewCase(ReviewCaseCommand command);

    ReviewCaseView addToReviewCase(Long reviewCaseId, Long reviewItemId);

    ReviewCaseView assignReviewCaseOwner(ReviewCaseOwnerCommand command);

    ReviewCaseView closeReviewCase(ReviewCaseOperationCommand command);

    ReviewCaseMergeResult mergeReviewCases(ReviewCaseMergeCommand command);

    ReviewCaseSplitResult splitReviewCase(ReviewCaseSplitCommand command);

    List<ReviewCaseTimelineItem> getReviewCaseTimeline(Long reviewCaseId);

    List<ReviewCaseTimelineItem> getReviewCaseTimeline(Long reviewCaseId,
                                                       Long operatorUserId,
                                                       List<String> allowedCameraIds);

    List<ReviewItemAggregate> suggestReviewCaseCandidates(Long reviewItemId);

    ReviewWorkbenchSummary getWorkbenchSummary(ReviewQuery query);

    List<ReviewSemanticHit> semanticSearch(ReviewSemanticSearchCommand command);

    List<ReviewSemanticIndexEntry> reindexSemanticIndex(ReviewQuery query);

    ReviewSemanticReindexJob queueSemanticReindex(ReviewSemanticReindexCommand command);

    ReviewSemanticWorkerRun processSemanticIndexQueue(ReviewSemanticWorkerCommand command);

    ReviewSemanticIndexEvaluation evaluateSemanticIndex(ReviewSemanticIndexEvaluationCommand command);

    ReviewRuntimeHealthReport getReviewRuntimeHealth(ReviewRuntimeHealthCommand command);

    ReviewRuntimePatrolResult runRuntimePatrol(ReviewRuntimePatrolCommand command);

    ReviewRuntimeOutboxPublishResult publishRuntimeOutbox(ReviewRuntimeOutboxPublishCommand command);

    ReviewEventReconciliationResult reconcileEventProjections(ReviewEventReconciliationCommand command);

    ReviewReconciliationResult reconcileReviewRuntime(ReviewReconciliationCommand command);

    ReviewSemanticTriggerResult evaluateSemanticTrigger(ReviewSemanticTriggerCommand command);

    ReviewAiSummary summarizeReviewCase(Long reviewCaseId, Long operatorUserId);

    ReviewAiSummaryConfirmation confirmReviewCaseAiSummary(ReviewAiSummaryConfirmationCommand command);

    ReviewOperationsReport generateReviewReport(ReviewReportCommand command);

    ReviewEvidenceExportPackage exportReviewEvidence(ReviewEvidenceExportCommand command);

    ReviewEvidenceExportJob createReviewEvidenceExportJob(ReviewEvidenceExportCommand command);

    ReviewManifestVerification verifyEvidenceExportManifest(String jobNo);

    ReviewManifestVerification verifyEvidenceExportManifest(String jobNo,
                                                            Long operatorUserId,
                                                            List<String> allowedCameraIds);

    ReviewEvidenceVerificationReport verifyEvidencePackage(ReviewEvidenceVerificationCommand command);

    ReviewIntegrationSmokeResult runIntegrationSmoke(ReviewIntegrationSmokeCommand command);

    List<ReviewEvidenceAuditEntry> getEvidenceAuditTrail(Long reviewCaseId);

    List<ReviewEvidenceAuditEntry> getReviewItemEvidenceAuditTrail(Long reviewItemId);

    ReviewEvidenceAuditEntry recordEvidenceDownload(String jobNo, Long operatorUserId, String reason);

    ReviewEvidenceAuditEntry recordEvidenceDownload(String jobNo,
                                                    Long operatorUserId,
                                                    String reason,
                                                    List<String> allowedCameraIds);

    ReviewMediaAccessAuditEntry auditMediaAccess(ReviewMediaAccessCommand command);

    ReviewToEventResult convertToEvent(ReviewToEventCommand command);

    ReviewRuleReplayResult replayRule(ReviewRuleReplayCommand command);

    ReviewRuleGeometryEvaluation evaluateRuleGeometry(ReviewRuleGeometryCommand command);

    ReviewRuleView saveRule(ReviewRuleCommand command);

    List<ReviewRuleView> listRules();

    record AlertClueCommand(String sourceSystem,
                            String sourceAlertId,
                            String ruleCode,
                            String sourceAlertType,
                            LocalDateTime alertTime,
                            String deviceId,
                            String cameraId,
                            String zoneCode,
                            String objectLabel,
                            Integer staySeconds,
                            String snapshotUri,
                            String recordUri,
                            String sourcePayloadHash,
                            List<String> labels,
                            List<String> zones,
                            List<String> objectIds,
                            Double confidence,
                            List<Double> bbox,
                            String correlationId,
                            List<String> verifiedObjects,
                            LocalDateTime thumbTime,
                            List<String> audioLabels,
                            Map<String, Object> motionMetadata) {
        public AlertClueCommand(String sourceSystem,
                                String sourceAlertId,
                                String ruleCode,
                                String sourceAlertType,
                                LocalDateTime alertTime,
                                String deviceId,
                                String cameraId,
                                String zoneCode,
                                String objectLabel,
                                Integer staySeconds,
                                String snapshotUri,
                                String recordUri,
                                String sourcePayloadHash,
                                List<String> labels,
                                List<String> zones,
                                List<String> objectIds,
                                Double confidence,
                                List<Double> bbox,
                                String correlationId) {
            this(sourceSystem, sourceAlertId, ruleCode, sourceAlertType, alertTime, deviceId, cameraId,
                    zoneCode, objectLabel, staySeconds, snapshotUri, recordUri, sourcePayloadHash,
                    labels, zones, objectIds, confidence, bbox, correlationId, null, null, null, null);
        }

        public AlertClueCommand(String sourceSystem,
                                String sourceAlertId,
                                String ruleCode,
                                String sourceAlertType,
                                LocalDateTime alertTime,
                                String deviceId,
                                String cameraId,
                                String zoneCode,
                                String objectLabel,
                                Integer staySeconds,
                                String snapshotUri,
                                String recordUri,
                                String sourcePayloadHash) {
            this(sourceSystem, sourceAlertId, ruleCode, sourceAlertType, alertTime, deviceId, cameraId,
                    zoneCode, objectLabel, staySeconds, snapshotUri, recordUri, sourcePayloadHash,
                    null, null, null, null, null, null, null, null, null, null);
        }
    }

    record ReviewItemDraft(String sourceSystem,
                           String sourceAlertId,
                           String ruleCode,
                           String sourceAlertType,
                           LocalDateTime alertTime,
                           String deviceId,
                           String cameraId,
                           String zoneCode,
                           String objectLabel,
                           String sourcePayloadHash,
                           Map<String, Object> reviewData,
                           String recordEvidenceStatus,
                           LocalDateTime recordEvidenceCheckedAt,
                           String recordEvidenceMessage) {
    }

    record ReviewItemAggregate(Long id,
                               String reviewItemNo,
                               String sourceSystem,
                               String ruleCode,
                               String sourceAlertType,
                               String deviceId,
                               String cameraId,
                               String zoneCode,
                               String objectLabel,
                               LocalDateTime firstAlertTime,
                               LocalDateTime lastAlertTime,
                               Integer alertCount,
                               List<String> sourceAlertIds,
                               Map<String, Object> reviewData,
                               String reviewStatus,
                               Long reviewerUserId,
                               LocalDateTime reviewedAt,
                               String ignoreReason,
                               Map<String, Object> ruleSuggestion,
                               Long eventId,
                               LocalDateTime convertedAt,
                               String recordEvidenceStatus,
                               LocalDateTime recordEvidenceCheckedAt,
                               String recordEvidenceMessage,
                               String eventStatus,
                               String closeCheckStatus,
                               String evidenceStatus,
                               String eventReviewStatus,
                               Boolean inReviewCase,
                               String ruleSuggestionStatus,
                               LocalDateTime ruleSuggestionUpdatedAt) {
        public ReviewItemAggregate(Long id,
                                   String reviewItemNo,
                                   String sourceSystem,
                                   String ruleCode,
                                   String sourceAlertType,
                                   String deviceId,
                                   String cameraId,
                                   String zoneCode,
                                   String objectLabel,
                                   LocalDateTime firstAlertTime,
                                   LocalDateTime lastAlertTime,
                                   Integer alertCount,
                                   List<String> sourceAlertIds,
                                   Map<String, Object> reviewData,
                                   String reviewStatus,
                                   Long reviewerUserId,
                                   LocalDateTime reviewedAt,
                                   String ignoreReason,
                                   Map<String, Object> ruleSuggestion,
                                   Long eventId,
                                   LocalDateTime convertedAt,
                                   String recordEvidenceStatus,
                                   LocalDateTime recordEvidenceCheckedAt,
                                   String recordEvidenceMessage,
                                   String eventStatus,
                                   String closeCheckStatus,
                                   String evidenceStatus) {
            this(id, reviewItemNo, sourceSystem, ruleCode, sourceAlertType, deviceId, cameraId,
                    zoneCode, objectLabel, firstAlertTime, lastAlertTime, alertCount, sourceAlertIds,
                    reviewData, reviewStatus, reviewerUserId, reviewedAt, ignoreReason, ruleSuggestion,
                    eventId, convertedAt, recordEvidenceStatus, recordEvidenceCheckedAt, recordEvidenceMessage,
                    eventStatus, closeCheckStatus, evidenceStatus, null, false, null, null);
        }
    }

    record ReviewEvidenceItem(Long reviewItemId,
                              String sourceAlertId,
                              String materialType,
                              String materialUri,
                              LocalDateTime happenedAt) {
    }

    record ReviewDetailStreamItem(Long reviewItemId,
                                  String sourceAlertId,
                                  String cameraId,
                                  String zoneCode,
                                  String objectId,
                                  String label,
                                  String lifecycleEvent,
                                  LocalDateTime happenedAt,
                                  LocalDateTime seekTime,
                                  List<Double> bbox,
                                  List<Map<String, Object>> path,
                                  String materialType,
                                  String materialUri,
                                  Map<String, Object> metadata) {
    }

    record ReviewSegmentView(Long reviewItemId,
                             String segmentId,
                             String cameraId,
                             String severity,
                             String status,
                             LocalDateTime startTime,
                             LocalDateTime endTime,
                             List<String> objectIds,
                             List<String> zones,
                             List<String> sourceAlertIds,
                             List<Map<String, Object>> events,
                             Map<String, Object> metadata) {
    }

    record ReviewLifecycleCommand(Long reviewItemId,
                                  String lifecycleState,
                                  LocalDateTime happenedAt,
                                  List<String> objectIds,
                                  List<String> labels,
                                  List<String> zones,
                                  List<Double> bbox,
                                  Map<String, Object> motionMetadata,
                                  String recordUri) {
    }

    record RecordCoverageSegment(String status,
                                 LocalDateTime startTime,
                                 LocalDateTime endTime,
                                 Integer motion,
                                 String recordUri,
                                 Integer objects,
                                 Map<String, Object> metadata) {
        public RecordCoverageSegment(String status,
                                     LocalDateTime startTime,
                                     LocalDateTime endTime,
                                     Integer motion,
                                     String recordUri) {
            this(status, startTime, endTime, motion, recordUri, null, Map.of());
        }
    }

    record ReviewRecordStorageSyncCommand(Long reviewItemId,
                                          Long operatorUserId,
                                          List<RecordCoverageSegment> coverageSegments) {
    }

    record ReviewRecordStorageSyncResult(Long reviewItemId,
                                         String syncStatus,
                                         Integer availableSegmentCount,
                                         Integer missingSegmentCount,
                                         Integer motionSegmentCount,
                                         Integer availableSeconds,
                                         Integer missingSeconds,
                                         Integer motionSeconds,
                                         List<RecordCoverageSegment> coverage,
                                         LocalDateTime syncedAt,
                                         Long operatorUserId) {
    }

    record ReviewOperationCommand(Long reviewItemId,
                                  Long reviewerUserId,
                                  String reason) {
    }

    record ReviewUserStatusCommand(Long reviewItemId,
                                   Long userId,
                                   Boolean hasBeenReviewed) {
    }

    record ReviewUserStatusView(Long reviewItemId,
                                Long userId,
                                Boolean hasBeenReviewed,
                                LocalDateTime reviewedAt) {
    }

    record RuleSuggestionOperationCommand(Long reviewItemId,
                                          Long reviewerUserId,
                                          String status,
                                          String note) {
    }

    record RuleSuggestionPreview(Long reviewItemId,
                                 Map<String, Object> currentRule,
                                 Map<String, Object> proposedRule,
                                 List<String> diff,
                                 List<String> affectedReviewItemNos) {
    }

    record ReviewToEventCommand(Long reviewItemId,
                                Long reviewerUserId) {
    }

    record ReviewToEventResult(Long reviewItemId,
                               String reviewStatus,
                               Long eventId,
                               boolean reused) {
    }

    record ReviewCaseCommand(String title,
                             Long primaryReviewItemId,
                             List<Long> reviewItemIds,
                             Long ownerUserId,
                             String notes) {
        public ReviewCaseCommand(String title,
                                 Long primaryReviewItemId,
                                 List<Long> reviewItemIds) {
            this(title, primaryReviewItemId, reviewItemIds, null, null);
        }
    }

    record ReviewCaseOwnerCommand(Long reviewCaseId,
                                  Long ownerUserId,
                                  Long operatorUserId,
                                  String notes) {
    }

    record ReviewCaseOperationCommand(Long reviewCaseId,
                                      Long operatorUserId,
                                      String notes) {
    }

    record ReviewCaseMergeCommand(Long targetReviewCaseId,
                                  Long sourceReviewCaseId,
                                  Long operatorUserId,
                                  String notes) {
    }

    record ReviewCaseSplitCommand(Long sourceReviewCaseId,
                                  List<Long> reviewItemIds,
                                  String title,
                                  Long ownerUserId,
                                  Long operatorUserId,
                                  String notes) {
    }

    record ReviewCaseMergeResult(ReviewCaseView targetCase,
                                 ReviewCaseView sourceCase) {
    }

    record ReviewCaseSplitResult(ReviewCaseView sourceCase,
                                 ReviewCaseView newCase) {
    }

    record ReviewCaseDraft(String title,                           Long primaryReviewItemId,
                           Long ownerUserId,
                           String notes) {
        public ReviewCaseDraft(String title,
                               Long primaryReviewItemId) {
            this(title, primaryReviewItemId, null, null);
        }
    }

    record ReviewCaseView(Long id,
                          String caseNo,
                          String title,
                          String status,
                          Long primaryReviewItemId,
                          List<Long> reviewItemIds,
                          List<String> cameraIds,
                          LocalDateTime startTime,
                          LocalDateTime endTime,
                          Long ownerUserId,
                          String notes) {
        public ReviewCaseView(Long id,
                              String caseNo,
                              String title,
                              String status,
                              Long primaryReviewItemId,
                              List<Long> reviewItemIds,
                              List<String> cameraIds,
                              LocalDateTime startTime,
                              LocalDateTime endTime) {
            this(id, caseNo, title, status, primaryReviewItemId, reviewItemIds, cameraIds, startTime, endTime, null, null);
        }
    }

    record ReviewCaseTimelineItem(Long reviewCaseId,
                                  Long reviewItemId,
                                  String cameraId,
                                  String sourceAlertId,
                                  String materialType,
                                  String materialUri,
                                  LocalDateTime happenedAt,
                                  String actionNote) {
        public ReviewCaseTimelineItem(Long reviewCaseId,
                                      Long reviewItemId,
                                      String cameraId,
                                      String sourceAlertId,
                                      String materialType,
                                      String materialUri,
                                      LocalDateTime happenedAt) {
            this(reviewCaseId, reviewItemId, cameraId, sourceAlertId, materialType, materialUri, happenedAt, null);
        }
    }

    record ReviewQuery(String reviewStatus,
                       String cameraId,
                       String zoneCode,
                       String objectLabel,
                       String recordEvidenceStatus,
                       Boolean converted,
                       Boolean inReviewCase,
                       Long reviewerUserId,
                       LocalDateTime beginTime,
                       LocalDateTime endTime) {
        public ReviewQuery(String reviewStatus,
                           String cameraId,
                           LocalDateTime beginTime,
                           LocalDateTime endTime) {
            this(reviewStatus, cameraId, null, null, null, null, null, null, beginTime, endTime);
        }
    }

    record ReviewWorkbenchSummary(long total,
                                   long pendingReview,
                                   long reviewedByMe,
                                   long missingRecord,
                                   long converted,
                                   long inReviewCase) {
    }

    record ReviewRuntimeHealthCommand(ReviewQuery query,
                                      Long operatorUserId) {
    }

    record ReviewRuntimeHealthReport(Integer totalCount,
                                     Integer missingRecordCount,
                                     Integer staleSemanticIndexCount,
                                     Integer failedExportJobCount,
                                     Double missingRecordRate,
                                     Double exportFailureRate,
                                     Integer semanticBacklogCount,
                                     Integer repairableCount,
                                     Map<String, Integer> recordGapReasons,
                                     Map<String, Map<String, Object>> recordGapReasonCatalog,
                                     List<String> alerts,
                                     LocalDateTime measuredAt,
                                     Long operatorUserId) {
    }

    record ReviewRuntimePatrolCommand(ReviewQuery query,
                                      Long operatorUserId,
                                      Boolean repair,
                                      Integer maxAttempts,
                                      Boolean scheduled) {
    }

    record ReviewRuntimePatrolResult(String status,
                                     boolean lockAcquired,
                                     Integer maxAttempts,
                                     Integer attemptCount,
                                     ReviewRuntimeHealthReport healthReport,
                                     ReviewReconciliationResult reconciliationResult,
                                     List<String> alerts,
                                     List<String> notifications,
                                     List<String> recommendedActions,
                                     LocalDateTime executedAt,
                                     Long operatorUserId,
                                     Map<String, Object> metadata) {
    }

    record ReviewRuntimeLockAcquisition(String lockName,
                                        Boolean acquired,
                                        Boolean recoveredStaleLock,
                                        Long previousOwnerUserId,
                                        LocalDateTime previousLockedUntil,
                                        LocalDateTime lockedUntil,
                                        LocalDateTime acquiredAt,
                                        String reason) {
    }

    record ReviewRuntimeOutboxPublishCommand(Integer limit,
                                             Long operatorUserId) {
    }

    record ReviewRuntimeOutboxMessage(Long id,
                                      String runId,
                                      String eventType,
                                      String alertKey,
                                      String payload,
                                      Integer retryCount,
                                      LocalDateTime createdAt) {
    }

    record ReviewRuntimeOutboxPublishResult(Integer scannedCount,
                                            Integer publishedCount,
                                            Integer failedCount,
                                            List<String> publishedAlerts,
                                            List<String> failedAlerts,
                                            LocalDateTime publishedAt,
                                            Long operatorUserId) {
    }

    record ReviewEventReconciliationCommand(ReviewQuery query,
                                            Long operatorUserId) {
    }

    record ReviewEventReconciliationResult(Integer scannedCount,
                                           Integer reconciledCount,
                                           Integer missingProjectionCount,
                                           List<String> findings,
                                           LocalDateTime reconciledAt,
                                           Long operatorUserId) {
    }

    record ReviewReconciliationCommand(ReviewQuery query,
                                       Long operatorUserId,
                                       Boolean repair) {
    }

    record ReviewReconciliationResult(Integer scannedCount,
                                      Integer repairedRecordCount,
                                      Integer repairedSemanticIndexCount,
                                      Integer failedExportJobCount,
                                      List<String> findings,
                                      ReviewRuntimeHealthReport healthReport,
                                      LocalDateTime reconciledAt,
                                      Long operatorUserId) {
    }

    record ReviewSemanticSearchCommand(String query,
                                       ReviewQuery filters,
                                       Integer limit) {
    }

    record ReviewSemanticHit(ReviewItemAggregate item,
                             double score,
                             List<String> matchedTerms,
                             String snippet) {
    }

    record ReviewSemanticIndexEntry(Long reviewItemId,
                                    String cameraId,
                                    LocalDateTime firstAlertTime,
                                    LocalDateTime lastAlertTime,
                                    String indexStatus,
                                    String document,
                                    String embeddingKey,
                                    String embeddingModel,
                                    String embeddingVectorHash,
                                    Integer retryCount,
                                    String lastError,
                                    LocalDateTime indexedAt,
                                    Integer indexVersion) {
    }

    record ReviewSemanticReindexCommand(ReviewQuery query,
                                        Long operatorUserId) {
    }

    record ReviewSemanticReindexJob(String jobNo,
                                    String status,
                                    List<Long> queuedReviewItemIds,
                                    LocalDateTime queuedAt,
                                    Long operatorUserId) {
    }

    record ReviewSemanticWorkerCommand(ReviewQuery query,
                                       Integer maxItems,
                                       Long operatorUserId) {
    }

    record ReviewSemanticWorkerRun(String status,
                                   Integer scannedCount,
                                   Integer processedCount,
                                   Integer failedCount,
                                   Integer remainingBacklogCount,
                                   Double progressRate,
                                   List<Long> processedReviewItemIds,
                                   List<Long> failedReviewItemIds,
                                   LocalDateTime processedAt,
                                   Long operatorUserId) {
    }

    record ReviewSemanticIndexEvaluationCommand(ReviewQuery query,
                                                Long operatorUserId) {
    }

    record ReviewSemanticIndexEvaluation(Integer totalCount,
                                         Integer pendingCount,
                                         Integer indexedCount,
                                         Integer failedCount,
                                         Double coverageRate,
                                         List<Long> staleReviewItemIds,
                                         List<String> recommendedActions,
                                         Double rebuildProgressRate,
                                         String backlogAlarmLevel,
                                         Integer latestIndexVersion,
                                         LocalDateTime evaluatedAt,
                                         Long operatorUserId) {
    }

    record ReviewSemanticTriggerCommand(String triggerName,
                                        String cameraId,
                                        String triggerType,
                                        String data,
                                        Double threshold,
                                        List<String> actions,
                                        ReviewQuery filters) {
    }

    record ReviewSemanticTriggerResult(String triggerName,
                                       String triggerType,
                                       String data,
                                       List<Long> matchedReviewItemIds,
                                       List<Map<String, Object>> actionPayloads,
                                       LocalDateTime evaluatedAt,
                                       List<Map<String, Object>> hitExplanations,
                                       List<Map<String, Object>> actionPreviews,
                                       String humanConfirmationStatus) {
        public ReviewSemanticTriggerResult(String triggerName,
                                           String triggerType,
                                           String data,
                                           List<Long> matchedReviewItemIds,
                                           List<Map<String, Object>> actionPayloads,
                                           LocalDateTime evaluatedAt) {
            this(triggerName, triggerType, data, matchedReviewItemIds, actionPayloads, evaluatedAt,
                    List.of(), List.of(), "pending");
        }
    }

    record ReviewAiSummary(Long reviewCaseId,
                           List<Long> reviewItemIds,
                           String title,
                           String summary,
                           List<String> keyFacts,
                           List<String> evidenceGaps,
                           List<String> recommendedActions,
                           LocalDateTime generatedAt,
                           String generatedBy,
                           Map<String, Object> structuredData) {
        public ReviewAiSummary(Long reviewCaseId,
                               List<Long> reviewItemIds,
                               String title,
                               String summary,
                               List<String> keyFacts,
                               List<String> evidenceGaps,
                               List<String> recommendedActions,
                               LocalDateTime generatedAt,
                               String generatedBy) {
            this(reviewCaseId, reviewItemIds, title, summary, keyFacts, evidenceGaps,
                    recommendedActions, generatedAt, generatedBy, Map.of());
        }
    }

    record ReviewAiSummaryConfirmationCommand(Long reviewCaseId,
                                              String confirmationStatus,
                                              String notes,
                                              Long operatorUserId) {
    }

    record ReviewAiSummaryConfirmation(Long reviewCaseId,
                                       String confirmationStatus,
                                       String previousConfirmationStatus,
                                       String promptHash,
                                       String promptVersion,
                                       String summaryHash,
                                       Long operatorUserId,
                                       String notes,
                                       LocalDateTime confirmedAt,
                                       boolean duplicate,
                                       Map<String, Object> metadata) {
    }

    record ReviewReportCommand(String reportType,
                               ReviewQuery query,
                               LocalDateTime periodStart,
                               LocalDateTime periodEnd,
                               Long operatorUserId) {
    }

    record ReviewOperationsReport(String reportType,
                                  List<Long> reviewItemIds,
                                  String title,
                                  String summary,
                                  List<String> evidenceGaps,
                                  List<String> recommendedActions,
                                  LocalDateTime generatedAt,
                                  Long operatorUserId,
                                  Map<String, Object> structuredData,
                                  Map<String, Object> deliveryPlan,
                                  Map<String, Object> acknowledgement) {
        public ReviewOperationsReport(String reportType,
                                      List<Long> reviewItemIds,
                                      String title,
                                      String summary,
                                      List<String> evidenceGaps,
                                      List<String> recommendedActions,
                                      LocalDateTime generatedAt,
                                      Long operatorUserId,
                                      Map<String, Object> structuredData) {
            this(reportType, reviewItemIds, title, summary, evidenceGaps, recommendedActions,
                    generatedAt, operatorUserId, structuredData, Map.of(), Map.of());
        }
    }

    record ReviewEvidenceExportCommand(Long reviewCaseId,
                                       List<Long> reviewItemIds,
                                       Long operatorUserId,
                                       String format,
                                       String reason,
                                       Long approverUserId,
                                       String approvalNote,
                                       List<String> allowedCameraIds) {
        public ReviewEvidenceExportCommand(Long reviewCaseId,
                                           List<Long> reviewItemIds,
                                           Long operatorUserId,
                                           String format) {
            this(reviewCaseId, reviewItemIds, operatorUserId, format, null, null, null, null);
        }

        public ReviewEvidenceExportCommand(Long reviewCaseId,
                                           List<Long> reviewItemIds,
                                           Long operatorUserId,
                                           String format,
                                           String reason) {
            this(reviewCaseId, reviewItemIds, operatorUserId, format, reason, null, null, null);
        }

        public ReviewEvidenceExportCommand(Long reviewCaseId,
                                           List<Long> reviewItemIds,
                                           Long operatorUserId,
                                           String format,
                                           String reason,
                                           Long approverUserId,
                                           String approvalNote) {
            this(reviewCaseId, reviewItemIds, operatorUserId, format, reason, approverUserId, approvalNote, null);
        }
    }

    record ReviewEvidenceExportPackage(String packageNo,
                                       String format,
                                       Long reviewCaseId,
                                       List<Long> reviewItemIds,
                                       List<String> evidenceUris,
                                       List<ReviewCaseTimelineItem> timeline,
                                       Map<String, Object> manifest,
                                       LocalDateTime generatedAt) {
    }

    record ReviewEvidenceExportJob(String jobNo,
                                   String status,
                                   ReviewEvidenceExportPackage exportPackage,
                                   String fileHash,
                                   LocalDateTime expiresAt,
                                   Long operatorUserId,
                                   String reason,
                                   List<Long> boundEventIds,
                                   LocalDateTime createdAt) {
    }

    record ReviewManifestVerification(String jobNo,
                                       boolean valid,
                                       String expectedManifestHash,
                                       String actualManifestHash,
                                       String packageChecksum,
                                       List<String> violations,
                                       LocalDateTime verifiedAt) {
    }

    record ReviewEvidenceVerificationCommand(String jobNo,
                                             Long operatorUserId,
                                             List<String> allowedCameraIds) {
        public ReviewEvidenceVerificationCommand(String jobNo,
                                                 Long operatorUserId) {
            this(jobNo, operatorUserId, null);
        }
    }

    record ReviewEvidenceVerificationReport(String jobNo,
                                            boolean valid,
                                            ReviewManifestVerification manifestVerification,
                                            Map<String, Object> manifestV2,
                                            List<Map<String, Object>> decisionTrail,
                                            List<String> replayableReasons,
                                            List<ReviewEvidenceAuditEntry> auditTrail,
                                            LocalDateTime verifiedAt,
                                            Long operatorUserId) {
    }

    record ReviewEvidenceAuditEntry(Long reviewCaseId,
                                    Long reviewItemId,
                                    String actionType,
                                    String jobNo,
                                    String fileHash,
                                    Long operatorUserId,
                                    String actionNote,
                                    List<String> evidenceUris,
                                    List<Long> boundEventIds,
                                    LocalDateTime happenedAt,
                                    Map<String, Object> metadata) {
    }

    record ReviewMediaAccessCommand(Long reviewCaseId,
                                    Long reviewItemId,
                                    Long operatorUserId,
                                    String cameraId,
                                    String materialUri,
                                    String actionType,
                                    List<String> allowedCameraIds,
                                    String reason) {
    }

    record ReviewMediaAccessAuditEntry(Long reviewCaseId,
                                       Long reviewItemId,
                                       Long operatorUserId,
                                       String cameraId,
                                       String materialUri,
                                       String actionType,
                                       String decision,
                                       List<String> deniedReasons,
                                       LocalDateTime happenedAt,
                                       Map<String, Object> metadata) {
    }

    record ReviewCameraPermissionRequest(Long reviewCaseId,
                                         Long operatorUserId,
                                         Long tenantId,
                                         String actionType,
                                         List<String> requestedCameraIds) {
    }

    interface ReviewCameraPermissionResolver {

        /**
         * Returns the service-side camera scope for the request.
         * A null return means unrestricted internal/system access. An empty list means deny all cameras.
         */
        List<String> resolveAllowedCameraIds(ReviewCameraPermissionRequest request);

        static ReviewCameraPermissionResolver unrestricted() {
            return request -> null;
        }
    }

    record ReviewEvidenceVideoExportRequest(Long reviewCaseId,
                                            Long reviewItemId,
                                            String deviceId,
                                            String cameraId,
                                            String sourceAlertId,
                                            LocalDateTime startTime,
                                            LocalDateTime endTime,
                                            String recordUri,
                                            String format) {
    }

    record ReviewEvidenceVideoExportResult(String exportId,
                                            String exportUri,
                                            String status,
                                            String message) {
    }

    record ReviewIntegrationSmokeCommand(Long operatorUserId,
                                         Boolean includeVideoExport,
                                         LocalDateTime alertTime,
                                         String profile) {
        public ReviewIntegrationSmokeCommand(Long operatorUserId,
                                             Boolean includeVideoExport,
                                             LocalDateTime alertTime) {
            this(operatorUserId, includeVideoExport, alertTime, "service-synthetic");
        }
    }

    record ReviewIntegrationSmokeResult(String status,
                                        Long reviewItemId,
                                        Long reviewCaseId,
                                        String exportJobNo,
                                        boolean manifestValid,
                                        boolean videoExportRequested,
                                        List<String> checkpoints,
                                        LocalDateTime executedAt,
                                        Long operatorUserId,
                                        String profile) {
        public ReviewIntegrationSmokeResult(String status,
                                            Long reviewItemId,
                                            Long reviewCaseId,
                                            String exportJobNo,
                                            boolean manifestValid,
                                            boolean videoExportRequested,
                                            List<String> checkpoints,
                                            LocalDateTime executedAt,
                                            Long operatorUserId) {
            this(status, reviewItemId, reviewCaseId, exportJobNo, manifestValid, videoExportRequested,
                    checkpoints, executedAt, operatorUserId, "service-synthetic");
        }
    }

    record RuleSuggestionStat(String cameraId,
                              String zoneCode,
                              String objectLabel,
                              String action,
                              long falsePositiveCount,
                              long totalCount,
                              Double falsePositiveRate,
                              List<String> candidateActions,
                              LocalDateTime lastSeenAt) {
    }

    record RecordEvidenceRequest(String sourceAlertId,
                                 String deviceId,
                                 String cameraId,
                                 LocalDateTime alertTime) {
    }

    record RecordEvidenceResult(String recordUri,
                                String message) {
    }

    record RecordCoverageRequest(String deviceId,
                                 String cameraId,
                                 LocalDateTime beginTime,
                                 LocalDateTime endTime) {
    }

    record EventProjection(Long eventId,
                           String eventStatus,
                           String closeCheckStatus,
                           String evidenceStatus) {
    }

    record ReviewRuleCommand(Long id,
                             String ruleCode,
                             String ruleName,
                             String sourceSystem,
                             String cameraId,
                             String zoneCode,
                             String objectLabel,
                             Integer minStaySeconds,
                             LocalDateTime activeStart,
                             LocalDateTime activeEnd,
                             Boolean enabled,
                             Integer inertiaFrames,
                             Integer loiteringSeconds) {
        public ReviewRuleCommand(Long id,
                                 String ruleCode,
                                 String ruleName,
                                 String sourceSystem,
                                 String cameraId,
                                 String zoneCode,
                                 String objectLabel,
                                 Integer minStaySeconds,
                                 LocalDateTime activeStart,
                                 LocalDateTime activeEnd,
                                 Boolean enabled) {
            this(id, ruleCode, ruleName, sourceSystem, cameraId, zoneCode, objectLabel,
                    minStaySeconds, activeStart, activeEnd, enabled, null, null);
        }
    }

    record ReviewRuleView(Long id,
                           String ruleCode,
                           String ruleName,
                           String sourceSystem,
                          String cameraId,
                          String zoneCode,
                          String objectLabel,
                          Integer minStaySeconds,
                          LocalDateTime activeStart,
                          LocalDateTime activeEnd,
                           Boolean enabled,
                           Integer inertiaFrames,
                           Integer loiteringSeconds) {
        public ReviewRuleView(Long id,
                              String ruleCode,
                              String ruleName,
                              String sourceSystem,
                              String cameraId,
                              String zoneCode,
                              String objectLabel,
                              Integer minStaySeconds,
                              LocalDateTime activeStart,
                              LocalDateTime activeEnd,
                              Boolean enabled) {
            this(id, ruleCode, ruleName, sourceSystem, cameraId, zoneCode, objectLabel,
                    minStaySeconds, activeStart, activeEnd, enabled, null, null);
        }
    }

    record ReviewRuleGeometryCommand(String ruleCode,
                                     String cameraId,
                                     String zoneCode,
                                     List<List<Double>> polygon,
                                     List<Double> bbox,
                                     String objectLabel,
                                     ReviewQuery query,
                                     Long operatorUserId) {
    }

    record ReviewRuleGeometryEvaluation(String geometryType,
                                        boolean inside,
                                        List<Double> evaluatedPoint,
                                        String zoneCode,
                                        List<Long> replayedReviewItemIds,
                                        Map<String, Object> ruleVersion,
                                        List<String> consistencyChecks,
                                        LocalDateTime evaluatedAt,
                                        List<Map<String, Object>> matchTraces) {
        public ReviewRuleGeometryEvaluation(String geometryType,
                                            boolean inside,
                                            List<Double> evaluatedPoint,
                                            String zoneCode,
                                            List<Long> replayedReviewItemIds,
                                            Map<String, Object> ruleVersion,
                                            List<String> consistencyChecks,
                                            LocalDateTime evaluatedAt) {
            this(geometryType, inside, evaluatedPoint, zoneCode, replayedReviewItemIds, ruleVersion,
                    consistencyChecks, evaluatedAt, List.of());
        }
    }

    record ReviewRuleReplayCommand(String ruleCode,
                                   String sourceSystem,
                                   String cameraId,
                                   String zoneCode,
                                   String objectLabel,
                                   Integer minStaySeconds,
                                   LocalDateTime beginTime,
                                   LocalDateTime endTime,
                                   Long operatorUserId) {
    }

    record ReviewRuleReplayResult(String ruleCode,
                                  List<Long> evaluatedReviewItemIds,
                                  Integer evaluatedCount,
                                  Integer matchBeforeCount,
                                  Integer matchAfterCount,
                                  Integer falsePositiveBeforeCount,
                                  Double falsePositiveBeforeRate,
                                  Double falsePositiveAfterRate,
                                  List<String> recommendedActions,
                                  Map<String, Object> scope,
                                  Map<String, Object> report,
                                  LocalDateTime replayedAt) {
    }

    interface ReviewItemStore {

        Optional<ReviewItemAggregate> findMergeCandidate(String sourceSystem,
                                                         String cameraId,
                                                         String zoneCode,
                                                         String ruleCode,
                                                         LocalDateTime windowStart,
                                                         LocalDateTime windowEnd);

        default Optional<ReviewItemAggregate> findByIngestIdentity(String sourceSystem,
                                                                   String sourceAlertId,
                                                                   List<String> identityKeys) {
            List<String> keys = identityKeys == null ? List.of() : identityKeys;
            return listWorkbench(null).stream()
                    .filter(item -> Objects.equals(sourceSystem, item.sourceSystem()))
                    .filter(item -> hasSourceAlertId(item, sourceAlertId)
                            || hasReviewDataIdentityKey(item.reviewData(), keys))
                    .findFirst();
        }

        ReviewItemAggregate create(ReviewItemDraft draft, List<ReviewEvidenceItem> evidenceItems);

        ReviewItemAggregate appendClue(Long reviewItemId,
                                       String sourceAlertId,
                                       LocalDateTime alertTime,
                                       List<ReviewEvidenceItem> evidenceItems,
                                       Map<String, Object> reviewData,
                                       String recordEvidenceStatus,
                                       LocalDateTime recordEvidenceCheckedAt,
                                       String recordEvidenceMessage);

        ReviewItemAggregate appendEvidence(Long reviewItemId,
                                           List<ReviewEvidenceItem> evidenceItems);

        ReviewItemAggregate updateRecordEvidenceStatus(Long reviewItemId,
                                                       String recordEvidenceStatus,
                                                       LocalDateTime recordEvidenceCheckedAt,
                                                       String recordEvidenceMessage);

        ReviewItemAggregate updateReviewLifecycle(Long reviewItemId,
                                                  Map<String, Object> reviewData,
                                                  LocalDateTime firstAlertTime,
                                                  LocalDateTime lastAlertTime,
                                                  List<ReviewEvidenceItem> evidenceItems,
                                                  String recordEvidenceStatus,
                                                  LocalDateTime recordEvidenceCheckedAt,
                                                  String recordEvidenceMessage);

        Optional<ReviewItemAggregate> findById(Long reviewItemId);

        List<ReviewItemAggregate> listWorkbench(ReviewQuery query);

        List<ReviewEvidenceItem> listTimeline(Long reviewItemId);

        ReviewItemAggregate updateReviewStatus(Long reviewItemId,
                                               String reviewStatus,
                                               Long reviewerUserId,
                                               String ignoreReason,
                                               LocalDateTime reviewedAt);

        ReviewUserStatusView upsertUserReviewStatus(Long reviewItemId,
                                                    Long userId,
                                                    boolean hasBeenReviewed,
                                                    LocalDateTime reviewedAt);

        Optional<ReviewUserStatusView> findUserReviewStatus(Long reviewItemId, Long userId);

        long countReviewedByUser(List<Long> reviewItemIds, Long userId);

        ReviewItemAggregate updateFalsePositive(Long reviewItemId,
                                                Long reviewerUserId,
                                                String reason,
                                                Map<String, Object> ruleSuggestion,
                                                LocalDateTime reviewedAt);

        ReviewItemAggregate updateRuleSuggestionStatus(Long reviewItemId,
                                                       Long reviewerUserId,
                                                       String status,
                                                       Map<String, Object> ruleSuggestion,
                                                       LocalDateTime updatedAt);

        ReviewItemAggregate markConverted(Long reviewItemId,
                                          Long reviewerUserId,
                                          Long eventId,
                                          LocalDateTime convertedAt);

        ReviewCaseView createCase(ReviewCaseDraft draft, List<Long> reviewItemIds);

        ReviewCaseView addCaseItem(Long reviewCaseId, Long reviewItemId);

        ReviewCaseView updateCaseOwner(Long reviewCaseId,
                                       Long ownerUserId,
                                       String notes,
                                       Long operatorUserId);

        ReviewCaseView closeCase(Long reviewCaseId,
                                 String notes,
                                 Long operatorUserId,
                                 LocalDateTime closedAt);

        ReviewCaseMergeResult mergeCases(Long targetReviewCaseId,
                                         Long sourceReviewCaseId,
                                         Long operatorUserId,
                                         String notes);

        ReviewCaseSplitResult splitCase(Long sourceReviewCaseId,
                                       ReviewCaseDraft draft,
                                       List<Long> reviewItemIds,
                                       Long operatorUserId);

        List<ReviewCaseTimelineItem> listCaseTimeline(Long reviewCaseId);

        ReviewSemanticIndexEntry upsertSemanticIndex(ReviewItemAggregate item,
                                                     String document,
                                                     String embeddingKey,
                                                     String embeddingModel,
                                                     String embeddingVectorHash,
                                                     String indexStatus,
                                                     Integer retryCount,
                                                     String lastError,
                                                     LocalDateTime indexedAt);

        List<ReviewSemanticIndexEntry> listSemanticIndex(ReviewQuery query);

        ReviewEvidenceExportJob createExportJob(ReviewEvidenceExportPackage exportPackage,
                                                Long operatorUserId,
                                                String reason,
                                                List<Long> boundEventIds,
                                                String fileHash,
                                                LocalDateTime expiresAt,
                                                LocalDateTime createdAt);

        List<ReviewEvidenceExportJob> listExportJobs(Long reviewCaseId);

        default List<ReviewEvidenceExportJob> listAllExportJobs() {
            return List.of();
        }

        default ReviewRuntimeLockAcquisition acquireRuntimePatrolLock(String lockName,
                                                                      LocalDateTime expiresAt,
                                                                      Long operatorUserId) {
            boolean acquired = tryAcquireRuntimePatrolLock(lockName, expiresAt, operatorUserId);
            return new ReviewRuntimeLockAcquisition(
                    lockName,
                    acquired,
                    false,
                    null,
                    null,
                    acquired ? expiresAt : null,
                    LocalDateTime.now(),
                    acquired ? "legacy_lock_acquired" : "active_lock"
            );
        }

        default boolean tryAcquireRuntimePatrolLock(String lockName,
                                                    LocalDateTime expiresAt,
                                                    Long operatorUserId) {
            return true;
        }

        default void releaseRuntimePatrolLock(String lockName,
                                              Long operatorUserId) {
        }

        default String recordRuntimePatrolRun(String status,
                                              Integer attemptCount,
                                              List<String> alerts,
                                              List<String> recommendedActions,
                                              Long operatorUserId,
                                              LocalDateTime executedAt,
                                              Map<String, Object> metadata) {
            return "RPR-" + Math.abs(Objects.hash(status, attemptCount, alerts, operatorUserId, executedAt));
        }

        default int enqueueRuntimePatrolAlerts(String runId,
                                               List<String> alerts,
                                               List<String> recommendedActions,
                                               Long operatorUserId,
                                               LocalDateTime executedAt,
                                               Map<String, Object> metadata) {
            return alerts == null ? 0 : alerts.size();
        }

        default List<ReviewRuntimeOutboxMessage> listPendingRuntimeOutbox(Integer limit) {
            return List.of();
        }

        default void markRuntimeOutboxPublished(Long outboxId, LocalDateTime publishedAt) {
        }

        default void markRuntimeOutboxFailed(Long outboxId, String lastError, LocalDateTime failedAt) {
        }

        default ReviewItemAggregate updateEventProjection(Long reviewItemId,
                                                          Map<String, Object> reviewData,
                                                          EventProjection projection,
                                                          String eventReviewStatus,
                                                          LocalDateTime reconciledAt) {
            return findById(reviewItemId)
                    .orElseThrow(() -> new IllegalArgumentException("reviewItemId not found: " + reviewItemId));
        }

        ReviewEvidenceAuditEntry recordEvidenceDownload(String jobNo,
                                                        Long operatorUserId,
                                                        String reason,
                                                        LocalDateTime happenedAt);

        Optional<ReviewEvidenceExportJob> findExportJobByNo(String jobNo);

        default void recordCaseAudit(Long reviewCaseId,
                                     Long reviewItemId,
                                     String actionType,
                                     String actionNote,
                                     Long operatorUserId,
                                     LocalDateTime happenedAt) {
            recordCaseAudit(reviewCaseId, reviewItemId, actionType, actionNote, operatorUserId, happenedAt, Map.of());
        }

        void recordCaseAudit(Long reviewCaseId,
                             Long reviewItemId,
                             String actionType,
                             String actionNote,
                             Long operatorUserId,
                             LocalDateTime happenedAt,
                             Map<String, Object> metadata);

        default void recordMediaAccessAudit(Long reviewCaseId,
                                            Long reviewItemId,
                                            String actionType,
                                            String actionNote,
                                            Long operatorUserId,
                                            LocalDateTime happenedAt,
                                            Map<String, Object> metadata) {
            recordCaseAudit(reviewCaseId, reviewItemId, actionType, actionNote, operatorUserId, happenedAt, metadata);
        }

        default List<ReviewCaseTimelineItem> listMediaAccessAuditsByReviewItem(Long reviewItemId) {
            return List.of();
        }

    }

    private static boolean hasSourceAlertId(ReviewItemAggregate item, String sourceAlertId) {
        return sourceAlertId != null
                && item.sourceAlertIds() != null
                && item.sourceAlertIds().contains(sourceAlertId);
    }

    private static boolean hasReviewDataIdentityKey(Map<String, Object> reviewData, List<String> identityKeys) {
        if (reviewData == null || identityKeys == null || identityKeys.isEmpty()) {
            return false;
        }
        Object stored = reviewData.get("ingestIdentityKeys");
        if (stored instanceof Iterable<?> values) {
            for (Object value : values) {
                if (value != null && identityKeys.contains(String.valueOf(value))) {
                    return true;
                }
            }
        }
        return stored != null && identityKeys.contains(String.valueOf(stored));
    }

    interface ReviewRuleStore {

        ReviewRuleView save(ReviewRuleCommand command);

        List<ReviewRuleView> listEnabled();

        List<ReviewRuleView> listAll();

    }

    interface RecordEvidenceResolver {

        Optional<RecordEvidenceResult> resolve(RecordEvidenceRequest request);

        default Optional<String> unavailableReason() {
            return Optional.empty();
        }

    }

    interface RecordCoverageResolver {

        List<RecordCoverageSegment> resolve(RecordCoverageRequest request);

    }

    interface VideoEvidenceExportProvider {

        Optional<ReviewEvidenceVideoExportResult> export(ReviewEvidenceVideoExportRequest request);

        static VideoEvidenceExportProvider unavailable() {
            return request -> Optional.empty();
        }

    }

    interface EventProjectionStore {

        Optional<EventProjection> findByEventId(Long eventId);

    }

}
