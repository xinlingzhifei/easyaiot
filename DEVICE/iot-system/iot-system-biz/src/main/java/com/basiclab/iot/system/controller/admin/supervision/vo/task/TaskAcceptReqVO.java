package com.basiclab.iot.system.controller.admin.supervision.vo.task;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "Admin - supervision task accept request")
@Data
public class TaskAcceptReqVO {

    @Schema(description = "Task ID", example = "2001")
    private Long taskId;

    @Schema(description = "Accepted user ID", example = "3001")
    private Long acceptedUserId;

}
