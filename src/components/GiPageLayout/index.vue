<template>
  <a-row align="stretch" :gutter="rowGutter" class="gi-page-layout" :class="getClass">
    <a-col
      v-if="slots.left"
      v-show="!isCollapsed"
      v-bind="props.leftColProps"
      :style="leftColStyle"
    >
      <div class="gi-page-layout__left" :style="leftStyle">
        <slot name="left"></slot>
      </div>
    </a-col>
    <div v-if="slots.left" class="gi-page-layout__divider" :class="{ none: isCollapsed || !isDesktop }" @mousedown="startDrag">
      <div v-if="defaultCollapsed" class="gi-split-button" :class="{ none: isCollapsed || !isDesktop }" :style="splitButtonStyle" @click="toggleCollapsed()">
        <icon-right v-if="isCollapsed" />
        <icon-left v-else />
      </div>
    </div>
    <a-col :sm="16" :md="17" :lg="18" :xl="19" :xxl="20" flex="1" v-bind="props.rightColProps">
      <!-- <a-col v-bind="props.rightColProps" style="flex: 1 1 auto;"> -->
      <div v-if="slots.header" class="gi-page-layout__header" :style="props.headerStyle">
        <slot name="header"></slot>
      </div>

      <div class="gi-page-layout__body" :style="props.bodyStyle">
        <div v-if="!isDesktop && !isCollapsed" class="gi-page-layout__mask"></div>
        <slot></slot>
      </div>
    </a-col>
  </a-row>
</template>

<script setup lang='ts'>
import type { ColProps } from '@arco-design/web-vue'
import type { CSSProperties } from 'vue'
import { useBreakpoint, useDevice } from '@/hooks'

defineOptions({ name: 'GiPageLayout' })

const props = withDefaults(defineProps<Props>(), {
  margin: true,
  padding: true,
  gutter: false,
  defaultCollapsed: true,
  leftColProps: () => ({}),
  rightColProps: () => ({}),
  leftStyle: () => ({}),
  headerStyle: () => ({}),
  bodyStyle: () => ({}),
})

/** 组件插槽定义 */
defineSlots<{
  header: () => void
  left: () => void
  default: () => void
}>()

/** 组件属性定义 */
interface Props {
  margin?: boolean
  padding?: boolean
  gutter?: boolean | number
  defaultCollapsed?: boolean
  leftColProps?: ColProps
  rightColProps?: ColProps
  leftStyle?: CSSProperties
  headerStyle?: CSSProperties
  bodyStyle?: CSSProperties
}

const { isDesktop } = useDevice()
const getClass = computed(() => {
  return {
    'gi-page-layout--margin': props.margin,
    'gi-page-layout--padding': props.padding,
    'gi-page-layout--gutter': !!props.gutter,
  }
})

const rowGutter = computed(() => {
  if (typeof props.gutter === 'boolean') {
    return props.gutter ? 14 : undefined
  }
  return props.gutter
})

const slots = useSlots()
const isCollapsed = ref(false)
const normalizeWidth = (val: unknown, fallback = 400) => {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string') {
    const n = Number.parseFloat(val)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

const leftWidth = ref<number>(normalizeWidth(props.leftStyle?.width, 400))

watch(
  () => props.leftStyle?.width,
  (val) => {
    // 外部传入 width 变化时，同步（避免出现 NaN 导致布局失效）
    leftWidth.value = normalizeWidth(val, leftWidth.value || 400)
  },
)

const toggleCollapsed = (status?: boolean) => {
  isCollapsed.value = status ?? !isCollapsed.value
}

const { breakpoint } = useBreakpoint()
watch(() => breakpoint.value, (val) => {
  isCollapsed.value = ['xs'].includes(val)
}, { immediate: true })

// 拖拽相关逻辑
let startX = 0
let startWidth = 0

const onDrag = (e: MouseEvent) => {
  const dx = e.clientX - startX
  const next = startWidth + dx
  leftWidth.value = Math.max(50, Math.min(window.innerWidth * 0.5, next)) // 最小50px，最大屏宽50%
}

const stopDrag = () => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const startDrag = (e: MouseEvent) => {
  e.preventDefault()
  startX = e.clientX
  startWidth = leftWidth.value
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

// 动态计算左侧样式
const leftStyle = computed(() => ({
  ...props.leftStyle,
  width: `${leftWidth.value}px`,
}))

// 左侧列必须跟随拖拽宽度，否则会被栅格百分比“锁死”
const leftColStyle = computed<CSSProperties>(() => ({
  flex: `0 0 ${leftWidth.value}px`,
  width: `${leftWidth.value}px`,
  maxWidth: `${leftWidth.value}px`,
}))

// 动态计算分割线按钮样式
const splitButtonStyle = computed(() => ({
  left: isCollapsed.value ? `-10px` : '-12px', // 分割线按钮位置与左侧宽度同步
}))

defineExpose({ toggleCollapsed })
</script>

<style lang='scss' scoped>
.gi-page-layout {
  flex: 1;
  height: 100%;
  display: flex;
  overflow: hidden;
  box-sizing: border-box;
  background-color: var(--color-bg-1);
  position: relative;

  &--margin {
    margin: $margin;
  }

  &--padding {

    .gi-page-layout__left,
    .gi-page-layout__header,
    .gi-page-layout__body {
      padding: $padding;
    }

    .gi-page-layout__header {
      padding-bottom: 0;
    }
  }

  &--gutter {
    .gi-page-layout__body-left {
      border-right: none;
    }
  }

  :deep(.arco-col) {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.gi-page-layout__left {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.gi-page-layout__header {
  border-bottom: 1px solid var(--color-border);
  box-sizing: border-box;
}

.gi-page-layout__body {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.gi-page-layout__divider {
  position: relative;
  width: 2px;
  background-color: var(--color-border);
  cursor: ew-resize;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgb(var(--primary-6)); /* 悬停时变为蓝色 */
  }
}

.gi-page-layout__divider.none {
  width: 0;
}

.gi-split-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  border: 1px solid var(--color-border-2);
  box-sizing: border-box;
  background-color: var(--color-bg-1);
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
}

.gi-page-layout__mask{
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(20px);
  z-index: 20;
}

.gi-split-button.none {
  left: -12px;
}
</style>
