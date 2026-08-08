<template>
  <div class="gi_table_page timed-task-page">
    <a-tabs
      default-active-key="task-list"
      type="card-gutter"
      size="medium"
      class="timed-task-tabs"
    >
      <a-tab-pane key="task-list" title="任务列表">
        <div class="task-list-pane">
          <a-alert v-if="scheduleCapability && !scheduleCapability.ready" type="warning" class="schedule-alert">
            调度服务不可用：{{ scheduleCapability.message }}
          </a-alert>
          <GiTable
            v-model:selected-keys="selectedKeys"
            class="task-list-table"
            title=""
            row-key="id"
            :data="dataList"
            :columns="columns"
            :loading="loading"
            :pagination="pagination"
            :row-selection="{ type: 'checkbox', showCheckedAll: true }"
            :show-selection-alert="true"
            :scroll="{ x: 1840, y: '100%' }"
            @refresh="search"
            @select="select"
            @select-all="selectAll"
          >
            <template #top>
              <div class="task-query-card">
                <a-form :model="queryForm" layout="horizontal" class="task-query-form">
                  <div class="task-query-grid">
                    <a-form-item label="项目" class="task-query-field task-query-field--project">
                      <a-select v-model="queryForm.projectId" placeholder="全部项目" allow-search allow-clear @change="onProjectChange">
                        <a-option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</a-option>
                      </a-select>
                    </a-form-item>
                    <a-form-item label="测试计划" class="task-query-field task-query-field--plan">
                      <a-select v-model="queryForm.testPlanId" placeholder="全部计划" allow-search allow-clear>
                        <a-option v-for="item in filteredPlans" :key="item.id" :value="item.id">{{ item.name }}</a-option>
                      </a-select>
                    </a-form-item>
                    <a-form-item label="任务名称" class="task-query-field task-query-field--name">
                      <a-input v-model="queryForm.name" placeholder="请输入任务名称" allow-clear />
                    </a-form-item>
                    <a-form-item label="启用状态" class="task-query-field task-query-field--status">
                      <a-select v-model="queryForm.status" :options="statusOptions" placeholder="请选择" allow-clear />
                    </a-form-item>
                    <a-button type="primary" class="task-query-action task-query-action--search" @click="search">
                      <template #icon><icon-search /></template>
                      查询
                    </a-button>
                    <a-button class="task-query-action task-query-action--reset" @click="reset">
                      <template #icon><icon-refresh /></template>
                      重置
                    </a-button>
                  </div>
                </a-form>
              </div>
            </template>

            <template #toolbar-left>
              <a-button v-permission="['test:timedTask:create']" type="primary" @click="drawerRef?.open()">
                <template #icon><icon-plus /></template>
                新建任务
              </a-button>
            </template>
            <template #toolbar-right>
              <a-button v-permission="['test:timedTask:export']" @click="onExport">
                <template #icon><icon-download /></template>
                批量导出
              </a-button>
              <a-button
                v-permission="['test:timedTask:delete']"
                type="primary"
                status="danger"
                :disabled="!selectedKeys.length"
                @click="onDelete()"
              >
                <template #icon><icon-delete /></template>
                批量删除
              </a-button>
            </template>

            <template #task="{ record }">
              <div class="primary-cell"><strong>{{ record.name }}</strong><small>{{ record.description || '暂无描述' }}</small></div>
            </template>
            <template #plan="{ record }">
              <div class="primary-cell"><span>{{ record.projectName || '-' }}</span><small>{{ record.testPlanName }}</small></div>
            </template>
            <template #schedule="{ record }"><span :title="record.cronExpression">{{ scheduleLabel(record.cronExpression) }}</span></template>
            <template #engine="{ record }">
              <a-tag :color="record.executionEngine === 'PLAYWRIGHT_RUNNER' ? 'arcoblue' : 'green'">
                {{ executionEngineLabel(record.executionEngine) }}
              </a-tag>
            </template>
            <template #environment="{ record }">
              <div class="primary-cell">
                <span>{{ record.projectEnvironmentName || '-' }}</span>
                <small>{{ record.executionEngine === 'PLAYWRIGHT_RUNNER' ? '无需 Jenkins 节点' : record.automationEnvironmentName || '-' }}</small>
              </div>
            </template>
            <template #lastRun="{ record }">
              <div v-if="record.lastRun" class="last-run">
                <a-tag :color="resultColor(record.lastRun.status)">{{ resultLabel(record.lastRun.status) }}</a-tag>
                <small>{{ record.lastRun.startTime }}</small>
              </div>
              <span v-else>-</span>
            </template>
            <template #sync="{ record }">
              <a-tooltip v-if="record.scheduleSyncError" :content="record.scheduleSyncError">
                <a-tag :color="syncColor(record.scheduleSyncStatus)">{{ syncLabel(record.scheduleSyncStatus) }}</a-tag>
              </a-tooltip>
              <a-tag v-else :color="syncColor(record.scheduleSyncStatus)">{{ syncLabel(record.scheduleSyncStatus) }}</a-tag>
            </template>
            <template #status="{ record }">
              <a-switch
                v-permission="['test:timedTask:updateStatus']"
                :model-value="record.status"
                :disabled="!scheduleReady || record.status === 'DELETING'"
                checked-value="ENABLED"
                unchecked-value="DISABLED"
                @change="value => onUpdateStatus(record, value as string)"
              />
            </template>
            <template #action="{ record }">
              <a-space>
                <a-link v-if="scheduleReady" v-permission="['test:timedTask:execute']" @click="onTrigger(record)">立即执行</a-link>
                <a-tooltip v-else content="调度服务不可用"><span class="disabled-action">立即执行</span></a-tooltip>
                <a-link v-permission="['test:timedTask:list']" @click="runDrawerRef?.open(record)">执行记录</a-link>
                <a-dropdown trigger="click">
                  <a-link>更多<icon-down /></a-link>
                  <template #content>
                    <a-doption v-if="record.scheduleSyncStatus === 'FAILED'" v-permission="['test:timedTask:update']" :disabled="!scheduleReady" @click="onRetrySync(record)">重试同步</a-doption>
                    <a-doption v-permission="['test:timedTask:update']" @click="drawerRef?.open({ id: record.id })">编辑</a-doption>
                    <a-doption v-permission="['test:timedTask:delete']" status="danger" @click="onDelete(record)">删除</a-doption>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </GiTable>
        </div>
      </a-tab-pane>
    </a-tabs>

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
  type TestTimedTaskCapabilityResp,
  type TestTimedTaskQuery,
  type TestTimedTaskResp,
  deleteTimedTask,
  exportTimedTask,
  getTimedTaskCapability,
  listTimedTask,
  retryTimedTaskSync,
  triggerTimedTask,
  updateTimedTaskStatus,
} from '@/apis/test/timedTask'
import { useTable } from '@/hooks'

