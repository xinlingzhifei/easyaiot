package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.controller.admin.supervision.SupervisionEventController;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionTaskMapper;
import com.basiclab.iot.system.enums.supervision.SupervisionEventLevelEnum;
import com.basiclab.iot.system.enums.supervision.SupervisionEventStatusEnum;
import com.basiclab.iot.system.service.supervision.SupervisionEventCloseCheckService;
import com.basiclab.iot.system.service.supervision.SupervisionEventService;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import com.basiclab.iot.system.service.supervision.SupervisionTaskAcceptanceService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskRecheckService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskReworkService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskSubmissionService;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.AlertEventRequest;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.AlertEventResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Proxy;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SupervisionEventControllerTest {

    @Test
    void createEventFromAlertMapsHttpRequestToApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new SupervisionEventController(applicationService))
                .build();

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

    private static final class CapturingWorkflowApplicationService extends SupervisionWorkflowApplicationService {

        private AlertEventRequest request;

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
                    unusedReworkService()
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

        private AlertEventRequest request() {
            return request;
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
