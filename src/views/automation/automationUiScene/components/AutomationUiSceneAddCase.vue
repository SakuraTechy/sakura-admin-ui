<template>
  <GiTree
    ref="giTreeRef"
    title="场景用例"
    style="flex-direction: column"
    :edit-method="editMethod"
    :tree-data="treeList"
    :field-names="{ key: 'treeKey', title: 'name', children: 'children' }"
    :loading="loading"
    :selected-keys="selectedKeys"
    allow-deselect
    :multiple="multiple"
    :on-save="onMenuClick"
    @update:selected-keys="val => selectedKeys = val"
    @node-click="onNodeClick"
    @node-drop="onNodeDrop"
    @menu-click="onMenuClick"
    @tree-node-click="onTreeNodeClick"
    @focus="onTreeFocus"
  >
    <template #right-menu="{ node, treeData, onMenuItemClick, onTreeNodeClick }">
      <GiMenu
        :tree-data="treeData"
        :recording-options="getRecordingMenuOptions(node)"
        @on-menu-item-click="mode => onMenuItemClick(mode, node)"
        @on-tree-node-click="onTreeNodeClick"
      />
    </template>
  </GiTree>
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
import { computed, defineEmits, defineProps, h, nextTick, onMounted, reactive, ref, watch, watchEffect } from 'vue'
import { Message } from '@arco-design/web-vue'
import { M } from 'node_modules/vite/dist/node/types.d-aGj9QkWt'
import Tree from './components/tree/index.vue'
import TabList from './components/tab/tabList.vue'
import AddOrEditForm from './components/AddOrEditForm.vue'
import AutomationUiScene from './components/automationUiScene.vue'
import GiMenu from '@/components/GiMenu/index.vue'
import { type AutomationUiSceneResp, addCase, addStep, deleteCase, deleteStep, dragCase, dragStep, updateCase, updateStep } from '@/apis/automation/automationUiScene'
import { useUiStore } from '@/stores/modules/uiStore'
import type { ColumnItem } from '@/components/GiForm'
import { type ProjectModuleConfigResp, addProjectModuleConfig, deleteProjectModuleConfig, dragProjectModuleConfig, getProjectModuleConfig, updateProjectModuleConfig } from '@/apis/project/projectModuleConfig'
import { useDict } from '@/hooks/app'
import AiEditor from '@/components/GiEditor/AiEditor.vue'
import KeyValuePairForm from '@/components/KeyValuePairForm'

defineOptions({ name: 'AutomationUiSceneAddCase' })

const props = defineProps<{
  caseList: Array<object>
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'get-scene-info', data?: any): void
  (e: 'get-case', data?: any): void
  (e: 'get-step', data?: any): void
  (e: 'selection-clear'): void
  (e: 'recording', data: { mode: string, node: any }): void
}>()

const { sort_type, status_type, automation_operation_type, automation_operation_method } = useDict('sort_type', 'status_type', 'automation_operation_type', 'automation_operation_method')

const uiStore = useUiStore()

const selectedKeys = ref()
const selectionInitialized = ref(false)
const multiple = ref()
const modalData = ref()
const giTreeRef = ref()

// 树组件获得焦点时设置激活状态
const onTreeFocus = () => {
  // console.warn(`[AutomationUiSceneAddCase] 树组件获得焦点，调用 setActive()`)
  giTreeRef.value?.setActive()
}

const loading = ref(false)
type TreeCateItem = AutomationUiSceneResp['caseList'][number] & {
  treeKey?: string
  switcherIcon?: (node: TreeCateItem) => VNode
  icon?: (node: TreeCateItem) => VNode
  popupVisible?: boolean
  isEdit?: boolean
}
const treeList = ref<TreeCateItem[]>([])
const buildCaseTree = (caseList: any[]) => {
  return (Array.isArray(caseList) ? caseList : []).map((caseItem: any, caseIndex: number) => {
    const caseId = String(caseItem?.id ?? caseIndex)
    const steps = Array.isArray(caseItem?.stepList) ? caseItem.stepList : []
    return {
      ...caseItem,
      type: 'case',
      treeKey: `case:${caseId}`,
      key: `case:${caseId}`,
      title: caseItem?.name,
      children: steps.map((step: any, stepIndex: number) => {
        const stepId = String(step?.id ?? stepIndex)
        const stepOrder = String(step?.order ?? stepIndex + 1)
        return {
          ...step,
          type: 'step',
          pid: step?.pid || caseItem?.id,
          treeKey: `step:${caseId}:${stepId}:${stepOrder}:${stepIndex}`,
          key: `step:${caseId}:${stepId}:${stepOrder}:${stepIndex}`,
          title: step?.name,
          popupVisible: false,
          isEdit: false,
        }
      }),
      popupVisible: false,
      isEdit: false,
    }
  })
}
const getTreeCaseList = async (data?: any) => {
  try {
    loading.value = true
    // const res = await getAutomationUiScene(uiStore.activeId)
    // console.log('caseList', props.caseList)
    treeList.value = buildCaseTree(props.caseList as any) as TreeCateItem[]
    if (data) {
      onNodeClick(data)
    } else if (!selectionInitialized.value) {
      const firstCase = treeList.value.find((item) => item.type === 'case')
      if (firstCase) onNodeClick({ node: firstCase, selected: true })
    }
    // this.moduleId = this.treeList[0].id
    // this.moduleId = JSON.parse(localStorage.getItem('ui-store') ?? '{}').moduleId ?? this.treeList[0]?.id
  } finally {
    loading.value = false
  }
}

