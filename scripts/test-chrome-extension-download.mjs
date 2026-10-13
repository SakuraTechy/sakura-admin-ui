import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { compileFunction } from 'node:vm'
import ts from 'typescript'

const filename = new URL('../src/views/automation/automationUiScene/components/ChromeRecordingModal.vue', import.meta.url)
const source = readFileSync(filename, 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const ast = ts.createSourceFile('ChromeRecordingModal.ts', source, ts.ScriptTarget.Latest, true)
const declaration = ast.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((item) => item.name.getText(ast) === 'downloadExtension')
const compiled = ts.transpileModule(`return (${declaration.initializer.getText(ast)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText
const downloadUrl = 'https://files.example.test/file/2026/9/16/random-storage-name.zip'
const zip = new Uint8Array([0x50, 0x4B, 0x03, 0x04])

async function download({
  url = downloadUrl,
  files = [{ url: downloadUrl, name: 'sakura-cuecast', extension: 'zip' }],
  body = zip,
  contentType = 'application/zip',
  status = 200,
  queryError,
} = {}) {
  const state = { queries: [], queryConfigs: [], fetches: [], downloads: [], errors: [], warnings: [], revoked: [] }
  const run = compileFunction(compiled, ['extensionDownloadUrl', 'listFile', 'fetch', 'Message', 'document', 'URL', 'window'])(
    url,
    async (query, config) => {
      state.queries.push(query)
      state.queryConfigs.push(config)
      if (queryError) throw new Error(queryError)
      return { data: { list: files } }
    },
    async (requestUrl) => {
      state.fetches.push(requestUrl)
      return new Response(body, { status, headers: { 'content-type': contentType } })
    },
    { error: (message) => state.errors.push(message), warning: (message) => state.warnings.push(message) },
    {
      createElement: () => ({
        style: {},
        click() { state.downloads.push(this.download) },
      }),
      body: { appendChild() {}, removeChild() {} },
    },
    class extends URL {
      static createObjectURL() { return 'blob:test' }
      static revokeObjectURL(value) { state.revoked.push(value) }
    },
    { location: { href: 'https://admin.example.test/' }, setTimeout: (callback) => callback() },
  )
  await run()
  return state
}

test('按 URL 精确查询，下载名使用文件记录的 name 和 extension', async () => {
  const state = await download()
  assert.deepEqual(state.queries, [{ url: downloadUrl, page: 1, size: 1, sort: ['createTime,desc'] }])
  assert.deepEqual(state.queryConfigs, [{ silentError: true }])
  assert.deepEqual(state.fetches, [downloadUrl])
  assert.deepEqual(state.downloads, ['sakura-cuecast.zip'])
  assert.deepEqual(state.errors, [])
  assert.deepEqual(state.revoked, ['blob:test'])
})

test('保留中文名称，已有扩展名时不重复追加，缺少扩展名时使用 zip', async () => {
  for (const [name, extension, expected] of [
    ['录制扩展', 'zip', '录制扩展.zip'],
    ['sakura-cuecast.ZIP', 'zip', 'sakura-cuecast.ZIP'],
    ['sakura-cuecast', '', 'sakura-cuecast.zip'],
  ]) {
    const state = await download({ files: [{ url: downloadUrl, name, extension }] })
    assert.deepEqual(state.downloads, [expected])
  }
})

test('记录缺失、URL 不匹配或名称为空时回退到 URL 末段', async () => {
  for (const files of [
    [],
    [{ url: `${downloadUrl}.other`, name: 'wrong-file', extension: 'zip' }],
    [{ url: downloadUrl, name: ' ', extension: 'zip' }],
  ]) {
    const state = await download({ files })
    assert.deepEqual(state.fetches, [downloadUrl])
    assert.deepEqual(state.downloads, ['random-storage-name.zip'])
    assert.deepEqual(state.errors, [])
  }
})

test('查询失败时静默回退到 URL 末段并继续下载', async () => {
  const state = await download({ queryError: '拒绝访问(403)' })
  assert.deepEqual(state.fetches, [downloadUrl])
  assert.deepEqual(state.downloads, ['random-storage-name.zip'])
  assert.deepEqual(state.queryConfigs, [{ silentError: true }])
  assert.deepEqual(state.errors, [])
})

test('URL 回退保留解码、剔除查询参数、相对地址和默认名称的原有行为', async () => {
  for (const [url, expected] of [
    ['https://files.example.test/%E5%BD%95%E5%88%B6.zip?token=test#download', '录制.zip'],
    ['/file/cuecast.zip?download=true', 'cuecast.zip'],
    ['https://files.example.test/file/', 'cuecast-extension.zip'],
  ]) {
    const state = await download({ url, files: [] })
    assert.deepEqual(state.downloads, [expected])
    assert.deepEqual(state.errors, [])
  }
})

test('仍然拒绝 HTTP 错误和伪装成成功响应的 XML、JSON、非 ZIP 内容', async () => {
  for (const response of [
    { status: 404 },
    { body: '<R><Msg>文件不存在</Msg></R>', contentType: 'application/xml' },
    { body: '{"success":false,"msg":"文件不存在"}', contentType: 'application/json' },
    { body: 'not-a-zip' },
    { body: '' },
  ]) {
    const state = await download(response)
    assert.deepEqual(state.downloads, [])
    assert.equal(state.errors.length, 1)
  }
})

test('未配置下载地址时不发起请求', async () => {
  const state = await download({ url: '' })
  assert.deepEqual(state.queries, [])
  assert.deepEqual(state.fetches, [])
  assert.equal(state.warnings.length, 1)
})
