import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const nginxConf = readFileSync(resolve('conf/nginx.conf'), 'utf8')

assert.match(
  nginxConf,
  /location\s+=\s+\/[\s\S]*?return\s+302\s+\/yfeieye\/;/,
  'The root URL should redirect to the deployed /yfeieye/ subpath.',
)

for (const dir of ['assets', 'static', 'resource']) {
  assert.match(
    nginxConf,
    new RegExp(`location\\s+\\^~\\s+/yfeieye/${dir}/[\\s\\S]*?try_files\\s+\\$uri\\s+=404;`),
    `/yfeieye/${dir}/ should serve static files from the built dist and return a real 404 when a file is missing.`,
  )
}

assert.match(
  nginxConf,
  /location\s+\^~\s+\/yfeieye\/[\s\S]*?try_files\s+\$uri\s+\$uri\/\s+\/index\.html;/,
  '/yfeieye/ deep links should fall back to the SPA index.html instead of returning a server 404.',
)
