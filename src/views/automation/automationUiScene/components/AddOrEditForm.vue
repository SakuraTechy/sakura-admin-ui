<template>
  <GiPageLayout ref="pageLayout" :left-style="{ width: 440 }">
    <template #left>
      <!-- lazy-load：用户停在「基础信息」时不渲染用例树；AddCase/投影树都会在首次挂载时自行补建。 -->
      <a-tabs :active-key="activeKey" class="scene-left-tabs" type="text" size="medium" lazy-load @change="handleTabChange">
        <!-- <template #extra>
          <a-button>Action</a-button>
        </template> -->
        <a-tab-pane key="1" title="基础信息">
          <template #title>
            <icon-info-circle /> 基础信息
          </template>
          <GiForm ref="formRef" v-model="form" size="medium" :columns="columns" :disabled="isReadonly" />
          <!-- <a-grid v-if="activeKey === '1'" class="grid">
            <a-button type="secondary" @click="handleCancel">取消</a-button>
            <a-button v-if="!activeSceneId" type="secondary" @click="handleOk">保存并继续创建</a-button>
            <a-button type="primary" @click="handleSubmit">保存</a-button>
          </a-grid> -->
        </a-tab-pane>
        <a-tab-pane key="2">
          <template #title>
            <a-dropdown v-if="activeSceneId" trigger="hover">
              <icon-ordered-list /> 场景用例
              <template #content>
                <a-doption v-if="!isReadonly" @click="addCase">
                  <template #icon>
                    <icon-plus />
                  </template>
                  <template #default>新增用例</template>
                </a-doption>
                <a-dsubmenu v-if="!isReadonly">
                  <template #icon>
                    <icon-record />
                  </template>
                  <template #default>录制用例</template>
                  <template #content>
                    <a-doption @click="openChromeRecording({ allowedModes: ['appendCase'], defaultMode: 'appendCase', fixedTargetScene: true })">
                      追加用例
                    </a-doption>
                    <a-doption @click="openChromeRecording({ allowedModes: ['replaceCase'], defaultMode: 'replaceCase', fixedTargetScene: true })">
                      替换用例
                    </a-doption>
                  </template>
                </a-dsubmenu>
                <a-dsubmenu
                  v-permission="['automation:automationUiScene:execute']"
                  :disabled="executionRunning"
                >
                  <template #icon>
                    <icon-play-arrow />
                  </template>
                  <template #default>执行用例</template>
                  <template #content>
                    <a-doption
                      v-for="item in executionTypeOptions"
                      :key="item.value"
                      :disabled="executionRunning"
                      @click="handleUnifiedExecutionSelect(item.value)"
                    >
                      {{ item.label }}
                    </a-doption>
                  </template>
                </a-dsubmenu>
                <a-doption @click="getSceneInfo()">
                  <template #icon>
                    <icon-refresh />
                  </template>
                  <template #default>刷新用例</template>
                </a-doption>
              </template>
            </a-dropdown>
            <span v-else><icon-ordered-list /> 场景用例</span>
          </template>
          <AutomationUiProjectedSceneTree
            v-if="activeSceneId && sceneDefinitionMode === 'projected'"
            :scene-db-id="activeSceneId"
            :definition-version="sceneDetail?.definitionVersion ?? 0"
            :selected-node="projectedSelectedNode"
            default-expand-first
            :readonly="isReadonly"
            @get-case="getCase"
            @get-step="getStep"
            @nodes-change="projectedCaseNodes = $event"
            @action="handleProjectedTreeAction"
            @refresh="refreshSceneAfterMutation"
          />
          <AutomationUiSceneAddCase
            v-if="activeSceneId && sceneDefinitionMode === 'projected'"
            ref="projectedCaseControllerRef"
            controller-only
            :scene-db-id="activeSceneId"
            :readonly="isReadonly"
            :case-list="projectedControllerCases"
            :definition-version="sceneDetail?.definitionVersion ?? 0"
            :project-id="sceneDetail?.projectId ?? form.projectId"
            :execution-running="executionRunning"
            :refresh-scene="refreshSceneAfterMutation"
            @get-scene-info="refreshSceneAfterMutation"
            @get-case="getCase"
            @get-step="getStep"
            @recording="openChromeRecordingFromNode"
            @execute-case="handleCaseExecution"
          />
          <AutomationUiSceneAddCase
            v-else-if="activeSceneId"
            ref="caseListRef"
            :readonly="isReadonly"
            :scene-db-id="activeSceneId"
            :case-list="caseList"
            :definition-version="sceneDetail?.definitionVersion ?? 0"
            :project-id="sceneDetail?.projectId ?? form.projectId"
            :execution-running="executionRunning"
            :refresh-scene="refreshSceneAfterMutation"
            @get-scene-info="getSceneInfo"
            @get-case="getCase"
            @get-step="getStep"
            @selection-clear="clearCaseSelection"
            @recording="openChromeRecordingFromNode"
            @execute-case="handleCaseExecution"
          />
        </a-tab-pane>
      </a-tabs>
    </template>
    <div class="detail-panel" :style="{ width: '100%' }">
      <!-- <a-card class="card execution-overview-card">
        <div class="execution-overview__header">
          <div>
            <strong>场景操作</strong>
            <span>共 {{ caseList.length }} 个用例 · {{ stepList.length }} 个步骤</span>
          </div>
          <a-space class="execution-overview__actions" wrap>
            <a-button
              v-if="activeSceneId && !isReadonly"
              v-permission="['automation:automationUiScene:create', 'automation:automationUiScene:update']"
              type="primary"
              @click="openChromeRecording"
            >
              <template #icon><icon-record /></template>
              录制用例
            </a-button>
            <a-dropdown-button
              v-permission="['automation:automationUiScene:execute']"
              type="primary"
              :disabled="!activeSceneId || executionRunning"
              @click="openExecuteModal"
              @select="handleUnifiedExecutionSelect"
            >
              <template #icon><icon-play-arrow /></template>
              执行用例
              <template #content>
                <a-doption v-for="item in executionTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-doption>
              </template>
            </a-dropdown-button>
          </a-space>
        </div>
      </a-card> -->
      <a-tabs v-model:active-key="detailActiveKey" class="tabs">
        <a-tab-pane key="1" title="详情信息">
          <div style="padding: 0 0px;">
            <a-empty v-if="caseList.length === 0">暂无数据</a-empty>
            <a-descriptions v-else :column="1" size="large" class="general-description" bordered>
              <a-descriptions-item label="ID">{{ caseDetail?.id || stepDetail?.id }}</a-descriptions-item>
              <a-descriptions-item label="名称">{{ caseDetail?.name || stepDetail?.name }}</a-descriptions-item>
              <!-- <a-descriptions-item label="备注">{{ caseDetail?.remark }}</a-descriptions-item> -->
              <a-descriptions-item label="状态">
                <GiCellTag :value="normalizeAutomationNodeStatus(caseDetail?.status ?? stepDetail?.status)" :dict="status_type" />
              </a-descriptions-item>
              <a-descriptions-item v-if="stepDetail && (!caseDetail || !caseDetail.type)" label="操作类型">{{ stepDetail?.operationType }}</a-descriptions-item>
              <a-descriptions-item v-if="stepDetail && (!caseDetail || !caseDetail.type)" label="操作方法">{{ stepDetail?.operationName }}</a-descriptions-item>
              <a-descriptions-item v-if="stepDetail && (!caseDetail || !caseDetail.type)" label="操作步骤">
                <KeyValuePairForm
                  style="vertical-align: top;"
                  :model-value="stepDetail?.configList"
                  :name-col-span="5"
                  :value-col-span="20"
                  :action-col-span="2"
                  :col-gap="15"
                  :add-key-value="false"
                  :disabled="true"
                  :value-textarea="true"
                />
              </a-descriptions-item>
            </a-descriptions>
          </div>
        </a-tab-pane>
        <a-tab-pane key="4" title="录制数据">
          <a-empty v-if="!caseDetail && !isPlaywrightStep(stepDetail)" description="当前用例或步骤暂无 Playwright 录制数据" />
          <a-space v-else-if="caseDetail" direction="vertical" fill class="recording-tab-content">
            <a-descriptions :column="1" size="large" bordered>
              <a-descriptions-item label="用例 ID">{{ caseDetail?.id || '-' }}</a-descriptions-item>
              <a-descriptions-item label="用例名称">{{ caseDetail?.name || '-' }}</a-descriptions-item>
              <a-descriptions-item label="用例备注">{{ caseDetail?.remark || '-' }}</a-descriptions-item>
              <a-descriptions-item label="录制步骤数">{{ selectedCaseRecordingSteps.length }}</a-descriptions-item>
              <a-descriptions-item label="原始用例 ID">{{ caseDetail?.origin?.originalCaseId || getStepConfigValue(firstRecordingStep, 'original_case_id') || '-' }}</a-descriptions-item>
              <a-descriptions-item label="录制 ID">{{ caseDetail?.origin?.initialRecordingId || getStepConfigValue(firstRecordingStep, 'recording_id') || '-' }}</a-descriptions-item>
              <a-descriptions-item label="起始地址">{{ getCaseExecutionValue('startUrl') || '-' }}</a-descriptions-item>
              <a-descriptions-item label="窗口模式">{{ getCaseExecutionValue('windowSizeMode') || '-' }}</a-descriptions-item>
              <a-descriptions-item label="视口">{{ formatCaseViewportFromDefinition() }}</a-descriptions-item>
            </a-descriptions>
            <a-tabs size="small" class="recording-json-tabs">
              <a-tab-pane key="step_table" title="步骤列表">
                <a-table
                  row-key="id"
                  size="small"
                  :pagination="false"
                  :data="selectedCaseRecordingSteps"
                  :columns="recordingStepColumns"
                />
              </a-tab-pane>
              <a-tab-pane key="current_case" title="当前用例">
                <JsonPretty :json="formatJsonObject(selectedCaseAdminJson)" />
              </a-tab-pane>
              <a-tab-pane key="full_case" title="完整用例">
                <JsonPretty :json="formatJsonObject(selectedCaseFullRecordingJson)" />
              </a-tab-pane>
              <a-tab-pane key="steps" title="步骤">
                <JsonPretty :json="formatJsonObject(selectedCaseRecordingStepJsonList)" />
              </a-tab-pane>
            </a-tabs>
          </a-space>
          <a-space v-else direction="vertical" fill class="recording-tab-content">
            <a-descriptions :column="1" size="large" bordered>
              <a-descriptions-item label="Playwright 录制来源">
                <a-space wrap>
                  <a-tag color="arcoblue">{{ getStepConfigValue(stepDetail, 'action_type') || stepDetail?.operationValue || 'playwright' }}</a-tag>
                  <a-tag v-if="getStepConfigValue(stepDetail, 'source')" color="green">{{ getStepConfigValue(stepDetail, 'source') }}</a-tag>
                  <a-tag v-if="getStepConfigValue(stepDetail, 'recording_id')" color="gray">{{ getStepConfigValue(stepDetail, 'recording_id') }}</a-tag>
                </a-space>
              </a-descriptions-item>
              <a-descriptions-item label="CSS 选择器">{{ getStepConfigValue(stepDetail, 'target_selector') || '-' }}</a-descriptions-item>
              <a-descriptions-item label="XPath">{{ getStepConfigValue(stepDetail, 'target_xpath') || '-' }}</a-descriptions-item>
              <a-descriptions-item label="页面地址">{{ getStepConfigValue(stepDetail, 'url') || '-' }}</a-descriptions-item>
              <a-descriptions-item label="输入值">{{ formatStepValue(stepDetail) }}</a-descriptions-item>
              <a-descriptions-item label="截图">
                <a-space v-if="getStepConfigValue(stepDetail, 'screenshot_url')" direction="vertical" fill>
                  <a-link @click="openScreenshot(getStepConfigValue(stepDetail, 'screenshot_url'))">
                    打开截图
                  </a-link>
                  <div class="recording-path-line">
                    <span class="muted">接口路径：</span>{{ getStepConfigValue(stepDetail, 'screenshot_url') }}
                  </div>
                  <div v-if="getStepConfigValue(stepDetail, 'screenshot_path')" class="recording-path-line">
                    <span class="muted">本地相对路径：</span>{{ getStepConfigValue(stepDetail, 'screenshot_path') }}
                  </div>
                  <div v-if="getStepConfigValue(stepDetail, 'screenshot_file_id')" class="recording-path-line">
                    <span class="muted">文件 ID：</span>{{ getStepConfigValue(stepDetail, 'screenshot_file_id') }}
                  </div>
                </a-space>
                <span v-else-if="getStepConfigValue(stepDetail, 'screenshot_present')">已记录截图存在标记，未保存 artifact</span>
                <span v-else>-</span>
              </a-descriptions-item>
            </a-descriptions>
            <a-tabs size="small">
              <a-tab-pane v-if="getStepConfigValue(stepDetail, 'playwright_step')" key="playwright_step" title="playwright_step">
                <JsonPretty :json="formatStepConfigJson(stepDetail, 'playwright_step')" />
              </a-tab-pane>
              <a-tab-pane v-if="getStepConfigValue(stepDetail, 'locator_meta')" key="locator_meta" title="locator_meta">
                <JsonPretty :json="formatStepConfigJson(stepDetail, 'locator_meta')" />
              </a-tab-pane>
            </a-tabs>
          </a-space>
        </a-tab-pane>
        <a-tab-pane key="2" title="描述信息">
          <div id="editor">
            <AiEditor
              :model-value="caseDetail?.remark || stepDetail?.remark || ''"
              :readonly="isReadonly"
              default-format="markdown"
            />
            <!-- <QuillEditor v-model:content="quillContent" /> -->
          </div>
        </a-tab-pane>
        <a-tab-pane key="3" title="评审信息">
          <template #title>评审信息</template>
          Content of Tab Panel 3
        </a-tab-pane>
        <a-tab-pane key="5" title="执行历史">
          <AutomationExecutionHistoryPanel
            :scene="sceneDetail"
            :execution-batches="sceneExecutionBatches"
            :execution-page="sceneExecutionPage"
            :execution-page-size="sceneExecutionPageSize"
            :execution-total="sceneExecutionTotal"
            :load-execution-page="loadSceneExecutionPage"
            :load-execution-cases="loadSceneExecutionCases"
            :load-execution-case-history="loadSceneExecutionCaseHistory"
            :load-execution-steps="loadSceneExecutionSteps"
            :load-execution-step-detail="loadSceneExecutionStepDetail"
            :loading="sceneExecutionLoading"
            :selected-case-id="selectedHistoryCaseId"
            :auto-expand-scene-id="historyAutoExpandSceneId"
            :live-executions="liveExecutions"
            @cancel-batch="cancelHistoryBatch"
            @cancel-case="cancelHistoryCase"
            @refresh="loadSceneExecutionHistory"
            @show-all="showAllExecutionHistory"
          />
        </a-tab-pane>
      </a-tabs>
    </div>
    <a-grid v-if="activeKey === '1' && !isReadonly" class="grid">
      <a-button type="secondary" @click="handleCancel">取消</a-button>
      <a-button v-if="!activeSceneId" type="secondary" @click="handleOk">保存并继续创建</a-button>
      <a-button type="primary" @click="handleSubmit">保存</a-button>
    </a-grid>
    <ExecuteSceneModal ref="executeSceneModalRef" @success="getSceneInfo" />
    <ChromeRecordingModal
      ref="chromeRecordingModalRef"
      :scene-options="currentScene ? [currentScene] : []"
      @recording-finished="handleRecordingFinished"
    />
    <AutomationExecutionCaseSelectModal
      ref="executionCaseSelectModalRef"
      :live-executions="liveExecutions"
      @next="openExecutionConfig"
    />
    <AutomationExecutionCaseModal
      ref="executionCaseModalRef"
      @back="reopenExecutionCaseSelect"
      @batch-update="liveExecutions = $event"
      @started="handleExecutionStarted"
      @success="getSceneInfo"
      @finished="handleExecutionFinished"
    />
  </GiPageLayout>
