<template>
  <GiPageLayout ref="pageLayout" :left-style="{ width: 500 }">
    <template #left>
      <a-tabs :active-key="activeKey" type="text" size="medium" @change="handleTabChange">
        <!-- <template #extra>
          <a-button>Action</a-button>
        </template> -->
        <a-tab-pane key="1" title="基础信息">
          <template #title>
            <icon-info-circle /> 基础信息
          </template>
          <GiForm ref="formRef" v-model="form" size="medium" :columns="columns" :disabled="isReadonly" />
          <!-- <a-grid v-if="activeKey === '1'" class="grid">
            <a-button type="secondary" @click="handleCancel">取消</a-button>
            <a-button v-if="!uiStore.activeId" type="secondary" @click="handleOk">保存并继续创建</a-button>
            <a-button type="primary" @click="handleSubmit">保存</a-button>
          </a-grid> -->
        </a-tab-pane>
        <a-tab-pane key="2">
          <template #title>
            <a-dropdown v-if="!isReadonly" trigger="hover">
              <icon-ordered-list /> 场景用例
              <template #content>
                <a-doption @click="addCase">
                  <template #icon>
                    <icon-plus />
                  </template>
                  <template #default>新增用例</template>
                </a-doption>
                <a-doption @click="getSceneInfo()">
                  <template #icon>
                    <icon-refresh />
                  </template>
                  <template #default>刷新用例</template>
                </a-doption>
              </template>
            </a-dropdown>
            <span v-else><icon-ordered-list /> 场景用例</span>
          </template>
          <AutomationUiSceneAddCase v-if="uiStore.activeId" ref="caseListRef" :readonly="isReadonly" :case-list="caseList" @get-scene-info="getSceneInfo" @get-case="getCase" @get-step="getStep" />
        </a-tab-pane>
      </a-tabs>
    </template>
    <div :style="{ width: '100%' }">
      <a-card class="card">
        <a-space style="font-weight: 700;">用例总数：{{ caseList.length }}</a-space>
        <a-space style="font-weight: 700;">步骤总数：{{ stepList.length }}</a-space>
        <div style="display: flex; margin-right: auto;">
          <a-checkbox v-model="perChecked" :disabled="isReadonly"> 性能模式 </a-checkbox>
          <a-select v-model="webValue" :disabled="isReadonly" :style="{ width: '120px', marginLeft: '20px' }" placeholder="请选择">
            <a-option v-for="item of browser_type" :key="item.value" :value="item.value" :label="item.label" />
          </a-select>
          <a-dropdown-button :disabled="isReadonly" :style="{ marginLeft: '20px' }" @select="handleSelect">
            {{ debugText }}
            <template #icon>
              <icon-down />
            </template>
            <template #content>
              <a-doption v-for="item in debug_type" :key="item.value" :value="item.value">{{ item.label }}</a-doption>
            </template>
          </a-dropdown-button>
        </div>
      </a-card>
      <a-tabs class="tabs" default-active-key="1">
        <a-tab-pane key="1" title="详情信息">
          <div style="padding: 0 0px;">
            <a-empty v-if="caseList.length === 0">暂无数据</a-empty>
            <a-descriptions v-else :column="1" size="large" class="general-description" bordered>
              <a-descriptions-item label="ID">{{ caseDetail?.id || stepDetail?.id }}</a-descriptions-item>
              <a-descriptions-item label="名称">{{ caseDetail?.name || stepDetail?.name }}</a-descriptions-item>
              <!-- <a-descriptions-item label="备注">{{ caseDetail?.remark }}</a-descriptions-item> -->
              <a-descriptions-item label="状态">
                <GiCellTag :value="caseDetail?.status || stepDetail?.status" :dict="status_type" />
              </a-descriptions-item>
              <a-descriptions-item v-if="stepDetail && (!caseDetail || !caseDetail.type)" label="操作类型">{{ stepDetail?.operationType }}</a-descriptions-item>
              <a-descriptions-item v-if="stepDetail && (!caseDetail || !caseDetail.type)" label="操作方法">{{ stepDetail?.operationName }}</a-descriptions-item>
              <a-descriptions-item v-if="stepDetail && (!caseDetail || !caseDetail.type)" label="操作步骤">
                <KeyValuePairForm
                  style="vertical-align: top;"
                  :model-value="stepDetail?.configList"
                  :name-col-span="5"
                  :value-col-span="20"
                  :action-col-span="2"
                  :col-gap="15"
                  :add-key-value="false"
                  :disabled="true"
                />
              </a-descriptions-item>
            </a-descriptions>
          </div>
        </a-tab-pane>
        <a-tab-pane key="2" title="描述信息">
          <div id="editor">
            <AiEditor
              :model-value="caseDetail?.remark || stepDetail?.remark || ''"
              :readonly="isReadonly"
              default-format="markdown"
            />
            <!-- <QuillEditor v-model:content="quillContent" /> -->
          </div>
        </a-tab-pane>
        <a-tab-pane key="3" title="评审信息">
          <template #title>评审信息</template>
          Content of Tab Panel 3
        </a-tab-pane>
      </a-tabs>
    </div>
    <a-grid v-if="activeKey === '1' && !isReadonly" class="grid">
      <a-button type="secondary" @click="handleCancel">取消</a-button>
      <a-button v-if="!uiStore.activeId" type="secondary" @click="handleOk">保存并继续创建</a-button>
      <a-button type="primary" @click="handleSubmit">保存</a-button>
    </a-grid>
    <ExecuteSceneModal ref="executeSceneModalRef" @success="getSceneInfo" />
  </GiPageLayout>
