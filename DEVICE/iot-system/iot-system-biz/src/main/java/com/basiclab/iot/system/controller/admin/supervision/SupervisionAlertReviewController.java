package com.basiclab.iot.system.controller.admin.supervision;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.AiSummaryConfirmationReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.AiSummaryConfirmationRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.AiSummaryRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseCloseReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseCreateReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseMergeReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseMergeRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseOwnerReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseSplitReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseSplitRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CaseTimelineRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.ClueIngestReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CoverageRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.CoverageSegmentReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.DetailStreamRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.EvidenceAuditRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.EvidenceDownloadAuditReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.EvidenceExportReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.EvidenceExportJobRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.EvidenceExportRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.EvidenceVerificationRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.EvidenceRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.IntegrationSmokeReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.IntegrationSmokeRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.ItemRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.LifecycleReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.ManifestVerificationRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.MediaAccessAuditReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.MediaAccessAuditRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.OperationReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.PlaybackAccessRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RecordStorageSyncReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RecordStorageSyncRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.ReconciliationRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuntimeHealthRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleGeometryReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleGeometryRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuntimePatrolReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuntimePatrolRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.ReviewSegmentRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleReplayReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleReplayRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleSaveReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleSuggestionPreviewRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleSuggestionStatRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleSuggestionStatusReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.SemanticHitRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.SemanticIndexEvaluationRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.SemanticIndexRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.SemanticReindexJobRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.SummaryRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.ToEventRespVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.UserStatusReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.UserStatusRespVO;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.AlertClueCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewAiSummaryConfirmationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceVerificationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceExportCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseMergeCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseOperationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseOwnerCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseSplitCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewIntegrationSmokeCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewLifecycleCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewMediaAccessCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewOperationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewPlaybackCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewQuery;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRecordStorageSyncCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewReconciliationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimeHealthCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuntimePatrolCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuleCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuleGeometryCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewRuleReplayCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewSemanticIndexEvaluationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewSemanticReindexCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewSemanticSearchCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.RuleSuggestionOperationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewToEventCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewUserStatusCommand;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;

import static com.basiclab.iot.common.utils.SecurityFrameworkUtils.getLoginUserId;
import static com.basiclab.iot.common.domain.CommonResult.success;
import static org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME;

@Tag(name = "Admin - alert review")
@RestController
@RequestMapping("/system/supervision/alert-review")
@Validated
public class SupervisionAlertReviewController {

    private final SupervisionAlertReviewService supervisionAlertReviewService;

    public SupervisionAlertReviewController(SupervisionAlertReviewService supervisionAlertReviewService) {
        this.supervisionAlertReviewService = supervisionAlertReviewService;
    }

    @PostMapping("/clues/ingest")
    @Operation(summary = "Ingest alert clue")
    public CommonResult<ItemRespVO> ingestClue(@Valid @RequestBody ClueIngestReqVO reqVO) {
        return success(ItemRespVO.from(supervisionAlertReviewService.ingestClue(new AlertClueCommand(
                reqVO.getSourceSystem(),
                reqVO.getSourceAlertId(),
                reqVO.getRuleCode(),
                reqVO.getSourceAlertType(),
                reqVO.getAlertTime(),
                reqVO.getDeviceId(),
                reqVO.getCameraId(),
                reqVO.getZoneCode(),
                reqVO.getObjectLabel(),
                reqVO.getStaySeconds(),
                reqVO.getSnapshotUri(),
                reqVO.getRecordUri(),
                reqVO.getSourcePayloadHash(),
                reqVO.getLabels(),
                reqVO.getZones(),
                reqVO.getObjectIds(),
                reqVO.getConfidence(),
                reqVO.getBbox(),
                reqVO.getCorrelationId(),
                reqVO.getVerifiedObjects(),
                reqVO.getThumbTime(),
                reqVO.getAudioLabels(),
                reqVO.getMotionMetadata()
        ))));
    }

    @GetMapping("/items")
    @Operation(summary = "List alert review workbench")
    public CommonResult<List<ItemRespVO>> listWorkbench(
            @RequestParam(value = "reviewStatus", required = false) String reviewStatus,
            @RequestParam(value = "cameraId", required = false) String cameraId,
            @RequestParam(value = "zoneCode", required = false) String zoneCode,
            @RequestParam(value = "objectLabel", required = false) String objectLabel,
            @RequestParam(value = "recordEvidenceStatus", required = false) String recordEvidenceStatus,
            @RequestParam(value = "converted", required = false) Boolean converted,
            @RequestParam(value = "inReviewCase", required = false) Boolean inReviewCase,
            @RequestParam(value = "reviewerUserId", required = false) Long reviewerUserId,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime) {
        return success(supervisionAlertReviewService.listWorkbench(new ReviewQuery(
                        reviewStatus,
                        cameraId,
                        zoneCode,
                        objectLabel,
                        recordEvidenceStatus,
                        converted,
                        inReviewCase,
                        reviewerUserId,
                        beginTime,
                        endTime
                ))
                .stream()
                .map(ItemRespVO::from)
                .toList());
    }

