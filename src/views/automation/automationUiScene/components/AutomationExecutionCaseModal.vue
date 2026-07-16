<template>
  <a-modal
    v-model:visible="visible"
    :title="`${executionTypeLabel(executionType)}`"
    :width="980"
    :mask-closable="false"
    :esc-to-close="!running"
    unmount-on-close
  >
    <a-spin :loading="loading" style="width: 100%">
      <div class="execute-modal">
        <a-alert type="info" show-icon>
          已选择 1 个场景，请确认本次回放使用的产品环境、执行用例与回放配置。
        </a-alert>

        <a-descriptions :column="2" bordered size="medium">
          <a-descriptions-item label="所属项目">{{ projectName }}</a-descriptions-item>
          <a-descriptions-item label="所属版本">{{ versionName }}</a-descriptions-item>
        </a-descriptions>

        <a-row :gutter="16" class="config-row">
          <a-col :span="12">
            <a-card title="产品环境" size="small" class="config-card">
              <template #extra>
                <a-button type="outline" size="small" @click="goProjectEnvironmentConfig">去配置</a-button>
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
                  <a-tag :color="selectedProjectEnvironment.statusColor">{{ selectedProjectEnvironment.statusLabel }}</a-tag>
                </div>
                <div class="summary-item">
                  <span class="summary-label">启用状态</span>
                  <GiCellTag :value="selectedProjectEnvironment.enabledStatus" :dict="status_type" />
                </div>
              </div>
              <div class="effective-url">
                <div class="summary-label">本次回放起始地址</div>
                <a-spin :loading="previewLoading" size="mini">
                  <div :class="['effective-url-value', { error: previewError }]">
                    {{ previewError || effectiveStartUrl || '请选择产品环境和用例' }}
                  </div>
                </a-spin>
              </div>
            </a-card>
          </a-col>

          <a-col :span="12">
            <a-card :title="executionType === 'extension-cdp' ? 'CDP 回放配置' : 'Playwright Runner 配置'" size="small" class="config-card">
              <div v-if="executionType === 'extension-cdp'" class="cdp-config">
                <a-form :model="form" layout="vertical">
                <a-form-item label="浏览器" required>
                  <a-select
                    placeholder="使用当前浏览器"
                    allow-search
                    disabled
                  >
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
                        <a-input-number v-model="cdpConfig.viewportWidth" :min="320" :max="10000" :disabled="running" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="高度">
                        <a-input-number v-model="cdpConfig.viewportHeight" :min="320" :max="10000" :disabled="running" />
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
                      <a-input-number v-model="runnerConfig.stepTimeoutMs" :min="1000" :max="300000" :disabled="running" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="用例总超时（毫秒）">
                      <a-input-number v-model="runnerConfig.caseTimeoutMs" :min="10000" :max="3600000" :disabled="running" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="操作慢放（毫秒）">
                      <a-input-number v-model="runnerConfig.slowMoMs" :min="0" :max="10000" :disabled="running" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="执行结束停留（毫秒）">
                      <a-input-number v-model="runnerConfig.finishDelayMs" :min="0" :max="600000" :disabled="running" />
                    </a-form-item>
                  </a-col>
                </a-row>
                <div class="option-tip">并发数、产物目录、访问令牌与登录态继续由 Runner 服务端配置管理。</div>
              </a-form>
            </a-card>
          </a-col>
        </a-row>

        <a-card title="场景信息" size="small" class="scene-card">
          <a-table :data="sceneRows" :pagination="false" row-key="id" size="small" :scroll="{ y: 220 }">
            <template #columns>
              <a-table-column title="场景 ID" data-index="sceneId" :width="180" />
              <a-table-column title="场景名称" data-index="name" />
              <a-table-column title="执行状态" :width="120" align="center">
                <template #cell="{ record }">
                  <GiCellTag
                    v-if="getSceneExecuteFieldValue(record, 'executeStatus')"
                    :value="getSceneExecuteFieldValue(record, 'executeStatus')"
                    :dict="status_type"
                  />
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column title="上次结果" :width="120" align="center">
                <template #cell="{ record }">
                  <GiCellTag
                    v-if="getSceneExecuteFieldValue(record, 'executeResult')"
                    :value="getSceneExecuteFieldValue(record, 'executeResult')"
                    :dict="status_type"
                  />
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column title="运行耗时" :width="120" align="center">
                <template #cell="{ record }">{{ getSceneDuration(record) }}</template>
              </a-table-column>
              <a-table-column title="构建号" :width="100" align="center">
                <template #cell="{ record }">{{ getSceneBuildNumber(record) }}</template>
              </a-table-column>
            </template>
          </a-table>
          <a-alert v-if="!loading && executableCases.length === 0" type="warning">
            当前场景没有启用且包含步骤的用例，无法启动回放。
          </a-alert>
        </a-card>

        <a-card v-if="status !== 'idle'" size="small" class="execution-status-card">
          <a-space direction="vertical" fill>
            <a-space>
              <span>任务状态</span>
              <a-tag :color="statusColor">{{ statusLabel }}</a-tag>
              <span v-if="activeCaseKey" class="muted">{{ activeCaseKey }}</span>
            </a-space>
            <a-alert v-if="errorMessage" type="error">{{ errorMessage }}</a-alert>
            <pre v-if="runnerJob?.outputTail?.length" class="runner-output">{{ runnerJob.outputTail.join('\n') }}</pre>
          </a-space>
        </a-card>
      </div>
    </a-spin>

    <template #footer>
      <a-space>
        <a-button v-if="executionType === 'playwright-runner' && running" status="danger" @click="cancelRunner">取消任务</a-button>
        <a-button @click="visible = false">取消</a-button>
        <a-button type="primary" :loading="starting" :disabled="!canStart" @click="startPlayback">确定</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { type ExecutionType, executionTypeLabel, isExecutableCase } from '../execution'
