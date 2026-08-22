<template>
  <GiPageLayout
    ref="pageLayoutRef"
    :default-collapsed="true"
    :margin="false"
    :padding="false"
    :left-style="{ width: 280 }"
    class="test-plan-scene-workspace"
  >
    <template #left>
      <div class="workspace-left">
        <a-select
          :model-value="toIdString(plan.id)"
          size="small"
          class="plan-select"
          :options="planOptions"
          placeholder="请选择测试计划"
          allow-search
          :fallback-option="false"
          @change="onPlanChange"
        />
        <div class="workspace-tree-wrap">
          <GiTree
            ref="giTreeRef"
            title="功能模块"
            :searchable="false"
            :tree-data="displayTreeList"
            :loading="treeLoading"
            :selected-keys="selectedKeys"
            :multiple="false"
            :check-strictly="true"
            :draggable="false"
            @update:selected-keys="(val) => (selectedKeys = val)"
            @node-click="onNodeClick"
          >
            <template #right-menu />
          </GiTree>
        </div>
        <div class="workspace-tree-search-wrap">
          <a-input
            v-model="treeKeyword"
            size="small"
            class="workspace-tree-search"
            allow-clear
            :maxlength="20"
            placeholder="请输入关键词"
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </div>
      </div>
    </template>

    <div class="scene-workspace-body">
      <div class="scene-type-bar">
        <button
          type="button"
          class="scene-type-bar__item"
          :class="{ 'scene-type-bar__item--active': activeWorkspaceView === 'scenes' }"
          @click="showScenes"
        >
          UI 自动化测试
        </button>
        <button
          v-if="historyTabOpen"
          type="button"
          class="scene-type-bar__item"
          :class="{ 'scene-type-bar__item--active': activeWorkspaceView === 'history' }"
          @click="openAllHistory"
        >
          <span>执行历史</span>
          <span
            class="scene-type-bar__close"
            title="关闭执行历史"
            @click.stop="closeHistoryTab"
          >
            <icon-close />
          </span>
        </button>
      </div>

      <GiTable
        v-if="activeWorkspaceView === 'scenes'"
        v-model:selected-keys="tableSelectedKeys"
        class="scene-table"
        size="medium"
        title=""
        row-key="id"
        :data="allScenes"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: '100%', y: '100%'}"
        :row-selection="{ type: 'checkbox', showCheckedAll: true }"
        :show-selection-alert="true"
        :selection-message="`已选择 ${tableSelectedKeys.length} 条记录`"
        @select="onSelect"
        @select-all="onSelectAll"
        @refresh="fetchSceneList"
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
            :search-on-change="!workspaceInitializing"
            @search="onFormSearch"
            @reset="resetQuery"
          />
        </template>

        <template #toolbar-left>
          <a-button type="primary" @click="emit('relate')">
            <template #icon><icon-plus /></template>
            关联测试场景
          </a-button>
        </template>

        <template #toolbar-right>
          <a-button
            status="danger"
            :disabled="!tableSelectedKeys.length"
            @click="onBatchRemove"
          >
            <template #icon><icon-delete /></template>
            批量删除
          </a-button>
          <a-dropdown trigger="click" @select="onBatchExecutionSelect">
            <a-button type="primary" :disabled="!tableSelectedKeys.length">
              <template #icon><icon-select-all /></template>
              批量执行
            </a-button>
            <template #content>
              <a-doption v-for="item in executionTypeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-doption>
            </template>
          </a-dropdown>
          <a-dropdown trigger="click" @select="onExecuteAllSelect">
            <a-button type="primary" status="success">
              <template #icon><icon-play-arrow /></template>
              执行所有
            </a-button>
            <template #content>
              <a-doption v-for="item in executionTypeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-doption>
            </template>
          </a-dropdown>
        </template>

        <template #executeStatus="{ record }">
          <GiCellTag
            v-if="pickPlanExecuteField(record, 'executeStatus')"
            :value="pickPlanExecuteField(record, 'executeStatus')"
            :dict="status_type"
          />
          <span v-else>-</span>
        </template>
        <template #executeResult="{ record }">
          <GiCellTag
            v-if="pickPlanExecuteField(record, 'executeResult')"
            :value="pickPlanExecuteField(record, 'executeResult')"
            :dict="status_type"
          />
          <span v-else>-</span>
        </template>
        <template #sceneAction="{ record }">
          <a-space>
            <a-link @click="onRemoveOne(record)">删除</a-link>
            <a-dropdown trigger="click" @select="value => onExecuteOne(record, value)">
              <a-link>执行</a-link>
              <template #content>
                <a-doption v-for="item in executionTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-doption>
              </template>
            </a-dropdown>
            <a-link @click="openSceneHistory(record)">历史</a-link>
            <a-link @click="openLink(record, 'consoleUrl', '获取控制台日志失败，请先执行场景')">日志</a-link>
            <a-link @click="openLink(record, 'testReportUrl', '获取测试报告失败，请先执行场景')">报告</a-link>
            <a-link @click="openLink(record, 'videoUrl', '获取测试视频失败，请先执行场景')">回放</a-link>
          </a-space>
        </template>
      </GiTable>

      <div v-else class="plan-history-view">
        <AutomationExecutionHistoryPanel
          class="plan-history-panel"
          :scenes="displayHistoryScenes"
          :execution-batches="displayHistoryBatches"
          :execution-page="historyExecutionPage"
          :execution-page-size="historyExecutionPageSize"
          :execution-total="historyExecutionTotal"
          :load-execution-page="historySceneKey !== ALL_HISTORY_SCENES ? loadHistoryExecutionPage : undefined"
          :load-execution-cases="loadHistoryExecutionCases"
          :load-execution-steps="loadHistoryExecutionSteps"
          :load-execution-step-detail="loadHistoryExecutionStepDetail"
          :loading="historyLoading"
          record-source="test"
          :test-plan-id="toIdString(plan.id)"
          :multi-scene="historySceneKey === ALL_HISTORY_SCENES"
          aggregate-plan-batches
          :scene-filter-value="historySceneKey"
          :scene-filter-options="historySceneOptions"
          :live-executions="liveExecutions"
          @scene-change="onHistorySceneChange"
          @cancel-batch="cancelHistoryBatch"
          @cancel-case="cancelHistoryCase"
          @refresh="fetchHistoryScenes(true)"
        />
      </div>
    </div>
  </GiPageLayout>
