package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionTaskMapper;
import com.basiclab.iot.system.service.supervision.SupervisionTaskSubmissionService;
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

class SupervisionTaskSubmissionServiceTest {

    @Test
    void submitTaskMarksAcknowledgedTaskSubmittedWithResultAndNote() {
        CapturingTaskMapperHandler mapperHandler = new CapturingTaskMapperHandler(1);
        SupervisionTaskSubmissionService service = new SupervisionTaskSubmissionService(mapperHandler.createProxy());

        boolean submitted = service.submitTask(2001L, "normal", "现场处置完成");

        assertTrue(submitted);
        assertEquals(1, mapperHandler.submitCommands().size());
        SubmitCommand command = mapperHandler.submitCommands().get(0);
        assertEquals(2001L, command.taskId());
        assertEquals("normal", command.resultCategory());
        assertEquals("现场处置完成", command.handlingNote());
        assertNotNull(command.submittedAt());
    }

    @Test
    void submitTaskReturnsFalseWhenTaskIsNotAcknowledged() {
        CapturingTaskMapperHandler mapperHandler = new CapturingTaskMapperHandler(0);
        SupervisionTaskSubmissionService service = new SupervisionTaskSubmissionService(mapperHandler.createProxy());

        boolean submitted = service.submitTask(2001L, "normal", "现场处置完成");

        assertFalse(submitted);
        assertEquals(1, mapperHandler.submitCommands().size());
    }

    private record SubmitCommand(Long taskId, String resultCategory, String handlingNote, LocalDateTime submittedAt) {
    }

    private static final class CapturingTaskMapperHandler implements InvocationHandler {

        private final int updateResult;
        private final List<SubmitCommand> submitCommands = new ArrayList<>();

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
            if ("updateStatusToSubmitted".equals(method.getName()) && args != null && args.length == 4) {
                submitCommands.add(new SubmitCommand(
                        (Long) args[0],
                        (String) args[1],
                        (String) args[2],
                        (LocalDateTime) args[3]
                ));
                return updateResult;
            }
            if (method.getDeclaringClass() == Object.class) {
                return method.invoke(this, args);
            }
            throw new UnsupportedOperationException(method.toString());
        }

        private List<SubmitCommand> submitCommands() {
            return submitCommands;
        }

    }

}
