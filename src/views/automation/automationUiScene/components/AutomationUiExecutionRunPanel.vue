<template>
  <div class="execution-run-panel">
    <a-alert type="info">本次执行共 {{ summary.total }} 个场景，按列表顺序串行执行。此视图只统计本次任务，请保持页面打开。</a-alert>
    <div class="run-heading">
      <div>
        <strong>本次执行 · {{ executionTypeLabel(run.executionType) }}</strong>
        <div class="run-description">{{ run.id }} · 耗时 {{ formatExecutionDuration((run.finishedAt || Date.now()) - run.startedAt) }}</div>
      </div>
      <a-button status="danger" :disabled="Boolean(run.finishedAt || run.cancelRequested)" @click="confirmCancel">
        {{ run.cancelRequested ? '已请求取消' : '取消本次执行' }}
      </a-button>
    </div>
    <div class="run-statistics">
      <div v-for="item in cards" :key="item.label"><strong>{{ item.value }}</strong><span>{{ item.label }}</span></div>
    </div>
    <a-table
      :data="run.scenes"
      row-key="sceneDbId"
      :pagination="pagination"
      :expanded-keys="expandedKeys"
      :expandable="{ width: 40 }"
      :scroll="{ x: 1000 }"
      @expanded-change="changeExpanded"
    >
      <template #columns>
        <a-table-column title="场景 ID" data-index="sceneId" :width="220" />
        <a-table-column title="场景名称" data-index="sceneName" ellipsis tooltip />
        <a-table-column title="子批次" :width="170">
          <template #cell="{ record }">{{ record.batchId || '尚未创建' }}</template>
        </a-table-column>
        <a-table-column title="状态" :width="100">
          <template #cell="{ record }"><a-tag :color="record.executeStatus === 'startup-failed' ? 'red' : executionStatusColor(record.executeStatus)">{{ record.executeStatus === 'startup-failed' ? '启动失败' : executionStatusLabel(record.executeStatus) }}</a-tag></template>
        </a-table-column>
        <a-table-column title="结果" :width="100">
          <template #cell="{ record }"><a-tag :color="executionDisplayResultColor(record.executeResult, record.executeStatus)">{{ executionDisplayResultLabel(record.executeResult, record.executeStatus) }}</a-tag></template>
        </a-table-column>
        <a-table-column title="通过 / 总用例" :width="130">
          <template #cell="{ record }">{{ record.casePass }} / {{ record.caseTotal }}</template>
        </a-table-column>
      </template>
      <template #expand-row="{ record }">
        <a-spin :loading="loadingScenes.has(record.sceneDbId)" style="width: 100%">
          <a-alert v-if="errors[record.sceneDbId]" type="error">{{ errors[record.sceneDbId] }} <a-link @click="loadSceneBatch(record)">重试</a-link></a-alert>
          <AutomationExecutionHistoryPanel
            v-else-if="batches.get(record.sceneDbId)"
            embedded
            :scene="{ id: record.sceneDbId, sceneId: record.sceneId, name: record.sceneName }"
            :execution-batches="[batches.get(record.sceneDbId)!]"
            :live-executions="sceneLiveExecutions(record)"
            :auto-expand-scene-id="record.sceneDbId"
            :load-execution-cases="loadCases"
            :load-execution-steps="loadSteps"
            :load-execution-step-detail="loadStepDetail"
            @refresh="loadSceneBatch(record)"
            @cancel-batch="cancelSceneBatch"
            @cancel-case="cancelCase"
          />
          <a-empty v-else :description="record.error || (record.executeStatus === 'cancelled' ? '已取消，未启动场景' : '场景尚未启动，暂无本次执行明细')" />
        </a-spin>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { Message, Modal } from '@arco-design/web-vue'
import { type ExecutionRun, type ExecutionRunScene, executionRunSummary } from '../executionRun'
import { useExecutionAutoFollow } from '../useExecutionAutoFollow'
import {
  type ExecutionHistoryBatchRow,
  type ExecutionHistoryCaseRow,
  type ExecutionHistoryStepRow,
  type LiveExecutionCase,
  applyLayeredExecutionStepDetail,
  buildLayeredExecutionBatchRow,
  buildLayeredExecutionCaseRow,
  buildLayeredExecutionStepRow,
  executionDisplayResultColor,
  executionDisplayResultLabel,
  executionStatusColor,
  executionStatusLabel,
  executionTypeLabel,
  formatExecutionDuration,
} from '../execution'
import AutomationExecutionHistoryPanel from './AutomationExecutionHistoryPanel.vue'
import {
  type AutomationUiSceneSummary,
  getAutomationUiExecutionCases,
  getAutomationUiExecutionStep,
  getAutomationUiExecutionSteps,
  getAutomationUiExecutions,
} from '@/apis/automation/automationUiQuery'
import { cancelAutomationPlaywrightBatch, cancelAutomationPlaywrightBatchCase } from '@/apis/automation/automationPlaywrightRunner'

