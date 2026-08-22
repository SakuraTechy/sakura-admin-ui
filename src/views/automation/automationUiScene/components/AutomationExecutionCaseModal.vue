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
          已选择 {{ executionCaseCount }} 个用例。请确认产品环境和执行参数，开始后请在执行历史中查看实时状态。
        </a-alert>

        <a-descriptions :column="2" bordered size="medium">
          <a-descriptions-item label="所属项目">{{ projectName }}</a-descriptions-item>
          <a-descriptions-item label="所属版本">{{ versionName }}</a-descriptions-item>
          <a-descriptions-item label="执行用例" :span="2">
            <a-space wrap>
              <a-tag v-if="selectAllCases" color="arcoblue">当前定义的全部 {{ executionCaseCount }} 个可执行用例</a-tag>
              <a-tag v-for="item in selectedCaseRows" :key="item.caseId" color="arcoblue">
                {{ item.name }}
              </a-tag>
            </a-space>
          </a-descriptions-item>
        </a-descriptions>

        <a-row :gutter="16" class="config-row">
          <a-col :span="11">
            <a-card title="产品环境" size="small" class="config-card">
              <template #extra>
                <a-button type="outline" size="small" :disabled="running" @click="goProjectEnvironmentConfig">
                  去配置
                </a-button>
              </template>
              <a-form :model="form" layout="vertical">
                <a-form-item label="所属环境" required>
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
                        <span class="option-main">{{ item.name }}</span>
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

          <a-col :span="13">
            <a-card
              :title="executionType === 'extension-cdp' ? 'CDP 回放配置' : 'Playwright Runner 配置'"
              size="small"
              class="config-card"
            >
              <div v-if="executionType === 'extension-cdp'" class="cdp-config">
                <a-form :model="form" layout="vertical">
                  <a-row :gutter="12">
                    <a-col :span="12">
                      <a-form-item label="浏览器" required>
                        <a-select placeholder="使用当前浏览器" allow-search disabled>
                          <a-option value="chromium">当前浏览器</a-option>
                        </a-select>
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="忽略 HTTPS 证书错误">
                        <a-switch v-model="cdpConfig.ignoreHttpsErrors" :disabled="running" />
                      </a-form-item>
                    </a-col>
                  </a-row>
                  <a-form-item>
                    <template #label>
                      <span class="form-label-with-help">
                        <span>用例会话</span>
                        <a-tooltip position="top">
                          <template #content>
                            <div class="page-error-policy-help">
                              <div><strong>当前浏览器兼容模式：</strong>新建普通 Chrome 回放窗口，批次内持续复用并共享 Chrome Profile。</div>
                              <div><strong>同一浏览器窗口：</strong>复用标签页、sessionStorage 和页面内存。</div>
                              <div><strong>复用登录态：</strong>仅提交上一条成功用例的认证状态。</div>
                              <div><strong>独立登录：</strong>每条用例使用全新受控无痕会话。</div>
                            </div>
                          </template>
                          <icon-question-circle class="form-label-help-icon" />
                        </a-tooltip>
                      </span>
                    </template>
                    <a-select
                      v-model="cdpConfig.sessionMode"
                      :disabled="running"
                      :options="cdpSessionModeOptions"
                    />
                  </a-form-item>
                </a-form>
                <!-- <a-alert v-if="cdpConfig.sessionMode === 'legacy-profile'" type="warning" show-icon class="cdp-capability-alert">
                  默认新建并复用一个普通 Chrome 回放窗口；共享登录态和站点存储，不提供无痕隔离。
                </a-alert> -->
                <a-alert v-if="!cdpManagedContextAvailable || !cdpGrayEnabled" type="warning" show-icon class="cdp-capability-alert">
                  当前只能使用浏览器兼容模式。
                  <span v-if="!cdpManagedContextAvailable && cdpCapabilitiesReason">{{ cdpCapabilitiesReason }}</span>
                  <span v-else-if="cdpGrayReason">{{ cdpGrayReason }}</span>
                </a-alert>
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
                  <!-- <div class="option-tip">当前窗口尺寸由扩展读取本页所在 Chrome 窗口。</div> -->
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
                  <a-col :span="12">
                    <a-form-item label="浏览器">
                      <a-select v-model="runnerConfig.browser" :disabled="running">
                        <a-option value="chromium">Chromium 浏览器（推荐）</a-option>
                        <a-option value="firefox">Firefox 浏览器</a-option>
                        <a-option value="webkit">WebKit 浏览器</a-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="实时画面质量">
                      <a-select
                        v-model="runnerConfig.liveFrameQuality"
                        :disabled="running"
                        :options="liveFrameQualityOptions"
                      />
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
                    <a-form-item>
                      <template #label>
                        <span class="form-label-with-help">
                          <span>用例会话</span>
                          <a-tooltip position="top">
                            <template #content>
                              <div class="page-error-policy-help">
                                <div><strong>同一浏览器窗口：</strong>串行复用同一个浏览器、标签页和页面内存。</div>
                                <div><strong>复用登录态：</strong>串行复用上一条成功用例的 Cookie、localStorage、IndexedDB 和同源 sessionStorage。</div>
                                <div><strong>独立登录：</strong>保持原有隔离行为，每条用例使用全新浏览器上下文。</div>
                                <div class="page-error-policy-help__note">
                                  复用登录态不复用标签页、页面内存和 WebSocket；成功注销也会传递给下一条用例。
                                </div>
                              </div>
                            </template>
                            <icon-question-circle class="form-label-help-icon" />
                          </a-tooltip>
                        </span>
                      </template>
                      <a-select
                        v-model="runnerConfig.sessionMode"
                        :disabled="running"
                        :options="runnerSessionModeOptions"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item>
                      <template #label>
                        <span class="form-label-with-help">
                          <span>页面错误检测</span>
                          <a-tooltip position="top">
                            <template #content>
                              <div class="page-error-policy-help">
                                <div><strong>跟随录制用例：</strong>每个用例使用录制时保存的检测开关。</div>
                                <div><strong>本次任务开启：</strong>覆盖本批次所有用例；发现页面错误提示后立即终止用例。</div>
                                <div><strong>本次任务关闭：</strong>覆盖本批次所有用例；不扫描页面错误提示。</div>
                                <div class="page-error-policy-help__note">
                                  此设置不影响元素定位、操作和断言本身的失败判定。
                                </div>
                              </div>
                            </template>
                            <icon-question-circle class="form-label-help-icon" />
                          </a-tooltip>
                        </span>
                      </template>
                      <a-select
                        v-model="runnerPageErrorPolicy"
                        :disabled="running"
                        :options="runnerPageErrorPolicyOptions"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="录屏保留策略">
                      <a-select
                        v-model="runnerConfig.video"
                        :disabled="running"
                        :options="artifactPolicyOptions"
                      />
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
        <a-button @click="visible = false">取消</a-button>
        <a-button @click="backToCaseSelection">上一步</a-button>
        <a-button type="primary" :disabled="!canStartSelected" @click="startSelectedCases">
          开始执行
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import {
  type ExecutionCaseOpenOptions,
  type ExecutionContext,
  type ExecutionType,
  type LiveExecutionCase,
  type LiveExecutionLog,
  executableStepCount,
  executionTypeLabel,
  isExecutableCase,
} from '../execution'
import {
  abortExtensionCdpBatch,
  beginExtensionCdpBatch,
  endExtensionCdpBatch,
  getExtensionCdpCapabilities,
  startExtensionCdpPlayback,
  stopExtensionCdpPlayback,
} from '../extensionPlayback'
import {
  type AutomationCdpPlaybackOptions,
  type AutomationPlaywrightRunnerJobResp,
  type AutomationPlaywrightRunnerLog,
  type AutomationPlaywrightRunnerOptions,
  cancelAutomationPlaywrightBatch,
  cancelAutomationPlaywrightBatchCase,
  cancelAutomationPlaywrightRunnerJob,
  createAutomationPlaywrightBatch,
  createAutomationPlaywrightRunnerJob,
  getAutomationCdpPlaybackAvailability,
  getAutomationPlaywrightBatchCaseCancellation,
  getAutomationPlaywrightCase,
  getAutomationPlaywrightRunnerJob,
  updateAutomationPlaywrightBatchCase,
} from '@/apis/automation/automationPlaywrightRunner'
import { loadAutomationUiExecutionSelectionScene } from '../queryCache'
import { getProjectConfig } from '@/apis/project/projectConfig'
import { getProjectEnvironmentConfigList, getProjectEnvironmentRuntimeStatus } from '@/apis/project/projectEnvironmentConfig'
import { getProjectVersionConfig } from '@/apis/project/projectVersionConfig'
import { useDict } from '@/hooks/app'
import { useUserStore } from '@/stores'
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
type CasePlaybackStatus = 'idle' | 'waiting' | 'starting' | 'queued' | 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled'
type BatchState = 'idle' | 'running' | 'cancelling' | 'completed' | 'cancelled'

