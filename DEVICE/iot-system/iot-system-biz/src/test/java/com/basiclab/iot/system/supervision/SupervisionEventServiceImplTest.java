package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.enums.supervision.SupervisionEventLevelEnum;
import com.basiclab.iot.system.enums.supervision.SupervisionEventStatusEnum;
import com.basiclab.iot.system.service.supervision.SupervisionEventService;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventCommand;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.EventCreateDraft;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.EventStore;
import com.basiclab.iot.system.service.supervision.SupervisionEventServiceImpl;
import com.basiclab.iot.system.service.supervision.SupervisionRuleSeeds;
import com.basiclab.iot.system.service.supervision.SupervisionRuleSeeds.RuleSeed;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionEventServiceImplTest {

    @Test
    void createFromAlertReusesOpenEventForSameSourceAlert() {
        InMemoryEventStore eventStore = new InMemoryEventStore();
        SupervisionEventService eventService = new SupervisionEventServiceImpl(eventStore);
        AlertToEventCommand command = new AlertToEventCommand(
                "video",
                "alert-001",
                SupervisionRuleSeeds.RULE_FALL_DOWN,
                "fall_down",
                LocalDateTime.of(2026, 6, 10, 10, 30),
                "payload-hash-001"
        );
        RuleSeed ruleSeed = SupervisionRuleSeeds.findByCode(command.ruleCode()).orElseThrow();

        AlertToEventResult first = eventService.createFromAlert(command);
        AlertToEventResult second = eventService.createFromAlert(command);

        assertEquals(first.eventId(), second.eventId());
        assertFalse(first.reused());
        assertTrue(second.reused());
        assertEquals(1, eventStore.createdCount());
        assertEquals(List.of("video:alert-001", "video:alert-001"), eventStore.lookupKeys());
        assertEquals(ruleSeed.getEventType(), first.eventType());
        assertEquals(SupervisionEventLevelEnum.L4, first.eventLevel());
        assertEquals(SupervisionEventStatusEnum.CREATED.getCode(), first.eventStatus());
    }

    private static final class InMemoryEventStore implements EventStore {

        private long nextEventId = 1000L;
        private final Map<String, AlertToEventResult> openEvents = new LinkedHashMap<>();
        private final List<String> lookupKeys = new ArrayList<>();
        private int createdCount;

        @Override
        public Optional<AlertToEventResult> findOpenBySourceAlert(String sourceSystem, String sourceAlertId) {
            lookupKeys.add(key(sourceSystem, sourceAlertId));
            return Optional.ofNullable(openEvents.get(key(sourceSystem, sourceAlertId)));
        }

        @Override
        public AlertToEventResult create(EventCreateDraft draft) {
            createdCount++;
            AlertToEventResult result = new AlertToEventResult(
                    ++nextEventId,
                    draft.sourceSystem(),
                    draft.sourceAlertId(),
                    draft.ruleCode(),
                    draft.eventType(),
                    draft.eventLevel(),
                    draft.eventStatus(),
                    false
            );
            openEvents.put(key(draft.sourceSystem(), draft.sourceAlertId()), result);
            return result;
        }

        int createdCount() {
            return createdCount;
        }

        List<String> lookupKeys() {
            return lookupKeys;
        }

        private String key(String sourceSystem, String sourceAlertId) {
            return sourceSystem + ":" + sourceAlertId;
        }

    }

}
