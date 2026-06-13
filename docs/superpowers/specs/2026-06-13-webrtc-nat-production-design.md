# WebRTC NAT Production Design

## Goal

Make browser WebRTC playback reliable from public clients across LAN, mobile
hotspot, and cross-carrier networks.

## Required Capabilities

Media node config:

- STUN server.
- TURN server with credential rotation.
- Public candidate IP or domain rewrite.
- HTTPS/WSS endpoint for browser playback.
- Per-media-node public URL metadata exposed to the platform.

Platform config:

- Store STUN/TURN server config per environment.
- Store public media-node hostnames and candidate rewrite values.
- Surface WebRTC readiness and failure reasons in the device access state
  center.

Browser playback:

- Use HTTPS page origin.
- Use WSS signaling or media-node HTTPS APIs as required by the selected media
  server.
- Report candidate, ICE, and peer-connection failures with enough reason data
  for debugging.

## Acceptance

- HTTP-FLV playback works from a public browser over HTTPS.
- WebRTC playback works from:
  - same LAN
  - mobile hotspot
  - second carrier network
- ICE candidate list contains the expected public candidate, not private-only
  addresses.
- TURN relay is used when direct UDP is blocked.
- Failure state records whether the blocker is certificate, WSS, STUN, TURN,
  candidate rewrite, media-node offline, or stream offline.

## Verification

Run smoke checks from at least three networks:

- Office/LAN.
- Mobile hotspot.
- Cross-carrier remote client.

For each check capture:

- Page URL.
- Browser console result.
- ICE connection state.
- Selected candidate pair.
- Media node id.
- Device id.
- Timestamp.

## Non-Goals

- Replacing the Edge Agent outbound RTSP slice.
- Signed RTMP ingest enforcement.
- Full player UI redesign.
