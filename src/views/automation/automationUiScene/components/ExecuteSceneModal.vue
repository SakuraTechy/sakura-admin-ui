<template>
  <a-modal
    v-model:visible="visible"
    title="执行测试场景"
    :width="980"
    :mask-closable="false"
    :esc-to-close="false"
    @before-ok="handleOk"
    @close="handleClose"
  >
    <div class="execute-modal">
      <a-alert type="info" show-icon>
        已选择 {{ sceneList.length }} 个场景，请确认本次执行使用的产品环境与自动化环境。
      </a-alert>

      <a-descriptions :column="2" bordered size="medium" style="margin-top: 0px;">
        <a-descriptions-item label="所属项目">{{ displayProjectName }}</a-descriptions-item>
        <a-descriptions-item label="所属版本">{{ displayVersionName }}</a-descriptions-item>
      </a-descriptions>

      <a-row :gutter="16" class="config-row">
        <a-col :span="12">
          <a-card title="产品环境" size="small" class="config-card">
            <template #extra>
              <a-button type="outline" size="small" @click="goProjectEnvironmentConfig">去配置</a-button>
            </template>
            <a-form :model="form" layout="vertical">
              <a-form-item label="服务器 IP" required>
                <a-select
                  v-model="form.projectEnvironmentId"
                  placeholder="请选择产品环境"
                  allow-search
                  @change="handleProjectEnvironmentChange"
                >
                  <a-option
                    v-for="item in projectEnvironmentOptions"
                    :key="item.value"
                    :value="item.value"
                    :label="item.label"
                  >
                    <div class="option-row">
                      <span class="option-main">{{ item.label }}</span>
                      <!-- <a-tag :color="item.statusColor">{{ item.statusLabel }}</a-tag> -->
                      <GiCellTag :value="item.statusLabel" :dict="status_type" />
                    </div>
                  </a-option>
                </a-select>
              </a-form-item>
            </a-form>
            <div v-if="selectedProjectEnvironment" class="summary-list">
              <div class="summary-item">
                <span class="summary-label">环境类型</span>
                <GiCellTag :value="selectedProjectEnvironment.type" :dict="server_type" />
              </div>
              <div class="summary-item">
                <span class="summary-label">服务器 IP</span>
                <span class="summary-value">{{ selectedProjectEnvironment.serverIp }}</span>
              </div>
              <!-- <div class="summary-item">
                <span class="summary-label">环境名称</span>
                <span class="summary-value">{{ selectedProjectEnvironment.name }}</span>
              </div> -->
              <div class="summary-item">
                <span class="summary-label">在线状态</span>
                <!-- <a-tag :color="selectedProjectEnvironment.statusColor">{{ selectedProjectEnvironment.statusLabel }}</a-tag> -->
                <GiCellTag :value="selectedProjectEnvironment.statusLabel" :dict="status_type" />
              </div>
              <div class="summary-item">
                <span class="summary-label">启用状态</span>
                <GiCellTag :value="selectedProjectEnvironment.status" :dict="status_type" />
              </div>
            </div>
          </a-card>
        </a-col>

        <a-col :span="12">
          <a-card title="自动化环境" size="small" class="config-card">
            <template #extra>
              <a-button type="outline" size="small" @click="goAutomationEnvironmentConfig">去配置</a-button>
            </template>
            <a-form :model="form" layout="vertical">
              <a-form-item label="执行节点" required>
                <a-select
                  v-model="form.automationEnvironmentId"
                  placeholder="请选择自动化环境"
                  allow-search
                  @change="handleAutomationEnvironmentChange"
                >
                  <a-option
                    v-for="item in automationEnvironmentOptions"
                    :key="item.value"
                    :value="item.value"
                    :label="item.label"
                  >
                    <div class="option-row">
                      <span class="option-main">{{ item.label }}</span>
                      <span class="option-main">{{ item.description?.name || '-' }}</span>
                      <div class="option-tags">
                        <!-- <a-tag :color="item.onlineStatusColor">{{ item.onlineStatusLabel }}</a-tag> -->
                        <!-- <a-tag :color="item.useStatusColor">{{ item.useStatusLabel }}</a-tag> -->
                        <GiCellTag :value="item.onlineStatusLabel" :dict="status_type" />
                        <GiCellTag :value="item.useStatusLabel" :dict="status_type" />
                      </div>
                    </div>
                  </a-option>
                </a-select>
              </a-form-item>
            </a-form>
            <div v-if="selectedAutomationEnvironment" class="summary-list">
              <div class="summary-item">
                <span class="summary-label">环境类型</span>
                <GiCellTag :value="selectedAutomationEnvironment.type" :dict="server_type" />
              </div>
              <div class="summary-item">
                <span class="summary-label">节点名称</span>
                <span class="summary-value">{{ selectedAutomationEnvironment.nodeName }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">在线状态</span>
                <GiCellTag :value="selectedAutomationEnvironment.onlineStatusLabel" :dict="status_type" />
              </div>
              <div class="summary-item">
                <span class="summary-label">使用状态</span>
                <GiCellTag :value="selectedAutomationEnvironment.useStatusLabel" :dict="status_type" />
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-card title="场景信息" size="small" class="scene-card">
        <a-table
          :data="sceneList"
          :pagination="false"
          row-key="id"
          size="small"
          :scroll="{ y: 280 }"
        >
          <template #columns>
            <a-table-column title="场景 ID" data-index="sceneId" :width="180" />
            <a-table-column title="场景名称" data-index="name" />
            <a-table-column title="执行状态" :width="120" align="center">
              <template #cell="{ record }">
                <GiCellTag v-if="getSceneExecuteFieldValue(record, 'executeStatus')" :value="getSceneExecuteFieldValue(record, 'executeStatus')" :dict="status_type" />
                <span v-else>-</span>
              </template>
            </a-table-column>
            <a-table-column title="上次结果" :width="120" align="center">
              <template #cell="{ record }">
                <GiCellTag v-if="getSceneExecuteFieldValue(record, 'executeResult')" :value="getSceneExecuteFieldValue(record, 'executeResult')" :dict="status_type" />
                <span v-else>-</span>
              </template>
            </a-table-column>
            <!-- <a-table-column title="通过率" :width="100" align="center">
              <template #cell="{ record }">
                {{ getScenePassRate(record) }}
              </template>
            </a-table-column> -->
            <a-table-column title="运行耗时" :width="120" align="center">
              <template #cell="{ record }">
                {{ getSceneDuration(record) }}
              </template>
            </a-table-column>
            <a-table-column title="构建号" :width="100" align="center">
              <template #cell="{ record }">
                {{ getSceneBuildNumber(record) }}
              </template>
            </a-table-column>
          </template>
        </a-table>
      </a-card>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { getAutomationEnvironmentConfigList, getAutomationEnvironmentRuntimeStatus } from '@/apis/automation/automationEnvironmentConfig'
import { type AutomationUiSceneExecAllReq, type AutomationUiSceneExecReq, execAllAutomationUiScene, execAutomationUiScene } from '@/apis/automation/automationUiScene'
import { getProjectConfig } from '@/apis/project/projectConfig'
import { getProjectEnvironmentConfigList, getProjectEnvironmentRuntimeStatus } from '@/apis/project/projectEnvironmentConfig'
import { getProjectVersionConfig } from '@/apis/project/projectVersionConfig'
import { useUserStore } from '@/stores'
import { formatDuration } from '@/utils/sakura'
import { useDict } from '@/hooks/app'
import { pickSceneExecuteField } from '@/utils/automationUiSceneStatus'
import GiCellTag from '@/components/GiCell/GiCellTag.vue'
import type { LabelValueState } from '@/types/global'

const { server_type, status_type } = useDict('server_type', 'status_type')

interface SceneDebugRecord {
  executeStatus?: string
  executeResult?: string
  duration?: number | string
  buildNumber?: string | number
  consoleUrl?: string
  testReportUrl?: string
}

interface SceneTestRecord extends SceneDebugRecord {
  testPlanId?: string | number
}

interface SceneRow {
  id: string | number
  projectId: string | number
  versionId?: string | number
  projectName?: string
  versionName?: string
  sceneId?: string
  name?: string
  lastResult?: string
  executeStatus?: string
  passRate?: string
  debugRecord?: SceneDebugRecord[]
  testRecord?: SceneTestRecord[]
}

interface OpenOptions {
  mode?: 'selected' | 'all'
  query?: Record<string, any>
  source?: 'ui' | 'plan'
}

interface ProjectEnvironmentOption {
  value: string
  label: string
  name: string
  type: string
  serverIp: string
  status: string
  statusLabel: string
  statusColor: string
}

interface AutomationEnvironmentOption {
  value: string
  label: string
  nodeName: string
  type: string
  onlineStatusLabel: string
  onlineStatusColor: string
  useStatusLabel: string
  useStatusColor: string
  description?: {
    name: string
    systemType: string
    userName: string
    passWord: string
    credentialsId: string
  }
}

type SelectChangeValue = string | number | boolean | Record<string, any> | (string | number | boolean | Record<string, any>)[]

const emit = defineEmits<{
  (e: 'success'): void
}>()

const router = useRouter()
const userStore = useUserStore()

const visible = ref(false)
const sceneList = ref<SceneRow[]>([])
const openMode = ref<'selected' | 'all'>('selected')
const sceneSource = ref<'ui' | 'plan'>('ui')
const sceneQuery = ref<Record<string, any>>({})
const projectName = ref('-')
const versionName = ref('-')
const form = reactive<AutomationUiSceneExecReq>({
  sceneIds: [],
  projectEnvironmentId: '',
  automationEnvironmentId: '',
  executeName: '',
  executeEmail: '',
})

const projectEnvironmentOptions = ref<ProjectEnvironmentOption[]>([])
const automationEnvironmentOptions = ref<AutomationEnvironmentOption[]>([])

const displayProjectName = computed(() => {
  return projectName.value
})

const displayVersionName = computed(() => {
  return versionName.value
})

const selectedProjectEnvironment = computed(() => {
  return projectEnvironmentOptions.value.find(item => item.value === String(form.projectEnvironmentId))
})

const selectedAutomationEnvironment = computed(() => {
  return automationEnvironmentOptions.value.find(item => item.value === String(form.automationEnvironmentId))
})

const normalizeTagColor = (status: string) => {
  switch (status) {
    case '在线':
      return 'green'
    case '使用中':
      return 'arcoblue'
    case '空闲':
      return 'green'
    case '离线':
      return 'red'
    case '10':
    case '未开始':
      return 'gray'
    case '11':
    case '进行中':
      return 'arcoblue'
    case '12':
    case '已完成':
      return 'green'
    default:
      return 'gray'
  }
}

const getProjectStatusMeta = (status: string | number | undefined) => {
  const label = String(status) === '5' || status === '在线' ? '在线' : '离线'
  return {
    statusLabel: label,
    statusColor: normalizeTagColor(label),
  }
}

const getAutomationOnlineMeta = (status: string | number | undefined) => {
  const label = String(status) === '5' || status === '在线' ? '在线' : '离线'
  return {
    onlineStatusLabel: label,
    onlineStatusColor: normalizeTagColor(label),
  }
}

const getAutomationUseMeta = (status: string | number | undefined) => {
  const label = String(status) === '8' || status === '使用中'
    ? '使用中'
    : String(status) === '7' || status === '空闲'
      ? '空闲'
      : '离线'
  return {
    useStatusLabel: label,
    useStatusColor: normalizeTagColor(label),
  }
}

const getPrimaryServer = (item: any) => {
  const servers = Array.isArray(item?.serverConfig) ? item.serverConfig : []
  return servers.find((server: any) => Number(server?.status) === 1) || servers[0]
}

const getPrimaryNode = (item: any) => {
  const nodes = Array.isArray(item?.nodeConfig) ? item.nodeConfig : []
  return nodes.find((node: any) => Number(node?.status) === 1) || nodes[0]
}

const updateProjectEnvironmentStatus = (environmentId: string | number, status: string | number, serverIp?: string) => {
  const option = projectEnvironmentOptions.value.find(item => item.value === String(environmentId))
  if (!option)
    return
  const nextStatus = getProjectStatusMeta(status)
  option.statusLabel = nextStatus.statusLabel
  option.statusColor = nextStatus.statusColor
  if (serverIp)
    option.serverIp = serverIp
}

const updateAutomationEnvironmentStatus = (environmentId: string | number, onlineStatus: string | number, useStatus: string | number, nodeName?: string) => {
  const option = automationEnvironmentOptions.value.find(item => item.value === String(environmentId))
  if (!option)
    return
  const nextOnline = getAutomationOnlineMeta(onlineStatus)
  const nextUse = getAutomationUseMeta(useStatus)
  option.onlineStatusLabel = nextOnline.onlineStatusLabel
  option.onlineStatusColor = nextOnline.onlineStatusColor
  option.useStatusLabel = nextUse.useStatusLabel
  option.useStatusColor = nextUse.useStatusColor
  if (nodeName) {
    option.nodeName = nodeName
    option.label = nodeName
  }
}

const fetchProjectEnvironmentRuntimeStatus = async (environmentId: string | number) => {
  const { data } = await getProjectEnvironmentRuntimeStatus(environmentId)
  updateProjectEnvironmentStatus(environmentId, data.onlineStatus, data.serverIp)
}

const fetchAutomationEnvironmentRuntimeStatus = async (environmentId: string | number) => {
  const { data } = await getAutomationEnvironmentRuntimeStatus(environmentId)
  updateAutomationEnvironmentStatus(environmentId, data.onlineStatus, data.useStatus, data.nodeName)
}

const loadProjectEnvironments = async (projectId: string | number) => {
  const { data } = await getProjectEnvironmentConfigList({
    id: undefined,
    projectId: String(projectId),
    name: undefined,
    status: 1,
    sort: ['name,asc'],
  })

  projectEnvironmentOptions.value = data.map((item: any) => {
    const server = getPrimaryServer(item)
    const statusMeta = getProjectStatusMeta(server?.status ?? item?.status)
    return {
      value: String(item.id),
      label: server?.ip || item.name || '-',
      name: item.name,
      type: server.type || '-',
      serverIp: server?.ip || '-',
      status: server?.status ?? item?.status,
      statusLabel: statusMeta.statusLabel,
      statusColor: statusMeta.statusColor,
    }
  })

  form.projectEnvironmentId = projectEnvironmentOptions.value[0]?.value || ''
  if (form.projectEnvironmentId)
    await fetchProjectEnvironmentRuntimeStatus(form.projectEnvironmentId)
}

const loadAutomationEnvironments = async () => {
  const { data } = await getAutomationEnvironmentConfigList({
    status: 1,
    sort: ['name,asc'],
  })

  automationEnvironmentOptions.value = data.map((item: any) => {
    const node = getPrimaryNode(item)
    const onlineMeta = getAutomationOnlineMeta(node?.active?.offline?.status)
    const useMeta = getAutomationUseMeta(node?.active?.idle?.status)

    let descObj: AutomationEnvironmentOption['description']
    const descRaw = node?.description || item.description
    if (descRaw) {
      if (typeof descRaw === 'string') {
        try {
          descObj = JSON.parse(descRaw)
        } catch {
          descObj = undefined
        }
      } else if (typeof descRaw === 'object') {
        descObj = descRaw
      }
    }
    return {
      value: String(item.id),
      label: node?.name || item.name || '-',
      nodeName: node?.name || '-',
      type: node.type || '-',
      onlineStatusLabel: onlineMeta.onlineStatusLabel,
      onlineStatusColor: onlineMeta.onlineStatusColor,
      useStatusLabel: useMeta.useStatusLabel,
      useStatusColor: useMeta.useStatusColor,
      description: descObj,
    }
  })

  form.automationEnvironmentId = automationEnvironmentOptions.value[0]?.value || ''
  if (form.automationEnvironmentId)
    await fetchAutomationEnvironmentRuntimeStatus(form.automationEnvironmentId)
}

const toSelectId = (value: SelectChangeValue): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number')
    return value
  return undefined
}

