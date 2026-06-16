import assert from 'node:assert/strict'
import test from 'node:test'

import { getSamHealthPayloadFromError, unwrapSamHealthPayload } from './samHealth'

test('SAM health keeps disabled 503 payload as a displayable status', () => {
  const health = getSamHealthPayloadFromError({
    response: {
      status: 503,
      data: {
        status: 'disabled',
        engine: 'sam3',
        model_loaded: false,
        device: 'cpu',
        enabled: false,
      },
    },
  })

  assert.deepEqual(health, {
    status: 'disabled',
    engine: 'sam3',
    model_loaded: false,
    device: 'cpu',
    enabled: false,
  })
})

test('SAM health unwraps both raw and API-envelope responses', () => {
  assert.deepEqual(unwrapSamHealthPayload({ data: { status: 'healthy', enabled: true } }), {
    status: 'healthy',
    enabled: true,
  })

  assert.deepEqual(
    unwrapSamHealthPayload({ data: { code: 0, msg: 'success', data: { status: 'healthy' } } }),
    { status: 'healthy' },
  )
})
