<template>
  <a-modal
    v-model:visible="visible"
    :title="executionTypeLabel(executionType)"
    :width="980"
    :mask-closable="false"
    unmount-on-close
  >
    <a-spin :loading="loading" style="width: 100%">
      <div class="execute-modal">
        <a-alert type="info" show-icon>
          已选择 {{ selectedCaseKeys.length }} 个用例。请确认产品环境和执行参数，开始后请在执行历史中查看实时状态。
        </a-alert>

        <a-descriptions :column="2" bordered size="medium">
          <a-descriptions-item label="所属项目">{{ projectName }}</a-descriptions-item>
          <a-descriptions-item label="所属版本">{{ versionName }}</a-descriptions-item>
          <a-descriptions-item label="执行用例" :span="2">
            <a-space wrap>
              <a-tag v-for="item in selectedCaseRows" :key="item.caseId" color="arcoblue">
                {{ item.name }}
              </a-tag>
            </a-space>
          </a-descriptions-item>
        </a-descriptions>

        <a-row :gutter="16" class="config-row">
          <a-col :span="12">
            <a-card title="产品环境" size="small" class="config-card">
              <template #extra>
                <a-button type="outline" size="small" :disabled="running" @click="goProjectEnvironmentConfig">
                  去配置
                </a-button>
              </template>
              <a-form :model="form" layout="vertical">
                <a-form-item label="服务器 IP" required>
                  <a-select
                    v-model="form.projectEnvironmentId"
                    placeholder="请选择产品环境"
                    allow-search
                    :disabled="running"
                    @change="handleProjectEnvironmentChange"
                  >
                    <a-option
                      v-for="item in projectEnvironmentOptions"
                      :key="item.value"
                      :value="item.value"
                      :label="item.label"
                    >
                      <div class="option-row">
                        <span class="option-main">{{ item.label }}</span>
                        <a-tag :color="item.statusColor">{{ item.statusLabel }}</a-tag>
                      </div>
                    </a-option>
                  </a-select>
                </a-form-item>
              </a-form>
              <div v-if="selectedProjectEnvironment" class="summary-list">
                <div class="summary-item">
                  <span class="summary-label">环境类型</span>
                  <GiCellTag :value="selectedProjectEnvironment.type" :dict="server_type" />
                </div>
                <div class="summary-item">
                  <span class="summary-label">服务器 IP</span>
                  <span class="summary-value">{{ selectedProjectEnvironment.serverIp }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">在线状态</span>
                  <a-tag :color="selectedProjectEnvironment.statusColor">
                    {{ selectedProjectEnvironment.statusLabel }}
                  </a-tag>
                </div>
                <div class="summary-item">
                  <span class="summary-label">启用状态</span>
                  <GiCellTag :value="selectedProjectEnvironment.enabledStatus" :dict="status_type" />
                </div>
              </div>
              <div class="effective-url">
                <div class="summary-label">预览用例 {{ previewCaseId || '-' }} 起始地址</div>
                <a-spin :loading="previewLoading" size="mini">
                  <div class="effective-url-value" :class="[{ error: previewError }]">
                    {{ previewError || effectiveStartUrl || '请选择产品环境和用例' }}
                  </div>
                </a-spin>
              </div>
            </a-card>
          </a-col>

          <a-col :span="12">
            <a-card
              :title="executionType === 'extension-cdp' ? 'CDP 回放配置' : 'Playwright Runner 配置'"
              size="small"
              class="config-card"
            >
              <div v-if="executionType === 'extension-cdp'" class="cdp-config">
                <a-form :model="form" layout="vertical">
                  <a-form-item label="浏览器" required>
                    <a-select placeholder="使用当前浏览器" allow-search disabled>
                      <a-option value="chromium">当前浏览器</a-option>
                    </a-select>
                  </a-form-item>
                </a-form>
                <fieldset class="option-group">
                  <legend>执行窗口尺寸</legend>
                  <a-radio-group v-model="cdpConfig.windowSizeMode" direction="vertical" :disabled="running">
                    <a-radio value="maximized">默认最大化</a-radio>
                    <a-radio value="current">当前窗口尺寸</a-radio>
                    <a-radio value="custom">自定义尺寸</a-radio>
                  </a-radio-group>
                  <a-row v-if="cdpConfig.windowSizeMode === 'custom'" :gutter="12" class="viewport-row">
                    <a-col :span="12">
                      <a-form-item label="宽度">
                        <a-input-number
                          v-model="cdpConfig.viewportWidth"
                          :min="320"
                          :max="10000"
                          :disabled="running"
                        />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="高度">
                        <a-input-number
                          v-model="cdpConfig.viewportHeight"
                          :min="320"
                          :max="10000"
                          :disabled="running"
                        />
                      </a-form-item>
                    </a-col>
                  </a-row>
                  <div class="option-tip">当前窗口尺寸由扩展读取本页所在 Chrome 窗口。</div>
                </fieldset>
                <div class="failure-analysis-card">
                  <div class="option-row">
                    <div>
                      <div class="analysis-title">页面错误检测</div>
                      <div class="option-tip">检测页面错误并写入失败上下文；AI 深度分析仍为预留能力。</div>
                    </div>
                    <a-switch v-model="cdpConfig.pageErrorCheckEnabled" :disabled="running" />
                  </div>
                </div>
              </div>

              <a-form v-else :model="runnerConfig" layout="vertical" class="runner-config">
                <a-row :gutter="12">
                  <a-col :span="24">
                    <a-form-item label="浏览器">
                      <a-select v-model="runnerConfig.browser" :disabled="running">
                        <a-option value="chromium">Chromium 浏览器</a-option>
                        <a-option value="firefox">Firefox 浏览器</a-option>
                        <a-option value="webkit">WebKit 浏览器</a-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="显示浏览器窗口">
                      <a-switch v-model="runnerConfig.headed" :disabled="running" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="忽略 HTTPS 证书错误">
                      <a-switch v-model="runnerConfig.ignoreHttpsErrors" :disabled="running" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="录屏保留策略">
                      <a-select v-model="runnerConfig.video" :disabled="running" :options="artifactPolicyOptions" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="追踪文件保留策略">
                      <a-select v-model="runnerConfig.trace" :disabled="running" :options="artifactPolicyOptions" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="单步骤超时（毫秒）">
                      <a-input-number
                        v-model="runnerConfig.stepTimeoutMs"
                        :min="1000"
                        :max="300000"
                        :disabled="running"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="用例总超时（毫秒）">
                      <a-input-number
                        v-model="runnerConfig.caseTimeoutMs"
                        :min="10000"
                        :max="3600000"
                        :disabled="running"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="操作慢放（毫秒）">
                      <a-input-number
                        v-model="runnerConfig.slowMoMs"
                        :min="0"
                        :max="10000"
                        :disabled="running"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="执行结束停留（毫秒）">
                      <a-input-number
                        v-model="runnerConfig.finishDelayMs"
                        :min="0"
                        :max="600000"
                        :disabled="running"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                <div class="option-tip">产物目录、访问令牌与登录态继续由 Runner 服务端配置管理。</div>
              </a-form>
            </a-card>
          </a-col>
        </a-row>
      </div>
    </a-spin>

    <template #footer>
      <a-space>
        <a-button @click="backToCaseSelection">上一步</a-button>
        <a-button @click="visible = false">取消</a-button>
        <a-button type="primary" :disabled="!canStartSelected" @click="startSelectedCases">
          开始执行（{{ selectedCaseKeys.length }}）
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { type ExecutionType, type LiveExecutionCase, executionTypeLabel, isExecutableCase } from '../execution'
import { startExtensionCdpPlayback, stopExtensionCdpPlayback } from '../extensionPlayback'
import { getAutomationUiScene } from '@/apis/automation/automationUiScene'
import {
  type AutomationPlaywrightRunnerJobResp,
  type AutomationPlaywrightRunnerOptions,
  cancelAutomationPlaywrightBatch,
  cancelAutomationPlaywrightRunnerJob,
  createAutomationPlaywrightBatch,
  createAutomationPlaywrightRunnerJob,
  getAutomationPlaywrightCase,
  getAutomationPlaywrightRunnerJob,
  updateAutomationPlaywrightBatchCase,
} from '@/apis/automation/automationPlaywrightRunner'
import { getProjectConfig } from '@/apis/project/projectConfig'
import { getProjectEnvironmentConfigList, getProjectEnvironmentRuntimeStatus } from '@/apis/project/projectEnvironmentConfig'
import { getProjectVersionConfig } from '@/apis/project/projectVersionConfig'
import { useDict } from '@/hooks/app'
import GiCellTag from '@/components/GiCell/GiCellTag.vue'

interface ProjectEnvironmentOption {
  value: string
  label: string
  name: string
  type: string
  serverIp: string
  enabledStatus: string | number
  statusLabel: string
  statusColor: string
}

type SelectChangeValue = string | number | boolean | Record<string, any> | Array<any>
type CasePlaybackStatus = 'idle' | 'waiting' | 'starting' | 'queued' | 'running' | 'passed' | 'failed' | 'cancelled'
type BatchState = 'idle' | 'running' | 'cancelling' | 'completed' | 'cancelled'

interface PlaybackCaseRow {
  caseId: string
  executionId: string
  name: string
  stepTotal: number
  status: CasePlaybackStatus
  error: string
  startedAt?: number
  finishedAt?: number
}

interface ExtensionCompletion {
  ok: boolean
  error?: string
}

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'started'): void
  (e: 'finished'): void
  (e: 'back', payload: {
    scene: any
    executionType: Exclude<ExecutionType, 'jenkins'>
    caseIds: string[]
  }): void
  (e: 'batch-update', rows: LiveExecutionCase[]): void
}>()
const { server_type, status_type } = useDict('server_type', 'status_type')
const router = useRouter()