interface PlaybackCaseRow {
  caseId: string
  executionId: string
  jobId: string
  name: string
  stepTotal: number
  stepCompleted: number
  stepPass: number
  stepFail: number
  stepSkip: number
  status: CasePlaybackStatus
  error: string
  durationMs?: number
  startedAt?: number
  finishedAt?: number
  liveLogs: LiveExecutionLog[]
  lastEventSequence: number
  effectiveExecutionConfig?: Record<string, unknown>
}

interface ExtensionCompletion {
  ok: boolean
  error?: string
}

interface PlanExecutionStartPayload {
  scene: any
  executionType: Exclude<ExecutionType, 'jenkins'>
  caseIds: string[]
  projectEnvironmentId: string
  runnerOptions?: AutomationPlaywrightRunnerOptions
  cdpOptions?: AutomationCdpPlaybackOptions
}

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'started'): void
  (e: 'finished', payload?: { cancelled?: boolean }): void
  (e: 'startup-failed', error: string): void
  (e: 'plan-start', payload: PlanExecutionStartPayload): void
  (e: 'back', payload: {
    scene: any
    executionType: Exclude<ExecutionType, 'jenkins'>
    caseIds: string[]
  } & ExecutionContext): void
  (e: 'batch-update', rows: LiveExecutionCase[]): void
}>()
const { server_type, status_type } = useDict('server_type', 'status_type')
const router = useRouter()

const visible = ref(false)
const userStore = useUserStore()
const loading = ref(false)
const previewLoading = ref(false)
const scene = ref<any>()
const executionContext = ref<ExecutionContext>({})
const planExecutionMode = ref(false)
const executionType = ref<Exclude<ExecutionType, 'jenkins'>>('extension-cdp')
const selectedCaseKeys = ref<Array<string | number>>([])
const selectAllCases = ref(false)
const expectedDefinitionVersion = ref<number>()
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
const batchExecutionCapability = ref('')
const batchExecuteName = ref('')
const cancelRequested = ref(false)
const cancelledCaseIds = ref(new Set<string>())
const cdpConfiguredCaseId = ref('')
let batchTimer: number | undefined
let runnerPollTimer: number | undefined
let cdpCancellationPollTimer: number | undefined
let previewSequence = 0
let extensionCompletionResolver: ((result: ExtensionCompletion) => void) | undefined

