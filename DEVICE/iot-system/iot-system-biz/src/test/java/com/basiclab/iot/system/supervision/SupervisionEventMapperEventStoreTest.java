package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionEventDO;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionEventMapper;
import com.basiclab.iot.system.enums.supervision.SupervisionEventLevelEnum;
import com.basiclab.iot.system.enums.supervision.SupervisionEventStatusEnum;
import com.basiclab.iot.system.service.supervision.SupervisionEventMapperEventStore;
import com.basiclab.iot.system.service.supervision.SupervisionEventService;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventCommand;
import com.basiclab.iot.system.service.supervision.SupervisionEventService.AlertToEventResult;
import com.basiclab.iot.system.service.supervision.SupervisionEventServiceImpl;
import com.basiclab.iot.system.service.supervision.SupervisionRuleSeeds;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionEventMapperEventStoreTest {

    @Test
    void serviceCreatesEventThroughMapperStoreOnlyWhenNoOpenEventExists() {
        CapturingMapperHandler mapperHandler = new CapturingMapperHandler();
        SupervisionEventService eventService = new SupervisionEventServiceImpl(
                new SupervisionEventMapperEventStore(mapperHandler.createProxy())
        );
        AlertToEventCommand command = new AlertToEventCommand(
                "video",
                "alert-001",
                SupervisionRuleSeeds.RULE_FALL_DOWN,
                "fall_down",
                LocalDateTime.of(2026, 6, 10, 10, 30),
                "payload-hash-001"
        );

        AlertToEventResult first = eventService.createFromAlert(command);
        AlertToEventResult second = eventService.createFromAlert(command);

        assertEquals(List.of("video:alert-001", "video:alert-001"), mapperHandler.lookupKeys());
        assertEquals(1, mapperHandler.insertedEvents().size());
        assertFalse(first.reused());
        assertTrue(second.reused());
        assertEquals(first.eventId(), second.eventId());
        assertEquals(SupervisionEventStatusEnum.CREATED.getCode(), first.eventStatus());
        assertEquals(SupervisionEventLevelEnum.L4, first.eventLevel());

        SupervisionEventDO insertedEvent = mapperHandler.insertedEvents().get(0);
        assertNotNull(insertedEvent.getEventNo());
        assertEquals("video", insertedEvent.getSourceSystem());
        assertEquals("alert-001", insertedEvent.getSourceAlertId());
        assertEquals("fall_down", insertedEvent.getSourceAlertType());
        assertEquals(LocalDateTime.of(2026, 6, 10, 10, 30), insertedEvent.getSourceAlertTime());
        assertEquals("payload-hash-001", insertedEvent.getSourcePayloadHash());
        assertEquals("生命健康", insertedEvent.getEventType());
        assertEquals(SupervisionEventLevelEnum.L4.getCode(), insertedEvent.getEventLevel());
        assertEquals(SupervisionEventStatusEnum.CREATED.getCode(), insertedEvent.getEventStatus());
    }

    private static final class CapturingMapperHandler implements InvocationHandler {

        private long nextEventId = 1000L;
        private final Map<String, SupervisionEventDO> openEvents = new LinkedHashMap<>();
        private final List<String> lookupKeys = new ArrayList<>();
        private final List<SupervisionEventDO> insertedEvents = new ArrayList<>();

        private SupervisionEventMapper createProxy() {
            return (SupervisionEventMapper) Proxy.newProxyInstance(
                    SupervisionEventMapper.class.getClassLoader(),
                    new Class[]{SupervisionEventMapper.class},
                    this
            );
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if ("selectOpenBySourceAlert".equals(method.getName()) && args != null && args.length == 2) {
                String key = key((String) args[0], (String) args[1]);
                lookupKeys.add(key);
                return openEvents.get(key);
            }
            if ("insert".equals(method.getName()) && args != null && args.length == 1
                    && args[0] instanceof SupervisionEventDO eventDO) {
                eventDO.setId(++nextEventId);
                insertedEvents.add(eventDO);
                openEvents.put(key(eventDO.getSourceSystem(), eventDO.getSourceAlertId()), eventDO);
                return 1;
            }
            if (method.getDeclaringClass() == Object.class) {
                return method.invoke(this, args);
            }
            throw new UnsupportedOperationException(method.toString());
        }

        private List<String> lookupKeys() {
            return lookupKeys;
        }

        private List<SupervisionEventDO> insertedEvents() {
            return insertedEvents;
        }

        private String key(String sourceSystem, String sourceAlertId) {
            return sourceSystem + ":" + sourceAlertId;
        }

    }

}
