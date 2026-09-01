<template>
  <div ref="treeContainerRef" class="gi-tree" tabindex="-1" @pointerdown="onTreePointerDown" @focusin="onFocusIn" @focusout="onFocusOut">
    <div v-if="searchable" class="gi-tree__search">
      <a-input v-model="inputValue" size="small" allow-clear :maxlength="20" :placeholder="placeholder">
        <template #prefix><icon-search /></template>
      </a-input>
    </div>
    <div ref="treeViewportRef" class="gi-tree__tree">
      <a-scrollbar
        :style="{ height: '100%', overflow: virtualListEnabled ? 'hidden' : 'auto' }"
        outer-style="height: 100%; overflow: hidden"
      >
        <a-tree
          ref="treeRef"
          :class="{ 'gi-tree__virtual': virtualListEnabled }"
          v-model:selected-keys="selectedKeys"
          v-model:checked-keys="checkedKeys"
          :size="size"
          :draggable="draggable && !disabled && !loading"
          :allow-drop="allowNodeDropProxy"
          :disabled="disabled || loading"
          :block-node="blockNode"
          :show-line="showLine"
          :virtual-list-props="resolvedVirtualListProps"
          :expanded-keys="expandedKeys"
          :data="filteredData"
          :field-names="fieldNames"
          :multiple="multiple"
          :checkable="multiple"
          :check-strictly="checkStrictly"
          @select="onSelect"
          @expand="onExpand"
          @drop="onDrop"
          @drag-start="onDragStart"
          @drag-end="onDragEnd"
          @check="onCheck"
        >
          <template #title="node">
            <a-trigger
              :popup-visible="isContextmenuVisible(node)"
              @popup-visible-change="visible => onPopupVisibleChange(node, visible)"
              trigger="contextMenu"
              align-point
              animation-name="slide-dynamic-origin"
              auto-fit-transform-origin
              position="bl"
              scroll-to-close
            >
              <div
                v-if="!isNodeEditing(node)"
                class="gi-tree__node-title"
                @contextmenu.prevent="onContextmenu(node)"
                @dblclick="() => onNodeDblClick(node)"
              >
                <!-- 原生 title 替代 a-typography-paragraph：后者会为每个节点创建
                     ResizeObserver 和 Tooltip 实例，千级节点下是主要挂载开销。 -->
                <span class="gi-tree__node-text" :title="String(node?.[fieldNames.title] ?? '')">
                  {{ node?.[fieldNames.title] }}
                </span>
              </div>
              <!-- 编辑态改用组件级 editingDraft：节点对象不再承载 isEdit，
                   树数据得以保持 shallow，避免千节点深度代理。 -->
              <a-input
                v-else
                ref="inputNodeRef"
                v-model="editingDraft"
                size="mini"
                placeholder="请填写"
                @input="onInput"
                @change="onChange"
                @press-enter="onEnter"
                @keydown="handleKeyDown"
                @blur="onBlur"
              />
              <template #content>
                <template v-if="isContextmenuVisible(node)">
                  <slot name="right-menu" :node="node" :tree-data="filteredData" :on-menu-item-click="onMenuItemClick" :on-tree-node-click="onTreeNodeClick">
                    <GiMenu
                      :tree-data="filteredData"
                      @on-menu-item-click="(mode) => onMenuItemClick(mode, node)"
                      @on-tree-node-click="onTreeNodeClick"
                    />
                  </slot>
                </template>
              </template>
            </a-trigger>
          </template>
          <!-- 为拖拽图标添加右键菜单支持 -->
          <template #drag-icon="node">
            <a-trigger
              trigger="hover"
              align-point
              animation-name="slide-dynamic-origin"
              auto-fit-transform-origin
              position="bl"
              scroll-to-close
            >
              <icon-edit @contextmenu="onContextmenu(node)" />
              <template #content>
                <slot name="right-menu" :node="node" :tree-data="filteredData" :on-menu-item-click="onMenuItemClick" :on-tree-node-click="onTreeNodeClick">
                  <GiMenu
                    :tree-data="filteredData"
                    @on-menu-item-click="(mode) => onMenuItemClick(mode, node)"
                    @on-tree-node-click="onTreeNodeClick"
                  />
                </slot>
              </template>
            </a-trigger>
          </template>
        </a-tree>
        <GiLoading :loading="loading" tip="加载中..." />
      </a-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useElementSize } from '@vueuse/core'