const visible = ref(false)
const loading = ref(false)
const previewLoading = ref(false)
const scene = ref<any>()
const executionType = ref<Exclude<ExecutionType, 'jenkins'>>('extension-cdp')
const selectedCaseKeys = ref<Array<string | number>>([])
const caseRows = ref<PlaybackCaseRow[]>([])
const projectName = ref('-')
const versionName = ref('-')
const projectEnvironmentOptions = ref<ProjectEnvironmentOption[]>([])
const previewCase = ref<any>()
const previewError = ref('')
const previewCaseId = ref('')
const runnerJob = ref<AutomationPlaywrightRunnerJobResp>()
const activeCaseId = ref('')
const activeCaseKey = ref('')
const batchState = ref<BatchState>('idle')
const batchCaseIds = ref<string[]>([])
const batchId = ref('')
const batchExecuteName = ref('')
const cancelRequested = ref(false)
const cdpConfiguredCaseId = ref('')
let batchTimer: number | undefined
let runnerPollTimer: number | undefined
let previewSequence = 0
let extensionCompletionResolver: ((result: ExtensionCompletion) => void) | undefined

const form = reactive({ projectEnvironmentId: '' })
const cdpConfig = reactive({
  windowSizeMode: 'maximized' as 'maximized' | 'current' | 'custom',
  viewportWidth: 1920,
  viewportHeight: 1080,
  pageErrorCheckEnabled: true,
})
const runnerConfig = reactive<AutomationPlaywrightRunnerOptions>({
  browser: 'chromium',
  headed: false,
  ignoreHttpsErrors: true,
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
  stepTimeoutMs: 6000,
  caseTimeoutMs: 600000,
  slowMoMs: 0,
  finishDelayMs: 0,
})
const artifactPolicyOptions = [
  { label: '关闭', value: 'off' },
  { label: '始终保留', value: 'on' },
  { label: '仅失败保留', value: 'retain-on-failure' },
]

