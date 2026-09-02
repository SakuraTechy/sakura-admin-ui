<template>
  <GiTree
    ref="giTreeRef"
    title="场景用例"
    style="flex-direction: column"
    :edit-method="editMethod"
    :tree-data="treeList"
    :field-names="{ key: 'treeKey', title: 'name', children: 'children' }"
    :loading="loading"
    :disabled="readonly || mutationLoading"
    :draggable="!readonly && !mutationLoading && selectionMode !== 'batch-delete'"
    :allow-node-drop="canDrop"
    :selected-keys="selectedKeys"
    :checked-keys="checkedKeys"
    allow-deselect
    :multiple="selectionMode === 'batch-delete'"
    :check-strictly="false"
    :on-save="onMenuClick"
    @update:selected-keys="val => selectedKeys = val"
    @update:checked-keys="val => checkedKeys = val"
    @node-click="onNodeClick"
    @node-drop="onNodeDrop"
    @menu-click="onMenuClick"
    @tree-node-click="onTreeNodeClick"
    @focusin="onTreeFocus"
    @batch-delete-cancel="exitBatchDeleteMode"
  >
    <template #right-menu="{ node, onMenuItemClick, onTreeNodeClick }">
      <GiMenu
        :tree-data="getMoveTargetTree(node)"
        :recording-options="getRecordingMenuOptions(node)"
        :execution-options="getExecutionMenuOptions(node)"
        :execution-disabled="executionRunning"
        @on-menu-item-click="mode => onMenuItemClick(mode, node)"
        @on-tree-node-click="onTreeNodeClick"
      />
    </template>
  </GiTree>
  <!-- 测试阶段批量删除采用父子级联：勾选最上层用例时自动勾选全部步骤。 -->
  <GiFormModal
    v-model:visible="modalConfig.visible"
    v-model:form="modalConfig.form"
    max-body-height="80vh"
    :title="modalConfig.title"
    :columns="modalConfig.columns"
    :width="stepEditorModalWidth"
    :modal-class="useStepWorkbenchLayout ? 'automation-step-workbench-modal' : ''"
    :body-class="useStepWorkbenchLayout ? 'automation-step-workbench-body' : ''"
    :mask-closable="modalConfig.maskClosable"
    :esc-to-close="modalConfig.escToClose"
    :draggable="modalConfig.draggable"
    :custom-body="useStepWorkbenchLayout"
    :custom-validate="validateStepWorkbenchForm"
    :clear="modalConfig.clear"
    :on-save="handleSave"
    @save="handleSave"
    @close="handleClose"
  >
    <template #title>
      <div class="automation-step-modal-title">
        <span>{{ modalConfig.title }}</span>
        <a-button-group
          v-if="isStepEditorModal"
          class="step-layout-switcher"
          aria-label="步骤编辑版式"
          @mousedown.stop
          @click.stop
        >
          <a-tooltip content="标准版式">
            <a-button
              size="mini"
              type="text"
              :class="{ 'step-layout-button--active': stepEditorLayout === 'standard' }"
              aria-label="标准版式"
              @click="changeStepEditorLayout('standard')"
            >
              <template #icon><icon-list /></template>
            </a-button>
          </a-tooltip>
          <a-tooltip content="左右工作台版式">
            <a-button
              size="mini"
              type="text"
              :class="{ 'step-layout-button--active': stepEditorLayout === 'workbench' }"
              aria-label="左右工作台版式"
              @click="changeStepEditorLayout('workbench')"
            >
              <template #icon><icon-layout /></template>
            </a-button>
          </a-tooltip>
        </a-button-group>
      </div>
    </template>

    <template #body="{ form }">
      <div class="automation-step-workbench">
        <aside class="step-workbench-sidebar">
          <section class="step-workbench-section">
            <h3 class="step-workbench-section-title"><span></span>步骤信息</h3>
            <GiForm
              ref="workbenchStepInfoFormRef"
              :model-value="form"
              :columns="workbenchStepInfoColumns"
              layout="vertical"
              :grid-item-props="{ span: 24 }"
            />
          </section>

          <section class="step-workbench-section">
            <h3 class="step-workbench-section-title"><span></span>操作定义</h3>
            <GiForm
              ref="workbenchOperationFormRef"
              :model-value="form"
              :columns="workbenchOperationColumns"
              layout="vertical"
              :grid-item-props="{ span: 24 }"
            />
          </section>

          <section class="step-workbench-section step-workbench-section--options">
            <GiForm
              ref="workbenchOptionFormRef"
              :model-value="form"
              :columns="workbenchOptionColumns"
              layout="vertical"
              :grid-item-props="{ span: 24 }"
            />
          </section>
        </aside>

        <main class="step-workbench-main">
          <a-tabs v-model:active-key="stepWorkbenchTab" class="step-workbench-tabs" lazy-load>
            <a-tab-pane key="parameters" title="方法参数">
              <div class="step-workbench-tab-pane step-workbench-parameter-pane">
                <header
                  v-if="workbenchShowStandaloneMethodHeader || !workbenchMethodTitle"
                  class="step-workbench-main-header"
                >
                  <div v-if="workbenchShowStandaloneMethodHeader" class="step-workbench-method-identity">
                    <strong>{{ workbenchMethodTitle }}</strong>
                    <p>{{ workbenchMethodContext }}</p>
                  </div>
                  <p v-else class="step-workbench-method-empty">{{ workbenchMethodContext }}</p>
                </header>
                <GiForm
                  ref="workbenchParameterFormRef"
                  :model-value="form"
                  :columns="workbenchParameterColumns"
                  layout="vertical"
                  :grid-item-props="{ span: 24 }"
                />
              </div>
            </a-tab-pane>
            <a-tab-pane key="remark" title="步骤备注">
              <div class="step-workbench-tab-pane step-workbench-remark-pane">
                <AiEditor
                  :model-value="form.remark || ''"
                  compact
                  :readonly="false"
                  @update:model-value="value => updateWorkbenchRemark(form, value)"
                />
              </div>
            </a-tab-pane>
          </a-tabs>
        </main>
      </div>
    </template>
  </GiFormModal>
</template>

<script setup lang="tsx">
import { computed, defineEmits, defineProps, h, nextTick, reactive, ref, watch } from 'vue'
import { Collapse, CollapseItem, Message, Tooltip } from '@arco-design/web-vue'
import { IconQuestionCircle } from '@arco-design/web-vue/es/icon'
import { useRouter } from 'vue-router'
import { buildCaseTree, canDropCaseTreeNode, findNodeDetail, nodeRefOf, normalizeAutomationNodeStatus, toMovePosition } from '../caseTree'
import type { AutomationUiCaseTreeNode } from '../caseTree'
import { executionTypeOptions } from '../execution'
import AutomationOperationMethodForm from './AutomationOperationMethodForm.vue'
import InfrastructureStepConfig from './InfrastructureStepConfig.vue'
import GiMenu from '@/components/GiMenu/index.vue'
import { type AutomationUiCase, type AutomationUiStepEditReq, type AutomationUiTreeNodeRef, addCase, addStep, copyCaseTree, deleteCaseTree, getAutomationUiCaseDetail, getAutomationUiStepDetail, moveCaseTree, updateAutomationUiCaseDetail, updateAutomationUiStepDetail } from '@/apis/automation/automationUiScene'
import { createAutomationOperationDefaultConfig, getAutomationOperationCatalog, mergeAutomationOperationDefaults, normalizeAutomationOperationConfig, validateAutomationOperationConfig } from '@/apis/automation/automationOperationCatalog'
import type { AutomationOperationCatalog, AutomationOperationMethod, AutomationOperationType } from '@/apis/automation/automationOperationCatalog'
import { useUiStore } from '@/stores/modules/uiStore'
import { GiForm } from '@/components/GiForm'
import type { ColumnItem } from '@/components/GiForm'
import { useDict } from '@/hooks/app'
import AiEditor from '@/components/GiEditor/AiEditor.vue'
import KeyValuePairForm from '@/components/KeyValuePairForm'

defineOptions({ name: 'AutomationUiSceneAddCase' })

const props = defineProps<{
  caseList: AutomationUiCase[]
  definitionVersion: number
  projectId?: string | number
  projectEnvironmentId?: string | number
  executorInstanceId?: string
  readonly?: boolean
  executionRunning?: boolean
  refreshScene?: (selection?: AutomationUiTreeNodeRef) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'get-scene-info', data?: any): void
  (e: 'get-case', data?: any): void
  (e: 'get-step', data?: any): void
  (e: 'selection-clear'): void
  (e: 'recording', data: { mode: string, node: any }): void
  (e: 'execute-case', data: { caseId: string, executionType: string }): void
}>()

