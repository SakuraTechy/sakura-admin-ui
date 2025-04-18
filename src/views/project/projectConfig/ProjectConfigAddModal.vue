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
const title = computed(() => (isUpdate.value ? '修改项目配置' : '新增项目配置'))
const formRef = ref<InstanceType<typeof GiForm>>()

const [form, resetForm] = useResetReactive({
  // todo 待补充
  members: [],
  status: 1,
})

const userList = ref<LabelValueState[]>([])

const fetchUserList = async () => {
  try {
    const { data } = await listUserDict()
    userList.value = data.map((item) => ({ ...item, value: `${item.value}` }))
  } catch (error) {
    console.error('获取用户列表失败', error)
  }
}

const columns: ColumnItem[] = reactive([
  {
    label: '项目名称',
    field: 'name',
    type: 'input',
    span: 24,
    required: true,
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: '项目简称',
    field: 'abbreviate',
    type: 'input',
    span: 24,
    required: true,
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: '项目成员',
    field: 'members',
    type: 'select',
    span: 24,
    required: true,
    props: {
      multiple: true,
      options: userList,
      placeholder: '请选择项目成员',
    },
  },
  {
    label: '项目描述',
    field: 'description',
    type: 'textarea',
    props: {
      autoSize: true,
      maxLength: 250,
      allowClear: true,
    },
    span: 24,
  },
  {
    label: '状态',
    field: 'status',
    type: 'switch',
    span: 24,
    props: {
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

defineExpose({ onAdd, onUpdate })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss"></style>
