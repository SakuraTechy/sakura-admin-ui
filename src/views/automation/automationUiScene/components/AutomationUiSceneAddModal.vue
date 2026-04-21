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
import { addAutomationUiScene, getAutomationUiScene, updateAutomationUiScene } from '@/apis/automation/automationUiScene'
import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'
import { listUserDict } from '@/apis/common/common'
import type { LabelValueState } from '@/types/global'
import KeyValuePairForm from '@/components/KeyValuePairForm'

const emit = defineEmits<{
  (e: 'save-success'): void
}>()

const { width } = useWindowSize()

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改自动化管理-UI自动化场景' : '新增自动化管理-UI自动化场景'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { status_type } = useDict('status_type')

const [form, resetForm] = useResetReactive({
  status: 1,
})

const columns = computed<ColumnItem[]>(() => [
  {
    label: '场景ID',
    field: 'sceneId',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 64,
      allowClear: true,
    },
  },
  {
    label: '场景名称',
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
    label: '场景描述',
    field: 'description',
    span: 24,
    type: 'input',
    props: {
      maxLength: 255,
      allowClear: true,
    },
  },
  {
    label: '所属项目ID',
    field: 'projectId',
    span: 24,
    required: true,
    type: 'select',
  },
  {
    label: '所属项目版本ID',
    field: 'versionId',
    span: 24,
    required: true,
    type: 'select',
  },
  {
    label: '所属模块ID',
    field: 'moduleId',
    span: 24,
    required: true,
    type: 'select',
  },
  {
    label: '场景等级',
    field: 'level',
    span: 24,
    type: 'select',
  },
  {
    label: '场景状态',
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
  {
    label: '场景标签',
    field: 'tags',
    span: 24,
    type: 'input',
    props: {
      allowClear: true,
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
      await updateAutomationUiScene(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addAutomationUiScene(form)
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
  const { data } = await getAutomationUiScene(id)
  Object.assign(form, data)
  visible.value = true
}

// 复制
const onCopy = async (id: string) => {
  reset()
  dataId.value = ''
  const { data } = await getAutomationUiScene(id)
  Object.assign(form, data)
  visible.value = true
}

defineExpose({ onAdd, onUpdate, onCopy })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss"></style>
