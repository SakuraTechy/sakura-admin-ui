<template>
  <div ref="detailRef" :data-history-expand="batch.rowKey" class="batch-detail" :class="{ 'batch-detail--embedded': embedded }">
    <a-spin v-if="loadingCases" class="batch-loading" />
    <a-alert v-else-if="loadError" type="error" class="batch-load-error">{{ loadError }}</a-alert>
    <div v-else class="batch-scene-list">
      <section
        v-for="group in sceneGroups"
        :key="group.key"
        class="batch-scene-group"
        :class="{ 'batch-scene-group--plain': !showSceneGroups }"
      >
        <button
          v-if="showSceneGroups"
          type="button"
          class="batch-scene-toggle"
          @click="toggleSceneGroup(group.key)"
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            <icon-down :class="{ active: expandedSceneKeys.includes(group.key) }" />
            <strong>{{ group.sceneId }} · {{ group.sceneName }}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 30px;">
            <span class="batch-scene-metrics">
              <span>总用例 <strong>{{ group.summary?.caseTotal ?? group.cases.length }}</strong></span>
              <span>完成 <strong>{{ group.summary?.caseCompleted ?? '-' }}</strong></span>
              <span class="success">通过 <strong>{{ group.summary?.casePass ?? '-' }}</strong></span>
              <span class="danger">失败 <strong>{{ group.summary?.caseFail ?? '-' }}</strong></span>
              <span>阻塞 <strong>{{ group.summary?.caseBlocked ?? '-' }}</strong></span>
            </span>
            <span class="batch-scene-metrics">
              <span class="batch-scene-progress">
              进度
              <AutomationExecutionProgress
                :progress="group.summary?.progress ?? sceneProgress(group.cases)"
                :completed="group.summary?.caseCompleted"
                :total="group.summary?.caseTotal ?? group.cases.length"
                :indeterminate="group.summary?.progress == null && sceneProgress(group.cases) == null
                  ? (group.summary?.progressIndeterminate ?? true)
                  : false"
              />
              </span>
              <span>状态 <a-tag :color="executionStatusColor(group.summary?.executeStatus)">{{ executionStatusLabel(group.summary?.executeStatus) }}</a-tag></span>
              <span>结果 <a-tag :color="executionDisplayResultColor(group.summary?.executeResult, group.summary?.executeStatus)">{{ executionDisplayResultLabel(group.summary?.executeResult, group.summary?.executeStatus) }}</a-tag></span>
              <span>耗时 <strong>{{ formatExecutionDuration(displaySceneDuration(group)) }}</strong></span>
            </span>
          </div>
        </button>
        <div v-show="!showSceneGroups || expandedSceneKeys.includes(group.key)" class="batch-case-list">
          <article
            v-for="record in group.cases"
            :key="record.rowKey"
            :data-batch-case="record.rowKey"
            class="batch-case-card"
            :class="{
              'batch-case-card--expanded': expandedKey === record.rowKey,
              'batch-case-card--failed': executionAggregateResultLabel(record.executeResult) === '不通过',
            }"
          >
            <div class="batch-case-summary">
              <button type="button" class="batch-case-toggle" @click="toggleCase(record)">
                <icon-down :class="{ active: expandedKey === record.rowKey }" />
                <span class="batch-case-identity">
                  <div style="display: flex; align-items: center; gap: 8px;"> 
                    <a-tag :color="executionDisplayResultColor(record.executeResult, record.executeStatus)">
                      {{ executionDisplayResultLabel(record.executeResult, record.executeStatus) }}
                    </a-tag>
                    <strong>{{ record.caseId }} · </strong>
                    <strong>{{ record.caseName }}</strong>
                  </div>
                  <span class="batch-case-metrics">
                    <small>执行ID：{{ record.executionId }}</small>
                    <small>会话模式：{{ sessionModeLabel(record.sessionMode) }}</small>
                    <span>总步骤 <strong>{{ record.stepTotal }}</strong></span>
                    <span class="success">通过 <strong>{{ record.stepPass }}</strong></span>
                    <span class="danger">失败 <strong>{{ record.stepFail }}</strong></span>
                    <span>跳过 <strong>{{ record.stepSkip }}</strong></span>
                    <!-- <span>失败步骤 <strong>{{ record.failedStepIndex }}</strong></span> -->
                     <span class="batch-case-metrics">执行进度
                      <AutomationExecutionProgress
                        class="batch-case-progress"
                        :progress="record.progress"
                        :completed="Number(record.stepPass) + Number(record.stepFail) + Number(record.stepSkip)"
                        :total="record.stepTotal"
                        :indeterminate="record.progressIndeterminate"
                      />
                    </span>
                    <span class="batch-case-duration">耗时：<strong>{{ formatExecutionDuration(displayCaseDuration(record)) }}</strong></span>
                  </span>
                </span> 
              </button>
              <!-- <div style="display: flex; flex-direction: column;justify-self: flex-start; gap: 10px;""> 
                  <AutomationExecutionProgress
                  class="batch-case-progress"
                  :progress="record.progress"
                  :completed="Number(record.stepPass) + Number(record.stepFail) + Number(record.stepSkip)"
                  :total="record.stepTotal"
                  :indeterminate="record.progressIndeterminate"
                  />
                  <span class="batch-case-metrics">
                    <span>总步骤 <strong>{{ record.stepTotal }}</strong></span>
                    <span class="success">通过 <strong>{{ record.stepPass }}</strong></span>
                    <span class="danger">失败 <strong>{{ record.stepFail }}</strong></span>
                    <span>跳过 <strong>{{ record.stepSkip }}</strong></span>
                    <span>失败步骤 <strong>{{ record.failedStepIndex }}</strong></span>
                    <span class="batch-case-duration">耗时 <strong>{{ formatExecutionDuration(displayCaseDuration(record)) }}</strong></span>
                  </span>
              </div> -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <!-- <a-tag :color="executionDisplayResultColor(record.executeResult, record.executeStatus)">
                  {{ executionDisplayResultLabel(record.executeResult, record.executeStatus) }}
                </a-tag> -->
                <a-space class="batch-case-actions" size="mini">
                  <a-button
                    v-if="embedded && ['waiting', 'queued', 'starting', 'running'].includes(String(record.executeStatus))"
                    size="mini"
                    status="danger"
                    @click="emit('cancel-case', record)"
                  >取消用例</a-button>
                  <a-button v-if="record.executionType === 'playwright-runner'" size="mini"
                    :type="expandedKey === record.rowKey && activeTab === 'split' ? 'primary' : 'secondary'"
                    @click="selectContent(record, 'split')">
                    双栏
                  </a-button>
                  <a-button size="mini"
                    :type="expandedKey === record.rowKey && activeTab === 'log' ? 'primary' : 'secondary'"
                    @click="selectContent(record, 'log')">
                    日志
                  </a-button>
                  <a-button v-if="record.executionType === 'playwright-runner'" size="mini"
                    :type="expandedKey === record.rowKey && activeTab === 'live' ? 'primary' : 'secondary'"
                    @click="selectContent(record, 'live')">
                    实时画面
                  </a-button>
                  <a-button size="mini"
                    :type="expandedKey === record.rowKey && activeTab === 'report' ? 'primary' : 'secondary'"
                    @click="selectContent(record, 'report')">
                    报告
                  </a-button>
                </a-space>
              </div>
            </div>

            <Transition name="batch-case-expand">
              <div v-if="expandedKey === record.rowKey" class="batch-case-content">
                <AutomationExecutionWorkspace
                  v-if="activeTab !== 'report'"
                  v-model="activeTab"
                  external-mode-controls
                  :title="`${record.caseId} · ${record.caseName}`"
                  :live-supported="record.executionType === 'playwright-runner'"
                  @restore="ensureCaseVisible(record.rowKey)"
                >
                  <template #log="{ viewportControls }">
                    <AutomationExecutionLogViewer
                      embedded
                      :viewport-controls="viewportControls"
                      :job-id="record.jobId"
                      :execution-db-id="record.recordTarget.executionDbId"
                      :case-execution-db-id="record.caseExecutionDbId"
                      :status="record.executeStatus"
                      :artifact-url="record.executionLogArtifactUrl"
                      :execution-id="record.executionId"
                      :live-logs="record.liveLogs"
                      :fallback-content="recordLogFallback(record)"
                    />
                  </template>
                  <template #live="{ viewportControls }">
                    <AutomationExecutionLiveView
                      embedded
                      :viewport-controls="viewportControls"
                      :job-id="record.jobId"
                      :status="record.executeStatus"
                      :quality="record.liveFrameQuality"
                    />
                  </template>
                </AutomationExecutionWorkspace>
                <div v-else class="batch-report-content">
                  <!-- <AutomationExecutionArtifactActions
                    :report-url="record.artifactReportUrl"
                    :trace-url="record.artifactTraceUrl"
                    :screenshot-url="record.artifactScreenshotUrl"
                    :video-url="record.artifactVideoUrl"
                  /> -->
                  <AutomationExecutionHistoryDetail
                    :record="record"
                    variant="table"
                    embedded
                    :load-steps="loadSteps"
                    :load-step-detail="loadStepDetail"
                  />
                </div>
              </div>
            </Transition>
          </article>
        </div>
      </section>
    </div>
    <a-pagination
      v-if="!loadingCases && !loadError && caseTotal > casePageSize"
      v-model:current="casePage"
      v-model:page-size="casePageSize"
      class="batch-case-pagination"
      size="small"
      :total="caseTotal"
      :page-size-options="[20, 50, 100]"
      show-page-size
      show-total
      @change="changeCasePage"
      @page-size-change="changeCasePageSize"
    />
  </div>
