package com.basiclab.iot.system.supervision;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.basiclab.iot.common.core.query.LambdaQueryWrapperX;
import com.basiclab.iot.system.dal.dataobject.supervision.SupervisionEventDO;
import com.basiclab.iot.system.dal.pgsql.supervision.SupervisionEventMapper;
import com.basiclab.iot.system.enums.supervision.SupervisionEventStatusEnum;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupervisionEventMapperTest {

    @Test
    void selectOpenBySourceAlertFindsUnclosedEventBySourceSystemAndAlertId() {
        initTableInfo();
        SupervisionEventDO existingEvent = new SupervisionEventDO().setId(1001L);
        CapturingMapperHandler handler = new CapturingMapperHandler(existingEvent);
        SupervisionEventMapper mapper = handler.createProxy();

        SupervisionEventDO result = mapper.selectOpenBySourceAlert("video", "alert-001");

        assertSame(existingEvent, result);
        assertTrue(handler.queryWrapper() instanceof LambdaQueryWrapperX);
        LambdaQueryWrapperX<SupervisionEventDO> queryWrapper = (LambdaQueryWrapperX<SupervisionEventDO>) handler.queryWrapper();
        String sqlSegment = queryWrapper.getSqlSegment();
        assertTrue(sqlSegment.contains("source_system"));
        assertTrue(sqlSegment.contains("#{ew.paramNameValuePairs.MPGENVAL1}"));
        assertTrue(sqlSegment.contains("source_alert_id"));
        assertTrue(sqlSegment.contains("#{ew.paramNameValuePairs.MPGENVAL2}"));
        assertTrue(sqlSegment.contains("event_status"));
        assertTrue(sqlSegment.contains("<>"));
        assertTrue(queryWrapper.getParamNameValuePairs().containsValue("video"));
        assertTrue(queryWrapper.getParamNameValuePairs().containsValue("alert-001"));
        assertTrue(queryWrapper.getParamNameValuePairs().containsValue(SupervisionEventStatusEnum.CLOSED.getCode()));
    }

    private static void initTableInfo() {
        if (TableInfoHelper.getTableInfo(SupervisionEventDO.class) != null) {
            return;
        }
        MapperBuilderAssistant builderAssistant = new MapperBuilderAssistant(new MybatisConfiguration(), "");
        TableInfoHelper.initTableInfo(builderAssistant, SupervisionEventDO.class);
    }

    private static final class CapturingMapperHandler implements InvocationHandler {

        private final SupervisionEventDO result;
        private Wrapper<SupervisionEventDO> queryWrapper;

        private CapturingMapperHandler(SupervisionEventDO result) {
            this.result = result;
        }

        private SupervisionEventMapper createProxy() {
            return (SupervisionEventMapper) Proxy.newProxyInstance(
                    SupervisionEventMapper.class.getClassLoader(),
                    new Class[]{SupervisionEventMapper.class},
                    this
            );
        }

        @Override
        @SuppressWarnings("unchecked")
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if ("selectOne".equals(method.getName()) && args != null && args.length == 1 && args[0] instanceof Wrapper) {
                queryWrapper = (Wrapper<SupervisionEventDO>) args[0];
                return result;
            }
            if (method.isDefault()) {
                return InvocationHandler.invokeDefault(proxy, method, args);
            }
            if (method.getDeclaringClass() == Object.class) {
                return method.invoke(this, args);
            }
            throw new UnsupportedOperationException(method.toString());
        }

        private Wrapper<SupervisionEventDO> queryWrapper() {
            return queryWrapper;
        }

    }

}