</template>

<script setup lang="tsx">
import { computed, defineEmits, defineProps, nextTick, onUnmounted, reactive, ref, shallowRef, watch, withDefaults } from 'vue'
import { add, mapTree } from 'xe-utils'
import TagsInput from 'vue3-tags-input'
import { Message, Modal } from '@arco-design/web-vue'

import {
  type ExecutionCaseOpenOptions,
  type ExecutionContext,
  type ExecutionHistoryBatchRow,
  type ExecutionHistoryCaseRow,
  type ExecutionHistoryStepRow,
  type ExecutionType,
  type LiveExecutionCase,
  executionTypeOptions,
  buildLayeredExecutionBatchRow,
  buildLayeredExecutionCaseRow,
  buildLayeredExecutionCaseHistoryRow,
  buildLayeredExecutionStepRow,
  applyLayeredExecutionStepDetail,
} from '../execution'
import AutomationUiSceneAddCase from './AutomationUiSceneAddCase.vue'
import AutomationUiProjectedSceneTree from './AutomationUiProjectedSceneTree.vue'
import ExecuteSceneModal from './ExecuteSceneModal.vue'
import ChromeRecordingModal from './ChromeRecordingModal.vue'
import AutomationExecutionCaseSelectModal from './AutomationExecutionCaseSelectModal.vue'
import AutomationExecutionCaseModal from './AutomationExecutionCaseModal.vue'
import AutomationExecutionHistoryPanel from './AutomationExecutionHistoryPanel.vue'
// import { AiEditor } from '@/components/GiEditor/AiEditor.vue'
// import QuillEditor from '@/components/GiEditor/QuillEditor.vue'

