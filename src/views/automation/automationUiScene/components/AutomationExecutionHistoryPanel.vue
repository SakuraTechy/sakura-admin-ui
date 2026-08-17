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
        <div
          v-if="sceneFilterOptions.length"
          class="history-scene-filter"
          :style="{ width: `${sceneFilterWidth}px` }"
        >
          <a-select
            :model-value="sceneFilterValue"
            :options="sceneFilterOptions"
            allow-search
            :fallback-option="false"
            size="small"
            class="history-scene-filter-select"
            placeholder="请选择执行历史范围"
            @change="(value) => emit('scene-change', String(value || ''))"
          />
        </div>
        <a-button
          v-else
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
      :key="aggregatePlanBatches ? 'plan-batch-history' : 'scene-batch-history'"
      :data="pagedBatchRows"
      :columns="batchColumns"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ y: 560 }"
      :expanded-keys="expandedKeys"
      :expandable="{ width: 48 }"
      :row-class="batchRowClass"
      row-key="rowKey"
      size="small"
      :table-id="aggregatePlanBatches
        ? 'automation-execution-plan-batch-history'
        : 'automation-execution-scene-batch-history'"
      :disabled-column-keys="['batchId', 'action']"
      @expanded-change="handleExpandedChange"
      @refresh="emit('refresh')"
    >
      <template #expand-row="{ record }">
        <AutomationExecutionBatchDetail
          :batch="record"
          :force-scene-groups="aggregatePlanBatches"
        />
      </template>
    </GiTable>

    <GiTable
      v-else-if="viewMode === 'table'"
      :data="pagedRows"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ y: 560 }"
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
              <!-- <icon-down class="history-expand-icon" :class="{ 'history-expand-icon--active': isExpanded(record) }" /> -->
              <span class="history-record-identity">
                <strong>{{ isMultiScene ? `${record.sceneName} / ${record.caseName}` : record.caseName }}</strong>
                <span>{{ record.caseId }} · {{ record.executionId }}</span>
              </span>
              <a-tag color="arcoblue">{{ executionTypeLabel(record.executionType) }}</a-tag>
              <AutomationExecutionProgress :progress="record.progress" :indeterminate="record.progressIndeterminate" />
              <span class="history-compact-stat">{{ formatExecutionDuration(record.duration) }}</span>
              <span class="history-compact-stat metric-success">通过 {{ record.stepPass }}</span>
              <span class="history-compact-stat metric-danger">失败 {{ record.stepFail }}</span>
              <span class="history-compact-stat metric-warning">跳过 {{ record.stepSkip }}</span>
              <a-tag :color="executionDisplayResultColor(record.executeResult, record.executeStatus)">
                {{ executionDisplayResultLabel(record.executeResult, record.executeStatus) }}
              </a-tag>
              <span class="history-compact-time">{{ formatExecutionDateTime(record.startedAt) }}</span>
            </button>
            <a-space class="history-actions" size="mini">
              <a-link v-if="isCaseCancellable(record)" status="danger" @click="requestCaseCancel(record)">
                取消
              </a-link>
              <a-link v-if="!record.live" @click="openResult(record, 'log')">日志</a-link>
              <a-link v-if="record.executionType === 'playwright-runner'" @click="openResult(record, 'live')">实时画面</a-link>
              <a-link v-if="!record.live" @click="openResult(record, 'report')">报告</a-link>
              <a-link v-if="!record.live && record.executionType !== 'extension-cdp'" @click="openResult(record, 'video')">录屏</a-link>
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
                <span>{{ isMultiScene ? `${record.sceneName} / ${record.caseName}` : record.caseName }}</span>
                <small>{{ record.caseId }} · {{ record.executionId }}</small>
              </button>
              <a-space wrap>
                <a-tag color="arcoblue">{{ executionTypeLabel(record.executionType) }}</a-tag>
                <a-tag :color="executionStatusColor(record.executeStatus)">
                  {{ executionStatusLabel(record.executeStatus) }}
                </a-tag>
                <a-tag :color="executionDisplayResultColor(record.executeResult, record.executeStatus)">
                  {{ executionDisplayResultLabel(record.executeResult, record.executeStatus) }}
                </a-tag>
              </a-space>
            </div>
            <AutomationExecutionProgress class="history-view-progress" :progress="record.progress" :indeterminate="record.progressIndeterminate" />
            <!-- <div class="history-timeline-meta">
              <span><icon-calendar />{{ formatExecutionDateTime(record.startedAt) }}</span>
              <span><icon-user />{{ record.executeName }}</span>
              <span><icon-clock-circle />{{ formatExecutionDuration(record.duration) }}</span>
            </div> -->
            <div class="history-metric-strip">
              <div style="display: flex; gap: 25px;">
                <span>总步骤 <strong>{{ record.stepTotal }}</strong></span>
                <span class="metric-success">通过 <strong>{{ record.stepPass }}</strong></span>
                <span class="metric-danger">失败 <strong>{{ record.stepFail }}</strong></span>
                <span>跳过 <strong>{{ record.stepSkip }}</strong></span>
                <span>通过率 <strong>{{ record.stepPassRate }}</strong></span>
                <span><icon-calendar /> {{ formatExecutionDateTime(record.startedAt) }}</span>
                <span><icon-calendar /> {{ formatExecutionDateTime(record.finishedAt) }}</span>
                <span><icon-clock-circle /> {{ formatExecutionDuration(record.duration) }}</span>
                <span><icon-user /> {{ record.executeName }}</span>
              </div>
              <a-space class="history-actions" size="mini">
                <a-link v-if="isCaseCancellable(record)" status="danger" @click="requestCaseCancel(record)">
                  取消
                </a-link>
                <a-link v-if="!record.live" @click="openResult(record, 'log')">日志</a-link>
                <a-link v-if="record.executionType === 'playwright-runner'" @click="openResult(record, 'live')">实时画面</a-link>
                <a-link v-if="!record.live" @click="openResult(record, 'report')">报告</a-link>
                <a-link v-if="!record.live && record.executionType !== 'extension-cdp'" @click="openResult(record, 'video')">录屏</a-link>
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
                <span>{{ isMultiScene ? `${record.sceneName} / ${record.caseName}` : record.caseName }}</span>
                <div class="history-card-subtitle">
                  <span>{{ record.caseId }} · {{ record.executionId }}</span>
                  <!-- <span><icon-user /> {{ record.executeName }}</span> -->
                </div>
              </button>
              <a-space wrap> 
                <a-tag color="arcoblue">{{ executionTypeLabel(record.executionType) }}</a-tag>
                <a-tag :color="executionStatusColor(record.executeStatus)">
                  {{ executionStatusLabel(record.executeStatus) }}
                </a-tag>
                <a-tag :color="executionDisplayResultColor(record.executeResult, record.executeStatus)">
                  {{ executionDisplayResultLabel(record.executeResult, record.executeStatus) }}
                </a-tag>
              </a-space>
            </div>
            <!-- <div class="history-card-subtitle">
              <a-tag color="arcoblue">{{ executionTypeLabel(record.executionType) }}</a-tag>
              <span>{{ record.executionId }}</span>
            </div> -->
            <AutomationExecutionProgress class="history-view-progress" :progress="record.progress" :indeterminate="record.progressIndeterminate" />
            <div class="history-card-metrics">
              <div><span>步骤</span><strong>{{ record.stepTotal }}</strong></div>
              <div><span>通过</span><strong class="metric-success">{{ record.stepPass }}</strong></div>
              <div><span>失败</span><strong class="metric-danger">{{ record.stepFail }}</strong></div>
              <div><span>通过率</span><strong>{{ record.stepPassRate }}</strong></div>
            </div>
            <div class="history-card-footer">
              <div>
                <span><icon-user /> {{ record.executeName }}</span>
                <span><icon-calendar /> {{ formatExecutionDateTime(record.startedAt) }}</span>
                <!-- <span><icon-clock-circle /> {{ formatExecutionDateTime(record.finishedAt) }}</span> -->
                <span><icon-clock-circle /> {{ formatExecutionDuration(record.duration) }}</span>
              </div>
              <a-space class="history-actions" size="mini">
                <a-link v-if="isCaseCancellable(record)" status="danger" @click="requestCaseCancel(record)">
                  取消
                </a-link>
                <a-link v-if="!record.live" @click="openResult(record, 'log')">日志</a-link>
                <a-link v-if="record.executionType === 'playwright-runner'" @click="openResult(record, 'live')">实时画面</a-link>
                <a-link v-if="!record.live" @click="openResult(record, 'report')">报告</a-link>
                <a-link v-if="!record.live && record.executionType !== 'extension-cdp'" @click="openResult(record, 'video')">录屏</a-link>
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
  type ExecutionRecordSource,
  type ExecutionResultOpenOptions,
  type ExecutionType,
  type ExecutionViewType,
  type LiveExecutionCase,
  executionDisplayResultColor,
  executionDisplayResultLabel,
  executionAggregateResultLabel,
  executionResultLabel,
  executionStatusColor,
  executionStatusLabel,
  executionTypeLabel,
  executionTypeOptions,
  aggregateExecutionBatchRows,
  formatExecutionDateTime,
  formatExecutionDuration,
  executionLogTimeRange,
  getExecutionBatchRows,
  getExecutionHistoryRows,
} from '../execution'
import AutomationExecutionBatchDetail from './AutomationExecutionBatchDetail.vue'
import AutomationExecutionHistoryDetail from './AutomationExecutionHistoryDetail.vue'
import AutomationExecutionProgress from './AutomationExecutionProgress.vue'
import AutomationExecutionResultDrawer from './AutomationExecutionResultDrawer.vue'
import type { AutomationUiSceneDetailResp, AutomationUiSceneResp } from '@/apis/automation/automationUiScene'
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

