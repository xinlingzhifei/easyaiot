package com.basiclab.iot.node.controller;

import com.basiclab.iot.common.core.aop.TenantIgnore;
import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.common.domain.PageResult;
import com.basiclab.iot.node.domain.vo.EdgeEnrollReqVO;
import com.basiclab.iot.node.domain.vo.EdgeEnrollRespVO;
import com.basiclab.iot.node.domain.vo.EdgeNodePageReqVO;
import com.basiclab.iot.node.domain.vo.EdgeNodeRespVO;
import com.basiclab.iot.node.domain.vo.EdgeNodeUpdateReqVO;
import com.basiclab.iot.node.domain.vo.EdgeRuntimeConfigReqVO;
import com.basiclab.iot.node.domain.vo.EdgeRuntimeConfigRespVO;
import com.basiclab.iot.node.service.EdgeNodeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.validation.Valid;

import static com.basiclab.iot.common.domain.CommonResult.success;

@Tag(name = "EDGE - 边缘算法运行时 / 边缘节点管理")
@RestController
@RequestMapping("/node/edge")
@Validated
@Slf4j
public class EdgeNodeController {

    @Resource
    private EdgeNodeService edgeNodeService;

    @PostMapping("/enroll")
    @Operation(summary = "EDGE 自助纳管（仅需 NODE 地址 + 可选 joinToken）")
    @TenantIgnore
    public CommonResult<EdgeEnrollRespVO> enroll(@Valid @RequestBody EdgeEnrollReqVO reqVO) {
        return success(edgeNodeService.enroll(reqVO));
    }

    @PostMapping("/runtime-config")
    @Operation(summary = "EDGE 拉取动态运行时配置（MQTT/路径等）")
    @TenantIgnore
    public CommonResult<EdgeRuntimeConfigRespVO> runtimeConfig(@Valid @RequestBody EdgeRuntimeConfigReqVO reqVO) {
        return success(edgeNodeService.runtimeConfig(reqVO));
    }

    @GetMapping("/page")
    @Operation(summary = "边缘节点分页（统一管理）")
    public CommonResult<PageResult<EdgeNodeRespVO>> page(@Valid EdgeNodePageReqVO reqVO) {
        return success(edgeNodeService.getEdgeNodePage(reqVO));
    }

    @GetMapping("/get")
    @Operation(summary = "边缘节点详情")
    @Parameter(name = "id", description = "edge_node.id", required = true)
    public CommonResult<EdgeNodeRespVO> get(@RequestParam("id") Long id) {
        return success(edgeNodeService.getEdgeNode(id));
    }

    @PutMapping("/update")
    @Operation(summary = "更新边缘节点（名称/启用/任务上限等）")
    public CommonResult<Boolean> update(@Valid @RequestBody EdgeNodeUpdateReqVO reqVO) {
        edgeNodeService.updateEdgeNode(reqVO);
        return success(true);
    }

    @DeleteMapping("/delete")
    @Operation(summary = "删除边缘节点管理记录")
    @Parameter(name = "id", description = "edge_node.id", required = true)
    public CommonResult<Boolean> delete(@RequestParam("id") Long id) {
        edgeNodeService.deleteEdgeNode(id);
        return success(true);
    }

}
