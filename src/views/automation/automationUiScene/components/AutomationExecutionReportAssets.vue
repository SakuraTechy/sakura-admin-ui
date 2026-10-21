<template>
  <section class="report-assets" aria-label="当前用例执行产物">
    <a-alert v-if="record.artifactUploadError && record.artifactUploadError !== '-'" type="warning">产物上传失败：{{ record.artifactUploadError }}</a-alert>
    <div class="asset-toolbar">
      <!-- <span class="asset-scope">当前用例 · {{ record.caseId }} · {{ record.executionId }}</span> -->
      <strong v-if="mode === 'video'" class="asset-toolbar-title">Runner 执行录屏</strong>
      <a-button v-if="mode === 'artifacts'" size="mini" :loading="indexLoading" @click="refreshIndex">刷新产物</a-button>
      <div v-if="mode === 'artifacts'" class="asset-views" role="group" aria-label="执行产物视图">
        <a-button v-for="view in views" :key="view.value" size="mini" :aria-pressed="layout === view.value" @click="layout = view.value">{{ view.label }}</a-button>
      </div>
      <div v-if="mode === 'video'" class="asset-preview-actions">
        <a-button size="mini" :loading="indexLoading" @click="refreshIndex">刷新产物</a-button>
      </div>
    </div>
    <a-alert v-if="indexError" type="error">{{ indexError }}；可点击“刷新产物”重试。</a-alert>

    <template v-if="mode === 'artifacts'">
      <div v-if="layout === 'classic'" class="asset-classic">
        <div class="asset-classic-heading">
          <strong>产物清单</strong>
          <span class="asset-classic-count">{{ availableReportCount }} / {{ reportItems.length }} 项可用</span>
        </div>
        <div class="asset-classic-list">
          <div v-for="item in reportItems" :key="item.kind" class="asset-classic-item" :class="{ 'asset-classic-item--missing': !item.url }">
            <div class="asset-classic-item-info">
              <div class="asset-classic-item-heading">
                <strong>{{ item.title }}</strong>
                <a-tag size="small" :color="item.url ? 'green' : item.state === 'expired' ? 'orange' : 'gray'">
                  {{ stateLabel(item) }}
                </a-tag>
              </div>
              <div class="asset-classic-item-description">{{ item.url ? item.description : item.reason }}</div>
            </div>
            <a-button
              size="small"
              :type="item.kind === 'report' ? 'primary' : 'secondary'"
              :disabled="!item.url"
              :loading="pending[item.kind]"
              @click="openArtifact(item)"
            >
              {{ classicLabels[item.kind] }}
            </a-button>
          </div>
        </div>
      </div>
      <div v-else-if="layout === 'cards'" class="asset-cards">
        <article v-for="item in reportItems" :key="item.kind" class="asset-card" :class="{ 'asset-card--missing': !item.url }">
          <div class="asset-card-heading"><strong>{{ item.title }}</strong><a-tag :color="item.url ? 'green' : 'gray'">{{ stateLabel(item) }}</a-tag></div>
          <p>{{ item.url ? item.description : item.reason }}</p>
          <a-button :type="item.kind === 'report' ? 'primary' : 'secondary'" :disabled="!item.url" :loading="pending[item.kind]" @click="openArtifact(item)">{{ actionLabels[item.kind] }}</a-button>
        </article>
      </div>
      <table v-else-if="layout === 'list'" class="asset-table" aria-label="执行产物列表">
        <thead><tr><th>产物</th><th>内容</th><th>状态</th><th>操作</th></tr></thead>
        <tbody><tr v-for="item in reportItems" :key="item.kind"><td data-label="产物">{{ item.title }}</td><td data-label="内容">{{ item.url ? item.description : item.reason }}</td><td data-label="状态"><a-tag :color="item.url ? 'green' : 'gray'">{{ stateLabel(item) }}</a-tag></td><td data-label="操作"><a-button size="small" :type="item.kind === 'report' ? 'primary' : 'secondary'" :disabled="!item.url" :loading="pending[item.kind]" @click="openArtifact(item)">{{ actionLabels[item.kind] }}</a-button></td></tr></tbody>
      </table>
      <div v-else class="asset-split">
        <nav class="asset-nav" aria-label="选择产物">
          <button v-for="item in reportItems" :key="item.kind" type="button" :aria-pressed="selectedKind === item.kind" @click="selectedKind = item.kind"><strong>{{ item.title }}</strong><small>{{ stateLabel(item) }}</small></button>
        </nav>
        <section class="asset-preview" aria-live="polite">
          <div class="asset-preview-heading"><strong>{{ selectedItem.title }}</strong><a-button :disabled="!selectedItem.url" :loading="pending[selectedKind]" @click="openArtifact(selectedItem)">{{ actionLabels[selectedKind] }}</a-button></div>
          <a-empty v-if="!selectedItem.url" :description="selectedItem.reason" />
          <template v-else-if="selectedKind === 'trace'">
            <a-alert>Trace 使用专用查看器。点击“查看 Trace”后将下载当前执行的文件，并打开 Trace Viewer；在查看器中选择该文件。鉴权地址与 Token 不会传给查看器。</a-alert>
          </template>
          <template v-else>
            <a-button v-if="!objectUrls[selectedKind]" :loading="pending[selectedKind]" @click="loadArtifact(selectedItem).catch(() => {})">{{ errors[selectedKind] ? '重试加载预览' : '加载预览' }}</a-button>
            <!-- HTML 报告含执行脚本，必须隔离于中台登录域，不能赋予 allow-same-origin。 -->
            <iframe v-else-if="selectedKind === 'report'" :src="objectUrls.report" sandbox="allow-scripts allow-downloads" referrerpolicy="no-referrer" title="当前用例 HTML report" />
            <img v-else :src="objectUrls.screenshot" alt="当前执行失败截图" @error="mediaError('screenshot')">
          </template>
        </section>
      </div>
    </template>
    <section v-else class="asset-video" aria-label="当前用例执行录屏">
      <div v-if="!videoItem.url" class="asset-video-empty">
        <a-empty :description="videoItem.reason" />
      </div>
      <template v-else>
        <video v-if="objectUrls.video" ref="videoRef" :src="objectUrls.video" controls preload="metadata" @error="mediaError('video')" />
        <span v-else class="asset-muted">{{ errors.video ? '录屏加载失败，请点击“刷新产物”重试。' : '录屏加载中...' }}</span>
      </template>
    </section>
    <a-alert v-for="(message, kind) in visibleErrors" :key="kind" type="error">{{ message }}</a-alert>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { type ExecutionArtifactContext, type ExecutionArtifactItem, type ExecutionArtifactKind, buildExecutionArtifacts } from '../executionArtifacts'
