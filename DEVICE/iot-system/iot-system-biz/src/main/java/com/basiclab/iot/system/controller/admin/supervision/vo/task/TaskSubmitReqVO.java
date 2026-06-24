package com.basiclab.iot.system.controller.admin.supervision.vo.task;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "Admin - supervision task submit request")
@Data
public class TaskSubmitReqVO {

    @Schema(description = "Task ID", example = "2001")
    private Long taskId;

    @Schema(description = "Handling result category", example = "confirmed_violation")
    private String resultCategory;

    @Schema(description = "Handling note", example = "Handled according to SOP")
    private String handlingNote;

}