const playbackSceneKey = computed(() => String(scene.value?.sceneId || scene.value?.id || ''))
const selectedProjectEnvironment = computed(() => projectEnvironmentOptions.value
  .find((item) => item.value === form.projectEnvironmentId))
const effectiveStartUrl = computed(() => previewCase.value?.start_url || previewCase.value?.startUrl || '')
const running = computed(() => ['running', 'cancelling'].includes(batchState.value))
const activeCaseRow = computed(() => caseRows.value.find((item) => item.caseId === activeCaseId.value))
const terminalStatuses: CasePlaybackStatus[] = ['passed', 'failed', 'cancelled']
const batchRows = computed(() => {
  const ids = new Set(batchCaseIds.value)
  return caseRows.value.filter((item) => ids.has(item.caseId))
})
const passedCount = computed(() => batchRows.value.filter((item) => item.status === 'passed').length)
const failedCount = computed(() => batchRows.value.filter((item) => item.status === 'failed').length)
const selectedCaseRows = computed(() => {
  const selectedIds = new Set(selectedCaseKeys.value.map(String))
  return caseRows.value.filter((item) => selectedIds.has(item.caseId))
})
const cdpConfigValid = computed(() => cdpConfig.windowSizeMode !== 'custom' || (
  cdpConfig.viewportWidth >= 320 && cdpConfig.viewportWidth <= 10000
  && cdpConfig.viewportHeight >= 320 && cdpConfig.viewportHeight <= 10000
))
const runnerConfigValid = computed(() => runnerConfig.stepTimeoutMs >= 1000
  && runnerConfig.caseTimeoutMs >= runnerConfig.stepTimeoutMs
  && runnerConfig.slowMoMs >= 0
  && runnerConfig.finishDelayMs >= 0)
