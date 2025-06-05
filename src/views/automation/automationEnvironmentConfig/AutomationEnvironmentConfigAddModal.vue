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
import { addAutomationEnvironmentConfig, getAutomationEnvironmentConfig, updateAutomationEnvironmentConfig } from '@/apis/automation/automationEnvironmentConfig'
import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'
import { listUserDict } from '@/apis/common/common'
import type { LabelValueState } from '@/types/global'
import KeyValuePairForm from '@/components/KeyValuePairForm'
import { listAutomationProjectConfig } from '@/apis/automation/automationProjectConfig'
import { listAutomationJenkinsConfig } from '@/apis/automation/automationJenkinsConfig'
import { getAutomationNodeConfigList, listAutomationNodeConfig } from '@/apis/automation/automationNodeConfig'
import { getAutomationBrowserConfigList } from '@/apis/automation/automationBrowserConfig'

const emit = defineEmits<{
  (e: 'save-success'): void
}>()

const { width } = useWindowSize()

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改自动化管理-环境配置' : '新增自动化管理-环境配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { automation_type, status_type } = useDict('automation_type', 'status_type')

const [form, resetForm] = useResetReactive({
  type: '',
  status: 1,
  projectConfig: [] as string[],
  jenkinsConfig: [] as string[],
  nodeConfig: [] as string[],
  browserConfig: [] as string[],
})

const projectConfigList = ref<LabelValueState[]>([])
const jenkinsConfigList = ref<LabelValueState[]>([])
const nodeConfigList = ref<LabelValueState[]>([])
const browserConfigList = ref<LabelValueState[]>([])

const getProjectConfigList = async () => {
  try {
    const res = await listAutomationProjectConfig({
      type: form.type,
      status: 1,
      sort: ['name,asc'],
    })
    projectConfigList.value = res.data.list.map((item) => ({
      label: item.name,
      value: item.id,
      extra: JSON.stringify(item),
    }))
    form.projectConfig = res.data.list.filter((item) => {
      return item.id === form.projectConfig[0]
    }).map((item) => item.id)
  } catch (error) {
    console.error('获取项目配置列表失败', error)
  }
}

const getJenkinsConfigList = async () => {
  try {
    const res = await listAutomationJenkinsConfig({
      status: 1,
      sort: ['ip,asc'],
    })
    jenkinsConfigList.value = res.data.list.map((item) => ({
      label: item.ip,
      value: item.id,
      extra: JSON.stringify(item),
    }))
    form.jenkinsConfig = res.data.list.filter((item) => {
      return item.id === form.jenkinsConfig[0]
    }).map((item) => item.id)
  } catch (error) {
    console.error('获取Jenkins配置列表失败', error)
  }
}

const getNodeConfigList = async () => {
  try {
    const res = await getAutomationNodeConfigList({
      type: form.type === 'WEB' ? 'Windows' : 'Linux',
      status: 1,
      sort: ['name,asc'],
    })
    nodeConfigList.value = res.data.map((item) => ({
      label: item.name,
      value: item.id,
      extra: JSON.stringify(item),
    }))
    form.nodeConfig = res.data.filter((item) => {
      return item.id === form.nodeConfig[0]
    }).map((item) => item.id)
  } catch (error) {
    console.error('获取节点配置列表失败', error)
  }
}

const getBrowserConfigList = async () => {
  try {
    const res = await getAutomationBrowserConfigList({
      status: 1,
      sort: ['name,desc'],
    })
    browserConfigList.value = res.data.map((item) => ({
      label: item.name,
      value: item.id,
      extra: JSON.stringify(item),
    }))
    form.browserConfig = res.data.filter((item) => {
      return item.id === form.browserConfig[0]
    }).map((item) => item.id)
  } catch (error) {
    console.error('获取浏览器配置列表失败', error)
  }
}
watch(() => form.type, async (newType) => {
  if (newType) {
    await getProjectConfigList()
    await getJenkinsConfigList()
    await getNodeConfigList()
    await getBrowserConfigList()
  }
}, { immediate: true })

const matchedProjectConfigItems = ref<object[]>([])
watch(() => form.projectConfig, async (newProjectConfig) => {
  if (newProjectConfig) {
    matchedProjectConfigItems.value = projectConfigList.value
      .filter((item) => newProjectConfig.includes(item.value))
      .map((item) => item.extra ? JSON.parse(item.extra) : [])
  }
}, { immediate: true })

const matchedJenkinsConfigItems = ref<object[]>([])
watch(() => form.jenkinsConfig, async (newJenkinsConfig) => {
  if (newJenkinsConfig) {
    matchedJenkinsConfigItems.value = jenkinsConfigList.value
      .filter((item) => newJenkinsConfig.includes(item.value))
      .map((item) => item.extra ? JSON.parse(item.extra) : [])
  }
}, { immediate: true })

const matchedNodeConfigItems = ref<object[]>([])
watch(() => form.nodeConfig, async (newNodeConfig) => {
  if (newNodeConfig) {
    matchedNodeConfigItems.value = nodeConfigList.value
      .filter((item) => newNodeConfig.includes(item.value))
      .map((item) => item.extra ? JSON.parse(item.extra) : [])
  }
}, { immediate: true })

const matchedBrowserConfigItems = ref<object[]>([])
watch(() => form.browserConfig, async (newBrowserConfig) => {
  if (newBrowserConfig) {
    matchedBrowserConfigItems.value = browserConfigList.value
      .filter((item) => newBrowserConfig.includes(item.value))
      .map((item) => item.extra ? JSON.parse(item.extra) : [])
  }
}, { immediate: true })

const columns = computed<ColumnItem[]>(() => [
  {
    label: '环境类型',
    field: 'type',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: automation_type.value,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '环境名称',
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
    label: '环境描述',
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
    label: '环境项目信息',
    field: 'projectConfig',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: projectConfigList.value,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '环境Jenkins信息',
    field: 'jenkinsConfig',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: jenkinsConfigList.value,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '环境节点信息',
    field: 'nodeConfig',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: nodeConfigList.value,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '环境浏览器信息',
    field: 'browserConfig',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: browserConfigList.value,
      allowClear: true,
      allowSearch: true,
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
      projectConfig: matchedProjectConfigItems.value,
      jenkinsConfig: matchedJenkinsConfigItems.value,
      nodeConfig: matchedNodeConfigItems.value,
      browserConfig: matchedBrowserConfigItems.value,
    }
    if (isUpdate.value) {
      await updateAutomationEnvironmentConfig(perform, dataId.value)
      Message.success('修改成功')
    } else {
      await addAutomationEnvironmentConfig(perform)
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
  const { data } = await getAutomationEnvironmentConfig(id)
  const perform = {
    ...data,
    projectConfig: data.projectConfig.map((item: any) => item.id) ?? [],
    jenkinsConfig: data.jenkinsConfig.map((item: any) => item.id) ?? [],
    nodeConfig: data.nodeConfig.map((item: any) => item.id) ?? [],
    browserConfig: data.browserConfig.map((item: any) => item.id) ?? [],
  }
  Object.assign(form, perform)
  visible.value = true
}

// 复制
const onCopy = async (id: string) => {
  reset()
  dataId.value = ''
  const { data } = await getAutomationEnvironmentConfig(id)
  data.id = ''
  const perform = {
    ...data,
    projectConfig: data.projectConfig.map((item: any) => item.id) ?? [],
    jenkinsConfig: data.jenkinsConfig.map((item: any) => item.id) ?? [],
    nodeConfig: data.nodeConfig.map((item: any) => item.id) ?? [],
    browserConfig: data.browserConfig.map((item: any) => item.id) ?? [],
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
