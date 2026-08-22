<template>
  <section class="environment-resources">
    <div class="section-heading">
      <div>
        <h3>环境资源绑定</h3>
        <p>场景步骤只引用资源角色，执行时按当前环境解析实际资源。</p>
      </div>
      <a-space :size="8">
        <a-button type="outline" size="small" :loading="creatingCustomDatabase" @click="addCustomDatabase">
          <template #icon><icon-plus /></template>
          新增自定义数据库
        </a-button>
        <a-button type="text" shape="circle" :loading="loading" aria-label="刷新环境资源" @click="load">
          <template #icon><icon-refresh /></template>
        </a-button>
      </a-space>
    </div>
    <a-table :data="resources" :pagination="false" row-key="slotId" size="small" :loading="loading">
      <template #columns>
        <a-table-column title="资源角色" :width="150">
          <template #cell="{ record }">
            <div class="role-cell">
              <span>{{ record.resourceName }}</span>
              <code>{{ record.resourceCode }}</code>
            </div>
          </template>
        </a-table-column>
        <a-table-column title="类型" :width="90">
          <template #cell="{ record }">{{ kindLabel(record.resourceKind) }}</template>
        </a-table-column>
        <a-table-column title="当前绑定">
          <template #cell="{ record }">
            <a-select
              v-if="record.resourceKind !== 'CERTIFICATE'"
              :model-value="record.resourceId ? String(record.resourceId) : ''"
              :options="resourceOptions(record.resourceKind)"
              :placeholder="`请选择${kindLabel(record.resourceKind)}`"
              allow-search
              allow-clear
              @change="value => changeBinding(record, value)"
            />
            <div v-else class="certificate-value">
              <span :class="{ muted: !record.bound }">{{ record.fileName || '未上传证书' }}</span>
              <small v-if="record.sha256">SHA256 {{ record.sha256.slice(0, 12) }}</small>
            </div>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="110" align="center">
          <template #cell="{ record }">
            <a-space v-if="record.resourceKind === 'CERTIFICATE' || isCustomDatabase(record)" :size="4">
              <a-upload
                v-if="record.resourceKind === 'CERTIFICATE'"
                :accept="certificateAccept"
                :show-file-list="false"
                :custom-request="options => uploadCertificate(record, options)"
              >
                <template #upload-button>
                  <a-tooltip :content="record.bound ? '替换证书' : '上传证书'">
                    <a-button type="text" shape="circle" :aria-label="record.bound ? '替换证书' : '上传证书'">
                      <template #icon><icon-upload /></template>
                    </a-button>
                  </a-tooltip>
                </template>
              </a-upload>
              <a-tooltip v-if="record.bound" content="解除绑定">
                <a-button type="text" status="danger" shape="circle" aria-label="解除证书绑定" @click="removeBinding(record)">
                  <template #icon><icon-delete /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip v-if="isCustomDatabase(record)" content="删除自定义数据库角色">
                <a-button type="text" status="danger" shape="circle" aria-label="删除自定义数据库角色" @click="removeCustomDatabase(record)">
                  <template #icon><icon-delete /></template>
                </a-button>
              </a-tooltip>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>
  </section>
</template>

<script setup lang="ts">
import { Message, Modal, type RequestOption, type SelectOptionData } from '@arco-design/web-vue'
import { bindEnvironmentResource, createCustomDatabaseSlot, deleteCustomDatabaseSlot, listEnvironmentResources, unbindEnvironmentResource, uploadEnvironmentCertificate } from '@/apis/automation/environmentResources'
import type { EnvironmentResource, EnvironmentResourceKind } from '@/apis/automation/environmentResources'
import { getProjectServerConfigList } from '@/apis/project/projectServerConfig'
import { getProjectDataBaseConfigList } from '@/apis/project/projectDataBaseConfig'

const props = defineProps<{
  environmentId: string | number
  projectId: string | number
}>()

const resources = ref<EnvironmentResource[]>([])
const serverOptions = ref<SelectOptionData[]>([])
const databaseOptions = ref<SelectOptionData[]>([])
const loading = ref(false)
const creatingCustomDatabase = ref(false)
const certificateAccept = '.lic,.p12,.pfx,.pem,.crt,.cer,.der,.key,.jks,.p7b,.p7c'