const baseConfigValid = computed(() => Boolean(
  form.projectEnvironmentId
  && selectedProjectEnvironment.value?.statusLabel === '在线'
  && !running.value
  && (executionType.value === 'extension-cdp' ? cdpConfigValid.value : runnerConfigValid.value),
))
const canStartSelected = computed(() => baseConfigValid.value && selectedCaseKeys.value.length > 0)

const resetRunnerConfig = () => Object.assign(runnerConfig, {
  browser: 'chromium',
  headed: false,
  ignoreHttpsErrors: true,
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
  stepTimeoutMs: 6000,
  caseTimeoutMs: 600000,
  slowMoMs: 0,
  finishDelayMs: 0,
})

const resetBatchState = () => {
  clearTimers()
  batchState.value = 'idle'
  batchCaseIds.value = []
  batchId.value = ''
  batchExecuteName.value = ''
  activeCaseId.value = ''
  activeCaseKey.value = ''
  runnerJob.value = undefined
  cancelRequested.value = false
  extensionCompletionResolver = undefined
  caseRows.value.forEach((item) => {
    item.status = 'idle'
    item.error = ''
    item.startedAt = undefined
    item.finishedAt = undefined
  })
}

const getPrimaryServer = (item: any) => {
  const servers = Array.isArray(item?.serverConfig) ? item.serverConfig : []
  return servers.find((server: any) => Number(server?.status) === 1) || servers[0] || {}
}

const loadSceneMeta = async () => {
  projectName.value = scene.value?.projectName || '-'
  versionName.value = scene.value?.versionName || '-'
  const requests: Array<Promise<void>> = []
  if (scene.value?.projectId) {
    requests.push(getProjectConfig(String(scene.value.projectId)).then(({ data }) => {
      projectName.value = data?.name || projectName.value
    }))
  }
  if (scene.value?.versionId) {
    requests.push(getProjectVersionConfig(String(scene.value.versionId)).then(({ data }) => {
      versionName.value = data?.name || versionName.value
    }))
  }
  await Promise.all(requests)
}

const loadProjectEnvironments = async () => {
  if (!scene.value?.projectId) return
  const { data } = await getProjectEnvironmentConfigList({
    id: undefined,
    projectId: String(scene.value.projectId),
    name: undefined,
    status: 1,
    sort: ['name,asc'],
  })
  projectEnvironmentOptions.value = data.map((item: any) => {
    const server = getPrimaryServer(item)
    return {
      value: String(item.id),
      label: server?.ip || item.name || String(item.id),
      name: item.name || '-',
      type: server?.type || '-',
      serverIp: server?.ip || '-',
      enabledStatus: item.status,
      statusLabel: '未检测',
      statusColor: 'gray',
    }
  })
  form.projectEnvironmentId = projectEnvironmentOptions.value[0]?.value || ''
  if (form.projectEnvironmentId) await refreshSelectedEnvironmentStatus()
}

async function refreshSelectedEnvironmentStatus() {
  const option = selectedProjectEnvironment.value
  if (!option) return
  option.statusLabel = '检测中'
  option.statusColor = 'arcoblue'
  try {
    const { data } = await getProjectEnvironmentRuntimeStatus(option.value)
    option.serverIp = data?.serverIp || option.serverIp
    option.label = option.serverIp || option.label
    const online = String(data?.onlineStatus) === '5' || data?.onlineStatus === '在线'
    option.statusLabel = online ? '在线' : '离线'
    option.statusColor = online ? 'green' : 'red'
  } catch (error) {
    option.statusLabel = '检测失败'
    option.statusColor = 'red'
    throw error
  }
}

const fetchPlaybackCase = async (caseId: string) => {
  const caseKey = `${playbackSceneKey.value}:${caseId}`
  const { data } = await getAutomationPlaywrightCase(caseKey, form.projectEnvironmentId)
  return data
}