</template>

<script setup lang="tsx">
import { computed, defineEmits, defineProps, onMounted, reactive, ref, watch } from 'vue'
import { add, mapTree } from 'xe-utils'
import TagsInput from 'vue3-tags-input'
import { Message } from '@arco-design/web-vue'
import { string } from 'sql-formatter/dist/cjs/lexer/regexFactory'

import AutomationUiSceneAddCase from './AutomationUiSceneAddCase.vue'
import ExecuteSceneModal from './ExecuteSceneModal.vue'
// import { AiEditor } from '@/components/GiEditor/AiEditor.vue'
// import QuillEditor from '@/components/GiEditor/QuillEditor.vue'

import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import type { ProjectModuleConfigResp } from '@/apis/project/projectModuleConfig'
import mittBus from '@/utils/mitt'
import { useUiStore } from '@/stores/modules/uiStore'
import { useDict } from '@/hooks/app'
import { filterSceneStatusOptions, resolveSceneStatusValue } from '@/utils/automationUiSceneStatus'
import { type AutomationUiSceneResp, addAutomationUiScene, copyAutomationUiScene, getAutomationUiScene, updateAutomationUiScene } from '@/apis/automation/automationUiScene'
import { findNodePath } from '@/utils/sakura'

defineOptions({ name: 'Ui' })
const emit = defineEmits<{
  (e: 'add-tab'): void
  (e: 'remove-tab'): void
  (e: 'update-tab', record: any): void
}>()

const uiStore = useUiStore()
const formRef = ref<InstanceType<typeof GiForm>>()
const { scene_level, browser_type, debug_type, status_type } = useDict('scene_level', 'browser_type', 'debug_type', 'status_type')

const [form, resetForm] = useResetReactive({
  projectId: uiStore.projectId ?? undefined,
  versionId: uiStore.versionId ?? undefined,
  moduleId: uiStore.moduleId ?? undefined,
  sceneId: '',
  name: '',
  description: '',
  tags: [],
  level: 'P0',
  executeStatus: '10',
  status: 1,
})

const activeKey = ref('1')
const perChecked = ref(false)
const webValue = ref('Chrome')
const debugText = ref('本地调试')

