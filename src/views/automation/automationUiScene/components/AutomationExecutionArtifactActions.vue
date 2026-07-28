<template>
  <a-space v-if="reportUrl || traceUrl || screenshotUrl || videoUrl" wrap>
    <a-button v-if="reportUrl" type="primary" :loading="loading" @click="openReport">在线预览 HTML report</a-button>
    <a-button v-if="traceUrl" :loading="loading" @click="openTrace">在线查看 Trace</a-button>
    <a-button v-if="screenshotUrl" :loading="loading" @click="openScreenshot">在线查看失败截图</a-button>
    <a-button v-if="videoUrl" :loading="loading" @click="openVideo">在线查看录屏</a-button>
  </a-space>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { getToken } from '@/utils/auth'

const props = defineProps<{
  reportUrl?: string
  traceUrl?: string
  screenshotUrl?: string
  videoUrl?: string
}>()

const loading = ref(false)

const openReport = () => props.reportUrl && openBlobArtifact(props.reportUrl, 'text/html;charset=UTF-8')
const openScreenshot = () => props.screenshotUrl && openBlobArtifact(props.screenshotUrl, 'image/png')
const openVideo = () => props.videoUrl && openBlobArtifact(props.videoUrl, 'video/webm')

async function openTrace() {
  if (!props.traceUrl) return
  const requestUrl = resolveUrl(props.traceUrl)
  const traceUrl = /^https?:\/\//i.test(requestUrl) ? requestUrl : new URL(requestUrl, window.location.origin).href
  const viewer = window.open('', '_blank')
  if (!viewer) {
    Message.warning('浏览器已拦截 Trace Viewer，请允许当前站点打开弹窗后重试')
    return
  }
  if (isPublicHttpsUrl(traceUrl)) {
    viewer.location.href = `https://trace.playwright.dev/?trace=${encodeURIComponent(traceUrl)}`
    return
  }
  try {
    const blob = await loadBlob(props.traceUrl)
    downloadBlob(blob, 'playwright-trace.zip')
    viewer.location.href = 'https://trace.playwright.dev/'
    Message.info('Trace 已准备完成，请在 Trace Viewer 中选择刚下载的文件')
  } catch (error: any) {
    viewer.close()
    Message.error(error?.message || '读取 Playwright Trace 失败')
  }
}

async function openBlobArtifact(url: string, contentType: string) {
  const viewer = window.open('', '_blank')
  if (!viewer) {
    Message.warning('浏览器已拦截产物窗口，请允许当前站点打开弹窗后重试')
    return
  }
  loading.value = true
  try {
    const blob = new Blob([await loadBlob(url)], { type: contentType })
    const objectUrl = URL.createObjectURL(blob)
    viewer.location.href = objectUrl
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
  } catch (error: any) {
    viewer.close()
    Message.error(error?.message || '读取执行产物失败')
  } finally {
    loading.value = false
  }
}

async function loadBlob(url: string) {
  const response = await fetch(resolveUrl(url), {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  })
  if (!response.ok) throw new Error(`读取执行产物失败（HTTP ${response.status}）`)
  const body = await response.blob()
  const contentType = response.headers.get('content-type') || ''
  const bodyText = contentType.includes('json') ? await body.text() : ''
  const preview = bodyText || await body.slice(0, 512).text()
  if (contentType.includes('json') || preview.trimStart().startsWith('{')) {
    const payload = JSON.parse(bodyText || await body.text())
    throw new Error(payload?.msg || payload?.message || '读取执行产物失败')
  }
  return body
}

function resolveUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  const base = String(import.meta.env.VITE_API_PREFIX || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return !base || path.startsWith(`${base}/`) ? path : `${base}${path}`
}

function isPublicHttpsUrl(url: string) {
  const hostname = new URL(url).hostname.toLowerCase()
  if (!url.startsWith('https://') || hostname === 'localhost' || hostname.endsWith('.local')) return false
  if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) return false
  const private172 = hostname.match(/^172\.(\d+)\./)
  return !private172 || Number(private172[1]) < 16 || Number(private172[1]) > 31
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
</script>
