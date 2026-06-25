package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventCommand;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.EventDetail;
import com.basiclab.iot.system.service.supervision.SupervisionTaskQueryService.TaskDetail;
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
    private final SupervisionTaskQueryService supervisionTaskQueryService;

    public SupervisionWorkflowApplicationService(SupervisionEventService supervisionEventService,
                                                 SupervisionTaskAcceptanceService supervisionTaskAcceptanceService,
                                                 SupervisionTaskSubmissionService supervisionTaskSubmissionService,
                                                 SupervisionTaskRecheckService supervisionTaskRecheckService,
                                                 SupervisionEventCloseCheckService supervisionEventCloseCheckService,
                                                 SupervisionTaskReworkService supervisionTaskReworkService,
                                                 SupervisionTaskQueryService supervisionTaskQueryService) {
        this.supervisionEventService = Objects.requireNonNull(supervisionEventService, "supervisionEventService");
        this.supervisionTaskAcceptanceService = Objects.requireNonNull(supervisionTaskAcceptanceService, "supervisionTaskAcceptanceService");
        this.supervisionTaskSubmissionService = Objects.requireNonNull(supervisionTaskSubmissionService, "supervisionTaskSubmissionService");
        this.supervisionTaskRecheckService = Objects.requireNonNull(supervisionTaskRecheckService, "supervisionTaskRecheckService");
        this.supervisionEventCloseCheckService = Objects.requireNonNull(supervisionEventCloseCheckService, "supervisionEventCloseCheckService");
        this.supervisionTaskReworkService = Objects.requireNonNull(supervisionTaskReworkService, "supervisionTaskReworkService");
        this.supervisionTaskQueryService = Objects.requireNonNull(supervisionTaskQueryService, "supervisionTaskQueryService");
    }

    public AlertEventResponse createEventFromAlert(AlertEventRequest request) {
        Objects.requireNonNull(request, "request");
        requireNonBlank(request.sourceSystem(), "sourceSystem");
        requireNonBlank(request.sourceAlertId(), "sourceAlertId");
        requireNonBlank(request.ruleCode(), "ruleCode");
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

    public EventDetailResponse getEventDetail(EventDetailRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.eventId(), "eventId");
        return supervisionEventService.getEventDetail(request.eventId())
                .map(this::toResponse)
                .orElse(null);
    }

    public TaskDetailResponse getTaskDetail(TaskDetailRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.taskId(), "taskId");
        return supervisionTaskQueryService.getTaskDetail(request.taskId())
                .map(this::toResponse)
                .orElse(null);
    }

    public TaskDetailResponse getCurrentTaskByEvent(TaskByEventRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.eventId(), "eventId");
        return supervisionTaskQueryService.getCurrentTaskByEvent(request.eventId())
                .map(this::toResponse)
                .orElse(null);
    }

    public ClosureSummaryResponse getClosureSummary(ClosureSummaryRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.eventId(), "eventId");
        return supervisionEventService.getEventDetail(request.eventId())
                .map(event -> toClosureSummary(event, supervisionTaskQueryService.getCurrentTaskByEvent(request.eventId()).orElse(null)))
                .orElse(null);
    }

    public OperationResponse acceptTask(TaskAcceptRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.taskId(), "taskId");
        requirePositive(request.acceptedUserId(), "acceptedUserId");
        return new OperationResponse(supervisionTaskAcceptanceService.acceptTask(
                request.taskId(),
                request.acceptedUserId()
        ));
    }

    public OperationResponse submitTask(TaskSubmitRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.taskId(), "taskId");
        requireNonBlank(request.resultCategory(), "resultCategory");
        requireNonBlank(request.handlingNote(), "handlingNote");
        return new OperationResponse(supervisionTaskSubmissionService.submitTask(
                request.taskId(),
                request.resultCategory(),
                request.handlingNote()
        ));
    }

    public OperationResponse approveRecheck(TaskRecheckRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.taskId(), "taskId");
        return new OperationResponse(supervisionTaskRecheckService.approveSubmittedTask(request.taskId()));
    }

    public OperationResponse rejectRecheck(TaskRecheckRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.taskId(), "taskId");
        return new OperationResponse(supervisionTaskRecheckService.rejectSubmittedTask(request.taskId()));
    }

    public OperationResponse approveCloseCheck(CloseCheckRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.eventId(), "eventId");
        return new OperationResponse(supervisionEventCloseCheckService.approveCloseCheck(request.eventId()));
    }

    public OperationResponse rejectCloseCheck(CloseCheckRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.eventId(), "eventId");
        return new OperationResponse(supervisionEventCloseCheckService.rejectCloseCheck(request.eventId()));
    }

    public OperationResponse restartRework(TaskAcceptRequest request) {
        Objects.requireNonNull(request, "request");
        requirePositive(request.taskId(), "taskId");
        requirePositive(request.acceptedUserId(), "acceptedUserId");
        return new OperationResponse(supervisionTaskReworkService.restartReworkTask(
                request.taskId(),
                request.acceptedUserId()
        ));
    }

    private static void requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
    }

    private static void requirePositive(Long value, String fieldName) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(fieldName + " must be positive");
        }
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

    private EventDetailResponse toResponse(EventDetail detail) {
        return new EventDetailResponse(
                detail.eventId(),
                detail.sourceSystem(),
                detail.sourceAlertId(),
                detail.ruleCode(),
                detail.eventType(),
                detail.eventLevel(),
                detail.eventStatus(),
                detail.closeResult(),
                detail.createdAt(),
                detail.acceptedAt(),
                detail.handledAt(),
                detail.closedAt()
        );
    }

    private TaskDetailResponse toResponse(TaskDetail detail) {
        return new TaskDetailResponse(
                detail.taskId(),
                detail.eventId(),
                detail.taskStatus(),
                detail.acceptedUserId(),
                detail.acceptedAt(),
                detail.submittedAt(),
                detail.resultCategory(),
                detail.handlingNote(),
                detail.reworkCount()
        );
    }

    private ClosureSummaryResponse toClosureSummary(EventDetail event, TaskDetail task) {
        return new ClosureSummaryResponse(
                event.eventId(),
                event.eventStatus(),
                task == null ? null : task.taskId(),
                task == null ? null : task.taskStatus(),
                task == null ? null : task.reworkCount(),
                event.closeResult(),
                event.acceptedAt(),
                event.handledAt(),
                event.closedAt()
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

    public record EventDetailRequest(Long eventId) {
    }

    public record EventDetailResponse(Long eventId,
                                      String sourceSystem,
                                      String sourceAlertId,
                                      String ruleCode,
                                      String eventType,
                                      String eventLevel,
                                      String eventStatus,
                                      String closeResult,
                                      LocalDateTime createdAt,
                                      LocalDateTime acceptedAt,
                                      LocalDateTime handledAt,
                                      LocalDateTime closedAt) {
    }

    public record TaskDetailRequest(Long taskId) {
    }

    public record TaskByEventRequest(Long eventId) {
    }

    public record TaskDetailResponse(Long taskId,
                                     Long eventId,
                                     String taskStatus,
                                     Long acceptedUserId,
                                     LocalDateTime acceptedAt,
                                     LocalDateTime submittedAt,
                                     String resultCategory,
                                     String handlingNote,
                                     Integer reworkCount) {
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

    public record ClosureSummaryRequest(Long eventId) {
    }

    public record ClosureSummaryResponse(Long eventId,
                                         String eventStatus,
                                         Long taskId,
                                         String taskStatus,
                                         Integer reworkCount,
                                         String closeResult,
                                         LocalDateTime acceptedAt,
                                         LocalDateTime handledAt,
                                         LocalDateTime closedAt) {
    }

    public record OperationResponse(boolean success) {
    }

}