const handleProjectEnvironmentChange = async (value: SelectChangeValue) => {
  const nextValue = toSelectId(value)
  if (nextValue === undefined)
    return
  form.projectEnvironmentId = nextValue
  await fetchProjectEnvironmentRuntimeStatus(nextValue)
}

const handleAutomationEnvironmentChange = async (value: SelectChangeValue) => {
  const nextValue = toSelectId(value)
  if (nextValue === undefined)
    return
  form.automationEnvironmentId = nextValue
  await fetchAutomationEnvironmentRuntimeStatus(nextValue)
}

const getLastDebugRecord = (record: SceneRow) => {
  if (sceneSource.value === 'plan') {
    if (Array.isArray(record.testRecord) && record.testRecord.length > 0)
      return record.testRecord[0]
    if (Array.isArray(record.debugRecord) && record.debugRecord.length > 0)
      return record.debugRecord[0]
  } else {
    if (Array.isArray(record.debugRecord) && record.debugRecord.length > 0)
      return record.debugRecord[0]
    if (Array.isArray(record.testRecord) && record.testRecord.length > 0)
      return record.testRecord[0]
  }
  return undefined
}

const getSceneExecuteFieldValue = (record: SceneRow, field: 'executeStatus' | 'executeResult') => {
  const lastRecord = getLastDebugRecord(record)
  const recordForPick = lastRecord ? { ...record, debugRecord: [lastRecord] } : record
  return pickSceneExecuteField(recordForPick, field, status_type.value)
}

