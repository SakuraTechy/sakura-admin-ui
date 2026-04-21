<template>
  <GiTree
    ref="giTreeRef"
    title="场景用例"
    style="flex-direction: column"
    :edit-method="editMethod"
    :tree-data="treeList"
    :loading="loading"
    :selected-keys="selectedKeys"
    :multiple="multiple"
    :on-save="onMenuClick"
    @update:selected-keys="val => selectedKeys = val"
    @node-click="onNodeClick"
    @node-drop="onNodeDrop"
    @menu-click="onMenuClick"
    @tree-node-click="onTreeNodeClick"
    @focus="onTreeFocus"
  />
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
import { mapTree } from 'xe-utils'
import { M } from 'node_modules/vite/dist/node/types.d-aGj9QkWt'
import Tree from './components/tree/index.vue'
import TabList from './components/tab/tabList.vue'
import AddOrEditForm from './components/AddOrEditForm.vue'
import AutomationUiScene from './components/automationUiScene.vue'
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
}>()

const { sort_type, status_type, automation_operation_type, automation_operation_method } = useDict('sort_type', 'status_type', 'automation_operation_type', 'automation_operation_method')

const uiStore = useUiStore()

const selectedKeys = ref()
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
  switcherIcon?: (node: TreeCateItem) => VNode
  icon?: (node: TreeCateItem) => VNode
  popupVisible?: boolean
  isEdit?: boolean
}
const treeList = ref<TreeCateItem[]>([])
const getTreeCaseList = async (data?: any) => {
  try {
    loading.value = true
    // const res = await getAutomationUiScene(uiStore.activeId)
    // const data = JSON.parse(JSON.stringify(uiStore.treeList)) as ProjectModuleConfigResp[]
    // treeList.value = mapTree(res.data.caseList as any, (i) => ({
    // console.log('caseList', props.caseList)
    treeList.value = mapTree(props.caseList as any, (i) => ({
      ...i as unknown as TreeCateItem,
      key: i.id,
      title: i.name,
      children: i.stepList,
      popupVisible: false,
      isEdit: false,
      // switcherIcon: (node: any) => {
      //   if (node.expanded && !node.isLeaf) return <icon-tree-add />
      //   if (!node.expanded && !node.isLeaf) return <icon-tree-reduce style={{ transform: 'none' }} />
      //   if (node.expanded && !node.isLeaf) return <IconCaretDown />
      //   if (!node.expanded && !node.isLeaf) return <IconCaretRight />
      //   return null
      // },
      // icon: (node: any) => {
      //   if (node.expanded && !node.isLeaf) return <GiSvgIcon name="file-open" size={16}></GiSvgIcon>
      //   if (!node.expanded && !node.isLeaf) return <GiSvgIcon name="file-close" size={16}></GiSvgIcon>
      //   // return <GiSvgIcon name="folder" size={16}></GiSvgIcon>
      //   return <GiSvgIcon name="file" size={16}></GiSvgIcon>
      // },
    }))
    onNodeClick(data)
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
    // { label: '步骤ID', field: 'id', type: 'input', required: true, props: { maxLength: 64 } },
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
    const stepId = ''
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
  selectedKeys.value = data ? [data.id || data.node?.id] : [treeList.value[0]?.id]
  if (data?.type === 'step' || data?.node?.type === 'step') {
    emit('get-step', data)
  } else if (data?.node?.type === 'case' || treeList.value[0]?.type === 'case') {
    emit('get-case', selectedKeys.value[0])
  }
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
const onMenuClick = async (data?: any) => {
  if (props.readonly) {
    Message.warning('当前为只读模式，无法修改')
    return false
  }
  console.warn('onMenuClick', data)
  try {
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
              id: `SCENE_STEP_`,
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
          modalConfig.form.id = data.node?.type === 'case' ? 'SCENE_CASE_' : data.node?.id
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
