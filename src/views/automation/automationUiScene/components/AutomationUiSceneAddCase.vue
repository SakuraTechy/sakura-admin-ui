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
        @on-menu-item-click="mode => onMenuItemClick(mode, node)"
        @on-tree-node-click="onTreeNodeClick"
      />
    </template>
  </GiTree>
  <!-- 测试阶段批量删除采用父子级联：勾选最上层用例时自动勾选全部步骤。 -->
  <GiFormModal
    max-body-height="80vh"
    v-model:visible="modalConfig.visible"
    v-model:form="modalConfig.form"
    :title="modalConfig.title"
    :columns="modalConfig.columns"
    :width="modalConfig.width"
    :mask-closable="modalConfig.maskClosable"
    :esc-to-close="modalConfig.escToClose"
    :draggable="modalConfig.draggable"
    :clear="modalConfig.clear"
    :on-save="handleSave"
    @save="handleSave"
    @close="handleClose"
  />
</template>

<script setup lang="tsx">
import { computed, defineEmits, defineProps, h, nextTick, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import GiMenu from '@/components/GiMenu/index.vue'
import { type AutomationUiCase, type AutomationUiTreeNodeRef, addCase, addStep, copyCaseTree, deleteCaseTree, moveCaseTree, updateCase, updateStep } from '@/apis/automation/automationUiScene'
import { buildCaseTree, canDropCaseTreeNode, findNodeDetail, nodeRefOf, normalizeAutomationNodeStatus, toMovePosition, type AutomationUiCaseTreeNode } from '../caseTree'
import { useUiStore } from '@/stores/modules/uiStore'
import type { ColumnItem } from '@/components/GiForm'
import { useDict } from '@/hooks/app'
import AiEditor from '@/components/GiEditor/AiEditor.vue'
import KeyValuePairForm from '@/components/KeyValuePairForm'

defineOptions({ name: 'AutomationUiSceneAddCase' })

const props = defineProps<{
  caseList: AutomationUiCase[]
  definitionVersion: number
  readonly?: boolean
  refreshScene?: (selection?: AutomationUiTreeNodeRef) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'get-scene-info', data?: any): void
  (e: 'get-case', data?: any): void
  (e: 'get-step', data?: any): void
  (e: 'selection-clear'): void
  (e: 'recording', data: { mode: string, node: any }): void
}>()

const { status_type, automation_operation_type, automation_operation_method } = useDict('status_type', 'automation_operation_type', 'automation_operation_method')

