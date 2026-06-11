package com.basiclab.iot.system.controller.admin.supervision;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.system.controller.admin.supervision.vo.task.TaskAcceptReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.task.TaskOperationRespVO;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.OperationResponse;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.TaskAcceptRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

import static com.basiclab.iot.common.domain.CommonResult.success;

@Tag(name = "Admin - Supervision Task")
@RestController
@RequestMapping("/system/supervision/tasks")
@Validated
public class SupervisionTaskController {

    private final SupervisionWorkflowApplicationService supervisionWorkflowApplicationService;

    public SupervisionTaskController(SupervisionWorkflowApplicationService supervisionWorkflowApplicationService) {
        this.supervisionWorkflowApplicationService = supervisionWorkflowApplicationService;
    }

    @PostMapping("/accept")
    @Operation(summary = "Accept supervision task")
    public CommonResult<TaskOperationRespVO> acceptTask(@Valid @RequestBody TaskAcceptReqVO reqVO) {
        OperationResponse response = supervisionWorkflowApplicationService.acceptTask(new TaskAcceptRequest(
                reqVO.getTaskId(),
                reqVO.getAcceptedUserId()
        ));
        return success(TaskOperationRespVO.from(response));
    }

}
