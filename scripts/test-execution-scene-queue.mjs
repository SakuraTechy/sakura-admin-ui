import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { compileFunction } from 'node:vm'
import { fileURLToPath } from 'node:url'

// 运行三个真实组件的 setup 和执行循环，只替换接口及宿主渲染，不触发真实产品场景。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const Vue = require('vue')
const { parse, compileScript } = require('vue/compiler-sfc')

const dir = path.join(root, 'src/views/automation/automationUiScene')
globalThis.window = Object.assign(new EventTarget(), { setInterval, clearInterval, setTimeout, clearTimeout })
globalThis.localStorage = { getItem: () => null, setItem() {} }

function load(source, mocks = {}, fileName) {
  const output = ts.transpileModule(source, {
    fileName,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText
  const module = { exports: {} }
  compileFunction(output, ['require', 'module', 'exports'])((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name]
    if (name === '../useExecutionAutoFollow') return autoFollow
    if (name.endsWith('.vue')) return {}
    return require(name)
  }, module, module.exports)
  return module.exports
}
const read = (file) => fs.readFileSync(file, 'utf8')
const sakura = load(read(path.join(root, 'src/utils/sakura.ts')), { './log': {} })
const execution = load(read(path.join(dir, 'execution.ts')), { '@/utils/sakura': sakura })
const autoFollow = load(read(path.join(dir, 'useExecutionAutoFollow.ts')))
const selection = load(read(path.join(dir, 'executionSelectionState.ts')), { './execution': execution })
const summary = load(read(path.join(dir, 'sceneSummary.ts')), { './execution': execution })
const executionRun = load(read(path.join(dir, 'executionRun.ts')), { './sceneSummary': summary })
const runnerOptions = load(read(path.join(root, 'src/utils/playwrightRunner.ts')))
const sceneStatus = load(read(path.join(root, 'src/utils/automationUiSceneStatus.ts')))
const queryCache = load(read(path.join(dir, 'queryCache.ts')), { '@/apis/automation/automationUiQuery': {} })
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
function mount(name, mocks, props = {}) {
  const filename = path.join(dir, 'components', name)
  const { descriptor } = parse(read(filename), { filename })
  const script = compileScript(descriptor, { id: name })
  const component = load(`import { ref, shallowRef, computed, reactive, watch, nextTick, onBeforeUnmount, onUnmounted } from 'vue'\n${name === 'AutomationUiScene.vue' ? '' : 'import { onMounted } from \'vue\''}\n${script.content}`, mocks).default
  component.render = () => null
  const app = renderer.createApp(component, props)
  const instance = app.mount({ children: [] })
  return { state: instance.$.setupState, updateProps: (next) => Object.assign(instance.$.props, next), close: () => app.unmount() }
}
const caseDef = (id) => ({ id, name: id, status: 1, stepList: [{ id: 'step-1', status: 1 }] })
const sceneDef = (index, overrides = {}) => ({
  id: String(1000 + index),
  sceneId: `SCENE_${String(index).padStart(3, '0')}`,
  name: `场景 ${index}`,
  projectId: '100',
  versionId: '200',
  __definitionLoaded: true,
  definitionVersion: index,
  caseList: [caseDef('case-1'), caseDef('case-2')],
  ...overrides,
})
function harness(scenes, options = {}) {
  const batches = []
  const jobs = []
  const errors = []
  const summaries = []
  const opened = []
  const legacy = []
  const refreshes = []
  const historyOpens = []
  const runs = []
  const cancellations = []
  const persistedRuns = []
  const finishedRuns = []
  const cancelledRuns = []
  let config, configReady, selectionReady, run
  const common = {
    '@arco-design/web-vue': { Message: { error: (message) => errors.push(message), warning() {}, success() {} } },
    'vue-router': { useRouter: () => ({ push() {} }) },
    '../execution': execution,
    '../executionSelectionState': selection,
    '../sceneSummary': summary,
    '../executionRun': executionRun,
    '../queryCache': {
      ...queryCache,
      loadAutomationUiExecutionSelectionScene: async (id) => {
        const scene = scenes.find((item) => item.id === id)
        if (!scene) throw new Error(`场景不可访问：${id}`)
        return scene
      },
    },
    '@/hooks/app': { useDict: (...names) => Object.fromEntries(names.map((name) => [name, Vue.ref([])])) },
    '@/stores': { useUserStore: () => ({ userInfo: { username: 'test' } }) },
    '@/utils/playwrightRunner': runnerOptions,
    '@/apis/project/projectConfig': { getProjectConfig: async () => ({ data: { name: '项目' } }) },
    '@/apis/project/projectVersionConfig': { getProjectVersionConfig: async () => ({ data: { name: '版本' } }) },
    '@/apis/project/projectEnvironmentConfig': {
      getProjectEnvironmentConfigList: async () => ({ data: [{ id: 'env', name: '环境', status: 1 }] }),
      getProjectEnvironmentRuntimeStatus: async () => {
        if (options.beforeEnvironment) await options.beforeEnvironment()
        return { data: { onlineStatus: '在线' } }
      },
    },
    '@/apis/automation/automationUiQuery': {
      getAutomationUiExecutions: async () => ({ data: { list: [] } }),
      getAutomationUiExecutionCaseHistory: async () => ({ data: { list: [] } }),
      getAutomationUiSceneSummaryPage: async (query) => {
        summaries.push(query)
        return { data: { total: scenes.length, list: scenes.slice((query.page - 1) * query.size, query.page * query.size)
          .map((scene) => ({ sceneDbId: scene.id, sceneKey: scene.sceneId, name: scene.name, projectDbId: '100', versionDbId: '200' })) } }
      },
    },
    '../extensionPlayback': {
      getExtensionCdpCapabilities: async () => ({ managedBrowserContext: true }),
      beginExtensionCdpBatch: async () => {},
      endExtensionCdpBatch: async () => {},
      abortExtensionCdpBatch: async () => {},
      startExtensionCdpPlayback: async () => { config.state.settleExtensionCompletion({ ok: true }) },
    },
    '@/apis/automation/automationPlaywrightRunner': {
      createAutomationUiExecutionRun: async (request) => {
        if (options.beforeRun) await options.beforeRun()
        persistedRuns.push(structuredClone(request))
        return { data: { runId: `900${persistedRuns.length}` } }
      },
      finishAutomationUiExecutionRun: async (...args) => { finishedRuns.push(args) },
      cancelAutomationUiExecutionRun: async (runId) => { cancelledRuns.push(runId) },
      getAutomationCdpPlaybackAvailability: async () => ({ data: { managedContextEnabled: true } }),
      getAutomationPlaywrightCase: async () => ({ data: { steps: [{}], definitionRevisionId: 'revision', effectiveExecutionConfig: {} } }),
      createAutomationPlaywrightBatch: async (request) => {
        if (options.beforeCreate) await options.beforeCreate(request)
        batches.push(structuredClone(request))
        if (options.startupFailure === request.sceneKey) throw new Error('测试：批次创建失败')
        const ids = request.selectAllCases ? (options.allCaseIds || ['case-1', 'case-2']) : request.caseIds
        return { data: { batchId: `batch-${request.sceneKey}`, sessionConfig: request.cdpOptions, cases: ids.map((caseId) => ({ caseId, executionId: `exec-${request.sceneKey}-${caseId}`, status: options.preflightStatus?.[caseId] || 'queued', stepTotal: 1, effectiveExecutionConfig: {} })) } }
      },
      createAutomationPlaywrightRunnerJob: async (request) => {
        jobs.push(structuredClone(request))
        return { data: { jobId: request.caseKey, status: 'running' } }
      },
      getAutomationPlaywrightRunnerJob: async (jobId) => {
        if (options.waitForJob) await options.waitForJob(jobId)
        return { data: { jobId, status: options.failedCase === jobId ? 'failed' : 'passed' } }
      },
      getAutomationPlaywrightBatchCaseCancellation: async (sceneId) => ({ data: { batchCancelRequested: options.cancelScene === sceneId } }),
      updateAutomationPlaywrightBatchCase: async () => {},
      cancelAutomationPlaywrightBatch: async (...args) => { cancellations.push(args) },
      cancelAutomationPlaywrightRunnerJob: async (jobId) => ({ data: { jobId, status: 'cancelled' } }),
    },
    '@/apis/automation/automationUiScene': { clearAutomationUiSceneResults: async () => ({ success: true }) },
    '@/hooks': {
      useResetReactive: (value) => [Vue.reactive(value), () => {}],
      useTable: () => {
        const pagination = Vue.reactive({ current: 1 })
        return {
          tableData: Vue.ref(scenes.slice(0, 10)),
          selectedKeys: Vue.ref([]),
          pagination,
          search() { pagination.current = 1 },
          refresh() { refreshes.push(pagination.current) },
          handleDelete: async (action) => action(),
        }
      },
    },
    '@/utils': { isMobile: () => false },
    '@/utils/has': { default: { hasPermOr: () => true } },
    '@/components/GiCell': {},
    '@/stores/modules/uiStore': { useUiStore: () => ({ projectId: '100', versionId: '200' }) },
    '@/utils/sakura': {},
    '@/utils/automationUiSceneStatus': sceneStatus,
  }
  const parent = mount('AutomationUiScene.vue', common, {
    onExecuteScenes: (...args) => legacy.push(args),
    onExecuteAllScenes: (...args) => legacy.push(args),
    onExecutionStarted: (sceneId) => historyOpens.push(sceneId),
    onRunStarted: (runId) => historyOpens.push(runId),
    onRunUpdate: (value) => {
      runs.push(structuredClone(value))
      options.onRunUpdate?.(value)
    },
  })
  const select = mount('AutomationExecutionCaseSelectModal.vue', common, {
    onNext: (payload) => options.onNext ? options.onNext(payload) : parent.state.openExecutionConfig(payload),
  })
  config = mount('AutomationExecutionCaseModal.vue', common, {
    onSceneStart: (payload) => { run = parent.state.startSceneExecution(payload) },
    onPlanStart: options.onPlanStart,
    onBack: (payload) => options.onBack ? options.onBack(payload) : parent.state.reopenExecutionCaseSelect(payload),
    onStarted: () => parent.state.onCaseExecutionStarted(),
    onBatchUpdate: (rows) => {
      parent.state.onBatchUpdate(rows)
      options.onLiveUpdate?.(rows)
    },
    onBatchCreated: (value) => parent.state.onBatchCreated(value),
    onStartupFailed: (error) => parent.state.onSceneStartupFailed(error),
    onSuccess: () => parent.state.refresh(),
  })
  parent.state.executionCaseSelectModalRef = { onOpen: (...args) => {
    selectionReady = select.state.onOpen(...args)
    return selectionReady
  } }
  parent.state.executionCaseModalRef = { cancelBatch: config.state.cancelBatch, onOpen: (...args) => {
    opened.push(args)
    configReady = config.state.onOpen(...args)
    return configReady
  } }
  return {
    parent: parent.state,
    select: select.state,
    config: config.state,
    batches,
    jobs,
    errors,
    summaries,
    opened,
    legacy,
    refreshes,
    historyOpens,
    runs,
    cancellations,
    persistedRuns,
    finishedRuns,
    cancelledRuns,
    selectionReady: () => selectionReady,
    async next() {
      await selectionReady
      select.state.nextStep()
      await configReady
    },
    async start() {
      await config.state.startSelectedCases()
      await run
    },
    close() {
      config.close()
      select.close()
      parent.close()
    },
  }
}

test('批量执行：跨页勾选、一次配置、全部所选场景按列表顺序执行', async () => {
  const scenes = Array.from({ length: 26 }, (_, index) => sceneDef(index + 1))
  const app = harness(scenes, { failedCase: `${scenes[1].id}:case-1` })
  try {
    app.parent.selectedKeys = [scenes[25].id, scenes[1].id, scenes[10].id]
    await app.parent.onBatchExecute('playwright-runner')
    await app.next()
    assert.deepEqual(app.config.sceneSelection.__planScenes.map((item) => item.id), [scenes[1].id, scenes[10].id, scenes[25].id])
    assert.equal(app.config.sceneSelectionCaseCount, 6)
    assert.equal(app.batches.length, 0, '下一步仅收集配置，不提前执行')
    app.config.runnerConfig.headed = true
    app.config.runnerConfig.stepTimeoutMs = 12345
    app.config.runnerPageErrorPolicy = 'disabled'
    await app.start()
    assert.deepEqual(app.batches.map((item) => item.sceneKey), [scenes[1].id, scenes[10].id, scenes[25].id])
    assert.equal(app.jobs.length, 6, '单条用例失败不丢弃后续用例或场景')
    for (const request of app.batches) {
      assert.equal(request.projectEnvironmentId, 'env')
      assert.equal(request.executionConfig.headed, true)
      assert.equal(request.executionConfig.stepTimeoutMs, 12345)
      assert.equal(request.executionConfig.pageErrorCheckEnabled, false)
      assert.deepEqual(request.caseIds, ['case-1', 'case-2'])
    }
    assert.equal(app.opened.filter(([, , options]) => !options.autoStart).length, 1)
    app.parent.onExecutionSelect(scenes[0], 'playwright-runner')
    await app.selectionReady()
    app.select.selectFilteredCases()
    await app.next()
    assert.equal(app.config.runnerPageErrorPolicy, 'inherit')
    assert.equal(app.config.buildRunnerOptions().pageErrorCheckEnabled, undefined, '新执行不继承上次关闭页面错误检测的设置')
    assert.deepEqual(app.errors, [])
  } finally { app.close() }
})

test('当前场景未完成时不启动后续场景，也不接受重复批量或单场景执行', async () => {
  const scenes = [sceneDef(1), sceneDef(2)]
  let release, started
  const pending = new Promise((resolve) => {
    release = resolve
  })
  const waiting = new Promise((resolve) => {
    started = resolve
  })
  const app = harness(scenes, { waitForJob: async () => {
    started()
    await pending
  } })
  try {
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    await app.next()
    const running = app.start()
    await waiting
    assert.equal(app.batches.length, 1)
    assert.equal(app.parent.sceneExecutionRunning, true)
    const count = app.opened.length
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    app.parent.onExecutionSelect(scenes[1], 'playwright-runner')
    assert.equal(app.opened.length, count)
    release()
    await running
    assert.equal(app.batches.length, 2)
    assert.equal(app.parent.sceneExecutionRunning, false)
  } finally {
    release()
    app.close()
  }
})

test('执行所有：遍历场景摘要分页，逐场景等待完成，保留各自定义版本', async () => {
  const scenes = Array.from({ length: 51 }, (_, index) => sceneDef(index + 1, { caseList: [caseDef('same-case-id')] }))
  const app = harness(scenes)
  try {
    app.parent.queryForm.moduleId = 'module-a'
    await app.parent.onExecuteAll('playwright-runner')
    // 入口异步读取定义，等待选择弹窗实际打开。
    while (!app.selectionReady()) await new Promise(setImmediate)
    await app.next()
    assert.equal(app.config.sceneSelection.__planScenes.length, 51)
    await app.start()
    assert.deepEqual(app.summaries.map((query) => query.page), [1, 2])
    assert.ok(app.summaries.every((query) => query.moduleId === 'module-a' && query.projectId === '100'))
    assert.deepEqual(app.batches.map((item) => item.sceneKey), scenes.map((scene) => scene.id))
    assert.deepEqual(app.batches.map((item) => item.expectedDefinitionVersion), scenes.map((scene) => scene.definitionVersion))
    assert.deepEqual(app.jobs.map((item) => item.caseKey), scenes.map((scene) => `${scene.id}:same-case-id`))
    assert.deepEqual(app.errors, [])
  } finally { app.close() }
})

// 使用计划页真实的前进/返回回调，避免测试自行补回选项而掩盖模式丢失。
const planSource = ts.createSourceFile('plan.tsx', parse(read(path.join(root, 'src/views/test/testPlan/index.vue'))).descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const navigationDeclarations = ['openExecutionConfig', 'reopenExecutionCaseSelect'].map((name) => {
  const statement = planSource.statements.find((item) => ts.isVariableStatement(item)
    && item.declarationList.declarations.some((item) => item.name.getText(planSource) === name))
  assert.ok(statement, `计划页必须保留 ${name}`)
  return statement.getText(planSource)
}).join('\n')

function planNavigation(app) {
  let selectionReady, configReady
  const context = {
    planCaseExecutionMode: Vue.ref(true),
    executionCaseSelectModalRef: { value: { onOpen: (...args) => { selectionReady = app.select.onOpen(...args) } } },
    executionCaseModalRef: { value: { onOpen: (...args) => { configReady = app.config.onOpen(...args) } } },
  }
  const compiled = ts.transpileModule(`${navigationDeclarations}\nreturn { openExecutionConfig, reopenExecutionCaseSelect }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  const navigation = compileFunction(compiled, Object.keys(context))(...Object.values(context))
  return { ...navigation, planExecution: context.planCaseExecutionMode, selectionReady: () => selectionReady, configReady: () => configReady }
}

for (const executionType of ['playwright-runner', 'extension-cdp']) {
  for (const [mode, count] of [['批量执行', 10], ['执行所有', 26]]) {
    test(`测试计划${mode}配置（${executionType}）：展示全部场景及用例总数，开始仍提交计划事件`, async () => {
      const scenes = Array.from({ length: count }, (_, index) => sceneDef(index + 1, {
        caseList: Array.from({ length: 4 }, (_, caseIndex) => caseDef(`case-${index}-${caseIndex}`)),
      }))
      const aggregate = { ...scenes[0], __planAggregate: true, __planScenes: scenes, __caseTotal: count * 4, caseList: scenes.flatMap((scene) => scene.caseList) }
      const starts = []
      const backs = []
      let navigation
      const app = harness(scenes, {
        onPlanStart: (payload) => starts.push(payload),
        onNext: (payload) => navigation.openExecutionConfig(payload),
        onBack: (payload) => {
          backs.push(payload)
          navigation.reopenExecutionCaseSelect(payload)
        },
      })
      navigation = planNavigation(app)
      const options = { recordSource: 'test', testPlanId: 'plan-1', planExecution: true, selectionDisabled: true, caseIds: aggregate.caseList.map((item) => item.id) }
      try {
        await app.select.onOpen(aggregate, executionType, options)
        app.select.nextStep()
        assert.equal(await navigation.configReady(), true)
        assert.deepEqual(app.config.executionScenes.map((scene) => scene.id), scenes.map((scene) => scene.id))
        assert.equal(app.config.sceneSelectionCaseCount, count * 4)
        assert.equal(app.config.sceneSelection, undefined, '计划展示不能误入 UI 自动化的场景执行分支')
        assert.equal(app.config.canStartSelected, true)
        for (let round = 0; round < 2; round++) {
          app.config.backToCaseSelection()
          await navigation.selectionReady()
          assert.equal(app.select.isSceneSelection, true, '返回上一步必须保持选择执行场景模式')
          assert.equal(app.select.selectionDisabled, true, '场景范围仍由测试计划入口决定')
          assert.deepEqual(app.select.sceneRows.map((row) => row.sceneDbId), scenes.map((scene) => scene.id))
          assert.equal(app.select.selectedCaseCount, count * 4)
          assert.equal(app.select.executionContext.testPlanId, 'plan-1')
          assert.equal(app.select.executionContext.recordSource, 'test')
          app.select.nextStep()
          assert.equal(await navigation.configReady(), true)
          assert.equal(app.config.executionScenes.length, count)
        }
        assert.equal(backs.length, 2)
        assert.deepEqual(backs[0].scene.__planScenes.map((scene) => scene.id), scenes.map((scene) => scene.id))
        assert.equal(backs[0].testPlanId, 'plan-1')
        assert.equal(backs[0].selectionDisabled, true)
        await app.config.startSelectedCases()
        assert.equal(starts.length, 1)
        assert.deepEqual(starts[0].scene.__planScenes.map((scene) => scene.id), scenes.map((scene) => scene.id))
        assert.deepEqual(starts[0].caseIds, options.caseIds)
        assert.equal(starts[0].projectEnvironmentId, 'env')
        assert.deepEqual(app.persistedRuns, [], '配置弹窗不能直接创建 UI 自动化运行记录')
        assert.deepEqual(app.batches, [], '计划批次仍交由父页面调度')
        assert.deepEqual(app.errors, [])
      } finally { app.close() }
    })
  }
}

test('计划批量返回后重新打开单场景：不残留锁定模式，返回仍保留用户勾选的用例', async () => {
  const scenes = [sceneDef(1), sceneDef(2)]
  const aggregate = { ...scenes[0], __planAggregate: true, __planScenes: scenes, __caseTotal: 4, caseList: scenes.flatMap((scene) => scene.caseList) }
  let navigation
  const app = harness(scenes, {
    onNext: (payload) => navigation.openExecutionConfig(payload),
    onBack: (payload) => navigation.reopenExecutionCaseSelect(payload),
  })
  navigation = planNavigation(app)
  try {
    await app.select.onOpen(aggregate, 'playwright-runner', { recordSource: 'test', testPlanId: 'plan-1', selectionDisabled: true })
    app.select.nextStep()
    await navigation.configReady()
    app.config.backToCaseSelection()
    await navigation.selectionReady()
    assert.equal(app.select.isSceneSelection, true)
    navigation.planExecution.value = false
    await app.select.onOpen(scenes[1], 'playwright-runner', { recordSource: 'test', testPlanId: 'plan-1', caseIds: ['case-2'] })
    app.select.nextStep()
    await navigation.configReady()
    assert.deepEqual(app.config.executionScenes, [])
    app.config.backToCaseSelection()
    await navigation.selectionReady()
    assert.equal(app.select.isSceneSelection, false)
    assert.equal(app.select.selectionDisabled, false)
    assert.deepEqual(app.select.selectedCaseKeys, [`${scenes[1].sceneId}:case-2`])
    assert.deepEqual(app.errors, [])
  } finally { app.close() }
})

test('测试计划配置汇总使用投影场景真实总数，切回单场景不残留批量场景展示', async () => {
  const scenes = [sceneDef(1, { __projectedDefinition: true, __caseTotal: 35 }), sceneDef(2)]
  const aggregate = { ...scenes[0], __planAggregate: true, __planScenes: scenes, __caseTotal: 37, caseList: scenes.flatMap((scene) => scene.caseList) }
  const app = harness(scenes)
  try {
    await app.config.onOpen(aggregate, 'playwright-runner', { recordSource: 'test', testPlanId: 'plan-1', planExecution: true, caseIds: ['case-1', 'case-2'] })
    assert.equal(app.config.executionScenes.length, 2)
    assert.equal(app.config.sceneSelectionCaseCount, 37)
    await app.config.onOpen(scenes[1], 'playwright-runner', { recordSource: 'test', testPlanId: 'plan-1', caseIds: ['case-1'] })
    assert.deepEqual(app.config.executionScenes, [])
    assert.equal(app.config.executionCaseCount, 1)
    assert.equal(app.config.selectedCaseRows[0].caseId, 'case-1')
    assert.deepEqual(app.errors, [])
  } finally { app.close() }
})

test('投影场景：已加载页为空也提交 selectAllCases，由服务端返回完整用例范围', async () => {
  const scenes = [sceneDef(1, { __projectedDefinition: true, __caseTotal: 35, caseList: [] }), sceneDef(2)]
  const allCaseIds = Array.from({ length: 35 }, (_, index) => `case-${index + 1}`)
  const app = harness(scenes, { allCaseIds })
  try {
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    await app.next()
    assert.equal(app.config.sceneSelectionCaseCount, 37)
    assert.equal(app.config.canStartSelected, true)
    await app.start()
    assert.equal(app.batches[0].selectAllCases, true)
    assert.deepEqual(app.batches[0].caseIds, [])
    assert.equal(app.jobs.filter((job) => job.caseKey.startsWith(`${scenes[0].id}:`)).length, 35)
    assert.equal(app.jobs.length, 37)
    assert.deepEqual(app.errors, [])
  } finally { app.close() }
})

test('返回上一步保留完整场景范围，取消配置不留下待执行队列', async () => {
  const scenes = [sceneDef(1), sceneDef(2), sceneDef(3)]
  const app = harness(scenes)
  try {
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    await app.next()
    app.config.backToCaseSelection()
    await app.selectionReady()
    assert.equal(app.select.isSceneSelection, true)
    assert.equal(app.select.selectionDisabled, true)
    assert.equal(app.select.sceneRows.length, 3)
    await app.next()
    app.config.visible = false
    app.parent.onExecutionSelect(scenes[2], 'playwright-runner')
    await app.selectionReady()
    app.select.selectFilteredCases()
    await app.next()
    assert.equal(app.config.sceneSelection, undefined)
    await app.start()
    assert.deepEqual(app.batches.map((item) => item.sceneKey), [scenes[2].id])
  } finally { app.close() }
})

for (const failure of ['cancelScene', 'startupFailure']) {
  test(`${failure}：停止后续场景，清理运行中标记`, async () => {
    const scenes = [sceneDef(1), sceneDef(2), sceneDef(3)]
    const app = harness(scenes, { [failure]: scenes[1].id })
    try {
      await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
      await app.next()
      await app.start()
      assert.deepEqual(app.batches.map((item) => item.sceneKey), [scenes[0].id, scenes[1].id])
      assert.equal(app.parent.sceneExecutionRunning, false)
      assert.deepEqual(app.parent.queuedSceneIds, [])
      assert.ok(app.jobs.every((job) => !job.caseKey.startsWith(`${scenes[2].id}:`)))
      if (failure === 'startupFailure') assert.deepEqual(app.errors, ['测试：批次创建失败'])
      assert.equal(app.parent.sceneProgress.get(scenes[0].id).executeResult, 'passed')
      assert.equal(app.parent.sceneProgress.get(scenes[1].id).executeStatus, failure === 'startupFailure' ? 'startup-failed' : 'cancelled')
      assert.equal(app.parent.sceneProgress.get(scenes[2].id).executeStatus, 'cancelled')
    } finally { app.close() }
  })
}

test('CDP 同样复用一次确认的会话和窗口参数，不影响旧 Jenkins 入口', async () => {
  const scenes = [sceneDef(1), sceneDef(2)]
  const app = harness(scenes)
  try {
    app.parent.selectedKeys = scenes.map((scene) => scene.id)
    await app.parent.onBatchExecute('jenkins')
    await app.parent.onExecuteAll('jenkins')
    assert.equal(app.legacy.length, 2)
    assert.equal(app.batches.length, 0)
    await app.parent.onBatchExecute('extension-cdp')
    await app.next()
    app.config.cdpConfig.windowSizeMode = 'custom'
    app.config.cdpConfig.viewportWidth = 1440
    app.config.cdpConfig.viewportHeight = 900
    await app.start()
    assert.equal(app.batches.length, 2)
    assert.ok(app.batches.every((batch) => batch.executionType === 'extension-cdp'
      && batch.cdpOptions.windowSizeMode === 'custom' && batch.cdpOptions.viewportWidth === 1440))
    assert.deepEqual(app.errors, [])
    assert.ok(scenes.every((scene) => app.parent.sceneProgress.get(scene.id).executeResult === 'passed'))
  } finally { app.close() }
})

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('开始即更新全部目标场景；逐用例刷新统计、逐场景刷新结果；翻页和摘要刷新不回退', async () => {
  const source = read(path.join(dir, 'components/AutomationUiScene.vue'))
  assert.match(source, /:data="displayTableData"/)
  assert.match(source, /@success="refresh"/)
  const scenes = Array.from({ length: 12 }, (_, index) => sceneDef(index + 1, {
    debugRecord: [{ executeStatus: 'completed', executeResult: 'passed', casePass: 2, caseTotal: 2, scenePassRate: '100%', duration: 9999 }],
  }))
  const keys = [`${scenes[0].id}:case-1`, `${scenes[0].id}:case-2`, `${scenes[1].id}:case-1`]
  const gates = keys.map(() => ({ entered: deferred(), finish: deferred() }))
  const app = harness(scenes, { waitForJob: async (key) => {
    const gate = gates[keys.indexOf(key)]
    if (!gate) return
    gate.entered.resolve()
    await gate.finish.promise
  } })
  let running
  try {
    app.parent.selectedKeys = [scenes[0].id, scenes[1].id, scenes[11].id]
    await app.parent.onBatchExecute('playwright-runner')
    await app.next()
    assert.equal(app.parent.sceneProgress.size, 0, '配置前不改变状态')
    app.parent.pagination.current = 2
    running = app.start()
    const displayed = (id) => app.parent.displayTableData.find((row) => row.id === id)
    assert.equal(displayed(scenes[0].id).__localExecutionStatus, 'queued', '服务端登记任务完成前全部场景排队，不能提前创建子批次')
    assert.equal(displayed(scenes[1].id).__localExecutionStatus, 'queued')
    assert.equal(app.parent.sceneProgress.get(scenes[11].id).executeStatus, 'queued', '非当前页也立即入队')
    assert.equal(displayed(scenes[1].id).debugRecord[0].executeResult, 'not_executed')
    assert.equal(displayed(scenes[1].id).debugRecord[0].scenePassRate, '0%')
    assert.equal(displayed(scenes[2].id).__localExecutionStatus, undefined, '未选场景不受影响')
    await gates[0].entered.promise
    assert.equal(displayed(scenes[0].id).__localExecutionStatus, 'running')
    gates[0].finish.resolve()
    await gates[1].entered.promise
    assert.equal(displayed(scenes[0].id).debugRecord[0].casePass, 1)
    assert.equal(displayed(scenes[0].id).debugRecord[0].scenePassRate, '50%')
    assert.equal(displayed(scenes[0].id).debugRecord[0].executeResult, 'not_executed', '未完成场景不能提前公布通过')
    gates[1].finish.resolve()
    await gates[2].entered.promise
    assert.equal(app.historyOpens.length, 1, '后续场景启动不抢走列表页视角')
    assert.equal(displayed(scenes[0].id).__localExecutionStatus, 'completed')
    assert.equal(displayed(scenes[0].id).debugRecord[0].executeResult, 'passed')
    assert.equal(displayed(scenes[1].id).__localExecutionStatus, 'running')
    assert.equal(app.parent.sceneProgress.get(scenes[11].id).executeStatus, 'queued')
    app.parent.tableData = [structuredClone(scenes[11])]
    assert.equal(displayed(scenes[11].id).__localExecutionStatus, 'queued', '新一页仍覆盖旧摘要')
    app.parent.tableData = structuredClone(scenes.slice(0, 10))
    assert.equal(displayed(scenes[0].id).debugRecord[0].executeResult, 'passed')
    assert.equal(displayed(scenes[1].id).__localExecutionStatus, 'running', '迟到旧摘要不能覆盖执行中状态')
    assert.equal(app.parent.pagination.current, 2)
    assert.ok(app.refreshes.length >= 2)
    assert.ok(app.refreshes.every((page) => page === 2))
    assert.equal(app.parent.selectedKeys.length, 3)
    gates[2].finish.resolve()
    await running
    assert.ok([scenes[0], scenes[1], scenes[11]].every((scene) => app.parent.sceneProgress.get(scene.id).executeResult === 'passed'))
    assert.equal(scenes[0].debugRecord[0].duration, 9999, '实时展示不能修改原历史对象')
  } finally {
    gates.forEach((gate) => gate.finish.resolve())
    await running
    app.close()
  }
})

test('终态保留真实结果和冻结耗时，同批次落库或后续新执行以中台摘要为准', () => {
  const requestedAt = Date.parse('2026-10-07T08:00:00+08:00')
  const scene = sceneDef(1, { debugRecord: [{ batchId: 'old', executeStatus: 'completed', executeResult: 'passed' }] })
  const rows = [{ batchId: 'current', status: 'failed', stepTotal: 3, stepFail: 1, startedAt: requestedAt + 100, finishedAt: requestedAt + 3100 }]
  const progress = summary.liveSceneProgress(rows, requestedAt, requestedAt + 99999)
  assert.equal(progress.executeStatus, 'completed')
  assert.equal(progress.executeResult, 'failed')
  assert.equal(progress.duration, 3000)
  assert.equal(summary.withSceneExecutionProgress(scene, progress).debugRecord[0].executeResult, 'failed')
  const persisted = { ...scene, debugRecord: [{ batchId: 'current', executeStatus: 'completed', executeResult: 'failed', duration: 3500 }] }
  assert.equal(summary.withSceneExecutionProgress(persisted, progress), persisted)
  const newer = { ...scene, debugRecord: [{ batchId: 'next', executeStatus: 'running', startedAt: new Date(requestedAt + 10000).toISOString() }] }
  assert.equal(summary.withSceneExecutionProgress(newer, progress), newer)
  assert.equal(summary.withSceneExecutionProgress(scene), scene)
})

test('服务端预检失败或跳过的用例保留终态，场景结果不会卡在排队中', async () => {
  const scenes = [sceneDef(1)]
  const app = harness(scenes, { preflightStatus: { 'case-1': 'failed', 'case-2': 'skipped' } })
  try {
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    await app.next()
    await app.start()
    assert.equal(app.jobs.length, 0)
    const progress = app.parent.sceneProgress.get(scenes[0].id)
    assert.equal(progress.executeStatus, 'completed')
    assert.equal(progress.executeResult, 'failed')
    assert.equal(progress.caseFail, 1)
    assert.equal(progress.caseSkip, 1)
  } finally { app.close() }
})

test('清空结果成功后移除本地状态，测试计划实时消息不污染调试场景', async () => {
  const scenes = [sceneDef(1)]
  const app = harness(scenes)
  try {
    app.parent.onBatchUpdate([{ sceneKey: scenes[0].id, recordSource: 'test', batchId: 'plan', status: 'running' }])
    assert.equal(app.parent.sceneProgress.size, 0)
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    await app.next()
    await app.start()
    assert.equal(app.parent.sceneProgress.size, 1)
    app.parent.selectedKeys = [scenes[0].id]
    await app.parent.onClearResults()
    assert.equal(app.parent.sceneProgress.size, 0)
    assert.equal(app.parent.displayTableData[0].__localExecutionStatus, undefined)
  } finally { app.close() }
})

function historyMocks(query = async (value) => ({ data: { list: [{ sceneDbId: value.sceneDbId, batchId: value.batchId, executionDbId: 91, executionKey: 'child', executionEngine: 'playwright-runner', caseTotal: 1, status: 'running' }] } })) {
  return {
    '../execution': execution,
    '../executionRun': executionRun,
    '../queryCache': queryCache,
    '@arco-design/web-vue': { Message: { error() {} }, Modal: { warning: ({ onOk }) => onOk() } },
    '@/stores/modules/uiStore': { useUiStore: () => ({ projectId: '100', versionId: '200', activeKey: 'history', getSceneModuleIds: () => undefined }) },
    '@/apis/automation/automationUiQuery': {
      getAutomationUiExecutions: query,
      getAutomationUiExecutionHistory: async () => ({ data: { list: [], total: 0 } }),
      getAutomationUiExecutionHistorySummary: async () => ({ data: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0, cancelled: 0, skipped: 0, notExecuted: 0 } }),
      getAutomationUiSceneSummaryPage: async () => ({ data: { list: [], total: 0 } }),
      getAutomationUiExecutionRevisionsBatched: async () => ({ data: [] }),
      getAutomationUiExecutionCases: async () => ({ data: { list: [], total: 1 } }),
    },
    '@/apis/automation/automationPlaywrightRunner': {},
  }
}

test('真实本次执行视图：26 场景为 1 运行 25 排队，分页、旧历史和实时换场景不改变总范围', async () => {
  const scenes = Array.from({ length: 26 }, (_, index) => sceneDef(index + 1, { caseList: [caseDef('same-case')] }))
  const run = Vue.reactive(executionRun.createExecutionRun(scenes, 'playwright-runner'))
  const live = Vue.reactive([])
  const entered = deferred()
  const finish = deferred()
  const panel = mount('AutomationUiExecutionRunPanel.vue', historyMocks(), { run, liveExecutions: live })
  const app = harness(scenes, {
    onRunUpdate: (value) => Object.assign(run, value),
    onLiveUpdate: (value) => live.splice(0, live.length, ...value),
    waitForJob: async () => {
      entered.resolve()
      await finish.promise
    },
  })
  let pending
  try {
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    await app.next()
    pending = app.start()
    await entered.promise
    assert.equal(panel.state.summary.total, 26)
    assert.equal(panel.state.summary.running, 1)
    assert.equal(panel.state.summary.queued, 25)
    assert.equal(panel.state.summary.completed, 0)
    assert.equal(panel.state.summary.passed, 0)
    assert.equal(app.historyOpens[0], run.id)
    panel.state.pagination.onChange(2)
    assert.equal(panel.state.summary.total, 26)
    assert.equal(run.scenes[25].executeStatus, 'queued')
    assert.equal(panel.state.sceneLiveExecutions(run.scenes[0]).length, 1)
    finish.resolve()
    await pending
    assert.equal(panel.state.summary.completed, 26)
    assert.equal(panel.state.summary.passed, 26)
    assert.equal(new Set(run.scenes.map((scene) => scene.batchId)).size, 26)
    assert.equal(app.historyOpens.length, 1)
    assert.equal(panel.state.pagination.current, 2)
  } finally {
    finish.resolve()
    await pending
    app.close()
    panel.close()
  }
})

test('历史工作区显式跳转本次执行和全部历史，旧单场景筛选不泄漏', async () => {
  const run = executionRun.createExecutionRun([sceneDef(1), sceneDef(2)], 'playwright-runner')
  const workspace = mount('AutomationUiSceneHistoryWorkspace.vue', historyMocks(), { executionRun: run, liveExecutions: [] })
  try {
    workspace.state.sceneFilterValue = 'old-scene'
    workspace.state.executionPage = 2
    await workspace.state.openHistory({ kind: 'run', runId: run.id })
    assert.equal(workspace.state.showExecutionRun, true)
    assert.equal(workspace.state.pollTimer, undefined)
    await workspace.state.openHistory({ kind: 'all' })
    assert.equal(workspace.state.showExecutionRun, false)
    assert.equal(workspace.state.sceneFilterValue, '')
    assert.equal(workspace.state.executionPage, 1)
  } finally { workspace.close() }
})

test('展开本次场景仅查询真实子批次；旧后端忽略筛选时也拒绝显示旧结果', async () => {
  const run = Vue.reactive(executionRun.createExecutionRun([sceneDef(1)], 'playwright-runner'))
  const requests = []
  let wrong = true
  const panel = mount('AutomationUiExecutionRunPanel.vue', historyMocks(async (query) => {
    requests.push(query)
    return { data: { list: [{ sceneDbId: query.sceneDbId, batchId: wrong ? 'old-batch' : query.batchId, executionDbId: 91, caseTotal: 1, status: 'completed', result: 'passed' }] } }
  }), { run, liveExecutions: [] })
  try {
    await panel.state.loadSceneBatch(run.scenes[0])
    assert.equal(requests.length, 0, '排队项不读取任意旧历史')
    run.scenes[0].batchId = 'actual-batch'
    await Vue.nextTick()
    await panel.state.loadSceneBatch(run.scenes[0])
    assert.ok(panel.state.errors[run.scenes[0].sceneDbId])
    assert.equal(panel.state.batches.size, 0)
    assert.ok(requests.every((query) => query.batchId === 'actual-batch' && query.sceneDbId === run.scenes[0].sceneDbId && query.recordSource === 'debug'))
    wrong = false
    await panel.state.loadSceneBatch(run.scenes[0])
    assert.equal(panel.state.batches.get(run.scenes[0].sceneDbId).batchId, 'actual-batch')
    assert.equal(panel.state.errors[run.scenes[0].sceneDbId], undefined)
  } finally { panel.close() }
})

test('取消发生在子批次创建请求在途时：取消真实批次，零 Runner 启动，剩余场景全部停止', async () => {
  const entered = deferred()
  const finish = deferred()
  const scenes = [sceneDef(1), sceneDef(2), sceneDef(3)]
  const app = harness(scenes, { beforeCreate: async () => {
    entered.resolve()
    await finish.promise
  } })
  let pending
  try {
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    await app.next()
    pending = app.start()
    await entered.promise
    const id = app.parent.currentExecutionRun.id
    await app.parent.cancelExecutionRun(id)
    finish.resolve()
    await pending
    assert.equal(app.batches.length, 1)
    assert.equal(app.jobs.length, 0)
    assert.deepEqual(app.cancellations, [[scenes[0].id, `batch-${scenes[0].id}`]])
    assert.equal(executionRun.executionRunSummary(app.parent.currentExecutionRun).cancelled, 3)
    assert.ok(app.parent.currentExecutionRun.finishedAt)
  } finally {
    finish.resolve()
    await pending
    app.close()
  }
})

test('本次执行整次取消停止后续场景，并取消正在执行的子批次', async () => {
  const entered = deferred()
  const finish = deferred()
  const scenes = [sceneDef(1), sceneDef(2), sceneDef(3)]
  const app = harness(scenes, { waitForJob: async () => {
    entered.resolve()
    await finish.promise
  } })
  let pending
  try {
    await app.parent.beginQueuedCaseExecution(scenes, 'playwright-runner')
    await app.next()
    pending = app.start()
    await entered.promise
    await app.parent.cancelExecutionRun(app.parent.currentExecutionRun.id)
    finish.resolve()
    await pending
    assert.equal(app.batches.length, 1)
    assert.equal(app.jobs.length, 1)
    assert.equal(app.cancellations.length, 1)
    assert.ok(app.parent.currentExecutionRun.scenes.slice(1).every((scene) => scene.executeStatus === 'cancelled'))
  } finally {
    finish.resolve()
    await pending
    app.close()
  }
})

test('真实历史面板将 skipped 计入完成和跳过，不再显示执行中', () => {
  const live = [{ sceneKey: '1001', sceneId: 'SCENE_001', batchId: 'skip-batch', caseId: 'case-1', executionId: 'skip-case', status: 'skipped', executionType: 'playwright-runner', stepTotal: 1, stepSkip: 1, startedAt: Date.now() - 1000, finishedAt: Date.now() }]
  const panel = mount('AutomationExecutionHistoryPanel.vue', { '../execution': execution }, { scene: { id: '1001' }, liveExecutions: live, executionBatches: [] })
  try {
    const batch = panel.state.liveBatchRows[0]
    assert.equal(batch.caseCompleted, 1)
    assert.equal(batch.caseSkip, 1)
    assert.equal(batch.executeStatus, 'completed')
    assert.equal(batch.executeResult, 'skipped')
  } finally { panel.close() }
})

test('配置加载期间取消整次执行，不创建任何子批次', async () => {
  const entered = deferred()
  const finish = deferred()
  let wait = false
  const app = harness([sceneDef(1), sceneDef(2)], { beforeEnvironment: async () => {
    if (!wait) return
    entered.resolve()
    await finish.promise
  } })
  let pending
  try {
    await app.parent.beginQueuedCaseExecution([sceneDef(1), sceneDef(2)], 'playwright-runner')
    await app.next()
    wait = true
    pending = app.start()
    await entered.promise
    await app.parent.cancelExecutionRun(app.parent.currentExecutionRun.id)
    finish.resolve()
    await pending
    assert.equal(app.batches.length, 0)
    assert.equal(app.jobs.length, 0)
    assert.equal(executionRun.executionRunSummary(app.parent.currentExecutionRun).cancelled, 2)
  } finally {
    finish.resolve()
    await pending
    app.close()
  }
})

test('从在途历史查询切到本次再切回历史，新请求不被旧 refreshing 锁吞掉', async () => {
  const pending = deferred()
  const run = executionRun.createExecutionRun([sceneDef(1)], 'playwright-runner')
  const mocks = historyMocks()
  let requests = 0
  mocks['@/apis/automation/automationUiQuery'].getAutomationUiSceneSummaryPage = async () => {
    requests += 1
    if (requests === 1) return pending.promise
    return { data: { list: [], total: 0 } }
  }
  const workspace = mount('AutomationUiSceneHistoryWorkspace.vue', mocks, { executionRun: run, liveExecutions: [] })
  try {
    const old = workspace.state.openHistory({ kind: 'all' })
    await workspace.state.openHistory({ kind: 'run', runId: run.id })
    await workspace.state.openHistory({ kind: 'all' })
    assert.equal(requests, 2)
    pending.resolve({ data: { list: [], total: 999 } })
    await old
    assert.equal(workspace.state.scopeSummary.total, 0)
    assert.equal(workspace.state.showExecutionRun, false)
  } finally {
    pending.resolve({ data: { list: [], total: 0 } })
    workspace.close()
  }
})

for (const serverPagedScope of [true, false]) {
  test(`执行结束后实时记录保留分层批次的按需加载入口（serverPagedScope=${serverPagedScope}）`, async () => {
    const batch = Vue.reactive(execution.buildLayeredExecutionBatchRow({ executionDbId: 91, batchId: 'finished-live', status: 'completed', result: 'passed', caseTotal: 1, casePass: 1 }, { sceneDbId: '1001', sceneKey: 'SCENE_001', name: '场景' }))
    const live = [{ sceneKey: '1001', batchId: batch.batchId, caseId: 'CASE_1', executionId: 'live-case', executionType: 'playwright-runner', status: 'passed', stepTotal: 1, stepPass: 1 }]
    const panel = mount('AutomationExecutionHistoryPanel.vue', { '../execution': execution }, { scenes: [{ id: '1001' }], executionBatches: [batch], liveExecutions: live, serverPagedScope })
    try {
      const visible = panel.state.filteredBatchRows[0]
      assert.equal(visible.executionDbId, 91, '实时汇总不能覆盖掉读取用例的数据库 ID')
      assert.equal(visible.casesLoaded, false)
      assert.equal(visible.rowKey, batch.rowKey, '步骤加载前后保持批次展开标识')
      const row = execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: 92, definitionCaseId: 'CASE_1', status: 'completed', result: 'passed', stepTotal: 1, stepPass: 1 }, batch)
      batch.cases = [row]
      batch.casesLoaded = true
      await Vue.nextTick()
      const displayed = panel.state.filteredBatchRows[0].cases[0]
      assert.equal(displayed.caseExecutionDbId, 92)
      assert.equal(displayed, batch.cases[0], '步骤必须写回实际缓存的用例对象')
      displayed.steps = [{ rowKey: 'step-93' }]
      displayed.stepsLoaded = true
      await Vue.nextTick()
      assert.equal(panel.state.filteredBatchRows[0].cases[0].steps.length, 1)
    } finally { panel.close() }
  })
}

test('实时用例在步骤尚未加载时也补齐持久化 ID，供非表格视图加载步骤', async () => {
  const batch = execution.buildLayeredExecutionBatchRow({ executionDbId: 91, batchId: 'hydrate', status: 'completed' }, { sceneDbId: '1001' })
  const row = execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: 92, definitionCaseId: 'CASE_1', status: 'completed', result: 'passed', stepTotal: 1 }, batch)
  const panel = mount('AutomationExecutionHistoryPanel.vue', { '../execution': execution }, { scene: { id: '1001' } })
  try {
    const live = panel.state.normalizeLiveExecution({ sceneKey: '1001', batchId: 'hydrate', caseId: 'CASE_1', executionId: 'live-case', executionType: 'playwright-runner', status: 'passed' })
    const hydrated = panel.state.hydrateCompletedLiveRow(live, row)
    assert.equal(hydrated.caseExecutionDbId, 92)
    assert.equal(hydrated.recordTarget.executionDbId, 91)
    assert.equal(hydrated.rowKey, live.rowKey)
    assert.equal(hydrated.stepsLoaded, false)
  } finally { panel.close() }
})

test('已完成报告的同 ID 用例被轮询替换后重新加载步骤，保留当前步骤分页', async () => {
  const batch = execution.buildLayeredExecutionBatchRow({ executionDbId: 91, batchId: 'replace', status: 'completed' }, { sceneDbId: '1001' })
  const makeRow = () => execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: 92, definitionCaseId: 'CASE_1', status: 'completed', result: 'passed', stepTotal: 60 }, batch)
  const host = Vue.reactive({ record: makeRow() })
  const requests = []
  const loadSteps = async (row, page, size) => {
    requests.push([row, page, size])
    row.steps = [{ rowKey: `page-${page}` }]
    row.stepsLoaded = true
  }
  const detail = mount('AutomationExecutionHistoryDetail.vue', { '../execution': execution }, { record: host.record, loadSteps })
  try {
    await Vue.nextTick()
    detail.state.changeStepPage(2)
    await Vue.nextTick()
    assert.equal(requests.length, 2)
    host.record = makeRow()
    detail.updateProps({ record: host.record })
    await Vue.nextTick()
    assert.equal(requests.length, 3)
    assert.equal(requests[2][0], host.record)
    assert.deepEqual(requests[2].slice(1), [2, 20])
    assert.equal(host.record.stepsLoaded, true)
    assert.equal(host.record.steps[0].rowKey, 'page-2')
  } finally { detail.close() }
})

test('已完成批次不自动展开用例，嵌入式和独立历史均保留手动打开和收起', async () => {
  const batch = execution.buildLayeredExecutionBatchRow({ executionDbId: 91, executionKey: 'child', batchId: 'batch', caseTotal: 2, status: 'completed', result: 'passed' }, { sceneDbId: '1001', sceneKey: 'SCENE_001', name: '场景' })
  batch.cases = [1, 2].map((id) => execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: id, definitionCaseId: `CASE_${id}`, caseName: `用例 ${id}`, status: 'completed', result: 'passed', stepTotal: 1, stepPass: 1 }, batch))
  batch.casesLoaded = true
  const compact = mount('AutomationExecutionBatchDetail.vue', { '../execution': execution }, { batch: Vue.reactive(structuredClone(batch)), embedded: true })
  const normal = mount('AutomationExecutionBatchDetail.vue', { '../execution': execution }, { batch: Vue.reactive(structuredClone(batch)) })
  try {
    await Vue.nextTick()
    assert.equal(compact.state.expandedKey, '')
    assert.equal(normal.state.expandedKey, '')
    compact.state.selectContent(batch.cases[1], 'report')
    await Vue.nextTick()
    assert.equal(compact.state.expandedKey, batch.cases[1].rowKey)
    assert.equal(compact.state.activeTab, 'report')
    compact.state.toggleCase(batch.cases[1])
    assert.equal(compact.state.expandedKey, '')
  } finally {
    compact.close()
    normal.close()
  }
})

test('打开执行中批次时直接跟随运行用例，不展开排在前面的已完成或排队用例', async () => {
  const batch = Vue.reactive(execution.buildLayeredExecutionBatchRow({ executionDbId: 91, batchId: 'resume', status: 'running', caseTotal: 3 }, { sceneDbId: '1001', sceneKey: 'SCENE_001' }))
  batch.cases = ['completed', 'queued', 'running'].map((status, index) => execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: index + 1, definitionCaseId: `CASE_${index + 1}`, status }, batch))
  batch.casesLoaded = true
  const panel = mount('AutomationExecutionBatchDetail.vue', { '../execution': execution }, { batch, autoExpandSceneId: 'SCENE_001' })
  try {
    await Vue.nextTick()
    assert.equal(panel.state.expandedKey, batch.cases[2].rowKey)
    panel.state.toggleCase(batch.cases[2])
    batch.cases = batch.cases.map(row => ({ ...row }))
    await Vue.nextTick()
    assert.equal(panel.state.expandedKey, '', '普通轮询不能撤销手动收起')
  } finally { panel.close() }
})

test('终态批次的场景定位不展开第一条，明确定位用例仍可打开其报告', async () => {
  const batch = execution.buildLayeredExecutionBatchRow({ executionDbId: 91, batchId: 'finished', status: 'completed', caseTotal: 2 }, { sceneDbId: '1001', sceneKey: 'SCENE_001' })
  batch.cases = ['failed', 'skipped'].map((status, index) => execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: index + 1, definitionCaseId: `CASE_${index + 1}`, status }, batch))
  batch.casesLoaded = true
  const scene = mount('AutomationExecutionBatchDetail.vue', { '../execution': execution }, { batch, autoExpandSceneId: 'SCENE_001' })
  const target = mount('AutomationExecutionBatchDetail.vue', { '../execution': execution }, { batch, autoExpandCaseId: 'CASE_2' })
  try {
    await Vue.nextTick()
    assert.equal(scene.state.expandedKey, '')
    assert.equal(target.state.expandedKey, batch.cases[1].rowKey)
  } finally { scene.close(); target.close() }
})

test('执行终止后不会跳到已跳过的用例，但正在查看的内容保留', async () => {
  const batch = Vue.reactive(execution.buildLayeredExecutionBatchRow({ executionDbId: 91, batchId: 'stop', status: 'running', caseTotal: 2 }, { sceneDbId: '1001' }))
  batch.cases = ['running', 'queued'].map((status, index) => execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: index + 1, definitionCaseId: `CASE_${index + 1}`, status }, batch))
  batch.casesLoaded = true
  const panel = mount('AutomationExecutionBatchDetail.vue', { '../execution': execution }, { batch })
  try {
    await Vue.nextTick()
    batch.cases[0].executeStatus = 'failed'
    batch.cases[1].executeStatus = 'skipped'
    await Vue.nextTick()
    assert.equal(panel.state.expandedKey, batch.cases[0].rowKey)
  } finally { panel.close() }
})

for (const embedded of [true, false]) {
  test(`用例状态自动跟随（embedded=${embedded}）：无日志也跨场景推进，连续终态不漏跳且保留报告视角`, async () => {
    const batch = Vue.reactive(execution.buildLayeredExecutionBatchRow({ executionDbId: 91, batchId: 'follow', status: 'running', caseTotal: 3 }, { sceneDbId: '1001', sceneKey: 'SCENE_001' }))
    batch.cases = [1, 2, 3].map(id => execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: id, definitionCaseId: `CASE_${id}`, status: id === 1 ? 'running' : 'queued', stepTotal: 1 }, batch))
    batch.cases[2].sceneKey = '1002'
    batch.cases[2].sceneId = 'SCENE_002'
    batch.casesLoaded = true
    const panel = mount('AutomationExecutionBatchDetail.vue', { '../execution': execution }, { batch, embedded })
    try {
      await Vue.nextTick()
      assert.equal(panel.state.expandedKey, batch.cases[0].rowKey)
      panel.state.selectContent(batch.cases[0], 'report')
      for (let index = 0; index < 2; index++) {
        Object.assign(batch.cases[index], { executeStatus: 'completed', executeResult: index ? 'failed' : 'passed' })
        await Vue.nextTick()
        assert.equal(panel.state.expandedKey, batch.cases[index + 1].rowKey)
        assert.equal(panel.state.activeTab, 'report')
        batch.cases[index + 1].executeStatus = 'running'
        await Vue.nextTick()
      }
      assert.ok(panel.state.expandedSceneKeys.includes('1002'), '跨场景时展开目标场景')
      batch.cases[2].executeStatus = 'skipped'
      await Vue.nextTick()
      assert.equal(panel.state.expandedKey, batch.cases[2].rowKey, '最后一项完成后不回到首条')
      panel.state.toggleCase(batch.cases[2])
      batch.cases = batch.cases.map(row => ({ ...row }))
      await Vue.nextTick()
      assert.equal(panel.state.expandedKey, '', '终态历史普通轮询不重新展开')
    } finally { panel.close() }
  })
}

test('用例自动跟随跨分页：第 20 条完成后加载下一页，首条历史终态不主动翻页', async () => {
  const batch = Vue.reactive(execution.buildLayeredExecutionBatchRow({ executionDbId: 91, batchId: 'pages', status: 'running', caseTotal: 21 }, { sceneDbId: '1001' }))
  const caseRow = id => execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: id, definitionCaseId: `CASE_${id}`, status: id < 20 ? 'completed' : 'running', stepTotal: 1 }, batch)
  batch.cases = Array.from({ length: 20 }, (_, index) => caseRow(index + 1))
  batch.casesLoaded = true
  batch.casePage = 1
  batch.casePageSize = 20
  const requests = []
  const panel = mount('AutomationExecutionBatchDetail.vue', { '../execution': execution }, {
    batch,
    loadCases: async (row, page, size) => {
      requests.push([page, size])
      row.cases = [caseRow(21)]
      row.casePage = page
      row.casesLoaded = true
    },
  })
  try {
    await Vue.nextTick()
    assert.equal(requests.length, 0)
    panel.state.selectContent(batch.cases[19], 'log')
    batch.cases[19].executeStatus = 'completed'
    await Vue.nextTick()
    await Vue.nextTick()
    assert.deepEqual(requests, [[2, 20]])
    assert.equal(panel.state.expandedKey, batch.cases[0].rowKey)
    assert.equal(batch.cases[0].caseId, 'CASE_21')
  } finally { panel.close() }
})

test('本次执行自动展开首场景，逐场景跟随并跨过 20 条分页', async () => {
  const run = Vue.reactive(executionRun.createExecutionRun(Array.from({ length: 26 }, (_, index) => sceneDef(index + 1)), 'playwright-runner'))
  const panel = mount('AutomationUiExecutionRunPanel.vue', historyMocks(), { run, liveExecutions: [] })
  try {
    await Vue.nextTick()
    assert.deepEqual(panel.state.expandedKeys, [run.scenes[0].sceneDbId])
    for (let index = 0; index < 25; index++) {
      run.scenes[index].executeStatus = 'completed'
      run.scenes[index + 1].executeStatus = 'running'
      await Vue.nextTick()
      assert.deepEqual(panel.state.expandedKeys, [run.scenes[index + 1].sceneDbId])
      assert.equal(panel.state.pagination.current, index + 1 < 20 ? 1 : 2)
    }
    run.scenes[25].executeStatus = 'completed'
    await Vue.nextTick()
    assert.deepEqual(panel.state.expandedKeys, [run.scenes[25].sceneDbId])
  } finally { panel.close() }
})

test('服务端任务历史随轮询切换场景，下一场景尚未创建批次也可先定位', async () => {
  const batch = Vue.reactive({ rowKey: 'run-1', historyRevision: '0' })
  const scenes = [1, 2, 3].map(id => ({ rowKey: `scene-${id}`, executeStatus: id === 1 ? 'running' : 'queued', historyRevision: '0' }))
  const panel = mount('AutomationExecutionRunDetail.vue', { '../execution': execution }, {
    batch,
    loadScenes: async () => ({ list: scenes.map(row => ({ ...row })), total: 3 }),
  })
  try {
    await Vue.nextTick()
    await Vue.nextTick()
    assert.equal(panel.state.activeSceneKey, 'scene-1')
    for (let index = 0; index < 2; index++) {
      Object.assign(scenes[index], { executeStatus: 'completed', historyRevision: String(index + 1) })
      batch.historyRevision = String(index + 1)
      await Vue.nextTick()
      await Vue.nextTick()
      assert.equal(panel.state.activeSceneKey, `scene-${index + 2}`)
    }
  } finally { panel.close() }
})

test('测试计划与报告聚合按执行顺序展开；异步分批返回用例时等待完整首屏', () => {
  const rows = [2, 1].map(id => {
    const row = execution.buildLayeredExecutionBatchRow({ executionDbId: id, batchId: `batch-${id}`, testReportId: 'report', status: 'running', startedAt: `2026-10-09 10:00:0${id}`, caseTotal: 1 }, { sceneDbId: String(id) })
    row.cases = [execution.buildLayeredExecutionCaseRow({ caseExecutionDbId: id, definitionCaseId: 'CASE_001', status: 'queued' }, row)]
    row.casesLoaded = id === 2
    return row
  })
  assert.equal(execution.aggregateExecutionBatchRows(rows)[0].casesLoaded, false)
  rows[1].casesLoaded = true
  const batch = execution.aggregateExecutionBatchRows(rows)[0]
  assert.equal(batch.casesLoaded, true)
  assert.deepEqual(batch.cases.map(row => row.sceneKey), ['1', '2'])
})

test('普通历史覆盖全部 26 场景、按编号排序，记录第 23 页仍使用全局统计和真实总数', async () => {
  const scenes = Array.from({ length: 26 }, (_, index) => ({ sceneDbId: String(1001 + index), sceneKey: `SCENE_${String(index + 1).padStart(3, '0')}`, name: `场景 ${index + 1}` }))
  const records = Array.from({ length: 503 }, (_, index) => ({ executionDbId: 90000 - index, sceneDbId: scenes[index % 25].sceneDbId, sceneKey: scenes[index % 25].sceneKey, batchId: `batch-${index}`, executionEngine: 'playwright-runner', status: 'completed', result: 'passed', startedAt: new Date(1791430000000 - index * 1000).toISOString(), caseTotal: 1, casePass: 1 }))
  const calls = []
  const scope = { total: 26, completed: 25, passed: 22, failed: 2, cancelled: 1, blocked: 0, skipped: 0, notExecuted: 1 }
  const mocks = historyMocks(async () => { throw new Error('禁止再逐场景截取前 20 条历史') })
  Object.assign(mocks['@/apis/automation/automationUiQuery'], {
    getAutomationUiSceneSummaryPage: async (query) => {
      calls.push({ kind: 'options', query })
      return { data: { list: [...scenes].reverse(), total: 26 } }
    },
    getAutomationUiExecutionHistory: async (query, page, size) => {
      calls.push({ kind: 'history', query, page, size })
      const matching = query.sceneDbId ? records.filter((row) => row.sceneDbId === query.sceneDbId) : records
      return { data: { list: matching.slice((page - 1) * size, page * size), total: matching.length } }
    },
    getAutomationUiExecutionHistorySummary: async (query) => ({ data: query.sceneDbId ? { ...scope, total: 1, completed: 0, passed: 0, failed: 0, cancelled: 0 } : scope }),
  })
  const workspace = mount('AutomationUiSceneHistoryWorkspace.vue', mocks, { liveExecutions: [] })
  let panel
  try {
    await workspace.state.openHistory({ kind: 'all' })
    assert.equal(workspace.state.sceneFilterOptions[0].label, '全部场景')
    assert.equal(workspace.state.sceneFilterOptions.length, 27)
    assert.deepEqual(workspace.state.scenes.map((scene) => scene.id), scenes.map((scene) => scene.sceneDbId))
    assert.deepEqual(calls[0].query.sort, ['sceneId,asc', 'createTime,asc'])
    assert.equal(workspace.state.scopeSummary.total, 26)
    assert.equal(workspace.state.scopeSummary.notExecuted, 1)
    assert.equal(workspace.state.executionTotal, 503)
    assert.equal(workspace.state.executionBatches.length, 10)
    await workspace.state.loadExecutionPage(23, 10)
    assert.equal(workspace.state.executionPage, 23)
    assert.equal(workspace.state.executionBatches[0].batchId, 'batch-220')
    assert.equal(workspace.state.scopeSummary.total, 26)
    assert.equal(calls.filter((call) => call.kind === 'options').length, 1, '翻历史页不重新枚举场景')
    const pages = []
    panel = mount('AutomationExecutionHistoryPanel.vue', { '../execution': execution }, {
      scenes: workspace.state.scenes,
      executionBatches: workspace.state.executionBatches,
      scopeSummary: workspace.state.scopeSummary,
      serverPagedScope: true,
      executionTotal: 503,
      executionPage: 23,
      executionPageSize: 10,
      liveExecutions: [{ sceneKey: scenes[0].sceneDbId, batchId: 'batch-0', caseId: 'case', status: 'running' }],
      loadExecutionPage: async (page, size) => { pages.push([page, size]) },
    })
    assert.equal(panel.state.summaryCards[0].value, 26)
    assert.equal(panel.state.displayTotal, 503)
    assert.equal(panel.state.effectiveLiveExecutions.length, 0, '第一页实时任务不得插入第 23 页')
    assert.equal(panel.state.pagedBatchRows.length, 10)
    panel.state.changeViewMode('cards')
    panel.state.pagination.onChange(24)
    assert.deepEqual(pages, [[24, 10]])
    assert.equal(panel.state.displayTotal, 503)
    await workspace.state.onSceneChange(scenes[25].sceneDbId)
    assert.equal(workspace.state.sceneFilterValue, scenes[25].sceneDbId)
    assert.equal(workspace.state.executionPage, 1)
    assert.equal(workspace.state.executionTotal, 0)
    assert.equal(workspace.state.scopeSummary.total, 1)
    assert.equal(workspace.state.sceneFilterOptions.length, 27)
    const template = read(path.join(dir, 'components/AutomationUiSceneHistoryWorkspace.vue'))
    assert.doesNotMatch(template, /scene-scope-pagination|本页全部场景/)
  } finally {
    panel?.close()
    workspace.close()
  }
})

test('场景选项内部按 50 条拉取完整范围，不再由场景 UI 分页截断', async () => {
  const scenes = Array.from({ length: 76 }, (_, index) => ({ sceneDbId: String(index + 1), sceneKey: `S_${index + 1}`, name: '场景' }))
  const mocks = historyMocks()
  const pages = []
  mocks['@/apis/automation/automationUiQuery'].getAutomationUiSceneSummaryPage = async ({ page, size }) => {
    pages.push([page, size])
    return { data: { list: scenes.slice((page - 1) * size, page * size), total: scenes.length } }
  }
  mocks['@/apis/automation/automationUiQuery'].getAutomationUiExecutionHistorySummary = async () => ({ data: { total: 76, completed: 0, passed: 0, failed: 0, cancelled: 0, skipped: 0, blocked: 0, notExecuted: 76 } })
  const workspace = mount('AutomationUiSceneHistoryWorkspace.vue', mocks, { liveExecutions: [] })
  try {
    await workspace.state.openHistory({ kind: 'all' })
    assert.deepEqual(pages, [[1, 50], [2, 50]])
    assert.equal(workspace.state.sceneFilterOptions.length, 77)
    assert.equal(workspace.state.scopeSummary.total, 76)
    assert.equal(workspace.state.sceneFilterOptions[76].value, '76')
  } finally { workspace.close() }
})

test('批量场景只登记一个服务端任务，子批次和后续任务分别隔离', async () => {
  const scenes = [sceneDef(1), sceneDef(2), sceneDef(3)]
  const app = harness(scenes)
  try {
    app.parent.selectedKeys = scenes.map((scene) => scene.id)
    await app.parent.onBatchExecute('playwright-runner')
    await app.next()
    assert.equal(app.persistedRuns.length, 0, '配置确认前不创建任务')
    await app.start()
    assert.equal(app.persistedRuns.length, 1)
    assert.deepEqual(app.persistedRuns[0].sceneIds, scenes.map((scene) => scene.id))
    assert.deepEqual(app.batches.map((batch) => batch.runId), ['9001', '9001', '9001'])
    assert.ok(app.batches.every((batch) => !batch.testReportId && !batch.testPlanId))
    assert.deepEqual(app.finishedRuns, [['9001', undefined]])
    assert.equal(app.runs.at(-1).serverRunId, '9001')
    await app.parent.onBatchExecute('playwright-runner')
    await app.next()
    await app.start()
    assert.equal(app.persistedRuns.length, 2)
    assert.deepEqual(app.batches.slice(3).map((batch) => batch.runId), ['9002', '9002', '9002'])
  } finally { app.close() }
})

test('登记整次任务期间取消，登记完成后收尾但不创建任何子批次', async () => {
  const gate = deferred()
  const scenes = [sceneDef(1), sceneDef(2)]
  const app = harness(scenes, { beforeRun: () => gate.promise })
  let running
  try {
    app.parent.selectedKeys = scenes.map((scene) => scene.id)
    await app.parent.onBatchExecute('playwright-runner')
    await app.next()
    running = app.start()
    await app.parent.cancelExecutionRun(app.runs.at(-1).id)
    gate.resolve()
    await running
    assert.equal(app.batches.length, 0)
    assert.equal(app.jobs.length, 0)
    assert.deepEqual(app.finishedRuns, [['9001', undefined]])
    assert.ok(app.runs.at(-1).scenes.every((scene) => scene.executeStatus === 'cancelled'))
  } finally {
    gate.resolve()
    await running
    app.close()
  }
})

test('服务端登记失败时明确报错，不退回分散历史执行', async () => {
  const scenes = [sceneDef(1), sceneDef(2)]
  const app = harness(scenes, { beforeRun: () => {
    throw new Error('任务服务不可用')
  } })
  try {
    app.parent.selectedKeys = scenes.map((scene) => scene.id)
    await app.parent.onBatchExecute('playwright-runner')
    await app.next()
    await app.start()
    assert.deepEqual(app.errors, ['任务服务不可用'])
    assert.equal(app.batches.length, 0)
    assert.equal(app.parent.sceneExecutionRunning, false)
  } finally { app.close() }
})

test('已取消的实时状态、字符串落库状态和数字字典状态使用同一颜色', () => {
  const saved = globalThis.React
  globalThis.React = { createElement: (type, props, ...children) => ({ type, props, children }) }
  const app = harness([sceneDef(1)])
  try {
    const column = app.parent.columns.find((item) => item.title === '执行状态')
    const local = column.render({ record: { __localExecutionStatus: 'cancelled' } })
    for (const executeStatus of ['cancelled', '已取消', '17', 17]) {
      const persisted = column.render({ record: { debugRecord: [{ executeStatus }] } })
      assert.equal(persisted.props.color, local.props.color)
      assert.deepEqual(persisted.children, local.children)
    }
    const result = app.parent.columns.find((item) => item.title === '执行结果')
    assert.equal(result.render({ record: { debugRecord: [{ executeResult: 'cancelled' }] } }).props.color, local.props.color)
  } finally {
    app.close()
    globalThis.React = saved
  }
})

test('单场景历史查询真实子批次，全部场景仍查询持久化任务', async () => {
  const requests = []
  const api = load(read(path.join(root, 'src/apis/automation/automationUiQuery.ts')), {
    '@/utils/http': { default: { requestNative: async (request) => {
      requests.push(request)
      return { data: { list: [], total: 0 }, status: 200, headers: {} }
    } } },
    'query-string': { default: { stringify: () => '' } },
  }, 'automationUiQuery.ts')
  await api.getAutomationUiExecutionHistory({ projectId: '100' }, 1, 10)
  await api.getAutomationUiExecutionHistory({ projectId: '100', sceneDbId: '1001' }, 2, 20)
  assert.deepEqual(requests.map((request) => request.url), ['/automation/executions/history/runs', '/automation/executions/history'])
  assert.equal(requests[1].params.sceneDbId, '1001')
  assert.equal(requests[1].params.page, 2)
})

test('单场景统计卡使用全历史用例汇总，表格使用各批次自己的用例数', () => {
  const batch = execution.buildExecutionRunHistoryRow({ executionDbId: 91, executionKey: 'child', sceneDbId: 1001, sceneKey: 'SCENE_1', batchId: 'child-1', recordSource: 'debug', status: 'completed', result: 'passed', caseTotal: 5, casePass: 5 })
  const panel = mount('AutomationExecutionHistoryPanel.vue', { '../execution': execution }, {
    scenes: [{ id: 1001, sceneId: 'SCENE_1' }],
    aggregateBatches: false,
    executionBatches: [batch],
    scopeSummary: { dimension: 'case', total: 70, completed: 68, passed: 67, failed: 1, cancelled: 0, skipped: 0, blocked: 0 },
    serverPagedScope: true,
  })
  try {
    assert.equal(panel.state.summaryCards[0].label, '总用例')
    assert.equal(panel.state.summaryCards[0].value, 70)
    assert.equal(panel.state.summaryCards.length, 7)
    assert.equal(panel.state.pagedBatchRows[0].caseTotal, 5)
    assert.ok(panel.state.batchColumns.some((column) => column.title === '总用例'))
    assert.ok(!panel.state.batchColumns.some((column) => column.title === '总场景'))
    panel.state.changeViewMode('cards')
    assert.equal(panel.state.summaryCards[0].value, 70, '视图切换不改变顶部用例统计')
  } finally { panel.close() }
})