import { startExtensionCdpPlayback } from '../extensionPlayback'
import { getAutomationUiScene } from '@/apis/automation/automationUiScene'
import {
  type AutomationPlaywrightRunnerJobResp,
  type AutomationPlaywrightRunnerOptions,
  cancelAutomationPlaywrightRunnerJob,
  createAutomationPlaywrightRunnerJob,
  getAutomationPlaywrightCase,
  getAutomationPlaywrightRunnerJob,
} from '@/apis/automation/automationPlaywrightRunner'
import { getProjectConfig } from '@/apis/project/projectConfig'
import { getProjectEnvironmentConfigList, getProjectEnvironmentRuntimeStatus } from '@/apis/project/projectEnvironmentConfig'
import { getProjectVersionConfig } from '@/apis/project/projectVersionConfig'
import { useDict } from '@/hooks/app'
import { formatDuration } from '@/utils/sakura'
import { pickSceneExecuteField } from '@/utils/automationUiSceneStatus'
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
type PlaybackStatus = 'idle' | 'starting' | 'queued' | 'running' | 'passed' | 'failed' | 'cancelled'

const { server_type, status_type } = useDict('server_type', 'status_type')
const emit = defineEmits<{ (e: 'success'): void }>()
const router = useRouter()

const visible = ref(false)
const loading = ref(false)
const previewLoading = ref(false)
const scene = ref<any>()
const executionType = ref<Exclude<ExecutionType, 'jenkins'>>('extension-cdp')
const selectedCaseId = ref('')
const preferredCaseId = ref('')
const projectName = ref('-')
const versionName = ref('-')
const projectEnvironmentOptions = ref<ProjectEnvironmentOption[]>([])
const previewCase = ref<any>()
const previewError = ref('')
const status = ref<PlaybackStatus>('idle')
const errorMessage = ref('')
const activeCaseKey = ref('')
const runnerJob = ref<AutomationPlaywrightRunnerJobResp>()
const cdpConfiguredCaseId = ref('')
let runnerPollTimer: number | undefined
let previewSequence = 0

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

const executableCases = computed(() => {
  const caseList = Array.isArray(scene.value?.caseList) ? scene.value.caseList : []
  return caseList.filter(isExecutableCase)
})
const sceneRows = computed(() => scene.value ? [scene.value] : [])
const playbackSceneKey = computed(() => String(scene.value?.sceneId || scene.value?.id || ''))
const selectedProjectEnvironment = computed(() => projectEnvironmentOptions.value
  .find(item => item.value === form.projectEnvironmentId))
const effectiveStartUrl = computed(() => previewCase.value?.start_url || previewCase.value?.startUrl || '')
const starting = computed(() => status.value === 'starting')
const running = computed(() => ['starting', 'queued', 'running'].includes(status.value))
const cdpConfigValid = computed(() => cdpConfig.windowSizeMode !== 'custom' || (
  cdpConfig.viewportWidth >= 320 && cdpConfig.viewportWidth <= 10000
  && cdpConfig.viewportHeight >= 320 && cdpConfig.viewportHeight <= 10000
))
const runnerConfigValid = computed(() => runnerConfig.stepTimeoutMs >= 1000
  && runnerConfig.caseTimeoutMs >= runnerConfig.stepTimeoutMs
  && runnerConfig.slowMoMs >= 0
  && runnerConfig.finishDelayMs >= 0)