import GiMenu from '@/components/GiMenu/index.vue'
import GiLoading from '@/components/GiLoading/index.vue'

const props = defineProps({
  title: { type: String, default: '树形结构' },
  treeData: { type: Array, required: true },
  selectedKeys: { type: Array, default: () => [] },
  multiple: { type: Boolean, default: false },
  allowDeselect: { type: Boolean, default: false },
  checkStrictly: { type: Boolean, default: false },
  checkedKeys: { type: Array, default: () => [] },
  expandedKeys: { type: Array, default: undefined },
  defaultExpandAll: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  placeholder: { type: String, default: '请输入关键词' },
  fieldNames: {
    type: Object,
    default: () => ({ key: 'id', title: 'name', children: 'children' }),
  },
  size: { type: String, default: 'mini' },
  draggable: { type: Boolean, default: true },
  allowNodeDrop: { type: Function, default: undefined },
  disabled: { type: Boolean, default: false },
  blockNode: { type: Boolean, default: true },
  showLine: { type: Boolean, default: true },
  virtualListProps: { type: Object, default: undefined },
  /** 可见节点数超过该阈值时自动启用虚拟滚动；传 0 可关闭自动虚拟化。 */
  virtualThreshold: { type: Number, default: 100 },
  onSave: Function,
  editMethod: { type: String, default: '弹窗编辑' },
})

const emit = defineEmits([
  'update:selectedKeys',
  'update:checkedKeys',
  'update:expandedKeys',
  'node-click',
  'node-drop',
  'menu-click',
  'tree-node-click',
  'drag-start',
  'drag-end',
  'focusin',
  'focusout',
  'batch-delete-cancel',
])

// 全局事件管理器
class GlobalKeydownManager {
  private listeners: Map<string, { listener: (e: KeyboardEvent) => void, isActive: boolean }> = new Map()
  private isListening = false
  private currentActiveId: string | null = null

  private constructor() {
    // 私有构造函数，确保单例
  }

  static getInstance(): GlobalKeydownManager {
    // 使用全局变量确保真正的单例
    if (!(window as any).__globalKeydownManagerInstance) {
      (window as any).__globalKeydownManagerInstance = new GlobalKeydownManager()
      // console.warn(`[GlobalKeydownManager] 创建新实例: ${(window as any).__globalKeydownManagerInstance}`)
    } else {
      // console.warn(`[GlobalKeydownManager] 返回现有实例: ${(window as any).__globalKeydownManagerInstance}`)
    }
    return (window as any).__globalKeydownManagerInstance
  }

  addListener(id: string, listener: (e: KeyboardEvent) => void) {
    // console.warn(`[GlobalKeydownManager] 添加监听器: ${id}`)
    this.listeners.set(id, { listener, isActive: false })
    if (!this.isListening) {
      this.startListening()
    }
    // 如果是第一个监听器，自动设置为激活状态
    if (this.listeners.size === 1) {
      this.setActive(id)
    }
  }

  removeListener(id: string) {
    // console.warn(`[GlobalKeydownManager] 移除监听器: ${id}`)
    this.listeners.delete(id)
    if (this.listeners.size === 0) {
      this.stopListening()
      this.currentActiveId = null
    } else if (this.currentActiveId === id) {
      // 如果当前激活的监听器被移除，自动激活第一个可用的监听器
      const firstListener = Array.from(this.listeners.keys())[0]
      if (firstListener) {
        this.setActive(firstListener)
      }
    }
  }

