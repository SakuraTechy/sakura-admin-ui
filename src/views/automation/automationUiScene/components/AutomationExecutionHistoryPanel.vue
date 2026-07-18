<template>
  <div ref="panelRef" class="execution-history-panel">
    <!-- <GiForm
      v-model="queryForm"
      :columns="queryFormColumns"
      size="medium"
      search
      :search-card="true"
      :search-columns-per-row="3"
      :search-control-min-width="210"
      :search-label-width="72"
      :grid-props="{ cols: 24, colGap: 16, rowGap: 0 }"
      search-btn-text="查询"
      @search="search"
      @reset="reset"
    /> -->

    

    <div class="history-view-toolbar">
      <div>
        <div class="history-title">历史列表</div>
        <div class="history-description">
          {{ historyScopeDescription }}，共 {{ displayTotal }} 条记录，当前为{{ activeViewLabel }}
        </div>
      </div>
      <div class="history-toolbar-actions">
        <a-button
          size="small"
          :type="selectedCaseId ? 'secondary' : 'primary'"
          @click="emit('show-all')"
        >
          全部历史
        </a-button>
        <a-button-group class="view-mode-switch" aria-label="执行历史视图模式">
          <a-tooltip content="表格视图">
            <a-button
              :class="{ 'view-mode-button--active': viewMode === 'table' }"
              aria-label="表格视图"
              @click="changeViewMode('table')"
            >
              <template #icon><icon-bar-chart /></template>
            </a-button>
          </a-tooltip>
          <a-tooltip content="紧凑视图">
            <a-button
              :class="{ 'view-mode-button--active': viewMode === 'compact' }"
              aria-label="紧凑视图"
              @click="changeViewMode('compact')"
            >
              <template #icon><icon-list /></template>
            </a-button>
          </a-tooltip>
          <a-tooltip content="时间轴视图">
            <a-button
              :class="{ 'view-mode-button--active': viewMode === 'timeline' }"
              aria-label="时间轴视图"
              @click="changeViewMode('timeline')"
            >
              <template #icon><icon-calendar /></template>
            </a-button>
          </a-tooltip>
          <a-tooltip content="卡片视图">
            <a-button
              :class="{ 'view-mode-button--active': viewMode === 'cards' }"
              aria-label="卡片视图"
              @click="changeViewMode('cards')"
            >
              <template #icon><icon-apps /></template>
            </a-button>
          </a-tooltip>
        </a-button-group>
      </div>
    </div>
    <section class="history-summary" aria-label="执行历史汇总">
      <!-- <div class="history-summary__header">
        <strong>执行汇总</strong>
        <span>{{ summaryScopeDescription }}</span>
      </div> -->
      <div class="history-summary__stats">
        <div v-for="item in summaryCards" :key="item.label" :class="item.tone">
          <strong>{{ item.value }}</strong><span>{{ item.label }}</span>
        </div>
      </div>
    </section>
    <GiTable
      v-if="viewMode === 'table' && tableBatchMode"
      :data="pagedBatchRows"
      :columns="batchColumns"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 1775, y: 560 }"
      :expanded-keys="expandedKeys"
      :expandable="{ width: 48 }"
      :row-class="batchRowClass"
      row-key="rowKey"
      size="small"
      table-id="automation-execution-batch-history-v2"
      :disabled-column-keys="['batchId', 'action']"
      @expanded-change="handleExpandedChange"
      @refresh="emit('refresh')"
    >
      <template #expand-row="{ record }">
        <AutomationExecutionBatchDetail :batch="record" @open="openResult" />
      </template>
    </GiTable>

    <GiTable
      v-else-if="viewMode === 'table'"
      :data="pagedRows"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 1790, y: 560 }"
      :expanded-keys="expandedKeys"
      :expandable="{ width: 48 }"
      :row-class="historyRowClass"
      row-key="rowKey"
      size="small"
      table-id="automation-execution-case-history"
      :disabled-column-keys="['caseName', 'action']"
      @expanded-change="handleExpandedChange"
      @refresh="emit('refresh')"
    >
      <template #expand-row="{ record }">
        <AutomationExecutionHistoryDetail :record="record" variant="table" @open="openResult" />
      </template>
    </GiTable>

    <a-spin v-else :loading="loading" class="history-alternative-view">
      <a-empty v-if="pagedRows.length === 0" description="暂无符合条件的执行记录" />

      <div v-else-if="viewMode === 'compact'" class="history-compact-list">
        <div
          v-for="record in pagedRows"
          :key="record.rowKey"
          class="history-compact-item"
          :class="{ 'history-item--expanded': isExpanded(record) }"
        >
          <div class="history-compact-row">
            <button
              class="history-record-toggle"
              type="button"
              :disabled="record.live"
              @click="toggleExpanded(record.rowKey)"
            >
              <span class="history-status-dot" :class="`history-status-dot--${resultStateClass(record.executeResult)}`"></span>
              <span class="history-record-identity">
                <strong>{{ record.caseName }}</strong>
                <span>{{ record.caseId }} · {{ record.executionId }}</span>
              </span>
              <a-tag color="arcoblue">{{ executionTypeLabel(record.executionType) }}</a-tag>
              <a-tag :color="executionResultColor(record.executeResult)">
                {{ executionResultLabel(record.executeResult) }}
              </a-tag>
              <span class="history-compact-stat metric-success">通过 {{ record.stepPass }}</span>
              <span class="history-compact-stat metric-danger">失败 {{ record.stepFail }}</span>
              <AutomationExecutionProgress :progress="record.progress" :indeterminate="record.progressIndeterminate" />
              <span class="history-compact-stat">{{ formatExecutionDuration(record.duration) }}</span>
              <span class="history-compact-time">{{ formatExecutionDateTime(record.startedAt) }}</span>
              <icon-down class="history-expand-icon" :class="{ 'history-expand-icon--active': isExpanded(record) }" />
            </button>
            <a-space v-if="!record.live" class="history-actions" size="mini">
              <a-link @click="openResult(record, 'log')">日志</a-link>
              <a-link @click="openResult(record, 'report')">报告</a-link>
              <a-link v-if="record.executionType !== 'extension-cdp'" @click="openResult(record, 'video')">录屏</a-link>
            </a-space>
          </div>
          <AutomationExecutionHistoryDetail v-if="isExpanded(record)" :record="record" variant="compact" @open="openResult" />
        </div>
      </div>

      <div v-else-if="viewMode === 'timeline'" class="history-record-timeline">
        <div
          v-for="record in pagedRows"
          :key="record.rowKey"
          class="history-record-timeline-item"
          :class="{ 'history-item--expanded': isExpanded(record) }"
        >
          <span
            class="history-record-timeline-node"
            :class="`history-record-timeline-node--${resultStateClass(record.executeResult)}`"
          ></span>
          <div class="history-timeline-card">
            <div class="history-card-header">
              <button
                class="history-card-title"
                type="button"
                :disabled="record.live"
                @click="toggleExpanded(record.rowKey)"
              >
                <span>{{ record.caseName }}</span>
                <small>{{ record.executionId }}</small>
              </button>
              <a-space wrap>
                <a-tag color="arcoblue">{{ executionTypeLabel(record.executionType) }}</a-tag>
                <a-tag :color="executionStatusColor(record.executeStatus)">
                  {{ executionStatusLabel(record.executeStatus) }}
                </a-tag>
                <a-tag :color="executionResultColor(record.executeResult)">
                  {{ executionResultLabel(record.executeResult) }}
                </a-tag>
              </a-space>
            </div>
            <div class="history-timeline-meta">
              <span><icon-calendar />{{ formatExecutionDateTime(record.startedAt) }}</span>
              <span><icon-user />{{ record.executeName }}</span>
              <span><icon-clock-circle />{{ formatExecutionDuration(record.duration) }}</span>
            </div>
            <AutomationExecutionProgress class="history-view-progress" :progress="record.progress" :indeterminate="record.progressIndeterminate" />
            <div class="history-metric-strip">
              <span>步骤 <strong>{{ record.stepTotal }}</strong></span>
              <span class="metric-success">通过 <strong>{{ record.stepPass }}</strong></span>
              <span class="metric-danger">失败 <strong>{{ record.stepFail }}</strong></span>
              <span>跳过 <strong>{{ record.stepSkip }}</strong></span>
              <span>通过率 <strong>{{ record.stepPassRate }}</strong></span>
              <a-space v-if="!record.live" class="history-actions" size="mini">
                <a-link @click="openResult(record, 'log')">日志</a-link>
                <a-link @click="openResult(record, 'report')">报告</a-link>
                <a-link v-if="record.executionType !== 'extension-cdp'" @click="openResult(record, 'video')">录屏</a-link>
              </a-space>
            </div>
          </div>
          <AutomationExecutionHistoryDetail v-if="isExpanded(record)" :record="record" variant="timeline" @open="openResult" />
        </div>
      </div>

      <div v-else class="history-card-grid">
        <div
          v-for="record in pagedRows"
          :key="record.rowKey"
          class="history-card-item"
          :class="{ 'history-card-item--expanded': isExpanded(record) }"
        >
          <article class="history-record-card">
            <div class="history-card-header">
              <button
                class="history-card-title"
                type="button"
                :disabled="record.live"
                @click="toggleExpanded(record.rowKey)"
              >
                <span>{{ record.caseName }}</span>
                <small>{{ record.caseId }}</small>
              </button>
              <a-tag :color="executionResultColor(record.executeResult)">
                {{ executionResultLabel(record.executeResult) }}
              </a-tag>
            </div>
            <div class="history-card-subtitle">
              <a-tag color="arcoblue">{{ executionTypeLabel(record.executionType) }}</a-tag>
              <span>{{ record.executionId }}</span>
            </div>
            <AutomationExecutionProgress class="history-view-progress" :progress="record.progress" :indeterminate="record.progressIndeterminate" />
            <div class="history-card-metrics">
              <div><span>步骤</span><strong>{{ record.stepTotal }}</strong></div>
              <div><span>通过</span><strong class="metric-success">{{ record.stepPass }}</strong></div>
              <div><span>失败</span><strong class="metric-danger">{{ record.stepFail }}</strong></div>
              <div><span>通过率</span><strong>{{ record.passRate }}</strong></div>
            </div>
            <div class="history-card-footer">
              <div>
                <span>{{ record.executeName }}</span>
                <span>{{ formatExecutionDateTime(record.startedAt) }}</span>
                <strong>{{ formatExecutionDuration(record.duration) }}</strong>
              </div>
              <a-space v-if="!record.live" class="history-actions" size="mini">
                <a-link @click="openResult(record, 'log')">日志</a-link>
                <a-link @click="openResult(record, 'report')">报告</a-link>
                <a-link v-if="record.executionType !== 'extension-cdp'" @click="openResult(record, 'video')">录屏</a-link>
              </a-space>
            </div>
          </article>
          <AutomationExecutionHistoryDetail v-if="isExpanded(record)" :record="record" variant="cards" @open="openResult" />
        </div>
      </div>

      <div v-if="pagedRows.length > 0" class="history-pagination">
        <a-pagination v-bind="pagination" />
      </div>
    </a-spin>

    <AutomationExecutionResultDrawer ref="executionResultDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import {
  type ExecutionHistoryBatchRow,
  type ExecutionHistoryCaseRow,
  type ExecutionResultOpenOptions,
  type ExecutionType,
  type ExecutionViewType,
  type LiveExecutionCase,
  executionResultColor,
  executionResultLabel,
  executionStatusColor,
  executionStatusLabel,
  executionTypeLabel,
  executionTypeOptions,
  formatExecutionDateTime,
  formatExecutionDuration,
  getDebugExecutionBatchRows,
  getDebugExecutionHistoryRows,
} from '../execution'
import AutomationExecutionBatchDetail from './AutomationExecutionBatchDetail.vue'
import AutomationExecutionHistoryDetail from './AutomationExecutionHistoryDetail.vue'
import AutomationExecutionProgress from './AutomationExecutionProgress.vue'
import AutomationExecutionResultDrawer from './AutomationExecutionResultDrawer.vue'
import type { AutomationUiSceneDetailResp } from '@/apis/automation/automationUiScene'
import type { ColumnItem } from '@/components/GiForm'

