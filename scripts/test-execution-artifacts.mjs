import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { compileFunction } from 'node:vm'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const Vue = require('vue')
const { parse, compileScript } = require('vue/compiler-sfc')

function evaluate(source, mocks = {}) {
  const compiled = ts.transpileModule(source.replaceAll('import.meta.env', '({VITE_API_PREFIX:"/api"})'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  compileFunction(compiled, ['require', 'module', 'exports'])((id) => mocks[id] ?? require(id), module, module.exports)
  return module.exports
}
const apiSource = fs.readFileSync(path.join(root, 'src/apis/automation/automationExecutionArtifact.ts'), 'utf8')
const contentUrl = (execution, artifact) => `/automation/executions/${execution}/artifacts/${artifact}/content`
const build = evaluate(fs.readFileSync(path.join(root, 'src/views/automation/automationUiScene/executionArtifacts.ts'), 'utf8'), {
  '@/apis/automation/automationUiQuery': { getAutomationUiExecutionArtifactContentUrl: contentUrl },
}).buildExecutionArtifacts
const context = (overrides = {}) => ({ rowKey: 'case-a', caseId: 'C1', executionId: 'RUN1', executionType: 'playwright-runner', recordTarget: { executionDbId: 'EX1' }, caseExecutionDbId: 'CASE1', artifactReportUrl: '', artifactTraceUrl: '', artifactScreenshotUrl: '', artifactVideoUrl: '', artifactUploadError: '-', executeStatus: 'passed', ...overrides })
function api(overrides = {}) {
  return evaluate(apiSource, { '@/utils/auth': { getToken: () => 'test-only-token' }, './automationUiQuery': { AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT: 50, ...overrides } })
}

test('产物目录完整分页并严格关联当前用例，不拿其他用例兜底', async () => {
  const calls = []
  const client = api({ getAutomationUiExecutionArtifacts: async (id, page, size) => {
    calls.push([id, page, size])
    return { data: { total: 51, list: page === 1 ? Array.from({ length: 50 }, (_, i) => ({ artifactDbId: i, caseExecutionDbId: 'OTHER' })) : [{ artifactDbId: 51, caseExecutionDbId: 'CASE1', artifactType: 'report' }] } }
  } })
  assert.deepEqual((await client.getExecutionCaseArtifacts('EX1', 'CASE1')).map((item) => item.artifactDbId), [51])
  assert.deepEqual(calls, [['EX1', 1, 50], ['EX1', 2, 50]])
})

test('目录空页停止，鉴权失败向上传递', async () => {
  assert.deepEqual(await api({ getAutomationUiExecutionArtifacts: async () => ({ data: { list: [], total: 99 } }) }).getExecutionCaseArtifacts(1, 2), [])
  await assert.rejects(api({ getAutomationUiExecutionArtifacts: async () => {
    throw new Error('403')
  } }).getExecutionCaseArtifacts(1, 2), /403/)
})

test('过期产物不回退旧链接，其他用例和批次级产物不混入', () => {
  const rows = build(context({ artifactReportUrl: '/old-report' }), [
    { artifactDbId: 1, caseExecutionDbId: 'CASE1', artifactType: 'report', expiresAt: '2020-01-01' },
    { artifactDbId: 2, caseExecutionDbId: 'OTHER', artifactType: 'trace' },
    { artifactDbId: 3, artifactType: 'screenshot' },
  ])
  assert.equal(rows[0].state, 'expired')
  assert.equal(rows[0].url, '')
  assert.equal(rows[1].url, '')
  assert.equal(rows[2].url, '')
})

test('新可用文件优先于旧过期文件，旧链接和 CDP 兼容', () => {
  assert.equal(build(context(), [
    { artifactDbId: 1, caseExecutionDbId: 'CASE1', artifactType: 'report', storageStatus: 'deleted' },
    { artifactDbId: 2, caseExecutionDbId: 'CASE1', artifactType: 'report_html', storageStatus: 'active' },
  ])[0].url, contentUrl('EX1', 2))
  assert.equal(build(context({ artifactTraceUrl: '/legacy-trace' }), [])[1].url, '/legacy-trace')
  assert.match(build(context({ executionType: 'extension-cdp', artifactVideoUrl: '/video' }), [])[3].reason, /不支持录屏/)
})

test('文件请求只向 API 来源发送 Token，拒绝协议注入及重定向', async (t) => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  globalThis.window = { location: { origin: 'https://admin.test' } }
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return new Response('<h1>report</h1>', { headers: { 'Content-Type': 'text/html' } })
  }
  t.after(() => {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  })
  const client = api()
  await client.getExecutionArtifactBlob('/automation/executions/1/artifacts/2/content')
  await client.getExecutionArtifactBlob('https://storage.test/file.png')
  assert.equal(calls[0].url, 'https://admin.test/api/automation/executions/1/artifacts/2/content')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-only-token')
  assert.equal(calls[0].options.redirect, 'error')
  assert.equal(calls[1].options.headers.Authorization, undefined)
  assert.equal(calls[1].options.credentials, 'omit')
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//other.test/file', 'https://user:pass@host.test/file']) assert.throws(() => client.resolveExecutionArtifactUrl(value))
})

