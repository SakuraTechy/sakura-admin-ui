<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 900 ? 860 : '100%'"
    draggable
    @before-ok="save"
    @close="reset"
  >
    <GiForm ref="formRef" v-model="form" :columns="columns" />
    <EnvironmentResourceBindings
      v-if="dataId && form.projectId"
      :environment-id="dataId"
      :project-id="form.projectId"
    />
    <a-alert v-else type="info">保存环境后可继续绑定服务器、数据库和证书。</a-alert>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { addProjectEnvironmentConfig, getProjectEnvironmentConfig, updateProjectEnvironmentConfig } from '@/apis/project/projectEnvironmentConfig'
import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'
import { listUserDict } from '@/apis/common/common'
import type { LabelValueState } from '@/types/global'
import KeyValuePairForm from '@/components/KeyValuePairForm'
import { getProjectVersionConfigList } from '@/apis/project/projectVersionConfig'
import { getProjectServerConfigList } from '@/apis/project/projectServerConfig'
import { getProjectDataBaseConfigList } from '@/apis/project/projectDataBaseConfig'
import EnvironmentResourceBindings from './EnvironmentResourceBindings.vue'

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
const title = computed(() => (isUpdate.value ? '修改项目管理-环境配置' : '新增项目管理-环境配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { status_type } = useDict('status_type')

const [form, resetForm] = useResetReactive({
  status: 1,
  projectId: '',
  versionConfig: [] as string[],
  serverConfig: [] as string[],
  dataBaseConfig: [] as string[],
})

const versionList = ref<LabelValueState[]>([])
const serverList = ref<LabelValueState[]>([])
const dataBaseList = ref<LabelValueState[]>([])

const getVersionList = async (newProjectId?: string) => {
  try {
    const res = await getProjectVersionConfigList({
      projectId: newProjectId,
      status: 1,
      sort: ['name,desc'],
    })
    versionList.value = res.data.map((item) => ({
      label: item.name,
      value: item.id,
      extra: JSON.stringify(item),
    }))
    form.versionConfig = res.data.filter((item) => {
      return item.id === form.versionConfig[0]
    }).map((item) => item.id)
  } catch (error) {
    console.error('获取版本列表失败', error)
  }
}

const getServerList = async (newProjectId?: string) => {
  try {
    const res = await getProjectServerConfigList({
      projectId: newProjectId,
      status: 1,
      sort: ['ip,desc'],
    })
    serverList.value = res.data.map((item) => ({
      label: item.ip,
      value: item.id,
      extra: JSON.stringify(item),
    }))
    form.serverConfig = res.data.filter((item) => {
      return item.id === form.serverConfig[0]
    }).map((item) => item.id)
  } catch (error) {
    console.error('获取服务器列表失败', error)
  }
}

const getDataBaseList = async (newProjectId?: string) => {
  try {
    const res = await getProjectDataBaseConfigList({
      projectId: newProjectId,
      status: 1,
      sort: ['ip,desc'],
    })
    dataBaseList.value = res.data.map((item) => ({
      label: item.ip,
      value: item.id,
      extra: JSON.stringify(item),
    }))
    form.dataBaseConfig = res.data.filter((item) => {
      return item.id === form.dataBaseConfig[0]
    }).map((item) => item.id)
  } catch (error) {
    console.error('获取数据库列表失败', error)
  }
}

watch(() => form.projectId, async (newProjectId) => {
  if (newProjectId) {
    await getVersionList(newProjectId)
    await getServerList(newProjectId)
    await getDataBaseList(newProjectId)
  }
}, { immediate: true })

const matchedVersionItems = ref<object[]>([])
watch(() => form.versionConfig, async (newVersion: string[]) => {
  if (newVersion) {
    matchedVersionItems.value = versionList.value
      .filter((item) => newVersion.includes(item.value))
      .map((item) => item.extra ? JSON.parse(item.extra) : [])
  }
}, { immediate: true })

const matchedServerItems = ref<object[]>([])
watch(() => form.serverConfig, async (newServer: string[]) => {
  if (newServer) {
    matchedServerItems.value = serverList.value
      .filter((item) => newServer.includes(item.value))
      .map((item) => item.extra ? JSON.parse(item.extra) : [])
  }
}, { immediate: true })

const matchedDataBaseItems = ref<object[]>([])
watch(() => form.dataBaseConfig, async (newDataBase: string[]) => {
  if (newDataBase) {
    matchedDataBaseItems.value = dataBaseList.value
      .filter((item) => newDataBase.includes(item.value))
      .map((item) => item.extra ? JSON.parse(item.extra) : [])
  }
}, { immediate: true })

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
    label: '环境版本信息',
    field: 'versionConfig',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: versionList.value,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '环境服务器信息',
    field: 'serverConfig',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: serverList.value,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '环境数据库信息',
    field: 'dataBaseConfig',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: dataBaseList.value,
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
      // versionConfig: JSON.stringify(matchedVersionItems.value),
      versionConfig: matchedVersionItems.value,
      serverConfig: matchedServerItems.value,
      dataBaseConfig: matchedDataBaseItems.value,
    }
    if (isUpdate.value) {
      await updateProjectEnvironmentConfig(perform, dataId.value)
      Message.success('修改成功')
    } else {
      await addProjectEnvironmentConfig(perform)
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
  const { data } = await getProjectEnvironmentConfig(id)
  const perform = {
    ...data,
    versionConfig: data.versionConfig.map((item: any) => item.id) ?? [],
    serverConfig: data.serverConfig.map((item: any) => item.id) ?? [],
    dataBaseConfig: data.dataBaseConfig.map((item: any) => item.id) ?? [],
  }
  Object.assign(form, perform)
  visible.value = true
}

// 复制
const onCopy = async (id: string) => {
  reset()
  dataId.value = ''
  const { data } = await getProjectEnvironmentConfig(id)
  data.id = ''
  const perform = {
    ...data,
    versionConfig: data.versionConfig.map((item: any) => item.id) ?? [],
    serverConfig: data.serverConfig.map((item: any) => item.id) ?? [],
    dataBaseConfig: data.dataBaseConfig.map((item: any) => item.id) ?? [],
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