type HistoryViewMode = 'table' | 'compact' | 'timeline' | 'cards'

interface HistoryQuery {
  executionId: string
  caseId: string
  caseName: string
  executionType: string
  executeStatus: string
  executeResult: string
  executeName: string
  error: string
  startedAt: string[]
}

const props = defineProps<{
  scene?: AutomationUiSceneDetailResp
  loading?: boolean
  selectedCaseId?: string
  liveExecutions?: LiveExecutionCase[]
}>()
const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'show-all'): void
}>()

const VIEW_MODE_STORAGE_KEY = 'automation-execution-history-view-mode'
const viewMode = ref<HistoryViewMode>('table')
const panelRef = ref<HTMLElement>()
const expandedKeys = ref<Array<string | number>>([])
const queryForm = reactive<HistoryQuery>(createEmptyQuery())
const appliedQuery = ref<HistoryQuery>(createEmptyQuery())
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showPageSize: true,
  showTotal: true,
  pageSizeOptions: [10, 20, 30, 50, 100],
  onChange: (page: number) => {
    pagination.current = page
    expandedKeys.value = []
  },
  onPageSizeChange: (size: number) => {
    pagination.current = 1
    pagination.pageSize = size
    expandedKeys.value = []
  },
})

const allHistoryRows = computed(() => getDebugExecutionHistoryRows(props.scene))
const liveHistoryRows = computed(() => (props.liveExecutions || []).map(normalizeLiveExecution))
const scopedHistoryRows = computed(() => {
  const liveExecutionIds = new Set(liveHistoryRows.value.map((item) => item.executionId))
  const rows = [
    ...liveHistoryRows.value,
    ...allHistoryRows.value.filter((item) => !liveExecutionIds.has(item.executionId)),
  ]
  if (props.selectedCaseId) {
    return rows.filter((row) => row.caseId === props.selectedCaseId)
  }
  return rows
})
const sceneCases = computed<any[]>(() => Array.isArray((props.scene as any)?.caseList)
  ? (props.scene as any).caseList
  : [])