type HistoryScene = AutomationUiSceneDetailResp | AutomationUiSceneResp

const props = withDefaults(defineProps<{
  scene?: HistoryScene
  scenes?: HistoryScene[]
  recordSource?: ExecutionRecordSource
  testPlanId?: string
  multiScene?: boolean
  aggregatePlanBatches?: boolean
  /** 非测试计划历史也可按执行批次聚合展示。 */
  aggregateBatches?: boolean
  sceneFilterValue?: string
  sceneFilterOptions?: Array<{ label: string, value: string }>
  loading?: boolean
  selectedCaseId?: string
  liveExecutions?: LiveExecutionCase[]
}>(), {
  scenes: () => [],
  recordSource: 'debug',
  liveExecutions: () => [],
  sceneFilterValue: '',
  sceneFilterOptions: () => [],
})
const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'show-all'): void
  (e: 'scene-change', value: string): void
  (e: 'cancel-batch', row: ExecutionHistoryBatchRow, markCancelling: () => void): void
  (e: 'cancel-case', row: ExecutionHistoryCaseRow, markCancelling: () => void): void
}>()

const VIEW_MODE_STORAGE_KEY = 'automation-execution-history-view-mode'
const viewMode = ref<HistoryViewMode>('table')
const panelRef = ref<HTMLElement>()
const expandedKeys = ref<Array<string | number>>([])
const latestBatchKey = ref('')
const cancellingBatchKeys = ref(new Set<string>())
const cancellingCaseKeys = ref(new Set<string>())
const refreshedTerminalExecutionKeys = new Set<string>()
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

