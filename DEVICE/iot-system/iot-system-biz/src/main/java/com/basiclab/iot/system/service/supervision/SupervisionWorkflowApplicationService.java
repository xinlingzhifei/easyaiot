package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventCommand;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
public class SupervisionWorkflowApplicationService {

    private final SupervisionEventService supervisionEventService;
    private final SupervisionTaskAcceptanceService supervisionTaskAcceptanceService;
    private final SupervisionTaskSubmissionService supervisionTaskSubmissionService;
    private final SupervisionTaskRecheckService supervisionTaskRecheckService;
    private final SupervisionEventCloseCheckService supervisionEventCloseCheckService;
    private final SupervisionTaskReworkService supervisionTaskReworkService;

    public SupervisionWorkflowApplicationService(SupervisionEventService supervisionEventService,
                                                 SupervisionTaskAcceptanceService supervisionTaskAcceptanceService,
                                                 SupervisionTaskSubmissionService supervisionTaskSubmissionService,
                                                 SupervisionTaskRecheckService supervisionTaskRecheckService,
                                                 SupervisionEventCloseCheckService supervisionEventCloseCheckService,
                                                 SupervisionTaskReworkService supervisionTaskReworkService) {
        this.supervisionEventService = Objects.requireNonNull(supervisionEventService, "supervisionEventService");
        this.supervisionTaskAcceptanceService = Objects.requireNonNull(supervisionTaskAcceptanceService, "supervisionTaskAcceptanceService");
        this.supervisionTaskSubmissionService = Objects.requireNonNull(supervisionTaskSubmissionService, "supervisionTaskSubmissionService");
        this.supervisionTaskRecheckService = Objects.requireNonNull(supervisionTaskRecheckService, "supervisionTaskRecheckService");
        this.supervisionEventCloseCheckService = Objects.requireNonNull(supervisionEventCloseCheckService, "supervisionEventCloseCheckService");
        this.supervisionTaskReworkService = Objects.requireNonNull(supervisionTaskReworkService, "supervisionTaskReworkService");
    }

    public AlertEventResponse createEventFromAlert(AlertEventRequest request) {
        Objects.requireNonNull(request, "request");
        AlertToEventResult result = supervisionEventService.createFromAlert(new AlertToEventCommand(
                request.sourceSystem(),
                request.sourceAlertId(),
                request.ruleCode(),
                request.sourceAlertType(),
                request.sourceAlertTime(),
                request.sourcePayloadHash()
        ));
        return toResponse(result);
    }

    public OperationResponse acceptTask(TaskAcceptRequest request) {
        Objects.requireNonNull(request, "request");
        return new OperationResponse(supervisionTaskAcceptanceService.acceptTask(
                request.taskId(),
                request.acceptedUserId()
        ));
    }

    public OperationResponse submitTask(TaskSubmitRequest request) {
        Objects.requireNonNull(request, "request");
        return new OperationResponse(supervisionTaskSubmissionService.submitTask(
                request.taskId(),
                request.resultCategory(),
                request.handlingNote()
        ));
    }

    public OperationResponse approveRecheck(TaskRecheckRequest request) {
        Objects.requireNonNull(request, "request");
        return new OperationResponse(supervisionTaskRecheckService.approveSubmittedTask(request.taskId()));
    }

    public OperationResponse rejectRecheck(TaskRecheckRequest request) {
        Objects.requireNonNull(request, "request");
        return new OperationResponse(supervisionTaskRecheckService.rejectSubmittedTask(request.taskId()));
    }

    public OperationResponse approveCloseCheck(CloseCheckRequest request) {
        Objects.requireNonNull(request, "request");
        return new OperationResponse(supervisionEventCloseCheckService.approveCloseCheck(request.eventId()));
    }

    public OperationResponse rejectCloseCheck(CloseCheckRequest request) {
        Objects.requireNonNull(request, "request");
        return new OperationResponse(supervisionEventCloseCheckService.rejectCloseCheck(request.eventId()));
    }

    public OperationResponse restartRework(TaskAcceptRequest request) {
        Objects.requireNonNull(request, "request");
        return new OperationResponse(supervisionTaskReworkService.restartReworkTask(
                request.taskId(),
                request.acceptedUserId()
        ));
    }

    private AlertEventResponse toResponse(AlertToEventResult result) {
        return new AlertEventResponse(
                result.eventId(),
                result.sourceSystem(),
                result.sourceAlertId(),
                result.ruleCode(),
                result.eventType(),
                result.eventLevel().getCode(),
                result.eventStatus(),
                result.reused()
        );
    }

    public record AlertEventRequest(String sourceSystem,
                                    String sourceAlertId,
                                    String ruleCode,
                                    String sourceAlertType,
                                    LocalDateTime sourceAlertTime,
                                    String sourcePayloadHash) {
    }

    public record AlertEventResponse(Long eventId,
                                     String sourceSystem,
                                     String sourceAlertId,
                                     String ruleCode,
                                     String eventType,
                                     String eventLevel,
                                     String eventStatus,
                                     boolean reused) {
    }

    public record TaskAcceptRequest(Long taskId,
                                    Long acceptedUserId) {
    }

    public record TaskSubmitRequest(Long taskId,
                                    String resultCategory,
                                    String handlingNote) {
    }

    public record TaskRecheckRequest(Long taskId) {
    }

    public record CloseCheckRequest(Long eventId) {
    }

    public record OperationResponse(boolean success) {
    }

}