defineOptions({ name: 'TestTimedTask' })

const drawerRef = ref<InstanceType<typeof TimedTaskDrawer>>()
const runDrawerRef = ref<InstanceType<typeof TimedTaskRunDrawer>>()
const projects = ref<ProjectConfigResp[]>([])
const plans = ref<TestPlanResp[]>([])
const scheduleCapability = ref<TestTimedTaskCapabilityResp>()
const scheduleReady = computed(() => scheduleCapability.value?.ready === true)
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
  { title: '执行引擎', dataIndex: 'executionEngine', slotName: 'engine', width: 150, align: 'center' },
  { title: '产品 / 自动化环境', dataIndex: 'projectEnvironmentName', slotName: 'environment', width: 210 },
  { title: '下次执行', dataIndex: 'nextExecuteTime', width: 175 },
  { title: '最近结果', dataIndex: 'lastRun', slotName: 'lastRun', width: 180 },
  { title: '调度同步', dataIndex: 'scheduleSyncStatus', slotName: 'sync', width: 110, align: 'center' },
  { title: '启用', dataIndex: 'status', slotName: 'status', width: 90, align: 'center' },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 260, fixed: 'right' },
]

const loadFilters = async () => {
  const [projectRes, planRes] = await Promise.all([getProjectConfigList({ status: 1 }), getTestPlanList({ sort: ['createTime,desc'] })])
  projects.value = projectRes.data || []
  plans.value = planRes.data || []
}
const loadScheduleCapability = async () => {
  try {
    scheduleCapability.value = (await getTimedTaskCapability()).data
  } catch {
    scheduleCapability.value = {
      clientEnabled: false,
      apiReachable: false,
      groupAvailable: false,
      ready: false,
      groupName: '',
      message: '能力探测失败',
    }
  }
}
loadFilters()
loadScheduleCapability()

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
const executionEngineLabel = (engine?: string) => ({
  SELENIUM: 'Selenium',
  PLAYWRIGHT_RUNNER: 'Playwright Runner',
  CHROME_DEVTOOLS_PROTOCOL: 'CDP',
} as Record<string, string>)[engine || 'SELENIUM'] || engine || 'Selenium'
const resultLabel = (status: string) => ({ RUNNING: '执行中', PASSED: '通过', FAILED: '失败', CANCELLED: '已取消', SKIPPED: '已跳过' } as Record<string, string>)[status] || status
const resultColor = (status: string) => ({ RUNNING: 'blue', PASSED: 'green', FAILED: 'red', CANCELLED: 'gray', SKIPPED: 'orange' } as Record<string, string>)[status] || 'gray'
const syncLabel = (status: string) => ({ PENDING: '待同步', SYNCING: '同步中', SYNCED: '已同步', FAILED: '同步失败', DELETING: '删除中' } as Record<string, string>)[status] || status || '-'
const syncColor = (status: string) => ({ PENDING: 'blue', SYNCING: 'blue', SYNCED: 'green', FAILED: 'red', DELETING: 'orange' } as Record<string, string>)[status] || 'gray'

