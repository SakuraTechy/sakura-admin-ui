<template>
  <a-modal
    v-model:visible="visible"
    :width="modalWidth"
    draggable
    :mask-closable="false"
    :footer="false"
    @close="reset"
  >
    <template #title>
      <div class="modal-title-bar">
        <span>Chrome 扩展录制</span>
        <div class="view-mode-control">
          <span class="muted">视图模式</span>
          <a-radio-group v-model="viewMode" type="button" size="small">
            <a-radio value="standard">标准</a-radio>
            <a-radio value="compact">紧凑</a-radio>
            <a-radio value="focus">专注</a-radio>
            <a-radio value="console">控制台</a-radio>
            <a-radio value="cards">卡片</a-radio>
            <a-radio value="split">分栏</a-radio>
            <a-radio value="timeline">流程</a-radio>
            <a-radio value="cardSidebar">卡片侧栏</a-radio>
          </a-radio-group>
        </div>
      </div>
    </template>
    <div
      class="recording-view"
      :class="[
        `recording-view--${viewMode}`,
        { 'recording-view--advanced-collapsed': advancedSideCollapsed },
      ]"
    >
      <div class="modal-intro">
        <div>
          <div class="modal-kicker">Chrome 扩展</div>
          <div class="modal-heading">{{ modeOptions.length === 1 ? selectedModeLabel : '录制导入' }}</div>
        </div>
        <div class="extension-status">
          <a-space>
            <span>扩展状态</span>
            <a-tag :color="extensionStatusColor">{{ extensionStatusText }}</a-tag>
            <span v-if="extensionVersion" class="muted">v{{ extensionVersion }}</span>
            <a-tag v-if="recordingActive" color="arcoblue">已捕获 {{ liveStepCount }} 步</a-tag>
          </a-space>
          <a-button size="small" :loading="detectingExtension" @click="detectExtension">检测扩展</a-button>
        </div>
      </div>
      <a-alert type="info" show-icon class="recording-tip">
        录制停止后，扩展会把 Playwright 原始步骤上传到 admin 后端转换入库。
      </a-alert>
      <a-form ref="formRef" :model="form" layout="vertical" class="recording-form">
      <div class="recording-main-column">
      <div class="form-section" :class="{ 'form-section--collapsed': isCardSectionCollapsed('recording') }">
        <div
          class="section-title"
          :class="{ 'section-title--collapsible': viewMode === 'cardSidebar' }"
          :role="viewMode === 'cardSidebar' ? 'button' : undefined"
          :tabindex="viewMode === 'cardSidebar' ? 0 : undefined"
          @click="toggleCardSection('recording')"
          @keydown.enter.prevent="toggleCardSection('recording')"
          @keydown.space.prevent="toggleCardSection('recording')"
        >
          <span>录制设置</span>
          <span v-if="viewMode === 'cardSidebar'" class="section-title-toggle">
            <icon-down v-if="isCardSectionCollapsed('recording')" />
            <icon-up v-else />
          </span>
        </div>
        <a-row :gutter="16">
          <a-col v-if="modeOptions.length > 1" :span="12">
            <a-form-item label="导入模式" field="mode" required>
              <a-select v-model="form.mode" :options="modeOptions" @change="handleModeChange" />
            </a-form-item>
          </a-col>
          <a-col :span="modeOptions.length > 1 ? 12 : 24">
            <a-form-item label="产品环境" field="projectEnvironmentId" required>
              <a-select
                v-model="form.projectEnvironmentId"
                placeholder="请选择产品环境"
                allow-search
                :loading="loadingEnvironments"
                @change="handleProjectEnvironmentChange"
              >
                <a-option
                  v-for="item in projectEnvironmentOptions"
                  :key="item.value"
                  :value="item.value"
                  :label="item.label"
                >
                  <div class="option-row">
                    <span>{{ item.label }}</span>
                    <span class="muted">{{ item.serverIp }}</span>
                  </div>
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <div v-if="modeOptions.length === 1" class="mode-readonly">
          <span class="muted">导入模式</span>
          <a-tag color="arcoblue">{{ selectedModeLabel }}</a-tag>
        </div>
        <a-form-item label="起始地址" field="startUrl" required>
          <a-select
            v-model="form.startUrl"
            placeholder="请选择起始地址"
            allow-search
            allow-create
            allow-clear
            :options="startUrlOptions"
          />
        </a-form-item>
      </div>

      <div
        v-if="form.mode !== 'createScene'"
        class="form-section"
        :class="{ 'form-section--collapsed': isCardSectionCollapsed('target') }"
      >
        <div
          class="section-title"
          :class="{ 'section-title--collapsible': viewMode === 'cardSidebar' }"
          :role="viewMode === 'cardSidebar' ? 'button' : undefined"
          :tabindex="viewMode === 'cardSidebar' ? 0 : undefined"
          @click="toggleCardSection('target')"
          @keydown.enter.prevent="toggleCardSection('target')"
          @keydown.space.prevent="toggleCardSection('target')"
        >
          <span>目标范围</span>
          <span v-if="viewMode === 'cardSidebar'" class="section-title-toggle">
            <icon-down v-if="isCardSectionCollapsed('target')" />
            <icon-up v-else />
          </span>
        </div>
        <a-form-item v-if="!isTargetSceneFixed" label="目标场景" field="targetSceneDbId" required>
          <a-select
            v-model="form.targetSceneDbId"
            :options="targetSceneOptions"
            placeholder="请选择要追加或替换的场景"
            allow-search
            allow-clear
            :loading="loadingTargetScene"
            @change="handleTargetSceneChange"
          />
        </a-form-item>
        <a-descriptions v-if="isTargetSceneFixed" :column="2" bordered size="small" class="target-summary">
          <a-descriptions-item label="目标场景">{{ targetScene?.name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="场景 ID">{{ targetScene?.sceneId || '-' }}</a-descriptions-item>
        </a-descriptions>
        <a-row :gutter="16">
          <a-col v-if="targetCaseModes.includes(form.mode) && !isTargetCaseFixed" :span="form.mode === 'replaceStep' && !isTargetStepFixed ? 12 : 24">
            <a-form-item label="目标用例" field="targetCaseId" required>
              <a-select
                v-model="form.targetCaseId"
                :options="caseOptions"
                placeholder="请选择目标用例"
                allow-clear
                @change="handleTargetCaseChange"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="form.mode === 'replaceStep' && !isTargetStepFixed" :span="isTargetCaseFixed ? 24 : 12">
            <a-form-item label="替换目标步骤" field="targetStepId" required>
              <a-select
                v-model="form.targetStepId"
                :options="stepOptions"
                placeholder="请选择要替换的步骤"
                allow-clear
                @change="syncRecordingStartUrl"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-descriptions
          v-if="isTargetCaseFixed || isTargetStepFixed"
          :column="2"
          bordered
          size="small"
          class="target-summary"
        >
          <a-descriptions-item v-if="isTargetCaseFixed" label="目标用例">
            {{ selectedTargetCase?.name || form.targetCaseId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="isTargetStepFixed" label="目标步骤">
            {{ selectedTargetStep?.label || form.targetStepId || '-' }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <div
        v-if="form.mode === 'createScene'"
        class="form-section"
        :class="{ 'form-section--collapsed': isCardSectionCollapsed('create') }"
      >
        <div
          class="section-title"
          :class="{ 'section-title--collapsible': viewMode === 'cardSidebar' }"
          :role="viewMode === 'cardSidebar' ? 'button' : undefined"
          :tabindex="viewMode === 'cardSidebar' ? 0 : undefined"
          @click="toggleCardSection('create')"
          @keydown.enter.prevent="toggleCardSection('create')"
          @keydown.space.prevent="toggleCardSection('create')"
        >
          <span>新建内容</span>
          <span v-if="viewMode === 'cardSidebar'" class="section-title-toggle">
            <icon-down v-if="isCardSectionCollapsed('create')" />
            <icon-up v-else />
          </span>
        </div>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="场景 ID" field="sceneId" required>
              <a-input v-model="form.sceneId" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="场景名称" field="sceneName" required>
              <a-input v-model="form.sceneName" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="用例名称" field="caseName" required>
          <a-input v-model="form.caseName" allow-clear />
        </a-form-item>
      </div>

      <div
        v-if="form.mode === 'appendCase' || form.mode === 'appendStep'"
        class="form-section"
        :class="{ 'form-section--collapsed': isCardSectionCollapsed('content') }"
      >
        <div
          class="section-title"
          :class="{ 'section-title--collapsible': viewMode === 'cardSidebar' }"
          :role="viewMode === 'cardSidebar' ? 'button' : undefined"
          :tabindex="viewMode === 'cardSidebar' ? 0 : undefined"
          @click="toggleCardSection('content')"
          @keydown.enter.prevent="toggleCardSection('content')"
          @keydown.space.prevent="toggleCardSection('content')"
        >
          <span>录制内容</span>
          <span v-if="viewMode === 'cardSidebar'" class="section-title-toggle">
            <icon-down v-if="isCardSectionCollapsed('content')" />
            <icon-up v-else />
          </span>
        </div>
        <a-row :gutter="16">
          <a-col v-if="form.mode === 'appendCase'" :span="12">
            <a-form-item label="用例名称" field="caseName" required>
              <a-input v-model="form.caseName" allow-clear />
            </a-form-item>
          </a-col>
          <a-col v-if="form.mode === 'appendCase'" :span="12">
            <a-form-item label="追加位置" field="appendPosition">
              <a-select v-model="form.appendPosition" :options="appendPositionOptions" @change="syncRecordingStartUrl" />
            </a-form-item>
          </a-col>
          <a-col v-if="form.mode === 'appendStep'" :span="24">
            <a-form-item label="步骤追加位置" field="stepAppendPosition" required>
              <a-select v-model="form.stepAppendPosition" :options="stepAppendPositionOptions" @change="syncRecordingStartUrl" />
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <a-alert
        v-if="destructiveModes.includes(form.mode) && selectedTargetCase"
        type="warning"
        show-icon
        class="destructive-alert"
        style="margin-bottom: 16px;"
      >
        <template #title>破坏性操作确认</template>
        <template v-if="form.mode === 'replaceCase'">
          将替换整个用例，包含 {{ selectedTargetStepCount }} 个旧步骤为
        </template>
        <template v-else>
          将替换目标步骤为
        </template>
        <template v-if="recordingActive">{{ liveStepCount }} 个当前已捕获的新步骤</template>
        <template v-else>录制完成后实际捕获的新步骤</template>。
        原步骤不会自动保留。
      </a-alert>
      </div>

      <div
        class="advanced-side-panel"
        :class="{ 'advanced-side-panel--collapsed': advancedSideCollapsed }"
      >
        <span v-if="viewMode === 'cardSidebar'" class="advanced-side-toggle-anchor">
          <a-tooltip :content="advancedSideCollapsed ? '展开高级选项' : '收起高级选项'">
            <a-button
              class="advanced-side-toggle"
              size="mini"
              shape="circle"
              @click="advancedSideCollapsed = !advancedSideCollapsed"
            >
              <template #icon>
                <icon-left v-if="!advancedSideCollapsed" />
                <icon-right v-else />
              </template>
            </a-button>
          </a-tooltip>
        </span>
        <div v-if="viewMode === 'cardSidebar'" class="advanced-side-toolbar">
          <div class="advanced-side-title">高级选项</div>
        </div>
        <div v-if="viewMode === 'cardSidebar' && advancedSideCollapsed" class="advanced-side-collapsed-label">
          高级选项
        </div>
        <a-collapse v-model:active-key="advancedActiveKeys" class="advanced-settings">
          <a-collapse-item key="advanced" header="高级选项">
            <div v-if="viewMode === 'console'" class="advanced-console-summary">
              <div class="advanced-console-title">Recording Console</div>
              <div class="advanced-console-meta">
                <span>{{ form.screenshotMode === 'full_hd' ? '全屏高清' : '裁剪截图' }}</span>
                <span>{{ form.windowSizeMode === 'custom' ? `${form.viewportWidth} × ${form.viewportHeight}` : form.windowSizeMode === 'current' ? '当前视口' : '最大化窗口' }}</span>
              </div>
            </div>
            <div class="recording-options">
              <fieldset class="recording-option-group recording-option-group--storage">
                <legend>截图保存</legend>
                <div class="screenshot-save-options">
                  <div class="screenshot-save-option">
                    <span>保存 artifact</span>
                    <a-switch v-model="form.persistScreenshots" size="small" />
                  </div>
                  <div class="screenshot-save-option">
                    <span>原始 base64</span>
                    <a-switch v-model="form.keepRawScreenshotInStep" size="small" />
                  </div>
                </div>
              </fieldset>
              <fieldset class="recording-option-group">
                <legend>截图策略</legend>
                <a-radio-group v-model="form.screenshotMode" direction="horizontal">
                  <a-radio value="standard">标准（裁剪截图）</a-radio>
                  <a-radio value="full_hd">全屏高清</a-radio>
                </a-radio-group>
                <div class="muted option-tip">标准模式更节省存储与加载时间。</div>
              </fieldset>
              <fieldset class="recording-option-group">
                <legend>执行窗口尺寸</legend>
                <a-radio-group
                  v-model="form.windowSizeMode"
                  :direction="viewMode === 'cardSidebar' ? 'vertical' : 'horizontal'"
                >
                  <a-radio value="maximized">默认最大化</a-radio>
                  <a-radio value="current">当前窗口尺寸</a-radio>
                  <a-radio value="custom">自定义尺寸</a-radio>
                </a-radio-group>
                <a-row v-if="form.windowSizeMode === 'custom'" :gutter="12" class="viewport-row size-row">
                  <a-col :span="12">
                    <a-form-item label="宽度" field="viewportWidth">
                      <a-input-number v-model="form.viewportWidth" :min="320" :max="10000" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="高度" field="viewportHeight">
                      <a-input-number v-model="form.viewportHeight" :min="320" :max="10000" />
                    </a-form-item>
                  </a-col>
                </a-row>
                <div class="muted option-tip">默认最大化窗口；当前窗口尺寸会保存本页当前视口大小。</div>
              </fieldset>
              <div
                v-if="['console', 'cardSidebar'].includes(viewMode)"
                class="recording-option-group recording-option-group--ai"
              >
                <div class="recording-option-head">
                  <div class="recording-option-title recording-option-title--inline">
                    <span class="console-checkmark">✓</span>
                    失败 AI 分析
                  </div>
                  <a-tag color="gray">预留</a-tag>
                </div>
                <div class="muted option-tip">
                  参考扩展高级区能力展示，后续接入 Runner 失败报告后再启用。
                </div>
              </div>
            </div>
          </a-collapse-item>
        </a-collapse>
      </div>
      </a-form>
      <a-alert
        v-if="recordingLog"
        :type="recordingLog.ok ? 'success' : 'error'"
        show-icon
        style="margin-top: 12px;"
      >
        <template #title>{{ recordingLog.title }}</template>
        <div class="recording-log">
          <div v-for="item in recordingLog.items" :key="item.label" class="recording-log-item">
            <span class="muted">{{ item.label }}</span>
            <span>{{ formatLogValue(item.value) }}</span>
          </div>
        </div>
      </a-alert>
      <div class="modal-footer">
        <a-button @click="visible = false">关闭</a-button>
        <a-button type="primary" :loading="submitting" :disabled="recordingActive" @click="startRecording">
          开始录制
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { Message, Modal } from '@arco-design/web-vue'
import { getAutomationUiScene, type AutomationUiSceneResp } from '@/apis/automation/automationUiScene'
import { getProjectEnvironmentConfigList } from '@/apis/project/projectEnvironmentConfig'
import { useUiStore } from '@/stores/modules/uiStore'
import { getToken } from '@/utils/auth'

type RecordingMode = 'createScene' | 'appendCase' | 'replaceCase' | 'appendStep' | 'replaceStep'
type RecordingViewMode = 'standard' | 'compact' | 'focus' | 'console' | 'cards' | 'split' | 'timeline' | 'cardSidebar'
type CardSectionKey = 'recording' | 'target' | 'create' | 'content'
type AppendPosition = 'FIRST' | 'LAST' | 'AFTER'
type StepAppendPosition = 'FIRST' | 'LAST' | 'AFTER'
const APPEND_POSITION_FIRST: AppendPosition = 'FIRST'
const APPEND_POSITION_LAST: AppendPosition = 'LAST'
const APPEND_POSITION_AFTER_PREFIX = 'AFTER:'
const STEP_APPEND_POSITION_AFTER_PREFIX = 'AFTER_STEP:'
const LEGACY_APPEND_POSITION_FIRST = '__FIRST__'

interface RecordingForm {
  mode: RecordingMode
  targetSceneDbId: string
  projectEnvironmentId: string
  startUrl: string
  sceneId: string
  sceneName: string
  caseName: string
  targetCaseId: string
  targetStepId: string
  appendPosition: string
  stepAppendPosition: string
  persistScreenshots: boolean
  keepRawScreenshotInStep: boolean
  screenshotMode: 'standard' | 'full_hd'
  windowSizeMode: 'maximized' | 'current' | 'custom'
  viewportWidth: number
  viewportHeight: number
}

interface ProjectEnvironmentOption {
  value: string
  label: string
  name: string
  serverIp: string
  startUrls: string[]
  raw: any
}

type ExtensionStatus = 'checking' | 'connected' | 'missing' | 'invalid'

interface RecordingLog {
  ok: boolean
  title: string
  items: Array<{ label: string; value?: string | number }>
}

interface RecordingOpenOptions {
  allowedModes?: RecordingMode[]
  defaultMode?: RecordingMode
  fixedTargetScene?: boolean
  fixedTargetCase?: boolean
  fixedTargetStep?: boolean
  targetCaseId?: string
  targetStepId?: string
  appendAfterCaseId?: string
  appendAfterStepId?: string
}

const emit = defineEmits<{
  (e: 'recording-started'): void
  (e: 'recording-finished'): void
}>()
const props = defineProps<{
  sceneOptions?: AutomationUiSceneResp[]
}>()

const uiStore = useUiStore()
const visible = ref(false)
const submitting = ref(false)
const recordingActive = ref(false)
const liveStepCount = ref(0)
const detectingExtension = ref(false)
const loadingEnvironments = ref(false)
const loadingTargetScene = ref(false)
const targetSceneLoaded = ref(false)
const formRef = ref()
const targetScene = ref<AutomationUiSceneResp | null>(null)
const extensionStatus = ref<ExtensionStatus>('checking')
const extensionVersion = ref('')
const projectEnvironmentOptions = ref<ProjectEnvironmentOption[]>([])
const recordingLog = ref<RecordingLog | null>(null)
const openContext = ref<RecordingOpenOptions>({})
const advancedActiveKeys = ref<string[]>([])
const viewMode = ref<RecordingViewMode>('standard')
const advancedSideCollapsed = ref(false)
const collapsedCardSections = ref<CardSectionKey[]>([])

const modalWidth = computed(() => {
  if (viewMode.value === 'cardSidebar') return advancedSideCollapsed.value ? '820px' : '940px'
  if (['console', 'split'].includes(viewMode.value)) return '900px'
  if (['cards', 'timeline'].includes(viewMode.value)) return '820px'
  return '760px'
})

const form = reactive<RecordingForm>({
  mode: 'createScene',
  targetSceneDbId: '',
  projectEnvironmentId: '',
  startUrl: '',
  sceneId: '',
  sceneName: '',
  caseName: '',
  targetCaseId: '',
  targetStepId: '',
  appendPosition: APPEND_POSITION_LAST,
  stepAppendPosition: 'LAST',
  persistScreenshots: false,
  keepRawScreenshotInStep: false,
  screenshotMode: 'standard',
  windowSizeMode: 'maximized',
  viewportWidth: 1920,
  viewportHeight: 1080,
})

const extensionStatusText = computed(() => {
  switch (extensionStatus.value) {
    case 'connected':
      return '已连接'
    case 'missing':
      return '未检测到'
    case 'invalid':
      return '上下文失效'
    default:
      return '检测中'
  }
})

const extensionStatusColor = computed(() => {
  switch (extensionStatus.value) {
    case 'connected':
      return 'green'
    case 'missing':
    case 'invalid':
      return 'red'
    default:
      return 'arcoblue'
  }
})

const allModeOptions = [
  { label: '新建场景', value: 'createScene' },
  { label: '追加用例', value: 'appendCase' },
  { label: '替换用例', value: 'replaceCase' },
  { label: '追加步骤', value: 'appendStep' },
  { label: '替换步骤', value: 'replaceStep' },
] as Array<{ label: string; value: RecordingMode }>

const selectedModeLabel = computed(() => {
  return allModeOptions.find((item) => item.value === form.mode)?.label || '录制导入'
})

watch(viewMode, (value) => {
  if (['console', 'split', 'cardSidebar'].includes(value)) {
    advancedActiveKeys.value = ['advanced']
  }
  if (value !== 'cardSidebar') {
    advancedSideCollapsed.value = false
    collapsedCardSections.value = []
  }
})

const isCardSectionCollapsed = (key: CardSectionKey) => {
  return viewMode.value === 'cardSidebar' && collapsedCardSections.value.includes(key)
}

const toggleCardSection = (key: CardSectionKey) => {
  if (viewMode.value !== 'cardSidebar') return
  collapsedCardSections.value = isCardSectionCollapsed(key)
    ? collapsedCardSections.value.filter((item) => item !== key)
    : [...collapsedCardSections.value, key]
}

const modeOptions = computed(() => {
  const allowedModes = openContext.value.allowedModes
  if (!allowedModes?.length) return allModeOptions
  return allModeOptions.filter((item) => allowedModes.includes(item.value))
})

const isTargetSceneFixed = computed(() => openContext.value.fixedTargetScene === true)
const isTargetCaseFixed = computed(() => openContext.value.fixedTargetCase === true)
const isTargetStepFixed = computed(() => openContext.value.fixedTargetStep === true)

const caseNameModes: RecordingMode[] = ['createScene', 'appendCase', 'replaceCase']
const targetCaseModes: RecordingMode[] = ['replaceCase', 'appendStep', 'replaceStep']
const destructiveModes: RecordingMode[] = ['replaceCase', 'replaceStep']

const selectableScenes = computed(() => {
  const scenes = Array.isArray(props.sceneOptions) ? props.sceneOptions : []
  const merged = targetScene.value ? [targetScene.value, ...scenes] : scenes
  const seen = new Set<string>()
  return merged.filter((scene) => {
    const id = String(scene?.id || '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
})

const targetSceneOptions = computed(() => {
  return selectableScenes.value.map((scene) => ({
    label: `${scene.name || scene.sceneId || scene.id}${scene.sceneId ? `（${scene.sceneId}）` : ''}`,
    value: String(scene.id),
  }))
})

const orderedCases = computed(() => {
  const cases = Array.isArray(targetScene.value?.caseList) ? targetScene.value?.caseList : []
  return cases
    .map((item: any, index: number) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = Number(left.item?.order)
      const rightOrder = Number(right.item?.order)
      const normalizedLeft = Number.isFinite(leftOrder) && leftOrder > 0 ? leftOrder : Number.MAX_SAFE_INTEGER
      const normalizedRight = Number.isFinite(rightOrder) && rightOrder > 0 ? rightOrder : Number.MAX_SAFE_INTEGER
      return normalizedLeft - normalizedRight || left.index - right.index
    })
    .map(({ item }) => item)
})

const caseOptions = computed(() => {
  return orderedCases.value.map((item: any) => ({
      label: `${item.order ? `第 ${item.order} 项：` : ''}${item.name || item.id}`,
      value: String(item.id),
  }))
})

const selectedTargetCase = computed(() => {
  const cases = Array.isArray(targetScene.value?.caseList) ? targetScene.value.caseList : []
  return cases.find((item: any) => String(item?.id) === String(form.targetCaseId)) || null
})

const selectedTargetStepCount = computed(() => {
  return Array.isArray(selectedTargetCase.value?.stepList) ? selectedTargetCase.value.stepList.length : 0
})

const stepOptions = computed(() => {
  const steps = Array.isArray(selectedTargetCase.value?.stepList) ? selectedTargetCase.value.stepList : []
  return steps
    .map((item: any, index: number) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = Number(left.item?.order)
      const rightOrder = Number(right.item?.order)
      const normalizedLeft = Number.isFinite(leftOrder) && leftOrder > 0 ? leftOrder : left.index + 1
      const normalizedRight = Number.isFinite(rightOrder) && rightOrder > 0 ? rightOrder : right.index + 1
      return normalizedLeft - normalizedRight || left.index - right.index
    })
    .map(({ item, index }) => ({
      label: `第 ${item.order || index + 1} 步：${item.name || item.id || `步骤 ${index + 1}`}`,
      value: String(item.id),
    }))
})

const selectedTargetStep = computed(() => {
  return stepOptions.value.find((item) => String(item.value) === String(form.targetStepId)) || null
})

const appendPositionOptions = computed(() => [
  { label: '最前面', value: APPEND_POSITION_FIRST },
  ...caseOptions.value.map((item) => ({
    label: `在「${item.label}」之后`,
    value: `${APPEND_POSITION_AFTER_PREFIX}${item.value}`,
  })),
  { label: '末尾', value: APPEND_POSITION_LAST },
])

const stepAppendPositionOptions = computed(() => [
  { label: '最前面', value: 'FIRST' },
  ...stepOptions.value.map((item) => ({
    label: `在「${item.label}」之后`,
    value: `${STEP_APPEND_POSITION_AFTER_PREFIX}${item.value}`,
  })),
  { label: '末尾', value: 'LAST' },
])

const selectedProjectEnvironment = computed(() => {
  return projectEnvironmentOptions.value.find((item) => item.value === String(form.projectEnvironmentId))
})

const isHttpUrl = (value: unknown): value is string => {
  return /^https?:\/\//i.test(String(value || '').trim())
}

const normalizeRecordingUrl = (value: unknown) => {
  const url = String(value || '').trim()
  return isHttpUrl(url) ? url : ''
}

const getStepConfigValue = (step: any, key: string) => {
  const configList = Array.isArray(step?.configList) ? step.configList : []
  const config = configList.find((item: any) => item?.paramsName === key)
  return config?.paramsValue == null ? '' : String(config.paramsValue).trim()
}

const getRawPlaywrightStep = (step: any) => {
  const raw = getStepConfigValue(step, 'playwright_step')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const getStepPageUrl = (step: any) => {
  const raw = getRawPlaywrightStep(step)
  return normalizeRecordingUrl(step?.url || getStepConfigValue(step, 'url') || raw?.url)
}

const getCaseStepsInOrder = (targetCase: any) => {
  const steps = Array.isArray(targetCase?.stepList) ? targetCase.stepList : []
  return steps
    .map((item: any, index: number) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = Number(left.item?.order)
      const rightOrder = Number(right.item?.order)
      const normalizedLeft = Number.isFinite(leftOrder) && leftOrder > 0 ? leftOrder : Number.MAX_SAFE_INTEGER
      const normalizedRight = Number.isFinite(rightOrder) && rightOrder > 0 ? rightOrder : Number.MAX_SAFE_INTEGER
      return normalizedLeft - normalizedRight || left.index - right.index
    })
    .map(({ item }) => item)
}

const getCaseStartUrl = (targetCase: any) => {
  const steps = getCaseStepsInOrder(targetCase)
  for (const step of steps) {
    const startUrl = normalizeRecordingUrl(getStepConfigValue(step, 'start_url'))
    if (startUrl) return startUrl
  }
  return normalizeRecordingUrl(steps[0] && getStepPageUrl(steps[0]))
}

const getCaseLastPageUrl = (targetCase: any) => {
  const steps = getCaseStepsInOrder(targetCase)
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const endUrl = normalizeRecordingUrl(getStepConfigValue(steps[index], 'end_url'))
    if (endUrl) return endUrl
  }
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const pageUrl = getStepPageUrl(steps[index])
    if (pageUrl) return pageUrl
  }
  return getCaseStartUrl(targetCase)
}

const getStepBeforeUrl = (targetCase: any, targetStepId: string) => {
  const steps = getCaseStepsInOrder(targetCase)
  const targetIndex = steps.findIndex((step: any) => String(step?.id) === String(targetStepId))
  if (targetIndex > 0) {
    for (let index = targetIndex - 1; index >= 0; index -= 1) {
      const pageUrl = getStepPageUrl(steps[index])
      if (pageUrl) return pageUrl
    }
  }
  return getCaseStartUrl(targetCase)
}

const resolveTargetContextStartUrl = () => {
  if (form.mode === 'createScene') return ''
  const cases = orderedCases.value
  const targetCase = selectedTargetCase.value
  if (form.mode === 'replaceCase') return getCaseStartUrl(targetCase)
  if (form.mode === 'appendStep') return getCaseLastPageUrl(targetCase)
  if (form.mode === 'replaceStep') return getStepBeforeUrl(targetCase, form.targetStepId)
  if (form.mode === 'appendCase') {
    if (form.appendPosition === APPEND_POSITION_FIRST) return ''
    if (form.appendPosition.startsWith(APPEND_POSITION_AFTER_PREFIX)) {
      const anchorId = form.appendPosition.slice(APPEND_POSITION_AFTER_PREFIX.length)
      const anchorCase = cases.find((item: any) => String(item?.id) === anchorId)
      return getCaseLastPageUrl(anchorCase)
    }
    return getCaseLastPageUrl(cases[cases.length - 1])
  }
  return ''
}

const getEnvironmentStartUrl = () => normalizeRecordingUrl(selectedProjectEnvironment.value?.startUrls?.[0])

const startUrlOptions = computed(() => {
  const contextUrl = resolveTargetContextStartUrl()
  const environmentUrls = selectedProjectEnvironment.value?.startUrls || []
  const urls = Array.from(new Set([contextUrl, ...environmentUrls].map(normalizeRecordingUrl).filter(Boolean)))
  return urls.map((url) => ({
    label: url === contextUrl ? `目标上下文：${url}` : url,
    value: url,
  }))
})

const formatLogValue = (value?: string | number) => {
  return value === undefined || value === null || value === '' ? '-' : value
}

const toPostMessagePayload = (payload: Record<string, unknown>) => {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>
}

const toPlainTags = (tags?: unknown) => {
  return Array.isArray(tags) ? tags.map((item) => `${item}`) : []
}

const getOptionLabel = (options: Array<{ label?: string; value?: string | number }>, value?: string | number) => {
  return options.find((item) => `${item.value}` === `${value}`)?.label || ''
}

const findModulePath = (moduleId?: string | number) => {
  const walk = (items: any[], parents: string[] = []): string => {
    for (const item of items || []) {
      const next = [...parents, item.name || item.title || item.label].filter(Boolean)
      if (`${item.id}` === `${moduleId}` || `${item.value}` === `${moduleId}`) return next.join('/')
      const childPath = walk(item.children || [], next)
      if (childPath) return childPath
    }
    return ''
  }
  return walk(uiStore.treeList || [])
}

const getPrimaryServer = (item: any) => {
  const servers = Array.isArray(item?.serverConfig) ? item.serverConfig : []
  return servers.find((server: any) => Number(server?.status) === 1) || servers[0] || {}
}

const getServerConfigValue = (server: any, name: string) => {
  const configList = Array.isArray(server?.configList) ? server.configList : []
  const config = configList.find((item: any) => item?.paramsName === name)
  return config?.paramsValue ? String(config.paramsValue).trim() : ''
}

const normalizeBaseUrl = (url: string) => {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, '')
  return `http://${value}`.replace(/\/$/, '')
}

const appendPort = (url: string, port?: string | number) => {
  if (!url || !port) return url
  try {
    const parsed = new URL(normalizeBaseUrl(url))
    if (!parsed.port) parsed.port = String(port)
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return `${normalizeBaseUrl(url)}:${port}`
  }
}

const buildStartUrls = (environment: any) => {
  const server = getPrimaryServer(environment)
  const frontendDomain = getServerConfigValue(server, '前端域名')
  const frontendPort = getServerConfigValue(server, '前端端口')
  const serverPort = server?.port ? String(server.port) : ''
  const candidates = [
    normalizeBaseUrl(environment?.lastDomain),
    appendPort(frontendDomain, frontendPort || undefined),
    appendPort(server?.ip, frontendPort || serverPort || undefined),
    normalizeBaseUrl(server?.ip),
  ].filter(Boolean)
  return Array.from(new Set(candidates))
}

const syncRecordingStartUrl = () => {
  const contextUrl = resolveTargetContextStartUrl()
  form.startUrl = contextUrl || getEnvironmentStartUrl()
}

const loadProjectEnvironments = async () => {
  const projectId = targetScene.value?.projectId || uiStore.projectId
  if (!projectId) {
    projectEnvironmentOptions.value = []
    return
  }
  loadingEnvironments.value = true
  try {
    const { data } = await getProjectEnvironmentConfigList({
      id: undefined,
      projectId: String(projectId),
      name: undefined,
      status: 1,
      sort: ['name,asc'],
    })
    projectEnvironmentOptions.value = data.map((item: any) => {
      const server = getPrimaryServer(item)
      const startUrls = buildStartUrls(item)
      return {
        value: String(item.id),
        label: item.name || server?.ip || String(item.id),
        name: item.name,
        serverIp: server?.ip || '-',
        startUrls,
        raw: item,
      }
    })
    form.projectEnvironmentId = projectEnvironmentOptions.value[0]?.value || ''
    syncRecordingStartUrl()
  } finally {
    loadingEnvironments.value = false
  }
}

const handleProjectEnvironmentChange = (value: string | number | boolean | Record<string, any> | Array<any>) => {
  const nextValue = Array.isArray(value) ? value[0] : value
  form.projectEnvironmentId = nextValue == null ? '' : String(nextValue)
  syncRecordingStartUrl()
}

const loadTargetScene = async (sceneDbId: string) => {
  loadingTargetScene.value = true
  targetSceneLoaded.value = false
  try {
    const { data } = await getAutomationUiScene(sceneDbId)
    targetScene.value = data
    const targetCase = data.caseList?.find((item: any) => String(item?.id) === String(form.targetCaseId))
    if (targetCase?.name && targetCaseModes.includes(form.mode)) form.caseName = String(targetCase.name)
    targetSceneLoaded.value = true
  } finally {
    loadingTargetScene.value = false
  }
}

const handleTargetSceneChange = async (value: string | number | boolean | Record<string, any> | Array<any>) => {
  const nextValue = Array.isArray(value) ? value[0] : value
  const sceneId = nextValue == null ? '' : String(nextValue)
  form.targetSceneDbId = sceneId
  targetScene.value = selectableScenes.value.find((scene) => String(scene.id) === sceneId) || null
  form.targetCaseId = ''
  form.targetStepId = ''
  form.appendPosition = APPEND_POSITION_LAST
  form.stepAppendPosition = 'LAST'
  form.projectEnvironmentId = ''
  form.startUrl = ''
  targetSceneLoaded.value = false
  if (!sceneId) return
  try {
    await loadTargetScene(sceneId)
    await loadProjectEnvironments()
  } catch (e: any) {
    Message.error(e?.message || '加载目标场景详情失败')
  }
}

const handleTargetCaseChange = (value: string | number | boolean | Record<string, any> | Array<any>) => {
  const nextValue = Array.isArray(value) ? value[0] : value
  form.targetCaseId = nextValue == null ? '' : String(nextValue)
  form.targetStepId = ''
  const targetCase = (Array.isArray(targetScene.value?.caseList) ? targetScene.value.caseList : [])
    .find((item: any) => String(item?.id) === form.targetCaseId)
  if (targetCase?.name) form.caseName = String(targetCase.name)
  syncRecordingStartUrl()
}

const handleModeChange = async (value: string | number | boolean | Record<string, any> | Array<any>) => {
  const nextValue = Array.isArray(value) ? value[0] : value
  form.mode = (nextValue || 'createScene') as RecordingMode
  form.targetCaseId = openContext.value.targetCaseId || ''
  form.targetStepId = openContext.value.targetStepId || ''
  form.appendPosition = openContext.value.appendAfterCaseId
    ? `${APPEND_POSITION_AFTER_PREFIX}${openContext.value.appendAfterCaseId}`
    : APPEND_POSITION_LAST
  form.stepAppendPosition = openContext.value.appendAfterStepId
    ? `${STEP_APPEND_POSITION_AFTER_PREFIX}${openContext.value.appendAfterStepId}`
    : 'LAST'
  syncRecordingStartUrl()
  if (form.mode === 'createScene') {
    form.targetSceneDbId = ''
    targetScene.value = null
    targetSceneLoaded.value = false
    form.projectEnvironmentId = ''
    form.startUrl = ''
    await loadProjectEnvironments()
  }
}

const buildApiBase = () => {
  // Chrome 扩展后台不能使用相对前缀；开发环境转成绝对 dev-api 地址以复用 Vite 代理。
  const prefix = import.meta.env.VITE_API_PREFIX || ''
  if (import.meta.env.DEV && prefix.startsWith('/')) {
    return `${window.location.origin.replace(/\/$/, '')}${prefix}`
  }
  const backendBase = import.meta.env.VITE_API_BASE_URL || ''
  if (/^https?:\/\//i.test(backendBase)) return backendBase.replace(/\/$/, '')
  if (/^https?:\/\//i.test(prefix)) return prefix.replace(/\/$/, '')
  return window.location.origin.replace(/\/$/, '')
}

const syncCueCastAuthToken = () => {
  const token = getToken() || ''
  if (token) {
    localStorage.setItem('cc_auth_token', token)
  } else {
    localStorage.removeItem('cc_auth_token')
  }
  return token
}

const waitForExtensionAck = (type: string, payload: Record<string, unknown>, timeoutMs = 6000) => {
  return new Promise<any>((resolve, reject) => {
    const nonce = `${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('未检测到 CueCast Chrome 扩展，请确认扩展已安装并刷新当前页面'))
    }, timeoutMs)

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return
      const data = event.data || {}
      if (type === 'AT_PLATFORM_PING' && data.type === 'AT_PLATFORM_PONG' && data.nonce === nonce) {
        cleanup()
        resolve(data)
      }
      if (type !== 'AT_PLATFORM_PING' && data.type === 'AT_PLATFORM_ACK' && data.original === type) {
        cleanup()
        resolve(data.response)
      }
    }

    function cleanup() {
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }

    window.addEventListener('message', onMessage)
    window.postMessage(toPostMessagePayload({ ...payload, type, nonce }), '*')
  })
}

const ensureExtensionReady = async () => {
  const pong = await waitForExtensionAck('AT_PLATFORM_PING', {}, 3000)
  if (pong?.ok === false) throw new Error('CueCast Chrome 扩展不可用')
}

const detectExtension = async () => {
  detectingExtension.value = true
  extensionStatus.value = 'checking'
  extensionVersion.value = ''
  try {
    const pong = await waitForExtensionAck('AT_PLATFORM_PING', {}, 3000)
    extensionStatus.value = pong?.ok === false ? 'missing' : 'connected'
    extensionVersion.value = pong?.version || ''
    if (extensionStatus.value === 'connected') {
      Message.success('CueCast Chrome 扩展已连接')
    }
  } catch (e: any) {
    extensionStatus.value = 'missing'
    Message.warning(e?.message || '未检测到 CueCast Chrome 扩展')
  } finally {
    detectingExtension.value = false
  }
}

const buildRecordingImport = () => {
  const activeTargetScene = form.mode === 'createScene' ? null : targetScene.value
  const projectId = activeTargetScene?.projectId || uiStore.projectId
  const versionId = activeTargetScene?.versionId || uiStore.versionId
  const moduleId = activeTargetScene?.moduleId || uiStore.moduleId || uiStore.resolveDefaultModuleId(uiStore.treeList)
  if (!projectId || !versionId || !moduleId) {
    throw new Error('请先选择项目、版本和模块后再开始录制')
  }
  if (form.mode !== 'createScene' && !activeTargetScene) {
    throw new Error('请选择要追加或替换的目标场景')
  }
  if (form.mode !== 'createScene' && (!targetSceneLoaded.value || loadingTargetScene.value)) {
    throw new Error('目标场景详情加载中，请稍后再开始录制')
  }
  if (targetCaseModes.includes(form.mode) && !form.targetCaseId) {
    throw new Error('请选择目标用例')
  }
  if (form.mode === 'replaceStep' && !form.targetStepId) {
    throw new Error('请选择要替换的目标步骤')
  }
  if (!form.projectEnvironmentId || !form.startUrl) {
    throw new Error('请选择产品环境和起始地址')
  }

  const appendPosition = resolveAppendPosition()
  const stepAppendPosition = resolveStepAppendPosition()
  const viewport = getRecordingViewport()
  return {
    enabled: true,
    mode: form.mode,
    targetSceneDbId: form.mode === 'createScene' ? undefined : activeTargetScene?.id,
    targetCaseId: targetCaseModes.includes(form.mode) ? form.targetCaseId : undefined,
    targetStepId: form.mode === 'replaceStep' ? form.targetStepId : undefined,
    appendPosition: form.mode === 'appendCase' ? appendPosition.position : undefined,
    appendAfterCaseId: form.mode === 'appendCase' ? appendPosition.afterCaseId : undefined,
    stepAppendPosition: form.mode === 'appendStep' ? stepAppendPosition.position : undefined,
    appendAfterStepId: form.mode === 'appendStep' ? stepAppendPosition.afterStepId : undefined,
    startUrl: form.startUrl,
    projectEnvironmentId: form.projectEnvironmentId,
    caseName: form.caseName || selectedTargetCase.value?.name || '录制步骤',
    caseDescription: 'Chrome 扩展录制生成',
    screenshotMode: form.screenshotMode,
    windowSizeMode: form.windowSizeMode,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    persistScreenshots: form.persistScreenshots,
    keepRawScreenshotInStep: form.keepRawScreenshotInStep,
    replaceOldStepCount: form.mode === 'replaceCase' ? selectedTargetStepCount.value : form.mode === 'replaceStep' ? 1 : undefined,
    scene: {
      sceneId: activeTargetScene?.sceneId || form.sceneId,
      name: activeTargetScene?.name || form.sceneName,
      description: activeTargetScene?.description || 'Chrome 扩展录制生成',
      projectId,
      projectName: activeTargetScene?.projectName || getOptionLabel(uiStore.projectList, projectId),
      versionId,
      versionName: activeTargetScene?.versionName || getOptionLabel(uiStore.versionList, versionId),
      moduleId,
      modulePath: activeTargetScene?.modulePath || findModulePath(moduleId),
      level: activeTargetScene?.level || 'P0',
      tags: toPlainTags(activeTargetScene?.tags),
    },
  }
}

const resolveAppendPosition = (): { position: AppendPosition; afterCaseId?: string } => {
  if (form.appendPosition === APPEND_POSITION_FIRST) {
    return { position: APPEND_POSITION_FIRST, afterCaseId: LEGACY_APPEND_POSITION_FIRST }
  }
  if (form.appendPosition.startsWith(APPEND_POSITION_AFTER_PREFIX)) {
    const afterCaseId = form.appendPosition.slice(APPEND_POSITION_AFTER_PREFIX.length)
    if (!afterCaseId) throw new Error('请选择要追加到其后的用例')
    return { position: 'AFTER', afterCaseId }
  }
  return { position: APPEND_POSITION_LAST }
}

const resolveStepAppendPosition = (): { position: StepAppendPosition; afterStepId?: string } => {
  if (form.stepAppendPosition === 'FIRST') return { position: 'FIRST' }
  if (form.stepAppendPosition.startsWith(STEP_APPEND_POSITION_AFTER_PREFIX)) {
    const afterStepId = form.stepAppendPosition.slice(STEP_APPEND_POSITION_AFTER_PREFIX.length)
    if (!afterStepId) throw new Error('请选择要追加到其后的步骤')
    return { position: 'AFTER', afterStepId }
  }
  return { position: 'LAST' }
}

const getRecordingViewport = () => {
  if (form.windowSizeMode === 'maximized') {
    return { width: undefined, height: undefined }
  }
  return {
    width: form.viewportWidth,
    height: form.viewportHeight,
  }
}

const confirmReplaceOperation = () => {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const settle = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    Modal.warning({
      title: form.mode === 'replaceCase' ? '确认替换用例' : '确认替换步骤',
      content: form.mode === 'replaceCase'
        ? `这是破坏性操作，将替换整个用例，包含 ${selectedTargetStepCount.value} 个旧步骤为录制完成后实际捕获的新步骤。原步骤不会自动保留。确认继续吗？`
        : '这是破坏性操作，将替换目标步骤为录制完成后实际捕获的新步骤。原步骤不会自动保留。确认继续吗？',
      hideCancel: false,
      onOk: () => settle(true),
      onCancel: () => settle(false),
      onClose: () => settle(false),
    })
  })
}

const startRecording = async () => {
  try {
    submitting.value = true
    recordingLog.value = null
    await formRef.value?.validate()
    if (!form.startUrl || (caseNameModes.includes(form.mode) && !form.caseName)) return false
    if (!form.projectEnvironmentId) return false
    if (form.mode === 'createScene' && (!form.sceneId || !form.sceneName)) return false

    if (destructiveModes.includes(form.mode) && !(await confirmReplaceOperation())) return false

    await ensureExtensionReady()
    const recordingImport = buildRecordingImport()
    const viewport = getRecordingViewport()
    const authToken = syncCueCastAuthToken()
    const response = await waitForExtensionAck('AT_PLATFORM_RECORD', {
      apiBase: buildApiBase(),
      authToken,
      startUrl: form.startUrl,
      testCaseId: targetCaseModes.includes(form.mode) ? form.targetCaseId : `REC_CASE_${Date.now()}`,
      screenshotMode: form.screenshotMode,
      viewportMode: form.windowSizeMode,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      recordingImport,
    }, 8000)
    if (response?.ok === false) throw new Error(response.error || '扩展启动录制失败')
    recordingActive.value = true
    liveStepCount.value = 0
    Message.success('Chrome 扩展录制已启动')
    emit('recording-started')
  } catch (e: any) {
    Message.error(e?.message || '启动 Chrome 扩展录制失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = (record?: AutomationUiSceneResp | null, options: RecordingOpenOptions = {}) => {
  const stamp = dayjs().format('YYYYMMDDHHmmss')
  openContext.value = options
  targetScene.value = record || null
  const preferredMode = options.defaultMode || (record ? 'appendCase' : 'createScene')
  const availableModes = modeOptions.value.map((item) => item.value)
  form.mode = availableModes.includes(preferredMode)
    ? preferredMode
    : availableModes[0] || preferredMode
  form.targetSceneDbId = record?.id ? String(record.id) : ''
  form.projectEnvironmentId = ''
  form.startUrl = ''
  form.sceneId = `REC_${stamp}`
  form.sceneName = `Chrome 录制场景 ${stamp}`
  form.caseName = `Chrome 录制用例 ${stamp}`
  form.targetCaseId = options.targetCaseId || ''
  form.targetStepId = options.targetStepId || ''
  form.appendPosition = options.appendAfterCaseId
    ? `${APPEND_POSITION_AFTER_PREFIX}${options.appendAfterCaseId}`
    : APPEND_POSITION_LAST
  form.stepAppendPosition = options.appendAfterStepId
    ? `${STEP_APPEND_POSITION_AFTER_PREFIX}${options.appendAfterStepId}`
    : 'LAST'
  targetSceneLoaded.value = false
  form.persistScreenshots = false
  form.keepRawScreenshotInStep = false
  form.screenshotMode = 'standard'
  form.windowSizeMode = 'maximized'
  form.viewportWidth = Math.max(320, Math.round(window.innerWidth || 1920))
  form.viewportHeight = Math.max(320, Math.round(window.innerHeight || 1080))
  recordingActive.value = false
  liveStepCount.value = 0
  recordingLog.value = null
  advancedActiveKeys.value = ['console', 'split', 'cardSidebar'].includes(viewMode.value) ? ['advanced'] : []
  advancedSideCollapsed.value = false
  collapsedCardSections.value = []
}

const reset = () => {
  submitting.value = false
}

const onOpen = async (record?: AutomationUiSceneResp, options?: RecordingOpenOptions) => {
  resetForm(record, options)
  visible.value = true
  if (record?.id) {
    try {
      await loadTargetScene(String(record.id))
    } catch (e: any) {
      Message.error(e?.message || '加载目标场景详情失败')
    }
  }
  await Promise.all([
    loadProjectEnvironments(),
    detectExtension(),
  ])
}

const onWindowMessage = (event: MessageEvent) => {
  if (event.source !== window) return
  const data = event.data || {}
  if (data.type === 'AT_RECORDING_LIVE') {
    recordingActive.value = true
    liveStepCount.value = Number(data.stepCount || 0)
  }
  if (data.type === 'AT_RECORDING_END') {
    recordingActive.value = false
    liveStepCount.value = Number(data.stepCount || data.saveMeta?.recordedStepCount || data.saveContext?.recordedStepCount || 0)
    const saveMeta = data.saveMeta || data.saveContext || {}
    const oldStepCount = saveMeta.replaceOldStepCount
      ?? (saveMeta.mode === 'replaceStep' ? 1 : selectedTargetStepCount.value)
    const newStepCount = saveMeta.recordedStepCount ?? data.stepCount ?? liveStepCount.value
    recordingLog.value = {
      ok: data.saved !== false,
      title: data.saved === false ? '录制保存失败' : '录制保存成功',
      items: [
        { label: '错误信息', value: data.error },
        { label: '结束原因', value: data.reason },
        { label: '导入模式', value: saveMeta.mode },
        { label: '接口地址', value: saveMeta.apiBase },
        { label: '导入接口', value: saveMeta.importUrl },
        { label: '场景', value: saveMeta.sceneName || saveMeta.sceneId },
        { label: '目标场景DB ID', value: saveMeta.targetSceneDbId },
        { label: '目标用例 ID', value: saveMeta.targetCaseId || saveMeta.testCaseId },
        { label: '追加位置', value: saveMeta.appendPosition },
        { label: '追加锚点用例 ID', value: saveMeta.appendAfterCaseId },
        { label: '目标步骤 ID', value: saveMeta.targetStepId },
        { label: '步骤追加位置', value: saveMeta.stepAppendPosition },
        {
          label: '替换差异',
          value: ['replaceCase', 'replaceStep'].includes(saveMeta.mode)
            ? `${saveMeta.mode === 'replaceCase' ? '将替换整个用例' : '将替换目标步骤'}：${oldStepCount ?? '-'} 个旧步骤 -> ${newStepCount ?? '-'} 个新步骤`
            : undefined,
        },
        { label: '起始地址', value: saveMeta.startUrl },
        { label: '结束页面地址', value: saveMeta.recordingEndUrl },
        { label: '步骤数', value: saveMeta.stepCount ?? data.stepCount },
        { label: '捕获步骤数', value: saveMeta.recordedStepCount },
      ],
    }
    if (data.saved === false) {
      Message.error(data.error || 'Chrome 扩展录制保存失败')
    } else {
      Message.success('Chrome 扩展录制已保存，正在刷新场景列表')
      if (targetScene.value?.id && saveMeta.mode !== 'createScene') {
        void loadTargetScene(String(targetScene.value.id)).catch((e: any) => {
          Message.error(e?.message || '刷新目标场景详情失败')
        })
      }
      emit('recording-finished')
    }
  }
  if (data.type === 'AT_EXTENSION_CONTEXT_INVALID') {
    extensionStatus.value = 'invalid'
    extensionVersion.value = ''
  }
}

onMounted(() => window.addEventListener('message', onWindowMessage))
onBeforeUnmount(() => window.removeEventListener('message', onWindowMessage))

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.modal-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.view-mode-control {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-right: 12px;
  font-size: 12px;
  font-weight: 400;
}

:deep(.view-mode-control .arco-radio-group) {
  flex-wrap: wrap;
  row-gap: 4px;
}

.recording-view {
  min-width: 0;
}

.recording-form {
  min-width: 0;
}

.modal-intro {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.modal-kicker {
  color: var(--color-text-3);
  font-size: 12px;
}

.modal-heading {
  margin-top: 2px;
  color: var(--color-text-1);
  font-size: 18px;
  font-weight: 600;
}

.extension-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-fill-1);
}

.recording-tip {
  margin-bottom: 16px;
}

.form-section {
  padding: 16px 0;
  border-top: 1px solid var(--color-border-2);
}

.form-section:first-child {
  padding-top: 0;
  border-top: 0;
}

.section-title {
  margin-bottom: 12px;
  color: var(--color-text-1);
  font-size: 14px;
  font-weight: 600;
}

.section-title-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border: 1px solid var(--color-border-2);
  border-radius: 50%;
  background: var(--color-bg-1);
  color: var(--color-text-2);
  font-size: 12px;
}

.mode-readonly {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -2px 0 12px;
}

.target-summary {
  margin-bottom: 16px;
}

.advanced-settings {
  margin-top: 4px;
}

.advanced-side-panel {
  display: contents;
}

:deep(.advanced-settings .arco-collapse-item-content-box) {
  padding: 16px 0 0;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recording-options {
  display: grid;
  gap: 12px;
  margin-top: 4px;
}

.recording-option-group {
  min-width: 0;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-fill-1);
}

.recording-option-group > legend {
  padding: 0 4px;
  color: var(--color-text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}

.recording-option-title {
  margin-bottom: 10px;
  font-weight: 500;
  color: var(--color-text-1);
}

.screenshot-save-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.screenshot-save-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  min-height: 32px;
  padding: 6px 8px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
  color: var(--color-text-2);
  font-size: 12px;
  line-height: 1.3;
}

.screenshot-save-option span {
  min-width: 0;
  color: var(--color-text-1);
}

.recording-option-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.recording-option-title--inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.viewport-row {
  margin-top: 8px;
}

.size-row :deep(.arco-form-item) {
  margin-bottom: 0;
}

.option-tip {
  margin-top: 6px;
  line-height: 1.5;
}

:deep(.arco-input-number) {
  width: 100%;
}

.muted {
  color: var(--color-text-3);
}

.recording-log {
  display: grid;
  gap: 6px;
  margin-top: 4px;
}

.recording-log-item {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 8px;
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.advanced-console-summary {
  display: none;
}

.console-checkmark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: #faff69;
  color: #111;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.recording-view--compact {
  .modal-intro {
    grid-template-columns: minmax(150px, 0.4fr) minmax(0, 1fr);
    align-items: center;
  }

  .form-section {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    column-gap: 16px;
    align-items: start;
    padding: 10px 0;
  }

  .form-section:first-child {
    padding-top: 0;
  }

  .section-title {
    grid-row: 1 / -1;
    margin: 4px 0 0;
    color: var(--color-text-2);
    font-size: 13px;
  }

  .form-section > :not(.section-title) {
    min-width: 0;
  }

  :deep(.arco-form-item) {
    margin-bottom: 10px;
  }

  .recording-option-group {
    padding: 10px;
  }

  .recording-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.recording-view--focus {
  .modal-intro {
    grid-template-columns: minmax(0, 1fr);
  }

  .form-section {
    margin-top: 12px;
    padding: 16px;
    border: 1px solid var(--color-border-2);
    border-radius: 8px;
    background: var(--color-fill-1);
  }

  .form-section:first-child {
    margin-top: 0;
    padding-top: 16px;
    border-top: 1px solid var(--color-border-2);
  }

  .section-title {
    display: flex;
    align-items: center;
    min-height: 24px;
    padding-left: 10px;
    border-left: 3px solid rgb(var(--primary-6));
  }

  .target-summary {
    background: var(--color-bg-2);
  }

  .advanced-settings {
    margin-top: 12px;
    padding: 0 12px;
    border: 1px solid var(--color-border-2);
    border-radius: 8px;
  }

  .modal-footer {
    padding-top: 4px;
  }
}

.recording-view--cards {
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(var(--primary-6), 0.06), transparent 180px),
    var(--color-bg-1);

  .modal-intro {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.7fr);
    align-items: center;
  }

  .extension-status,
  .form-section,
  .advanced-settings {
    border-radius: 8px;
    background: var(--color-bg-2);
  }

  .form-section {
    margin-top: 12px;
    padding: 16px;
    border: 1px solid var(--color-border-2);
  }

  .form-section:first-child {
    margin-top: 0;
    padding-top: 16px;
    border-top: 1px solid var(--color-border-2);
  }

  .section-title {
    padding-bottom: 10px;
    border-bottom: 1px solid var(--color-border-2);
  }

  .advanced-settings {
    margin-top: 12px;
    padding: 0 12px;
    border: 1px solid var(--color-border-2);
  }

  .recording-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.recording-view--cardSidebar {
  padding: 10px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(var(--primary-6), 0.06), transparent 180px),
    var(--color-bg-1);

  .modal-intro {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.7fr);
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .recording-tip {
    margin-bottom: 10px;
  }

  .recording-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 12px;
    align-items: stretch;
    transition: grid-template-columns 0.22s ease;
  }

  .recording-main-column {
    grid-column: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .form-section,
  .destructive-alert {
    grid-column: auto;
  }

  .extension-status,
  .form-section,
  .advanced-side-panel {
    border-radius: 8px;
    background: var(--color-bg-2);
  }

  .form-section {
    margin-top: 0;
    padding: 12px 14px;
    border: 1px solid var(--color-border-2);
  }

  .form-section:first-child {
    margin-top: 0;
    padding-top: 12px;
    border-top: 1px solid var(--color-border-2);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-border-2);
    color: var(--color-text-1);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
  }

  .section-title span:first-child {
    order: 1;
  }

  .section-title::after {
    order: 2;
    flex: 1 1 auto;
    height: 1px;
    border-radius: 999px;
    background: var(--color-border-2);
    content: '';
  }

  .section-title--collapsible {
    cursor: pointer;
    outline: none;
  }

  .section-title--collapsible:focus-visible {
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(var(--primary-6), 0.16);
  }

  .section-title-toggle {
    order: 3;
    width: 20px;
    height: 20px;
    border: 1px solid var(--color-border-2);
    border-radius: 50%;
    background: var(--color-bg-1);
    color: var(--color-text-2);
    line-height: 18px;
    text-align: center;
  }

  .section-title-toggle:hover {
    border-color: rgb(var(--primary-6));
    color: rgb(var(--primary-6));
  }

  .form-section--collapsed {
    padding-bottom: 12px;
  }

  .form-section--collapsed > :not(.section-title) {
    display: none;
  }

  .form-section--collapsed .section-title {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .advanced-side-panel {
    display: flex;
    flex-direction: column;
    grid-column: 2;
    grid-row: 1;
    position: relative;
    align-self: stretch;
    min-height: 0;
    max-height: none;
    overflow: visible;
    border: 1px solid var(--color-border-2);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
    transition: width 0.22s ease, background 0.22s ease, border-color 0.22s ease;
  }

  .advanced-side-toggle-anchor {
    position: absolute;
    z-index: 3;
    top: 50%;
    left: -18px;
    display: inline-flex;
    transform: translateY(-50%);
  }

  .advanced-side-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 40px;
    padding: 7px 10px 7px 12px;
    border-bottom: 1px solid var(--color-border-2);
    background: var(--color-bg-2);
  }

  .advanced-side-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-1);
    font-size: 13px;
    font-weight: 600;
  }

  .advanced-side-title::after {
    flex: 1 1 auto;
    width: auto;
    height: 1px;
    border-radius: 999px;
    background: var(--color-border-2);
    content: '';
  }

  .advanced-side-toggle {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border-color: var(--color-border-2);
    background: var(--color-bg-1);
    color: var(--color-text-2);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
  }

  .advanced-side-toggle:hover {
    border-color: rgb(var(--primary-6));
    background: rgb(var(--primary-6));
    color: #fff;
  }

  .advanced-side-collapsed-label {
    display: none;
  }

  .advanced-settings {
    flex: 1 1 auto;
    margin-top: 0;
    min-height: 0;
    padding: 0 8px 8px;
    overflow: auto;
    border: 0;
    background: transparent;
  }

  :deep(.advanced-settings .arco-collapse-item-header) {
    display: none;
  }

  :deep(.advanced-settings .arco-collapse-item-content-box) {
    padding: 8px 0 0;
  }

  :deep(.arco-form-item) {
    margin-bottom: 8px;
  }

  :deep(.arco-radio) {
    margin-right: 10px;
    line-height: 22px;
  }

  :deep(.arco-radio-group-direction-vertical .arco-radio) {
    margin-right: 0;
    line-height: 22px;
  }

  .recording-options {
    display: flex;
    flex-direction: column;
    gap: 7px;
    grid-template-columns: none;
    margin-top: 0;
  }

  .recording-option-group {
    padding: 8px 10px;
    border-radius: 7px;
    background: var(--color-bg-2);
  }

  .recording-option-group > legend {
    padding: 0 4px;
    font-size: 12px;
    line-height: 1.1;
  }

  .recording-option-title {
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .recording-option-group--storage {
    padding-bottom: 7px;
  }

  .screenshot-save-options {
    gap: 4px;
  }

  .screenshot-save-option {
    min-height: 28px;
    padding: 4px 7px;
    background: var(--color-bg-1);
  }

  .viewport-row {
    margin-top: 4px;
  }

  .option-tip {
    margin-top: 4px;
    font-size: 12px;
  }

  .recording-option-group--ai {
    margin-top: auto;
    border-color: var(--color-border-2);
    border-left: 3px solid rgb(var(--primary-6));
    background: var(--color-bg-2);
  }

  .recording-option-group--ai .recording-option-title {
    margin-bottom: 0;
  }
}

.recording-view--cardSidebar.recording-view--advanced-collapsed {
  .recording-form {
    grid-template-columns: minmax(0, 1fr) 54px;
  }

  .advanced-side-panel {
    align-self: stretch;
    min-height: 0;
    max-height: none;
    border-color: var(--color-border-2);
    background: linear-gradient(180deg, var(--color-bg-2), var(--color-fill-1));
  }

  .advanced-side-toolbar {
    display: none;
  }

  .advanced-side-title,
  .advanced-settings {
    display: none;
  }

  .advanced-side-collapsed-label {
    position: absolute;
    top: 50%;
    left: 50%;
    display: block;
    color: var(--color-text-2);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 1.25;
    white-space: nowrap;
    transform: translate(-50%, -50%);
    writing-mode: vertical-rl;
  }
}

.recording-view--split {
  .modal-intro {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
    align-items: center;
  }

  .recording-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 312px;
    gap: 16px;
    align-items: start;
  }

  .form-section,
  .destructive-alert {
    grid-column: 1;
  }

  .form-section {
    padding: 14px 0;
  }

  .form-section:first-child {
    padding-top: 0;
  }

  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgb(var(--primary-6));
  }

  .section-title::after {
    width: 38px;
    height: 2px;
    border-radius: 999px;
    background: rgb(var(--primary-6));
    content: '';
  }

  .advanced-settings {
    grid-column: 2;
    grid-row: 1 / span 5;
    margin-top: 0;
    padding: 0 12px;
    border: 1px solid var(--color-border-2);
    border-radius: 8px;
    background: var(--color-fill-1);
  }

  .recording-switch-row :deep(.arco-col) {
    width: 100%;
    flex: 0 0 100%;
  }

  .recording-options {
    grid-template-columns: 1fr;
  }
}

.recording-view--timeline {
  padding: 10px 4px 0;

  .modal-intro {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr);
    align-items: center;
  }

  .recording-form {
    counter-reset: recording-section;
  }

  .form-section {
    position: relative;
    margin-left: 18px;
    padding: 0 0 18px 24px;
    border-top: 0;
    border-left: 1px solid var(--color-border-2);
  }

  .form-section:first-child {
    padding-top: 0;
  }

  .section-title {
    min-height: 24px;
    color: var(--color-text-1);
  }

  .section-title::before {
    position: absolute;
    left: -13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid rgb(var(--primary-6));
    border-radius: 50%;
    background: var(--color-bg-2);
    color: rgb(var(--primary-6));
    font-size: 12px;
    font-weight: 700;
    counter-increment: recording-section;
    content: counter(recording-section);
  }

  .advanced-settings {
    margin: 2px 0 0 18px;
    padding: 0 12px;
    border: 1px solid var(--color-border-2);
    border-radius: 8px;
    background: var(--color-fill-1);
  }

  .recording-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.recording-view--console {
  padding: 14px;
  border: 1px solid rgba(250, 255, 105, 0.14);
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(250, 255, 105, 0.08), transparent 34%),
    #0f1010;
  color: #f5f5f0;

  .modal-intro {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.78fr);
    align-items: stretch;
    margin-bottom: 12px;
  }

  .modal-kicker,
  .muted {
    color: rgba(245, 245, 240, 0.58);
  }

  .modal-heading {
    color: #f8f8ef;
    font-size: 20px;
    letter-spacing: 0;
  }

  .extension-status {
    border-color: rgba(250, 255, 105, 0.18);
    border-radius: 8px;
    background: rgba(20, 20, 20, 0.92);
    color: #f8f8ef;
  }

  .recording-tip {
    border-color: rgba(250, 255, 105, 0.18);
    background: rgba(250, 255, 105, 0.08);
  }

  :deep(.recording-tip .arco-alert-content),
  :deep(.recording-tip .arco-alert-title) {
    color: rgba(248, 248, 239, 0.82);
  }

  .recording-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 306px;
    gap: 12px;
    align-items: start;
  }

  .form-section {
    grid-column: 1;
    padding: 14px;
    border: 1px solid rgba(90, 90, 90, 0.72);
    border-radius: 8px;
    background: rgba(20, 20, 20, 0.94);
  }

  .form-section:first-child {
    padding-top: 14px;
    border-top: 1px solid rgba(90, 90, 90, 0.72);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #f8f8ef;
    font-size: 13px;
  }

  .section-title::before {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #faff69;
    box-shadow: 0 0 0 4px rgba(250, 255, 105, 0.12);
    content: '';
  }

  .target-summary {
    background: rgba(8, 8, 8, 0.8);
  }

  .destructive-alert {
    grid-column: 1;
    margin-bottom: 0 !important;
  }

  .advanced-settings {
    grid-column: 2;
    grid-row: 1 / span 5;
    margin-top: 0;
    overflow: hidden;
    border: 1px solid rgba(90, 90, 90, 0.72);
    border-radius: 8px;
    background: rgba(20, 20, 20, 0.96);
  }

  :deep(.advanced-settings .arco-collapse-item-header) {
    min-height: 42px;
    padding: 0 14px;
    border-bottom: 1px solid rgba(90, 90, 90, 0.72);
    color: #f8f8ef;
    font-weight: 700;
  }

  :deep(.advanced-settings .arco-collapse-item-content) {
    background: transparent;
  }

  :deep(.advanced-settings .arco-collapse-item-content-box) {
    padding: 12px;
  }

  .advanced-console-summary {
    display: block;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(90, 90, 90, 0.72);
  }

  .advanced-console-title {
    color: #faff69;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .advanced-console-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .advanced-console-meta span {
    padding: 3px 7px;
    border: 1px solid rgba(250, 255, 105, 0.18);
    border-radius: 999px;
    color: rgba(248, 248, 239, 0.74);
    font-size: 12px;
  }

  .recording-switch-row {
    margin-bottom: 2px;
  }

  .recording-switch-row :deep(.arco-col) {
    width: 100%;
    flex: 0 0 100%;
  }

  .recording-options {
    gap: 10px;
  }

  .recording-option-group {
    padding: 12px;
    border-color: rgba(90, 90, 90, 0.72);
    border-radius: 8px;
    background: rgba(8, 8, 8, 0.72);
  }

  .recording-option-group--ai {
    border-color: rgba(250, 255, 105, 0.38);
    background: rgba(250, 255, 105, 0.08);
  }

  .recording-option-title {
    color: #f8f8ef;
  }

  .option-tip {
    color: rgba(245, 245, 240, 0.58);
    font-size: 12px;
  }

  .modal-footer {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(90, 90, 90, 0.72);
  }

  :deep(.arco-form-item-label-col > label),
  :deep(.arco-radio-label) {
    color: rgba(248, 248, 239, 0.78);
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-input-number) {
    border-color: rgba(90, 90, 90, 0.72);
    background: rgba(6, 6, 6, 0.95);
    color: #f8f8ef;
  }

  :deep(.arco-input),
  :deep(.arco-input-number-input),
  :deep(.arco-select-view-value) {
    color: #f8f8ef;
  }
}

@media (max-width: 640px) {
  .modal-title-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .view-mode-control {
    margin-right: 0;
  }

  .recording-view--compact {
    .form-section {
      display: block;
    }

    .section-title {
      margin-bottom: 10px;
    }

    .recording-options {
      grid-template-columns: 1fr;
    }
  }

  .recording-view--cards,
  .recording-view--cardSidebar,
  .recording-view--split,
  .recording-view--timeline {
    .modal-intro,
    .recording-form {
      grid-template-columns: 1fr;
    }

    .recording-options {
      grid-template-columns: 1fr;
    }
  }

  .recording-view--cardSidebar {
    .advanced-side-panel {
      grid-column: 1;
      grid-row: auto;
    }
  }

  .recording-view--cardSidebar.recording-view--advanced-collapsed {
    .recording-form {
      grid-template-columns: 1fr;
    }

    .advanced-side-panel {
      min-height: 52px;
    }

    .advanced-side-toolbar {
      justify-content: flex-end;
      padding: 8px 12px;
    }

    .advanced-side-collapsed-label {
      top: 14px;
      left: 12px;
      transform: none;
      writing-mode: horizontal-tb;
    }
  }

  .recording-view--split {
    .advanced-settings,
    .destructive-alert {
      grid-column: 1;
      grid-row: auto;
    }
  }

  .recording-view--timeline {
    .form-section {
      margin-left: 12px;
      padding-left: 20px;
    }

    .advanced-settings {
      margin-left: 12px;
    }
  }

  .recording-view--console {
    padding: 10px;

    .modal-intro,
    .recording-form {
      grid-template-columns: 1fr;
    }

    .advanced-settings,
    .destructive-alert {
      grid-column: 1;
      grid-row: auto;
    }
  }
}
</style>
