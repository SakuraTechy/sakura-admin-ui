<template>
  <Teleport to="body" :disabled="!isImmersive">
    <section
      ref="viewerRef"
      class="execution-log-viewer"
      :class="{ 'execution-log-viewer--immersive': isImmersive }"
      :style="isFullscreen ? undefined : immersiveStyle"
    >
      <header class="log-toolbar">
        <div class="log-state">
          <span class="state-dot" :class="{ active: running }" />
          <span>{{ running ? '实时更新中' : statusText }}</span>
          <span v-if="visibleLogs.length" class="log-count">{{ visibleLogs.length }} 条</span>
        </div>
        <div class="log-actions">
          <div class="log-format">
            <span>日志格式：</span>
            <a-radio-group v-model="format" type="button" size="mini">
              <a-radio value="compact">📊 简洁</a-radio>
              <a-radio value="detailed">📋 详细</a-radio>
            </a-radio-group>
          </div>
          <a-tooltip :content="isImmersive ? '退出沉浸模式' : '沉浸模式（占满右侧详情区域）'">
            <a-button
              size="mini"
              :type="isImmersive ? 'primary' : 'secondary'"
              @click="toggleImmersive"
            >
              <template #icon>
                <icon-shrink v-if="isImmersive" />
                <icon-expand v-else />
              </template>
            </a-button>
          </a-tooltip>
          <a-tooltip :content="isFullscreen ? '退出全屏' : '全屏'">
            <a-button size="mini" @click="toggleFullscreen">
              <template #icon>
                <icon-fullscreen-exit v-if="isFullscreen" />
                <icon-fullscreen v-else />
              </template>
            </a-button>
          </a-tooltip>
        </div>
      </header>

      <div ref="scrollRef" class="log-console" tabindex="0" @scroll="handleScroll">
        <div v-if="loading && !visibleLogs.length" class="log-empty">正在读取执行日志...</div>
        <div v-else-if="!visibleLogs.length" class="log-empty">{{ error || '暂无执行日志' }}</div>
        <div v-for="item in visibleLogs" :key="item.sequence" class="log-line" :class="`log-line--${item.level}`">
          <span class="log-time">{{ item.timestamp || '-' }}</span>
          <span class="log-icon">{{ levelIcon(item.level) }}</span>
          <span class="log-message">
            {{ displayMessage(item) }}
            <button
              v-if="item.message.length > maxMessageLength"
              type="button"
              class="log-expand"
              @click="toggleExpanded(item.sequence)"
            >
              {{ expanded.has(item.sequence) ? '收起' : `展开 (${item.message.length} 字符)` }}
            </button>
          </span>
        </div>
      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { onKeyStroke, useFullscreen, useResizeObserver } from '@vueuse/core'
import type { LiveExecutionLog } from '../execution'
import type { AutomationPlaywrightRunnerLog } from '@/apis/automation/automationPlaywrightRunner'
import { getAutomationPlaywrightRunnerJob } from '@/apis/automation/automationPlaywrightRunner'
import { getToken } from '@/utils/auth'

const props = defineProps<{
  jobId?: string
  status?: string
  artifactUrl?: string
  fallbackContent?: string
  liveLogs?: LiveExecutionLog[]
}>()

const maxMessageLength = 300
const terminalStatuses = ['passed', 'failed', 'cancelled', 'interrupted', 'completed']
const pollIntervals = [1500, 3000, 5000, 10000]
const artifactTimeoutMs = 15000
const logs = ref<AutomationPlaywrightRunnerLog[]>([])
const format = ref<'compact' | 'detailed'>('compact')
const status = ref('')
const loading = ref(false)
const error = ref('')
const viewerRef = ref<HTMLElement>()
const scrollRef = ref<HTMLElement>()
const expanded = ref(new Set<number>())
const autoFollow = ref(true)
const isImmersive = ref(false)
const immersiveContainer = shallowRef<HTMLElement>()
const immersiveStyle = ref<Record<string, string>>()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(viewerRef)
let pollTimer: number | undefined
let loadSequence = 0
let artifactController: AbortController | undefined
let artifactTimeoutTimer: number | undefined
let pollFailures = 0