const latestScopedExecutionRows = computed(() => {
  const currentCaseIds = new Set(sceneCases.value.map((item: any) => String(item.id)))
  const latestByCaseId = new Map<string, ExecutionHistoryCaseRow>()
  scopedHistoryRows.value.forEach((row) => {
    if (!row.caseId || row.caseId === '-' || latestByCaseId.has(row.caseId)) return
    if (!props.selectedCaseId && currentCaseIds.size > 0 && !currentCaseIds.has(row.caseId)) return
    latestByCaseId.set(row.caseId, row)
  })
  return [...latestByCaseId.values()]
})
const executionSummary = computed(() => {
  const sceneCaseTotal = sceneCases.value.length
  const total = props.selectedCaseId ? 1 : (sceneCaseTotal || latestScopedExecutionRows.value.length)
  return latestScopedExecutionRows.value.reduce((summary, row) => {
    const status = executionStatusLabel(row.executeStatus)
    const result = executionResultLabel(row.executeResult)
    if (['已完成', '已取消', '已阻塞', '已跳过'].includes(status)) summary.completed += 1
    if (result === '通过') summary.passed += 1
    if (result === '失败') summary.failed += 1
    if (result === '阻塞' || status === '已阻塞') summary.blocked += 1
    if (['已取消', '跳过'].includes(result) || ['已取消', '已跳过'].includes(status)) {
      summary.cancelledOrSkipped += 1
    }
    return summary
  }, { total, completed: 0, passed: 0, failed: 0, blocked: 0, cancelledOrSkipped: 0 })
})
const summaryCards = computed(() => {
  if (props.selectedCaseId) {
    const latest = latestScopedExecutionRows.value[0]
    const total = countValue(latest?.stepTotal)
    const passed = countValue(latest?.stepPass)
    const failed = countValue(latest?.stepFail)
    const skipped = countValue(latest?.stepSkip)
    const completed = Math.min(total, passed + failed + skipped)
    const passRate = latest?.stepPassRate && latest.stepPassRate !== '-'
      ? latest.stepPassRate
      : total > 0 ? `${Math.round(passed * 10000 / total) / 100}%` : '-'
    return [
      { label: '总步骤', value: total, tone: '' },
      { label: '已完成', value: completed, tone: 'primary' },
      { label: '通过', value: passed, tone: 'success' },
      { label: '失败', value: failed, tone: 'danger' },
      { label: '跳过', value: skipped, tone: 'warning' },
      { label: '通过率', value: passRate, tone: 'success' },
    ]
  }
  return [
    { label: '总用例', value: executionSummary.value.total, tone: '' },
    { label: '已完成', value: executionSummary.value.completed, tone: 'primary' },
    { label: '通过', value: executionSummary.value.passed, tone: 'success' },
    { label: '失败', value: executionSummary.value.failed, tone: 'danger' },
    { label: '阻塞', value: executionSummary.value.blocked, tone: 'warning' },
    { label: '取消/跳过', value: executionSummary.value.cancelledOrSkipped, tone: '' },
  ]
})
const filteredRows = computed(() => scopedHistoryRows.value.filter((row) => matchesQuery(row, appliedQuery.value)))
const allBatchRows = computed(() => getDebugExecutionBatchRows(props.scene))
const liveBatchRows = computed(() => normalizeLiveBatches(props.liveExecutions || []))
const filteredBatchRows = computed(() => {
  const liveIds = new Set(liveBatchRows.value.map((item) => item.batchId))
  return [
    ...liveBatchRows.value,
    ...allBatchRows.value.filter((item) => !liveIds.has(item.batchId)),
  ].filter((row) => matchesBatchQuery(row, appliedQuery.value))
})
const pagedRows = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})
const pagedBatchRows = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredBatchRows.value.slice(start, start + pagination.pageSize)
})
const tableBatchMode = computed(() => viewMode.value === 'table' && !props.selectedCaseId)
const displayTotal = computed(() => tableBatchMode.value ? filteredBatchRows.value.length : filteredRows.value.length)
const activeViewLabel = computed(() => ({
  table: '表格视图',
  compact: '紧凑视图',
  timeline: '时间轴视图',
  cards: '卡片视图',
})[viewMode.value])
const historyScopeDescription = computed(() => props.selectedCaseId
  ? `当前用例 ${props.selectedCaseId} 的全部执行历史`
  : viewMode.value === 'table'
    ? '未选择用例，展示全部执行批次'
    : '未选择用例，展示全部用例执行记录')
onMounted(() => {
  const storedMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  if (isHistoryViewMode(storedMode)) viewMode.value = storedMode
})

watch(displayTotal, (total) => {
  pagination.total = total
  const maxPage = Math.max(1, Math.ceil(total / pagination.pageSize))
  if (pagination.current > maxPage) pagination.current = maxPage
  const currentRows = tableBatchMode.value ? filteredBatchRows.value : filteredRows.value
  if (expandedKeys.value.length && !currentRows.some((item) => item.rowKey === expandedKeys.value[0])) {
    expandedKeys.value = []
  }
}, { immediate: true })

