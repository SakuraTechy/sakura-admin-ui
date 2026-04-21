<!-- 未完善 -->
<template>
  <div ref="divRef" class="container">
    <div class="aie-container">
      <div class="aie-header-panel">
        <div class="aie-container-header">
        </div>
      </div>
      <div class="aie-main">
        <div class="aie-directory-content">
          <div class="aie-directory">
            <h5>目录</h5>
            <div ref="outlineRef">
            </div>
          </div>
        </div>
        <div class="aie-container-panel">
          <div class="aie-container-main"></div>
        </div>
      </div>
      <div class="aie-container-footer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AiEditor, type AiEditorOptions } from 'aieditor'
import 'aieditor/dist/style.css'
import { useAppStore } from '@/stores'

defineOptions({ name: 'AiEditor' })

const props = defineProps<{
  modelValue: string
  options?: AiEditorOptions
  readonly?: boolean
  defaultFormat?: 'markdown' | 'html'
}>()
const emit = defineEmits<(e: 'update:modelValue', value: string) => void>()
const appStore = useAppStore()
const divRef = ref<any>()
const aieditor = ref<AiEditor | null>(null)
const outlineRef = ref<HTMLDivElement | null>(null)

const updateOutLine = (editor: AiEditor) => {
  const outlineContainer = outlineRef.value
  if (!outlineContainer) return

  while (outlineContainer.firstChild) {
    outlineContainer.removeChild(outlineContainer.firstChild)
  }
  const outlines = editor.getOutline()
  for (const outline of outlines) {
    const child = document.createElement('div')
    child.classList.add(`aie-title${outline.level}`)
    child.style.marginLeft = `${14 * (outline.level - 1)}px`
    child.style.padding = `4px 0`
    child.style.textIndent = '2rem'
    child.innerHTML = `<a href="#${outline.id}">${outline.text}</a>`
    child.addEventListener('click', (e) => {
      e.preventDefault()
      const el = editor.innerEditor.view.dom.querySelector(`#${outline.id}`) as HTMLElement
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      setTimeout(() => {
        editor.focusPos(outline.pos + outline.size - 1)
      }, 1000)
    })
    outlineContainer.appendChild(child)
  }
}

const editorConfig = reactive<AiEditorOptions>({
  element: '',
  theme: appStore.theme,
  placeholder: '请输入内容',
  content: '',
  draggable: false,
  onChange: (editor: AiEditor) => {
    const content = editor.getHtml()
    emit('update:modelValue', content)
    updateOutLine(editor)
  },
  onCreated: (editor: AiEditor) => {
    updateOutLine(editor)
  },
})

watch(() => props.modelValue, (value) => {
  // console.log('props modelValue', value)
  if (value !== aieditor.value?.getHtml()) {
    aieditor.value?.destroy()
    editorConfig.content = value
    aieditor.value = new AiEditor(editorConfig)
  }
})

// 监听默认格式变化（已不使用）
watch(() => props.defaultFormat, () => {})

watch(() => props.readonly, (readonly) => {
  if (aieditor.value) {
    aieditor.value.setEditable?.(!readonly)
  }
})

const init = () => {
  editorConfig.element = divRef.value
  editorConfig.content = props.modelValue
  editorConfig.editable = props.readonly
  aieditor.value = new AiEditor(editorConfig)
}

// 挂载阶段
onMounted(() => {
  init()
})

// 销毁阶段
onUnmounted(() => {
  aieditor.value?.destroy()
})

// 暴露方法供父组件调用（当前无）
defineExpose({
})
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss">
.container {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
}

.aie-header-panel {
    position: sticky;
    z-index: 1;
    background-color: var(--color-bg-1);
    border-bottom: 1px solid var(--color-border-1);
    padding: 8px 16px;
}

.format-toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;
}

.aie-header-panel aie-header>div {
    align-items: center;
    justify-content: center;
    padding: 10px 0;
}

// .aie-container {
//     border: none !important;
// }

.aie-container-panel {
    // width: calc(100% - 2rem - 2px);
    // max-width: 826.77px;
    width: 70%;
    max-height: 360px;
    margin-left: auto;
    margin-right: 10px;
    border: 1px solid var(--color-border-1);
    background-color: var(--color-bg-1);
    height: 100%;
    padding: 1rem;
    z-index: 99;
    overflow: auto;
    box-sizing: border-box;
    color: var(--color-text-1);
}

.aie-main {
    position: relative;
    overflow: hidden;
    flex: 1;
    box-sizing: border-box;
    padding: 1rem 0px;
    background-color: var(--color-bg-2);
}

.aie-directory {
    position: absolute;
    top: 30px;
    left: 10px;
    width: 260px;
    z-index: 0;
}

.aie-directory h5 {
    font-size: 16px;
    text-indent: 4px;
    line-height: 32px;
    color: var(--color-text-1);
}

.aie-directory a {
    height: 30px;
    font-size: 14px;
    color: var(--color-text-2);
    text-indent: 4px;
    line-height: 30px;
    text-decoration: none;
    width: 100%;
    display: inline-block;
    margin: 0;
    padding: 0;
    white-space: nowrap;
    overflow: hidden;
    -o-text-overflow: ellipsis;
    text-overflow: ellipsis;
}

.aie-directory a:hover {
    cursor: pointer;
    background-color: var(--color-fill-2);
    border-radius: 4px;
}

.aie-title1 {
    font-size: 14px;
    font-weight: 500;
}

#outline {
    text-indent: 2rem;
}

.aie-directory-content {
    position: sticky;
    top: 0px
}

@media screen and (max-width: 1280px) {
    .aie-directory {
        display: none;
    }
}

@media screen and (max-width: 1400px) {
    .aie-directory {
        width: 200px;
    }
}

:deep(.gi-page-layout) {
  display: flex;
    flex-wrap: nowrap !important;
}

:deep(.gi-page-layout__body) {
    padding: 10px 0px 10px 0px !important;
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column !important;
    overflow: hidden;
    box-sizing: border-box;
    justify-content: space-between;
    align-items: flex-end;
}
</style>
