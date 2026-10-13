<template>
  <div class="scene-history-workspace">
    <a-space v-if="executionRun" class="history-scope-switch">
      <a-button :type="showExecutionRun ? 'primary' : 'secondary'" @click="openHistory({ kind: 'run', runId: executionRun.id })">本次执行</a-button>
      <a-button :type="showExecutionRun ? 'secondary' : 'primary'" @click="openHistory({ kind: 'all' })">历史记录</a-button>
    </a-space>
    <AutomationUiExecutionRunPanel
      v-if="showExecutionRun && executionRun"
      :run="executionRun"
      :live-executions="liveExecutions"
      @cancel-run="emit('cancel-run', $event)"
    />
    <AutomationExecutionHistoryPanel
      v-if="!showExecutionRun"
      :scenes="displayScenes"
      record-source="debug"
      :multi-scene="displayScenes.length > 1"
      :aggregate-batches="sceneFilterValue === ALL_SCENES"
      :loading="loading"
      :execution-batches="displayBatches"
      :execution-page="executionPage"
      :execution-page-size="executionPageSize"
      :execution-total="executionTotal"
      :scope-summary="scopeSummary"
      server-paged-scope
      :load-execution-page="loadExecutionPage"
      :load-execution-run-scenes="sceneFilterValue === ALL_SCENES ? loadExecutionRunScenes : undefined"
      :load-execution-cases="loadExecutionCases"
      :load-execution-steps="loadExecutionSteps"
      :load-execution-step-detail="loadExecutionStepDetail"
      :auto-expand-scene-id="historyAutoExpandSceneId"
      :live-executions="liveExecutions"
      :scene-filter-value="sceneFilterValue"
      :scene-filter-options="sceneFilterOptions"
      @scene-change="onSceneChange"
      @refresh="refresh"
      @cancel-batch="cancelHistoryBatch"
      @cancel-case="cancelHistoryCase"
    />
  </div>
</template>

<script setup lang="ts">
import { Message, Modal } from '@arco-design/web-vue'
import AutomationExecutionHistoryPanel from './AutomationExecutionHistoryPanel.vue'
import AutomationUiExecutionRunPanel from './AutomationUiExecutionRunPanel.vue'
import type { ExecutionHistoryTarget, ExecutionRun } from '../executionRun'
import {
  type AutomationUiSceneSummary,
  type AutomationUiExecutionHistoryQuery,
  type AutomationUiExecutionHistorySummary,
  getAutomationUiExecutionCases,
  getAutomationUiExecutionHistory,
  getAutomationUiExecutionRunScenes,
  getAutomationUiExecutionHistorySummary,
  getAutomationUiExecutionStep,
  getAutomationUiExecutionSteps,
  getAutomationUiSceneSummaryPage,
} from '@/apis/automation/automationUiQuery'
import {
  cancelAutomationPlaywrightBatch,
  cancelAutomationPlaywrightBatchCase,
  cancelAutomationUiExecutionRun,
} from '@/apis/automation/automationPlaywrightRunner'
import {
  type ExecutionHistoryBatchRow,
  type ExecutionHistoryCaseRow,
  type ExecutionHistoryStepRow,
  type LiveExecutionCase,
  buildLayeredExecutionBatchRow,
  buildExecutionRunHistoryRow,
  buildLayeredExecutionCaseRow,
  buildLayeredExecutionStepRow,
  applyLayeredExecutionStepDetail,
} from '../execution'
import { useUiStore } from '@/stores/modules/uiStore'
import { requestOnce } from '../queryCache'

