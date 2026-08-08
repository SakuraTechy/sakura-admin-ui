<template>
  <div class="metric-page">
    <section class="metric-toolbar">
      <div class="metric-toolbar__title">
        <h2>测试度量</h2>
        <span>{{ dateRange[0] }} 至 {{ dateRange[1] }}</span>
      </div>
      <a-form :model="queryForm" layout="inline" class="metric-filter-form">
        <a-form-item label="项目" required>
          <a-select
            v-model="queryForm.projectId"
            :options="projectOptions"
            placeholder="请选择项目"
            allow-search
            @change="onProjectChange"
          />
        </a-form-item>
        <a-form-item label="版本">
          <a-select
            v-model="queryForm.versionId"
            :options="versionOptions"
            placeholder="全部版本"
            allow-clear
            allow-search
          />
        </a-form-item>
        <a-form-item label="日期">
          <a-range-picker
            v-model="dateRange"
            value-format="YYYY-MM-DD"
            :allow-clear="false"
            :shortcuts="dateShortcuts"
          />
        </a-form-item>
        <a-form-item label="引擎">
          <a-select v-model="queryForm.executionEngine" :options="engineOptions" placeholder="全部引擎" allow-clear />
        </a-form-item>
        <a-form-item label="触发">
          <a-select v-model="queryForm.triggerType" :options="triggerOptions" placeholder="全部方式" allow-clear />
        </a-form-item>
        <a-form-item label="环境">
          <a-select
            v-model="queryForm.environmentId"
            :options="environmentOptions"
            placeholder="全部环境"
            allow-clear
            allow-search
          />
        </a-form-item>
        <a-space class="metric-filter-form__actions">
          <a-button type="primary" :loading="loading" @click="loadMetrics">
            <template #icon><icon-search /></template>
            查询
          </a-button>
          <a-tooltip content="重置筛选">
            <a-button :disabled="loading" @click="resetFilters">
              <template #icon><icon-refresh /></template>
            </a-button>
          </a-tooltip>
        </a-space>
      </a-form>
    </section>

    <a-spin :loading="loading" class="metric-content">
      <a-empty v-if="!queryForm.projectId" description="请选择项目" />
      <template v-else>
        <section class="kpi-grid">
          <article class="kpi-card">
            <div class="kpi-card__header">
              <span>自动化通过率</span>
              <a-tag :color="rateChangeColor(summary.passRate)">{{ rateChangeText(summary.passRate) }}</a-tag>
            </div>
            <strong>{{ formatRate(summary.passRate) }}</strong>
            <p>{{ summary.passRate?.numerator || 0 }} 通过 / {{ summary.passRate?.denominator || 0 }} 有效结果</p>
          </article>
          <article class="kpi-card">
            <div class="kpi-card__header">
              <span>执行覆盖率</span>
              <a-tag :color="rateChangeColor(summary.executionCoverage)">{{ rateChangeText(summary.executionCoverage) }}</a-tag>
            </div>
            <strong>{{ formatRate(summary.executionCoverage) }}</strong>
            <p>{{ summary.executionCoverage?.numerator || 0 }} 已执行 / {{ summary.executionCoverage?.denominator || 0 }} 可执行场景</p>
          </article>
          <article class="kpi-card">
            <div class="kpi-card__header"><span>运行批次</span></div>
            <strong>{{ formatNumber(summary.runCount) }}</strong>
            <p>{{ formatNumber(summary.sceneExecutionCount) }} 次场景执行</p>
          </article>
          <article class="kpi-card">
            <div class="kpi-card__header"><span>平均耗时</span></div>
            <strong class="kpi-card__duration">{{ formatAverageDuration() }}</strong>
            <p>{{ formatNumber(summary.caseTotal) }} 用例 / {{ formatNumber(summary.stepTotal) }} 步骤</p>
          </article>
        </section>

        <section class="status-strip" aria-label="执行结果汇总">
          <div v-for="item in statusItems" :key="item.key" class="status-item">
            <i :style="{ backgroundColor: item.color }" />
            <span>{{ item.label }}</span>
            <strong>{{ formatNumber(item.value) }}</strong>
          </div>
        </section>

        <section v-if="!hasExecutionData" class="metric-panel metric-empty-state">
          <a-empty description="当前筛选范围暂无执行数据" />
        </section>

        <template v-else>
          <section class="metric-panel metric-panel--trend">
            <header class="metric-panel__header">
              <div>
                <h3>质量趋势</h3>
                <span>按完成日期统计</span>
              </div>
            </header>
            <VChart class="trend-chart" :option="trendOption" autoresize />
          </section>

          <section class="chart-grid">
            <div class="metric-panel">
              <header class="metric-panel__header">
                <div><h3>执行结果</h3><span>{{ formatNumber(resultBreakdown.total) }} 次终态执行</span></div>
              </header>
              <VChart class="breakdown-chart" :option="resultOption" autoresize />
            </div>
            <div class="metric-panel">
              <header class="metric-panel__header">
                <div><h3>维度分布</h3><span>{{ formatNumber(secondaryBreakdown.total) }} 次终态执行</span></div>
                <a-radio-group v-model="breakdownDimension" type="button" size="small" @change="loadSecondaryBreakdown">
                  <a-radio value="engine">引擎</a-radio>
                  <a-radio value="trigger">触发</a-radio>
                  <a-radio value="level">等级</a-radio>
                  <a-radio value="module">模块</a-radio>
                </a-radio-group>
              </header>
              <VChart class="breakdown-chart" :option="secondaryOption" autoresize />
            </div>
          </section>

          <section class="metric-panel">
            <header class="metric-panel__header">
              <div><h3>失败场景排行</h3><span>功能失败与基础设施失败分别计数</span></div>
            </header>
            <a-table
              :columns="failureColumns"
              :data="failures"
              :pagination="false"
              row-key="sceneId"
              :scroll="{ x: 980 }"
              class="failure-table"
            >
              <template #level="{ record }"><a-tag>{{ record.sceneLevel || '未指定' }}</a-tag></template>
              <template #failure="{ record }"><strong class="text-danger">{{ record.failCount }}</strong></template>
              <template #infra="{ record }"><strong class="text-info">{{ record.infraFailCount }}</strong></template>
              <template #error="{ record }">
                <a-tooltip :content="record.lastErrorMessage || record.lastErrorCode || '-'">
                  <span class="error-cell">{{ record.lastErrorMessage || record.lastErrorCode || '-' }}</span>
                </a-tooltip>
              </template>
              <template #action="{ record }"><a-link @click="openFailure(record)">查看</a-link></template>
            </a-table>
          </section>

          <section class="quality-bar">
            <span>维度质量</span>
            <a-tag color="green">精确 {{ formatNumber(summary.exactDimensionCount) }}</a-tag>
            <a-tag color="orange">推断 {{ formatNumber(summary.inferredDimensionCount) }}</a-tag>
            <a-tag color="gray">缺失 {{ formatNumber(summary.missingDimensionCount) }}</a-tag>
          </section>
        </template>
      </template>
    </a-spin>

    <a-drawer v-model:visible="failureVisible" title="失败详情" :width="520" :footer="false">
      <a-descriptions v-if="selectedFailure" :column="1" bordered size="medium">
        <a-descriptions-item label="场景">{{ selectedFailure.sceneName }}</a-descriptions-item>
        <a-descriptions-item label="场景 ID">{{ selectedFailure.sceneKey }}</a-descriptions-item>
        <a-descriptions-item label="模块">{{ selectedFailure.moduleName }}</a-descriptions-item>
        <a-descriptions-item label="等级">{{ selectedFailure.sceneLevel }}</a-descriptions-item>
        <a-descriptions-item label="功能失败">{{ selectedFailure.failCount }}</a-descriptions-item>
        <a-descriptions-item label="基础设施失败">{{ selectedFailure.infraFailCount }}</a-descriptions-item>
        <a-descriptions-item label="最近失败">{{ formatDateTime(selectedFailure.lastFailedAt) }}</a-descriptions-item>
        <a-descriptions-item label="错误码">{{ selectedFailure.lastErrorCode || '-' }}</a-descriptions-item>
      </a-descriptions>
      <pre v-if="selectedFailure?.lastErrorMessage" class="error-detail">{{ selectedFailure.lastErrorMessage }}</pre>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'