const modalConfig = reactive({
  title: '新增用例',
  visible: ref(false),
  form: {},
  caseForm: { id: '', name: '', remark: '', sortType: '', order: 1, itemOrder: null, status: 1 },
  stepForm: {
    pid: '',
    id: '',
    name: '',
    remark: '',
    sortType: '',
    order: 1,
    itemOrder: null,
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
      disabled: (form: any) => {
        // 例如 modalConfig.title 包含 "编辑" 字样时为编辑模式
        return modalConfig.title === '修改用例1'
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
      label: '用例排序',
      field: 'sortType',
      span: 24,
      required: false,
      type: 'select',
      props: {
        options: computed(() => {
          return sort_type.value.map((item) => ({
            ...item,
            label: `${item.label}（${JSON.parse(item.extra ?? '{}').description || ''}）`.trim(),
          }))
        }),
        onChange: (value: any) => {
          modalConfig.form.sortType = value
        },
        allowClear: true,
        allowSearch: true,
      },
    },
    {
      label: '当前序号',
      field: 'order',
      type: 'input-number',
      required: true,
      props: {
        maxLength: 64,
        onInput: (value: any) => {
          modalConfig.form.order = value
        },
      },
      hide: (form: any) => {
        return !form.sortType
      },
    },
    {
      label: '目标序号',
      field: 'itemOrder',
      type: 'input-number',
      required: true,
      props: {
        maxLength: 64,
        onInput: (value: any) => {
          modalConfig.form.itemOrder = value
        },
      },
      hide: (form: any) => {
        return !form.sortType
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
      label: '步骤排序',
      field: 'sortType',
      span: 24,
      required: false,
      type: 'select',
      props: {
        options: computed(() => {
          return sort_type.value.map((item) => ({
            ...item,
            label: `${item.label}（${JSON.parse(item.extra ?? '{}').description || ''}）`.trim(),
          }))
        }),
        onChange: (value: any) => {
          modalConfig.form.sortType = value
        },
        allowClear: true,
        allowSearch: true,
      },
    },
    {
      label: '当前步骤序号',
      field: 'order',
      type: 'input-number',
      required: true,
      props: {
        maxLength: 64,
        onInput: (value: any) => {
          modalConfig.form.order = value
        },
      },
      hide: (form: any) => {
        return !form.sortType
      },
    },
    {
      label: '目标步骤序号',
      field: 'itemOrder',
      type: 'input-number',
      required: true,
      props: {
        maxLength: 64,
        onInput: (value: any) => {
          modalConfig.form.itemOrder = value
        },
      },
      hide: (form: any) => {
        return !form.sortType
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
  try {
    if (modalConfig.title === '新增用例') {
      await addCase({ ...data, type: 'case' }, uiStore.activeId)
      Message.success('新增成功')
      // emit('get-scene-info', { ...data, id: `${data.id}${String(data.itemOrder || data.order || '').padStart(3, '0')}` })
    } else if (modalConfig.title === '修改用例') {
      await updateCase({ ...data }, uiStore.activeId)
      Message.success('修改成功')
      // emit('get-scene-info', data)
    } else if (modalConfig.title === '复制用例') {
      await addCase(data, uiStore.activeId)
      Message.success('复制成功')
    } else if (modalConfig.title === '新增步骤') {
      const res = await addStep({
        ...data,
        // operationType: automation_operation_type.value.find((item: any) => item.value === data.operationType)?.label,
        type: 'step',
      }, uiStore.activeId)
      data.id = res.data || ''
      Message.success('新增成功')
    } else if (modalConfig.title === '修改步骤') {
      await updateStep({ ...data }, uiStore.activeId)
      Message.success('修改成功')
    } else if (modalConfig.title === '复制步骤') {
      const res = await addStep({ ...data }, uiStore.activeId)
      data.id = res.data || ''
      Message.success('复制成功')
    }

    if (modalConfig.title.includes('用例')) {
      emit('get-scene-info', { ...data, id: `${data.id}${String(data.itemOrder || data.order || '').padStart(3, '0')}`, type: 'case' })
    } else if (modalConfig.title.includes('步骤')) {
      emit('get-scene-info', { ...data, type: 'step' })
    }
  } catch (error) {
    console.error(error)
    return false
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
  selectedKeys.value = [node.treeKey || node.id]
  if (data?.type === 'step' || data?.node?.type === 'step') {
    emit('get-step', data)
  } else if (data?.type === 'case' || data?.node?.type === 'case') {
    emit('get-case', node.id)
  }
}
const clearSelection = () => {
  selectionInitialized.value = true
  selectedKeys.value = []
  emit('selection-clear')
}
const onNodeDrop = async (data?: any) => {
  if (props.readonly) {
    Message.warning('当前为只读模式，无法拖拽')
    return false
  }
  if (!data?.dragNode) return false
  console.warn('onNodeDrop', data)
  try {
    if (data.dragNode?.type === 'case' && data.dropNode?.type === 'step') return Message.warning('场景用例不可移动到步骤')
    if (data.dragNode?.pid !== data.dropNode?.pid && data.dropNode?.pid) return Message.warning('场景步骤不可跨用例移动')
    if (data.dragNode?.type === 'case') {
      await dragCase(data, uiStore.activeId)
    } else if (data.dragNode?.type === 'step') {
      await dragStep(data, uiStore.activeId)
    }
    emit('get-scene-info', { ...data, id: data.dragNode?.type === 'case' ? data.dropNode?.id : data.dragNode?.id, type: data.dragNode?.type })
    Message.success('移动成功')
  } catch (error) {
    console.error(error)
    return false
  }
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
              pid: data.node.id,
              id: `CASE_STEP_`,
              order: data.node.stepList?.length + 1,
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
          modalConfig.form = { ...data.node, sortType: String(data.node.sortType ?? '') }
          modalConfig.form.id = data.node?.type === 'case' ? 'SCENE_CASE_' : data.node?.id
          modalConfig.form.sortType = ''
          modalConfig.form.itemOrder = null
          modalData.value = data.node
        }
        break
      case 'copy':
        modalConfig.title = data.node?.type === 'case' ? '复制用例' : '复制步骤'
        if (editMethod.value === '弹窗编辑') {
          modalConfig.columns = data.node?.type === 'case' ? modalConfig.caseColumns : modalConfig.stepColumns
          modalConfig.visible = true
          modalConfig.form = { ...data.node, sortType: String(data.node.sortType ?? ''), order: data.node.stepList?.length + 1 || props.caseList.length + 1 }
          modalConfig.form.id = data.node?.type === 'case' ? 'SCENE_CASE_' : 'CASE_STEP_'
          modalConfig.form.sortType = ''
          modalData.value = data.node
        }
        break
      case 'delete': {
        // 处理单个节点或多个节点的删除
        const nodes = Array.isArray(data.node) ? data.node : [data.node]

        const cases = nodes.filter((item: any) => item.type === 'case')
        const steps = nodes.filter((item: any) => item.type === 'step')

        const caseIds = cases.length > 0 ? cases.map((item: any) => item.id).join(',') : ''
        const stepIds = steps.length > 0 ? steps.map((item: any) => item.id).join(',') : ''

        if (caseIds) {
          await deleteCase({ mode: data.mode, id: caseIds }, uiStore.activeId)
          emit('get-scene-info')
        }

        if (stepIds) {
          // 对于步骤，使用第一个步骤的 pid 作为父级ID
          const pid = steps[0]?.pid
          await deleteStep({ mode: data.mode, id: stepIds, pid }, uiStore.activeId)
          emit('get-scene-info', { id: pid, node: { type: 'case' } })
        }
        Message.success('删除成功')
        break
      }
      case 'delete2':
        // multiple.value = true
        break
      case 'move':
        // console.log('move', data)
        break
    }
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}
const onTreeNodeClick = (data?: any) => {
  // console.log('onTreeNodeClick', data)
  onNodeDrop(data)
}

// 初始化
onMounted(async () => {
  // await getTreeCaseList()

  // 延迟一下，确保 GiTree 组件完全挂载后再设置激活状态
  nextTick(() => {
    // console.warn(`[AutomationUiSceneAddCase] 组件挂载完成，手动设置树组件激活状态`)
    giTreeRef.value?.setActive()
  })
})

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