  setActive(id: string) {
    if (!this.listeners.has(id)) return

    // console.warn(`[GlobalKeydownManager] 设置激活组件: ${id}`)
    // console.warn(`[GlobalKeydownManager] 调用栈:`, new Error('Stack trace').stack?.split('\n').slice(1, 4).join('\n'))

    // 先清除所有组件的激活状态
    this.listeners.forEach((item) => {
      item.isActive = false
    })

    // 设置当前组件为激活状态
    this.currentActiveId = id
    const currentItem = this.listeners.get(id)
    if (currentItem) {
      currentItem.isActive = true
    }

    // 打印当前状态
    // console.warn(`[GlobalKeydownManager] 当前状态:`, this.getListenersStatus())
  }

  // 获取当前激活的监听器ID
  getCurrentActiveId(): string | null {
    return this.currentActiveId
  }

  // 获取所有监听器状态（用于调试）
  getListenersStatus() {
    return Array.from(this.listeners.entries()).map(([id, item]) => ({
      id,
      isActive: item.isActive,
    }))
  }

  private startListening() {
    if (this.isListening) return

    // HMR 或上一个树实例卸载后可能遗留标记；只认当前实例的监听函数，避免后续实例无法重新监听。
    const oldListener = (window as any).__giTreeKeydownListener
    if (typeof oldListener === 'function' && oldListener !== this.handleGlobalKeydown) {
      window.removeEventListener('keydown', oldListener)
    } else if (oldListener) {
      // 兼容旧版本遗留的布尔标记，不能将其传给 removeEventListener。
      delete (window as any).__giTreeKeydownListener
    }

    this.isListening = true
    window.addEventListener('keydown', this.handleGlobalKeydown)

    // 保存实际函数引用，卸载和下一次挂载时才能安全移除。
    ;(window as any).__giTreeKeydownListener = this.handleGlobalKeydown
  }

  private stopListening() {
    if (!this.isListening) return
    this.isListening = false
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    if ((window as any).__giTreeKeydownListener === this.handleGlobalKeydown) {
      delete (window as any).__giTreeKeydownListener
    }
  }

  private handleGlobalKeydown = (e: KeyboardEvent) => {
    // 打印当前所有监听器状态
    // console.warn(`[GlobalKeydownManager] 键盘事件触发，所有监听器状态:`, this.getListenersStatus())
    // console.warn(`[GlobalKeydownManager] 当前激活ID: ${this.currentActiveId}`)
    // console.warn(`[GlobalKeydownManager] 实例ID: ${this}`)

    // 只调用当前激活的监听器
    if (this.currentActiveId) {
      const activeListener = this.listeners.get(this.currentActiveId)
      if (activeListener && activeListener.isActive) {
        try {
          // console.warn(`[GlobalKeydownManager] 触发键盘事件，当前激活组件: ${this.currentActiveId}`)
          activeListener.listener(e)
        } catch (error) {
          console.error('Error in keydown listener:', error)
        }
      } else {
        // console.warn(`[GlobalKeydownManager] 激活组件不存在或未激活:`, {
        //   currentActiveId: this.currentActiveId,
        //   activeListener,
        //   isActive: activeListener?.isActive,
        // })
      }
    } else {
      // console.warn(`[GlobalKeydownManager] 没有激活的组件`)
    }
  }
}

const selectedKeys = ref<any[]>(props.selectedKeys as any[])
const checkedKeys = ref<any[]>(props.checkedKeys as any[])
const expandedKeys = ref<any[]>(props.expandedKeys as any[] || [])
let defaultExpansionInitialized = false
const hasFocusWithin = ref(false)
const multiple = computed(() => props.multiple)
const currentDragNode = ref<any>(null)
const inputValue = ref('')
const filterKeyword = ref('')
let filterTimer: number | undefined
const treeContainerRef = ref<HTMLElement>()
const treeViewportRef = ref<HTMLElement>()
const { height: treeViewportHeight } = useElementSize(treeViewportRef)
const treeRef = ref()
const inputNodeRef = ref()
// shallowRef：节点对象只做引用持有，不需要 Vue 深度代理其 children。
const contextmenuNode = shallowRef<any>(null)
const contextmenuNodeKey = ref('')
// 编辑态与草稿值提到组件级，按 key 判定，节点对象保持纯净。
const editingNodeKey = ref('')
const editingDraft = ref('')
// const localSelectedKeys = ref(props.selectedKeys)