const uiStore = useUiStore()

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
const getStepInsertMax = () => {
  const parentId = String(modalConfig.form?.pid || modalData.value?.caseId || '')
  const parent = props.caseList.find(item => String(item.id) === parentId)
  return (parent?.stepList?.length || 0) + 1
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
  caseForm: { id: '', name: '', remark: '', order: 1, status: 1 },
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
        default: () => h(AiEditor, {
          'modelValue': modalConfig.form.remark,
          'onUpdate:modelValue': (val: any) => {
            modalConfig.form.remark = val
          },
          'readonly': true,
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
        return modalConfig.title === '修改步骤'
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
      show: () => modalConfig.title === '新增步骤',
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
    // { label: '步骤备注', field: 'remark', type: 'textarea', required: false, props: { maxLength: 255, autoSize: true, allowClear: true } },
    {
      label: '步骤备注',
      field: 'remark',
      span: 24,
      required: false,
      type: 'custom',
      slots: {
        default: () => h(AiEditor, {
          'modelValue': modalConfig.form.remark,
          'onUpdate:modelValue': (value: any) => {
            modalConfig.form.remark = value
          },
          'readonly': true,
        }),
      },
    },
    {
      label: '操作类型',
      field: 'operationType',
      span: 24,
      type: 'select',
      required: true,
      props: {
        options: automation_operation_type.value,
        allowClear: true,
        allowSearch: true,
        onChange: (value: any) => {
          console.warn(modalConfig.form)
          modalConfig.form.operationType = value
          modalConfig.form.operationValue = ''
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
        options: computed(() => {
          const operationType = modalConfig.form.operationType
          if (!operationType) return []
          const selectedType = automation_operation_type.value.find((item: any) => item.value === operationType || item.label === operationType)
          const compareType = selectedType ? selectedType.label : operationType
          return automation_operation_method.value.filter((method: any) => {
            try {
              if (!method.extra) return false
              const extraData = JSON.parse(method.extra)
              const description = JSON.parse(extraData.description)
              return description.type === compareType
            } catch (e) {
              return false
            }
          })
        }),
        onChange: (value: any) => {
          modalConfig.form.operationValue = value
          try {
            const method = automation_operation_method.value.find((m: any) => m.value === value)
            if (method && method.extra) {
              const extraData = JSON.parse(method.extra)
              const description = JSON.parse(extraData.description)
              modalConfig.form.configList = description?.configList ?? []
              modalConfig.form.operationName = method.label
              console.warn(modalConfig.form.operationType)
              console.warn(modalConfig.form.operationName)
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
    },
    {
      label: '操作步骤',
      field: 'configList',
      span: 24,
      type: 'custom',
      required: true,
      slots: {
        default: () => h(KeyValuePairForm, {
          'modelValue': modalConfig.form.configList,
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
      },
    },
  ]),
  width: 1000,
  maskClosable: true,
  escToClose: true,
  draggable: true,
  clear: ref(false),
})

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
      const response = await addCase({ ...data, type: 'case', expectedDefinitionVersion: props.definitionVersion }, uiStore.activeId)
      data.id = response.data || data.id
      selection = { type: 'CASE', caseId: String(data.id) }
      Message.success('新增成功')
    } else if (modalConfig.title === '修改用例') {
      const source = nodeRefOf(modalData.value)
      await updateCase({ ...data, id: source.caseId, expectedDefinitionVersion: props.definitionVersion }, uiStore.activeId)
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
      const res = await addStep({
        ...data,
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
      await updateStep({ ...data, id: source.stepId, pid: source.caseId, expectedDefinitionVersion: props.definitionVersion }, uiStore.activeId)
      selection = source
      Message.success('修改成功')
    } else if (modalConfig.title === '复制步骤') {
      const source = nodeRefOf(modalData.value)
      const response = await copyCaseTree({ source, name: data.name, remark: data.remark, position: 'INSIDE_LAST', anchor: { type: 'CASE', caseId: source.caseId }, expectedDefinitionVersion: props.definitionVersion }, uiStore.activeId)
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

const onMenuClick = async (data?: any) => {
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
          modalConfig.columns = data.node?.type === 'case' ? modalConfig.caseColumns : modalConfig.stepColumns
          modalConfig.visible = true
          const detail = findNodeDetail(props.caseList, nodeRefOf(data.node)) as any
          modalConfig.form = { ...detail }
          modalConfig.form.id = data.node?.type === 'case' ? data.node.caseId : data.node?.stepId
          modalConfig.form.status = normalizeAutomationNodeStatus(detail?.status)
          modalData.value = data.node
        }
        break
      case 'copy':
        modalConfig.title = data.node?.type === 'case' ? '复制用例' : '复制步骤'
        if (editMethod.value === '弹窗编辑') {
          // 复制由服务端深复制业务数据并生成新 ID，弹窗只允许覆盖名称和备注。
          modalConfig.columns = (data.node?.type === 'case' ? modalConfig.caseColumns : modalConfig.stepColumns)
            .filter((column: ColumnItem) => column.field === 'name' || column.field === 'remark')
          modalConfig.visible = true
          const detail = findNodeDetail(props.caseList, nodeRefOf(data.node)) as any
          modalConfig.form = { name: detail?.name, remark: detail?.remark, type: data.node.type }
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
  margin-bottom: 80px;
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
