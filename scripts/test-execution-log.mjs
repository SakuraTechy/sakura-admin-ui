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
const filename = path.join(root, 'src/views/automation/automationUiScene/components/AutomationExecutionLogViewer.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'execution-log-regression' })
const renderer = Vue.createRenderer({
  createElement: tag => ({ tag, children: [] }), createText: text => ({ text }), createComment: text => ({ text }),
  insert: (child, parent) => parent.children.push(child), remove() {}, patchProp() {}, setText() {}, setElementText() {},
  parentNode: () => null, nextSibling: () => null,
})
const failure = '变量预检失败：第 6 步引用了未定义变量 {{passwd}}。请先添加保存变量步骤，或修正变量名。'
const originalLogs = [
  { sequence: 1, timestamp: '2026-09-08T06:45:19.745Z', level: 'info', phase: 'runner', message: 'CDP 任务开始', detail: false },
  { sequence: 2, timestamp: '2026-09-08T06:45:19.827Z', level: 'error', phase: 'runner', message: `CDP 执行失败，耗时 82ms：${failure}`, detail: false },
]

function mount(props, fetcher = async () => { throw new Error('未模拟的网络请求') }) {
  const mocks = {
    vue: Vue,
    '@vueuse/core': { onKeyStroke() {}, useResizeObserver() {}, useFullscreen: () => ({ isFullscreen: Vue.ref(false), toggle() {} }) },
    '@/apis/automation/automationUiQuery': { getAutomationUiExecutionArtifacts: async () => ({ data: { list: [] } }) },
    '@/apis/automation/automationPlaywrightRunner': { getAutomationPlaywrightRunnerJob: async () => { throw new Error('RUNNER_JOB_NOT_FOUND') } },
    '@/utils/auth': { getToken: () => '' },
  }
  const source = `import { ref, computed, watch, onUnmounted, nextTick, shallowRef } from 'vue'\n${script.content}`
    .replaceAll('import.meta.env', '({})')
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  compileFunction(output, ['require', 'module', 'exports', 'window', 'fetch', 'requestAnimationFrame'])(
    name => mocks[name] ?? require(name), module, module.exports, { setTimeout, clearTimeout }, fetcher, callback => callback(),
  )
  const component = module.exports.default
  component.render = () => null
  const reactiveProps = Vue.reactive(props)
  let instance
  const app = renderer.createApp({ setup: () => () => Vue.h(component, { ...reactiveProps, ref: value => { instance = value } }) })
  app.mount({ children: [] })
  return { props: reactiveProps, state: () => instance.$.setupState, close: () => app.unmount() }
}

async function flush() {
  await Vue.nextTick()
  await new Promise(resolve => setImmediate(resolve))
  await Vue.nextTick()
}

test('历史摘要保留用例级异常和真实耗时，不为跳过步骤伪造开始执行', async (t) => {
  const view = mount({ status: 'failed', executionId: 'RUN_1', fallbackContent: JSON.stringify({
    executor: 'extension-cdp', status: 'completed', result: 'failed', error: failure, duration_ms: 82,
    steps: Array.from({ length: 8 }, (_, index) => ({ step_index: index, status: 'skipped', description: `S${index + 1}` })),
  }) })
  t.after(view.close)
  await flush()
  const messages = view.state().logs.map(item => item.message)
  assert.ok(messages.some(message => message.includes(failure)))
  assert.ok(messages.some(message => message.includes('82ms')))
  assert.ok(!messages.some(message => message.includes('开始执行')))
});

test('结果内已有 execution_logs 时优先使用原始日志', async (t) => {
  const view = mount({ status: 'failed', executionId: 'RUN_1', fallbackContent: JSON.stringify({
    executor: 'extension-cdp', status: 'failed', execution_logs: originalLogs, steps: [],
  }) })
  t.after(view.close)
  await flush()
  assert.deepEqual(view.state().logs.map(item => item.message), originalLogs.map(item => item.message))
});

test('同一执行从实时切换到历史时保留异常，切换其他执行时隔离日志', async (t) => {
  const view = mount({ status: 'running', executionId: 'RUN_1', liveLogs: originalLogs, fallbackContent: '' })
  t.after(view.close)
  await flush()
  view.props.status = 'failed'
  view.props.liveLogs = []
  view.props.fallbackContent = JSON.stringify({ executor: 'extension-cdp', status: 'failed', steps: [] })
  await flush()
  assert.deepEqual(view.state().logs.map(item => item.message), originalLogs.map(item => item.message))
  view.props.executionId = 'RUN_2'
  view.props.fallbackContent = JSON.stringify({ executor: 'extension-cdp', status: 'passed', steps: [] })
  await flush()
  assert.ok(!view.state().logs.some(item => item.message.includes('passwd')))
});

test('刷新页面后从持久化 artifact 恢复原始异常日志，不使用步骤摘要', async (t) => {
  const urls = []
  const view = mount({ status: 'failed', executionId: 'RUN_1', artifactUrl: 'https://fixture.test/log.json',
    fallbackContent: JSON.stringify({ executor: 'extension-cdp', status: 'failed', steps: [] }),
  }, async (url) => {
    urls.push(url)
    return new Response(JSON.stringify(originalLogs), { headers: { 'Content-Type': 'application/json' } })
  })
  t.after(view.close)
  await flush()
  assert.deepEqual(urls, ['https://fixture.test/log.json'])
  assert.deepEqual(view.state().logs.map(item => item.message), originalLogs.map(item => item.message))
  assert.equal(view.state().logs[1].timestamp, originalLogs[1].timestamp)
});