import { isExecutionFollowTerminal } from '../useExecutionAutoFollow'
import type { AutomationUiExecutionArtifact } from '@/apis/automation/automationUiQuery'
import { getExecutionArtifactBlob, getExecutionCaseArtifacts } from '@/apis/automation/automationExecutionArtifact'

const props = withDefaults(defineProps<{
  record: ExecutionArtifactContext
  mode?: 'artifacts' | 'video'
  active?: boolean
}>(), { mode: 'artifacts', active: true })
const views = [{ value: 'classic', label: '经典' }, { value: 'cards', label: '卡片' }, { value: 'list', label: '列表' }, { value: 'split', label: '分栏' }] as const
const layout = ref<(typeof views)[number]['value']>('classic')
const selectedKind = ref<ExecutionArtifactKind>('report')
const index = ref<AutomationUiExecutionArtifact[]>([])
const indexLoading = ref(false)
const indexError = ref('')
const objectUrls = reactive<Partial<Record<ExecutionArtifactKind, string>>>({})
const errors = reactive<Partial<Record<ExecutionArtifactKind, string>>>({})
const pending = reactive<Partial<Record<ExecutionArtifactKind, boolean>>>({})
const videoRef = ref<HTMLVideoElement>()
const cache = new Map<ExecutionArtifactKind, { url: string, blob: Blob }>()
const requests = new Map<ExecutionArtifactKind, Promise<Blob>>()
const controllers = new Set<AbortController>()
let generation = 0
let indexController: AbortController | undefined
let artifactRefreshTimer: number | undefined
let artifactRefreshAttempts = 0
const items = computed(() => buildExecutionArtifacts(props.record, index.value))
const reportItems = computed(() => items.value.filter((item) => item.kind !== 'video'))
const availableReportCount = computed(() => reportItems.value.filter((item) => item.url).length)
const videoItem = computed(() => items.value.find((item) => item.kind === 'video')!)
const selectedItem = computed(() => items.value.find((item) => item.kind === selectedKind.value)!)
const actionLabels = { report: '在线预览', trace: '查看 Trace', screenshot: '查看截图', video: '查看录屏' }
const classicLabels = { report: '在线预览 HTML report', trace: '在线查看 Trace', screenshot: '在线查看失败截图', video: '在线查看录屏' }
const visibleErrors = computed(() => Object.fromEntries(Object.entries(errors).filter(([kind]) => props.mode === 'video' ? kind === 'video' : kind !== 'video')))
const stateLabel = (item: ExecutionArtifactItem) => indexLoading.value && !item.url ? '加载中' : item.state === 'available' ? '已生成' : item.state === 'expired' ? '已过期' : '未生成'