const collectExpandableKeys = (nodes: any[]): any[] => nodes.flatMap((node) => {
  const children = node?.[props.fieldNames.children]
  if (!Array.isArray(children) || !children.length) return []
  return [node[props.fieldNames.key], ...collectExpandableKeys(children)]
})

watch(() => props.treeData, (data) => {
  if (!props.defaultExpandAll || props.expandedKeys || defaultExpansionInitialized || !Array.isArray(data) || !data.length) return
  defaultExpansionInitialized = true
  expandedKeys.value = collectExpandableKeys(data)
  emit('update:expandedKeys', expandedKeys.value)
}, { immediate: true })

watch(() => props.selectedKeys, (val) => {
  // console.log('props.selectedKeys', val)
  selectedKeys.value = val
})

watch(() => props.checkedKeys, (val) => {
  checkedKeys.value = Array.isArray(val) ? val : []
})

watch(() => props.expandedKeys, (val) => {
  if (Array.isArray(val)) expandedKeys.value = val
})

watch(inputValue, (value) => {
  if (filterTimer) window.clearTimeout(filterTimer)
  filterTimer = window.setTimeout(() => {
    filterKeyword.value = value.trim().toLowerCase()
  }, 150)
})

onBeforeUnmount(() => {
  if (filterTimer) window.clearTimeout(filterTimer)
})

// watch(() => selectedKeys.value, (val) => {
//   console.log('selectedKeys.value', val)
// })

// 过滤节点树
const filteredData = computed(() => {
  // console.log('treeData', props.treeData)
  if (!filterKeyword.value) return props.treeData
  const loop = (data: any[]) => {
    const result: any[] = []
    data.forEach((item) => {
      if (item[props.fieldNames.title]?.toLowerCase().includes(filterKeyword.value)) {
        result.push({ ...item })
      } else if (item[props.fieldNames.children]) {
        const filterData = loop(item[props.fieldNames.children])
        if (filterData.length) {
          result.push({
            ...item,
            [props.fieldNames.children]: filterData,
          })
        }
      }
    })
    return result
  }
  return loop(props.treeData)
})

const treeNodeCount = computed(() => {
  const count = (nodes: any[]): number => nodes.reduce((total, node) => {
    const children = node?.[props.fieldNames.children]
    return total + 1 + (Array.isArray(children) ? count(children) : 0)
  }, 0)
  return count(filteredData.value as any[])
})

// 展开后的可见行数决定是否值得虚拟化：折叠状态下的子节点不进 DOM，无需计入。
const visibleNodeCount = computed(() => {
  const expanded = new Set((expandedKeys.value || []).map(String))
  const count = (nodes: any[]): number => nodes.reduce((total, node) => {
    const children = node?.[props.fieldNames.children]
    const hasChildren = Array.isArray(children) && children.length > 0
    const childCount = hasChildren && expanded.has(String(node?.[props.fieldNames.key]))
      ? count(children)
      : 0
    return total + 1 + childCount
  }, 0)
  return count(filteredData.value as any[])
})

const virtualListEnabled = computed(() => {
  // 显式传入 virtualListProps 时沿用调用方语义，仍按其 threshold 判断。
  if (props.virtualListProps) {
    const threshold = Number(props.virtualListProps.threshold ?? 0)
    return treeNodeCount.value > threshold
  }
  // 自动模式需要确定高度：视口未测量出来时不能虚拟化，否则容器高度为 0。
  if (!props.virtualThreshold || treeViewportHeight.value <= 0) return false
  return visibleNodeCount.value > props.virtualThreshold
})

const resolvedVirtualListProps = computed(() => {
  if (!virtualListEnabled.value) return undefined
  return {
    height: treeViewportHeight.value,
    // 行高不固定（编辑态是 input），交给 VirtualList 实测，estimatedSize 只作首屏估算。
    estimatedSize: 26,
    buffer: 15,
    ...props.virtualListProps,
  }
})