const getSceneDuration = (record: SceneRow) => {
  const duration = getLastDebugRecord(record)?.duration
  if (duration === undefined || duration === null || duration === '-' || duration === '')
    return '-'
  return formatDuration(Number(duration))
}

const getSceneBuildNumber = (record: SceneRow) => {
  return getLastDebugRecord(record)?.buildNumber || '-'
}

const getScenePassRate = (record: SceneRow) => {
  const passRate = record.passRate
  if (passRate === undefined || passRate === null || passRate === '-' || passRate === '') return '-'
  return `${passRate}%`
}

const goProjectEnvironmentConfig = async () => {
  visible.value = false
  await router.push({
    path: '/project/environmentConfig',
    query: { projectId: String(sceneList.value[0]?.projectId || '') },
  })
}

const goAutomationEnvironmentConfig = async () => {
  visible.value = false
  await router.push({
    path: '/automation/environmentConfig',
    query: { type: 'ui' },
  })
}

const loadSceneMeta = async (row?: SceneRow) => {
  projectName.value = row?.projectName || '-'
  versionName.value = row?.versionName || '-'

  try {
    if (row?.projectId) {
      const { data } = await getProjectConfig(String(row.projectId))
      projectName.value = data?.name || projectName.value
    }

    if (row?.versionId) {
      const { data } = await getProjectVersionConfig(String(row.versionId))
      versionName.value = data?.name || versionName.value
    }
  } catch (error) {
    console.error('loadSceneMeta error', error)
  }
}