const canStart = computed(() => Boolean(
  selectedCaseId.value
  && form.projectEnvironmentId
  && effectiveStartUrl.value
  && selectedProjectEnvironment.value?.statusLabel === '在线'
  && !previewError.value
  && !running.value
  && (executionType.value === 'extension-cdp' ? cdpConfigValid.value : runnerConfigValid.value),
))
const statusLabel = computed(() => ({
  idle: '未开始',
  starting: '启动中',
  queued: '排队中',
  running: '执行中',
  passed: '通过',
  failed: '失败',
  cancelled: '已取消',
}[status.value]))
const statusColor = computed(() => {
  if (status.value === 'passed') return 'green'
  if (status.value === 'failed') return 'red'
  if (status.value === 'cancelled') return 'orange'
  return 'arcoblue'
})

const getLastDebugRecord = (record: any) => {
  if (Array.isArray(record?.debugRecord) && record.debugRecord.length > 0) return record.debugRecord[0]
  if (Array.isArray(record?.testRecord) && record.testRecord.length > 0) return record.testRecord[0]
  return undefined
}

const getSceneExecuteFieldValue = (record: any, field: 'executeStatus' | 'executeResult') => {
  const lastRecord = getLastDebugRecord(record)
  const recordForPick = lastRecord ? { ...record, debugRecord: [lastRecord] } : record
  return pickSceneExecuteField(recordForPick, field, status_type.value)
}

const getSceneDuration = (record: any) => {
  const duration = getLastDebugRecord(record)?.duration
  if (duration === undefined || duration === null || duration === '-' || duration === '') return '-'
  return formatDuration(Number(duration))
}

const getSceneBuildNumber = (record: any) => getLastDebugRecord(record)?.buildNumber || '-'

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

