<template>
  <Teleport to="body" :disabled="!isImmersive">
    <section
      ref="workspaceRef"
      class="execution-workspace"
      :class="{ 'execution-workspace--immersive': isImmersive }"
      :style="isFullscreen ? undefined : immersiveStyle"
      :aria-label="title"
    >
      <header v-if="!externalModeControls || isImmersive || isFullscreen" class="workspace-toolbar">
        <div class="workspace-modes">
          <a-button
            v-for="item in availableModes"
            :key="item.value"
            size="mini"
            :type="effectiveMode === item.value ? 'primary' : 'secondary'"
            :aria-pressed="effectiveMode === item.value"
            @click="mode = item.value"
          >
            {{ item.label }}
          </a-button>
        </div>
        <span v-if="isImmersive || isFullscreen" class="workspace-title">{{ title }}</span>
      </header>
      <div
        ref="panesRef"
        class="workspace-panes"
        :class="`workspace-panes--${effectiveMode}`"
        :style="{ '--log-fraction': String(logPercent / 100) }"
      >
        <!-- 切换单栏只隐藏面板，保留日志滚动状态和实时帧连接。 -->
        <div v-show="effectiveMode !== 'live'" class="workspace-pane workspace-pane--log">
          <slot name="log" :viewport-controls="effectiveMode === 'log' ? viewportControls : undefined" />
        </div>
        <button
          v-show="effectiveMode === 'split'"
          type="button"
          class="workspace-divider"
          aria-label="调整日志与画面比例"
          :aria-valuenow="logPercent"
          aria-valuemin="30"
          aria-valuemax="55"
          aria-orientation="vertical"
          role="separator"
          @pointerdown="startResize"
          @pointermove="resizePanes"
          @pointerup="stopResize"
          @pointercancel="stopResize"
          @lostpointercapture="dragging = false"
          @keydown.left.prevent="setLogPercent(logPercent - 1)"
          @keydown.right.prevent="setLogPercent(logPercent + 1)"
          @keydown.home.prevent="setLogPercent(38)"
          @dblclick="setLogPercent(38)"
        />
        <div v-if="liveSupported" v-show="effectiveMode !== 'log'" class="workspace-pane workspace-pane--live">
          <slot name="live" :viewport-controls="viewportControls" />
        </div>
      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { onKeyStroke, useEventListener, useFullscreen, useResizeObserver } from '@vueuse/core'

const mode = defineModel<'split' | 'log' | 'live'>({ default: 'split' })
const props = withDefaults(defineProps<{
  title?: string
  liveSupported?: boolean
  /** 用例卡片已有标题操作区，普通视图不重复占用一行。 */
  externalModeControls?: boolean
}>(), {
  title: '执行视图',
  liveSupported: true,
  externalModeControls: false,
})
const emit = defineEmits<{ (e: 'restore'): void }>()
const modes = [
  { value: 'split', label: '双栏' },
  { value: 'log', label: '日志' },
  { value: 'live', label: '实时画面' },
] as const
const availableModes = computed(() => modes.filter((item) => props.liveSupported || item.value === 'log'))
const effectiveMode = computed(() => props.liveSupported ? mode.value : 'log')
const workspaceRef = ref<HTMLElement>()
const panesRef = ref<HTMLElement>()
const logPercent = ref(38)
const dragging = ref(false)
const isImmersive = ref(false)
const immersiveContainer = shallowRef<HTMLElement>()
const immersiveStyle = ref<Record<string, string>>()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(workspaceRef)
const viewportControls = computed<ExecutionViewportControls>(() => ({
  immersive: isImmersive.value,
  fullscreen: isFullscreen.value,
  toggleImmersive,
  toggleFullscreen,
}))

function setLogPercent(value: number) {
  logPercent.value = Math.max(30, Math.min(55, value))
}