// 选中节点
const clearSelection = () => {
  selectedKeys.value = []
  emit('update:selectedKeys', [])
  emit('node-click', { selected: false, node: null, selectedKeys: [] })
}

const onSelect = (keys: any[], data: any) => {
  setActive()
  const node = data?.node || data
  const nodeKey = node?.[props.fieldNames.key]
  const selectedBeforeClick = props.selectedKeys?.map(String).includes(String(nodeKey))
  if (!multiple.value && props.allowDeselect && selectedBeforeClick) {
    clearSelection()
    return
  }
  selectedKeys.value = keys
  emit('update:selectedKeys', keys)
  if (!multiple.value) emit('node-click', { ...data, selected: true })
}

const onExpand = (keys: any[]) => {
  expandedKeys.value = keys
  emit('update:expandedKeys', keys)
}

// 拖动节点
const onDrop = (data: any) => {
  emit('node-drop', data)
}

const onCheck = (keys: any[]) => {
  checkedKeys.value = keys
  emit('update:checkedKeys', keys)
}

const onFocusIn = (event: FocusEvent) => {
  hasFocusWithin.value = true
  setActive()
  emit('focusin', event)
}

const onFocusOut = (event: FocusEvent) => {
  hasFocusWithin.value = false
  emit('focusout', event)
}

const onTreePointerDown = (event: PointerEvent) => {
  setActive()
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable="true"]')) return
  treeContainerRef.value?.focus({ preventScroll: true })
}

const onDragStart = (event: DragEvent, node: any) => {
  currentDragNode.value = node
  emit('drag-start', { event, dragNode: node })
}

const onDragEnd = (event: DragEvent, node: any) => {
  currentDragNode.value = null
  emit('drag-end', { event, dragNode: node })
}

const allowNodeDropProxy = (options: { dropNode: any, dropPosition: number }) => {
  if (!currentDragNode.value || !props.allowNodeDrop) return false
  return props.allowNodeDrop(currentDragNode.value, options.dropNode, options.dropPosition)
}

// 保存当前右键的节点
const nodeKeyOf = (node: any) => String(node?.[props.fieldNames.key] ?? '')
const isContextmenuVisible = (node: any) => {
  const nodeKey = nodeKeyOf(node)
  return Boolean(nodeKey) && nodeKey === contextmenuNodeKey.value
}
const isNodeEditing = (node: any) => {
  const nodeKey = nodeKeyOf(node)
  return Boolean(nodeKey) && nodeKey === editingNodeKey.value
}

const startEditing = (node: any) => {
  editingNodeKey.value = nodeKeyOf(node)
  editingDraft.value = String(node?.[props.fieldNames.title] ?? '')
  nextTick(() => {
    inputNodeRef.value?.focus()
  })
}

/** 退出编辑态。commit 时把草稿写回节点，保持原地编辑的本地回显行为。 */
const stopEditing = (commit = false) => {
  const node = contextmenuNode.value
  if (commit && node && editingNodeKey.value === nodeKeyOf(node)) {
    node[props.fieldNames.title] = editingDraft.value
  }
  editingNodeKey.value = ''
  editingDraft.value = ''
}

const onContextmenu = (node: any) => {
  setActive()
  // popupVisible 曾写在节点上，但模板读的是 contextmenuNodeKey，属于无效写入，已移除。
  stopEditing()
  contextmenuNode.value = node
  contextmenuNodeKey.value = nodeKeyOf(node)
  selectedKeys.value = [node[props.fieldNames.key]]
//   if (!multiple.value) emit('node-click', node)
}

const onPopupVisibleChange = (node: any, visible: boolean) => {
  if (visible) {
    contextmenuNode.value = node
    contextmenuNodeKey.value = nodeKeyOf(node)
  } else if (isContextmenuVisible(node)) {
    contextmenuNodeKey.value = ''
  }
}