const form = reactive({ projectEnvironmentId: '' })
const cdpConfig = reactive<AutomationCdpPlaybackOptions>({
  browserSessionSource: 'current-profile',
  sessionMode: 'legacy-profile',
  ignoreHttpsErrors: false,
  windowSizeMode: 'maximized' as 'maximized' | 'current' | 'custom',
  viewportWidth: 1920,
  viewportHeight: 1080,
  pageErrorCheckEnabled: true,
})
const cdpManagedContextAvailable = ref(false)
const cdpCapabilitiesReason = ref('')
const cdpGrayEnabled = ref(false)
const cdpGrayReason = ref('')
const runnerConfig = reactive<AutomationPlaywrightRunnerOptions>({
  browser: 'chromium',
  liveFrameQuality: 'high',
  sessionMode: 'reuse-browser',
  headed: false,
  ignoreHttpsErrors: true,
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
  stepTimeoutMs: 6000,
  caseTimeoutMs: 600000,
  slowMoMs: 0,
  finishDelayMs: 0,
})
const runnerPageErrorPolicy = ref<'inherit' | 'enabled' | 'disabled'>('inherit')
const runnerPageErrorPolicyOptions = [
  { label: '跟随录制用例（推荐）', value: 'inherit' },
  { label: '本次任务开启', value: 'enabled' },
  { label: '本次任务关闭', value: 'disabled' },
]
const artifactPolicyOptions = [
  { label: '仅失败保留（推荐）', value: 'retain-on-failure' },
  { label: '始终保留', value: 'on' },
  { label: '关闭', value: 'off' },
]
const liveFrameQualityOptions = [
  { label: '流畅（1080P，低带宽）', value: 'smooth' },
  { label: '高清（推荐）', value: 'high' },
  { label: '超清（4K，高带宽）', value: 'ultra' },
  { label: '原画（8K，极高资源占用）', value: '8k' },
]
const runnerSessionModeOptions = [
  { label: '同一浏览器窗口（默认）', value: 'reuse-browser' },
  { label: '复用登录态', value: 'reuse-auth' },
  { label: '独立登录', value: 'isolated' },
]
const cdpSessionModeOptions = computed(() => [
  // ...(cdpManagedContextAvailable.value && cdpGrayEnabled.value ? runnerSessionModeOptions : []),
  { label: '默认使用当前浏览器（兼容模式）', value: 'legacy-profile' },
  { label: '同一浏览器窗口（无痕模式）', value: 'reuse-browser' },
  { label: '复用登录态（无痕模式）', value: 'reuse-auth' },
  { label: '独立登录（无痕模式）', value: 'isolated' },
])

// 计划正式报告绑定按场景数据库 ID 校验；优先使用 id，避免把业务场景编号
// （例如 AAS_P_SMOKE_007）当成 report progress 的数值 ID。
const playbackSceneKey = computed(() => String(scene.value?.id || scene.value?.sceneId || ''))
const selectedProjectEnvironment = computed(() => projectEnvironmentOptions.value
  .find((item) => item.value === form.projectEnvironmentId))
const effectiveStartUrl = computed(() => previewCase.value?.start_url || previewCase.value?.startUrl || '')
const running = computed(() => ['running', 'cancelling'].includes(batchState.value))
const activeCaseRow = computed(() => caseRows.value.find((item) => item.caseId === activeCaseId.value))
const terminalStatuses: CasePlaybackStatus[] = ['passed', 'failed', 'skipped', 'cancelled']
const batchRows = computed(() => {
  const ids = new Set(batchCaseIds.value)
  return caseRows.value.filter((item) => ids.has(item.caseId))
})
const passedCount = computed(() => batchRows.value.filter((item) => item.status === 'passed').length)
const failedCount = computed(() => batchRows.value.filter((item) => item.status === 'failed').length)
const skippedCount = computed(() => batchRows.value.filter((item) => item.status === 'skipped').length)
const selectedCaseRows = computed(() => {
  const selectedIds = new Set(selectedCaseKeys.value.map(String))
  return caseRows.value.filter((item) => selectedIds.has(item.caseId))
})
const executionCaseCount = computed(() => selectAllCases.value
  ? Number(scene.value?.__caseTotal || caseRows.value.length)
  : selectedCaseKeys.value.length)
