<template>
  <div style="padding: 20px;">
    <GiTable
      ref="tableRef"
      v-model:selected-keys="selectedKeys"
      size="medium"
      title=""
      row-key="id"
      :data="tableData"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: '100%', y: '100%' }"
      :pagination="pagination"
      :disabled-tools="['']"
      :disabled-column-keys="['name']"
      :row-selection="{ type: 'checkbox', showCheckedAll: true }"
      :show-selection-alert="true"
      :selection-message="`已选择 ${selectedKeys.length} 条记录`"
      no-selection-message="未选择任何记录"
      @select="select"
      @select-all="selectAll"
      @refresh="search"
    >
      <template #top>
        <GiForm
          v-model="queryForm"
          :columns="queryFormColumns"
          size="medium"
          search
          :search-card="true"
          :search-columns-per-row="3"
          :search-control-min-width="210"
          :search-label-width="60"
          :grid-props="queryGridProps"
          search-btn-text="查询"
          :search-on-change="true"
          @search="search"
          @reset="reset"
        />
      </template>
      <template #toolbar-right>
        <!-- <a-button v-permission="['automation:automationUiScene:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button> -->
        <a-button
          v-permission="['automation:automationUiScene:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择数据' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>批量删除</template>
        </a-button>
        <a-button v-permission="['automation:automationUiScene:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>批量导出</template>
        </a-button>
        <!-- <a-button
          v-permission="['automation:automationUiScene:export']"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择数据' : ''"
          @click="() => onExportXml()"
        >
          <template #icon><icon-download /></template>
          <template #default>批量导出 XML</template>
        </a-button>
        <a-button v-permission="['automation:automationUiScene:export']" @click="onExportAllXml">
          <template #icon><icon-download /></template>
          <template #default>导出全部 XML</template>
        </a-button> -->
        <a-button
          v-permission="['automation:automationUiScene:execute']"
          type="primary"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择数据' : ''"
          @click="onBatchExecute"
        >
          <template #icon><icon-select-all /></template>
          <template #default>批量执行</template>
        </a-button>
        <a-button
          v-permission="['automation:automationUiScene:execute']"
          type="primary"
          status="success"
          @click="onExecuteAll"
        >
          <template #icon><icon-play-arrow /></template>
          <template #default>执行全部</template>
        </a-button>
        <a-button
          v-permission="['automation:automationUiScene:update']"
          status="warning"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择数据' : ''"
          @click="onClearResults"
        >
          <template #icon><icon-sync /></template>
          <template #default>清空结果</template>
        </a-button>
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['automation:automationUiScene:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['automation:automationUiScene:update']" title="编辑" @click="onUpdate(record)">编辑</a-link>
          <a-link v-permission="['automation:automationUiScene:copy']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link v-permission="['automation:automationUiScene:execute']" title="执行" @click="onExecute(record)">执行</a-link>
          <a-dropdown>
            <a-button v-if="has.hasPermOr(['automation:automationUiScene:delete'])" type="text" size="mini" title="更多">
              <template #icon>
                <icon-more :size="16" />
              </template>
            </a-button>
            <template #content>
              <a-doption
                  v-permission="['automation:automationUiScene:delete']"
                  status="danger"
                  :disabled="record.disabled"
                  :title="record.disabled ? '不可删除' : '删除'"
                  @click="onDelete(record)"
              >
                删除
              </a-doption>
              <a-doption
                v-permission="['automation:automationUiScene:export']"
                @click="onExportXml(record)"
              >
                导出
              </a-doption>
              <a-doption
                v-permission="['automation:automationUiScene:exec']"
                @click="openUrl(record.debugRecord[0]?.consoleUrl, '获取运行日志失败，请先执行场景')"
              >
                日志
              </a-doption>
              <a-doption
                v-permission="['automation:automationUiScene:exec']"
                @click="openUrl(record.debugRecord[0]?.testReportUrl, '获取测试报告失败，请先执行场景')"
              >
                报告
              </a-doption>
              <a-doption
                v-permission="['automation:automationUiScene:exec']"
                @click="openVideo(record.debugRecord[0]?.testReportUrl, record.sceneId, '获取测试视频失败，请先执行场景')"
              >
                回放
              </a-doption>
            </template>
          </a-dropdown>
        </a-space>
      </template>
    </GiTable>

    <AutomationUiSceneAddModal ref="AutomationUiSceneAddModalRef" @save-success="search" />
    <AutomationUiSceneDetailDrawer ref="AutomationUiSceneDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import AutomationUiSceneAddModal from './AutomationUiSceneAddModal.vue'
import AutomationUiSceneDetailDrawer from './AutomationUiSceneDetailDrawer.vue'
import {
  type AutomationUiSceneQuery,
  type AutomationUiSceneResp,
  clearAutomationUiSceneResults,
  deleteAutomationUiScene,
  exportAllAutomationUiSceneXml,
  exportAutomationUiScene,
  exportAutomationUiSceneXml,
  getAutomationUiSceneSelected,
  listAutomationUiScene,
} from '@/apis/automation/automationUiScene'
import { useResetReactive, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import { GiCellTag, GiCellTags } from '@/components/GiCell'
import type { ColumnItem } from '@/components/GiForm'
import { useUiStore } from '@/stores/modules/uiStore'
import { formatDuration } from '@/utils/sakura'
import { filterSceneResultOptions, filterSceneStatusOptions, pickSceneExecuteField } from '@/utils/automationUiSceneStatus'

defineOptions({ name: 'AutomationUiScene' })

const emit = defineEmits<{
  (e: 'update-scene', record: any): void
  (e: 'execute-scene', record: any): void
  (e: 'execute-scenes', records: any[]): void
  (e: 'execute-all-scenes', records: any[], query: any): void
}>()

const uiStore = useUiStore()
const { scene_level, status_type } = useDict('scene_level', 'status_type')

const [queryForm, resetForm] = useResetReactive<AutomationUiSceneQuery>({
  id: undefined,
  sceneId: undefined,
  name: undefined,
  projectId: undefined,
  versionId: undefined,
  moduleId: undefined,
  level: undefined,
  executeStatus: undefined,
  executeResult: undefined,
  status: undefined,
  createUser: undefined,
  updateUser: undefined,
  createTime: [],
  sort: ['createTime,desc'],
})

const {
  tableData,
  loading,
  pagination,
  search,
  select,
  selectAll,
  selectedKeys,
  handleDelete,
  handleExport,
} = useTable((page) => listAutomationUiScene({ ...queryForm, ...page, executeResultType: 'debug' }))

const queryGridProps = { cols: 24, colGap: 16, rowGap: 0 }
const queryFieldSpan = { xs: 24, sm: 8, xxl: 8 }

const queryFormColumns = computed<ColumnItem[]>(() => [
  { type: 'input', label: '场景 ID', field: 'sceneId', span: queryFieldSpan, props: {} },
  { type: 'input', label: '场景名称', field: 'name', span: queryFieldSpan, props: {} },
  { type: 'select', label: '场景版本', field: 'versionId', span: queryFieldSpan, props: { options: uiStore.versionList } },
  { type: 'select', label: '场景等级', field: 'level', span: queryFieldSpan, props: { options: scene_level.value } },
  {
    type: 'select',
    label: '执行状态',
    field: 'executeStatus',
    span: queryFieldSpan,
    props: { options: filterSceneStatusOptions(status_type.value) },
  },
  {
    type: 'select',
    label: '执行结果',
    field: 'executeResult',
    span: queryFieldSpan,
    props: { options: filterSceneResultOptions(status_type.value) },
  },
  {
    type: 'select',
    label: '创建人',
    field: 'createUser',
    span: queryFieldSpan,
    foldable: true,
    props: { options: uiStore.userList },
  },
  {
    type: 'select',
    label: '更新人',
    field: 'updateUser',
    span: queryFieldSpan,
    foldable: true,
    props: { options: uiStore.userList },
  },
  {
    type: 'range-picker',
    label: '创建时间',
    field: 'createTime',
    span: queryFieldSpan,
    foldable: true,
    props: {
      showTime: true,
      format: 'YYYY-MM-DD HH:mm:ss',
    },
  },
])

const columns: TableInstance['columns'] = [
  { title: '场景 ID', dataIndex: 'sceneId', slotName: 'sceneId', width: 180, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '场景名称', dataIndex: 'name', slotName: 'name', width: 360, ellipsis: true, tooltip: true },
  { title: '版本', dataIndex: 'versionName', slotName: 'versionName', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  { title: '等级', dataIndex: 'level', slotName: 'level', width: 100, ellipsis: true, tooltip: true, align: 'center' },
  {
    title: '标签',
    dataIndex: 'tags',
    slotName: 'tags',
    width: 100,
    align: 'center',
    render: ({ record }) => Array.isArray(record.tags) ? <GiCellTags data={record.tags} /> : '-',
  },
  {
    title: '执行状态',
    dataIndex: 'debugRecord[0].executeStatus',
    slotName: 'executeStatus',
    width: 100,
    align: 'center',
    render: ({ record }) => {
      const value = pickSceneExecuteField(record, 'executeStatus', status_type.value, 'debug')
      return value ? <GiCellTag value={value} dict={status_type.value} /> : '-'
    },
  },
  {
    title: '执行结果',
    dataIndex: 'debugRecord[0].executeResult',
    slotName: 'executeResult',
    width: 100,
    align: 'center',
    render: ({ record }) => {
      const value = pickSceneExecuteField(record, 'executeResult', status_type.value, 'debug')
      return value ? <GiCellTag value={value} dict={status_type.value} /> : '-'
    },
  },
  {
    title: '通过率',
    dataIndex: 'debugRecord[0].scenePassRate',
    slotName: 'scenePassRate',
    width: 80,
    align: 'center',
    render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].scenePassRate : '-',
  },
  {
    title: '耗时',
    width: 90,
    dataIndex: 'debugRecord[0].duration',
    slotName: 'duration',
    align: 'center',
    render: ({ record }) => formatDuration(Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].duration : '-'),
  },
  { title: '用例总数', width: 90, dataIndex: 'debugRecord[0].caseTotal', slotName: 'caseTotal', align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseTotal : '-' },
  { title: '用例通过', width: 90, dataIndex: 'debugRecord[0].casePass', slotName: 'casePass', align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].casePass : '-' },
  { title: '用例失败', width: 90, dataIndex: 'debugRecord[0].caseFail', slotName: 'caseFail', align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseFail : '-' },
  { title: '用例跳过', width: 90, dataIndex: 'debugRecord[0].caseSkip', slotName: 'caseSkip', align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseSkip : '-' },
  { title: '步骤总数', width: 90, dataIndex: 'debugRecord[0].stepTotal', slotName: 'stepTotal', align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepTotal : '-' },
  { title: '步骤通过', width: 90, dataIndex: 'debugRecord[0].stepPass', slotName: 'stepPass', align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepPass : '-' },
  { title: '步骤失败', width: 90, dataIndex: 'debugRecord[0].stepFail', slotName: 'stepFail', align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepFail : '-' },
  { title: '步骤跳过', width: 90, dataIndex: 'debugRecord[0].stepSkip', slotName: 'stepSkip', align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepSkip : '-' },
  { title: '场景状态', dataIndex: 'status', slotName: 'status', width: 100, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUserString', width: 120 },
  { title: '更新人', dataIndex: 'updateUserString', slotName: 'updateUserString', width: 120 },
  // { title: '执行人', dataIndex: 'debugRecord[0].executeName', slotName: 'executeName', width: 120 },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true },
  { title: '更新时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 240,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['automation:automationUiScene:get', 'automation:automationUiScene:update', 'automation:automationUiScene:delete']),
  },
]

const tableRef = ref()

const reset = () => {
  resetForm()
  queryForm.projectId = uiStore.projectId
  queryForm.versionId = uiStore.versionId
  uiStore.moduleId = ''
}

watch(() => uiStore.versionId, async (newVersionId) => {
  queryForm.projectId = uiStore.projectId
  queryForm.versionId = newVersionId
}, { immediate: true })

watch(() => queryForm.versionId, async (newVersionId, oldVersionId) => {
  if (newVersionId && oldVersionId && newVersionId !== oldVersionId) {
    await uiStore.fetchTrees(queryForm.projectId, newVersionId)
  }
})

watch(() => uiStore.moduleId, async (newModuleId) => {
  if (newModuleId) {
    queryForm.moduleId = newModuleId
  }
})

const onDelete = (record?: AutomationUiSceneResp) => {
  return handleDelete(() => deleteAutomationUiScene(
    selectedKeys.value.length ? selectedKeys.value.map((id) => String(id)) : record!.id,
  ), {
    content: selectedKeys.value.length ? '确认删除选中的场景数据吗？' : `确认删除场景“${record!.name}”吗？`,
    showModal: true,
    multiple: true,
  })
}

const onExport = async () => {
  return handleExport(() => exportAutomationUiScene(
    selectedKeys.value.length
      ? { ...queryForm, id: selectedKeys.value.join(','), name: '自动化场景导出' }
      : queryForm,
  ), {
    content: selectedKeys.value.length ? '确认导出选中的场景数据吗？' : '确认按当前筛选条件导出场景数据吗？',
    showModal: true,
    multiple: true,
  })
}

const onExportXml = async (record?: AutomationUiSceneResp) => {
  return handleExport(() => exportAutomationUiSceneXml(record ? [record.id] : selectedKeys.value.map(id => String(id))), {
    content: record ? `确认导出场景“${record.name}”的 XML 文件吗？` : '确认导出所选场景的 XML 文件吗？',
    showModal: true,
    multiple: record ? false : true,
  })
}

const onExportAllXml = async () => {
  return handleExport(() => exportAllAutomationUiSceneXml({
    ...queryForm,
    projectId: uiStore.projectId,
    versionId: queryForm.versionId || uiStore.versionId,
  }), {
    content: '确认按当前筛选条件导出全部 XML 文件吗？',
    showModal: true,
  })
}

const onBatchExecute = async () => {
  const { data } = await getAutomationUiSceneSelected(selectedKeys.value)
  emit('execute-scenes', data)
}

const onExecuteAll = async () => {
  const targetQuery = {
    ...queryForm,
    projectId: uiStore.projectId,
    versionId: queryForm.versionId || uiStore.versionId,
  }
  const { data } = await listAutomationUiScene({ ...targetQuery, page: 1, size: 1000 } as any)
  const records = Array.isArray(data?.list) ? data.list : []
  emit('execute-all-scenes', records, targetQuery)
}

const onClearResults = async () => {
  return handleDelete(() => clearAutomationUiSceneResults({
    sceneIds: selectedKeys.value.map(id => String(id)),
  }), {
    content: '确认清空所选场景的执行结果吗？',
    successTip: '清空成功',
    showModal: true,
    multiple: true,
  })
}

const openUrl = (url: string, errorMsg: string) => {
  if (url) {
    Message.success('获取成功，正在跳转')
    setTimeout(() => {
      window.open(url)
    }, 500)
  } else {
    Message.error(errorMsg)
  }
}

const openVideo = (testReportUrl: string, sceneId: string, errorMsg: string) => {
  if (testReportUrl) {
    Message.success('获取测试视频成功')
    setTimeout(() => {
      window.open(testReportUrl.replace('/index.html', `/video/${sceneId}.mp4`))
    }, 500)
  } else {
    Message.error(errorMsg)
  }
}

interface AutomationUiSceneAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface AutomationUiSceneDetailDrawerType {
  onOpen: (id: string) => void
}

const AutomationUiSceneAddModalRef = ref<AutomationUiSceneAddModalType>()
const onAdd = () => {
  AutomationUiSceneAddModalRef.value?.onAdd()
}
const onDetail = (record: AutomationUiSceneResp) => {
  emit('update-scene', { ...record, readonly: true })
}
const onUpdate = (record: AutomationUiSceneResp) => {
  emit('update-scene', { ...record, readonly: false })
}
const onCopy = (record: AutomationUiSceneResp) => {
  emit('update-scene', { ...record, readonly: false, copy: true })
}
const onExecute = (record: AutomationUiSceneResp) => {
  emit('execute-scene', record)
}

const AutomationUiSceneDetailDrawerRef = ref<AutomationUiSceneDetailDrawerType>()

defineExpose({
  reset,
})
</script>

<script lang="tsx">
export default {}
</script>

<style scoped lang="scss">
:deep(.arco-space) {
  display: flex;
}
:deep(.w-full) {
  gap: 8px 8px !important;
}
:deep(.arco-form) {
  flex-direction: row;
  flex-wrap: initial;
}
:deep(.arco-picker-separator) {
  min-width: 10px;
  padding: 0;
  color: var(--color-text-3);
}
</style>
