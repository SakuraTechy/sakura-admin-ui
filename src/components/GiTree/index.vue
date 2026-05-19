<template>
  <div class="gi-tree">
    <div v-if="searchable" class="gi-tree__search">
      <a-input v-model="inputValue" size="small" allow-clear :maxlength="20" :placeholder="placeholder">
        <template #prefix><icon-search /></template>
      </a-input>
    </div>
    <div class="gi-tree__tree">
      <a-scrollbar style="height: 100%; overflow: auto" outer-style="height: 100%">
        <a-tree
          ref="treeRef"
          v-model:selected-keys="selectedKeys"
          v-model:checked-keys="selectedKeys"
          :size="size"
          :draggable="draggable"
          :block-node="blockNode"
          :show-line="showLine"
          :data="filteredData"
          :field-names="fieldNames"
          :multiple="multiple"
          :checkable="multiple"
          :check-strictly="checkStrictly"
          @select="onSelect"
          @drop="onDrop"
        >
          <template #title="node">
            <a-trigger
              :popup-visible="node === contextmenuNode && node.popupVisible"
              trigger="contextMenu"
              align-point
              animation-name="slide-dynamic-origin"
              auto-fit-transform-origin
              position="bl"
              scroll-to-close
            >
              <div
                v-if="!node.isEdit"
                style="width: 100%; margin-right: 10px;"
                @contextmenu="onContextmenu(node)"
                @dblclick="() => onNodeDblClick(node)"
              >
                <a-typography-paragraph :ellipsis="{ rows: 1, showTooltip: true, css: true }">
                  {{ node?.[fieldNames.title] }}
                </a-typography-paragraph>
              </div>
              <a-input
                v-else
                ref="inputNodeRef"
                v-model="node[fieldNames.title]"
                size="mini"
                placeholder="请填写"
                @input="onInput"
                @change="onChange"
                @press-enter="onEnter"
                @keydown="handleKeyDown"
                @blur="onBlur"
              />
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { debounce } from 'lodash-es'
import GiMenu from '@/components/GiMenu/index.vue'
import GiLoading from '@/components/GiLoading/index.vue'

const props = defineProps({
  title: { type: String, default: '树形结构' },
  treeData: { type: Array, required: true },
  selectedKeys: { type: Array, default: () => [] },
  multiple: { type: Boolean, default: false },
  checkStrictly: { type: Boolean, default: false },
  checkedKeys: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  placeholder: { type: String, default: '请输入关键词' },
  fieldNames: {
    type: Object,
    default: () => ({ key: 'id', title: 'name', children: 'children' }),
  },
  size: { type: String, default: 'mini' },
  draggable: { type: Boolean, default: true },
  blockNode: { type: Boolean, default: true },
  showLine: { type: Boolean, default: true },
  onSave: Function,
  editMethod: { type: String, default: '弹窗编辑' },
})

