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
const filename = path.join(root, 'src/views/automation/automationUiScene/components/AutomationExecutionResultDrawer.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'execution-result-drawer-regression' })

function evaluate(source, mocks = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText
  const module = { exports: {} }
  compileFunction(output, ['require', 'module', 'exports'])(name => mocks[name] ?? require(name), module, module.exports)
  return module.exports
}

const execution = evaluate(fs.readFileSync(path.join(root, 'src/views/automation/automationUiScene/execution.ts'), 'utf8'))
const renderer = Vue.createRenderer({
  createElement: tag => ({ tag, children: [] }), createText: text => ({ text }), createComment: text => ({ text }),
  insert: (child, parent) => parent.children.push(child), remove() {}, patchProp() {}, setText() {}, setElementText() {},
  parentNode: () => null, nextSibling: () => null,
})
const planId = '895600000000000001'
const reportId = '895638311584923682'
const executionId = '895638312910323751'

function mount(recordSource = 'test', status = 'passed', engine = 'playwright-runner') {
  const detail = {
    executionDbId: executionId, executionKey: 'scene:20260930114653', sceneKey: 'AAS_DBSG_SMOKE_002',
    recordSource, testPlanId: recordSource === 'test' ? planId : undefined,
    testReportId: recordSource === 'test' ? reportId : undefined,
    status, result: status, consoleUrl: '/jenkins/console', testReportUrl: '/jenkins/report',
  }
  const mocks = {
    vue: Vue,
    '@vueuse/core': { useWindowSize: () => ({ width: Vue.ref(1440) }) },
    '@arco-design/web-vue': { Message: { error() {} } },
    '../execution': execution,
    './AutomationExecutionLiveView.vue': {},
    './AutomationExecutionLogViewer.vue': {},
    '@/utils/auth': { getToken: () => '' },
    '@/apis/automation/automationUiScene': { getAutomationUiScene: () => { throw new Error('不应回退读取场景大字段') } },
    '@/apis/automation/automationUiQuery': {
      AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT: 50,
      getAutomationUiExecution: async () => ({ data: detail }),
      getAutomationUiExecutionCases: async () => ({ data: { total: 1, list: [{
        caseExecutionDbId: 11, definitionCaseId: 'SCENE_CASE_003', caseName: '解锁',
        caseExecutionKey: '20260930114656', jobId: 'runner-job-3', status,
        stepTotal: 1, stepPass: 1,
      }] } }),
      getAutomationUiExecutionSteps: async () => ({ data: { total: 1, list: [{
        stepIndex: 0, definitionStepId: 'CASE_STEP_002', actionType: 'input', status: 'passed',
      }] } }),
      getAutomationUiExecutionArtifacts: async () => ({ data: { list: [
        { artifactDbId: 1, caseExecutionDbId: 10, artifactType: 'video' },
        ...['execution_log', 'report', 'video'].map((artifactType, index) => ({
          artifactDbId: index + 2, caseExecutionDbId: 11, artifactType,
        })),
      ] } }),
      getAutomationUiExecutionArtifactContentUrl: (id, artifactId) => `/automation/executions/${id}/artifacts/${artifactId}/content`,
    },
  }
  const component = evaluate(
    `import { ref, computed, watch, onUnmounted } from 'vue'\n${script.content}`.replaceAll('import.meta.env', '({})'),
    mocks,
  ).default
  component.render = () => null
  const instance = renderer.createApp(component)
  const exposed = instance.mount({ children: [] })
  return {
    state: exposed.$.setupState,
    open: view => exposed.onOpen('885591573465662960', engine, view, {
      source: recordSource, testPlanId: recordSource === 'test' ? planId : undefined,
      target: { executionDbId: executionId, caseId: 'SCENE_CASE_003' },
    }),
    close: () => instance.unmount(),
  }
}

for (const view of ['log', 'live', 'report', 'video']) {
  test(`测试报告 ${view} 入口保留计划归属、用例及产物关联`, async (t) => {
    const drawer = mount('test', view === 'live' ? 'running' : 'passed')
    t.after(drawer.close)
    await drawer.open(view)
    assert.equal(drawer.state.records.length, 1)
    assert.equal(drawer.state.selectedRecord.testPlanId, planId)
    assert.equal(drawer.state.selectedRecord.testReportId, reportId)
    assert.equal(drawer.state.selectedJobId, 'runner-job-3')
    assert.equal(drawer.state.selectedExecutionId, '20260930114656')
    assert.equal(drawer.state.stepResults.length, 1)
    assert.match(drawer.state.executionLogArtifactUrl, /\/2\/content$/)
    assert.match(drawer.state.reportArtifactUrl, /\/3\/content$/)
    assert.match(drawer.state.videoArtifactUrl, /\/4\/content$/)
    assert.equal(execution.getExecutionRecords(drawer.state.scene, 'playwright-runner', 'test', 'another-plan').length, 0)
    assert.equal(execution.getExecutionRecords(drawer.state.scene, 'playwright-runner', 'debug').length, 0)
  })
}

test('UI 自动化调试记录仍可打开，且不会混入测试计划', async (t) => {
  const drawer = mount('debug')
  t.after(drawer.close)
  await drawer.open('report')
  assert.equal(drawer.state.records.length, 1)
  assert.equal(execution.getExecutionRecords(drawer.state.scene, 'playwright-runner', 'test', planId).length, 0)
})

test('Jenkins 计划记录仍保留原日志和报告链接', async (t) => {
  const drawer = mount('test', 'passed', 'jenkins')
  t.after(drawer.close)
  await drawer.open('log')
  assert.equal(drawer.state.records.length, 1)
  assert.equal(drawer.state.selectedRecord.consoleUrl, '/jenkins/console')
  assert.equal(drawer.state.selectedRecord.testReportUrl, '/jenkins/report')
})
