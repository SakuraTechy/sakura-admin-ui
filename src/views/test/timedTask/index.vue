<template>
  <div class="gi_table_page timed-task-page">
    <GiTable
      v-model:selected-keys="selectedKeys"
      title="测试计划定时任务"
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :row-selection="{ type: 'checkbox', showCheckedAll: true }"
      :show-selection-alert="true"
      :scroll="{ x: 1560, y: '100%' }"
      @refresh="search"
      @select="select"
      @select-all="selectAll"
    >
      <template #top>
        <a-card class="query-card" :bordered="false">
          <a-form :model="queryForm" layout="inline">
            <a-form-item label="项目">
              <a-select v-model="queryForm.projectId" placeholder="全部项目" allow-search allow-clear style="width: 200px" @change="onProjectChange">
                <a-option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="测试计划">
              <a-select v-model="queryForm.testPlanId" placeholder="全部计划" allow-search allow-clear style="width: 220px">
                <a-option v-for="item in filteredPlans" :key="item.id" :value="item.id">{{ item.name }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="任务名称"><a-input v-model="queryForm.name" placeholder="请输入任务名称" allow-clear /></a-form-item>
            <a-form-item label="启用状态"><a-select v-model="queryForm.status" :options="statusOptions" allow-clear style="width: 130px" /></a-form-item>
            <a-space>
              <a-button type="primary" @click="search"><template #icon><icon-search /></template>查询</a-button>
              <a-button @click="reset"><template #icon><icon-refresh /></template>重置</a-button>
            </a-space>
          </a-form>
        </a-card>
      </template>

      <template #toolbar-left>
        <a-button v-permission="['test:timedTask:create']" type="primary" @click="drawerRef?.open()">
          <template #icon><icon-plus /></template>新建任务
        </a-button>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['test:timedTask:export']" @click="onExport"><template #icon><icon-download /></template>导出</a-button>
        <a-button v-permission="['test:timedTask:delete']" status="danger" :disabled="!selectedKeys.length" @click="onDelete()">
          <template #icon><icon-delete /></template>删除
        </a-button>
      </template>

      <template #task="{ record }">
        <div class="primary-cell"><strong>{{ record.name }}</strong><small>{{ record.description || '暂无描述' }}</small></div>
      </template>
      <template #plan="{ record }">
        <div class="primary-cell"><span>{{ record.projectName || '-' }}</span><small>{{ record.testPlanName }}</small></div>
      </template>
      <template #schedule="{ record }"><span :title="record.cronExpression">{{ scheduleLabel(record.cronExpression) }}</span></template>
      <template #environment="{ record }">
        <div class="primary-cell"><span>{{ record.projectEnvironmentName || '-' }}</span><small>{{ record.automationEnvironmentName || '-' }}</small></div>
      </template>
      <template #lastRun="{ record }">
        <div v-if="record.lastRun" class="last-run">
          <a-tag :color="resultColor(record.lastRun.status)">{{ resultLabel(record.lastRun.status) }}</a-tag>
          <small>{{ record.lastRun.startTime }}</small>
        </div>
        <span v-else>-</span>
      </template>
      <template #status="{ record }">
        <a-switch
          v-permission="['test:timedTask:updateStatus']"
          :model-value="record.status"
          checked-value="ENABLED"
          unchecked-value="DISABLED"
          @change="value => onUpdateStatus(record, value as string)"
        />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['test:timedTask:execute']" @click="onTrigger(record)">立即执行</a-link>
          <a-link v-permission="['test:timedTask:list']" @click="runDrawerRef?.open(record)">执行记录</a-link>
          <a-dropdown trigger="click">
            <a-link>更多<icon-down /></a-link>
            <template #content>
              <a-doption v-permission="['test:timedTask:update']" @click="drawerRef?.open({ id: record.id })">编辑</a-doption>
              <a-doption v-permission="['test:timedTask:delete']" status="danger" @click="onDelete(record)">删除</a-doption>
            </template>
          </a-dropdown>
        </a-space>
      </template>
    </GiTable>

    <TimedTaskDrawer ref="drawerRef" :plans="plans" @success="search" />
    <TimedTaskRunDrawer ref="runDrawerRef" />
  </div>
</template>

<script setup lang="ts">
import { Message, Modal, type TableInstance } from '@arco-design/web-vue'
import TimedTaskDrawer from './components/TimedTaskDrawer.vue'
import TimedTaskRunDrawer from './components/TimedTaskRunDrawer.vue'
import { type ProjectConfigResp, getProjectConfigList } from '@/apis/project/projectConfig'
import { type TestPlanResp, getTestPlanList } from '@/apis/test/testPlan'
import {
  type TestTimedTaskQuery,
  type TestTimedTaskResp,
  deleteTimedTask,
  exportTimedTask,
  listTimedTask,
  triggerTimedTask,
  updateTimedTaskStatus,
} from '@/apis/test/timedTask'
import { useTable } from '@/hooks'

defineOptions({ name: 'TestTimedTask' })

const drawerRef = ref<InstanceType<typeof TimedTaskDrawer>>()
const runDrawerRef = ref<InstanceType<typeof TimedTaskRunDrawer>>()
const projects = ref<ProjectConfigResp[]>([])
const plans = ref<TestPlanResp[]>([])
const statusOptions = [{ label: '已启用', value: 'ENABLED' }, { label: '已禁用', value: 'DISABLED' }]
const queryForm = reactive<TestTimedTaskQuery>({ sort: ['createTime,desc'] })
const filteredPlans = computed(() => queryForm.projectId ? plans.value.filter((item) => item.projectId === queryForm.projectId) : plans.value)

const { tableData: dataList, loading, pagination, search, selectedKeys, select, selectAll } = useTable(
  (page) => listTimedTask({ ...queryForm, ...page }),
  { immediate: true },
)

const columns: TableInstance['columns'] = [
  { title: '任务名称', dataIndex: 'name', slotName: 'task', width: 230 },
  { title: '项目 / 测试计划', dataIndex: 'testPlanName', slotName: 'plan', width: 210 },
  { title: '执行周期', dataIndex: 'cronExpression', slotName: 'schedule', width: 180 },
  { title: '产品 / 自动化环境', dataIndex: 'projectEnvironmentName', slotName: 'environment', width: 210 },
  { title: '下次执行', dataIndex: 'nextExecuteTime', width: 175 },
  { title: '最近结果', dataIndex: 'lastRun', slotName: 'lastRun', width: 180 },
  { title: '启用', dataIndex: 'status', slotName: 'status', width: 90, align: 'center' },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 260, fixed: 'right' },
]

