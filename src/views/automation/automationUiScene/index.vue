<template>
  <GiPageLayout ref="pageLayout" v-model:default-collapsed="isCollapsed" :left-style="{ width: 250 }">
    <template #left>
      <a-select
        v-model="uiStore.projectId"
        size="small"
        style="height: 30px; margin-bottom: 10px;"
        :options="uiStore.projectList"
        placeholder="请选择项目"
        allow-clear
        allow-search
      />
      <GiTree
        ref="giTreeRef"
        title="功能模块"
        :edit-method="editMethod"
        :tree-data="uiStore.treeList"
        :loading="uiStore.loading"
        :selected-keys="selectedKeys"
        :multiple="multiple"
        :on-save="onMenuClick"
        :check-strictly="checkStrictly"
        @update:selected-keys="val => selectedKeys = val"
        @node-click="onNodeClick"
        @node-drop="onNodeDrop"
        @menu-click="onMenuClick"
        @tree-node-click="onTreeNodeClick"
        @focus="onTreeFocus"
      />
      <GiFormModal
        v-model:visible="modalConfig.visible"
        v-model:form="modalConfig.form"
        :title="modalConfig.title"
        :columns="modalConfig.columns"
        :width="modalConfig.width"
        :mask-closable="modalConfig.maskClosable"
        :esc-to-close="modalConfig.escToClose"
        :draggable="modalConfig.draggable"
        :clear="modalConfig.clear"
        :on-save="handleSave"
        @save="handleSave"
        @close="handleClose"
      />
    </template>
    <TabList
      ref="tabListRef"
      @collapsed="collapsed"
      @refresh="refresh"
    >
      <template #table>
        <AutomationUiScene
          :key="sceneKey"
          ref="automationUiSceneRef"
          @update-scene="addTab"
          @execute-scene="executeScene"
          @execute-scenes="executeScenes"
          @execute-all-scenes="executeAllScenes"
        />
      </template>
      <template #content>
        <AddOrEditForm ref="addOrEditFormRef" @add-tab="addTab" @remove-tab="removeTab" @update-tab="updateTab" />
      </template>
    </TabList>
    <ExecuteSceneModal ref="executeSceneModalRef" @success="refresh" />
  </GiPageLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { mapTree } from 'xe-utils'
import TabList from './components/tab/tabList.vue'
import AddOrEditForm from './components/AddOrEditForm.vue'
import AutomationUiScene from './components/AutomationUiScene.vue'
import ExecuteSceneModal from './components/ExecuteSceneModal.vue'
import { useUiStore } from '@/stores/modules/uiStore'
import type { ColumnItem } from '@/components/GiForm'
import { type ProjectModuleConfigResp, addProjectModuleConfig, deleteProjectModuleConfig, dragProjectModuleConfig, updateProjectModuleConfig } from '@/apis/project/projectModuleConfig'

defineOptions({ name: 'Ui' })

const uiStore = useUiStore()

const selectedKeys = ref()
const multiple = ref(false)
const checkStrictly = ref(true)
const modalData = ref()

// 转换为树结构
const moduleSelectTree = computed(() => {
  // console.log('moduleList', moduleList)
  const data = JSON.parse(JSON.stringify(uiStore.treeList)) as ProjectModuleConfigResp[]
  return mapTree(data, (i) => ({
    key: i.id,
    title: i.name,
    children: i.children,
  }))
})

const modalConfig = reactive({
  visible: ref(false),
  form: ref({ parentId: '', name: '', description: '', sort: 999 }),
  title: '新增模块',
  columns: computed<ColumnItem[]>(() => [
    {
      label: '上级模块',
      field: 'parentId',
      span: 24,
      required: true,
      type: 'tree-select',
      props: {
        data: moduleSelectTree.value,
        allowClear: true,
        allowSearch: true,
        fallbackOption: false,
        filterTreeNode(searchKey, nodeData) {
          if (nodeData.title) {
            return nodeData.title.toLowerCase().includes(searchKey.toLowerCase())
          }
          return false
        },
      },
      // rules: [{ required: true, message: '请选择父模块' }],
      hide: (form) => {
        return form.parentId === 0
      },
    },
    { label: '模块名称', field: 'name', type: 'input', required: true, props: { maxLength: 64 } },
    { label: '模块描述', field: 'description', type: 'textarea', required: false, props: { maxLength: 255, autoSize: true, allowClear: true } },
    { label: '模块排序', field: 'sort', type: 'input-number', required: false, props: { min: 1, mode: 'button', allowClear: true } },
  ] as ColumnItem[]),
  width: 500,
  maskClosable: true,
  escToClose: true,
  draggable: true,
  clear: ref(false),
})

const handleSave = async (data: any) => {
  console.log('handleSave', data)
  // console.log(modalData.value)
  try {
    if (modalConfig.title === '新增模块' || modalConfig.title === '复制模块') {
      await addProjectModuleConfig({
        projectId: modalData.value?.projectId,
        versionId: modalData.value?.versionId,
        parentId: data.parentId,
        name: data.name,
        description: data.description,
        sort: data.sort,
        status: 1,
      })
    } else if (modalConfig.title === '修改模块') {
      await updateProjectModuleConfig(data, data.id)
    }
    Message.success(`${modalConfig.title}成功`)
    await uiStore.fetchTrees()
    // modalConfig.clear = true
  } catch (error) {
    console.error(error)
    // modalConfig.clear = false
    return false
  }
}
const handleClose = () => {
  // console.log('handleClose')
  modalConfig.visible = false
}

