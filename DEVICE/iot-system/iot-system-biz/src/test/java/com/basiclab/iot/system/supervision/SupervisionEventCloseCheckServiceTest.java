package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.enums.supervision.SupervisionCloseResultEnum;
import com.basiclab.iot.system.service.supervision.SupervisionEventCloseCheckService;
import com.basiclab.iot.system.service.supervision.SupervisionEventCloseCheckService.EventCloseStore;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionEventCloseCheckServiceTest {

    @Test
    void approveCloseCheckClosesEventAsConfirmedHandled() {
        CapturingEventCloseStore eventCloseStore = new CapturingEventCloseStore();
        SupervisionEventCloseCheckService service = new SupervisionEventCloseCheckService(eventCloseStore);

        boolean closed = service.approveCloseCheck(1001L);

        assertTrue(closed);
        assertEquals(List.of(new CloseCommand(1001L, SupervisionCloseResultEnum.CONFIRMED_HANDLED.getCode())),
                eventCloseStore.closeCommands());
    }

    @Test
    void rejectCloseCheckMarksEventReworkRequired() {
        CapturingEventCloseStore eventCloseStore = new CapturingEventCloseStore();
        SupervisionEventCloseCheckService service = new SupervisionEventCloseCheckService(eventCloseStore);

        boolean rejected = service.rejectCloseCheck(1001L);

        assertTrue(rejected);
        assertEquals(List.of(1001L), eventCloseStore.closeCheckReworkEventIds());
    }

    private record CloseCommand(Long eventId, String closeResult) {
    }

    private static final class CapturingEventCloseStore implements EventCloseStore {

        private final List<CloseCommand> closeCommands = new ArrayList<>();
        private final List<Long> closeCheckReworkEventIds = new ArrayList<>();

        @Override
        public boolean markClosed(Long eventId, String closeResult) {
            closeCommands.add(new CloseCommand(eventId, closeResult));
            return true;
        }

        @Override
        public boolean markCloseCheckReworkRequired(Long eventId) {
            closeCheckReworkEventIds.add(eventId);
            return true;
        }

        private List<CloseCommand> closeCommands() {
            return closeCommands;
        }

        private List<Long> closeCheckReworkEventIds() {
            return closeCheckReworkEventIds;
        }

    }

}
