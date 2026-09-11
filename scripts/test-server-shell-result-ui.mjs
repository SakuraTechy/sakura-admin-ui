import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requireRunner = createRequire(path.join(root, '../sakura-playwright/package.json'))
const { chromium } = requireRunner('playwright')
const catalog = JSON.parse(await fs.readFile(path.join(root, '../sakura-admin/continew-automation/src/main/resources/automation/automation-operation-catalog.json'), 'utf8'))
const method = catalog.types.flatMap(type => type.methods).find(item => item.method_code === 'server.shell')
const server = await createServer({
  configFile: false, root, appType: 'custom',
  optimizeDeps: { entries: [] },
  resolve: { alias: { '@': path.join(root, 'src') } },
  plugins: [vue(), {
    name: 'shell-result-regression',
    resolveId(id) {
      if (id === 'virtual:shell-result') return '\0shell-result'
    },
    load(id) {
      if (id === '\0shell-result') return entry
    },
  }],
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'warn',
})
const entry = [
  'import { createApp, ref, h } from "vue";',
  'import Arco from "@arco-design/web-vue"; import { IconQuestionCircle } from "@arco-design/web-vue/es/icon";',
  'import "@arco-design/web-vue/dist/arco.css";',
  'import Panel from "/src/views/automation/automationUiScene/components/InfrastructureStepConfig.vue";',
  'import { normalizeAutomationOperationConfig, validateAutomationOperationConfig } from "/src/apis/automation/automationOperationCatalog.ts";',
  'const method = ' + JSON.stringify(method) + ';',
  'const config = { target_ref: {scope:"project_environment",kind:"server",slot_id:"1001"}, shell:"bash",command:"df -P -k /",timeout_ms:30000 };',
  'const list = value => [{paramsName:"method_code",paramsValue:"server.shell"},{paramsName:"method_version",paramsValue:"1"},{paramsName:"method_config",paramsValue:JSON.stringify(value)}];',
  'const model = ref(list(config)); window.shellResultTest = { model, saved: null };',
  'const app = createApp({ render: () => h("main", [h("h1","服务器操作"), h(Panel,{modelValue:model.value,actionType:"server_command",methodCode:"server.shell",methodVersion:1,projectId:"1","onUpdate:modelValue":value=>model.value=value}),',
  'h("button",{id:"save",onclick:()=>{const value=normalizeAutomationOperationConfig(method,JSON.parse(model.value[2].paramsValue)); const error=validateAutomationOperationConfig(method,value); window.shellResultTest.error=error; if(!error) {window.shellResultTest.saved=value; model.value=list(value)}}},"保存")]) });',
  'app.use(Arco); app.component("IconQuestionCircle",IconQuestionCircle); app.mount("#app");',
].join('\n')
server.middlewares.use(async (request, response, next) => {
  if (request.url !== '/shell-result-test') return next()
  const html = '<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shell 结果配置回归</title>'
    + '<style>body{margin:0;background:white;font:14px Arial,sans-serif}main{max-width:1080px;margin:24px auto;padding:0 16px}h1{font-size:20px;margin:0 0 20px}button#save{margin-top:16px;padding:8px 24px;border:0;background:#165dff;color:white;border-radius:4px;cursor:pointer}</style>'
    + '<div id="app"></div><script type="module" src="/@id/virtual:shell-result"></script></html>'
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end(await server.transformIndexHtml(request.url, html))
})
let browser
try {
  await server.listen()
  const port = server.httpServer.address().port
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.route('**/automation/environment-resources/slots*', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, code: 0, data: [{ slotId: '1001', resourceName: '应用服务器', resourceCode: 'APP_SERVER' }] }),
  }))
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const artifactRoot = path.join(root, '../.codex-tmp/server-shell-result-ui')
  await fs.mkdir(artifactRoot, { recursive: true })
  for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height })
    await page.goto('http://127.0.0.1:' + port + '/shell-result-test')
    await page.getByLabel('替换正则', { exact: true }).fill('[\\r\\n]+')
    await page.getByLabel('替换内容', { exact: true }).fill('')
    await page.getByLabel('全局变量名', { exact: true }).fill('sys_disk_total1')
    await page.locator('#save').click()
    const saved = await page.evaluate(() => window.shellResultTest.saved)
    assert.equal(saved.replace_value, '')
    assert.equal(saved.replace_regex, '[\\r\\n]+')
    assert.equal(saved.variable_name, 'sys_disk_total1')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    for (const label of ['替换正则', '替换内容', '全局变量名']) {
      const box = await page.getByLabel(label, { exact: true }).boundingBox()
      assert.ok(box && box.width > 100 && box.x >= 0 && box.x + box.width <= width)
    }
    await page.screenshot({ path: path.join(artifactRoot, name + '.png'), fullPage: true })
  }
  assert.deepEqual(errors, [])
  console.log('PASS: desktop/mobile rendering, empty replacement save/reload, no horizontal overflow')
  console.log('Screenshots: ' + artifactRoot)
} finally {
  await browser?.close()
  await server.close()
}
