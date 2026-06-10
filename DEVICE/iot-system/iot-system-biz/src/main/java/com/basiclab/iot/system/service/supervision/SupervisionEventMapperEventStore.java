package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionEventDO;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionEventMapper;
import com.basiclab.iot.system.enums.supervision.SupervisionEventLevelEnum;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.EventCreateDraft;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.EventStore;
import com.basiclab.iot.system.service.supervision.SupervisionTaskAcceptanceService.EventAcceptanceStore;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class SupervisionEventMapperEventStore implements EventStore, EventAcceptanceStore {

    private static final String EVENT_NO_PREFIX = "SE-";

    private final SupervisionEventMapper supervisionEventMapper;

    public SupervisionEventMapperEventStore(SupervisionEventMapper supervisionEventMapper) {
        this.supervisionEventMapper = Objects.requireNonNull(supervisionEventMapper, "supervisionEventMapper");
    }

    @Override
    public Optional<AlertToEventResult> findOpenBySourceAlert(String sourceSystem, String sourceAlertId) {
        return Optional.ofNullable(supervisionEventMapper.selectOpenBySourceAlert(sourceSystem, sourceAlertId))
                .map(this::toResult);
    }

    @Override
    public AlertToEventResult create(EventCreateDraft draft) {
        Objects.requireNonNull(draft, "draft");
        SupervisionEventDO eventDO = new SupervisionEventDO()
                .setEventNo(newEventNo())
                .setSourceSystem(draft.sourceSystem())
                .setSourceAlertId(draft.sourceAlertId())
                .setSourceAlertType(draft.sourceAlertType())
                .setSourceAlertTime(draft.sourceAlertTime())
                .setSourcePayloadHash(draft.sourcePayloadHash())
                .setEventType(draft.eventType())
                .setEventLevel(draft.eventLevel().getCode())
                .setEventStatus(draft.eventStatus());
        supervisionEventMapper.insert(eventDO);
        return new AlertToEventResult(
                eventDO.getId(),
                draft.sourceSystem(),
                draft.sourceAlertId(),
                draft.ruleCode(),
                draft.eventType(),
                draft.eventLevel(),
                draft.eventStatus(),
                false
        );
    }

    @Override
    public void markDispatched(Long eventId) {
        Objects.requireNonNull(eventId, "eventId");
        supervisionEventMapper.updateStatusToDispatched(eventId, LocalDateTime.now());
    }

    @Override
    public void markAccepted(Long eventId) {
        Objects.requireNonNull(eventId, "eventId");
        supervisionEventMapper.updateStatusToAccepted(eventId, LocalDateTime.now());
    }

    private AlertToEventResult toResult(SupervisionEventDO eventDO) {
        return new AlertToEventResult(
                eventDO.getId(),
                eventDO.getSourceSystem(),
                eventDO.getSourceAlertId(),
                null,
                eventDO.getEventType(),
                SupervisionEventLevelEnum.valueOf(eventDO.getEventLevel()),
                eventDO.getEventStatus(),
                false
        );
    }

    private String newEventNo() {
        return EVENT_NO_PREFIX + UUID.randomUUID();
    }

}
