package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionTaskDO;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionTaskMapper;
import com.basiclab.iot.system.service.supervision.SupervisionTaskReworkService;
import com.basiclab.iot.system.service.supervision.SupervisionTaskReworkService.EventReworkStore;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionTaskReworkServiceTest {

    @Test
    void restartReworkTaskReusesExistingTaskAndMarksEventAccepted() {
        CapturingTaskMapperHandler mapperHandler = new CapturingTaskMapperHandler(1);
        CapturingEventReworkStore eventReworkStore = new CapturingEventReworkStore();
        SupervisionTaskReworkService service = new SupervisionTaskReworkService(
                mapperHandler.createProxy(),
                eventReworkStore
        );

        boolean restarted = service.restartReworkTask(2001L, 3001L);

        assertTrue(restarted);
        assertEquals(List.of(2001L), mapperHandler.selectedTaskIds());
        assertEquals(1, mapperHandler.reworkCommands().size());
        ReworkCommand command = mapperHandler.reworkCommands().get(0);
        assertEquals(2001L, command.taskId());
        assertEquals(3001L, command.acceptedUserId());
        assertNotNull(command.acceptedAt());
        assertEquals(2, command.reworkCount());
        assertEquals(List.of(1001L), eventReworkStore.acceptedEventIds());
    }

    private record ReworkCommand(Long taskId, Long acceptedUserId, LocalDateTime acceptedAt, Integer reworkCount) {
    }

    private static final class CapturingTaskMapperHandler implements InvocationHandler {

        private final int updateResult;
        private final List<Long> selectedTaskIds = new ArrayList<>();
        private final List<ReworkCommand> reworkCommands = new ArrayList<>();

        private CapturingTaskMapperHandler(int updateResult) {
            this.updateResult = updateResult;
        }

        private SupervisionTaskMapper createProxy() {
            return (SupervisionTaskMapper) Proxy.newProxyInstance(
                    SupervisionTaskMapper.class.getClassLoader(),
                    new Class[]{SupervisionTaskMapper.class},
                    this
            );
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if ("selectById".equals(method.getName()) && args != null && args.length == 1) {
                selectedTaskIds.add((Long) args[0]);
                return new SupervisionTaskDO()
                        .setId((Long) args[0])
                        .setEventId(1001L)
                        .setReworkCount(1);
            }
            if ("updateStatusToAcknowledgedForRework".equals(method.getName()) && args != null && args.length == 4) {
                reworkCommands.add(new ReworkCommand(
                        (Long) args[0],
                        (Long) args[1],
                        (LocalDateTime) args[2],
                        (Integer) args[3]
                ));
                return updateResult;
            }
            if (method.getDeclaringClass() == Object.class) {
                return method.invoke(this, args);
            }
            throw new UnsupportedOperationException(method.toString());
        }

        private List<Long> selectedTaskIds() {
            return selectedTaskIds;
        }

        private List<ReworkCommand> reworkCommands() {
            return reworkCommands;
        }

    }

    private static final class CapturingEventReworkStore implements EventReworkStore {

        private final List<Long> acceptedEventIds = new ArrayList<>();

        @Override
        public void markReworkAccepted(Long eventId) {
            acceptedEventIds.add(eventId);
        }

        private List<Long> acceptedEventIds() {
            return acceptedEventIds;
        }

    }

}
