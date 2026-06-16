export interface SamHealth {
  status: string
  engine?: string
  model_loaded?: boolean
  device?: string
  enabled?: boolean
  message?: string
}

function isSamHealth(value: unknown): value is SamHealth {
  return !!value && typeof value === 'object' && typeof (value as { status?: unknown }).status === 'string'
}

export function unwrapSamHealthPayload(responseOrBody: unknown): SamHealth {
  const body = ((responseOrBody as { data?: unknown })?.data ?? responseOrBody) as unknown
  const envelopeData = (body as { data?: unknown })?.data

  if (isSamHealth(envelopeData))
    return envelopeData
  if (isSamHealth(body))
    return body
  return { status: 'unknown' }
}

export function getSamHealthPayloadFromError(error: unknown): SamHealth | null {
  const body = (error as { response?: { data?: unknown } })?.response?.data

  if (!body)
    return null
  return unwrapSamHealthPayload(body)
}
