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
import { addAutomationJenkinsConfig, getAutomationJenkinsConfig, listAutomationJenkinsConfig, updateAutomationJenkinsConfig } from '@/apis/automation/automationJenkinsConfig'
import { listAutomationProjectConfig } from '@/apis/automation/automationProjectConfig'
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
const title = computed(() => (isUpdate.value ? '修改自动化管理-Jenkins配置' : '新增自动化管理-Jenkins配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { status_type } = useDict('status_type')

const [form, resetForm] = useResetReactive({
  status: 1,
  jobList: [] as string[],
})

const jobList = ref<LabelValueState[]>([])

const getAutomationProjectList = async () => {
  try {
    const res = await listAutomationProjectConfig({
      // status: 1,
      // sort: ['ip,desc'],
    })
    jobList.value = res.data.list.map((item) => ({
      label: item.name,
      value: item.id,
      extra: JSON.stringify(item),
    }))
    form.jobList = res.data.list.filter((item) => {
      return item.id === form.jobList[0]
    }).map((item) => item.id)
  } catch (error) {
    console.error('获取自动化项目列表失败', error)
  }
}

const matchedProjectItems = ref<object[]>([])
watch(() => form.jobList, async (newVersion: string[]) => {
  if (newVersion) {
    matchedProjectItems.value = jobList.value
      .filter((item) => newVersion.includes(item.value))
      .map((item) => item.extra ? JSON.parse(item.extra) : [])
  }
}, { immediate: true })

const columns = computed<ColumnItem[]>(() => [
  {
    label: '版本',
    field: 'version',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: 'IP',
    field: 'ip',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: '端口',
    field: 'port',
    span: 24,
    required: true,
    type: 'input-number',
    props: {
      allowClear: true,
    },
  },
  {
    label: '用户名',
    field: 'userName',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: '密码',
    field: 'passWord',
    span: 24,
    required: true,
    type: 'input-password',
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: '地址',
    field: 'url',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 255,
      allowClear: true,
    },
  },
  {
    label: '关联项目',
    field: 'jobList',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: jobList.value,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '描述',
    field: 'description',
    span: 24,
    type: 'input',
    props: {
      maxLength: 255,
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
    const perform = {
      ...form,
      jobList: matchedProjectItems.value,
    }
    if (isUpdate.value) {
      await updateAutomationJenkinsConfig(perform, dataId.value)
      Message.success('修改成功')
    } else {
      await addAutomationJenkinsConfig(perform)
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
  await getAutomationProjectList()
  visible.value = true
}

// 修改
const onUpdate = async (id: string) => {
  reset()
  dataId.value = id
  await getAutomationProjectList()
  const { data } = await getAutomationJenkinsConfig(id)
  const perform = {
    ...data,
    jobList: data.jobList.map((item: any) => item.id) ?? [],
  }
  Object.assign(form, perform)
  visible.value = true
}

// 复制
const onCopy = async (id: string) => {
  reset()
  dataId.value = ''
  await getAutomationProjectList()
  const { data } = await getAutomationJenkinsConfig(id)
  data.id = ''
  const perform = {
    ...data,
    jobList: data.jobList.map((item: any) => item.id) ?? [],
  }
  Object.assign(form, perform)
  visible.value = true
}

defineExpose({ onAdd, onUpdate, onCopy })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss"></style>