function release(kind: ExecutionArtifactKind) {
  if (kind === 'video') videoRef.value?.pause()
  if (objectUrls[kind]) URL.revokeObjectURL(objectUrls[kind]!)
  delete objectUrls[kind]
  cache.delete(kind)
}

function reset() {
  generation += 1
  if (artifactRefreshTimer) window.clearTimeout(artifactRefreshTimer)
  artifactRefreshTimer = undefined
  artifactRefreshAttempts = 0
  indexController?.abort()
  controllers.forEach((controller) => controller.abort())
  controllers.clear()
  requests.clear()
  for (const kind of ['report', 'trace', 'screenshot', 'video'] as const) {
    release(kind)
    delete errors[kind]
    pending[kind] = false
  }
  index.value = []
  indexError.value = ''
  indexLoading.value = false
  selectedKind.value = 'report'
}

async function refreshIndex() {
  if (artifactRefreshTimer) window.clearTimeout(artifactRefreshTimer)
  artifactRefreshTimer = undefined
  indexController?.abort()
  const controller = new AbortController()
  indexController = controller
  const executionDbId = props.record.recordTarget.executionDbId
  const caseId = props.record.caseExecutionDbId
  indexError.value = ''
  if (executionDbId == null || caseId == null) return
  indexLoading.value = true
  try {
    const result = await getExecutionCaseArtifacts(executionDbId, caseId, controller.signal)
    if (controller.signal.aborted) return
    index.value = result
    autoLoadVideo()
    if (isExecutionFollowTerminal({ executeStatus: props.record.executeStatus, executeResult: props.record.executeResult })
      && props.active && artifactRefreshAttempts < 5) {
      artifactRefreshAttempts += 1
      artifactRefreshTimer = window.setTimeout(() => {
        artifactRefreshTimer = undefined
        if (props.active) void refreshIndex()
      }, 3000)
    }
  } catch (error) {
    if (!controller.signal.aborted) indexError.value = error instanceof Error ? error.message : '读取产物目录失败'
  } finally {
    if (indexController === controller) indexLoading.value = false
  }
}

function loadArtifact(item: ExecutionArtifactItem): Promise<Blob> {
  const hit = cache.get(item.kind)
  if (hit?.url === item.url) return Promise.resolve(hit.blob)
  const running = requests.get(item.kind)
  if (running) return running
  const currentGeneration = generation
  const controller = new AbortController()
  controllers.add(controller)
  pending[item.kind] = true
  delete errors[item.kind]
  const request = (async () => {
    try {
      if (!item.url) throw new Error(item.reason)
      let blob = await getExecutionArtifactBlob(item.url, controller.signal)
      if (controller.signal.aborted || currentGeneration !== generation || items.value.find((value) => value.kind === item.kind)?.url !== item.url) throw new DOMException('执行记录已切换', 'AbortError')
      if (item.kind === 'screenshot' && blob.type.includes('svg')) throw new Error('截图格式不支持，请使用 PNG、JPEG 或 WebP')
      if (!blob.type || blob.type.includes('octet-stream') || item.kind === 'report') {
        blob = new Blob([blob], { type: { report: 'text/html;charset=UTF-8', trace: 'application/zip', screenshot: 'image/png', video: 'video/webm' }[item.kind] })
      }
      release(item.kind)
      cache.set(item.kind, { url: item.url, blob })
      objectUrls[item.kind] = URL.createObjectURL(blob)
      return blob
    } catch (error) {
      if (!controller.signal.aborted && currentGeneration === generation) errors[item.kind] = error instanceof Error ? error.message : '加载执行产物失败'
      throw error
    } finally {
      controllers.delete(controller)
      if (currentGeneration === generation) {
        pending[item.kind] = false
        requests.delete(item.kind)
      }
    }
  })()
  requests.set(item.kind, request)
  return request
}