const onOpen = async (rows: SceneRow[], options: OpenOptions = {}) => {
  sceneList.value = rows
  openMode.value = options.mode ?? 'selected'
  sceneSource.value = options.source ?? 'ui'
  sceneQuery.value = options.query ?? {}
  form.sceneIds = rows.map(item => item.id)
  form.executeName = userStore.userInfo.nickname || userStore.userInfo.username
  form.executeEmail = userStore.userInfo.email
  visible.value = true

  await loadSceneMeta(rows[0])

  if (rows.length > 0) {
    await loadProjectEnvironments(rows[0].projectId)
  }
  await loadAutomationEnvironments()
}

const handleOk = async () => {
  if (!form.projectEnvironmentId) {
    Message.warning('请选择产品环境')
    return false
  }
  if (!form.automationEnvironmentId) {
    Message.warning('请选择自动化环境')
    return false
  }

  // 执行前刷新一次环境状态，避免使用过期状态继续执行
  try {
    await Promise.all([
      fetchProjectEnvironmentRuntimeStatus(form.projectEnvironmentId),
      fetchAutomationEnvironmentRuntimeStatus(form.automationEnvironmentId),
    ])
  } catch (error) {
    console.error('refresh runtime status error', error)
  }

  if (selectedProjectEnvironment.value?.statusLabel !== '在线') {
    Message.warning('当前产品环境，服务器非在线状态不可用，请切换为在线环境后再执行！')
    return false
  }

  if (selectedAutomationEnvironment.value?.useStatusLabel !== '空闲') {
    Message.warning('当前自动化环境，执行节点非空闲状态不可用，请切换为空闲节点后再执行！')
    return false
  }

  try {
    const request = openMode.value === 'all'
      ? execAllAutomationUiScene({
          projectId: sceneList.value[0]?.projectId || sceneQuery.value.projectId,
          versionId: sceneList.value[0]?.versionId || sceneQuery.value.versionId,
          moduleId: sceneQuery.value.moduleId,
          level: sceneQuery.value.level,
          executeStatus: sceneQuery.value.executeStatus,
          executeResult: sceneQuery.value.executeResult,
          status: sceneQuery.value.status,
          projectEnvironmentId: form.projectEnvironmentId,
          automationEnvironmentId: form.automationEnvironmentId,
          executeName: form.executeName,
          executeEmail: form.executeEmail,
        } as AutomationUiSceneExecAllReq)
      : execAutomationUiScene(form as AutomationUiSceneExecReq)
    const { data } = await request
    if (data?.buildNumber && data.consoleUrl) {
      Message.success('执行成功，正在跳转 Jenkins 控制台')
      window.open(data.consoleUrl)
      emit('success')
      return true
    }
  } catch (error) {
    console.error('exec automation ui scene error', error)
  }

  Message.error('执行失败，请检查 Jenkins 环境与任务配置')
  return false
}

const handleClose = () => {
  sceneList.value = []
  openMode.value = 'selected'
  sceneSource.value = 'ui'
  sceneQuery.value = {}
  projectName.value = '-'
  versionName.value = '-'
  form.sceneIds = []
  form.projectEnvironmentId = ''
  form.automationEnvironmentId = ''
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.execute-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.meta-row {
  margin-top: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--color-fill-2);
}

.config-row {
  margin-top: -4px;
}

.config-card,
.scene-card {
  border-radius: 12px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.option-main {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-tags {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--color-fill-2);
}

.summary-label {
  color: var(--color-text-3);
  font-size: 13px;
}

.summary-value {
  color: var(--color-text-1);
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}

:deep(.arco-card-body) {
  padding: 12px 10px 0px 10px !important;
}
:deep(.arco-form-item) {
    margin-bottom: 10px;
}
:deep(.arco-table-body) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 30px;
}
</style>
