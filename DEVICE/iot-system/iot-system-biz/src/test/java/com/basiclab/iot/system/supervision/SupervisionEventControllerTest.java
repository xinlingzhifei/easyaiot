package com.basiclab.iot.system.supervision;

import com.basiclab.iot.common.web.core.handler.GlobalExceptionHandler;
import com.basiclab.iot.system.controller.admin.supervision.SupervisionEventController;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionTaskMapper;
import com.basiclab.iot.system.enums.supervision.SupervisionEventLevelEnum;
import com.basiclab.iot.system.enums.supervision.SupervisionEventStatusEnum;
import com.basiclab.iot.system.enums.supervision.SupervisionTaskStatusEnum;
import com.basiclab.iot.system.service.supervision.SupervisionEventCloseCheckService;
import com.basiclab.iot.system.service.supervision.SupervisionEventService;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import com.basiclab.iot.system.service.supervision.SupervisionTaskAcceptanceService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskRecheckService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskQueryService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskReworkService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskSubmissionService;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.AlertEventRequest;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.AlertEventResponse;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.CloseCheckRequest;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.ClosureSummaryRequest;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.ClosureSummaryResponse;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.EventDetailRequest;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.EventDetailResponse;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.OperationResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Proxy;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SupervisionEventControllerTest {

    @Test
    void getEventDetailMapsHttpRequestToApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        mockMvc.perform(get("/system/supervision/events/get")
                        .param("id", "1001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.eventId").value(1001))
                .andExpect(jsonPath("$.data.sourceSystem").value("video"))
                .andExpect(jsonPath("$.data.sourceAlertId").value("alert-001"))
                .andExpect(jsonPath("$.data.ruleCode").value("RULE_ABNORMAL_GATHERING"))
                .andExpect(jsonPath("$.data.eventType").value("crowd_gathering"))
                .andExpect(jsonPath("$.data.eventLevel").value("L3"))
                .andExpect(jsonPath("$.data.eventStatus").value(SupervisionEventStatusEnum.CLOSED.getCode()))
                .andExpect(jsonPath("$.data.closeResult").value("normal_closed"))
                .andExpect(jsonPath("$.data.createdAt").value("2026-06-11T09:30:00"))
                .andExpect(jsonPath("$.data.acceptedAt").value("2026-06-11T09:35:00"))
                .andExpect(jsonPath("$.data.handledAt").value("2026-06-11T09:50:00"))
                .andExpect(jsonPath("$.data.closedAt").value("2026-06-11T10:10:00"));

        assertEquals(new EventDetailRequest(1001L), applicationService.detailRequest());
    }

    @Test
    void getEventDetailRejectsInvalidEventIdBeforeApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        mockMvc.perform(get("/system/supervision/events/get"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").value(containsString("eventId must not be null")));

        assertNull(applicationService.detailRequest());

        assertInvalidEventIdRejected(mockMvc, applicationService, "0", "eventId must be positive");
        assertInvalidEventIdRejected(mockMvc, applicationService, "-1", "eventId must be positive");
    }

    private static void assertInvalidEventIdRejected(MockMvc mockMvc,
                                                     CapturingWorkflowApplicationService applicationService,
                                                     String eventId,
                                                     String expectedMessage) throws Exception {
        mockMvc.perform(get("/system/supervision/events/get")
                        .param("id", eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").value(containsString(expectedMessage)));

        assertNull(applicationService.detailRequest());
    }

    @Test
    void getClosureSummaryMapsHttpRequestToApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        mockMvc.perform(get("/system/supervision/events/closure-summary")
                        .param("id", "1001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.eventId").value(1001))
                .andExpect(jsonPath("$.data.eventStatus").value(SupervisionEventStatusEnum.PENDING_CLOSE_CHECK.getCode()))
                .andExpect(jsonPath("$.data.taskId").value(2002))
                .andExpect(jsonPath("$.data.taskStatus").value(SupervisionTaskStatusEnum.APPROVED.getCode()))
                .andExpect(jsonPath("$.data.reworkCount").value(2))
                .andExpect(jsonPath("$.data.closeResult").value("normal_closed"))
                .andExpect(jsonPath("$.data.acceptedAt").value("2026-06-11T09:35:00"))
                .andExpect(jsonPath("$.data.handledAt").value("2026-06-11T09:50:00"))
                .andExpect(jsonPath("$.data.closedAt").value("2026-06-11T10:10:00"));

        assertEquals(new ClosureSummaryRequest(1001L), applicationService.closureSummaryRequest());
    }

    @Test
    void createEventFromAlertMapsHttpRequestToApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        mockMvc.perform(post("/system/supervision/events/from-alert")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sourceSystem": "video",
                                  "sourceAlertId": "alert-001",
                                  "ruleCode": "abnormal_gathering",
                                  "sourceAlertType": "abnormal_gathering",
                                  "sourceAlertTime": "2026-06-11T09:30:00",
                                  "sourcePayloadHash": "payload-hash-001"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.eventId").value(1001))
                .andExpect(jsonPath("$.data.sourceSystem").value("video"))
                .andExpect(jsonPath("$.data.sourceAlertId").value("alert-001"))
                .andExpect(jsonPath("$.data.ruleCode").value("abnormal_gathering"))
                .andExpect(jsonPath("$.data.eventType").value("crowd_gathering"))
                .andExpect(jsonPath("$.data.eventLevel").value("L3"))
                .andExpect(jsonPath("$.data.eventStatus").value(SupervisionEventStatusEnum.DISPATCHED.getCode()))
                .andExpect(jsonPath("$.data.reused").value(false));

        assertEquals(new AlertEventRequest(
                "video",
                "alert-001",
                "abnormal_gathering",
                "abnormal_gathering",
                LocalDateTime.of(2026, 6, 11, 9, 30),
                "payload-hash-001"
        ), applicationService.request());
    }

    @Test
    void approveCloseCheckMapsHttpRequestToApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        mockMvc.perform(post("/system/supervision/events/close-check/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": 1001
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.success").value(true));

        assertEquals(new CloseCheckRequest(1001L), applicationService.approveCloseCheckRequest());
    }

    @Test
    void rejectCloseCheckMapsHttpRequestToApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        mockMvc.perform(post("/system/supervision/events/close-check/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": 1001
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.success").value(true));

        assertEquals(new CloseCheckRequest(1001L), applicationService.rejectCloseCheckRequest());
    }

    @Test
    void createEventFromAlertRejectsBlankRequiredFieldsBeforeApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        assertBlankRequiredFieldRejected(
                mockMvc,
                applicationService,
                " ",
                "alert-001",
                "abnormal_gathering",
                "请求参数不正确:sourceSystem must not be blank"
        );
        assertBlankRequiredFieldRejected(
                mockMvc,
                applicationService,
                "video",
                " ",
                "abnormal_gathering",
                "请求参数不正确:sourceAlertId must not be blank"
        );
        assertBlankRequiredFieldRejected(
                mockMvc,
                applicationService,
                "video",
                "alert-001",
                " ",
                "请求参数不正确:ruleCode must not be blank"
        );
    }

    private static void assertBlankRequiredFieldRejected(MockMvc mockMvc,
                                                         CapturingWorkflowApplicationService applicationService,
                                                         String sourceSystem,
                                                         String sourceAlertId,
                                                         String ruleCode,
                                                         String expectedMessage) throws Exception {
        mockMvc.perform(post("/system/supervision/events/from-alert")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sourceSystem": "%s",
                                  "sourceAlertId": "%s",
                                  "ruleCode": "%s",
                                  "sourceAlertType": "abnormal_gathering",
                                  "sourceAlertTime": "2026-06-11T09:30:00",
                                  "sourcePayloadHash": "payload-hash-001"
                                }
                                """.formatted(sourceSystem, sourceAlertId, ruleCode)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").value(expectedMessage));

        assertNull(applicationService.request());
    }

    private static MockMvc mockMvc(SupervisionWorkflowApplicationService applicationService) {
        return MockMvcBuilders
                .standaloneSetup(new SupervisionEventController(applicationService))
                .setControllerAdvice(new GlobalExceptionHandler("iot-system-biz"))
                .build();
    }

    private static final class CapturingWorkflowApplicationService extends SupervisionWorkflowApplicationService {

        private AlertEventRequest request;
        private EventDetailRequest detailRequest;
        private ClosureSummaryRequest closureSummaryRequest;
        private CloseCheckRequest approveCloseCheckRequest;
        private CloseCheckRequest rejectCloseCheckRequest;

        private CapturingWorkflowApplicationService() {
            super(
                    command -> new AlertToEventResult(
                            1001L,
                            "video",
                            "alert-001",
                            "abnormal_gathering",
                            "crowd_gathering",
                            SupervisionEventLevelEnum.L3,
                            SupervisionEventStatusEnum.DISPATCHED.getCode(),
                            false
                    ),
                    unusedAcceptanceService(),
                    unusedSubmissionService(),
                    unusedRecheckService(),
                    unusedCloseCheckService(),
                    unusedReworkService(),
                    unusedTaskQueryService()
            );
        }

        @Override
        public ClosureSummaryResponse getClosureSummary(ClosureSummaryRequest request) {
            this.closureSummaryRequest = request;
            return new ClosureSummaryResponse(
                    1001L,
                    SupervisionEventStatusEnum.PENDING_CLOSE_CHECK.getCode(),
                    2002L,
                    SupervisionTaskStatusEnum.APPROVED.getCode(),
                    2,
                    "normal_closed",
                    LocalDateTime.of(2026, 6, 11, 9, 35),
                    LocalDateTime.of(2026, 6, 11, 9, 50),
                    LocalDateTime.of(2026, 6, 11, 10, 10)
            );
        }

        @Override
        public EventDetailResponse getEventDetail(EventDetailRequest request) {
            this.detailRequest = request;
            return new EventDetailResponse(
                    1001L,
                    "video",
                    "alert-001",
                    "RULE_ABNORMAL_GATHERING",
                    "crowd_gathering",
                    "L3",
                    SupervisionEventStatusEnum.CLOSED.getCode(),
                    "normal_closed",
                    LocalDateTime.of(2026, 6, 11, 9, 30),
                    LocalDateTime.of(2026, 6, 11, 9, 35),
                    LocalDateTime.of(2026, 6, 11, 9, 50),
                    LocalDateTime.of(2026, 6, 11, 10, 10)
            );
        }

        @Override
        public AlertEventResponse createEventFromAlert(AlertEventRequest request) {
            this.request = request;
            return new AlertEventResponse(
                    1001L,
                    "video",
                    "alert-001",
                    "abnormal_gathering",
                    "crowd_gathering",
                    "L3",
                    SupervisionEventStatusEnum.DISPATCHED.getCode(),
                    false
            );
        }

        @Override
        public OperationResponse approveCloseCheck(CloseCheckRequest request) {
            this.approveCloseCheckRequest = request;
            return new OperationResponse(true);
        }

        @Override
        public OperationResponse rejectCloseCheck(CloseCheckRequest request) {
            this.rejectCloseCheckRequest = request;
            return new OperationResponse(true);
        }

        private AlertEventRequest request() {
            return request;
        }

        private EventDetailRequest detailRequest() {
            return detailRequest;
        }

        private ClosureSummaryRequest closureSummaryRequest() {
            return closureSummaryRequest;
        }

        private CloseCheckRequest approveCloseCheckRequest() {
            return approveCloseCheckRequest;
        }

        private CloseCheckRequest rejectCloseCheckRequest() {
            return rejectCloseCheckRequest;
        }

    }

    private static SupervisionTaskAcceptanceService unusedAcceptanceService() {
        return new SupervisionTaskAcceptanceService(unusedTaskMapper(), eventId -> {
            throw new AssertionError("unused event acceptance store");
        }) {
        };
    }

    private static SupervisionTaskSubmissionService unusedSubmissionService() {
        return new SupervisionTaskSubmissionService(unusedTaskMapper(), eventId -> {
            throw new AssertionError("unused event handling store");
        }) {
        };
    }

    private static SupervisionTaskRecheckService unusedRecheckService() {
        return new SupervisionTaskRecheckService(unusedTaskMapper(), new SupervisionTaskRecheckService.EventRecheckStore() {
            @Override
            public void markRechecked(Long eventId) {
                throw new AssertionError("unused event recheck store");
            }

            @Override
            public void markReworkRequired(Long eventId) {
                throw new AssertionError("unused event recheck store");
            }
        }) {
        };
    }

    private static SupervisionEventCloseCheckService unusedCloseCheckService() {
        return new SupervisionEventCloseCheckService(new SupervisionEventCloseCheckService.EventCloseStore() {
            @Override
            public boolean markClosed(Long eventId, String closeResult) {
                throw new AssertionError("unused event close store");
            }

            @Override
            public boolean markCloseCheckReworkRequired(Long eventId) {
                throw new AssertionError("unused event close store");
            }
        }) {
        };
    }

    private static SupervisionTaskReworkService unusedReworkService() {
        return new SupervisionTaskReworkService(unusedTaskMapper(), eventId -> {
            throw new AssertionError("unused event rework store");
        }) {
        };
    }

    private static SupervisionTaskQueryService unusedTaskQueryService() {
        return new SupervisionTaskQueryService(unusedTaskMapper()) {
            @Override
            public java.util.Optional<SupervisionTaskQueryService.TaskDetail> getTaskDetail(Long taskId) {
                throw new AssertionError("unused task query service");
            }
        };
    }

    private static SupervisionTaskMapper unusedTaskMapper() {
        Object target = new Object();
        return (SupervisionTaskMapper) Proxy.newProxyInstance(
                SupervisionTaskMapper.class.getClassLoader(),
                new Class<?>[]{SupervisionTaskMapper.class},
                (proxy, method, args) -> {
                    if (method.getDeclaringClass() == Object.class) {
                        return method.invoke(target, args);
                    }
                    throw new AssertionError("unused task mapper");
                }
        );
    }

}