import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import type { ProjectModuleConfigResp } from '@/apis/project/projectModuleConfig'
import mittBus from '@/utils/mitt'
import { useUiStore } from '@/stores/modules/uiStore'
import { useDict } from '@/hooks/app'
import { filterSceneStatusOptions } from '@/utils/automationUiSceneStatus'
import { type AutomationUiCase, type AutomationUiSceneDetailResp, type AutomationUiSceneResp, addAutomationUiScene, copyAutomationUiScene, getAutomationUiCaseDetail, getAutomationUiStepDetail, updateAutomationUiScene } from '@/apis/automation/automationUiScene'
import { normalizeAutomationNodeStatus } from '../caseTree'
import { findNodePath } from '@/utils/sakura'
import http from '@/utils/http'
import {
  cancelAutomationPlaywrightBatch,
  cancelAutomationPlaywrightBatchCase,
} from '@/apis/automation/automationPlaywrightRunner'
import { invalidateAutomationUiDefinition, loadAutomationUiDefinition, requestOnce } from '../queryCache'
import {
  type AutomationUiExecutionSummary,
  type AutomationUiSceneSummary,
  getAutomationUiExecutionCases,
  getAutomationUiExecutionCaseHistory,
  getAutomationUiExecutions,
  getAutomationUiSceneExecutionSummary,
  getAutomationUiExecutionStep,
  getAutomationUiExecutionSteps,
} from '@/apis/automation/automationUiQuery'

defineOptions({ name: 'Ui' })

type RecordingMode = 'appendCase' | 'replaceCase' | 'appendStep' | 'replaceStep'

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
  (e: 'add-tab'): void
  (e: 'remove-tab'): void
  (e: 'update-tab', record: any): void
  (e: 'save-success'): void
}>()

const props = withDefaults(defineProps<{
  sceneDbId?: string | number
  paneActive?: boolean
  readonly?: boolean
  copy?: boolean
  refreshVersion?: number
}>(), {
  sceneDbId: '',
  paneActive: false,
  readonly: false,
  copy: false,
  refreshVersion: 0,
})

const uiStore = useUiStore()
const activeSceneId = computed(() => String(props.sceneDbId || ''))
const formRef = ref<InstanceType<typeof GiForm>>()
const { scene_level, browser_type, status_type } = useDict('scene_level', 'browser_type', 'status_type')

const [form, resetForm] = useResetReactive({
  projectId: uiStore.projectId ?? undefined,
  versionId: uiStore.versionId ?? undefined,
  moduleId: uiStore.moduleId ?? undefined,
  sceneId: '',
  name: '',
  description: '',
  tags: [],
  level: 'P0',
  executeStatus: '10',
  status: 1,
})

const activeKey = ref('1')
const detailActiveKey = ref('1')
const perChecked = ref(false)
const webValue = ref('Chrome')

const moduleSelectTree = computed(() => {
  if (!form.projectId || !form.versionId) return []
  const treeList = uiStore.treeList?.filter(
    (item) => (item as any).projectId === form.projectId && (item as any).versionId === form.versionId,
  )
  const data = JSON.parse(JSON.stringify(treeList)) as ProjectModuleConfigResp[]
  return mapTree(data, (i) => ({
    key: i.id,
    title: i.name,
    children: i.children,
  }))
})

const handleTabChange = (key: string) => {
  console.log('handleTabChange', key)
  activeKey.value = key
}

const isReadonly = computed(() => props.readonly)
const isCopyMode = computed(() => props.copy)

watch(() => form.projectId, async (newProjectId, oldProjectId) => {
  if (newProjectId) {
    await uiStore.fetchVersions(newProjectId)
    form.versionId = uiStore.versionId
    // if (oldProjectId && newProjectId !== oldProjectId) {
    //   form.versionId = ''
    // }
  }
})

watch(() => form.versionId, async (newVersionId) => {
  if (newVersionId) {
    await uiStore.fetchTrees(form.projectId, newVersionId)
    form.moduleId = uiStore.moduleId
  }
})