watch(() => props.selectedCaseId, () => {
  pagination.current = 1
  expandedKeys.value = []
})

const queryFieldSpan = { xs: 24, sm: 8, xxl: 8 }
const queryFormColumns = computed<ColumnItem[]>(() => [
  { type: 'input', label: '批次/运行 ID', field: 'executionId', span: queryFieldSpan, props: { allowClear: true } },
  { type: 'input', label: '用例 ID', field: 'caseId', span: queryFieldSpan, props: { allowClear: true } },
  { type: 'input', label: '用例名称', field: 'caseName', span: queryFieldSpan, props: { allowClear: true } },
  {
    type: 'select',
    label: '执行方式',
    field: 'executionType',
    span: queryFieldSpan,
    props: { allowClear: true, options: executionTypeOptions },
  },
  {
    type: 'select',
    label: '执行状态',
    field: 'executeStatus',
    span: queryFieldSpan,
    props: {
      allowClear: true,
      options: [
        { label: '未开始', value: '未开始' },
        { label: '执行中', value: '执行中' },
        { label: '已完成', value: '已完成' },
      ],
    },
  },
  {
    type: 'select',
    label: '执行结果',
    field: 'executeResult',
    span: queryFieldSpan,
    props: {
      allowClear: true,
      options: [
        { label: '通过', value: '通过' },
        { label: '失败', value: '失败' },
        { label: '跳过', value: '跳过' },
        { label: '已取消', value: '已取消' },
      ],
    },
  },
  {
    type: 'input',
    label: '执行人',
    field: 'executeName',
    span: queryFieldSpan,
    foldable: true,
    props: { allowClear: true },
  },
  {
    type: 'input',
    label: '错误关键字',
    field: 'error',
    span: queryFieldSpan,
    foldable: true,
    props: { allowClear: true },
  },
  {
    type: 'range-picker',
    label: '开始时间',
    field: 'startedAt',
    span: queryFieldSpan,
    foldable: true,
    props: { showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
  },
])

const batchColumns: TableInstance['columns'] = [
  { title: '批次 ID', dataIndex: 'batchId', width: 130, fixed: 'left', ellipsis: true, tooltip: true, show: true, render: ({ record }: any) => (
    <span>{record.batchId}</span>
  ) },
  // {
  //   title: '用例概览',
  //   dataIndex: 'caseOverview',
  //   width: 300,
  //   render: ({ record }: any) => (
  //     <div class="batch-overview-cell">
  //       <span>{`共 ${record.caseTotal}`}</span>
  //       <span class="primary">{`完成 ${record.caseCompleted}`}</span>
  //       <span class="success">{`通过 ${record.casePass}`}</span>
  //       <span class="danger">{`失败 ${record.caseFail}`}</span>
  //       <span class="warning">{`阻塞 ${record.caseBlocked}`}</span>
  //       <span>{`取消/跳过 ${record.caseCancelled + record.caseSkip}`}</span>
  //     </div>
  //   ),
  // },
  { title: '总用例', dataIndex: 'caseTotal', width: 70, align: 'center', show: true },
  { title: '完成', dataIndex: 'caseCompleted', width: 50, align: 'center', show: true },
  { title: '通过', dataIndex: 'casePass', width: 50, align: 'center', show: true },
  { title: '失败', dataIndex: 'caseFail', width: 50, align: 'center', show: true },
  { title: '取消', dataIndex: 'caseCancelled', width: 50, align: 'center', show: true },
  { title: '阻塞', dataIndex: 'caseBlocked', width: 50, align: 'center', show: true },
  { title: '跳过', dataIndex: 'caseSkip', width: 50, align: 'center', show: true },
  { title: '执行进度', dataIndex: 'progress', width: 140, render: ({ record }: any) => <AutomationExecutionProgress progress={record.progress} indeterminate={record.progressIndeterminate} /> },
  { title: '状态', dataIndex: 'executeStatus', width: 60, align: 'center', render: ({ record }: any) => <a-tag color={executionStatusColor(record.executeStatus)}>{executionStatusLabel(record.executeStatus)}</a-tag> },
  { title: '结果', dataIndex: 'executeResult', width: 60, align: 'center', render: ({ record }: any) => <a-tag color={executionResultColor(record.executeResult)}>{executionResultLabel(record.executeResult)}</a-tag> },
  { title: '耗时', dataIndex: 'duration', width: 70, render: ({ record }: any) => formatExecutionDuration(record.duration) },
  { title: '执行人', dataIndex: 'executeName', width: 90, ellipsis: true, tooltip: true },
  { title: '执行方式', dataIndex: 'executionType', width: 150, render: ({ record }: any) => <a-tag color="arcoblue">{executionTypeLabel(record.executionType)}</a-tag> },
  { title: '开始时间', dataIndex: 'startedAt', width: 150, render: ({ record }: any) => formatExecutionDateTime(record.startedAt) },
  { title: '结束时间', dataIndex: 'finishedAt', width: 150, show: true, render: ({ record }: any) => formatExecutionDateTime(record.finishedAt) },
  // { title: '产品环境 ID', dataIndex: 'projectEnvironmentId', width: 140, show: false, ellipsis: true, tooltip: true },
  // { title: '产品环境', dataIndex: 'projectEnvironmentName', width: 160, show: false, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    width: 60,
    fixed: 'right',
    align: 'center',
    render: ({ record }: any) => (
      <a-link onClick={() => toggleExpanded(record.rowKey)}>{expandedKeys.value.includes(record.rowKey) ? '收起' : '详情'}</a-link>
    ),
  },
] as any

