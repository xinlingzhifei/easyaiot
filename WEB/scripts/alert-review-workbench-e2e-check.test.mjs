import { spawn } from 'node:child_process'

const result = await runScript(['--mode=invalid'])

if (result.code === 0) {
  throw new Error('expected invalid mode to fail')
}

if (!result.stderr.includes('unsupported alert review E2E mode')) {
  throw new Error(`expected unsupported mode message, got: ${result.stderr || result.stdout}`)
}

const realDrawerResult = await runScript(['--mode=dev-api-real-drawer'])
if (realDrawerResult.code !== 0) {
  throw new Error(`expected real drawer mode to pass, got: ${realDrawerResult.stderr || realDrawerResult.stdout}`)
}

console.log('alert-review-workbench-e2e-check.test OK')

function runScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/alert-review-workbench-e2e-check.mjs', ...args], {
      cwd: process.cwd(),
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('alert-review-workbench-e2e-check test timed out'))
    }, 45000)
    child.stdout.on('data', chunk => {
      stdout += chunk
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
    child.on('error', error => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', code => {
      clearTimeout(timeout)
      resolve({ code, stdout, stderr })
    })
  })
}
