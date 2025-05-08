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
import { addProjectVersionConfig, getProjectVersionConfig, updateProjectVersionConfig } from '@/apis/project/projectVersionConfig'
import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'

const props = defineProps({
  projectList: {
    type: Array,
  },
})

const emit = defineEmits<{
  (e: 'save-success'): void
}>()

const { width } = useWindowSize()

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改项目管理-版本配置' : '新增项目管理-版本配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { status_type } = useDict('status_type')

const [form, resetForm] = useResetReactive({
  status: 1,
})

const columns = computed<ColumnItem[]>(() => [
  {
    label: '所属项目',
    field: 'projectId',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: props.projectList,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '版本名称',
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
    label: '版本描述',
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
      await updateProjectVersionConfig(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addProjectVersionConfig(form)
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
  const { data } = await getProjectVersionConfig(id)
  Object.assign(form, data)
  visible.value = true
}

defineExpose({ onAdd, onUpdate })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss"></style>