</template>

<script setup lang="tsx">
import { Message, Modal, type TableInstance } from '@arco-design/web-vue'
import type { TestPlanResp } from '@/apis/test/testPlan'
import { cancelTestPlanExecution, getTestPlan, removeTestPlanScenes } from '@/apis/test/testPlan'
import {
  cancelAutomationPlaywrightBatch,
  cancelAutomationPlaywrightBatchCase,
} from '@/apis/automation/automationPlaywrightRunner'
import {
  AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
  type AutomationUiSceneSummary,
  getAutomationUiExecution,
  getAutomationUiExecutionCases,
  getAutomationUiExecutions,
  getAutomationUiExecutionRevisionsBatched,
  getAutomationUiExecutionStep,
  getAutomationUiExecutionSteps,
  getAutomationUiSceneSummaries,
} from '@/apis/automation/automationUiQuery'
import AutomationExecutionHistoryPanel from '@/views/automation/automationUiScene/components/AutomationExecutionHistoryPanel.vue'
import {
  type ExecutionType,
  type ExecutionHistoryBatchRow,
  type ExecutionHistoryCaseRow,
  type ExecutionHistoryStepRow,
  type LiveExecutionCase,
  buildLayeredExecutionBatchRow,
  buildLayeredExecutionCaseRow,
  buildLayeredExecutionStepRow,
  applyLayeredExecutionStepDetail,
  executionTypeOptions,
} from '@/views/automation/automationUiScene/execution'
import { mapWithConcurrency, requestOnce } from '@/views/automation/automationUiScene/queryCache'
import { useUiStore } from '@/stores/modules/uiStore'
import type { TreeCateItem } from '@/stores/modules/uiStore'
import { useDict } from '@/hooks/app'
import { usePagination } from '@/hooks/modules/usePagination'
import { useResetReactive } from '@/hooks'
import type { ColumnItem } from '@/components/GiForm'
import type { LabelValueState } from '@/types/global'
import { GiCellTag, GiCellTags } from '@/components/GiCell'
import { formatDuration } from '@/utils/sakura'
import { useRouter } from 'vue-router'
import {
  filterSceneResultOptions,
  filterSceneStatusOptions,
  pickSceneExecuteField,
} from '@/utils/automationUiSceneStatus'
import { toIdStringList } from '@/utils/id'
import {
  initUiStoreForPlan,
  loadModuleTree,
  resolveVersionId,
  toIdString,
} from '../utils/projectContext'

defineOptions({ name: 'TestPlanSceneWorkspace' })

export type PlanSceneRow = AutomationUiSceneResp & { planRecord?: Record<string, any> }

const props = defineProps<{
  plan: TestPlanResp
  planOptions: LabelValueState[]
  liveExecutions?: LiveExecutionCase[]
}>()
const router = useRouter()

const emit = defineEmits<{
  (e: 'relate'): void
  (e: 'batch-execute', rows: PlanSceneRow[], executionType: ExecutionType): void
  (e: 'execute-all', executionType: ExecutionType): void
  (e: 'execute-one', row: PlanSceneRow, executionType: ExecutionType): void
  (e: 'refresh'): void
  (e: 'switch-plan', planId: string): void
}>()

const uiStore = useUiStore()
const { scene_level, status_type } = useDict('scene_level', 'status_type')

const giTreeRef = ref()
const selectedKeys = ref<string[]>([])
const moduleId = ref('')
const treeList = ref<TreeCateItem[]>([])
const treeKeyword = ref('')
const treeLoading = ref(false)
const loading = ref(false)
const allScenes = ref<PlanSceneRow[]>([])
const tableSelectedKeys = ref<Array<string | number>>([])
const projectIdStr = ref('')
const versionIdStr = ref('')
const planSceneIds = ref<string[]>([])
const planSceneRowsCache = shallowRef<PlanSceneRow[]>([])
const workspaceInitializing = ref(false)
let planSceneRowsCacheKey = ''
let sceneListGeneration = 0
let sceneListController: AbortController | undefined

const [queryForm, resetForm] = useResetReactive({
  sceneId: undefined as string | undefined,
  name: undefined as string | undefined,
  versionId: undefined as string | undefined,
  level: undefined as string | undefined,
  executeStatus: undefined as string | undefined,
  executeResult: undefined as string | undefined,
  createUser: undefined as string | undefined,
  updateUser: undefined as string | undefined,
  createTime: undefined as string[] | undefined,
})

const queryGridProps = { cols: 24, colGap: 16, rowGap: 0 }
const queryFieldSpan = { xs: 24, sm: 8, xxl: 8 }

