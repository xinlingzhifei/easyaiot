package com.basiclab.iot.sink.service.tdengine;

import com.baomidou.dynamic.datasource.DynamicRoutingDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import javax.sql.DataSource;

/**
 * 启动时确保 MQTT 上行所需的 TDengine 超级表存在（与 .scripts/tdengine/tdengine_super_tables.sql 对齐）。
 * 子表由 INSERT ... USING superTable TAGS(...) 自动创建。
 * <p>
 * 注意：注入的默认 {@link JdbcTemplate} 通常绑定 primary（PG），不能直接用。
 * 这里从 {@link DynamicRoutingDataSource} 取 tdengine 数据源再建表。
 */
@Slf4j
@Component
public class TdSuperTableInitializer implements ApplicationRunner {

    private static final String DB = "iot_device";
    private static final String DS_NAME = "tdengine";

    @Resource
    private DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        try {
            JdbcTemplate tdJdbc = createTdJdbcTemplate();
            tdJdbc.execute("CREATE DATABASE IF NOT EXISTS " + DB);
            createStable(tdJdbc, "st_property_upstream_report", false, true);
            createStable(tdJdbc, "st_property_upstream_desired_set_ack", false, false);
            createStable(tdJdbc, "st_property_upstream_desired_query_response", false, false);
            createStable(tdJdbc, "st_event_upstream_report", true, true);
            createStable(tdJdbc, "st_service_upstream_invoke_response", true, false);
            createStable(tdJdbc, "st_device_tag_upstream_report", false, true);
            createStable(tdJdbc, "st_device_tag_upstream_delete", false, true);
            createStable(tdJdbc, "st_shadow_upstream_report", false, true);
            createStable(tdJdbc, "st_config_upstream_query", false, true);
            createStable(tdJdbc, "st_ntp_upstream_request", false, true);
            createStable(tdJdbc, "st_ota_upstream_version_report", false, true);
            createStable(tdJdbc, "st_ota_upstream_progress_report", false, true);
            createStable(tdJdbc, "st_ota_upstream_firmware_query", false, true);
            createStable(tdJdbc, "st_log_upstream_report", false, true);
            log.info("[TdSuperTableInitializer][TDengine 超级表初始化完成]");
        } catch (Exception e) {
            log.error("[TdSuperTableInitializer][TDengine 超级表初始化失败，请确认 tdengine 数据源与服务可用]", e);
        }
    }

    private JdbcTemplate createTdJdbcTemplate() {
        DataSource ds = dataSource;
        if (dataSource instanceof DynamicRoutingDataSource) {
            ds = ((DynamicRoutingDataSource) dataSource).getDataSource(DS_NAME);
        }
        if (ds == null) {
            throw new IllegalStateException("TDengine datasource '" + DS_NAME + "' not found");
        }
        return new JdbcTemplate(ds);
    }

    /**
     * @param withIdentifierTag 事件/服务响应需要 identifier TAG
     * @param withParams        ACK/RESPONSE 类表通常无 params 列
     */
    private void createStable(JdbcTemplate tdJdbc, String name, boolean withIdentifierTag, boolean withParams) {
        StringBuilder cols = new StringBuilder();
        cols.append("ts TIMESTAMP, ")
                .append("report_time TIMESTAMP, ")
                .append("device_id BIGINT, ")
                .append("server_id NCHAR(50), ")
                .append("request_id NCHAR(100), ")
                .append("method NCHAR(100), ");
        if (withParams) {
            cols.append("params NCHAR(5000), ");
        }
        cols.append("data NCHAR(5000), ")
                .append("code INT, ")
                .append("msg NCHAR(500), ")
                .append("`topic` NCHAR(500)");

        String tags = "device_identification NCHAR(128), "
                + "tenant_id BIGINT, "
                + "product_identification NCHAR(128)";
        if (withIdentifierTag) {
            tags += ", identifier NCHAR(100)";
        }

        String sql = "CREATE STABLE IF NOT EXISTS " + DB + "." + name
                + " (" + cols + ") TAGS (" + tags + ")";
        tdJdbc.execute(sql);
    }
}
