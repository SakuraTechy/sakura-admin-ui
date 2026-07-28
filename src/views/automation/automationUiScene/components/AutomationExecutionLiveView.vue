<template>
  <Teleport to="body" :disabled="!isImmersive">
    <section
      ref="viewerRef"
      class="live-view"
      :class="{
        'live-view--immersive': isImmersive,
        'live-view--original': isOriginalScale,
        'live-view--detail': detailPreviewEnabled,
      }"
      :style="isFullscreen ? undefined : immersiveStyle"
    >
      <header class="live-header">
        <div class="live-status">
          <span class="live-dot" :class="{ active: connected }" />
          <strong>{{ connected ? 'LIVE' : stateLabel }}</strong>
          <span v-if="qualityLabel" class="quality-badge">画质：{{ qualityLabel }}</span>
          <span v-if="frameResolution" class="frame-resolution">{{ frameResolution }}</span>
          <span v-if="frameCount" class="frame-count">帧数：{{ frameCount }}</span>
        </div>
        <div class="live-actions">
          <span v-if="lastFrameAt" class="last-frame">最后更新：{{ lastFrameAt }}</span>
          <a-tooltip content="保持完整画面，鼠标指向位置显示 1:1 原始细节">
            <a-button
              size="mini"
              :type="detailPreviewEnabled ? 'primary' : 'secondary'"
              :disabled="!imageUrl"
              @click="toggleDetailPreview"
            >
              细节
            </a-button>
          </a-tooltip>
          <a-tooltip :content="isOriginalScale ? '切换为适应窗口' : '按原始像素 1:1 显示，可滚动查看细节'">
            <a-button
              size="mini"
              :type="isOriginalScale ? 'primary' : 'secondary'"
              :disabled="!imageUrl"
              @click="toggleOriginalScale"
            >
              1:1
            </a-button>
          </a-tooltip>
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

      <div ref="stageRef" class="live-stage" @mousemove="handleStageMouseMove">
        <img
          v-if="imageUrl"
          ref="imageRef"
          class="live-frame-image"
          :src="imageUrl"
          :style="focusedImageStyle"
          alt="Playwright Runner 实时画面"
          @load="handleImageLoad"
        />
        <div v-else class="live-placeholder">
          <span class="placeholder-icon">{{ placeholderIcon }}</span>
          <strong>{{ stateLabel }}</strong>
          <p>{{ stateDescription }}</p>
        </div>
        <img
          v-if="pointerVisible && !isOriginalScale && !detailPreviewEnabled"
          class="live-action-cursor"
          :src="actionCursorUrl"
          :style="cursorStyle"
          alt=""
          aria-hidden="true"
        />
        <span
          v-if="rippleVisible"
          :key="rippleSequence"
          class="action-ripple"
          :style="rippleStyle"
        />
        <div v-if="currentActionLabel" class="live-action-label">
          {{ currentActionLabel }}
        </div>
        <div
          v-if="detailPreviewEnabled && detailPreviewStyle"
          class="detail-preview"
          :style="detailPreviewStyle"
        >
          <span>1:1 原始细节</span>
        </div>
        <div v-if="error" class="live-error">{{ error }}</div>
      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { onKeyStroke, useFullscreen, useResizeObserver } from '@vueuse/core'
import { getAutomationPlaywrightRunnerLiveUrl } from '@/apis/automation/automationPlaywrightRunner'
import actionCursorUrl from '@/assets/images/playwright-action-cursor.png'
import { getToken } from '@/utils/auth'

const props = defineProps<{
  jobId?: string
  status?: unknown
  quality?: unknown
}>()

interface LiveFramePresentation {
  label: string
  focusX: number | null
  focusY: number | null
  focusScale: number
  pointer: boolean
  ripple: boolean
}