import VChart from 'vue-echarts'
import { Message } from '@arco-design/web-vue'
import { getProjectConfigList } from '@/apis/project/projectConfig'
import { getProjectEnvironmentConfigList } from '@/apis/project/projectEnvironmentConfig'
import { getProjectVersionConfigList } from '@/apis/project/projectVersionConfig'
import {
  type MetricRate,
  type TestMetricBreakdownResp,
  type TestMetricFailureItem,
  type TestMetricScopeQuery,
  type TestMetricSummaryResp,
  type TestMetricTrendPoint,
  getTestMetricBreakdown,
  getTestMetricFailures,
  getTestMetricSummary,
  getTestMetricTrends,
} from '@/apis/test/testMetric'
import { formatDuration } from '@/utils/sakura'

defineOptions({ name: 'TestTestMetric' })

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

interface SelectOption { label: string, value: string, extra?: string }

const emptyRate = () => ({ numerator: 0, denominator: 0, rate: 0, previousRate: 0, changePoints: 0 })
const emptySummary = (): Partial<TestMetricSummaryResp> => ({ passRate: emptyRate(), executionCoverage: emptyRate() })
const emptyBreakdown = (): TestMetricBreakdownResp => ({ dimension: '', total: 0, items: [] })

const loading = ref(false)
const projectOptions = ref<SelectOption[]>([])
const versionOptions = ref<SelectOption[]>([])
const environmentOptions = ref<SelectOption[]>([])
const dateRange = ref<string[]>([dayjs().subtract(29, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')])
const queryForm = reactive({
  projectId: undefined as string | undefined,
  versionId: undefined as string | undefined,
  executionEngine: undefined as string | undefined,
  triggerType: undefined as string | undefined,
  environmentId: undefined as string | undefined,
})
const summary = ref<Partial<TestMetricSummaryResp>>(emptySummary())
const trends = ref<TestMetricTrendPoint[]>([])
const resultBreakdown = ref<TestMetricBreakdownResp>(emptyBreakdown())
const secondaryBreakdown = ref<TestMetricBreakdownResp>(emptyBreakdown())
const failures = ref<TestMetricFailureItem[]>([])
const breakdownDimension = ref('engine')
const failureVisible = ref(false)
const selectedFailure = ref<TestMetricFailureItem>()

const engineOptions = [
  { label: 'Selenium', value: 'selenium' },
  { label: 'Playwright Runner', value: 'playwright-runner' },
  { label: 'Chrome DevTools Protocol', value: 'extension-cdp' },
  { label: 'Jenkins', value: 'jenkins' },
]
const triggerOptions = [
  { label: '手动', value: 'manual' },
  { label: '测试计划', value: 'test-plan' },
  { label: '定时任务', value: 'schedule' },
  { label: 'Jenkins', value: 'jenkins' },
]
const dateShortcuts = [
  { label: '近 7 天', value: () => [dayjs().subtract(6, 'day').toDate(), dayjs().toDate()] },
  { label: '近 30 天', value: () => [dayjs().subtract(29, 'day').toDate(), dayjs().toDate()] },
  { label: '近 90 天', value: () => [dayjs().subtract(89, 'day').toDate(), dayjs().toDate()] },
]

const failureColumns = [
  { title: '场景', dataIndex: 'sceneName', width: 220, ellipsis: true, tooltip: true },
  { title: '模块', dataIndex: 'moduleName', width: 160, ellipsis: true, tooltip: true },
  { title: '等级', dataIndex: 'sceneLevel', slotName: 'level', width: 90, align: 'center' },
  { title: '功能失败', dataIndex: 'failCount', slotName: 'failure', width: 100, align: 'center' },
  { title: '基础设施失败', dataIndex: 'infraFailCount', slotName: 'infra', width: 130, align: 'center' },
  { title: '最近失败', dataIndex: 'lastFailedAt', width: 170 },
  { title: '最近错误', dataIndex: 'lastErrorMessage', slotName: 'error', width: 280 },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 80, align: 'center', fixed: 'right' },
]

const statusItems = computed(() => [
  { key: 'pass', label: '通过', value: summary.value.passCount || 0, color: '#16a34a' },
  { key: 'fail', label: '失败', value: summary.value.failCount || 0, color: '#dc2626' },
  { key: 'skip', label: '跳过', value: summary.value.skipCount || 0, color: '#d97706' },
  { key: 'cancel', label: '取消', value: summary.value.cancelCount || 0, color: '#64748b' },
  { key: 'infra', label: '基础设施失败', value: summary.value.infraFailCount || 0, color: '#2563eb' },
])

const hasExecutionData = computed(() => Number(summary.value.runCount || 0) > 0
  || Number(summary.value.sceneExecutionCount || 0) > 0
  || Number(resultBreakdown.value.total || 0) > 0
  || trends.value.some((item) => Number(item.runCount || 0) > 0 || Number(item.executedCount || 0) > 0))

const trendOption = computed(() => ({
  color: ['#16a34a', '#dc2626', '#d97706', '#64748b', '#2563eb', '#111827'],
  tooltip: { trigger: 'axis' },
  legend: { top: 4, right: 8 },
  grid: { top: 48, left: 48, right: 58, bottom: 36 },
  xAxis: { type: 'category', boundaryGap: false, data: trends.value.map((item) => item.date) },
  yAxis: [
    { type: 'value', minInterval: 1, name: '次数' },
    { type: 'value', min: 0, max: 100, name: '通过率', axisLabel: { formatter: '{value}%' } },
  ],
  series: [
    { name: '通过', type: 'line', symbol: 'none', data: trends.value.map((item) => item.passCount) },
    { name: '失败', type: 'line', symbol: 'none', data: trends.value.map((item) => item.failCount) },
    { name: '跳过', type: 'line', symbol: 'none', data: trends.value.map((item) => item.skipCount) },
    { name: '取消', type: 'line', symbol: 'none', data: trends.value.map((item) => item.cancelCount) },
    { name: '基础设施失败', type: 'line', symbol: 'none', data: trends.value.map((item) => item.infraFailCount) },
    { name: '通过率', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 5, data: trends.value.map((item) => item.passRate) },
  ],
}))

const resultColor: Record<string, string> = {
  PASSED: '#16a34a',
  FAILED: '#dc2626',
  SKIPPED: '#d97706',
  CANCELLED: '#64748b',
  INFRA_FAILED: '#2563eb',
  OTHER: '#94a3b8',
}
const resultOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
  legend: { orient: 'vertical', right: 8, top: 'middle' },
  series: [{
    type: 'pie',
    radius: ['48%', '70%'],
    center: ['38%', '52%'],
    label: { show: false },
    itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
    data: resultBreakdown.value.items.map((item) => ({
      name: item.label,
      value: item.count,
      itemStyle: { color: resultColor[item.key] || '#94a3b8' },
    })),
  }],
}))