</template>

<script setup lang="ts">
import type { ExecutionHistoryBatchRow, ExecutionHistoryCaseRow, ExecutionHistorySceneSummary, ExecutionHistoryStepRow } from '../execution'
import { isExecutionFollowTerminal, useExecutionAutoFollow } from '../useExecutionAutoFollow'
import {
  executionAggregateResultLabel,
  executionDisplayResultColor,
  executionDisplayResultLabel,
  executionStatusColor,
  executionStatusLabel,
  formatExecutionDuration,
} from '../execution'
import AutomationExecutionHistoryDetail from './AutomationExecutionHistoryDetail.vue'
import AutomationExecutionArtifactActions from './AutomationExecutionArtifactActions.vue'
import AutomationExecutionLiveView from './AutomationExecutionLiveView.vue'
import AutomationExecutionLogViewer from './AutomationExecutionLogViewer.vue'
import AutomationExecutionWorkspace from './AutomationExecutionWorkspace.vue'
import AutomationExecutionProgress from './AutomationExecutionProgress.vue'

const props = withDefaults(defineProps<{
  batch: ExecutionHistoryBatchRow
  /** 聚合视图即使只有一个场景，也需保留场景分组层。 */
  forceSceneGroups?: boolean
  /** 嵌入场景行时使用自然高度，避免多层滚动。 */
  embedded?: boolean
  /** 多场景任务仅对当前跟随场景自动展开用例。 */
  autoPreview?: boolean
  loadCases?: (batch: ExecutionHistoryBatchRow, page?: number, size?: number) => Promise<void>
  loadSteps?: (record: ExecutionHistoryCaseRow, page?: number, size?: number) => Promise<void>
  loadStepDetail?: (step: ExecutionHistoryStepRow) => Promise<void>
  /** 报告页明确定位用例；未指定时只自动打开执行中的用例。 */
  autoExpandCaseId?: string
  autoExpandSceneId?: string
}>(), {
  forceSceneGroups: false,
  autoPreview: true,
})
const emit = defineEmits<{ (e: 'cancel-case', row: ExecutionHistoryCaseRow): void }>()
const detailRef = ref<HTMLElement>()
const expandedKey = ref('')
const expandedSceneKeys = ref<string[]>([])
const activeTab = ref<'split' | 'log' | 'live' | 'report'>('split')
const loadingCases = ref(false)
const loadError = ref('')
const loadingLogStepKeys = new Set<string>()
const durationTick = ref(Date.now())
let durationTimer: number | undefined
let viewportObserver: ResizeObserver | undefined
const viewportTimers = new Set<number>()
const casePage = ref(props.batch.casePage || 1)
const casePageSize = ref(props.batch.casePageSize || 20)
const caseTotal = computed(() => props.batch.casePageTotal ?? props.batch.caseTotal)

