<template>
  <div class="tab-content">
    <a-tabs v-model:active-key="uiStore.activeKey" size="large" type="card-gutter" :hide-content="false" justify editable :show-add-button="false" auto-switch @delete="close" @tab-click="">
      <template #extra>
        <a-button class="tab-add-btn" type="primary" @click="addTab()">
          <template #icon><icon-plus /></template>
        </a-button>
      </template>
      <a-tab-pane key="0" :title="tab" :closable="false">
        <template #title>
          <a-tooltip position="top">
            <template #content>
              <span>{{ tab }}</span>
            </template>
            <a-dropdown trigger="contextMenu">
              <span>{{ tab.length > 8 ? `${tab.slice(0, 8)}...` : tab }}</span>
              <template #content>
                <a-doption @click="reload">
                  <template #icon>
                    <icon-refresh class="reload-icon" :class="{ 'reload-icon--spin': loading }" />
                  </template>
                  <template #default>重新加载</template>
                </a-doption>
                <a-doption @click="closeAll">
                  <template #icon>
                    <icon-to-right />
                  </template>
                  <template #default>关闭右侧</template>
                </a-doption>
              </template>
            </a-dropdown>
          </a-tooltip>
        </template>
        <slot name="table"></slot>
      </a-tab-pane>
      <a-tab-pane v-for="pane in panes" :key="pane.key" :title="pane.title" :closable="pane.closable">
        <template #title>
          <a-tooltip position="top">
            <template #content>
              <span>{{ pane.title }}</span>
            </template>
            <a-dropdown trigger="contextMenu">
              <span>{{ pane.title.length > 8 ? `${pane.title.slice(0, 8)}...` : pane.title }}</span>
              <template #content>
                <a-doption @click="reload">
                  <template #icon>
                    <icon-refresh class="reload-icon" :class="{ 'reload-icon--spin': loading }" />
                  </template>
                  <template #default>重新加载</template>
                </a-doption>
                <a-doption @click="close(pane.key)">
                  <template #icon>
                    <icon-to-bottom />
                  </template>
                  <template #default>关闭当前</template>
                </a-doption>
                <a-doption @click="closeLeft(pane.key)">
                  <template #icon>
                    <icon-to-left />
                  </template>
                  <template #default>关闭左侧</template>
                </a-doption>
                <a-doption @click="closeRight(pane.key)">
                  <template #icon>
                    <icon-to-right />
                  </template>
                  <template #default>关闭右侧</template>
                </a-doption>
                <a-doption @click="closeOther(pane.key)">
                  <template #icon>
                    <icon-close />
                  </template>
                  <template #default>关闭其他</template>
                </a-doption>
              </template>
            </a-dropdown>
          </a-tooltip>
        </template>
        <slot v-if="pane.kind === 'history'" name="history"></slot>
        <slot v-else name="content" :content="{ ...pane, activeKey }"></slot>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="tsx">
import { onMounted, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useUiStore } from '@/stores/modules/uiStore'

interface Pane {
  title: string
  content: any
  key: string
  closable?: boolean
  path: string
  id: string
  readonly?: boolean
  copy?: boolean
  kind?: 'history'
}

const emit = defineEmits<{
  (e: 'collapsed', status: boolean): void
  (e: 'update:defaultCollapsed', value: boolean): void
  (e: 'refresh'): void
}>()

const uiStore = useUiStore()

const tab = ref('场景列表')
const title = ref('新建场景')

const activeKey = ref<string>('0')
const panes = ref<Pane[]>([])
const newTabIndex = ref(1)
const titleIndex = ref(1)

onMounted(() => {
  // console.log(uiStore.projectId)
})

watch(() => uiStore.activeKey, (val) => {
  if (val === '0') {
    emit('collapsed', false)
    uiStore.activeId = ''
    uiStore.activeReadonly = false
    uiStore.activeCopy = false
  } else {
    emit('collapsed', true)
    uiStore.activeId = ''
    uiStore.activeReadonly = false
    uiStore.activeCopy = false
  }
  for (const pan of panes.value) {
    if (pan.key === val) {
      // emit('set-scene-list', pan.content)
      uiStore.activeId = pan.id
      uiStore.activeReadonly = Boolean(pan.readonly)
      uiStore.activeCopy = Boolean(pan.copy)
      break
    }
  }
  reload()
})

watch(() => uiStore.projectId, (val) => {
  if (val) {
    panes.value = []
    uiStore.activeKey = '0'
  }
})

const openHistoryTab = () => {
  const historyPane = panes.value.find(pane => pane.kind === 'history')
  if (!historyPane) {
    panes.value.push({
      title: '执行历史',
      content: null,
      key: 'history',
      closable: true,
      path: '',
      id: '',
      kind: 'history',
    })
  }
  uiStore.activeKey = 'history'
}

const handleUpdateCase = (record: any, updateTitle: string) => {
  panes.value = panes.value.map((item) => {
    if (item.key === uiStore.activeKey) {
      return {
        ...item,
        title: updateTitle,
        content: item.content ? { ...item.content, ...record } : record,
      }
    }
    return item
  })
}

const addTab1 = (record?: any, editTitle?: string, id?: string) => {
  let newTitle: string
  let samePane: Pane[] = []

  if (record) {
    samePane = panes.value.filter((pane) => {
      return pane.content !== null ? id === pane.content.id : null
    })
    newTitle = editTitle || ''
  } else {
    newTitle = `${title.value}${newTabIndex.value}`
  }
  // console.log('samePane', samePane)
  if (samePane.length) {
    uiStore.activeKey = samePane[0].key
    return
  }

  const newKey = `${newTabIndex.value}`
  panes.value.push({
    title: newTitle,
    content: record || null,
    key: newKey,
    closable: true,
    path: record ? record.path : '',
    id: record ? record.id : '',
  })
  uiStore.activeKey = newKey
  uiStore.activeId = ''
  newTabIndex.value++
}

