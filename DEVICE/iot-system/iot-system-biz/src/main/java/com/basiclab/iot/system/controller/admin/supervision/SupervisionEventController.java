package com.basiclab.iot.system.controller.admin.supervision;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.system.controller.admin.supervision.vo.event.AlertEventCreateReqVO;
import com.basiclab.iot.system.controller.admin.supervision.vo.event.AlertEventRespVO;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.AlertEventRequest;
import com.basiclab.iot.system.service.supervision.SupervisionWorkflowApplicationService.AlertEventResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

import static com.basiclab.iot.common.domain.CommonResult.success;

@Tag(name = "管理后台 - 监管事件")
@RestController
@RequestMapping("/system/supervision/events")
@Validated
public class SupervisionEventController {

    private final SupervisionWorkflowApplicationService supervisionWorkflowApplicationService;

    public SupervisionEventController(SupervisionWorkflowApplicationService supervisionWorkflowApplicationService) {
        this.supervisionWorkflowApplicationService = supervisionWorkflowApplicationService;
    }

    @PostMapping("/from-alert")
    @Operation(summary = "告警转监管事件")
    public CommonResult<AlertEventRespVO> createEventFromAlert(@Valid @RequestBody AlertEventCreateReqVO reqVO) {
        AlertEventResponse response = supervisionWorkflowApplicationService.createEventFromAlert(new AlertEventRequest(
                reqVO.getSourceSystem(),
                reqVO.getSourceAlertId(),
                reqVO.getRuleCode(),
                reqVO.getSourceAlertType(),
                reqVO.getSourceAlertTime(),
                reqVO.getSourcePayloadHash()
        ));
        return success(AlertEventRespVO.from(response));
    }

}
