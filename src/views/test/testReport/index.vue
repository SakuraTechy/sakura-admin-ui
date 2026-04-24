<template>
  <div class="gi_table_page">
    <GiTable
      v-model:selectedKeys="selectedKeys"
      title="测试报告"
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :row-selection="{ type: 'checkbox', showCheckedAll: true }"
      :show-selection-alert="true"
      :scroll="{ x: true, y: '100%', minWidth: 1500 }"
      @refresh="search"
      @select="select"
      @select-all="selectAll"
    >
      <template #toolbar-left>
        <a-button v-if="queryForm.testPlanId" @click="goBackToPlan">
          <template #icon><icon-left /></template>
          返回计划
        </a-button>
        <a-input-search v-model="queryForm.name" placeholder="报告名称" allow-clear @search="search" />
        <a-input-search v-model="queryForm.projectId" placeholder="项目 ID" allow-clear @search="search" />
        <a-input-search v-model="queryForm.testPlanId" placeholder="计划 ID" allow-clear @search="search" />
        <a-select
          v-model="queryForm.status"
          :options="statusOptions"
          placeholder="报告状态"
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
        <GiCellTag :value="record.status" :dict="statusOptions" />
      </template>
      <template #link="{ record, column }">
        <a-link v-if="record[column.dataIndex]" :href="record[column.dataIndex]" target="_blank">
          打开
        </a-link>
        <span v-else>-</span>
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link @click="openDetail(record)">详情</a-link>
          <a-link @click="openForm(record)">修改</a-link>
          <a-link status="danger" @click="onDelete(record)">删除</a-link>
        </a-space>
      </template>
    </GiTable>

    <a-modal
      v-model:visible="formVisible"
      :title="formState.id ? '修改测试报告' : '新增测试报告'"
      width="720px"
      @ok="submitForm"
    >
      <a-form :model="formState" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="项目 ID">
              <a-input-number v-model="formState.projectId" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="项目名称">
              <a-input v-model="formState.projectName" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="计划 ID">
              <a-input-number v-model="formState.testPlanId" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="计划名称">
              <a-input v-model="formState.testPlanName" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="报告名称">
              <a-input v-model="formState.name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="版本名称">
              <a-input v-model="formState.versionName" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="触发方式">
              <a-select v-model="formState.triggerMode" :options="triggerOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="执行方式">
              <a-select v-model="formState.executeMode" :options="executeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model="formState.status" :options="statusOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="描述">
              <a-textarea v-model="formState.description" :auto-size="{ minRows: 3, maxRows: 5 }" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-drawer v-model:visible="detailVisible" title="测试报告详情" :width="960" :footer="false">
      <a-tabs>
        <a-tab-pane key="basic" title="基础信息">
          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="报告 ID">{{ detailData?.id || '-' }}</a-descriptions-item>
            <a-descriptions-item label="报告名称">{{ detailData?.name || '-' }}</a-descriptions-item>
            <a-descriptions-item label="项目名称">{{ detailData?.projectName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="版本名称">{{ detailData?.versionName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="测试计划">{{ detailData?.testPlanName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="构建号">{{ detailData?.buildNumber || '-' }}</a-descriptions-item>
            <a-descriptions-item label="触发方式">{{ detailData?.triggerMode || '-' }}</a-descriptions-item>
            <a-descriptions-item label="执行方式">{{ detailData?.executeMode || '-' }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ detailData?.status || '-' }}</a-descriptions-item>
            <a-descriptions-item label="耗时(ms)">{{ detailData?.runTime ?? '-' }}</a-descriptions-item>
            <a-descriptions-item label="控制台日志">
              <a-link v-if="detailData?.consoleUrl || uiStatistic.consoleUrl" :href="detailData?.consoleUrl || uiStatistic.consoleUrl" target="_blank">
                打开日志
              </a-link>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="测试报告">
              <a-link v-if="detailData?.reportUrl || uiStatistic.testReportUrl" :href="detailData?.reportUrl || uiStatistic.testReportUrl" target="_blank">
                打开报告
              </a-link>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="视频回放" :span="2">
              <a-link v-if="detailData?.videoUrl || uiStatistic.videoUrl" :href="detailData?.videoUrl || uiStatistic.videoUrl" target="_blank">
                打开视频
              </a-link>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="描述" :span="2">{{ detailData?.description || '-' }}</a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>
        <a-tab-pane key="stat" title="统计分析">
          <a-row :gutter="[16, 16]">
            <a-col :span="8">
              <a-card><a-statistic title="场景总数" :value="toNumber(uiStatistic.sceneTotal)" /></a-card>
            </a-col>
            <a-col :span="8">
              <a-card><a-statistic title="场景通过" :value="toNumber(uiStatistic.scenePass)" /></a-card>
            </a-col>
            <a-col :span="8">
              <a-card><a-statistic title="场景通过率" :value="uiStatistic.scenePassRate || '0%'" /></a-card>
            </a-col>
            <a-col :span="24">
              <a-descriptions :column="3" bordered size="small">
                <a-descriptions-item label="执行人">{{ uiStatistic.executeName || '-' }}</a-descriptions-item>
                <a-descriptions-item label="执行状态">{{ uiStatistic.executeStatus || '-' }}</a-descriptions-item>
                <a-descriptions-item label="执行结果">{{ uiStatistic.executeResult || '-' }}</a-descriptions-item>
                <a-descriptions-item label="开始时间">{{ uiStatistic.durationStartTime || '-' }}</a-descriptions-item>
                <a-descriptions-item label="结束时间">{{ uiStatistic.durationEndTime || '-' }}</a-descriptions-item>
                <a-descriptions-item label="持续时长(ms)">{{ uiStatistic.duration || '-' }}</a-descriptions-item>
              </a-descriptions>
            </a-col>
            <a-col :span="12">
              <a-card title="场景统计">
                <a-descriptions :column="2" bordered size="small">
                  <a-descriptions-item label="总数">{{ toNumber(uiStatistic.sceneTotal) }}</a-descriptions-item>
                  <a-descriptions-item label="通过">{{ toNumber(uiStatistic.scenePass) }}</a-descriptions-item>
                  <a-descriptions-item label="失败">{{ toNumber(uiStatistic.sceneFail) }}</a-descriptions-item>
                  <a-descriptions-item label="跳过">{{ toNumber(uiStatistic.sceneSkip) }}</a-descriptions-item>
                  <a-descriptions-item label="通过率" :span="2">{{ uiStatistic.scenePassRate || '0%' }}</a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-col>
            <a-col :span="12">
              <a-card title="用例统计">
                <a-descriptions :column="2" bordered size="small">
                  <a-descriptions-item label="总数">{{ toNumber(uiStatistic.caseTotal) }}</a-descriptions-item>
                  <a-descriptions-item label="通过">{{ toNumber(uiStatistic.casePass) }}</a-descriptions-item>
                  <a-descriptions-item label="失败">{{ toNumber(uiStatistic.caseFail) }}</a-descriptions-item>
                  <a-descriptions-item label="跳过">{{ toNumber(uiStatistic.caseSkip) }}</a-descriptions-item>
                  <a-descriptions-item label="通过率" :span="2">{{ uiStatistic.casePassRate || '0%' }}</a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-col>
            <a-col :span="24">
              <a-card title="步骤统计">
                <a-descriptions :column="3" bordered size="small">
                  <a-descriptions-item label="总数">{{ toNumber(uiStatistic.stepTotal) }}</a-descriptions-item>
                  <a-descriptions-item label="通过">{{ toNumber(uiStatistic.stepPass) }}</a-descriptions-item>
                  <a-descriptions-item label="失败">{{ toNumber(uiStatistic.stepFail) }}</a-descriptions-item>
                  <a-descriptions-item label="跳过">{{ toNumber(uiStatistic.stepSkip) }}</a-descriptions-item>
                  <a-descriptions-item label="通过率" :span="2">{{ uiStatistic.stepPassRate || '0%' }}</a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-col>
            <a-col :span="24">
              <a-card title="原始统计 JSON" :bordered="false">
                <pre class="json-block">{{ formatJson(detailData?.statisticAnalysis) }}</pre>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>
        <a-tab-pane key="runtime" title="运行配置">
          <a-card :bordered="false" title="项目配置">
            <pre class="json-block">{{ formatJson(detailData?.projectConfig) }}</pre>
          </a-card>
          <a-card :bordered="false" title="自动化配置" class="mt-4">
            <pre class="json-block">{{ formatJson(detailData?.automationConfig) }}</pre>
          </a-card>
          <a-card :bordered="false" title="运行环境" class="mt-4">
            <pre class="json-block">{{ formatJson(detailData?.runtimeEnvironment) }}</pre>
          </a-card>
        </a-tab-pane>
      </a-tabs>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { Message, Modal, type TableInstance } from '@arco-design/web-vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addTestReport,
  deleteTestReport,
  exportTestReport,
  getTestReport,
  listTestReport,
  type TestReportDetailResp,
  type TestReportQuery,
  type TestReportResp,
  type TestReportUiStatistic,
  updateTestReport,
} from '@/apis/test/testReport'
import { useTable } from '@/hooks'

defineOptions({ name: 'TestTestReport' })

const route = useRoute()
const router = useRouter()

const statusOptions = [
  { label: '执行中', value: 'RUNNING' },
  { label: '通过', value: 'PASSED' },
  { label: '失败', value: 'FAILED' },
]
const triggerOptions = [
  { label: '手动', value: 'MANUAL' },
  { label: '定时', value: 'SCHEDULE' },
]
const executeOptions = [
  { label: '调试', value: 'DEBUG' },
  { label: '计划执行', value: 'PLAN' },
]

const queryForm = reactive<TestReportQuery>({
  name: undefined,
  projectId: undefined,
  testPlanId: undefined,
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
} = useTable((page) => listTestReport({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: 'ID', dataIndex: 'id', width: 170 },
  { title: '报告名称', dataIndex: 'name', width: 220, ellipsis: true, tooltip: true },
  { title: '项目名称', dataIndex: 'projectName', width: 160 },
  { title: '测试计划', dataIndex: 'testPlanName', width: 180, ellipsis: true, tooltip: true },
  { title: '触发方式', dataIndex: 'triggerMode', width: 120 },
  { title: '执行方式', dataIndex: 'executeMode', width: 120 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '构建号', dataIndex: 'buildNumber', width: 120 },
  { title: '日志', dataIndex: 'consoleUrl', slotName: 'link', width: 100 },
  { title: '报告', dataIndex: 'reportUrl', slotName: 'link', width: 100 },
  { title: '视频', dataIndex: 'videoUrl', slotName: 'link', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 180, align: 'center', fixed: 'right' },
]

const formVisible = ref(false)
const detailVisible = ref(false)
const detailData = ref<TestReportDetailResp>()
const uiStatistic = computed<TestReportUiStatistic>(() => {
  const statistic = detailData.value?.statisticAnalysis
  if (!statistic) return {}
  if (statistic.ui && typeof statistic.ui === 'object') return statistic.ui as TestReportUiStatistic
  if (Array.isArray(statistic.uiList) && statistic.uiList[0] && typeof statistic.uiList[0] === 'object') {
    return statistic.uiList[0] as TestReportUiStatistic
  }
  return {}
})

const formState = reactive<any>({
  id: '',
  projectId: undefined,
  projectName: '',
  versionName: '',
  testPlanId: undefined,
  testPlanName: '',
  name: '',
  description: '',
  triggerMode: 'MANUAL',
  executeMode: 'PLAN',
  status: 'RUNNING',
})

const goBackToPlan = async () => {
  if (!queryForm.testPlanId) return
  await router.push({
    path: '/test/testPlan',
    query: { id: String(queryForm.testPlanId) },
  })
}

const reset = async () => {
  queryForm.name = undefined
  queryForm.projectId = undefined
  queryForm.testPlanId = undefined
  queryForm.status = undefined
  await router.replace({ path: '/test/testReport', query: {} })
  search()
}

const syncRouteQuery = async () => {
  queryForm.testPlanId = route.query.testPlanId ? Number(route.query.testPlanId) : undefined
  if (route.query.id) {
    await openDetail({ id: String(route.query.id) } as TestReportResp)
  }
}

watch(
  () => route.query,
  () => {
    syncRouteQuery()
    search()
  },
  { immediate: true }
)

const openForm = (record?: TestReportResp) => {
  formState.id = record?.id || ''
  formState.projectId = record?.projectId
  formState.projectName = record?.projectName || ''
  formState.versionName = record?.versionName || ''
  formState.testPlanId = record?.testPlanId
  formState.testPlanName = record?.testPlanName || ''
  formState.name = record?.name || ''
  formState.description = record?.description || ''
  formState.triggerMode = record?.triggerMode || 'MANUAL'
  formState.executeMode = record?.executeMode || 'PLAN'
  formState.status = record?.status || 'RUNNING'
  formVisible.value = true
}

const openDetail = async (record: TestReportResp) => {
  const { data } = await getTestReport(record.id)
  detailData.value = data
  detailVisible.value = true
  await router.replace({
    path: '/test/testReport',
    query: {
      ...(queryForm.testPlanId ? { testPlanId: String(queryForm.testPlanId) } : {}),
      id: record.id,
    },
  })
}

watch(detailVisible, async (visible) => {
  if (!visible && route.query.id) {
    await router.replace({
      path: '/test/testReport',
      query: {
        ...(queryForm.testPlanId ? { testPlanId: String(queryForm.testPlanId) } : {}),
      },
    })
  }
})

const submitForm = async () => {
  const payload = {
    projectId: Number(formState.projectId),
    projectName: formState.projectName,
    versionName: formState.versionName,
    testPlanId: formState.testPlanId ? Number(formState.testPlanId) : undefined,
    testPlanName: formState.testPlanName,
    name: formState.name,
    description: formState.description,
    triggerMode: formState.triggerMode,
    executeMode: formState.executeMode,
    status: formState.status,
  }
  if (formState.id) await updateTestReport(payload, formState.id)
  else await addTestReport(payload)
  Message.success('保存成功')
  formVisible.value = false
  search()
}

const onDelete = (record?: TestReportResp) => {
  const ids = selectedKeys.value.length ? selectedKeys.value.map(item => String(item)) : record ? record.id : ''
  Modal.warning({
    title: '确认删除',
    content: selectedKeys.value.length
      ? '确认删除选中的测试报告吗？'
      : `确认删除测试报告“${record?.name || ''}”吗？`,
    hideCancel: false,
    onOk: async () => {
      await deleteTestReport(ids)
      Message.success('删除成功')
      search()
    },
  })
}

const onExport = async () => {
  await exportTestReport(selectedKeys.value.length ? { ...queryForm, id: selectedKeys.value.join(',') } : queryForm)
}

const formatJson = (value: unknown) => {
  if (!value) return '-'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
</script>

<style scoped lang="scss">
.json-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.6;
}
</style>
