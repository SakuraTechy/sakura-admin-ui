<template>
  <div class="gi_table_page test-report-page">
    <a-tabs
      v-model:active-key="activeTab"
      type="card-gutter"
      size="medium"
      class="test-report-tabs"
      :class="{ 'test-report-tabs--detail': isDetailTabActive }"
      editable
      :show-add-button="false"
      destroy-on-hide
      @delete="onTabDelete"
    >
      <a-tab-pane key="report-list" title="报告列表" :closable="false">
        <GiTable
          v-model:selectedKeys="selectedKeys"
          row-key="id"
          title=""
          :data="dataList"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          :row-selection="{ type: 'checkbox', showCheckedAll: true }"
          :show-selection-alert="true"
          :scroll="{ x: 1680, y: '100%' }"
          @refresh="search"
          @select="select"
          @select-all="selectAll"
        >
          <template #top>
            <div class="report-query-top-slot">
              <GiForm
                v-model="queryForm"
                :columns="queryFormColumns"
                size="medium"
                search
                :search-card="true"
                :search-columns-per-row="3"
                :search-control-min-width="200"
                :search-label-width="70"
                search-btn-text="查询"
                :search-on-change="true"
                :grid-props="planQueryGridProps"
                hide-fold-btn
                class="query-form report-query-form"
                @search="search"
                @reset="reset"
              />
            </div>
          </template>

          <template #toolbar-left>
            <a-button v-if="route.query.testPlanId" @click="goBackToPlan">
              <template #icon><icon-left /></template>
              返回计划
            </a-button>
          </template>

          <template #toolbar-right>
            <a-button @click="onExport">
              <template #icon><icon-download /></template>
              批量导出
            </a-button>
            <a-button status="danger" :disabled="!selectedKeys.length" @click="onDelete()">
              <template #icon><icon-delete /></template>
              批量删除
            </a-button>
          </template>
          <template #triggerMode="{ record }">
            {{ getDictLabel(triggerOptions, record.triggerMode) }}
          </template>
          <template #executeMode="{ record }">
            {{ getDictLabel(executeOptions, record.executeMode) }}
          </template>
          <template #reportType="{ record }">
            {{ getDictLabel(reportTypeOptions, record.reportType || 'SELENIUM') }}
          </template>
          <template #status="{ record }">
            <GiCellTag v-if="record.status" :value="record.status" :dict="test_report_status" />
            <span v-else>-</span>
          </template>
          <template #action="{ record }">
            <a-space>
              <a-link @click="openForm(record)">修改</a-link>
              <a-link status="danger" @click="onDelete(record)">删除</a-link>
              <a-dropdown trigger="click">
                <a-link class="more-link">
                  详情
                  <icon-down class="more-link__caret" />
                </a-link>
                <template #content>
                  <a-doption v-if="(record.reportType || 'SELENIUM') === 'SELENIUM'" @click="openFuncDetail(record)">功能测试报告</a-doption>
                  <a-doption v-if="(record.reportType || 'SELENIUM') === 'SELENIUM'" @click="openUiDetail(record)">Selenium 自动化报告</a-doption>
                  <a-doption v-if="record.reportType === 'PLAYWRIGHT_RUNNER'" @click="openPlaywrightDetail(record)">Playwright Runner 自动化报告</a-doption>
                  <a-doption v-if="record.reportType === 'CHROME_DEVTOOLS_PROTOCOL'" @click="openPlaywrightDetail(record)">Chrome DevTools Protocol 自动化报告</a-doption>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </GiTable>
      </a-tab-pane>

      <a-tab-pane
        v-for="tab in detailTabs"
        :key="tab.key"
        :title="tab.title"
        :closable="true"
      >
          <TestReportFuncDetail
            v-if="tab.type === 'func'"
            :detail-data="tab.detailData"
          />
          <TestReportUiDetail
            v-else-if="tab.type === 'ui'"
            :detail-data="tab.detailData"
          />
          <TestReportPlaywrightDetail
            v-else-if="tab.type === 'playwright'"
            :detail-data="tab.detailData"
          />
      </a-tab-pane>
    </a-tabs>

    <a-modal
      v-model:visible="formVisible"
      :title="formState.id ? '修改测试报告' : '新增测试报告'"
      width="720px"
      :body-style="{ padding: '20px' }"
      @before-ok="submitForm"
    >
      <a-form
        ref="formRef"
        :model="formState"
        layout="horizontal"
        auto-label-width
        scroll-to-first-error
        :label-col-props="{ flex: '100px' }"
        :wrapper-col-props="{ flex: '1' }"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="projectId" label="项目 ID" required>
              <a-input v-model="formState.projectId" placeholder="请输入" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="projectName" label="项目名称" required>
              <a-input v-model="formState.projectName" placeholder="请输入" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="testPlanId" label="计划 ID">
              <a-input v-model="formState.testPlanId" placeholder="请输入" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="testPlanName" label="计划名称">
              <a-input v-model="formState.testPlanName" placeholder="请输入" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="name" label="报告名称" required>
              <a-input v-model="formState.name" placeholder="请输入" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="versionName" label="版本名称">
              <a-input v-model="formState.versionName" placeholder="请输入" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="triggerMode" label="触发方式" required>
              <a-select v-model="formState.triggerMode" :options="triggerOptions" placeholder="请选择" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="executeMode" label="执行方式" required>
              <a-select v-model="formState.executeMode" :options="executeOptions" placeholder="请选择" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="reportType" label="报告类型" required>
              <a-select v-model="formState.reportType" :options="reportTypeOptions" placeholder="请选择" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="status" label="状态" required>
              <a-select v-model="formState.status" :options="statusOptions" placeholder="请选择" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item field="description" label="描述">
              <a-textarea v-model="formState.description" :auto-size="{ minRows: 3, maxRows: 6 }" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="tsx">
