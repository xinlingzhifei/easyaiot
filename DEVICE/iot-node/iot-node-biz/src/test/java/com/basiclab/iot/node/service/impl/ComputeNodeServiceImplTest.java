package com.basiclab.iot.node.service.impl;

import com.basiclab.iot.node.dal.dataobject.ComputeNodeDO;
import com.basiclab.iot.node.dal.pgsql.NodeMetricSnapshotMapper;
import com.basiclab.iot.node.dal.pgsql.NodeSshCredentialMapper;
import com.basiclab.iot.node.domain.vo.ComputeNodeRespVO;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ComputeNodeServiceImplTest {

    @Test
    void hidesAgentTokenUnlessResponseExplicitlyExposesIt() throws Exception {
        ComputeNodeServiceImpl service = new ComputeNodeServiceImpl();
        setField(service, "nodeSshCredentialMapper", nullReturningSshCredentialMapper());
        setField(service, "nodeMetricSnapshotMapper", nullReturningMetricSnapshotMapper());

        ComputeNodeDO node = new ComputeNodeDO();
        node.setId(7L);
        node.setName("worker-7");
        node.setAgentToken("secret-agent-token");

        ComputeNodeRespVO hidden = toRespVO(service, node, false);
        assertNull(hidden.getAgentToken());

        ComputeNodeRespVO exposed = toRespVO(service, node, true);
        assertEquals("secret-agent-token", exposed.getAgentToken());
    }

    private static ComputeNodeRespVO toRespVO(ComputeNodeServiceImpl service,
                                             ComputeNodeDO node,
                                             boolean exposeToken) throws Exception {
        Method method = ComputeNodeServiceImpl.class.getDeclaredMethod("toRespVO", ComputeNodeDO.class, boolean.class);
        method.setAccessible(true);
        return (ComputeNodeRespVO) method.invoke(service, node, exposeToken);
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }

    private static NodeSshCredentialMapper nullReturningSshCredentialMapper() {
        return (NodeSshCredentialMapper) Proxy.newProxyInstance(
                NodeSshCredentialMapper.class.getClassLoader(),
                new Class[]{NodeSshCredentialMapper.class},
                (proxy, method, args) -> null);
    }

    private static NodeMetricSnapshotMapper nullReturningMetricSnapshotMapper() {
        return (NodeMetricSnapshotMapper) Proxy.newProxyInstance(
                NodeMetricSnapshotMapper.class.getClassLoader(),
                new Class[]{NodeMetricSnapshotMapper.class},
                (proxy, method, args) -> null);
    }
}