const columns = computed<ColumnItem[]>(() => [
  {
    label: '所属项目',
    field: 'projectId',
    span: 23,
    type: 'select',
    required: true,
    props: {
      options: uiStore.projectList,
    },
  },
  {
    label: '所属版本',
    field: 'versionId',
    span: 23,
    type: 'select',
    required: true,
    props: {
      options: uiStore.versionList,
    },
  },
  {
    label: '所属模块',
    field: 'moduleId',
    span: 23,
    required: true,
    type: 'tree-select',
    props: {
      data: moduleSelectTree.value,
      allowClear: true,
      allowSearch: true,
      fallbackOption: false,
      filterTreeNode(searchKey, nodeData) {
        if (nodeData.title) {
          return nodeData.title.toLowerCase().includes(searchKey.toLowerCase())
        }
        return false
      },
    },
    // rules: [{ required: true, message: '请选择父模块' }],
    hide: (form) => {
      return form.parentId === 0
    },
  },
  {
    label: '场景ID',
    field: 'sceneId',
    span: 23,
    type: 'input',
    required: true,
    props: {
      maxLength: 64,
    },
  },
  {
    label: '场景名称',
    field: 'name',
    span: 23,
    type: 'input',
    required: true,
    props: {
      maxLength: 64,
    },
  },
  {
    label: '场景等级',
    field: 'level',
    span: 23,
    type: 'select',
    required: true,
    props: {
      options: scene_level.value,
    },
  },
  // {
  //   label: '执行状态',
  //   field: 'executeStatus',
  //   span: 23,
  //   type: 'select',
  //   required: true,
  //   props: {
  //     options: filterSceneStatusOptions(status_type.value),
  //   },
  // },
  {
    label: '场景标签',
    field: 'tags',
    span: 23,
    type: 'input-tag',
    color: 'blue',
    props: {
      placeholder: '请输入场景标签，按回车确认',
      maxTagCount: 5,
    },
  },
  {
    label: '场景描述',
    field: 'description',
    span: 23,
    type: 'textarea',
    props: {
      maxLength: 255,
      autoSize: true,
    },
  },
  {
    label: '场景状态',
    field: 'status',
    span: 23,
    type: 'switch',
    props: {
      options: status_type.value.filter((item) => ['1', '2'].includes(item.value)),
      type: 'round',
      checkedValue: 1,
      uncheckedValue: 2,
      checkedText: '启用',
      uncheckedText: '禁用',
    },
  },
])

const executeSceneModalRef = ref()

const selectedCaseRecordingSteps = computed(() => {
  const stepList = Array.isArray(caseDetail.value?.stepList) ? caseDetail.value.stepList : []
  return stepList.filter((step: any) => isPlaywrightStep(step))
})

const firstRecordingStep = computed(() => selectedCaseRecordingSteps.value[0])

// 用例级 executionConfig 是运行配置唯一事实来源；仅对历史数据回退到旧步骤字段。
const getCaseExecutionValue = (name: string) => {
  const config = caseDetail.value?.executionConfig || {}
  if (config[name] != null && config[name] !== '') return String(config[name])
  const legacyName = {
    startUrl: 'start_url',
    windowSizeMode: 'window_size_mode',
    viewportWidth: 'viewport_width',
    viewportHeight: 'viewport_height',
    screenshotMode: 'screenshot_mode',
    pageErrorCheckEnabled: 'page_error_check_enabled',
  }[name] || name
  return getStepConfigValue(firstRecordingStep.value, legacyName)
}

const getCaseOriginValue = (name: string, legacyName: string) => {
  const value = caseDetail.value?.origin?.[name]
  return value == null || value === '' ? getStepConfigValue(firstRecordingStep.value, legacyName) : String(value)
}

const selectedCaseRecordingStepJsonList = computed(() => {
  return selectedCaseRecordingSteps.value.map((step: any, index: number) => {
    const rawStep = parseStepConfigJson(step, 'playwright_step')
    if (rawStep && typeof rawStep === 'object' && !Array.isArray(rawStep)) {
      return rawStep.id == null ? { id: step?.order ?? index + 1, ...rawStep } : rawStep
    }
    return {
      id: step?.order ?? index + 1,
      action_type: getStepConfigValue(step, 'action_type') || step?.operationValue,
      target_selector: getStepConfigValue(step, 'target_selector'),
      target_xpath: getStepConfigValue(step, 'target_xpath'),
      value: getStepConfigValue(step, 'value'),
      url: getStepConfigValue(step, 'url'),
      description: step?.name || step?.remark,
    }
  })
})

const selectedCaseRecordingCaseJson = computed(() => {
  const firstStep = firstRecordingStep.value
  const caseId = getCaseOriginValue('originalCaseId', 'original_case_id') || caseDetail.value?.id || ''
  return {
    id: caseId,
    name: caseDetail.value?.name || '',
    status: caseDetail.value?.status || '',
    start_url: getCaseExecutionValue('startUrl') || getStepConfigValue(firstStep, 'url') || '',
    description: caseDetail.value?.remark || '',
    screenshot_mode: getCaseExecutionValue('screenshotMode') || 'standard',
    window_size_mode: getCaseExecutionValue('windowSizeMode') || '',
    viewport_width: formatNumberOrEmpty(getCaseExecutionValue('viewportWidth')),
    viewport_height: formatNumberOrEmpty(getCaseExecutionValue('viewportHeight')),
    steps: selectedCaseRecordingStepJsonList.value,
  }
})

const selectedCaseAdminJson = computed(() => caseDetail.value || {})

const selectedCaseFullRecordingJson = computed(() => {
  const caseJson = selectedCaseRecordingCaseJson.value
  const caseId = String(caseJson.id || caseDetail.value?.id || 'current')
  return {
    cases: {
      [caseId]: caseJson,
    },
  }
})

const recordingStepColumns = [
  {
    title: '顺序',
    dataIndex: 'order',
    width: 80,
  },
  {
    title: '步骤名称',
    dataIndex: 'name',
    ellipsis: true,
    tooltip: true,
  },
  {
    title: '动作',
    dataIndex: 'action_type',
    width: 120,
    render: ({ record }: any) => getStepConfigValue(record, 'action_type') || record.operationValue || '-',
  },
  {
    title: '目标',
    dataIndex: 'target_selector',
    ellipsis: true,
    tooltip: true,
    render: ({ record }: any) => getStepConfigValue(record, 'target_selector') || getStepConfigValue(record, 'target_xpath') || '-',
  },
]

const getStepConfigValue = (step: any, name: string) => {
  const configList = Array.isArray(step?.configList) ? step.configList : []
  const config = configList.find((item: any) => item?.paramsName === name)
  return config?.paramsValue == null ? '' : String(config.paramsValue)
}

const isPlaywrightStep = (step: any) => {
  if (!step) return false
  const source = getStepConfigValue(step, 'source') || step?.source
  const recordingId = getStepConfigValue(step, 'recording_id') || step?.recordingId
  return Boolean(
    source === 'sakura-playwright'
    || recordingId
    || getStepConfigValue(step, 'screenshot_url')
    || String(step?.operationValue || '').startsWith('pw-'),
  )
}

const parseStepConfigJson = (step: any, name: string) => {
  const value = getStepConfigValue(step, name)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const formatStepConfigJson = (step: any, name: string) => {
  const value = getStepConfigValue(step, name)
  if (!value) return '{}'
  try {
    const parsed = JSON.parse(value)
    if (name === 'playwright_step' && parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.id == null) {
      return JSON.stringify({ id: step?.order ?? step?.stepIndex ?? step?.step_index, ...parsed }, null, 2)
    }
    return JSON.stringify(parsed, null, 2)
  } catch {
    return JSON.stringify({ raw: value }, null, 2)
  }
}

const formatJsonObject = (value: any) => {
  return JSON.stringify(value ?? {}, null, 2)
}

const formatNumberOrEmpty = (value: string) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && value !== '' ? numberValue : ''
}

const formatCaseViewportFromDefinition = () => {
  if (getCaseExecutionValue('windowSizeMode') === 'maximized') return '-'
  const width = getCaseExecutionValue('viewportWidth')
  const height = getCaseExecutionValue('viewportHeight')
  return width && height ? `${width} x ${height}` : '-'
}