const cdpConfigValid = computed(() => (
  cdpConfig.windowSizeMode !== 'custom' || (
    cdpConfig.viewportWidth >= 320 && cdpConfig.viewportWidth <= 10000
    && cdpConfig.viewportHeight >= 320 && cdpConfig.viewportHeight <= 10000
  )
) && (
  (cdpConfig.browserSessionSource === 'current-profile' && cdpConfig.sessionMode === 'legacy-profile')
  || (cdpConfig.browserSessionSource === 'managed-context'
    && cdpConfig.sessionMode !== 'legacy-profile'
    && ((cdpManagedContextAvailable.value && cdpGrayEnabled.value) || running.value))
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
const canStartSelected = computed(() => baseConfigValid.value && executionCaseCount.value > 0)

const resetRunnerConfig = () => {
  Object.assign(runnerConfig, {
    browser: 'chromium',
    liveFrameQuality: 'high',
    sessionMode: 'reuse-browser',
    headed: false,
    ignoreHttpsErrors: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    stepTimeoutMs: 6000,
    caseTimeoutMs: 600000,
    slowMoMs: 0,
    finishDelayMs: 0,
  })
  runnerPageErrorPolicy.value = 'inherit'
}

const resetCdpConfig = () => {
  Object.assign(cdpConfig, {
    browserSessionSource: 'current-profile',
    sessionMode: 'legacy-profile',
    ignoreHttpsErrors: false,
    windowSizeMode: 'maximized',
    viewportWidth: 1920,
    viewportHeight: 1080,
    pageErrorCheckEnabled: true,
  })
}

watch(() => cdpConfig.sessionMode, (sessionMode) => {
  cdpConfig.browserSessionSource = sessionMode === 'legacy-profile'
    ? 'current-profile'
    : 'managed-context'
})

const buildRunnerOptions = (): AutomationPlaywrightRunnerOptions => ({
  ...runnerConfig,
  ...(runnerPageErrorPolicy.value === 'inherit'
    ? {}
    : { pageErrorCheckEnabled: runnerPageErrorPolicy.value === 'enabled' }),
})

const resetBatchState = () => {
  clearTimers()
  batchState.value = 'idle'
  batchCaseIds.value = []
  batchId.value = ''
  batchExecutionCapability.value = ''
  batchExecuteName.value = ''
  activeCaseId.value = ''
  activeCaseKey.value = ''
  runnerJob.value = undefined
  cancelRequested.value = false
  cancelledCaseIds.value = new Set()
  extensionCompletionResolver = undefined
  caseRows.value.forEach((item) => {
    item.status = 'idle'
    item.jobId = ''
    item.stepCompleted = 0
    item.stepPass = 0
    item.stepFail = 0
    item.stepSkip = 0
    item.error = ''
    item.durationMs = undefined
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

const fetchPlaybackCase = async (caseId: string, frozenBatchId?: string) => {
  const caseKey = `${playbackSceneKey.value}:${caseId}`
  const { data } = await getAutomationPlaywrightCase(caseKey, form.projectEnvironmentId, frozenBatchId)
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
  options: ExecutionCaseOpenOptions = {},
) => {
  if (running.value) {
    Message.warning('当前已有批次正在执行，请在执行历史中查看进度')
    return
  }
  executionType.value = type
  executionContext.value = {
    recordSource: options.recordSource || 'debug',
    testPlanId: options.testPlanId,
    testReportId: options.testReportId,
  }
  planExecutionMode.value = Boolean(options.planExecution)
  selectedCaseKeys.value = []
  selectAllCases.value = Boolean(options.selectAllCases)
  expectedDefinitionVersion.value = options.expectedDefinitionVersion
  caseRows.value = []
  form.projectEnvironmentId = ''
  projectEnvironmentOptions.value = []
  previewCase.value = undefined
  previewError.value = ''
  previewCaseId.value = ''
  cdpConfiguredCaseId.value = ''
  resetRunnerConfig()
  resetCdpConfig()
  resetBatchState()
  visible.value = true
  loading.value = true
  try {
    if (type === 'extension-cdp') {
      const [capabilityResult, availabilityResult] = await Promise.allSettled([
        getExtensionCdpCapabilities(),
        getAutomationCdpPlaybackAvailability().then((response) => response.data),
      ])
      if (capabilityResult.status === 'fulfilled') {
        cdpManagedContextAvailable.value = capabilityResult.value.managedBrowserContext
        cdpCapabilitiesReason.value = capabilityResult.value.reason || ''
      } else {
        cdpManagedContextAvailable.value = false
        cdpCapabilitiesReason.value = capabilityResult.reason?.message || '未检测到扩展受控浏览器能力'
      }
      if (availabilityResult.status === 'fulfilled') {
        cdpGrayEnabled.value = availabilityResult.value.managedContextEnabled
        cdpGrayReason.value = availabilityResult.value.reason || ''
      } else {
        cdpGrayEnabled.value = false
        cdpGrayReason.value = availabilityResult.reason?.message || '无法确认 Admin 灰度资格'
      }
      resetCdpConfig()
    }
    const loadedCaseIds = new Set((Array.isArray(record?.caseList) ? record.caseList : [])
      .map((item: any) => String(item?.id || '')))
    const needsProjectedSelection = Boolean(
      record?.__projectedDefinition
      && !selectAllCases.value
      && options.caseIds?.some(caseId => !loadedCaseIds.has(String(caseId))),
    )
    const data = options.planExecution && record?.__planAggregate
      ? record
      : record?.__definitionLoaded && !needsProjectedSelection
        ? record
        : await loadAutomationUiExecutionSelectionScene(String(record.id), record, undefined, {
            projectedCaseIds: options.caseIds,
          })
    scene.value = data
    if (expectedDefinitionVersion.value == null) {
      expectedDefinitionVersion.value = Number(data.definitionVersion || 0) || undefined
    }
    const selectedIds = new Set((options.caseIds || []).map(String))
    const cases = (Array.isArray(data.caseList) ? data.caseList : []).filter(isExecutableCase)
    caseRows.value = cases
      .filter((item: any) => selectAllCases.value || selectedIds.has(String(item.id)))
      .map((item: any) => ({
        caseId: String(item.id),
        executionId: '',
        jobId: '',
        name: item.name || String(item.id),
        stepTotal: executableStepCount(item),
        stepCompleted: 0,
        stepPass: 0,
        stepFail: 0,
        stepSkip: 0,
        status: 'idle',
        error: '',
        liveLogs: [],
        lastEventSequence: 0,
      }))
    selectedCaseKeys.value = caseRows.value.map((item) => item.caseId)
    await Promise.all([loadSceneMeta(), loadProjectEnvironments()])
    if (options.projectEnvironmentId) {
      if (!projectEnvironmentOptions.value.some((item) => item.value === options.projectEnvironmentId)) {
        throw new Error(`测试计划指定的产品环境不存在：${options.projectEnvironmentId}`)
      }
      form.projectEnvironmentId = options.projectEnvironmentId
      await refreshSelectedEnvironmentStatus()
    }
    await loadPlaybackPreview()
    if (options.cdpOptions) {
      if (options.cdpOptions.browserSessionSource === 'managed-context' && !cdpManagedContextAvailable.value) {
        throw new Error(`当前 CueCast 不支持受控用例会话：${cdpCapabilitiesReason.value || '能力探测未通过'}`)
      }
      Object.assign(cdpConfig, options.cdpOptions)
    }
    if (options.autoStart && selectedCaseKeys.value.length) {
      await startBatch(selectedCaseKeys.value.map(String))
    }
  } catch (error: any) {
    const message = error?.message || '读取场景回放配置失败'
    Message.error(message)
    if (options.autoStart) emit('startup-failed', message)
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
  if (planExecutionMode.value) {
    emit('plan-start', {
      scene: scene.value,
      executionType: executionType.value,
      caseIds: selectedCaseKeys.value.map(String),
      projectEnvironmentId: form.projectEnvironmentId,
      runnerOptions: executionType.value === 'playwright-runner' ? buildRunnerOptions() : undefined,
      cdpOptions: executionType.value === 'extension-cdp' ? { ...cdpConfig } : undefined,
    })
    visible.value = false
    return
  }
  try {
    await startBatch(selectAllCases.value ? [] : selectedCaseKeys.value.map(String))
  } catch (error: any) {
    Message.error(error?.message || '创建执行批次失败，请稍后重试')
  }
}

function backToCaseSelection() {
  emit('back', {
    scene: scene.value,
    executionType: executionType.value,
    caseIds: selectedCaseKeys.value.map(String),
    ...executionContext.value,
  })
  visible.value = false
}

async function startBatch(caseIds: string[]) {
  if (!selectAllCases.value && !caseIds.length) throw new Error('当前场景没有可执行用例')
  if (running.value) throw new Error('当前已有批次正在执行')
  try {
    await refreshSelectedEnvironmentStatus()
  } catch {
    throw new Error('产品环境在线状态检测失败，请稍后重试')
  }
  if (selectedProjectEnvironment.value?.statusLabel !== '在线') {
    throw new Error('当前产品环境服务器不在线，请切换为在线环境后再执行')
  }
  if (executionType.value === 'playwright-runner' && runnerConfig.caseTimeoutMs < runnerConfig.stepTimeoutMs) {
    throw new Error('用例总超时不能小于单步骤超时')
  }

  const { data: createdBatch } = await createAutomationPlaywrightBatch({
    sceneKey: playbackSceneKey.value,
    executionType: executionType.value,
    caseIds,
    selectAllCases: selectAllCases.value || undefined,
    expectedDefinitionVersion: expectedDefinitionVersion.value,
    projectEnvironmentId: form.projectEnvironmentId,
    executeName: userStore.userInfo.nickname || userStore.userInfo.username || undefined,
    executeEmail: userStore.userInfo.email || undefined,
    testPlanId: executionContext.value.testPlanId,
    testReportId: executionContext.value.testReportId,
    executionConfig: executionType.value === 'extension-cdp'
      ? { ...cdpConfig }
      : buildRunnerOptions(),
    cdpOptions: executionType.value === 'extension-cdp' ? { ...cdpConfig } : undefined,
  })
  const batchCases = new Map(createdBatch.cases.map((item) => [String(item.caseId), item]))
  const createdCaseIds = createdBatch.cases.map((item) => String(item.caseId))
  createdBatch.cases.forEach((item) => {
    if (caseRows.value.some(row => row.caseId === String(item.caseId))) return
    caseRows.value.push({
      caseId: String(item.caseId),
      executionId: item.executionId || '',
      jobId: '',
      name: item.caseName || String(item.caseId),
      stepTotal: item.stepTotal || 0,
      stepCompleted: 0,
      stepPass: 0,
      stepFail: 0,
      stepSkip: 0,
      status: 'idle',
      error: '',
      liveLogs: [],
      lastEventSequence: 0,
      effectiveExecutionConfig: item.effectiveExecutionConfig,
    })
  })
  const requestedCdpBatch = executionType.value === 'extension-cdp'
  const appliedSessionConfig = createdBatch.sessionConfig
  if (requestedCdpBatch && appliedSessionConfig?.browserSessionSource !== cdpConfig.browserSessionSource) {
    await cancelAutomationPlaywrightBatch(playbackSceneKey.value, createdBatch.batchId).catch(() => {})
    throw new Error(`Admin 返回的 CDP 会话来源与请求不一致：${cdpConfig.browserSessionSource}/${appliedSessionConfig?.browserSessionSource || '-'}`)
  }
  if (requestedCdpBatch && appliedSessionConfig?.sessionMode !== cdpConfig.sessionMode) {
    await cancelAutomationPlaywrightBatch(playbackSceneKey.value, createdBatch.batchId).catch(() => {})
    throw new Error(`Admin 返回的 CDP 会话模式与请求不一致：${cdpConfig.sessionMode}/${appliedSessionConfig?.sessionMode || '-'}`)
  }
  const extensionCdpBatch = executionType.value === 'extension-cdp'
  batchCaseIds.value = createdCaseIds
  batchState.value = 'running'
  batchId.value = createdBatch.batchId
  batchExecutionCapability.value = createdBatch.executionCapability || ''
  batchExecuteName.value = createdBatch.executeName || '-'
  cancelRequested.value = false
  cancelledCaseIds.value = new Set()
  runnerJob.value = undefined
  caseRows.value.forEach((item) => {
    const batchCase = batchCases.get(item.caseId)
    item.executionId = batchCase?.executionId || ''
    item.effectiveExecutionConfig = batchCase?.effectiveExecutionConfig
    item.jobId = ''
    item.stepCompleted = 0
    item.stepPass = 0
    item.stepFail = 0
    item.stepSkip = 0
    item.status = createdCaseIds.includes(item.caseId) ? 'waiting' : 'idle'
    item.error = ''
    item.durationMs = undefined
    item.startedAt = undefined
    item.finishedAt = undefined
    item.liveLogs = []
    item.lastEventSequence = 0
  })
  if (extensionCdpBatch) {
    try {
      await beginExtensionCdpBatch({
        batchId: batchId.value,
        sessionMode: cdpConfig.sessionMode,
        browserSessionSource: cdpConfig.browserSessionSource,
        executionCapability: batchExecutionCapability.value,
      })
    } catch (error) {
      await cancelAutomationPlaywrightBatch(playbackSceneKey.value, batchId.value).catch(() => {})
      markWaitingCasesCancelled()
      batchState.value = 'cancelled'
      publishBatchState()
      throw error
    }
  }
  startBatchTimer()
  publishBatchState()
  visible.value = false
  emit('started')

  let cdpSessionCleanupError: Error | undefined
  try {
    for (const caseId of createdCaseIds) {
      if (cancelRequested.value) break
      const row = caseRows.value.find((item) => item.caseId === caseId)
      if (!row) continue
      if (batchCases.get(caseId)?.status !== 'queued') continue
      await syncRemoteCancellation(row)
      if (cancelRequested.value) break
      if (cancelledCaseIds.value.has(caseId)) {
        row.status = 'cancelled'
        row.error = row.error || '用例已取消，未开始执行'
        row.finishedAt = Date.now()
        await updateBatchCaseStatus(row, 'cancelled', { error: row.error })
        continue
      }
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
        if (cancelRequested.value || cancelledCaseIds.value.has(row.caseId)) {
          row.status = 'cancelled'
          row.error = row.error || (cancelRequested.value ? '批次已取消' : '用例已取消')
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
  } finally {
    if (extensionCdpBatch) {
      try {
        if (cancelRequested.value) {
          await abortExtensionCdpBatch(batchId.value, cdpConfig.browserSessionSource, batchExecutionCapability.value)
        } else {
          await endExtensionCdpBatch(batchId.value, cdpConfig.browserSessionSource, batchExecutionCapability.value)
        }
      } catch (error) {
        const cleanedByAbort = await abortExtensionCdpBatch(
          batchId.value,
          cdpConfig.browserSessionSource,
          batchExecutionCapability.value,
        )
          .then(() => true)
          .catch(() => false)
        if (!cleanedByAbort) {
          cdpSessionCleanupError = new Error(`CDP 批次会话清理失败：${(error as Error)?.message || String(error)}`)
        } else if (!cancelRequested.value) {
          Message.warning('CDP 批次正常结束失败，已通过 ABORT 完成清理')
        }
      }
    }
  }

  if (cdpSessionCleanupError) {
    markWaitingCasesCancelled()
    batchState.value = 'cancelled'
    publishBatchState()
    clearBatchTimer()
    emit('finished', { cancelled: true })
    throw cdpSessionCleanupError
  }

  if (cancelRequested.value) {
    markWaitingCasesCancelled()
    batchState.value = 'cancelled'
    Message.warning('批量执行已取消')
  } else {
    batchState.value = 'completed'
    Message.success(`批量执行完成：通过 ${passedCount.value}，失败 ${failedCount.value}，跳过 ${skippedCount.value}`)
  }
  publishBatchState()
  clearBatchTimer()
  emit('success')
  emit('finished', { cancelled: cancelRequested.value })
}

async function executeOneCase(row: PlaybackCaseRow) {
  if (executionType.value === 'extension-cdp' && !row.effectiveExecutionConfig) {
    throw new Error('Admin 未返回批次冻结的 EffectiveExecutionConfig，已拒绝客户端自行合并配置')
  }
  // 批次执行必须读取绑定 revision；不带 batchId 的接口只用于执行前预览。
  const data = await fetchPlaybackCase(row.caseId, batchId.value)
  if (executionType.value === 'extension-cdp'
    && (!data?.definitionRevisionId || !data?.effectiveExecutionConfig)) {
    throw new Error('Admin 未返回批次绑定的 definition revision 与冻结配置')
  }
  previewCaseId.value = row.caseId
  previewCase.value = data
  previewError.value = ''
  if (!Array.isArray(data?.steps) || data.steps.length === 0) {
    throw new Error('当前用例没有可执行步骤')
  }
  if (cancelRequested.value || cancelledCaseIds.value.has(row.caseId)) throw new Error('用例已取消')

  if (executionType.value === 'extension-cdp') {
    await executeExtensionCase(row)
  } else {
    await executeRunnerCase(row)
  }
}

async function executeExtensionCase(row: PlaybackCaseRow) {
  const completionPromise = new Promise<ExtensionCompletion>((resolve) => {
    extensionCompletionResolver = resolve
  })
  try {
    await startExtensionCdpPlayback({
      caseKey: activeCaseKey.value,
      caseId: row.caseId,
      batchId: batchId.value,
      executionCapability: batchExecutionCapability.value,
      executionId: row.executionId,
      projectEnvironmentId: form.projectEnvironmentId,
      sessionMode: cdpConfig.sessionMode,
      browserSessionSource: cdpConfig.browserSessionSource,
    })
  } catch (error) {
    extensionCompletionResolver = undefined
    throw error
  }
  row.status = 'running'
  await updateBatchCaseStatus(row, 'running')
  publishBatchState()
  startCdpCancellationPolling(row)
  const result = await completionPromise
  stopCdpCancellationPolling()
  extensionCompletionResolver = undefined
  if (cancelRequested.value || cancelledCaseIds.value.has(row.caseId)) {
    row.status = 'cancelled'
    row.error = cancelRequested.value ? '批次已取消' : '用例已取消'
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
    executionCapability: batchExecutionCapability.value,
    projectEnvironmentId: form.projectEnvironmentId,
    options: buildRunnerOptions(),
  })
  runnerJob.value = data
  row.jobId = data.jobId
  updateRunnerStepProgress(row, data)
  if (cancelRequested.value) {
    runnerJob.value = (await cancelAutomationPlaywrightRunnerJob(data.jobId)).data
    updateRunnerStepProgress(row, runnerJob.value)
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
    row.error = cancelRequested.value ? '批次已取消' : '用例已取消'
  }
}

async function pollRunnerJob(jobId: string, row: PlaybackCaseRow) {
  let previousStatus = row.status
  while (true) {
    const remoteCancelled = await syncRemoteCancellation(row)
    if (remoteCancelled && row.jobId) {
      // 历史页/计划页取消不会经过当前弹窗，补发 Job 取消确保当前 Runner 进程立即退出。
      try {
        await cancelAutomationPlaywrightRunnerJob(row.jobId)
      } catch (error) {
        console.warn('[automation] 远程取消 Runner 任务失败', error)
      }
    }
    const lastSequence = row.liveLogs.at(-1)?.sequence
    const { data } = await getAutomationPlaywrightRunnerJob(jobId, undefined, lastSequence)
    runnerJob.value = data
    row.status = normalizeRunnerStatus(data.status)
    updateRunnerStepProgress(row, data)
    if (row.status !== previousStatus && ['queued', 'running'].includes(row.status)) {
      await updateBatchCaseStatus(row, row.status as 'queued' | 'running', { jobId })
      previousStatus = row.status
    }
    publishBatchState()
    if (['passed', 'failed', 'cancelled'].includes(data.status)) return data
    await waitForRunnerPoll()
  }
}

function updateRunnerStepProgress(row: PlaybackCaseRow, job: AutomationPlaywrightRunnerJobResp) {
  const outcomes = new Map<number | string, 'success' | 'error' | 'skip'>()
  const incrementalLogs = (job.logs || []).map((item: AutomationPlaywrightRunnerLog) => ({
    sequence: item.sequence,
    timestamp: item.timestamp,
    level: item.level,
    phase: item.phase,
    message: item.message,
    detail: item.detail,
  }))
  const mergedLogs = new Map(row.liveLogs.map((item) => [item.sequence, item]))
  incrementalLogs.forEach((item) => mergedLogs.set(item.sequence, item))
  // 浏览器只保留最近日志，避免长任务让页面内存持续增长。
  row.liveLogs = [...mergedLogs.values()].sort((a, b) => a.sequence - b.sequence).slice(-500)
  const logs = row.liveLogs
  if (['passed', 'failed', 'cancelled'].includes(job.status)) {
    const durationLog = [...logs].reverse().find((item) => item.phase === 'runner' && /(?:duration=|耗时\s*)(\d+)ms/.test(item.message))
    const durationMatch = durationLog && /(?:duration=|耗时\s*)(\d+)ms/.exec(durationLog.message)
    if (durationMatch) row.durationMs = Number(durationMatch[1])
  }
  logs.forEach((item) => {
    if (item.detail || item.phase !== 'step' || !['success', 'warning', 'error'].includes(item.level)) return
    const stepNumber = /步骤\s+(\d+)/.exec(item.message)?.[1]
    outcomes.set(
      stepNumber ? Number(stepNumber) : `log-${item.sequence}`,
      item.level === 'success' ? 'success' : item.level === 'warning' ? 'skip' : 'error',
    )
  })
  const numericSteps = [...outcomes.keys()].filter((value): value is number => typeof value === 'number')
  const inferredCompleted = numericSteps.length || outcomes.size
  const outcomeValues = [...outcomes.values()]
  row.stepCompleted = Math.min(row.stepTotal, Math.max(row.stepCompleted, inferredCompleted))
  row.stepPass = Math.max(row.stepPass, outcomeValues.filter((value) => value === 'success').length)
  row.stepFail = Math.max(row.stepFail, outcomeValues.filter((value) => value === 'error').length)
  row.stepSkip = Math.max(row.stepSkip, outcomeValues.filter((value) => value === 'skip').length)
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

const cancelActiveCase = async () => {
  const row = activeCaseRow.value
  if (!row || terminalStatuses.includes(row.status) || !batchId.value) return
  cancelledCaseIds.value.add(row.caseId)
  row.error = '用例取消中'
  publishBatchState()
  try {
    await cancelAutomationPlaywrightBatchCase(playbackSceneKey.value, batchId.value, row.caseId)
    if (executionType.value === 'playwright-runner' && runnerJob.value?.jobId) {
      runnerJob.value = (await cancelAutomationPlaywrightRunnerJob(runnerJob.value.jobId)).data
    } else if (executionType.value === 'extension-cdp') {
      await stopExtensionCdpPlayback()
      settleExtensionCompletion({ ok: false, error: '用例已取消' })
    }
  } catch (error: any) {
    cancelledCaseIds.value.delete(row.caseId)
    row.error = error?.message || '取消当前用例失败'
    Message.error(row.error)
  }
  publishBatchState()
}

async function refreshSceneAfterCase() {
  if (!scene.value?.id) return
  // 执行结果只影响 execution revision，不应重新下载 Definition。
  emit('success')
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
        durationMs: terminal && row.startedAt
          ? row.durationMs ?? Math.max(0, (row.finishedAt || Date.now()) - row.startedAt)
          : undefined,
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
  stopCdpCancellationPolling()
}

function startCdpCancellationPolling(row: PlaybackCaseRow) {
  stopCdpCancellationPolling()
  const poll = async () => {
    if (!batchId.value || !playbackSceneKey.value || terminalStatuses.includes(row.status)) return
    try {
      if (await syncRemoteCancellation(row)) {
        await stopExtensionCdpPlayback()
        settleExtensionCompletion({ ok: false, error: row.error })
      }
    } catch (error) {
      // 轮询失败不能中断正在运行的浏览器回放，下一次轮询会继续尝试。
      console.warn('[automation] 查询 CDP 取消状态失败', error)
    }
  }
  void poll()
  cdpCancellationPollTimer = window.setInterval(() => void poll(), 1000)
}

/** 同步其他视图发起的取消，避免当前弹窗继续启动后续 Runner/CDP 用例。 */
async function syncRemoteCancellation(row: PlaybackCaseRow) {
  if (!batchId.value || !playbackSceneKey.value) return false
  try {
    const { data } = await getAutomationPlaywrightBatchCaseCancellation(
      playbackSceneKey.value,
      batchId.value,
      row.caseId,
    )
    if (!data.batchCancelRequested && !data.caseCancelRequested) return false
    if (data.batchCancelRequested) {
      cancelRequested.value = true
      batchState.value = 'cancelling'
      markWaitingCasesCancelled()
    }
    cancelledCaseIds.value.add(row.caseId)
    row.error = data.batchCancelRequested ? '批次已取消' : '用例已取消'
    row.status = 'cancelled'
    publishBatchState()
    return true
  } catch (error) {
    console.warn('[automation] 查询远程取消状态失败', error)
    return false
  }
}

function stopCdpCancellationPolling() {
  if (cdpCancellationPollTimer) window.clearInterval(cdpCancellationPollTimer)
  cdpCancellationPollTimer = undefined
}

function settleExtensionCompletion(result: ExtensionCompletion) {
  const resolver = extensionCompletionResolver
  extensionCompletionResolver = undefined
  resolver?.(result)
}

function publishBatchState() {
  if (!batchId.value) return
  const sceneKey = String(scene.value?.id || '')
  emit('batch-update', batchRows.value.map((item) => ({
    batchId: batchId.value,
    executionId: item.executionId,
    jobId: item.jobId || undefined,
    liveFrameQuality: executionType.value === 'playwright-runner' ? runnerConfig.liveFrameQuality : undefined,
    executeName: batchExecuteName.value,
    executionType: executionType.value,
    caseId: item.caseId,
    caseName: item.name,
    stepTotal: item.stepTotal,
    stepCompleted: item.stepCompleted,
    stepPass: item.stepPass,
    stepFail: item.stepFail,
    stepSkip: item.stepSkip,
    status: item.status === 'idle' ? 'waiting' : item.status,
    error: item.error,
    startedAt: item.startedAt,
    finishedAt: item.finishedAt,
    durationMs: item.durationMs,
    sceneKey,
    sceneId: String(scene.value?.sceneId || sceneKey),
    sceneName: String(scene.value?.name || scene.value?.sceneId || sceneKey),
    recordSource: executionContext.value.recordSource || 'debug',
    testPlanId: executionContext.value.testPlanId,
    testReportId: executionContext.value.testReportId,
    liveLogs: item.liveLogs ? [...item.liveLogs] : [],
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

const handleExtensionPlaybackProgress = (event: MessageEvent) => {
  if (event.source !== window) return
  const data = event.data || {}
  if (data.type !== 'AT_PLAYBACK_PROGRESS' || data.adminCaseKey !== activeCaseKey.value) return
  const row = caseRows.value.find((item) => item.caseId === activeCaseId.value)
  if (!row) return
  const sequence = Number(data.sequence)
  if (!Number.isFinite(sequence) || sequence <= row.lastEventSequence) return
  row.lastEventSequence = sequence
  const stepIndex = Number(data.stepIndex)
  const stepNumber = Number.isFinite(stepIndex) ? stepIndex + 1 : 0
  const description = String(data.description || data.actionType || `步骤 ${stepNumber || ''}`).trim()
  const status = String(data.status || '').toLowerCase()
  const eventLog = data.log && typeof data.log === 'object' ? data.log : undefined
  let message = String(eventLog?.message || '')
  let level: LiveExecutionLog['level'] = ['info', 'success', 'warning', 'error'].includes(eventLog?.level)
    ? eventLog.level
    : 'info'
  const detail = Boolean(eventLog?.detail)
  if (data.phase === 'step-finished') {
    row.stepCompleted = Math.min(row.stepTotal, row.stepCompleted + 1)
    if (status === 'passed') row.stepPass += 1
    if (status === 'failed') row.stepFail += 1
    if (status === 'skipped') row.stepSkip += 1
  }
  if (data.phase === 'case-finished') {
    const duration = Number(data.durationMs)
    if (Number.isFinite(duration) && duration >= 0) row.durationMs = duration
  }
  if (!message && data.phase === 'case-started') {
    message = `CDP 任务开始，case=${row.caseId}`
  } else if (!message && data.phase === 'case-loaded') {
    message = `用例加载完成，共 ${Number(data.stepTotal) || row.stepTotal} 个步骤`
    level = 'success'
  } else if (!message && data.phase === 'step-started') {
    message = `步骤 ${stepNumber}: ${description}，开始执行`
  } else if (!message && data.phase === 'step-finished') {
    const duration = Number(data.durationMs) || 0
    const suffix = data.error ? `：${data.error}` : ''
    message = status === 'passed'
      ? `步骤 ${stepNumber}: ${description}，执行成功，耗时 ${duration}ms`
      : status === 'skipped'
        ? `步骤 ${stepNumber}: ${description}，已跳过`
        : status === 'failed'
          ? `步骤 ${stepNumber}: ${description}，执行失败${suffix}`
          : `步骤 ${stepNumber}: ${description}，状态=${status || 'unknown'}${suffix}`
    level = status === 'passed' ? 'success' : status === 'skipped' ? 'warning' : status === 'failed' ? 'error' : 'warning'
  } else if (!message && data.phase === 'case-finished') {
    const duration = Number(data.durationMs) || 0
    const failed = status === 'failed' || Boolean(data.error)
    const terminal = status === 'passed' || status === 'failed' || status === 'cancelled'
    message = terminal
      ? `CDP 执行${failed ? '失败' : status === 'cancelled' ? '取消' : '完成'}${duration ? `，耗时 ${duration}ms` : ''}`
      : `CDP 执行状态=${status || 'unknown'}${duration ? `，耗时 ${duration}ms` : ''}`
    level = failed ? 'error' : status === 'passed' ? 'success' : status === 'cancelled' ? 'warning' : 'warning'
  }
  if (!message) return
  row.liveLogs.push({
    sequence,
    timestamp: String(data.timestamp || ''),
    level,
    phase: String(eventLog?.phase || data.phase || 'case'),
    message,
    detail,
  })
  publishBatchState()
}

watch(selectedCaseKeys, async () => {
  if (running.value) return
  await loadPlaybackPreview()
})

onMounted(() => {
  window.addEventListener('message', handleExtensionPlaybackEnd)
  window.addEventListener('message', handleExtensionPlaybackProgress)
})
onUnmounted(() => {
  window.removeEventListener('message', handleExtensionPlaybackEnd)
  window.removeEventListener('message', handleExtensionPlaybackProgress)
  clearTimers()
  settleExtensionCompletion({ ok: false, error: '页面已关闭' })
})

defineExpose({ onOpen, cancelBatch, cancelActiveCase })
</script>

<style scoped lang="scss">
:deep(.arco-form-item) {
  margin-bottom: 10px;
}

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

.form-label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.form-label-help-icon {
  color: var(--color-text-3);
  cursor: help;
}

.page-error-policy-help {
  display: flex;
  max-width: 360px;
  flex-direction: column;
  gap: 6px;
  line-height: 1.5;
}

.page-error-policy-help__note {
  padding-top: 4px;
  border-top: 1px solid rgb(255 255 255 / 18%);
  opacity: 0.8;
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
  padding: 8px;
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
  padding: 12px 12px;
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

.cdp-capability-alert {
  margin-bottom: 12px;
}

:deep(.arco-card-body) {
  padding: 12px 10px;
}

:deep(.arco-table-body) {
  min-height: 0;
}
</style>