test('JSON 业务错误、空文件和 HTTP 错误不能作为报告播放', async (t) => {
  const previousWindow = globalThis.window
  const previousFetch = globalThis.fetch
  globalThis.window = { location: { origin: 'https://admin.test' } }
  t.after(() => {
    globalThis.window = previousWindow
    globalThis.fetch = previousFetch
  })
  const client = api()
  for (const response of [new Response('{"code":1,"msg":"权限不足"}', { headers: { 'Content-Type': 'application/json' } }), new Response(''), new Response('', { status: 403 })]) {
    globalThis.fetch = async () => response
    await assert.rejects(client.getExecutionArtifactBlob('/file'))
  }
})

const filename = path.join(root, 'src/views/automation/automationUiScene/components/AutomationExecutionReportAssets.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'report-assets-test' })
const renderer = Vue.createRenderer({ createElement: (tag) => ({ tag, children: [] }), createText: (text) => ({ text }), createComment: (text) => ({ text }), insert: (child, parent) => parent.children.push(child), remove() {}, patchProp() {}, setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null })

test('切换执行时丢弃迟到内容，解除缓存并回收 Object URL', async (t) => {
  const originalWindow = globalThis.window
  globalThis.window = { setTimeout, location: { origin: 'https://admin.test' } }
  t.after(() => {
    globalThis.window = originalWindow
  })
  let complete
  const component = evaluate(script.content, {
    'vue': Vue,
    '@arco-design/web-vue': { Message: { warning() {}, info() {} } },
    '@/apis/automation/automationExecutionArtifact': { getExecutionCaseArtifacts: async () => [], getExecutionArtifactBlob: () => new Promise((resolve) => { complete = resolve }) },
    '../executionArtifacts': { buildExecutionArtifacts: build },
  }).default
  component.render = () => null
  const record = Vue.ref(context({ artifactReportUrl: '/first' }))
  let state
  const app = renderer.createApp({ render: () => Vue.h(component, { record: record.value, ref: (instance) => {
    if (instance) state = instance.$.setupState
  } }) })
  app.mount({ children: [] })
  t.after(() => app.unmount())
  const pending = state.loadArtifact(state.items[0])
  record.value = context({ rowKey: 'case-b', artifactReportUrl: '/second' })
  await Vue.nextTick()
  complete(new Blob(['<h1>old</h1>'], { type: 'text/html' }))
  await assert.rejects(pending, /切换/)
  assert.equal(state.objectUrls.report, undefined)
  const loaded = state.loadArtifact(state.items[0])
  complete(new Blob(['<h1>new</h1>'], { type: 'text/html' }))
  await loaded
  const objectUrl = state.objectUrls.report
  assert.match(objectUrl, /^blob:/)
  state.reset()
  assert.equal(state.objectUrls.report, undefined)
  await assert.rejects(fetch(objectUrl))
})
