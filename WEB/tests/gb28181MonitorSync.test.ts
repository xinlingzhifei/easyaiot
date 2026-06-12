import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sidebar = readFileSync(resolve('src/views/dashboard/monitor/components/Sidebar.vue'), 'utf8')
const compose = readFileSync(resolve('../DEVICE/docker-compose.yml'), 'utf8')
const gb28181Service = compose.match(/\n  iot-gb28181:\n[\s\S]*?(?=\n  [a-z0-9_-]+:|\nnetworks:|$)/)?.[0] ?? ''
const gatewayService = compose.match(/\n  iot-gateway:\n[\s\S]*?(?=\n  [a-z0-9_-]+:|\nnetworks:|$)/)?.[0] ?? ''

assert.match(
  sidebar,
  /skipSync:\s*false/,
  'The home monitor directory should allow the server to sync newly registered WVP GB28181 channels, otherwise added cameras stay invisible on the home page.',
)

assert.match(
  gb28181Service,
  /MEDIA_SDP_IP=1\.95\.118\.210/,
  'The GB28181 container should advertise the public server IP in SDP so internet cameras can send RTP back to ZLM.',
)

assert.doesNotMatch(
  gb28181Service,
  /MEDIA_SDP_IP=192\.168\./,
  'The GB28181 SDP address must not be a private LAN address in the public deployment.',
)

assert.doesNotMatch(
  gatewayService,
  /MEDIA_SDP_IP=/,
  'The media SDP address belongs on the GB28181 service, not on the gateway service.',
)
