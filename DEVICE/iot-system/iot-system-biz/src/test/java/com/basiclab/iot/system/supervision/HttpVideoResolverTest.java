package com.basiclab.iot.system.supervision;

import com.basiclab.iot.system.service.supervision.HttpAlertRecordEvidenceResolver;
import com.basiclab.iot.system.service.supervision.HttpReviewIntelligenceProvider;
import com.basiclab.iot.system.service.supervision.HttpVideoEvidenceExportProvider;
import com.basiclab.iot.system.service.supervision.HttpVideoRecordCoverageResolver;
import com.basiclab.iot.system.service.supervision.ReviewIntelligenceProvider.ReviewAiSummaryRequest;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewAiSummary;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.RecordCoverageRequest;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.RecordCoverageSegment;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.RecordEvidenceRequest;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.RecordEvidenceResult;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceVideoExportRequest;
import com.basiclab.iot.system.service.supervision.SupervisionAlertReviewService.ReviewEvidenceVideoExportResult;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Constructor;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class HttpVideoResolverTest {

    @Test
    void dockerComposeWiresReviewVideoUrlsToRealVideoRecordEndpointsByDefault() throws Exception {
        String applicationYaml = Files.readString(modulePath("src/main/resources/application.yaml"), StandardCharsets.UTF_8);
        String dockerCompose = Files.readString(modulePath("../../docker-compose.yml"), StandardCharsets.UTF_8);
        String coverageResolver = Files.readString(modulePath("src/main/java/com/basiclab/iot/system/service/supervision/HttpVideoRecordCoverageResolver.java"), StandardCharsets.UTF_8);

        assertTrue(applicationYaml.contains("alert-record-query-url: ${YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL:}"));
        assertTrue(applicationYaml.contains("record-coverage-query-url: ${YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL:}"));
        assertTrue(applicationYaml.contains("record-base-url: ${YFEIEYE_VIDEO_RECORD_BASE_URL:}"));
        assertTrue(applicationYaml.contains("record-export-url: ${YFEIEYE_VIDEO_RECORD_EXPORT_URL:}"));
        assertTrue(coverageResolver.contains("@Value(\"${yfeieye.video.record-coverage-query-url:}\")"));
        assertFalse(coverageResolver.contains("record-coverage-query-url:${yfeieye.video.alert-record-query-url"));
        assertTrue(dockerCompose.contains("YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL=${YFEIEYE_VIDEO_ALERT_RECORD_QUERY_URL:-http://host.docker.internal:6000/video/record/availability}"));
        assertTrue(dockerCompose.contains("YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL=${YFEIEYE_VIDEO_RECORD_COVERAGE_QUERY_URL:-http://host.docker.internal:6000/video/record/availability}"));
        assertTrue(dockerCompose.contains("YFEIEYE_VIDEO_RECORD_BASE_URL=${YFEIEYE_VIDEO_RECORD_BASE_URL:-http://host.docker.internal:6000/video/record}"));
        assertTrue(dockerCompose.contains("YFEIEYE_VIDEO_RECORD_EXPORT_URL=${YFEIEYE_VIDEO_RECORD_EXPORT_URL:-http://host.docker.internal:6000/video/record/export}"));
    }

    private static Path modulePath(String relativePath) {
        try {
            Path testClasses = Path.of(HttpVideoResolverTest.class.getProtectionDomain()
                    .getCodeSource().getLocation().toURI());
            return testClasses.getParent().getParent().resolve(relativePath).normalize();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to resolve iot-system-biz module path", exception);
        }
    }

    @Test
    void runtimeOutboxAdminUsersStayUnconfiguredWhenEnvironmentIsAbsent() throws Exception {
        String applicationYaml = Files.readString(modulePath("src/main/resources/application.yaml"), StandardCharsets.UTF_8);

        assertFalse(applicationYaml.contains(
                "admin-user-ids: ${YFEIEYE_REVIEW_RUNTIME_OUTBOX_NOTIFY_ADMIN_USER_IDS:[]}"));
    }

    @Test
    void reviewIntelligenceProviderKeepsStructuredSummaryData() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> assertEquals("http://ai.local/review/summary", request.getURI().toString()))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {
                          "code": 200,
                          "data": {
                            "title": "provider title",
                            "summary": "provider structured summary",
                            "structuredData": {
                              "scene": "gate / yard",
                              "threatLevel": "high",
                              "responsibilityUnit": "camera-01"
                            }
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpReviewIntelligenceProvider provider = new HttpReviewIntelligenceProvider(
                restTemplate,
                "",
                "http://ai.local/review/summary"
        );

        Optional<ReviewAiSummary> summary = provider.summarize(new ReviewAiSummaryRequest(
                900L,
                901L,
                List.of(1001L),
                List.of(),
                List.of()
        ));

        assertTrue(summary.isPresent());
        assertEquals("provider title", summary.get().title());
        assertEquals("gate / yard", summary.get().structuredData().get("scene"));
        assertEquals("high", summary.get().structuredData().get("threatLevel"));
        assertEquals("camera-01", summary.get().structuredData().get("responsibilityUnit"));
        server.verify();
    }

    @Test
    void alertRecordResolverParsesVideoPayloadAndRewritesRelativePlaybackUrl() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> {
                    String url = request.getURI().toString();
                    assertTrue(url.startsWith("http://video.local/video/alert/record/query?"));
                    assertTrue(url.contains("device_id=camera-01"));
                    assertTrue(url.contains("alert_time=2026-06-30%2010:15:00"));
                    assertTrue(url.contains("time_range=300"));
                    assertTrue(url.contains("alert_id=alert-001"));
                })
                .andRespond(withSuccess("""
                        {
                          "code": 200,
                          "msg": "success",
                          "data": {
                            "video_url": "/video/alert/record?path=%2Fdata%2Fplaybacks%2Fclip.flv",
                            "file_path": "/data/playbacks/clip.flv",
                            "source": "alert_record_path"
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpAlertRecordEvidenceResolver resolver = new HttpAlertRecordEvidenceResolver(
                restTemplate,
                "http://video.local/video/alert/record/query",
                "https://eye.yfeiai.com"
        );

        Optional<RecordEvidenceResult> result = resolver.resolve(new RecordEvidenceRequest(
                "alert-001",
                null,
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 15)
        ));

        assertTrue(result.isPresent());
        assertEquals("https://eye.yfeiai.com/video/alert/record?path=%2Fdata%2Fplaybacks%2Fclip.flv",
                result.get().recordUri());
        assertEquals("alert_record_path", result.get().message());
        server.verify();
    }

    @Test
    void alertRecordResolverReturnsEmptyWhenVideoServiceFails() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> assertTrue(request.getURI().toString()
                        .startsWith("http://video.local/video/alert/record/query?")))
                .andRespond(withServerError());
        HttpAlertRecordEvidenceResolver resolver = new HttpAlertRecordEvidenceResolver(
                restTemplate,
                "http://video.local/video/alert/record/query",
                "https://eye.yfeiai.com"
        );

        Optional<RecordEvidenceResult> result = resolver.resolve(new RecordEvidenceRequest(
                "alert-500",
                "device-01",
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 18)
        ));

        assertTrue(result.isEmpty());
        server.verify();
    }

    @Test
    void alertRecordResolverReportsVideoUrlNotConfiguredWhenUrlIsEmpty() {
        HttpAlertRecordEvidenceResolver resolver = new HttpAlertRecordEvidenceResolver(
                new RestTemplate(),
                "",
                "https://eye.yfeiai.com"
        );

        Optional<RecordEvidenceResult> result = resolver.resolve(new RecordEvidenceRequest(
                "alert-no-config",
                "device-01",
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 19)
        ));

        assertTrue(result.isEmpty());
        assertEquals("video_url_not_configured", resolver.unavailableReason().orElse(null));
    }

    @Test
    void coverageResolverParsesAlertRecordQuerySinglePayloadWhenConfiguredAsFallback() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> assertTrue(request.getURI().toString()
                        .startsWith("http://video.local/video/alert/record/query?")))
                .andRespond(withSuccess("""
                        {
                          "code": 200,
                          "message": "success",
                          "data": {
                            "video_url": "/video/alert/record?path=%2Fdata%2Fplaybacks%2Fsingle.flv",
                            "event_time": "2026-06-30T10:14:30",
                            "duration": 45,
                            "source": "playback_match"
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpVideoRecordCoverageResolver resolver = new HttpVideoRecordCoverageResolver(
                restTemplate,
                "http://video.local/video/alert/record/query",
                "https://eye.yfeiai.com"
        );

        List<RecordCoverageSegment> segments = resolver.resolve(new RecordCoverageRequest(
                "device-01",
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 10),
                LocalDateTime.of(2026, 6, 30, 10, 20)
        ));

        assertEquals(1, segments.size());
        assertEquals(LocalDateTime.of(2026, 6, 30, 10, 14, 30), segments.get(0).startTime());
        assertEquals(LocalDateTime.of(2026, 6, 30, 10, 15, 15), segments.get(0).endTime());
        assertEquals("https://eye.yfeiai.com/video/alert/record?path=%2Fdata%2Fplaybacks%2Fsingle.flv",
                segments.get(0).recordUri());
        assertEquals("playback_match", segments.get(0).metadata().get("source"));
        server.verify();
    }

    @Test
    void coverageResolverParsesVideoDayTimelineOffsetsFromRecordBlueprint() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> {
                    String url = request.getURI().toString();
                    assertTrue(url.startsWith("http://video.local/video/record/space/7/videos/day?"));
                    assertTrue(url.contains("date=2026-06-30"));
                    assertTrue(url.contains("device_id=device-01"));
                })
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "msg": "success",
                          "data": {
                            "date": "2026-06-30",
                            "timeline_merged": [
                              {
                                "start_offset_sec": 36600,
                                "end_offset_sec": 36690,
                                "has_recording": true,
                                "has_alert": true,
                                "alert_count": 2,
                                "segment_ids": [11, 12]
                              }
                            ]
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpVideoRecordCoverageResolver resolver = new HttpVideoRecordCoverageResolver(
                restTemplate,
                "http://video.local/video/record/space/7/videos/day",
                ""
        );

        List<RecordCoverageSegment> segments = resolver.resolve(new RecordCoverageRequest(
                "device-01",
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 8),
                LocalDateTime.of(2026, 6, 30, 10, 14)
        ));

        assertEquals(1, segments.size());
        assertEquals("motion", segments.get(0).status());
        assertEquals(LocalDateTime.of(2026, 6, 30, 10, 10), segments.get(0).startTime());
        assertEquals(LocalDateTime.of(2026, 6, 30, 10, 11, 30), segments.get(0).endTime());
        assertEquals(2, segments.get(0).objects());
        assertEquals(List.of(11, 12), segments.get(0).metadata().get("segmentIds"));
        server.verify();
    }

    @Test
    void coverageResolverParsesAvailabilitySegmentsWithMissingAndExportUrl() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> assertTrue(request.getURI().toString()
                        .startsWith("http://video.local/video/record/availability?")))
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "msg": "success",
                          "data": {
                            "date": "2026-06-30",
                            "segments": [
                              {
                                "status": "available",
                                "start_time": "2026-06-30T10:00:00",
                                "end_time": "2026-06-30T10:01:00",
                                "play_url": "/video/record/space/7/video/live/device-01/clip.mp4",
                                "export_url": "/video/record/export",
                                "object_count": 2
                              },
                              {
                                "status": "missing",
                                "start_time": "2026-06-30T10:01:00",
                                "end_time": "2026-06-30T10:02:00",
                                "source": "coverage_gap"
                              }
                            ]
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpVideoRecordCoverageResolver resolver = new HttpVideoRecordCoverageResolver(
                restTemplate,
                "http://video.local/video/record/availability",
                "https://eye.yfeiai.com"
        );

        List<RecordCoverageSegment> segments = resolver.resolve(new RecordCoverageRequest(
                "device-01",
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 0),
                LocalDateTime.of(2026, 6, 30, 10, 2)
        ));

        assertEquals(2, segments.size());
        assertEquals("available", segments.get(0).status());
        assertEquals(2, segments.get(0).objects());
        assertEquals("https://eye.yfeiai.com/video/record/space/7/video/live/device-01/clip.mp4",
                segments.get(0).recordUri());
        assertEquals("https://eye.yfeiai.com/video/record/export", segments.get(0).metadata().get("exportUrl"));
        assertEquals("missing", segments.get(1).status());
        assertEquals("coverage_gap", segments.get(1).metadata().get("source"));
        server.verify();
    }

    @Test
    void coverageResolverPreservesRetainModeSourceAndNonExportableReason() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> assertTrue(request.getURI().toString()
                        .startsWith("http://video.local/video/record/availability?")))
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "data": {
                            "segments": [
                              {
                                "status": "available",
                                "start_time": "2026-06-30T10:03:00",
                                "end_time": "2026-06-30T10:04:00",
                                "retain_mode": "motion",
                                "has_detection": true,
                                "exportable": false,
                                "non_exportable_reason": "source_file_missing",
                                "retain_until": "2026-07-07T10:04:00"
                              }
                            ]
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpVideoRecordCoverageResolver resolver = new HttpVideoRecordCoverageResolver(
                restTemplate,
                "http://video.local/video/record/availability",
                ""
        );

        List<RecordCoverageSegment> segments = resolver.resolve(new RecordCoverageRequest(
                "device-01",
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 0),
                LocalDateTime.of(2026, 6, 30, 10, 5)
        ));

        assertEquals(1, segments.size());
        assertEquals("motion", segments.get(0).metadata().get("retainMode"));
        assertEquals("detection", segments.get(0).metadata().get("coverageSource"));
        assertEquals(false, segments.get(0).metadata().get("exportable"));
        assertEquals("source_file_missing", segments.get(0).metadata().get("nonExportableReason"));
        assertEquals("2026-07-07T10:04:00", segments.get(0).metadata().get("retainUntil"));
        server.verify();
    }

    @Test
    void coverageResolverDiscoversRecordSpaceByDeviceWhenConfiguredWithRecordBaseUrl() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> assertEquals(
                        "http://video.local/video/record/space/device/device-01",
                        request.getURI().toString()))
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "msg": "success",
                          "data": {
                            "id": 9,
                            "device_id": "device-01"
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        server.expect(request -> {
                    String url = request.getURI().toString();
                    assertTrue(url.startsWith("http://video.local/video/record/space/9/videos/day?"));
                    assertTrue(url.contains("date=2026-06-30"));
                    assertTrue(url.contains("device_id=device-01"));
                })
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "msg": "success",
                          "data": {
                            "date": "2026-06-30",
                            "segments": [
                              {
                                "id": 31,
                                "url": "/video/record/space/9/video/device-01/clip.flv",
                                "start_time": "2026-06-30T10:10:30",
                                "end_time": "2026-06-30T10:11:15",
                                "has_alert": false,
                                "alert_count": 0
                              }
                            ]
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpVideoRecordCoverageResolver resolver = new HttpVideoRecordCoverageResolver(
                restTemplate,
                "http://video.local/video/record",
                "https://eye.yfeiai.com"
        );

        List<RecordCoverageSegment> segments = resolver.resolve(new RecordCoverageRequest(
                "device-01",
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 8),
                LocalDateTime.of(2026, 6, 30, 10, 14)
        ));

        assertEquals(1, segments.size());
        assertEquals(LocalDateTime.of(2026, 6, 30, 10, 10, 30), segments.get(0).startTime());
        assertEquals(LocalDateTime.of(2026, 6, 30, 10, 11, 15), segments.get(0).endTime());
        assertEquals("https://eye.yfeiai.com/video/record/space/9/video/device-01/clip.flv",
                segments.get(0).recordUri());
        assertEquals(List.of(31), segments.get(0).metadata().get("segmentIds"));
        server.verify();
    }

    @Test
    void coverageResolverFallsBackToDedicatedRecordBaseUrlWhenAvailabilityHasNoSegments() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> assertTrue(request.getURI().toString()
                        .startsWith("http://video.local/video/record/availability?")))
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "msg": "success",
                          "data": {
                            "segments": []
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        server.expect(request -> assertEquals(
                        "http://video.local/video/record/space/device/device-01",
                        request.getURI().toString()))
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "data": {
                            "id": 9,
                            "device_id": "device-01"
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        server.expect(request -> {
                    String url = request.getURI().toString();
                    assertTrue(url.startsWith("http://video.local/video/record/space/9/videos/day?"));
                    assertTrue(url.contains("date=2026-06-30"));
                    assertTrue(url.contains("device_id=device-01"));
                })
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "data": {
                            "segments": [
                              {
                                "id": 31,
                                "url": "/video/record/space/9/video/device-01/fallback.flv",
                                "start_time": "2026-06-30T10:10:30",
                                "end_time": "2026-06-30T10:11:15"
                              }
                            ]
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpVideoRecordCoverageResolver resolver = newCoverageResolver(
                restTemplate,
                "http://video.local/video/record/availability",
                "http://video.local/video/record",
                "https://eye.yfeiai.com"
        );

        List<RecordCoverageSegment> segments = resolver.resolve(new RecordCoverageRequest(
                "device-01",
                "camera-01",
                LocalDateTime.of(2026, 6, 30, 10, 8),
                LocalDateTime.of(2026, 6, 30, 10, 14)
        ));

        assertEquals(1, segments.size());
        assertEquals("https://eye.yfeiai.com/video/record/space/9/video/device-01/fallback.flv",
                segments.get(0).recordUri());
        assertEquals(List.of(31), segments.get(0).metadata().get("segmentIds"));
        server.verify();
    }

    @Test
    void videoEvidenceExportProviderPostsExportWindowAndRewritesRelativeExportUrl() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(request -> assertEquals(
                        "http://video.local/video/record/export",
                        request.getURI().toString()))
                .andExpect(method(HttpMethod.POST))
                .andExpect(request -> {
                    String body = request.getBody().toString();
                    assertTrue(body.contains("camera-01"));
                    assertTrue(body.contains("alert-export-001"));
                    assertTrue(body.contains("2026-06-30T10:10"));
                    assertTrue(body.contains("2026-06-30T10:12"));
                })
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "data": {
                            "export_id": "exp-001",
                            "download_url": "/exports/exp-001.mp4",
                            "status": "queued",
                            "message": "accepted"
                          }
                        }
                        """, MediaType.APPLICATION_JSON));
        HttpVideoEvidenceExportProvider provider = new HttpVideoEvidenceExportProvider(
                restTemplate,
                "http://video.local/video/record/export",
                "https://eye.yfeiai.com"
        );

        Optional<ReviewEvidenceVideoExportResult> result = provider.export(new ReviewEvidenceVideoExportRequest(
                3000L,
                1000L,
                "device-01",
                "camera-01",
                "alert-export-001",
                LocalDateTime.of(2026, 6, 30, 10, 10),
                LocalDateTime.of(2026, 6, 30, 10, 12),
                "record.mp4",
                "mp4"
        ));

        assertTrue(result.isPresent());
        assertEquals("exp-001", result.get().exportId());
        assertEquals("https://eye.yfeiai.com/exports/exp-001.mp4", result.get().exportUri());
        assertEquals("queued", result.get().status());
        assertEquals("accepted", result.get().message());
        server.verify();
    }

    private static HttpVideoRecordCoverageResolver newCoverageResolver(RestTemplate restTemplate,
                                                                       String recordCoverageQueryUrl,
                                                                       String recordBaseUrl,
                                                                       String publicPlayHost) {
        try {
            Constructor<HttpVideoRecordCoverageResolver> constructor = HttpVideoRecordCoverageResolver.class
                    .getConstructor(RestTemplate.class, String.class, String.class, String.class);
            return constructor.newInstance(restTemplate, recordCoverageQueryUrl, recordBaseUrl, publicPlayHost);
        } catch (NoSuchMethodException e) {
            fail("HttpVideoRecordCoverageResolver must accept a dedicated record base URL");
            return null;
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

}