const moduleSelectTree = computed(() => {
  if (!form.projectId || !form.versionId) return []
  const treeList = uiStore.treeList?.filter(
    (item) => (item as any).projectId === form.projectId && (item as any).versionId === form.versionId,
  )
  const data = JSON.parse(JSON.stringify(treeList)) as ProjectModuleConfigResp[]
  return mapTree(data, (i) => ({
    key: i.id,
    title: i.name,
    children: i.children,
  }))
})

const handleTabChange = (key: string) => {
  console.log('handleTabChange', key)
  activeKey.value = key
}

const isReadonly = computed(() => uiStore.activeReadonly)
const isCopyMode = computed(() => uiStore.activeCopy)

watch(() => form.projectId, async (newProjectId, oldProjectId) => {
  if (newProjectId) {
    await uiStore.fetchVersions(newProjectId)
    form.versionId = uiStore.versionId
    // if (oldProjectId && newProjectId !== oldProjectId) {
    //   form.versionId = ''
    // }
  }
})

watch(() => form.versionId, async (newVersionId) => {
  if (newVersionId) {
    await uiStore.fetchTrees(form.projectId, newVersionId)
    form.moduleId = uiStore.moduleId
  }
})

const columns = computed<ColumnItem[]>(() => [
  {
    label: '所属项目',
    field: 'projectId',
    span: 23,
    type: 'select',
    required: true,
    props: {
      options: uiStore.projectList,
    },
  },
  {
    label: '所属版本',
    field: 'versionId',
    span: 23,
    type: 'select',
    required: true,
    props: {
      options: uiStore.versionList,
    },
  },
  {
    label: '所属模块',
    field: 'moduleId',
    span: 23,
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
  {
    label: '场景ID',
    field: 'sceneId',
    span: 23,
    type: 'input',
    required: true,
    props: {
      maxLength: 64,
    },
  },
  {
    label: '场景名称',
    field: 'name',
    span: 23,
    type: 'input',
    required: true,
    props: {
      maxLength: 64,
    },
  },
  {
    label: '场景等级',
    field: 'level',
    span: 23,
    type: 'select',
    required: true,
    props: {
      options: scene_level.value,
    },
  },
  // {
  //   label: '执行状态',
  //   field: 'executeStatus',
  //   span: 23,
  //   type: 'select',
  //   required: true,
  //   props: {
  //     options: filterSceneStatusOptions(status_type.value),
  //   },
  // },
  {
    label: '场景标签',
    field: 'tags',
    span: 23,
    type: 'input-tag',
    color: 'blue',
    props: {
      placeholder: '请输入场景标签，按回车确认',
      maxTagCount: 5,
    },
  },
  {
    label: '场景描述',
    field: 'description',
    span: 23,
    type: 'textarea',
    props: {
      maxLength: 255,
      autoSize: true,
    },
  },
  {
    label: '场景状态',
    field: 'status',
    span: 23,
    type: 'switch',
    props: {
      options: status_type.value.filter((item) => ['1', '2'].includes(item.value)),
      type: 'round',
      checkedValue: 1,
      uncheckedValue: 2,
      checkedText: '启用',
      uncheckedText: '禁用',
    },
  },
])

const executeSceneModalRef = ref()

const normalizeRecordList = (record: unknown) => {
  if (Array.isArray(record))
    return record
  if (typeof record === 'string' && record) {
    try {
      const parsed = JSON.parse(record)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const getLatestDebugRecord = () => {
  const records = normalizeRecordList((form as any).debugRecord)
  return records[0] || {}
}

const openUrl = (url: string | undefined, emptyMessage: string) => {
  if (!url) {
    Message.warning(emptyMessage)
    return
  }
  window.open(url)
}

const openExecuteModal = async () => {
  if (!uiStore.activeId) {
    Message.warning('请先保存基础信息，再执行调试')
    activeKey.value = '1'
    return
  }
  const { data } = await getAutomationUiScene(uiStore.activeId)
  executeSceneModalRef.value?.onOpen([data], { source: 'ui' })
}

const openDebugLog = async () => {
  if (!uiStore.activeId) {
    Message.warning('请先保存基础信息')
    return
  }
  const { data } = await getAutomationUiScene(uiStore.activeId)
  const record = normalizeRecordList(data.debugRecord)[0] || data
  openUrl(record.consoleUrl || data.consoleUrl, '获取运行日志失败，请先执行场景')
}

const openDebugReport = async () => {
  if (!uiStore.activeId) {
    Message.warning('请先保存基础信息')
    return
  }
  const { data } = await getAutomationUiScene(uiStore.activeId)
  const record = normalizeRecordList(data.debugRecord)[0] || data
  openUrl(record.testReportUrl || data.testReportUrl, '获取测试报告失败，请先执行场景')
}

const openDebugVideo = async () => {
  if (!uiStore.activeId) {
    Message.warning('请先保存基础信息')
    return
  }
  const { data } = await getAutomationUiScene(uiStore.activeId)
  const record = normalizeRecordList(data.debugRecord)[0] || data
  const reportUrl = record.testReportUrl || data.testReportUrl
  const videoUrl = reportUrl?.includes('/index.html')
    ? reportUrl.replace('/index.html', `/video/${data.sceneId}.mp4`)
    : reportUrl
      ? `${reportUrl.replace(/\/$/, '')}/video/${data.sceneId}.mp4`
      : ''
  openUrl(videoUrl, '获取测试回放失败，请先执行场景')
}

const handleSelect = async (value: string) => {
  const selected = debug_type.value.find(item => item.value === value || item.label === value)
  const label = selected?.label || value
  debugText.value = label
  if (label === '本地调试' || label === '远程调试') {
    await openExecuteModal()
    return
  }
  if (label === '查看日志') {
    await openDebugLog()
    return
  }
  if (label === '查看报告') {
    await openDebugReport()
    return
  }
  if (label === '查看回放') {
    await openDebugVideo()
  }
}

const handleCancel = () => {
  emit('remove-tab')
}
const handleOk = async () => {
  if (await handleSubmit()) {
    emit('add-tab')
  }
}

const handleSubmit = async () => {
  if (isReadonly.value) {
    Message.warning('当前为只读模式，无法修改')
    return false
  }
  try {
    if (await formRef.value?.formRef?.validate()) {
      Message.warning('请检查必填项')
      activeKey.value = '1'
      return false
    }
    const preform = {
      ...form,
      projectName: uiStore.projectList.filter((item) => item.value === form.projectId)[0].label,
      versionName: uiStore.versionList.filter((item) => item.value === form.versionId)[0].label,
      // modulePath: moduleSelectTree.value.filter((item) => item.key === form.moduleId)[0].title,
      modulePath: findNodePath(moduleSelectTree.value, 'key', form.moduleId, 'title'),
      // level: scene_level.value.filter((item) => item.value === form.level)[0].label,
    }
    if (uiStore.activeId && !isCopyMode.value) {
      await updateAutomationUiScene(preform, uiStore.activeId)
      Message.success('修改成功')
      // uiStore.updateScene(await getAutomationUiScene(uiStore.activeId))
    } else if (uiStore.activeId && isCopyMode.value) {
      const res = await copyAutomationUiScene(preform, uiStore.activeId)
      const newId = res.data?.id ?? res.data
      if (newId) {
        Message.success('复制成功')
        const record = {
          id: String(newId),
          title: form?.name,
        }
        emit('update-tab', record)
        uiStore.activeId = String(newId)
        uiStore.activeCopy = false
      }
    } else {
      const res = await addAutomationUiScene(preform)
      if (res.data?.id) {
        Message.success('新增成功')
        const record = {
          id: res.data.id,
          title: form?.name,
        }
        emit('update-tab', record)
        uiStore.activeId = res.data.id
        uiStore.activeCopy = false
      }
    }
    handleCancel()
    return true
  } catch (error) {
    console.error('保存失败:', error)
    return false
  }
}

const caseList = ref([])
const stepList = ref([])
const getSceneInfo = async (data1?: any) => {
  const { data } = await getAutomationUiScene(uiStore.activeId)
  Object.assign(form, data)
  form.executeStatus = resolveSceneStatusValue(data.executeStatus, status_type.value) ?? '10'
  // 先清空数组，再添加新元素
  caseList.value.splice(0)
  Object.assign(caseList.value, data.caseList ?? [])
  caseListRef.value?.getTreeCaseList(data1)
  console.log('caseList', caseList.value)
  // stepTotal.value = data.caseList.reduce((total: number, item: any) => total + item.stepList.length, 0)
  stepList.value = caseList.value.reduce((list: any, item: any) => {
    return list.concat(item.stepList || [])
  }, [])
  console.log('stepList', stepList.value)
}

const caseListRef = ref()
const getCaseList = async () => {
  // const res = await getAutomationUiScene(uiStore.activeId)
  // console.log('getCaseList', res)
  caseListRef.value?.getTreeCaseList()
}

const caseDetail = ref()
const stepDetail = ref()
const getCase = async (id: string) => {
  console.log('getCase', id)
  caseDetail.value = caseList.value.find((item: any) => item.id === id)
}

const getStep = async (data: any) => {
  console.log('getStep', data)
  caseDetail.value = caseList.value.find((item: any) => item.id === (data.dropNode?.id || data?.pid || data.node?.pid || data.dragNode?.pid))
  stepDetail.value = caseDetail.value.stepList.find((item: any) => item.id === (data?.id || data.node?.id))
  // console.log('caseDetail', caseDetail.value, 'stepDetail', stepDetail.value)
  caseDetail.value = []
}

const addCase = () => {
  if (isReadonly.value) {
    Message.warning('当前为只读模式，无法新增用例')
    return
  }
  if (!uiStore.activeId) {
    Message.warning('请先保存基础信息，再添加场景用例')
    activeKey.value = '1'
  } else {
    caseListRef.value?.onMenuClick({ mode: 'add', node: { type: '' } })
  }
}

defineExpose({
  getSceneInfo,
  getCaseList,
})
</script>

<script lang="tsx">
export default {}
</script>

<style scoped lang="scss">
:deep(.gi-page-layout__left) {
  padding: 20px 35px 0px 35px!important;
  flex-direction: column;
}

:deep(.gi-page-layout__body) {
  padding: 16px 0px 16px 0px !important;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column !important;
  overflow: hidden;
  box-sizing: border-box;
  justify-content: space-between;
  align-items: flex-end;
}

:deep(.arco-tabs-pane) {
  margin-top: 10px !important;
}

:deep(.w-full) {
  gap: 5px 8px !important;
}

:deep(.arco-tabs-nav-tab) {
  justify-content: center;
}

// :deep(.arco-col) {
//   width: 100%;
//   height: 100%;
//   display: flex;
//   flex-direction: row !important;
//   overflow: revert !important;
// }
:deep(.arco-row) {
  display: flex;
  align-items: center !important;
}
:deep(.arco-form-item-wrapper-col) {
  flex-direction: column !important;
}
.card {
  // width: 100%;
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.1), -4px -4px 8px rgba(0, 0, 0, 0.1);
  // font-weight: 700;
  margin: 10px 30px 10px 30px;
  padding: 0 10px;
  border-radius: 3px;
}
:deep(.arco-card-body) {
  display: flex;
  padding: 15px !important;
  gap: 200px;
}
:deep(.arco-btn-size-medium) {
    font-size: 13px !important;
}
.grid {
  display: flex;
  margin: 0 20px 20px 0;
  gap: 15px !important;
}
:deep(.arco-tabs-tab-title) {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    gap: 5px;
}
.tabs {
  margin: 0 30px 0 30px;

  :deep(.arco-tabs-nav-tab) {
    justify-content: left;
  }
}
</style>
