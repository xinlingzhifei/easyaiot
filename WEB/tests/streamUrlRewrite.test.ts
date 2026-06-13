import * as assert from 'node:assert/strict'

import {
  convertRtmpToHttp,
  rewriteStreamHostToPageHost,
} from '../src/views/camera/utils/streamUrlRewrite'

function setPageLocation(url: string) {
  const page = new URL(url)
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: {
        protocol: page.protocol,
        host: page.host,
        hostname: page.hostname,
      },
      setTimeout,
      clearTimeout,
    },
  })
}

setPageLocation('https://eye.yfeiai.com/yfeieye/')

assert.equal(
  rewriteStreamHostToPageHost('http://192.168.0.88:8080/ai/demo.flv'),
  'https://eye.yfeiai.com/ai/demo.flv',
  'LAN AI HTTP-FLV stream URLs must be rewritten to the public page host.',
)

assert.equal(
  convertRtmpToHttp('rtmp://192.168.0.88:1935/ai/demo'),
  'https://eye.yfeiai.com/ai/demo.flv',
  'LAN AI RTMP stream URLs must become browser-playable public HTTP-FLV URLs.',
)

assert.equal(
  rewriteStreamHostToPageHost('http://media.example.com:8080/live/demo.flv'),
  'http://media.example.com:8080/live/demo.flv',
  'Non-private remote stream hosts should be left untouched for cluster playback.',
)