const props = withDefaults(defineProps<{ liveExecutions?: LiveExecutionCase[], executionRun?: ExecutionRun }>(), {
  liveExecutions: () => [],
})
const emit = defineEmits<{ (e: 'cancel-run', runId: string): void }>()
const showExecutionRun = ref(false)
const ALL_SCENES = ''
const uiStore = useUiStore()
const loading = ref(false)
const sceneSummaries = shallowRef<AutomationUiSceneSummary[]>([])
const executionBatches = ref<ExecutionHistoryBatchRow[]>([])
const sceneFilterValue = ref(ALL_SCENES)
const scopeSummary = ref<AutomationUiExecutionHistorySummary>()
const executionPage = ref(1)
const executionPageSize = ref(10)
const executionTotal = ref(0)
let loadedOptionsScope = ''
let pollTimer: number | undefined
let refreshing = false
let refreshGeneration = 0
let requestGeneration = 0
let workspaceController: AbortController | undefined
let batchSnapshots = new Map<string, string>()
// 首次打开历史或刷新后自动展开目标场景的最新批次（跟随用户视角）。
const historyAutoExpandSceneId = ref('')

const scenes = computed(() => sceneSummaries.value.map(scene => ({
  id: scene.sceneDbId,
  sceneId: scene.sceneKey,
  name: scene.name,
})))

const sceneFilterOptions = computed(() => [
  { label: '全部场景', value: ALL_SCENES },
  ...scenes.value.map(scene => ({
    label: `${scene.sceneId || scene.id} - ${scene.name || '-'}`,
    value: String(scene.id),
  })),
])

const displayScenes = computed(() => sceneFilterValue.value
  ? scenes.value.filter(scene => String(scene.id) === sceneFilterValue.value)
  : scenes.value)
// 场景范围与分页由服务端处理；全部场景下不能再用单个 sceneKey 丢弃整次任务。
const displayBatches = computed(() => executionBatches.value)
const liveExecutions = computed(() => props.liveExecutions)

async function loadSceneOptions(query: AutomationUiExecutionHistoryQuery, signal: AbortSignal) {
  const items: AutomationUiSceneSummary[] = []
  for (let page = 1; ; page += 1) {
    const { data } = await getAutomationUiSceneSummaryPage({ ...query, page, size: 50, sort: ['sceneId,asc', 'createTime,asc'] }, signal)
    if (signal.aborted) return []
    if (!data) throw new Error('场景选项响应不完整，请刷新后重试')
    if (data.total > 10_000) throw new Error('场景范围超过 10000 个，请缩小项目版本或模块范围')
    items.push(...data.list)
    if (items.length >= data.total) break
    if (!data.list.length) throw new Error('场景选项加载不完整，请刷新后重试')
  }
  return items.sort((left, right) => String(left.sceneKey).localeCompare(String(right.sceneKey), 'zh-CN', { numeric: true }))
}

function clearHistory() {
  executionBatches.value = []
  batchSnapshots.clear()
  executionTotal.value = 0
  scopeSummary.value = undefined
}