const secondaryOption = computed(() => ({
  color: ['#2563eb'],
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { top: 12, left: 100, right: 28, bottom: 28 },
  xAxis: { type: 'value', minInterval: 1 },
  yAxis: {
    type: 'category',
    data: secondaryBreakdown.value.items.slice(0, 10).map((item) => item.label).reverse(),
    axisLabel: { width: 88, overflow: 'truncate' },
  },
  series: [{
    type: 'bar',
    barMaxWidth: 24,
    data: secondaryBreakdown.value.items.slice(0, 10).map((item) => item.count).reverse(),
    itemStyle: { borderRadius: [0, 3, 3, 0] },
  }],
}))

const buildQuery = (): TestMetricScopeQuery | undefined => {
  if (!queryForm.projectId) return undefined
  return {
    projectId: queryForm.projectId,
    versionId: queryForm.versionId,
    startDate: dateRange.value?.[0],
    endDate: dateRange.value?.[1],
    executionEngine: queryForm.executionEngine,
    triggerType: queryForm.triggerType,
    environmentId: queryForm.environmentId,
  }
}

const loadMetrics = async () => {
  const query = buildQuery()
  if (!query) {
    Message.warning('请选择项目')
    return
  }
  loading.value = true
  try {
    const [summaryRes, trendRes, resultRes, secondaryRes, failureRes] = await Promise.all([
      getTestMetricSummary(query),
      getTestMetricTrends(query),
      getTestMetricBreakdown(query, 'result'),
      getTestMetricBreakdown(query, breakdownDimension.value),
      getTestMetricFailures(query, 10),
    ])
    summary.value = summaryRes.data || emptySummary()
    trends.value = trendRes.data?.points || []
    resultBreakdown.value = resultRes.data || emptyBreakdown()
    secondaryBreakdown.value = secondaryRes.data || emptyBreakdown()
    failures.value = failureRes.data?.items || []
  } finally {
    loading.value = false
  }
}