onMounted(() => {
  durationTimer = window.setInterval(() => {
    durationTick.value = Date.now()
  }, 1000)
  window.addEventListener('resize', refreshCaseViewport)
  if (typeof ResizeObserver !== 'undefined') viewportObserver = new ResizeObserver(refreshCaseViewport)
})

onUnmounted(() => {
  if (durationTimer) window.clearInterval(durationTimer)
  durationTimer = undefined
  window.removeEventListener('resize', refreshCaseViewport)
  viewportObserver?.disconnect()
  viewportTimers.forEach((timer) => window.clearTimeout(timer))
  viewportTimers.clear()
})

async function fetchCases() {
  if (!props.loadCases) return
  loadingCases.value = true
  loadError.value = ''
  try {
    await props.loadCases(props.batch, casePage.value, casePageSize.value)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '执行用例加载失败'
  } finally {
    loadingCases.value = false
  }
}

watch(
  () => `${props.batch.executionDbId || ''}:${props.batch.casesLoaded === true}`,
  async () => {
    if (!props.loadCases || props.batch.casesLoaded) return
    await fetchCases()
  },
  { immediate: true },
)

watch(loadingCases, (loading) => {
  // 轮询重载会重新创建卡片 DOM，需要恢复其高度预算和视口观察。
  if (!loading && expandedKey.value) void ensureCaseVisible(expandedKey.value)
}, { flush: 'post' })

