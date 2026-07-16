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
              <a-card v-else title="结构化执行日志" size="small">
                <a-descriptions :column="2" size="small" bordered>
                  <a-descriptions-item label="执行 ID">{{ selectedRecord.executionId || '-' }}</a-descriptions-item>
                  <a-descriptions-item label="用例">{{ selectedRecord.caseName || selectedRecord.caseId || '-' }}</a-descriptions-item>
                  <a-descriptions-item label="失败步骤">{{ selectedRecord.playwrightResult?.failed_step_index ?? '-' }}</a-descriptions-item>
                  <a-descriptions-item label="错误">{{ selectedRecord.playwrightError || selectedRecord.playwrightResult?.error || '-' }}</a-descriptions-item>
                </a-descriptions>
                <a-button
                  v-if="executionType === 'playwright-runner' && consoleArtifactUrl"
                  style="margin-top: 12px"
                  :loading="artifactLoading"
                  @click="loadConsoleArtifact"
                >
                  读取 Runner console events
                </a-button>
                <pre class="json-panel">{{ logContent }}</pre>
              </a-card>
            </template>

            <template v-else-if="viewType === 'report'">
              <a-card v-if="executionType === 'jenkins'" title="Jenkins 执行报告" size="small">
                <a-button type="primary" :disabled="!selectedRecord.testReportUrl" @click="openExternal(selectedRecord.testReportUrl)">
                  打开原报告
                </a-button>
              </a-card>
              <template v-else>
                <a-card title="用例执行汇总" size="small">
                  <a-descriptions :column="4" size="small" bordered>
                    <a-descriptions-item label="用例">{{ caseResult.case_name || caseResult.case_id || selectedRecord.caseName || '-' }}</a-descriptions-item>
                    <a-descriptions-item label="结果">
                      <a-tag :color="resultColor(caseResult.status || selectedRecord.executeResult)">
                        {{ resultLabel(caseResult.status || selectedRecord.executeResult) }}
                      </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="通过率">{{ selectedRecord.scenePassRate || selectedRecord.casePassRate || '-' }}</a-descriptions-item>
                    <a-descriptions-item label="耗时">{{ formatDuration(selectedRecord.duration) }}</a-descriptions-item>
                  </a-descriptions>
                  <a-space v-if="executionType === 'playwright-runner'" wrap style="margin-top: 12px">
                    <a-button v-if="reportArtifactUrl" type="primary" @click="openProtectedArtifact(reportArtifactUrl)">打开 HTML report</a-button>
                    <a-button v-if="traceArtifactUrl" @click="openProtectedArtifact(traceArtifactUrl)">下载 Trace</a-button>
                    <a-button v-if="screenshotArtifactUrl" @click="openProtectedArtifact(screenshotArtifactUrl)">查看失败截图</a-button>
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
  type ExecutionType,
  type ExecutionViewType,
  executionTypeLabel,
  executionViewLabels,
  formatExecutionDateTime,
  getArtifactUrl,
  getExecutionRecords,
  resolveJenkinsVideoUrl,
} from '../execution'
import { getAutomationUiScene } from '@/apis/automation/automationUiScene'
import { getToken } from '@/utils/auth'

const { width } = useWindowSize()
const drawerWidth = computed(() => width.value >= 1080 ? 1000 : '100%')
const visible = ref(false)
const loading = ref(false)
const artifactLoading = ref(false)
const scene = ref<any>()
const executionType = ref<ExecutionType>('jenkins')
const viewType = ref<ExecutionViewType>('record')
const selectedRecordKey = ref('')
const artifactText = ref('')
const videoObjectUrl = ref('')

