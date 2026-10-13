import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

if (process.argv.includes('--compare-heights')) {
  const results = await Promise.all([[], ['--history'], ['--grouped']].map(async (mode) => {
    const { stdout } = await promisify(execFile)(process.execPath, [fileURLToPath(import.meta.url), '--viewport', ...mode], { windowsHide: true, maxBuffer: 4 * 1024 * 1024 })
    return JSON.parse(stdout.trim().split('\n').at(-1))
  }))
  for (const result of results.slice(1)) {
    for (let index = 0; index < results[0].liveHeights.length; index++) {
      const current = results[0].liveHeights[index]
      const history = result.liveHeights[index]
      assert.ok(Math.abs(history.height - current.height) <= 2, `同窗口画面高度应一致：${JSON.stringify({ current, history, grouped: result.groupedMode })}`)
    }
  }
  console.log(JSON.stringify({ result: 'passed', comparison: results }))
  process.exit(0)
}

// 使用真实历史面板、用例卡片、日志及报告组件；只替换接口和无关诊断，不读取账号。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const { createServer } = require('vite')
const vuePlugin = require('@vitejs/plugin-vue')
const vueJsxPlugin = require('@vitejs/plugin-vue-jsx')
const autoImport = require('unplugin-auto-import/vite')

const browserRequire = createRequire(path.resolve(root, '../sakura-playwright/package.json'))
const { chromium } = browserRequire('playwright')