const loadSecondaryBreakdown = async () => {
  const query = buildQuery()
  if (!query) return
  const { data } = await getTestMetricBreakdown(query, breakdownDimension.value)
  secondaryBreakdown.value = data || emptyBreakdown()
}

const loadVersions = async (projectId?: string) => {
  versionOptions.value = []
  if (!projectId) return
  const { data } = await getProjectVersionConfigList({ projectId, status: 1, sort: ['name,desc'] })
  versionOptions.value = (data || []).map((item) => ({ label: item.name, value: item.id, extra: item.type }))
}

const loadEnvironments = async (projectId?: string) => {
  environmentOptions.value = []
  if (!projectId) return
  const { data } = await getProjectEnvironmentConfigList({
    projectId,
    status: 1,
    page: 1,
    size: 200,
  } as any)
  environmentOptions.value = (data || []).map((item) => ({ label: item.name, value: item.id }))
}

const onProjectChange = async () => {
  queryForm.versionId = undefined
  queryForm.environmentId = undefined
  await Promise.all([loadVersions(queryForm.projectId), loadEnvironments(queryForm.projectId)])
  queryForm.versionId = versionOptions.value.find((item) => item.extra === '1')?.value
  await loadMetrics()
}

const resetFilters = async () => {
  queryForm.executionEngine = undefined
  queryForm.triggerType = undefined
  queryForm.environmentId = undefined
  dateRange.value = [dayjs().subtract(29, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')]
  await loadMetrics()
}

const openFailure = (record: TestMetricFailureItem) => {
  selectedFailure.value = record
  failureVisible.value = true
}

const formatRate = (metric?: Partial<MetricRate>) => Number(metric?.denominator || 0) > 0
  ? `${Number(metric?.rate || 0).toFixed(2)}%`
  : '--'
const formatNumber = (value?: number) => Number(value || 0).toLocaleString('zh-CN')
const formatDateTime = (value?: string) => value ? value.replace('T', ' ').slice(0, 19) : '-'
const changeColor = (value?: number) => Number(value || 0) > 0 ? 'green' : Number(value || 0) < 0 ? 'red' : 'gray'
const rateChangeColor = (metric?: Partial<MetricRate>) => Number(metric?.denominator || 0) > 0
  ? changeColor(metric?.changePoints)
  : 'gray'
const changeText = (value?: number) => {
  const number = Number(value || 0)
  const sign = number > 0 ? '+' : ''
  return `较上期 ${sign}${number.toFixed(2)}pp`
}
const rateChangeText = (metric?: Partial<MetricRate>) => Number(metric?.denominator || 0) > 0
  ? changeText(metric?.changePoints)
  : '暂无对比'
const formatAverageDuration = () => Number(summary.value.sceneExecutionCount || 0) > 0
  ? formatDuration(summary.value.averageDurationMs || 0)
  : '--'

onMounted(async () => {
  const { data } = await getProjectConfigList({ status: 1, sort: ['name,asc'] })
  projectOptions.value = (data || []).map((item) => ({ label: item.name || item.id, value: item.id }))
  queryForm.projectId = projectOptions.value[0]?.value
  if (queryForm.projectId) {
    await Promise.all([loadVersions(queryForm.projectId), loadEnvironments(queryForm.projectId)])
    queryForm.versionId = versionOptions.value.find((item) => item.extra === '1')?.value
    await loadMetrics()
  }
})
</script>

<style scoped lang="scss">
.metric-page {
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 12px 16px 20px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
  background: var(--color-fill-2);
}

.metric-toolbar,
.metric-panel,
.quality-bar {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
}

.metric-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 12px 16px;
}

.metric-toolbar__title {
  flex: 0 0 190px;
  padding-top: 2px;
}

.metric-toolbar__title h2,
.metric-panel__header h3 {
  margin: 0;
  color: var(--color-text-1);
  letter-spacing: 0;
}

.metric-toolbar__title h2 { font-size: 20px; }
.metric-toolbar__title span,
.metric-panel__header span {
  display: block;
  margin-top: 5px;
  color: var(--color-text-3);
  font-size: 12px;
}
.metric-toolbar__title span {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.metric-filter-form {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(250px, 1.35fr) minmax(160px, .8fr) minmax(160px, .8fr) minmax(160px, .8fr) auto;
  gap: 10px;
  align-items: center;
  flex: 1;
}

.metric-filter-form :deep(.arco-form-item) { margin: 0; }
.metric-filter-form :deep(.arco-form-item-content),
.metric-filter-form :deep(.arco-select),
.metric-filter-form :deep(.arco-picker) { min-width: 0; width: 100%; }
.metric-filter-form__actions { justify-self: end; }

.metric-content {
  display: block;
  width: 100%;
  min-height: 0;
  margin-top: 12px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.kpi-card {
  min-height: 112px;
  padding: 13px 16px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-top: 3px solid #2563eb;
  border-radius: 4px;
  box-sizing: border-box;
}
.kpi-card:nth-child(2) { border-top-color: #16a34a; }
.kpi-card:nth-child(3) { border-top-color: #d97706; }
.kpi-card:nth-child(4) { border-top-color: #475569; }

.kpi-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  color: var(--color-text-2);
}

.kpi-card > strong {
  display: block;
  margin-top: 5px;
  color: var(--color-text-1);
  font-size: 28px;
  line-height: 32px;
  letter-spacing: 0;
}
.kpi-card > .kpi-card__duration { font-size: 24px; }
.kpi-card p { margin: 4px 0 0; color: var(--color-text-3); font-size: 13px; }

.status-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-top: 12px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
}

.status-item {
  display: grid;
  grid-template-columns: 8px 1fr auto;
  gap: 9px;
  align-items: center;
  min-height: 50px;
  padding: 0 18px;
  border-right: 1px solid var(--color-border-2);
}
.status-item:last-child { border-right: 0; }
.status-item i { width: 8px; height: 8px; border-radius: 50%; }
.status-item span { color: var(--color-text-2); }
.status-item strong { font-size: 18px; }

.metric-panel { margin-top: 12px; overflow: hidden; }
.metric-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 52px;
  padding: 0 18px;
  border-bottom: 1px solid var(--color-border-2);
}
.metric-panel__header h3 { font-size: 16px; }
.trend-chart { width: 100%; height: 260px; }
.breakdown-chart { width: 100%; height: 240px; }

.metric-empty-state {
  display: grid;
  place-items: center;
  min-height: 172px;
}
.metric-empty-state :deep(.arco-empty) { padding: 24px 0; }

.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 12px;
}

.failure-table :deep(.arco-table-th) { background: var(--color-fill-2); }
.failure-table :deep(.arco-table-border .arco-table-container) { border: 0; }
.error-cell { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-danger { color: #dc2626; }
.text-info { color: #2563eb; }

.quality-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  margin-top: 12px;
  padding: 0 16px;
}
.quality-bar > span { margin-right: 4px; color: var(--color-text-2); font-weight: 500; }

.error-detail {
  margin: 16px 0 0;
  padding: 14px;
  overflow: auto;
  color: var(--color-text-1);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-fill-2);
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}

@media (max-width: 1800px) {
  .metric-toolbar { flex-direction: column; }
  .metric-toolbar__title { flex-basis: auto; }
  .metric-filter-form { width: 100%; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .metric-filter-form__actions { grid-column: -2 / -1; justify-self: end; }
}

@media (max-width: 1200px) {
  .metric-filter-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metric-filter-form__actions { justify-self: start; }
}

@media (max-width: 900px) {
  .metric-page { padding: 10px 12px 16px; }
  .metric-filter-form { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .status-strip { grid-template-columns: 1fr; }
  .status-item { border-right: 0; border-bottom: 1px solid var(--color-border-2); }
  .status-item:last-child { border-bottom: 0; }
  .chart-grid { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .metric-panel__header { align-items: flex-start; flex-direction: column; padding: 12px 14px; }
  .trend-chart, .breakdown-chart { height: 260px; }
}
</style>
