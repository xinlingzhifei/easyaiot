package com.basiclab.iot.device.controller.device;

import com.basiclab.iot.common.domain.AjaxResult;
import com.basiclab.iot.common.domain.R;
import com.basiclab.iot.common.web.controller.BaseController;
import com.basiclab.iot.device.domain.device.vo.DeviceAlarmStrategy;
import com.basiclab.iot.device.domain.device.vo.DeviceHealthScoreVO;
import com.basiclab.iot.device.domain.device.vo.DevicePropertyThreshold;
import com.basiclab.iot.device.domain.device.vo.DeviceThresholdAlarm;
import com.basiclab.iot.device.domain.device.vo.PropertyPredictRequest;
import com.basiclab.iot.device.domain.device.vo.PropertyPredictResultVO;
import com.basiclab.iot.device.domain.device.vo.PropertyThresholdEvaluateParam;
import com.basiclab.iot.device.service.device.DeviceThresholdAlarmService;
import io.swagger.annotations.ApiOperation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.List;

@Tag(name = "设备阈值与告警策略")
@RestController
@RequestMapping("/device/threshold")
public class DeviceThresholdController extends BaseController {

    @Resource
    private DeviceThresholdAlarmService thresholdAlarmService;

    @ApiOperation("查询设备属性阈值列表")
    @GetMapping("/list")
    public AjaxResult list(@RequestParam("deviceIdentification") String deviceIdentification) {
        return AjaxResult.success(thresholdAlarmService.listThresholds(deviceIdentification));
    }

    @ApiOperation("查询单个属性阈值")
    @GetMapping("/get")
    public AjaxResult get(@RequestParam("deviceIdentification") String deviceIdentification,
                          @RequestParam("propertyCode") String propertyCode) {
        return AjaxResult.success(thresholdAlarmService.getThreshold(deviceIdentification, propertyCode));
    }

    @ApiOperation("保存属性阈值")
    @PostMapping("/save")
    public AjaxResult save(@RequestBody DevicePropertyThreshold threshold) {
        return AjaxResult.success(thresholdAlarmService.saveThreshold(threshold));
    }

    @ApiOperation("删除属性阈值")
    @DeleteMapping("/{id}")
    public AjaxResult delete(@PathVariable("id") Long id) {
        return toAjax(thresholdAlarmService.deleteThreshold(id));
    }

    @ApiOperation("获取设备告警策略")
    @GetMapping("/strategy")
    public AjaxResult getStrategy(@RequestParam("deviceIdentification") String deviceIdentification) {
        return AjaxResult.success(thresholdAlarmService.getStrategy(deviceIdentification));
    }

    @ApiOperation("保存设备告警策略")
    @PostMapping("/strategy/save")
    public AjaxResult saveStrategy(@RequestBody DeviceAlarmStrategy strategy) {
        return AjaxResult.success(thresholdAlarmService.saveStrategy(strategy));
    }

    @ApiOperation("属性上报阈值评估（供 sink Feign 调用）")
    @PostMapping("/evaluate")
    public R<Integer> evaluate(@RequestBody PropertyThresholdEvaluateParam param) {
        try {
            return R.ok(thresholdAlarmService.evaluateAndAlarm(param));
        } catch (Exception e) {
            return R.fail(e.getMessage());
        }
    }

    @ApiOperation("未恢复阈值告警列表")
    @GetMapping("/alarms/open")
    public AjaxResult openAlarms(@RequestParam("deviceIdentification") String deviceIdentification) {
        List<DeviceThresholdAlarm> list = thresholdAlarmService.listOpenAlarms(deviceIdentification);
        return AjaxResult.success(list);
    }

    @ApiOperation("设备健康评分")
    @GetMapping("/health")
    public AjaxResult health(@RequestParam("deviceIdentification") String deviceIdentification,
                             @RequestParam(value = "includeAssociated", defaultValue = "true") boolean includeAssociated) {
        DeviceHealthScoreVO vo = thresholdAlarmService.calcHealthScore(deviceIdentification, includeAssociated);
        return AjaxResult.success(vo);
    }

    @ApiOperation("属性预测诊断")
    @PostMapping("/predict")
    public AjaxResult predict(@RequestBody PropertyPredictRequest request) {
        PropertyPredictResultVO vo = thresholdAlarmService.predict(request);
        return AjaxResult.success(vo);
    }
}