const props = defineProps<{ run: ExecutionRun, liveExecutions: LiveExecutionCase[] }>()
const emit = defineEmits<{ (e: 'cancel-run', runId: string): void }>()
const summary = computed(() => executionRunSummary(props.run))
const cards = computed(() => [
  { label: '总场景', value: summary.value.total },
  { label: '执行中', value: summary.value.running },
  { label: '排队中', value: summary.value.queued },
  { label: '已完成', value: summary.value.completed },
  { label: '通过', value: summary.value.passed },
  { label: '失败', value: summary.value.failed },
  { label: '取消', value: summary.value.cancelled },
  { label: '跳过', value: summary.value.skipped },
])
const pagination = reactive({ current: 1, pageSize: 20, showTotal: true, onChange: (page: number) => {
  pagination.current = page
} })
const expandedKeys = ref<Array<string | number>>([])
const batches = reactive(new Map<string, ExecutionHistoryBatchRow>())
const loadingScenes = reactive(new Set<string>())
const errors = reactive<Record<string, string>>({})
const controllers = new Map<string, AbortController>()
const requestedStates = new Map<string, string>()
const caseRequests = new Map<string, symbol>()
const sceneLiveExecutions = (scene: ExecutionRunScene) => props.liveExecutions.filter((item) => (
  item.sceneKey === scene.sceneDbId && item.batchId === scene.batchId
  && (item.recordSource || 'debug') === 'debug' && item.executionType === props.run.executionType
))

function reset() {
  controllers.forEach((controller) => controller.abort())
  controllers.clear()
  requestedStates.clear()
  caseRequests.clear()
  batches.clear()
  loadingScenes.clear()
  Object.keys(errors).forEach((key) => delete errors[key])
  pagination.current = 1
  expandedKeys.value = props.run.scenes[0] ? [props.run.scenes[0].sceneDbId] : []
}

async function loadSceneBatch(scene: ExecutionRunScene) {
  if (!scene.batchId) return
  controllers.get(scene.sceneDbId)?.abort()
  const controller = new AbortController()
  controllers.set(scene.sceneDbId, controller)
  loadingScenes.add(scene.sceneDbId)
  delete errors[scene.sceneDbId]
  try {
    const response = await getAutomationUiExecutions({ sceneDbId: scene.sceneDbId, recordSource: 'debug', executionEngine: props.run.executionType, batchId: scene.batchId, page: 1, size: 1 }, controller.signal)
    if (controller.signal.aborted) return
    const record = response.data.list.find((item) => item.batchId === scene.batchId && String(item.sceneDbId) === scene.sceneDbId)
    // 即使旧后端忽略了 batchId 条件，也不能展示另一条历史作为本次结果。
    if (!record) throw new Error('本次子批次尚未可读，请稍后重试；未使用旧执行记录替代')
    const previous = batches.get(scene.sceneDbId)
    const batch = buildLayeredExecutionBatchRow(record, { sceneDbId: scene.sceneDbId, sceneKey: scene.sceneId, name: scene.sceneName } as unknown as AutomationUiSceneSummary)
    if (previous?.batchId === batch.batchId) {
      batch.cases = previous.cases
      batch.casePage = previous.casePage
      batch.casePageSize = previous.casePageSize
      batch.casesLoaded = true
    }
    batches.set(scene.sceneDbId, batch)
    if (previous?.batchId === batch.batchId) await loadCases(batch, previous.casePage || 1, previous.casePageSize || 20)
  } catch (error: any) {
    if (!controller.signal.aborted) errors[scene.sceneDbId] = error?.message || '读取本次批次失败'
  } finally {
    if (controllers.get(scene.sceneDbId) === controller) loadingScenes.delete(scene.sceneDbId)
  }
}

function changeExpanded(keys: Array<string | number>) {
  expandedKeys.value = keys
  props.run.scenes.filter((scene) => keys.includes(scene.sceneDbId) && !batches.has(scene.sceneDbId)).forEach((scene) => void loadSceneBatch(scene))
}

