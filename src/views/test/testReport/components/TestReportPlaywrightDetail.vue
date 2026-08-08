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
      :scene-filter-options="historySceneOptions"
      :loading="loading"
      @scene-change="historySceneKey = $event"
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
  getAutomationUiSceneList,
  getAutomationUiSceneSelectedRevisions,
  type AutomationUiSceneResp,
} from '@/apis/automation/automationUiScene'
import { cancelTestPlanExecution } from '@/apis/test/testPlan'
import { cancelAutomationPlaywrightBatchCase } from '@/apis/automation/automationPlaywrightRunner'
import AutomationExecutionHistoryPanel from '@/views/automation/automationUiScene/components/AutomationExecutionHistoryPanel.vue'
import type { ExecutionHistoryBatchRow, ExecutionHistoryCaseRow } from '@/views/automation/automationUiScene/execution'
import { formatDuration } from '@/utils/sakura'

const props = defineProps<{ detailData?: TestReportDetailResp }>()
const ALL_HISTORY_SCENES = 'all'
const scenes = ref<AutomationUiSceneResp[]>([])
const historySceneKey = ref(ALL_HISTORY_SCENES)
const loading = ref(false)
let historyPollTimer: number | undefined
let historyRevision = ''

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

const loadScenes = async (resetFilter = true, silent = false) => {
  if (!props.detailData?.id || !props.detailData.testPlanId) {
    scenes.value = []
    return
  }
  if (!silent) loading.value = true
  try {
    if (resetFilter) historySceneKey.value = ALL_HISTORY_SCENES
    const { data } = await getAutomationUiSceneList({
      testPlanId: String(props.detailData.testPlanId),
      testReportId: String(props.detailData.id),
      executeResultType: 'report',
      sort: ['sceneId,asc'],
    })
    const result = data as unknown as AutomationUiSceneResp[] | { list?: AutomationUiSceneResp[] }
    scenes.value = Array.isArray(result) ? result : Array.isArray(result?.list) ? result.list : []
    historyRevision = sceneRevisionFingerprint(scenes.value)
  } finally {
    if (!silent) loading.value = false
  }
}

const sceneRevisionFingerprint = (items: Array<{ id: string | number, updateTime?: string, executionRevision?: number }>) => items
  .map(item => `${String(item.id)}:${item.updateTime || ''}:${item.executionRevision ?? 0}`)
  .sort()
  .join('|')

const refreshScenesWhenChanged = async () => {
  const sceneIds = scenes.value.map(scene => scene.id)
  if (!sceneIds.length) {
    await loadScenes(false, true)
    return
  }
  const { data } = await getAutomationUiSceneSelectedRevisions(sceneIds)
  const nextRevision = sceneRevisionFingerprint(Array.isArray(data) ? data : [])
  if (nextRevision !== historyRevision) await loadScenes(false, true)
}

const stopHistoryPolling = () => {
  if (historyPollTimer) window.clearInterval(historyPollTimer)
  historyPollTimer = undefined
}

const startHistoryPolling = () => {
  stopHistoryPolling()
  if (props.detailData?.status !== 'RUNNING') return
  historyPollTimer = window.setInterval(() => {
    void refreshScenesWhenChanged()
  }, 1500)
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
    await loadScenes()
    startHistoryPolling()
  },
  { immediate: true },
)

onUnmounted(stopHistoryPolling)
</script>

<style scoped lang="scss">
.playwright-report-detail {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.report-history {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