const output = fs.mkdtempSync(path.join(os.tmpdir(), 'sakura-run-view-'))
const groupedMode = process.argv.includes('--grouped')
const reportMode = process.argv.includes('--report')
const editorMode = process.argv.includes('--editor')
const viewportMode = process.argv.includes('--viewport') || editorMode
const historyMode = process.argv.includes('--history') || groupedMode
const api = `
export const getAutomationUiExecutions = async q => ({data:{list:[{sceneDbId:q.sceneDbId,batchId:q.batchId,executionDbId:91,executionKey:'qa-child',executionEngine:'playwright-runner',caseTotal:3,casePass:2,caseFail:1,status:'completed',result:'failed'}]}});
export const getAutomationUiExecutionCases=async(id)=>{window.__qaCaseRequests=(window.__qaCaseRequests||0)+1;const failed=[90000,91].includes(Number(id));return {data:{list:Array.from({length:3},(_,i)=>({caseExecutionDbId:101+i,definitionCaseId:'SCENE_CASE_'+String(i+1).padStart(3,'0'),caseExecutionKey:'case-exec-'+i,caseName:['登录并初始化环境','查看系统帮助信息','验证退出后的页面状态'][i],status:'completed',result:i===2&&failed?'failed':'passed',stepTotal:3,stepPass:i===2&&failed?2:3,stepFail:i===2&&failed?1:0,stepSkip:0,durationMs:1250,startedAt:'2026-10-07T21:26:22+08:00',finishedAt:'2026-10-07T21:26:23.250+08:00'})),total:3}}};
export const getAutomationUiExecutionSteps=async()=>{window.__qaStepRequests=(window.__qaStepRequests||0)+1;return {data:{list:Array.from({length:3},(_,i)=>({stepExecutionDbId:201+i,stepIndex:i,stepName:'验证步骤 '+(i+1),actionType:'click',status:'passed',durationMs:100})),total:3}}};
export const getAutomationUiExecutionStep=async()=>({data:{}});
export const getAutomationUiExecutionArtifacts=async()=>({data:{list:[]}});
export const AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT=50;
export const getAutomationUiExecutionArtifactContentUrl=()=>'';
export const getAutomationPlaywrightRunnerJob=async()=>({data:{status:'passed',logs:[]}});
export const getAutomationPlaywrightRunnerLiveUrl=()=>'';
export const cancelAutomationPlaywrightBatch=async()=>({});
export const cancelAutomationUiExecutionRun=async()=>({});
export const cancelAutomationPlaywrightBatchCase=async()=>{window.__qaCancelledCases=(window.__qaCancelledCases||0)+1;return {}};`
const historyApi = `
const scenes=Array.from({length:26},(_,i)=>({sceneDbId:String(1001+i),sceneKey:'AAS_DBSG_SMOKE_'+String(i+1).padStart(3,'0'),name:'系统管理平台 - 场景 '+(i+1)}));
const records=Array.from({length:503},(_,i)=>({executionDbId:90000-i,executionKey:'history-'+i,batchId:'BATCH_'+String(i+1).padStart(4,'0'),sceneDbId:scenes[i%25].sceneDbId,sceneKey:scenes[i%25].sceneKey,executionEngine:'playwright-runner',status:'completed',result:i===0?'failed':'passed',caseTotal:3,casePass:i===0?2:3,caseFail:i===0?1:0,stepTotal:9,stepPass:i===0?8:9,stepFail:i===0?1:0,startedAt:new Date(1791430000000-i*1000).toISOString(),finishedAt:new Date(1791430000500-i*1000).toISOString(),durationMs:500}));
const taskScenes=scenes.map((scene,i)=>({...scene,sceneName:scene.name,sceneOrder:i,runId:'80001',executionDbId:i<3?90000-i:undefined,executionKey:'task-scene-'+i,batchId:i<3?'CHILD_'+i:undefined,executionEngine:'playwright-runner',status:i<3?'completed':'cancelled',result:i===0?'failed':i<3?'passed':'cancelled',caseTotal:i<3?3:0,casePass:i===0?2:i<3?3:0,caseFail:i===0?1:0,durationMs:i<3?3750:0,updateTime:'2026-10-08T17:30:00+08:00'}));
const task={runId:'80001',executionKey:'run:80001',batchId:'80001',recordSource:'debug',executionEngine:'playwright-runner',status:'cancelled',result:'cancelled',sceneTotal:26,sceneCompleted:26,scenePass:2,sceneFail:1,sceneCancelled:23,caseTotal:9,casePass:8,caseFail:1,durationMs:11250,executeName:'测试执行人',startedAt:'2026-10-08T17:20:00+08:00',finishedAt:'2026-10-08T17:30:00+08:00',updateTime:'2026-10-08T17:30:00+08:00'};
window.__qaUpdateHistory=()=>{records[0].updateTime='2026-10-08T16:30:00+08:00'};
export const getAutomationUiSceneSummaryPage=async q=>({data:{list:scenes.slice((q.page-1)*q.size,q.page*q.size).reverse(),total:26}});
export const getAutomationUiExecutionHistory=async(q,page,size)=>{window.__qaHistoryRequests=(window.__qaHistoryRequests||0)+1;const rows=q.sceneDbId?records.filter(r=>r.sceneDbId===q.sceneDbId):${groupedMode}?[task,...records.slice(5,7)]:records;return {data:{list:rows.slice((page-1)*size,page*size),total:rows.length}}};
export const getAutomationUiExecutionRunScenes=async(id,q,page,size)=>{window.__qaRunSceneRequests=(window.__qaRunSceneRequests||0)+1;const rows=q.sceneDbId?taskScenes.filter(r=>r.sceneDbId===q.sceneDbId):taskScenes;return {data:{list:rows.slice((page-1)*size,page*size),total:rows.length}}};
export const getAutomationUiExecutionHistorySummary=async q=>({data:q.sceneDbId?{dimension:'case',total:q.sceneDbId==='1026'?0:3,completed:q.sceneDbId==='1026'?0:3,passed:q.sceneDbId==='1026'?0:2,failed:q.sceneDbId==='1026'?0:1,blocked:0,cancelled:0,skipped:0,notExecuted:0}:{dimension:'scene',total:26,completed:25,passed:22,failed:2,blocked:0,cancelled:1,skipped:0,notExecuted:1}});
export const getAutomationUiDefinitionCase=async()=>({});export const getAutomationUiSceneDefinition=async()=>({});export const listAutomationUiDefinitionCases=async()=>({});export const listAutomationUiDefinitionSteps=async()=>({});`
const reportApi = `
window.__qaCaseStates={1:['running','queued','queued'],2:['queued','queued','queued']};
const summary=id=>({sceneDbId:String(id),sceneKey:'SCENE_00'+id,name:'报告场景 '+id,latestExecution:{executionDbId:id,executionKey:'report-scene-'+id,batchId:'report-batch-'+id,testReportId:'report-1',recordSource:'test',executionEngine:'playwright-runner',caseTotal:3,casePass:window.__qaCaseStates[id].filter(s=>s==='completed').length,status:window.__qaCaseStates[id].every(s=>s==='completed')?'completed':'running',startedAt:'2026-10-09 10:00:0'+id}});
export const getAutomationUiSceneSummaryPage=async()=>({data:{list:[summary(2),summary(1)],total:2}});
export const getAutomationUiExecutionRevisionsBatched=async()=>({data:[{sceneDbId:'1',globalExecutionRevision:Date.now()}]});
export const getAutomationUiDefinitionCase=async()=>({});export const getAutomationUiSceneDefinition=async()=>({});export const listAutomationUiDefinitionCases=async()=>({});export const listAutomationUiDefinitionSteps=async()=>({});`
const virtual = {
  name: 'run-view-qa',
  enforce: 'pre',
  resolveId(id) {
    if (id === 'virtual:run-view-qa') return '\0qa-entry'
    if (editorMode && id.endsWith('/hooks')) return '\0qa-layout-hooks'
    if (id.endsWith('AutomationExecutionResultDrawer.vue') || id.endsWith('AutomationExecutionStepDiagnostic.vue')) return '\0qa-unused'
    if (id.includes('/utils/auth')) return '\0qa-auth'
    if (reportMode && id.includes('/utils/sakura')) return '\0qa-format'
    if (reportMode && id.includes('/apis/test/testPlan')) return '\0qa-plan'
    if (id.includes('/stores/modules/uiStore')) return '\0qa-store'
    if (id.includes('/apis/automation/automationUiQuery') || id.endsWith('/automationUiQuery') || id.endsWith('/automationUiQuery.ts') || id.includes('/apis/automation/automationPlaywrightRunner')) return '\0qa-api'
  },
  load(id) {
    if (id === '\0qa-layout-hooks') return "export * from '/src/hooks/modules/useDevice.ts';export * from '/src/hooks/modules/useBreakpoint.ts';"
    if (id === '\0qa-api') {
      let source = reportMode
        ? api.replace('caseExecutionDbId:101+i', 'caseExecutionDbId:Number(id)*10+i')
          .replace('status:\'completed\',result:i===2&&failed?\'failed\':\'passed\'', 'status:window.__qaCaseStates[id][i],result:window.__qaCaseStates[id][i]===\'completed\'?\'passed\':\'not_executed\'') + reportApi
        : api + historyApi
      if (viewportMode) {
        source = source.replace('caseName:[', 'jobId:\'qa-live\',caseName:[')
          .replace('status:\'completed\',result:i===2&&failed?', 'status:\'running\',result:i===2&&failed?')
          .replace('getAutomationPlaywrightRunnerLiveUrl=()=>\'\'', 'getAutomationPlaywrightRunnerLiveUrl=()=>location.origin+\'/qa-live-frame\'')
          .replace('status:\'passed\',logs:[]', 'status:\'running\',logs:Array.from({length:100},(_,i)=>({sequence:i+1,timestamp:\'2026-10-09 14:26:30.000\',level:\'info\',message:\'视口验证日志 \'+i}))')
          .replace('length:3},(_,i)=>({stepExecutionDbId', 'length:30},(_,i)=>({stepExecutionDbId')
      }
      return source
    }
    if (id === '\0qa-format') return 'export const formatDuration=value=>String(value);'
    if (id === '\0qa-plan') return 'export const cancelTestPlanExecution=async()=>({});'
    if (id === '\0qa-store') return 'export const useUiStore=()=>({projectId:\'100\',versionId:\'200\',activeKey:\'history\',getSceneModuleIds:()=>undefined});'
    if (id === '\0qa-unused') return 'export default {render(){return null}}'
    if (id === '\0qa-auth') return 'export const getToken=()=>undefined;'
    if (id === '\0qa-entry') {
      if (editorMode) {
        // 复用编辑页实际的左右布局和历史组件，只省略不相关的表单与用例树接口。
        assert.match(fs.readFileSync(path.join(root, 'src/views/automation/automationUiScene/components/AddOrEditForm.vue'), 'utf8'), /<AutomationExecutionHistoryPanel\s+scroll-with-parent/)
        return `
import {createApp,h,reactive} from 'vue';
import Arco from '@arco-design/web-vue';import Icons from '@arco-design/web-vue/es/icon';import '@arco-design/web-vue/dist/arco.css';
import {createRouter,createMemoryHistory} from 'vue-router';
import Layout from '/src/components/GiPageLayout/index.vue';
import History from '/src/views/automation/automationUiScene/components/AutomationExecutionHistoryPanel.vue';
import GiTable from '/src/components/GiTable/src/GiTable.vue';import ColumnSetting from '/src/components/GiTable/src/components/ColumnSetting.vue';
import {buildLayeredExecutionBatchRow,buildLayeredExecutionCaseRow,buildLayeredExecutionStepRow} from '/src/views/automation/automationUiScene/execution.ts';
import {getAutomationUiExecutionCases,getAutomationUiExecutionSteps} from '/src/apis/automation/automationUiQuery';
const scene={id:'1001',sceneId:'SCENE_001',name:'编辑中的 UI 场景'};
const batches=reactive(Array.from({length:5},(_,i)=>buildLayeredExecutionBatchRow({executionDbId:91+i,batchId:'EDITOR_BATCH_'+i,executionEngine:'playwright-runner',caseTotal:3,status:i?'completed':'running',startedAt:Date.now()-i*1000},{sceneDbId:scene.id,sceneKey:scene.sceneId,name:scene.name})));
window.__qaEditorBatch=batches[0];
const loadCases=async batch=>{const {data}=await getAutomationUiExecutionCases(batch.executionDbId);batch.cases=data.list.map((row,index)=>buildLayeredExecutionCaseRow({...row,status:index?'queued':'running',caseName:'验证在登录页面，使用正确系统管理员账号和密码，可以正常登录成功 '+index},batch));batch.casesLoaded=true};
const loadSteps=async record=>{const {data}=await getAutomationUiExecutionSteps(record.caseExecutionDbId);record.steps=data.list.map(row=>buildLayeredExecutionStepRow(row,record));record.stepsLoaded=true};
createApp({render:()=>h(Layout,{margin:false,padding:false,leftStyle:{width:440}},{left:()=>h('aside',{class:'editor-case-tree'},'基础信息　|　场景用例'),default:()=>h('div',{class:'detail-panel',style:'width:100%;flex:1;min-width:0;min-height:0;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable'},[h(History,{scene,executionBatches:batches,scrollWithParent:true,loadExecutionCases:loadCases,loadExecutionSteps:loadSteps})])})}).component('GiTable',GiTable).component('ColumnSetting',ColumnSetting).use(createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{render:()=>null}}]})).use(Arco).use(Icons).mount('#app');`
      }
      if (reportMode) {
        return `
import {createApp,h} from 'vue';
import Arco from '@arco-design/web-vue';import Icons from '@arco-design/web-vue/es/icon';import '@arco-design/web-vue/dist/arco.css';
import {createRouter,createMemoryHistory} from 'vue-router';
import Report from '/src/views/test/testReport/components/TestReportPlaywrightDetail.vue';
import GiTable from '/src/components/GiTable/src/GiTable.vue';import ColumnSetting from '/src/components/GiTable/src/components/ColumnSetting.vue';
createApp({render:()=>h(Report,{detailData:{id:'report-1',testPlanId:'plan-1',status:'RUNNING',reportType:'PLAYWRIGHT',statisticAnalysis:{ui:{sceneTotal:2}}}})}).component('GiTable',GiTable).component('ColumnSetting',ColumnSetting).use(createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{render:()=>null}}]})).use(Arco).use(Icons).mount('#app');`
      }
      if (historyMode) {
        return `
import {createApp,h,ref,onMounted} from 'vue';
import Arco from '@arco-design/web-vue';import Icons from '@arco-design/web-vue/es/icon';import '@arco-design/web-vue/dist/arco.css';
import {createRouter,createMemoryHistory} from 'vue-router';
import Workspace from '/src/views/automation/automationUiScene/components/AutomationUiSceneHistoryWorkspace.vue';
import {createExecutionRun} from '/src/views/automation/automationUiScene/executionRun.ts';
import GiTable from '/src/components/GiTable/src/GiTable.vue';import ColumnSetting from '/src/components/GiTable/src/components/ColumnSetting.vue';
const app=createApp({setup(){const workspace=ref();const run=createExecutionRun([{id:'1001',sceneId:'AAS_DBSG_SMOKE_001',name:'本次任务场景',caseList:[]}],'playwright-runner');onMounted(()=>workspace.value.openHistory({kind:'all'}));return ()=>h(Workspace,{ref:workspace,executionRun:run,liveExecutions:[]})}});
app.component('GiTable',GiTable).component('ColumnSetting',ColumnSetting).use(createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{render:()=>null}}]})).use(Arco).use(Icons).mount('#app');`
      }
      return `
import {createApp,h,reactive} from 'vue';
import Arco from '@arco-design/web-vue';
import Icons from '@arco-design/web-vue/es/icon';
import '@arco-design/web-vue/dist/arco.css';
import Panel from '/src/views/automation/automationUiScene/components/AutomationUiExecutionRunPanel.vue';
import {createExecutionRun} from '/src/views/automation/automationUiScene/executionRun.ts';
const run=reactive(createExecutionRun(Array.from({length:26},(_,i)=>({id:String(1001+i),sceneId:'AAS_DBSG_SMOKE_'+String(i+1).padStart(3,'0'),name:'系统管理平台 - 测试场景 '+(i+1),caseList:Array.from({length:5},(_,j)=>({id:'case-'+j,stepList:[{status:1}]}))})),'playwright-runner'));
Object.assign(run.scenes[0],{executeStatus:'completed',executeResult:'failed',batchId:'20261007184150',caseTotal:3,casePass:2,caseFail:1});
const live=reactive([]);window.__qaLive=live;window.__qaRun=run;
createApp({render:()=>h(Panel,{run,liveExecutions:live})}).use(Arco).use(Icons).mount('#app');`
    }
  },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/qa-live-frame') {
        res.setHeader('Content-Type', 'image/svg+xml')
        res.setHeader('X-Sakura-Frame-Sequence', '1')
        res.setHeader('X-Sakura-Job-Status', 'running')
        res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#224477"/><rect x="5" y="5" width="1910" height="1070" fill="none" stroke="white" stroke-width="10"/><text x="120" y="150" font-size="80" fill="white">1920 x 1080 - complete frame</text></svg>')
        return
      }
      if (req.url !== '/') return next()
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(`<!doctype html><html><meta charset="utf-8"><body style="margin:20px">${viewportMode ? '<header style="position:fixed;inset:0 0 auto;height:88px;background:white;z-index:10">工作台 / UI 自动化 / 执行历史</header><main class="gi-page-layout__body" style="position:fixed;inset:100px 20px 16px;overflow:auto"><div id="app" style="height:100%"></div></main>' : '<div id="app"></div>'}<script type="module" src="/@id/__x00__qa-entry"></script></body></html>`)
    })
  },
}
const server = await createServer({
  configFile: false,
  root,
  cacheDir: path.join(output, 'vite-cache'),
  resolve: { alias: { '@': path.join(root, 'src') } },
  css: { preprocessorOptions: { scss: { additionalData: '@use "@/styles/var.scss" as *;', api: 'modern-compiler' } } },
  plugins: [virtual, (vuePlugin.default || vuePlugin)(), (vueJsxPlugin.default || vueJsxPlugin)(), (autoImport.default || autoImport)({ imports: ['vue'], dts: false })],
  optimizeDeps: { entries: [], include: ['vue', '@arco-design/web-vue'] },
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
})
let browser
try {
  await server.listen()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1050 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) => route.request().url().startsWith(base) ? route.continue() : route.abort())
  await page.goto(base, { waitUntil: 'networkidle' })
  if (viewportMode) {
    const liveHeights = []
    const expanded = page.locator('.batch-case-card--expanded')
    async function assertHeaderAlignment(label) {
      const bounds = await expanded.evaluate((card) => {
        const log = card.querySelector('.log-console').getBoundingClientRect()
        const live = card.querySelector('.live-stage').getBoundingClientRect()
        const workspace = card.querySelector('.execution-workspace').getBoundingClientRect()
        const layout = [...card.querySelectorAll('.workspace-panes, .workspace-pane, .execution-log-viewer, .live-view, .log-toolbar, .live-header, .log-console, .log-follow, .live-stage')].map(element => {
          const style = getComputedStyle(element)
          return { name: element.className, top: element.getBoundingClientRect().top, height: element.getBoundingClientRect().height, display: style.display, rows: style.gridTemplateRows, row: style.gridRow, column: style.gridColumn }
        })
        return { logTop: log.top, liveTop: live.top, width: workspace.width, layout }
      })
      if (bounds.width > 760) assert.ok(Math.abs(bounds.logTop - bounds.liveTop) <= 1, `${label} 内容顶部应对齐: ${JSON.stringify(bounds)}`)
    }
    async function assertViewport(label) {
      // 不使用 Playwright 的自动滚动辅助，直接验证页面自身完成的定位。
      await page.waitForTimeout(750)
      const bounds = await expanded.evaluate((card) => {
        const box = card.getBoundingClientRect()
        let top = 100
        let bottom = window.innerHeight - 16
        let left = 0
        let right = window.innerWidth
        const ancestors = []
        for (let parent = card.parentElement; parent; parent = parent.parentElement) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowX)) {
            const rect = parent.getBoundingClientRect()
            left = Math.max(left, rect.left + parent.clientLeft)
            right = Math.min(right, rect.left + parent.clientLeft + parent.clientWidth)
          }
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) {
            const rect = parent.getBoundingClientRect()
            top = Math.max(top, rect.top + parent.clientTop)
            bottom = Math.min(bottom, rect.top + parent.clientTop + parent.clientHeight)
            ancestors.push({ name: parent.className, top: rect.top, height: parent.clientHeight })
          }
        }
        return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, height: box.height, visibleTop: top, visibleBottom: bottom, visibleLeft: left, visibleRight: right, ancestors }
      })
      assert.ok(bounds.top >= bounds.visibleTop - 2 && bounds.bottom <= bounds.visibleBottom + 2, `${label}: ${JSON.stringify(bounds)}`)
      assert.ok(bounds.left >= bounds.visibleLeft - 2 && bounds.right <= bounds.visibleRight + 2, `${label} 横向: ${JSON.stringify(bounds)}`)
      assert.ok(bounds.height > 180, `${label}: 展开面板不能被压缩为空`)
    }
    await expanded.waitFor({ timeout: 10000 }).catch(async (error) => {
      await page.screenshot({ path: path.join(output, 'viewport-open-failed.png') })
      console.error(JSON.stringify({ errors, output, visibleText: (await page.locator('body').innerText()).slice(0, 2000) }))
      throw error
    })
    for (const size of [{ width: 1650, height: 900 }, { width: 1366, height: 768 }, { width: 1000, height: 700 }]) {
      await page.setViewportSize(size)
      await expanded.getByRole('button', { name: '双栏', exact: true }).evaluate((button) => button.click())
      for (const tab of ['双栏', '日志', '实时画面', '报告']) {
        await expanded.getByRole('button', { name: tab, exact: true }).evaluate((button) => button.click())
        if (tab === '日志' || tab === '双栏') await expanded.locator('.log-line').nth(99).waitFor({ state: 'attached' })
        if (tab === '实时画面' || tab === '双栏') {
          await expanded.locator('.live-frame-image').waitFor()
          assert.equal(await expanded.locator('.live-frame-image').evaluate((image) => getComputedStyle(image).objectFit), 'contain')
        }
        if (tab === '双栏') {
          await assertHeaderAlignment(`${size.width} 默认双栏`)
          const log = await expanded.locator('.workspace-pane--log').boundingBox()
          const live = await expanded.locator('.workspace-pane--live').boundingBox()
          if ((await expanded.locator('.execution-workspace').boundingBox()).width > 760) {
            assert.ok(live.x > log.x && Math.abs(live.height - log.height) < 2, '日志与画面左右同高')
            assert.ok(Math.abs(log.width / (log.width + live.width) - 0.38) < 0.01, '默认日志占 38%')
          } else {
            assert.ok(live.y < log.y && Math.abs(live.x - log.x) < 2, '编辑区较窄时上画面、下日志')
          }
          assert.equal(await expanded.locator('.execution-log-viewer .log-actions button').count(), 0, '日志不再提供独立沉浸按钮')
          assert.equal(await expanded.locator('.live-actions button').count(), 4, '画面工具栏保留细节和 1:1，并承载整体沉浸/全屏')
          assert.equal(await expanded.locator('.workspace-toolbar').count(), 0, '普通视图不能多占一行工具栏')
          for (const label of ['双栏', '日志', '实时画面']) {
            assert.equal(await expanded.locator('.batch-case-summary').getByRole('button', { name: label, exact: true }).isVisible(), true, `${label} 放回标题操作区`)
          }
          assert.equal(await expanded.locator('.live-actions').getByRole('button', { name: '沉浸', exact: true }).isVisible(), true)
          assert.equal(await expanded.locator('.live-actions').getByRole('button', { name: '全屏', exact: true }).isVisible(), true)
          assert.equal(await expanded.getByText('📋 详细', { exact: true }).isVisible(), true, '窄日志面板保留格式切换')
          await expanded.locator('.log-console').evaluate(element => { element.dataset.retained = 'yes' })
          await expanded.getByRole('button', { name: '实时画面', exact: true }).click()
          await expanded.getByRole('button', { name: '双栏', exact: true }).click()
          assert.equal(await expanded.locator('.log-console').getAttribute('data-retained'), 'yes', '切换布局不能销毁日志状态')
        }
        if (tab === '日志') {
          assert.equal(await expanded.locator('.log-actions').getByRole('button', { name: '沉浸', exact: true }).isVisible(), true, '仅日志时仍能进入整体沉浸')
          assert.equal(await expanded.locator('.log-actions').getByRole('button', { name: '全屏', exact: true }).isVisible(), true)
        }
        await assertViewport(`${size.width}x${size.height} ${tab}`)
        if (tab === '实时画面') liveHeights.push({ width: size.width, viewportHeight: size.height, height: (await expanded.locator('.live-stage').boundingBox()).height })
        await page.screenshot({ path: path.join(output, `viewport-${size.width}-${tab}.png`) })
      }
    }
    if (editorMode) await page.setViewportSize({ width: 1650, height: 900 })
    await expanded.getByRole('button', { name: '双栏', exact: true }).click()
    const divider = expanded.getByRole('separator', { name: '调整日志与画面比例' })
    await divider.press('ArrowRight')
    assert.equal(await divider.getAttribute('aria-valuenow'), '39')
    const dividerBounds = await divider.boundingBox()
    await page.mouse.move(dividerBounds.x + 4, dividerBounds.y + 30)
    await page.mouse.down()
    await page.mouse.move(dividerBounds.x + 84, dividerBounds.y + 30)
    await page.mouse.up()
    assert.ok(Number(await divider.getAttribute('aria-valuenow')) > 39, '拖拽能增加日志宽度')
    await divider.dblclick()
    assert.equal(await divider.getAttribute('aria-valuenow'), '38')
    const headerHeights = []
    for (const percent of [30, 55, 30, 38]) {
      const handle = await divider.boundingBox()
      const panes = await expanded.locator('.workspace-panes').boundingBox()
      await page.mouse.move(handle.x + handle.width / 2, handle.y + 30)
      await page.mouse.down()
      await page.mouse.move(panes.x + 4 + (panes.width - 8) * percent / 100, handle.y + 30)
      await page.mouse.up()
      assert.equal(Number(await divider.getAttribute('aria-valuenow')), percent)
      await assertHeaderAlignment(`拖拽日志至 ${percent}%`)
      headerHeights.push((await expanded.locator('.live-header').boundingBox()).height)
    }
    assert.ok(Math.abs(headerHeights[0] - headerHeights[2]) <= 1, '恢复栏宽后标题行高度应回落，不能残留空白')
    const expectedImmersiveBounds = await expanded.locator('.execution-workspace').evaluate(element => element.closest('.gi-page-layout__body').getBoundingClientRect().toJSON())
    await expanded.getByRole('button', { name: '沉浸', exact: true }).click()
    const immersive = page.locator('.execution-workspace--immersive')
    await immersive.waitFor()
    const immersiveBounds = await immersive.boundingBox()
    const immersiveHeight = immersiveBounds.height
    const workspaceHeight = expectedImmersiveBounds.height
    assert.ok(Math.abs(immersiveHeight - workspaceHeight) < 2, '双栏整体占满工作区，不受卡片限高影响')
    assert.ok(Math.abs(immersiveBounds.x - expectedImmersiveBounds.x) < 2, '编辑页沉浸仅覆盖右侧区域')
    assert.ok(immersiveBounds.y + immersiveBounds.height <= (await page.viewportSize()).height, '沉浸底部不能溢出')
    assert.equal(await immersive.locator('.log-console').isVisible(), true)
    assert.equal(await immersive.locator('.live-stage').isVisible(), true)
    await immersive.getByRole('button', { name: '日志', exact: true }).click()
    assert.equal(await immersive.locator('.log-actions').getByRole('button', { name: '退出沉浸', exact: true }).isVisible(), true, '沉浸内切换到日志后保留退出按钮')
    await immersive.getByRole('button', { name: '双栏', exact: true }).click()
    await immersive.getByRole('button', { name: '全屏', exact: true }).click()
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains('execution-workspace'))
    await immersive.getByRole('button', { name: '退出全屏', exact: true }).click()
    await page.waitForFunction(() => !document.fullscreenElement)
    await page.keyboard.press('Escape')
    await assertViewport('退出沉浸模式')
    await expanded.locator('.execution-workspace').evaluate(element => { element.style.width = '600px' })
    const narrowLog = await expanded.locator('.workspace-pane--log').boundingBox()
    const narrowLive = await expanded.locator('.workspace-pane--live').boundingBox()
    assert.ok(narrowLive.y < narrowLog.y && Math.abs(narrowLive.x - narrowLog.x) < 2, '窄容器应上画面、下日志')
    assert.equal(await divider.isVisible(), false)
    await expanded.locator('.execution-workspace').evaluate(element => { element.style.removeProperty('width') })
    await page.setViewportSize({ width: editorMode ? 1100 : 700, height: 900 })
    await page.waitForTimeout(250)
    assert.ok((await expanded.locator('.log-message').last().boundingBox()).width > 150, '窄屏日志正文不能被挤到图标列')
    await page.screenshot({ path: path.join(output, 'workspace-narrow.png') })
    await page.setViewportSize({ width: 1000, height: 700 })
    if (editorMode) {
      await page.setViewportSize({ width: 1650, height: 900 })
      await page.evaluate(() => {
        window.__qaEditorBatch.cases[0].executeStatus = 'passed'
        window.__qaEditorBatch.cases[1].executeStatus = 'running'
      })
      await page.locator('.batch-case-card').nth(1).locator('.batch-case-content').waitFor()
      await assertViewport('编辑区自动跟随下一条用例')
      assert.equal(await page.locator('.batch-detail').first().evaluate(element => getComputedStyle(element).maxHeight), 'none', '编辑区不能再次套用详情固定高度')
      assert.equal(await page.locator('.editor-case-tree').isVisible(), true)
      await page.screenshot({ path: path.join(output, 'editor-follow-next.png') })
      await page.evaluate(() => window.__qaEditorBatch.cases.forEach(row => { row.executeStatus = 'passed' }))
      await expanded.locator('.live-placeholder').waitFor()
      await assertHeaderAlignment('执行结束后双栏')
    } else if (!historyMode && !reportMode) {
      await page.evaluate(() => window.__qaLive.push(...[1, 2, 3].map((id) => ({ sceneKey: '1001', batchId: '20261007184150', caseId: `SCENE_CASE_00${id}`, executionId: `live-${id}`, jobId: 'qa-live', caseName: `实时用例 ${id}`, executionType: 'playwright-runner', status: id === 1 ? 'running' : 'queued', stepTotal: 3 }))))
      await page.locator('.batch-case-card').first().locator('.batch-case-content').waitFor()
      for (let index = 0; index < 2; index++) {
        await page.evaluate((current) => {
          window.__qaLive[current].status = 'passed'
          window.__qaLive[current + 1].status = 'running'
        }, index)
        await page.locator('.batch-case-card').nth(index + 1).locator('.batch-case-content').waitFor()
      }
      await page.locator('.batch-case-card').nth(2).locator('.batch-case-content').waitFor()
      await assertViewport('自动切换第三用例')
    }
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ result: 'passed', viewport: true, historyMode, groupedMode, reportMode, editorMode, liveHeights, output }))
  } else if (reportMode) {
    await page.locator('.batch-case-content').waitFor()
    assert.equal(await page.locator('.batch-case-card--expanded').getAttribute('data-batch-case'), 'case-execution-10')
    await page.locator('.batch-case-card--expanded').getByRole('button', { name: '报告', exact: true }).click()
    for (let index = 0; index < 3; index++) {
      await page.evaluate((current) => {
        window.__qaCaseStates[1][current] = 'completed'
        if (current < 2) window.__qaCaseStates[1][current + 1] = 'running'
        else window.__qaCaseStates[2][0] = 'running'
      }, index)
      const key = index < 2 ? `case-execution-${11 + index}` : 'case-execution-20'
      await page.locator(`[data-batch-case="${key}"] .batch-report-content`).waitFor()
    }
    assert.equal(await page.locator('.batch-case-card--expanded').count(), 1)
    await page.screenshot({ path: path.join(output, 'report-auto-follow.png'), fullPage: true })
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ result: 'passed', report: true, output }))
  } else if (groupedMode) {
    await page.getByText('80001', { exact: true }).waitFor()
    const row = page.locator('.arco-table-tr').filter({ hasText: '80001' })
    assert.equal(await row.count(), 1, '整次执行只显示一行')
    assert.match(await row.textContent(), /26/)
    assert.match(await page.locator('.arco-pagination-total').last().textContent(), /3/)
    await page.locator('.execution-run-detail .batch-case-card').first().waitFor()
    assert.equal(await page.evaluate(() => window.__qaRunSceneRequests || 0), 1)
    assert.equal(await page.locator('.execution-run-detail .run-scene-toggle').count(), 20)
    assert.equal(await page.locator('.execution-run-detail .batch-case-card').count(), 3, '仅自动加载首个场景用例')
    assert.equal(await page.locator('.execution-run-detail .run-pending-scene').count(), 17, '首个场景页保留尚未启动的取消项')
    assert.equal(await page.locator('.batch-case-content').count(), 0, '完成任务只展示用例列表，不自动展开用例')
    await page.screenshot({ path: path.join(output, 'grouped-history.png'), fullPage: true })
    await page.locator('.execution-run-detail .arco-pagination-item').filter({ hasText: /^2$/ }).click()
    await page.locator('.run-scene-toggle').filter({ hasText: 'AAS_DBSG_SMOKE_026' }).waitFor()
    assert.equal(await page.locator('.run-pending-scene').count(), 6)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByText('80001', { exact: true }).waitFor()
    assert.equal(await page.locator('.arco-table-tr').filter({ hasText: '80001' }).count(), 1, '刷新后仍由服务端任务摘要恢复整次历史')
    for (const mode of ['紧凑视图', '时间轴视图', '卡片视图']) {
      await page.getByRole('button', { name: mode, exact: true }).click()
      await page.locator('.run-history-item').filter({ hasText: '80001' }).waitFor()
      assert.equal(await page.locator('.run-history-item').count(), 3, '视图切换不丢失整次任务或旧记录')
    }
    await page.getByRole('button', { name: '表格视图', exact: true }).click()
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ result: 'passed', grouped: true, output }))
  } else if (historyMode) {
    await page.getByText('BATCH_0001', { exact: true }).waitFor()
    const counts = page.locator('.history-summary__stats strong')
    assert.deepEqual(await counts.allTextContents(), ['26', '25', '22', '2', '0', '1', '0', '1'])
    assert.equal(await page.locator('.scene-scope-pagination').count(), 0)
    assert.equal(await page.locator('.arco-pagination').count(), 1)
    assert.match(await page.locator('.arco-pagination-total').textContent(), /503/)
    const firstBatch = page.locator('.arco-table-tr').filter({ hasText: 'BATCH_0001' })
    await page.locator('.batch-case-card').first().waitFor()
    assert.equal(await page.locator('.batch-scene-toggle').count(), 1, '批次下保留场景层')
    assert.equal(await page.locator('.batch-case-content').count(), 0, '历史页不自动展开已完成用例')
    assert.equal(await page.evaluate(() => window.__qaCaseRequests), 1, '只加载首个展开批次，不预取整页用例')
    await page.screenshot({ path: path.join(output, 'history-batch-overview.png'), fullPage: true })
    const firstCase = page.locator('.batch-case-card').first()
    await firstCase.getByRole('button', { name: '双栏', exact: true }).click()
    await firstCase.locator('.batch-case-content').waitFor()
    const caseRightGap = await firstCase.evaluate((element) => {
      const detail = element.closest('.batch-detail')
      return detail.getBoundingClientRect().right - element.getBoundingClientRect().right
    })
    assert.ok(caseRightGap <= 1, `展开用例右侧不能多出边距: ${caseRightGap}px`)
    await firstCase.getByRole('button', { name: '实时画面', exact: true }).click()
    await firstCase.getByRole('button', { name: '报告', exact: true }).click()
    await firstCase.locator('.step-inspector__nav button').nth(2).waitFor()
    const beforePoll = await page.evaluate(() => ({ history: window.__qaHistoryRequests, cases: window.__qaCaseRequests, steps: window.__qaStepRequests }))
    await page.waitForFunction((count) => window.__qaHistoryRequests > count, beforePoll.history)
    assert.equal(await firstCase.locator('.batch-report-content').count(), 1, '轮询不能关闭正在查看的报告')
    assert.equal(await page.evaluate(() => window.__qaCaseRequests), beforePoll.cases, '摘要未变化时不能重复请求用例')
    assert.equal(await page.evaluate(() => window.__qaStepRequests), beforePoll.steps, '摘要未变化时不能重复请求步骤')
    await page.evaluate(() => window.__qaUpdateHistory())
    await page.waitForFunction((count) => window.__qaCaseRequests > count, beforePoll.cases)
    await firstCase.locator('.step-inspector__nav button').nth(2).waitFor()
    assert.equal(await firstCase.locator('.batch-report-content').count(), 1, '服务端摘要更新后重新取明细，但仍保留报告视角')
    await firstCase.locator('.batch-case-toggle').click()
    await firstCase.locator('.batch-case-content').waitFor({ state: 'hidden' })
    await page.screenshot({ path: path.join(output, 'history-batch-overview.png'), fullPage: true })
    await firstBatch.getByText('收起', { exact: true }).click()
    await firstBatch.getByText('详情', { exact: true }).click()
    await page.locator('.batch-case-card').first().waitFor()
    assert.equal(await page.locator('.batch-case-content').count(), 0, '重新点开已完成批次的详情仍默认收起用例')
    await firstBatch.getByText('收起', { exact: true }).click()
    const select = page.locator('.history-scene-filter-select')
    await select.click()
    const labels = await page.locator('.arco-select-dropdown:visible .arco-select-option').allTextContents()
    assert.equal(labels.length, 27)
    assert.equal(labels[0].trim(), '全部场景')
    assert.match(labels[1], /SMOKE_001/)
    assert.match(labels.at(-1), /SMOKE_026/)
    await page.screenshot({ path: path.join(output, 'history-options.png'), fullPage: true })
    await page.getByText('历史列表', { exact: true }).click()
    await page.locator('.arco-pagination-item').filter({ hasText: /^2$/ }).click()
    await page.getByText('BATCH_0011', { exact: true }).waitFor()
    assert.equal((await counts.allTextContents())[0], '26')
    assert.match(await page.locator('.arco-pagination-total').textContent(), /503/)
    await page.screenshot({ path: path.join(output, 'history-page2.png'), fullPage: true })
    await select.click()
    await page.locator('.arco-select-dropdown:visible .arco-select-option').filter({ hasText: 'AAS_DBSG_SMOKE_001' }).click()
    await page.getByText('BATCH_0001', { exact: true }).waitFor()
    assert.equal(await page.locator('th').filter({ hasText: '总场景' }).count(), 0, '单场景不再显示总场景列')
    assert.equal(await page.locator('th').filter({ hasText: '总用例' }).count(), 1)
    assert.deepEqual(await counts.allTextContents(), ['3', '3', '2', '1', '0', '0', '0'])
    assert.equal(await page.locator('.history-summary__stats').getByText('总用例', { exact: true }).count(), 1)
    await page.locator('.batch-case-card').first().waitFor()
    assert.equal(await page.locator('.batch-scene-toggle').count(), 1, '单场景筛选不能省略场景层')
    assert.equal(await page.locator('.batch-case-content').count(), 0)
    await page.screenshot({ path: path.join(output, 'history-single-scene.png'), fullPage: true })
    await page.locator('.arco-pagination-item').filter({ hasText: /^2$/ }).click()
    await page.getByText('BATCH_0251', { exact: true }).waitFor()
    assert.deepEqual(await counts.allTextContents(), ['3', '3', '2', '1', '0', '0', '0'], '翻页仍使用全历史的最新用例汇总')
    await select.click()
    await page.locator('.arco-select-dropdown:visible .arco-select-option').filter({ hasText: 'AAS_DBSG_SMOKE_026' }).click()
    await page.getByText('暂无数据', { exact: true }).waitFor()
    assert.deepEqual(await counts.allTextContents(), ['0', '0', '0', '0', '0', '0', '0'])
    await page.getByRole('button', { name: '本次执行', exact: true }).click()
    await page.locator('.run-statistics').waitFor()
    assert.equal(await page.locator('.history-view-toolbar').count(), 0, '本次执行继续使用独立队列视图')
    assert.equal((await page.locator('.run-statistics strong').allTextContents())[0], '1')
    await page.getByRole('button', { name: '历史记录', exact: true }).click()
    await page.getByText('BATCH_0001', { exact: true }).waitFor()
    assert.equal((await counts.allTextContents())[0], '26', '返回历史记录重置为完整场景范围')
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ result: 'passed', history: true, output }))
  } else {
    await page.locator('.run-statistics strong').first().waitFor()
    const expected = ['26', '0', '25', '1', '0', '1', '0', '0']
    assert.deepEqual(await page.locator('.run-statistics strong').allTextContents(), expected)
    await page.locator('.batch-case-card').nth(2).waitFor()
    assert.equal(await page.locator('.history-view-toolbar').count(), 0, '展开区不能再出现历史列表工具栏')
    assert.equal(await page.locator('.history-summary').count(), 0, '展开区不能重复汇总卡片')
    assert.equal(await page.locator('.arco-table').count(), 1, '默认展开不能再嵌套批次表格')
    assert.equal(await page.locator('.batch-case-content').count(), 0, '已完成的本次用例不自动展开')
    assert.equal(await page.locator('.batch-detail').evaluate((el) => getComputedStyle(el).maxHeight), 'none', '嵌入明细继续使用自然高度')
    await page.evaluate(() => window.__qaLive.push(...[1, 2, 3].map((id) => ({ sceneKey: '1001', batchId: '20261007184150', caseId: `SCENE_CASE_00${id}`, executionId: `live-${id}`, caseName: `实时用例 ${id}`, executionType: 'playwright-runner', status: id === 1 ? 'running' : 'queued', stepTotal: 3 }))))
    await page.getByRole('button', { name: '取消用例', exact: true }).nth(2).waitFor()
    assert.equal(await page.locator('.batch-case-content').count(), 1)
    await page.getByRole('button', { name: '取消用例', exact: true }).first().click()
    assert.equal(await page.evaluate(() => window.__qaCancelledCases), 1)
    await page.evaluate(() => {
      window.__qaLive[0].status = 'passed'
      window.__qaLive[1].status = 'running'
    })
    await page.locator('.batch-case-card').nth(1).locator('.batch-case-content').waitFor()
    await page.evaluate(() => {
      window.__qaLive[1].status = 'passed'
      window.__qaLive[2].status = 'running'
    })
    await page.locator('.batch-case-card').nth(2).locator('.batch-case-content').waitFor()
    await page.waitForFunction(() => document.querySelectorAll('.batch-case-content').length === 1)
    assert.equal(await page.locator('.batch-case-content').count(), 1, '完成后只展开下一条，且不依赖实时日志')
    await page.evaluate(() => window.__qaLive.splice(0))
    await page.getByText('登录并初始化环境', { exact: true }).waitFor()
    const firstCase = page.locator('.batch-case-card').first()
    await firstCase.getByRole('button', { name: '双栏', exact: true }).click()
    await firstCase.locator('.batch-case-content').waitFor()
    await firstCase.getByRole('button', { name: '报告', exact: true }).click()
    await firstCase.locator('.batch-report-content').waitFor()
    await firstCase.locator('.step-inspector__nav button').nth(2).waitFor()
    await page.screenshot({ path: path.join(output, 'run-case-report.png'), fullPage: true })
    await firstCase.locator('.batch-case-toggle').click()
    await firstCase.locator('.batch-case-content').waitFor({ state: 'hidden' })
    await page.setViewportSize({ width: 1000, height: 900 })
    await page.screenshot({ path: path.join(output, 'run-compact.png'), fullPage: true })
    await page.setViewportSize({ width: 1600, height: 1050 })
    await page.locator('.arco-table-tr').filter({ hasText: 'AAS_DBSG_SMOKE_002' }).locator('.arco-table-expand-btn').click()
    await page.getByText('场景尚未启动，暂无本次执行明细', { exact: true }).waitFor()
    await page.screenshot({ path: path.join(output, 'run-page1.png'), fullPage: true })
    await page.locator('.arco-pagination-item').filter({ hasText: /^2$/ }).click()
    await page.getByText('AAS_DBSG_SMOKE_026', { exact: true }).waitFor()
    assert.deepEqual(await page.locator('.run-statistics strong').allTextContents(), expected)
    await page.screenshot({ path: path.join(output, 'run-page2.png'), fullPage: true })
    await page.evaluate(() => Object.assign(window.__qaRun.scenes[20], { executeStatus: 'running', batchId: 'next-scene-batch' }))
    await page.locator('.batch-case-card').first().waitFor()
    assert.match(await page.locator('.arco-table-tr-expand').textContent(), /登录并初始化环境/)
    await page.screenshot({ path: path.join(output, 'run-auto-follow-page2.png'), fullPage: true })
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ result: 'passed', cards: expected, output }))
  }
} finally {
  await browser?.close()
  await server.close()
}