const queryScenes = async (reloadOptions: boolean) => {
  workspaceController?.abort()
  const controller = new AbortController()
  workspaceController = controller
  const generation = ++requestGeneration
  const range: AutomationUiExecutionHistoryQuery = {
    projectId: String(uiStore.projectId || ''),
    versionId: uiStore.versionId || undefined,
    moduleIds: uiStore.getSceneModuleIds()?.slice(),
  }
  if (!range.projectId) {
    sceneSummaries.value = []
    loadedOptionsScope = ''
    clearHistory()
    return
  }
  const scopeKey = JSON.stringify(range)
  const query = { ...range, sceneDbId: sceneFilterValue.value || undefined }
  const page = executionPage.value
  const size = executionPageSize.value
  let [options, pageResponse, summaryResponse] = await Promise.all([
    reloadOptions || loadedOptionsScope !== scopeKey ? loadSceneOptions(range, controller.signal) : Promise.resolve(sceneSummaries.value),
    getAutomationUiExecutionHistory(query, page, size, controller.signal),
    getAutomationUiExecutionHistorySummary(query, controller.signal),
  ])
  if (generation !== requestGeneration || controller.signal.aborted) return
  if (!pageResponse.data || !summaryResponse.data) throw new Error('执行历史响应不完整，请确认 Admin 已更新后重试')
  // 新增或删除场景后更新完整选项；轮询不会每次枚举所有场景。
  if (!query.sceneDbId && options.length !== Number(summaryResponse.data.total)) options = await loadSceneOptions(range, controller.signal)
  const lastPage = Math.max(1, Math.ceil(pageResponse.data.total / size))
  if (page > lastPage) pageResponse = await getAutomationUiExecutionHistory(query, lastPage, size, controller.signal)
  if (generation !== requestGeneration || controller.signal.aborted) return
  if (!pageResponse.data) throw new Error('执行历史分页响应不完整')
  sceneSummaries.value = options
  loadedOptionsScope = scopeKey
  executionPage.value = Math.min(page, lastPage)
  executionTotal.value = pageResponse.data.total
  scopeSummary.value = summaryResponse.data
  const byId = new Map(options.map((scene) => [String(scene.sceneDbId), scene]))
  const previousBatches = new Map(executionBatches.value.map(batch => [batch.runId ? `run:${batch.runId}` : String(batch.executionDbId), batch]))
  const nextSnapshots = new Map<string, string>()
  executionBatches.value = pageResponse.data.list.map((record) => {
    const scene = byId.get(String(record.sceneDbId))
      || { sceneDbId: record.sceneDbId, sceneKey: record.sceneKey, name: record.sceneKey } as AutomationUiSceneSummary
    const key = record.runId ? `run:${record.runId}` : String(record.executionDbId)
    const snapshot = JSON.stringify([record, scene.sceneKey, scene.name])
    nextSnapshots.set(key, snapshot)
    // 轮询摘要未变化时保留已加载的用例、步骤和子分页，避免查看报告时每三秒重新加载。
    const previous = previousBatches.get(key)
    return previous && batchSnapshots.get(key) === snapshot
      ? previous
      : buildExecutionRunHistoryRow({ ...record, sceneName: record.sceneName || scene.name })
  })
  batchSnapshots = nextSnapshots
}

const refresh = async (silent = false, force = false, reloadOptions = !silent) => {
  if (showExecutionRun.value) return
  if (refreshing && !force) return
  const generation = ++refreshGeneration
  refreshing = true
  if (!silent) loading.value = true
  try {
    await queryScenes(reloadOptions)
  } catch (error) {
    if (!silent && !(error instanceof Error && ['CanceledError', 'AbortError'].includes(error.name))) {
      Message.error(error instanceof Error ? error.message : '执行历史加载失败')
    }
  } finally {
    if (generation === refreshGeneration) {
      loading.value = false
      refreshing = false
    }
  }
}

const stopPolling = () => {
  if (pollTimer) window.clearInterval(pollTimer)
  pollTimer = undefined
}

const startPolling = () => {
  stopPolling()
  pollTimer = window.setInterval(() => void refresh(true), 3000)
}

const onSceneChange = async (sceneId: string) => {
  // 用户切换场景筛选即接管展开态。
  historyAutoExpandSceneId.value = ''
  sceneFilterValue.value = sceneId || ALL_SCENES
  executionPage.value = 1
  clearHistory()
  await refresh(false, true, false)
}

const loadExecutionPage = async (page: number, size: number) => {
  // 用户主动翻页即接管展开态。
  historyAutoExpandSceneId.value = ''
  executionPage.value = page
  executionPageSize.value = size
  await refresh(false, true, false)
}

const loadExecutionCases = async (batch: ExecutionHistoryBatchRow, page = 1, size = 50) => {
  if (!batch.executionDbId) return
  const response = await requestOnce(
    `execution-cases:${batch.executionDbId}:${page}:${size}`,
    () => getAutomationUiExecutionCases(batch.executionDbId!, page, size),
  )
  const current = executionBatches.value.find(item => item.executionDbId === batch.executionDbId) || batch
  if (!current || !response.data) return
  current.cases = response.data.list.map(record => buildLayeredExecutionCaseRow(record, current))
  current.casesLoaded = true
  current.casePage = page
  current.casePageSize = size
  current.casePageTotal = response.data.total
}

