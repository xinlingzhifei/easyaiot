import * as assert from 'node:assert/strict'
import { runLoginSubmitFlow } from './loginSubmit'

async function testInvalidFormDoesNotShowCaptcha() {
  const events: string[] = []

  const result = await runLoginSubmitFlow({
    captchaEnable: 'true',
    validateForm: async () => {
      events.push('validate')
      throw new Error('invalid form')
    },
    login: async () => {
      events.push('login')
    },
    showCaptcha: () => {
      events.push('captcha')
    },
  })

  assert.equal(result, 'invalid')
  assert.deepEqual(events, ['validate'])
}

async function testValidFormShowsCaptchaAfterValidation() {
  const events: string[] = []

  const result = await runLoginSubmitFlow({
    captchaEnable: 'true',
    validateForm: async () => {
      events.push('validate')
      return { username: 'admin', password: 'admin123' }
    },
    login: async () => {
      events.push('login')
    },
    showCaptcha: () => {
      events.push('captcha')
    },
  })

  assert.equal(result, 'captcha')
  assert.deepEqual(events, ['validate', 'captcha'])
}

async function testValidFormLogsInWhenCaptchaDisabled() {
  const events: string[] = []

  const result = await runLoginSubmitFlow({
    captchaEnable: 'false',
    validateForm: async () => {
      events.push('validate')
      return { username: 'admin', password: 'admin123' }
    },
    login: async () => {
      events.push('login')
    },
    showCaptcha: () => {
      events.push('captcha')
    },
  })

  assert.equal(result, 'login')
  assert.deepEqual(events, ['validate', 'login'])
}

async function main() {
  await testInvalidFormDoesNotShowCaptcha()
  await testValidFormShowsCaptchaAfterValidation()
  await testValidFormLogsInWhenCaptchaDisabled()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
