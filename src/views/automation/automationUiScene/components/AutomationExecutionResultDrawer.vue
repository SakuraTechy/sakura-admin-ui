<template>
  <a-drawer
    v-model:visible="visible"
    :width="drawerWidth"
    :footer="false"
    unmount-on-close
  >
    <template #title>
      {{ executionViewLabels[viewType] }} · {{ executionTypeLabel(executionType) }}
    </template>

    <a-spin :loading="loading" style="width: 100%">
      <a-space direction="vertical" fill :size="16">
        <a-card size="small" :bordered="false" class="summary-card">
          <a-space wrap>
            <strong>{{ scene?.sceneId || '-' }}</strong>
            <span>{{ scene?.name || '-' }}</span>
            <a-tag color="arcoblue">{{ executionTypeLabel(executionType) }}</a-tag>
            <a-tag>{{ records.length }} 条记录</a-tag>
          </a-space>
        </a-card>

        <a-table
          v-if="viewType === 'record'"
          :data="records"
          :columns="recordColumns"
          :pagination="{ pageSize: 10 }"
          row-key="__key"
          size="small"
          :scroll="{ x: 980 }"
        />

        <template v-else>
          <a-form-item v-if="records.length" label="执行记录" style="margin-bottom: 0">
            <a-select v-model="selectedRecordKey" :options="recordOptions" />
          </a-form-item>
          <a-empty v-if="records.length === 0" description="当前执行方式暂无历史记录" />

          <template v-else-if="selectedRecord">
            <a-alert v-if="artifactUploadErrors.length" type="warning">
              产物上传失败：{{ artifactUploadErrors.map(item => item.error || item).join('；') }}
            </a-alert>

            <template v-if="viewType === 'log'">
              <a-card v-if="executionType === 'jenkins'" title="Jenkins 控制台日志" size="small">
                <a-button type="primary" :disabled="!selectedRecord.consoleUrl" @click="openExternal(selectedRecord.consoleUrl)">
                  打开控制台日志
                </a-button>
              </a-card>
              <AutomationExecutionLogViewer
                v-else
                :job-id="selectedJobId"
                :status="caseResult.status || selectedRecord.executeStatus"
                :artifact-url="executionLogArtifactUrl"
                :fallback-content="logContent"
              />
            </template>

            <template v-else-if="viewType === 'live'">
              <AutomationExecutionLiveView
                v-if="executionType === 'playwright-runner'"
                :job-id="selectedJobId"
                :status="caseResult.status || selectedRecord.executeStatus"
                :quality="selectedLiveFrameQuality"
              />
              <a-empty v-else description="当前执行方式不支持实时画面" />
            </template>

            <template v-else-if="viewType === 'report'">
              <a-card v-if="executionType === 'jenkins'" title="Jenkins 执行报告" size="small">
                <a-button type="primary" :disabled="!selectedRecord.testReportUrl" @click="openExternal(selectedRecord.testReportUrl)">
                  打开原报告
                </a-button>
              </a-card>
              <template v-else>
                <a-card title="用例执行汇总" size="small">
                  <a-descriptions :column="2" size="small" bordered>
                    <a-descriptions-item label="用例">{{ caseResult.case_name || caseResult.case_id || selectedRecord.caseName || '-' }}</a-descriptions-item>
                    <a-descriptions-item label="耗时">{{ formatDuration(selectedCaseDuration) }}</a-descriptions-item>
                    <a-descriptions-item label="结果">
                      <a-tag :color="resultColor(caseResult.status || selectedRecord.executeResult)">
                        {{ aggregateResultLabel(caseResult.status || selectedRecord.executeResult) }}
                      </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="通过率">{{ selectedCasePassRate }}</a-descriptions-item>
                  </a-descriptions>
                  <a-space v-if="executionType === 'playwright-runner'" wrap style="margin-top: 12px">
                    <a-button v-if="reportArtifactUrl" type="primary" @click="openHtmlReport">在线预览 HTML report</a-button>
                    <a-button v-if="traceArtifactUrl" @click="openTracePreview">在线查看 Trace</a-button>
                    <a-button v-if="screenshotArtifactUrl" @click="openScreenshotPreview">在线查看失败截图</a-button>
                  </a-space>
                </a-card>
                <a-table
                  :data="stepResults"
                  :columns="stepColumns"
                  :pagination="false"
                  row-key="step_index"
                  size="small"
                  :scroll="{ x: 900 }"
                />
              </template>
            </template>

            <template v-else>
              <a-card v-if="executionType === 'jenkins'" title="Jenkins 执行录屏" size="small">
                <a-button type="primary" :disabled="!jenkinsVideoUrl" @click="openExternal(jenkinsVideoUrl)">
                  打开执行录屏
                </a-button>
              </a-card>
              <a-empty v-else-if="executionType === 'extension-cdp'" description="扩展 CDP 回放当前不支持录屏" />
              <a-card v-else-if="videoArtifactUrl" title="Runner 执行录屏" size="small">
                <a-button v-if="!videoObjectUrl" type="primary" :loading="artifactLoading" @click="loadVideoArtifact">
                  加载录屏
                </a-button>
                <video v-else class="execution-video" :src="videoObjectUrl" controls />
              </a-card>
              <a-empty v-else :description="runnerVideoEmptyText" />
            </template>
          </template>
        </template>
      </a-space>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="tsx">
