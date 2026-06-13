# Signed RTMP Ingest Design

## Goal

Protect public RTMP push endpoints with per-device signed URLs so a device can
push from the public internet without allowing cross-tenant or expired stream
publishing.

## URL Format

Use HMAC-signed query parameters:

```text
rtmp://media.example.com/live/{deviceId}?tenant={tenantId}&exp={unixSeconds}&ver={tokenVersion}&sig={hmac}
```

Canonical string:

```text
tenant={tenantId}&device={deviceId}&app=live&stream={deviceId}&exp={unixSeconds}&ver={tokenVersion}
```

Signature:

```text
HMAC-SHA256(device_push_secret[tokenVersion], canonical_string)
```

## Responsibilities

Platform:

- Issue signed RTMP push URLs per device.
- Store token version and rotation metadata.
- Bind device, tenant, media node, app, stream, expiry, and signature version.
- Provide token rotation without invalidating still-valid URLs unless explicitly
  revoked.

Media publish hook:

- Validate tenant, device, app, stream, expiry, token version, and HMAC.
- Reject missing, expired, malformed, wrong-tenant, wrong-device, or revoked
  signatures.
- Record accepted and rejected publish attempts for audit.

UI/API:

- Show current push URL state and expiry.
- Allow explicit rotation.
- Avoid exposing raw secrets.

## Acceptance

- Missing `sig` is rejected.
- Expired `exp` is rejected.
- Wrong tenant is rejected.
- Wrong device or stream path is rejected.
- Old token version is rejected after forced rotation.
- Valid signature is accepted and moves the device access state to
  `stream_online`.
- Audit records include device, tenant, media node, reason, remote IP, and
  timestamp.

## Non-Goals

- Implementing WebRTC playback authorization.
- Replacing GB28181 auth.
- Encrypting RTMP transport; TLS termination can be a separate deployment
  concern if RTMPS is needed.