const emit = defineEmits([
  'update:selectedKeys',
  'node-click',
  'node-drop',
  'menu-click',
  'tree-node-click',
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

    // 检查是否已经有其他监听器
    if ((window as any).__giTreeKeydownListener) {
      // console.warn(`[GlobalKeydownManager] 检测到重复的监听器，跳过注册`)
      return
    }

    // console.warn(`[GlobalKeydownManager] 开始监听全局键盘事件`)
    this.isListening = true
    window.addEventListener('keydown', this.handleGlobalKeydown)

    // 标记已经注册了监听器
    ;(window as any).__giTreeKeydownListener = true
  }

  private stopListening() {
    if (!this.isListening) return
    // console.warn(`[GlobalKeydownManager] 停止监听全局键盘事件`)
    this.isListening = false
    window.removeEventListener('keydown', this.handleGlobalKeydown)
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

const selectedKeys = ref()
const multiple = ref(props.multiple)
const inputValue = ref('')
const treeRef = ref()
const inputNodeRef = ref()
const editCacheValue = ref('')
const contextmenuNode = ref<any>(null)
// const localSelectedKeys = ref(props.selectedKeys)

watch(() => props.treeData, (val) => {
  nextTick(() => {
    treeRef.value?.expandAll()
    // localSelectedKeys.value = []
  })
})

watch(() => props.selectedKeys, (val) => {
  // console.log('props.selectedKeys', val)
  selectedKeys.value = val
})

// watch(() => selectedKeys.value, (val) => {
//   console.log('selectedKeys.value', val)
// })

watch(() => props.multiple, (val) => {
//   console.log('props.multiple', val)
  // multiple.value = val
})

// 过滤节点树
const filteredData = computed(() => {
  // console.log('treeData', props.treeData)
  if (!inputValue.value) return props.treeData
  const loop = (data: any[]) => {
    const result: any[] = []
    data.forEach((item) => {
      if (item[props.fieldNames.title]?.toLowerCase().includes(inputValue.value.toLowerCase())) {
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

// 选中节点
const onSelect = (selectedKeys: any, data: any) => {
  console.log('onSelect', selectedKeys, data)
  if (!multiple.value) emit('node-click', data)
  //   if (localSelectedKeys.value && localSelectedKeys.value[0] === keys[0]) return
  //   localSelectedKeys.value = keys
  //   emit('update:selectedKeys', keys)
}

// 拖动节点
const onDrop = (data: any) => {
  emit('node-drop', data)
}

// 保存当前右键的节点
const onContextmenu = (node: any) => {
  console.log('onContextmenu', node)
  if (contextmenuNode.value?.isEdit !== undefined) {
    contextmenuNode.value.isEdit = false
  }
  contextmenuNode.value = node
  selectedKeys.value = [node.id]
//   if (!multiple.value) emit('node-click', node)
}

// 节点双击操作
const onNodeDblClick = (node: any) => {
  console.log('onNodeDblClick', node)
  if (props.editMethod === '弹窗编辑') {
    emit('menu-click', { mode: 'edit', node })
  } else if (props.editMethod === '原地编辑') {
    if (contextmenuNode.value?.isEdit !== undefined) {
      contextmenuNode.value.isEdit = false
    }
    node.isEdit = true
    contextmenuNode.value = node
    editCacheValue.value = node[props.fieldNames.title]
    nextTick(() => {
      inputNodeRef.value?.focus()
    })
  }
}

const onInput = () => {
  console.log('实时输入:', inputNodeRef.value.modelValue)
}

const onChange = () => {
  console.log('change 事件:', inputNodeRef)
}

const onEnter = (value?: any) => {
  console.log('按下了回车:', value)
  inputNodeRef.value?.blur()
}

// 输入框脱焦
const onBlur = (e: any) => {
  console.log('失去焦点:', e)
  Modal.warning({
    title: '温馨提示',
    content: `是否需要保存「${e.target.value}」？`,
    hideCancel: false,
    okButtonProps: { status: 'danger' },
    onBeforeOk: () => {
      if (props.onSave) {
        return props.onSave({ mode: 'edit', node: contextmenuNode.value })
      }
    },
    onCancel: () => {
      if (contextmenuNode.value?.name) {
        contextmenuNode.value.name = editCacheValue.value
      }
    },
    onClose: () => {
      if (contextmenuNode.value?.isEdit) {
        contextmenuNode.value.isEdit = false
      }
    },
  })
}

// 关闭右键菜单弹框
const closeRightMenu = () => {
  if (contextmenuNode.value?.popupVisible) {
    contextmenuNode.value.popupVisible = false
  }
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
      if (contextmenuNode.value?.isEdit !== undefined) {
        contextmenuNode.value.isEdit = true
        editCacheValue.value = contextmenuNode.value?.name
        nextTick(() => {
          inputNodeRef.value?.focus()
        })
      }
    }
  }
  if (mode === 'copy') {
    emit('menu-click', { mode, node: contextmenuNode.value })
  }
  if (mode === 'move') {
    // Message.info(`${mode}-${contextmenuNode.value?.name ?? ''}`)
    // emit('menu-click', { mode, node: contextmenuNode.value })
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
          return props.onSave({ mode, node: contextmenuNode.value }).then((result: boolean) => {
            //   console.log('Promise 结果:', result) // 这里就是 [[PromiseResult]]
            multiple.value = !result
          })
        }
      },
      onCancel: () => {
        multiple.value = false
        // treeRef.value.selectAll(false)
      },
    })
  }
  if (mode === 'delete2') {
    multiple.value = true
    // treeRef.value.selectAll(false)
    // emit('menu-click', { mode })
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
const handleKeyDown = debounce((e?: any) => {
// function handleKeyDown(e: KeyboardEvent) {
  // console.warn(`[GiTree ${componentId.value}] 响应键盘事件: ${e.key}`)

  if ((e.key === 'Delete' || e.key === 'Del')) {
    // 检查当前组件是否应该响应这个事件
    if (!treeRef.value || !props.onSave) return

    console.log(treeRef.value.getSelectedNodes())

    if (treeRef.value.getSelectedNodes().length > 0) {
      const selected = treeRef.value.getSelectedNodes().map((item: any) => item)
      const selectedIds = treeRef.value.getSelectedNodes().map((item: any) => item.id).join(',')
      const selectedNames = treeRef.value.getSelectedNodes().map((item: any) => item.name).join(',')
      // const selecte = { id: selectedIds, name: selectedNames, node: selected }
      Modal.warning({
        title: '温馨提示',
        content: `是否确认删除「${selectedNames}」？`,
        hideCancel: false,
        okButtonProps: { status: 'danger' },
        onBeforeOk: () => {
          if (props.onSave) {
            return props.onSave({ mode: 'delete', node: selected }).then((result: boolean) => {
              //   console.log('Promise 结果:', result) // 这里就是 [[PromiseResult]]
              multiple.value = !result
            })
          }
        },
        onCancel: () => {
          multiple.value = false
          // if (treeRef.value.getSelectedNodes().length > 1) {
          //   treeRef.value.selectAll(false)
          // }
          emit('node-click', treeRef.value.getSelectedNodes()[0])
        },
      })
    } else {
      Message.warning(`请选择左侧要删除的${props.title}`)
    }
  }
  if (e.key === 'Escape' || e.key === 'Esc') {
    // console.log('用户按下了 Esc 键')
    if (inputNodeRef.value) {
      inputNodeRef.value.blur()
    }
    multiple.value = false
    // if (treeRef.value.getSelectedNodes().length > 1) {
    //   treeRef.value.selectAll(false)
    // }
    emit('node-click', treeRef.value.getSelectedNodes()[0])
    // if (treeRef.value) {
    //   treeRef.value.selectAll(false)
    // }
  }
}, 100)

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

  // 延迟一下，确保组件完全挂载后再设置激活状态
  nextTick(() => {
    // 如果是子页面组件（弹窗编辑），自动设置为激活状态
    if (props.editMethod === '弹窗编辑') {
      // console.warn(`[GiTree ${componentId.value}] 子页面组件自动设置激活状态`)
      setActive()
    }
  })
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
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    &__search {
      margin-bottom: 10px;
    }

    &__tree {
      flex: 1;
      overflow: hidden;
      background-color: var(--color-bg-1);
      position: relative;
    }
  }
  :deep(.arco-tree-node-title-text) {
    white-space: nowrap;
    display: flex;
  }
  :deep(.arco-tree-node-selected) {
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
