<template>
  <div class="scene-history-workspace">
    <div v-if="sceneTotal > scenePageSize" class="scene-scope-pagination">
      <a-pagination
        v-model:current="scenePage"
        size="small"
        :total="sceneTotal"
        :page-size="scenePageSize"
        show-total
        @change="changeScenePage"
      />
    </div>
    <AutomationExecutionHistoryPanel
      :scenes="displayScenes"
      record-source="debug"
      :multi-scene="displayScenes.length > 1"
      :aggregate-batches="sceneFilterValue === ALL_SCENES"
      :loading="loading"
      :execution-batches="displayBatches"
      :execution-page="executionPage"
      :execution-page-size="executionPageSize"
      :execution-total="executionTotal"
      :load-execution-page="sceneFilterValue ? loadExecutionPage : undefined"
      :load-execution-cases="loadExecutionCases"
      :load-execution-steps="loadExecutionSteps"
      :load-execution-step-detail="loadExecutionStepDetail"
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
import {
  type AutomationUiSceneSummary,
  getAutomationUiExecutionCases,
  getAutomationUiExecutions,
  getAutomationUiExecutionRevisionsBatched,
  getAutomationUiExecutionStep,
  getAutomationUiExecutionSteps,
  getAutomationUiSceneSummaryPage,
} from '@/apis/automation/automationUiQuery'
import {
  cancelAutomationPlaywrightBatch,
  cancelAutomationPlaywrightBatchCase,
} from '@/apis/automation/automationPlaywrightRunner'
import {
  type ExecutionHistoryBatchRow,
  type ExecutionHistoryCaseRow,
  type ExecutionHistoryStepRow,
  type LiveExecutionCase,
  buildLayeredExecutionBatchRow,
  buildLayeredExecutionCaseRow,
  buildLayeredExecutionStepRow,
  applyLayeredExecutionStepDetail,
} from '../execution'
import { useUiStore } from '@/stores/modules/uiStore'
import { mapWithConcurrency, requestOnce } from '../queryCache'

const props = withDefaults(defineProps<{ liveExecutions?: LiveExecutionCase[] }>(), {
  liveExecutions: () => [],
})
const ALL_SCENES = ''
const uiStore = useUiStore()
const loading = ref(false)
const sceneSummaries = shallowRef<AutomationUiSceneSummary[]>([])
const executionBatches = ref<ExecutionHistoryBatchRow[]>([])
const sceneFilterValue = ref(ALL_SCENES)
const scenePage = ref(1)
const scenePageSize = 20
const sceneTotal = ref(0)
const executionPage = ref(1)
const executionPageSize = ref(10)
const executionTotal = ref(0)
let revision = ''
let pollTimer: number | undefined
let refreshing = false
let requestGeneration = 0
let workspaceController: AbortController | undefined

const scenes = computed(() => sceneSummaries.value.map(scene => ({
  id: scene.sceneDbId,
  sceneId: scene.sceneKey,
  name: scene.name,
})))

const sceneFilterOptions = computed(() => [
  { label: '本页全部场景', value: ALL_SCENES },
  ...scenes.value.map(scene => ({
    label: `${scene.sceneId || scene.id} - ${scene.name || '-'}`,
    value: String(scene.id),
  })),
])

const displayScenes = computed(() => sceneFilterValue.value
  ? scenes.value.filter(scene => String(scene.id) === sceneFilterValue.value)
  : scenes.value)
const displayBatches = computed(() => sceneFilterValue.value
  ? executionBatches.value.filter(batch => batch.sceneKey === sceneFilterValue.value)
  : executionBatches.value)
const liveExecutions = computed(() => props.liveExecutions)

const sceneRevisionFingerprint = (items: Array<{ sceneDbId: string | number, updateTime?: string, globalExecutionRevision?: number }>) => items
  .map(item => `${item.sceneDbId}:${item.updateTime || ''}:${item.globalExecutionRevision ?? 0}`)
  .sort()
  .join('|')