import { useWindowSize } from '@vueuse/core'
import { Message } from '@arco-design/web-vue'
import {
  type ExecutionRecordScope,
  type ExecutionResultOpenOptions,
  type ExecutionType,
  type ExecutionViewType,
  executionAggregateResultLabel as aggregateResultLabel,
  executionTypeLabel,
  executionViewLabels,
  formatExecutionDuration as formatDuration,
  formatExecutionDateTime,
  getArtifactUrl,
  getExecutionRecords,
  matchesExecutionRecord,
  resolveJenkinsVideoUrl,
  executionResultColor as resultColor,
  executionResultLabel as resultLabel,
  executionStatusColor as statusColor,
  executionStatusLabel as statusLabel,
} from '../execution'
import AutomationExecutionLiveView from './AutomationExecutionLiveView.vue'
import AutomationExecutionLogViewer from './AutomationExecutionLogViewer.vue'
import { getAutomationUiScene } from '@/apis/automation/automationUiScene'
import {
  type AutomationUiExecutionStep,
  AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT,
  getAutomationUiExecution,
  getAutomationUiExecutionArtifactContentUrl,
  getAutomationUiExecutionArtifacts,
  getAutomationUiExecutionCases,
  getAutomationUiExecutionSteps,
} from '@/apis/automation/automationUiQuery'
import { getToken } from '@/utils/auth'

const { width } = useWindowSize()
const drawerWidth = computed(() => width.value >= 1080 ? 1000 : '100%')
const visible = ref(false)
const loading = ref(false)
const artifactLoading = ref(false)
const scene = ref<any>()
const executionType = ref<ExecutionType>('jenkins')
const recordScope = ref<ExecutionRecordScope>('all')
const testPlanId = ref('')
const viewType = ref<ExecutionViewType>('record')
const selectedRecordKey = ref('')
const targetCaseId = ref('')
const videoObjectUrl = ref('')

