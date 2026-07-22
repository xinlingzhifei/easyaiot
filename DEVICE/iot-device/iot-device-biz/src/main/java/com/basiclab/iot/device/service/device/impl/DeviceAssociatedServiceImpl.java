package com.basiclab.iot.device.service.device.impl;

import cn.hutool.core.util.StrUtil;
import com.basiclab.iot.common.core.context.TenantContextHolder;
import com.basiclab.iot.device.dal.pgsql.device.DeviceAssociatedLinkMapper;
import com.basiclab.iot.device.dal.pgsql.device.DeviceMapper;
import com.basiclab.iot.device.domain.device.vo.Device;
import com.basiclab.iot.device.domain.device.vo.DeviceAssociatedLink;
import com.basiclab.iot.device.service.device.DeviceAssociatedService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DeviceAssociatedServiceImpl implements DeviceAssociatedService {

    @Resource
    private DeviceAssociatedLinkMapper associatedLinkMapper;
    @Resource
    private DeviceMapper deviceMapper;

    @Override
    public List<Device> listAssociatedDevices(String centerDeviceIdentification) {
        if (StrUtil.isBlank(centerDeviceIdentification)) {
            return new ArrayList<>();
        }
        Map<String, Device> merged = new LinkedHashMap<>();

        // 1) 关联链路表（任意设备类型）
        List<DeviceAssociatedLink> links = associatedLinkMapper.selectByCenter(centerDeviceIdentification);
        if (links != null) {
            for (DeviceAssociatedLink link : links) {
                Device d = deviceMapper.selectDeviceById(link.getAssociatedDeviceId());
                if (d == null && StrUtil.isNotBlank(link.getAssociatedDeviceIdentification())) {
                    d = deviceMapper.findOneByDeviceIdentification(link.getAssociatedDeviceIdentification());
                }
                if (d != null) {
                    merged.put(d.getDeviceIdentification(), d);
                }
            }
        }

        // 2) 网关拓扑子设备（parent_identification），保持兼容
        Device center = deviceMapper.findOneByDeviceIdentification(centerDeviceIdentification);
        if (center != null && Device.deviceTypeEnum.GATEWAY.getType().equals(center.getDeviceType())) {
            Device query = new Device();
            query.setParentIdentification(centerDeviceIdentification);
            List<Device> gatewayChildren = deviceMapper.selectDeviceList(query);
            if (gatewayChildren != null) {
                for (Device child : gatewayChildren) {
                    merged.putIfAbsent(child.getDeviceIdentification(), child);
                }
            }
        }

        return new ArrayList<>(merged.values());
    }

    @Override
    public List<Device> listCandidateDevices(String centerDeviceIdentification, String deviceName) {
        Device query = new Device();
        if (StrUtil.isNotBlank(deviceName)) {
            query.setDeviceName(deviceName);
        }
        List<Device> all = deviceMapper.selectDeviceList(query);
        if (all == null || all.isEmpty()) {
            return new ArrayList<>();
        }
        Set<String> associatedIds = listAssociatedDevices(centerDeviceIdentification).stream()
                .map(Device::getDeviceIdentification)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        associatedIds.add(centerDeviceIdentification);

        return all.stream()
                .filter(d -> d.getDeviceIdentification() != null
                        && !associatedIds.contains(d.getDeviceIdentification()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int associateDevices(String centerDeviceIdentification, List<Long> deviceIds) {
        if (StrUtil.isBlank(centerDeviceIdentification) || deviceIds == null || deviceIds.isEmpty()) {
            throw new RuntimeException("关联参数不能为空");
        }
        Device center = deviceMapper.findOneByDeviceIdentification(centerDeviceIdentification);
        if (center == null) {
            throw new RuntimeException("中心设备不存在");
        }
        int success = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Long id : deviceIds) {
            Device target = deviceMapper.selectDeviceById(id);
            if (target == null) {
                continue;
            }
            if (centerDeviceIdentification.equals(target.getDeviceIdentification())) {
                continue;
            }
            boolean exists = associatedLinkMapper.selectByCenter(centerDeviceIdentification).stream()
                    .anyMatch(l -> Objects.equals(l.getAssociatedDeviceId(), id)
                            || target.getDeviceIdentification().equals(l.getAssociatedDeviceIdentification()));
            if (exists) {
                continue;
            }
            Long tenantId = TenantContextHolder.getTenantId();
            if (tenantId == null && center.getTenantId() != null) {
                tenantId = center.getTenantId();
            }
            DeviceAssociatedLink link = DeviceAssociatedLink.builder()
                    .centerDeviceIdentification(centerDeviceIdentification)
                    .associatedDeviceId(target.getId())
                    .associatedDeviceIdentification(target.getDeviceIdentification())
                    .sortOrder(0)
                    .tenantId(tenantId)
                    .createTime(now)
                    .updateTime(now)
                    .build();
            associatedLinkMapper.insert(link);

            // 网关中心 + 原子设备类型：同步写入 parent_identification，保持上行拓扑
            if (Device.deviceTypeEnum.GATEWAY.getType().equals(center.getDeviceType())
                    && Device.deviceTypeEnum.SUBSET.getType().equals(target.getDeviceType())
                    && StrUtil.isBlank(target.getParentIdentification())) {
                target.setParentIdentification(centerDeviceIdentification);
                target.setUpdateTime(now);
                deviceMapper.updateDevice(target);
            }
            success++;
        }
        return success;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int disassociateDevices(String centerDeviceIdentification, List<Long> deviceIds) {
        if (StrUtil.isBlank(centerDeviceIdentification) || deviceIds == null || deviceIds.isEmpty()) {
            throw new RuntimeException("解绑参数不能为空");
        }
        int deleted = associatedLinkMapper.deleteByCenterAndAssociatedIds(centerDeviceIdentification, deviceIds);

        Device center = deviceMapper.findOneByDeviceIdentification(centerDeviceIdentification);
        if (center != null && Device.deviceTypeEnum.GATEWAY.getType().equals(center.getDeviceType())) {
            for (Long id : deviceIds) {
                Device sub = deviceMapper.selectDeviceById(id);
                if (sub != null && centerDeviceIdentification.equals(sub.getParentIdentification())) {
                    sub.setParentIdentification(null);
                    sub.setUpdateTime(LocalDateTime.now());
                    deviceMapper.updateDevice(sub);
                    deleted++;
                }
            }
        }
        return deleted;
    }
}