function changeCasePage(page: number) {
  casePage.value = page
  void fetchCases()
}

function changeCasePageSize(size: number) {
  casePageSize.value = size
  casePage.value = 1
  void fetchCases()
}

const sceneGroups = computed(() => {
  const groups = new Map<string, {
    key: string
    sceneId: string
    sceneName: string
    cases: ExecutionHistoryCaseRow[]
    summary?: ExecutionHistorySceneSummary
  }>()
  props.batch.cases.forEach((record) => {
    const key = record.sceneKey || record.sceneId || record.sceneName || 'scene-unknown'
    const current = groups.get(key)
    if (current) {
      current.cases.push(record)
      return
    }
    groups.set(key, {
      key,
      sceneId: record.sceneId || '-',
      sceneName: record.sceneName || '未命名场景',
      cases: [record],
      summary: props.batch.sceneSummaries?.find(item => item.key === key),
    })
  })
  return [...groups.values()]
})
const showSceneGroups = computed(() => (
  // 聚合视图即使只有一个场景，也必须保留场景层，避免批次下直接混入用例。
  props.forceSceneGroups
  || (props.batch.recordSource === 'test' && sceneGroups.value.length > 0)
)
  || sceneGroups.value.length > 1
  || (props.batch.sceneCount || 0) > 1)

function caseDurationTotal(cases: ExecutionHistoryCaseRow[]) {
  return cases.reduce((total, record) => total + displayCaseDuration(record), 0)
}

function displaySceneDuration(group: {
  summary?: ExecutionHistorySceneSummary
  cases: ExecutionHistoryCaseRow[]
}) {
  void durationTick.value
  const summaryDuration = Number(group.summary?.duration)
  return Number.isFinite(summaryDuration) && summaryDuration >= 0
    ? summaryDuration
    : caseDurationTotal(group.cases)
}

function displayCaseDuration(record: ExecutionHistoryCaseRow) {
  durationTick.value
  const stored = Math.max(0, Number(record.duration) || 0)
  if (record.finishedAt || isTerminalCase(record)) return stored
  const started = new Date(record.startedAt as string | number).getTime()
  return Number.isFinite(started) ? Math.max(stored, Date.now() - started) : stored
}