const records = computed(() => getExecutionRecords(scene.value, executionType.value, recordScope.value, testPlanId.value))
const selectedRecord = computed<any>(() => records.value.find((item) => item.__key === selectedRecordKey.value) || records.value[0])
const recordOptions = computed(() => records.value.map((record: any) => ({
  value: record.__key,
  label: `${record.executionId || record.buildNumber || record.caseId || '历史记录'} · ${formatExecutionDateTime(record.startedAt || record.finishedAt)}`,
})))
const caseResult = computed<any>(() => {
  const record = selectedRecord.value || {}
  if (Array.isArray(record.caseResults) && record.caseResults.length) {
    return record.caseResults.find((item: any) => String(item.case_id || item.caseId || '') === targetCaseId.value)
      || record.caseResults[0]
  }
  if (record.playwrightResult?.case_result) return record.playwrightResult.case_result
  return {}
})
const selectedPlaywrightResult = computed<any>(() => (
  caseResult.value?.playwright_result
  || caseResult.value?.playwrightResult
  || selectedRecord.value?.playwrightResult
  || {}
))
const selectedExecutionId = computed(() => (
  caseResult.value?.execution_id
  || caseResult.value?.executionId
  || selectedRecord.value?.executionId
  || '-'
))
const selectedJobId = computed(() => String(
  caseResult.value?.job_id
  || caseResult.value?.jobId
  || selectedRecord.value?.jobId
  || '',
))
const selectedLiveFrameQuality = computed(() => {
  const executionConfig = selectedPlaywrightResult.value?.execution_config
    || selectedPlaywrightResult.value?.executionConfig
    || selectedRecord.value?.executionConfig
    || {}
  return caseResult.value?.live_frame_quality
    || caseResult.value?.liveFrameQuality
    || executionConfig.live_frame_quality
    || executionConfig.liveFrameQuality
    || selectedRecord.value?.liveFrameQuality
    || ''
})
const selectedCaseDuration = computed(() => (
  caseResult.value?.wall_clock_duration_ms
  ?? caseResult.value?.wallClockDurationMs
  ?? selectedRecord.value?.wallClockDuration
  ?? caseResult.value?.duration_ms
  ?? caseResult.value?.duration
  ?? selectedRecord.value?.duration
))
const selectedCasePassRate = computed(() => {
  const total = Number(caseResult.value?.step_total ?? caseResult.value?.stepTotal)
  const passed = Number(caseResult.value?.step_pass ?? caseResult.value?.stepPass)
  if (Number.isFinite(total) && total > 0 && Number.isFinite(passed)) {
    return `${Math.round(passed * 10000 / total) / 100}%`
  }
  return selectedRecord.value?.casePassRate || selectedRecord.value?.scenePassRate || '-'
})
const artifactRecord = computed(() => ({
  artifactUrls: caseResult.value?.artifact_urls || caseResult.value?.artifactUrls,
  playwrightResult: selectedPlaywrightResult.value,
}))
const stepResults = computed<any[]>(() => {
  const record = selectedRecord.value || {}
  const steps = caseResult.value?.steps || selectedPlaywrightResult.value?.steps || record.stepResults
  return Array.isArray(steps) ? steps : []
})
const artifactUploadErrors = computed<any[]>(() => {
  const value = caseResult.value?.artifact_upload_errors
    || selectedPlaywrightResult.value?.artifact_upload_errors
    || selectedRecord.value?.artifactUploadErrors
  return Array.isArray(value) ? value : []
})
const executionLogArtifactUrl = computed(() => getArtifactUrl(artifactRecord.value, 'execution_log'))
const reportArtifactUrl = computed(() => getArtifactUrl(artifactRecord.value, 'report_html', 'report'))
const videoArtifactUrl = computed(() => getArtifactUrl(artifactRecord.value, 'video', 'videos'))
const traceArtifactUrl = computed(() => getArtifactUrl(artifactRecord.value, 'trace'))
const screenshotArtifactUrl = computed(() => getArtifactUrl(artifactRecord.value, 'failure_screenshot', 'screenshot', 'screenshots'))
const jenkinsVideoUrl = computed(() => resolveJenkinsVideoUrl(selectedRecord.value, String(scene.value?.sceneId || '')))
const runnerVideoEmptyText = computed(() => {
  const policy = selectedPlaywrightResult.value?.raw?.video_policy
  if (policy === 'retain-on-failure' && resultLabel(selectedRecord.value?.executeResult) === '通过') {
    return '当前保留策略为 retain-on-failure，成功执行未生成录屏'
  }
  return '本次 Runner 执行没有可用录屏'
})
const logContent = computed(() => {
  const record = selectedRecord.value || {}
  if (executionType.value === 'extension-cdp') {
    return prettyJson({
      error: caseResult.value?.error || selectedPlaywrightResult.value?.error || record.playwrightError || '',
      failed_step_index: selectedPlaywrightResult.value?.failed_step_index,
      cdp_attach_error: selectedPlaywrightResult.value?.detail?.cdp_attach_error,
      diagnostics: selectedPlaywrightResult.value?.detail || {},
    })
  }
  return prettyJson({
    execution_id: selectedExecutionId.value,
    executor: executionType.value,
    case_id: caseResult.value?.case_id || selectedRecord.value?.caseId,
    case_name: caseResult.value?.case_name || selectedRecord.value?.caseName,
    started_at: caseResult.value?.started_at || selectedRecord.value?.startedAt,
    finished_at: caseResult.value?.finished_at || selectedRecord.value?.finishedAt,
    status: caseResult.value?.status || selectedRecord.value?.executeStatus,
    error: caseResult.value?.error || selectedPlaywrightResult.value?.error || record.playwrightError || '',
    error_code: selectedPlaywrightResult.value?.error_code,
    error_details: selectedPlaywrightResult.value?.error_details,
    steps: stepResults.value,
  })
})

