<template>
  <div class="automation-ui-scene">
    <GiTable
      ref="tableRef"
      v-model:selected-keys="selectedKeys"
      size="medium"
      title=""
      row-key="id"
      :data="displayTableData"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: '100%', y: '100%'}"
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
          v-permission="['automation:automationUiScene:create']"
          type="primary"
          @click="onChromeRecord()"
        >
          <template #icon><icon-record /></template>
          <template #default>场景录制</template>
        </a-button>
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
        <a-dropdown trigger="click" @select="onBatchExecutionSelect">
          <a-button
          v-permission="['automation:automationUiScene:execute']"
          type="primary"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择数据' : ''"
        >
          <template #icon><icon-select-all /></template>
          <template #default>批量执行</template>
          </a-button>
          <template #content>
            <a-doption v-for="item in executionTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-doption>
          </template>
        </a-dropdown>
        <a-dropdown trigger="click" @select="onExecuteAllSelect">
          <a-button
          v-permission="['automation:automationUiScene:execute']"
          type="primary"
          status="success"
        >
          <template #icon><icon-play-arrow /></template>
          <template #default>执行全部</template>
          </a-button>
          <template #content>
            <a-doption v-for="item in executionTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-doption>
          </template>
        </a-dropdown>
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
          <a-dropdown trigger="click" @select="value => onExecutionSelect(record, value)">
            <a-link v-permission="['automation:automationUiScene:execute']" title="选择执行方式">
              执行
              <!-- <icon-down /> -->
            </a-link>
            <template #content>
              <a-doption v-for="item in executionTypeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-doption>
            </template>
          </a-dropdown>
          <a-dropdown>
            <a-button
              v-if="has.hasPermOr(['automation:automationUiScene:get', 'automation:automationUiScene:update', 'automation:automationUiScene:delete', 'automation:automationUiScene:export'])"
              type="text"
              size="mini"
              title="更多"
            >
              <template #icon>
                <icon-more :size="16" />
              </template>
            </a-button>
            <template #content>
              <a-doption
                v-permission="['automation:automationUiScene:update']"
                @click="onChromeRecord(record)"
              >
                录制
              </a-doption>
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
                v-permission="['automation:automationUiScene:get']"
                @click="onOpenHistory(record)"
              >
                历史
              </a-doption>
              <!-- <a-dsubmenu
                v-for="view in executionViewOptions"
                :key="view.value"
                v-permission="['automation:automationUiScene:get']"
              >
                <template #default>{{ view.label }}</template>
                <template #content>
                  <a-doption
                    v-for="item in executionTypeOptions"
                    :key="`${view.value}-${item.value}`"
                    @click="openExecutionResult(record, item.value, view.value)"
                  >
                    {{ item.label }}
                  </a-doption>
                </template>
              </a-dsubmenu> -->
            </template>
          </a-dropdown>
        </a-space>
      </template>
    </GiTable>

    <AutomationUiSceneAddModal ref="AutomationUiSceneAddModalRef" @save-success="refresh" />
    <ChromeRecordingModal ref="chromeRecordingModalRef" :scene-options="tableData" @recording-finished="refresh" />
    <AutomationExecutionCaseSelectModal ref="executionCaseSelectModalRef" :live-executions="sceneProps.liveExecutions" @next="openExecutionConfig" />
    <AutomationExecutionCaseModal
      ref="executionCaseModalRef"
      @back="reopenExecutionCaseSelect"
      @batch-update="onBatchUpdate"
      @batch-created="onBatchCreated"
      @started="onCaseExecutionStarted"
      @scene-start="startSceneExecution"
      @startup-failed="onSceneStartupFailed"
      @success="refresh"
    />
    <AutomationExecutionResultDrawer ref="executionResultDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import { onMounted } from 'vue'
