package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.enums.supervision.SupervisionEventLevelEnum;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public interface SupervisionEventService {

    AlertToEventResult createFromAlert(AlertToEventCommand command);

    record AlertToEventCommand(String sourceSystem,
                               String sourceAlertId,
                               String ruleCode,
                               String sourceAlertType,
                               LocalDateTime sourceAlertTime,
                               String sourcePayloadHash) {
    }

    record AlertToEventResult(Long eventId,
                              String sourceSystem,
                              String sourceAlertId,
                              String ruleCode,
                              String eventType,
                              SupervisionEventLevelEnum eventLevel,
                              String eventStatus,
                              boolean reused) {

        public AlertToEventResult asReused() {
            if (reused) {
                return this;
            }
            return new AlertToEventResult(eventId, sourceSystem, sourceAlertId, ruleCode,
                    eventType, eventLevel, eventStatus, true);
        }

    }

    record EventCreateDraft(String sourceSystem,
                            String sourceAlertId,
                            String sourceAlertType,
                            LocalDateTime sourceAlertTime,
                            String sourcePayloadHash,
                            String ruleCode,
                            String eventType,
                            SupervisionEventLevelEnum eventLevel,
                            String eventStatus) {
    }

    record TaskDispatchCommand(Long eventId,
                               String ruleCode,
                               String eventType,
                               SupervisionEventLevelEnum eventLevel,
                               List<String> responsibilityChain) {

        public TaskDispatchCommand {
            responsibilityChain = List.copyOf(Objects.requireNonNull(responsibilityChain, "responsibilityChain"));
        }

    }

    interface EventStore {

        Optional<AlertToEventResult> findOpenBySourceAlert(String sourceSystem, String sourceAlertId);

        AlertToEventResult create(EventCreateDraft draft);

    }

    interface TaskDispatcher {

        void dispatchForNewEvent(TaskDispatchCommand command);

    }

}