const recordColumns = [
  { title: '执行 ID', dataIndex: 'executionId', width: 210, ellipsis: true, tooltip: true },
  {
    title: '用例',
    dataIndex: 'caseName',
    width: 180,
    render: ({ record }: any) => record.caseName || record.caseId || '-',
  },
  {
    title: '状态',
    dataIndex: 'executeStatus',
    width: 90,
    render: ({ record }: any) => <a-tag color={statusColor(record.executeStatus)}>{statusLabel(record.executeStatus)}</a-tag>,
  },
  {
    title: '结果',
    dataIndex: 'executeResult',
    width: 90,
    render: ({ record }: any) => <a-tag color={resultColor(record.executeResult)}>{aggregateResultLabel(record.executeResult)}</a-tag>,
  },
  { title: '耗时', dataIndex: 'duration', width: 100, render: ({ record }: any) => formatDuration(record.duration) },
  {
    title: '通过率',
    dataIndex: 'scenePassRate',
    width: 90,
    render: ({ record }: any) => record.scenePassRate || record.casePassRate || '-',
  },
  {
    title: '开始时间',
    dataIndex: 'startedAt',
    width: 180,
    render: ({ record }: any) => formatExecutionDateTime(record.startedAt || record.finishedAt),
  },
]

const stepColumns = [
  { title: '#', dataIndex: 'step_index', width: 40 },
  { title: '步骤 ID', dataIndex: 'step_id', width: 150 },
  { title: '动作', dataIndex: 'action_type', width: 80 },
  { title: '描述', dataIndex: 'description', ellipsis: true, tooltip: true },
  {
    title: '结果',
    dataIndex: 'status',
    align: 'center',
    width: 90,
    render: ({ record }: any) => <a-tag color={resultColor(record.status)}>{resultLabel(record.status)}</a-tag>,
  },
  { title: '耗时', dataIndex: 'duration_ms', width: 100, render: ({ record }: any) => formatDuration(record.duration_ms) },
  { title: '错误', dataIndex: 'error', width: 240, ellipsis: true, tooltip: true },
]