async function loadCases(batch: ExecutionHistoryBatchRow, page = 1, size = 20) {
  if (!batch.executionDbId) return
  const request = Symbol('scene-case-page')
  const sceneKey = String(batch.sceneKey)
  caseRequests.set(sceneKey, request)
  const { data } = await getAutomationUiExecutionCases(batch.executionDbId, page, size)
  const current = batches.get(sceneKey)
  if (current?.executionDbId !== batch.executionDbId || caseRequests.get(sceneKey) !== request) return
  current.cases = data.list.map((item) => buildLayeredExecutionCaseRow(item, current))
  current.casesLoaded = true
  current.casePage = page
  current.casePageSize = size
  current.casePageTotal = data.total
}

async function loadSteps(row: ExecutionHistoryCaseRow, page = 1, size = 50) {
  if (!row.caseExecutionDbId) return
  const { data } = await getAutomationUiExecutionSteps(row.caseExecutionDbId, page, size)
  row.steps = data.list.map(buildLayeredExecutionStepRow)
  row.stepsLoaded = true
  row.stepPage = page
  row.stepPageSize = size
  row.stepPageTotal = data.total
}

async function loadStepDetail(step: ExecutionHistoryStepRow) {
  if (!step.stepExecutionDbId) return
  const { data } = await getAutomationUiExecutionStep(step.stepExecutionDbId)
  applyLayeredExecutionStepDetail(step, data)
}

function confirmCancel() {
  Modal.warning({ title: '取消本次执行', content: '将取消当前场景，并停止所有尚未启动的场景。', onOk: () => emit('cancel-run', props.run.id) })
}

async function cancelSceneBatch(batch: ExecutionHistoryBatchRow) {
  // 本次执行中的当前场景取消等同于停止队列，避免取消后继续创建下一个批次。
  if (!props.run.finishedAt) emit('cancel-run', props.run.id)
  else if (batch.sceneKey && batch.batchId) await cancelAutomationPlaywrightBatch(batch.sceneKey, batch.batchId)
}

async function cancelCase(row: ExecutionHistoryCaseRow) {
  if (!row.sceneKey || !row.batchId || !row.caseId) return
  try {
    await cancelAutomationPlaywrightBatchCase(row.sceneKey, row.batchId, row.caseId)
  } catch (error: any) {
    Message.error(error?.message || '取消用例失败')
  }
}

watch(() => props.run.id, reset, { immediate: true })
useExecutionAutoFollow({
  scope: () => props.run.id,
  rows: () => props.run.scenes.map(scene => ({ key: scene.sceneDbId, executeStatus: scene.executeStatus, executeResult: scene.executeResult })),
  selectedKey: () => String(expandedKeys.value[0] || ''),
  select: (key) => {
    const index = props.run.scenes.findIndex(scene => scene.sceneDbId === key)
    pagination.current = Math.floor(index / pagination.pageSize) + 1
    changeExpanded([key])
  },
})
watch(() => props.run.scenes.map((scene) => `${scene.sceneDbId}:${scene.batchId}:${scene.executeStatus}:${scene.casePass}:${scene.caseFail}:${scene.caseSkip}`).join('|'), () => {
  props.run.scenes.filter((scene) => expandedKeys.value.includes(scene.sceneDbId) && scene.batchId).forEach((scene) => {
    const state = `${scene.batchId}:${scene.executeStatus}:${scene.casePass}:${scene.caseFail}:${scene.caseSkip}`
    if (requestedStates.get(scene.sceneDbId) === state) return
    requestedStates.set(scene.sceneDbId, state)
    void loadSceneBatch(scene)
  })
}, { immediate: true })
onBeforeUnmount(() => controllers.forEach((controller) => controller.abort()))
</script>

<style scoped lang="scss">
.execution-run-panel { display: flex; flex-direction: column; gap: 14px; }
.run-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.run-description { color: var(--color-text-3); font-size: 12px; margin-top: 6px; overflow-wrap: anywhere; }
.run-statistics { display: grid; grid-template-columns: repeat(8, minmax(70px, 1fr)); gap: 8px; }
.run-statistics > div { border: 1px solid var(--color-border-2); border-radius: 6px; padding: 12px; text-align: center; }
.run-statistics strong { display: block; font-size: 22px; }
.run-statistics span { color: var(--color-text-3); font-size: 12px; }
@media (max-width: 900px) { .run-statistics { grid-template-columns: repeat(4, 1fr); } }
</style>
