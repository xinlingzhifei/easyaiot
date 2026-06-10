package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.enums.supervision.SupervisionEventStatusEnum;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventCommand;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.EventCreateDraft;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.EventStore;
import com.basiclab.iot.system.service.supervision.SupervisionRuleSeeds.RuleSeed;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class SupervisionEventServiceImpl implements SupervisionEventService {

    private final EventStore eventStore;

    public SupervisionEventServiceImpl(EventStore eventStore) {
        this.eventStore = Objects.requireNonNull(eventStore, "eventStore");
    }

    @Override
    public AlertToEventResult createFromAlert(AlertToEventCommand command) {
        Objects.requireNonNull(command, "command");
        String sourceSystem = requireText(command.sourceSystem(), "sourceSystem");
        String sourceAlertId = requireText(command.sourceAlertId(), "sourceAlertId");

        return eventStore.findOpenBySourceAlert(sourceSystem, sourceAlertId)
                .map(AlertToEventResult::asReused)
                .orElseGet(() -> createNewEvent(command, sourceSystem, sourceAlertId));
    }

    private AlertToEventResult createNewEvent(AlertToEventCommand command,
                                             String sourceSystem,
                                             String sourceAlertId) {
        String ruleCode = requireText(command.ruleCode(), "ruleCode");
        RuleSeed ruleSeed = SupervisionRuleSeeds.findByCode(ruleCode)
                .orElseThrow(() -> new IllegalArgumentException("Unsupported supervision rule code: " + ruleCode));

        EventCreateDraft draft = new EventCreateDraft(
                sourceSystem,
                sourceAlertId,
                resolveSourceAlertType(command.sourceAlertType(), ruleSeed),
                command.sourceAlertTime(),
                command.sourcePayloadHash(),
                ruleCode,
                ruleSeed.getEventType(),
                ruleSeed.getDefaultLevel(),
                SupervisionEventStatusEnum.CREATED.getCode()
        );
        return eventStore.create(draft);
    }

    private static String resolveSourceAlertType(String sourceAlertType, RuleSeed ruleSeed) {
        if (sourceAlertType == null || sourceAlertType.isBlank()) {
            return ruleSeed.getAlertType();
        }
        return sourceAlertType;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return value;
    }

}