import { Message, Modal, type FormInstance, type TableInstance } from '@arco-design/web-vue'
import { computed } from 'vue'
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
  updateTestReport,
} from '@/apis/test/testReport'
import { getProjectConfigList, type ProjectConfigResp } from '@/apis/project/projectConfig'
import { listTestPlan, type TestPlanResp } from '@/apis/test/testPlan'
import TestReportFuncDetail from './components/TestReportFuncDetail.vue'
import TestReportUiDetail from './components/TestReportUiDetail.vue'
import TestReportPlaywrightDetail from './components/TestReportPlaywrightDetail.vue'
import { useTable } from '@/hooks'
import type { ColumnItem } from '@/components/GiForm'
import { toIdString } from '@/utils/id'
import { formatDuration } from '@/utils/sakura.js'
import { useDict } from '@/hooks/app/useDict.js'

defineOptions({ name: 'TestTestReport' })

const route = useRoute()
const router = useRouter()

const { test_report_status } = useDict('test_report_status')

const statusOptions = computed(() => test_report_status.value)
const triggerOptions = [
  { label: '手动', value: 'MANUAL' },
  { label: '定时', value: 'SCHEDULE' },
]
const executeOptions = [
  { label: '调试', value: 'DEBUG' },
  { label: '计划执行', value: 'PLAN' },
]
const reportTypeOptions = [
  { label: 'Selenium 自动化报告', value: 'SELENIUM' },
  { label: 'Playwright Runner 自动化报告', value: 'PLAYWRIGHT_RUNNER' },
  { label: 'Chrome DevTools Protocol 自动化报告', value: 'CHROME_DEVTOOLS_PROTOCOL' },
]

const getDictLabel = (options: { label: string; value: string }[], value?: string) => {
  if (!value) return '-'
  return options.find(o => o.value === value)?.label || value
}

