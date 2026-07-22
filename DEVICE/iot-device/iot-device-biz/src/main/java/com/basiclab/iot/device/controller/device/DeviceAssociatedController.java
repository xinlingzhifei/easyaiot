package com.basiclab.iot.device.controller.device;

import com.basiclab.iot.common.domain.AjaxResult;
import com.basiclab.iot.common.domain.TableDataInfo;
import com.basiclab.iot.common.web.controller.BaseController;
import com.basiclab.iot.device.domain.device.vo.AssociateGatewayRequest;
import com.basiclab.iot.device.domain.device.vo.Device;
import com.basiclab.iot.device.service.device.DeviceAssociatedService;
import io.swagger.annotations.ApiOperation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.Collections;
import java.util.List;

@Tag(name = "关联子设备")
@RestController
@RequestMapping("/device/associated")
public class DeviceAssociatedController extends BaseController {

    @Resource
    private DeviceAssociatedService deviceAssociatedService;

    @ApiOperation("查询关联子设备列表（含网关拓扑合并）")
    @GetMapping("/list")
    public TableDataInfo list(@RequestParam("centerDeviceIdentification") String centerDeviceIdentification) {
        List<Device> list = deviceAssociatedService.listAssociatedDevices(centerDeviceIdentification);
        TableDataInfo rsp = new TableDataInfo();
        rsp.setCode(com.basiclab.iot.common.constant.HttpStatus.SUCCESS);
        rsp.setMsg("查询成功");
        rsp.setData(list == null ? Collections.emptyList() : list);
        rsp.setTotal(list == null ? 0 : list.size());
        return rsp;
    }

    @ApiOperation("查询可添加的任意已存在设备")
    @GetMapping("/candidates")
    public TableDataInfo candidates(
            @RequestParam("centerDeviceIdentification") String centerDeviceIdentification,
            @RequestParam(value = "deviceName", required = false) String deviceName) {
        List<Device> list = deviceAssociatedService.listCandidateDevices(centerDeviceIdentification, deviceName);
        if (list == null) {
            list = Collections.emptyList();
        }
        TableDataInfo rsp = new TableDataInfo();
        rsp.setCode(com.basiclab.iot.common.constant.HttpStatus.SUCCESS);
        rsp.setMsg("查询成功");
        // 简单内存分页
        com.basiclab.iot.common.domain.PageDomain page = com.basiclab.iot.common.domain.TableSupport.buildPageRequest();
        int pageNum = page.getPageNum() != null && page.getPageNum() > 0 ? page.getPageNum() : 1;
        int pageSize = page.getPageSize() != null && page.getPageSize() > 0 ? page.getPageSize() : 10;
        int from = Math.min((pageNum - 1) * pageSize, list.size());
        int to = Math.min(from + pageSize, list.size());
        rsp.setData(list.subList(from, to));
        rsp.setTotal(list.size());
        return rsp;
    }

    @ApiOperation("添加关联子设备（任意设备类型）")
    @PostMapping("/associate")
    public AjaxResult associate(@RequestBody AssociateGatewayRequest request) {
        try {
            int count = deviceAssociatedService.associateDevices(
                    request.getTargetDeviceIdentification(), request.getIdList());
            if (count == 0) {
                return AjaxResult.error("关联失败或设备已关联");
            }
            return AjaxResult.success("成功关联 " + count + " 台设备");
        } catch (Exception e) {
            return AjaxResult.error(e.getMessage());
        }
    }

    @ApiOperation("解绑关联子设备")
    @PostMapping("/disassociate")
    public AjaxResult disassociate(@RequestBody AssociateGatewayRequest request) {
        try {
            int count = deviceAssociatedService.disassociateDevices(
                    request.getTargetDeviceIdentification(), request.getIdList());
            return AjaxResult.success("成功解绑 " + count + " 台设备");
        } catch (Exception e) {
            return AjaxResult.error(e.getMessage());
        }
    }
}