const applyCdpCaseDefaults = (caseId: string, data: any) => {
  if (cdpConfiguredCaseId.value === caseId || running.value) return
  const windowMode = String(data?.window_size_mode || data?.windowSizeMode || '')
  cdpConfig.windowSizeMode = ['current', 'custom'].includes(windowMode)
    ? windowMode as 'current' | 'custom'
    : 'maximized'
  cdpConfig.viewportWidth = Number(data?.viewport_width || data?.viewportWidth) || 1920
  cdpConfig.viewportHeight = Number(data?.viewport_height || data?.viewportHeight) || 1080
  cdpConfig.pageErrorCheckEnabled = Number(data?.page_error_check_enabled ?? data?.pageErrorCheckEnabled ?? 0) !== 0
  cdpConfiguredCaseId.value = caseId
}

const loadPlaybackPreview = async (caseId = resolvePreviewCaseId()) => {
  previewError.value = ''
  previewCase.value = undefined
  previewCaseId.value = caseId
  if (!scene.value?.id || !caseId || !form.projectEnvironmentId) return
  const currentSequence = ++previewSequence
  previewLoading.value = true
  try {
    const data = await fetchPlaybackCase(caseId)
    if (currentSequence !== previewSequence) return
    previewCase.value = data
    applyCdpCaseDefaults(caseId, data)
  } catch (error: any) {
    if (currentSequence !== previewSequence) return
    previewError.value = error?.message || '生成环境回放地址失败'
  } finally {
    if (currentSequence === previewSequence) previewLoading.value = false
  }
}

const onOpen = async (
  record: any,
  type: Exclude<ExecutionType, 'jenkins'>,
  options: { caseIds: string[] },
) => {
  if (running.value) {
    Message.warning('当前已有批次正在执行，请在执行历史中查看进度')
    return
  }
  executionType.value = type
  selectedCaseKeys.value = []
  caseRows.value = []
  form.projectEnvironmentId = ''
  projectEnvironmentOptions.value = []
  previewCase.value = undefined
  previewError.value = ''
  previewCaseId.value = ''
  cdpConfiguredCaseId.value = ''
  resetRunnerConfig()
  resetBatchState()
  visible.value = true
  loading.value = true
  try {
    const { data } = await getAutomationUiScene(String(record.id))
    scene.value = data
    const selectedIds = new Set((options.caseIds || []).map(String))
    const cases = (Array.isArray(data.caseList) ? data.caseList : []).filter(isExecutableCase)
    caseRows.value = cases
      .filter((item: any) => selectedIds.has(String(item.id)))
      .map((item: any) => ({
        caseId: String(item.id),
        executionId: '',
        name: item.name || String(item.id),
        stepTotal: Array.isArray(item.stepList) ? item.stepList.length : 0,
        status: 'idle',
        error: '',
      }))
    selectedCaseKeys.value = caseRows.value.map((item) => item.caseId)
    await Promise.all([loadSceneMeta(), loadProjectEnvironments()])
    await loadPlaybackPreview()
  } catch (error: any) {
    Message.error(error?.message || '读取场景回放配置失败')
  } finally {
    loading.value = false
  }
}

const toSelectId = (value: SelectChangeValue) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return ''
}

const handleProjectEnvironmentChange = async (value: SelectChangeValue) => {
  const nextValue = toSelectId(value)
  if (!nextValue) return
  form.projectEnvironmentId = nextValue
  try {
    await refreshSelectedEnvironmentStatus()
  } catch {
    Message.warning('产品环境在线状态检测失败')
  }
  await loadPlaybackPreview()
}

const startSelectedCases = async () => {
  try {
    await startBatch(selectedCaseKeys.value.map(String))
  } catch (error: any) {
    Message.error(error?.message || '创建执行批次失败，请稍后重试')
  }
}

function backToCaseSelection() {
  emit('back', {
    scene: scene.value,
    executionType: executionType.value,
    caseIds: selectedCaseKeys.value.map(String),
  })
  visible.value = false
}