    @GetMapping("/summary")
    @Operation(summary = "Get alert review workbench summary")
    public CommonResult<SummaryRespVO> getWorkbenchSummary(
            @RequestParam(value = "reviewerUserId", required = false) Long reviewerUserId,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime) {
        return success(SummaryRespVO.from(supervisionAlertReviewService.getWorkbenchSummary(new ReviewQuery(
                null, null, null, null, null, null, null, reviewerUserId, beginTime, endTime
        ))));
    }

    @GetMapping("/runtime-health")
    @Operation(summary = "Get alert review runtime health")
    public CommonResult<RuntimeHealthRespVO> getRuntimeHealth(
            @RequestParam(value = "reviewStatus", required = false) String reviewStatus,
            @RequestParam(value = "cameraId", required = false) String cameraId,
            @RequestParam(value = "zoneCode", required = false) String zoneCode,
            @RequestParam(value = "objectLabel", required = false) String objectLabel,
            @RequestParam(value = "recordEvidenceStatus", required = false) String recordEvidenceStatus,
            @RequestParam(value = "converted", required = false) Boolean converted,
            @RequestParam(value = "inReviewCase", required = false) Boolean inReviewCase,
            @RequestParam(value = "reviewerUserId", required = false) Long reviewerUserId,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId) {
        return success(RuntimeHealthRespVO.from(supervisionAlertReviewService.getReviewRuntimeHealth(
                new ReviewRuntimeHealthCommand(
                        new ReviewQuery(reviewStatus, cameraId, zoneCode, objectLabel, recordEvidenceStatus,
                                converted, inReviewCase, reviewerUserId, beginTime, endTime),
                        operatorUserId
                )
        )));
    }

    @PostMapping("/runtime-reconcile")
    @Operation(summary = "Reconcile alert review runtime drift")
    public CommonResult<ReconciliationRespVO> reconcileRuntime(
            @RequestParam(value = "reviewStatus", required = false) String reviewStatus,
            @RequestParam(value = "cameraId", required = false) String cameraId,
            @RequestParam(value = "zoneCode", required = false) String zoneCode,
            @RequestParam(value = "objectLabel", required = false) String objectLabel,
            @RequestParam(value = "recordEvidenceStatus", required = false) String recordEvidenceStatus,
            @RequestParam(value = "converted", required = false) Boolean converted,
            @RequestParam(value = "inReviewCase", required = false) Boolean inReviewCase,
            @RequestParam(value = "reviewerUserId", required = false) Long reviewerUserId,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId,
            @RequestParam(value = "repair", required = false) Boolean repair) {
        return success(ReconciliationRespVO.from(supervisionAlertReviewService.reconcileReviewRuntime(
                new ReviewReconciliationCommand(
                        new ReviewQuery(reviewStatus, cameraId, zoneCode, objectLabel, recordEvidenceStatus,
                                converted, inReviewCase, reviewerUserId, beginTime, endTime),
                        operatorUserId,
                        repair
                )
        )));
    }

    @PostMapping("/runtime-patrol")
    @Operation(summary = "Run scheduled alert review runtime patrol")
    public CommonResult<RuntimePatrolRespVO> runRuntimePatrol(@RequestBody(required = false) RuntimePatrolReqVO reqVO) {
        RuntimePatrolReqVO body = reqVO == null ? new RuntimePatrolReqVO() : reqVO;
        return success(RuntimePatrolRespVO.from(supervisionAlertReviewService.runRuntimePatrol(
                new ReviewRuntimePatrolCommand(
                        new ReviewQuery(
                                body.getReviewStatus(),
                                body.getCameraId(),
                                body.getZoneCode(),
                                body.getObjectLabel(),
                                body.getRecordEvidenceStatus(),
                                body.getConverted(),
                                body.getInReviewCase(),
                                body.getReviewerUserId(),
                                body.getBeginTime(),
                                body.getEndTime()
                        ),
                        body.getOperatorUserId(),
                        body.getRepair(),
                        body.getMaxAttempts(),
                        body.getScheduled()
                )
        )));
    }

