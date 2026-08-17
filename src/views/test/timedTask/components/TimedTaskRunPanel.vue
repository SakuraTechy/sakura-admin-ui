<template>
  <div class="run-panel">
    <div class="task-context">
      <div class="task-context__primary">
        <span class="task-context__label">定时任务</span>
        <strong>{{ task.name }}</strong>
      </div>
      <div class="task-context__meta">
        <span>任务 ID</span>
        <a-typography-text copyable :copy-text="String(task.id)">{{ task.id }}</a-typography-text>
        <span>测试计划</span>
        <strong>{{ task.testPlanName || '-' }}</strong>
      </div>
    </div>

    <a-tabs v-model:active-key="activeTab" class="record-tabs" @change="loadActiveTab">
      <a-tab-pane key="runs" title="业务执行记录">
        <div class="record-pane">
          <GiTable
            :data="runs"
            :columns="runColumns"
            :loading="runLoading"
            :pagination="runPagination"
            row-key="id"
            title=""
            table-id="test-timed-task-business-runs"
            :disabled-column-keys="['id', 'links']"
            :scroll="{ x: 2240, y: '100%' }"
            class="record-table"
            @refresh="loadRuns"
          >
            <template #top>
              <div class="record-query-top-slot">
                <GiForm
                  v-model="runQuery"
                  :columns="runQueryColumns"
                  size="medium"
                  search
                  :search-card="true"
                  :search-columns-per-row="3"
                  :search-control-min-width="200"
                  :search-label-width="88"
                  search-btn-text="查询"
                  :search-on-change="true"
                  :grid-props="queryGridProps"
                  hide-fold-btn
                  class="record-query-form"
                  @search="searchRuns"
                  @reset="resetRuns"
                />
              </div>
            </template>
            <template #runId="{ record }">
              <a-typography-text class="id-text" copyable :copy-text="String(record.id)">{{ record.id }}</a-typography-text>
            </template>
            <template #testReportId="{ record }">
              <a-typography-text v-if="record.testReportId" class="id-text" copyable :copy-text="String(record.testReportId)">
                {{ record.testReportId }}
              </a-typography-text>
              <span v-else>-</span>
            </template>
            <template #testPlanId="{ record }">
              <a-typography-text class="id-text" copyable :copy-text="String(record.testPlanId)">{{ record.testPlanId }}</a-typography-text>
            </template>
            <template #triggerMode="{ record }">{{ triggerModeLabel(record.triggerMode) }}</template>
            <template #status="{ record }">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
            </template>
            <template #duration="{ record }">{{ durationLabel(record.runTime) }}</template>
            <template #reason="{ record }">
              <span class="ellipsis-text" :title="record.failureReason">{{ record.failureReason || '-' }}</span>
            </template>
            <template #notification="{ record }">
              <a-tooltip v-if="record.notificationError" :content="record.notificationError">
                <a-tag :color="notificationColor(record.notificationStatus)">{{ notificationLabel(record.notificationStatus) }}</a-tag>
              </a-tooltip>
              <a-tag v-else :color="notificationColor(record.notificationStatus)">{{ notificationLabel(record.notificationStatus) }}</a-tag>
            </template>
            <template #emails="{ record }">
              <span class="ellipsis-text" :title="emailLabel(record.notificationEmails)">{{ emailLabel(record.notificationEmails) }}</span>
            </template>
            <template #links="{ record }">
              <a-space>
                <a-link v-if="record.testReportId" @click="openReport(record)">测试报告</a-link>
                <a-link v-if="record.consoleUrl" :href="record.consoleUrl" target="_blank" rel="noopener noreferrer">控制台</a-link>
                <span v-if="!record.testReportId && !record.consoleUrl">-</span>
              </a-space>
            </template>
          </GiTable>
        </div>
      </a-tab-pane>

      <a-tab-pane key="logs" title="调度日志">
        <div class="record-pane">
          <GiTable
            :data="logs"
            :columns="logColumns"
            :loading="logLoading"
            :pagination="logPagination"
            row-key="id"
            title=""
            table-id="test-timed-task-schedule-logs"
            :disabled-column-keys="['id']"
            :scroll="{ x: 1730, y: '100%' }"
            class="record-table"
            @refresh="loadLogs"
          >
            <template #top>
              <div class="record-query-top-slot">
                <GiForm
                  v-model="logQuery"
                  :columns="logQueryColumns"
                  size="medium"
                  search
                  :search-card="true"
                  :search-columns-per-row="3"
                  :search-control-min-width="220"
                  :search-label-width="72"
                  search-btn-text="查询"
                  :search-on-change="true"
                  :grid-props="queryGridProps"
                  hide-fold-btn
                  class="record-query-form"
                  @search="searchLogs"
                  @reset="resetLogs"
                />
              </div>
            </template>
            <template #logId="{ record }">
              <a-typography-text class="id-text" copyable :copy-text="String(record.id)">{{ record.id }}</a-typography-text>
            </template>
            <template #jobId="{ record }">
              <a-typography-text class="id-text" copyable :copy-text="String(record.jobId)">{{ record.jobId }}</a-typography-text>
            </template>
            <template #taskBatchStatus="{ record }">
              <GiCellTag
                v-if="normalizeJobStatus(record.taskBatchStatus) !== undefined"
                :value="normalizeJobStatus(record.taskBatchStatus)"
                :dict="scheduleStatusOptions"
              />
              <span v-else>-</span>
            </template>
            <template #operationReason="{ record }">
              <GiCellTag
                v-if="normalizeJobReason(record.operationReason) !== undefined"
                :value="normalizeJobReason(record.operationReason)"
                :dict="scheduleReasonOptions"
              />
              <span v-else>-</span>
            </template>
          </GiTable>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import type { ColumnItem } from '@/components/GiForm'