const onOpen = async (
  sceneId: string,
  type: ExecutionType,
  targetView: ExecutionViewType,
  options: ExecutionResultOpenOptions = {},
) => {
  executionType.value = type
  recordScope.value = options.source || 'all'
  testPlanId.value = options.testPlanId || ''
  viewType.value = targetView
  selectedRecordKey.value = ''
  targetCaseId.value = options.target?.caseId || ''
  releaseVideoUrl()
  visible.value = true
  loading.value = true
  try {
    if (options.target?.executionDbId) {
      scene.value = await loadLayeredExecutionRecord(sceneId, options, type)
      const availableRecords = getExecutionRecords(scene.value, type, recordScope.value, testPlanId.value)
      selectedRecordKey.value = availableRecords[0]?.__key || ''
      return
    }
    const { data } = await getAutomationUiScene(sceneId)
    scene.value = data
    const availableRecords = getExecutionRecords(data, type, recordScope.value, testPlanId.value)
    const targetRecord = availableRecords.find((record) => matchesExecutionRecord(record, options.target))
    selectedRecordKey.value = targetRecord?.__key || availableRecords[0]?.__key || ''
  } finally {
    loading.value = false
  }
}

// 结果抽屉只按需读取一个 case，但目标可能位于后续页，不能把第一页误当成完整结果。
const findExecutionCase = async (executionDbId: string | number, targetCaseId?: string) => {
  let page = 1
  while (true) {
    const response = await getAutomationUiExecutionCases(
      executionDbId,
      page,
      AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT,
    )
    const data = response.data
    if (!data) return undefined
    const matched = targetCaseId
      ? data.list.find((item) => String(item.definitionCaseId || item.caseKey || '') === String(targetCaseId))
      : data.list[0]
    if (matched || data.list.length === 0 || page * AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT >= data.total) {
      return matched
    }
    page += 1
  }
}

// 兼容旧抽屉需要完整步骤列表，按服务端页大小逐页合并，避免超过 50 条时静默截断。
const loadAllExecutionSteps = async (caseExecutionDbId: string | number): Promise<AutomationUiExecutionStep[]> => {
  const steps: AutomationUiExecutionStep[] = []
  let page = 1
  while (true) {
    const response = await getAutomationUiExecutionSteps(
      caseExecutionDbId,
      page,
      AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT,
    )
    const data = response.data
    if (!data) return steps
    steps.push(...data.list)
    if (data.list.length === 0 || steps.length >= data.total) return steps
    page += 1
  }
}

const loadLayeredExecutionRecord = async (
  sceneId: string,
  options: ExecutionResultOpenOptions,
  type: ExecutionType,
) => {
  const executionDbId = options.target?.executionDbId
  if (!executionDbId) return undefined
  const [detailResponse, executionCase] = await Promise.all([
    getAutomationUiExecution(executionDbId),
    findExecutionCase(executionDbId, options.target?.caseId),
  ])
  if (!detailResponse.data) throw new Error('执行记录已过期或无权访问')
  const detail = detailResponse.data
  let artifactUrls: Record<string, string> = {}
  try {
    // Artifact 元数据只用于关联当前用例，内容仍通过后端授权下载接口读取。
    const artifactResponse = await getAutomationUiExecutionArtifacts(executionDbId, 1, 50)
    artifactUrls = buildLayeredArtifactUrls(
      executionDbId,
      artifactResponse.data?.list || [],
      executionCase?.caseExecutionDbId,
    )
  } catch {
    // 旧执行记录可能没有产物记录，不能因此阻断日志和步骤历史展示。
  }
  const executionSteps = executionCase?.caseExecutionDbId
    ? await loadAllExecutionSteps(executionCase.caseExecutionDbId)
    : []
  const steps = executionSteps.map((step) => ({
    step_index: step.stepIndex,
    step_id: step.definitionStepId || step.sourceStepId,
    action_type: step.actionType,
    description: step.description || step.stepName,
    status: step.status,
    duration_ms: step.durationMs,
    error: step.errorMessage,
  }))
  const caseResult = executionCase ? {
    case_id: executionCase.definitionCaseId || executionCase.caseKey,
    case_name: executionCase.caseName,
    execution_id: executionCase.caseExecutionKey || detail.executionKey,
    job_id: executionCase.jobId,
    status: executionCase.executeResult || executionCase.result || executionCase.status,
    duration_ms: executionCase.durationMs,
    wall_clock_duration_ms: executionCase.wallClockDurationMs,
    step_total: executionCase.stepTotal,
    step_pass: executionCase.stepPass,
    step_fail: executionCase.stepFail,
    step_skip: executionCase.stepSkip,
    artifact_urls: artifactUrls,
    steps,
  } : undefined
  const record = {
    __key: `execution:${detail.executionDbId}`,
    executionType: type,
    executionId: detail.executionKey,
    batchId: detail.batchId,
    buildNumber: detail.buildNumber,
    executeStatus: detail.status,
    executeResult: detail.result,
    executeName: detail.executeName || detail.executeUsername,
    startedAt: detail.startedAt,
    finishedAt: detail.finishedAt,
    duration: detail.durationMs,
    consoleUrl: detail.consoleUrl,
    testReportUrl: detail.testReportUrl,
    caseName: executionCase?.caseName,
    caseId: executionCase?.definitionCaseId || executionCase?.caseKey,
    artifactUrls,
    caseResults: caseResult ? [caseResult] : [],
  }
  return {
    id: sceneId,
    sceneId: detail.sceneKey || sceneId,
    name: detail.sceneKey || sceneId,
    debugRecord: detail.recordSource === 'debug' ? [record] : [],
    testRecord: detail.recordSource === 'test' ? [record] : [],
  }
}

