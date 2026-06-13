# Device Access State Center Design

## Goal

Create one shared device-access state vocabulary across GB28181, direct RTSP,
Edge RTSP, RTMP push, HTTP-FLV playback, WebRTC playback, and AI readiness.

The state center should make every device row answer the same questions:

- Is configuration complete?
- Has the device or Edge Agent registered?
- Is the upstream stream online?
- Is a user-playable URL ready?
- Is the AI input stream ready?
- If not, what exact reason blocks it?

## Shared States

Use these states exactly:

- `pending_config`
- `registering`
- `registered`
- `stream_online`
- `play_ready`
- `ai_ready`
- `error`

## Protocol Writers

Each protocol path must have one writer into the shared state model:

- GB28181: SIP register, catalog/channel online, media publish hooks, playback
  URL readiness, PTZ capability.
- Direct RTSP: source validation, same-network pull readiness, media-node pull
  status, playback URL readiness.
- Edge RTSP: Agent register/heartbeat, command queued/leased/running/result,
  media-node RTMP publish hook, playback URL readiness.
- RTMP push: signed ingest URL issued, publish hook accepted/rejected,
  stream-online hook, playback URL readiness.
- HTTP-FLV/WebRTC: playback probe or media-node hook confirms public playback
  readiness.
- AI: AI stream URL exists and the AI consumer can pull it.

## Data Shape

Store state transitions with enough context for UI and audit:

- `device_id`
- `protocol`
- `state`
- `reason_code`
- `reason_message`
- `source_event`
- `event_time`
- `stream_id`
- `node_id`
- `tenant_id`

The current state can be materialized for fast UI reads, but transitions should
remain queryable for debugging.

## Acceptance

- GB28181, direct RTSP, Edge RTSP, and RTMP push each update the same state
  vocabulary.
- A device list can show state, reason, play readiness, AI readiness, and last
  transition time without protocol-specific branching.
- Error states include actionable reasons such as invalid RTSP URL, Agent
  offline, command failed, publish signature rejected, media node offline, or
  WebRTC candidate failure.
- Existing direct Agent deployment remains separate from Edge RTSP state
  transitions unless explicitly used by a device path.

## Non-Goals

- Replacing protocol-specific tables in the first pass.
- Redesigning the camera onboarding UI.
- Implementing signed RTMP ingest or TURN/STUN rollout; those have separate
  specs.