function sessionModeLabel(value: string) {
  if (value === 'reuse-browser') return '同一浏览器窗口'
  return value === 'reuse-auth' ? '复用登录态' : '独立登录'
}

watch(() => props.batch.rowKey, () => {
  expandedKey.value = ''
  expandedSceneKeys.value = []
  activeTab.value = 'split'
}, { immediate: true })

watch(() => sceneGroups.value.map(group => group.key).join('|'), () => {
  const keys = sceneGroups.value.map(group => group.key)
  expandedSceneKeys.value = expandedSceneKeys.value.filter(key => keys.includes(key))
  if (!expandedSceneKeys.value.length && keys.length) expandedSceneKeys.value = [keys[0]]
}, { immediate: true })

useExecutionAutoFollow({
  scope: () => `${props.batch.rowKey}:${props.batch.casePage || 1}:${props.autoExpandCaseId || props.autoExpandSceneId || ''}`,
  enabled: () => props.autoPreview,
  activeOnly: true,
  rows: () => props.batch.casesLoaded === false ? [] : props.batch.cases.map(record => ({ key: record.rowKey, executeStatus: record.executeStatus, executeResult: record.executeResult })),
  selectedKey: () => expandedKey.value,
  // 场景定位只负责打开批次，不能让已完成批次隐式展开第一条用例。
  preferredKey: () => props.autoExpandCaseId
    ? props.batch.cases.find(record => record.caseId === props.autoExpandCaseId)?.rowKey
    : undefined,
  select: (key) => {
    const record = props.batch.cases.find(item => item.rowKey === key)
    if (record) selectContent(record, activeTab.value)
  },
  nextPage: () => {
    // 聚合批次的分页属于各子场景，不能拿首场景的 executionDbId 翻整个计划的页。
    if ((props.batch.sceneCount || 1) === 1 && !loadingCases.value && props.loadCases && casePage.value * casePageSize.value < caseTotal.value) {
      changeCasePage(casePage.value + 1)
    }
  },
})

watch(
  () => `${expandedKey.value}:${activeTab.value}:${props.batch.cases.map((record) => `${record.rowKey}:${record.stepsLoaded === true}`).join('|')}`,
  () => {
    if (!['split', 'log'].includes(activeTab.value) || !expandedKey.value || !props.loadSteps) return
    const record = props.batch.cases.find((item) => item.rowKey === expandedKey.value)
    if (!record || record.stepsLoaded || !record.caseExecutionDbId || loadingLogStepKeys.has(record.rowKey)) return
    loadingLogStepKeys.add(record.rowKey)
    void props.loadSteps(record, 1, 50).finally(() => loadingLogStepKeys.delete(record.rowKey))
  },
  { immediate: true },
)

function toggleSceneGroup(key: string) {
  expandedSceneKeys.value = expandedSceneKeys.value.includes(key)
    ? expandedSceneKeys.value.filter(item => item !== key)
    : [...expandedSceneKeys.value, key]
}

function toggleCase(record: ExecutionHistoryCaseRow) {
  if (expandedKey.value === record.rowKey) {
    expandedKey.value = ''
    return
  }
  expandedKey.value = record.rowKey
  activeTab.value = record.executionType === 'playwright-runner' ? 'split' : 'log'
  ensureCaseVisible(record.rowKey)
}

function selectContent(record: ExecutionHistoryCaseRow, tab: 'split' | 'log' | 'live' | 'report') {
  const group = sceneGroups.value.find(item => item.cases.some(item => item.rowKey === record.rowKey))
  if (group && !expandedSceneKeys.value.includes(group.key)) expandedSceneKeys.value = [...expandedSceneKeys.value, group.key]
  expandedKey.value = record.rowKey
  activeTab.value = tab === 'split' && record.executionType !== 'playwright-runner' ? 'log' : tab
  ensureCaseVisible(record.rowKey)
}

function isTerminalCase(record: ExecutionHistoryCaseRow) {
  return isExecutionFollowTerminal(record)
}