const addTab = (record?: any) => {
  // 如果传入了record，检查是否已存在相同id的标签页
  if (record) {
    const samePane = panes.value.filter((pane) => {
      return pane.content !== null && record.id === pane.content.id
    })

    // 如果已存在相同标签页，直接激活该标签页并返回
    // 复制场景需要保留源场景 ID 用于调用复制接口，不能复用已打开的编辑标签页。
    if (samePane.length > 0 && !record.copy) {
      panes.value = panes.value.map((pane) => {
        if (pane.key === samePane[0].key) {
          return {
            ...pane,
            content: { ...pane.content, ...record },
            readonly: Boolean(record?.readonly),
            copy: Boolean(record?.copy),
          }
        }
        return pane
      })
      uiStore.activeKey = samePane[0].key
      uiStore.activeId = String(samePane[0].id || '')
      uiStore.activeReadonly = Boolean(samePane[0].readonly)
      uiStore.activeCopy = Boolean(samePane[0].copy)
      return
    }
  }

  // 生成新标签页的标题和key
  const newTitle = record ? record.name : `${title.value}${newTabIndex.value}`
  const newKey = `${newTabIndex.value}`

  // 添加新标签页
  panes.value.push({
    title: newTitle,
    content: record || null,
    key: newKey,
    closable: true,
    path: record ? record.path : '',
    id: record ? record.id : '',
    readonly: Boolean(record?.readonly),
    copy: Boolean(record?.copy),
  })

  // 设置为当前激活的标签页
  uiStore.activeKey = newKey
  uiStore.activeId = record?.id ? String(record.id) : ''
  uiStore.activeReadonly = Boolean(record?.readonly)
  uiStore.activeCopy = Boolean(record?.copy)
  newTabIndex.value++
}

const removeTab = (targetKey: string) => {
  const currentActiveKey = targetKey ?? uiStore.activeKey
  let lastIndex: number | undefined

  panes.value = panes.value.filter((pane, i) => {
    if (pane.key === currentActiveKey) {
      // 如果当前项是要删除的项，则记录前一个索引
      if (i > 0) {
        lastIndex = i - 1
      }
      return false
    }
    return true
  })
  if (panes.value.length > 0) {
    const nextKey = lastIndex !== undefined ? panes.value[lastIndex].key : panes.value[0].key
    uiStore.activeKey = nextKey
  } else {
    uiStore.activeKey = '0'
    uiStore.activeId = ''
  }
}
const close = (targetKey: string) => {
  Modal.confirm({
    // title: `关闭${pane.title}页面?`,
    title: `温馨提示`,
    content: '当前页面未保存，确认关闭吗?',
    onOk: () => {
      removeTab(targetKey)
    },
  })
}

const closeLeft = (targetKey: string) => {
  panes.value = panes.value.filter((pane) => pane.key >= targetKey)
  uiStore.activeKey = targetKey
}
const closeRight = (targetKey: string) => {
  panes.value = panes.value.filter((pane) => pane.key <= targetKey)
  uiStore.activeKey = targetKey
}
const closeOther = (targetKey: string) => {
  panes.value = panes.value.filter((pane) => pane.key === targetKey)
  uiStore.activeKey = targetKey
}
const closeAll = () => {
  panes.value = []
  uiStore.activeKey = '0'
  uiStore.activeId = ''
  newTabIndex.value = 1
}

const updateTab = (record: any) => {
  panes.value = panes.value.map((pane) => {
    if (pane.key === uiStore.activeKey) {
      // 返回新的对象，避免直接修改原对象
      return {
        ...pane,
        id: record?.id,
        title: record?.title,
        readonly: false,
        copy: false,
      }
    }
    return pane
  })
}
const loading = ref(false)
// 重新加载
const reload = () => {
  emit('refresh')
}

defineExpose({
  handleUpdateCase,
  addTab,
  removeTab,
  updateTab,
  openHistoryTab,
})
</script>

<script lang="tsx">
export default {}
</script>

<style lang="less" scoped>
.tab-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}
:deep(.arco-tabs) {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}
:deep(.arco-tabs-tab) {
  text-align: center;
}
:deep(.arco-tabs-nav-tab) {
  display: flex;
  flex: 1;
  overflow: hidden;
  flex-direction: row-reverse;
  justify-content: flex-end;

  .arco-tabs-tab {
    .arco-tabs-close-btn svg {
      width: 0;
      transition: all 0.15s;
    }

    &:hover {
      .arco-tabs-close-btn svg {
        width: 1em;
      }
    }
  }

}
:deep(.arco-tabs-nav-extra) {
  order: -1;
  margin: 0 0 4px 0;
}
:deep(.arco-tabs-content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 0px solid var(--color-border-2);
  border-top: none;
  padding-top: 0px;
}
:deep(.arco-tabs-content-list),
:deep(.arco-tabs-pane) {
  height: 100%;
  min-height: 0;
}
:deep(.gi_table_page){
  margin-top: 20px;
  padding: 5px;
}
.tab-add-btn {
  margin-left: 5px;
  margin-right: 5px;
  padding: 0 35px;
  height: 30px;
  border-radius: 3px;
}
</style>