const columns: TableInstance['columns'] = [
  {
    title: '执行 ID',
    dataIndex: 'executionId',
    width: 130,
    fixed: 'left',
    ellipsis: true,
    tooltip: true,
    render: ({ record }: any) => (
      <span>{record.executionId}</span>
    ),
  },
  // { title: '批次 ID', dataIndex: 'batchId', width: 210, ellipsis: true, tooltip: true },
  // { title: '用例 ID', dataIndex: 'caseId', width: 150, ellipsis: true, tooltip: true },
  // {
  //   title: '用例名称',
  //   dataIndex: 'caseName',
  //   width: 220,
  //   ellipsis: true,
  //   tooltip: true,
  //   render: ({ record }: any) => (
  //     record.live
  //       ? <span>{record.caseName}</span>
  //       : <a-link onClick={() => toggleExpanded(record.rowKey)}>{record.caseName}</a-link>
  //   ),
  // },
  { title: '总步骤', dataIndex: 'stepTotal', width: 70, align: 'center' },
  { title: '通过', dataIndex: 'stepPass', width: 50, align: 'center' },
  { title: '失败', dataIndex: 'stepFail', width: 50, align: 'center' },
  { title: '跳过', dataIndex: 'stepSkip', width: 50, align: 'center' },
  {
    title: '进度',
    dataIndex: 'progress',
    width: 150,
    render: ({ record }: any) => (
      <AutomationExecutionProgress progress={record.progress} indeterminate={record.progressIndeterminate} />
    ),
  },
  {
    title: '状态',
    dataIndex: 'executeStatus',
    width: 60,
    align: 'center',
    render: ({ record }: any) => (
      <a-tag color={executionStatusColor(record.executeStatus)}>{executionStatusLabel(record.executeStatus)}</a-tag>
    ),
  },
  {
    title: '结果',
    dataIndex: 'executeResult',
    width: 60,
    align: 'center',
    render: ({ record }: any) => (
      <a-tag color={executionResultColor(record.executeResult)}>{executionResultLabel(record.executeResult)}</a-tag>
    ),
  },
  { title: '通过率', dataIndex: 'stepPassRate', width: 70, align: 'center' },
  {
    title: '耗时',
    dataIndex: 'duration',
    width: 70,
    align: 'center',
    render: ({ record }: any) => formatExecutionDuration(record.duration),
  },
  { title: '执行人', dataIndex: 'executeName', width: 90, ellipsis: true, tooltip: true },
  {
    title: '执行方式',
    dataIndex: 'executionType',
    width: 150,
    render: ({ record }: any) => <a-tag color="arcoblue">{executionTypeLabel(record.executionType)}</a-tag>,
  },
  {
    title: '开始时间',
    dataIndex: 'startedAt',
    width: 150,
    render: ({ record }: any) => formatExecutionDateTime(record.startedAt),
  },
  {
    title: '结束时间',
    dataIndex: 'finishedAt',
    width: 150,
    show: true,
    render: ({ record }: any) => formatExecutionDateTime(record.finishedAt),
  },
  // { title: '构建号', dataIndex: 'buildNumber', width: 100, show: false, ellipsis: true, tooltip: true },
  // { title: '产品环境 ID', dataIndex: 'projectEnvironmentId', width: 130, show: false, ellipsis: true, tooltip: true },
  // { title: '产品环境', dataIndex: 'projectEnvironmentName', width: 160, show: false, ellipsis: true, tooltip: true },
  // { title: '浏览器', dataIndex: 'browser', width: 110, show: false, ellipsis: true, tooltip: true },
  // { title: '显示窗口', dataIndex: 'headed', width: 90, show: false, align: 'center' },
  // { title: '起始地址', dataIndex: 'startUrl', width: 280, show: false, ellipsis: true, tooltip: true },
  // { title: '窗口模式', dataIndex: 'windowSizeMode', width: 120, show: false, ellipsis: true, tooltip: true },
  // { title: '视口尺寸', dataIndex: 'viewport', width: 120, show: false, ellipsis: true, tooltip: true },
  // { title: '失败步骤', dataIndex: 'failedStepIndex', width: 100, show: false, align: 'center' },
  // { title: '错误码', dataIndex: 'errorCode', width: 160, show: false, ellipsis: true, tooltip: true },
  // { title: '错误摘要', dataIndex: 'error', width: 300, show: false, ellipsis: true, tooltip: true },
  // { title: 'Trace', dataIndex: 'artifactTrace', width: 80, show: false, align: 'center', render: ({ record }: any) => artifactTag(record.artifactTrace) },
  // { title: '录屏产物', dataIndex: 'artifactVideo', width: 90, show: false, align: 'center', render: ({ record }: any) => artifactTag(record.artifactVideo) },
  // { title: '报告产物', dataIndex: 'artifactReport', width: 90, show: false, align: 'center', render: ({ record }: any) => artifactTag(record.artifactReport) },
  // { title: '失败截图', dataIndex: 'artifactScreenshot', width: 90, show: false, align: 'center', render: ({ record }: any) => artifactTag(record.artifactScreenshot) },
  // { title: '产物异常', dataIndex: 'artifactUploadError', width: 260, show: false, ellipsis: true, tooltip: true },
  // { title: 'Playwright CaseKey', dataIndex: 'playwrightCaseKey', width: 240, show: false, ellipsis: true, tooltip: true },
  // { title: '构建号', dataIndex: 'buildNumber', width: 100, show: false, ellipsis: true, tooltip: true },
  // { title: '产品环境 ID', dataIndex: 'projectEnvironmentId', width: 130, show: false, ellipsis: true, tooltip: true },
  // { title: '产品环境', dataIndex: 'projectEnvironmentName', width: 160, show: false, ellipsis: true, tooltip: true },
  // { title: '浏览器', dataIndex: 'browser', width: 110, show: false, ellipsis: true, tooltip: true },
  // { title: '显示窗口', dataIndex: 'headed', width: 90, show: false, align: 'center' },
  // { title: '起始地址', dataIndex: 'startUrl', width: 280, show: false, ellipsis: true, tooltip: true },
  // { title: '窗口模式', dataIndex: 'windowSizeMode', width: 120, show: false, ellipsis: true, tooltip: true },
  // { title: '视口尺寸', dataIndex: 'viewport', width: 120, show: false, ellipsis: true, tooltip: true },
  // { title: '失败步骤', dataIndex: 'failedStepIndex', width: 100, show: false, align: 'center' },
  // { title: '错误码', dataIndex: 'errorCode', width: 160, show: false, ellipsis: true, tooltip: true },
  // { title: '错误摘要', dataIndex: 'error', width: 300, show: false, ellipsis: true, tooltip: true },
  // {
  //   title: 'Trace',
  //   dataIndex: 'artifactTrace',
  //   width: 80,
  //   show: false,
  //   align: 'center',
  //   render: ({ record }: any) => artifactTag(record.artifactTrace),
  // },
  // {
  //   title: '录屏',
  //   dataIndex: 'artifactVideo',
  //   width: 80,
  //   show: false,
  //   align: 'center',
  //   render: ({ record }: any) => artifactTag(record.artifactVideo),
  // },
  // {
  //   title: '报告',
  //   dataIndex: 'artifactReport',
  //   width: 80,
  //   show: false,
  //   align: 'center',
  //   render: ({ record }: any) => artifactTag(record.artifactReport),
  // },
  // {
  //   title: '失败截图',
  //   dataIndex: 'artifactScreenshot',
  //   width: 90,
  //   show: false,
  //   align: 'center',
  //   render: ({ record }: any) => artifactTag(record.artifactScreenshot),
  // },
  // { title: '产物异常', dataIndex: 'artifactUploadError', width: 260, show: false, ellipsis: true, tooltip: true },
  // { title: 'Playwright CaseKey', dataIndex: 'playwrightCaseKey', width: 240, show: false, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    width: 140,
    fixed: 'right',
    align: 'center',
    render: ({ record }: any) => (
      record.live
        ? <a-tag color="arcoblue">实时执行</a-tag>
        : (
            <a-space size="mini">
              <a-link onClick={() => openResult(record, 'log')}>日志</a-link>
              <a-link onClick={() => openResult(record, 'report')}>报告</a-link>
              {record.executionType === 'extension-cdp'
                ? <a-tooltip content="Chrome DevTools Protocol 回放不支持录屏"><a-link disabled>录屏</a-link></a-tooltip>
                : <a-link onClick={() => openResult(record, 'video')}>录屏</a-link>}
            </a-space>
          )
    ),
  },
] as any

