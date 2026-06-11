import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const loginForm = readFileSync(resolve('src/views/base/login/LoginForm.vue'), 'utf8')

assert.match(
  loginForm,
  /@keypress\.enter="getCode"/,
  'Pressing Enter in the login form must use the same validation-before-captcha flow as the login button.',
)

assert.doesNotMatch(
  loginForm,
  /@keypress\.enter="handleLogin"/,
  'Pressing Enter must not call handleLogin directly because that bypasses captcha pre-validation and can show a login error before required-field validation.',
)
