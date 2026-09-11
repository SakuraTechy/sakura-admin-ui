import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { compileFunction } from 'node:vm'
import { fileURLToPath } from 'node:url'

// 运行真实 Vue setup/computed 与数据映射，只替换网络和宿主渲染，不依赖新增测试框架。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const Vue = require('vue')
const { parse, compileScript } = require('vue/compiler-sfc')

const dir = path.join(root, 'src/views/automation/automationUiScene')
function load(source, mocks = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  compileFunction(output, ['require', 'module', 'exports'])((name) => mocks[name] ?? require(name), module, module.exports)
  return module.exports
}
const execution = load(fs.readFileSync(path.join(dir, 'execution.ts'), 'utf8'))
const selection = load(fs.readFileSync(path.join(dir, 'executionSelectionState.ts'), 'utf8'), { './execution': execution })
const queryCache = load(fs.readFileSync(path.join(dir, 'queryCache.ts'), 'utf8'), { '@/apis/automation/automationUiQuery': {} })
const filename = path.join(dir, 'components/AutomationExecutionCaseSelectModal.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'execution-case-selection-regression' })
const renderer = Vue.createRenderer({
  createElement: (tag) => ({ tag, children: [] }),
  createText: (text) => ({ text }),
  createComment: (text) => ({ text }),
  insert: (child, parent) => parent.children.push(child),
  remove() {},
  patchProp() {},
  setText() {},
  setElementText() {},
  parentNode: () => null,
  nextSibling: () => null,
})
function mount(options = {}) {
  const requests = []
  const errors = []
  const next = []
  const live = Vue.reactive([])
  const api = {
    getAutomationUiExecutionCaseHistory: async (query, page, size, signal) => {
      requests.push({ ...query, page, size, signal })
      const list = await (options.history?.(query, signal) ?? [])
      return { data: { list, total: list.length } }
    },
    getAutomationUiExecutions: async (query, signal) => {
      requests.push({ ...query, signal })
      const list = await (options.batches?.(query, signal) ?? [])
      return { data: { list, total: list.length } }
    },
  }
  const component = load(`import { ref, computed, reactive, watch, onBeforeUnmount } from 'vue'\n${script.content}`, {
    '@arco-design/web-vue': { Message: { error: (message) => errors.push(message) } },
    '@/apis/automation/automationUiQuery': api,
    '../execution': execution,
    '../executionSelectionState': selection,
    '../queryCache': {
      ...queryCache,
      loadAutomationUiExecutionSelectionScene: options.definition || (async (id, base) => base),
    },
  }).default
  component.render = () => null
  const app = renderer.createApp(component, { liveExecutions: live, onNext: (value) => next.push(value) })
  const instance = app.mount({ children: [] })
  return { state: instance.$.setupState, requests, errors, next, live, close: () => app.unmount() }
}
const caseDef = (id) => ({ id, name: id, stepList: [{ id: `${id}-step`, status: 1 }] })
const scene = (id = '9223372036854775001', key = 'business-scene') => ({
  id,
  sceneId: key,
  name: key,
  __definitionLoaded: true,
  caseList: [caseDef('case-001')],
})
const stored = (overrides = {}) => ({
  caseExecutionDbId: '901',
  executionDbId: '801',
  caseExecutionKey: 'runner-case-001',
  status: 'completed',
  result: 'passed',
  durationMs: 1250,
  startedAt: '2026-09-01T10:00:00+08:00',
  finishedAt: '2026-09-01T10:00:01.250+08:00',
  createTime: '2026-09-01T09:59:59+08:00',
  ...overrides,
})
const liveRow = (overrides = {}) => ({
  batchId: 'new-batch',
  executionId: 'live-case',
  executionType: 'playwright-runner',
  caseId: 'case-001',
  caseName: 'case-001',
  stepTotal: 1,
  status: 'running',
  recordSource: 'debug',
  sceneKey: '9223372036854775001',
  startedAt: Date.parse('2026-09-02T10:00:00+08:00'),
  ...overrides,
})
const displayed = (row) => [
  selection.selectionStatusLabel(row.executeStatus),
  execution.executionAggregateResultLabel(row.lastResult),
  execution.formatExecutionDuration(row.duration),
  row.executionId,
]
function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

for (const [engine, result, duration, key] of [
  ['playwright-runner', 'passed', 1250, 'runner-case-001'],
  ['extension-cdp', 'failed', 2500, 'cdp-case-001'],
]) {
  test(`${engine}：按数据库 ID、引擎和计划查询并展示正确的四列`, async () => {
    const modal = mount({ history: (query) => {
      assert.equal(query.executionEngine, engine)
      return [stored({ result, durationMs: duration, caseExecutionKey: key })]
    } })
    try {
      await modal.state.onOpen(scene(), engine, { recordSource: 'test', testPlanId: '77', testReportId: '88' })
      assert.deepEqual(displayed(modal.state.filteredRows[0]), ['已完成', result === 'passed' ? '全部通过' : '不通过', `${duration / 1000} s`, key])
      assert.equal(modal.requests[0].sceneDbId, '9223372036854775001')
      assert.equal(modal.requests[0].testPlanId, '77')
      assert.equal(modal.requests[0].testReportId, '88')
      assert.equal(modal.requests[0].recordSource, 'test')
      assert.equal(modal.requests[0].page, 1)
      assert.equal(modal.requests[0].size, 1)
      assert.deepEqual(modal.errors, [])
    } finally {
      modal.close()
    }
  })
}

test('空历史不读取旧的场景汇总，也不标记为排队中', async () => {
  const modal = mount()
  try {
    await modal.state.onOpen({ ...scene(), executeStatus: 'passed', executeResult: 'passed', duration: 9999, executionId: 'other-engine' }, 'extension-cdp')
    assert.deepEqual(displayed(modal.state.filteredRows[0]), ['未执行', '未执行', '-', '-'])
    modal.state.statusFilter = '未执行'
    assert.equal(modal.state.filteredRows.length, 1)
    modal.state.statusFilter = '排队中'
    assert.equal(modal.state.filteredRows.length, 0)
  } finally {
    modal.close()
  }
})

test('真实排队记录不把创建时间当作运行耗时', async () => {
  const modal = mount({ history: () => [stored({ status: 'queued', result: 'not_executed', startedAt: undefined, finishedAt: undefined, durationMs: 0 })] })
  try {
    await modal.state.onOpen(scene(), 'playwright-runner')
    assert.deepEqual(displayed(modal.state.filteredRows[0]), ['排队中', '未执行', '0 ms', 'runner-case-001'])
  } finally { modal.close() }
})

test('同名用例按场景隔离，实时状态兼容数据库/业务 ID 并隔离引擎和计划', async () => {
  const modal = mount({ history: (query) => [stored({ caseExecutionKey: `history-${query.sceneDbId}` })] })
  try {
    await modal.state.onOpen({ __planAggregate: true, __planScenes: [scene('101', 'scene-a'), scene('102', 'scene-b')] }, 'playwright-runner', { recordSource: 'test', testPlanId: '77' })
    modal.live.push(
      liveRow({ sceneKey: '101', recordSource: 'test', testPlanId: '77', executionId: 'matched-db-id', status: 'skipped', durationMs: 1400 }),
      liveRow({ sceneKey: 'scene-b', recordSource: 'test', testPlanId: '77', executionId: 'matched-business-id', status: 'failed', durationMs: 2400 }),
      liveRow({ sceneKey: '101', executionType: 'extension-cdp', recordSource: 'test', testPlanId: '77', executionId: 'wrong-engine' }),
      liveRow({ sceneKey: '101', recordSource: 'test', testPlanId: '78', executionId: 'wrong-plan' }),
      liveRow({ sceneKey: '101', recordSource: 'debug', executionId: 'wrong-source' }),
      liveRow({ sceneKey: undefined, recordSource: 'test', testPlanId: '77', executionId: 'missing-scene' }),
    )
    assert.deepEqual(displayed(modal.state.filteredRows[0]), ['已完成', '跳过', '1.4 s', 'matched-db-id'])
    assert.deepEqual(displayed(modal.state.filteredRows[1]), ['已完成', '不通过', '2.4 s', 'matched-business-id'])
  } finally { modal.close() }
})

test('阻塞、跳过、取消和未执行的结果筛选互不混淆', async () => {
  const results = ['blocked', 'skipped', 'cancelled', 'not_executed']
  const modal = mount({ history: (query) => [stored({ result: results[Number(query.caseId)] })] })
  try {
    await modal.state.onOpen({ ...scene(), caseList: results.map((_, index) => caseDef(String(index))) }, 'extension-cdp')
    for (const label of ['阻塞', '跳过', '已取消', '未执行']) {
      modal.state.resultFilter = label
      assert.equal(modal.state.filteredRows.length, 1, label)
      assert.equal(displayed(modal.state.filteredRows[0])[1], label)
    }
  } finally { modal.close() }
})

test('活动执行随时钟增长，结束、跳过和取消后耗时冻结且不借用旧任务耗时', async () => {
  const modal = mount({ history: () => [stored()] })
  try {
    await modal.state.onOpen(scene(), 'playwright-runner')
    const active = liveRow()
    modal.live.push(active)
    modal.state.clock = active.startedAt + 3500
    assert.equal(modal.state.filteredRows[0].duration, 3500)
    modal.state.clock += 1000
    assert.equal(modal.state.filteredRows[0].duration, 4500)
    for (const status of ['passed', 'failed', 'skipped', 'cancelled']) {
      modal.live[0] = { ...active, status, durationMs: 3600 }
      const row = modal.state.filteredRows[0]
      assert.equal(row.duration, 3600, status)
      modal.state.clock += 1000
      assert.equal(modal.state.filteredRows[0].duration, 3600)
      assert.equal(modal.state.filteredRows[0].lastResult, status)
    }
    modal.live[0] = { ...active, status: 'queued', startedAt: undefined, durationMs: undefined }
    assert.equal(modal.state.filteredRows[0].duration, undefined)
  } finally { modal.close() }
})

test('旧实时终态不能覆盖更新的持久化记录，同执行的落库终态不回退', async () => {
  const modal = mount({ history: () => [stored()] })
  try {
    await modal.state.onOpen(scene(), 'playwright-runner')
    modal.live.push(liveRow({ startedAt: Date.parse('2026-08-01'), status: 'failed', executionId: 'old-live' }))
    assert.equal(modal.state.filteredRows[0].executionId, 'runner-case-001')
    modal.live[0] = liveRow({ executionId: 'runner-case-001' })
    assert.equal(modal.state.filteredRows[0].executeStatus, 'completed')
  } finally { modal.close() }
})

test('场景模式按引擎读取批次，不能拿用例编号或其他引擎汇总代替', async () => {
  const modal = mount({ batches: () => [{ ...stored(), executionKey: 'execution-key', batchId: 'scene-batch' }] })
  try {
    await modal.state.onOpen(scene(), 'extension-cdp', { sceneSelection: true })
    assert.deepEqual(displayed(modal.state.filteredRows[0]), ['已完成', '全部通过', '1.25 s', 'scene-batch'])
    assert.equal(modal.requests[0].executionEngine, 'extension-cdp')
    assert.deepEqual(modal.requests[0].sort, ['createTime,desc'])
    modal.state.nextStep()
    assert.deepEqual(modal.next[0].sceneIds, ['business-scene'])
  } finally { modal.close() }
})

test('投影分页加载各页最新记录，跨页选择和下一步用例保持一致', async () => {
  const modal = mount({
    definition: async (_id, base, _signal, options) => ({ ...base, __projectedDefinition: true, __projectedCasePage: options.projectedPage, __projectedCasePageSize: options.projectedPageSize, __caseTotal: 40, caseList: [{ id: `page-${options.projectedPage}`, name: 'projected', stepCount: 3, __stepCount: 3 }] }),
    history: (query) => [stored({ caseExecutionKey: `execution-${query.caseId}` })],
  })
  try {
    await modal.state.onOpen({ ...scene(), __definitionLoaded: false }, 'playwright-runner')
    modal.state.selectFilteredCases()
    await modal.state.loadProjectedCasePage(2, 20)
    assert.equal(modal.state.filteredRows[0].executionId, 'execution-page-2')
    modal.state.selectFilteredCases()
    modal.state.nextStep()
    assert.deepEqual(modal.next[0].caseIds, ['page-1', 'page-2'])
    assert.deepEqual(modal.next[0].scene.caseList.map((item) => item.id), ['page-1', 'page-2'])
    assert.equal(modal.requests.length, 2)
  } finally { modal.close() }
})

test('快速切换引擎或关闭时中止旧请求，迟到响应不污染新页面', async () => {
  const pending = deferred()
  const modal = mount({ history: (query) => query.executionEngine === 'playwright-runner' ? pending.promise : [stored({ caseExecutionKey: 'new-cdp' })] })
  try {
    const oldOpen = modal.state.onOpen(scene(), 'playwright-runner')
    await modal.state.onOpen(scene(), 'extension-cdp')
    assert.equal(modal.requests[0].signal.aborted, true)
    pending.resolve([stored({ caseExecutionKey: 'old-runner' })])
    await oldOpen
    assert.equal(modal.state.filteredRows[0].executionId, 'new-cdp')
    modal.state.visible = false
    await Vue.nextTick()
    assert.equal(modal.requests[1].signal.aborted, true)
    assert.deepEqual(modal.errors, [])
  } finally { modal.close() }
})

test('历史读取失败明确提示而不是展示伪造的未执行状态', async () => {
  const modal = mount({ history: async () => {
    throw new Error('history unavailable')
  } })
  try {
    await modal.state.onOpen(scene(), 'playwright-runner')
    assert.deepEqual(modal.errors, ['history unavailable'])
    assert.equal(modal.state.filteredRows.length, 0)
    assert.equal(modal.state.loading, false)
  } finally { modal.close() }
})

test('缺少时间的终态不无限增长，墙钟耗时优先且零值安全', () => {
  const state = selection.caseSelectionExecution(stored({ wallClockDurationMs: 1800, durationMs: 200 }))
  assert.equal(selection.selectionDuration(state, Date.now()), 1800)
  const noFinish = selection.caseSelectionExecution(stored({ finishedAt: undefined, durationMs: undefined }))
  assert.equal(selection.selectionDuration(noFinish, Date.now()), undefined)
  const zero = selection.caseSelectionExecution(stored({ startedAt: undefined, finishedAt: undefined, durationMs: 0 }))
  assert.equal(selection.selectionDuration(zero, Date.now()), 0)
})