// 节点双击操作
const onNodeDblClick = (node: any) => {
  if (props.editMethod === '弹窗编辑') {
    emit('menu-click', { mode: 'edit', node })
  } else if (props.editMethod === '原地编辑') {
    stopEditing()
    contextmenuNode.value = node
    startEditing(node)
  }
}

const onInput = () => undefined

const onChange = () => undefined

const onEnter = () => {
  inputNodeRef.value?.blur()
}

// 输入框脱焦
const onBlur = (e: any) => {
  // 草稿在 stopEditing 里写回节点；这里先取值，避免 Modal 回调期间被清空。
  const draft = editingDraft.value
  Modal.warning({
    title: '温馨提示',
    content: `是否需要保存「${e.target.value}」？`,
    hideCancel: false,
    okButtonProps: { status: 'danger' },
    onBeforeOk: () => {
      editingDraft.value = draft
      stopEditing(true)
      if (props.onSave) {
        return props.onSave({ mode: 'edit', node: contextmenuNode.value })
      }
    },
    // 取消时草稿直接丢弃，节点标题从未被改写，无需回滚。
    onCancel: () => stopEditing(),
    onClose: () => stopEditing(),
  })
}

// 关闭右键菜单弹框
const closeRightMenu = () => {
  contextmenuNodeKey.value = ''
}

/** 退出批量删除时只清空勾选，不篡改当前详情节点选中状态。 */
const cancelBatchDeleteSelection = () => {
  checkedKeys.value = []
  emit('update:checkedKeys', [])
  emit('batch-delete-cancel')
}

// 右键菜单项点击
const onMenuItemClick = (mode?: any, node?: any) => {
  // console.log('mode', mode, 'node', node)
  contextmenuNode.value = node.node || node
  if (mode === 'add') {
    // emit('node-add', contextmenuNode.value)
    emit('menu-click', { mode, node: contextmenuNode.value })
  }
  if (mode === 'edit') {
    if (props.editMethod === '弹窗编辑') {
      // emit('node-edit', contextmenuNode.value)
      emit('menu-click', { mode, node: contextmenuNode.value })
    } else if (props.editMethod === '原地编辑') {
      // 原先靠 node.isEdit !== undefined 判断节点是否被装饰过；
      // 编辑态改为按 key 记录后，任何节点都能直接进入编辑。
      if (contextmenuNode.value) startEditing(contextmenuNode.value)
    }
  }
  if (mode === 'copy') {
    emit('menu-click', { mode, node: contextmenuNode.value })
  }
  if (mode === 'move') {
    emit('menu-click', { mode, node: contextmenuNode.value })
  }
  if (mode === 'delete') {
    Modal.warning({
      title: '温馨提示',
      content: `是否确认删除「${contextmenuNode.value?.name}」？`,
      hideCancel: false,
      okButtonProps: { status: 'danger' },
      onBeforeOk: () => {
        // new Promise((resolve) => setTimeout(() => resolve(true), 300))
        if (props.onSave) {
          return props.onSave({ mode, node: contextmenuNode.value })
        }
      },
      onCancel: () => {
        // treeRef.value.selectAll(false)
      },
    })
  }
  if (mode === 'delete2') {
    emit('menu-click', { mode, node: contextmenuNode.value })
  }
  if (typeof mode === 'string' && (mode.startsWith('recording:') || mode.startsWith('execute:'))) {
    emit('menu-click', { mode, node: contextmenuNode.value })
  }
  if (mode !== 'move') {
    closeRightMenu()
  }
}

// 移动树节点点击
const onTreeNodeClick = (data: any) => {
  // console.log('contextmenuNode.value', contextmenuNode.value)
  // console.log('data', data)
  const node = {
    dragNode: contextmenuNode.value,
    dropNode: data,
    dropPosition: 0,
  }
  emit('tree-node-click', node)
  // closeRightMenu()
}