const formatStepValue = (step: any) => {
  if (getStepConfigValue(step, 'value_masked') === '1') return '******'
  return getStepConfigValue(step, 'value') || '-'
}

const resolveResourceUrl = (url: string) => {
  const value = String(url || '').trim()
  if (!value || /^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value
  const apiPrefix = import.meta.env.VITE_API_PREFIX || ''
  if (apiPrefix && value.startsWith(apiPrefix)) return value
  if (apiPrefix && value.startsWith('/')) return `${apiPrefix}${value}`
  return value
}

const openScreenshot = async (url: string) => {
  const resolvedUrl = resolveResourceUrl(url)
  if (!resolvedUrl) return
  if (/^(https?:)?\/\//i.test(resolvedUrl)) {
    window.open(resolvedUrl, '_blank')
    return
  }
  try {
    const response = await http.requestNative({
      method: 'get',
      url: resolvedUrl,
      responseType: 'blob',
    })
    const objectUrl = URL.createObjectURL(response.data)
    window.open(objectUrl, '_blank')
  } catch (e: any) {
    Message.error(e?.message || '打开截图失败')
  }
}

const openExecuteModal = async () => {
  if (!activeSceneId.value) {
    Message.warning('请先保存基础信息，再执行调试')
    activeKey.value = '1'
    return
  }
  if (currentScene.value) executeSceneModalRef.value?.onOpen([currentScene.value], { source: 'ui' })
}

interface ExecutionCaseSelection extends ExecutionContext {
  scene: any
  executionType: Exclude<ExecutionType, 'jenkins'>
  caseIds: string[]
}

const liveExecutions = ref<LiveExecutionCase[]>([])
const executionRunning = ref(false)
// 执行发起后自动展开最新批次明细；仅在本轮执行期间生效，翻页或离开历史页即释放。
const historyAutoExpandSceneId = ref('')
const executionCaseSelectModalRef = ref<{
  onOpen: (
    record: any,
    type: Exclude<ExecutionType, 'jenkins'>,
    options?: ExecutionCaseOpenOptions,
  ) => void
}>()
const executionCaseModalRef = ref<{
  onOpen: (
    record: any,
    type: Exclude<ExecutionType, 'jenkins'>,
    options: ExecutionCaseOpenOptions,
  ) => void
  cancelBatch: () => Promise<void>
  cancelActiveCase: () => Promise<void>
}>()
const handleUnifiedExecutionSelect = async (value: string) => {
  const type = value as ExecutionType
  if (type === 'jenkins') {
    await openExecuteModal()
    return
  }
  if (!currentScene.value) {
    Message.warning('请先保存场景，再启动回放')
    return
  }
  executionCaseSelectModalRef.value?.onOpen(currentScene.value, type, {
    caseIds: selectedHistoryCaseId.value ? [selectedHistoryCaseId.value] : [],
  })
}

const handleCaseExecution = async (payload: { caseId: string, executionType: string }) => {
  if (executionRunning.value) {
    Message.warning('已有用例正在执行，请等待当前任务结束')
    return
  }
  selectedHistoryCaseId.value = payload.caseId
  const type = payload.executionType as ExecutionType
  if (type === 'jenkins') {
    await openExecuteModal()
    return
  }
  if (!currentScene.value) {
    Message.warning('请先保存场景，再启动回放')
    return
  }
  executionCaseSelectModalRef.value?.onOpen(currentScene.value, type, {
    caseIds: [payload.caseId],
    selectionDisabled: true,
  })
}

function openExecutionConfig(payload: ExecutionCaseSelection) {
  executionCaseModalRef.value?.onOpen(payload.scene, payload.executionType, {
    caseIds: payload.caseIds,
    recordSource: payload.recordSource,
    testPlanId: payload.testPlanId,
  })
}

function reopenExecutionCaseSelect(payload: ExecutionCaseSelection) {
  executionCaseSelectModalRef.value?.onOpen(payload.scene, payload.executionType, {
    caseIds: payload.caseIds,
    recordSource: payload.recordSource,
    testPlanId: payload.testPlanId,
  })
}

async function handleExecutionStarted() {
  executionRunning.value = true
  detailActiveKey.value = '5'
  // 执行发起后回到“全部历史”批次口径：单用例历史看不到批次日志与步骤明细。
  showAllExecutionHistory()
  // 等待 selectedCaseId 清空引发的展开态重置生效，再指定自动展开目标。
  await nextTick()
  historyAutoExpandSceneId.value = activeSceneId.value || ''
}

async function handleExecutionFinished() {
  try {
    await getSceneInfo()
    if (detailActiveKey.value === '5') await loadSceneExecutionHistory()
    // 最终结果已落库并包含步骤明细，移除临时实时行，报告立即切换到完整历史记录。
    liveExecutions.value = []
    // 执行结束后释放自动展开，回到用户自由导航。
    historyAutoExpandSceneId.value = ''
  } finally {
    executionRunning.value = false
  }
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
      await getSceneInfo()
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
      await getSceneInfo()
    },
  })
}

const handleCancel = () => {
  emit('remove-tab')
}
const handleOk = async () => {
  if (await handleSubmit()) {
    emit('add-tab')
  }
}

const handleSubmit = async () => {
  if (isReadonly.value) {
    Message.warning('当前为只读模式，无法修改')
    return false
  }
  try {
    if (await formRef.value?.formRef?.validate()) {
      Message.warning('请检查必填项')
      activeKey.value = '1'
      return false
    }
    const preform = {
      ...form,
      projectName: uiStore.projectList.filter((item) => item.value === form.projectId)[0].label,
      versionName: uiStore.versionList.filter((item) => item.value === form.versionId)[0].label,
      // modulePath: moduleSelectTree.value.filter((item) => item.key === form.moduleId)[0].title,
      modulePath: findNodePath(moduleSelectTree.value, 'key', form.moduleId, 'title'),
      // level: scene_level.value.filter((item) => item.value === form.level)[0].label,
    }
    if (activeSceneId.value && !isCopyMode.value) {
      await updateAutomationUiScene(preform, activeSceneId.value)
      invalidateAutomationUiDefinition(activeSceneId.value)
      Message.success('修改成功')
      // uiStore.updateScene(await getAutomationUiScene(uiStore.activeId))
    } else if (activeSceneId.value && isCopyMode.value) {
      const res = await copyAutomationUiScene(preform, activeSceneId.value)
      const newId = res.data?.id ?? res.data
      if (newId) {
        Message.success('复制成功')
        const record = {
          id: String(newId),
          title: form?.name,
        }
        emit('update-tab', record)
        uiStore.activeId = String(newId)
        uiStore.activeCopy = false
      }
    } else {
      const res = await addAutomationUiScene(preform)
      if (res.data?.id) {
        Message.success('新增成功')
        const record = {
          id: res.data.id,
          title: form?.name,
        }
        emit('update-tab', record)
        uiStore.activeId = res.data.id
        uiStore.activeCopy = false
      }
    }
    emit('save-success')
    handleCancel()
    return true
  } catch (error) {
    console.error('保存失败:', error)
    return false
  }
}

