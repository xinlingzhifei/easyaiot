package com.basiclab.iot.system.supervision;

import com.basiclab.iot.common.domain.LoginUser;
import com.basiclab.iot.system.controller.admin.supervision.SupervisionAlertReviewController;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleReplayReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.review.AlertReviewVO.RuleSuggestionStatusReqVO;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseMergeCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseMergeResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseOperationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseOwnerCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseSplitCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseSplitResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseView;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceVerificationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceVerificationReport;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewIntegrationSmokeCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewIntegrationSmokeResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewManifestVerification;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewMediaAccessAuditEntry;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewPlaybackAccess;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewPlaybackCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewQuery;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewReportAcknowledgement;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewReportAcknowledgementCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewReportCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewOperationsReport;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SupervisionAlertReviewControllerTest {

    @Test
    void caseLifecycleEndpointsMapHttpRequestsToServiceCommands() throws Exception {
        CapturingReviewService reviewService = new CapturingReviewService();
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new SupervisionAlertReviewController(reviewService.proxy()))
                .build();

        mockMvc.perform(post("/system/supervision/alert-review/cases/10/owner")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ownerUserId": 2001,
                                  "operatorUserId": 9001,
                                  "notes": "handoff"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.ownerUserId").value(2001));

        mockMvc.perform(post("/system/supervision/alert-review/cases/10/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "operatorUserId": 9002,
                                  "notes": "resolved"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.status").value("closed"));

        mockMvc.perform(post("/system/supervision/alert-review/cases/10/merge")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sourceReviewCaseId": 11,
                                  "operatorUserId": 9003,
                                  "notes": "same lead"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.targetCase.id").value(10))
                .andExpect(jsonPath("$.data.sourceCase.status").value("merged"));

        mockMvc.perform(post("/system/supervision/alert-review/cases/10/split")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reviewItemIds": [103],
                                  "title": "camera-03 follow-up",
                                  "ownerUserId": 2002,
                                  "operatorUserId": 9004,
                                  "notes": "separate lead"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.sourceCase.id").value(10))
                .andExpect(jsonPath("$.data.newCase.ownerUserId").value(2002));

        assertEquals(new ReviewCaseOwnerCommand(10L, 2001L, 9001L, "handoff"),
                reviewService.command("assignReviewCaseOwner"));
        assertEquals(new ReviewCaseOperationCommand(10L, 9002L, "resolved"),
                reviewService.command("closeReviewCase"));
        assertEquals(new ReviewCaseMergeCommand(10L, 11L, 9003L, "same lead"),
                reviewService.command("mergeReviewCases"));
        assertEquals(new ReviewCaseSplitCommand(10L, List.of(103L), "camera-03 follow-up", 2002L, 9004L, "separate lead"),
                reviewService.command("splitReviewCase"));
    }

    @Test
    void evidencePackageVerificationUsesLoginUserInsteadOfRequestOperator() throws Exception {
        CapturingReviewService reviewService = new CapturingReviewService();
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new SupervisionAlertReviewController(reviewService.proxy()))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new LoginUser().setId(777L),
                null,
                List.of()
        ));
        try {
            mockMvc.perform(get("/system/supervision/alert-review/evidence-export-jobs/JOB-1/verify")
                            .param("operatorUserId", "9999")
                            .param("allowedCameraIds", "camera-01", "camera-02"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.operatorUserId").value(777));
        } finally {
            SecurityContextHolder.clearContext();
        }

        assertEquals(new ReviewEvidenceVerificationCommand("JOB-1", 777L, List.of("camera-01", "camera-02")),
                reviewService.command("verifyEvidencePackage"));
    }

    @Test
    void integrationSmokeUsesLoginUserAndPassesRealCameraScope() throws Exception {
        CapturingReviewService reviewService = new CapturingReviewService();
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new SupervisionAlertReviewController(reviewService.proxy()))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new LoginUser().setId(780L),
                null,
                List.of()
        ));
        try {
            mockMvc.perform(post("/system/supervision/alert-review/integration-smoke")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "operatorUserId": 9999,
                                      "includeVideoExport": true,
                                      "alertTime": "2026-07-10T06:11:30",
                                      "profile": "device-video-web",
                                      "deviceId": "device-real",
                                      "cameraId": "camera-real",
                                      "zoneCode": "zone-real",
                                      "sourceAlertId": "alert-real",
                                      "allowedCameraIds": ["camera-real"]
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.operatorUserId").value(780))
                    .andExpect(jsonPath("$.data.videoExportConfirmed").value(true));
        } finally {
            SecurityContextHolder.clearContext();
        }

        assertEquals(new ReviewIntegrationSmokeCommand(
                        780L,
                        true,
                        LocalDateTime.of(2026, 7, 10, 6, 11, 30),
                        "device-video-web",
                        "device-real",
                        "camera-real",
                        "zone-real",
                        "alert-real",
                        List.of("camera-real")
                ),
                reviewService.command("runIntegrationSmoke"));
    }

    @Test
    void playbackUrlEndpointUsesLoginUserAndPreparesAuditedPlayback() throws Exception {
        CapturingReviewService reviewService = new CapturingReviewService();
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new SupervisionAlertReviewController(reviewService.proxy()))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new LoginUser().setId(778L),
                null,
                List.of()
        ));
        try {
            mockMvc.perform(get("/system/supervision/alert-review/items/100/playback-url")
                            .param("reviewCaseId", "10")
                            .param("operatorUserId", "9999")
                            .param("materialUri", "clip.mp4")
                            .param("allowedCameraIds", "camera-01")
                            .param("reason", "open playback"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.operatorUserId").value(778))
                    .andExpect(jsonPath("$.data.playbackUrl").value("clip.mp4"))
                    .andExpect(jsonPath("$.data.decision").value("granted"));
        } finally {
            SecurityContextHolder.clearContext();
        }

        assertEquals(new ReviewPlaybackCommand(10L, 100L, 778L, "clip.mp4", List.of("camera-01"), "open playback"),
                reviewService.command("prepareReviewPlayback"));
    }

    @Test
    void operationsReportEndpointsExposeAcknowledgementContractAndUseLoginUser() throws Exception {
        CapturingReviewService reviewService = new CapturingReviewService();
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new SupervisionAlertReviewController(reviewService.proxy()))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new LoginUser().setId(779L),
                null,
                List.of()
        ));
        try {
            mockMvc.perform(post("/system/supervision/alert-review/operations-report")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "reportType": "daily",
                                      "reviewStatus": "pending_review",
                                      "cameraId": "camera-01",
                                      "periodStart": "2026-07-08T00:00:00",
                                      "periodEnd": "2026-07-08T23:59:59",
                                      "operatorUserId": 9999
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.reportType").value("daily"))
                    .andExpect(jsonPath("$.data.deliveryPlan.reportKey").value("report-controller"))
                    .andExpect(jsonPath("$.data.acknowledgement.status").value("pending"));

            mockMvc.perform(post("/system/supervision/alert-review/operations-report/acknowledgement")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "reportType": "daily",
                                      "reviewStatus": "pending_review",
                                      "cameraId": "camera-01",
                                      "periodStart": "2026-07-08T00:00:00",
                                      "periodEnd": "2026-07-08T23:59:59",
                                      "operatorUserId": 9999,
                                      "note": "shift leader acknowledged"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.reportKey").value("report-controller"))
                    .andExpect(jsonPath("$.data.status").value("acknowledged"))
                    .andExpect(jsonPath("$.data.acknowledgedBy").value(779))
                    .andExpect(jsonPath("$.data.duplicate").value(false));
        } finally {
            SecurityContextHolder.clearContext();
        }

        ReviewQuery expectedQuery = new ReviewQuery(
                "pending_review",
                "camera-01",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
        assertEquals(new ReviewReportCommand(
                        "daily",
                        expectedQuery,
                        LocalDateTime.of(2026, 7, 8, 0, 0),
                        LocalDateTime.of(2026, 7, 8, 23, 59, 59),
                        779L
                ),
                reviewService.command("generateReviewReport"));
        assertEquals(new ReviewReportAcknowledgementCommand(
                        "daily",
                        expectedQuery,
                        LocalDateTime.of(2026, 7, 8, 0, 0),
                        LocalDateTime.of(2026, 7, 8, 23, 59, 59),
                        779L,
                        "shift leader acknowledged"
                ),
                reviewService.command("acknowledgeReviewReport"));
    }

    @Test
    void ruleSuggestionGovernanceEndpointsDeclareApprovalPermissions() throws Exception {
        assertPreAuthorize(
                "updateRuleSuggestionStatus",
                new Class<?>[]{Long.class, RuleSuggestionStatusReqVO.class},
                "system:supervision-alert-review:rule-suggestion:update"
        );
        assertPreAuthorize(
                "revertRuleSuggestion",
                new Class<?>[]{Long.class, RuleSuggestionStatusReqVO.class},
                "system:supervision-alert-review:rule-suggestion:revert"
        );
        assertPreAuthorize(
                "replayRule",
                new Class<?>[]{RuleReplayReqVO.class},
                "system:supervision-alert-review:rules:replay"
        );
    }

    private static void assertPreAuthorize(String methodName,
                                           Class<?>[] parameterTypes,
                                           String permission) throws NoSuchMethodException {
        Method method = SupervisionAlertReviewController.class.getMethod(methodName, parameterTypes);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize, methodName + " must declare @PreAuthorize");
        assertEquals("@ss.hasPermission('" + permission + "')", preAuthorize.value());
    }

    private static ReviewCaseView caseView(Long id,
                                           String status,
                                           List<Long> reviewItemIds,
                                           Long ownerUserId,
                                           String notes) {
        return new ReviewCaseView(
                id,
                "RC-" + id,
                "case-" + id,
                status,
                reviewItemIds.isEmpty() ? null : reviewItemIds.get(0),
                reviewItemIds,
                List.of("camera-01"),
                LocalDateTime.of(2026, 7, 3, 18, 0),
                LocalDateTime.of(2026, 7, 3, 18, 5),
                ownerUserId,
                notes
        );
    }

    private static final class CapturingReviewService implements InvocationHandler {

        private final Map<String, Object> commands = new LinkedHashMap<>();

        private SupervisionAlertReviewService proxy() {
            return (SupervisionAlertReviewService) Proxy.newProxyInstance(
                    SupervisionAlertReviewService.class.getClassLoader(),
                    new Class<?>[]{SupervisionAlertReviewService.class},
                    this
            );
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] args) {
            if (method.getDeclaringClass() == Object.class) {
                return switch (method.getName()) {
                    case "toString" -> "CapturingReviewService";
                    case "hashCode" -> System.identityHashCode(this);
                    case "equals" -> proxy == args[0];
                    default -> null;
                };
            }
            Object command = args == null || args.length == 0 ? null : args[0];
            commands.put(method.getName(), command);
            return switch (method.getName()) {
                case "assignReviewCaseOwner" -> caseView(10L, "open", List.of(101L, 102L), 2001L, "handoff");
                case "closeReviewCase" -> caseView(10L, "closed", List.of(101L, 102L), 2001L, "resolved");
                case "mergeReviewCases" -> new ReviewCaseMergeResult(
                        caseView(10L, "open", List.of(101L, 102L, 103L), 2001L, "target"),
                        caseView(11L, "merged", List.of(), 2003L, "same lead")
                );
                case "splitReviewCase" -> new ReviewCaseSplitResult(
                        caseView(10L, "open", List.of(101L, 102L), 2001L, "source"),
                        caseView(12L, "open", List.of(103L), 2002L, "separate lead")
                );
                case "prepareReviewPlayback" -> playbackAccess((ReviewPlaybackCommand) command);
                case "verifyEvidencePackage" -> verificationReport((ReviewEvidenceVerificationCommand) command);
                case "runIntegrationSmoke" -> integrationSmokeResult((ReviewIntegrationSmokeCommand) command);
                case "generateReviewReport" -> operationsReport((ReviewReportCommand) command);
                case "acknowledgeReviewReport" -> reportAcknowledgement((ReviewReportAcknowledgementCommand) command);
                default -> throw new AssertionError("unexpected service method: " + method.getName());
            };
        }

        private Object command(String methodName) {
            return commands.get(methodName);
        }

    }

    private static ReviewPlaybackAccess playbackAccess(ReviewPlaybackCommand command) {
        ReviewMediaAccessAuditEntry audit = new ReviewMediaAccessAuditEntry(
                command.reviewCaseId(),
                command.reviewItemId(),
                command.operatorUserId(),
                "camera-01",
                command.materialUri(),
                "playback",
                "granted",
                List.of(),
                LocalDateTime.of(2026, 7, 6, 10, 1),
                Map.of("decision", "granted")
        );
        return new ReviewPlaybackAccess(
                command.reviewCaseId(),
                command.reviewItemId(),
                command.operatorUserId(),
                "camera-01",
                command.materialUri(),
                command.materialUri(),
                "granted",
                List.of(),
                audit
        );
    }

    private static ReviewEvidenceVerificationReport verificationReport(ReviewEvidenceVerificationCommand command) {
        ReviewManifestVerification manifestVerification = new ReviewManifestVerification(
                command.jobNo(),
                true,
                "sha256:expected",
                "sha256:expected",
                "sha256:package",
                List.of(),
                LocalDateTime.of(2026, 7, 6, 10, 0)
        );
        return new ReviewEvidenceVerificationReport(
                command.jobNo(),
                true,
                manifestVerification,
                Map.of(),
                List.of(),
                List.of("manifest_hash_valid"),
                List.of(),
                LocalDateTime.of(2026, 7, 6, 10, 0),
                command.operatorUserId()
        );
    }

    private static ReviewIntegrationSmokeResult integrationSmokeResult(ReviewIntegrationSmokeCommand command) {
        return new ReviewIntegrationSmokeResult(
                "passed",
                100L,
                10L,
                "JOB-SMOKE",
                true,
                true,
                true,
                List.of("video_export_confirmed"),
                LocalDateTime.of(2026, 7, 10, 6, 12),
                command.operatorUserId(),
                command.profile(),
                null
        );
    }

    private static ReviewOperationsReport operationsReport(ReviewReportCommand command) {
        Map<String, Object> deliveryPlan = Map.of(
                "reportKey", "report-controller",
                "reportType", command.reportType(),
                "deliveryStatus", "pending"
        );
        Map<String, Object> acknowledgement = Map.of(
                "reportKey", "report-controller",
                "reportType", command.reportType(),
                "status", "pending",
                "required", true
        );
        return new ReviewOperationsReport(
                command.reportType(),
                List.of(100L),
                "daily review report",
                "1 pending clue",
                List.of("missing_record"),
                List.of("acknowledge"),
                LocalDateTime.of(2026, 7, 8, 12, 0),
                command.operatorUserId(),
                Map.of("acknowledgement", acknowledgement, "deliveryPlan", deliveryPlan),
                deliveryPlan,
                acknowledgement
        );
    }

    private static ReviewReportAcknowledgement reportAcknowledgement(ReviewReportAcknowledgementCommand command) {
        return new ReviewReportAcknowledgement(
                "report-controller",
                command.reportType(),
                "acknowledged",
                command.operatorUserId(),
                LocalDateTime.of(2026, 7, 8, 12, 5),
                command.note(),
                false,
                Map.of("periodStart", String.valueOf(command.periodStart()))
        );
    }

}
