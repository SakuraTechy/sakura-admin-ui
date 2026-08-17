<template>
  <div ref="detailRef" :data-history-expand="batch.rowKey" class="batch-detail">
    <div class="batch-scene-list">
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
              <!-- <span>批次耗时 <strong>{{ formatExecutionDuration(group.summary?.duration) }}</strong></span> -->
              <span>批次耗时 <strong>{{ formatExecutionDuration(caseDurationTotal(group.cases)) }}</strong></span>
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
                    <span class="batch-case-duration">耗时：<strong>{{ formatExecutionDuration(record.duration) }}</strong></span>
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
                    <span class="batch-case-duration">耗时 <strong>{{ formatExecutionDuration(record.duration) }}</strong></span>
                  </span>
              </div> -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <!-- <a-tag :color="executionDisplayResultColor(record.executeResult, record.executeStatus)">
                  {{ executionDisplayResultLabel(record.executeResult, record.executeStatus) }}
                </a-tag> -->
                <a-space class="batch-case-actions" size="mini">
                  <a-button size="mini"
                    :type="expandedKey === record.rowKey && activeTab === 'log' ? 'primary' : 'secondary'"
                    @click="selectContent(record, 'log')">
                    日志
                  </a-button>
                  <a-button size="mini"
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
                <AutomationExecutionLogViewer
                  v-if="activeTab === 'log'"
                  :job-id="record.jobId"
                  :status="record.executeStatus"
                  :artifact-url="record.executionLogArtifactUrl"
                  :live-logs="record.liveLogs"
                  :fallback-content="recordLogFallback(record)"
                />
                <AutomationExecutionLiveView
                  v-else-if="activeTab === 'live' && record.executionType === 'playwright-runner'"
                  :job-id="record.jobId"
                  :status="record.executeStatus"
                  :quality="record.liveFrameQuality"
                />
                <a-empty v-else-if="activeTab === 'live'" description="当前执行方式不支持实时画面" />
                <div v-else class="batch-report-content">
                  <!-- <AutomationExecutionArtifactActions
                    :report-url="record.artifactReportUrl"
                    :trace-url="record.artifactTraceUrl"
                    :screenshot-url="record.artifactScreenshotUrl"
                    :video-url="record.artifactVideoUrl"
                  /> -->
                  <AutomationExecutionHistoryDetail :record="record" variant="table" embedded />
                </div>
              </div>
            </Transition>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExecutionHistoryBatchRow, ExecutionHistoryCaseRow, ExecutionHistorySceneSummary } from '../execution'
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
import AutomationExecutionProgress from './AutomationExecutionProgress.vue'

const props = withDefaults(defineProps<{
  batch: ExecutionHistoryBatchRow
  /** 聚合视图即使只有一个场景，也需保留场景分组层。 */
  forceSceneGroups?: boolean
}>(), {
  forceSceneGroups: false,
})
const detailRef = ref<HTMLElement>()
const expandedKey = ref('')
const expandedSceneKeys = ref<string[]>([])
const activeTab = ref<'log' | 'live' | 'report'>('log')
const pendingAutoScrollKey = ref('')

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
  return cases.reduce((total, record) => total + Math.max(0, Number(record.duration) || 0), 0)
}

function sessionModeLabel(value: string) {
  if (value === 'reuse-browser') return '同一浏览器窗口'
  return value === 'reuse-auth' ? '复用登录态' : '独立登录'
}

watch(() => props.batch.rowKey, () => {
  const failed = props.batch.cases.find((record) => executionAggregateResultLabel(record.executeResult) === '不通过')
  expandedKey.value = failed?.rowKey || props.batch.cases[0]?.rowKey || ''
  expandedSceneKeys.value = sceneGroups.value.map(group => group.key)
  activeTab.value = 'log'
  pendingAutoScrollKey.value = ''
}, { immediate: true })

watch(sceneGroups, (groups) => {
  const keys = groups.map(group => group.key)
  expandedSceneKeys.value = expandedSceneKeys.value.filter(key => keys.includes(key))
  if (!expandedSceneKeys.value.length) expandedSceneKeys.value = keys
}, { immediate: true })

watch(
  () => props.batch.cases
    .map((record) => (
      `${record.rowKey}:${record.executeStatus}:${record.executeResult || ''}:${record.liveLogs?.length || 0}`
    ))
    .join('|'),
  () => autoSelectNextRunningCase(),
  { immediate: true, flush: 'post' },
)

function toggleSceneGroup(key: string) {
  expandedSceneKeys.value = expandedSceneKeys.value.includes(key)
    ? expandedSceneKeys.value.filter(item => item !== key)
    : [...expandedSceneKeys.value, key]
}

function toggleCase(record: ExecutionHistoryCaseRow) {
  pendingAutoScrollKey.value = ''
  if (expandedKey.value === record.rowKey) {
    expandedKey.value = ''
    return
  }
  expandedKey.value = record.rowKey
  activeTab.value = 'log'
  ensureCaseVisible(record.rowKey)
}

function selectContent(record: ExecutionHistoryCaseRow, tab: 'log' | 'live' | 'report') {
  pendingAutoScrollKey.value = ''
  expandedKey.value = record.rowKey
  activeTab.value = tab
  ensureCaseVisible(record.rowKey)
}

