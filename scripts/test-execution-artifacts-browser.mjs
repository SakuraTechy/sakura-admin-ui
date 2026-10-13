import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(path.join(root, 'package.json'))
const { createServer } = require('vite')
const vue = require('@vitejs/plugin-vue')
const autoImport = require('unplugin-auto-import/vite')

const { chromium } = createRequire(path.resolve(root, '../sakura-playwright/package.json'))('playwright')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sakura-artifacts-'))
const output = path.resolve(root, '../output/report-implementation-20261012')
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const recorder = await browser.newContext({ recordVideo: { dir: temporary, size: { width: 320, height: 180 } }, viewport: { width: 320, height: 180 } })
await recorder.tracing.start({ screenshots: true, snapshots: true })
const recordingPage = await recorder.newPage()
await recordingPage.setContent('<body style="background:#163559;color:white"><h2>Runner video fixture</h2></body>')
await recordingPage.waitForTimeout(250)
const png = await recordingPage.screenshot({ path: path.join(output, 'fixture.png') })
await recorder.tracing.stop({ path: path.join(temporary, 'trace.zip') })
const traceZip = fs.readFileSync(path.join(temporary, 'trace.zip'))
await recorder.close()
const webm = fs.readFileSync(await recordingPage.video().path())

const plugin = {
  name: 'artifact-browser-test',
  enforce: 'pre',
  resolveId(id) {
    if (id === 'virtual:artifact-test') return '\0artifact-entry'
    if (id.includes('utils/auth')) return '\0artifact-auth'
    if (id.endsWith('automationUiQuery') || id.endsWith('automationUiQuery.ts')) return '\0artifact-query'
    if (id.endsWith('AutomationExecutionStepDiagnostic.vue')) return '\0artifact-diagnostic'
  },
  load(id) {
    if (id === '\0artifact-auth') return 'export const getToken=()=>"test-artifact-token";'
    if (id === '\0artifact-diagnostic') return 'export default {props:["step"],template:"<div class=diagnostic-fixture>{{step.stepName}}</div>"}'
    if (id === '\0artifact-query') {
      return `
      export const AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT=50;
      export const getAutomationUiExecutionArtifactContentUrl=(execution,id)=>'/qa-assets/'+id;
      export const getAutomationUiExecutionArtifacts=async(execution,page,size)=>{
        window.__artifactPages=(window.__artifactPages||[]).concat(page);
        const rows=[...Array.from({length:50},(_,i)=>({artifactDbId:i,caseExecutionDbId:'OTHER',artifactType:'report'})),
          ...['report','trace','screenshot','video'].map(kind=>({artifactDbId:kind,artifactType:kind,caseExecutionDbId:11,storageStatus:'active'}))];
        return {data:{total:rows.length,list:rows.slice((page-1)*size,page*size)}};
      };`
    }
    if (id === '\0artifact-entry') {
      return `
      import {createApp,h,reactive} from 'vue';
      import Arco from '@arco-design/web-vue';import Icons from '@arco-design/web-vue/es/icon';import '@arco-design/web-vue/dist/arco.css';
      import Detail from '/src/views/automation/automationUiScene/components/AutomationExecutionHistoryDetail.vue';
      const step={rowKey:'step1',stepNumber:1,stepName:'输入密码到 input',description:'输入密码',actionType:'input',status:'passed',duration:800,detailLoaded:true};
      const record=reactive({rowKey:'run1:case1',caseId:'CASE_001',caseName:'报告附件回归',executionId:'RUN_001',executionType:'playwright-runner',recordTarget:{executionDbId:91},caseExecutionDbId:11,executeStatus:'passed',executeResult:'passed',stepTotal:1,steps:[step],stepsLoaded:true,artifactReportUrl:'',artifactTraceUrl:'',artifactScreenshotUrl:'',artifactVideoUrl:'',artifactUploadError:'-',browserSessionSource:'-',sessionNavigationDecision:'-'});
      window.__artifactRecord=record;
      createApp({render:()=>h(Detail,{record,embedded:true,variant:'table'})}).use(Arco).use(Icons).mount('#app');`
    }
  },
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url.includes('/qa-assets/')) {
        if (request.headers.authorization !== 'Bearer test-artifact-token') {
          response.statusCode = 403
          response.end('forbidden')
          return
        }
        const kind = request.url.split('/').at(-1)
        response.setHeader('Content-Type', { report: 'text/html', screenshot: 'image/png', video: 'video/webm', trace: 'application/zip' }[kind])
        response.end(kind === 'report' ? '<html><body><h1>当前执行真实报告</h1><script>try{localStorage.setItem("unsafe-report","1")}catch{document.body.dataset.isolated="yes"}</script></body></html>' : kind === 'screenshot' ? png : kind === 'video' ? webm : traceZip)
        return
      }
      if (request.url !== '/') return next()
      response.setHeader('Content-Type', 'text/html;charset=UTF-8')
      response.end('<!doctype html><html><body style="margin:12px"><div id="app"></div><script type="module" src="/@id/__x00__artifact-entry"></script></body></html>')
    })
  },
}
const server = await createServer({ configFile: false, root, cacheDir: path.join(temporary, 'cache'), plugins: [plugin, (vue.default || vue)(), (autoImport.default || autoImport)({ imports: ['vue'], dts: false })], optimizeDeps: { entries: [], include: ['vue', '@arco-design/web-vue'] }, resolve: { alias: { '@': path.join(root, 'src') } }, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
try {
  await server.listen()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.context().route('**/*', (route) => route.request().url().startsWith(base) || route.request().url().startsWith('blob:') ? route.continue() : route.abort())
  await page.goto(base, { waitUntil: 'networkidle' })
  assert.equal(await page.evaluate(() => window.__artifactPages), undefined, '步骤页不预取产物')
  await page.getByRole('tab', { name: '执行产物' }).click()
  await page.locator('.asset-card').first().getByRole('button', { name: '在线预览', exact: true }).waitFor()
  await page.waitForFunction(() => window.__artifactPages?.length === 2)
  assert.deepEqual(await page.evaluate(() => window.__artifactPages), [1, 2])
  const reportPopupPromise = page.waitForEvent('popup')
  await page.locator('.asset-card').first().getByRole('button', { name: '在线预览', exact: true }).click()
  const reportPopup = await reportPopupPromise
  await reportPopup.frameLocator('iframe').getByRole('heading', { name: '当前执行真实报告' }).waitFor()
  assert.equal(await reportPopup.evaluate(() => window.opener), null)
  await reportPopup.close()
  const tracePopupPromise = page.waitForEvent('popup')
  const traceDownloadPromise = page.waitForEvent('download')
  const traceRequestPromise = page.context().waitForEvent('request', (request) => request.url().startsWith('https://trace.playwright.dev/'))
  await page.locator('.asset-card').getByRole('button', { name: '查看 Trace', exact: true }).click()
  const tracePopup = await tracePopupPromise
  const download = await traceDownloadPromise
  const traceRequest = await traceRequestPromise
  assert.equal(traceRequest.url(), 'https://trace.playwright.dev/')
  assert.equal(traceRequest.headers().authorization, undefined)
  assert.deepEqual(fs.readFileSync(await download.path()), traceZip)
  await tracePopup.close()
  for (const label of ['经典', '卡片', '列表', '分栏']) {
    await page.getByRole('button', { name: label, exact: true }).click()
    assert.equal(await page.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true')
  }
  await page.route('**/qa-assets/report', (route) => route.fulfill({ contentType: 'application/json', body: '{"msg":"权限不足，请重试"}' }))
  // 切换用例状态使预览重新加载，验证业务错误而不是命中刚打开报告的缓存。
  await page.evaluate(() => {
    window.__artifactRecord.rowKey = 'run1:case1:reload'
  })
  await page.getByRole('tab', { name: '执行产物' }).click()
  await page.getByRole('button', { name: '分栏', exact: true }).click()
  await page.getByRole('button', { name: '加载预览', exact: true }).click()
  await page.getByText('权限不足，请重试', { exact: true }).waitFor()
  await page.unroute('**/qa-assets/report')
  await page.getByRole('button', { name: '重试加载预览', exact: true }).click()
  await page.frameLocator('.asset-preview iframe').getByRole('heading', { name: '当前执行真实报告' }).waitFor()
  assert.equal(await page.locator('.asset-preview iframe').getAttribute('sandbox'), 'allow-scripts allow-downloads')
  assert.equal(await page.evaluate(() => localStorage.getItem('unsafe-report')), null)
  await page.locator('.asset-nav').getByRole('button', { name: /失败截图/ }).click()
  await page.getByRole('button', { name: '加载预览', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.asset-preview img')?.naturalWidth > 0)
  assert(await page.locator('.asset-preview img').evaluate((image) => image.getBoundingClientRect().width > 0 && image.getBoundingClientRect().height > 0))
  await page.getByRole('tab', { name: '执行录屏' }).click()
  await page.getByRole('button', { name: '加载录屏', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.asset-video video')?.readyState >= 1)
  assert.equal(await page.locator('.asset-video video').evaluate((video) => video.paused && !video.autoplay), true)
  await page.getByRole('tab', { name: /步骤明细/ }).click()
  await page.getByRole('tab', { name: '执行录屏' }).click()
  assert.equal(await page.locator('.asset-video video').count(), 1)
  await page.getByRole('tab', { name: '执行产物' }).click()
  await page.locator('.asset-nav').getByRole('button', { name: /HTML report/ }).click()
  await page.frameLocator('.asset-preview iframe').getByRole('heading', { name: '当前执行真实报告' }).waitFor()
  const dimensions = []
  for (const width of [1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const label of ['经典', '卡片', '列表', '分栏']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      const fits = await page.locator('.report-assets').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
      assert(fits, `${width}px ${label} 不应横向溢出`)
      dimensions.push(`${width}:${label}`)
      if (width === 1024) await page.screenshot({ path: path.join(output, `artifacts-${label}.png`), fullPage: true })
    }
  }
  await page.evaluate(() => {
    window.__artifactRecord.rowKey = 'another-case'
    window.__artifactRecord.caseExecutionDbId = 12
    window.__artifactRecord.caseId = 'CASE_002'
  })
  await page.getByRole('tab', { name: '执行产物' }).click()
  await page.waitForFunction(() => document.querySelector('.asset-toolbar .arco-btn-loading') === null)
  assert.equal(await page.locator('.asset-card button:disabled').count(), 3, '无当前用例产物时不能串用前一条')
  assert.equal(await page.locator('.asset-preview img, .asset-video video').count(), 0)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: 'passed', checks: ['三页签', '四种视图', '完整分页', '鉴权文件读取', 'JSON 错误重试', 'HTML 沙箱', '真实 PNG 解码', '真实 WebM 读取', '录屏不自动播放', '切换用例清理', '无跨用例产物', '五档宽度'], dimensions, output }))
} finally {
  await browser.close()
  await server.close()
}