async function startBatch(caseIds: string[]) {
  if (!caseIds.length || running.value) return
  try {
    await refreshSelectedEnvironmentStatus()
  } catch {
    Message.warning('产品环境在线状态检测失败，请稍后重试')
    return
  }
  if (selectedProjectEnvironment.value?.statusLabel !== '在线') {
    Message.warning('当前产品环境服务器不在线，请切换为在线环境后再执行')
    return
  }
  if (executionType.value === 'playwright-runner' && runnerConfig.caseTimeoutMs < runnerConfig.stepTimeoutMs) {
    Message.warning('用例总超时不能小于单步骤超时')
    return
  }

  const { data: createdBatch } = await createAutomationPlaywrightBatch({
    sceneKey: playbackSceneKey.value,
    executionType: executionType.value,
    caseIds,
    projectEnvironmentId: form.projectEnvironmentId,
    executionConfig: executionType.value === 'extension-cdp'
      ? { ...cdpConfig }
      : { ...runnerConfig },
  })
  const batchCases = new Map(createdBatch.cases.map((item) => [String(item.caseId), item]))
  batchCaseIds.value = [...caseIds]
  batchState.value = 'running'
  batchId.value = createdBatch.batchId
  batchExecuteName.value = createdBatch.executeName || '-'
  cancelRequested.value = false
  runnerJob.value = undefined
  caseRows.value.forEach((item) => {
    item.executionId = batchCases.get(item.caseId)?.executionId || ''
    item.status = caseIds.includes(item.caseId) ? 'waiting' : 'idle'
    item.error = ''
    item.startedAt = undefined
    item.finishedAt = undefined
  })
  startBatchTimer()
  publishBatchState()
  visible.value = false
  emit('started')

  for (const caseId of caseIds) {
    if (cancelRequested.value) break
    const row = caseRows.value.find((item) => item.caseId === caseId)
    if (!row) continue
    activeCaseId.value = caseId
    activeCaseKey.value = `${playbackSceneKey.value}:${caseId}`
    row.startedAt = Date.now()
    row.status = 'starting'
    row.error = ''
    publishBatchState()
    await updateBatchCaseStatus(row, 'starting')
    try {
      await executeOneCase(row)
    } catch (error: any) {
      if (cancelRequested.value) {
        row.status = 'cancelled'
        row.error = row.error || '批次已取消'
      } else {
        row.status = 'failed'
        row.error = error?.message || `${executionTypeLabel(executionType.value)}执行失败`
      }
    } finally {
      row.finishedAt = Date.now()
      if (['failed', 'cancelled'].includes(row.status)) {
        await updateBatchCaseStatus(row, row.status, { error: row.error })
      }
      publishBatchState()
      await refreshSceneAfterCase()
      activeCaseId.value = ''
      activeCaseKey.value = ''
      runnerJob.value = undefined
    }
  }

  if (cancelRequested.value) {
    markWaitingCasesCancelled()
    batchState.value = 'cancelled'
    Message.warning('批量执行已取消')
  } else {
    batchState.value = 'completed'
    Message.success(`批量执行完成：通过 ${passedCount.value}，失败 ${failedCount.value}`)
  }
  publishBatchState()
  clearBatchTimer()
  emit('success')
  emit('finished')
}

async function executeOneCase(row: PlaybackCaseRow) {
  const data = await fetchPlaybackCase(row.caseId)
  previewCaseId.value = row.caseId
  previewCase.value = data
  previewError.value = ''
  const startUrl = data?.start_url || data?.startUrl || ''
  if (!startUrl) throw new Error('当前用例没有可用的回放起始地址')
  if (!Array.isArray(data?.steps) || data.steps.length === 0) {
    throw new Error('当前用例没有可执行步骤')
  }
  if (cancelRequested.value) throw new Error('批次已取消')

  if (executionType.value === 'extension-cdp') {
    await executeExtensionCase(row, startUrl)
  } else {
    await executeRunnerCase(row)
  }
}

async function executeExtensionCase(row: PlaybackCaseRow, startUrl: string) {
  const completionPromise = new Promise<ExtensionCompletion>((resolve) => {
    extensionCompletionResolver = resolve
  })
  try {
    await startExtensionCdpPlayback({
      caseKey: activeCaseKey.value,
      caseId: row.caseId,
      batchId: batchId.value,
      executionId: row.executionId,
      projectEnvironmentId: form.projectEnvironmentId,
      startUrl,
      viewportMode: cdpConfig.windowSizeMode,
      viewportWidth: cdpConfig.windowSizeMode === 'custom' ? cdpConfig.viewportWidth : undefined,
      viewportHeight: cdpConfig.windowSizeMode === 'custom' ? cdpConfig.viewportHeight : undefined,
      pageErrorCheckEnabled: cdpConfig.pageErrorCheckEnabled,
    })
  } catch (error) {
    extensionCompletionResolver = undefined
    throw error
  }
  row.status = 'running'
  await updateBatchCaseStatus(row, 'running')
  publishBatchState()
  const result = await completionPromise
  extensionCompletionResolver = undefined
  if (cancelRequested.value) {
    row.status = 'cancelled'
    row.error = '批次已取消'
  } else if (result.ok) {
    row.status = 'passed'
  } else {
    row.status = 'failed'
    row.error = result.error || '扩展 CDP 回放失败'
  }
  publishBatchState()
}