const queryScenes = async () => {
  const projectId = String(uiStore.projectId || '')
  if (!projectId) {
    sceneSummaries.value = []
    executionBatches.value = []
    revision = ''
    return
  }
  workspaceController?.abort()
  const controller = new AbortController()
  workspaceController = controller
  const generation = ++requestGeneration
  const summaryResponse = await getAutomationUiSceneSummaryPage({
    projectId,
    versionId: uiStore.versionId || undefined,
    moduleIds: uiStore.getSceneModuleIds(),
    page: scenePage.value,
    size: scenePageSize,
    sort: ['updateTime,desc'],
  }, controller.signal)
  if (generation !== requestGeneration || controller.signal.aborted) return
  const summaries = summaryResponse.data?.list || []
  sceneTotal.value = summaryResponse.data?.total || 0
  sceneSummaries.value = summaries
  const sceneIds = summaries.map(scene => scene.sceneDbId)
  if (!sceneIds.length) {
    executionBatches.value = []
    revision = ''
    return
  }
  if (sceneFilterValue.value && !summaries.some(scene => String(scene.sceneDbId) === sceneFilterValue.value)) {
    sceneFilterValue.value = ALL_SCENES
  }
  const activeSummaries = sceneFilterValue.value
    ? summaries.filter(scene => String(scene.sceneDbId) === sceneFilterValue.value)
    : summaries
  executionTotal.value = 0
  const batches = await mapWithConcurrency(activeSummaries, 6, async (scene) => {
    const response = await getAutomationUiExecutions({
      sceneDbId: scene.sceneDbId,
      recordSource: 'debug',
      page: sceneFilterValue.value ? executionPage.value : 1,
      size: sceneFilterValue.value ? executionPageSize.value : 20,
      // 执行历史接口只允许按数据库创建时间排序；startedAt 是展示字段，不是服务端排序字段。
      sort: ['createTime,desc'],
    }, controller.signal)
    if (sceneFilterValue.value) executionTotal.value = response.data?.mode === 'page' ? response.data.total : response.data?.list.length || 0
    return (response.data?.list || []).map(record => buildLayeredExecutionBatchRow(record, scene))
  })
  if (generation !== requestGeneration || controller.signal.aborted) return
  executionBatches.value = batches.flat()
    .sort((left, right) => historyTime(right.startedAt) - historyTime(left.startedAt))
  const { data: revisions } = await getAutomationUiExecutionRevisionsBatched(sceneIds)
  if (generation !== requestGeneration || controller.signal.aborted) return
  revision = sceneRevisionFingerprint(Array.isArray(revisions) ? revisions : [])
}

const refresh = async (silent = false) => {
  if (refreshing) return
  refreshing = true
  if (!silent) loading.value = true
  try {
    await queryScenes()
  } catch (error) {
    if (!silent && !(error instanceof Error && ['CanceledError', 'AbortError'].includes(error.name))) {
      Message.error(error instanceof Error ? error.message : '执行历史加载失败')
    }
  } finally {
    if (!silent) loading.value = false
    refreshing = false
  }
}

const refreshWhenChanged = async () => {
  const sceneIds = sceneSummaries.value.map(scene => scene.sceneDbId)
  if (!sceneIds.length) return
  const { data } = await getAutomationUiExecutionRevisionsBatched(sceneIds)
  const nextRevision = sceneRevisionFingerprint(Array.isArray(data) ? data : [])
  if (nextRevision !== revision) await refresh(true)
}

const stopPolling = () => {
  if (pollTimer) window.clearInterval(pollTimer)
  pollTimer = undefined
}

const startPolling = () => {
  stopPolling()
  pollTimer = window.setInterval(() => void refreshWhenChanged().catch(() => undefined), 3000)
}

const changeScenePage = async (page: number) => {
  scenePage.value = page
  sceneFilterValue.value = ALL_SCENES
  executionPage.value = 1
  await refresh()
}

const onSceneChange = async (sceneId: string) => {
  sceneFilterValue.value = sceneId || ALL_SCENES
  executionPage.value = 1
  await refresh(true)
}

const loadExecutionPage = async (page: number, size: number) => {
  if (!sceneFilterValue.value) return
  executionPage.value = page
  executionPageSize.value = size
  await refresh(true)
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

function historyTime(value: unknown) {
  const timestamp = value ? new Date(value as string | number).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

const cancelHistoryBatch = (batch: ExecutionHistoryBatchRow, markCancelling?: () => void) => {
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

const openHistory = async (sceneId?: string) => {
  if (sceneId !== undefined && sceneFilterValue.value !== (sceneId || ALL_SCENES)) {
    sceneFilterValue.value = sceneId || ALL_SCENES
    executionPage.value = 1
  }
  await refresh()
  startPolling()
}

onUnmounted(() => {
  stopPolling()
  workspaceController?.abort()
  executionPage.value = 1
})

watch(() => uiStore.activeKey, (activeKey) => {
  if (activeKey !== 'history') {
    stopPolling()
    return
  }
  if (sceneSummaries.value.length) {
    startPolling()
    void refreshWhenChanged().catch(() => undefined)
  }
})

watch(
  () => `${uiStore.projectId || ''}:${uiStore.versionId || ''}:${uiStore.moduleId || ''}`,
  () => {
    scenePage.value = 1
    sceneFilterValue.value = ALL_SCENES
    executionPage.value = 1
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

.scene-scope-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px 0;
}
</style>