const caseList = shallowRef<AutomationUiCase[]>([])
const sceneDetail = ref<AutomationUiSceneDetailResp>()
const sceneDefinitionMode = ref<'inline' | 'projected'>('inline')
const projectedCaseNodes = ref<Array<{ id: string, name: string, stepList: unknown[] }>>([])
const projectedControllerCases = computed(() => projectedCaseNodes.value as unknown as AutomationUiCase[])
const sceneInfoLoading = ref(false)
let sceneInfoRequestSequence = 0
let sceneInfoController: AbortController | undefined
const sceneLatestExecution = ref<AutomationUiExecutionSummary>()
const sceneExecutionBatches = ref<ExecutionHistoryBatchRow[]>([])
const sceneExecutionLoading = ref(false)
const sceneExecutionPage = ref(1)
const sceneExecutionPageSize = ref(10)
const sceneExecutionTotal = ref(0)
let sceneExecutionController: AbortController | undefined
const chromeRecordingModalRef = ref<{ onOpen: (record?: AutomationUiSceneResp, options?: RecordingOpenOptions) => void }>()
const isRequestCancelled = (error: any) => ['AbortError', 'CanceledError'].includes(error?.name) || error?.code === 'ERR_CANCELED'

const loadSceneExecutionHistory = async () => {
  if (!activeSceneId.value || !props.paneActive || detailActiveKey.value !== '5') return
  sceneExecutionController?.abort()
  const controller = new AbortController()
  sceneExecutionController = controller
  sceneExecutionLoading.value = true
  try {
    const response = await getAutomationUiExecutions({
      sceneDbId: activeSceneId.value,
      recordSource: 'debug',
      page: sceneExecutionPage.value,
      size: sceneExecutionPageSize.value,
      sort: ['createTime,desc'],
    }, controller.signal)
    if (controller.signal.aborted || !sceneDetail.value) return
    const scene = {
      sceneDbId: Number(activeSceneId.value),
      sceneKey: sceneDetail.value.sceneId || activeSceneId.value,
      name: sceneDetail.value.name || '-',
      projectDbId: Number(sceneDetail.value.projectId || 0),
      definitionVersion: sceneDetail.value.definitionVersion || 0,
      globalExecutionRevision: response.data?.globalExecutionRevision || 0,
    } as AutomationUiSceneSummary
    sceneExecutionTotal.value = response.data?.mode === 'page' ? response.data.total : response.data?.list.length || 0
    sceneExecutionBatches.value = (response.data?.list || []).map(record => buildLayeredExecutionBatchRow(record, scene))
  } catch (error: any) {
    if (!isRequestCancelled(error) && sceneExecutionController === controller && props.paneActive) {
      Message.error(error?.message || '读取场景执行历史失败，请稍后重试')
    }
  } finally {
    if (sceneExecutionController === controller) sceneExecutionLoading.value = false
  }
}

const loadSceneExecutionPage = async (page: number, size: number) => {
  // 用户主动翻页即接管展开态，避免后续刷新反复把首行重新展开。
  historyAutoExpandSceneId.value = ''
  sceneExecutionPage.value = page
  sceneExecutionPageSize.value = size
  await loadSceneExecutionHistory()
}

const loadSceneExecutionCases = async (batch: ExecutionHistoryBatchRow, page = 1, size = 20) => {
  if (!batch.executionDbId) return
  const response = await requestOnce(
    `execution-cases:${batch.executionDbId}:${page}:${size}`,
    () => getAutomationUiExecutionCases(batch.executionDbId!, page, size),
  )
  const current = sceneExecutionBatches.value.find(item => item.executionDbId === batch.executionDbId)
  if (!current || !response.data) return
  current.cases = response.data.list.map(record => buildLayeredExecutionCaseRow(record, current))
  current.casesLoaded = true
  current.casePage = page
  current.casePageSize = size
  current.casePageTotal = response.data.total
}

const loadSceneExecutionCaseHistory = async (caseId: string, page = 1, size = 50) => {
  if (!activeSceneId.value || !sceneDetail.value || !caseId) return { list: [], total: 0 }
  const response = await requestOnce(
    `execution-case-history:${activeSceneId.value}:${caseId}:${page}:${size}`,
    () => getAutomationUiExecutionCaseHistory({
      sceneDbId: activeSceneId.value!, caseId, recordSource: 'debug',
    }, page, size),
  )
  const scene = {
    sceneDbId: Number(activeSceneId.value), sceneKey: sceneDetail.value.sceneId || activeSceneId.value,
    name: sceneDetail.value.name || '-', projectDbId: Number(sceneDetail.value.projectId || 0),
    definitionVersion: sceneDetail.value.definitionVersion || 0, globalExecutionRevision: 0,
  } as AutomationUiSceneSummary
  return {
    list: (response.data?.list || []).map(record => buildLayeredExecutionCaseHistoryRow(record, scene)),
    total: response.data?.total || 0,
  }
}

const loadSceneExecutionSteps = async (record: ExecutionHistoryCaseRow, page = 1, size = 20) => {
  if (!record.caseExecutionDbId) return
  const response = await requestOnce(
    `execution-steps:${record.caseExecutionDbId}:${page}:${size}`,
    () => getAutomationUiExecutionSteps(record.caseExecutionDbId!, page, size),
  )
  if (!response.data) return
  record.steps = response.data.list.map(buildLayeredExecutionStepRow)
  record.stepsLoaded = true
  record.stepPage = page
  record.stepPageSize = size
  record.stepPageTotal = response.data.total
}

const loadSceneExecutionStepDetail = async (step: ExecutionHistoryStepRow) => {
  if (!step.stepExecutionDbId || step.detailLoaded) return
  const response = await requestOnce(
    `execution-step:${step.stepExecutionDbId}`,
    () => getAutomationUiExecutionStep(step.stepExecutionDbId!),
  )
  if (!response.data) return
  applyLayeredExecutionStepDetail(step, response.data)
}

const isInfrastructureActionType = (value: unknown) => ['server_command', 'database_sql', 'database_native', 'infra-server-command', 'infra-database-sql', 'infra-database-native']
  .includes(String(value || '').trim().toLowerCase())
const sceneRequiresInfrastructure = (scene: any) => Boolean(
  scene?.requiresInfrastructure
  || (Array.isArray(scene?.caseList) && scene.caseList.some((testCase: any) =>
    Array.isArray(testCase?.stepList) && testCase.stepList.some((step: any) => {
      const action = Array.isArray(step?.configList)
        ? step.configList.find((item: any) => item?.paramsName === 'action_type')?.paramsValue
        : ''
      return isInfrastructureActionType(action || step?.operationValue)
    }),
  )),
)

const currentScene = computed<AutomationUiSceneResp | null>(() => {
  if (!activeSceneId.value) return null
  const sceneCases = caseList.value as AutomationUiSceneResp['caseList']
  const requiresInfrastructure = sceneRequiresInfrastructure({ caseList: sceneCases })
  return {
    id: activeSceneId.value,
    sceneId: form.sceneId,
    name: form.name,
    description: form.description,
    projectId: String(form.projectId || ''),
    projectName: String((form as any).projectName || ''),
    versionId: String(form.versionId || ''),
    versionName: String((form as any).versionName || ''),
    moduleId: String(form.moduleId || ''),
    modulePath: String((form as any).modulePath || ''),
    level: form.level,
    status: form.status,
    tags: Array.isArray(form.tags) ? form.tags : [],
    // projected 模式只提供当前分页的轻量用例标识，不能重新拼装完整 caseList。
    caseList: sceneDefinitionMode.value === 'projected'
      ? projectedCaseNodes.value.map((item, index) => ({ ...item, type: 'case', order: index + 1, status: 1 }))
      : sceneCases,
    definitionVersion: sceneDetail.value?.definitionVersion ?? 0,
    requiresInfrastructure,
    requiredCapabilities: requiresInfrastructure ? ['browser', 'infrastructure'] : ['browser'],
    supportedExecutors: ['playwright-runner', 'extension-cdp'],
    latestExecution: sceneLatestExecution.value,
    __definitionLoaded: true,
    __projectedDefinition: sceneDefinitionMode.value === 'projected',
  } as AutomationUiSceneResp
})