function autoSelectNextRunningCase() {
  const cases = props.batch.cases
  if (!cases.some(isCaseReadyForAutoPreview)) return

  const currentIndex = cases.findIndex((record) => record.rowKey === expandedKey.value)
  const current = cases[currentIndex]
  if (current && isRunningCase(current)) {
    if (isCaseReadyForAutoPreview(current)) {
      if (pendingAutoScrollKey.value === current.rowKey) scrollBatchDetailToBottom(current.rowKey)
      else ensureCaseVisible(current.rowKey)
    }
    return
  }

  const next = cases.slice(Math.max(0, currentIndex + 1)).find(isCaseReadyForAutoPreview)
    || cases.find(isCaseReadyForAutoPreview)
  if (!next) return

  const group = sceneGroups.value.find((item) => item.cases.some((record) => record.rowKey === next.rowKey))
  if (group && !expandedSceneKeys.value.includes(group.key)) {
    expandedSceneKeys.value = [...expandedSceneKeys.value, group.key]
  }
  expandedKey.value = next.rowKey
  activeTab.value = 'log'
  pendingAutoScrollKey.value = next.rowKey
  scrollBatchDetailToBottom(next.rowKey)
}

function isRunningCase(record: ExecutionHistoryCaseRow) {
  return ['waiting', 'starting', 'queued', 'running'].includes(String(record.executeStatus || '').toLowerCase())
}

function isCaseReadyForAutoPreview(record: ExecutionHistoryCaseRow) {
  return isRunningCase(record) && Boolean(record.liveLogs?.length)
}

function findCaseSummary(rowKey: string) {
  const caseElement = [...(detailRef.value?.querySelectorAll<HTMLElement>('[data-batch-case]') || [])]
    .find((element) => element.dataset.batchCase === rowKey)
  return caseElement?.querySelector<HTMLElement>('.batch-case-summary') || caseElement
}

async function scrollBatchDetailToBottom(rowKey: string) {
  await nextTick()
  const scrollToBottom = () => {
    if (!detailRef.value || pendingAutoScrollKey.value !== rowKey) return
    // 自动切换后只滚动批次详情，不影响上方批次行。
    detailRef.value.scrollTop = detailRef.value.scrollHeight
    const summaryElement = findCaseSummary(rowKey)
    const detailTop = detailRef.value.getBoundingClientRect().top + 12
    if (summaryElement && summaryElement.getBoundingClientRect().top <= detailTop + 1) {
      pendingAutoScrollKey.value = ''
    }
  }
  window.setTimeout(scrollToBottom, 220)
  window.setTimeout(scrollToBottom, 520)
}

async function ensureCaseVisible(rowKey: string) {
  await nextTick()
  const align = () => {
    const summaryElement = findCaseSummary(rowKey)
    if (!summaryElement) return
    scrollSummaryIntoView(summaryElement)
  }
  window.setTimeout(align, 220)
  // 表格展开行和日志容器会在首次渲染后再次调整高度，补一次校正确保摘要栏不被顶出视口。
  window.setTimeout(align, 520)
}

function scrollSummaryIntoView(element: HTMLElement) {
  const rootScroller = document.scrollingElement as HTMLElement | null
  const scrollableAncestors: HTMLElement[] = []
  let ancestor = element.parentElement
  while (ancestor) {
    const style = window.getComputedStyle(ancestor)
    if (/(auto|scroll|overlay)/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight) {
      scrollableAncestors.push(ancestor)
    }
    ancestor = ancestor.parentElement
  }
  if (rootScroller && !scrollableAncestors.includes(rootScroller)) scrollableAncestors.push(rootScroller)

  scrollableAncestors.forEach((container) => {
    const targetRect = element.getBoundingClientRect()
    const bounds = container === rootScroller
      ? { top: 0, bottom: window.innerHeight }
      : container.getBoundingClientRect()
    const pageScroller = container === rootScroller
      || container.matches('.detail-panel, .gi-page-layout__body')
    const safeTop = bounds.top + (pageScroller ? 56 : 12)
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
    error_code: record.errorCode === '-' ? undefined : record.errorCode,
    error: record.error === '-' ? undefined : record.error,
    steps: record.steps.map((step) => ({
      step_index: step.stepIndex,
      description: step.stepName,
      action_type: step.actionType,
      status: step.status,
      duration_ms: step.duration,
      error: step.error === '-' ? undefined : step.error,
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

.batch-case-content :deep(.step-history--embedded) {
  border-width: 0;
}

.batch-report-content {
  min-width: 0;
  max-height: min(520px, calc(100vh - 280px));
  max-height: min(520px, calc(100dvh - 280px));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: auto;
  scrollbar-gutter: stable;
}

.batch-report-content :deep(.step-history--embedded) {
  box-sizing: border-box;
  height: auto;
  max-height: none;
  min-height: 0;
  overflow: visible;
  overscroll-behavior: auto;
}

.batch-report-content :deep(.step-inspector) {
  height: min(520px, calc(100dvh - 280px));
  max-height: min(520px, calc(100dvh - 280px));
  min-height: 0;
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