function autoLoadVideo() {
  if (!props.active || props.mode !== 'video' || objectUrls.video || pending.video || !videoItem.value.url) return
  void loadArtifact(videoItem.value).catch(() => {})
}

async function openArtifact(item: ExecutionArtifactItem) {
  if (!item.url) return
  const viewer = window.open('', '_blank')
  if (!viewer) {
    Message.warning('浏览器拦截了产物窗口，请允许弹窗后重试')
    return
  }
  viewer.opener = null
  const currentGeneration = generation
  try {
    const blob = await loadArtifact(item)
    if (currentGeneration !== generation) {
      viewer.close()
      return
    }
    if (item.kind === 'trace') {
      const link = document.createElement('a')
      link.href = objectUrls.trace!
      link.download = `playwright-trace-${props.record.executionId.replace(/[^\w-]/g, '_')}.zip`
      link.click()
      viewer.location.href = 'https://trace.playwright.dev/'
      Message.info('Trace 已下载，请在查看器中选择该文件；不会上传鉴权地址或 Token')
    } else {
      // 新窗口也通过沙箱承载报告，防止报告脚本读取中台存储或操纵 opener。
      const frame = viewer.document.createElement('iframe')
      const url = URL.createObjectURL(blob)
      frame.setAttribute('sandbox', 'allow-scripts allow-downloads')
      frame.referrerPolicy = 'no-referrer'
      frame.title = item.title
      frame.src = url
      frame.style.cssText = 'border:0;width:100%;height:100vh;display:block'
      viewer.document.title = item.title
      viewer.document.body.style.margin = '0'
      viewer.document.body.replaceChildren(frame)
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    }
  } catch { viewer.close() }
}

function mediaError(kind: ExecutionArtifactKind) {
  release(kind)
  errors[kind] = '文件无法显示，请重新加载；若持续失败，请检查产物格式或浏览器支持情况'
}

watch(() => [props.record.rowKey, props.record.caseExecutionDbId, props.record.recordTarget.executionDbId], reset, { flush: 'sync' })
watch(() => [props.active, props.record.rowKey, props.record.caseExecutionDbId, props.record.recordTarget.executionDbId, props.record.executeStatus, props.record.executeResult], () => {
  if (props.active) void refreshIndex()
}, { immediate: true })
watch(() => items.value.map((item) => item.url).join('|'), () => {
  items.value.forEach((item) => {
    if (cache.get(item.kind)?.url !== item.url) release(item.kind)
  })
})
watch(() => [props.active, props.mode], () => {
  if (!props.active || props.mode !== 'video') videoRef.value?.pause()
})
watch(() => [props.active, props.mode, videoItem.value.url], autoLoadVideo, { immediate: true })
onUnmounted(reset)
</script>