const queryFormColumns = computed<ColumnItem[]>(() => [
  { type: 'input', label: '场景 ID', field: 'sceneId', span: queryFieldSpan, props: { allowClear: true } },
  { type: 'input', label: '场景名称', field: 'name', span: queryFieldSpan, props: { allowClear: true } },
  {
    type: 'select',
    label: '场景版本',
    field: 'versionId',
    span: queryFieldSpan,
    props: { options: uiStore.versionList, allowClear: true },
  },
  { type: 'select', label: '场景等级', field: 'level', span: queryFieldSpan, props: { options: scene_level.value, allowClear: true } },
  {
    type: 'select',
    label: '执行状态',
    field: 'executeStatus',
    span: queryFieldSpan,
    props: { options: filterSceneStatusOptions(status_type.value), allowClear: true },
  },
  {
    type: 'select',
    label: '执行结果',
    field: 'executeResult',
    span: queryFieldSpan,
    props: { options: filterSceneResultOptions(status_type.value), allowClear: true },
  },
  {
    type: 'select',
    label: '创建人',
    field: 'createUser',
    span: queryFieldSpan,
    foldable: true,
    props: { options: uiStore.userList, allowClear: true },
  },
  {
    type: 'select',
    label: '责任人',
    field: 'updateUser',
    span: queryFieldSpan,
    foldable: true,
    props: { options: uiStore.userList, allowClear: true },
  },
  {
    type: 'range-picker',
    label: '创建时间',
    field: 'createTime',
    span: queryFieldSpan,
    foldable: true,
    props: { showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
  },
])

const columns: TableInstance['columns'] = [
  { title: '场景 ID', dataIndex: 'sceneId', width: 170, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '场景名称', dataIndex: 'name', width: 330, ellipsis: true, tooltip: true },
  { title: '场景版本', dataIndex: 'versionName', width: 120, align: 'center', ellipsis: true, tooltip: true },
  { title: '场景等级', dataIndex: 'level', width: 90, align: 'center' },
  {
    title: '标签',
    dataIndex: 'tags',
    width: 100,
    align: 'center',
    render: ({ record }) => (Array.isArray(record.tags) ? <GiCellTags data={record.tags} /> : '-'),
  },
  { title: '执行状态', dataIndex: 'executeStatus', slotName: 'executeStatus', width: 90, align: 'center' },
  { title: '执行结果', dataIndex: 'executeResult', slotName: 'executeResult', width: 100, align: 'center' },
  { title: '通过率', dataIndex: 'scenePassRate', width: 90, align: 'center', render: ({ record }) => record.planRecord?.scenePassRate ?? '-' },
  {
    title: '运行耗时',
    dataIndex: 'duration',
    width: 90,
    align: 'center',
    render: ({ record }) => formatDuration(record.planRecord?.duration ?? '-'),
  },
  { title: '用例数', dataIndex: 'caseTotal', width: 80, align: 'center', render: ({ record }) => record.planRecord?.caseTotal ?? '-' },
  { title: '通过', dataIndex: 'casePass', width: 70, align: 'center', render: ({ record }) => record.planRecord?.casePass ?? '-' },
  { title: '失败', dataIndex: 'caseFail', width: 70, align: 'center', render: ({ record }) => record.planRecord?.caseFail ?? '-' },
  { title: '跳过', dataIndex: 'caseSkip', width: 70, align: 'center', render: ({ record }) => record.planRecord?.caseSkip ?? '-' },
  { title: '步骤数', dataIndex: 'stepTotal', width: 80, align: 'center', render: ({ record }) => record.planRecord?.stepTotal ?? '-' },
  { title: '通过', dataIndex: 'stepPass', width: 70, align: 'center', render: ({ record }) => record.planRecord?.stepPass ?? '-' },
  { title: '失败', dataIndex: 'stepFail', width: 70, align: 'center', render: ({ record }) => record.planRecord?.stepFail ?? '-' },
  { title: '跳过', dataIndex: 'stepSkip', width: 70, align: 'center', render: ({ record }) => record.planRecord?.stepSkip ?? '-' },
  // { title: '创建人', dataIndex: 'createByName', width: 50, align: 'center', render: ({ record }) => record.planRecord?.createByName ?? '-' },
  // { title: '责任人', dataIndex: 'principalName', width: 50, align: 'center', render: ({ record }) => record.planRecord?.principalName ?? '-' },
  { title: '执行人', dataIndex: 'executeName', width: 110, align: 'center', render: ({ record }) => getPlanRecordDisplayValue(record, ['executeName', 'executeUsername', 'executor']) },
  { title: '开始时间', dataIndex: 'startedAt', width: 180, align: 'center', render: ({ record }) => formatPlanSceneDateTime(getPlanRecordDisplayValue(record, ['startedAt', 'durationStartTime'])) },
  { title: '结束时间', dataIndex: 'finishedAt', width: 180, align: 'center', render: ({ record }) => formatPlanSceneDateTime(getPlanRecordDisplayValue(record, ['finishedAt', 'durationEndTime'])) },
  { title: '操作', dataIndex: 'sceneAction', slotName: 'sceneAction', width: 300, align: 'center', fixed: 'right' },
]

const { pagination, setTotal } = usePagination(() => {
  void fetchSceneList()
})

const selectedSceneRows = computed(() =>
  allScenes.value.filter((row) => tableSelectedKeys.value.map(String).includes(String(row.id))),
)

const ALL_HISTORY_SCENES = 'all'
const activeWorkspaceView = ref<'scenes' | 'history'>('scenes')
// 与 UI 自动化模块一致，执行历史仅在跳转查看时创建。
const historyTabOpen = ref(false)
const pageLayoutRef = ref<{ toggleCollapsed: (status?: boolean) => void }>()
const historySceneKey = ref(ALL_HISTORY_SCENES)
const historySceneSummaries = shallowRef<AutomationUiSceneSummary[]>([])
const historyBatches = ref<ExecutionHistoryBatchRow[]>([])
const historyExecutionPage = ref(1)
const historyExecutionPageSize = ref(10)
const historyExecutionTotal = ref(0)
const historyLoading = ref(false)
const historyLoaded = ref(false)
let historyPollTimer: number | undefined
let historyRevision = ''
let historyGeneration = 0
let historyController: AbortController | undefined
const historyScenes = computed(() => historySceneSummaries.value.map(scene => ({
  id: scene.sceneDbId,
  sceneId: scene.sceneKey,
  name: scene.name,
})))
const historySceneOptions = computed(() => [
  { label: '全部场景', value: ALL_HISTORY_SCENES },
  ...historyScenes.value.map(scene => ({
    label: `${scene.sceneId || scene.id} - ${scene.name || '-'}`,
    value: toIdString(scene.id),
  })),
])
const displayHistoryScenes = computed(() => historySceneKey.value === ALL_HISTORY_SCENES
  ? historyScenes.value
  : historyScenes.value.filter(scene => toIdString(scene.id) === historySceneKey.value))
const displayHistoryBatches = computed(() => historySceneKey.value === ALL_HISTORY_SCENES
  ? historyBatches.value
  : historyBatches.value.filter(batch => toIdString(batch.sceneKey) === historySceneKey.value))

const onExecuteOne = (
  record: PlanSceneRow,
  value: string | number | Record<string, any> | undefined,
) => {
  const executionType = String(value || '') as ExecutionType
  if (!executionTypeOptions.some(item => item.value === executionType)) return
  emit('execute-one', record, executionType)
}

const resolveExecutionType = (value: string | number | Record<string, any> | undefined) => {
  const executionType = String(value || '') as ExecutionType
  return executionTypeOptions.some(item => item.value === executionType) ? executionType : undefined
}

const onBatchExecutionSelect = (value: string | number | Record<string, any> | undefined) => {
  const executionType = resolveExecutionType(value)
  if (executionType) emit('batch-execute', selectedSceneRows.value, executionType)
}

const onExecuteAllSelect = (value: string | number | Record<string, any> | undefined) => {
  const executionType = resolveExecutionType(value)
  if (executionType) emit('execute-all', executionType)
}

const onPlanChange = (planId: string | number) => {
  emit('switch-plan', toIdString(planId))
}

const filterTreeByKeyword = (nodes: TreeCateItem[], keyword: string): TreeCateItem[] => {
  const key = keyword.trim().toLowerCase()
  if (!key) return nodes
  const loop = (data: TreeCateItem[]): TreeCateItem[] => {
    const result: TreeCateItem[] = []
    data.forEach((item) => {
      const name = String(item.name || '').toLowerCase()
      const children = item.children?.length ? loop(item.children as TreeCateItem[]) : []
      if (name.includes(key) || children.length) {
        result.push({ ...item, children: children.length ? children : item.children })
      }
    })
    return result
  }
  return loop(nodes)
}

const displayTreeList = computed(() => filterTreeByKeyword(treeList.value, treeKeyword.value))

const getPlanRecordDisplayValue = (record: PlanSceneRow, fields: string[]) => {
  const planRecord = record.planRecord as Record<string, any> | undefined
  const value = fields
    .map((field) => planRecord?.[field])
    .find((item) => item != null && String(item).trim() && String(item).trim() !== '-')
  return value == null ? '-' : String(value)
}

const formatPlanSceneDateTime = (value: string) => {
  if (!value || value === '-') return '-'
  const normalized = value.includes('T') ? value.replace('T', ' ') : value
  return normalized.length > 19 ? normalized.slice(0, 19) : normalized
}

const pickPlanExecuteField = (record: PlanSceneRow, field: 'executeStatus' | 'executeResult') => {
  const planRecord = record.planRecord as Record<string, any> | undefined
  const latestTestRecord = Array.isArray(record.testRecord)
    ? record.testRecord[0] as Record<string, any> | undefined
    : undefined
  const source = planRecord || latestTestRecord || {}
  const raw = field === 'executeStatus'
    ? source.executeStatus ?? source.execute_status ?? source.executionStatus ?? source.execution_status ?? source.status ?? record.executeStatus
    : source.executeResult ?? source.execute_result ?? source.result ?? source.outcome ?? source.lastResult ?? source.last_result ?? record.executeResult
  // 计划列表使用 testRecord；不能回退到 debugRecord，否则计划执行记录会被显示成空值。
  return pickSceneExecuteField({
    ...record,
    testRecord: [{ ...source, [field]: raw }],
  }, field, status_type.value, 'report')
}

const resolveSceneLink = (record: PlanSceneRow, key: string) => {
  const planRecord = record.planRecord as Record<string, any> || {}
  if (key === 'consoleUrl') return planRecord.consoleUrl || ''
  if (key === 'testReportUrl') return planRecord.testReportUrl || ''
  if (key === 'videoUrl') {
    const reportUrl = planRecord.testReportUrl
    if (!reportUrl) return ''
    if (reportUrl.includes('/index.html')) return reportUrl.replace('/index.html', `/video/${record.sceneId}.mp4`)
    return `${reportUrl.replace(/\/$/, '')}/video/${record.sceneId}.mp4`
  }
  return ''
}

const openLink = async (record: PlanSceneRow, key: string, errorMsg: string) => {
  const reportId = record.planRecord?.testReportId || record.planRecord?.reportId || record.reportId
  if (key === 'testReportUrl' && reportId) {
    await router.push({
      path: '/test/testReport',
      query: {
        id: String(reportId),
        testPlanId: toIdString(props.plan.id),
        returnView: 'scene-history',
        sceneId: String(record.sceneId || record.id),
      },
    })
    return
  }
  let url = resolveSceneLink(record, key)
  if (url) {
    window.open(url, '_blank')
    return
  }
  const executionDbId = record.planRecord?.executionDbId
  if (!executionDbId) {
    Message.error(errorMsg)
    return
  }
  // Summary 不携带跳转 URL；用户点击时再读取单条 execution detail，避免列表为每行加载详情。
  const targetWindow = window.open('about:blank', '_blank')
  try {
    const response = await getAutomationUiExecution(executionDbId)
    if (response.data) {
      const planRecord = record.planRecord || (record.planRecord = {})
      planRecord.consoleUrl = response.data.consoleUrl || ''
      planRecord.testReportUrl = response.data.testReportUrl || ''
      planRecord.testReportId = response.data.testReportId || planRecord.testReportId
      if (key === 'testReportUrl' && planRecord.testReportId) {
        await router.push({
          path: '/test/testReport',
          query: {
            id: String(planRecord.testReportId),
            testPlanId: toIdString(props.plan.id),
            returnView: 'scene-history',
            sceneId: String(record.sceneId || record.id),
          },
        })
        targetWindow?.close()
        return
      }
      url = resolveSceneLink(record, key)
    }
    if (!url) throw new Error(errorMsg)
    if (targetWindow) targetWindow.location.replace(url)
    else window.open(url, '_blank')
  } catch {
    targetWindow?.close()
    Message.error(errorMsg)
  }
}

const applyFilter = () => {
  pagination.current = 1
  void fetchSceneList()
}

const onFormSearch = () => {
  if (workspaceInitializing.value) return
  applyFilter()
}

const resetQuery = async () => {
  workspaceInitializing.value = true
  resetForm()
  queryForm.versionId = versionIdStr.value || undefined
  moduleId.value = ''
  uiStore.moduleId = ''
  selectedKeys.value = []
  await nextTick()
  workspaceInitializing.value = false
  pagination.current = 1
  void fetchSceneList()
}

const onNodeClick = (data: any) => {
  const id = toIdString(data?.id || data?.node?.id)
  moduleId.value = id
  uiStore.moduleId = id
  selectedKeys.value = id ? [id] : []
  pagination.current = 1
  void fetchSceneList()
}

const onSelect = (keys: Array<string | number>) => {
  tableSelectedKeys.value = keys
}
const onSelectAll = (checked: boolean) => {
  tableSelectedKeys.value = checked ? allScenes.value.map((row) => row.id) : []
}

const resolveActiveVersionId = () => {
  const fromForm = toIdString(queryForm.versionId)
  if (fromForm) return fromForm
  if (versionIdStr.value) return versionIdStr.value
  const vid = resolveVersionId(uiStore.versionList, props.plan)
  if (vid) {
    versionIdStr.value = vid
    uiStore.versionId = vid
    queryForm.versionId = vid
  }
  return versionIdStr.value
}

const refreshModuleTree = async (options?: { force?: boolean }) => {
  const projectId = projectIdStr.value
  const versionId = resolveActiveVersionId()
  if (!projectId || !versionId) {
    treeList.value = []
    return
  }
  treeLoading.value = true
  try {
    treeList.value = await loadModuleTree(projectId, versionId, options)
  } catch {
    treeList.value = []
  } finally {
    treeLoading.value = false
  }
}

/** 拉取计划最新关联场景 ID（避免 props 未及时同步仍用旧列表） */
const fetchPlanSceneIds = async (): Promise<Array<string | number>> => {
  try {
    const { data } = await getTestPlan(props.plan.id)
    return data?.uiTestScene ?? props.plan.uiTestScene ?? []
  } catch {
    return props.plan.uiTestScene ?? []
  }
}

const ensurePlanSceneIds = async (refresh = false) => {
  if (!refresh && planSceneIds.value.length) return planSceneIds.value
  planSceneIds.value = toIdStringList(await fetchPlanSceneIds())
  return planSceneIds.value
}

const fetchHistoryScenes = async (refreshIds = false, silent = false) => {
  if (!silent) historyLoading.value = true
  try {
    const sceneIds = await ensurePlanSceneIds(refreshIds)
    if (!sceneIds.length) {
      historySceneSummaries.value = []
      historyBatches.value = []
      historySceneKey.value = ALL_HISTORY_SCENES
      historyLoaded.value = true
      historyRevision = ''
      return
    }
    historyController?.abort()
    const controller = new AbortController()
    historyController = controller
    const generation = ++historyGeneration
    const chunks = Array.from({ length: Math.ceil(sceneIds.length / AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT) }, (_, index) => (
      sceneIds.slice(
        index * AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
        (index + 1) * AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
      )
    ))
    const summaryResponses = await mapWithConcurrency(chunks, 3, chunk => (
      getAutomationUiSceneSummaries(chunk, 'test', controller.signal)
    ))
    if (generation !== historyGeneration || controller.signal.aborted) return
    const summaries = summaryResponses.flatMap(response => response.data || [])
    const summaryMap = new Map(summaries.map(scene => [toIdString(scene.sceneDbId), scene]))
    historySceneSummaries.value = sceneIds.map(id => summaryMap.get(toIdString(id))).filter(Boolean) as AutomationUiSceneSummary[]
    const activeSummaries = historySceneKey.value === ALL_HISTORY_SCENES
      ? historySceneSummaries.value
      : historySceneSummaries.value.filter(scene => toIdString(scene.sceneDbId) === historySceneKey.value)
    historyExecutionTotal.value = 0
    const rows = await mapWithConcurrency(activeSummaries, 6, async (scene) => {
      const response = await getAutomationUiExecutions({
        sceneDbId: scene.sceneDbId,
        recordSource: 'test',
        testPlanId: props.plan.id,
        page: historySceneKey.value === ALL_HISTORY_SCENES ? 1 : historyExecutionPage.value,
        size: historySceneKey.value === ALL_HISTORY_SCENES ? 20 : historyExecutionPageSize.value,
        sort: ['createTime,desc'],
      }, controller.signal)
      if (historySceneKey.value !== ALL_HISTORY_SCENES) {
        historyExecutionTotal.value = response.data?.mode === 'page' ? response.data.total : response.data?.list.length || 0
      }
      return (response.data?.list || []).map(record => buildLayeredExecutionBatchRow(record, scene))
    })
    if (generation !== historyGeneration || controller.signal.aborted) return
    historyBatches.value = rows.flat().sort((left, right) => historyTimestamp(right.startedAt) - historyTimestamp(left.startedAt))
    const { data: revisionData } = await getAutomationUiExecutionRevisionsBatched(sceneIds)
    historyRevision = sceneRevisionFingerprint(Array.isArray(revisionData) ? revisionData : [])
    if (historySceneKey.value !== ALL_HISTORY_SCENES
      && !historyScenes.value.some(scene => toIdString(scene.id) === historySceneKey.value)) {
      historySceneKey.value = ALL_HISTORY_SCENES
    }
    historyLoaded.value = true
  } finally {
    if (!silent) historyLoading.value = false
  }
}

const sceneRevisionFingerprint = (items: Array<{ sceneDbId: string | number, updateTime?: string, globalExecutionRevision?: number }>) => items
  .map(item => `${toIdString(item.sceneDbId)}:${item.updateTime || ''}:${item.globalExecutionRevision ?? 0}`)
  .sort()
  .join('|')

const refreshHistoryWhenChanged = async () => {
  const sceneIds = await ensurePlanSceneIds()
  if (!sceneIds.length) return
  const { data } = await getAutomationUiExecutionRevisionsBatched(sceneIds)
  const nextRevision = sceneRevisionFingerprint(Array.isArray(data) ? data : [])
  if (nextRevision !== historyRevision) await fetchHistoryScenes(false, true)
}

const loadHistoryExecutionCases = async (batch: ExecutionHistoryBatchRow, page = 1, size = 20) => {
  if (!batch.executionDbId) return
  const response = await requestOnce(
    `execution-cases:${batch.executionDbId}:${page}:${size}`,
    () => getAutomationUiExecutionCases(batch.executionDbId!, page, size),
  )
  const current = historyBatches.value.find(item => item.executionDbId === batch.executionDbId)
  if (!current || !response.data) return
  current.cases = response.data.list.map(record => buildLayeredExecutionCaseRow(record, current))
  current.casesLoaded = true
  current.casePage = page
  current.casePageSize = size
  current.casePageTotal = response.data.total
}

const onHistorySceneChange = async (sceneId: string) => {
  historySceneKey.value = sceneId || ALL_HISTORY_SCENES
  historyExecutionPage.value = 1
  await fetchHistoryScenes(false, true)
}

const loadHistoryExecutionPage = async (page: number, size: number) => {
  if (historySceneKey.value === ALL_HISTORY_SCENES) return
  historyExecutionPage.value = page
  historyExecutionPageSize.value = size
  await fetchHistoryScenes(false, true)
}

const loadHistoryExecutionSteps = async (record: ExecutionHistoryCaseRow, page = 1, size = 20) => {
  if (!record.caseExecutionDbId) return
  const response = await requestOnce(
    `execution-steps:${record.caseExecutionDbId}:${page}:${size}`,
    () => getAutomationUiExecutionSteps(record.caseExecutionDbId!, page, size),
  )
  if (!response.data) return
  record.steps = response.data.list.map(buildLayeredExecutionStepRow)
  record.stepsLoaded = true
  record.stepPage = page
  record.stepPageSize = size
  record.stepPageTotal = response.data.total
}

const loadHistoryExecutionStepDetail = async (step: ExecutionHistoryStepRow) => {
  if (!step.stepExecutionDbId || step.detailLoaded) return
  const response = await requestOnce(
    `execution-step:${step.stepExecutionDbId}`,
    () => getAutomationUiExecutionStep(step.stepExecutionDbId!),
  )
  if (!response.data) return
  applyLayeredExecutionStepDetail(step, response.data)
}

function historyTimestamp(value: unknown) {
  const timestamp = value ? new Date(value as string | number).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

const stopHistoryPolling = () => {
  if (historyPollTimer) window.clearInterval(historyPollTimer)
  historyPollTimer = undefined
}

const startHistoryPolling = () => {
  stopHistoryPolling()
  historyPollTimer = window.setInterval(() => {
    if (activeWorkspaceView.value === 'history') void refreshHistoryWhenChanged().catch(() => undefined)
  }, 3000)
}

const cancelHistoryBatch = (batch: ExecutionHistoryBatchRow, markCancelling?: () => void) => {
  const reportId = toIdString(
    batch.testReportId
    || batch.cases.find((item) => item.testReportId)?.testReportId,
  )
  const planId = toIdString(props.plan.id)
  const sceneKey = toIdString(batch.sceneKey)
  const batchId = toIdString(batch.batchId)
  if (reportId && !planId) {
    Message.error('当前执行批次缺少测试计划标识，无法取消')
    return
  }
  if (!reportId && (!sceneKey || !batchId)) {
    Message.error('当前执行批次缺少场景或批次标识，无法取消')
    return
  }
  Modal.confirm({
    title: '确认取消执行',
    content: reportId
      ? '取消后当前测试计划批次及后续未执行场景都将停止，是否确认？'
      : '取消后当前用例执行批次将立即停止，是否确认？',
    onOk: async () => {
      markCancelling?.()
      if (reportId) await cancelTestPlanExecution(planId, reportId)
      else await cancelAutomationPlaywrightBatch(sceneKey, batchId)
      Message.success('已发起取消执行')
      await fetchHistoryScenes(true)
      emit('refresh')
    },
  })
}

const openAllHistory = async () => {
  historyTabOpen.value = true
  activeWorkspaceView.value = 'history'
  historySceneKey.value = ALL_HISTORY_SCENES
  historyExecutionPage.value = 1
  await fetchHistoryScenes(true)
  startHistoryPolling()
}

const closeHistoryTab = () => {
  historyTabOpen.value = false
  historySceneKey.value = ALL_HISTORY_SCENES
  historyExecutionPage.value = 1
  if (activeWorkspaceView.value === 'history') activeWorkspaceView.value = 'scenes'
}

const cancelHistoryCase = (row: ExecutionHistoryCaseRow, markCancelling?: () => void) => {
  if (!row.sceneKey || !row.batchId || !row.caseId || row.caseId === '-') return
  Modal.confirm({
    title: '确认取消当前用例',
    content: `取消用例“${row.caseName}”不会影响同批次其他用例，是否确认？`,
    onOk: async () => {
      markCancelling?.()
      await cancelAutomationPlaywrightBatchCase(row.sceneKey, row.batchId, row.caseId)
      Message.success('已发起取消当前用例')
      await fetchHistoryScenes(true)
      emit('refresh')
    },
  })
}

const openHistory = async (sceneId?: string) => {
  historyTabOpen.value = true
  activeWorkspaceView.value = 'history'
  historySceneKey.value = sceneId || ALL_HISTORY_SCENES
  historyExecutionPage.value = 1
  await fetchHistoryScenes(true)
  startHistoryPolling()
}

const showScenes = () => {
  activeWorkspaceView.value = 'scenes'
  void fetchSceneList(true)
}

const openSceneHistory = async (record: PlanSceneRow) => {
  await openHistory(toIdString(record.id))
}

const buildPlanRecord = (summary: AutomationUiSceneSummary) => {
  const latest = summary.latestExecution
  if (!latest) return undefined
  const caseTotal = Number(latest.caseTotal || 0)
  const casePass = Number(latest.casePass || 0)
  return {
    executionDbId: latest.executionDbId,
    testReportId: latest.testReportId,
    executionId: latest.executionKey,
    testPlanId: latest.testPlanId ?? props.plan.id,
    buildNumber: latest.buildNumber,
    executeStatus: latest.status,
    executeResult: latest.result,
    status: latest.status,
    result: latest.result,
    executeName: latest.executeName || latest.executeUsername,
    executeUsername: latest.executeUsername,
    startedAt: latest.startedAt,
    finishedAt: latest.finishedAt,
    duration: latest.durationMs,
    caseTotal: latest.caseTotal,
    casePass: latest.casePass,
    caseFail: latest.caseFail,
    caseSkip: latest.caseSkip,
    stepTotal: latest.stepTotal,
    stepPass: latest.stepPass,
    stepFail: latest.stepFail,
    stepSkip: latest.stepSkip,
    scenePassRate: caseTotal > 0 ? `${Math.round(casePass * 10000 / caseTotal) / 100}%` : '-',
  }
}

const mapPlanSceneSummary = (summary: AutomationUiSceneSummary): PlanSceneRow => {
  const planRecord = buildPlanRecord(summary)
  return {
    id: String(summary.sceneDbId),
    sceneId: summary.sceneKey,
    name: summary.name,
    description: summary.description || '',
    projectId: String(summary.projectDbId),
    projectName: summary.projectName || '',
    versionId: summary.versionDbId == null ? '' : String(summary.versionDbId),
    versionName: summary.versionName || '',
    moduleId: summary.moduleDbId == null ? '' : String(summary.moduleDbId),
    modulePath: summary.modulePath || '',
    level: summary.level || '',
    status: summary.status || 0,
    tags: Array.isArray(summary.tags) ? summary.tags as Array<object> : [],
    caseList: [],
    definitionVersion: summary.definitionVersion,
    testPlanId: [],
    reportId: '',
    debugRecord: [],
    executeStatus: planRecord?.executeStatus || '',
    executeResult: planRecord?.executeResult || '',
    testRecord: planRecord ? [planRecord] : [],
    buildNumber: Number(planRecord?.buildNumber || 0),
    consoleUrl: '',
    testReportUrl: '',
    caseTotal: Number(planRecord?.caseTotal || 0),
    casePass: Number(planRecord?.casePass || 0),
    caseFail: Number(planRecord?.caseFail || 0),
    caseSkip: Number(planRecord?.caseSkip || 0),
    passRate: String(planRecord?.scenePassRate || '-'),
    lastResult: planRecord?.executeResult || '',
    stepTotal: Number(planRecord?.stepTotal || 0),
    stepPass: Number(planRecord?.stepPass || 0),
    stepFail: Number(planRecord?.stepFail || 0),
    stepSkip: Number(planRecord?.stepSkip || 0),
    createUser: '',
    createTime: summary.createTime || '',
    updateUser: '',
    updateTime: summary.updateTime || '',
    updateIp: '',
    executionRevision: summary.globalExecutionRevision,
    delFlag: 3,
    createUserString: summary.createUserString || '-',
    updateUserString: summary.updateUserString || '-',
    disabled: false,
    planRecord,
  }
}

const selectedUserLabel = (value?: string) => {
  if (!value) return ''
  const option = (uiStore.userList || []).find((item: any) => String(item.value ?? item.id) === String(value)) as any
  return String(option?.label ?? option?.name ?? option?.nickname ?? '')
}

const containsIgnoreCase = (value: unknown, keyword?: string) => (
  !keyword?.trim() || String(value || '').toLowerCase().includes(keyword.trim().toLowerCase())
)

const matchesPlanSceneQuery = (row: PlanSceneRow) => {
  if (!containsIgnoreCase(row.sceneId, queryForm.sceneId)) return false
  if (!containsIgnoreCase(row.name, queryForm.name)) return false
  if (queryForm.versionId && String(row.versionId) !== String(queryForm.versionId)) return false
  if (moduleId.value && String(row.moduleId) !== String(moduleId.value)) return false
  if (queryForm.level && String(row.level) !== String(queryForm.level)) return false
  if (queryForm.executeStatus && String(row.planRecord?.executeStatus || '') !== String(queryForm.executeStatus)) return false
  if (queryForm.executeResult && String(row.planRecord?.executeResult || '') !== String(queryForm.executeResult)) return false
  const createUserLabel = selectedUserLabel(queryForm.createUser)
  if (queryForm.createUser && (!createUserLabel || row.createUserString !== createUserLabel)) return false
  const updateUserLabel = selectedUserLabel(queryForm.updateUser)
  if (queryForm.updateUser && (!updateUserLabel || row.updateUserString !== updateUserLabel)) return false
  if (queryForm.createTime?.length === 2) {
    const createdAt = new Date(row.createTime).getTime()
    const startAt = new Date(queryForm.createTime[0]).getTime()
    const endAt = new Date(queryForm.createTime[1]).getTime()
    if (!Number.isFinite(createdAt) || createdAt < startAt || createdAt > endAt) return false
  }
  return true
}

const loadPlanSceneRows = async (refresh: boolean, signal: AbortSignal) => {
  const cacheKey = `${toIdString(props.plan.id)}:${planSceneIds.value.join(',')}`
  if (!refresh && planSceneRowsCacheKey === cacheKey) return planSceneRowsCache.value
  const chunks = Array.from(
    { length: Math.ceil(planSceneIds.value.length / AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT) },
    (_, index) => planSceneIds.value.slice(
      index * AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
      (index + 1) * AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
    ),
  )
  const responses = await mapWithConcurrency(chunks, 3, (chunk) => getAutomationUiSceneSummaries(chunk, {
    recordSource: 'test',
    testPlanId: toIdString(props.plan.id),
  }, signal))
  const summaryMap = new Map(responses
    .flatMap((response) => response.data || [])
    .map((summary) => [toIdString(summary.sceneDbId), summary]))
  const rows = planSceneIds.value
    .map((sceneId) => summaryMap.get(sceneId))
    .filter((summary): summary is AutomationUiSceneSummary => Boolean(summary))
    .map(mapPlanSceneSummary)
    .sort((left, right) => new Date(right.updateTime || 0).getTime() - new Date(left.updateTime || 0).getTime())
  planSceneRowsCache.value = rows
  planSceneRowsCacheKey = cacheKey
  return rows
}

const fetchSceneList = async (refreshIds = false) => {
  sceneListController?.abort()
  const controller = new AbortController()
  sceneListController = controller
  const generation = ++sceneListGeneration
  loading.value = true
  tableSelectedKeys.value = []
  try {
    await ensurePlanSceneIds(refreshIds)
    if (generation !== sceneListGeneration || controller.signal.aborted) return
    if (!planSceneIds.value.length) {
      allScenes.value = []
      planSceneRowsCache.value = []
      planSceneRowsCacheKey = ''
      setTotal(0)
      return
    }
    // 计划关联 ID 已由计划接口冻结；这里只批量读取窄摘要，不再回退到包含定义和历史的旧 /list。
    const rows = await loadPlanSceneRows(refreshIds, controller.signal)
    if (generation !== sceneListGeneration || controller.signal.aborted) return
    const filteredRows = rows.filter(matchesPlanSceneQuery)
    setTotal(filteredRows.length)
    const start = (pagination.current - 1) * pagination.pageSize
    allScenes.value = filteredRows.slice(start, start + pagination.pageSize)
  } catch (error: any) {
    if (!controller.signal.aborted && !['CanceledError', 'AbortError'].includes(error?.name)) {
      Message.error(error?.message || '读取测试计划场景失败')
    }
  } finally {
    if (generation === sceneListGeneration) loading.value = false
  }
}

const removeScenes = async (sceneIds: string[]) => {
  if (!sceneIds.length) {
    Message.warning('请选择场景')
    return
  }
  await removeTestPlanScenes(props.plan.id, sceneIds)
  Message.success('取消关联成功')
  tableSelectedKeys.value = []
  pagination.current = 1
  await fetchSceneList(true)
  if (historyLoaded.value) await fetchHistoryScenes()
  emit('refresh')
}

const onBatchRemove = () => {
  Modal.warning({
    title: '确认删除',
    content: '确认取消关联选中的测试场景吗？',
    hideCancel: false,
    onOk: () => removeScenes(tableSelectedKeys.value.map((id) => toIdString(id))),
  })
}

const onRemoveOne = (record: PlanSceneRow) => {
  Modal.warning({
    title: '确认删除',
    content: `确认取消关联场景「${record.name}」吗？`,
    hideCancel: false,
    onOk: () => removeScenes([toIdString(record.id)]),
  })
}

const initWorkspace = async () => {
  if (!toIdString(props.plan.projectId)) {
    treeList.value = []
    return
  }
  workspaceInitializing.value = true
  try {
    const { projectId, versionId } = await initUiStoreForPlan(uiStore, props.plan)
    projectIdStr.value = projectId
    versionIdStr.value = versionId || resolveVersionId(uiStore.versionList, props.plan)
    if (versionIdStr.value) uiStore.versionId = versionIdStr.value
    queryForm.versionId = versionIdStr.value || undefined
    moduleId.value = ''
    uiStore.moduleId = ''
    selectedKeys.value = []
    await refreshModuleTree()
    await fetchSceneList(true)
  } finally {
    workspaceInitializing.value = false
  }
}

watch(
  () => `${toIdString(props.plan.id)}|${toIdString(props.plan.projectId)}`,
  (planKey, prevKey) => {
    if (!planKey.split('|')[0] || !prevKey || planKey === prevKey) return
    activeWorkspaceView.value = 'scenes'
    historySceneKey.value = ALL_HISTORY_SCENES
    historyExecutionPage.value = 1
    historySceneSummaries.value = []
    historyBatches.value = []
    historyLoaded.value = false
    void initWorkspace()
  },
)

watch(
  () => queryForm.versionId,
  async (versionId, oldVersionId) => {
    if (workspaceInitializing.value) return
    if (versionId === oldVersionId) return
    if (versionId) {
      versionIdStr.value = toIdString(versionId)
      uiStore.versionId = versionIdStr.value
    }
    moduleId.value = ''
    uiStore.moduleId = ''
    selectedKeys.value = []
    await refreshModuleTree({ force: true })
    // 列表由 GiForm search-on-change -> onFormSearch -> fetchSceneList 触发，避免与 watch 重复请求
  },
  { flush: 'sync' },
)

watch(activeWorkspaceView, (view) => {
  // 历史为全宽阅读视图，切换时与 UI 自动化模块保持一致收起左侧树。
  pageLayoutRef.value?.toggleCollapsed(view === 'history')
  if (view === 'history') startHistoryPolling()
  else stopHistoryPolling()
})

onMounted(() => {
  void initWorkspace()
})

onUnmounted(() => {
  stopHistoryPolling()
  historyController?.abort()
  sceneListController?.abort()
})

defineExpose({
  reload: async () => {
    await fetchSceneList(true)
    if (historyLoaded.value || activeWorkspaceView.value === 'history') await fetchHistoryScenes()
  },
  openHistory,
})
</script>

<script lang="tsx">
export default {}
</script>

<style scoped lang="scss">
.test-plan-scene-workspace {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 220px);

  :deep(.gi-page-layout) {
    height: 100%;
    min-height: 0;
    background: var(--color-bg-1);
  }

  :deep(.gi-page-layout__left) {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 8px 16px 8px 5px !important;
    overflow: hidden;
    box-sizing: border-box;
  }

  :deep(.gi-page-layout__body) {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 0px 8px 8px 13px !important;
    overflow: hidden;
  }

  :deep(.gi-page-layout--margin) {
    margin: 0;
  }

  :deep(.gi-page-layout__divider) {
    z-index: 2;
  }

  :deep(.gi-split-button) {
    z-index: 3;
  }
}

.workspace-left {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0px 0px 0px 6px;
  overflow: hidden;

  .plan-select {
    flex: none;
    flex-shrink: 0;
    width: 100%;
    height: 30px;
    margin-bottom: 10px;
  }
}

.workspace-tree-wrap {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 5px;
  overflow: hidden;

  :deep(.gi-tree) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.gi-tree__tree) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
}

.workspace-tree-search-wrap {
  flex: none;
  flex-shrink: 0;
  padding-top: 8px;
  background: var(--color-bg-1);
}

.workspace-tree-search {
  width: 100%;
}

.scene-workspace-body {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.scene-type-bar {
  flex: none;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--color-border-2);

  &__item {
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 16px;
    color: var(--color-text-2);
    font-size: 14px;
    border: 1px solid var(--color-border-2);
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    background: var(--color-bg-2);
    font-family: inherit;
    cursor: pointer;

    & + & {
      margin-left: 4px;
    }

    &--active {
      margin-bottom: -1px;
      color: rgb(var(--primary-6));
      background: var(--color-bg-1);
      font-weight: 500;
    }
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-left: 6px;
    border-radius: 2px;

    &:hover {
      color: var(--color-text-1);
      background: var(--color-fill-2);
    }
  }
}

.plan-history-view {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.plan-history-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.scene-table {
  flex: 1;
  min-height: 0;

  :deep(.gi-table) {
    height: 100%;
    min-height: 0;
    padding: 0;
  }
}
</style>
