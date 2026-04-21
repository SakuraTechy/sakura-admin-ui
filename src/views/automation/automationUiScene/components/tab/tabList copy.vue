<template>
  <div class="tab-content">
    <!-- <div v-if="isVisible" class="add-tab" :style="{ left: '5px' }">
      <a-button style="padding: 15px 32px;" type="primary" @click="addTab()">
        <template #icon><IconPlus :stroke-width="6" /></template>
        <template #default>新增</template>
      </a-button>
    </div> -->
    <a-tabs v-model:active-key="activeKey" size="large" type="card-gutter" :hide-content="false" justify editable show-add-button auto-switch @add="addTab()" @delete="close">
      <a-tab-pane key="0" :title="tab" :closable="false">
        <template #title>
          <a-tooltip position="top">
            <template #content>
              <span>{{ tab }}</span>
            </template>
            <a-dropdown trigger="contextMenu">
              <span>{{ tab.length > 6 ? `${tab.slice(0, 6)}...` : tab }}</span>
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
              <span>{{ pane.title.length > 6 ? `${pane.title.slice(0, 6)}...` : pane.title }}</span>
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
        <slot name="content" :content="{ ...pane, activeKey }"></slot>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="tsx">
import { onMounted, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'

interface Pane {
  title: string
  content: any
  key: string
  closable?: boolean
  path: string
}

const props = defineProps<{
  tab: string
  title: string
  projectId?: string
}>()

const emit = defineEmits<{
  (e: 'collapsed', status: boolean): void
  (e: 'change-left-width', width: number, key: string): void
  (e: 'set-scene-list', content: any): void
  (e: 'refresh'): void
}>()

const leftWidth = ref(0)
const activeKey = ref<string>('0')
const panes = ref<Pane[]>([])
const newTabIndex = ref(1)
const titleIndex = ref(1)
const isVisible = ref(false)

watch(activeKey, (val) => {
  // console.log(val)
  if (val === '0') {
    leftWidth.value = 300
    emit('change-left-width', leftWidth.value, val)
    emit('collapsed', false)
  } else {
    leftWidth.value = 0
    emit('change-left-width', leftWidth.value, val)
    emit('collapsed', true)
  }

  for (const pan of panes.value) {
    if (pan.key === val) {
      emit('set-scene-list', pan.content)
      break
    }
  }
})

watch(() => props.projectId, (val) => {
  if (val) {
    panes.value = []
  }
})

onMounted(() => {
  // const tabs1 = document.querySelectorAll('.arco-tabs-nav')
  // if (props.tab === '场景列表') {
  //   isVisible.value = true
  //   if (tabs1[1]) {
  //     (tabs1[1] as HTMLElement).style.left = '75px'
  //     ;(tabs1[1] as HTMLElement).style.maxWidth = 'calc(100% - 82px)'
  //   }
  // } else if (props.tab === 'UI自动化测试') {
  //   isVisible.value = false
  //   if (tabs1[3]) {
  //     ;(tabs1[3] as HTMLElement).style.left = '5px'
  //     ;(tabs1[3] as HTMLElement).style.maxWidth = 'calc(100% - 82px)'
  //   }
  // }
})

const handleUpdateCase = (record: any, updateTitle: string) => {
  panes.value = panes.value.map((item) => {
    if (item.key === activeKey.value) {
      return {
        ...item,
        title: updateTitle,
        content: item.content ? { ...item.content, ...record } : record,
      }
    }
    return item
  })
}

const addTab = (record?: any, editTitle?: string, id?: string) => {
  leftWidth.value = 0
  let title: string
  let samePane: Pane[] = []

  if (record) {
    samePane = panes.value.filter((pane) => {
      return pane.content !== null ? id === pane.content.id : null
    })
    title = editTitle || ''
  } else {
    title = `${props.newTitle}${titleIndex.value++}`
  }

  if (samePane.length) {
    activeKey.value = samePane[0].key
    return
  }

  const newKey = `${newTabIndex.value++}`
  panes.value.push({
    title,
    content: record || null,
    key: newKey,
    closable: true,
    path: record ? record.path : '',
  })
  activeKey.value = newKey
}

const remove = (targetKey: string) => {
  const currentActiveKey = activeKey.value
  let lastIndex: number | undefined

  panes.value.forEach((pane, i) => {
    if (pane.key === targetKey) {
      lastIndex = i - 1
    }
  })

  panes.value = panes.value.filter((pane) => pane.key !== targetKey)

  if (panes.value.length && currentActiveKey === targetKey) {
    if (lastIndex !== undefined && lastIndex >= 0) {
      activeKey.value = panes.value[lastIndex].key
    } else {
      activeKey.value = panes.value[0].key
    }
  }

  if (!panes.value.length) {
    activeKey.value = '0'
    leftWidth.value = 300
  }
  console.log(panes.value)
}

const close = (targetKey: string) => {
  Modal.confirm({
    title: `关闭${targetKey}页面?`,
    content: '当前页面未保存，确认关闭吗?',
    onOk: () => {
      remove(targetKey)
    },
  })
}

const closeLeft = (targetKey: string) => {
  panes.value = panes.value.filter((pane) => pane.key >= targetKey)
}
const closeRight = (targetKey: string) => {
  panes.value = panes.value.filter((pane) => pane.key <= targetKey)
}
const closeOther = (targetKey: string) => {
  panes.value = panes.value.filter((pane) => pane.key === targetKey)
}
const closeAll = () => {
  panes.value = []
}

const loading = ref(false)
// 重新加载
const reload = () => {
  if (loading.value) return
  loading.value = true
  emit('refresh')
  setTimeout(() => {
    loading.value = false
  }, 600)
}

defineExpose({
  handleUpdateCase,
  addTab,
})
</script>

<script lang="tsx">
export default {}
</script>

<style lang="less" scoped>
.tab-content {
  position: relative;
  box-sizing: border-box;

  .add-tab {
    cursor: pointer;
    z-index: 999;
    position: absolute;
    // top: 6px;
    // left: 100px;
    // width: 60px;
    // height: 30px;
  }
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
  margin-left: 4px;

  .arco-tabs-tab {
    svg {
      width: 0;
      transition: all 0.15s;
    }

    &:hover {
      svg {
        width: 1em;
      }
    }
  }

  &:not(.arco-tabs-nav-tab-scroll) {
    .arco-tabs-tab:first-child {
      // border-left: 0;
    }
  }
}
:deep(.arco-tabs-nav-add-btn) {
  display: flex;
  padding: 0px 30px;
  font-size: 12px;
  user-select: none;
  background-color: rgb(var(--primary-6));
  margin: 0 4px 0px 0;
  // width: 66px;
  height: 30px !important;
  align-items: center;
  justify-content: center;
  border-radius: 3px;

  .arco-icon {
    display: inline-block;
    width: 1em;
    height: 1em;
    color: #ffffff;
    font-style: normal;
    vertical-align: -2px;
    outline: none;
    stroke: currentColor;
  }

  .arco-icon-hover {
    position: inherit;
    display: inline-block;
    cursor: pointer;
    line-height: 12px;
  }
}
:deep(.arco-tabs-nav-extra) {
  order: -1;
  margin: 0 0 4px 0;
}
:deep(.arco-tabs-content) {
  border: 0px solid var(--color-border-2);
  border-top: none;
  padding-top: 0px;
}
:deep(.gi_table_page){
  margin-top: 20px;
  padding: 0
}
</style>