import {
  type TestTimedTaskLogResp,
  type TestTimedTaskResp,
  type TestTimedTaskRunResp,
  listTimedTaskLogs,
  listTimedTaskRuns,
} from '@/apis/test/timedTask'
import { useTable } from '@/hooks'
import { useDict } from '@/hooks/app'

const props = defineProps<{ task: TestTimedTaskResp }>()
const router = useRouter()
const { job_execute_reason_enum, job_execute_status_enum } = useDict('job_execute_reason_enum', 'job_execute_status_enum')

const activeTab = ref('runs')

interface RunSearchModel {
  runId?: string
  testReportId?: string
  status?: string
  triggerMode?: string
  timeRange?: string[]
}

interface LogSearchModel {
  taskBatchStatus?: number
  timeRange?: string[]
}

const runQuery = reactive<RunSearchModel>({})
const logQuery = reactive<LogSearchModel>({})
const logLoaded = ref(false)
const queryGridProps = { cols: 24, colGap: 16, rowGap: 0 }
const queryFieldSpan = { xs: 24, sm: 8, xxl: 8 }

const statusOptions = ['RUNNING', 'PASSED', 'FAILED', 'CANCELLED', 'SKIPPED'].map((value) => ({
  label: statusLabel(value),
  value,
}))
const triggerOptions = [
  { label: '定时', value: 'SCHEDULE' },
  { label: '手动', value: 'MANUAL' },
]