const kindLabel = (kind: EnvironmentResourceKind) => ({
  SERVER: '服务器',
  DATABASE: '数据库',
  CERTIFICATE: '证书',
}[kind])

const resourceOptions = (kind: EnvironmentResourceKind) => kind === 'SERVER' ? serverOptions.value : databaseOptions.value
const isCustomDatabase = (resource: EnvironmentResource) => resource.resourceKind === 'DATABASE' && resource.resourceCode.startsWith('CUSTOM_DB_')

const load = async () => {
  if (!props.environmentId || !props.projectId) return
  loading.value = true
  try {
    const [resourceResult, serverResult, databaseResult] = await Promise.all([
      listEnvironmentResources(props.environmentId),
      getProjectServerConfigList({ projectId: String(props.projectId), status: 1, sort: ['ip,asc'] }),
      getProjectDataBaseConfigList({ projectId: String(props.projectId), status: 1, sort: ['ip,asc'] }),
    ])
    resources.value = resourceResult.data || []
    serverOptions.value = (serverResult.data || []).map((item) => ({
      value: String(item.id),
      label: `${item.ip}${item.port ? `:${item.port}` : ''}`,
    }))
    databaseOptions.value = (databaseResult.data || []).map((item) => ({
      value: String(item.id),
      label: `${item.ip}${item.port ? `:${item.port}` : ''}/${item.dataBase || ''}`,
    }))
  } finally {
    loading.value = false
  }
}

const removeBinding = async (resource: EnvironmentResource) => {
  await unbindEnvironmentResource(props.environmentId, resource.slotId)
  Message.success(`${resource.resourceName}已解除绑定`)
  await load()
}

const changeBinding = async (resource: EnvironmentResource, value: unknown) => {
  const resourceId = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  if (!resourceId) {
    await removeBinding(resource)
    return
  }
  await bindEnvironmentResource(props.environmentId, resource.slotId, resourceId)
  Message.success(`${resource.resourceName}绑定成功`)
  await load()
}

const addCustomDatabase = async () => {
  if (!props.projectId || creatingCustomDatabase.value) return
  creatingCustomDatabase.value = true
  try {
    await createCustomDatabaseSlot(props.projectId)
    Message.success('自定义数据库角色新增成功')
    await load()
  } finally {
    creatingCustomDatabase.value = false
  }
}

const removeCustomDatabase = (resource: EnvironmentResource) => {
  Modal.warning({
    title: '删除自定义数据库角色',
    content: `确认删除“${resource.resourceName}”？删除后该角色将不能再用于操作步骤。`,
    okText: '删除',
    cancelText: '取消',
    onOk: async () => {
      await deleteCustomDatabaseSlot(resource.slotId)
      Message.success(`${resource.resourceName}已删除`)
      await load()
    },
  })
}

const uploadCertificate = (resource: EnvironmentResource, options: RequestOption) => {
  const controller = new AbortController()
  const { fileItem, onError, onProgress, onSuccess } = options
  if (!fileItem.file) {
    const error = new Error('未读取到证书文件')
    onError(error)
    return { abort: () => controller.abort() }
  }
  const data = new FormData()
  data.append('file', fileItem.file as Blob, fileItem.name)
  onProgress(20)
  void uploadEnvironmentCertificate(props.environmentId, resource.slotId, data, controller.signal)
    .then((response) => {
      onProgress(100)
      onSuccess(response.data)
      Message.success(`${resource.resourceName}上传并绑定成功`)
      return load()
    })
    .catch(onError)
  return { abort: () => controller.abort() }
}

watch(() => [props.environmentId, props.projectId], () => void load(), { immediate: true })
</script>

<style scoped lang="scss">
.environment-resources {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-2);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-heading h3,
.section-heading p {
  margin: 0;
}

.section-heading h3 {
  font-size: 14px;
}

.section-heading p {
  margin-top: 3px;
  color: var(--color-text-3);
  font-size: 12px;
}

.role-cell,
.certificate-value {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.role-cell code,
.certificate-value small {
  color: var(--color-text-3);
  font-size: 11px;
}

.muted {
  color: var(--color-text-3);
}
</style>
