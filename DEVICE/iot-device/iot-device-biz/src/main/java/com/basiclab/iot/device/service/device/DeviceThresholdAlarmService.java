package com.basiclab.iot.device.service.device;

import com.basiclab.iot.device.domain.device.vo.DeviceAlarmStrategy;
import com.basiclab.iot.device.domain.device.vo.DeviceHealthScoreVO;
import com.basiclab.iot.device.domain.device.vo.DevicePropertyThreshold;
import com.basiclab.iot.device.domain.device.vo.DeviceThresholdAlarm;
import com.basiclab.iot.device.domain.device.vo.PropertyPredictRequest;
import com.basiclab.iot.device.domain.device.vo.PropertyPredictResultVO;
import com.basiclab.iot.device.domain.device.vo.PropertyThresholdEvaluateParam;

import java.util.List;

public interface DeviceThresholdAlarmService {

    List<DevicePropertyThreshold> listThresholds(String deviceIdentification);

    DevicePropertyThreshold getThreshold(String deviceIdentification, String propertyCode);

    DevicePropertyThreshold saveThreshold(DevicePropertyThreshold threshold);

    int deleteThreshold(Long id);

    DeviceAlarmStrategy getStrategy(String deviceIdentification);

    DeviceAlarmStrategy saveStrategy(DeviceAlarmStrategy strategy);

    /**
     * 属性上报后评估阈值，触发告警并通过 Kafka 对接 iot-message
     */
    int evaluateAndAlarm(PropertyThresholdEvaluateParam param);

    List<DeviceThresholdAlarm> listOpenAlarms(String deviceIdentification);

    DeviceHealthScoreVO calcHealthScore(String deviceIdentification, boolean includeAssociated);

    PropertyPredictResultVO predict(PropertyPredictRequest request);
}