const executionResultDrawerRef = ref<{
  onOpen: (
    sceneId: string,
    type: ExecutionType,
    view: ExecutionViewType,
    options?: ExecutionResultOpenOptions,
  ) => void
}>()

const search = () => {
  appliedQuery.value = cloneQuery(queryForm)
  pagination.current = 1
  expandedKeys.value = []
}

const reset = () => {
  Object.assign(queryForm, createEmptyQuery())
  appliedQuery.value = createEmptyQuery()
  pagination.current = 1
  expandedKeys.value = []
}

const handleExpandedChange = (keys: Array<string | number>) => {
  const nextKey = keys.find((key) => !expandedKeys.value.includes(key))
  expandedKeys.value = nextKey == null ? [] : [nextKey]
  if (expandedKeys.value.length) scrollExpandedIntoView(String(expandedKeys.value[0]))
}

function toggleExpanded(rowKey: string) {
  expandedKeys.value = expandedKeys.value.includes(rowKey) ? [] : [rowKey]
  if (expandedKeys.value.length) scrollExpandedIntoView(rowKey)
}

function changeViewMode(mode: HistoryViewMode) {
  if (viewMode.value === mode) return
  viewMode.value = mode
  expandedKeys.value = []
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
}

function isHistoryViewMode(value: string | null): value is HistoryViewMode {
  return ['table', 'compact', 'timeline', 'cards'].includes(value || '')
}

function isExpanded(record: { rowKey: string }) {
  return expandedKeys.value.includes(record.rowKey)
}

function resultStateClass(value: unknown) {
  const label = executionResultLabel(value)
  if (label === '通过') return 'passed'
  if (label === '失败') return 'failed'
  if (label === '已取消') return 'cancelled'
  return 'neutral'
}

