const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { Buffer } = require('node:buffer')
const { spawn, spawnSync } = require('node:child_process')
const JSEncrypt = require('jsencrypt')

const APP_URL = process.env.SAKURA_E2E_APP_URL || 'http://localhost:5173'
const API_URL = process.env.SAKURA_E2E_API_URL || 'http://localhost:8000'
const USERNAME = process.env.SAKURA_E2E_USERNAME || 'admin'
const PASSWORD = process.env.SAKURA_E2E_PASSWORD
const CLIENT_ID = process.env.SAKURA_E2E_CLIENT_ID || 'ef51c9a3e9046c4f2ea45142c8a8344a'
const CHROME_PATH = process.env.SAKURA_E2E_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUTPUT_DIR = process.env.SAKURA_E2E_OUTPUT_DIR || path.join(os.tmpdir(), 'sakura-test-metric-layout')
const DEBUG_PORT = Number(process.env.SAKURA_E2E_DEBUG_PORT || 9223)
const PUBLIC_KEY = [
  'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAM51dgYtMyF+tTQt80sfFOpSV27a7t9u',
  'aUVeFrdGiVxscuizE7H8SMntYqfn9lp8a5GH5P1/GGehVjUD2gF/4kcCAwEAAQ==',
].join('')

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1674, height: 870 },
  { width: 1440, height: 900 },
  { width: 1024, height: 900 },
  { width: 390, height: 844 },
]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class CdpClient {
  constructor(url) {
    this.url = url
    this.nextId = 1
    this.pending = new Map()
  }

  async connect() {
    this.socket = new WebSocket(this.url)
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (!message.id || !this.pending.has(message.id)) return
      const { resolve, reject, timer } = this.pending.get(message.id)
      clearTimeout(timer)
      this.pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result || {})
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP command timed out: ${method}`))
      }, 15000)
      this.pending.set(id, { resolve, reject, timer })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.socket?.close()
  }
}

async function login() {
  if (!PASSWORD) throw new Error('SAKURA_E2E_PASSWORD is required')
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(PUBLIC_KEY)
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: USERNAME,
      password: encryptor.encrypt(PASSWORD),
      captcha: '',
      uuid: '',
      authType: 'ACCOUNT',
      clientId: CLIENT_ID,
    }),
  })
  const payload = await response.json()
  if (!payload.success || !payload.data?.token) {
    throw new Error(`Login failed: ${payload.msg || response.status}`)
  }
  return payload.data.token
}

async function waitForPageTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
      const targets = await response.json()
      const page = targets.find((target) => target.type === 'page' && target.url.startsWith(APP_URL))
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {}
    await delay(250)
  }
  throw new Error('Chrome DevTools target was not available')
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text
    throw new Error(description || 'Browser evaluation failed')
  }
  return result.result?.value
}

async function waitForDashboard(client) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const ready = await evaluate(client, `Boolean(
      document.querySelector('.metric-page')
      && document.querySelectorAll('.status-item').length === 6
      && document.querySelectorAll('.value-primary').length === 2
      && document.querySelectorAll('canvas').length >= 5
    )`)
    if (ready) return
    await delay(250)
  }
  const location = await evaluate(client, 'location.href')
  throw new Error(`Metric dashboard did not become ready: ${location}`)
}

async function inspectViewport(client, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 520,
  })
  await evaluate(client, `document.querySelector('.metric-page').scrollTop = 0`)
  await delay(900)

  const diagnostics = await evaluate(client, `(() => {
    const page = document.querySelector('.metric-page')
    const valueLayout = document.querySelector('.value-layout')
    const primary = [...document.querySelectorAll('.value-primary')].map(item => item.getBoundingClientRect())
    const rate = document.querySelector('.value-rate-grid').getBoundingClientRect()
    const status = document.querySelector('.status-strip')
    const canvasPixels = [...document.querySelectorAll('canvas')].map((canvas) => {
      try {
        const context = canvas.getContext('2d')
        const widthStep = Math.max(1, Math.floor(canvas.width / 40))
        const heightStep = Math.max(1, Math.floor(canvas.height / 25))
        for (let y = 0; y < canvas.height; y += heightStep) {
          for (let x = 0; x < canvas.width; x += widthStep) {
            if (context.getImageData(x, y, 1, 1).data[3] > 0) return true
          }
        }
      } catch {}
      return false
    })
    const layoutRect = valueLayout.getBoundingClientRect()
    const desktopValueLayout = primary.length === 2
      && Math.abs(primary[0].top - primary[1].top) <= 1
      && Math.abs(primary[0].width - primary[1].width) <= 2
      && rate.top >= Math.max(primary[0].bottom, primary[1].bottom) - 1
      && Math.abs(rate.width - layoutRect.width) <= 2
    const mobileValueLayout = primary.length === 2
      && primary[1].top >= primary[0].bottom - 1
      && rate.top >= primary[1].bottom - 1
    page.scrollTop = page.scrollHeight
    const quality = document.querySelector('.quality-bar')
    const pageRect = page.getBoundingClientRect()
    const qualityRect = quality?.getBoundingClientRect()
    const pageStyle = getComputedStyle(page)
    const pageTitleStyle = getComputedStyle(document.querySelector('.metric-toolbar__title h2'))
    const panelTitleStyle = getComputedStyle(document.querySelector('.metric-panel__header h3'))
    const kpiValueStyle = getComputedStyle(document.querySelector('.kpi-card > strong'))
    const tableCellStyle = getComputedStyle(document.querySelector('.overview-table .arco-table-td'))
    return {
      bodyHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      pageHorizontalOverflow: page.scrollWidth > page.clientWidth + 1,
      canvasCount: canvasPixels.length,
      nonBlankCanvasCount: canvasPixels.filter(Boolean).length,
      statusCount: document.querySelectorAll('.status-item').length,
      statusColumnCount: getComputedStyle(status).gridTemplateColumns.split(' ').filter(Boolean).length,
      helpIconCount: document.querySelectorAll('.metric-help-icon').length,
      valueLayoutValid: innerWidth > 900 ? desktopValueLayout : mobileValueLayout,
      defectLabelPresent: document.body.innerText.includes('缺陷数（失败场景次数）'),
      laborLabelPresent: document.body.innerText.includes('标准人工工作量估算（人天）'),
      executionValuePresent: document.body.innerText.includes('240 次场景执行'),
      moduleTreePresent: Boolean(document.querySelector('.asset-module-tree')),
      bottomReachable: Boolean(qualityRect && qualityRect.bottom <= pageRect.bottom + 2),
      typography: {
        fontFamily: pageStyle.fontFamily,
        pageTitle: { fontSize: pageTitleStyle.fontSize, fontWeight: pageTitleStyle.fontWeight, lineHeight: pageTitleStyle.lineHeight },
        panelTitle: { fontSize: panelTitleStyle.fontSize, fontWeight: panelTitleStyle.fontWeight, lineHeight: panelTitleStyle.lineHeight },
        kpiValue: { fontSize: kpiValueStyle.fontSize, fontWeight: kpiValueStyle.fontWeight, lineHeight: kpiValueStyle.lineHeight },
        tableCell: { fontSize: tableCellStyle.fontSize, fontWeight: tableCellStyle.fontWeight, lineHeight: tableCellStyle.lineHeight },
      },
    }
  })()`)

  await evaluate(client, `document.querySelector('.asset-module-tree .arco-tree-node-title')?.click()`)
  await delay(250)
  const moduleSelection = await evaluate(client, `(() => {
    const tree = document.querySelector('.asset-module-tree')?.getBoundingClientRect()
    const detail = document.querySelector('.asset-module-selection')?.getBoundingClientRect()
    if (!tree || !detail) return { interactive: false, placementValid: false }
    return {
      interactive: Boolean(document.querySelector('.asset-module-selection__share strong')),
      placementValid: innerWidth > 900
        ? detail.left >= tree.right - 1
        : detail.top >= tree.bottom - 1,
    }
  })()`)
  diagnostics.moduleSelectionInteractive = moduleSelection.interactive
  diagnostics.moduleSelectionPlacementValid = moduleSelection.placementValid
  await evaluate(client, `document.querySelector('.asset-module-tree__reset')?.click()`)
  await delay(150)
  diagnostics.moduleSelectionReset = await evaluate(client, `!document.querySelector('.asset-module-selection__share')`)

  await evaluate(client, `document.querySelector('.metric-page').scrollTop = 0`)
  await delay(350)
  const topScreenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const topFile = path.join(OUTPUT_DIR, `test-metric-${viewport.width}x${viewport.height}-top.png`)
  fs.writeFileSync(topFile, Buffer.from(topScreenshot.data, 'base64'))

  await evaluate(client, `document.querySelector('.value-panel').scrollIntoView({ block: 'start' })`)
  await delay(350)
  const valueScreenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const valueFile = path.join(OUTPUT_DIR, `test-metric-${viewport.width}x${viewport.height}-value.png`)
  fs.writeFileSync(valueFile, Buffer.from(valueScreenshot.data, 'base64'))

  const expectedColumns = viewport.width > 900 ? 6 : 1
  const failures = Object.entries({
    bodyHorizontalOverflow: !diagnostics.bodyHorizontalOverflow,
    pageHorizontalOverflow: !diagnostics.pageHorizontalOverflow,
    fiveNonBlankCharts: diagnostics.canvasCount >= 5 && diagnostics.nonBlankCanvasCount >= 5,
    sixTerminalCategories: diagnostics.statusCount === 6 && diagnostics.statusColumnCount === expectedColumns,
    metricHelpCoverage: diagnostics.helpIconCount >= 36,
    valueLayout: diagnostics.valueLayoutValid,
    moduleHierarchy: diagnostics.moduleTreePresent,
    moduleSelection: diagnostics.moduleSelectionInteractive,
    moduleSelectionPlacement: diagnostics.moduleSelectionPlacementValid,
    moduleSelectionReset: diagnostics.moduleSelectionReset,
    defectLabel: diagnostics.defectLabelPresent,
    laborLabel: diagnostics.laborLabelPresent,
    executionValue: diagnostics.executionValuePresent,
    bottomReachable: diagnostics.bottomReachable,
    typographyFontStack: diagnostics.typography.fontFamily.includes('Segoe UI') && diagnostics.typography.fontFamily.includes('Microsoft YaHei'),
    typographyHierarchy: diagnostics.typography.pageTitle.fontSize === '20px'
      && diagnostics.typography.pageTitle.fontWeight === '600'
      && diagnostics.typography.panelTitle.fontSize === '15px'
      && diagnostics.typography.panelTitle.fontWeight === '600'
      && diagnostics.typography.kpiValue.fontWeight === '600'
      && diagnostics.typography.tableCell.fontSize === '13px'
      && diagnostics.typography.tableCell.fontWeight === '400',
  }).filter(([, passed]) => !passed).map(([name]) => name)

  return { ...viewport, topScreenshot: topFile, valueScreenshot: valueFile, diagnostics, failures }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  if (!fs.existsSync(CHROME_PATH)) throw new Error(`Chrome was not found: ${CHROME_PATH}`)
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sakura-metric-chrome-'))
  const token = await login()
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDirectory}`,
    `${APP_URL}/login`,
  ], { stdio: 'ignore' })
  let client
  try {
    client = new CdpClient(await waitForPageTarget())
    await client.connect()
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Page.navigate', { url: `${APP_URL}/login` })
    const expectedOrigin = new URL(APP_URL).origin
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (await evaluate(client, 'location.origin') === expectedOrigin) break
      await delay(100)
    }
    await evaluate(client, `localStorage.setItem('token', ${JSON.stringify(token)})`)
    await client.send('Page.navigate', { url: `${APP_URL}/test/testMetric` })
    await waitForDashboard(client)
    const results = []
    for (const viewport of viewports) results.push(await inspectViewport(client, viewport))
    console.log(JSON.stringify({ outputDirectory: OUTPUT_DIR, results }, null, 2))
    if (results.some((result) => result.failures.length)) process.exitCode = 1
  } finally {
    client?.close()
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      chrome.kill('SIGKILL')
    }
    await delay(500)
    try {
      fs.rmSync(profileDirectory, { recursive: true, force: true })
    } catch (error) {
      console.warn(`Temporary Chrome profile cleanup failed: ${error.message}`)
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
