package com.basiclab.iot.device.controller.product;

import cn.hutool.core.util.StrUtil;
import com.basiclab.iot.common.domain.AjaxResult;
import com.basiclab.iot.device.domain.device.vo.ProductEvent;
import com.basiclab.iot.device.domain.device.vo.ProductProperties;
import com.basiclab.iot.device.domain.device.vo.ProductServices;
import com.basiclab.iot.device.service.product.ProductEventService;
import com.basiclab.iot.device.service.product.ProductPropertiesService;
import com.basiclab.iot.device.service.product.ProductServicesService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 产品物模型聚合接口：标识校验、发布、TSL 查询。
 * <p>
 * 工业协议（Modbus/OPC UA）同样依赖属性物模型（propertyCode ↔ 点位 identifier）。
 */
@RestController
@RequestMapping("/thingModel")
public class ThingModelController {

    @Resource
    private ProductPropertiesService productPropertiesService;
    @Resource
    private ProductServicesService productServicesService;
    @Resource
    private ProductEventService productEventService;

    /**
     * 校验属性/服务/事件标识是否重复。
     * 前端约定：{@code status=true} 表示重复（校验失败），{@code status=false} 表示可用。
     */
    @PostMapping("/check")
    public AjaxResult check(@RequestBody Map<String, Object> body) {
        String productIdentification = stringValue(body.get("productIdentification"));
        String propertyCode = firstNonBlank(
                stringValue(body.get("propertyCode")),
                stringValue(body.get("serviceCode")),
                stringValue(body.get("eventCode")),
                stringValue(body.get("identifier")));
        Long id = parseLong(body.get("id"));

        if (StrUtil.isBlank(productIdentification) || StrUtil.isBlank(propertyCode)) {
            Map<String, Object> result = new HashMap<>(2);
            result.put("status", false);
            return AjaxResult.success(result);
        }

        boolean duplicated = isPropertyDuplicated(productIdentification, propertyCode, id)
                || isServiceDuplicated(productIdentification, propertyCode, id)
                || isEventDuplicated(productIdentification, propertyCode, id);

        Map<String, Object> result = new HashMap<>(2);
        result.put("status", duplicated);
        return AjaxResult.success(result);
    }

    /**
     * 发布物模型（当前属性/服务/事件已直接落库，发布作为确认动作）。
     */
    @PutMapping({"", "/", "/{productIdentification}"})
    public AjaxResult release(@PathVariable(value = "productIdentification", required = false) String pathId,
                              @RequestBody(required = false) Map<String, Object> body) {
        String productIdentification = StrUtil.blankToDefault(pathId,
                body != null ? stringValue(body.get("productIdentification")) : null);
        if (StrUtil.isBlank(productIdentification)) {
            return AjaxResult.error("产品标识不能为空");
        }
        return AjaxResult.success("发布成功");
    }

    /**
     * 查询完整物模型（属性 / 服务 / 事件）。
     */
    @GetMapping("/{productIdentification}")
    public AjaxResult detail(@PathVariable("productIdentification") String productIdentification) {
        if (StrUtil.isBlank(productIdentification)) {
            return AjaxResult.error("产品标识不能为空");
        }
        ProductProperties propertyQuery = new ProductProperties();
        propertyQuery.setProductIdentification(productIdentification);
        ProductServices serviceQuery = new ProductServices();
        serviceQuery.setProductIdentification(productIdentification);
        ProductEvent eventQuery = new ProductEvent();
        eventQuery.setProductIdentification(productIdentification);

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("productIdentification", productIdentification);
        model.put("properties", productPropertiesService.selectProductPropertiesList(propertyQuery));
        model.put("services", productServicesService.selectProductServicesList(serviceQuery));
        model.put("events", productEventService.selectList(eventQuery));
        return AjaxResult.success(model);
    }

    private boolean isPropertyDuplicated(String productIdentification, String code, Long excludeId) {
        ProductProperties query = new ProductProperties();
        query.setProductIdentification(productIdentification);
        query.setPropertyCode(code);
        List<ProductProperties> list = productPropertiesService.selectProductPropertiesList(query);
        return list != null && list.stream().anyMatch(item ->
                item != null && !excludeIdEquals(item.getId(), excludeId)
                        && code.equalsIgnoreCase(item.getPropertyCode()));
    }

    private boolean isServiceDuplicated(String productIdentification, String code, Long excludeId) {
        ProductServices query = new ProductServices();
        query.setProductIdentification(productIdentification);
        query.setServiceCode(code);
        List<ProductServices> list = productServicesService.selectProductServicesList(query);
        return list != null && list.stream().anyMatch(item ->
                item != null && !excludeIdEquals(item.getId(), excludeId)
                        && code.equalsIgnoreCase(item.getServiceCode()));
    }

    private boolean isEventDuplicated(String productIdentification, String code, Long excludeId) {
        ProductEvent query = new ProductEvent();
        query.setProductIdentification(productIdentification);
        query.setEventCode(code);
        List<ProductEvent> list = productEventService.selectList(query);
        return list != null && list.stream().anyMatch(item ->
                item != null && !excludeIdEquals(item.getId(), excludeId)
                        && code.equalsIgnoreCase(item.getEventCode()));
    }

    private static boolean excludeIdEquals(Long actual, Long excludeId) {
        return excludeId != null && actual != null && excludeId.equals(actual);
    }

    private static Long parseLong(Object value) {
        if (value == null || "".equals(value)) {
            return null;
        }
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StrUtil.isNotBlank(value)) {
                return value;
            }
        }
        return null;
    }
}
