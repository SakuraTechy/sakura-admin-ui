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
import { addProjectConfig, getProjectConfig, updateProjectConfig } from '@/apis/project/projectConfig'
import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'
import { listUserDict } from '@/apis/common/common'
import type { LabelValueState } from '@/types/global'

const emit = defineEmits<{
  (e: 'save-success'): void
}>()

const { width } = useWindowSize()

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改项目管理-项目配置' : '新增项目管理-项目配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { status_type } = useDict('status_type')

const [form, resetForm] = useResetReactive({
  status: 1,
  automationOperationCatalogV2: true,
  operationDiagnosticV1: true,
})

const userList = ref<LabelValueState[]>([])

const fetchUserList = async () => {
  try {
    const res = await listUserDict()
    // userList.value = res.data
    userList.value = res.data.map((item) => ({ ...item, value: `${item.value}` }))
  } catch (error) {
    console.error('获取用户列表失败', error)
  }
}

const columns: ColumnItem[] = reactive([
  {
    label: '项目名称',
    field: 'name',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: '项目简称',
    field: 'abbreviate',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: '项目成员',
    field: 'member',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: userList,
      placeholder: '请选择项目成员',
      multiple: true,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '项目描述',
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
    label: '状态',
    field: 'status',
    span: 24,
    type: 'switch',
    props: {
      options: status_type,
      type: 'round',
      checkedValue: 1,
      uncheckedValue: 2,
      checkedText: '启用',
      uncheckedText: '禁用',
    },
  },
  {
    label: 'UI 自动化操作目录 v2',
    field: 'automationOperationCatalogV2',
    span: 24,
    type: 'switch',
    props: {
      checkedValue: true,
      uncheckedValue: false,
      checkedText: '启用目录 v2',
      uncheckedText: '使用旧表单',
    },
  },
  {
    label: 'UI 自动化统一执行详情 v1',
    field: 'operationDiagnosticV1',
    span: 24,
    type: 'switch',
    props: {
      checkedValue: true,
      uncheckedValue: false,
      checkedText: '启用统一详情',
      uncheckedText: '保留旧详情',
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
      await updateProjectConfig(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addProjectConfig(form)
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
  await fetchUserList()
  visible.value = true
}

// 修改
const onUpdate = async (id: string) => {
  reset()
  dataId.value = id
  await fetchUserList()
  const { data } = await getProjectConfig(id)
  Object.assign(form, data)
  visible.value = true
}

// 复制
const onCopy = async (id: string) => {
  reset()
  dataId.value = ''
  await fetchUserList()
  const { data } = await getProjectConfig(id)
  data.id = ''
  Object.assign(form, data)
  visible.value = true
}

defineExpose({ onAdd, onUpdate, onCopy })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss"></style>
