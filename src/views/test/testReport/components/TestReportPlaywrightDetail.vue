<template>
  <div class="playwright-report-detail">
    <a-card :title="reportTitle" size="small" :bordered="false">
      <a-descriptions :column="4" bordered size="small">
        <a-descriptions-item label="报告类型">{{ reportTypeLabel }}</a-descriptions-item>
        <a-descriptions-item label="报告状态">{{ detailData?.status || '-' }}</a-descriptions-item>
        <a-descriptions-item label="测试计划">{{ detailData?.testPlanName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="运行耗时">{{ formatDuration(detailData?.runTime ?? 0) }}</a-descriptions-item>
        <a-descriptions-item label="场景">{{ statistic.sceneTotal ?? 0 }}</a-descriptions-item>
        <a-descriptions-item label="通过">{{ statistic.scenePass ?? 0 }}</a-descriptions-item>
        <a-descriptions-item label="失败">{{ statistic.sceneFail ?? 0 }}</a-descriptions-item>
        <a-descriptions-item label="跳过">{{ statistic.sceneSkip ?? 0 }}</a-descriptions-item>
        <a-descriptions-item label="取消">{{ statistic.sceneCancelled ?? 0 }}</a-descriptions-item>
      </a-descriptions>
      <a-alert v-if="statistic.failureReason" type="warning" show-icon style="margin-top: 12px">
        {{ statistic.failureReason }}
      </a-alert>
      <a-alert v-if="detailData?.reportType === 'CHROME_DEVTOOLS_PROTOCOL'" type="info" show-icon style="margin-top: 12px">
        CDP 报告支持结构化日志和截图，当前执行方式暂无视频产物。
      </a-alert>
    </a-card>

    <a-card v-if="artifactLinks.length || artifactUploadErrors.length" title="Playwright 执行产物" size="small" :bordered="false">
      <a-space wrap>
        <a-link v-for="item in artifactLinks" :key="`${item.type}:${item.url}`" :href="item.url" target="_blank">
          {{ artifactLabel(item.type) }}
        </a-link>
      </a-space>
      <a-alert v-if="artifactUploadErrors.length" type="warning" show-icon style="margin-top: 8px">
        {{ `有 ${artifactUploadErrors.length} 个产物上传失败，详见执行记录。` }}
      </a-alert>
    </a-card>

    <AutomationExecutionHistoryPanel
      class="report-history"
      :scenes="displayScenes"
      record-source="test"
      :test-plan-id="String(detailData?.testPlanId || '')"
      :multi-scene="historySceneKey === ALL_HISTORY_SCENES"
      aggregate-plan-batches
      :scene-filter-value="historySceneKey"
      :auto-expand-case-id="autoExpandCaseId"
      :auto-expand-scene-id="autoExpandSceneId || (historySceneKey !== ALL_HISTORY_SCENES ? historySceneKey : undefined)"
      :scene-filter-options="historySceneOptions"
      :loading="loading"
      :execution-batches="executionBatches"
      :execution-page="executionPage"
      :execution-page-size="executionPageSize"
      :execution-total="executionTotal"
      :load-execution-page="historySceneKey === ALL_HISTORY_SCENES ? undefined : loadExecutionPage"
      :load-execution-cases="loadExecutionCases"
      :load-execution-steps="loadExecutionSteps"
      :load-execution-step-detail="loadExecutionStepDetail"
      @scene-change="onSceneChange"
      @refresh="loadScenes"
      @cancel-batch="cancelReportExecution"
      @cancel-case="cancelReportCase"
    />
  </div>
</template>

<script setup lang="ts">
import type { TestReportDetailResp } from '@/apis/test/testReport'
import { Message, Modal } from '@arco-design/web-vue'
import {
  getAutomationUiExecutionCases,
  getAutomationUiExecutionRevisionsBatched,
  getAutomationUiExecutionStep,
  getAutomationUiExecutionSteps,
  getAutomationUiExecutions,
  getAutomationUiSceneSummaryPage,
  type AutomationUiSceneSummary,
} from '@/apis/automation/automationUiQuery'
import type { AutomationUiSceneResp } from '@/apis/automation/automationUiScene'
import { cancelTestPlanExecution } from '@/apis/test/testPlan'
import { cancelAutomationPlaywrightBatchCase } from '@/apis/automation/automationPlaywrightRunner'
import AutomationExecutionHistoryPanel from '@/views/automation/automationUiScene/components/AutomationExecutionHistoryPanel.vue'
import {
  buildLayeredExecutionBatchRow,
  buildLayeredExecutionCaseRow,
  buildLayeredExecutionStepRow,
  applyLayeredExecutionStepDetail,
  type ExecutionHistoryBatchRow,
  type ExecutionHistoryCaseRow,
  type ExecutionHistoryStepRow,
} from '@/views/automation/automationUiScene/execution'
import { requestOnce } from '@/views/automation/automationUiScene/queryCache'
import { mapScopedSceneSummary } from '@/views/automation/automationUiScene/sceneSummary'
import { formatDuration } from '@/utils/sakura'

const props = defineProps<{ detailData?: TestReportDetailResp, autoExpandCaseId?: string, autoExpandSceneId?: string }>()
const emit = defineEmits<{
  (e: 'refresh-detail'): void
}>()
const ALL_HISTORY_SCENES = 'all'
const TERMINAL_EXECUTION_STATUSES = new Set(['12', '17', 'passed', 'failed', 'cancelled', 'blocked', 'skipped', 'completed'])
const scenes = ref<AutomationUiSceneResp[]>([])
const sceneSummaries = ref<AutomationUiSceneSummary[]>([])
const executionBatches = ref<ExecutionHistoryBatchRow[]>([])
const historySceneKey = ref(ALL_HISTORY_SCENES)
const executionPage = ref(1)
const executionPageSize = ref(20)
const executionTotal = ref(0)
const loading = ref(false)
const reportExecutionTerminal = ref(false)
let historyPollTimer: number | undefined
let historyRevision = ''
let historyRefreshing = false
let loadController: AbortController | undefined
let loadGeneration = 0

const statistic = computed<Record<string, any>>(() => props.detailData?.statisticAnalysis?.ui || {})
const playwrightArtifacts = computed<Record<string, any>>(() => props.detailData?.statisticAnalysis?.playwrightArtifacts || {})
const artifactLinks = computed(() => Object.entries(playwrightArtifacts.value.urls || {})
  .flatMap(([type, values]) => (Array.isArray(values) ? values : [values])
    .filter((url): url is string => typeof url === 'string' && Boolean(url))
    .map((url) => ({ type, url }))))
const artifactUploadErrors = computed(() => Array.isArray(playwrightArtifacts.value.uploadErrors)
  ? playwrightArtifacts.value.uploadErrors
  : [])
const artifactLabel = (type: string) => ({
  report_html: 'HTML 报告',
  video: '录屏',
  trace: 'Trace',
  failure_screenshot: '失败截图',
  console_log: '控制台日志',
  execution_log: '执行日志',
}[type] || type)
const reportTypeLabel = computed(() => {
  if (props.detailData?.reportType === 'CHROME_DEVTOOLS_PROTOCOL') return 'Chrome DevTools Protocol 自动化报告'
  if (props.detailData?.reportType === 'SELENIUM') return 'Selenium 自动化报告'
  return 'Playwright Runner 自动化报告'
})
const reportTitle = computed(() => `${reportTypeLabel.value} · ${props.detailData?.name || '-'}`)
const historySceneOptions = computed(() => [
  { label: '全部场景', value: ALL_HISTORY_SCENES },
  ...scenes.value.map((scene) => ({
    label: `${scene.sceneId || scene.id} - ${scene.name || '-'}`,
    value: String(scene.id),
  })),
])
const displayScenes = computed(() => historySceneKey.value === ALL_HISTORY_SCENES
  ? scenes.value
  : scenes.value.filter((scene) => String(scene.id) === historySceneKey.value))

const sceneRevisionFingerprint = (items: Array<{ sceneDbId: string | number, updateTime?: string, globalExecutionRevision?: number }>) => items
  .map((item) => `${String(item.sceneDbId)}:${item.updateTime || ''}:${item.globalExecutionRevision ?? 0}`)
  .sort()
  .join('|')

function stopHistoryPolling() {
  if (historyPollTimer) window.clearInterval(historyPollTimer)
  historyPollTimer = undefined
}

const isReportExecutionTerminal = (summaries: AutomationUiSceneSummary[]) => {
  const expectedSceneTotal = Number(statistic.value.sceneTotal || 0)
  return expectedSceneTotal > 0
    && summaries.length >= expectedSceneTotal
    && summaries.every((scene) => TERMINAL_EXECUTION_STATUSES.has(String(scene.latestExecution?.status || '').toLowerCase()))
}

const loadScenes = async (resetFilter = true, silent = false) => {
  if (!props.detailData?.id || !props.detailData.testPlanId) {
    scenes.value = []
    sceneSummaries.value = []
    executionBatches.value = []
    executionTotal.value = 0
    historyRevision = ''
    return
  }
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  const generation = ++loadGeneration
  if (!silent) loading.value = true
  try {
    if (resetFilter) historySceneKey.value = ALL_HISTORY_SCENES
    const summaries: AutomationUiSceneSummary[] = []
    let page = 1
    let total = 0
    do {
      const response = await getAutomationUiSceneSummaryPage({
        recordSource: 'test',
        scopeTestPlanId: String(props.detailData.testPlanId),
        scopeTestReportId: String(props.detailData.id),
        executionMatchedOnly: true,
        page,
        size: 50,
        sort: ['sceneDbId,asc'],
      }, controller.signal)
      if (generation !== loadGeneration || controller.signal.aborted) return
      const rows = response.data?.list || []
      total = response.data?.total || 0
      summaries.push(...rows)
      if (summaries.length >= total) break
      if (summaries.length >= 10_000) throw new Error('当前报告场景超过 10000 条，无法继续深分页')
      page += 1
    } while (summaries.length < total)
    sceneSummaries.value = summaries
    scenes.value = summaries.map(summary => mapScopedSceneSummary(summary, 'test'))
    if (props.autoExpandSceneId) {
      const targetScene = summaries.find(scene => (
        String(scene.sceneDbId) === props.autoExpandSceneId || scene.sceneKey === props.autoExpandSceneId
      ))
      if (targetScene) historySceneKey.value = String(targetScene.sceneDbId)
    } else if (summaries.length === 1) {
      // 场景跳转参数缺失时，报告只有一个场景，仍自动进入该场景的执行日志。
      historySceneKey.value = String(summaries[0].sceneDbId)
    }
    if (historySceneKey.value !== ALL_HISTORY_SCENES
      && !summaries.some(scene => String(scene.sceneDbId) === historySceneKey.value)) {
      historySceneKey.value = ALL_HISTORY_SCENES
    }
    const activeSummaries = historySceneKey.value === ALL_HISTORY_SCENES
      ? summaries
      : summaries.filter(scene => String(scene.sceneDbId) === historySceneKey.value)
    executionTotal.value = 0
    let batches: ExecutionHistoryBatchRow[]
    if (historySceneKey.value === ALL_HISTORY_SCENES) {
      // 精确报告 scope 的 latest 已随 Summary 返回，全部视图不再逐场景追加 execution 请求。
      batches = activeSummaries.flatMap(scene => scene.latestExecution
        ? [buildLayeredExecutionBatchRow(scene.latestExecution, scene)]
        : [])
      executionTotal.value = batches.length
    } else {
      const scene = activeSummaries[0]
      if (!scene) {
        batches = []
      } else {
        const response = await getAutomationUiExecutions({
          sceneDbId: scene.sceneDbId,
          recordSource: 'test',
          testPlanId: String(props.detailData!.testPlanId),
          testReportId: String(props.detailData!.id),
          page: executionPage.value,
          size: executionPageSize.value,
          sort: ['createTime,desc'],
        }, controller.signal)
        executionTotal.value = response.data?.mode === 'page' ? response.data.total : response.data?.list.length || 0
        batches = (response.data?.list || []).map(record => buildLayeredExecutionBatchRow(record, scene))
      }
    }
    if (generation !== loadGeneration || controller.signal.aborted) return
    executionBatches.value = batches.sort((left, right) => historyTime(right.startedAt) - historyTime(left.startedAt))
    // 完整数据与轮询必须使用同一个 revision 来源，否则场景更新时间和执行更新时间会始终比较为已变化。
    const { data: revisions } = await getAutomationUiExecutionRevisionsBatched(summaries.map((scene) => scene.sceneDbId))
    if (generation !== loadGeneration || controller.signal.aborted) return
    historyRevision = sceneRevisionFingerprint(Array.isArray(revisions) ? revisions : [])
    reportExecutionTerminal.value = isReportExecutionTerminal(summaries)
    if (reportExecutionTerminal.value && props.detailData?.status === 'RUNNING') {
      stopHistoryPolling()
      emit('refresh-detail')
    }
  } catch (error: any) {
    if (!controller.signal.aborted && !['CanceledError', 'AbortError'].includes(error?.name)) {
      Message.error(error?.message || '读取报告执行历史失败')
    }
  } finally {
    if (!silent && generation === loadGeneration) loading.value = false
  }
}

const refreshScenesWhenChanged = async () => {
  if (historyRefreshing) return
  historyRefreshing = true
  try {
  // 报告执行中即使 revision 尚未递增，进行中的用例进度、步骤数和墙钟耗时也会变化。
  // 参照 UI 自动化执行历史页的轮询节拍，持续刷新当前报告 scope 的分层数据。
  if (props.detailData?.status === 'RUNNING' && !reportExecutionTerminal.value) {
    await loadScenes(false, true)
    return
  }
  const sceneIds = sceneSummaries.value.map(scene => scene.sceneDbId)
  if (!sceneIds.length) {
    await loadScenes(false, true)
    return
  }
  const { data: revisions } = await getAutomationUiExecutionRevisionsBatched(sceneIds)
  const nextRevision = sceneRevisionFingerprint(revisions)
  if (nextRevision !== historyRevision) await loadScenes(false, true)
  } finally {
    historyRefreshing = false
  }
}

const onSceneChange = async (sceneId: string) => {
  historySceneKey.value = sceneId || ALL_HISTORY_SCENES
  executionPage.value = 1
  await loadScenes(false, true)
}

const loadExecutionPage = async (page: number, size: number) => {
  if (historySceneKey.value === ALL_HISTORY_SCENES) return
  executionPage.value = page
  executionPageSize.value = Math.min(50, Math.max(1, size))
  await loadScenes(false, true)
}

const loadExecutionCases = async (batch: ExecutionHistoryBatchRow, page = 1, size = 50) => {
  if (!batch.executionDbId) return
  const response = await requestOnce(
    `execution-cases:${batch.executionDbId}:${page}:${size}`,
    () => getAutomationUiExecutionCases(batch.executionDbId!, page, size),
  )
  const current = executionBatches.value.find(item => item.executionDbId === batch.executionDbId)
  if (!current || !response.data) return
  current.cases = response.data.list.map(record => buildLayeredExecutionCaseRow(record, current))
  current.casesLoaded = true
  current.casePage = page
  current.casePageSize = size
  current.casePageTotal = response.data.total
}

const loadExecutionSteps = async (record: ExecutionHistoryCaseRow, page = 1, size = 50) => {
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

const loadExecutionStepDetail = async (step: ExecutionHistoryStepRow) => {
  if (!step.stepExecutionDbId || step.detailLoaded) return
  const response = await requestOnce(
    `execution-step:${step.stepExecutionDbId}`,
    () => getAutomationUiExecutionStep(step.stepExecutionDbId!),
  )
  if (!response.data) return
  applyLayeredExecutionStepDetail(step, response.data)
}

const historyTime = (value: unknown) => {
  const timestamp = value ? new Date(value as string | number).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

const startHistoryPolling = () => {
  stopHistoryPolling()
  if (props.detailData?.status !== 'RUNNING' || reportExecutionTerminal.value) return
  historyPollTimer = window.setInterval(() => {
    void refreshScenesWhenChanged()
  }, 3000)
}

const cancelReportExecution = (batch: ExecutionHistoryBatchRow, markCancelling?: () => void) => {
  const testPlanId = String(props.detailData?.testPlanId || '')
  const reportId = String(batch.testReportId || props.detailData?.id || '')
  if (!testPlanId || !reportId) {
    Message.error('当前执行批次缺少测试计划或测试报告标识，无法取消')
    return
  }
  Modal.confirm({
    title: '确认取消执行',
    content: '取消后服务端会请求浏览器停止当前 CDP 回放，是否确认？',
    onOk: async () => {
      markCancelling?.()
      await cancelTestPlanExecution(testPlanId, reportId)
      Message.success('已发起取消执行')
      await loadScenes(false)
    },
  })
}

const cancelReportCase = (row: ExecutionHistoryCaseRow, markCancelling?: () => void) => {
  if (!row.sceneKey || !row.batchId || !row.caseId || row.caseId === '-') return
  Modal.warning({
    title: '确认取消当前用例',
    content: `取消用例“${row.caseName}”不会影响同批次其他用例，是否确认？`,
    onOk: async () => {
      markCancelling?.()
      await cancelAutomationPlaywrightBatchCase(row.sceneKey, row.batchId, row.caseId)
      Message.success('已发起取消当前用例')
      await loadScenes(false)
    },
  })
}

watch(
  () => `${props.detailData?.id || ''}:${props.detailData?.status || ''}`,
  async () => {
    reportExecutionTerminal.value = false
    await loadScenes()
    startHistoryPolling()
  },
  { immediate: true },
)

onUnmounted(() => {
  stopHistoryPolling()
  loadController?.abort()
})
</script>

<style scoped lang="scss">
.playwright-report-detail {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.report-history {
  flex: 0 0 auto;
  min-height: 0;
  overflow: visible;
}

// 报告页使用外层单一滚动，展开批次和用例日志后不再被固定高度截断。
.report-history :deep(.batch-detail) {
  max-height: none;
  overflow-y: visible;
}

.report-history :deep(.arco-table-body),
.report-history :deep(.arco-table-body table),
.report-history :deep(.gi-table__body) {
  max-height: none !important;
  overflow: visible !important;
}
</style>