function findCaseElement(rowKey: string) {
  return [...(detailRef.value?.querySelectorAll<HTMLElement>('[data-batch-case]') || [])]
    .find((element) => element.dataset.batchCase === rowKey)
}

async function ensureCaseVisible(rowKey: string) {
  await nextTick()
  viewportTimers.forEach((timer) => window.clearTimeout(timer))
  viewportTimers.clear()
  viewportObserver?.disconnect()
  const element = findCaseElement(rowKey)
  if (!element) return
  const summary = element?.querySelector<HTMLElement>('.batch-case-summary')
  if (summary) viewportObserver?.observe(summary)
  caseScrollContainers(element).forEach((container) => viewportObserver?.observe(container))
  const align = () => {
    if (expandedKey.value !== rowKey) return
    refreshCaseViewport()
  }
  align()
  // 等待展开动画和异步明细布局完成，只校正本次选中的卡片，不跟随每条日志滚动外层页面。
  ;[220, 520].forEach((delay) => {
    const timer = window.setTimeout(() => {
      viewportTimers.delete(timer)
      align()
    }, delay)
    viewportTimers.add(timer)
  })
}

function caseScrollContainers(element: HTMLElement) {
  const containers: HTMLElement[] = []
  let ancestor = element.parentElement
  while (ancestor) {
    const style = window.getComputedStyle(ancestor)
    if (/(auto|scroll|overlay)/.test(style.overflowY) && ancestor.clientHeight > 0
      && ancestor.scrollHeight > ancestor.clientHeight + 1) {
      containers.push(ancestor)
    }
    ancestor = ancestor.parentElement
  }
  const rootScroller = document.scrollingElement as HTMLElement | null
  if (rootScroller && !containers.includes(rootScroller)) containers.push(rootScroller)
  return containers
}

function refreshCaseViewport() {
  const element = findCaseElement(expandedKey.value)
  if (!element || !element.getClientRects().length) return
  // 沉浸/全屏由子组件接管视口；不能用历史行的高度限制它们。
  if (document.fullscreenElement || document.querySelector('.execution-workspace--immersive, .execution-log-viewer--immersive, .live-view--immersive')) return
  // 场景表格可能保留横向滚动宽度，但展开的操作栏和内容视口必须适配可见列宽。
  let visibleRight = window.innerWidth
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll|hidden|clip)/.test(window.getComputedStyle(parent).overflowX)) {
      visibleRight = Math.min(visibleRight, parent.getBoundingClientRect().left + parent.clientLeft + parent.clientWidth)
    }
  }
  element.style.setProperty('--execution-case-width', `${Math.max(0, Math.floor(visibleRight - element.getBoundingClientRect().left))}px`)
  const containers = caseScrollContainers(element)
  const rootScroller = document.scrollingElement
  const insetTop = (container: HTMLElement) => container === rootScroller
    || container.matches('.detail-panel, .gi-page-layout__body')
    ? 56
    : 12
  // 历史由内部工作区滚动时，外层可能没有溢出，但仍要与“本次执行”共享同一可用高度。
  const workspace = element.closest<HTMLElement>('.detail-panel, .gi-page-layout__body')
  const viewportContainers = workspace && workspace.clientHeight > 0 && !containers.includes(workspace)
    ? [...containers, workspace]
    : containers
  const availableHeight = Math.min(...viewportContainers.map((container) => (
    (container === rootScroller ? window.innerHeight : container.clientHeight) - insetTop(container) - 16
  )))
  const summaryHeight = element.querySelector<HTMLElement>('.batch-case-summary')?.getBoundingClientRect().height || 0
  // 按最小外层滚动视口扣除标题、边框和留白，三个页签使用同一高度预算。
  element.style.setProperty('--execution-content-height', `${Math.max(0, Math.floor(availableHeight - summaryHeight + 10))}px`)

  containers.forEach((container) => {
    const targetRect = element.getBoundingClientRect()
    const bounds = container === rootScroller
      ? { top: 0, bottom: window.innerHeight }
      : { top: container.getBoundingClientRect().top + container.clientTop, bottom: container.getBoundingClientRect().top + container.clientTop + container.clientHeight }
    const safeTop = bounds.top + insetTop(container)
    const safeBottom = bounds.bottom - 16
    const topDelta = targetRect.top - safeTop
    const bottomDelta = targetRect.bottom - safeBottom
    if (topDelta < 0) container.scrollTop += topDelta
    else if (bottomDelta > 0) container.scrollTop += bottomDelta
  })
}