const terminalStatuses = ['passed', 'failed', 'cancelled', 'interrupted', 'completed', 'blocked', 'skipped']
const qualityLabels: Record<string, string> = {
  'smooth': '流畅',
  'high': '高清',
  'ultra': '4K',
  '8k': '8K',
}
const detailPreviewWidth = 320
const detailPreviewHeight = 180
const viewerRef = ref<HTMLElement>()
const stageRef = ref<HTMLElement>()
const imageRef = ref<HTMLImageElement>()
const isImmersive = ref(false)
const isOriginalScale = ref(false)
const detailPreviewEnabled = ref(false)
const detailSourcePoint = reactive({ x: 0.5, y: 0.5 })
const frameNaturalSize = reactive({ width: 0, height: 0 })
const livePresentation = reactive<LiveFramePresentation>({
  label: '',
  focusX: null,
  focusY: null,
  focusScale: 1,
  pointer: false,
  ripple: false,
})
const focusedImageStyle = ref<Record<string, string>>({
  transform: 'translate3d(0, 0, 0) scale(1)',
  transformOrigin: '0 0',
})
const focusTargetPoint = reactive({ x: 0, y: 0 })
const cursorTargetPoint = reactive({ x: 0, y: 0 })
const currentActionLabel = ref('')
const pointerVisible = ref(false)
const rippleVisible = ref(false)
const rippleSequence = ref(0)
const immersiveContainer = shallowRef<HTMLElement>()
const immersiveStyle = ref<Record<string, string>>()
const connected = ref(false)
const imageUrl = ref('')
const frameCount = ref(0)
const frameResolution = ref('')
const lastFrameAt = ref('')
const error = ref('')
const streamEnded = ref(false)
let controller: AbortController | undefined
let pollTimer: number | undefined
let connectionSequence = 0
let lastFrameSequence = ''
let rippleDelayTimer: number | undefined
let rippleHideTimer: number | undefined
let pointerActivationPending = false
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(viewerRef)

onKeyStroke('Escape', () => {
  if (!isFullscreen.value) exitImmersive()
})

useResizeObserver(immersiveContainer, updateImmersiveBounds)
useResizeObserver(stageRef, updateFocusedImageTransform)

