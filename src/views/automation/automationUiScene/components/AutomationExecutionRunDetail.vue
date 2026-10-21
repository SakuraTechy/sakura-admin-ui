<template>
  <div class="execution-run-detail">
    <a-alert v-if="error" type="error">{{ error }} <a-link @click="refresh">重试</a-link></a-alert>
    <a-spin :loading="loading" style="display: block">
      <a-empty v-if="!loading && !error && !scenes.length" description="当前范围内没有可查看的任务场景" />
      <section v-for="scene in scenes" :key="scene.rowKey" :data-run-scene="scene.rowKey">
        <button type="button" class="run-scene-toggle" @click="activeSceneKey = activeSceneKey === scene.rowKey ? '' : scene.rowKey">
          <icon-down :rotate="activeSceneKey === scene.rowKey ? 0 : -90" />
          <strong>{{ scene.sceneId }} · {{ scene.sceneName }}</strong>
          <span class="run-scene-metrics">总用例 {{ scene.caseTotal }} · 完成 {{ scene.caseCompleted }} · 通过 {{ scene.casePass }} · 失败 {{ scene.caseFail }} · 阻塞 {{ scene.caseBlocked }}</span>
          <AutomationExecutionProgress :progress="scene.progress" :completed="scene.caseCompleted" :total="scene.caseTotal" :indeterminate="scene.progressIndeterminate" />
          <a-tag :color="executionStatusColor(scene.executeStatus)">{{ executionStatusLabel(scene.executeStatus) }}</a-tag>
          <a-tag :color="executionDisplayResultColor(scene.executeResult, scene.executeStatus)">{{ executionDisplayResultLabel(scene.executeResult, scene.executeStatus) }}</a-tag>
          <span>耗时 {{ formatExecutionDuration(scene.duration) }}</span>
        </button>
        <AutomationExecutionBatchDetail
          v-if="scene.executionDbId && activeSceneKey === scene.rowKey"
          :batch="scene"
          :scene-group-expansion-controlled="sceneGroupExpansionControlled"
          :expand-all-scene-groups="expandAllSceneGroups"
          :load-cases="loadCases"
          :load-steps="loadSteps"
          :load-step-detail="loadStepDetail"
        />
        <div v-else-if="!scene.executionDbId" class="run-pending-scene">
          <span>{{ scene.executeStatus === 'failed' ? '启动失败，未创建子批次' : scene.executeStatus === 'cancelled' ? '已取消，未启动场景' : '排队中，尚未创建子批次' }}</span>
        </div>
      </section>
    </a-spin>
    <a-pagination v-if="total > size" :current="page" :page-size="size" :total="total" show-total @change="changePage" />
  </div>
</template>

<script setup lang="ts">
import { type ExecutionHistoryBatchRow, type ExecutionHistoryCaseRow, type ExecutionHistoryStepRow, executionDisplayResultColor, executionDisplayResultLabel, executionStatusColor, executionStatusLabel, formatExecutionDuration } from '../execution'
import { useExecutionAutoFollow } from '../useExecutionAutoFollow'
import AutomationExecutionBatchDetail from './AutomationExecutionBatchDetail.vue'
import AutomationExecutionProgress from './AutomationExecutionProgress.vue'

const props = defineProps<{
  batch: ExecutionHistoryBatchRow
  loadScenes: (batch: ExecutionHistoryBatchRow, page: number, size: number) => Promise<{ list: ExecutionHistoryBatchRow[], total: number }>
  sceneGroupExpansionControlled?: boolean
  expandAllSceneGroups?: boolean
  loadCases?: (batch: ExecutionHistoryBatchRow, page?: number, size?: number) => Promise<void>
  loadSteps?: (record: ExecutionHistoryCaseRow, page?: number, size?: number) => Promise<void>
  loadStepDetail?: (step: ExecutionHistoryStepRow) => Promise<void>
}>()
const scenes = ref<ExecutionHistoryBatchRow[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const size = 20
const total = ref(0)
const activeSceneKey = ref('')
let generation = 0

async function refresh() {
  const current = ++generation
  loading.value = !scenes.value.length
  error.value = ''
  try {
    const response = await props.loadScenes(props.batch, page.value, size)
    if (current !== generation) return
    const previous = new Map(scenes.value.map((scene) => [scene.rowKey, scene]))
    // 子批次未变化时保留用例分页和已打开报告；任务总览轮询不能重置它们。
    scenes.value = response.list.map((scene) => {
      const cached = previous.get(scene.rowKey)
      return cached && cached.historyRevision === scene.historyRevision ? cached : scene
    })
    total.value = response.total
  } catch (reason) {
    if (current === generation) error.value = reason instanceof Error ? reason.message : '任务场景加载失败'
  } finally {
    if (current === generation) loading.value = false
  }
}

function changePage(value: number) {
  page.value = value
  scenes.value = []
  void refresh()
}

useExecutionAutoFollow({
  scope: () => `${props.batch.rowKey}:${page.value}`,
  rows: () => scenes.value.map((scene) => ({ key: scene.rowKey, executeStatus: scene.executeStatus, executeResult: scene.executeResult })),
  selectedKey: () => activeSceneKey.value,
  select: (key) => { activeSceneKey.value = key },
  nextPage: () => {
    if (page.value * size < total.value) changePage(page.value + 1)
  },
})
watch(() => `${props.batch.rowKey}:${props.batch.historyRevision}`, () => void refresh(), { immediate: true })
onUnmounted(() => {
  generation += 1
})
</script>

<style scoped lang="scss">
.execution-run-detail {
  max-height: min(580px, calc(100vh - 240px));
  overflow: auto;
  padding: 8px;
  background: var(--color-fill-1);
}
.execution-run-detail :deep(.batch-detail) {
  max-height: none;
  margin-bottom: 10px;
}
.run-pending-scene {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
}
.run-pending-scene span { color: var(--color-text-3); }
.run-scene-toggle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
  color: var(--color-text-1);
  cursor: pointer;
  text-align: left;
}
.run-scene-metrics { color: var(--color-text-3); }
</style>