async function scrollExpandedIntoView(rowKey: string) {
  await nextTick()
  window.setTimeout(() => {
    const element = panelRef.value?.querySelector<HTMLElement>(`[data-history-expand="${cssEscape(rowKey)}"]`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, 80)
}

const historyRowClass = (record: ExecutionHistoryCaseRow) => {
  return expandedKeys.value.includes(record.rowKey) ? 'history-row-expanded' : ''
}
const batchRowClass = (record: ExecutionHistoryBatchRow) => {
  return expandedKeys.value.includes(record.rowKey) ? 'history-row-expanded' : ''
}

function artifactTag(value: string) {
  return value === '有' ? <a-tag color="green">有</a-tag> : <span>-</span>
}

function openResult(record: ExecutionHistoryCaseRow, view: Exclude<ExecutionViewType, 'record'>) {
  if (!props.scene?.id || record.live) return
  executionResultDrawerRef.value?.onOpen(String(props.scene.id), record.executionType, view, {
    source: 'debug',
    target: record.recordTarget,
  })
}

function normalizeLiveExecution(item: LiveExecutionCase): ExecutionHistoryCaseRow {
  const terminal = ['passed', 'failed', 'cancelled'].includes(item.status)
  const duration = item.startedAt
    ? Math.max(0, (item.finishedAt || Date.now()) - item.startedAt)
    : 0
  return {
    rowKey: `live-${item.batchId}-${item.caseId}`,
    recordKey: `live-${item.batchId}`,
    recordTarget: { recordKey: `live-${item.batchId}`, caseId: item.caseId },
    executionType: item.executionType,
    executionId: item.executionId,
    startedAt: item.startedAt,
    finishedAt: item.finishedAt,
    caseId: item.caseId,
    caseName: item.caseName,
    executeStatus: item.status,
    executeResult: terminal ? item.status : undefined,
    duration,
    executeName: item.executeName || '-',
    buildNumber: '-',
    stepPassRate: '-',
    stepTotal: item.stepTotal,
    stepPass: '-',
    stepFail: '-',
    stepSkip: '-',
    projectEnvironmentId: '-',
    projectEnvironmentName: '-',
    browser: '-',
    headed: '-',
    startUrl: '-',
    windowSizeMode: '-',
    viewport: '-',
    failedStepIndex: '-',
    errorCode: '-',
    error: item.error || '-',
    artifactTrace: '-',
    artifactVideo: '-',
    artifactReport: '-',
    artifactScreenshot: '-',
    artifactUploadError: '-',
    playwrightCaseKey: '-',
    steps: [],
    summaryOnly: false,
    live: true,
    batchId: item.batchId,
    progress: terminal ? 100 : item.status === 'waiting' ? 0 : null,
    progressIndeterminate: !terminal && item.status !== 'waiting',
  }
}

function normalizeLiveBatches(items: LiveExecutionCase[]): ExecutionHistoryBatchRow[] {
  const groups = new Map<string, LiveExecutionCase[]>()
  items.forEach((item) => groups.set(item.batchId, [...(groups.get(item.batchId) || []), item]))
  return [...groups.entries()].map(([batchId, batchItems]) => {
    const cases = batchItems.map(normalizeLiveExecution)
    const terminalCases = batchItems.filter((item) => ['passed', 'failed', 'cancelled'].includes(item.status))
    const failed = batchItems.filter((item) => item.status === 'failed').length
    const cancelled = batchItems.filter((item) => item.status === 'cancelled').length
    const passed = batchItems.filter((item) => item.status === 'passed').length
    const startedTimes = batchItems.map((item) => item.startedAt || 0).filter(Boolean)
    const finishedTimes = batchItems.map((item) => item.finishedAt || 0).filter(Boolean)
    const startedAt = startedTimes.length ? Math.min(...startedTimes) : undefined
    const finishedAt = terminalCases.length === batchItems.length && finishedTimes.length ? Math.max(...finishedTimes) : undefined
    return {
      rowKey: `live-batch-${batchId}`,
      recordKey: `live-${batchId}`,
      recordTarget: { recordKey: `live-${batchId}`, executionId: batchId },
      batchId,
      executionType: batchItems[0]?.executionType || 'playwright-runner',
      caseTotal: batchItems.length,
      caseCompleted: terminalCases.length,
      casePass: passed,
      caseFail: failed,
      caseCancelled: cancelled,
      caseBlocked: 0,
      caseSkip: 0,
      progress: batchItems.length ? Math.round(terminalCases.length * 10000 / batchItems.length) / 100 : 0,
      progressIndeterminate: false,
      executeStatus: terminalCases.length === batchItems.length ? 'completed' : 'running',
      executeResult: terminalCases.length !== batchItems.length ? 'running' : failed ? 'failed' : cancelled ? 'cancelled' : 'passed',
      executeName: batchItems[0]?.executeName || '-',
      startedAt,
      finishedAt,
      duration: startedAt ? Math.max(0, (finishedAt || Date.now()) - startedAt) : 0,
      projectEnvironmentId: '-',
      projectEnvironmentName: '-',
      cases,
      live: true,
    }
  })
}

function createEmptyQuery(): HistoryQuery {
  return {
    executionId: '',
    caseId: '',
    caseName: '',
    executionType: '',
    executeStatus: '',
    executeResult: '',
    executeName: '',
    error: '',
    startedAt: [],
  }
}

function cloneQuery(value: HistoryQuery): HistoryQuery {
  return { ...value, startedAt: [...(value.startedAt || [])] }
}

function matchesQuery(row: ExecutionHistoryCaseRow, query: HistoryQuery) {
  if (!includesText(row.executionId, query.executionId)) return false
  if (!includesText(row.caseId, query.caseId)) return false
  if (!includesText(row.caseName, query.caseName)) return false
  if (query.executionType && row.executionType !== query.executionType) return false
  if (query.executeStatus && executionStatusLabel(row.executeStatus) !== query.executeStatus) return false
  if (query.executeResult && executionResultLabel(row.executeResult) !== query.executeResult) return false
  if (!includesText(row.executeName, query.executeName)) return false
  if (!includesText(`${row.errorCode} ${row.error}`, query.error)) return false
  return matchesDateRange(row.startedAt, query.startedAt)
}

function matchesBatchQuery(row: ExecutionHistoryBatchRow, query: HistoryQuery) {
  if (!includesText(row.batchId, query.executionId)
    && !row.cases.some((item) => includesText(item.executionId, query.executionId))) {
    return false
  }
  if (query.caseId && !row.cases.some((item) => includesText(item.caseId, query.caseId))) return false
  if (query.caseName && !row.cases.some((item) => includesText(item.caseName, query.caseName))) return false
  if (query.executionType && row.executionType !== query.executionType) return false
  if (query.executeStatus && executionStatusLabel(row.executeStatus) !== query.executeStatus) return false
  if (query.executeResult && executionResultLabel(row.executeResult) !== query.executeResult) return false
  if (!includesText(row.executeName, query.executeName)) return false
  if (query.error && !row.cases.some((item) => includesText(`${item.errorCode} ${item.error}`, query.error))) return false
  return matchesDateRange(row.startedAt, query.startedAt)
}

function includesText(value: unknown, keyword: string) {
  if (!keyword) return true
  return String(value ?? '').toLowerCase().includes(keyword.trim().toLowerCase())
}

function countValue(value: unknown) {
  const count = Number(value)
  return Number.isFinite(count) && count >= 0 ? count : 0
}

function matchesDateRange(value: unknown, range: string[]) {
  if (!Array.isArray(range) || range.length < 2 || !range[0] || !range[1]) return true
  const timestamp = new Date(String(value || '')).getTime()
  const start = new Date(range[0]).getTime()
  const end = new Date(range[1]).getTime()
  if (![timestamp, start, end].every(Number.isFinite)) return false
  return timestamp >= start && timestamp <= end
}

function cssEscape(value: string) {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&')
}
</script>

<style scoped lang="scss">
// :deep(.arco-table-size-small .arco-table-cell) {
//   padding: 8px 0px;
// }

.execution-history-panel {
  min-width: 0;
  min-height: 620px;
  padding-bottom: 16px;
}

.history-summary {
  margin: 14px 0 10px;
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
}

.history-summary__header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}

.history-summary__header strong {
  color: var(--color-text-1);
  font-size: 14px;
}

.history-summary__header span {
  color: var(--color-text-3);
  font-size: 12px;
}

.history-summary__stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(96px, 1fr));
  gap: 10px;
}

.history-summary__stats > div {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--color-border-2);
  border-radius: 9px;
  background: var(--color-bg-1);
}

.history-summary__stats strong {
  color: var(--color-text-1);
  font-size: 20px;
}

.history-summary__stats span {
  color: var(--color-text-3);
  font-size: 12px;
}

.history-summary__stats .primary strong { color: rgb(var(--primary-6)); }
.history-summary__stats .success strong { color: rgb(var(--success-6)); }
.history-summary__stats .danger strong { color: rgb(var(--danger-6)); }
.history-summary__stats .warning strong { color: rgb(var(--warning-6)); }

.history-title {
  color: var(--color-text-1);
  font-size: 16px;
  font-weight: 600;
}

.history-description {
  margin-top: 3px;
  color: var(--color-text-3);
  font-size: 12px;
}

.history-view-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 14px 0 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
}

.view-mode-switch {
  flex-shrink: 0;
  padding: 3px;
  border-radius: 8px;
  background: var(--color-fill-2);
}

.history-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.batch-overview-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 1.5;
}

.batch-overview-cell .primary { color: rgb(var(--primary-6)); }
.batch-overview-cell .success { color: rgb(var(--success-6)); }
.batch-overview-cell .danger { color: rgb(var(--danger-6)); }
.batch-overview-cell .warning { color: rgb(var(--warning-6)); }

