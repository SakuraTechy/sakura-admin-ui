<template>
  <a-drawer v-model:visible="visible" :title="`${task?.name || ''} · 执行记录`" :width="980" :footer="false">
    <a-tabs v-model:active-key="activeTab" @change="loadActiveTab">
      <a-tab-pane key="runs" title="业务执行记录">
        <a-form :model="query" layout="inline" class="run-query">
          <a-form-item label="结果">
            <a-select v-model="query.status" :options="statusOptions" allow-clear style="width: 140px" />
          </a-form-item>
          <a-form-item label="触发方式">
            <a-select v-model="query.triggerMode" :options="triggerOptions" allow-clear style="width: 130px" />
          </a-form-item>
          <a-form-item label="开始时间">
            <a-range-picker
              v-model="timeRange"
              show-time
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 360px"
              allow-clear
            />
          </a-form-item>
          <a-button type="primary" @click="searchRuns">查询</a-button>
        </a-form>
        <a-table :data="runs" :columns="runColumns" :loading="loading" :pagination="false" row-key="id" :scroll="{ x: 1400 }">
          <template #triggerMode="{ record }">{{ record.triggerMode === 'SCHEDULE' ? '定时' : '手动' }}</template>
          <template #status="{ record }"><a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag></template>
          <template #duration="{ record }">{{ durationLabel(record.runTime) }}</template>
          <template #reason="{ record }"><span :title="record.failureReason">{{ record.failureReason || '-' }}</span></template>
          <template #notification="{ record }">
            <a-tooltip v-if="record.notificationError" :content="record.notificationError">
              <a-tag :color="record.notificationStatus === 'SENT' ? 'green' : record.notificationStatus === 'FAILED' ? 'red' : 'gray'">
                {{ notificationLabel(record.notificationStatus) }}
              </a-tag>
            </a-tooltip>
            <a-tag v-else :color="record.notificationStatus === 'SENT' ? 'green' : 'gray'">{{ notificationLabel(record.notificationStatus) }}</a-tag>
          </template>
          <template #links="{ record }">
            <a-space>
              <a-link v-if="record.reportUrl" :href="record.reportUrl" target="_blank">报告</a-link>
              <span v-else>-</span>
              <a-link v-if="record.consoleUrl" :href="record.consoleUrl" target="_blank">Jenkins</a-link>
            </a-space>
          </template>
        </a-table>
        <div class="pagination-row">
          <a-pagination v-model:current="query.page" v-model:page-size="query.size" :total="total" show-total show-page-size @change="loadRuns" @page-size-change="searchRuns" />
        </div>
      </a-tab-pane>
      <a-tab-pane key="logs" title="调度日志">
        <a-alert type="info" class="log-alert">调度日志用于底层排障，日常执行结果请以“业务执行记录”为准。</a-alert>
        <a-table :data="logs" :columns="logColumns" :loading="loading" :pagination="false" row-key="id" />
      </a-tab-pane>
    </a-tabs>
  </a-drawer>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import {
  type TestTimedTaskLogResp,
  type TestTimedTaskResp,
  type TestTimedTaskRunResp,
  listTimedTaskLogs,
  listTimedTaskRuns,
} from '@/apis/test/timedTask'

const visible = ref(false)
const loading = ref(false)
const activeTab = ref('runs')
const task = ref<TestTimedTaskResp>()
const runs = ref<TestTimedTaskRunResp[]>([])
const logs = ref<TestTimedTaskLogResp[]>([])
const total = ref(0)
const timeRange = ref<string[]>([])
const query = reactive({ page: 1, size: 10, status: undefined as string | undefined, triggerMode: undefined as string | undefined })
const statusOptions = ['RUNNING', 'PASSED', 'FAILED', 'SKIPPED'].map((value) => ({ label: statusLabel(value), value }))
const triggerOptions = [{ label: '定时', value: 'SCHEDULE' }, { label: '手动', value: 'MANUAL' }]

const runColumns: TableInstance['columns'] = [
  { title: '触发', dataIndex: 'triggerMode', slotName: 'triggerMode', width: 80 },
  { title: '结果', dataIndex: 'status', slotName: 'status', width: 90 },
  { title: '开始时间', dataIndex: 'startTime', width: 170 },
  { title: '结束时间', dataIndex: 'endTime', width: 170 },
  { title: '耗时', dataIndex: 'runTime', slotName: 'duration', width: 100 },
  { title: '失败/跳过原因', dataIndex: 'failureReason', slotName: 'reason', width: 220, ellipsis: true },
  { title: '通知', dataIndex: 'notificationStatus', slotName: 'notification', width: 100 },
  { title: '结果入口', dataIndex: 'links', slotName: 'links', width: 130, fixed: 'right' },
]
const logColumns: TableInstance['columns'] = [
  { title: '状态', dataIndex: 'taskBatchStatus', width: 120 },
  { title: '触发原因', dataIndex: 'operationReason', width: 180 },
  { title: '执行器', dataIndex: 'executorInfo', width: 240, ellipsis: true },
  { title: '执行时间', dataIndex: 'executionAt', width: 180 },
  { title: '创建时间', dataIndex: 'createDt', width: 180 },
]

function statusLabel(status?: string) {
  return ({ RUNNING: '执行中', PASSED: '通过', FAILED: '失败', SKIPPED: '已跳过' } as Record<string, string>)[status || ''] || status || '-'
}
function statusColor(status?: string) {
  return ({ RUNNING: 'blue', PASSED: 'green', FAILED: 'red', SKIPPED: 'orange' } as Record<string, string>)[status || ''] || 'gray'
}
function notificationLabel(status?: string) {
  return ({ PENDING: '待发送', SENT: '已发送', FAILED: '发送失败' } as Record<string, string>)[status || ''] || '-'
}
function durationLabel(value?: number) {
  if (value === undefined || value === null) return '-'
  if (value < 1000) return `${value} ms`
  if (value < 60000) return `${(value / 1000).toFixed(1)} 秒`
  return `${(value / 60000).toFixed(1)} 分钟`
}

const loadRuns = async () => {
  if (!task.value) return
  loading.value = true
  try {
    const { data } = await listTimedTaskRuns(task.value.id, {
      ...query,
      startTime: timeRange.value[0],
      endTime: timeRange.value[1],
    })
    runs.value = data?.list || []
    total.value = data?.total || 0
  } finally {
    loading.value = false
  }
}
const searchRuns = () => {
  query.page = 1
  loadRuns()
}
const loadLogs = async () => {
  if (!task.value) return
  loading.value = true
  try {
    logs.value = (await listTimedTaskLogs(task.value.id, { page: 1, size: 50 })).data?.list || []
  } finally {
    loading.value = false
  }
}
const loadActiveTab = () => activeTab.value === 'runs' ? loadRuns() : loadLogs()
const open = (record: TestTimedTaskResp) => {
  task.value = record
  activeTab.value = 'runs'
  query.page = 1
  query.status = undefined
  query.triggerMode = undefined
  timeRange.value = []
  visible.value = true
  loadRuns()
}

defineExpose({ open })
</script>

<style scoped>
.run-query, .log-alert { margin-bottom: 16px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