    @GetMapping("/semantic-search")
    @Operation(summary = "Search alert review clues semantically")
    public CommonResult<List<SemanticHitRespVO>> semanticSearch(
            @RequestParam("q") String query,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "reviewStatus", required = false) String reviewStatus,
            @RequestParam(value = "cameraId", required = false) String cameraId,
            @RequestParam(value = "zoneCode", required = false) String zoneCode,
            @RequestParam(value = "objectLabel", required = false) String objectLabel,
            @RequestParam(value = "recordEvidenceStatus", required = false) String recordEvidenceStatus,
            @RequestParam(value = "converted", required = false) Boolean converted,
            @RequestParam(value = "inReviewCase", required = false) Boolean inReviewCase,
            @RequestParam(value = "reviewerUserId", required = false) Long reviewerUserId,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime) {
        return success(supervisionAlertReviewService.semanticSearch(new ReviewSemanticSearchCommand(
                        query,
                        new ReviewQuery(
                                reviewStatus,
                                cameraId,
                                zoneCode,
                                objectLabel,
                                recordEvidenceStatus,
                                converted,
                                inReviewCase,
                                reviewerUserId,
                                beginTime,
                                endTime
                        ),
                        limit
                ))
                .stream()
                .map(SemanticHitRespVO::from)
                .toList());
    }

    @PostMapping("/semantic-index/reindex")
    @Operation(summary = "Reindex alert review semantic documents")
    public CommonResult<List<SemanticIndexRespVO>> reindexSemanticIndex(
            @RequestParam(value = "reviewStatus", required = false) String reviewStatus,
            @RequestParam(value = "cameraId", required = false) String cameraId,
            @RequestParam(value = "zoneCode", required = false) String zoneCode,
            @RequestParam(value = "objectLabel", required = false) String objectLabel,
            @RequestParam(value = "recordEvidenceStatus", required = false) String recordEvidenceStatus,
            @RequestParam(value = "converted", required = false) Boolean converted,
            @RequestParam(value = "inReviewCase", required = false) Boolean inReviewCase,
            @RequestParam(value = "reviewerUserId", required = false) Long reviewerUserId,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime) {
        return success(supervisionAlertReviewService.reindexSemanticIndex(new ReviewQuery(
                        reviewStatus,
                        cameraId,
                        zoneCode,
                        objectLabel,
                        recordEvidenceStatus,
                        converted,
                        inReviewCase,
                        reviewerUserId,
                        beginTime,
                        endTime
                ))
                .stream()
                .map(SemanticIndexRespVO::from)
                .toList());
    }

    @PostMapping("/semantic-index/queue")
    @Operation(summary = "Queue alert review semantic reindex job")
    public CommonResult<SemanticReindexJobRespVO> queueSemanticReindex(
            @RequestParam(value = "reviewStatus", required = false) String reviewStatus,
            @RequestParam(value = "cameraId", required = false) String cameraId,
            @RequestParam(value = "zoneCode", required = false) String zoneCode,
            @RequestParam(value = "objectLabel", required = false) String objectLabel,
            @RequestParam(value = "recordEvidenceStatus", required = false) String recordEvidenceStatus,
            @RequestParam(value = "converted", required = false) Boolean converted,
            @RequestParam(value = "inReviewCase", required = false) Boolean inReviewCase,
            @RequestParam(value = "reviewerUserId", required = false) Long reviewerUserId,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId) {
        return success(SemanticReindexJobRespVO.from(supervisionAlertReviewService.queueSemanticReindex(
                new ReviewSemanticReindexCommand(
                        new ReviewQuery(
                                reviewStatus,
                                cameraId,
                                zoneCode,
                                objectLabel,
                                recordEvidenceStatus,
                                converted,
                                inReviewCase,
                                reviewerUserId,
                                beginTime,
                                endTime
                        ),
                        operatorUserId
                )
        )));
    }

    @GetMapping("/semantic-index/evaluation")
    @Operation(summary = "Evaluate alert review semantic index backlog")
    public CommonResult<SemanticIndexEvaluationRespVO> evaluateSemanticIndex(
            @RequestParam(value = "reviewStatus", required = false) String reviewStatus,
            @RequestParam(value = "cameraId", required = false) String cameraId,
            @RequestParam(value = "zoneCode", required = false) String zoneCode,
            @RequestParam(value = "objectLabel", required = false) String objectLabel,
            @RequestParam(value = "recordEvidenceStatus", required = false) String recordEvidenceStatus,
            @RequestParam(value = "converted", required = false) Boolean converted,
            @RequestParam(value = "inReviewCase", required = false) Boolean inReviewCase,
            @RequestParam(value = "reviewerUserId", required = false) Long reviewerUserId,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId) {
        return success(SemanticIndexEvaluationRespVO.from(supervisionAlertReviewService.evaluateSemanticIndex(
                new ReviewSemanticIndexEvaluationCommand(
                        new ReviewQuery(
                                reviewStatus,
                                cameraId,
                                zoneCode,
                                objectLabel,
                                recordEvidenceStatus,
                                converted,
                                inReviewCase,
                                reviewerUserId,
                                beginTime,
                                endTime
                        ),
                        operatorUserId
                )
        )));
    }

    @GetMapping("/items/{reviewItemId}/record-coverage")
    @Operation(summary = "Get alert review record coverage")
    public CommonResult<List<CoverageRespVO>> getRecordCoverage(
            @PathVariable("reviewItemId") Long reviewItemId,
            @RequestParam(value = "reviewCaseId", required = false) Long reviewCaseId,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId,
            @RequestParam(value = "allowedCameraIds", required = false) List<String> allowedCameraIds) {
        return success(supervisionAlertReviewService.getRecordCoverage(
                        reviewItemId,
                        reviewCaseId,
                        currentOperatorUserId(operatorUserId),
                        allowedCameraIds
                )
                .stream()
                .map(CoverageRespVO::from)
                .toList());
    }

    @GetMapping("/items/{reviewItemId}/playback-url")
    @Operation(summary = "Prepare alert review playback URL")
    public CommonResult<PlaybackAccessRespVO> preparePlaybackUrl(
            @PathVariable("reviewItemId") Long reviewItemId,
            @RequestParam(value = "reviewCaseId", required = false) Long reviewCaseId,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId,
            @RequestParam(value = "materialUri", required = false) String materialUri,
            @RequestParam(value = "allowedCameraIds", required = false) List<String> allowedCameraIds,
            @RequestParam(value = "reason", required = false) String reason) {
        return success(PlaybackAccessRespVO.from(supervisionAlertReviewService.prepareReviewPlayback(
                new ReviewPlaybackCommand(
                        reviewCaseId,
                        reviewItemId,
                        currentOperatorUserId(operatorUserId),
                        materialUri,
                        allowedCameraIds,
                        reason
                )
        )));
    }

    @PostMapping("/items/{reviewItemId}/record-storage/sync")
    @Operation(summary = "Sync alert review record storage coverage")
    public CommonResult<RecordStorageSyncRespVO> syncRecordStorage(
            @PathVariable("reviewItemId") Long reviewItemId,
            @RequestBody(required = false) RecordStorageSyncReqVO reqVO) {
        RecordStorageSyncReqVO body = reqVO == null ? new RecordStorageSyncReqVO() : reqVO;
        return success(RecordStorageSyncRespVO.from(supervisionAlertReviewService.syncRecordStorage(
                new ReviewRecordStorageSyncCommand(
                        reviewItemId,
                        body.getOperatorUserId(),
                        body.getCoverageSegments() == null
                                ? List.of()
                                : body.getCoverageSegments().stream().map(CoverageSegmentReqVO::toSegment).toList()
                )
        )));
    }

    @GetMapping("/items/{reviewItemId}/timeline")
    @Operation(summary = "Get alert review timeline")
    public CommonResult<List<EvidenceRespVO>> getTimeline(
            @PathVariable("reviewItemId") Long reviewItemId,
            @RequestParam(value = "reviewCaseId", required = false) Long reviewCaseId,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId,
            @RequestParam(value = "allowedCameraIds", required = false) List<String> allowedCameraIds) {
        return success(supervisionAlertReviewService.getTimeline(
                        reviewItemId,
                        reviewCaseId,
                        currentOperatorUserId(operatorUserId),
                        allowedCameraIds
                )
                .stream()
                .map(EvidenceRespVO::from)
                .toList());
    }

    @GetMapping("/items/{reviewItemId}/detail-stream")
    @Operation(summary = "Get alert review object lifecycle detail stream")
    public CommonResult<List<DetailStreamRespVO>> getDetailStream(
            @PathVariable("reviewItemId") Long reviewItemId,
            @RequestParam(value = "reviewCaseId", required = false) Long reviewCaseId,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId,
            @RequestParam(value = "allowedCameraIds", required = false) List<String> allowedCameraIds) {
        return success(supervisionAlertReviewService.getReviewDetailStream(
                        reviewItemId,
                        reviewCaseId,
                        currentOperatorUserId(operatorUserId),
                        allowedCameraIds
                )
                .stream()
                .map(DetailStreamRespVO::from)
                .toList());
    }

    @GetMapping("/items/{reviewItemId}/review-segment")
    @Operation(summary = "Get alert review segment lifecycle")
    public CommonResult<ReviewSegmentRespVO> getReviewSegment(@PathVariable("reviewItemId") Long reviewItemId) {
        return success(ReviewSegmentRespVO.from(supervisionAlertReviewService.getReviewSegment(reviewItemId)));
    }

    @PostMapping("/items/{reviewItemId}/lifecycle")
    @Operation(summary = "Update alert review object lifecycle")
    public CommonResult<ItemRespVO> updateLifecycle(@PathVariable("reviewItemId") Long reviewItemId,
                                                    @RequestBody LifecycleReqVO reqVO) {
        return success(ItemRespVO.from(supervisionAlertReviewService.updateReviewLifecycle(
                new ReviewLifecycleCommand(
                        reviewItemId,
                        reqVO.getLifecycleState(),
                        reqVO.getHappenedAt(),
                        reqVO.getObjectIds(),
                        reqVO.getLabels(),
                        reqVO.getZones(),
                        reqVO.getBbox(),
                        reqVO.getMotionMetadata(),
                        reqVO.getRecordUri()
                )
        )));
    }

    @PostMapping("/items/{reviewItemId}/record-evidence/retry")
    @Operation(summary = "Retry alert review record evidence backfill")
    public CommonResult<ItemRespVO> retryRecordEvidence(@PathVariable("reviewItemId") Long reviewItemId) {
        return success(ItemRespVO.from(supervisionAlertReviewService.retryRecordEvidence(reviewItemId)));
    }

    @PostMapping("/items/{reviewItemId}/review")
    @Operation(summary = "Mark alert review item reviewed")
    public CommonResult<ItemRespVO> markReviewed(@PathVariable("reviewItemId") Long reviewItemId,
                                                 @RequestBody(required = false) OperationReqVO reqVO) {
        OperationReqVO body = reqVO == null ? new OperationReqVO() : reqVO;
        return success(ItemRespVO.from(supervisionAlertReviewService.markReviewed(new ReviewOperationCommand(
                reviewItemId,
                body.getReviewerUserId(),
                body.getReason()
        ))));
    }

    @PostMapping("/items/{reviewItemId}/user-status")
    @Operation(summary = "Update alert review item user status")
    public CommonResult<UserStatusRespVO> markUserReviewStatus(@PathVariable("reviewItemId") Long reviewItemId,
                                                               @RequestBody UserStatusReqVO reqVO) {
        return success(UserStatusRespVO.from(supervisionAlertReviewService.markUserReviewStatus(new ReviewUserStatusCommand(
                reviewItemId,
                reqVO.getUserId(),
                reqVO.getHasBeenReviewed()
        ))));
    }

    @PostMapping("/items/{reviewItemId}/ignore")
    @Operation(summary = "Ignore alert review item")
    public CommonResult<ItemRespVO> ignore(@PathVariable("reviewItemId") Long reviewItemId,
                                           @RequestBody(required = false) OperationReqVO reqVO) {
        OperationReqVO body = reqVO == null ? new OperationReqVO() : reqVO;
        return success(ItemRespVO.from(supervisionAlertReviewService.ignore(new ReviewOperationCommand(
                reviewItemId,
                body.getReviewerUserId(),
                body.getReason()
        ))));
    }

    @PostMapping("/items/{reviewItemId}/false-positive")
    @Operation(summary = "Mark alert review item false positive")
    public CommonResult<ItemRespVO> markFalsePositive(@PathVariable("reviewItemId") Long reviewItemId,
                                                      @RequestBody(required = false) OperationReqVO reqVO) {
        OperationReqVO body = reqVO == null ? new OperationReqVO() : reqVO;
        return success(ItemRespVO.from(supervisionAlertReviewService.markFalsePositive(new ReviewOperationCommand(
                reviewItemId,
                body.getReviewerUserId(),
                body.getReason()
        ))));
    }

    @PostMapping("/items/{reviewItemId}/rule-suggestion/status")
    @PreAuthorize("@ss.hasPermission('system:supervision-alert-review:rule-suggestion:update')")
    @Operation(summary = "Update alert review rule suggestion status")
    public CommonResult<ItemRespVO> updateRuleSuggestionStatus(@PathVariable("reviewItemId") Long reviewItemId,
                                                               @RequestBody RuleSuggestionStatusReqVO reqVO) {
        return success(ItemRespVO.from(supervisionAlertReviewService.updateRuleSuggestionStatus(
                new RuleSuggestionOperationCommand(
                        reviewItemId,
                        reqVO.getReviewerUserId(),
                        reqVO.getStatus(),
                        reqVO.getNote()
                )
        )));
    }

    @GetMapping("/items/{reviewItemId}/rule-suggestion/preview")
    @Operation(summary = "Preview alert review rule suggestion")
    public CommonResult<RuleSuggestionPreviewRespVO> previewRuleSuggestion(@PathVariable("reviewItemId") Long reviewItemId) {
        return success(RuleSuggestionPreviewRespVO.from(supervisionAlertReviewService.previewRuleSuggestion(reviewItemId)));
    }

    @PostMapping("/items/{reviewItemId}/rule-suggestion/revert")
    @PreAuthorize("@ss.hasPermission('system:supervision-alert-review:rule-suggestion:revert')")
    @Operation(summary = "Revert alert review rule suggestion")
    public CommonResult<ItemRespVO> revertRuleSuggestion(@PathVariable("reviewItemId") Long reviewItemId,
                                                         @RequestBody RuleSuggestionStatusReqVO reqVO) {
        return success(ItemRespVO.from(supervisionAlertReviewService.revertRuleSuggestion(
                new RuleSuggestionOperationCommand(
                        reviewItemId,
                        reqVO.getReviewerUserId(),
                        reqVO.getStatus(),
                        reqVO.getNote()
                )
        )));
    }

    @GetMapping("/rule-suggestions/stats")
    @Operation(summary = "List alert review rule suggestion stats")
    public CommonResult<List<RuleSuggestionStatRespVO>> listRuleSuggestionStats(
            @RequestParam(value = "cameraId", required = false) String cameraId,
            @RequestParam(value = "zoneCode", required = false) String zoneCode,
            @RequestParam(value = "objectLabel", required = false) String objectLabel,
            @RequestParam(value = "beginTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime beginTime,
            @RequestParam(value = "endTime", required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime endTime) {
        return success(supervisionAlertReviewService.listRuleSuggestionStats(new ReviewQuery(
                        null,
                        cameraId,
                        zoneCode,
                        objectLabel,
                        null,
                        null,
                        null,
                        null,
                        beginTime,
                        endTime
                ))
                .stream()
                .map(RuleSuggestionStatRespVO::from)
                .toList());
    }

    @PostMapping("/items/{reviewItemId}/to-event")
    @Operation(summary = "Convert alert review item to supervision event")
    public CommonResult<ToEventRespVO> convertToEvent(@PathVariable("reviewItemId") Long reviewItemId,
                                                      @RequestBody(required = false) OperationReqVO reqVO) {
        OperationReqVO body = reqVO == null ? new OperationReqVO() : reqVO;
        return success(ToEventRespVO.from(supervisionAlertReviewService.convertToEvent(new ReviewToEventCommand(
                reviewItemId,
                body.getReviewerUserId()
        ))));
    }

    @PostMapping("/cases")
    @Operation(summary = "Create alert review case")
    public CommonResult<CaseRespVO> createReviewCase(@RequestBody CaseCreateReqVO reqVO) {
        return success(CaseRespVO.from(supervisionAlertReviewService.createReviewCase(new ReviewCaseCommand(
                reqVO.getTitle(),
                reqVO.getPrimaryReviewItemId(),
                reqVO.getReviewItemIds(),
                reqVO.getOwnerUserId(),
                reqVO.getNotes()
        ))));
    }

    @PostMapping("/cases/{reviewCaseId}/items/{reviewItemId}")
    @Operation(summary = "Add alert review item to case")
    public CommonResult<CaseRespVO> addToReviewCase(@PathVariable("reviewCaseId") Long reviewCaseId,
                                                    @PathVariable("reviewItemId") Long reviewItemId) {
        return success(CaseRespVO.from(supervisionAlertReviewService.addToReviewCase(reviewCaseId, reviewItemId)));
    }

    @PostMapping("/cases/{reviewCaseId}/owner")
    @Operation(summary = "Assign alert review case owner")
    public CommonResult<CaseRespVO> assignReviewCaseOwner(@PathVariable("reviewCaseId") Long reviewCaseId,
                                                          @RequestBody CaseOwnerReqVO reqVO) {
        return success(CaseRespVO.from(supervisionAlertReviewService.assignReviewCaseOwner(new ReviewCaseOwnerCommand(
                reviewCaseId,
                reqVO.getOwnerUserId(),
                currentOperatorUserId(reqVO.getOperatorUserId()),
                reqVO.getNotes()
        ))));
    }

    @PostMapping("/cases/{reviewCaseId}/close")
    @Operation(summary = "Close alert review case")
    public CommonResult<CaseRespVO> closeReviewCase(@PathVariable("reviewCaseId") Long reviewCaseId,
                                                    @RequestBody(required = false) CaseCloseReqVO reqVO) {
        CaseCloseReqVO body = reqVO == null ? new CaseCloseReqVO() : reqVO;
        return success(CaseRespVO.from(supervisionAlertReviewService.closeReviewCase(new ReviewCaseOperationCommand(
                reviewCaseId,
                currentOperatorUserId(body.getOperatorUserId()),
                body.getNotes()
        ))));
    }

    @PostMapping("/cases/{targetReviewCaseId}/merge")
    @Operation(summary = "Merge alert review case into target case")
    public CommonResult<CaseMergeRespVO> mergeReviewCases(@PathVariable("targetReviewCaseId") Long targetReviewCaseId,
                                                          @RequestBody CaseMergeReqVO reqVO) {
        return success(CaseMergeRespVO.from(supervisionAlertReviewService.mergeReviewCases(new ReviewCaseMergeCommand(
                targetReviewCaseId,
                reqVO.getSourceReviewCaseId(),
                currentOperatorUserId(reqVO.getOperatorUserId()),
                reqVO.getNotes()
        ))));
    }

    @PostMapping("/cases/{sourceReviewCaseId}/split")
    @Operation(summary = "Split alert review case into a new case")
    public CommonResult<CaseSplitRespVO> splitReviewCase(@PathVariable("sourceReviewCaseId") Long sourceReviewCaseId,
                                                         @RequestBody CaseSplitReqVO reqVO) {
        return success(CaseSplitRespVO.from(supervisionAlertReviewService.splitReviewCase(new ReviewCaseSplitCommand(
                sourceReviewCaseId,
                reqVO.getReviewItemIds(),
                reqVO.getTitle(),
                reqVO.getOwnerUserId(),
                currentOperatorUserId(reqVO.getOperatorUserId()),
                reqVO.getNotes()
        ))));
    }

    @GetMapping("/cases/{reviewCaseId}/timeline")
    @Operation(summary = "Get alert review case timeline")
    public CommonResult<List<CaseTimelineRespVO>> getReviewCaseTimeline(
            @PathVariable("reviewCaseId") Long reviewCaseId,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId,
            @RequestParam(value = "allowedCameraIds", required = false) List<String> allowedCameraIds) {
        return success(supervisionAlertReviewService.getReviewCaseTimeline(
                        reviewCaseId,
                        currentOperatorUserId(operatorUserId),
                        allowedCameraIds
                )
                .stream()
                .map(CaseTimelineRespVO::from)
                .toList());
    }

    @GetMapping("/cases/{reviewCaseId}/ai-summary")
    @Operation(summary = "Summarize alert review case")
    public CommonResult<AiSummaryRespVO> summarizeReviewCase(
            @PathVariable("reviewCaseId") Long reviewCaseId,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId) {
        return success(AiSummaryRespVO.from(supervisionAlertReviewService.summarizeReviewCase(
                reviewCaseId,
                operatorUserId
        )));
    }

    @PostMapping("/cases/{reviewCaseId}/ai-summary/confirmation")
    @Operation(summary = "Confirm alert review AI summary")
    public CommonResult<AiSummaryConfirmationRespVO> confirmReviewCaseAiSummary(
            @PathVariable("reviewCaseId") Long reviewCaseId,
            @RequestBody AiSummaryConfirmationReqVO reqVO) {
        return success(AiSummaryConfirmationRespVO.from(supervisionAlertReviewService.confirmReviewCaseAiSummary(
                new ReviewAiSummaryConfirmationCommand(
                        reviewCaseId,
                        reqVO.getConfirmationStatus(),
                        reqVO.getNotes(),
                        currentOperatorUserId(reqVO.getOperatorUserId())
                )
        )));
    }

    @PostMapping("/cases/{reviewCaseId}/evidence-export")
    @Operation(summary = "Export alert review case evidence")
    public CommonResult<EvidenceExportRespVO> exportReviewEvidence(@PathVariable("reviewCaseId") Long reviewCaseId,
                                                                   @RequestBody(required = false) EvidenceExportReqVO reqVO) {
        EvidenceExportReqVO body = reqVO == null ? new EvidenceExportReqVO() : reqVO;
        return success(EvidenceExportRespVO.from(supervisionAlertReviewService.exportReviewEvidence(
                new ReviewEvidenceExportCommand(
                        reviewCaseId,
                        body.getReviewItemIds(),
                        currentOperatorUserId(body.getOperatorUserId()),
                        body.getFormat(),
                        body.getReason(),
                        body.getApproverUserId(),
                        body.getApprovalNote(),
                        body.getAllowedCameraIds()
                )
        )));
    }

    @PostMapping("/cases/{reviewCaseId}/evidence-export-jobs")
    @Operation(summary = "Create alert review evidence export job")
    public CommonResult<EvidenceExportJobRespVO> createReviewEvidenceExportJob(
            @PathVariable("reviewCaseId") Long reviewCaseId,
            @RequestBody(required = false) EvidenceExportReqVO reqVO) {
        EvidenceExportReqVO body = reqVO == null ? new EvidenceExportReqVO() : reqVO;
        return success(EvidenceExportJobRespVO.from(supervisionAlertReviewService.createReviewEvidenceExportJob(
                new ReviewEvidenceExportCommand(
                        reviewCaseId,
                        body.getReviewItemIds(),
                        currentOperatorUserId(body.getOperatorUserId()),
                        body.getFormat(),
                        body.getReason(),
                        body.getApproverUserId(),
                        body.getApprovalNote(),
                        body.getAllowedCameraIds()
                )
        )));
    }

    @PostMapping("/cases/{reviewCaseId}/media-access/audit")
    @Operation(summary = "Audit alert review media access")
    public CommonResult<MediaAccessAuditRespVO> auditMediaAccess(
            @PathVariable("reviewCaseId") Long reviewCaseId,
            @RequestBody(required = false) MediaAccessAuditReqVO reqVO) {
        MediaAccessAuditReqVO body = reqVO == null ? new MediaAccessAuditReqVO() : reqVO;
        return success(MediaAccessAuditRespVO.from(supervisionAlertReviewService.auditMediaAccess(
                new ReviewMediaAccessCommand(
                        reviewCaseId,
                        body.getReviewItemId(),
                        currentOperatorUserId(body.getOperatorUserId()),
                        body.getCameraId(),
                        body.getMaterialUri(),
                        body.getActionType(),
                        body.getAllowedCameraIds(),
                        body.getReason()
                )
        )));
    }

    @PostMapping("/items/{reviewItemId}/media-access/audit")
    @Operation(summary = "Audit alert review item media access")
    public CommonResult<MediaAccessAuditRespVO> auditItemMediaAccess(
            @PathVariable("reviewItemId") Long reviewItemId,
            @RequestBody(required = false) MediaAccessAuditReqVO reqVO) {
        MediaAccessAuditReqVO body = reqVO == null ? new MediaAccessAuditReqVO() : reqVO;
        return success(MediaAccessAuditRespVO.from(supervisionAlertReviewService.auditMediaAccess(
                new ReviewMediaAccessCommand(
                        null,
                        reviewItemId,
                        currentOperatorUserId(body.getOperatorUserId()),
                        body.getCameraId(),
                        body.getMaterialUri(),
                        body.getActionType(),
                        body.getAllowedCameraIds(),
                        body.getReason()
                )
        )));
    }

    @GetMapping("/cases/{reviewCaseId}/evidence-audit")
    @Operation(summary = "List alert review evidence audit trail")
    public CommonResult<List<EvidenceAuditRespVO>> getEvidenceAuditTrail(@PathVariable("reviewCaseId") Long reviewCaseId) {
        return success(supervisionAlertReviewService.getEvidenceAuditTrail(reviewCaseId)
                .stream()
                .map(EvidenceAuditRespVO::from)
                .toList());
    }

    @GetMapping("/items/{reviewItemId}/evidence-audit")
    @Operation(summary = "List alert review item evidence audit trail")
    public CommonResult<List<EvidenceAuditRespVO>> getReviewItemEvidenceAuditTrail(@PathVariable("reviewItemId") Long reviewItemId) {
        return success(supervisionAlertReviewService.getReviewItemEvidenceAuditTrail(reviewItemId)
                .stream()
                .map(EvidenceAuditRespVO::from)
                .toList());
    }

    @GetMapping("/evidence-export-jobs/{jobNo}/manifest/verify")
    @Operation(summary = "Verify alert review evidence export manifest")
    public CommonResult<ManifestVerificationRespVO> verifyEvidenceExportManifest(
            @PathVariable("jobNo") String jobNo,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId,
            @RequestParam(value = "allowedCameraIds", required = false) List<String> allowedCameraIds) {
        return success(ManifestVerificationRespVO.from(supervisionAlertReviewService.verifyEvidenceExportManifest(
                jobNo,
                currentOperatorUserId(operatorUserId),
                allowedCameraIds
        )));
    }

    @GetMapping("/evidence-export-jobs/{jobNo}/verify")
    @Operation(summary = "Verify alert review evidence package reproducibility")
    public CommonResult<EvidenceVerificationRespVO> verifyEvidencePackage(
            @PathVariable("jobNo") String jobNo,
            @RequestParam(value = "operatorUserId", required = false) Long operatorUserId,
            @RequestParam(value = "allowedCameraIds", required = false) List<String> allowedCameraIds) {
        return success(EvidenceVerificationRespVO.from(supervisionAlertReviewService.verifyEvidencePackage(
                new ReviewEvidenceVerificationCommand(jobNo, currentOperatorUserId(operatorUserId), allowedCameraIds)
        )));
    }

    @PostMapping("/integration-smoke")
    @Operation(summary = "Run alert review integration smoke")
    public CommonResult<IntegrationSmokeRespVO> runIntegrationSmoke(@RequestBody(required = false) IntegrationSmokeReqVO reqVO) {
        IntegrationSmokeReqVO body = reqVO == null ? new IntegrationSmokeReqVO() : reqVO;
        return success(IntegrationSmokeRespVO.from(supervisionAlertReviewService.runIntegrationSmoke(
                new ReviewIntegrationSmokeCommand(
                        body.getOperatorUserId(),
                        body.getIncludeVideoExport(),
                        body.getAlertTime(),
                        body.getProfile()
                )
        )));
    }

    @PostMapping("/evidence-export-jobs/{jobNo}/downloads")
    @Operation(summary = "Record alert review evidence export download")
    public CommonResult<EvidenceAuditRespVO> recordEvidenceDownload(
            @PathVariable("jobNo") String jobNo,
            @RequestBody(required = false) EvidenceDownloadAuditReqVO reqVO) {
        EvidenceDownloadAuditReqVO body = reqVO == null ? new EvidenceDownloadAuditReqVO() : reqVO;
        return success(EvidenceAuditRespVO.from(supervisionAlertReviewService.recordEvidenceDownload(
                jobNo,
                currentOperatorUserId(body.getOperatorUserId()),
                body.getReason(),
                body.getAllowedCameraIds()
        )));
    }

    private static Long currentOperatorUserId(Long requestedOperatorUserId) {
        Long loginUserId = getLoginUserId();
        return loginUserId == null ? requestedOperatorUserId : loginUserId;
    }

    @GetMapping("/items/{reviewItemId}/case-candidates")
    @Operation(summary = "Suggest alert review case candidates")
    public CommonResult<List<ItemRespVO>> suggestReviewCaseCandidates(@PathVariable("reviewItemId") Long reviewItemId) {
        return success(supervisionAlertReviewService.suggestReviewCaseCandidates(reviewItemId)
                .stream()
                .map(ItemRespVO::from)
                .toList());
    }

    @PostMapping("/rules")
    @Operation(summary = "Save alert review rule")
    public CommonResult<RuleRespVO> saveRule(@Valid @RequestBody RuleSaveReqVO reqVO) {
        return success(RuleRespVO.from(supervisionAlertReviewService.saveRule(new ReviewRuleCommand(
                reqVO.getId(),
                reqVO.getRuleCode(),
                reqVO.getRuleName(),
                reqVO.getSourceSystem(),
                reqVO.getCameraId(),
                reqVO.getZoneCode(),
                reqVO.getObjectLabel(),
                reqVO.getMinStaySeconds(),
                reqVO.getActiveStart(),
                reqVO.getActiveEnd(),
                reqVO.getEnabled(),
                reqVO.getInertiaFrames(),
                reqVO.getLoiteringSeconds()
        ))));
    }

    @GetMapping("/rules")
    @Operation(summary = "List alert review rules")
    public CommonResult<List<RuleRespVO>> listRules() {
        return success(supervisionAlertReviewService.listRules().stream().map(RuleRespVO::from).toList());
    }

    @PostMapping("/rules/replay")
    @PreAuthorize("@ss.hasPermission('system:supervision-alert-review:rules:replay')")
    @Operation(summary = "Replay alert review rule against historical clues")
    public CommonResult<RuleReplayRespVO> replayRule(@Valid @RequestBody RuleReplayReqVO reqVO) {
        return success(RuleReplayRespVO.from(supervisionAlertReviewService.replayRule(new ReviewRuleReplayCommand(
                reqVO.getRuleCode(),
                reqVO.getSourceSystem(),
                reqVO.getCameraId(),
                reqVO.getZoneCode(),
                reqVO.getObjectLabel(),
                reqVO.getMinStaySeconds(),
                reqVO.getBeginTime(),
                reqVO.getEndTime(),
                reqVO.getOperatorUserId()
        ))));
    }

    @PostMapping("/rules/geometry-evaluate")
    @Operation(summary = "Evaluate alert review rule geometry semantics")
    public CommonResult<RuleGeometryRespVO> evaluateRuleGeometry(@Valid @RequestBody RuleGeometryReqVO reqVO) {
        return success(RuleGeometryRespVO.from(supervisionAlertReviewService.evaluateRuleGeometry(new ReviewRuleGeometryCommand(
                reqVO.getRuleCode(),
                reqVO.getCameraId(),
                reqVO.getZoneCode(),
                reqVO.getPolygon(),
                reqVO.getBbox(),
                reqVO.getObjectLabel(),
                new ReviewQuery(null, reqVO.getCameraId(), reqVO.getZoneCode(), reqVO.getObjectLabel(),
                        null, null, null, null, reqVO.getBeginTime(), reqVO.getEndTime()),
                reqVO.getOperatorUserId()
        ))));
    }

}
