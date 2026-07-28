<template>
  <div class="scene-history-workspace">
    <AutomationExecutionHistoryPanel
      :scenes="displayScenes"
      record-source="debug"
      :multi-scene="displayScenes.length > 1"
      :aggregate-batches="sceneFilterValue === ALL_SCENES"
      :loading="loading"
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
  type AutomationUiSceneResp,
  getAutomationUiSceneList,
  getAutomationUiSceneSelected,
  getAutomationUiSceneSelectedRevisions,
} from '@/apis/automation/automationUiScene'
import {
  cancelAutomationPlaywrightBatch,
  cancelAutomationPlaywrightBatchCase,
} from '@/apis/automation/automationPlaywrightRunner'
import type { ExecutionHistoryBatchRow, ExecutionHistoryCaseRow, LiveExecutionCase } from '../execution'
import { useUiStore } from '@/stores/modules/uiStore'

const props = withDefaults(defineProps<{ liveExecutions?: LiveExecutionCase[] }>(), {
  liveExecutions: () => [],
})
const ALL_SCENES = ''
const uiStore = useUiStore()
const loading = ref(false)
const scenes = ref<AutomationUiSceneResp[]>([])
const sceneFilterValue = ref(ALL_SCENES)
let revision = ''
let pollTimer: number | undefined
let refreshing = false

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
const liveExecutions = computed(() => props.liveExecutions)

const sceneRevisionFingerprint = (items: Array<{ id: string | number, updateTime?: string, executionRevision?: number }>) => items
  .map(item => `${item.id}:${item.updateTime || ''}:${item.executionRevision ?? 0}`)
  .sort()
  .join('|')

const queryScenes = async () => {
  const projectId = String(uiStore.projectId || '')
  if (!projectId) {
    scenes.value = []
    revision = ''
    return
  }
  const { data: sceneList } = await getAutomationUiSceneList({
    projectId,
    versionId: uiStore.versionId || undefined,
    moduleId: uiStore.moduleId || undefined,
    sort: ['updateTime,desc'],
  })
  const sceneIds = (Array.isArray(sceneList) ? sceneList : []).map(scene => scene.id)
  if (!sceneIds.length) {
    scenes.value = []
    revision = ''
    return
  }
  // 历史面板需要完整记录；列表接口默认只加载最新一条执行记录。
  const { data: sceneDetails } = await getAutomationUiSceneSelected(sceneIds)
  scenes.value = Array.isArray(sceneDetails) ? sceneDetails : []
  // 轮询必须和后续比对使用同一轻量版本接口，否则时间格式差异会导致每次都误判为有更新。
  const { data: revisions } = await getAutomationUiSceneSelectedRevisions(sceneIds)
  revision = sceneRevisionFingerprint(Array.isArray(revisions) ? revisions : [])
  if (sceneFilterValue.value && !scenes.value.some(scene => String(scene.id) === sceneFilterValue.value)) {
    sceneFilterValue.value = ALL_SCENES
  }
}

const refresh = async (silent = false) => {
  if (refreshing) return
  refreshing = true
  if (!silent) loading.value = true
  try {
    await queryScenes()
  } finally {
    if (!silent) loading.value = false
    refreshing = false
  }
}

const refreshWhenChanged = async () => {
  const sceneIds = scenes.value.map(scene => scene.id)
  if (!sceneIds.length) return
  const { data } = await getAutomationUiSceneSelectedRevisions(sceneIds)
  const nextRevision = sceneRevisionFingerprint(Array.isArray(data) ? data : [])
  if (nextRevision !== revision) await refresh(true)
}

const stopPolling = () => {
  if (pollTimer) window.clearInterval(pollTimer)
  pollTimer = undefined
}

const startPolling = () => {
  stopPolling()
  pollTimer = window.setInterval(() => void refreshWhenChanged(), 1500)
}

const onSceneChange = (sceneId: string) => {
  sceneFilterValue.value = sceneId || ALL_SCENES
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
  if (sceneId !== undefined) sceneFilterValue.value = sceneId || ALL_SCENES
  await refresh()
  startPolling()
}

onUnmounted(stopPolling)

watch(() => uiStore.activeKey, (activeKey) => {
  if (activeKey !== 'history') stopPolling()
})

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
</style>