import { Message, type TableInstance } from '@arco-design/web-vue'
import AutomationUiSceneAddModal from './AutomationUiSceneAddModal.vue'
import ChromeRecordingModal from './ChromeRecordingModal.vue'
import AutomationExecutionCaseSelectModal from './AutomationExecutionCaseSelectModal.vue'
import AutomationExecutionCaseModal from './AutomationExecutionCaseModal.vue'
import AutomationExecutionResultDrawer from './AutomationExecutionResultDrawer.vue'
import {
  type AutomationUiSceneQuery,
  type AutomationUiSceneResp,
  clearAutomationUiSceneResults,
  deleteAutomationUiScene,
  exportAllAutomationUiSceneXml,
  exportAutomationUiScene,
  exportAutomationUiSceneXml,
} from '@/apis/automation/automationUiScene'
import {
  AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
  type AutomationUiSceneSummaryQuery,
  getAutomationUiSceneSummaries,
  getAutomationUiSceneSummaryPage,
} from '@/apis/automation/automationUiQuery'
import { type SceneExecutionProgress, liveSceneProgress, mapDebugSceneSummary, queuedSceneProgress, withSceneExecutionProgress } from '../sceneSummary'
import { type ExecutionRun, createExecutionRun } from '../executionRun'
import { useResetReactive, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import { GiCellTag, GiCellTags } from '@/components/GiCell'
import type { ColumnItem } from '@/components/GiForm'
import { useUiStore } from '@/stores/modules/uiStore'
import { formatDuration } from '@/utils/sakura'
import { createAutomationUiExecutionRun, finishAutomationUiExecutionRun, cancelAutomationUiExecutionRun } from '@/apis/automation/automationPlaywrightRunner'
import { filterSceneResultOptions, filterSceneStatusOptions, pickSceneExecuteField } from '@/utils/automationUiSceneStatus'
import {
  type ExecutionCaseOpenOptions,
  type ExecutionContext,
  type LiveExecutionCase,
  type ExecutionType,
  type ExecutionViewType,
  executionTypeOptions,
  executionViewLabels,
  executionStatusColor,
  executionStatusLabel,
  isExecutableCase,
} from '../execution'

defineOptions({ name: 'AutomationUiScene' })

const sceneProps = withDefaults(defineProps<{ liveExecutions?: LiveExecutionCase[] }>(), { liveExecutions: () => [] })

const emit = defineEmits<{
  (e: 'update-scene', record: any): void
  (e: 'open-history', sceneId: string): void
  (e: 'execute-scene', record: any, executionType: ExecutionType): void
  (e: 'execute-scenes', records: any[], executionType: ExecutionType): void
  (e: 'execute-all-scenes', records: any[], query: any, executionType: ExecutionType): void
  (e: 'execution-started', sceneId?: string): void
  (e: 'batch-update', rows: LiveExecutionCase[]): void
  (e: 'run-update', run: ExecutionRun): void
  (e: 'run-started', runId: string): void
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
  moduleIds: undefined,
  level: undefined,
  executeStatus: undefined,
  executeResult: undefined,
  status: undefined,
  createUser: undefined,
  updateUser: undefined,
  createTime: [],
  sort: ['sceneId,asc', 'createTime,asc'],
})

const loadSceneSummaryPage = async (page: { page: number, size: number }) => {
  const response = await getAutomationUiSceneSummaryPage({
    ...queryForm,
    ...page,
    recordSource: 'debug',
  })
  return {
    data: {
      list: (response.data?.list || []).map(mapDebugSceneSummary),
      total: response.data?.total || 0,
    },
  } as ApiRes<PageRes<AutomationUiSceneResp[]>>
}

const {
  tableData,
  loading,
  pagination,
  search,
  refresh,
  select,
  selectAll,
  selectedKeys,
  handleDelete,
  handleExport,
} = useTable<AutomationUiSceneResp>(loadSceneSummaryPage, { immediate: false })

const sceneProgress = reactive(new Map<string, SceneExecutionProgress>())
const displayTableData = computed(() => tableData.value.map((scene) => withSceneExecutionProgress(scene, sceneProgress.get(String(scene.id)))))

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

const isPlaywrightRecordingScene = (record: any) => {
  const caseList = Array.isArray(record?.caseList) ? record.caseList : []
  return caseList.some((caseItem: any) => {
    const stepList = Array.isArray(caseItem?.stepList) ? caseItem.stepList : []
    return stepList.some((step: any) => {
      const configList = Array.isArray(step?.configList) ? step.configList : []
      return configList.some((config: any) => {
        const name = String(config?.paramsName || '')
        const value = String(config?.paramsValue || '')
        return name === 'playwright_step'
          || (name === 'source' && ['sakura-playwright', 'sakura-cuecast'].includes(value))
      })
    })
  })
}