const { status_type } = useDict('status_type')
// v2 关闭时显式回到旧表单；这些字典不会参与 v2 的目录协议。
const { operation_type, operation_method } = useDict('operation_type', 'operation_method')

const uiStore = useUiStore()
const router = useRouter()

const selectedKeys = ref<string[]>([])
const selectionInitialized = ref(false)
const selectionMode = ref<'single' | 'batch-delete'>('single')
const checkedKeys = ref<string[]>([])
const modalData = ref()
const giTreeRef = ref()

// 树组件获得焦点时设置激活状态
const onTreeFocus = () => {
  // console.warn(`[AutomationUiSceneAddCase] 树组件获得焦点，调用 setActive()`)
  giTreeRef.value?.setActive()
}

const loading = ref(false)
type TreeCateItem = AutomationUiCaseTreeNode & { popupVisible?: boolean, isEdit?: boolean }
const treeList = ref<TreeCateItem[]>([])
const mutationLoading = ref(false)
const operationCatalog = ref<AutomationOperationCatalog>()
const operationCatalogLoading = ref(false)
const operationCatalogUnavailable = ref(false)
const operationCatalogV2Enabled = ref(true)
const catalogMethodDrafts = reactive<Record<string, Record<string, unknown>>>({})
let operationCatalogRequestSequence = 0

const isMethodAuthoringEnabled = (method: any) => {
  const configured = method?.authoring_enabled ?? method?.authoringEnabled
  // V2 目录必须由 Admin 明确给出 authoring_enabled；缺失时拒绝新增，不能用旧字典推导。
  return configured === true
}

const normalizeOperationCatalog = (source: any): AutomationOperationCatalog => ({
  catalog_version: String(source?.catalog_version ?? source?.catalogVersion ?? ''),
  v2_enabled: source?.v2_enabled ?? source?.v2Enabled ?? true,
  types: Array.isArray(source?.types)
    ? source.types.map((type: any) => ({
        type_code: String(type?.type_code ?? type?.typeCode ?? ''),
        label: String(type?.label ?? ''),
        sort: Number(type?.sort ?? 0),
        methods: Array.isArray(type?.methods)
          ? type.methods.map((method: any) => ({
              method_code: String(method?.method_code ?? method?.methodCode ?? ''),
              method_version: Number(method?.method_version ?? method?.methodVersion ?? 1),
              label: String(method?.label ?? ''),
              legacy_action: String(method?.legacy_action ?? method?.legacyAction ?? ''),
              action_type: String(method?.action_type ?? method?.actionType ?? ''),
              description: String(method?.description ?? ''),
              aliases: Array.isArray(method?.aliases) ? method.aliases.map(String) : [],
              form_schema: Array.isArray(method?.form_schema ?? method?.formSchema)
                ? method?.form_schema ?? method?.formSchema
                : [],
              capabilities: method?.capabilities || {},
              requirements: method?.requirements || {},
              implemented: method?.implemented === true,
              runtime_ready: method?.runtime_ready === true,
              permission_granted: method?.permission_granted === true,
              disabled_code: method?.disabled_code ?? method?.disabledCode,
              authoring_enabled: isMethodAuthoringEnabled(method),
              enabled: method?.enabled === true,
              disabled_reason: method?.disabled_reason ?? method?.disabledReason,
            }))
          : [],
      }))
    : [],
})

const loadOperationCatalog = async () => {
  const sceneId = uiStore.activeId
  if (!sceneId) {
    operationCatalog.value = undefined
    operationCatalogUnavailable.value = false
    return
  }
  const requestSequence = ++operationCatalogRequestSequence
  operationCatalog.value = undefined
  operationCatalogV2Enabled.value = true
  operationCatalogLoading.value = true
  try {
    const { data } = await getAutomationOperationCatalog(sceneId, props.projectEnvironmentId, props.executorInstanceId)
    if (requestSequence !== operationCatalogRequestSequence) return
    const catalog = normalizeOperationCatalog(data)
    if (!catalog.v2_enabled) {
      operationCatalogV2Enabled.value = false
      operationCatalog.value = undefined
      operationCatalogUnavailable.value = false
      return
    }
    if (!catalog.catalog_version || catalog.types.length === 0) throw new Error('操作目录响应为空')
    operationCatalog.value = catalog
    operationCatalogV2Enabled.value = true
    operationCatalogUnavailable.value = false
  } catch (error) {
    if (requestSequence !== operationCatalogRequestSequence) return
    // V2 目录不可用时禁止新增/修改方法，不能静默回退到旧字典或 description 推导执行语义。
    operationCatalog.value = undefined
    operationCatalogV2Enabled.value = true
    operationCatalogUnavailable.value = true
    console.warn('加载 UI 自动化操作目录失败，已禁止 V2 方法编排', error)
  } finally {
    if (requestSequence === operationCatalogRequestSequence) operationCatalogLoading.value = false
  }
}

watch(() => uiStore.activeId, () => {
  void loadOperationCatalog()
}, { immediate: true })

