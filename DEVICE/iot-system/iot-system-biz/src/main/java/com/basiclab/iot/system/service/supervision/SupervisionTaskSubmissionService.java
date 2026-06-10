package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionTaskMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
public class SupervisionTaskSubmissionService {

    private final SupervisionTaskMapper supervisionTaskMapper;

    public SupervisionTaskSubmissionService(SupervisionTaskMapper supervisionTaskMapper) {
        this.supervisionTaskMapper = Objects.requireNonNull(supervisionTaskMapper, "supervisionTaskMapper");
    }

    public boolean submitTask(Long taskId, String resultCategory, String handlingNote) {
        Objects.requireNonNull(taskId, "taskId");
        Objects.requireNonNull(resultCategory, "resultCategory");
        Objects.requireNonNull(handlingNote, "handlingNote");
        return supervisionTaskMapper.updateStatusToSubmitted(
                taskId,
                resultCategory,
                handlingNote,
                LocalDateTime.now()
        ) == 1;
    }

}
