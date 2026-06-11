export type LoginSubmitResult = 'invalid' | 'captcha' | 'login'

interface RunLoginSubmitFlowOptions {
  captchaEnable: string
  validateForm: () => Promise<unknown>
  login: () => Promise<void>
  showCaptcha: () => void
}

export async function runLoginSubmitFlow({
  captchaEnable,
  validateForm,
  login,
  showCaptcha,
}: RunLoginSubmitFlowOptions): Promise<LoginSubmitResult> {
  try {
    const data = await validateForm()
    if (!data)
      return 'invalid'
  }
  catch {
    return 'invalid'
  }

  if (captchaEnable === 'false') {
    await login()
    return 'login'
  }

  showCaptcha()
  return 'captcha'
}

export function extractLoginErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!error || typeof error !== 'object')
    return fallbackMessage

  const record = error as Record<string, any>
  return record.response?.data?.message
    || record.data?.message
    || record.message
    || fallbackMessage
}
