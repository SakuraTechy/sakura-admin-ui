<template>
  <div class="cate-tree">
    <!-- 分类树 -->
    <div class="cate-tree__tree">
      <a-scrollbar style="height: 100%; overflow: auto" outer-style="height: 100%">
        <a-tree
          ref="treeRef"
          size="mini"
          draggable
          block-node
          show-line
          :data="dataList"
          :field-names="{ key: 'id', title: 'name' }"
          :selected-keys="selectedKeys"
          @select="onSelect"
          @drop="onDrop"
        >
          <template #title="node">
            <a-trigger
              v-model:popup-visible="node.popupVisible" trigger="contextMenu" align-point
              animation-name="slide-dynamic-origin" auto-fit-transform-origin position="bl" scroll-to-close
            >
              <div
                v-if="!node.isEdit"
                style="width: 100%;"
                @contextmenu="onContextmenu(node)"
                @dblclick="() => onNodeDblClick(node)"
              >
                <a-typography-paragraph :ellipsis="{ rows: 1, showTooltip: true, css: true }">
                  {{ node?.name }}
                </a-typography-paragraph>
              </div>
              <a-input v-else ref="inputRef" v-model="node.name" size="mini" placeholder="请填写" @blur="onBlur"></a-input>
              <template #content>
                <RightMenu :tree-data="dataList" @on-menu-item-click="onMenuItemClick" @on-tree-node-click="onTreeNodeClick" />
              </template>
            </a-trigger>
          </template>
        </a-tree>
        <div v-if="loading" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; z-index: 10;">
          <a-spin />
        </div>
      </a-scrollbar>
    </div>
    <!-- 搜索框 -->
    <div class="cate-tree__search">
      <a-input v-model="inputValue" size="small" allow-clear :maxlength="20" :placeholder="placeholder">
        <template #prefix><icon-search /></template>
      </a-input>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { storeToRefs } from 'pinia'
import { Message, Modal } from '@arco-design/web-vue'
import type { Tree, TreeNodeData } from '@arco-design/web-vue'

import RightMenu from './RightMenu.vue'

import type { ProjectModuleConfigResp } from '@/apis/project/projectModuleConfig'
import type { TreeCateItem } from '@/stores/modules/uiStore'
import { useUiStore } from '@/stores/modules/uiStore'

const emit = defineEmits<{
  (e: 'node-click', keys: any): void
}>()

const placeholder = '请输入关键词'

const uiStore = useUiStore()
const { loading, treeList } = storeToRefs(uiStore)

const treeRef = useTemplateRef<InstanceType<typeof Tree>>('treeRef') // 使用泛型指定类型

const inputValue = ref('')
// 过滤树
const searchData = (name: string) => {
  const loop = (data: ProjectModuleConfigResp[]) => {
    const result = [] as ProjectModuleConfigResp[]
    data.forEach((item: ProjectModuleConfigResp) => {
      if (item.name?.toLowerCase().includes(name.toLowerCase())) {
        result.push({ ...item })
      } else if (item.children) {
        const filterData = loop(item.children)
        if (filterData.length) {
          result.push({
            ...item,
            children: filterData,
          })
        }
      }
    })
    return result
  }
  return loop(treeList.value)
}

const dataList = computed(() => {
  if (!inputValue.value) return treeList.value
  return searchData(inputValue.value)
})

// 选中节点
const selectedKeys = ref()
const onSelect = (keys: Array<any>) => {
  if (selectedKeys.value && selectedKeys.value[0] === keys[0]) {
    return
  }
  selectedKeys.value = keys
  uiStore.moduleId = keys[0]
  // emit('node-click', keys)
}

watch(() => treeList.value, () => {
  nextTick(() => {
    treeRef.value?.expandAll()
    selectedKeys.value = []
  })
})

watch(() => uiStore.versionId, async () => {
  // console.log(uiStore.versionId)
  // await uiStore.fetchTrees()
})

watch(() => uiStore.moduleId, () => {
  selectedKeys.value = [uiStore.moduleId]
})

// 拖动节点
const onDrop = (dragNode: TreeCateItem, dropNode: TreeCateItem, dropPosition: number) => {
  console.log(dragNode, dropNode, dropPosition)
  // emit('node-drop', node)
}

const inputRef = useTemplateRef<InstanceType<typeof Tree>>('inputRef')
// 保存当前右键的节点
const contextmenuNode = ref<TreeCateItem | null>(null)
const onContextmenu = (node: TreeCateItem) => {
  if (contextmenuNode.value?.isEdit !== undefined) {
    contextmenuNode.value.isEdit = false
  }
  contextmenuNode.value = node
}

// 关闭右键菜单弹框
const closeRightMenuPopup = () => {
  if (contextmenuNode.value?.popupVisible) {
    contextmenuNode.value.popupVisible = false
  }
}

// 右键菜单项点击
const onMenuItemClick = (mode: string) => {
  if (mode === 'add') {
    Message.info(`${mode}-${contextmenuNode.value?.name ?? ''}`)
  }
  if (mode === 'edit') {
    if (contextmenuNode.value?.isEdit !== undefined) {
      contextmenuNode.value.isEdit = true
      nextTick(() => {
        inputRef.value?.focus()
      })
      closeRightMenuPopup()
    }
  }
  if (mode === 'move') {
    // Message.info(`${mode}-${contextmenuNode.value?.name ?? ''}`)
    // closeRightMenuPopup()
  }
  if (mode === 'delete') {
    Modal.warning({
      title: '提示',
      content: `是否确认删除「${contextmenuNode.value?.name}」？`,
      hideCancel: false,
      okButtonProps: { status: 'danger' },
      onBeforeOk: () => {
        return new Promise((resolve) => setTimeout(() => resolve(true), 300))
      },
    })
  }
}

// 节点双击操作
const onNodeDblClick = (node: TreeCateItem) => {
  if (contextmenuNode.value?.isEdit !== undefined) {
    contextmenuNode.value.isEdit = false // 关闭之前打开的编辑框
  }
  node.isEdit = true // 开启当前节点的编辑状态
  contextmenuNode.value = node // 设置当前右键上下文节点
  nextTick(() => {
    inputRef.value?.focus() // 自动聚焦到输入框
  })
}
// 移动树节点点击
const onTreeNodeClick = (data: ProjectModuleConfigResp) => {
  Message.info(data.name)
  closeRightMenuPopup()
}

// 输入框脱焦
const onBlur = () => {
  if (contextmenuNode.value?.isEdit) {
    contextmenuNode.value.isEdit = false
  }
  uiStore.fetchTrees()
}
</script>

<script lang="tsx">
export default {}
</script>

<style lang="scss" scoped>
:deep(.arco-tree-node-title-text) {
  white-space: nowrap;
}

.cate-tree {
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
  right: 0;
}
:deep(.arco-tree-node-title) {
  display: flex;
  width: 100%;
}
</style>
