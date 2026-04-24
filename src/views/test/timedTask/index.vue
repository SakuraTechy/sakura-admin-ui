<template>
  <div class="gi_table_page">
    <GiTable
      v-model:selectedKeys="selectedKeys"
      title="测试定时任务"
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :row-selection="{ type: 'checkbox', showCheckedAll: true }"
      :show-selection-alert="true"
      :scroll="{ x: true, y: '100%', minWidth: 1700 }"
      @refresh="search"
      @select="select"
      @select-all="selectAll"
    >
      <template #toolbar-left>
        <a-input-search v-model="queryForm.name" placeholder="任务名称" allow-clear @search="search" />
        <a-input-search v-model="queryForm.testPlanId" placeholder="计划ID" allow-clear @search="search" />
        <a-select v-model="queryForm.status" :options="statusOptions" placeholder="任务状态" allow-clear style="width: 160px" @change="search" />
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
        <a-switch
          :model-value="record.status"
          checked-value="ENABLED"
          unchecked-value="DISABLED"
          @change="(value) => onUpdateStatus(record, value as string)"
        />
      </template>

      <template #action="{ record }">
        <a-space>
          <a-link @click="openForm(record)">修改</a-link>
          <a-link @click="onTrigger(record)">执行</a-link>
          <a-link @click="openLogs(record)">日志</a-link>
          <a-link status="danger" @click="onDelete(record)">删除</a-link>
        </a-space>
      </template>
    </GiTable>

    <a-modal v-model:visible="formVisible" :title="formState.id ? '修改测试定时任务' : '新增测试定时任务'" width="820px" @ok="submitForm">
      <a-form :model="formState" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="计划ID"><a-input-number v-model="formState.testPlanId" style="width: 100%" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="计划名称"><a-input v-model="formState.testPlanName" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="任务名称"><a-input v-model="formState.name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="任务类型"><a-input v-model="formState.type" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Cron"><a-input v-model="formState.cronExpression" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Misfire"><a-input v-model="formState.misfirePolicy" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="项目环境ID"><a-input-number v-model="formState.projectEnvironmentId" style="width: 100%" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="自动化环境ID"><a-input-number v-model="formState.automationEnvironmentId" style="width: 100%" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="执行人"><a-input v-model="formState.executeName" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="执行邮箱"><a-input v-model="formState.executeEmail" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="允许并发"><a-switch v-model="formState.allowConcurrentBool" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="状态"><a-select v-model="formState.status" :options="statusOptions" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="描述"><a-textarea v-model="formState.description" :auto-size="{ minRows: 3, maxRows: 5 }" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-drawer v-model:visible="logVisible" title="执行日志" :width="880" :footer="false">
      <a-table :data="logList" :columns="logColumns" :pagination="false" size="small" row-key="id" />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { Message, Modal, type TableInstance } from '@arco-design/web-vue'
import {
  addTimedTask,
  deleteTimedTask,
  exportTimedTask,
  listTimedTask,
  listTimedTaskLogs,
  triggerTimedTask,
  type TestTimedTaskLogResp,
  type TestTimedTaskQuery,
  type TestTimedTaskResp,
  updateTimedTask,
  updateTimedTaskStatus,
} from '@/apis/test/timedTask'
import { useTable } from '@/hooks'

defineOptions({ name: 'TestTimedTask' })

const statusOptions = [
  { label: '禁用', value: 'DISABLED' },
  { label: '启用', value: 'ENABLED' },
]