const records = computed(() => getExecutionRecords(scene.value, executionType.value))
const selectedRecord = computed<any>(() => records.value.find((item) => item.__key === selectedRecordKey.value) || records.value[0])
const recordOptions = computed(() => records.value.map((record: any) => ({
  value: record.__key,
  label: `${record.executionId || record.buildNumber || record.caseId || '历史记录'} · ${formatExecutionDateTime(record.startedAt || record.finishedAt)}`,
})))
const caseResult = computed<any>(() => {
  const record = selectedRecord.value || {}
  if (Array.isArray(record.caseResults) && record.caseResults.length) return record.caseResults[0]
  if (record.playwrightResult?.case_result) return record.playwrightResult.case_result
  return {}
})
const stepResults = computed<any[]>(() => {
  const record = selectedRecord.value || {}
  const steps = caseResult.value?.steps || record.stepResults || record.playwrightResult?.steps
  return Array.isArray(steps) ? steps : []
})
const artifactUploadErrors = computed<any[]>(() => {
  const value = selectedRecord.value?.artifactUploadErrors || selectedRecord.value?.playwrightResult?.artifact_upload_errors
  return Array.isArray(value) ? value : []
})
const consoleArtifactUrl = computed(() => getArtifactUrl(selectedRecord.value, 'console_log', 'console', 'logs'))
const reportArtifactUrl = computed(() => getArtifactUrl(selectedRecord.value, 'report_html', 'report'))
const videoArtifactUrl = computed(() => getArtifactUrl(selectedRecord.value, 'video', 'videos'))
const traceArtifactUrl = computed(() => getArtifactUrl(selectedRecord.value, 'trace'))
const screenshotArtifactUrl = computed(() => getArtifactUrl(selectedRecord.value, 'failure_screenshot', 'screenshot', 'screenshots'))
const jenkinsVideoUrl = computed(() => resolveJenkinsVideoUrl(selectedRecord.value, String(scene.value?.sceneId || '')))
const runnerVideoEmptyText = computed(() => {
  const policy = selectedRecord.value?.playwrightResult?.raw?.video_policy
  if (policy === 'retain-on-failure' && resultLabel(selectedRecord.value?.executeResult) === '通过') {
    return '当前保留策略为 retain-on-failure，成功执行未生成录屏'
  }
  return '本次 Runner 执行没有可用录屏'
})
const logContent = computed(() => {
  if (artifactText.value) return artifactText.value
  const record = selectedRecord.value || {}
  if (executionType.value === 'extension-cdp') {
    return prettyJson({
      error: record.playwrightError || record.playwrightResult?.error || '',
      failed_step_index: record.playwrightResult?.failed_step_index,
      cdp_attach_error: record.playwrightResult?.detail?.cdp_attach_error,
      diagnostics: record.playwrightResult?.detail || {},
    })
  }
  return prettyJson({
    error: record.playwrightError || record.playwrightResult?.error || '',
    error_code: record.playwrightResult?.error_code,
    error_details: record.playwrightResult?.error_details,
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
    render: ({ record }: any) => <a-tag color={resultColor(record.executeResult)}>{resultLabel(record.executeResult)}</a-tag>,
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
  { title: '#', dataIndex: 'step_index', width: 60 },
  { title: '步骤 ID', dataIndex: 'step_id', width: 140 },
  { title: '动作', dataIndex: 'action_type', width: 130 },
  { title: '描述', dataIndex: 'description', ellipsis: true, tooltip: true },
  {
    title: '结果',
    dataIndex: 'status',
    width: 90,
    render: ({ record }: any) => <a-tag color={resultColor(record.status)}>{resultLabel(record.status)}</a-tag>,
  },
  { title: '耗时', dataIndex: 'duration_ms', width: 100, render: ({ record }: any) => formatDuration(record.duration_ms) },
  { title: '错误', dataIndex: 'error', width: 240, ellipsis: true, tooltip: true },
]

const onOpen = async (sceneId: string, type: ExecutionType, targetView: ExecutionViewType) => {
  executionType.value = type
  viewType.value = targetView
  selectedRecordKey.value = ''
  artifactText.value = ''
  releaseVideoUrl()
  visible.value = true
  loading.value = true
  try {
    const { data } = await getAutomationUiScene(sceneId)
    scene.value = data
    selectedRecordKey.value = getExecutionRecords(data, type)[0]?.__key || ''
  } finally {
    loading.value = false
  }
}

const openExternal = (url?: string) => {
  if (!url) return
  window.open(url, '_blank')
}

const loadProtectedBlob = async (url: string) => {
  const requestUrl = resolveArtifactRequestUrl(url)
  const token = getToken()
  const response = await fetch(requestUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error(`读取执行产物失败（HTTP ${response.status}）`)
  return response.blob()
}

const openProtectedArtifact = async (url: string) => {
  const artifactWindow = window.open('', '_blank')
  if (!artifactWindow) {
    Message.warning('浏览器已拦截产物窗口，请允许当前站点打开弹窗后重试')
    return
  }
  artifactLoading.value = true
  try {
    const blob = await loadProtectedBlob(url)
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

const loadConsoleArtifact = async () => {
  if (!consoleArtifactUrl.value) return
  artifactLoading.value = true
  try {
    const blob = await loadProtectedBlob(consoleArtifactUrl.value)
    const text = await blob.text()
    try {
      artifactText.value = prettyJson(JSON.parse(text))
    } catch {
      artifactText.value = text
    }
  } catch (error: any) {
    Message.error(error?.message || '读取 Runner console events 失败')
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
  artifactText.value = ''
  releaseVideoUrl()
})
onUnmounted(releaseVideoUrl)

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function formatDuration(value: unknown) {
  const total = Number(value)
  if (!Number.isFinite(total) || total < 0) return '-'
  if (total < 1000) return `${total} ms`
  const seconds = Math.floor(total / 1000)
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} m ${seconds % 60} s`
}

function resultLabel(value: unknown) {
  const normalized = String(value ?? '').toLowerCase()
  if (['passed', 'success', '14'].includes(normalized)) return '通过'
  if (['failed', '15'].includes(normalized)) return '失败'
  if (['skipped', 'cancelled', '16'].includes(normalized)) return normalized === 'cancelled' ? '已取消' : '跳过'
  if (['running', '13'].includes(normalized)) return '未执行'
  return normalized || '-'
}

function resultColor(value: unknown) {
  const label = resultLabel(value)
  if (label === '通过') return 'green'
  if (label === '失败') return 'red'
  if (label === '跳过' || label === '已取消') return 'orange'
  return 'gray'
}

function statusLabel(value: unknown) {
  const normalized = String(value ?? '').toLowerCase()
  if (['running', '11'].includes(normalized)) return '执行中'
  if (['completed', '12'].includes(normalized)) return '已完成'
  if (['not_started', '10'].includes(normalized)) return '未开始'
  return normalized || '-'
}

function statusColor(value: unknown) {
  const label = statusLabel(value)
  if (label === '执行中') return 'arcoblue'
  if (label === '已完成') return 'green'
  return 'gray'
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
