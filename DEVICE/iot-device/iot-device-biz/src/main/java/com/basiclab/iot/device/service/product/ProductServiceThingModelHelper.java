package com.basiclab.iot.device.service.product;

import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSONObject;
import com.basiclab.iot.common.utils.SecurityUtils;
import com.basiclab.iot.device.domain.device.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 物模型服务：一服务一默认命令，同步入参/出参到 commands 表链。
 */
@Service
@RequiredArgsConstructor
public class ProductServiceThingModelHelper {

    private final ProductServicesService productServicesService;
    private final ProductCommandsService productCommandsService;
    private final ProductCommandsRequestsService productCommandsRequestsService;
    private final ProductCommandsResponseService productCommandsResponseService;

    public ProductServiceDetailVO getDetail(Long serviceId) {
        ProductServices service = productServicesService.selectProductServicesById(serviceId);
        if (service == null) {
            return null;
        }
        ProductCommands command = findDefaultCommand(serviceId, service.getServiceCode());
        List<ProductServiceParamVO> inputs = Collections.emptyList();
        List<ProductServiceParamVO> outputs = Collections.emptyList();
        if (command != null && command.getId() != null) {
            ProductCommandsRequests reqQuery = new ProductCommandsRequests();
            reqQuery.setCommandsId(command.getId());
            List<ProductCommandsRequests> reqs =
                    productCommandsRequestsService.selectProductCommandsRequestsList(reqQuery);
            inputs = reqs == null ? Collections.emptyList()
                    : reqs.stream().map(this::fromRequest).collect(Collectors.toList());

            ProductCommandsResponse respQuery = new ProductCommandsResponse();
            respQuery.setCommandsId(command.getId());
            List<ProductCommandsResponse> resps =
                    productCommandsResponseService.selectProductCommandsResponseList(respQuery);
            outputs = resps == null ? Collections.emptyList()
                    : resps.stream().map(this::fromResponse).collect(Collectors.toList());
        }
        return ProductServiceDetailVO.builder()
                .id(service.getId())
                .serviceCode(service.getServiceCode())
                .serviceName(service.getServiceName())
                .productIdentification(service.getProductIdentification())
                .templateIdentification(service.getTemplateIdentification())
                .status(service.getStatus())
                .description(service.getDescription())
                .commandId(command != null ? command.getId() : null)
                .inputParams(new ArrayList<>(inputs))
                .outParams(new ArrayList<>(outputs))
                .build();
    }