const onNodeClick = (data: any) => {
  // console.log('onNodeClick', data)
  uiStore.moduleId = data?.id || data.node?.id
}
const onNodeDrop = async (data?: any) => {
  // console.log('onNodeDrop', data)
  try {
    await dragProjectModuleConfig(data)
    await uiStore.fetchTrees()
    Message.success('移动成功')
  } catch (error) {
    console.error(error)
    return false
  }
}

const editMethod = ref('原地编辑')
const onMenuClick = async (data?: any) => {
  console.log('onMenuClick', data)
  try {
    switch (data.mode) {
      case 'add':
        modalConfig.title = '新增模块'
        modalConfig.visible = true
        // modalConfig.clear = true
        modalConfig.form = { parentId: data.node.id, name: '', description: '', sort: 999 }
        modalData.value = data.node
        break
      case 'edit':
        modalConfig.title = '修改模块'
        if (editMethod.value === '弹窗编辑') {
          modalConfig.visible = true
          modalConfig.form = { ...data.node }
          modalData.value = data.node
        }
        break
      case 'copy':
        modalConfig.title = '复制模块'
        modalConfig.visible = true
        // modalConfig.clear = false
        modalConfig.form = { ...data.node }
        modalData.value = data.node
        break
      case 'delete':
        await deleteProjectModuleConfig(data.node.id || data.node)
        await uiStore.fetchTrees()
        Message.success('删除成功')
        // multiple.value = false
        break
      case 'delete2':
        // multiple.value = true
        break
      case 'move':
        // console.log('move', data)
        break
    }
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}
const onTreeNodeClick = (data?: any) => {
  // console.log('onTreeNodeClick', data)
  onNodeDrop(data)
}

const pageLayout = ref()
const tabListRef = ref()
const giTreeRef = ref()
const isCollapsed = ref()
const collapsed = (status?: boolean) => {
  pageLayout.value?.toggleCollapsed(status)
  isCollapsed.value = !status
}

// 树组件获得焦点时设置激活状态
const onTreeFocus = () => {
  giTreeRef.value?.setActive()
}

const sceneKey = ref(0)
const automationUiSceneRef = ref()
const addOrEditFormRef = ref()
const refresh = async () => {
  // sceneKey.value++ // 改变 key 强制刷新组件
  await nextTick()
  if (uiStore.activeId) {
    await addOrEditFormRef.value?.getSceneInfo()
    // await addOrEditFormRef.value?.getCaseList()
  } else {
    automationUiSceneRef.value?.reset()
  }
}
const addTab = async (record?: any) => {
  tabListRef.value?.addTab(record)
}
const removeTab = () => {
  tabListRef.value?.removeTab()
}
const updateTab = (record: any) => {
  tabListRef.value?.updateTab(record)
}

const executeSceneModalRef = ref()
const executeScene = (record: any) => {
  executeSceneModalRef.value?.onOpen([record], { source: 'ui' })
}
const executeScenes = (records: any[]) => {
  executeSceneModalRef.value?.onOpen(records, { mode: 'selected', source: 'ui' })
}
const executeAllScenes = (records: any[], query: any) => {
  executeSceneModalRef.value?.onOpen(records, { mode: 'all', query, source: 'ui' })
}

// const updateScene = async (record: any) => {
//   tabListRef.value?.addTab(record)
// }

// 监听项目ID变化
watch(() => uiStore.projectId, async (newProjectId, oldProjectId) => {
  // console.log(newProjectId, oldProjectId)
  if (newProjectId && oldProjectId && newProjectId !== oldProjectId) {
    await uiStore.fetchVersions(newProjectId)
  }
})

// watch(() => selectedKeys.value, (val) => {
//   console.log('selectedKeys.value', val)
//   // uiStore.moduleId = selectedKeys.value[0]
// })

watch(() => uiStore.moduleId, () => {
  selectedKeys.value = [uiStore.moduleId]
})

// 初始化
onMounted(async () => {
  // console.log(localStorage.getItem('ui-store'))
  // if (!localStorage.getItem('ui-store')) {
  await uiStore.fetchProjects()
  await uiStore.fetchVersions()
  await uiStore.fetchTrees()
  await uiStore.fetchUsers()
  // }
  uiStore.activeKey = '0'
})
</script>

<style scoped lang="scss">
.select {
  // width: 260px;
  // background-color: white;
  // margin: 10px 14px 10px 14px;
}
:deep(.gi-tree) {
  height: 100%;
  // margin-top: -30px;
  flex-direction: column-reverse;
}
:deep(.arco-select-view-input ){
  font-size: 13px !important;
}
:deep(.arco-select-view-value){
  font-size: 13px !important;
}
:deep(.gi-page-layout) {
  display: flex;
  flex-wrap: nowrap;
}
:deep(.gi-page-layout__body) {
  padding: 16px 0px 0px 0px !important;
  flex-direction: row;
}
:deep(.gi-page-layout--margin){
  margin: 0;
}
:deep(.arco-modal) {
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
}
</style>