const columns: TableInstance['columns'] = [
  { title: '场景 ID', dataIndex: 'sceneId', slotName: 'sceneId', width: 200, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '场景名称', dataIndex: 'name', slotName: 'name', width: 360, ellipsis: true, tooltip: true },
  { title: '版本', dataIndex: 'versionName', slotName: 'versionName', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  { title: '等级', dataIndex: 'level', slotName: 'level', width: 80, ellipsis: true, tooltip: true, align: 'center' },
  {
    title: '标签',
    dataIndex: 'tags',
    slotName: 'tags',
    width: 100,
    align: 'center',
    render: ({ record }) => Array.isArray(record.tags) ? <GiCellTags data={record.tags} /> : '-',
  },
  // {
  //   title: '来源',
  //   dataIndex: 'recordingSource',
  //   width: 110,
  //   align: 'center',
  //   render: ({ record }) => isPlaywrightRecordingScene(record) ? <a-tag color="arcoblue">Playwright</a-tag> : '-',
  // },
  {
    title: '执行状态',
    dataIndex: 'debugRecord[0].executeStatus',
    slotName: 'executeStatus',
    width: 100,
    align: 'center',
    render: ({ record }) => {
      if (record.__localExecutionStatus) {
        const status = record.__localExecutionStatus
        return (
          <a-tag color={status === 'startup-failed' ? 'red' : executionStatusColor(status)}>
            {status === 'startup-failed' ? '启动失败' : executionStatusLabel(status)}
          </a-tag>
        )
      }
      const value = pickSceneExecuteField(record, 'executeStatus', status_type.value, 'debug')
      // 取消的实时态与落库字典态使用同一颜色，不能在轮询后从橙色跳回灰色。
      if (value === '17') return <a-tag color={executionStatusColor(value)}>{executionStatusLabel(value)}</a-tag>
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
      if (value === '17') return <a-tag color={executionStatusColor(value)}>{executionStatusLabel(value)}</a-tag>
      return value ? <GiCellTag value={value} dict={status_type.value} /> : '-'
    },
  },
  {
    title: '通过率',
    dataIndex: 'debugRecord[0].scenePassRate',
    slotName: 'scenePassRate',
    width: 90,
    align: 'center',
    render: ({ record }) => {
      const latest = Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0] : {}
      return latest.scenePassRate || latest.casePassRate || record.passRate || '-'
    },
  },
  {
    title: '耗时',
    width: 120,
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
    width: has.hasPermOr(['automation:automationUiScene:get', 'automation:automationUiScene:update', 'automation:automationUiScene:copy', 'automation:automationUiScene:execute', 'automation:automationUiScene:delete', 'automation:automationUiScene:export']) ? 250 : undefined,
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
  uiStore.moduleId = uiStore.resolveDefaultModuleId(uiStore.treeList)
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
  queryForm.moduleId = undefined
  queryForm.moduleIds = uiStore.getSceneModuleIds(newModuleId)
  // 编辑场景 tab 可能因加载模块树更新 moduleId；列表未激活时不能因此重置历史页码。
  if (uiStore.activeKey === '0') search()
})

watch(() => uiStore.activeKey, (activeKey, previousKey) => {
  if (activeKey === '0' && previousKey && previousKey !== '0') refresh()
})