<style scoped lang="scss">
.report-assets { min-width: 0; min-height: 0; padding: 0px; overflow: auto; color: var(--color-text-1); container-type: inline-size; }
.asset-toolbar, .asset-views, .asset-classic, .asset-card-heading, .asset-preview-heading { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; }
.asset-toolbar { min-height: 40px; margin-bottom: 5px; box-sizing: border-box; }
.asset-toolbar-title { margin-right: auto; }
.asset-preview-actions { display: flex; align-items: center; }
.asset-scope { flex: 1; overflow-wrap: anywhere; font-size: 12px; color: var(--color-text-3); }
.asset-views { padding: 3px; border-radius: 5px; background: var(--color-fill-2); }
.asset-views button { padding: 4px 10px; border: 1px solid transparent; border-radius: 3px; background: transparent; color: var(--color-text-2); cursor: pointer; }
.asset-views button[aria-pressed=true] { border-color: var(--color-border-2); background: var(--color-bg-2); color: rgb(var(--primary-6)); }
.asset-classic { display: block; overflow: hidden; border: 1px solid var(--color-border-2); border-radius: 4px; background: var(--color-bg-2); }
.asset-classic-heading { display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 0 16px; border-bottom: 1px solid var(--color-border-2); }
.asset-classic-count { color: var(--color-text-3); font-size: 12px; font-weight: 400; }
.asset-classic-list { display: flex; flex-direction: column; }
.asset-classic-item { display: flex; align-items: center; gap: 16px; min-height: 72px; padding: 12px 16px; border-bottom: 1px solid var(--color-border-2); }
.asset-classic-item:last-child { border-bottom: 0; }
.asset-classic-item--missing { background: var(--color-fill-1); }
.asset-classic-item-info { min-width: 0; flex: 1; }
.asset-classic-item-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
.asset-classic-item-description { margin-top: 5px; overflow-wrap: anywhere; color: var(--color-text-3); font-size: 12px; line-height: 1.5; }
.asset-classic-item > :deep(.arco-btn) { flex: 0 0 auto; }
.asset-muted { color: var(--color-text-3); font-size: 12px; }
.asset-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.asset-card { display: flex; flex-direction: column; align-items: flex-start; padding: 16px; border: 1px solid var(--color-border-2); border-radius: 6px; background: var(--color-bg-2); }
.asset-card--missing { background: var(--color-fill-1); }
.asset-card-heading { width: 100%; justify-content: space-between; }
.asset-card p { flex: 1; margin: 12px 0 20px; font-size: 12px; line-height: 1.7; color: var(--color-text-3); }
.asset-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.asset-table th, .asset-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--color-border-2); overflow-wrap: anywhere; }
.asset-table th { background: var(--color-fill-1); font-weight: 500; }
.asset-table th:nth-child(2) { width: 36%; }
.asset-table td { font-size: 12px; }
.asset-split { display: grid; grid-template-columns: 160px minmax(0, 1fr); border: 1px solid var(--color-border-2); border-radius: 5px; }
.asset-nav { padding: 8px; border-right: 1px solid var(--color-border-2); background: var(--color-fill-1); }
.asset-nav button { display: flex; width: 100%; flex-direction: column; gap: 8px; margin-bottom: 6px; padding: 12px; border: 1px solid transparent; border-radius: 4px; text-align: left; background: transparent; color: var(--color-text-2); cursor: pointer; }
.asset-nav button[aria-pressed=true] { color: rgb(var(--primary-6)); background: var(--color-bg-2); border-color: var(--color-border-2); }
.asset-nav small { color: var(--color-text-3); }
.asset-preview { min-width: 0; padding: 14px; }
.asset-preview-heading { justify-content: space-between; margin-bottom: 12px; }
.asset-preview iframe { width: 100%; height: 420px; border: 1px solid var(--color-border-2); background: var(--color-bg-2); }
.asset-preview img { display: block; max-width: 100%; max-height: 420px; margin: auto; object-fit: contain; }
.asset-video-empty { display: flex; min-height: 240px; align-items: center; justify-content: center; padding: 24px; }
.asset-video video { display: block; width: 100%; max-height: 520px; background: #000; object-fit: contain; }
.report-assets > :deep(.arco-alert) { margin-bottom: 12px; }
@container (max-width: 680px) { .asset-cards { grid-template-columns: 1fr; } }
@container (max-width: 520px) {
  .asset-classic-item { align-items: flex-start; flex-direction: column; gap: 10px; }
  .asset-classic-item > :deep(.arco-btn) { align-self: flex-start; }
  .asset-split { grid-template-columns: minmax(0, 1fr); }
  .asset-nav { display: flex; flex-wrap: wrap; border-right: 0; border-bottom: 1px solid var(--color-border-2); }
  .asset-nav button { width: auto; flex: 1 1 100px; }
  .asset-table, .asset-table tbody, .asset-table tr { display: block; }
  .asset-table thead { display: none; }
  .asset-table tr { padding: 10px; border-bottom: 1px solid var(--color-border-2); }
  .asset-table td { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 10px; padding: 6px 0; border: 0; }
  .asset-table td::before { content: attr(data-label); color: var(--color-text-3); }
}
</style>