async function executeRunnerCase(row: PlaybackCaseRow) {
  const { data } = await createAutomationPlaywrightRunnerJob({
    caseKey: activeCaseKey.value,
    batchId: batchId.value,
    executionId: row.executionId,
    projectEnvironmentId: form.projectEnvironmentId,
    options: { ...runnerConfig },
  })
  runnerJob.value = data
  if (cancelRequested.value) {
    runnerJob.value = (await cancelAutomationPlaywrightRunnerJob(data.jobId)).data
  }
  row.status = normalizeRunnerStatus(runnerJob.value.status)
  await updateBatchCaseStatus(row, row.status === 'queued' ? 'queued' : 'running', { jobId: data.jobId })
  publishBatchState()
  const finalJob = await pollRunnerJob(data.jobId, row)
  runnerJob.value = finalJob
  row.status = normalizeRunnerStatus(finalJob.status)
  if (finalJob.status === 'failed') {
    row.error = finalJob.error || finalJob.outputTail?.slice(-8).join('\n') || 'Runner 回放失败'
  } else if (finalJob.status === 'cancelled') {
    row.error = '批次已取消'
  }
}

async function pollRunnerJob(jobId: string, row: PlaybackCaseRow) {
  let previousStatus = row.status
  while (true) {
    const { data } = await getAutomationPlaywrightRunnerJob(jobId)
    runnerJob.value = data
    row.status = normalizeRunnerStatus(data.status)
    if (row.status !== previousStatus && ['queued', 'running'].includes(row.status)) {
      await updateBatchCaseStatus(row, row.status as 'queued' | 'running', { jobId })
      previousStatus = row.status
    }
    publishBatchState()
    if (['passed', 'failed', 'cancelled'].includes(data.status)) return data
    await waitForRunnerPoll()
  }
}

function waitForRunnerPoll() {
  return new Promise<void>((resolve) => {
    runnerPollTimer = window.setTimeout(resolve, 1500)
  })
}

const cancelBatch = async () => {
  if (!running.value || cancelRequested.value) return
  cancelRequested.value = true
  batchState.value = 'cancelling'
  markWaitingCasesCancelled()
  const row = activeCaseRow.value
  if (row && !terminalStatuses.includes(row.status)) {
    row.status = 'cancelled'
    row.error = '批次已取消'
  }
  publishBatchState()
  try {
    await cancelAutomationPlaywrightBatch(playbackSceneKey.value, batchId.value)
    if (executionType.value === 'playwright-runner' && runnerJob.value?.jobId) {
      runnerJob.value = (await cancelAutomationPlaywrightRunnerJob(runnerJob.value.jobId)).data
    } else if (executionType.value === 'extension-cdp') {
      await stopExtensionCdpPlayback()
      settleExtensionCompletion({ ok: false, error: '批次已取消' })
    }
  } catch (error: any) {
    Message.error(error?.message || '取消当前执行任务失败')
    settleExtensionCompletion({ ok: false, error: error?.message || '批次已取消' })
  }
  publishBatchState()
}

async function refreshSceneAfterCase() {
  if (!scene.value?.id) return
  try {
    const { data } = await getAutomationUiScene(String(scene.value.id))
    scene.value = data
    emit('success')
  } catch {
    // 执行结果已经由 Runner/CDP 回传；刷新失败不应中断后续用例。
  }
}

function markWaitingCasesCancelled() {
  caseRows.value.forEach((item) => {
    if (batchCaseIds.value.includes(item.caseId) && item.status === 'waiting') {
      item.status = 'cancelled'
      item.error = '批次已取消，未开始执行'
      item.finishedAt = Date.now()
    }
  })
}

function resolvePreviewCaseId() {
  if (activeCaseId.value) return activeCaseId.value
  return selectedCaseKeys.value.length ? String(selectedCaseKeys.value[0]) : ''
}

function normalizeRunnerStatus(status: AutomationPlaywrightRunnerJobResp['status']): CasePlaybackStatus {
  return status === 'queued' ? 'queued' : status
}