const getSceneInfo = async (data1?: any) => {
  if (!activeSceneId.value || !props.paneActive) return
  sceneInfoController?.abort()
  const controller = new AbortController()
  sceneInfoController = controller
  const requestSequence = ++sceneInfoRequestSequence
  const requestedSceneId = activeSceneId.value
  sceneLatestExecution.value = undefined
  sceneInfoLoading.value = true
  try {
    const [definition, executionSummaryResponse] = await Promise.all([
      loadAutomationUiDefinition(requestedSceneId, controller.signal),
      getAutomationUiSceneExecutionSummary(requestedSceneId, 'debug', controller.signal).catch(() => undefined),
    ])
    if (!definition || !('mode' in definition)) return
    const data = definition
    if (requestSequence !== sceneInfoRequestSequence || activeSceneId.value !== requestedSceneId || !props.paneActive) return
    sceneDefinitionMode.value = data.mode
    sceneLatestExecution.value = executionSummaryResponse?.data
    projectedCaseNodes.value = []
    const normalizedData = {
      ...data,
      id: String(data.sceneDbId),
      sceneId: data.sceneKey,
      projectId: String(data.projectDbId || ''),
      versionId: data.versionDbId == null ? '' : String(data.versionDbId),
      moduleId: data.moduleDbId == null ? '' : String(data.moduleDbId),
    }
    sceneDetail.value = normalizedData as unknown as AutomationUiSceneDetailResp
    form.sceneId = normalizedData.sceneId
    form.name = normalizedData.name
    form.description = normalizedData.description || ''
    form.projectId = normalizedData.projectId
    form.versionId = normalizedData.versionId
    form.moduleId = normalizedData.moduleId
    form.level = normalizedData.level || 'P0'
    form.status = normalizedData.status ?? 1
    form.tags = Array.isArray(normalizedData.tags) ? normalizedData.tags : []
    caseList.value = data.mode === 'inline' ? data.caseList ?? [] : []
    if (data.mode === 'projected') return
    // 等待 caseList/definitionVersion 传入子树后再恢复节点，避免用旧 props 重建树。
    await nextTick()
    await caseListRef.value?.getTreeCaseList(data1)
  } catch (error: any) {
    if (!isRequestCancelled(error) && requestSequence === sceneInfoRequestSequence && props.paneActive) {
      Message.error(error?.message || '读取场景定义失败，请稍后重试')
    }
  } finally {
    if (requestSequence === sceneInfoRequestSequence) sceneInfoLoading.value = false
  }
}

const caseListRef = ref()
const projectedCaseControllerRef = ref<{ onMenuClick: (data?: any) => Promise<boolean> }>()
const projectedSelectedNode = ref<{ type: 'CASE' | 'STEP', caseId: string, stepId?: string } | null>(null)
const refreshSceneAfterMutation = async (selection?: any) => {
  if (!activeSceneId.value) return
  invalidateAutomationUiDefinition(activeSceneId.value)
  if (sceneDefinitionMode.value === 'projected') {
    try {
      const definition = await loadAutomationUiDefinition(activeSceneId.value)
      if (definition && 'mode' in definition && definition.mode === 'projected') {
        if (sceneDetail.value) {
          sceneDetail.value = {
            ...sceneDetail.value,
            definitionVersion: definition.definitionVersion,
          }
        }
        projectedCaseNodes.value = []
        const selected = selection?.type === 'STEP'
          ? { type: 'STEP' as const, caseId: String(selection.caseId), stepId: String(selection.stepId) }
          : selection?.type === 'CASE'
            ? { type: 'CASE' as const, caseId: String(selection.caseId) }
            : null
        projectedSelectedNode.value = selected
        caseDetail.value = undefined
        stepDetail.value = undefined
        selectedHistoryCaseId.value = selected?.caseId || ''
        return
      }
    } catch {
      // 节点局部刷新失败时回退到既有完整读取，不能保留可能已过期的树版本。
    }
  }
  await getSceneInfo(selection)
}
const getCaseList = async () => {
  // const res = await getAutomationUiScene(uiStore.activeId)
  // console.log('getCaseList', res)
  caseListRef.value?.getTreeCaseList()
}

const caseDetail = ref()
const stepDetail = ref()
const selectedHistoryCaseId = ref('')
const getCase = async (id: string | { node?: { id?: string, caseId?: string }, caseData?: Record<string, unknown> }) => {
  const caseId = typeof id === 'object' ? String(id.node?.caseId || id.node?.id || '') : String(id)
  if (sceneDefinitionMode.value === 'projected' && caseId) {
    projectedSelectedNode.value = { type: 'CASE', caseId }
  }
  const localCase = caseList.value.find((item: any) => String(item.id) === caseId)
  caseDetail.value = typeof id === 'object' && id.caseData ? id.caseData : localCase
  if (sceneDefinitionMode.value === 'projected' && typeof id === 'object' && id.caseData) {
    const projectedCase = projectedCaseNodes.value.find(item => String(item.id) === caseId)
    if (projectedCase) projectedCase.stepList = Array.isArray(id.caseData.stepList) ? id.caseData.stepList : []
  }
  if (sceneDefinitionMode.value === 'inline' && activeSceneId.value && caseId && !localCase) {
    try {
      const { data } = await getAutomationUiCaseDetail(activeSceneId.value, caseId)
      // DTO 使用 steps 命名，详情面板保留现有 stepList 只读视图兼容层。
      caseDetail.value = { ...data, stepList: data.steps || [] }
    } catch (error) {
      console.warn('统一用例详情读取失败，使用场景详情兼容副本', error)
    }
  }
  stepDetail.value = undefined
  selectedHistoryCaseId.value = caseId
}

const getStep = async (data: any) => {
  const parentCaseId = data.node?.caseId || data.dropNode?.caseId || data.dropNode?.id || data?.pid || data.node?.pid || data.dragNode?.pid
  const stepId = data.node?.stepId || data.dropNode?.stepId || data?.id || data.node?.id
  if (sceneDefinitionMode.value === 'projected' && parentCaseId && stepId) {
    projectedSelectedNode.value = { type: 'STEP', caseId: String(parentCaseId), stepId: String(stepId) }
  }
  const parentCase = caseList.value.find((item: any) => String(item.id) === String(parentCaseId))
  stepDetail.value = data.node?.stepData
    || parentCase?.stepList?.find((item: any) => String(item.id) === String(stepId))
  if (sceneDefinitionMode.value === 'inline' && activeSceneId.value && parentCaseId && stepId && !stepDetail.value) {
    try {
      const { data } = await getAutomationUiStepDetail(activeSceneId.value, String(parentCase.id), String(stepId))
      stepDetail.value = data
    } catch (error) {
      console.warn('统一步骤详情读取失败，使用场景详情兼容副本', error)
    }
  }
  // console.log('caseDetail', caseDetail.value, 'stepDetail', stepDetail.value)
  caseDetail.value = undefined
  selectedHistoryCaseId.value = String(parentCaseId || '')
}

const clearCaseSelection = () => {
  projectedSelectedNode.value = null
  caseDetail.value = undefined
  stepDetail.value = undefined
  selectedHistoryCaseId.value = ''
}
const showAllExecutionHistory = () => {
  caseListRef.value?.clearSelection()
  clearCaseSelection()
}