const running = computed(() => ['queued', 'running'].includes(status.value))
const statusText = computed(() => ({
  passed: '执行已通过',
  failed: '执行失败',
  cancelled: '执行已取消',
}[status.value] || '历史日志'))
const visibleLogs = computed(() => format.value === 'detailed'
  ? logs.value
  : logs.value.filter((item) => !item.detail))

onKeyStroke('Escape', () => {
  if (!isFullscreen.value) exitImmersive()
})

useResizeObserver(immersiveContainer, updateImmersiveBounds)

watch(
  () => [props.jobId, props.status, props.artifactUrl, props.fallbackContent, props.liveLogs],
  () => resetAndLoad(),
  { immediate: true },
)

watch(visibleLogs, () => followLatest(), { flush: 'post' })

onUnmounted(cleanupRequests)

async function resetAndLoad() {
  const sequence = ++loadSequence
  // 实时日志由执行链路持续提供，直接替换快照但不走 fallback，避免刷新过程中闪回空步骤摘要。
  if (props.liveLogs?.length) {
    cleanupRequests()
    status.value = props.status || 'running'
    error.value = ''
    loading.value = false
    expanded.value = new Set()
    replaceLogs(props.liveLogs)
    return
  }
  cleanupRequests()
  logs.value = []
  status.value = ''
  error.value = ''
  loading.value = true
  expanded.value = new Set()
  autoFollow.value = true
  pollFailures = 0
  try {
    // CDP 运行中没有 Runner jobId 时，只等待扩展增量事件，不能用空步骤快照生成终态摘要。
    if (!props.jobId && ['waiting', 'starting', 'queued', 'running'].includes(String(props.status || ''))) {
      status.value = props.status || 'running'
      return
    }
    // 终态历史只能以持久化 artifact 为准，避免重启或节点切换后无意义地查询内存 Job。
    if (isTerminalStatus(props.status)) {
      if (props.artifactUrl && await loadArtifact(sequence)) return
      useFallback()
      return
    }
    const jobResult = props.jobId ? await loadJob(sequence) : 'missing'
    if (jobResult === 'loaded') return
    if (props.artifactUrl && await loadArtifact(sequence)) return
    useFallback()
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

async function loadJob(sequence: number): Promise<'loaded' | 'missing' | 'failed'> {
  try {
    const lastSequence = logs.value.at(-1)?.sequence
    const { data } = await getAutomationPlaywrightRunnerJob(props.jobId!, { silentError: true }, lastSequence)
    if (sequence !== loadSequence) return 'loaded'
    status.value = data.status
    const incoming = data.logs || normalizeOutputTail(data.outputTail || [])
    replaceLogs(lastSequence === undefined ? incoming : [...logs.value, ...incoming].slice(-500))
    if (!isTerminalStatus(data.status)) schedulePoll(sequence)
    return 'loaded'
  } catch (cause: any) {
    const httpStatus = Number(cause?.response?.status)
    if (httpStatus === 404 || httpStatus === 410 || String(cause?.message || '').includes('RUNNER_JOB_NOT_FOUND')) {
      return 'missing'
    }
    return 'failed'
  }
}

function schedulePoll(sequence: number) {
  clearPoll()
  pollTimer = window.setTimeout(async () => {
    if (sequence !== loadSequence || !props.jobId) return
    const jobResult = await loadJob(sequence)
    if (jobResult === 'loaded') {
      pollFailures = 0
      return
    }
    if (jobResult === 'missing') {
      if (props.artifactUrl) await loadArtifact(sequence)
      return
    }
    pollFailures++
    if (pollFailures >= pollIntervals.length) {
      if (props.artifactUrl) await loadArtifact(sequence)
      else useFallback()
      return
    }
    schedulePoll(sequence)
  }, pollIntervals[Math.min(pollFailures, pollIntervals.length - 1)])
}

async function loadArtifact(sequence: number) {
  artifactController?.abort()
  if (artifactTimeoutTimer) window.clearTimeout(artifactTimeoutTimer)
  const controller = new AbortController()
  artifactController = controller
  artifactTimeoutTimer = window.setTimeout(() => controller.abort(), artifactTimeoutMs)
  try {
    const response = await fetch(resolveProtectedUrl(props.artifactUrl!), {
      headers: authorizationHeaders(),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const content = await readArtifactJson(response)
    if (sequence !== loadSequence) return true
    const items = Array.isArray(content)
      ? content
      : Array.isArray(content?.logs)
        ? content.logs
        : Array.isArray(content?.events)
          ? content.events
          : Array.isArray(content?.data)
            ? content.data
            : []
    const normalized = items.map(normalizeLog).filter(Boolean) as AutomationPlaywrightRunnerLog[]
    if (!normalized.length) return false
    replaceLogs(normalized)
    return true
  } catch (cause: any) {
    if (sequence === loadSequence && cause?.name !== 'AbortError') {
      error.value = `读取执行日志失败：${cause?.message || '未知错误'}`
    } else if (sequence === loadSequence && cause?.name === 'AbortError') {
      error.value = '读取执行日志超时'
    }
    return false
  } finally {
    if (artifactTimeoutTimer) window.clearTimeout(artifactTimeoutTimer)
    artifactTimeoutTimer = undefined
    if (artifactController === controller) artifactController = undefined
  }
}

async function readArtifactJson(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()
  let content: any
  try {
    content = JSON.parse(text)
  } catch {
    throw new Error(contentType.includes('json') ? '执行日志格式无效' : '执行日志不是 JSON 文件')
  }
  if (content && content.success === false) {
    throw new Error(content.msg || content.message || '读取执行日志失败')
  }
  return content?.data ?? content
}

function useFallback() {
  const content = String(props.fallbackContent || '').trim()
  if (!content) return
  const structuredLogs = buildFallbackLogs(content)
  if (structuredLogs.length) {
    replaceLogs(structuredLogs)
    return
  }
  replaceLogs([{
    sequence: 1,
    timestamp: '',
    level: 'info',
    phase: 'result',
    message: content,
    detail: false,
  }])
}

function buildFallbackLogs(content: string): AutomationPlaywrightRunnerLog[] {
  let result: any
  try {
    result = JSON.parse(content)
  } catch {
    return []
  }
  if (!Array.isArray(result?.steps)) return []
  const items: AutomationPlaywrightRunnerLog[] = []
  let sequence = 0
  let elapsed = 0
  const startedAt = parseFallbackTime(result.started_at || result.startedAt)
  const push = (level: AutomationPlaywrightRunnerLog['level'], phase: string, message: string, detail = false) => {
    items.push({
      sequence: ++sequence,
      timestamp: formatFallbackTime(startedAt, elapsed),
      level,
      phase,
      message,
      detail,
    })
  }
  const executor = String(result.executor || '').toLowerCase().includes('cdp') ? 'CDP' : 'Runner'
  push('info', 'runner', `${executor} 任务开始，case=${result.case_id || result.case_name || '-'}`)
  push('success', 'case', `用例加载完成，共 ${result.steps.length} 个步骤`)
  result.steps.forEach((step: any, index: number) => {
    const number = Number(step.step_index ?? index) + 1
    const name = step.description || step.step_name || step.action_type || `步骤 ${number}`
    push('info', 'step', `步骤 ${number}: ${name}，开始执行`)
    elapsed += Math.max(0, Number(step.duration_ms ?? step.duration) || 0)
    const duration = Number(step.duration_ms ?? step.duration) || 0
    const outcome = fallbackStepOutcome(step.status, duration, step.error)
    push(outcome.level, 'step', `步骤 ${number}: ${name}，${outcome.message}`)
    const locatorSource = step.locator_source || step.locatorSource
    if (locatorSource) {
      const locatorType = step.locator_type || step.locatorType
      const locatorValue = step.locator_value || step.locatorValue
      const matchedCount = step.matched_count ?? step.matchedCount
      push('info', 'locator', [
        `步骤 ${number}: ${name}`,
        `定位来源=${locatorSource}`,
        locatorType ? `定位类型=${locatorType}` : '',
        locatorValue ? `定位元素=${locatorValue}` : '',
        matchedCount != null ? `命中=${matchedCount}` : '',
      ].filter(Boolean).join('，'), true)
    }
  })
  const runOutcome = fallbackRunOutcome(result.status)
  push(runOutcome.level, 'runner', `${executor} ${runOutcome.message}，耗时 ${elapsed}ms`)
  return items
}

function fallbackStepOutcome(statusValue: unknown, duration: number, errorValue: unknown) {
  const stepStatus = String(statusValue || '').toLowerCase()
  if (['passed', 'success'].includes(stepStatus)) {
    return { level: 'success' as const, message: `执行成功，耗时 ${duration}ms` }
  }
  if (['failed', 'error'].includes(stepStatus)) {
    const errorMessage = String(errorValue || '').trim()
    return { level: 'error' as const, message: `执行失败${errorMessage ? `：${errorMessage}` : ''}` }
  }
  if (stepStatus === 'skipped') return { level: 'warning' as const, message: '已跳过' }
  if (['cancelled', 'canceled', 'interrupted'].includes(stepStatus)) {
    return { level: 'warning' as const, message: '已取消' }
  }
  if (['running', 'starting'].includes(stepStatus)) return { level: 'info' as const, message: '执行中' }
  if (['queued', 'waiting', 'pending'].includes(stepStatus)) return { level: 'info' as const, message: '等待执行结果' }
  return { level: 'warning' as const, message: `状态未知${stepStatus ? `（${stepStatus}）` : ''}` }
}

function fallbackRunOutcome(statusValue: unknown) {
  const runStatus = String(statusValue || '').toLowerCase()
  if (['passed', 'success', 'completed'].includes(runStatus)) {
    return { level: 'success' as const, message: '执行完成' }
  }
  if (['failed', 'error'].includes(runStatus)) return { level: 'error' as const, message: '执行失败' }
  if (['cancelled', 'canceled', 'interrupted'].includes(runStatus)) {
    return { level: 'warning' as const, message: '执行已取消' }
  }
  if (['queued', 'waiting', 'pending', 'running', 'starting'].includes(runStatus)) {
    return { level: 'info' as const, message: '尚未取得最终结果' }
  }
  return { level: 'warning' as const, message: `执行状态未知${runStatus ? `（${runStatus}）` : ''}` }
}

function parseFallbackTime(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return undefined
  const timestamp = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T')).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

function formatFallbackTime(startedAt: number | undefined, elapsed: number) {
  if (startedAt == null) return ''
  const date = new Date(startedAt + elapsed)
  const pad = (value: number, length = 2) => String(value).padStart(length, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}

function replaceLogs(items: AutomationPlaywrightRunnerLog[]) {
  logs.value = items
}

function normalizeLog(item: any, index: number) {
  if (!item || typeof item !== 'object') return undefined
  return {
    sequence: Number(item.sequence) || index + 1,
    timestamp: String(item.timestamp || ''),
    level: normalizeLevel(item.level),
    phase: String(item.phase || 'runner'),
    message: String(item.message || ''),
    detail: Boolean(item.detail),
  } as AutomationPlaywrightRunnerLog
}

function normalizeOutputTail(lines: string[]) {
  return lines.map((message, index) => ({
    sequence: index + 1,
    timestamp: '',
    level: normalizeLevel(message),
    phase: 'runner',
    message,
    detail: false,
  }))
}

function normalizeLevel(value: unknown): AutomationPlaywrightRunnerLog['level'] {
  const level = String(value || '').toLowerCase()
  if (level === 'success') return 'success'
  if (level === 'warning' || level.includes('warn')) return 'warning'
  if (level === 'error' || level.includes('error') || level.includes('failed')) return 'error'
  return 'info'
}

function levelIcon(level: AutomationPlaywrightRunnerLog['level']) {
  return { info: '›_', success: '✓', warning: '⚠', error: '✕' }[level]
}

function displayMessage(item: AutomationPlaywrightRunnerLog) {
  if (item.message.length <= maxMessageLength || expanded.value.has(item.sequence)) return item.message
  return `${item.message.slice(0, maxMessageLength)}...`
}

function toggleExpanded(sequence: number) {
  const next = new Set(expanded.value)
  if (next.has(sequence)) next.delete(sequence)
  else next.add(sequence)
  expanded.value = next
}

function handleScroll() {
  const element = scrollRef.value
  if (!element) return
  autoFollow.value = element.scrollHeight - element.scrollTop - element.clientHeight < 48
}

function followLatest() {
  if (!autoFollow.value) return
  requestAnimationFrame(() => {
    const element = scrollRef.value
    if (element) element.scrollTop = element.scrollHeight
  })
}

function toggleImmersive() {
  if (isImmersive.value) {
    exitImmersive()
    return
  }
  immersiveContainer.value = viewerRef.value?.closest<HTMLElement>('.gi-page-layout__body, .arco-drawer-body')
    || document.documentElement
  updateImmersiveBounds()
  isImmersive.value = true
}

function exitImmersive() {
  isImmersive.value = false
  immersiveContainer.value = undefined
  immersiveStyle.value = undefined
}

function updateImmersiveBounds() {
  const container = immersiveContainer.value
  if (!container) return
  const bounds = container.getBoundingClientRect()
  immersiveStyle.value = {
    top: `${Math.max(0, bounds.top)}px`,
    left: `${Math.max(0, bounds.left)}px`,
    width: `${Math.min(window.innerWidth - Math.max(0, bounds.left), bounds.width)}px`,
    height: `${Math.min(window.innerHeight - Math.max(0, bounds.top), bounds.height)}px`,
  }
}

function clearPoll() {
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = undefined
}

function cleanupRequests() {
  clearPoll()
  artifactController?.abort()
  artifactController = undefined
  if (artifactTimeoutTimer) window.clearTimeout(artifactTimeoutTimer)
  artifactTimeoutTimer = undefined
}

function isTerminalStatus(value: unknown) {
  return terminalStatuses.includes(String(value || '').toLowerCase())
}

function authorizationHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function resolveProtectedUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  const base = String(import.meta.env.VITE_API_PREFIX || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  if (!base || path.startsWith(`${base}/`)) return path
  return `${base}${path}`
}
</script>

<style scoped lang="scss">
.execution-log-viewer {
  margin: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
}

.log-toolbar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-bg-2);
  color: var(--color-text-2);
  font-size: 12px;
}

.log-state,
.log-format,
.log-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-neutral-4);
}

.state-dot.active {
  background: rgb(var(--danger-6));
  box-shadow: 0 0 0 4px rgb(var(--danger-2));
  animation: live-pulse 1.4s ease-in-out infinite;
}

.log-count {
  color: var(--color-text-3);
}

.log-console {
  max-height: min(58vh, 295px);
  padding: 14px 16px;
  overflow: auto;
  background: #101828;
  color: #d0d5dd;
  font: 12px/1.7 Consolas, "SFMono-Regular", monospace;
  outline: none;
}

.log-line {
  display: grid;
  grid-template-columns: 184px 22px minmax(0, 1fr);
  gap: 8px;
  padding: 3px 6px;
  border-radius: 4px;
}

.log-line:hover {
  background: rgb(255 255 255 / 4%);
}

.log-time {
  color: #7f93b6;
  white-space: nowrap;
}

.log-icon {
  color: #3b82f6;
  font-weight: 700;
}

.log-line--success .log-icon { color: #22c55e; }
.log-line--warning .log-icon { color: #f59e0b; }
.log-line--error .log-icon { color: #ef4444; }

.log-message {
  min-width: 0;
  color: #e5e7eb;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-expand {
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #60a5fa;
  cursor: pointer;
}

.log-empty {
  padding: 48px 16px;
  color: #667085;
  text-align: center;
}

.execution-log-viewer--immersive,
.execution-log-viewer:fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1001;
  display: flex;
  width: 100vw;
  height: 100vh;
  flex-direction: column;
  border: 0;
  border-radius: 0;
  overscroll-behavior: contain;
}

.execution-log-viewer--immersive .log-console,
.execution-log-viewer:fullscreen .log-console {
  height: auto;
  min-height: 0;
  max-height: none;
  flex: 1;
}

@keyframes live-pulse {
  50% { opacity: .45; }
}

@media (max-width: 720px) {
  .log-toolbar { align-items: flex-start; flex-direction: column; }
  .log-actions { width: 100%; justify-content: space-between; }
  .log-line { grid-template-columns: 1fr; gap: 0; }
  .log-icon { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .state-dot.active { animation: none; }
}
</style>
