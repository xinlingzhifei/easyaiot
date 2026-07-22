package com.basiclab.iot.visualize.framework.fuxa;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

/**
 * 调用 FUXA /api/signin，组装同源 SSO 桥接 URL
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FuxaSsoClient {

    private final FuxaProperties properties;
    private final ObjectMapper objectMapper;

    public boolean isEnabled() {
        return properties.isSsoEnabled() && StringUtils.hasText(properties.getBaseUrl());
    }

    /**
     * @param mode      edit | preview
     * @param editorRef 画面名或 /editor、/home 路径
     */
    public String buildOpenUrl(String mode, String editorRef) {
        SignInResult signIn = signIn();
        String publicBase = trimSlash(StringUtils.hasText(properties.getPublicUrl())
                ? properties.getPublicUrl()
                : properties.getBaseUrl());

        StringBuilder url = new StringBuilder(publicBase)
                .append(properties.getSsoPath().startsWith("/") ? properties.getSsoPath() : "/" + properties.getSsoPath())
                .append("?token=").append(enc(signIn.token))
                .append("&username=").append(enc(signIn.username))
                .append("&fullname=").append(enc(signIn.fullname))
                .append("&groups=").append(enc(String.valueOf(signIn.groups)))
                .append("&mode=").append(enc(normalizeMode(mode)));

        String ref = editorRef == null ? "" : editorRef.trim();
        if (ref.startsWith("/")) {
            url.append("&target=").append(enc(ref));
        } else if (StringUtils.hasText(ref)) {
            url.append("&view=").append(enc(ref));
        }
        return url.toString();
    }

    public SignInResult signIn() {
        String endpoint = trimSlash(properties.getBaseUrl()) + "/api/signin";
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(endpoint).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(8000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setRequestProperty("Accept", "application/json");

            String body = objectMapper.createObjectNode()
                    .put("username", properties.getUsername())
                    .put("password", properties.getPassword())
                    .toString();
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            String resp = readBody(conn, code >= 200 && code < 300);
            if (code < 200 || code >= 300) {
                throw new IllegalStateException("FUXA 登录失败 HTTP " + code + ": " + resp);
            }

            JsonNode root = objectMapper.readTree(resp);
            JsonNode data = root.path("data");
            String token = data.path("token").asText(null);
            if (!StringUtils.hasText(token)) {
                throw new IllegalStateException("FUXA 登录响应缺少 token: " + resp);
            }
            SignInResult result = new SignInResult();
            result.token = token;
            result.username = data.path("username").asText(properties.getUsername());
            result.fullname = data.path("fullname").asText(result.username);
            JsonNode groupsNode = data.get("groups");
            if (groupsNode != null && groupsNode.isNumber()) {
                result.groups = groupsNode.asInt(-1);
            } else if (groupsNode != null && groupsNode.isArray() && groupsNode.size() > 0) {
                result.groups = groupsNode.get(0).asInt(-1);
            } else {
                result.groups = -1;
            }
            return result;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("FUXA SSO signin error: {}", ex.getMessage());
            throw new IllegalStateException("无法连接 FUXA 完成代登录: " + ex.getMessage(), ex);
        }
    }

    private static String readBody(HttpURLConnection conn, boolean ok) throws Exception {
        try (Scanner sc = new Scanner(
                ok ? conn.getInputStream() : (conn.getErrorStream() != null ? conn.getErrorStream() : conn.getInputStream()),
                StandardCharsets.UTF_8.name()).useDelimiter("\\A")) {
            return sc.hasNext() ? sc.next() : "";
        }
    }

    private static String normalizeMode(String mode) {
        if ("preview".equalsIgnoreCase(mode) || "home".equalsIgnoreCase(mode)) {
            return "preview";
        }
        return "edit";
    }

    private static String trimSlash(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String enc(String v) {
        return URLEncoder.encode(v == null ? "" : v, StandardCharsets.UTF_8);
    }

    public static class SignInResult {
        public String token;
        public String username;
        public String fullname;
        public int groups;
    }

}
