package com.basiclab.iot.system.job.supervision;

import com.basiclab.iot.common.core.handler.JobHandler;
import com.basiclab.iot.common.core.job.TenantJob;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewOperationsReportDelivery;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewOperationsReport;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewQuery;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewReportCommand;
import org.springframework.stereotype.Component;

@Component("supervisionAlertReviewOperationsReportJob")
public class SupervisionAlertReviewOperationsReportJob implements JobHandler {

    private static final String REPORT_TYPE_DAILY = "daily";
    private static final String REPORT_TYPE_SHIFT = "shift";

    private final SupervisionAlertReviewService supervisionAlertReviewService;

    public SupervisionAlertReviewOperationsReportJob(SupervisionAlertReviewService supervisionAlertReviewService) {
        this.supervisionAlertReviewService = supervisionAlertReviewService;
    }

    @Override
    @TenantJob
    public String execute(String param) {
        String reportType = parseReportType(param);
        ReviewOperationsReportDelivery delivery = supervisionAlertReviewService.scheduleReviewReportDelivery(
                new ReviewReportCommand(reportType, new ReviewQuery(null, null, null, null), null, null, null)
        );
        ReviewOperationsReport report = delivery.report();
        Object deliveryStatus = report.deliveryPlan() == null ? null : report.deliveryPlan().get("deliveryStatus");
        Object acknowledgement = report.acknowledgement() == null ? null : report.acknowledgement().get("status");
        return "reportType=" + report.reportType()
                + ", scheduled=true"
                + ", items=" + report.reviewItemIds().size()
                + ", evidenceGaps=" + report.evidenceGaps().size()
                + ", recommendedActions=" + report.recommendedActions().size()
                + ", deliveryStatus=" + deliveryStatus
                + ", acknowledgement=" + acknowledgement
                + ", deliveryOutbox=" + delivery.outboxEventCount();
    }

    private static String parseReportType(String param) {
        if (param == null || param.isBlank()) {
            return REPORT_TYPE_SHIFT;
        }
        String normalized = param.trim().toLowerCase();
        return REPORT_TYPE_DAILY.equals(normalized) ? REPORT_TYPE_DAILY : REPORT_TYPE_SHIFT;
    }

}