function recordLogFallback(record: ExecutionHistoryCaseRow) {
  return JSON.stringify({
    execution_id: record.executionId,
    executor: record.executionType,
    case_id: record.caseId,
    case_name: record.caseName,
    started_at: record.startedAt,
    finished_at: record.finishedAt,
    status: record.executeStatus,
    result: record.executeResult,
    duration_ms: record.duration,
    error_code: record.errorCode === '-' ? undefined : record.errorCode,
    error: record.error === '-' ? undefined : record.error,
    steps: record.steps.map((step) => ({
      step_index: step.stepIndex,
      description: step.stepName,
      action_type: step.actionType,
      status: step.status,
      duration_ms: step.duration,
      error: step.error === '-' ? undefined : step.error,
      locator_source: step.locatorSource === '-' ? undefined : step.locatorSource,
      locator_type: step.locatorType === '-' ? undefined : step.locatorType,
      locator_value: step.locatorValue === '-' ? undefined : step.locatorValue,
      matched_count: step.matchedCount === '-' ? undefined : step.matchedCount,
    })),
  }, null, 2)
}

function sceneProgress(cases: ExecutionHistoryCaseRow[]) {
  const totalSteps = cases.reduce((total, record) => total + numericValue(record.stepTotal), 0)
  if (totalSteps <= 0) return null
  const completedSteps = cases.reduce((total, record) => (
    total + numericValue(record.stepTotal) * Math.min(100, Math.max(0, Number(record.progress) || 0)) / 100
  ), 0)
  return Math.min(100, Math.round(completedSteps * 10000 / totalSteps) / 100)
}

function numericValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}
</script>

<style scoped lang="scss">
.batch-detail {
  box-sizing: border-box;
  max-height: min(460px, calc(100vh - 240px));
  padding: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--color-border-2);
  border-radius: 0 0 12px 12px;
  background: var(--color-fill-1);
  animation: batch-expand 200ms ease-out;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.batch-loading {
  display: block;
  min-height: 120px;
  padding-top: 48px;
  text-align: center;
}

.batch-detail--embedded {
  max-height: none;
  padding: 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.batch-load-error {
  margin: 8px;
}

.batch-case-pagination {
  justify-content: flex-end;
  margin-top: 10px;
}

.batch-case-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-scene-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-scene-group {
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
}

.batch-scene-group--plain {
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.batch-scene-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-fill-1);
  color: var(--color-text-1);
  text-align: left;
  cursor: pointer;
}

.batch-scene-toggle > svg {
  color: var(--color-text-3);
  transition: transform 180ms ease, color 180ms ease;
}

.batch-scene-toggle > svg.active {
  transform: rotate(180deg);
  color: rgb(var(--primary-6));
}