// useTable 的自动请求早于上面的 immediate watch，首次请求必须等版本条件同步后再发起。
onMounted(() => {
  search()
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

const resolveExecutionType = (value: string | number | Record<string, any> | undefined) => {
  const executionType = String(value || '') as ExecutionType
  return executionTypeOptions.some(item => item.value === executionType) ? executionType : undefined
}

const isEnabledScene = (scene: Pick<AutomationUiSceneResp, 'status'>) => Number(scene.status) === 1

const filterEnabledScenes = (records: AutomationUiSceneResp[]) => {
  const enabledRecords = records.filter(isEnabledScene)
  if (enabledRecords.length !== records.length) {
    Message.warning(`已跳过 ${records.length - enabledRecords.length} 个禁用场景`)
  }
  return enabledRecords
}

const onBatchExecute = async (executionType: ExecutionType) => {
  const selected = new Set(selectedKeys.value.map(String))
  const records = tableData.value.filter(record => selected.has(String(record.id)))
  // 跨页勾选时补查场景状态，避免表格当前页之外的禁用场景进入执行请求。
  const missingIds = [...selected].filter(id => !records.some(record => String(record.id) === id))
  if (missingIds.length) {
    try {
      const chunks = Array.from(
        { length: Math.ceil(missingIds.length / AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT) },
        (_, index) => missingIds.slice(
          index * AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
          (index + 1) * AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
        ),
      )
      const responses = await Promise.all(chunks.map(ids => getAutomationUiSceneSummaries(ids)))
      records.push(...responses.flatMap(({ data }) => (data || []).map(mapDebugSceneSummary)))
    } catch (error: any) {
      Message.error(error?.message || '读取所选场景状态失败，请刷新后重试')
      return
    }
  }
  const enabledRecords = filterEnabledScenes(records)
  if (!enabledRecords.length) {
    Message.warning('所选场景均已禁用，无法执行')
    return
  }
  if (executionType === 'jenkins') {
    emit('execute-scenes', enabledRecords, executionType)
    return
  }
  await beginQueuedCaseExecution(enabledRecords, executionType, true)
}

const loadSummaryRows = async (query: AutomationUiSceneSummaryQuery, loadAll: boolean) => {
  const records: AutomationUiSceneResp[] = []
  let page = 1
  const size = loadAll ? 50 : 1
  let total = 0
  do {
    const response = await getAutomationUiSceneSummaryPage({
      ...query,
      page,
      size,
      recordSource: 'debug',
    })
    const pageRows = (response.data?.list || []).map(mapDebugSceneSummary)
    total = response.data?.total || 0
    records.push(...pageRows)
    if (!loadAll || records.length >= total) break
    if (records.length >= 10_000) {
      throw new Error('当前筛选结果超过 10000 条，请缩小范围后执行')
    }
    page += 1
  } while (records.length < total)
  return records
}

const onExecuteAll = async (executionType: ExecutionType) => {
  const targetQuery = {
    ...queryForm,
    projectId: uiStore.projectId,
    versionId: queryForm.versionId || uiStore.versionId,
    status: 1,
  }
  try {
    // Jenkins 全部执行由服务端按查询条件选场景，前端只读取首条摘要用于环境配置展示。
    const records = filterEnabledScenes(await loadSummaryRows(targetQuery, executionType !== 'jenkins'))
    if (!records.length) {
      Message.warning('当前范围内没有可执行场景')
      return
    }
    if (executionType === 'jenkins') {
      emit('execute-all-scenes', records, targetQuery, executionType)
      return
    }
    void beginQueuedCaseExecution(records, executionType)
  } catch (error: any) {
    Message.error(error?.message || '读取场景摘要失败，请缩小范围后重试')
  }
}

const onBatchExecutionSelect = (value: string | number | Record<string, any> | undefined) => {
  const executionType = resolveExecutionType(value)
  if (executionType) void onBatchExecute(executionType)
}

const onExecuteAllSelect = (value: string | number | Record<string, any> | undefined) => {
  const executionType = resolveExecutionType(value)
  if (executionType) void onExecuteAll(executionType)
}

const onClearResults = async () => {
  const sceneIds = selectedKeys.value.map(String)
  return handleDelete(async () => {
    const response = await clearAutomationUiSceneResults({ sceneIds })
    if (response.success) sceneIds.forEach((id) => sceneProgress.delete(id))
    return response
  }, {
    content: '确认清空所选场景的执行结果吗？',
    successTip: '清空成功',
    showModal: true,
    multiple: true,
  })
}

interface AutomationUiSceneAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
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
const onOpenHistory = (record: AutomationUiSceneResp) => {
  emit('open-history', String(record.id))
}
const onExecute = (record: AutomationUiSceneResp, executionType: ExecutionType) => {
  emit('execute-scene', record, executionType)
}

const executionViewOptions = (Object.entries(executionViewLabels) as Array<[ExecutionViewType, string]>).map(([value, label]) => ({
  value,
  label,
}))
interface ExecutionCaseSelection extends ExecutionContext {
  scene: any
  executionType: Exclude<ExecutionType, 'jenkins'>
  caseIds: string[]
  sceneIds?: string[]
}
interface SceneExecutionStart extends ExecutionCaseSelection {
  projectEnvironmentId: string
  runnerOptions?: ExecutionCaseOpenOptions['runnerOptions']
  cdpOptions?: ExecutionCaseOpenOptions['cdpOptions']
}

const executionCaseSelectModalRef = ref<{
  onOpen: (
    record: any,
    type: Exclude<ExecutionType, 'jenkins'>,
    options?: ExecutionCaseOpenOptions,
  ) => void
}>()
const executionCaseModalRef = ref<{
  cancelBatch: () => Promise<void>
  onOpen: (
    record: any,
    type: Exclude<ExecutionType, 'jenkins'>,
    options?: ExecutionCaseOpenOptions,
  ) => Promise<boolean>
}>()
const executionResultDrawerRef = ref<{
  onOpen: (sceneId: string, type: ExecutionType, view: ExecutionViewType) => void
}>()

const onExecutionSelect = (record: AutomationUiSceneResp, value: string | number | Record<string, any> | undefined) => {
  const type = resolveExecutionType(value)
  if (!type) return
  if (type === 'jenkins') {
    onExecute(record, type)
    return
  }
  if (sceneExecutionRunning.value) {
    Message.warning('当前场景队列正在执行，请等待完成或取消后再执行')
    return
  }
  queuedSceneIds.value = [String(record.id)]
  executionCaseSelectModalRef.value?.onOpen(record, type)
}

const sceneExecutionRunning = ref(false)
const queuedSceneIds = ref<string[]>([])
const activeQueuedSceneId = ref('')
const currentExecutionRun = ref<ExecutionRun>()

function publishExecutionRun() {
  const run = currentExecutionRun.value
  if (!run) return
  run.scenes = run.scenes.map((scene) => ({ ...scene, ...sceneProgress.get(scene.sceneDbId) }))
  emit('run-update', { ...run, scenes: run.scenes.map((scene) => ({ ...scene })) })
}

async function cancelExecutionRun(runId: string) {
  const run = currentExecutionRun.value
  if (!run || run.id !== runId || run.finishedAt) return
  run.cancelRequested = true
  run.scenes.forEach((scene) => {
    const progress = sceneProgress.get(scene.sceneDbId)
    if (progress?.executeStatus === 'queued') {
      progress.executeStatus = 'cancelled'
      progress.executeResult = 'cancelled'
    }
  })
  publishExecutionRun()
  await executionCaseModalRef.value?.cancelBatch()
  if (run.serverRunId) await cancelAutomationUiExecutionRun(run.serverRunId)
}

const beginQueuedCaseExecution = async (
  records: AutomationUiSceneResp[],
  executionType: Exclude<ExecutionType, 'jenkins'>,
  sortScenes = false,
) => {
  if (sceneExecutionRunning.value) {
    Message.warning('当前场景队列正在执行，请等待完成或取消后再执行')
    return
  }
  if (!records.length) {
    Message.warning('当前范围内没有可执行场景')
    return
  }
  // 批量入口已经拿到场景摘要；选择弹窗只需要场景标识和执行状态，
  // definition 延迟到真正启动某个场景时加载，避免按场景逐条请求 definition。
  let executionScenes = records.map((record) => ({
    ...record,
    __projectedDefinition: true,
    __caseTotal: Number(record.caseTotal || 0),
    caseList: [],
  })) as AutomationUiSceneResp[]
  executionScenes = filterEnabledScenes(executionScenes)
  if (sortScenes) executionScenes.sort((left, right) => left.sceneId.localeCompare(right.sceneId))
  if (!executionScenes.length) {
    Message.warning('当前范围内没有可执行场景')
    return
  }
  executionCaseSelectModalRef.value?.onOpen(buildSceneSelectionRecord(executionScenes), executionType, {
    sceneSelection: true,
    // 批量/全部入口已经确定执行范围，和测试计划保持只读确认交互，避免二次勾选改变范围。
    selectionDisabled: true,
    sceneSelectionSummary: '本次将执行当前范围内的',
  })
}

const buildSceneSelectionRecord = (records: AutomationUiSceneResp[]) => ({
  ...records[0],
  // 复用测试计划的场景选择弹窗，但 UI 场景执行仍按场景分别建立执行批次。
  __sceneAggregate: true,
  __planScenes: records,
})

const queueSelectedScenes = (payload: ExecutionCaseSelection) => {
  const selectedSceneKeys = new Set((payload.sceneIds || []).map(String))
  const selectedScenes = (Array.isArray(payload.scene?.__planScenes) ? payload.scene.__planScenes : [])
    .filter((scene: AutomationUiSceneResp) => selectedSceneKeys.has(String(scene.sceneId || scene.id)))
  if (!selectedScenes.length) {
    Message.warning('请选择至少一个可执行场景')
    return
  }
  executionCaseModalRef.value?.onOpen(
    buildSceneSelectionRecord(selectedScenes),
    payload.executionType,
    sceneExecutionOptions(selectedScenes[0]),
  )
}

const sceneExecutionOptions = (scene: any): ExecutionCaseOpenOptions => ({
  caseIds: scene.__projectedDefinition
    ? []
    : (Array.isArray(scene.caseList) ? scene.caseList : []).filter(isExecutableCase).map((item) => String(item.id)),
  selectAllCases: Boolean(scene.__projectedDefinition),
  expectedDefinitionVersion: Number(scene.definitionVersion || 0) || undefined,
})

const startSceneExecution = async (payload: SceneExecutionStart) => {
  if (sceneExecutionRunning.value) return
  const scenes: AutomationUiSceneResp[] = payload.scene.__planScenes
  sceneExecutionRunning.value = true
  queuedSceneIds.value = scenes.map((scene) => String(scene.id))
  scenes.forEach((scene) => sceneProgress.set(String(scene.id), queuedSceneProgress(scene)))
  currentExecutionRun.value = createExecutionRun(scenes, payload.executionType)
  publishExecutionRun()
  emit('run-started', currentExecutionRun.value.id)
  try {
    const { data } = await createAutomationUiExecutionRun({
      sceneIds: scenes.map(scene => String(scene.id)),
      projectEnvironmentId: payload.projectEnvironmentId,
      executionType: payload.executionType,
    })
    if (!data?.runId) throw new Error('未取得服务端执行任务，请更新 Admin 后重试')
    currentExecutionRun.value.serverRunId = data.runId
    publishExecutionRun()
    // 一次确认后复用相同配置，等待当前场景真正结束再启动下一场景；取消或启动失败即停止队列。
    for (const scene of scenes) {
      if (currentExecutionRun.value.cancelRequested) break
      activeQueuedSceneId.value = String(scene.id)
      const progress = sceneProgress.get(activeQueuedSceneId.value) || queuedSceneProgress(scene)
      progress.executeStatus = 'starting'
      sceneProgress.set(activeQueuedSceneId.value, progress)
      publishExecutionRun()
      const completed = await executionCaseModalRef.value?.onOpen(scene, payload.executionType, {
        runId: currentExecutionRun.value.serverRunId,
        ...sceneExecutionOptions(scene),
        projectEnvironmentId: payload.projectEnvironmentId,
        runnerOptions: payload.runnerOptions,
        cdpOptions: payload.cdpOptions,
        autoStart: true,
        shouldCancel: () => Boolean(currentExecutionRun.value?.cancelRequested),
      })
      if (!completed) break
    }
  } catch (error: any) {
    Message.error(error?.message || '创建执行任务失败，本次执行已停止')
  } finally {
    const run = currentExecutionRun.value
    if (run.serverRunId) {
      const failed = [...sceneProgress.entries()].find(([id, progress]) => queuedSceneIds.value.includes(id) && progress.executeStatus === 'startup-failed')
      await finishAutomationUiExecutionRun(run.serverRunId, failed?.[0]).catch(() => Message.error('执行任务收尾失败，请在历史记录中重试取消未启动场景'))
    }
    // 未启动的后续场景也要结束本地排队状态，不能永久显示等待或还原成上次成功。
    queuedSceneIds.value.forEach((id) => {
      const progress = sceneProgress.get(id)
      if (progress && ['queued', 'starting'].includes(progress.executeStatus)) {
        progress.executeStatus = 'cancelled'
        progress.executeResult = 'cancelled'
      }
    })
    activeQueuedSceneId.value = ''
    currentExecutionRun.value.finishedAt = Date.now()
    publishExecutionRun()
    sceneExecutionRunning.value = false
    queuedSceneIds.value = []
  }
}

const onCaseExecutionStarted = () => {
  // 后续场景在后台推进，不能反复切换到历史页打断用户查看列表实时状态。
  if (sceneExecutionRunning.value) return
  emit('execution-started', queuedSceneIds.value.length === 1 ? queuedSceneIds.value[0] : undefined)
}

const onBatchUpdate = (rows: LiveExecutionCase[]) => {
  const groups = new Map<string, LiveExecutionCase[]>()
  rows.filter((item) => item.sceneKey && (item.recordSource || 'debug') === 'debug').forEach((item) => {
    const id = String(item.sceneKey)
    const items = groups.get(id) || []
    items.push(item)
    groups.set(id, items)
  })
  groups.forEach((items, id) => {
    const previous = sceneProgress.get(id)
    const requestedAt = previous && ((!previous.batchId && ['queued', 'starting'].includes(previous.executeStatus)) || previous.batchId === items[0].batchId)
      ? previous.requestedAt
      : Date.now()
    sceneProgress.set(id, liveSceneProgress(items, requestedAt))
  })
  if (sceneExecutionRunning.value) publishExecutionRun()
  emit('batch-update', rows)
}

const onBatchCreated = ({ sceneDbId, batchId }: { sceneDbId: string, batchId: string }) => {
  const progress = sceneProgress.get(sceneDbId)
  if (!progress || !sceneExecutionRunning.value) return
  progress.batchId = batchId
  publishExecutionRun()
}

const onSceneStartupFailed = (error: string) => {
  const progress = sceneProgress.get(activeQueuedSceneId.value)
  if (!progress || progress.batchId) return
  progress.executeStatus = 'startup-failed'
  progress.error = error
  publishExecutionRun()
}

function openExecutionConfig(payload: ExecutionCaseSelection) {
  if (payload.scene?.__sceneAggregate) {
    queueSelectedScenes(payload)
    return
  }
  executionCaseModalRef.value?.onOpen(payload.scene, payload.executionType, {
    caseIds: payload.caseIds,
    recordSource: payload.recordSource,
    testPlanId: payload.testPlanId,
  })
}

function reopenExecutionCaseSelect(payload: ExecutionCaseSelection) {
  executionCaseSelectModalRef.value?.onOpen(payload.scene, payload.executionType, {
    caseIds: payload.caseIds,
    recordSource: payload.recordSource,
    testPlanId: payload.testPlanId,
    sceneSelection: Boolean(payload.scene?.__sceneAggregate),
    selectionDisabled: Boolean(payload.scene?.__sceneAggregate),
    sceneSelectionSummary: payload.scene?.__sceneAggregate ? '本次将执行当前范围内的' : undefined,
  })
}

const openExecutionResult = (record: AutomationUiSceneResp, type: ExecutionType, view: ExecutionViewType) => {
  executionResultDrawerRef.value?.onOpen(record.id, type, view)
}

const chromeRecordingModalRef = ref<{ onOpen: (record?: AutomationUiSceneResp) => void }>()

const onChromeRecord = (record?: AutomationUiSceneResp) => {
  chromeRecordingModalRef.value?.onOpen(record)
}

defineExpose({
  reset,
  search,
  refresh,
  cancelExecutionRun,
})
</script>

<script lang="tsx">
export default {}
</script>

<style scoped lang="scss">
.automation-ui-scene {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  padding: 20px;
  overflow: hidden;

  :deep(.gi-table) {
    min-height: 0;
  }
}

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