    @Transactional(rollbackFor = Exception.class)
    public ProductServiceDetailVO saveWithParams(ProductServiceDetailVO detail) {
        if (detail == null || StrUtil.isBlank(detail.getServiceCode())) {
            throw new IllegalArgumentException("服务标识不能为空");
        }
        if (StrUtil.isBlank(detail.getServiceName())) {
            throw new IllegalArgumentException("服务名称不能为空");
        }
        if (StrUtil.isBlank(detail.getProductIdentification())) {
            throw new IllegalArgumentException("产品标识不能为空");
        }

        ProductServices entity = ProductServices.builder()
                .id(detail.getId())
                .serviceCode(detail.getServiceCode().trim())
                .serviceName(detail.getServiceName().trim())
                .productIdentification(detail.getProductIdentification())
                .templateIdentification(detail.getTemplateIdentification())
                .status(StrUtil.blankToDefault(detail.getStatus(), "0"))
                .description(detail.getDescription())
                .build();

        String username = SecurityUtils.getUsername();
        if (entity.getId() == null) {
            entity.setCreateBy(username);
            productServicesService.insertProductServices(entity);
        } else {
            entity.setUpdateBy(username);
            productServicesService.updateProductServices(entity);
        }
        if (entity.getId() == null) {
            throw new IllegalStateException("保存服务失败，未获得服务ID");
        }

        ProductCommands command = ensureDefaultCommand(entity);
        replaceRequests(entity.getId(), command.getId(), detail.getInputParams());
        replaceResponses(entity.getId(), command.getId(), detail.getOutParams());
        return getDetail(entity.getId());
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteCascade(Long[] serviceIds) {
        if (serviceIds == null || serviceIds.length == 0) {
            return;
        }
        for (Long serviceId : serviceIds) {
            if (serviceId == null) {
                continue;
            }
            ProductCommands query = new ProductCommands();
            query.setServiceId(serviceId);
            List<ProductCommands> commands = productCommandsService.selectProductCommandsList(query);
            if (commands != null) {
                for (ProductCommands cmd : commands) {
                    clearParamsOfCommand(cmd.getId());
                }
                Long[] cmdIds = commands.stream()
                        .map(ProductCommands::getId)
                        .filter(Objects::nonNull)
                        .toArray(Long[]::new);
                if (cmdIds.length > 0) {
                    productCommandsService.deleteProductCommandsByIds(cmdIds);
                }
            }
        }
        productServicesService.deleteProductServicesByIds(serviceIds);
    }

    private void clearParamsOfCommand(Long commandId) {
        if (commandId == null) {
            return;
        }
        ProductCommandsRequests reqQuery = new ProductCommandsRequests();
        reqQuery.setCommandsId(commandId);
        List<ProductCommandsRequests> reqs =
                productCommandsRequestsService.selectProductCommandsRequestsList(reqQuery);
        if (reqs != null && !reqs.isEmpty()) {
            Long[] ids = reqs.stream().map(ProductCommandsRequests::getId).filter(Objects::nonNull)
                    .toArray(Long[]::new);
            if (ids.length > 0) {
                productCommandsRequestsService.deleteProductCommandsRequestsByIds(ids);
            }
        }
        ProductCommandsResponse respQuery = new ProductCommandsResponse();
        respQuery.setCommandsId(commandId);
        List<ProductCommandsResponse> resps =
                productCommandsResponseService.selectProductCommandsResponseList(respQuery);
        if (resps != null && !resps.isEmpty()) {
            Long[] ids = resps.stream().map(ProductCommandsResponse::getId).filter(Objects::nonNull)
                    .toArray(Long[]::new);
            if (ids.length > 0) {
                productCommandsResponseService.deleteProductCommandsResponseByIds(ids);
            }
        }
    }

    private ProductCommands findDefaultCommand(Long serviceId, String serviceCode) {
        ProductCommands query = new ProductCommands();
        query.setServiceId(serviceId);
        List<ProductCommands> list = productCommandsService.selectProductCommandsList(query);
        if (list == null || list.isEmpty()) {
            return null;
        }
        return list.stream()
                .filter(c -> StrUtil.equals(serviceCode, c.getCommandCode()))
                .findFirst()
                .orElse(list.get(0));
    }

    private ProductCommands ensureDefaultCommand(ProductServices service) {
        ProductCommands existing = findDefaultCommand(service.getId(), service.getServiceCode());
        if (existing != null) {
            existing.setName(service.getServiceName());
            existing.setCommandCode(service.getServiceCode());
            existing.setDescription(service.getDescription());
            productCommandsService.updateProductCommands(existing);
            return existing;
        }
        ProductCommands created = ProductCommands.builder()
                .serviceId(service.getId())
                .commandCode(service.getServiceCode())
                .name(service.getServiceName())
                .description(service.getDescription())
                .build();
        productCommandsService.insertProductCommands(created);
        return created;
    }

    private void replaceRequests(Long serviceId, Long commandId, List<ProductServiceParamVO> params) {
        clearParamsOfCommandRequestsOnly(commandId);
        if (params == null) {
            return;
        }
        for (ProductServiceParamVO p : params) {
            ProductCommandsRequests row = toRequest(serviceId, commandId, p);
            if (row != null) {
                productCommandsRequestsService.insertProductCommandsRequests(row);
            }
        }
    }

    private void replaceResponses(Long serviceId, Long commandId, List<ProductServiceParamVO> params) {
        clearParamsOfCommandResponsesOnly(commandId);
        if (params == null) {
            return;
        }
        for (ProductServiceParamVO p : params) {
            ProductCommandsResponse row = toResponse(serviceId, commandId, p);
            if (row != null) {
                productCommandsResponseService.insertProductCommandsResponse(row);
            }
        }
    }

    private void clearParamsOfCommandRequestsOnly(Long commandId) {
        ProductCommandsRequests reqQuery = new ProductCommandsRequests();
        reqQuery.setCommandsId(commandId);
        List<ProductCommandsRequests> reqs =
                productCommandsRequestsService.selectProductCommandsRequestsList(reqQuery);
        if (reqs != null && !reqs.isEmpty()) {
            Long[] ids = reqs.stream().map(ProductCommandsRequests::getId).filter(Objects::nonNull)
                    .toArray(Long[]::new);
            if (ids.length > 0) {
                productCommandsRequestsService.deleteProductCommandsRequestsByIds(ids);
            }
        }
    }

    private void clearParamsOfCommandResponsesOnly(Long commandId) {
        ProductCommandsResponse respQuery = new ProductCommandsResponse();
        respQuery.setCommandsId(commandId);
        List<ProductCommandsResponse> resps =
                productCommandsResponseService.selectProductCommandsResponseList(respQuery);
        if (resps != null && !resps.isEmpty()) {
            Long[] ids = resps.stream().map(ProductCommandsResponse::getId).filter(Objects::nonNull)
                    .toArray(Long[]::new);
            if (ids.length > 0) {
                productCommandsResponseService.deleteProductCommandsResponseByIds(ids);
            }
        }
    }

    private ProductCommandsRequests toRequest(Long serviceId, Long commandId, ProductServiceParamVO p) {
        String code = firstNonBlank(p.getParameterCode(), p.getPropertyCode());
        String name = firstNonBlank(p.getParameterName(), p.getPropertyName(), code);
        if (StrUtil.isBlank(code)) {
            return null;
        }
        return ProductCommandsRequests.builder()
                .serviceId(serviceId)
                .commandsId(commandId)
                .parameterCode(code.trim())
                .parameterName(name)
                .datatype(normalizeDatatype(p.getDatatype()))
                .min(p.getMin())
                .max(p.getMax())
                .step(p.getStep())
                .maxlength(p.getMaxlength())
                .unit(p.getUnit())
                .enumlist(resolveEnumlist(p))
                .required(p.getRequired() != null ? p.getRequired() : 0)
                .parameterDescription(firstNonBlank(p.getParameterDescription(), p.getDescription()))
                .build();
    }

    private ProductCommandsResponse toResponse(Long serviceId, Long commandId, ProductServiceParamVO p) {
        String code = firstNonBlank(p.getParameterCode(), p.getPropertyCode());
        String name = firstNonBlank(p.getParameterName(), p.getPropertyName(), code);
        if (StrUtil.isBlank(code)) {
            return null;
        }
        return ProductCommandsResponse.builder()
                .serviceId(serviceId)
                .commandsId(commandId)
                .parameterCode(code.trim())
                .parameterName(name)
                .datatype(normalizeDatatype(p.getDatatype()))
                .min(p.getMin())
                .max(p.getMax())
                .step(p.getStep())
                .maxlength(p.getMaxlength())
                .unit(p.getUnit())
                .enumlist(resolveEnumlist(p))
                .required(p.getRequired() != null ? p.getRequired() : 0)
                .parameterDescription(firstNonBlank(p.getParameterDescription(), p.getDescription()))
                .build();
    }

    private ProductServiceParamVO fromRequest(ProductCommandsRequests r) {
        ProductServiceParamVO vo = ProductServiceParamVO.builder()
                .id(r.getId())
                .parameterCode(r.getParameterCode())
                .parameterName(r.getParameterName())
                .propertyCode(r.getParameterCode())
                .propertyName(r.getParameterName())
                .datatype(r.getDatatype())
                .min(r.getMin())
                .max(r.getMax())
                .step(r.getStep())
                .maxlength(r.getMaxlength())
                .unit(r.getUnit())
                .enumlist(r.getEnumlist())
                .required(r.getRequired())
                .description(r.getParameterDescription())
                .parameterDescription(r.getParameterDescription())
                .build();
        fillBoolLabels(vo);
        return vo;
    }

    private ProductServiceParamVO fromResponse(ProductCommandsResponse r) {
        ProductServiceParamVO vo = ProductServiceParamVO.builder()
                .id(r.getId())
                .parameterCode(r.getParameterCode())
                .parameterName(r.getParameterName())
                .propertyCode(r.getParameterCode())
                .propertyName(r.getParameterName())
                .datatype(r.getDatatype())
                .min(r.getMin())
                .max(r.getMax())
                .step(r.getStep())
                .maxlength(r.getMaxlength())
                .unit(r.getUnit())
                .enumlist(r.getEnumlist())
                .required(r.getRequired())
                .description(r.getParameterDescription())
                .parameterDescription(r.getParameterDescription())
                .build();
        fillBoolLabels(vo);
        return vo;
    }

    private void fillBoolLabels(ProductServiceParamVO vo) {
        if (vo.getEnumlist() == null || StrUtil.isBlank(vo.getEnumlist())) {
            return;
        }
        try {
            JSONObject obj = JSONObject.parseObject(vo.getEnumlist());
            if (obj != null) {
                if (obj.containsKey("0")) {
                    vo.setBoolClose(String.valueOf(obj.get("0")));
                }
                if (obj.containsKey("1")) {
                    vo.setBoolOpen(String.valueOf(obj.get("1")));
                }
            }
        } catch (Exception ignored) {
            // ignore
        }
    }

    private String resolveEnumlist(ProductServiceParamVO p) {
        if (StrUtil.isNotBlank(p.getEnumlist())) {
            return p.getEnumlist();
        }
        String dt = StrUtil.blankToDefault(p.getDatatype(), "").toUpperCase();
        if ("BOOL".equals(dt) || "BOOLEAN".equals(dt)) {
            JSONObject obj = new JSONObject();
            obj.put("0", StrUtil.blankToDefault(p.getBoolClose(), "关"));
            obj.put("1", StrUtil.blankToDefault(p.getBoolOpen(), "开"));
            return obj.toJSONString();
        }
        return null;
    }

    private String normalizeDatatype(String datatype) {
        if (StrUtil.isBlank(datatype)) {
            return "TEXT";
        }
        return datatype.trim().toUpperCase();
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (StrUtil.isNotBlank(v)) {
                return v;
            }
        }
        return null;
    }
}