async function updateBatchCaseStatus(
  row: PlaybackCaseRow,
  status: 'starting' | 'queued' | 'running' | 'failed' | 'cancelled',
  extra: { jobId?: string, error?: string } = {},
) {
  if (!batchId.value || !playbackSceneKey.value || !row.executionId) return
  const terminal = ['failed', 'cancelled'].includes(status)
  try {
    await updateAutomationPlaywrightBatchCase(
      playbackSceneKey.value,
      batchId.value,
      row.caseId,
      {
        status,
        jobId: extra.jobId,
        startedAt: status === 'starting' ? new Date(row.startedAt || Date.now()).toISOString() : undefined,
        finishedAt: terminal ? new Date(row.finishedAt || Date.now()).toISOString() : undefined,
        durationMs: terminal && row.startedAt ? Math.max(0, (row.finishedAt || Date.now()) - row.startedAt) : undefined,
        error: extra.error,
      },
    )
  } catch (error) {
    console.warn('[automation] 批次用例状态同步失败', error)
  }
}

function startBatchTimer() {
  clearBatchTimer()
  batchTimer = window.setInterval(() => {
    publishBatchState()
  }, 1000)
}

function clearBatchTimer() {
  if (batchTimer) window.clearInterval(batchTimer)
  batchTimer = undefined
}

function clearTimers() {
  clearBatchTimer()
  if (runnerPollTimer) window.clearTimeout(runnerPollTimer)
  runnerPollTimer = undefined
}

function settleExtensionCompletion(result: ExtensionCompletion) {
  const resolver = extensionCompletionResolver
  extensionCompletionResolver = undefined
  resolver?.(result)
}

function publishBatchState() {
  if (!batchId.value) return
  emit('batch-update', batchRows.value.map((item) => ({
    batchId: batchId.value,
    executionId: item.executionId,
    executeName: batchExecuteName.value,
    executionType: executionType.value,
    caseId: item.caseId,
    caseName: item.name,
    stepTotal: item.stepTotal,
    status: item.status === 'idle' ? 'waiting' : item.status,
    error: item.error,
    startedAt: item.startedAt,
    finishedAt: item.finishedAt,
  })))
}

const goProjectEnvironmentConfig = async () => {
  visible.value = false
  await router.push({
    path: '/project/environmentConfig',
    query: { projectId: String(scene.value?.projectId || '') },
  })
}

const handleExtensionPlaybackEnd = (event: MessageEvent) => {
  if (event.source !== window) return
  const data = event.data || {}
  if (data.type !== 'AT_PLAYBACK_END' || data.adminCaseKey !== activeCaseKey.value) return
  settleExtensionCompletion({
    ok: data.ok !== false,
    error: data.ok === false ? (data.error || '扩展 CDP 回放失败') : '',
  })
}

watch(selectedCaseKeys, async () => {
  if (running.value) return
  await loadPlaybackPreview()
})

onMounted(() => window.addEventListener('message', handleExtensionPlaybackEnd))
onUnmounted(() => {
  window.removeEventListener('message', handleExtensionPlaybackEnd)
  clearTimers()
  settleExtensionCompletion({ ok: false, error: '页面已关闭' })
})

defineExpose({ onOpen, cancelBatch })
</script>

<style scoped lang="scss">
.execute-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-row {
  margin-top: -4px;
}

.config-card {
  height: 100%;
  border-radius: 12px;
}

.option-row,
.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.option-main {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.summary-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--color-fill-2);
}

.summary-label,
.option-tip,
.muted {
  color: var(--color-text-3);
  font-size: 13px;
}

.summary-value {
  color: var(--color-text-1);
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}

.effective-url {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
}

.effective-url-value {
  min-height: 22px;
  margin-top: 6px;
  color: rgb(var(--primary-6));
  font-family: Consolas, monospace;
  line-height: 1.5;
  word-break: break-all;
}

.effective-url-value.error {
  color: rgb(var(--danger-6));
}

.option-group {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
}

.option-group legend {
  padding: 0 6px;
  font-weight: 600;
}

.viewport-row {
  margin-top: 10px;
}

.failure-analysis-card {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--color-border-2);
  border-left: 3px solid rgb(var(--primary-6));
  border-radius: 10px;
}

.analysis-title {
  margin-bottom: 4px;
  font-weight: 600;
}

.runner-config :deep(.arco-form-item) {
  margin-bottom: 10px;
}

:deep(.arco-card-body) {
  padding: 12px 10px;
}

:deep(.arco-table-body) {
  min-height: 0;
}
</style>