const loadExecutionRunScenes = async (batch: ExecutionHistoryBatchRow, page: number, size: number) => {
  const response = await getAutomationUiExecutionRunScenes(batch.runId!, {
    projectId: String(uiStore.projectId || ''),
    versionId: uiStore.versionId || undefined,
    moduleIds: uiStore.getSceneModuleIds()?.slice(),
    sceneDbId: sceneFilterValue.value || undefined,
  }, page, size)
  if (!response.data) throw new Error('任务场景响应不完整，请刷新后重试')
  return {
    total: response.data.total,
    list: response.data.list.map(record => {
      const row = buildExecutionRunHistoryRow({ ...record, runId: undefined })
      row.rowKey = `run-scene:${batch.runId}:${record.sceneDbId}`
      row.executionDbId = record.executionDbId
      row.historyRevision = JSON.stringify(record)
      return row
    }),
  }
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

const cancelHistoryBatch = (batch: ExecutionHistoryBatchRow, markCancelling?: () => void) => {
  if (batch.runId) {
    Modal.warning({
      title: '确认取消整次执行任务',
      content: '将取消当前任务的运行中子批次，并停止全部尚未启动的场景。',
      onOk: async () => {
        markCancelling?.()
        if (props.executionRun?.serverRunId === batch.runId) emit('cancel-run', props.executionRun.id)
        await cancelAutomationUiExecutionRun(batch.runId!)
        await refresh()
      },
    })
    return
  }
  if (!batch.sceneKey || !batch.batchId) return
  Modal.warning({
    title: '确认取消执行批次',
    content: '取消后当前批次中尚未完成的用例将不再执行，是否确认？',
    onOk: async () => {
      markCancelling?.()
      await cancelAutomationPlaywrightBatch(batch.sceneKey, batch.batchId)
      Message.success('已发起取消执行批次')
      await refresh()
    },
  })
}

const cancelHistoryCase = (row: ExecutionHistoryCaseRow, markCancelling?: () => void) => {
  if (!row.sceneKey || !row.batchId || !row.caseId || row.caseId === '-') return
  Modal.warning({
    title: '确认取消当前用例',
    content: `取消用例“${row.caseName}”不会影响同批次其他用例，是否确认？`,
    onOk: async () => {
      markCancelling?.()
      await cancelAutomationPlaywrightBatchCase(row.sceneKey, row.batchId, row.caseId)
      Message.success('已发起取消当前用例')
      await refresh()
    },
  })
}

const openHistory = async (target: ExecutionHistoryTarget) => {
  stopPolling()
  workspaceController?.abort()
  requestGeneration += 1
  showExecutionRun.value = target.kind === 'run' && target.runId === props.executionRun?.id
  if (showExecutionRun.value) {
    loading.value = false
    return
  }
  const sceneId = target.kind === 'scene' ? target.sceneId : ''
  // 显式区分全部、单场景与本次执行，不能保留上一次的筛选和分页。
  sceneFilterValue.value = sceneId || ALL_SCENES
  executionPage.value = 1
  clearHistory()
  // 首次打开或刷新时标记场景以自动展开，保持用户工作连续（执行后跳转）。
  historyAutoExpandSceneId.value = sceneId || ''
  await refresh(false, true)
  startPolling()
}

onUnmounted(() => {
  stopPolling()
  workspaceController?.abort()
  executionPage.value = 1
})

watch(() => uiStore.activeKey, (activeKey) => {
  if (activeKey !== 'history' || showExecutionRun.value) {
    stopPolling()
    return
  }
  startPolling()
  void refresh(true)
})

watch(
  () => `${uiStore.projectId || ''}:${uiStore.versionId || ''}:${uiStore.moduleId || ''}`,
  () => {
    workspaceController?.abort()
    requestGeneration += 1
    loadedOptionsScope = ''
    sceneSummaries.value = []
    clearHistory()
    sceneFilterValue.value = ALL_SCENES
    executionPage.value = 1
    if (uiStore.activeKey === 'history' && !showExecutionRun.value) void refresh(false, true)
  },
)

defineExpose({ openHistory })
</script>

<style scoped lang="scss">
.scene-history-workspace {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  box-sizing: border-box;
}

.history-scope-switch {
  margin-bottom: 12px;
}
</style>