// 定义 handleKeyDown 函数
const handleKeyDown = (e: KeyboardEvent) => {
  const isDelete = e.key === 'Delete' || e.key === 'Del'
  const isEscape = e.key === 'Escape' || e.key === 'Esc'
  if (!isDelete && !isEscape) return

  // 文本输入框中的 Delete 必须保留输入行为，不能触发树节点删除。
  const target = e.target as HTMLElement | null
  if (isDelete && target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

  if (isEscape && multiple.value) {
    e.preventDefault()
    e.stopPropagation()
    cancelBatchDeleteSelection()
    return
  }

  if (isDelete) {
    e.preventDefault()
    e.stopPropagation()
    // 全局管理器已限定当前激活树；批量模式允许右键菜单关闭后继续响应，单选模式仍要求焦点位于树内。
    if (!treeRef.value || !props.onSave || props.disabled || props.loading || (!multiple.value && !hasFocusWithin.value)) return
    const keyName = props.fieldNames.key
    const deleteKeys = multiple.value ? checkedKeys.value : selectedKeys.value
    const keySet = new Set(deleteKeys.map(String))
    const selectedNodes: any[] = []
    const collectSelectedNodes = (nodes: any[]) => {
      nodes.forEach((node) => {
        if (keySet.has(String(node?.[keyName] ?? ''))) selectedNodes.push(node)
        const children = node?.[props.fieldNames.children]
        if (Array.isArray(children)) collectSelectedNodes(children)
      })
    }
    collectSelectedNodes(props.treeData as any[])
    if (selectedNodes.length === 0) {
      Message.warning(`请选择左侧要删除的${props.title}`)
      return
    }
    const selectedNames = selectedNodes.map((item: any) => item.name).join('、')
    Modal.warning({
      title: '温馨提示',
      content: `是否确认删除「${selectedNames}」？`,
      hideCancel: false,
      okButtonProps: { status: 'danger' },
      onBeforeOk: () => props.onSave?.({ mode: 'delete', node: selectedNodes }),
      onCancel: () => {
        if (multiple.value) cancelBatchDeleteSelection()
      },
    })
    return
  }

  if (isEscape && inputNodeRef.value) {
    inputNodeRef.value.blur()
  }
}

// 生成唯一的组件ID
const componentId = ref(`gi-tree-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

// 设置当前组件为激活状态的方法
const setActive = () => {
  // console.warn(`[GiTree ${componentId.value}] 设置激活状态`)
  GlobalKeydownManager.getInstance().setActive(componentId.value)
}

onMounted(() => {
  // 使用全局事件管理器，传入组件ID
  GlobalKeydownManager.getInstance().addListener(componentId.value, handleKeyDown)

})

onBeforeUnmount(() => {
  // 从全局事件管理器中移除
  GlobalKeydownManager.getInstance().removeListener(componentId.value)
})

// 暴露方法给父组件
defineExpose({
  setActive,
})
</script>

<script lang="ts">
export default {}
</script>

<style lang="scss" scoped>
  .gi-tree {
    flex: 1;
    overflow: hidden;
    outline: none;
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    &__search {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 10px;

      :deep(.arco-input-wrapper) {
        flex: 1;
      }
    }

  &__tree {
      flex: 1;
      overflow: hidden;
      background-color: var(--color-bg-1);
      position: relative;
    }

    &__node-title {
      display: flex;
      align-items: center;
      width: 100%;
      min-width: 0;
      margin-right: 10px;
    }

    &__node-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &__virtual {
      height: 100%;

      :deep(.arco-tree-node-title) {
        height: 24px;
        box-sizing: border-box;
      }
    }
  }
  :deep(.arco-tree-node-title-text) {
    white-space: nowrap;
    display: flex;
    // flex 链上任一环缺少 min-width: 0 都会撑开容器，导致省略号不生效。
    min-width: 0;
    overflow: hidden;
  }
  :deep(.arco-tree-node-selected) {
    .gi-tree__node-text,
    .arco-typography {
      color: rgb(var(--primary-6));
    }
  }
  :deep(.arco-tree-node-drag-icon) {
    margin-left: 120px;
    color: rgb(var(--primary-6));
    opacity: 0;
    right: 0px;
  }
  :deep(.arco-tree-node-title) {
    display: flex;
    width: 100%;
    margin-right: 10px;
  }
  </style>