.batch-scene-toggle strong {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-scene-toggle span {
  color: var(--color-text-3);
  font-size: 12px;
}

.batch-scene-toggle .batch-scene-metrics {
  display: flex;
  align-items: center;
  flex: none;
  gap: 15px;
}

.batch-scene-metrics strong {
  color: var(--color-text-1);
}

.batch-scene-metrics .success strong {
  color: rgb(var(--success-6));
}

.batch-scene-metrics .danger strong {
  color: rgb(var(--danger-6));
}

.batch-scene-progress {
  display: inline-flex;
  min-width: 150px;
  align-items: center;
  gap: 5px;
}

.batch-scene-progress :deep(.execution-progress) {
  width: 150px;
}

.batch-scene-group > .batch-case-list {
  padding: 10px;
}

.batch-scene-group--plain > .batch-case-list {
  padding: 0;
}

.batch-case-card {
  overflow: hidden;
  scroll-margin-block: 16px;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.batch-case-card--expanded {
  box-sizing: border-box;
  max-width: var(--execution-case-width, 100%);
  border-color: rgb(var(--primary-3));
  box-shadow: 0 8px 22px rgb(0 0 0 / 6%);
}

.batch-case-card--failed {
  border-color: rgb(var(--danger-3));
}

.batch-case-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  scroll-margin-block: 12px;
}

.batch-case-toggle {
  display: flex;
  min-width: 0;
  flex: 1;
  grid-template-columns: 18px auto minmax(180px, 1.2fr) minmax(300px, 1.8fr) minmax(140px, .8fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.batch-case-toggle > svg {
  color: var(--color-text-3);
  transition: transform 180ms ease, color 180ms ease;
}

.batch-case-toggle > svg.active {
  transform: rotate(180deg);
  color: rgb(var(--primary-6));
}

.batch-case-identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.batch-case-identity strong,
.batch-case-identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-case-identity small,
.batch-case-metrics,
.batch-case-duration {
  color: var(--color-text-3);
  font-size: 12px;
}

.batch-case-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
}

.batch-case-metrics strong,
.batch-case-duration strong {
  color: var(--color-text-1);
}

.batch-case-metrics .success strong {
  color: rgb(var(--success-6));
}

.batch-case-metrics .danger strong {
  color: rgb(var(--danger-6));
}

.batch-case-progress {
  min-width: 180px;
}

.batch-case-duration {
  white-space: nowrap;
}

.batch-case-actions {
  flex: none;
  gap: 8px !important;
  white-space: nowrap;
}

.batch-case-content {
  min-width: 0;
  min-height: 0;
  border-top: 1px solid var(--color-border-2);
}

// 仅约束历史卡片内的普通视图；日志/画面全屏或沉浸后仍沿用原布局。
.batch-case-content :deep(.execution-log-viewer:not(.execution-log-viewer--embedded):not(.execution-log-viewer--immersive):not(:fullscreen)),
.batch-case-content :deep(.live-view:not(.live-view--embedded):not(.live-view--immersive):not(:fullscreen)) {
  display: flex;
  box-sizing: border-box;
  max-height: calc(var(--execution-content-height, 600px) - 16px);
  flex-direction: column;
}

.batch-case-content :deep(.log-console),
.batch-case-content :deep(.live-stage) {
  min-height: 0;
  flex-shrink: 1;
}

.batch-case-content :deep(.step-history--embedded) {
  border-width: 0;
}

.batch-report-content {
  min-width: 0;
  height: min(666px, var(--execution-content-height, calc(100dvh - 280px)));
  // height: min(72vh, 666px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: auto;
  scrollbar-gutter: stable;
}

.batch-report-content :deep(.step-history--embedded) {
  display: flex;
  box-sizing: border-box;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: auto;
}

.batch-report-content :deep(.session-audit),
.batch-report-content :deep(.record-alert),
.batch-report-content :deep(.step-pagination) {
  flex-shrink: 0;
}

.batch-report-content :deep(.step-inspector) {
  height: auto;
  max-height: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.batch-report-content :deep(.step-inspector__nav) {
  height: 100%;
  max-height: none;
  overflow-x: hidden;
  overflow-y: auto;
}

.batch-report-content :deep(.step-inspector__content) {
  min-height: 0;
  overflow: auto;
}

.batch-case-expand-enter-active,
.batch-case-expand-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.batch-case-expand-enter-from,
.batch-case-expand-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@keyframes batch-expand {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1100px) {
  .batch-case-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .batch-case-toggle {
    grid-template-columns: 18px auto minmax(180px, 1fr) minmax(220px, 1.4fr);
  }

  .batch-case-progress,
  .batch-case-duration {
    grid-column: 3 / -1;
  }

  .batch-case-actions {
    align-self: flex-end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .batch-detail,
  .batch-case-card,
  .batch-case-toggle > svg,
  .batch-case-expand-enter-active,
  .batch-case-expand-leave-active {
    animation: none;
    transition: none;
  }
}
</style>