const JOB_STATUS_NAME_VALUE: Record<string, number> = {
  WAITING: 1,
  RUNNING: 2,
  SUCCEEDED: 3,
  FAILED: 4,
  STOPPED: 5,
  CANCELED: 6,
  CANCELLED: 6,
}
const JOB_REASON_NAME_VALUE: Record<string, number> = {
  NONE: 0,
  TIME_OUT: 1,
  CLIENT_NOT_FOUND: 2,
  TASK_CLOSED: 3,
  TASK_DROPPED: 4,
  TASK_COVERED: 5,
  TASK_NONE: 6,
  TASK_EXCEPTION: 7,
  MANUAL_STOP: 8,
  NODE_EXCEPTION: 9,
  TASK_INTERRUPT: 10,
  CALLBACK_EXCEPTION: 11,
  NO_NEED_PROCESS: 12,
  NODE_SKIP: 13,
  NOT_PASS: 14,
  TASK_FINISHED: 15,
  TASK_RUNNING: 16,
  TASK_WAITING: 17,
  TASK_FAILED: 18,
  TASK_SUCCESS: 19,
}
const JOB_STATUS_FALLBACK_OPTIONS = [
  { label: '待处理', value: 1, extra: 'primary' },
  { label: '运行中', value: 2, extra: 'warning' },
  { label: '成功', value: 3, extra: 'success' },
  { label: '已失败', value: 4, extra: 'error' },
  { label: '已停止', value: 5, extra: 'error' },
  { label: '已取消', value: 6, extra: 'default' },
]
const JOB_REASON_LABELS = [
  '无',
  '任务执行超时',
  '无客户端节点',
  '任务已关闭',
  '任务丢弃',
  '任务被覆盖',
  '无可执行任务项',
  '任务执行期间发生非预期异常',
  '手动停止',
  '条件节点执行异常',
  '任务中断',
  '回调节点执行异常',
  '无需处理',
  '节点关闭跳过执行',
  '判定未通过',
  '任务已完成',
  '任务正在执行',
  '任务等待执行',
  '任务执行失败',
  '任务执行成功',
]
const JOB_REASON_FALLBACK_OPTIONS = JOB_REASON_LABELS.map((label, value) => ({ label, value }))

const scheduleStatusOptions = computed(() => job_execute_status_enum.value.length
  ? job_execute_status_enum.value
  : JOB_STATUS_FALLBACK_OPTIONS)
const scheduleReasonOptions = computed(() => job_execute_reason_enum.value.length
  ? job_execute_reason_enum.value
  : JOB_REASON_FALLBACK_OPTIONS)

