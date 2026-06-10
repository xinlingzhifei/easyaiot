package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionTaskMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
public class SupervisionTaskAcceptanceService {

    private final SupervisionTaskMapper supervisionTaskMapper;

    public SupervisionTaskAcceptanceService(SupervisionTaskMapper supervisionTaskMapper) {
        this.supervisionTaskMapper = Objects.requireNonNull(supervisionTaskMapper, "supervisionTaskMapper");
    }

    public boolean acceptTask(Long taskId, Long acceptedUserId) {
        Objects.requireNonNull(taskId, "taskId");
        Objects.requireNonNull(acceptedUserId, "acceptedUserId");
        return supervisionTaskMapper.updateStatusToAcknowledged(taskId, acceptedUserId, LocalDateTime.now()) == 1;
    }

}