const queryForm = reactive<TestReportQuery>({
  name: undefined,
  projectId: undefined,
  testPlanId: undefined,
  status: undefined,
  triggerMode: undefined,
  executeMode: undefined,
  reportType: undefined,
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

const projectConfigList = ref<ProjectConfigResp[]>([])
const testPlanList = ref<TestPlanResp[]>([])

const loadProjectConfigOptions = async () => {
  try {
    const { data } = await getProjectConfigList()
    projectConfigList.value = Array.isArray(data) ? data : []
  } catch {
    projectConfigList.value = []
  }
}

const loadTestPlanOptions = async () => {
  try {
    const { data } = await listTestPlan({ sort: ['createTime,desc'] })
    testPlanList.value = data?.list || []
  } catch {
    testPlanList.value = []
  }
}

onMounted(() => {
  void loadProjectConfigOptions()
  void loadTestPlanOptions()
})

const projectSelectOptions = computed(() => {
  return projectConfigList.value.map((item) => ({
    label: item.name || String(item.id),
    value: item.id,
  })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
})

const testPlanSelectOptions = computed(() => {
  return testPlanList.value.map((item) => ({
    label: item.name || String(item.id),
    value: item.id,
  })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
})

const planQueryGridProps = { cols: 24, colGap: 16, rowGap: 0 }
const planQueryFieldSpan = { xs: 24, sm: 8, xxl: 8 }

const queryFormColumns = computed<ColumnItem[]>(() => [
  {
    type: 'select',
    label: '所属项目',
    field: 'projectId',
    span: planQueryFieldSpan,
    props: {
      options: projectSelectOptions.value,
      placeholder: '请选择',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'select',
    label: '所属计划',
    field: 'testPlanId',
    span: planQueryFieldSpan,
    props: {
      options: testPlanSelectOptions.value,
      placeholder: '请选择',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'input',
    label: '报告名称',
    field: 'name',
    span: planQueryFieldSpan,
    props: {
      placeholder: '请输入报告名称',
      allowClear: true,
      showWordLimit: true,
    },
  },
  {
    type: 'select',
    label: '触发方式',
    field: 'triggerMode',
    span: planQueryFieldSpan,
    props: {
      options: triggerOptions,
      placeholder: '请选择',
      allowClear: true,
    },
  },
  {
    type: 'select',
    label: '执行方式',
    field: 'executeMode',
    span: planQueryFieldSpan,
    props: {
      options: executeOptions,
      placeholder: '请选择',
      allowClear: true,
    },
  },
  {
    type: 'select',
    label: '报告状态',
    field: 'status',
    span: planQueryFieldSpan,
    props: {
      options: statusOptions.value,
      placeholder: '请选择',
      allowClear: true,
    },
  },
  {
    type: 'select',
    label: '报告类型',
    field: 'reportType',
    span: planQueryFieldSpan,
    props: {
      options: reportTypeOptions,
      placeholder: '请选择',
      allowClear: true,
    },
  },
])

const columns: TableInstance['columns'] = [
  { title: '所属项目', dataIndex: 'projectName', width: 180, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '所属计划', dataIndex: 'testPlanName', width: 240, ellipsis: true, tooltip: true },
  { title: '报告名称', dataIndex: 'name', width: 340, ellipsis: true, tooltip: true },
  { title: '报告类型', dataIndex: 'reportType', slotName: 'reportType', width: 200, align: 'center' },
  { title: '触发方式', dataIndex: 'triggerMode', slotName: 'triggerMode', width: 90, align: 'center' },
  { title: '执行方式', dataIndex: 'executeMode', slotName: 'executeMode', width: 90, align: 'center' },
  {
    title: '运行耗时',
    dataIndex: 'runTime',
    width: 90,
    align: 'center',
    render: ({ record }) => formatDuration(record.runTime ?? '-'),
  },
  { title: '报告状态', dataIndex: 'status', slotName: 'status', width: 90, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', width: 110, align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', width: 180, render: ({ record }) => formatDateTime(record.createTime) },
  { title: '更新时间', dataIndex: 'updateTime', width: 180, render: ({ record }) => formatDateTime(record.updateTime) },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 190, align: 'center', fixed: 'right' },
]

const activeTab = ref('report-list')
const isDetailTabActive = computed(() => activeTab.value !== 'report-list')

interface DetailTab {
  key: string
  title: string
  type: 'func' | 'ui' | 'playwright'
  reportId: string
  detailData?: TestReportDetailResp
}

const detailTabs = ref<DetailTab[]>([])
const formVisible = ref(false)
const detailVisible = ref(false)
const detailData = ref<TestReportDetailResp>()
const formRef = ref<FormInstance>()

const openFuncDetail = async (record: TestReportResp) => {
  const key = `func-${record.id}`
  let tab = detailTabs.value.find(item => item.key === key)
  if (!tab) {
    const { data } = await getTestReport(record.id)
    tab = { key, title: `${record.name}`, type: 'func', reportId: record.id, detailData: data }
    detailTabs.value.push(tab)
  } else {
    const { data } = await getTestReport(record.id)
    tab.detailData = data
  }
  activeTab.value = key
}

const openUiDetail = async (record: TestReportResp) => {
  const key = `ui-${record.id}`
  let tab = detailTabs.value.find(item => item.key === key)
  if (!tab) {
    const { data } = await getTestReport(record.id)
    tab = { key, title: `${record.name}`, type: 'ui', reportId: record.id, detailData: data }
    detailTabs.value.push(tab)
  } else {
    const { data } = await getTestReport(record.id)
    tab.detailData = data
  }
  activeTab.value = key
}

const openPlaywrightDetail = async (record: TestReportResp) => {
  const key = `playwright-${record.id}`
  let tab = detailTabs.value.find(item => item.key === key)
  const { data } = await getTestReport(record.id)
  if (!tab) {
    tab = { key, title: `${record.name}`, type: 'playwright', reportId: record.id, detailData: data }
    detailTabs.value.push(tab)
  } else {
    tab.detailData = data
  }
  activeTab.value = key
}

const openReportDetailById = async (value: unknown) => {
  const reportId = toIdString(value as string | number | undefined)
  if (!reportId) return
  try {
    const { data } = await getTestReport(reportId)
    if (!data) return
    const fromPlanHistory = String(route.query.returnView || '') === 'scene-history'
    if (fromPlanHistory || data.reportType === 'PLAYWRIGHT_RUNNER' || data.reportType === 'CHROME_DEVTOOLS_PROTOCOL') {
      await openPlaywrightDetail(data)
    } else {
      await openUiDetail(data)
    }
  } catch {
    Message.error('加载测试报告详情失败')
  }
}

const onTabDelete = (key: string) => {
  closeTab(String(key))
}

const closeTab = (key: string) => {
  detailTabs.value = detailTabs.value.filter(item => item.key !== key)
  if (activeTab.value === key) activeTab.value = 'report-list'
}

const formState = reactive<any>({
  id: '',
  projectId: undefined,
  projectName: '',
  testPlanId: undefined,
  testPlanName: '',
  name: '',
  versionName: '',
  description: '',
  triggerMode: 'MANUAL',
  executeMode: 'PLAN',
  reportType: 'SELENIUM',
  status: 'RUNNING',
})

const goBackToPlan = async () => {
  const planId = toIdString(route.query.testPlanId as string | undefined) || toIdString(queryForm.testPlanId)
  if (!planId) return
  const returnView = String(route.query.returnView || '')
  await router.push({
    path: '/test/testPlan',
    query: {
      id: planId,
      ...(returnView === 'scene-history' ? { view: returnView } : {}),
    },
  })
}

const reset = () => {
  queryForm.id = undefined
  queryForm.name = undefined
  queryForm.projectId = undefined
  queryForm.testPlanId = undefined
  queryForm.status = undefined
  queryForm.triggerMode = undefined
  queryForm.executeMode = undefined
  queryForm.reportType = undefined
  void router.replace({ path: '/test/testReport', query: {} })
  search()
}

const syncRouteQuery = () => {
  const reportId = toIdString(route.query.id as string | undefined)
  const planId = toIdString(route.query.testPlanId as string | undefined)
  queryForm.id = reportId || undefined
  queryForm.testPlanId = planId || undefined
}

watch(
  () => route.query,
  async () => {
    syncRouteQuery()
    await search()
    if (route.query.id) await openReportDetailById(route.query.id)
  },
  { immediate: true },
)

const openForm = (record?: TestReportResp) => {
  formState.id = record?.id || ''
  formState.projectId = toIdString(record?.projectId) || undefined
  formState.projectName = record?.projectName || ''
  formState.testPlanId = toIdString(record?.testPlanId) || undefined
  formState.testPlanName = record?.testPlanName || ''
  formState.name = record?.name || ''
  formState.versionName = record?.versionName || ''
  formState.description = record?.description || ''
  formState.triggerMode = record?.triggerMode || 'MANUAL'
  formState.executeMode = record?.executeMode || 'PLAN'
  formState.reportType = record?.reportType || 'SELENIUM'
  formState.status = record?.status || 'RUNNING'
  formVisible.value = true
}

const submitForm = async (): Promise<boolean> => {
  if (await formRef.value?.validate()) {
    Message.warning('请检查必填项')
    return false
  }
  const projectId = toIdString(formState.projectId)
  const testPlanId = toIdString(formState.testPlanId)
  const payload = {
    projectId,
    projectName: formState.projectName,
    testPlanId: testPlanId || undefined,
    testPlanName: formState.testPlanName,
    name: formState.name?.trim(),
    versionName: formState.versionName,
    description: formState.description?.trim(),
    triggerMode: formState.triggerMode,
    executeMode: formState.executeMode,
    reportType: formState.reportType,
    status: formState.status,
  }
  try {
    if (formState.id) await updateTestReport(payload, formState.id)
    else await addTestReport(payload)
  } catch {
    return false
  }
  Message.success('保存成功')
  search()
  return true
}

const onDelete = (record?: TestReportResp) => {
  const ids = selectedKeys.value.length ? selectedKeys.value.map(item => String(item)) : record ? record.id : ''
  Modal.warning({
    title: '确认删除',
    content: selectedKeys.value.length
      ? '确认删除选中的测试报告吗？'
      : `确认删除测试报告"${record?.name || ''}"吗？`,
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

const formatDateTime = (value?: string | null) => {
  if (value == null || value === '') return '-'
  const s = String(value).trim()
  const normalized = s.includes('T') ? s.replace('T', ' ') : s
  return normalized.length > 19 ? normalized.slice(0, 19) : normalized
}
</script>

<style scoped lang="scss">
.test-report-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
  min-height: 0;
  padding: 0;
  background: var(--color-bg-1);
}

.test-report-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  margin-top: 5px;
  background: transparent;

  :deep(.arco-tabs) {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }

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
    height: calc(100% - 42px);
    /* min-height: 480px; */
    height: 100%;
    padding: 16px;
    background: var(--color-bg-1);
    border: 1px solid var(--color-border-2);
    border-top: 0;
    border-radius: 0 4px 4px 4px;
    box-shadow: 0 2px 6px rgb(0 0 0 / 4%);
  }

  :deep(.arco-tabs-content-list) {
    height: 100%;
  }

  :deep(.arco-tabs-pane) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  &--detail {
    :deep(.arco-tabs-content) {
      padding: 0 15px 15px 15px;
      background: var(--color-bg-2);
      box-shadow: none;
    }
  }
}

.detail-tab-pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.report-query-top-slot {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.query-form {
  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }
}

.report-query-form {
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

.more-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.more-link__caret {
  margin-left: 2px;
  font-size: 12px;
}
</style>