const runQueryColumns = computed<ColumnItem[]>(() => [
  {
    type: 'input',
    label: '执行批次 ID',
    field: 'runId',
    span: queryFieldSpan,
    props: { placeholder: '请输入执行批次 ID', allowClear: true },
  },
  {
    type: 'input',
    label: '测试报告 ID',
    field: 'testReportId',
    span: queryFieldSpan,
    props: { placeholder: '请输入测试报告 ID', allowClear: true },
  },
  {
    type: 'select',
    label: '执行结果',
    field: 'status',
    span: queryFieldSpan,
    props: { options: statusOptions, placeholder: '请选择', allowClear: true },
  },
  {
    type: 'select',
    label: '触发方式',
    field: 'triggerMode',
    span: queryFieldSpan,
    props: { options: triggerOptions, placeholder: '请选择', allowClear: true },
  },
  {
    type: 'range-picker',
    label: '开始时间',
    field: 'timeRange',
    span: queryFieldSpan,
    props: { showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
  },
])

const logQueryColumns = computed<ColumnItem[]>(() => [
  {
    type: 'select',
    label: '执行状态',
    field: 'taskBatchStatus',
    span: queryFieldSpan,
    props: { options: scheduleStatusOptions.value, placeholder: '请选择', allowClear: true },
  },
  {
    type: 'range-picker',
    label: '调度时间',
    field: 'timeRange',
    span: queryFieldSpan,
    props: { showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
  },
])

const runColumns: TableInstance['columns'] = [
  { title: '执行批次 ID', dataIndex: 'id', slotName: 'runId', width: 190, fixed: 'left' },
  { title: '测试报告 ID', dataIndex: 'testReportId', slotName: 'testReportId', width: 190 },
  { title: '测试计划 ID', dataIndex: 'testPlanId', slotName: 'testPlanId', width: 190 },
  { title: '触发方式', dataIndex: 'triggerMode', slotName: 'triggerMode', width: 90, align: 'center' },
  { title: '执行结果', dataIndex: 'status', slotName: 'status', width: 90, align: 'center' },
  { title: '开始时间', dataIndex: 'startTime', width: 170 },
  { title: '结束时间', dataIndex: 'endTime', width: 170 },
  { title: '耗时', dataIndex: 'runTime', slotName: 'duration', width: 100, align: 'center' },
  { title: '构建号', dataIndex: 'buildNumber', width: 100, align: 'center' },
  { title: '失败/跳过原因', dataIndex: 'failureReason', slotName: 'reason', width: 280 },
  { title: '通知状态', dataIndex: 'notificationStatus', slotName: 'notification', width: 110, align: 'center' },
  { title: '通知收件人', dataIndex: 'notificationEmails', slotName: 'emails', width: 230 },
  { title: '结果入口', dataIndex: 'links', slotName: 'links', width: 160, fixed: 'right' },
]

const logColumns: TableInstance['columns'] = [
  { title: '调度批次 ID', dataIndex: 'id', slotName: 'logId', width: 190, fixed: 'left' },
  { title: '调度任务 ID', dataIndex: 'jobId', slotName: 'jobId', width: 160 },
  { title: '任务组', dataIndex: 'groupName', width: 160, ellipsis: true, tooltip: true },
  { title: '调度任务名称', dataIndex: 'jobName', width: 220, ellipsis: true, tooltip: true },
  { title: '执行状态', dataIndex: 'taskBatchStatus', slotName: 'taskBatchStatus', width: 110, align: 'center' },
  { title: '触发原因', dataIndex: 'operationReason', slotName: 'operationReason', width: 190, align: 'center' },
  { title: '执行器', dataIndex: 'executorInfo', width: 220, ellipsis: true, tooltip: true },
  { title: '执行时间', dataIndex: 'executionAt', width: 180 },
  { title: '调度时间', dataIndex: 'createDt', width: 180 },
]

function normalizeEnumValue(value: number | string | undefined, names: Record<string, number>) {
  if (value === undefined || value === null || value === '') return undefined
  const numeric = Number(value)
  if (Number.isInteger(numeric)) return numeric
  return names[String(value).trim().toUpperCase()]
}

function normalizeJobStatus(value?: number | string) {
  return normalizeEnumValue(value, JOB_STATUS_NAME_VALUE)
}

function normalizeJobReason(value?: number | string) {
  return normalizeEnumValue(value, JOB_REASON_NAME_VALUE)
}

function statusLabel(status?: string) {
  return ({
    RUNNING: '执行中',
    PASSED: '通过',
    FAILED: '失败',
    CANCELLED: '已取消',
    SKIPPED: '已跳过',
  } as Record<string, string>)[status || ''] || status || '-'
}

function statusColor(status?: string) {
  return ({
    RUNNING: 'blue',
    PASSED: 'green',
    FAILED: 'red',
    CANCELLED: 'gray',
    SKIPPED: 'orange',
  } as Record<string, string>)[status || ''] || 'gray'
}

function triggerModeLabel(triggerMode?: string) {
  return triggerMode === 'SCHEDULE' ? '定时' : triggerMode === 'MANUAL' ? '手动' : triggerMode || '-'
}

function notificationLabel(status?: string) {
  return ({
    PENDING: '待发送',
    SENDING: '发送中',
    SENT: '已发送',
    FAILED: '发送失败',
  } as Record<string, string>)[status || ''] || '-'
}

function notificationColor(status?: string) {
  return ({ PENDING: 'gray', SENDING: 'blue', SENT: 'green', FAILED: 'red' } as Record<string, string>)[status || ''] || 'gray'
}

function durationLabel(value?: number) {
  if (value === undefined || value === null) return '-'
  if (value < 1000) return `${value} ms`
  if (value < 60000) return `${(value / 1000).toFixed(1)} 秒`
  return `${(value / 60000).toFixed(1)} 分钟`
}

function emailLabel(values?: string[]) {
  return values?.length ? values.join(', ') : '-'
}

const {
  tableData: runs,
  loading: runLoading,
  pagination: runPagination,
  search: searchRuns,
  refresh: loadRuns,
} = useTable((page) => listTimedTaskRuns(props.task.id, {
  ...page,
  runId: runQuery.runId,
  testReportId: runQuery.testReportId,
  status: runQuery.status,
  triggerMode: runQuery.triggerMode,
  startTime: runQuery.timeRange?.[0],
  endTime: runQuery.timeRange?.[1],
}))

const resetRuns = () => {
  runQuery.runId = undefined
  runQuery.testReportId = undefined
  runQuery.status = undefined
  runQuery.triggerMode = undefined
  runQuery.timeRange = undefined
  searchRuns()
}

const {
  tableData: logs,
  loading: logLoading,
  pagination: logPagination,
  search: searchLogTable,
  refresh: refreshLogs,
} = useTable((page) => listTimedTaskLogs(props.task.id, {
  ...page,
  taskBatchStatus: logQuery.taskBatchStatus,
  startTime: logQuery.timeRange?.[0],
  endTime: logQuery.timeRange?.[1],
}), { immediate: false })

const loadLogs = () => {
  logLoaded.value = true
  refreshLogs()
}

const searchLogs = () => {
  logLoaded.value = true
  searchLogTable()
}

const resetLogs = () => {
  logQuery.taskBatchStatus = undefined
  logQuery.timeRange = undefined
  searchLogs()
}

const loadActiveTab = (key: string | number) => {
  if (key === 'runs') loadRuns()
  else if (!logLoaded.value) loadLogs()
}

const openReport = (record: TestTimedTaskRunResp) => {
  if (!record.testReportId) return
  void router.push({
    path: '/test/testReport',
    query: {
      id: String(record.testReportId),
      testPlanId: String(record.testPlanId),
    },
  })
}
</script>

<style scoped lang="scss">
.run-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.task-context {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 54px;
  padding: 0 4px 14px;
  border-bottom: 1px solid var(--color-border-2);
}

.task-context__primary,
.task-context__meta {
  display: flex;
  align-items: center;
  min-width: 0;
}

.task-context__primary {
  gap: 10px;

  strong {
    overflow: hidden;
    color: var(--color-text-1);
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.task-context__label {
  color: var(--color-text-3);
}

.task-context__meta {
  gap: 10px;
  color: var(--color-text-3);

  strong {
    max-width: 260px;
    overflow: hidden;
    color: var(--color-text-2);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.record-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding-top: 8px;

  :deep(.arco-tabs-content),
  :deep(.arco-tabs-content-list),
  :deep(.arco-tabs-pane) {
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }
}

.record-pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.record-query-top-slot {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.record-query-form {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }
}

.record-table {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  min-height: 0;

  :deep(.gi-table) {
    width: 100%;
    max-width: 100%;
    min-height: calc(100vh - 330px);
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

.id-text {
  max-width: 100%;
  font-family: Consolas, monospace;
  font-size: 12px;
}

.ellipsis-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .task-context {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;
  }

  .task-context__meta {
    flex-wrap: wrap;
  }

  .record-query-form {
    :deep(.gi-form__search-rows-layout) {
      flex-direction: column;
      gap: 12px;
    }

    :deep(.gi-form__search-row-fields) {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    :deep(.gi-form__search-field) {
      flex: none;
      width: 100%;
      min-width: 0;
    }

    :deep(.gi-form__search-actions-rail) {
      flex: none;
      width: 100%;
      min-width: 0;
    }

    :deep(.gi-form__search-actions-rail__btns) {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    :deep(.gi-form__search-rail-query),
    :deep(.gi-form__search-rail-reset) {
      flex: 1;
    }
  }
}
</style>