const refreshSelectedEnvironmentStatus = async () => {
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

const loadPlaybackPreview = async () => {
  previewError.value = ''
  previewCase.value = undefined
  if (!scene.value?.id || !selectedCaseId.value || !form.projectEnvironmentId) return
  const currentSequence = ++previewSequence
  previewLoading.value = true
  try {
    const caseKey = `${playbackSceneKey.value}:${selectedCaseId.value}`
    const { data } = await getAutomationPlaywrightCase(caseKey, form.projectEnvironmentId)
    if (currentSequence !== previewSequence) return
    previewCase.value = data
    if (cdpConfiguredCaseId.value !== selectedCaseId.value) {
      const windowMode = String(data?.window_size_mode || data?.windowSizeMode || '')
      cdpConfig.windowSizeMode = ['current', 'custom'].includes(windowMode)
        ? windowMode as 'current' | 'custom'
        : 'maximized'
      cdpConfig.viewportWidth = Number(data?.viewport_width || data?.viewportWidth) || 1920
      cdpConfig.viewportHeight = Number(data?.viewport_height || data?.viewportHeight) || 1080
      cdpConfig.pageErrorCheckEnabled = Number(data?.page_error_check_enabled ?? data?.pageErrorCheckEnabled ?? 0) !== 0
      cdpConfiguredCaseId.value = selectedCaseId.value
    }
  } catch (error: any) {
    if (currentSequence !== previewSequence) return
    previewError.value = error?.message || '生成环境回放地址失败'
  } finally {
    if (currentSequence === previewSequence) previewLoading.value = false
  }
}

const onOpen = async (record: any, type: Exclude<ExecutionType, 'jenkins'>, options?: { caseId?: string }) => {
  if (runnerPollTimer) window.clearTimeout(runnerPollTimer)
  executionType.value = type
  preferredCaseId.value = String(options?.caseId || '')
  selectedCaseId.value = ''
  form.projectEnvironmentId = ''
  projectEnvironmentOptions.value = []
  previewCase.value = undefined
  previewError.value = ''
  cdpConfiguredCaseId.value = ''
  status.value = 'idle'
  errorMessage.value = ''
  activeCaseKey.value = ''
  runnerJob.value = undefined
  resetRunnerConfig()
  visible.value = true
  loading.value = true
  try {
    const { data } = await getAutomationUiScene(String(record.id))
    scene.value = data
    const cases = (Array.isArray(data.caseList) ? data.caseList : []).filter(isExecutableCase)
    if (preferredCaseId.value && cases.some(item => String(item.id) === preferredCaseId.value)) {
      selectedCaseId.value = preferredCaseId.value
    } else if (cases.length > 0) {
      selectedCaseId.value = String(cases[0].id)
    }
    await Promise.all([loadSceneMeta(), loadProjectEnvironments()])
    await loadPlaybackPreview()
  } catch (error: any) {
    errorMessage.value = error?.message || '读取场景回放配置失败'
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

const startPlayback = async () => {
  if (!selectedCaseId.value || !scene.value?.id || !form.projectEnvironmentId) return
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
  await loadPlaybackPreview()
  if (!effectiveStartUrl.value || previewError.value) {
    Message.warning(previewError.value || '当前用例没有可用的回放起始地址')
    return
  }
  if (executionType.value === 'playwright-runner' && runnerConfig.caseTimeoutMs < runnerConfig.stepTimeoutMs) {
    Message.warning('用例总超时不能小于单步骤超时')
    return
  }

  activeCaseKey.value = `${playbackSceneKey.value}:${selectedCaseId.value}`
  status.value = 'starting'
  errorMessage.value = ''
  try {
    if (executionType.value === 'extension-cdp') {
      await startExtensionCdpPlayback({
        caseKey: activeCaseKey.value,
        caseId: selectedCaseId.value,
        projectEnvironmentId: form.projectEnvironmentId,
        startUrl: effectiveStartUrl.value,
        viewportMode: cdpConfig.windowSizeMode,
        viewportWidth: cdpConfig.windowSizeMode === 'custom' ? cdpConfig.viewportWidth : undefined,
        viewportHeight: cdpConfig.windowSizeMode === 'custom' ? cdpConfig.viewportHeight : undefined,
        pageErrorCheckEnabled: cdpConfig.pageErrorCheckEnabled,
      })
      status.value = 'running'
      Message.success('扩展已接收 CDP 回放任务，请保持当前页面打开')
      return
    }
    const { data } = await createAutomationPlaywrightRunnerJob({
      caseKey: activeCaseKey.value,
      projectEnvironmentId: form.projectEnvironmentId,
      options: { ...runnerConfig },
    })
    runnerJob.value = data
    status.value = data.status
    Message.success(`已创建 Playwright Runner 任务：${data.jobId}`)
    await pollRunner(data.jobId)
  } catch (error: any) {
    status.value = 'failed'
    errorMessage.value = error?.message || `${executionTypeLabel(executionType.value)}启动失败`
  }
}

async function pollRunner(jobId: string) {
  try {
    const { data } = await getAutomationPlaywrightRunnerJob(jobId)
    runnerJob.value = data
    status.value = data.status
    if (['passed', 'failed', 'cancelled'].includes(data.status)) {
      if (data.status === 'failed') {
        errorMessage.value = data.error || data.outputTail?.slice(-8).join('\n') || 'Runner 回放失败'
      }
      emit('success')
      return
    }
    runnerPollTimer = window.setTimeout(() => pollRunner(jobId), 1500)
  } catch (error: any) {
    status.value = 'failed'
    errorMessage.value = error?.message || '获取 Runner 任务状态失败'
  }
}

const cancelRunner = async () => {
  if (!runnerJob.value?.jobId) return
  try {
    const { data } = await cancelAutomationPlaywrightRunnerJob(runnerJob.value.jobId)
    runnerJob.value = data
    status.value = data.status
    if (runnerPollTimer) window.clearTimeout(runnerPollTimer)
    emit('success')
  } catch (error: any) {
    errorMessage.value = error?.message || '取消 Runner 任务失败'
  }
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
  status.value = data.ok === false ? 'failed' : 'passed'
  errorMessage.value = data.ok === false ? (data.error || '扩展 CDP 回放失败') : ''
  emit('success')
}

onMounted(() => window.addEventListener('message', handleExtensionPlaybackEnd))
onUnmounted(() => {
  window.removeEventListener('message', handleExtensionPlaybackEnd)
  if (runnerPollTimer) window.clearTimeout(runnerPollTimer)
})

defineExpose({ onOpen })
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

.config-card,
.scene-card {
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

.execution-status-card {
  background: var(--color-fill-1);
}

.runner-output {
  max-height: 260px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 4px;
  background: #101828;
  color: #d0d5dd;
  font: 12px/1.6 Consolas, monospace;
  white-space: pre-wrap;
}

:deep(.arco-card-body) {
  padding: 12px 10px;
}
:deep(.arco-table-body) {
  min-height: 0;
}
</style>