.view-mode-switch :deep(.arco-btn) {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-3);
  box-shadow: none;
  transition: color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}

.view-mode-switch :deep(.arco-btn:hover) {
  color: rgb(var(--primary-6));
}

.view-mode-switch :deep(.view-mode-button--active) {
  background: var(--color-bg-2);
  color: rgb(var(--primary-6));
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}

.history-alternative-view {
  display: block;
  width: 100%;
  min-height: 300px;
}

.history-compact-list,
.history-record-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-compact-item,
.history-timeline-card,
.history-record-card {
  border: 1px solid var(--color-border-2);
  background: var(--color-bg-2);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.history-compact-item {
  overflow: hidden;
  border-radius: 10px;
}

.history-compact-item:hover,
.history-timeline-card:hover,
.history-record-card:hover,
.history-item--expanded,
.history-card-item--expanded .history-record-card {
  border-color: rgb(var(--primary-3));
  box-shadow: 0 8px 24px rgb(0 0 0 / 6%);
}

.history-compact-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  overflow-x: auto;
}

.history-record-toggle {
  display: grid;
  min-width: 870px;
  flex: 1;
  grid-template-columns: 12px minmax(230px, 1.5fr) auto auto auto auto minmax(140px, .8fr) auto minmax(150px, auto) 18px;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.history-record-toggle:disabled,
.history-card-title:disabled {
  cursor: default;
}

.history-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-neutral-4);
  box-shadow: 0 0 0 4px var(--color-fill-2);
}

.history-status-dot--passed,
.history-record-timeline-node--passed {
  background: rgb(var(--success-6));
}

.history-status-dot--failed,
.history-record-timeline-node--failed {
  background: rgb(var(--danger-6));
}

.history-status-dot--cancelled,
.history-record-timeline-node--cancelled {
  background: rgb(var(--warning-6));
}

.history-status-dot--neutral,
.history-record-timeline-node--neutral {
  background: var(--color-neutral-4);
}

.history-record-identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.history-record-identity strong,
.history-record-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-record-identity strong {
  color: var(--color-text-1);
}

.history-record-identity span,
.history-compact-time,
.history-timeline-meta,
.history-card-subtitle,
.history-card-footer {
  color: var(--color-text-3);
  font-size: 12px;
}

.history-compact-stat,
.history-compact-time {
  white-space: nowrap;
}

.metric-success,
.metric-success strong {
  color: rgb(var(--success-6)) !important;
}

.metric-danger,
.metric-danger strong {
  color: rgb(var(--danger-6)) !important;
}

.history-expand-icon {
  transition: transform 180ms ease, color 180ms ease;
}

.history-expand-icon--active {
  transform: rotate(180deg);
  color: rgb(var(--primary-6));
}

.history-actions {
  flex-shrink: 0;
}

.history-record-timeline {
  position: relative;
  gap: 16px;
}

.history-record-timeline::before {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 19px;
  width: 2px;
  background: linear-gradient(to bottom, rgb(var(--primary-2)), var(--color-border-2));
  content: '';
}

.history-record-timeline-item {
  position: relative;
  padding-left: 52px;
}

.history-record-timeline-node {
  position: absolute;
  z-index: 1;
  top: 20px;
  left: 12px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-bg-2);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--color-border-2);
}

.history-timeline-card,
.history-record-card {
  min-width: 0;
  padding: 16px;
  border-radius: 12px;
}

.history-timeline-card:hover,
.history-record-card:hover {
  transform: translateY(-1px);
}

.history-card-header {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.history-card-title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-1);
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.history-card-title span,
.history-card-title small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-card-title small {
  color: var(--color-text-3);
  font-weight: 400;
}

.history-timeline-meta,
.history-card-subtitle,
.history-card-footer > div {
  display: flex;
  align-items: center;
  gap: 14px;
}

.history-timeline-meta {
  flex-wrap: wrap;
  margin-top: 10px;
}

.history-view-progress {
  // max-width: 270px;
  margin-top: 12px;
}

.history-timeline-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.history-metric-strip {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-top: 14px;
  padding: 11px 12px;
  border-radius: 8px;
  background: var(--color-fill-1);
  color: var(--color-text-3);
  font-size: 12px;
}

.history-metric-strip .history-actions {
  margin-left: auto;
}

.history-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.history-card-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.history-card-item--expanded {
  grid-column: 1 / -1;
}

.history-card-subtitle {
  margin-top: 12px;
}

.history-card-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
  padding: 14px 0;
  border-top: 1px solid var(--color-border-2);
  border-bottom: 1px solid var(--color-border-2);
}

.history-card-metrics > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: center;
}

.history-card-metrics span {
  color: var(--color-text-3);
  font-size: 12px;
}

.history-card-metrics strong {
  color: var(--color-text-1);
  font-size: 16px;
}

.history-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 13px;
}

.history-card-footer > div {
  min-width: 0;
  overflow: hidden;
}

.history-card-footer > div span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 14px 4px 2px;
  border-top: 1px solid var(--color-border-2);
}

:deep(.history-row-expanded .arco-table-td) {
  background: rgb(var(--primary-1)) !important;
}

:deep(.arco-table-expand-btn) {
  transition: transform 180ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .history-compact-item,
  .history-timeline-card,
  .history-record-card,
  .history-expand-icon,
  .view-mode-switch :deep(.arco-btn),
  :deep(.arco-table-expand-btn) {
    animation: none;
    scroll-behavior: auto;
    transition: none;
  }
}

@media (max-width: 900px) {
  .history-summary__stats {
    grid-template-columns: repeat(3, minmax(96px, 1fr));
  }

  .history-view-toolbar,
  .history-card-header,
  .history-card-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .view-mode-switch {
    align-self: flex-end;
  }

  .history-toolbar-actions {
    align-items: flex-end;
    flex-direction: column-reverse;
  }

  .history-card-grid {
    grid-template-columns: 1fr;
  }

  .history-card-item--expanded {
    grid-column: auto;
  }

  .history-metric-strip {
    flex-wrap: wrap;
  }

  .history-metric-strip .history-actions {
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 600px) {
  .history-summary__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .history-summary__stats {
    grid-template-columns: repeat(2, minmax(96px, 1fr));
  }

  .history-record-timeline-item {
    padding-left: 36px;
  }

  .history-record-timeline::before {
    left: 11px;
  }

  .history-record-timeline-node {
    left: 4px;
  }

  .history-card-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
