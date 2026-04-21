<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 600 ? 600 : '100%'"
    draggable
    @before-ok="save"
    @close="reset"
  >
    <GiForm ref="formRef" v-model="form" :columns="columns" />
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { mapTree } from 'xe-utils'
import { type ProjectModuleConfigResp, addProjectModuleConfig, getProjectModuleConfig, updateProjectModuleConfig } from '@/apis/project/projectModuleConfig'
import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'
import { listUserDict } from '@/apis/common/common'
import type { LabelValueState } from '@/types/global'
import KeyValuePairForm from '@/components/KeyValuePairForm'

const props = defineProps({
  projectList: {
    type: Array,
  },
  versionList: {
    type: Array,
  },
  moduleList: {
    type: Array,
  },
})

const emit = defineEmits<{
  (e: 'save-success'): void
  (e: 'get-version-list', projectId: string): void
  (e: 'get-module-list', projectId: string, versionId: string): void
}>()

const { width } = useWindowSize()

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改项目管理-模块配置' : '新增项目管理-模块配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { status_type } = useDict('status_type')

const [form, resetForm] = useResetReactive({
  projectId: '',
  versionId: '',
  parentId: '',
  sort: '1-1',
  status: 1,
})

watch(() => form.projectId, (newProjectId, oldProjectId) => {
  if (newProjectId) {
    emit('get-version-list', newProjectId)
    if (oldProjectId && newProjectId !== oldProjectId) {
      form.versionId = ''
    }
  }
}, { immediate: true })

// 转换为树结构
const moduleSelectTree = computed(() => {
  if (!form.projectId) return []
  if (!form.versionId) return []
  const moduleList = props.moduleList?.filter((item) => (item as any).projectId === form.projectId && (item as any).versionId === form.versionId)
  // console.log('moduleList', moduleList)
  const data = JSON.parse(JSON.stringify(moduleList)) as ProjectModuleConfigResp[]
  return mapTree(data, (i) => ({
    key: i.id,
    title: i.name,
    children: i.children,
  }))
})

const columns = computed<ColumnItem[]>(() => [
  {
    label: '所属项目',
    field: 'projectId',
    span: 24,
    type: 'select',
    required: true,
    props: {
      options: props.projectList,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '所属版本',
    field: 'versionId',
    span: 24,
    type: 'select',
    required: true,
    props: {
      options: props.versionList,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '所属模块',
    field: 'parentId',
    span: 24,
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
    label: '模块名称',
    field: 'name',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 64,
      allowClear: true,
    },
  },
  {
    label: '模块描述',
    field: 'description',
    span: 24,
    type: 'textarea',
    props: {
      maxLength: 255,
      autoSize: true,
      allowClear: true,
    },
  },
  {
    label: '模块排序',
    field: 'sort',
    span: 24,
    type: 'input-number',
    props: {
      // maxLength: 64,
      min: 1,
      mode: 'button',
      allowClear: true,
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
])

// 重置
const reset = () => {
  formRef.value?.formRef?.resetFields()
  resetForm()
}

// 保存
const save = async () => {
  try {
    const isInvalid = await formRef.value?.formRef?.validate()
    if (isInvalid) return false
    if (isUpdate.value) {
      await updateProjectModuleConfig(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addProjectModuleConfig(form)
      Message.success('新增成功')
    }
    emit('save-success')
    return true
  } catch (error) {
    return false
  }
}

// 新增
const onAdd = async () => {
  reset()
  dataId.value = ''
  visible.value = true
}

// 修改
const onUpdate = async (id: string) => {
  reset()
  dataId.value = id
  const { data } = await getProjectModuleConfig(id)
  Object.assign(form, data)
  visible.value = true
}

// 复制
const onCopy = async (id: string) => {
  reset()
  dataId.value = ''
  const { data } = await getProjectModuleConfig(id)
  Object.assign(form, data)
  form.parentId = data.id
  visible.value = true
}

defineExpose({ onAdd, onUpdate, onCopy })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss"></style>