function buildLayeredArtifactUrls(
  executionDbId: string | number,
  artifacts: Array<{ artifactDbId: number, artifactType?: string, caseExecutionDbId?: number }>,
  caseExecutionDbId?: number,
) {
  const targetCaseId = caseExecutionDbId == null ? '' : String(caseExecutionDbId)
  const scopedArtifacts = targetCaseId
    ? artifacts.filter((artifact) => (
        artifact.caseExecutionDbId != null && String(artifact.caseExecutionDbId) === targetCaseId
      ))
    : artifacts
  const candidates = scopedArtifacts.length > 0
    ? scopedArtifacts
    : artifacts.filter((artifact) => artifact.caseExecutionDbId == null)
  const urls: Record<string, string> = {}
  candidates.forEach((artifact) => {
    if (!artifact.artifactDbId || !artifact.artifactType) return
    const type = String(artifact.artifactType).toLowerCase().replaceAll('-', '_')
    let key = type
    if (type === 'report') key = 'report_html'
    if (type === 'screenshots') key = 'screenshot'
    if (urls[key]) return
    urls[key] = getAutomationUiExecutionArtifactContentUrl(executionDbId, artifact.artifactDbId)
  })
  return urls
}

const openExternal = (url?: string) => {
  if (!url) return
  window.open(url, '_blank')
}