const normalizedStatus = computed(() => String(props.status || '').toLowerCase())
const qualityLabel = computed(() => {
  const quality = String(props.quality || '').trim().toLowerCase()
  return quality && quality !== '-' ? qualityLabels[quality] || quality : ''
})
// 动作帧需要比普通定时截图更快拉取；高分辨率档位适当降频，避免重复下载大图影响流畅度。
const liveFramePollIntervalMs = computed(() => {
  const quality = String(props.quality || '').trim().toLowerCase()
  if (quality === '8k') return 1000
  if (quality === 'ultra') return 750
  return 500
})
const detailPreviewStyle = computed<Record<string, string> | undefined>(() => {
  const { width, height } = frameNaturalSize
  if (!imageUrl.value || !width || !height) return undefined
  const halfWidth = detailPreviewWidth / 2
  const halfHeight = detailPreviewHeight / 2
  const sourceX = Math.min(Math.max(detailSourcePoint.x * width, halfWidth), width - halfWidth)
  const sourceY = Math.min(Math.max(detailSourcePoint.y * height, halfHeight), height - halfHeight)
  return {
    backgroundImage: `url("${imageUrl.value}")`,
    backgroundPosition: `${halfWidth - sourceX}px ${halfHeight - sourceY}px`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${width}px ${height}px`,
  }
})
const rippleStyle = computed<Record<string, string>>(() => ({
  left: `${focusTargetPoint.x}px`,
  top: `${focusTargetPoint.y}px`,
}))
const cursorStyle = computed<Record<string, string>>(() => ({
  left: `${cursorTargetPoint.x}px`,
  top: `${cursorTargetPoint.y}px`,
}))
const terminal = computed(() => streamEnded.value || terminalStatuses.includes(normalizedStatus.value))
const stateLabel = computed(() => {
  if (!props.jobId) return '当前记录没有实时画面'
  if (terminal.value) return '执行已结束'
  if (error.value) return '连接已断开'
  return '等待实时画面'
})
const stateDescription = computed(() => {
  if (!props.jobId) return '旧执行记录或非 Runner 任务不包含 jobId。'
  if (terminal.value) return '实时画面仅在 Runner 执行期间提供，请查看录屏或执行报告。'
  if (error.value) return '请确认 Runner 与 admin 服务连接正常后重新打开。'
  return 'Runner 正在初始化浏览器，首帧生成后会自动显示。'
})
const placeholderIcon = computed(() => terminal.value ? '■' : props.jobId ? '▶' : '—')

watch(
  () => [props.jobId, normalizedStatus.value],
  () => restart(),
  { immediate: true },
)

onUnmounted(cleanup)

function restart() {
  const sequence = ++connectionSequence
  cleanup()
  isOriginalScale.value = false
  detailPreviewEnabled.value = false
  frameCount.value = 0
  frameResolution.value = ''
  frameNaturalSize.width = 0
  frameNaturalSize.height = 0
  lastFrameAt.value = ''
  error.value = ''
  streamEnded.value = false
  lastFrameSequence = ''
  resetLivePresentation()
  if (!props.jobId || terminalStatuses.includes(normalizedStatus.value)) return
  // 已结束的短任务也尝试拉取一次后台暂存的最后画面；无保留帧时接口会返回 410。
  pollFrame(sequence)
}

async function pollFrame(sequence: number) {
  if (sequence !== connectionSequence || !props.jobId) return
  const currentController = new AbortController()
  controller = currentController
  try {
    const token = getToken()
    const response = await fetch(getAutomationPlaywrightRunnerLiveUrl(props.jobId, lastFrameSequence), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: currentController.signal,
      cache: 'no-store',
    })
    if (sequence !== connectionSequence || currentController.signal.aborted) return
    if (response.status === 410) {
      connected.value = false
      streamEnded.value = true
      error.value = ''
      return
    }
    if (response.status === 204) {
      error.value = ''
      schedulePoll(sequence)
      return
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const frame = await response.blob()
    if (sequence !== connectionSequence || currentController.signal.aborted) return
    const frameSequence = response.headers.get('X-Sakura-Frame-Sequence') || `${frame.size}:${Date.now()}`
    if (frame.size > 0 && frameSequence !== lastFrameSequence) {
      const presentation = await readLiveFramePresentation(frame)
      showFrame(frame, frameSequence, presentation)
    }

    const jobStatus = String(response.headers.get('X-Sakura-Job-Status') || '').toLowerCase()
    if (terminalStatuses.includes(jobStatus)) {
      connected.value = false
      streamEnded.value = true
      return
    }
    schedulePoll(sequence)
  } catch (cause: any) {
    if (cause?.name !== 'AbortError' && sequence === connectionSequence) {
      connected.value = false
      error.value = `实时画面连接失败：${cause?.message || '未知错误'}`
      schedulePoll(sequence)
    }
  } finally {
    if (controller === currentController) controller = undefined
  }
}

function schedulePoll(sequence: number) {
  if (sequence !== connectionSequence || streamEnded.value || terminalStatuses.includes(normalizedStatus.value)) return
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = window.setTimeout(() => {
    pollTimer = undefined
    pollFrame(sequence)
  }, liveFramePollIntervalMs.value)
}

function showFrame(frame: Blob, frameSequence: string, presentation: LiveFramePresentation | null) {
  const nextUrl = URL.createObjectURL(frame)
  const previousUrl = imageUrl.value
  applyLiveFramePresentation(presentation)
  imageUrl.value = nextUrl
  lastFrameSequence = frameSequence
  connected.value = true
  error.value = ''
  frameCount.value++
  lastFrameAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  if (previousUrl) requestAnimationFrame(() => URL.revokeObjectURL(previousUrl))
}

function handleImageLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  frameNaturalSize.width = image.naturalWidth
  frameNaturalSize.height = image.naturalHeight
  frameResolution.value = image.naturalWidth && image.naturalHeight
    ? `${image.naturalWidth}×${image.naturalHeight}`
    : ''
  updateFocusedImageTransform()
}

function toggleDetailPreview() {
  if (!imageUrl.value) return
  detailPreviewEnabled.value = !detailPreviewEnabled.value
  if (detailPreviewEnabled.value) {
    isOriginalScale.value = false
    detailSourcePoint.x = 0.5
    detailSourcePoint.y = 0.5
  }
  nextTick(updateFocusedImageTransform)
}

function handleStageMouseMove(event: MouseEvent) {
  const image = imageRef.value
  if (!detailPreviewEnabled.value || !image?.naturalWidth || !image.naturalHeight) return
  const bounds = image.getBoundingClientRect()
  const imageRatio = image.naturalWidth / image.naturalHeight
  const boxRatio = bounds.width / bounds.height
  const renderedWidth = imageRatio > boxRatio ? bounds.width : bounds.height * imageRatio
  const renderedHeight = imageRatio > boxRatio ? bounds.width / imageRatio : bounds.height
  const renderedLeft = bounds.left + (bounds.width - renderedWidth) / 2
  const renderedTop = bounds.top + (bounds.height - renderedHeight) / 2
  const x = (event.clientX - renderedLeft) / renderedWidth
  const y = (event.clientY - renderedTop) / renderedHeight
  if (x < 0 || x > 1 || y < 0 || y > 1) return
  detailSourcePoint.x = x
  detailSourcePoint.y = y
}

function toggleOriginalScale() {
  if (!imageUrl.value) return
  isOriginalScale.value = !isOriginalScale.value
  if (isOriginalScale.value) detailPreviewEnabled.value = false
  nextTick(() => {
    updateFocusedImageTransform()
    const stage = stageRef.value
    if (!stage || !isOriginalScale.value) return
    stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2)
    stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2)
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

function cleanup(releaseImage = true) {
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = undefined
  controller?.abort()
  controller = undefined
  clearRippleTimers()
  connected.value = false
  if (releaseImage && imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  if (releaseImage) imageUrl.value = ''
}

async function readLiveFramePresentation(frame: Blob): Promise<LiveFramePresentation | null> {
  const prefix = 'SAKURA_FOCUS:'
  const tail = await frame.slice(Math.max(0, frame.size - 2048)).text()
  const start = tail.lastIndexOf(prefix)
  if (start < 0) return null
  const jsonStart = start + prefix.length
  const jsonEnd = tail.indexOf('\n', jsonStart)
  if (jsonEnd < 0) return null
  try {
    const raw = JSON.parse(tail.slice(jsonStart, jsonEnd))
    const focusX = finiteNumber(raw?.focusX)
    const focusY = finiteNumber(raw?.focusY)
    const hasFocus = focusX != null && focusY != null
    return {
      label: String(raw?.label || '').trim().slice(0, 200),
      focusX: hasFocus ? clamp(focusX, 0, 1) : null,
      focusY: hasFocus ? clamp(focusY, 0, 1) : null,
      focusScale: hasFocus ? clamp(finiteNumber(raw?.focusScale) ?? 1, 1, 2.5) : 1,
      pointer: hasFocus && raw?.pointer === true,
      ripple: hasFocus && raw?.ripple === true,
    }
  } catch {
    return null
  }
}

function applyLiveFramePresentation(presentation: LiveFramePresentation | null) {
  const wasPointerVisible = pointerVisible.value
  livePresentation.label = presentation?.label || ''
  livePresentation.focusX = presentation?.focusX ?? null
  livePresentation.focusY = presentation?.focusY ?? null
  livePresentation.focusScale = presentation?.focusScale ?? 1
  livePresentation.pointer = presentation?.pointer === true
  livePresentation.ripple = presentation?.ripple === true
  currentActionLabel.value = livePresentation.label
  pointerVisible.value = livePresentation.pointer
  pointerActivationPending = livePresentation.pointer && !wasPointerVisible
  nextTick(updateFocusedImageTransform)
  if (livePresentation.ripple) scheduleRipple()
}

function resetLivePresentation() {
  livePresentation.label = ''
  livePresentation.focusX = null
  livePresentation.focusY = null
  livePresentation.focusScale = 1
  livePresentation.pointer = false
  livePresentation.ripple = false
  currentActionLabel.value = ''
  pointerVisible.value = false
  pointerActivationPending = false
  focusedImageStyle.value = {
    transform: 'translate3d(0, 0, 0) scale(1)',
    transformOrigin: '0 0',
  }
  rippleVisible.value = false
  clearRippleTimers()
}

function updateFocusedImageTransform() {
  const stage = stageRef.value
  const image = imageRef.value
  const focusX = livePresentation.focusX
  const focusY = livePresentation.focusY
  const focusDisabled = isOriginalScale.value || detailPreviewEnabled.value
  if (!stage || !image || focusDisabled || focusX == null || focusY == null) {
    focusedImageStyle.value = {
      transform: 'translate3d(0, 0, 0) scale(1)',
      transformOrigin: '0 0',
    }
    return
  }

  const stageWidth = stage.clientWidth
  const stageHeight = stage.clientHeight
  const naturalWidth = image.naturalWidth
  const naturalHeight = image.naturalHeight
  if (!stageWidth || !stageHeight || !naturalWidth || !naturalHeight) return

  const imageRatio = naturalWidth / naturalHeight
  const stageRatio = stageWidth / stageHeight
  const renderedWidth = imageRatio > stageRatio ? stageWidth : stageHeight * imageRatio
  const renderedHeight = imageRatio > stageRatio ? stageWidth / imageRatio : stageHeight
  const renderedLeft = (stageWidth - renderedWidth) / 2
  const renderedTop = (stageHeight - renderedHeight) / 2
  const sourceX = focusX * renderedWidth
  const sourceY = focusY * renderedHeight
  const scale = livePresentation.focusScale
  const targetX = coveredTargetPosition(stageWidth, renderedWidth, sourceX, scale)
  const targetY = coveredTargetPosition(stageHeight, renderedHeight, sourceY, scale)
  const translateX = targetX - scale * (renderedLeft + sourceX)
  const translateY = targetY - scale * (renderedTop + sourceY)

  focusTargetPoint.x = targetX
  focusTargetPoint.y = targetY
  if (pointerVisible.value) {
    if (pointerActivationPending) {
      cursorTargetPoint.x = stageWidth / 2
      cursorTargetPoint.y = stageHeight / 2
      pointerActivationPending = false
      requestAnimationFrame(() => {
        if (!pointerVisible.value) return
        cursorTargetPoint.x = targetX
        cursorTargetPoint.y = targetY
      })
    } else {
      cursorTargetPoint.x = targetX
      cursorTargetPoint.y = targetY
    }
  }
  focusedImageStyle.value = {
    transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
    transformOrigin: '0 0',
  }
}

function coveredTargetPosition(stageSize: number, renderedSize: number, sourcePosition: number, scale: number) {
  if (renderedSize * scale < stageSize) return stageSize / 2
  const minPosition = stageSize - scale * (renderedSize - sourcePosition)
  const maxPosition = scale * sourcePosition
  return clamp(stageSize / 2, minPosition, maxPosition)
}

function scheduleRipple() {
  clearRippleTimers()
  rippleVisible.value = false
  const sequence = ++rippleSequence.value
  // 录屏中波纹在聚焦接近完成时出现，仅播放一次。
  rippleDelayTimer = window.setTimeout(() => {
    if (sequence !== rippleSequence.value || isOriginalScale.value || detailPreviewEnabled.value) return
    rippleVisible.value = true
    rippleHideTimer = window.setTimeout(() => {
      if (sequence === rippleSequence.value) rippleVisible.value = false
    }, 360)
  }, 430)
}

function clearRippleTimers() {
  if (rippleDelayTimer) window.clearTimeout(rippleDelayTimer)
  if (rippleHideTimer) window.clearTimeout(rippleHideTimer)
  rippleDelayTimer = undefined
  rippleHideTimer = undefined
}

function finiteNumber(value: unknown) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
</script>

<style scoped lang="scss">
.live-view {
  margin: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
}

.live-header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid var(--color-border-2);
  color: var(--color-text-2);
  font-size: 12px;
}

.live-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--color-neutral-4);
}

.live-dot.active {
  background: rgb(var(--danger-6));
  box-shadow: 0 0 0 4px rgb(var(--danger-2));
  animation: live-pulse 1.4s ease-in-out infinite;
}

.frame-count,
.frame-resolution,
.last-frame {
  color: var(--color-text-3);
}

.quality-badge {
  padding: 2px 7px;
  border-radius: 4px;
  background: rgb(var(--primary-1));
  color: rgb(var(--primary-6));
  font-weight: 600;
}

.live-stage {
  position: relative;
  display: flex;
  height: min(65vh, 680px);
  min-height: 420px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #090f1d;
}

.live-frame-image {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center center;
  transition: transform 560ms cubic-bezier(.2, .75, .2, 1);
  will-change: transform;
}

.live-action-cursor {
  position: absolute;
  z-index: 4;
  width: 37px;
  height: 48px;
  filter: drop-shadow(0 0 1px rgb(255 255 255 / 95%)) drop-shadow(1px 2px 2px rgb(0 0 0 / 55%));
  pointer-events: none;
  transform: translate(-2px, -2px);
  transition: left 560ms cubic-bezier(.2, .75, .2, 1), top 560ms cubic-bezier(.2, .75, .2, 1);
}

.action-ripple {
  position: absolute;
  z-index: 3;
  width: 20px;
  height: 20px;
  border: 3px solid #ff6b00;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 70%);
  pointer-events: none;
  animation: action-ripple 360ms ease-out forwards;
}

.live-action-label {
  position: absolute;
  bottom: 18px;
  left: 50%;
  z-index: 3;
  max-width: calc(100% - 48px);
  overflow: hidden;
  padding: 10px 18px 10px 22px;
  border-left: 5px solid #ff6b00;
  border-radius: 8px;
  background: rgb(15 23 42 / 88%);
  box-shadow: 0 6px 18px rgb(0 0 0 / 24%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  transform: translateX(-50%);
  white-space: nowrap;
}

.live-view--detail .live-stage {
  cursor: crosshair;
}

.detail-preview {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  width: 320px;
  height: 180px;
  overflow: hidden;
  border: 2px solid rgb(var(--primary-5));
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
  pointer-events: none;
}

.detail-preview span {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgb(0 0 0 / 65%);
  color: #fff;
  font-size: 11px;
}

.live-view--original .live-stage {
  display: block;
  overflow: auto;
}

.live-view--original .live-frame-image {
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  object-fit: none;
}

.live-placeholder {
  display: flex;
  max-width: 460px;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px;
  color: #cbd5e1;
  text-align: center;
}

.placeholder-icon {
  color: #60a5fa;
  font-size: 44px;
}

.live-placeholder p {
  margin: 0;
  color: #7f93b6;
}

.live-error {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgb(var(--danger-6) / 90%);
  color: #fff;
  font-size: 12px;
}

.live-view--immersive,
.live-view:fullscreen {
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

.live-view--immersive .live-stage,
.live-view:fullscreen .live-stage {
  height: auto;
  min-height: 0;
  flex: 1;
}

@keyframes live-pulse {
  50% { opacity: .45; }
}

@keyframes action-ripple {
  from {
    opacity: .95;
    transform: translate(-50%, -50%) scale(.35);
  }

  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.7);
  }
}

@media (prefers-reduced-motion: reduce) {
  .live-dot.active { animation: none; }
  .live-frame-image,
  .live-action-cursor { transition: none; }
  .action-ripple { animation-duration: 1ms; }
}
</style>
