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