const loadProtectedBlob = async (url: string, expectedContentType?: string) => {
  const requestUrl = resolveArtifactRequestUrl(url)
  const token = getToken()
  const response = await fetch(requestUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error(`读取执行产物失败（HTTP ${response.status}）`)
  const contentType = response.headers.get('content-type') || ''
  const body = await response.blob()
  const preview = (contentType.includes('json') ? body : body.slice(0, 512))
  const previewText = await preview.text()
  if (contentType.includes('json') || previewText.trimStart().startsWith('{')) {
    const text = contentType.includes('json') ? previewText : await body.text()
    let payload: any
    try {
      payload = JSON.parse(text)
    } catch {
      throw new Error('读取执行产物失败：响应格式无效')
    }
    if (payload?.success === false || payload?.code === 1) {
      throw new Error(payload.msg || payload.message || '读取执行产物失败')
    }
    throw new Error('读取执行产物失败：服务端返回了 JSON，而不是文件')
  }
  return expectedContentType ? new Blob([body], { type: expectedContentType }) : body
}

const openHtmlReport = () => {
  if (!reportArtifactUrl.value) return
  return openProtectedArtifact(reportArtifactUrl.value, 'text/html;charset=UTF-8')
}

const openTracePreview = async () => {
  if (!traceArtifactUrl.value) return
  const requestUrl = resolveArtifactRequestUrl(traceArtifactUrl.value)
  const traceUrl = /^https?:\/\//i.test(requestUrl)
    ? requestUrl
    : new URL(requestUrl, window.location.origin).href
  const viewerWindow = window.open('', '_blank')
  if (!viewerWindow) {
    Message.warning('浏览器已拦截 Trace Viewer，请允许当前站点打开弹窗后重试')
    return
  }
  if (isPublicHttpsUrl(traceUrl)) {
    viewerWindow.location.href = `https://trace.playwright.dev/?trace=${encodeURIComponent(traceUrl)}`
    return
  }
  artifactLoading.value = true
  try {
    const trace = await loadProtectedBlob(traceArtifactUrl.value, 'application/zip')
    downloadBlob(trace, `playwright-trace-${selectedExecutionId.value || 'trace'}.zip`)
    viewerWindow.location.href = 'https://trace.playwright.dev/'
    Message.info('Trace 已准备完成，请在 Trace Viewer 中点击“Select file”选择刚下载的文件')
  } catch (error: any) {
    viewerWindow.close()
    Message.error(error?.message || '读取 Playwright Trace 失败')
  } finally {
    artifactLoading.value = false
  }
}

const openScreenshotPreview = () => {
  if (!screenshotArtifactUrl.value) return
  return openProtectedArtifact(screenshotArtifactUrl.value, 'image/png')
}

function isPublicHttpsUrl(url: string) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') return false
  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.local')) return false
  if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) return false
  const private172 = hostname.match(/^172\.(\d+)\./)
  return !private172 || Number(private172[1]) < 16 || Number(private172[1]) > 31
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

const openProtectedArtifact = async (url: string, expectedContentType?: string) => {
  const artifactWindow = window.open('', '_blank')
  if (!artifactWindow) {
    Message.warning('浏览器已拦截产物窗口，请允许当前站点打开弹窗后重试')
    return
  }
  artifactLoading.value = true
  try {
    const blob = await loadProtectedBlob(url, expectedContentType)
    const objectUrl = URL.createObjectURL(blob)
    artifactWindow.location.href = objectUrl
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
  } catch (error: any) {
    artifactWindow.close()
    Message.error(error?.message || '读取执行产物失败')
  } finally {
    artifactLoading.value = false
  }
}

const loadVideoArtifact = async () => {
  if (!videoArtifactUrl.value) return
  artifactLoading.value = true
  try {
    const blob = await loadProtectedBlob(videoArtifactUrl.value)
    releaseVideoUrl()
    videoObjectUrl.value = URL.createObjectURL(blob)
  } catch (error: any) {
    Message.error(error?.message || '读取 Runner 执行录屏失败')
  } finally {
    artifactLoading.value = false
  }
}

function releaseVideoUrl() {
  if (videoObjectUrl.value) URL.revokeObjectURL(videoObjectUrl.value)
  videoObjectUrl.value = ''
}

function resolveArtifactRequestUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  const base = String(import.meta.env.VITE_API_PREFIX || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  if (!base || path.startsWith(`${base}/`)) return path
  return `${base}${path}`
}

watch(selectedRecordKey, () => {
  releaseVideoUrl()
})
onUnmounted(releaseVideoUrl)

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.summary-card {
  background: var(--color-fill-1);
}

.json-panel {
  max-height: 520px;
  margin: 12px 0 0;
  padding: 14px;
  overflow: auto;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  background: #101828;
  color: #d0d5dd;
  font: 12px/1.6 Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.execution-video {
  display: block;
  width: 100%;
  max-height: 620px;
  margin-top: 12px;
  background: #000;
}
</style>
