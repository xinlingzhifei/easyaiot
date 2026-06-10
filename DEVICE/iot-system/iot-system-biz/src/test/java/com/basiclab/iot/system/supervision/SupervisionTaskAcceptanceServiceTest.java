package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionTaskMapper;
import com.basiclab.iot.system.service.supervision.SupervisionTaskAcceptanceService;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionTaskAcceptanceServiceTest {

    @Test
    void acceptTaskMarksSentTaskAcknowledgedWithAcceptedUser() {
        CapturingTaskMapperHandler mapperHandler = new CapturingTaskMapperHandler(1);
        SupervisionTaskAcceptanceService service = new SupervisionTaskAcceptanceService(mapperHandler.createProxy());

        boolean accepted = service.acceptTask(2001L, 3001L);

        assertTrue(accepted);
        assertEquals(1, mapperHandler.acceptCommands().size());
        AcceptCommand command = mapperHandler.acceptCommands().get(0);
        assertEquals(2001L, command.taskId());
        assertEquals(3001L, command.acceptedUserId());
        assertNotNull(command.acceptedAt());
    }

    @Test
    void acceptTaskReturnsFalseWhenTaskIsNotSent() {
        CapturingTaskMapperHandler mapperHandler = new CapturingTaskMapperHandler(0);
        SupervisionTaskAcceptanceService service = new SupervisionTaskAcceptanceService(mapperHandler.createProxy());

        boolean accepted = service.acceptTask(2001L, 3001L);

        assertFalse(accepted);
        assertEquals(1, mapperHandler.acceptCommands().size());
    }

    private record AcceptCommand(Long taskId, Long acceptedUserId, LocalDateTime acceptedAt) {
    }

    private static final class CapturingTaskMapperHandler implements InvocationHandler {

        private final int updateResult;
        private final List<AcceptCommand> acceptCommands = new ArrayList<>();

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
            if ("updateStatusToAcknowledged".equals(method.getName()) && args != null && args.length == 3) {
                acceptCommands.add(new AcceptCommand((Long) args[0], (Long) args[1], (LocalDateTime) args[2]));
                return updateResult;
            }
            if (method.getDeclaringClass() == Object.class) {
                return method.invoke(this, args);
            }
            throw new UnsupportedOperationException(method.toString());
        }

        private List<AcceptCommand> acceptCommands() {
            return acceptCommands;
        }

    }

}
