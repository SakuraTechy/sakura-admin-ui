<template>
  <div class="gi_table_page">
    <GiTable
      v-model:selectedKeys="selectedKeys"
      title="测试计划"
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :row-selection="{ type: 'checkbox', showCheckedAll: true }"
      :show-selection-alert="true"
      :scroll="{ x: true, y: '100%', minWidth: 1600 }"
      @refresh="search"
      @select="select"
      @select-all="selectAll"
    >
      <template #toolbar-left>
        <a-input-search v-model="queryForm.name" placeholder="计划名称" allow-clear @search="search" />
        <a-input-search v-model="queryForm.projectId" placeholder="项目 ID" allow-clear @search="search" />
        <a-input-search v-model="queryForm.type" placeholder="计划类型" allow-clear @search="search" />
        <a-select
          v-model="queryForm.status"
          :options="planStatusOptions"
          placeholder="计划状态"
          allow-clear
          style="width: 160px"
          @change="search"
        />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          重置
        </a-button>
      </template>
      <template #toolbar-right>
        <a-button type="primary" @click="openForm()">
          <template #icon><icon-plus /></template>
          新增
        </a-button>
        <a-button status="danger" :disabled="!selectedKeys.length" @click="onDelete()">
          <template #icon><icon-delete /></template>
          删除
        </a-button>
        <a-button @click="onExport">
          <template #icon><icon-download /></template>
          导出
        </a-button>
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="planStatusOptions" />
      </template>
      <template #progress="{ record }">
        <a-progress :percent="Number(record.testProgress || 0)" size="mini" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link @click="openDetail(record)">详情</a-link>
          <a-link @click="openForm(record)">修改</a-link>
          <a-link @click="openPlanSceneDrawer(record)">场景视图</a-link>
          <a-link @click="goToReports(record)">报告</a-link>
          <a-link @click="openSceneModal(record)">关联场景</a-link>
          <a-link @click="openExecModal(record)">执行</a-link>
          <a-link status="danger" @click="onDelete(record)">删除</a-link>
        </a-space>
      </template>
    </GiTable>

    <a-modal v-model:visible="formVisible" :title="formState.id ? '修改测试计划' : '新增测试计划'" width="720px" @ok="submitForm">
      <a-form :model="formState" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item field="projectId" label="项目 ID"><a-input-number v-model="formState.projectId" style="width: 100%" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item field="projectName" label="项目名称"><a-input v-model="formState.projectName" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item field="name" label="计划名称"><a-input v-model="formState.name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item field="abbreviate" label="计划简称"><a-input v-model="formState.abbreviate" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item field="type" label="计划类型"><a-input v-model="formState.type" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item field="status" label="状态"><a-select v-model="formState.status" :options="planStatusOptions" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item field="description" label="描述"><a-textarea v-model="formState.description" :auto-size="{ minRows: 3, maxRows: 5 }" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item field="memberIdsText" label="成员 ID（逗号分隔）"><a-input v-model="formState.memberIdsText" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item field="principalIdsText" label="负责人 ID（逗号分隔）"><a-input v-model="formState.principalIdsText" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="sceneVisible" title="关联测试场景" width="520px" @ok="submitSceneRelation">
      <a-form :model="sceneState" layout="vertical">
        <a-form-item label="场景 ID（逗号分隔）">
          <a-input v-model="sceneState.sceneIdsText" placeholder="例如：1001,1002,1003" />
        </a-form-item>
        <a-form-item label="操作">
          <a-radio-group v-model="sceneState.mode" type="button">
            <a-radio value="relate">关联</a-radio>
            <a-radio value="remove">取消关联</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="execVisible" title="执行测试计划" width="520px" @ok="submitExecute">
      <a-form :model="execState" layout="vertical">
        <a-form-item label="项目环境 ID"><a-input-number v-model="execState.projectEnvironmentId" style="width: 100%" /></a-form-item>
        <a-form-item label="自动化环境 ID"><a-input-number v-model="execState.automationEnvironmentId" style="width: 100%" /></a-form-item>
        <a-form-item label="执行人"><a-input v-model="execState.executeName" /></a-form-item>
        <a-form-item label="执行邮箱"><a-input v-model="execState.executeEmail" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:visible="detailVisible" :width="960" title="测试计划详情" :footer="false">
      <a-space direction="vertical" fill>
        <a-card :bordered="false">
          <a-space>
            <a-button type="primary" @click="detailRecord && openPlanSceneDrawer(detailRecord)">查看场景视图</a-button>
            <a-button @click="detailRecord && goToReports(detailRecord)">查看报告</a-button>
            <a-button @click="detailRecord && openExecModal(detailRecord)">立即执行</a-button>
          </a-space>
        </a-card>
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="计划 ID">{{ detailRecord?.id || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划名称">{{ detailRecord?.name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="项目">{{ detailRecord?.projectName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划类型">{{ detailRecord?.type || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划简称">{{ detailRecord?.abbreviate || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划状态">
            <GiCellTag v-if="detailRecord?.status" :value="detailRecord.status" :dict="planStatusOptions" />
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="场景数">{{ detailRecord?.sceneCount ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="已执行">{{ detailRecord?.executedCount ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="已通过">{{ detailRecord?.passedCount ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="执行进度">{{ detailRecord?.testProgress ?? 0 }}%</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ detailRecord?.createTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ detailRecord?.updateTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="成员 ID" :span="2">{{ formatList(detailRecord?.memberIds) }}</a-descriptions-item>
          <a-descriptions-item label="负责人 ID" :span="2">{{ formatList(detailRecord?.principalIds) }}</a-descriptions-item>
          <a-descriptions-item label="关联场景 ID" :span="2">{{ formatList(detailRecord?.uiTestScene) }}</a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">{{ detailRecord?.description || '-' }}</a-descriptions-item>
        </a-descriptions>
      </a-space>
    </a-drawer>

    <a-drawer v-model:visible="planSceneVisible" :width="1280" title="计划场景视图" :footer="false">
      <a-alert v-if="planSceneCurrent" class="mb-3" type="info">
        当前计划：{{ planSceneCurrent.name }}，关联场景 {{ planSceneList.length }} 个
      </a-alert>
      <a-table
        :data="planSceneList"
        :loading="planSceneLoading"
        :pagination="false"
        :scroll="{ x: 1900, y: 560 }"
        :columns="planSceneColumns"
        row-key="id"
        size="small"
      >
        <template #status="{ record }">
          <GiCellTag :value="normalizeStatus(record.planRecord?.executeStatus)" :dict="sceneStatusOptions" />
        </template>
        <template #result="{ record }">
          <GiCellTag :value="normalizeResult(record.planRecord?.executeResult)" :dict="sceneResultOptions" />
        </template>
        <template #duration="{ record }">
          {{ formatDuration(record.planRecord?.duration) }}
        </template>
        <template #metric="{ record, column }">
          {{ toMetricValue(record.planRecord?.[column.dataIndex]) }}
        </template>
        <template #link="{ record, column }">
          <a-link v-if="resolveSceneLink(record, column.dataIndex)" :href="resolveSceneLink(record, column.dataIndex)" target="_blank">
            打开
          </a-link>
          <span v-else>-</span>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { Message, Modal, type TableInstance } from '@arco-design/web-vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addTestPlan,
  deleteTestPlan,
  executeTestPlan,
  exportTestPlan,
  getTestPlan,
  listTestPlan,
  relateTestPlanScenes,
  removeTestPlanScenes,
  type TestPlanExecuteResp,
  type TestPlanQuery,
  type TestPlanResp,
  updateTestPlan,
} from '@/apis/test/testPlan'
import { getAutomationUiSceneSelected, type AutomationUiSceneResp } from '@/apis/automation/automationUiScene'
import { useTable } from '@/hooks'

defineOptions({ name: 'TestTestPlan' })

type ScenePlanRecord = Record<string, any>
type PlanSceneRow = AutomationUiSceneResp & { planRecord?: ScenePlanRecord }

const route = useRoute()
const router = useRouter()

const planStatusOptions = [
  { label: '未开始', value: 'NOT_STARTED' },
  { label: '进行中', value: 'RUNNING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已归档', value: 'ARCHIVED' },
]
const sceneStatusOptions = [
  { label: '未开始', value: 'NOT_STARTED' },
  { label: '进行中', value: 'RUNNING' },
  { label: '已完成', value: 'COMPLETED' },
]
const sceneResultOptions = [
  { label: '全部通过', value: 'PASSED' },
  { label: '不通过', value: 'FAILED' },
  { label: '跳过', value: 'SKIPPED' },
]

const queryForm = reactive<TestPlanQuery>({
  name: undefined,
  projectId: undefined,
  type: undefined,
  status: undefined,
  sort: ['createTime,desc'],
})

const {
  tableData: dataList,
  loading,
  pagination,
  search,
  selectedKeys,
  select,
  selectAll,
} = useTable((page) => listTestPlan({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: 'ID', dataIndex: 'id', width: 170 },
  { title: '项目', dataIndex: 'projectName', width: 160 },
  { title: '计划名称', dataIndex: 'name', width: 220, ellipsis: true, tooltip: true },
  { title: '类型', dataIndex: 'type', width: 120 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 120, align: 'center' },
  { title: '场景数', dataIndex: 'sceneCount', width: 100 },
  { title: '已执行', dataIndex: 'executedCount', width: 100 },
  { title: '已通过', dataIndex: 'passedCount', width: 100 },
  { title: '进度', dataIndex: 'testProgress', slotName: 'progress', width: 180 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 420, align: 'center', fixed: 'right' },
]

const planSceneColumns: TableInstance['columns'] = [
  { title: '场景 ID', dataIndex: 'sceneId', width: 140, fixed: 'left' },
  { title: '场景名称', dataIndex: 'name', width: 220, ellipsis: true, tooltip: true, fixed: 'left' },
  { title: '版本', dataIndex: 'versionName', width: 140 },
  { title: '模块路径', dataIndex: 'modulePath', width: 240, ellipsis: true, tooltip: true },
  { title: '等级', dataIndex: 'level', width: 90 },
  { title: '执行状态', dataIndex: 'executeStatus', slotName: 'status', width: 110, align: 'center' },
  { title: '执行结果', dataIndex: 'executeResult', slotName: 'result', width: 110, align: 'center' },
  { title: '场景通过率', dataIndex: 'scenePassRate', width: 110, render: ({ record }) => record.planRecord?.scenePassRate || '-' },
  { title: '持续时长', dataIndex: 'duration', slotName: 'duration', width: 120 },
  { title: '用例总数', dataIndex: 'caseTotal', slotName: 'metric', width: 100 },
  { title: '用例通过', dataIndex: 'casePass', slotName: 'metric', width: 100 },
  { title: '用例失败', dataIndex: 'caseFail', slotName: 'metric', width: 100 },
  { title: '用例跳过', dataIndex: 'caseSkip', slotName: 'metric', width: 100 },
  { title: '步骤总数', dataIndex: 'stepTotal', slotName: 'metric', width: 100 },
  { title: '步骤通过', dataIndex: 'stepPass', slotName: 'metric', width: 100 },
  { title: '步骤失败', dataIndex: 'stepFail', slotName: 'metric', width: 100 },
  { title: '步骤跳过', dataIndex: 'stepSkip', slotName: 'metric', width: 100 },
  { title: '执行人', dataIndex: 'executeName', width: 120, render: ({ record }) => record.planRecord?.executeName || '-' },
  { title: '日志', dataIndex: 'consoleUrl', slotName: 'link', width: 90, align: 'center' },
  { title: '报告', dataIndex: 'testReportUrl', slotName: 'link', width: 90, align: 'center' },
  { title: '视频', dataIndex: 'videoUrl', slotName: 'link', width: 90, align: 'center' },
]

const formVisible = ref(false)
const sceneVisible = ref(false)
const execVisible = ref(false)
const detailVisible = ref(false)
const currentRecord = ref<TestPlanResp | null>(null)
const detailRecord = ref<TestPlanResp | null>(null)
const planSceneVisible = ref(false)
const planSceneLoading = ref(false)
const planSceneCurrent = ref<TestPlanResp | null>(null)
const planSceneList = ref<PlanSceneRow[]>([])

const formState = reactive<any>({
  id: '',
  projectId: undefined,
  projectName: '',
  name: '',
  abbreviate: '',
  type: '',
  description: '',
  status: 'NOT_STARTED',
  memberIdsText: '',
  principalIdsText: '',
})

const sceneState = reactive({
  sceneIdsText: '',
  mode: 'relate',
})

const execState = reactive({
  projectEnvironmentId: undefined,
  automationEnvironmentId: undefined,
  executeName: '',
  executeEmail: '',
})

const reset = () => {
  queryForm.name = undefined
  queryForm.projectId = undefined
  queryForm.type = undefined
  queryForm.status = undefined
  search()
}

const openForm = (record?: TestPlanResp) => {
  currentRecord.value = record || null
  formState.id = record?.id || ''
  formState.projectId = record?.projectId
  formState.projectName = record?.projectName || ''
  formState.name = record?.name || ''
  formState.abbreviate = record?.abbreviate || ''
  formState.type = record?.type || ''
  formState.description = record?.description || ''
  formState.status = record?.status || 'NOT_STARTED'
  formState.memberIdsText = Array.isArray(record?.memberIds) ? record.memberIds.join(',') : ''
  formState.principalIdsText = Array.isArray(record?.principalIds) ? record.principalIds.join(',') : ''
  formVisible.value = true
}

const openDetail = async (record: TestPlanResp) => {
  const { data } = await getTestPlan(record.id)
  detailRecord.value = data || record
  detailVisible.value = true
  await router.replace({
    path: '/test/testPlan',
    query: { id: record.id },
  })
}

watch(detailVisible, async (visible) => {
  if (!visible && route.query.id) {
    await router.replace({ path: '/test/testPlan', query: {} })
  }
})

const openSceneModal = (record: TestPlanResp) => {
  currentRecord.value = record
  sceneState.sceneIdsText = Array.isArray(record.uiTestScene) ? record.uiTestScene.join(',') : ''
  sceneState.mode = 'relate'
  sceneVisible.value = true
}

const openExecModal = (record: TestPlanResp) => {
  currentRecord.value = record
  execState.projectEnvironmentId = undefined
  execState.automationEnvironmentId = undefined
  execState.executeName = ''
  execState.executeEmail = ''
  execVisible.value = true
}

const openPlanSceneDrawer = async (record: TestPlanResp) => {
  planSceneCurrent.value = record
  planSceneVisible.value = true
  planSceneList.value = []
  if (!record.uiTestScene?.length) return
  planSceneLoading.value = true
  try {
    const { data } = await getAutomationUiSceneSelected(record.uiTestScene)
    planSceneList.value = (data || []).map((item) => ({
      ...item,
      planRecord: getPlanRecord(item, record.id),
    }))
  } finally {
    planSceneLoading.value = false
  }
}

const goToReports = async (record: TestPlanResp, reportId?: string) => {
  await router.push({
    path: '/test/testReport',
    query: {
      testPlanId: record.id,
      ...(reportId ? { id: reportId } : {}),
    },
  })
}

watch(
  () => route.query.id,
  async (id) => {
    if (!id) return
    const record = dataList.value.find(item => String(item.id) === String(id))
    if (record) {
      await openDetail(record)
      return
    }
    const { data } = await getTestPlan(String(id))
    if (!data) return
    detailRecord.value = data
    detailVisible.value = true
  },
  { immediate: true }
)

const parseIds = (text: string) => text.split(',').map(item => Number(item.trim())).filter(item => !Number.isNaN(item))

const submitForm = async () => {
  const payload = {
    projectId: Number(formState.projectId),
    projectName: formState.projectName,
    name: formState.name,
    abbreviate: formState.abbreviate,
    type: formState.type,
    description: formState.description,
    status: formState.status,
    memberIds: parseIds(formState.memberIdsText),
    principalIds: parseIds(formState.principalIdsText),
  }
  if (formState.id) await updateTestPlan(payload, formState.id)
  else await addTestPlan(payload)
  Message.success('保存成功')
  formVisible.value = false
  search()
}

const submitSceneRelation = async () => {
  if (!currentRecord.value) return
  const sceneIds = parseIds(sceneState.sceneIdsText)
  if (!sceneIds.length) {
    Message.warning('请输入场景 ID')
    return
  }
  if (sceneState.mode === 'relate') await relateTestPlanScenes(currentRecord.value.id, sceneIds)
  else await removeTestPlanScenes(currentRecord.value.id, sceneIds)
  Message.success(sceneState.mode === 'relate' ? '关联成功' : '取消关联成功')
  sceneVisible.value = false
  await search()
  if (planSceneVisible.value && planSceneCurrent.value?.id === currentRecord.value.id) {
    const nextRecord = dataList.value.find(item => item.id === currentRecord.value?.id) || currentRecord.value
    await openPlanSceneDrawer(nextRecord)
  }
}

const submitExecute = async () => {
  if (!currentRecord.value) return
  const current = currentRecord.value
  const { data } = await executeTestPlan(current.id, { ...execState })
  const executeResp = (data || {}) as TestPlanExecuteResp
  const buildMessage = data?.buildNumber ? `，构建号 ${data.buildNumber}` : ''
  Message.success(`执行已触发${buildMessage}`)
  execVisible.value = false
  await search()
  const nextRecord = dataList.value.find(item => item.id === current.id) || current
  await openPlanSceneDrawer(nextRecord)
  if (detailVisible.value && detailRecord.value?.id === current.id) {
    detailRecord.value = nextRecord
  }
  if (executeResp.testReportId) {
    await goToReports(nextRecord, String(executeResp.testReportId))
  }
}

const onDelete = (record?: TestPlanResp) => {
  const ids = selectedKeys.value.length ? selectedKeys.value.map(item => String(item)) : record ? record.id : ''
  Modal.warning({
    title: '确认删除',
    content: selectedKeys.value.length
      ? '确认删除选中的测试计划吗？'
      : `确认删除测试计划“${record?.name || ''}”吗？`,
    hideCancel: false,
    onOk: async () => {
      await deleteTestPlan(ids)
      Message.success('删除成功')
      search()
    },
  })
}

const onExport = async () => {
  await exportTestPlan(selectedKeys.value.length
    ? { ...queryForm, id: selectedKeys.value.join(',') }
    : queryForm)
}

const getPlanRecord = (scene: AutomationUiSceneResp, planId: string) => {
  const records = Array.isArray(scene.testRecord) ? scene.testRecord : []
  return records.find((item: any) => String(item?.testPlanId) === String(planId))
}

const normalizeStatus = (value?: string) => {
  if (!value) return 'NOT_STARTED'
  if (value === '已完成') return 'COMPLETED'
  if (value === '进行中') return 'RUNNING'
  if (value === '未开始') return 'NOT_STARTED'
  return value
}

const normalizeResult = (value?: string) => {
  if (!value) return ''
  if (value === '全部通过') return 'PASSED'
  if (value === '不通过') return 'FAILED'
  if (value === '跳过') return 'SKIPPED'
  return value
}

const toMetricValue = (value: unknown) => value ?? '-'

const formatDuration = (value: unknown) => {
  const total = Number(value)
  if (!Number.isFinite(total) || total < 0) return '-'
  if (total < 1000) return `${total} ms`
  const seconds = Math.floor(total / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  if (minutes <= 0) return `${seconds} s`
  return `${minutes} m ${remainSeconds} s`
}

const resolveSceneLink = (record: PlanSceneRow, key: string) => {
  const planRecord = record.planRecord || {}
  if (key === 'consoleUrl') return planRecord.consoleUrl || record.consoleUrl || ''
  if (key === 'testReportUrl') return planRecord.testReportUrl || record.testReportUrl || ''
  if (key === 'videoUrl') {
    const reportUrl = planRecord.testReportUrl || record.testReportUrl
    if (!reportUrl) return ''
    if (reportUrl.includes('/index.html')) return reportUrl.replace('/index.html', `/video/${record.sceneId}.mp4`)
    return `${reportUrl.replace(/\/$/, '')}/video/${record.sceneId}.mp4`
  }
  return ''
}

const formatList = (value?: Array<string | number>) => {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.join(', ')
}
</script>

<style scoped lang="scss"></style>
