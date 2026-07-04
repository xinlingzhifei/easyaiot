package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.controller.admin.supervision.SupervisionAlertReviewController;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseMergeCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseMergeResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseOperationCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseOwnerCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseSplitCommand;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseSplitResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewCaseView;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
                default -> throw new AssertionError("unexpected service method: " + method.getName());
            };
        }

        private Object command(String methodName) {
            return commands.get(methodName);
        }

    }

}