const catalogTypes = computed(() => operationCatalog.value?.types || [])
const catalogMethods = computed(() => catalogTypes.value.flatMap((type) => type.methods))
const isCatalogAvailable = computed(() => Boolean(operationCatalog.value))
const findCatalogType = (value: unknown): AutomationOperationType | undefined => {
  const normalized = String(value || '')
  return catalogTypes.value.find((type) => type.type_code === normalized || type.label === normalized)
}
const findCatalogMethod = (value: unknown): AutomationOperationMethod | undefined => {
  const normalized = String(value || '')
  return catalogMethods.value.find((method) => method.method_code === normalized
    || method.legacy_action === normalized
    || method.aliases?.includes(normalized))
}
const getStepConfig = (step: any, name: string) => {
  const config = Array.isArray(step?.configList) ? step.configList.find((item: any) => item?.paramsName === name) : null
  return config?.paramsValue == null ? '' : String(config.paramsValue)
}
const getSelectedCatalogMethod = (step: any): AutomationOperationMethod | undefined => {
  if (!isCatalogAvailable.value || step?.catalogConfigInvalid) return undefined
  // 录制步骤的目录方法由详情 DTO 反向解析，保存时再由后端生成新的 canonical step。
  const methodCode = step?.methodCode || getStepConfig(step, 'method_code')
  return methodCode ? findCatalogMethod(methodCode) : undefined
}
const getInfrastructureActionType = (step: any) => {
  const actionType = getSelectedCatalogMethod(step)?.action_type
  return ['server_command', 'database_sql', 'database_native'].includes(actionType || '') ? actionType : ''
}
const shouldUseInfrastructureConfig = (step: any) => Boolean(getInfrastructureActionType(step))
// GiFormModal 保存回调可能持有打开弹窗时复制的表单对象；自定义配置和状态开关会同步 modalConfig.form。
// 提交前显式取最新状态和 configList，避免父子表单的旧快照覆盖用户刚刚修改的值。
const withCurrentStepConfig = (data: any) => {
  const catalogMethod = getSelectedCatalogMethod(modalConfig.form) || getSelectedCatalogMethod(data)
  const stepData = {
    ...data,
    status: normalizeAutomationNodeStatus(modalConfig.form.status ?? data.status),
    configList: Array.isArray(modalConfig.form.configList)
      ? modalConfig.form.configList.map((item: any) => ({ ...item }))
      : [],
  }
  if (catalogMethod) {
    // operationValue 是旧 XML/Jenkins/Selenium 的兼容字段，目录方法代码只放入 configList。
    stepData.operationName = catalogMethod.label
    stepData.operationValue = catalogMethod.legacy_action
  }
  return stepData
}
const operationTypeOptions = computed(() => {
  if (isCatalogAvailable.value) {
    return catalogTypes.value
      .slice()
      .sort((left, right) => Number(left.sort || 0) - Number(right.sort || 0))
      .map((type) => ({ label: type.label, value: type.label }))
  }
  if (!operationCatalogV2Enabled.value) {
    return (operation_type.value || []).map((item: any) => ({ label: item.label, value: item.value }))
  }
  return []
})
const getOperationMethodOptions = () => {
  const operationType = modalConfig.form.operationType
  if (!operationType) return []
  if (isCatalogAvailable.value) {
    const type = findCatalogType(operationType)
    return (type?.methods || []).map((method) => ({
      label: method.label,
      value: method.method_code,
      description: method.description,
      disabled: method.authoring_enabled === false,
      disabledReason: method.disabled_reason,
    }))
  }
  if (!operationCatalogV2Enabled.value) {
    return (operation_method.value || []).filter((item: any) => !operationType || !item.type || item.type === operationType)
      .map((item: any) => ({ label: item.label, value: item.value, extra: item.extra }))
  }
  return []
}
const renderOperationMethodOption = ({ data }: { data: any }) => {
  const method = findCatalogMethod(data?.value)
  const label = String(data?.label || method?.label || '')
  const description = String(method?.description || '')
  return h('span', { class: 'operation-method-option' }, [
    h('span', label),
    description
      ? h(Tooltip, { content: description, position: 'right' }, {
        default: () => h(IconQuestionCircle, {
          class: 'operation-method-option-help',
          style: { marginLeft: '4px', color: 'var(--color-text-3)', cursor: 'help' },
          'aria-label': '方法说明',
        }),
      })
      : null,
  ])
}
const cloneMethodConfig = (value: Record<string, unknown>) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>
const parseMethodConfig = (step: any, strict = false) => {
  if (step?.methodConfig && typeof step.methodConfig === 'object' && !Array.isArray(step.methodConfig)) {
    return cloneMethodConfig(step.methodConfig)
  }
  try {
    const parsed = JSON.parse(getStepConfig(step, 'method_config') || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    if (strict) throw new Error('方法配置不是 JSON 对象')
    return {}
  }
}
const newCatalogConfigList = (method: AutomationOperationMethod, methodConfig: Record<string, unknown>, methodVersion = method.method_version) => [
  { paramsName: 'method_code', paramsValue: method.method_code },
  { paramsName: 'method_version', paramsValue: String(methodVersion) },
  { paramsName: 'method_config', paramsValue: JSON.stringify(methodConfig) },
]
const mergeCatalogConfigList = (step: any, method: AutomationOperationMethod, methodConfig: Record<string, unknown>) => {
  const catalogNames = new Set(['method_code', 'method_version', 'method_config'])
  const existing = Array.isArray(step?.configList)
    ? step.configList.filter((item: any) => item?.paramsName && !catalogNames.has(item.paramsName))
    : []
  return [
    ...existing,
    ...newCatalogConfigList(method, methodConfig, step?.methodVersion || method.method_version),
  ]
}
const clearCatalogMethodDrafts = () => {
  Object.keys(catalogMethodDrafts).forEach((methodCode) => delete catalogMethodDrafts[methodCode])
}
const cacheCurrentCatalogMethodDraft = () => {
  const currentMethod = getSelectedCatalogMethod(modalConfig.form)
  if (!currentMethod) return
  catalogMethodDrafts[currentMethod.method_code] = parseMethodConfig(modalConfig.form)
}
const applyCatalogMethod = (method: AutomationOperationMethod) => {
  cacheCurrentCatalogMethodDraft()
  const methodConfig = catalogMethodDrafts[method.method_code]
    ? cloneMethodConfig(catalogMethodDrafts[method.method_code])
    : createAutomationOperationDefaultConfig(method)
  if (!catalogMethodDrafts[method.method_code]) {
    catalogMethodDrafts[method.method_code] = cloneMethodConfig(methodConfig)
  }
  modalConfig.form.methodCode = method.method_code
  modalConfig.form.operationName = method.label
  // 选择控件使用 method_code；提交前转换为 legacy_action，保证 XML/Jenkins/Selenium 兼容字段不变。
  modalConfig.form.operationValue = method.method_code
  modalConfig.form.configList = newCatalogConfigList(method, methodConfig)
}
const normalizeCatalogStepForEdit = (step: any) => {
  const method = getSelectedCatalogMethod(step) || findCatalogMethod(step?.methodCode)
  if (!method) return step
  const type = catalogTypes.value.find((item) => item.methods.some((itemMethod) => itemMethod.method_code === method.method_code))
  let methodConfig: Record<string, unknown>
  try {
    methodConfig = mergeAutomationOperationDefaults(method, parseMethodConfig(step, true))
  } catch {
    // 损坏的历史方法配置只能只读诊断，不能用默认值覆盖原始 configList。
    return { ...step, catalogConfigInvalid: true }
  }
  catalogMethodDrafts[method.method_code] = cloneMethodConfig(methodConfig)
  return {
    ...step,
    operationType: type?.label || step.operationType,
    operationName: method.label,
    operationValue: method.method_code,
    methodCode: method.method_code,
    // 状态切换也会走完整步骤保存，必须携带录制事实，不能只提交目录方法的三个配置项。
    configList: mergeCatalogConfigList(step, method, methodConfig),
  }
}
const decorateTreeNode = (node: AutomationUiCaseTreeNode): TreeCateItem => ({
  ...node,
  popupVisible: false,
  isEdit: false,
  children: node.children?.map(decorateTreeNode),
})
const buildUiTree = (caseList: AutomationUiCase[]) => buildCaseTree(caseList).map(decorateTreeNode)
const normalizeSelectionRef = (data?: any): AutomationUiTreeNodeRef | null => {
  const node = data?.selectedNode || data?.node || data
  if (!node) return null
  const type = String(node.type || '').toUpperCase()
  const caseId = String(node.caseId || node.pid || (type === 'CASE' ? node.id : '') || '')
  if (type === 'CASE' && caseId) return { type: 'CASE', caseId }
  const stepId = String(node.stepId || node.id || '')
  if (type === 'STEP' && caseId && stepId) return { type: 'STEP', caseId, stepId }
  return null
}
const findTreeNode = (ref: AutomationUiTreeNodeRef) => {
  const caseNode = treeList.value.find(node => String(node.caseId) === String(ref.caseId))
  return ref.type === 'CASE'
    ? caseNode
    : caseNode?.children?.find(node => String(node.stepId) === String(ref.stepId))
}
const refreshTree = async (selection?: AutomationUiTreeNodeRef) => {
  if (props.refreshScene) {
    await props.refreshScene(selection)
    return
  }
  emit('get-scene-info', selection)
}
const getCreatedNodeId = (payload: any) => {
  if (typeof payload === 'string' || typeof payload === 'number') return String(payload)
  return String(payload?.stepId ?? payload?.caseId ?? payload?.id ?? '')
}
const getCaseStepCount = (caseId: string) => props.caseList
  .find((item) => String(item.id) === String(caseId))?.stepList?.length || 0
const getStepInsertMax = () => {
  const parentId = String(modalConfig.form?.pid || modalData.value?.caseId || '')
  const currentSize = getCaseStepCount(parentId)
  return modalConfig.title === '修改步骤' ? Math.max(currentSize, 1) : currentSize + 1
}
const getTreeCaseList = async (data?: any) => {
  let nodeToSelect: TreeCateItem | undefined
  let selectFirstCase = false
  try {
    loading.value = true
    // const res = await getAutomationUiScene(uiStore.activeId)
    // console.log('caseList', props.caseList)
    treeList.value = buildUiTree(props.caseList)
    // 先让树接收最新节点数据，再写入选中 key；否则新增步骤时选中状态会被旧树覆盖。
    await nextTick()
    const selection = normalizeSelectionRef(data)
    const selectedNode = selection ? findTreeNode(selection) : undefined
    if (selectedNode) {
      nodeToSelect = selectedNode
    } else if (!selectionInitialized.value) {
      selectFirstCase = true
    }
    // this.moduleId = this.treeList[0].id
    // this.moduleId = JSON.parse(localStorage.getItem('ui-store') ?? '{}').moduleId ?? this.treeList[0]?.id
  } finally {
    loading.value = false
  }
  // GiTree 在 loading 时会禁用内部 a-tree；在解除禁用后的下一帧恢复选中，确保新增节点可见且真正高亮。
  await nextTick()
  if (nodeToSelect) {
    onNodeClick({ node: nodeToSelect, selected: true })
  } else if (selectFirstCase) {
    const firstCase = treeList.value.find((item) => item.type === 'case')
    if (firstCase) onNodeClick({ node: firstCase, selected: true })
  }
}

const modalConfig = reactive({
  title: '新增用例',
  visible: ref(false),
  form: {},
  caseForm: {
    id: '', name: '', remark: '', order: 1, status: 1,
    startUrl: '', windowSizeMode: 'maximized', viewportWidth: undefined, viewportHeight: undefined,
    screenshotMode: 'standard', pageErrorCheckEnabled: 0,
  },
  stepForm: {
    pid: '',
    id: '',
    name: '',
    remark: '',
    order: 1,
    operationType: '',
    operationName: '',
    operationValue: '',
    configList: [
      {
        paramsName: '',
        paramsValue: '',
      },
    ],
    status: 1,
    // step: {
    //   pid: '',
    //   id: '',
    //   name: '',
    //   sortType: '',
    //   order: 1,
    //   itemOrder: 1,
    //   action: '',
    //   operationName: '',
    //   operationType: '',
    //   config: [
    //     {
    //       paramsName: '',
    //       paramsValue: '',
    //     },
    //   ],
    //   copyId: '',
    //   copyPid: '',
    // },
  },
  columns: [] as ColumnItem[],
  caseColumns: computed<ColumnItem[]>(() => [
    // { label: '用例ID', field: 'id', type: 'input', required: true, props: { maxLength: 64 } },
    {
      label: '用例ID',
      field: 'id',
      type: 'input',
      required: true,
      props: {
        maxLength: 64,
        onInput: (value: any) => {
          modalConfig.form.id = value
        },
      },
      disabled: () => {
        // 稳定业务 ID 不允许通过编辑表单修改；复制时不会展示该字段。
        return modalConfig.title === '修改用例'
      },
    },
    {
      label: '用例名称',
      field: 'name',
      type: 'input',
      required: true,
      props: {
        maxLength: 64,
        onInput: (value: any) => {
          modalConfig.form.name = value
        },
      },
    },
    {
      label: '序号',
      field: 'order',
      type: 'input-number',
      required: true,
      show: () => modalConfig.title === '新增用例',
      props: {
        min: 1,
        max: props.caseList.length + 1,
        precision: 0,
        mode: 'button',
        allowClear: false,
        onChange: (value: number) => {
          modalConfig.form.order = value
        },
      },
    },
    // { label: '用例备注', field: 'remark', type: 'textarea', required: false, props: { maxLength: 255, autoSize: true, allowClear: true } },
    {
      label: '用例备注',
      field: 'remark',
      span: 24,
      required: false,
      type: 'custom',
      slots: {
        default: () => h(Collapse, { class: 'remark-editor-collapse', bordered: false, destroyOnHide: true }, {
          default: () => h(CollapseItem, { key: 'remark-editor', header: '展开备注编辑器' }, {
            default: () => h(AiEditor, {
              'modelValue': modalConfig.form.remark,
              'onUpdate:modelValue': (val: any) => {
                modalConfig.form.remark = val
              },
              'readonly': false,
            }),
          }),
        }),
      },
    },
    {
      label: '状态',
      field: 'status',
      span: 24,
      type: 'switch',
      props: {
        options: status_type.value,
        type: 'round',
        checkedValue: 1,
        uncheckedValue: 2,
        checkedText: '启用',
        uncheckedText: '禁用',
        onChange: (value: any) => {
          modalConfig.form.status = value
        },
      },
    },
    {
      label: '起始地址',
      field: 'startUrl',
      span: 24,
      type: 'input',
      required: false,
      props: {
        maxLength: 2048,
        allowClear: true,
        onInput: (value: string) => {
          modalConfig.form.startUrl = value
        },
      },
    },
    {
      label: '窗口模式',
      field: 'windowSizeMode',
      type: 'select',
      required: false,
      props: {
        options: [
          { label: '最大化窗口', value: 'maximized' },
          { label: '当前视口', value: 'current' },
          { label: '自定义视口', value: 'custom' },
        ],
        onChange: (value: string) => {
          modalConfig.form.windowSizeMode = value
        },
      },
    },
    {
      label: '视口宽度',
      field: 'viewportWidth',
      type: 'input-number',
      required: true,
      show: () => modalConfig.form.windowSizeMode === 'custom',
      props: {
        min: 1,
        max: 10000,
        precision: 0,
        allowClear: false,
        onChange: (value: number) => {
          modalConfig.form.viewportWidth = value
        },
      },
    },
    {
      label: '视口高度',
      field: 'viewportHeight',
      type: 'input-number',
      required: true,
      show: () => modalConfig.form.windowSizeMode === 'custom',
      props: {
        min: 1,
        max: 10000,
        precision: 0,
        allowClear: false,
        onChange: (value: number) => {
          modalConfig.form.viewportHeight = value
        },
      },
    },
    {
      label: '截图模式',
      field: 'screenshotMode',
      type: 'select',
      required: false,
      props: {
        options: [
          { label: '标准截图', value: 'standard' },
          { label: '全屏高清', value: 'full_hd' },
        ],
        onChange: (value: string) => {
          modalConfig.form.screenshotMode = value
        },
      },
    },
    {
      label: '页面错误检查',
      field: 'pageErrorCheckEnabled',
      type: 'switch',
      props: {
        checkedValue: 1,
        uncheckedValue: 0,
        checkedText: '启用',
        uncheckedText: '禁用',
        onChange: (value: number) => {
          modalConfig.form.pageErrorCheckEnabled = value
        },
      },
    },
  ]),
  stepColumns: computed<ColumnItem[]>(() => [
    {
      label: '步骤ID',
      field: 'id',
      type: 'input',
      required: true,
      props: {
        maxLength: 64,
        onInput: (value: any) => {
          modalConfig.form.id = value
        },
      },
      disabled: () => {
        return modalConfig.title === '修改步骤' || modalConfig.title === '复制步骤'
      },
    },
    {
      label: '步骤名称',
      field: 'name',
      type: 'input',
      required: true,
      props: {
        maxLength: 64,
        onInput: (value: any) => {
          modalConfig.form.name = value
        },
      },
    },
    {
      label: '序号',
      field: 'order',
      type: 'input-number',
      required: true,
      props: {
        min: 1,
        max: getStepInsertMax(),
        precision: 0,
        mode: 'button',
        allowClear: false,
        onChange: (value: number) => {
          modalConfig.form.order = value
        },
      },
    },
    {
      label: '操作类型',
      field: 'operationType',
      span: 24,
      type: 'select',
      required: true,
      props: {
        options: operationTypeOptions.value,
        loading: operationCatalogLoading.value,
        placeholder: operationCatalogUnavailable.value ? '操作目录不可用，暂不可新增方法' : '请选择操作类型',
        allowClear: true,
        allowSearch: true,
        onChange: (value: any) => {
          cacheCurrentCatalogMethodDraft()
          modalConfig.form.operationType = value
          modalConfig.form.methodCode = ''
          modalConfig.form.operationValue = ''
          modalConfig.form.operationName = ''
          modalConfig.form.configList = []
        },
      },
    },
    {
      label: '操作方法',
      field: 'operationValue',
      span: 24,
      type: 'select',
      required: true,
      props: {
        options: computed(() => getOperationMethodOptions()),
        loading: operationCatalogLoading.value,
        placeholder: operationCatalogUnavailable.value ? '操作目录不可用，暂不可新增方法' : '请选择操作方法',
        onChange: (value: any) => {
          try {
            if (!value) {
              cacheCurrentCatalogMethodDraft()
              modalConfig.form.methodCode = ''
              modalConfig.form.operationValue = ''
              modalConfig.form.operationName = ''
              modalConfig.form.configList = []
              return
            }
            const method = getOperationMethodOptions().find((m: any) => m.value === value)
            const catalogMethod = findCatalogMethod(value)
            if (catalogMethod && isCatalogAvailable.value) {
              applyCatalogMethod(catalogMethod)
              return
            }
            modalConfig.form.methodCode = ''
            modalConfig.form.operationValue = value
            if (!operationCatalogV2Enabled.value && method?.extra) {
              // 仅在项目明确关闭 v2 时保留旧表单兼容解析；v2 目录失败不会走这里。
              const extraData = JSON.parse(method.extra)
              const description = JSON.parse(extraData.description)
              modalConfig.form.configList = description?.configList ?? []
              modalConfig.form.operationName = method.label
            } else {
              modalConfig.form.configList = []
            }
          } catch (e) {
            modalConfig.form.configList = []
          }
        },
        allowClear: true,
        allowSearch: true,
      },
      slots: {
        option: renderOperationMethodOption,
      },
    },
    {
      label: '操作步骤',
      field: 'configList',
      span: 24,
      type: 'custom',
      required: true,
      show: () => Boolean(getSelectedCatalogMethod(modalConfig.form)) && !shouldUseInfrastructureConfig(modalConfig.form),
      slots: {
        default: () => h(AutomationOperationMethodForm, {
          'method': getSelectedCatalogMethod(modalConfig.form),
          'modelValue': modalConfig.form.configList,
          'draftValue': (() => {
            const method = getSelectedCatalogMethod(modalConfig.form)
            return method ? catalogMethodDrafts[method.method_code] : undefined
          })(),
          'confirmReset': modalConfig.title === '修改步骤',
          'workbench': useStepWorkbenchLayout.value,
          'contextLabel': workbenchMethodContext.value,
          'sceneDbId': uiStore.activeId,
          'projectId': props.projectId,
          'onUpdate:modelValue': (val: any) => {
            modalConfig.form.configList = val
          },
          'onUpdate:draftValue': (val: Record<string, unknown>) => {
            const method = getSelectedCatalogMethod(modalConfig.form)
            if (method) catalogMethodDrafts[method.method_code] = cloneMethodConfig(val)
          },
        }),
      },
    },
    {
      label: '操作步骤',
      field: 'configList',
      span: 24,
      type: 'custom',
      required: true,
      show: () => Boolean(modalConfig.form.operationValue)
        && !getSelectedCatalogMethod(modalConfig.form)
        && !shouldUseInfrastructureConfig(modalConfig.form),
      slots: {
        // 未注册历史步骤保留键值诊断入口，正常目录方法不暴露内部协议字段。
        default: () => h(KeyValuePairForm, {
          'modelValue': modalConfig.form.configList,
          'addKeyValue': !operationCatalogV2Enabled.value,
          'disabled': operationCatalogV2Enabled.value,
          'onUpdate:modelValue': (val: any) => {
            modalConfig.form.configList = val
          },
          'nameColSpan': 5,
          'valueColSpan': 13,
          'actionColSpan': 2,
          'colGap': 10,
        }),
      },
    },
    {
      label: '操作步骤',
      // 目标配置仅是表单输入；真正的 canonical step 由 Admin assembler 生成。
      field: 'configList',
      span: 24,
      type: 'custom',
      required: true,
      show: () => shouldUseInfrastructureConfig(modalConfig.form),
      slots: {
        default: () => h(InfrastructureStepConfig, {
          'modelValue': modalConfig.form.configList,
          'onUpdate:modelValue': (value: any) => {
            modalConfig.form.configList = value
          },
          'actionType': getInfrastructureActionType(modalConfig.form),
          'methodCode': getSelectedCatalogMethod(modalConfig.form)?.method_code,
          'methodVersion': getSelectedCatalogMethod(modalConfig.form)?.method_version,
          'projectId': props.projectId,
          'onGoTargetConfig': goInfrastructureTargetConfig,
        }),
      },
    },
    // { label: '步骤备注', field: 'remark', type: 'textarea', required: false, props: { maxLength: 255, autoSize: true, allowClear: true } },
    {
      label: '步骤备注',
      field: 'remark',
      span: 24,
      required: false,
      type: 'custom',
      slots: {
        default: () => h(Collapse, { class: 'remark-editor-collapse', bordered: false, destroyOnHide: true }, {
          default: () => h(CollapseItem, { key: 'remark-editor', header: '展开备注编辑器' }, {
            default: () => h(AiEditor, {
              'modelValue': modalConfig.form.remark,
              'onUpdate:modelValue': (value: any) => {
                modalConfig.form.remark = value
              },
              'readonly': false,
            }),
          }),
        }),
      },
    },
    {
      label: '状态',
      field: 'status',
      span: 24,
      type: 'switch',
      props: {
        options: status_type.value,
        type: 'round',
        checkedValue: 1,
        uncheckedValue: 2,
        checkedText: '启用',
        uncheckedText: '禁用',
        onChange: (value: any) => {
          // GiFormModal 使用本地表单副本，状态必须同步到父表单，避免深度监听恢复旧值。
          modalConfig.form.status = normalizeAutomationNodeStatus(value)
        },
      },
    },
  ]),
  width: 'min(1000px, calc(100vw - 24px))',
  maskClosable: true,
  escToClose: true,
  draggable: true,
  clear: ref(false),
})

type StepEditorLayout = 'standard' | 'workbench'

const stepEditorLayout = ref<StepEditorLayout>('standard')
const stepWorkbenchTab = ref<'parameters' | 'remark'>('parameters')
const workbenchStepInfoFormRef = ref<any>()
const workbenchOperationFormRef = ref<any>()
const workbenchOptionFormRef = ref<any>()
const workbenchParameterFormRef = ref<any>()
const stepEditorTitles = new Set(['新增步骤', '修改步骤', '复制步骤'])
const isStepEditorModal = computed(() => stepEditorTitles.has(modalConfig.title))
const useStepWorkbenchLayout = computed(() => isStepEditorModal.value && stepEditorLayout.value === 'workbench')
const stepEditorModalWidth = computed(() => useStepWorkbenchLayout.value
  ? 'min(1160px, calc(100vw - 24px))'
  : modalConfig.width)

const workbenchStepInfoColumns = computed<ColumnItem[]>(() => (modalConfig.stepColumns as ColumnItem[])
  .filter((column) => ['id', 'name', 'order'].includes(String(column.field))))
const workbenchOperationColumns = computed<ColumnItem[]>(() => (modalConfig.stepColumns as ColumnItem[])
  .filter((column) => ['operationType', 'operationValue'].includes(String(column.field))))
const workbenchOptionColumns = computed<ColumnItem[]>(() => ['status']
  .map((field) => {
    const column = (modalConfig.stepColumns as ColumnItem[]).find((item) => item.field === field)
    if (!column) return undefined
    return {
      ...column,
      formItemProps: {
        ...column.formItemProps,
        class: `step-workbench-option-field step-workbench-${field}-field`,
      } as ColumnItem['formItemProps'],
    }
  })
  .filter((column): column is ColumnItem => Boolean(column)))
// 复用标准版式的 configList 动态渲染器，确保目录新增方法或字段后两种版式同步生效。
const workbenchParameterColumns = computed<ColumnItem[]>(() => (modalConfig.stepColumns as ColumnItem[])
  .filter((column) => column.field === 'configList')
  .map((column) => ({
    ...column,
    formItemProps: { ...column.formItemProps, hideLabel: true },
  })))

const workbenchMethodTitle = computed(() => {
  const method = getSelectedCatalogMethod(modalConfig.form)
  return method?.label || String(modalConfig.form.operationName || '').trim()
})
const workbenchMethodContext = computed(() => {
  const operationType = String(modalConfig.form.operationType || '').trim()
  return operationType || '请选择操作类型和操作方法'
})
const workbenchShowStandaloneMethodHeader = computed(() => Boolean(workbenchMethodTitle.value)
  && (!getSelectedCatalogMethod(modalConfig.form) || shouldUseInfrastructureConfig(modalConfig.form)))

const changeStepEditorLayout = (layout: StepEditorLayout) => {
  if (layout === 'workbench') stepWorkbenchTab.value = 'parameters'
  stepEditorLayout.value = layout
}

const updateWorkbenchRemark = (form: Record<string, any>, value: string) => {
  form.remark = value
  modalConfig.form.remark = value
}

watch(() => modalConfig.visible, (visible) => {
  if (visible && isStepEditorModal.value) stepWorkbenchTab.value = 'parameters'
})

const validateStepWorkbenchForm = async () => {
  if (!useStepWorkbenchLayout.value) return true
  const formRefs = [
    workbenchStepInfoFormRef,
    workbenchOperationFormRef,
    workbenchOptionFormRef,
    workbenchParameterFormRef,
  ]
  const validationResults = await Promise.all(formRefs.map((formRef) => formRef.value?.formRef?.validate()))
  if (validationResults.some(Boolean)) {
    Message.warning('请检查必填项')
    return false
  }
  return true
}

const goInfrastructureTargetConfig = async (kind : 'server' | 'database') => {
  modalConfig.visible = false
  await router.push(kind ==='server'
    ? {
      path: '/project/serverConfig',
      query: { projectId: String(props.projectId || '')},
    }
    : {
      path: '/project/dataBaseConfig',
      query: { projectId: String(props.projectId || '') },
    })
  // await router.push({
  //   path: '/project/environmentConfig',
  //   query: { projectId: String(props.projectId || '') },
  // })
}

const validateInfrastructureTargetForSave = (step: any) => {
  const actionType = getInfrastructureActionType(step)
  if (!actionType) return true
  try {
    const methodConfig = JSON.parse(getStepConfig(step, 'method_config') || '{}')
    const targetRef = methodConfig?.target_ref
    const expectedKind = actionType === 'server_command' ? 'server' : 'database'
    const slotId = Number(targetRef?.slot_id)
    if (targetRef?.scope !== 'project_environment' || targetRef?.kind !== expectedKind
      || !Number.isInteger(slotId) || slotId <= 0) {
      Message.warning(`请选择有效的${expectedKind === 'server' ? '服务器角色' : '数据库角色'}`)
      return false
    }
    return true
  } catch {
    Message.warning('基础设施目标配置无效，请重新选择目标')
    return false
  }
}

const materializeCatalogMethodConfig = (step: any) => {
  const method = getSelectedCatalogMethod(step)
  if (!method) return step
  const parsed = JSON.parse(getStepConfig(step, 'method_config') || '{}')
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('方法配置不是 JSON 对象')
  const methodConfig = normalizeAutomationOperationConfig(method, parsed)
  return {
    ...step,
    configList: step.configList.map((item: any) => item?.paramsName === 'method_config'
      ? { ...item, paramsValue: JSON.stringify(methodConfig) }
      : item),
  }
}

const validateCatalogMethodForSave = (step: any) => {
  const method = getSelectedCatalogMethod(step)
  if (!method) return true
  const parsed = JSON.parse(getStepConfig(step, 'method_config') || '{}')
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('方法配置不是 JSON 对象')
  const message = validateAutomationOperationConfig(method, parsed)
  if (!message) return true
  Message.warning(message)
  return false
}

const buildStepEditFields = (stepData: any): Omit<AutomationUiStepEditReq, 'pid' | 'id' | 'expectedDefinitionVersion'> => {
  const methodCode = getStepConfig(stepData, 'method_code')
  const parsed = JSON.parse(getStepConfig(stepData, 'method_config') || '{}')
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('方法配置不是 JSON 对象')
  return {
    order: stepData.order == null ? undefined : Number(stepData.order),
    name: stepData.name,
    remark: stepData.remark,
    status: stepData.status,
    operationType: stepData.operationType,
    operationName: stepData.operationName,
    operationValue: stepData.operationValue,
    methodCode: methodCode || undefined,
    methodVersion: Number(getStepConfig(stepData, 'method_version')) || undefined,
    methodConfig: parsed,
    configList: Array.isArray(stepData.configList)
      ? stepData.configList.map((item: any) => ({
          paramsName: String(item?.paramsName || ''),
          paramsValue: item?.paramsValue == null ? '' : String(item.paramsValue),
        }))
      : [],
  }
}

const buildCaseExecutionConfig = (data: any) => {
  const customViewport = data.windowSizeMode === 'custom'
  const config = {
    startUrl: data.startUrl || undefined,
    windowSizeMode: data.windowSizeMode || undefined,
    viewportWidth: customViewport ? Number(data.viewportWidth) : undefined,
    viewportHeight: customViewport ? Number(data.viewportHeight) : undefined,
    screenshotMode: data.screenshotMode || undefined,
    pageErrorCheckEnabled: data.pageErrorCheckEnabled == null ? undefined : Number(data.pageErrorCheckEnabled),
  }
  // 编辑时允许用户清空全部覆盖值，因此空对象也必须发送，不能被解释为“保持旧配置”。
  return config
}

const validateCaseExecutionConfig = (data: any) => {
  if (data.windowSizeMode !== 'custom') return true
  const width = Number(data.viewportWidth)
  const height = Number(data.viewportHeight)
  if (Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0) return true
  Message.warning('自定义视口必须填写有效的宽度和高度')
  return false
}

const flattenCaseExecutionConfig = (detail: any) => {
  const config = detail?.executionConfig || {}
  return {
    ...detail,
    startUrl: config.startUrl || '',
    windowSizeMode: config.windowSizeMode || 'maximized',
    viewportWidth: config.viewportWidth ?? undefined,
    viewportHeight: config.viewportHeight ?? undefined,
    screenshotMode: config.screenshotMode || 'standard',
    pageErrorCheckEnabled: Number(config.pageErrorCheckEnabled ?? 0),
  }
}

const handleSave = async (data: any) => {
  if (props.readonly) {
    Message.warning('当前为只读模式，无法修改')
    return false
  }
  console.warn('handleSave', data)
  // console.log(modalData.value)
  let selection: AutomationUiTreeNodeRef | undefined
  try {
    mutationLoading.value = true
    if (modalConfig.title === '新增用例') {
      const currentCaseData = { ...data, ...modalConfig.form }
      if (!validateCaseExecutionConfig(currentCaseData)) return false
      const { startUrl, windowSizeMode, viewportWidth, viewportHeight, screenshotMode, pageErrorCheckEnabled, ...caseData } = currentCaseData
      const response = await addCase({ ...caseData, type: 'case', executionConfig: buildCaseExecutionConfig({ startUrl, windowSizeMode, viewportWidth, viewportHeight, screenshotMode, pageErrorCheckEnabled }), expectedDefinitionVersion: props.definitionVersion }, uiStore.activeId)
      currentCaseData.id = response.data || currentCaseData.id
      selection = { type: 'CASE', caseId: String(currentCaseData.id) }
      Message.success('新增成功')
    } else if (modalConfig.title === '修改用例') {
      const source = nodeRefOf(modalData.value)
      const currentCaseData = { ...data, ...modalConfig.form }
      if (!validateCaseExecutionConfig(currentCaseData)) return false
      await updateAutomationUiCaseDetail(uiStore.activeId, source.caseId, {
        name: currentCaseData.name,
        remark: currentCaseData.remark,
        status: currentCaseData.status,
        executionConfig: buildCaseExecutionConfig(currentCaseData),
        expectedDefinitionVersion: props.definitionVersion,
      })
      selection = source
      Message.success('修改成功')
    } else if (modalConfig.title === '复制用例') {
      const source = nodeRefOf(modalData.value)
      const response = await copyCaseTree({ source, name: data.name, remark: data.remark, position: source.type === 'CASE' ? 'LAST' : 'INSIDE_LAST', anchor: source.type === 'STEP' ? { type: 'CASE', caseId: source.caseId } : undefined, expectedDefinitionVersion: props.definitionVersion }, uiStore.activeId)
      if (response.data?.changed) {
        selection = response.data.selectedNode || undefined
        Message.success('复制成功')
      }
    } else if (modalConfig.title === '新增步骤') {
      let stepData = withCurrentStepConfig(data)
      try {
        stepData = materializeCatalogMethodConfig(stepData)
      } catch {
        Message.warning('方法配置不是合法 JSON')
        return false
      }
      if (!validateCatalogMethodForSave(stepData)) return false
      if (!validateInfrastructureTargetForSave(stepData)) return false
      const res = await addStep({
        ...stepData,
        expectedDefinitionVersion: props.definitionVersion,
        // operationType: automation_operation_type.value.find((item: any) => item.value === data.operationType)?.label,
        type: 'step',
      }, uiStore.activeId)
      data.id = getCreatedNodeId(res.data)
      // GiFormModal 会复制表单对象；保存时优先取提交数据，缺失时回退到打开菜单时的父节点。
      const caseId = String(data.pid || modalData.value?.caseId || '')
      if (!caseId || !data.id) throw new Error('新增步骤后未取得可定位的节点标识')
      selection = { type: 'STEP', caseId, stepId: data.id }
      Message.success('新增成功')
    } else if (modalConfig.title === '修改步骤') {
      const source = nodeRefOf(modalData.value)
      let stepData = withCurrentStepConfig(data)
      let stepEditFields: ReturnType<typeof buildStepEditFields>
      try {
        stepData = materializeCatalogMethodConfig(stepData)
        stepEditFields = buildStepEditFields(stepData)
      } catch {
        Message.warning('方法配置不是合法 JSON')
        return false
      }
      if (!validateCatalogMethodForSave(stepData)) return false
      if (!validateInfrastructureTargetForSave(stepData)) return false
      await updateAutomationUiStepDetail(uiStore.activeId, source.caseId, source.stepId, {
        ...stepEditFields,
        expectedDefinitionVersion: props.definitionVersion,
      })
      selection = source
      Message.success('修改成功')
    } else if (modalConfig.title === '复制步骤') {
      const source = nodeRefOf(modalData.value)
      let stepData = withCurrentStepConfig(data)
      let stepEditFields: ReturnType<typeof buildStepEditFields>
      try {
        stepData = materializeCatalogMethodConfig(stepData)
        stepEditFields = buildStepEditFields(stepData)
      } catch {
        Message.warning('方法配置不是合法 JSON')
        return false
      }
      if (!validateCatalogMethodForSave(stepData)) return false
      if (!validateInfrastructureTargetForSave(stepData)) return false
      const response = await copyCaseTree({
        source,
        name: stepEditFields.name,
        remark: stepEditFields.remark,
        step: {
          order: stepEditFields.order,
          name: stepEditFields.name,
          remark: stepEditFields.remark,
          status: stepEditFields.status,
          operationType: stepEditFields.operationType,
          operationName: stepEditFields.operationName,
          operationValue: stepEditFields.operationValue,
          configList: stepEditFields.configList,
        },
        position: 'INSIDE_LAST',
        anchor: { type: 'CASE', caseId: source.caseId },
        expectedDefinitionVersion: props.definitionVersion,
      }, uiStore.activeId)
      if (response.data?.changed) {
        selection = response.data.selectedNode || undefined
        Message.success('复制成功')
      }
    }
    if (selection) await refreshTree(selection)
  } catch (error) {
    console.error(error)
    return false
  } finally {
    mutationLoading.value = false
  }
}
const handleClose = () => {
  // console.log('handleClose')
  clearCatalogMethodDrafts()
  modalConfig.visible = false
}

const onNodeClick = (data?: any) => {
  // console.warn('onNodeClick', data)
  const node = data?.node || data
  if (data?.selected === false || !node) {
    selectionInitialized.value = true
    selectedKeys.value = []
    emit('selection-clear')
    return
  }
  selectionInitialized.value = true
  selectedKeys.value = [node.treeKey]
  if (node.type === 'step') {
    emit('get-step', { node: { ...findNodeDetail(props.caseList, nodeRefOf(node)), pid: node.caseId, id: node.stepId, type: 'step' } })
  } else if (node.type === 'case') {
    emit('get-case', node.caseId)
  }
}
const clearSelection = () => {
  selectionInitialized.value = true
  selectedKeys.value = []
  checkedKeys.value = []
  emit('selection-clear')
}
const selectNode = (ref: AutomationUiTreeNodeRef) => {
  const node = findTreeNode(ref)
  if (node) onNodeClick({ node, selected: true })
}
const exitBatchDeleteMode = () => {
  checkedKeys.value = []
  selectionMode.value = 'single'
}
const onNodeDrop = async (data?: any) => {
  if (props.readonly) {
    Message.warning('当前为只读模式，无法拖拽')
    return false
  }
  if (!data?.dragNode || !data?.dropNode || mutationLoading.value) return false
  const position = toMovePosition(data.dropPosition)
  if (!position || !canDrop(data.dragNode, data.dropNode, data.dropPosition)) return false
  try {
    mutationLoading.value = true
    const response = await moveCaseTree({ source: nodeRefOf(data.dragNode), target: nodeRefOf(data.dropNode), position, expectedDefinitionVersion: props.definitionVersion }, uiStore.activeId)
    if (response.data?.changed) {
      await refreshTree(response.data.selectedNode || undefined)
      Message.success('移动成功')
    }
  } catch (error) {
    console.error(error)
    return false
  } finally { mutationLoading.value = false }
}

const canDrop = (source: TreeCateItem, target: TreeCateItem, position: number) => !props.readonly && !mutationLoading.value && selectionMode.value !== 'batch-delete' && canDropCaseTreeNode(source, target, position)

const getMoveTargetTree = (sourceData: any): TreeCateItem[] => {
  const source = (sourceData?.node || sourceData) as TreeCateItem
  if (!source) return []
  if (source.type === 'case') {
    return treeList.value
      .filter(node => node.type === 'case' && node.treeKey !== source.treeKey)
      .map(node => ({ ...node, children: [] }))
  }
  return treeList.value.map(node => ({
    ...node,
    children: node.children?.filter(child => child.treeKey !== source.treeKey),
  }))
}

const editMethod = ref('弹窗编辑')
const getRecordingMenuOptions = (node: any) => {
  const currentNode = node?.node || node?.data || node
  const nodeKey = currentNode?.treeKey || currentNode?.key
  const nodeType = (typeof nodeKey === 'string' && nodeKey.startsWith('step:') ? 'step' : '')
    || (typeof nodeKey === 'string' && nodeKey.startsWith('case:') ? 'case' : '')
    || currentNode?.type
    || (Array.isArray(currentNode?.children) ? 'case' : currentNode?.pid ? 'step' : '')
  if (nodeType === 'case') {
    return [
      { label: '追加用例', mode: 'recording:appendCase' },
      { label: '替换用例', mode: 'recording:replaceCase' },
      { label: '追加步骤', mode: 'recording:appendStep' },
      { label: '替换步骤', mode: 'recording:replaceStep' },
    ]
  }
  if (nodeType === 'step') {
    return [
      { label: '追加步骤', mode: 'recording:appendStep' },
      { label: '替换步骤', mode: 'recording:replaceStep' },
    ]
  }
  return []
}

const getExecutionMenuOptions = (node: any) => {
  const currentNode = node?.node || node?.data || node
  if (nodeRefOf(currentNode).type !== 'CASE') return []
  return executionTypeOptions.map((item) => ({ label: item.label, mode: `execute:${item.value}` }))
}

const onMenuClick = async (data?: any) => {
  if (typeof data?.mode === 'string' && data.mode.startsWith('execute:')) {
    if (props.executionRunning) {
      Message.warning('已有用例正在执行，请等待当前任务结束')
      return false
    }
    const source = nodeRefOf(data.node)
    if (source.type !== 'CASE') return false
    emit('execute-case', {
      caseId: source.caseId,
      executionType: data.mode.slice('execute:'.length),
    })
    return true
  }
  if (props.readonly) {
    Message.warning('当前为只读模式，无法修改')
    return false
  }
  if (mutationLoading.value) return false
  console.warn('onMenuClick', data)
  try {
    if (typeof data?.mode === 'string' && data.mode.startsWith('recording:')) {
      emit('recording', {
        mode: data.mode.slice('recording:'.length),
        node: data.node,
      })
      return true
    }
    switch (data.mode) {
      case 'add':
        if (data.node?.type === 'step') return Message.warning('当前节点不能添加步骤')
        clearCatalogMethodDrafts()
        modalConfig.title = data.node?.type === 'case' ? '新增步骤' : '新增用例'
        modalConfig.columns = data.node?.type === 'case' ? modalConfig.stepColumns : modalConfig.caseColumns
        modalConfig.visible = true
        // modalConfig.clear = true
        modalConfig.form = data.node?.type === 'case'
          ? {
              ...modalConfig.stepForm,
              pid: data.node.caseId,
              id: `CASE_STEP_`,
              order: (findNodeDetail(props.caseList, nodeRefOf(data.node)) as any)?.stepList?.length + 1,
            }
          : {
              ...modalConfig.caseForm,
              id: `SCENE_CASE_`,
              order: props.caseList.length + 1,
              stepList: [],
            }
        modalData.value = data.node
        break
      case 'edit':
        modalConfig.title = data.node?.type === 'case' ? '修改用例' : '修改步骤'
        if (editMethod.value === '弹窗编辑') {
          clearCatalogMethodDrafts()
          modalConfig.columns = data.node?.type === 'case' ? modalConfig.caseColumns : modalConfig.stepColumns
          modalConfig.visible = true
          let detail = findNodeDetail(props.caseList, nodeRefOf(data.node)) as any
          if (data.node?.type === 'case') {
            try {
              detail = (await getAutomationUiCaseDetail(uiStore.activeId, data.node.caseId)).data || detail
            } catch (error) {
              console.warn('获取用例统一详情失败，使用树节点数据', error)
            }
          } else {
            try {
              detail = (await getAutomationUiStepDetail(uiStore.activeId, data.node.caseId, data.node.stepId)).data || detail
            } catch (error) {
              console.warn('获取步骤统一详情失败，使用树节点数据', error)
            }
          }
          modalConfig.form = data.node?.type === 'case'
            ? flattenCaseExecutionConfig(detail)
            : normalizeCatalogStepForEdit({ ...detail })
          modalConfig.form.id = data.node?.type === 'case' ? data.node.caseId : data.node?.stepId
          modalConfig.form.status = normalizeAutomationNodeStatus(detail?.status)
          modalData.value = data.node
        }
        break
      case 'copy':
        modalConfig.title = data.node?.type === 'case' ? '复制用例' : '复制步骤'
        if (editMethod.value === '弹窗编辑') {
          clearCatalogMethodDrafts()
          // 复制步骤与修改步骤共用字段和后端组装规则，但稳定步骤 ID 仍由服务端重新生成。
          modalConfig.columns = data.node?.type === 'case'
            ? modalConfig.caseColumns.filter((column: ColumnItem) => column.field === 'name' || column.field === 'remark')
            : modalConfig.stepColumns
          modalConfig.visible = true
          let detail = findNodeDetail(props.caseList, nodeRefOf(data.node)) as any
          if (data.node?.type === 'step') {
            try {
              detail = (await getAutomationUiStepDetail(uiStore.activeId, data.node.caseId, data.node.stepId)).data || detail
            } catch (error) {
              console.warn('获取步骤统一详情失败，使用树节点数据', error)
            }
          }
          if (data.node?.type === 'case') {
            modalConfig.form = { name: detail?.name, remark: detail?.remark, type: data.node.type }
          } else {
            const copyForm = normalizeCatalogStepForEdit({
              ...detail,
              id: data.node.stepId,
              status: normalizeAutomationNodeStatus(detail?.status),
            })
            // 复制步骤默认仍追加到末尾，只有用户主动调整序号时才改变插入位置。
            copyForm.order = getCaseStepCount(data.node.caseId) + 1
            modalConfig.form = copyForm
          }
          modalData.value = data.node
        }
        break
      case 'delete': {
        const nodes = selectionMode.value === 'batch-delete'
          ? checkedKeys.value.map(key => treeList.value.flatMap(item => [item, ...(item.children || [])]).find(item => item.treeKey === key)).filter(Boolean)
          : Array.isArray(data.node) ? data.node : [data.node]
        mutationLoading.value = true
        const response = await deleteCaseTree({ nodes: nodes.map((item: TreeCateItem) => nodeRefOf(item)), expectedDefinitionVersion: props.definitionVersion }, uiStore.activeId)
        if (response.data?.changed) {
          const selected = response.data.selectedNode
          await refreshTree(selected || undefined)
          Message.success('删除成功')
        }
        mutationLoading.value = false
        checkedKeys.value = []
        selectionMode.value = 'single'
        break
      }
      case 'delete2':
        selectionMode.value = 'batch-delete'
        // 从右键节点进入批量删除时，先勾选当前节点，避免用户重复定位一次目标。
        checkedKeys.value = data.node?.treeKey ? [data.node.treeKey] : []
        break
      case 'move':
        // 目标节点由右键菜单内的原有树选择器传回，不能在这里打开额外弹窗。
        break
    }
    return true
  } catch (error) {
    console.error(error)
    return false
  } finally {
    mutationLoading.value = false
  }
}
const onTreeNodeClick = (data?: any) => {
  if (!data?.dragNode || !data?.dropNode) return
  // 原交互只选择目标节点，没有位置选择器：用例/步骤目标默认插入其后；
  // 步骤选择用例时仍表示移入该用例末尾。
  const source = data.dragNode as TreeCateItem
  const target = data.dropNode as TreeCateItem
  const dropPosition = source.type === 'step' && target.type === 'case' ? 0 : 1
  if (!canDrop(source, target, dropPosition)) {
    Message.warning('当前节点不能移动到所选目标位置')
    return
  }
  onNodeDrop({ ...data, dropPosition })
}

defineExpose({
  onMenuClick,
  getTreeCaseList,
  clearSelection,
  selectNode,
})
</script>

<script lang="tsx">
export default {}
</script>

<style scoped lang="scss">
:deep(.gi-tree) {
  height: 100%;
}
:deep(.gi-tree__search){
  // height: 11%;
  margin: 0px 0 10px 0;
}
:deep(.gi-tree__tree){
  // height: 11%;
  margin-bottom: 10px;
}

:global(.remark-editor-collapse .arco-collapse-item-content) {
  padding-right: 0;
  padding-left: 0;
}

.automation-step-modal-title {
  position: relative;
  width: 100%;
  min-width: 0;
  text-align: center;
}

.step-layout-switcher {
  position: absolute;
  top: 50%;
  right: 32px;
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 6px;
  background: var(--color-fill-2);
  transform: translateY(-50%);
}

.step-layout-switcher :deep(.arco-btn) {
  width: 30px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 4px !important;
  color: var(--color-text-3);
  background: transparent;
}

.step-layout-switcher :deep(.step-layout-button--active) {
  color: rgb(var(--primary-6));
  background: var(--color-bg-1);
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

:global(.automation-step-workbench-body) {
  width: 100%;
  height: min(78vh, 780px);
  max-height: calc(100vh - 136px) !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.automation-step-workbench {
  display: grid;
  grid-template-columns: minmax(320px, 34%) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.step-workbench-sidebar,
.step-workbench-main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.step-workbench-sidebar {
  padding: 24px 26px;
  border-right: 1px solid var(--color-border-2);
  background: var(--color-fill-1);
}

.step-workbench-main {
  padding: 24px 30px;
  overflow: hidden;
  background: var(--color-bg-1);
}

.step-workbench-tabs {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.step-workbench-tabs :deep(.arco-tabs-nav) {
  flex: 0 0 auto;
}

.step-workbench-tabs :deep(.arco-tabs-nav-tab) {
  justify-content: flex-start;
}

.step-workbench-tabs :deep(.arco-tabs-tab-active) {
  font-weight: 600;
}

.step-workbench-tabs :deep(.arco-tabs-content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.step-workbench-tabs :deep(.arco-tabs-content-list),
.step-workbench-tabs :deep(.arco-tabs-pane) {
  height: 100%;
  min-height: 0;
}

.step-workbench-tab-pane {
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
}

.step-workbench-parameter-pane {
  padding-top: 16px;
  padding-right: 4px;
  overflow: auto;
}

.step-workbench-remark-pane {
  padding-top: 16px;
  overflow: hidden;
}

.step-workbench-remark-pane :deep(.container--compact) {
  height: 100%;
  min-height: 320px;
}

.step-workbench-section + .step-workbench-section {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-2);
}

.step-workbench-section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 0 14px;
  color: var(--color-text-1);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.step-workbench-section-title > span {
  width: 3px;
  height: 15px;
  border-radius: 2px;
  background: rgb(var(--primary-6));
}

.step-workbench-main-header {
  margin-bottom: 0;
}

.step-workbench-method-identity {
  display: flex;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-2);
  flex-direction: column;
}

.step-workbench-method-identity strong {
  color: var(--color-text-1);
  font-size: 18px;
  line-height: 28px;
}

.step-workbench-method-identity p,
.step-workbench-method-empty {
  margin: 0;
  overflow: hidden;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-workbench-method-empty {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-2);
}

.automation-step-workbench :deep(.gi-form > .w-full) {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.automation-step-workbench :deep(.arco-form-item) {
  margin-bottom: 14px;
}

.automation-step-workbench :deep(.arco-form-item-label-col) {
  margin-bottom: 6px;
}

.automation-step-workbench :deep(.arco-form-item-label-col > label) {
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 500;
}

.step-workbench-section--options :deep(.arco-form-item:last-child) {
  margin-bottom: 0;
}

.step-workbench-section--options :deep(.step-workbench-status-field) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex-flow: row nowrap;
  margin-bottom: 16px;
}

.step-workbench-section--options :deep(.step-workbench-status-field .arco-form-item-label-col) {
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
}

.step-workbench-section--options :deep(.step-workbench-status-field .arco-form-item-content-wrapper) {
  flex: 0 0 auto;
  width: auto;
  margin-left: auto;
}

@media (max-width: 768px) {
  :global(.automation-step-workbench-body) {
    height: min(78vh, 780px);
    overflow: auto !important;
  }

  .automation-step-workbench {
    display: block;
    height: auto;
  }

  .step-workbench-sidebar,
  .step-workbench-main {
    overflow: visible;
  }

  .step-workbench-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--color-border-2);
  }

  .step-workbench-main {
    min-height: 420px;
  }

  .step-workbench-tabs,
  .step-workbench-tabs :deep(.arco-tabs-content),
  .step-workbench-tabs :deep(.arco-tabs-content-list),
  .step-workbench-tabs :deep(.arco-tabs-pane) {
    height: auto;
  }

  .step-workbench-remark-pane {
    height: 360px;
  }
}
// :deep(.arco-select-view-input ){
//   font-size: 13px !important;
// }
// :deep(.arco-select-view-value){
//   font-size: 13px !important;
// }
// :deep(.gi-page-layout__body) {
//   padding: 16px 0px 16px 0px !important;
//   flex-direction: row;
// }
// :deep(.gi-page-layout--margin){
//   margin: 0;
// }
// :deep(.arco-modal) {
//   left: 50% !important;
//   top: 50% !important;
//   transform: translate(-50%, -50%) !important;
//   margin: 0 !important;
// }
</style>