function startResize(event: PointerEvent) {
  if (event.button !== 0) return
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function resizePanes(event: PointerEvent) {
  if (!dragging.value || !panesRef.value) return
  const bounds = panesRef.value.getBoundingClientRect()
  // 分隔条占 8px，左右面板按剩余宽度分配，避免比例相加后溢出。
  if (bounds.width > 8) setLogPercent(Math.round((event.clientX - bounds.left - 4) / (bounds.width - 8) * 100))
}

function stopResize(event: PointerEvent) {
  dragging.value = false
  const divider = event.currentTarget as HTMLElement
  if (divider.hasPointerCapture(event.pointerId)) divider.releasePointerCapture(event.pointerId)
}

function toggleImmersive() {
  if (isImmersive.value) {
    exitImmersive()
    return
  }
  immersiveContainer.value = workspaceRef.value?.closest<HTMLElement>('.gi-page-layout__body, .arco-drawer-body')
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
  const top = Math.max(0, bounds.top)
  const left = Math.max(0, bounds.left)
  // Teleport 后按原容器与视口的交集定位，不能再叠加普通视图的外边距。
  immersiveStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${Math.max(0, Math.min(window.innerWidth, bounds.right) - left)}px`,
    height: `${Math.max(0, Math.min(window.innerHeight, bounds.bottom) - top)}px`,
  }
}

useResizeObserver(immersiveContainer, updateImmersiveBounds)
useEventListener(window, 'resize', updateImmersiveBounds)
useEventListener(window, 'scroll', updateImmersiveBounds, { capture: true, passive: true })
onKeyStroke('Escape', () => {
  if (!isFullscreen.value) exitImmersive()
})
watch([isImmersive, isFullscreen], ([immersive, fullscreen]) => {
  if (immersive && !fullscreen) updateImmersiveBounds()
  if (!immersive && !fullscreen) nextTick(() => emit('restore'))
})
</script>

<script lang="ts">
// 按钮可放在子视图工具栏，但沉浸和全屏必须仍由整个执行容器接管。
export interface ExecutionViewportControls {
  immersive: boolean
  fullscreen: boolean
  toggleImmersive: () => void
  toggleFullscreen: () => void
}
</script>

<style scoped lang="scss">
.execution-workspace {
  display: flex;
  box-sizing: border-box;
  height: min(720px, var(--execution-content-height, 72dvh));
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-2);
  white-space: normal;
  container-type: inline-size;
}

.workspace-toolbar,
.workspace-modes {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.workspace-toolbar {
  flex: none;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid var(--color-border-2);
}

.workspace-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--color-text-2);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-panes {
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 1;
  margin: 8px;
  grid-template-columns: minmax(0, calc((100% - 8px) * var(--log-fraction))) 8px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

.workspace-panes--log,
.workspace-panes--live {
  grid-template-columns: minmax(0, 1fr);
}

.workspace-pane {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.workspace-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  touch-action: none;

  &::before {
    width: 2px;
    height: 32px;
    border-radius: 2px;
    background: var(--color-border-3);
    content: '';
  }

  &:hover::before { background: rgb(var(--primary-6)); }
}

.execution-workspace--immersive,
.execution-workspace:fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1001;
  width: 100vw;
  height: 100dvh;
  max-height: none;
  margin: 0;
  overscroll-behavior: contain;
}

@container (min-width: 761px) {
  // 横向双栏共用标题行，内边距变化或按钮换行时仍保持内容顶部对齐。
  .workspace-panes--split {
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .workspace-panes--split > .workspace-pane,
  .workspace-panes--split :deep(.execution-log-viewer--embedded),
  .workspace-panes--split :deep(.live-view--embedded) {
    display: grid;
    height: auto;
    grid-row: 1 / -1;
    grid-template-rows: subgrid;
  }

  .workspace-panes--split > .workspace-pane--log { grid-column: 1; }
  .workspace-panes--split > .workspace-pane--live { grid-column: 3; }

  // 日志根节点的尺寸容器会隔断共享行；宽度查询下移到工具栏和正文。
  .workspace-panes--split :deep(.execution-log-viewer--embedded) { container-type: normal; }
  .workspace-panes--split :deep(.log-toolbar),
  .workspace-panes--split :deep(.log-console) { container-type: inline-size; }

  .workspace-panes--split > .workspace-divider {
    grid-column: 2;
    grid-row: 1 / -1;
  }

  // 画面没有日志底栏，继续占满内容区直到面板底部。
  .workspace-panes--split :deep(.live-stage) { grid-row: 2 / -1; }
}

@container (max-width: 760px) {
  .workspace-panes--split {
    gap: 8px;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  .workspace-divider { display: none; }
  .workspace-panes--split .workspace-pane--live { grid-row: 1; }
}
</style>
