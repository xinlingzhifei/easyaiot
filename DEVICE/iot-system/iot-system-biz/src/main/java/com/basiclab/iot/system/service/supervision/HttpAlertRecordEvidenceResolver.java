package com.basiclab.iot.system.service.supervision;

import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.RecordEvidenceRequest;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.RecordEvidenceResolver;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.RecordEvidenceResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.format.DateTimeFormatter;
import java.net.URI;
import java.util.Map;
import java.util.Optional;

@Service
public class HttpAlertRecordEvidenceResolver implements RecordEvidenceResolver {

    private static final DateTimeFormatter ALERT_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int DEFAULT_TIME_RANGE_SECONDS = 300;

    private final RestTemplate restTemplate;
    private final String alertRecordQueryUrl;
    private final String publicPlayHost;

    public HttpAlertRecordEvidenceResolver(RestTemplate restTemplate,
                                           @Value("${yfeieye.video.alert-record-query-url:}") String alertRecordQueryUrl,
                                           @Value("${yfeieye.video.public-play-host:${MEDIA_HTTP_PLAY_HOST:}}") String publicPlayHost) {
        this.restTemplate = restTemplate;
        this.alertRecordQueryUrl = alertRecordQueryUrl;
        this.publicPlayHost = publicPlayHost;
    }

    @Override
    public Optional<RecordEvidenceResult> resolve(RecordEvidenceRequest request) {
        if (!hasText(alertRecordQueryUrl)) {
            return Optional.empty();
        }
        String deviceId = hasText(request.deviceId()) ? request.deviceId() : request.cameraId();
        String url = UriComponentsBuilder.fromHttpUrl(alertRecordQueryUrl)
                .queryParam("device_id", deviceId)
                .queryParam("alert_time", request.alertTime().format(ALERT_TIME_FORMATTER))
                .queryParam("time_range", DEFAULT_TIME_RANGE_SECONDS)
                .queryParam("alert_id", request.sourceAlertId())
                .build()
                .toUriString();

        try {
            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            Map<?, ?> data = responseData(response);
            if (data == null) {
                return Optional.empty();
            }
            String recordUri = rewritePublicUri(firstText(data.get("video_url"), data.get("record_url"),
                    data.get("play_url"), data.get("url"), data.get("file_path")));
            if (!hasText(recordUri)) {
                return Optional.empty();
            }
            String message = firstText(data.get("source"), data.get("message"), data.get("msg"));
            return Optional.of(new RecordEvidenceResult(recordUri, message));
        } catch (RuntimeException ignored) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<String> unavailableReason() {
        return hasText(alertRecordQueryUrl)
                ? Optional.empty()
                : Optional.of(SupervisionAlertReviewService.RECORD_GAP_VIDEO_URL_NOT_CONFIGURED);
    }

    private static Map<?, ?> responseData(Map<?, ?> response) {
        if (response == null || response.isEmpty()) {
            return null;
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
            if (uri.startsWith("/video/") || uri.startsWith("/api/")) {
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
