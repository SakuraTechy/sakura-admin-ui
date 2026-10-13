import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { compileFunction } from 'node:vm'
import ts from 'typescript'
import { computed, ref, shallowRef } from 'vue'
import { parse } from 'vue/compiler-sfc'

// 提取组件中的真实加载、筛选、分页和执行选择逻辑，避免在测试中复制业务实现。
const filename = new URL('../src/views/test/testPlan/components/TestPlanSceneWorkspace.vue', import.meta.url)
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'))
const source = ts.createSourceFile('workspace.tsx', descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const names = [
  'ALL_HISTORY_SCENES',
  'historyScenes',
  'historySceneOptions',
  'displayHistoryScenes',
  'buildPlanRecord',
  'mapPlanSceneSummary',
  'selectedUserLabel',
  'containsIgnoreCase',
  'matchesPlanSceneQuery',
  'loadPlanSceneRows',
  'loadPlanScenePage',
  'selectedRows',
  'resolveExecutionType',
  'onBatchExecutionSelect',
]
const extractDeclarations = (ast, names) => names.map((name) => {
  const statement = ast.statements.find((item) => ts.isVariableStatement(item)
    && item.declarationList.declarations.some((declaration) => declaration.name.getText(ast) === name))
  assert.ok(statement, `组件必须保留 ${name}`)
  return statement.getText(ast)
}).join('\n')
const declarations = extractDeclarations(source, names)

function harness(initialSummaries) {
  const summaries = [...initialSummaries]
  const ids = { value: summaries.map((summary) => summary.sceneDbId) }
  const query = {}
  const requests = []
  const events = []
  const context = {
    computed,
    selectedKeys: ref([]),
    tableData: shallowRef([]),
    executionTypeOptions: ['playwright-runner', 'extension-cdp', 'jenkins'].map((value) => ({ value })),
    emit: (...args) => events.push(args),
    historySceneSummaries: shallowRef(summaries),
    historySceneKey: ref('all'),
    props: { plan: { id: 'plan-1' } },
    planSceneIds: ids,
    planSceneRowsCache: shallowRef([]),
    queryForm: query,
    moduleId: { value: undefined },
    uiStore: { userList: [] },
    AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT: 10,
    toIdString: String,
    ensurePlanSceneIds: async () => ids.value,
    pickPlanExecuteField: (row, field) => row[field],
    Message: { error: (message) => assert.fail(message) },
    mapWithConcurrency: async (chunks, concurrency, callback) => Promise.all(chunks.map(callback)),
    getAutomationUiSceneSummaries: async (chunk, scope) => {
      requests.push({ chunk, scope })
      return { data: summaries.filter((summary) => chunk.includes(summary.sceneDbId)).reverse() }
    },
  }
  const output = ts.transpileModule(`
    let planSceneRowsCacheKey = ''
    let sceneRequestGeneration = 0
    let latestScenePageResult = { data: { list: [], total: 0 } }
    ${declarations}
    return { loadPlanSceneRows, loadPlanScenePage, historySceneOptions, displayHistoryScenes, selectedRows, onBatchExecutionSelect }
  `, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const functions = compileFunction(output, Object.keys(context))(...Object.values(context))
  return { ...functions, summaries, ids, query, requests, events, selectedKeys: context.selectedKeys, tableData: context.tableData, historySceneSummaries: context.historySceneSummaries, historySceneKey: context.historySceneKey }
}

const parentFilename = new URL('../src/views/test/testPlan/index.vue', import.meta.url)
const parentScript = parse(fs.readFileSync(parentFilename, 'utf8')).descriptor.scriptSetup.content
const parentSource = ts.createSourceFile('plan.tsx', parentScript, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const parentDeclarations = extractDeclarations(parentSource, [
  'buildPlanExecutionScene',
  'openNextPlanCaseSelection',
  'loadExecutionSelectionScenes',
  'onBatchExecuteScene',
])

function executionHarness() {
  const opened = []
  const legacy = []
  const loadedIds = []
  const context = {
    toIdString: String,
    activeExecutionTabKey: ref(''),
    pendingHistorySceneId: ref(''),
    planCaseExecutionQueue: ref([]),
    planCaseExecutionMode: ref(false),
    planCaseExecutionSceneIds: ref([]),
    executionCaseSelectModalRef: { value: { onOpen: (...args) => opened.push(args) } },
    executeSceneModalRef: { value: { onOpen: (...args) => legacy.push(args) } },
    Message: { warning: (message) => assert.fail(message) },
    mapWithConcurrency: async (items, concurrency, callback) => Promise.all(items.map(callback)),
    loadAutomationUiExecutionSelectionScene: async (id, row) => {
      loadedIds.push(id)
      assert.equal(row.id, id)
      return { ...row, __caseTotal: 1, caseList: [{ id: `${id}-case`, stepList: [{ id: 'step-1', status: 1 }] }] }
    },
  }
  const output = ts.transpileModule(`${parentDeclarations}\nreturn { onBatchExecuteScene }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  const functions = compileFunction(output, Object.keys(context))(...Object.values(context))
  return { ...functions, opened, legacy, loadedIds, sceneIds: context.planCaseExecutionSceneIds }
}

const scene = (number, overrides = {}) => ({
  // 数据库主键顺序刻意与业务场景 ID 相反。
  sceneDbId: String(1000 - number),
  sceneKey: `AAS_DBSG_SMOKE_${String(number).padStart(3, '0')}`,
  projectDbId: 'project-1',
  name: `场景 ${number}`,
  versionDbId: number % 2 ? 'v1' : 'v2',
  updateTime: `2026-10-${String(number).padStart(2, '0')}T10:00:00+08:00`,
  ...overrides,
})
const keys = (rows) => rows.map((row) => row.sceneId)

test('关联场景按业务场景 ID 升序，不按更新时间、数据库主键或关联顺序排序', async () => {
  const order = [3, 5, 1, 4, 6, 7, 8, 11, 12, 14]
  const app = harness(order.map((number) => scene(number)))
  const rows = await app.loadPlanSceneRows(false)
  assert.deepEqual(keys(rows), [1, 3, 4, 5, 6, 7, 8, 11, 12, 14].map((number) => scene(number).sceneKey))
  assert.deepEqual(app.ids.value, order.map((number) => scene(number).sceneDbId), '展示排序不修改关联和执行范围')
  assert.ok(app.requests.every(({ scope }) => scope.recordSource === 'test' && scope.testPlanId === 'plan-1'))
})

test('26 条场景先全局排序再分页，缓存命中和筛选后仍保持升序', async () => {
  const ordered = Array.from({ length: 26 }, (_, index) => scene(index + 1))
  const app = harness([...ordered.slice(13), ...ordered.slice(0, 13)])
  const pages = []
  for (let page = 1; page <= 3; page++) {
    const { data } = await app.loadPlanScenePage({ page, size: 10 })
    assert.equal(data.total, 26)
    pages.push(...data.list)
  }
  assert.deepEqual(keys(pages), ordered.map((summary) => summary.sceneKey))
  assert.equal(app.requests.length, 3, '跨页复用已排序缓存，不重复读取摘要')
  app.query.versionId = 'v1'
  const { data } = await app.loadPlanScenePage({ page: 2, size: 10 })
  assert.equal(data.total, 13)
  assert.deepEqual(keys(data.list), [21, 23, 25].map((number) => scene(number).sceneKey))
})

test('重新关联与强制刷新后仍按场景 ID 排序，更新时间变化不改变位置', async () => {
  const app = harness([scene(3), scene(1)])
  await app.loadPlanSceneRows(false)
  app.summaries.push(scene(2))
  app.ids.value.push(scene(2).sceneDbId)
  const expected = [1, 2, 3].map((number) => scene(number).sceneKey)
  assert.deepEqual(keys(await app.loadPlanSceneRows(false)), expected)
  app.summaries[0].updateTime = '2026-10-31T10:00:00+08:00'
  assert.deepEqual(keys(await app.loadPlanSceneRows(true)), expected)
})

test('执行历史下拉按场景 ID 升序，全部场景置顶，场景名称和数据库主键不影响顺序', () => {
  const summaries = [scene(3, { name: 'AAA' }), scene(2, { name: 'ZZZ' }), scene(1, { name: 'MMM' })]
  const app = harness(summaries)
  const expected = [summaries[2], summaries[1], summaries[0]]
  assert.deepEqual(app.historySceneOptions.value, [
    { label: '全部场景', value: 'all' },
    ...expected.map((summary) => ({ label: `${summary.sceneKey} - ${summary.name}`, value: summary.sceneDbId })),
  ])
  assert.deepEqual(app.historySceneSummaries.value, summaries, '排序不修改原始场景摘要')
  app.historySceneKey.value = scene(2).sceneDbId
  assert.deepEqual(app.displayHistoryScenes.value.map((item) => item.sceneId), [scene(2).sceneKey], '选项值仍对应正确的数据库主键')
})

test('执行历史选项随摘要刷新重新排序，保留选中场景，空列表只显示全部场景', () => {
  const app = harness([scene(3), scene(1)])
  app.historySceneKey.value = scene(3).sceneDbId
  app.historySceneSummaries.value = [scene(4), scene(2), scene(3), scene(1)]
  assert.deepEqual(app.historySceneOptions.value.map((option) => option.value), ['all', ...[1, 2, 3, 4].map((number) => scene(number).sceneDbId)])
  assert.equal(app.historySceneKey.value, scene(3).sceneDbId)
  assert.deepEqual(app.displayHistoryScenes.value.map((item) => item.sceneId), [scene(3).sceneKey])
  app.historySceneSummaries.value = []
  assert.deepEqual(app.historySceneOptions.value, [{ label: '全部场景', value: 'all' }])
})

test('跨页勾选 4 个场景：返回首页后，批量事件、选择弹窗及执行范围均保留完整 4 个场景', async () => {
  const app = harness(Array.from({ length: 23 }, (_, index) => scene(index + 1)).reverse())
  app.tableData.value = (await app.loadPlanScenePage({ page: 1, size: 10 })).data.list
  app.selectedKeys.value = [3, 4, 5].map((number) => scene(number).sceneDbId)
  assert.equal(app.selectedRows.value.length, 3)
  app.tableData.value = (await app.loadPlanScenePage({ page: 3, size: 10 })).data.list
  app.selectedKeys.value.push(scene(23).sceneDbId)
  app.tableData.value = (await app.loadPlanScenePage({ page: 1, size: 10 })).data.list
  const expectedIds = [3, 4, 5, 23].map((number) => scene(number).sceneDbId)
  assert.equal(app.selectedKeys.value.length, 4)
  app.onBatchExecutionSelect('playwright-runner')
  const [event, rows, type] = app.events[0]
  assert.equal(event, 'batch-execute')
  assert.equal(rows.length, app.selectedKeys.value.length)
  assert.deepEqual(rows.map((row) => row.id), expectedIds)
  assert.equal(app.requests.length, 3, '批量选择复用完整缓存，不额外拉取摘要')
  const execution = executionHarness()
  await execution.onBatchExecuteScene({ key: 'plan-tab', record: { id: 'plan-1' } }, rows, type)
  assert.deepEqual(execution.loadedIds, expectedIds)
  assert.deepEqual(execution.sceneIds.value, expectedIds, '后续执行使用完整已选场景范围')
  assert.equal(execution.opened.length, 1)
  const [aggregate, executionType, options] = execution.opened[0]
  assert.equal(executionType, 'playwright-runner')
  assert.equal(aggregate.__planAggregate, true)
  assert.equal(aggregate.__planScenes.length, 4, '选择执行场景弹窗收到全部已选场景')
  assert.deepEqual(aggregate.__planScenes.map((row) => row.id), expectedIds)
  assert.deepEqual(options, { recordSource: 'test', testPlanId: 'plan-1', selectionDisabled: true })
})

test('跨页取消选择和清空及时生效，不带入未选场景，兼容数字和大整数字符串 ID', async () => {
  const largeId = '9223372036854775001'
  const app = harness([scene(1), scene(2), scene(3, { sceneDbId: largeId })])
  app.tableData.value = (await app.loadPlanScenePage({ page: 2, size: 1 })).data.list
  app.selectedKeys.value = [largeId, Number(scene(1).sceneDbId)]
  assert.deepEqual(keys(app.selectedRows.value), [scene(1).sceneKey, scene(3).sceneKey])
  app.selectedKeys.value = [largeId]
  app.onBatchExecutionSelect('extension-cdp')
  assert.deepEqual(app.events[0][1].map((row) => row.id), [largeId])
  assert.equal(app.events[0][2], 'extension-cdp')
  app.selectedKeys.value = []
  assert.deepEqual(app.selectedRows.value, [])
  app.onBatchExecutionSelect('invalid-engine')
  assert.equal(app.events.length, 1)
})

test('Jenkins 批量入口同样接收跨页已选场景，原有执行模式和计划上下文不变', async () => {
  const app = harness(Array.from({ length: 23 }, (_, index) => scene(index + 1)))
  app.tableData.value = (await app.loadPlanScenePage({ page: 2, size: 10 })).data.list
  app.selectedKeys.value = [23, 12, 2].map((number) => scene(number).sceneDbId)
  app.onBatchExecutionSelect('jenkins')
  const [, rows, type] = app.events[0]
  const execution = executionHarness()
  await execution.onBatchExecuteScene({ key: 'plan-tab', record: { id: 'plan-1' } }, rows, type)
  assert.equal(execution.legacy.length, 1)
  assert.deepEqual(execution.legacy[0][0].map((row) => row.id), [2, 12, 23].map((number) => scene(number).sceneDbId))
  assert.deepEqual(execution.legacy[0][1], { mode: 'selected', source: 'plan', testPlanId: 'plan-1' })
  assert.deepEqual(execution.opened, [])
})
