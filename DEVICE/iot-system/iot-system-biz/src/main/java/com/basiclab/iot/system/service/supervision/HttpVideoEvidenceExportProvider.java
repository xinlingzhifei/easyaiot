package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceVideoExportRequest;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceVideoExportResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.VideoEvidenceExportProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class HttpVideoEvidenceExportProvider implements VideoEvidenceExportProvider {

    private final RestTemplate restTemplate;
    private final String recordExportUrl;
    private final String publicPlayHost;

    public HttpVideoEvidenceExportProvider(RestTemplate restTemplate,
                                           @Value("${yfeieye.video.record-export-url:}") String recordExportUrl,
                                           @Value("${yfeieye.video.public-play-host:${MEDIA_HTTP_PLAY_HOST:}}") String publicPlayHost) {
        this.restTemplate = restTemplate;
        this.recordExportUrl = recordExportUrl;
        this.publicPlayHost = publicPlayHost;
    }

    @Override
    public Optional<ReviewEvidenceVideoExportResult> export(ReviewEvidenceVideoExportRequest request) {
        if (!hasText(recordExportUrl) || request == null) {
            return Optional.empty();
        }
        try {
            Map<?, ?> response = restTemplate.postForObject(recordExportUrl, requestBody(request), Map.class);
            Map<?, ?> data = responseData(response);
            String exportId = firstText(data.get("export_id"), data.get("exportId"), data.get("id"), data.get("task_id"), data.get("taskId"));
            String exportUri = rewritePublicUri(firstText(data.get("export_uri"), data.get("exportUri"),
                    data.get("download_url"), data.get("downloadUrl"), data.get("url")));
            if (!hasText(exportId) && !hasText(exportUri)) {
                return Optional.empty();
            }
            return Optional.of(new ReviewEvidenceVideoExportResult(
                    exportId,
                    exportUri,
                    firstText(data.get("status"), data.get("state")),
                    firstText(data.get("message"), data.get("msg"))
            ));
        } catch (RuntimeException ignored) {
            return Optional.empty();
        }
    }

    private static Map<String, Object> requestBody(ReviewEvidenceVideoExportRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("review_case_id", request.reviewCaseId());
        body.put("review_item_id", request.reviewItemId());
        body.put("device_id", request.deviceId());
        body.put("camera_id", request.cameraId());
        body.put("source_alert_id", request.sourceAlertId());
        body.put("start_time", request.startTime() == null ? null : request.startTime().toString());
        body.put("end_time", request.endTime() == null ? null : request.endTime().toString());
        body.put("record_uri", request.recordUri());
        body.put("format", request.format());
        body.entrySet().removeIf(entry -> entry.getValue() == null);
        return body;
    }

    private static Map<?, ?> responseData(Map<?, ?> response) {
        if (response == null || response.isEmpty()) {
            return Map.of();
        }
        Object data = response.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            return dataMap;
        }
        return response;
    }

    private String rewritePublicUri(String uri) {
        if (!hasText(uri) || !hasText(publicPlayHost)) {
            return uri;
        }
        try {
            URI publicHost = URI.create(publicPlayHost);
            if (!hasText(publicHost.getScheme()) || !hasText(publicHost.getHost())) {
                return uri;
            }
            if (uri.startsWith("/")) {
                return publicHost.resolve(uri).toString();
            }
            URI source = URI.create(uri);
            if (source.getHost() == null) {
                return uri;
            }
            return new URI(
                    publicHost.getScheme(),
                    source.getUserInfo(),
                    publicHost.getHost(),
                    publicHost.getPort(),
                    source.getPath(),
                    source.getQuery(),
                    source.getFragment()
            ).toString();
        } catch (Exception ignored) {
            return uri;
        }
    }

    private static String firstText(Object... values) {
        for (Object value : values) {
            String text = toText(value);
            if (hasText(text)) {
                return text;
            }
        }
        return null;
    }

    private static String toText(Object value) {
        if (value == null) {
            return null;
        }
        return String.valueOf(value);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

}