const onUpdateStatus = async (record: TestTimedTaskResp, status: string) => {
  if (!scheduleReady.value) return
  try {
    await updateTimedTaskStatus(record.id, status)
    Message.success(status === 'ENABLED' ? '任务已启用' : '任务已禁用')
  } finally {
    search()
  }
}
const onTrigger = (record: TestTimedTaskResp) => {
  if (!scheduleReady.value) return
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
const onRetrySync = async (record: TestTimedTaskResp) => {
  await retryTimedTaskSync(record.id)
  Message.success('已提交同步重试')
  search()
}
const onDelete = (record?: TestTimedTaskResp) => {
  const ids = selectedKeys.value.length ? selectedKeys.value.map(String) : record ? [record.id] : []
  Modal.warning({
    title: '删除定时任务',
    content: `确认删除选中的 ${ids.length} 个任务吗？此操作不会中止已触发的执行。`,
    hideCancel: false,
    onOk: async () => {
      await deleteTimedTask(ids)
      Message.success('删除已提交')
      selectedKeys.value = []
      search()
    },
  })
}
const onExport = () => exportTimedTask(selectedKeys.value.length ? { ...queryForm, id: selectedKeys.value.join(',') } : queryForm)
</script>

<style scoped lang="scss">
.timed-task-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0;
  padding: 0;
  background: var(--color-bg-1);
}

.timed-task-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  margin-top: 5px;
  background: transparent;

  :deep(.arco-tabs-nav) {
    flex: none;
    margin-bottom: 0;
  }

  :deep(.arco-tabs-nav-tab) {
    padding: 0 2px;
  }

  :deep(.arco-tabs-content) {
    box-sizing: border-box;
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: 480px;
    height: calc(100% - 42px);
    padding: 16px;
    background: var(--color-bg-1);
    border: 1px solid var(--color-border-2);
    border-top: 0;
    border-radius: 0 4px 4px;
    box-shadow: 0 2px 6px rgb(0 0 0 / 4%);
  }

  :deep(.arco-tabs-content-list),
  :deep(.arco-tabs-pane) {
    width: 100%;
    height: 100%;
    min-width: 0;
  }
}

.task-list-pane {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.task-list-table {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  min-height: 0;

  :deep(.gi-table) {
    width: 100%;
    max-width: 100%;
    min-height: calc(100vh - 300px);
    padding: 0;
    background: var(--color-bg-1);
    border-radius: 0;
  }

  :deep(.gi-table__top) {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  :deep(.gi-table__toolbar) {
    min-height: 44px;
    margin-top: 0;
    padding: 4px 0 14px;
  }

  :deep(.gi-table__toolbar-left),
  :deep(.gi-table__toolbar-right) {
    gap: 8px;
  }

  :deep(.arco-table-container) {
    border: 1px solid var(--color-border-2);
    border-radius: 6px;
  }

  :deep(.arco-table-th) {
    height: 44px;
    background: var(--color-fill-1);
  }

  :deep(.arco-table-pagination) {
    margin-top: 14px;
    padding-bottom: 2px;
  }
}

.task-query-card {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 12px;
  padding: 16px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.task-query-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) 100px;
  grid-template-areas:
    "project plan name search"
    "status . . reset";
  gap: 16px;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.task-query-field {
  min-width: 0;
  margin-bottom: 0;

  :deep(.arco-form-item-label-col) {
    flex: 0 0 80px;
    width: 80px;
    padding-right: 8px;
  }

  :deep(.arco-form-item-wrapper-col) {
    min-width: 0;
  }

  :deep(.arco-select),
  :deep(.arco-input-wrapper) {
    width: 100%;
  }
}

.task-query-field--project { grid-area: project; }
.task-query-field--plan { grid-area: plan; }
.task-query-field--name { grid-area: name; }
.task-query-field--status { grid-area: status; }

.task-query-action {
  width: 100%;
}

.task-query-action--search { grid-area: search; }
.task-query-action--reset { grid-area: reset; }

.schedule-alert { margin-bottom: 12px; }
.disabled-action { color: var(--color-text-4); cursor: not-allowed; }
.primary-cell { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.primary-cell strong, .primary-cell span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.primary-cell small, .last-run small { color: var(--color-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.last-run { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }

@media (max-width: 1200px) {
  .task-query-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) 100px;
    grid-template-areas:
      "project plan search"
      "name status reset";
  }
}

@media (max-width: 768px) {
  .timed-task-tabs :deep(.arco-tabs-content) {
    padding: 12px;
  }

  .task-query-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "project"
      "plan"
      "name"
      "status"
      "search"
      "reset";
    gap: 12px;
  }

  .task-query-action {
    width: 100%;
  }
}
</style>