const openChromeRecording = (options?: RecordingOpenOptions) => {
  if (isReadonly.value) {
    Message.warning('当前为只读模式，无法开始录制')
    return
  }
  if (!activeSceneId.value) {
    Message.warning('请先保存基础信息，再开始 Chrome 录制')
    activeKey.value = '1'
    return
  }
  chromeRecordingModalRef.value?.onOpen(currentScene.value || undefined, options)
}

const openChromeRecordingFromNode = (data: { mode: RecordingMode, node: any }) => {
  const node = data.node || {}
  const isCase = node.type === 'case'
  const isStep = node.type === 'step'
  const targetCaseId = isCase
    ? String(node.caseId || node.id || '')
    : String(node.caseId || node.pid || '')
  const targetStepId = isStep ? String(node.stepId || node.id || '') : undefined
  openChromeRecording({
    allowedModes: [data.mode],
    defaultMode: data.mode,
    fixedTargetScene: true,
    fixedTargetCase: data.mode !== 'appendCase',
    fixedTargetStep: data.mode === 'replaceStep' && isStep,
    targetCaseId: data.mode === 'appendCase' ? undefined : targetCaseId,
    targetStepId,
    appendAfterCaseId: data.mode === 'appendCase' && isCase ? String(node.caseId || node.id || '') : undefined,
    appendAfterStepId: data.mode === 'appendStep' && isStep ? String(node.stepId || node.id || '') : undefined,
  })
}

const handleRecordingFinished = async () => {
  if (!activeSceneId.value) return
  invalidateAutomationUiDefinition(activeSceneId.value)
  await getSceneInfo()
  caseDetail.value = undefined
  stepDetail.value = undefined
  selectedHistoryCaseId.value = ''
}

const addCase = () => {
  if (isReadonly.value) {
    Message.warning('当前为只读模式，无法新增用例')
    return
  }
  if (!activeSceneId.value) {
    Message.warning('请先保存基础信息，再添加场景用例')
    activeKey.value = '1'
  } else {
    const controller = sceneDefinitionMode.value === 'projected'
      ? projectedCaseControllerRef.value
      : caseListRef.value
    void controller?.onMenuClick({ mode: 'add', node: { type: '' } })
  }
}

const handleProjectedTreeAction = (data: { mode: string, node: any }) => {
  if (data.mode.startsWith('recording:')) {
    openChromeRecordingFromNode({ mode: data.mode.slice('recording:'.length), node: data.node })
    return
  }
  void projectedCaseControllerRef.value?.onMenuClick({ mode: data.mode, node: data.node })
}

watch(
  () => `${props.paneActive}:${activeSceneId.value}:${props.refreshVersion}`,
  () => {
    if (props.paneActive && activeSceneId.value) void getSceneInfo()
    else sceneInfoController?.abort()
  },
  { immediate: true },
)

watch(activeSceneId, () => {
  sceneExecutionPage.value = 1
})

watch(
  () => `${props.paneActive}:${detailActiveKey.value}:${activeSceneId.value}`,
  () => {
    if (props.paneActive && detailActiveKey.value === '5' && activeSceneId.value) {
      void loadSceneExecutionHistory()
    } else {
      // 离开执行历史或切换场景后释放自动展开目标，回到普通浏览。
      historyAutoExpandSceneId.value = ''
      sceneExecutionController?.abort()
    }
  },
)

onUnmounted(() => {
  sceneInfoController?.abort()
  sceneExecutionController?.abort()
  caseList.value = []
  sceneExecutionBatches.value = []
  sceneDetail.value = undefined
})

defineExpose({
  getSceneInfo,
  getCaseList,
})
</script>

<script lang="tsx">
export default {}
</script>

<style scoped lang="scss">
:deep(.gi-page-layout__left) {
  // padding: 20px 35px 0px 35px!important;
  flex-direction: column;
}

:deep(.gi-page-layout__body) {
  padding: 16px 0px 16px 0px !important;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column !important;
  overflow: hidden;
  box-sizing: border-box;
  justify-content: space-between;
  align-items: flex-end;
}

:deep(.arco-tabs-pane) {
  margin-top: 10px !important;
}

// 左侧 tab 链路原本没有确定高度：a-tabs 及其 content/pane 都是内容高度，
// 树只能被 __left 的 overflow: hidden 裁掉，也无法用视口高度做虚拟滚动。
// 这里把高度从 __left 一路传到 pane，树才能拿到真实视口并自行滚动。
.scene-left-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  :deep(.arco-tabs-content) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.arco-tabs-content-list) {
    flex: 1;
    min-height: 0;
  }

  :deep(.arco-tabs-content-item) {
    display: flex;
    flex-direction: column;
  }

  :deep(.arco-tabs-content-item-active) {
    height: 100%;
  }

  :deep(.arco-tabs-pane) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    // 左侧 tab 外层不滚动，场景用例和基础信息分别由各自内容区域处理滚动。
    overflow: hidden;
  }

  // 左侧树只需要纵向浏览；关闭 GiTree 滚动容器及其自绘横向滚动轨道。
  :deep(.gi-tree__tree .arco-scrollbar-container) {
    overflow-x: hidden !important;
  }

  :deep(.gi-tree__tree .arco-scrollbar-track-direction-horizontal) {
    display: none !important;
  }

}

:deep(.w-full) {
  gap: 5px 8px !important;
}

:deep(.arco-tabs-nav-tab) {
  justify-content: center;
}

// :deep(.arco-col) {
//   width: 100%;
//   height: 100%;
//   display: flex;
//   flex-direction: row !important;
//   overflow: revert !important;
// }
:deep(.arco-row) {
  display: flex;
  align-items: center !important;
}
:deep(.arco-form-item-wrapper-col) {
  flex-direction: column !important;
}
.card {
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.1), -4px -4px 8px rgba(0, 0, 0, 0.1);
  margin: 10px 30px 10px 30px;
  border-radius: 10px;
}

.execution-overview-card :deep(.arco-card-body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px !important;
}

.execution-overview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.execution-overview__header > div:first-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.execution-overview__header strong {
  color: var(--color-text-1);
  font-size: 15px;
}

.execution-overview__header span {
  color: var(--color-text-3);
  font-size: 12px;
}

.execution-overview__actions {
  flex-shrink: 0;
}

@media (max-width: 1100px) {
  .execution-overview__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
:deep(.arco-btn-size-medium) {
    font-size: 13px !important;
}
.grid {
  display: flex;
  margin: 0 20px 20px 0;
  gap: 15px !important;
}

.detail-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.recording-tab-content {
  padding-bottom: 16px;
}

.recording-path-line {
  max-width: 100%;
  overflow-wrap: anywhere;
  line-height: 1.5;
}

.runner-output {
  width: min(680px, 70vw);
  max-height: 360px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font: 12px/1.5 Consolas, 'Courier New', monospace;
}

:deep(.arco-tabs-tab-title) {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    gap: 5px;
}
.tabs {
  width: auto;
  min-width: 0;
  margin: 0 10px 0 10px;

  :deep(.arco-tabs-nav-tab) {
    justify-content: left;
  }

  :deep(.arco-tabs-content),
  :deep(.arco-tabs-content-list),
  :deep(.arco-tabs-pane) {
    min-width: 0;
    max-width: 100%;
  }
}

:deep(.json_pretty_container) {
  width: 100%;
  max-height: 320px;
  box-sizing: border-box;
  padding: 12px 44px 12px 12px;
  overflow: auto;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  background: var(--color-fill-1);
}

:deep(.json_pretty_container .copy_icon) {
  right: 16px;
}
</style>