const queryForm = reactive<TestTimedTaskQuery>({
  name: undefined,
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
} = useTable((page) => listTimedTask({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: 'ID', dataIndex: 'id', width: 170 },
  { title: '任务名称', dataIndex: 'name', width: 220, ellipsis: true, tooltip: true },
  { title: '测试计划', dataIndex: 'testPlanName', width: 180, ellipsis: true, tooltip: true },
  { title: '类型', dataIndex: 'type', width: 120 },
  { title: 'Cron', dataIndex: 'cronExpression', width: 180 },
  { title: '项目环境ID', dataIndex: 'projectEnvironmentId', width: 140 },
  { title: '自动化环境ID', dataIndex: 'automationEnvironmentId', width: 160 },
  { title: '执行人', dataIndex: 'executeName', width: 120 },
  { title: '执行邮箱', dataIndex: 'executeEmail', width: 180, ellipsis: true, tooltip: true },
  { title: '调度任务ID', dataIndex: 'scheduleJobId', width: 140 },
  { title: '下次执行', dataIndex: 'nextExecuteTime', width: 180 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100, align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 220, align: 'center', fixed: 'right' },
]

const logColumns: TableInstance['columns'] = [
  { title: '日志ID', dataIndex: 'id', width: 140 },
  { title: '任务ID', dataIndex: 'jobId', width: 140 },
  { title: '状态', dataIndex: 'taskBatchStatus', width: 120 },
  { title: '触发原因', dataIndex: 'operationReason', width: 120 },
  { title: '执行器', dataIndex: 'executorInfo', width: 180 },
  { title: '执行时间', dataIndex: 'executionAt', width: 180 },
  { title: '创建时间', dataIndex: 'createDt', width: 180 },
]

const formVisible = ref(false)
const logVisible = ref(false)
const logList = ref<TestTimedTaskLogResp[]>([])

const formState = reactive<any>({
  id: '',
  testPlanId: undefined,
  testPlanName: '',
  name: '',
  type: 'PLAN',
  description: '',
  cronExpression: '0 0/30 * * * ?',
  misfirePolicy: 'DO_NOTHING',
  allowConcurrentBool: false,
  projectEnvironmentId: undefined,
  automationEnvironmentId: undefined,
  executeName: '',
  executeEmail: '',
  status: 'DISABLED',
})

const reset = () => {
  queryForm.name = undefined
  queryForm.testPlanId = undefined
  queryForm.status = undefined
  search()
}

const openForm = (record?: TestTimedTaskResp) => {
  formState.id = record?.id || ''
  formState.testPlanId = record?.testPlanId
  formState.testPlanName = record?.testPlanName || ''
  formState.name = record?.name || ''
  formState.type = record?.type || 'PLAN'
  formState.description = record?.description || ''
  formState.cronExpression = record?.cronExpression || '0 0/30 * * * ?'
  formState.misfirePolicy = record?.misfirePolicy || 'DO_NOTHING'
  formState.allowConcurrentBool = record?.allowConcurrent === 1
  formState.projectEnvironmentId = record?.projectEnvironmentId
  formState.automationEnvironmentId = record?.automationEnvironmentId
  formState.executeName = record?.executeName || ''
  formState.executeEmail = record?.executeEmail || ''
  formState.status = record?.status || 'DISABLED'
  formVisible.value = true
}

const submitForm = async () => {
  const payload = {
    testPlanId: Number(formState.testPlanId),
    testPlanName: formState.testPlanName,
    name: formState.name,
    type: formState.type,
    description: formState.description,
    cronExpression: formState.cronExpression,
    misfirePolicy: formState.misfirePolicy,
    allowConcurrent: formState.allowConcurrentBool ? 1 : 0,
    projectEnvironmentId: Number(formState.projectEnvironmentId),
    automationEnvironmentId: Number(formState.automationEnvironmentId),
    executeName: formState.executeName,
    executeEmail: formState.executeEmail,
    status: formState.status,
  }
  if (formState.id) await updateTimedTask(payload, formState.id)
  else await addTimedTask(payload)
  Message.success('保存成功')
  formVisible.value = false
  search()
}

const onDelete = (record?: TestTimedTaskResp) => {
  const ids = selectedKeys.value.length ? selectedKeys.value.map(item => String(item)) : record ? record.id : ''
  Modal.warning({
    title: '确认删除',
    content: selectedKeys.value.length ? '确认删除选中的定时任务吗？' : `确认删除定时任务“${record?.name}”吗？`,
    hideCancel: false,
    onOk: async () => {
      await deleteTimedTask(ids)
      Message.success('删除成功')
      search()
    },
  })
}

const onExport = async () => {
  await exportTimedTask(selectedKeys.value.length ? { ...queryForm, id: selectedKeys.value.join(',') } : queryForm)
}

const onUpdateStatus = async (record: TestTimedTaskResp, status: string) => {
  await updateTimedTaskStatus(record.id, status)
  Message.success('状态更新成功')
  search()
}

const onTrigger = async (record: TestTimedTaskResp) => {
  await triggerTimedTask(record.id)
  Message.success('任务已触发')
}

const openLogs = async (record: TestTimedTaskResp) => {
  const { data } = await listTimedTaskLogs(record.id, { page: 1, size: 50 })
  logList.value = data?.list || []
  logVisible.value = true
}
</script>