const historyScenes = computed<any[]>(() => props.scenes.length
  ? props.scenes
  : props.scene ? [props.scene] : [])
const isMultiScene = computed(() => props.multiScene || historyScenes.value.length > 1)
// 选择器宽度按最长选项估算，避免场景名称被截断，同时限制最大宽度防止撑破工具栏。
const sceneFilterWidth = computed(() => {
  const maxTextWidth = props.sceneFilterOptions.reduce((maxWidth, option) => {
    const text = String(option?.label || option?.value || '')
    const textWidth = [...text].reduce((width, char) => (
      width + (/^[\u2e80-\u9fff]$/u.test(char) ? 14 : 8)
    ), 0)
    return Math.max(maxWidth, textWidth)
  }, 0)
  return Math.min(640, Math.max(150, maxTextWidth + 56))
})
// 全部场景按计划报告聚合；筛选单个场景时恢复用例批次口径。
const aggregatePlanBatches = computed(() => (
  isMultiScene.value
  && (props.aggregateBatches || (props.aggregatePlanBatches && props.recordSource === 'test'))
))
const historySceneKeys = computed(() => new Set(historyScenes.value.map(item => String(item?.id || '')).filter(Boolean)))
const effectiveLiveExecutions = computed(() => props.liveExecutions.filter((item) => (
  (item.sceneKey ? historySceneKeys.value.has(item.sceneKey) : historyScenes.value.length === 1)
  && (item.recordSource || 'debug') === props.recordSource
  && (props.recordSource !== 'test' || String(item.testPlanId || '') === String(props.testPlanId || ''))
)))
const allHistoryRows = computed(() => historyScenes.value.flatMap(scene => (
  getExecutionHistoryRows(scene, props.recordSource, props.testPlanId)
)).sort((left, right) => historyTime(right.startedAt) - historyTime(left.startedAt)))
const persistedLiveRows = computed(() => {
  const rows = new Map<string, ExecutionHistoryCaseRow>()
  allHistoryRows.value.forEach((row) => {
    const key = executionHistoryCaseKey(row)
    if (!rows.has(key)) rows.set(key, row)
  })
  return rows
})
const liveHistoryRows = computed(() => effectiveLiveExecutions.value.map((item) => {
  const liveRow = normalizeLiveExecution(item)
  const persistedRow = persistedLiveRows.value.get(executionHistoryCaseKey(liveRow))
  return hydrateCompletedLiveRow(liveRow, persistedRow)
}))
const scopedHistoryRows = computed(() => {
  const liveExecutionIds = new Set(liveHistoryRows.value.map((item) => `${item.sceneKey}:${item.executionId}`))
  const rows = [
    ...liveHistoryRows.value,
    ...allHistoryRows.value.filter((item) => !liveExecutionIds.has(`${item.sceneKey}:${item.executionId}`)),
  ]
  const displayedRows = rows.map(applyPendingCaseState)
  if (props.selectedCaseId) {
    return displayedRows.filter((row) => row.caseId === props.selectedCaseId)
  }
  return displayedRows
})
const sceneCases = computed(() => historyScenes.value.flatMap(scene => (
  (Array.isArray(scene?.caseList) ? scene.caseList : []).map((item: any) => ({
    sceneKey: String(scene?.id || ''),
    caseId: String(item.id),
  }))
)))
const latestScopedExecutionRows = computed(() => {
  const currentCaseIds = new Set(sceneCases.value.map(item => `${item.sceneKey}:${item.caseId}`))
  const latestByCaseId = new Map<string, ExecutionHistoryCaseRow>()
  scopedHistoryRows.value.forEach((row) => {
    const rowCaseKey = `${row.sceneKey || ''}:${row.caseId}`
    if (!row.caseId || row.caseId === '-' || latestByCaseId.has(rowCaseKey)) return
    if (!props.selectedCaseId && currentCaseIds.size > 0 && !currentCaseIds.has(rowCaseKey)) return
    latestByCaseId.set(rowCaseKey, row)
  })
  return [...latestByCaseId.values()]
})
const executionSummary = computed(() => {
  const sceneCaseTotal = sceneCases.value.length
  const total = props.selectedCaseId ? 1 : (sceneCaseTotal || latestScopedExecutionRows.value.length)
  return latestScopedExecutionRows.value.reduce((summary, row) => {
    const status = executionStatusLabel(row.executeStatus)
    const result = executionResultLabel(row.executeResult)
    if (['已完成', '已取消'].includes(status)) summary.completed += 1
    if (result === '通过') summary.passed += 1
    if (result === '失败') summary.failed += 1
    if (result === '阻塞') summary.blocked += 1
    if (result === '已取消') summary.cancelled += 1
    if (result === '跳过') summary.skipped += 1
    return summary
  }, { total, completed: 0, passed: 0, failed: 0, blocked: 0, cancelled: 0, skipped: 0 })
})
const summaryCards = computed(() => {
  if (tableBatchMode.value && aggregatePlanBatches.value) {
    const latestByScene = new Map<string, any>()
    filteredBatchRows.value
      .slice()
      .sort((left, right) => historyTime(right.startedAt) - historyTime(left.startedAt))
      .forEach((batch) => {
        const summaries = batch.sceneSummaries?.length
          ? batch.sceneSummaries
          : [{
              key: batch.sceneKey || batch.sceneId || batch.sceneName || batch.rowKey,
              executeStatus: batch.executeStatus,
              executeResult: batch.executeResult,
            }]
        summaries.forEach((scene) => {
          if (!latestByScene.has(scene.key)) latestByScene.set(scene.key, scene)
        })
      })
    const sceneRows = [...latestByScene.values()]
    const completed = sceneRows.filter(row => ['已完成', '已取消'].includes(executionStatusLabel(row.executeStatus))).length
    const passed = sceneRows.filter(row => executionResultLabel(row.executeResult) === '通过').length
    const failed = sceneRows.filter(row => executionResultLabel(row.executeResult) === '失败').length
    const blocked = sceneRows.filter(row => executionResultLabel(row.executeResult) === '阻塞').length
    const cancelled = sceneRows.filter(row => executionResultLabel(row.executeResult) === '已取消').length
    const skipped = sceneRows.filter(row => executionResultLabel(row.executeResult) === '跳过').length
    return [
      { label: '总场景', value: sceneRows.length, tone: '' },
      { label: '已完成', value: completed, tone: 'primary' },
      { label: '通过', value: passed, tone: 'success' },
      { label: '失败', value: failed, tone: 'danger' },
      { label: '阻塞', value: blocked, tone: 'warning' },
      { label: '取消', value: cancelled, tone: '' },
      { label: '跳过', value: skipped, tone: '' },
    ]
  }
  if (props.selectedCaseId) {
    const latest = latestScopedExecutionRows.value[0]
    const total = countValue(latest?.stepTotal)
    const passed = countValue(latest?.stepPass)
    const failed = countValue(latest?.stepFail)
    const skipped = countValue(latest?.stepSkip)
    const completed = Math.min(total, passed + failed + skipped)
    const passRate = latest?.stepPassRate && latest.stepPassRate !== '0%'
      ? latest.stepPassRate
      : total > 0 ? `${Math.round(passed * 10000 / total) / 100}%` : '0%'
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
    { label: '取消', value: executionSummary.value.cancelled, tone: '' },
    { label: '跳过', value: executionSummary.value.skipped, tone: '' },
  ]
})
const filteredRows = computed(() => scopedHistoryRows.value.filter((row) => matchesQuery(row, appliedQuery.value)))
const allBatchRows = computed(() => {
  const rows = historyScenes.value.flatMap(scene => (
    getExecutionBatchRows(scene, props.recordSource, props.testPlanId)
  ))
  const merged = aggregatePlanBatches.value ? aggregateExecutionBatchRows(rows) : rows
  return merged.sort((left, right) => historyTime(right.startedAt) - historyTime(left.startedAt))
})
const liveBatchRows = computed(() => {
  const rows = normalizeLiveBatches(effectiveLiveExecutions.value, persistedLiveRows.value)
  return aggregatePlanBatches.value ? aggregateExecutionBatchRows(rows) : rows
})
const filteredBatchRows = computed(() => {
  const liveIds = new Set(liveBatchRows.value.map(batchIdentity))
  return [
    ...liveBatchRows.value,
    ...allBatchRows.value.filter((item) => !liveIds.has(batchIdentity(item))),
  ].map(applyPendingBatchState).filter((row) => matchesBatchQuery(row, appliedQuery.value))
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
  : isMultiScene.value
    ? props.recordSource === 'test'
      ? viewMode.value === 'table' ? '展示当前计划全部场景执行批次' : '展示当前计划全部场景用例执行记录'
      : viewMode.value === 'table' ? '展示当前查询范围全部场景执行批次' : '展示当前查询范围全部场景用例执行记录'
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

// 某条用例进入终态后主动拉取场景详情，确保实时行能尽快补齐后端保存的步骤明细。
watch(
  () => props.liveExecutions
    .filter((item) => ['passed', 'failed', 'cancelled'].includes(item.status))
    .map((item) => `${item.sceneKey || ''}:${item.batchId}:${item.caseId}:${item.status}`)
    .join('|'),
  (value) => {
    const terminalKeys = value ? value.split('|') : []
    const newKeys = terminalKeys.filter(key => !refreshedTerminalExecutionKeys.has(key))
    if (!newKeys.length) return
    newKeys.forEach(key => refreshedTerminalExecutionKeys.add(key))
    emit('refresh')
  },
)

watch(() => props.selectedCaseId, () => {
  pagination.current = 1
  expandedKeys.value = []
})

watch(
  () => `${tableBatchMode.value}:${pagination.current}:${pagedBatchRows.value.map((item) => item.rowKey).join('|')}`,
  () => {
    if (!tableBatchMode.value) return
    const visibleKeys = pagedBatchRows.value.map((item) => item.rowKey)
    const firstKey = visibleKeys[0] || ''
    const latestChanged = firstKey !== latestBatchKey.value
    latestBatchKey.value = firstKey
    if (firstKey && (latestChanged || !expandedKeys.value.some((key) => visibleKeys.includes(String(key))))) {
      expandedKeys.value = [firstKey]
    }
  },
  { immediate: true },
)

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
        { label: '排队中', value: '排队中' },
        { label: '启动中', value: '启动中' },
        { label: '执行中', value: '执行中' },
        { label: '取消中', value: '取消中' },
        { label: '已完成', value: '已完成' },
        { label: '已取消', value: '已取消' },
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
        { label: '未执行', value: '未执行' },
        { label: '生成中', value: '生成中' },
        { label: '全部通过', value: '全部通过' },
        { label: '不通过', value: '不通过' },
        { label: '跳过', value: '跳过' },
        { label: '阻塞', value: '阻塞' },
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

const sceneColumn = {
  title: '场景',
  dataIndex: 'sceneName',
  width: 220,
  fixed: 'left' as const,
  ellipsis: true,
  tooltip: true,
  render: ({ record }: any) => <span>{record.sceneId} · {record.sceneName}</span>,
}

const batchColumns = computed<TableInstance['columns']>(() => [
  ...(isMultiScene.value && !aggregatePlanBatches.value ? [sceneColumn] : []),
  { title: '批次 ID', dataIndex: 'batchId', width: 150, fixed: 'left', ellipsis: true, tooltip: true, show: true, render: ({ record }: any) => (
    <span>{record.batchId}</span>
  ) },
  ...(aggregatePlanBatches.value
    ? [
        { title: '总场景', dataIndex: 'sceneTotal', width: 80, align: 'center', show: true },
        { title: '完成', dataIndex: 'sceneCompleted', width: 60, align: 'center', show: true },
        { title: '通过', dataIndex: 'scenePass', width: 60, align: 'center', show: true },
        { title: '失败', dataIndex: 'sceneFail', width: 60, align: 'center', show: true },
        { title: '取消', dataIndex: 'sceneCancelled', width: 60, align: 'center', show: true },
        { title: '阻塞', dataIndex: 'sceneBlocked', width: 60, align: 'center', show: true },
        { title: '跳过', dataIndex: 'sceneSkip', width: 60, align: 'center', show: true },
      ]
    : [
        { title: '总用例', dataIndex: 'caseTotal', width: 80, align: 'center', show: true },
        { title: '完成', dataIndex: 'caseCompleted', width: 60, align: 'center', show: true },
        { title: '通过', dataIndex: 'casePass', width: 60, align: 'center', show: true },
        { title: '失败', dataIndex: 'caseFail', width: 60, align: 'center', show: true },
        { title: '取消', dataIndex: 'caseCancelled', width: 60, align: 'center', show: true },
        { title: '阻塞', dataIndex: 'caseBlocked', width: 60, align: 'center', show: true },
        { title: '跳过', dataIndex: 'caseSkip', width: 60, align: 'center', show: true },
      ]),
  { title: '执行进度', dataIndex: 'progress', width: 200, render: ({ record }: any) => <AutomationExecutionProgress progress={record.progress} indeterminate={record.progressIndeterminate} completed={record.caseCompleted} total={record.caseTotal} /> },
  { title: '状态', dataIndex: 'executeStatus', width: 70, align: 'center', render: ({ record }: any) => <a-tag color={executionStatusColor(record.executeStatus)}>{executionStatusLabel(record.executeStatus)}</a-tag> },
  { title: '结果', dataIndex: 'executeResult', width: 90, align: 'center', render: ({ record }: any) => <a-tag color={executionDisplayResultColor(record.executeResult, record.executeStatus)}>{executionDisplayResultLabel(record.executeResult, record.executeStatus)}</a-tag> },
  {
    title: '耗时',
    dataIndex: 'duration',
    width: 100,
    align: 'center',
    render: ({ record }: any) => (
      <div title={`批次耗时合计：${formatExecutionDuration(record.caseDurationTotal)}`}>
        {/* <div>{formatExecutionDuration(record.duration)}</div> */}
        {/* <small class="history-duration-subtotal">用例合计 {formatExecutionDuration(record.caseDurationTotal)}</small> */}
        <div>{formatExecutionDuration(record.caseDurationTotal)}</div>
      </div>
    ),
  },
  { title: '执行人', dataIndex: 'executeName', width: 110, ellipsis: true, tooltip: true },
  { title: '执行方式', dataIndex: 'executionType', width: 180, render: ({ record }: any) => <a-tag color="arcoblue">{executionTypeLabel(record.executionType)}</a-tag> },
  { title: '开始时间', dataIndex: 'startedAt', width: 180, render: ({ record }: any) => formatExecutionDateTime(record.startedAt) },
  { title: '结束时间', dataIndex: 'finishedAt', width: 180, show: true, render: ({ record }: any) => formatExecutionDateTime(record.finishedAt) },
  // { title: '产品环境 ID', dataIndex: 'projectEnvironmentId', width: 140, show: false, ellipsis: true, tooltip: true },
  // { title: '产品环境', dataIndex: 'projectEnvironmentName', width: 160, show: false, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    width: 100,
    fixed: 'right',
    align: 'center',
    render: ({ record }: any) => (
      <a-space size="mini">
        <a-link onClick={() => toggleExpanded(record.rowKey)}>{expandedKeys.value.includes(record.rowKey) ? '收起' : '详情'}</a-link>
        {isBatchCancellable(record)? <a-link status="danger" onClick={() => requestBatchCancel(record)}>取消</a-link>: null}
      </a-space>
    ),
  },
] as any)

const columns = computed<TableInstance['columns']>(() => [
  ...(isMultiScene.value ? [sceneColumn] : []),
  {
    title: '执行 ID',
    dataIndex: 'executionId',
    width: 150,
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
  { title: '总步骤', dataIndex: 'stepTotal', width: 80, align: 'center' },
  { title: '通过', dataIndex: 'stepPass', width: 60, align: 'center' },
  { title: '失败', dataIndex: 'stepFail', width: 60, align: 'center' },
  { title: '跳过', dataIndex: 'stepSkip', width: 60, align: 'center' },
  {
    title: '执行进度',
    dataIndex: 'progress',
    width: 200,
    render: ({ record }: any) => (
      <AutomationExecutionProgress
        progress={record.progress}
        indeterminate={record.progressIndeterminate}
        completed={(Number(record.stepPass) || 0) + (Number(record.stepFail) || 0) + (Number(record.stepSkip) || 0)}
        total={record.stepTotal}
      />
    ),
  },
  {
    title: '状态',
    dataIndex: 'executeStatus',
    width: 70,
    align: 'center',
    render: ({ record }: any) => (
      <a-tag color={executionStatusColor(record.executeStatus)}>{executionStatusLabel(record.executeStatus)}</a-tag>
    ),
  },
  {
    title: '结果',
    dataIndex: 'executeResult',
    width: 80,
    align: 'center',
    render: ({ record }: any) => (
      <a-tag color={executionDisplayResultColor(record.executeResult, record.executeStatus)}>{executionDisplayResultLabel(record.executeResult, record.executeStatus)}</a-tag>
    ),
  },
  {
    title: '通过率', 
    dataIndex: 'stepPassRate', 
    width: 80, 
    align: 'center', 
    render: ({ record }: any) => (
      <span>{record.stepPassRate}</span>
    )
  },
  {
    title: '耗时',
    dataIndex: 'duration',
    width: 100,
    align: 'center',
    render: ({ record }: any) => formatExecutionDuration(record.duration),
  },
  { title: '执行人', dataIndex: 'executeName', width: 110, ellipsis: true, tooltip: true },
  {
    title: '执行方式',
    dataIndex: 'executionType',
    width: 180,
    render: ({ record }: any) => <a-tag color="arcoblue">{executionTypeLabel(record.executionType)}</a-tag>,
  },
  {
    title: '开始时间',
    dataIndex: 'startedAt',
    width: 180,
    render: ({ record }: any) => formatExecutionDateTime(record.startedAt),
  },
  {
    title: '结束时间',
    dataIndex: 'finishedAt',
    width: 180,
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
    width: 190,
    fixed: 'right',
    align: 'center',
    render: ({ record }: any) => (
      <a-space size="mini">
        {/* {record.live ? <a-tag color="arcoblue">实时执行</a-tag> : null} */}
        <a-link onClick={() => toggleExpanded(record.rowKey)}>{expandedKeys.value.includes(record.rowKey) ? '收起' : '详情'}</a-link>
        {isCaseCancellable(record)
          ? <a-link status="danger" onClick={() => requestCaseCancel(record)}>取消</a-link>
          : null}
        {!record.live ? (
          <>
              <a-link onClick={() => openResult(record, 'log')}>日志</a-link>
              <a-link onClick={() => openResult(record, 'report')}>报告</a-link>
              {record.executionType === 'extension-cdp'
                ? <a-tooltip content="Chrome DevTools Protocol 回放不支持录屏"><a-link disabled>录屏</a-link></a-tooltip>
                : <a-link onClick={() => openResult(record, 'video')}>录屏</a-link>}
          </>
        ) : null}
      </a-space>
    ),
  },
] as any)

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
  const label = executionAggregateResultLabel(value)
  if (label === '全部通过') return 'passed'
  if (label === '不通过') return 'failed'
  if (label === '已取消') return 'cancelled'
  if (label === '阻塞') return 'blocked'
  if (label === '跳过') return 'skipped'
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
  const sceneKey = record.sceneKey || String(props.scene?.id || '')
  if (!sceneKey) return
  executionResultDrawerRef.value?.onOpen(sceneKey, record.executionType, view, {
    source: record.recordSource || props.recordSource,
    target: record.recordTarget,
    testPlanId: props.testPlanId,
  })
}

function normalizeLiveExecution(item: LiveExecutionCase): ExecutionHistoryCaseRow {
  const terminal = ['passed', 'failed', 'cancelled'].includes(item.status)
  const stepTotal = Math.max(0, Number(item.stepTotal) || 0)
  const stepCompleted = Math.min(stepTotal, Math.max(0, Number(item.stepCompleted) || 0))
  const progress = terminal
    ? 100
    : stepTotal > 0
      ? Math.round(stepCompleted * 10000 / stepTotal) / 100
      : item.status === 'waiting' ? 0 : null
  const duration = item.startedAt
    ? item.durationMs ?? Math.max(0, (item.finishedAt || Date.now()) - item.startedAt)
    : 0
  return {
    rowKey: `live-${item.sceneKey || ''}-${item.batchId}-${item.caseId}`,
    recordKey: `live-${item.batchId}`,
    recordTarget: { executionId: item.batchId, caseId: item.caseId },
    executionType: item.executionType,
    executionId: item.executionId,
    jobId: item.jobId || '',
    liveFrameQuality: item.liveFrameQuality || '-',
    startedAt: item.startedAt,
    finishedAt: item.finishedAt,
    caseId: item.caseId,
    caseName: item.caseName,
    executeStatus: item.status,
    executeResult: terminal
      ? item.status
      : ['waiting', 'queued'].includes(item.status) ? 'not_executed' : 'pending',
    duration,
    executeName: item.executeName || '-',
    buildNumber: '-',
    stepPassRate: stepTotal > 0 ? `${Math.round((Number(item.stepPass) || 0) * 10000 / stepTotal) / 100}%` : '-',
    stepTotal,
    stepPass: item.stepPass ?? '-',
    stepFail: item.stepFail ?? '-',
    stepSkip: item.stepSkip ?? '-',
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
    executionLogArtifactUrl: '',
    artifactScreenshot: '-',
    artifactUploadError: '-',
    playwrightCaseKey: '-',
    steps: [],
    summaryOnly: false,
    live: true,
    batchId: item.batchId,
    progress,
    progressIndeterminate: progress == null,
    testReportId: item.testReportId,
    sceneKey: item.sceneKey,
    sceneId: item.sceneId,
    sceneName: item.sceneName,
    recordSource: item.recordSource || 'debug',
    liveLogs: item.liveLogs || [],
  }
}

function executionHistoryCaseKey(row: Pick<ExecutionHistoryCaseRow, 'sceneKey' | 'batchId' | 'caseId'>) {
  return `${row.sceneKey || ''}:${row.batchId || ''}:${row.caseId || ''}`
}

function hydrateCompletedLiveRow(
  liveRow: ExecutionHistoryCaseRow,
  persistedRow?: ExecutionHistoryCaseRow,
) {
  const terminal = ['passed', 'failed', 'cancelled'].includes(String(liveRow.executeStatus || '').toLowerCase())
  if (!terminal || !persistedRow?.steps?.length) return liveRow
  // 保留实时行标识避免折叠状态跳变，但用已落库记录补齐步骤、定位信息和报告产物。
  return {
    ...liveRow,
    ...persistedRow,
    rowKey: liveRow.rowKey,
    recordKey: liveRow.recordKey,
    recordTarget: persistedRow.recordTarget,
    executeStatus: liveRow.executeStatus,
    executeResult: liveRow.executeResult,
    duration: persistedRow.duration ?? liveRow.duration,
    live: true,
    liveLogs: liveRow.liveLogs?.length ? liveRow.liveLogs : persistedRow.liveLogs,
  }
}

function normalizeLiveBatches(
  items: LiveExecutionCase[],
  persistedRows: Map<string, ExecutionHistoryCaseRow> = new Map(),
): ExecutionHistoryBatchRow[] {
  const groups = new Map<string, LiveExecutionCase[]>()
  items.forEach((item) => {
    const groupKey = `${item.sceneKey || ''}:${item.batchId}`
    groups.set(groupKey, [...(groups.get(groupKey) || []), item])
  })
  return [...groups.values()].map((batchItems) => {
    const batchId = batchItems[0]?.batchId || ''
    const sceneKey = batchItems[0]?.sceneKey || ''
    const cases = batchItems.map((item) => {
      const liveRow = normalizeLiveExecution(item)
      return hydrateCompletedLiveRow(liveRow, persistedRows.get(executionHistoryCaseKey(liveRow)))
    })
    const terminalCases = batchItems.filter((item) => ['passed', 'failed', 'cancelled'].includes(item.status))
    const failed = batchItems.filter((item) => item.status === 'failed').length
    const cancelled = batchItems.filter((item) => item.status === 'cancelled').length
    const passed = batchItems.filter((item) => item.status === 'passed').length
    const totalSteps = batchItems.reduce((total, item) => total + Math.max(0, Number(item.stepTotal) || 0), 0)
    const completedSteps = batchItems.reduce((total, item) => {
      const stepTotal = Math.max(0, Number(item.stepTotal) || 0)
      const terminal = ['passed', 'failed', 'cancelled'].includes(item.status)
      const completed = terminal ? stepTotal : Math.min(stepTotal, Math.max(0, Number(item.stepCompleted) || 0))
      return total + completed
    }, 0)
    const startedTimes = batchItems.map((item) => item.startedAt || 0).filter(Boolean)
    const finishedTimes = batchItems.map((item) => item.finishedAt || 0).filter(Boolean)
    const executionLogRange = executionLogTimeRange(batchItems.flatMap((item) => item.liveLogs || []))
    const startedAt = executionLogRange?.startedAt
      ?? (startedTimes.length ? Math.min(...startedTimes) : undefined)
    const finishedAt = terminalCases.length === batchItems.length
      ? executionLogRange?.finishedAt
        ?? (finishedTimes.length ? Math.max(...finishedTimes) : undefined)
      : undefined
    const caseDurationTotal = cases.reduce((total, item) => total + Math.max(0, Number(item.duration) || 0), 0)
    return {
      rowKey: `live-batch-${sceneKey}-${batchId}`,
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
      progress: totalSteps > 0
        ? Math.round(completedSteps * 10000 / totalSteps) / 100
        : batchItems.length ? Math.round(terminalCases.length * 10000 / batchItems.length) / 100 : 0,
      progressIndeterminate: false,
      executeStatus: terminalCases.length === batchItems.length
        ? (cancelled ? 'cancelled' : 'completed')
        : cancelled ? 'cancelling' : 'running',
      executeResult: terminalCases.length !== batchItems.length
        ? batchItems.every(item => ['waiting', 'queued'].includes(item.status)) ? 'not_executed' : 'pending'
        : cancelled ? 'cancelled' : failed ? 'failed' : 'passed',
      executeName: batchItems[0]?.executeName || '-',
      startedAt,
      finishedAt,
      duration: startedAt ? Math.max(0, (finishedAt || Date.now()) - startedAt) : 0,
      caseDurationTotal,
      projectEnvironmentId: '-',
      projectEnvironmentName: '-',
      cases,
      live: true,
      testReportId: batchItems[0]?.testReportId,
      sceneCount: new Set(batchItems.map(item => item.sceneKey).filter(Boolean)).size,
      sceneIds: [...new Set(batchItems.map(item => item.sceneId).filter(Boolean))] as string[],
      sceneNames: [...new Set(batchItems.map(item => item.sceneName).filter(Boolean))] as string[],
      sceneKey,
      sceneId: batchItems[0]?.sceneId,
      sceneName: batchItems[0]?.sceneName,
      recordSource: batchItems[0]?.recordSource || 'debug',
    }
  })
}

function batchIdentity(row: ExecutionHistoryBatchRow) {
  return row.testReportId
    ? `report:${row.testReportId}`
    : `scene:${row.sceneKey || ''}:batch:${row.batchId}`
}

function isBatchCancellable(row: ExecutionHistoryBatchRow) {
  return ['排队中', '启动中', '执行中'].includes(executionStatusLabel(row.executeStatus))
}

function requestBatchCancel(row: ExecutionHistoryBatchRow) {
  emit('cancel-batch', row, () => markCancelling(cancellingBatchKeys, batchIdentity(row)))
}

function requestCaseCancel(row: ExecutionHistoryCaseRow) {
  emit('cancel-case', row, () => markCancelling(cancellingCaseKeys, executionHistoryCaseKey(row)))
}

function markCancelling(keys: Ref<Set<string>>, key: string) {
  keys.value = new Set(keys.value).add(key)
  window.setTimeout(() => {
    const next = new Set(keys.value)
    next.delete(key)
    keys.value = next
  }, 5_000)
}

function applyPendingBatchState(row: ExecutionHistoryBatchRow) {
  if (!cancellingBatchKeys.value.has(batchIdentity(row)) || !isBatchCancellable(row)) return row
  return { ...row, executeStatus: 'cancelling', executeResult: 'pending' }
}

function applyPendingCaseState(row: ExecutionHistoryCaseRow) {
  if (!cancellingCaseKeys.value.has(executionHistoryCaseKey(row)) || !isCaseCancellable(row)) return row
  return { ...row, executeStatus: 'cancelling', executeResult: 'pending', error: '取消请求处理中' }
}

function isCaseCancellable(row: ExecutionHistoryCaseRow) {
  return ['playwright-runner', 'extension-cdp'].includes(row.executionType)
    && ['waiting', 'starting', 'queued', 'running'].includes(String(row.executeStatus || '').toLowerCase())
    && Boolean(row.sceneKey && row.batchId && row.caseId && row.caseId !== '-')
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

function historyTime(value: unknown) {
  const timestamp = value ? new Date(value as string | number).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

function matchesQuery(row: ExecutionHistoryCaseRow, query: HistoryQuery) {
  if (!includesText(row.executionId, query.executionId)) return false
  if (!includesText(row.caseId, query.caseId)) return false
  if (!includesText(row.caseName, query.caseName)) return false
  if (query.executionType && row.executionType !== query.executionType) return false
  if (query.executeStatus && executionStatusLabel(row.executeStatus) !== query.executeStatus) return false
  if (query.executeResult && !matchesResultFilter(row.executeResult, query.executeResult)) return false
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
  if (query.executeResult && !matchesResultFilter(row.executeResult, query.executeResult)) return false
  if (!includesText(row.executeName, query.executeName)) return false
  if (query.error && !row.cases.some((item) => includesText(`${item.errorCode} ${item.error}`, query.error))) return false
  return matchesDateRange(row.startedAt, query.startedAt)
}

function includesText(value: unknown, keyword: string) {
  if (!keyword) return true
  return String(value ?? '').toLowerCase().includes(keyword.trim().toLowerCase())
}

function matchesResultFilter(value: unknown, expected: string) {
  return executionAggregateResultLabel(value) === expected
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
:deep(.arco-table-size-small .arco-table-cell) {
  padding: 5px 5px;
}

.execution-history-panel {
  width: 100%;
  min-width: 0;
  min-height: 620px;
  padding-bottom: 10px;

  :deep(.gi-table),
  :deep(.gi-table__body),
  :deep(.gi-table__container),
  :deep(.arco-table),
  :deep(.arco-table-container) {
    min-width: 0;
    max-width: 100%;
  }

  :deep(.gi-table__body) {
    overflow-x: hidden;
  }
}

.history-summary {
  margin: 8px 0;
  padding: 8px;
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
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
}

.history-summary__stats > div {
  display: flex;
  min-height: 42px;
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
  gap: 12px;
  margin: 8px 0;
  padding: 8px 10px;
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
  gap: 10px;
}

.history-scene-filter {
  flex: 0 1 auto;
  min-width: 150px;
  max-width: calc(100vw - 120px);
}

.history-scene-filter :deep(.history-scene-filter-select) {
  width: 100%;
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
  justify-content: space-between;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  overflow-x: auto;
}

.history-record-toggle {
  display: flex;
  min-width: 870px;
  flex: 1;
  grid-template-columns: 12px minmax(230px, 1.5fr) auto auto auto auto minmax(140px, .8fr) auto minmax(150px, auto) 18px;
  align-items: center;
  gap: 15px;
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

.history-status-dot--blocked,
.history-record-timeline-node--blocked {
  background: rgb(var(--danger-6));
}

.history-status-dot--skipped,
.history-record-timeline-node--skipped {
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
  gap: 5px;
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
  gap: 8px;
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
  justify-content: space-between;
  gap: 22px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--color-fill-1);
  color: var(--color-text-3);
  font-size: 12px;
}

.history-metric-strip .history-actions {
  // margin-left: auto;
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