const loadFilters = async () => {
  const [projectRes, planRes] = await Promise.all([getProjectConfigList({ status: 1 }), getTestPlanList({ sort: ['createTime,desc'] })])
  projects.value = projectRes.data || []
  plans.value = planRes.data || []
}
loadFilters()

const onProjectChange = () => {
  queryForm.testPlanId = undefined
}
const reset = () => {
  queryForm.projectId = undefined
  queryForm.testPlanId = undefined
  queryForm.name = undefined
  queryForm.status = undefined
  search()
}
const scheduleLabel = (cron: string) => ({
  '0 */30 * * * ?': '每 30 分钟',
  '0 0 * * * ?': '每小时',
}[cron] || (cron?.includes('MON-FRI') ? '工作日定时执行' : `Cron：${cron}`))
const resultLabel = (status: string) => ({ RUNNING: '执行中', PASSED: '通过', FAILED: '失败', SKIPPED: '已跳过' } as Record<string, string>)[status] || status
const resultColor = (status: string) => ({ RUNNING: 'blue', PASSED: 'green', FAILED: 'red', SKIPPED: 'orange' } as Record<string, string>)[status] || 'gray'

const onUpdateStatus = async (record: TestTimedTaskResp, status: string) => {
  try {
    await updateTimedTaskStatus(record.id, status)
    Message.success(status === 'ENABLED' ? '任务已启用' : '任务已禁用')
  } finally {
    search()
  }
}
const onTrigger = (record: TestTimedTaskResp) => {
  Modal.confirm({
    title: '立即执行测试计划',
    content: `确认立即执行“${record.name}”吗？`,
    onOk: async () => {
      await triggerTimedTask(record.id)
      Message.success('任务已触发，可在执行记录中查看进度')
      search()
    },
  })
}
const onDelete = (record?: TestTimedTaskResp) => {
  const ids = selectedKeys.value.length ? selectedKeys.value.map(String) : record ? [record.id] : []
  Modal.warning({
    title: '删除定时任务',
    content: `确认删除选中的 ${ids.length} 个任务吗？此操作不会中止已触发的执行。`,
    hideCancel: false,
    onOk: async () => {
      await deleteTimedTask(ids)
      Message.success('删除成功')
      selectedKeys.value = []
      search()
    },
  })
}
const onExport = () => exportTimedTask(selectedKeys.value.length ? { ...queryForm, id: selectedKeys.value.join(',') } : queryForm)
</script>

<style scoped lang="scss">
.query-card { margin-bottom: 12px; background: var(--color-bg-2); }
.primary-cell { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.primary-cell strong, .primary-cell span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.primary-cell small, .last-run small { color: var(--color-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.last-run { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
</style>
