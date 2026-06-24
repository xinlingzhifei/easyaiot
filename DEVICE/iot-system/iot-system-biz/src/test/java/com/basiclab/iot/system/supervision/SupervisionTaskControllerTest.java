package com.basiclab.iot.system.supervision;

import com.basiclab.iot.common.web.core.handler.GlobalExceptionHandler;
import com.basiclab.iot.system.controller.admin.supervision.SupervisionTaskController;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionTaskMapper;
import com.basiclab.iot.system.enums.supervision.SupervisionEventLevelEnum;
import com.basiclab.iot.system.enums.supervision.SupervisionEventStatusEnum;
import com.basiclab.iot.system.service.supervision.SupervisionEventCloseCheckService;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import com.basiclab.iot.system.service.supervision.SupervisionTaskAcceptanceService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskRecheckService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskReworkService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskSubmissionService;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.OperationResponse;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.TaskAcceptRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Proxy;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SupervisionTaskControllerTest {

    @Test
    void acceptTaskMapsHttpRequestToApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        mockMvc.perform(post("/system/supervision/tasks/accept")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "taskId": 2001,
                                  "acceptedUserId": 3001
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.success").value(true));

        assertEquals(new TaskAcceptRequest(2001L, 3001L), applicationService.request());
    }

    @Test
    void acceptTaskRejectsInvalidRequiredFieldsBeforeApplicationFacade() throws Exception {
        CapturingWorkflowApplicationService applicationService = new CapturingWorkflowApplicationService();
        MockMvc mockMvc = mockMvc(applicationService);

        assertInvalidAcceptFieldRejected(
                mockMvc,
                applicationService,
                0,
                3001,
                "taskId must be positive"
        );
        assertInvalidAcceptFieldRejected(
                mockMvc,
                applicationService,
                2001,
                0,
                "acceptedUserId must be positive"
        );
    }

    private static void assertInvalidAcceptFieldRejected(MockMvc mockMvc,
                                                         CapturingWorkflowApplicationService applicationService,
                                                         long taskId,
                                                         long acceptedUserId,
                                                         String expectedMessage) throws Exception {
        mockMvc.perform(post("/system/supervision/tasks/accept")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "taskId": %d,
                                  "acceptedUserId": %d
                                }
                                """.formatted(taskId, acceptedUserId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").value(containsString(expectedMessage)));

        assertNull(applicationService.request());
    }

    private static MockMvc mockMvc(SupervisionWorkflowApplicationService applicationService) {
        return MockMvcBuilders
                .standaloneSetup(new SupervisionTaskController(applicationService))
                .setControllerAdvice(new GlobalExceptionHandler("iot-system-biz"))
                .build();
    }

    private static final class CapturingWorkflowApplicationService extends SupervisionWorkflowApplicationService {

        private TaskAcceptRequest request;

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
        public OperationResponse acceptTask(TaskAcceptRequest request) {
            this.request = request;
            return new OperationResponse(true);
        }

        private TaskAcceptRequest request() {
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
