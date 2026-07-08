<template>
  <div class="metric_page test-legacy-page">
    <a-tabs class="legacy-tabs" default-active-key="metric" type="card">
      <a-tab-pane key="metric" title="测试度量">
        <div class="legacy-search-card">
          <a-form :model="queryForm" layout="inline" class="legacy-search-form metric-search-form">
            <a-form-item label="所属项目">
              <a-input v-model="queryForm.projectId" placeholder="项目 ID" allow-clear />
            </a-form-item>
            <a-form-item label="项目版本">
              <a-input v-model="queryForm.versionId" placeholder="版本 ID" allow-clear />
            </a-form-item>
            <a-space>
              <a-button type="primary" :loading="loading" @click="search">
                <template #icon><icon-search /></template>
                查询
              </a-button>
              <a-button @click="reset">
                <template #icon><icon-refresh /></template>
                重置
              </a-button>
            </a-space>
          </a-form>
        </div>
        <a-divider class="legacy-divider" />

    <a-row :gutter="[16, 16]">
      <a-col v-for="item in overviewCards" :key="item.title" :xs="24" :sm="12" :lg="6">
        <a-card class="metric-card" :bordered="false">
          <a-statistic :title="item.title" :value="item.value" :suffix="item.suffix" />
          <div class="metric-card__desc">{{ item.desc }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :xl="12">
        <a-card title="功能模块数量统计" :bordered="false">
          <template #extra>
            <a-popover title="计算规则">
              <template #content>统计当前项目版本下的功能模块总量及本周、本月、本年新增数量。</template>
              <icon-question-circle />
            </a-popover>
          </template>
          <v-chart class="chart" :option="moduleChartOption" autoresize />
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="12">
        <a-card title="测试场景等级统计" :bordered="false">
          <template #extra>
            <a-popover title="计算规则">
              <template #content>按 P0/P1/P2/P3 统计当前项目版本下的 UI 自动化场景数量。</template>
              <icon-question-circle />
            </a-popover>
          </template>
          <v-chart class="chart" :option="sceneLevelChartOption" autoresize />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :xl="14">
        <a-card title="自动化测试执行情况" :bordered="false">
          <template #extra>
            <a-popover title="计算规则">
              <template #content>统计测试报告产出、自动化运行次数、累计执行场景和场景执行结果。</template>
              <icon-question-circle />
            </a-popover>
          </template>
          <a-row :gutter="[12, 12]" class="run-grid">
            <a-col :xs="24" :md="8">
              <div class="run-tile">
                <span>本周运行</span>
                <strong>{{ execution.weekRunCount || 0 }}</strong>
              </div>
            </a-col>
            <a-col :xs="24" :md="8">
              <div class="run-tile">
                <span>本月运行</span>
                <strong>{{ execution.monthRunCount || 0 }}</strong>
              </div>
            </a-col>
            <a-col :xs="24" :md="8">
              <div class="run-tile">
                <span>本年运行</span>
                <strong>{{ execution.yearRunCount || 0 }}</strong>
              </div>
            </a-col>
          </a-row>
          <v-chart class="chart chart--wide" :option="executionChartOption" autoresize />
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="10">
        <a-card title="自动化测试价值产出" :bordered="false">
          <template #extra>
            <a-popover title="计算规则">
              <template #content>统计缺陷发现、人力节省及覆盖率、执行率、通过率、缺陷率等核心质量指标。</template>
              <icon-question-circle />
            </a-popover>
          </template>
          <div class="value-list">
            <div class="value-item">
              <span>累计发现缺陷</span>
              <strong>{{ execution.discoveredDefectCount || 0 }}</strong>
            </div>
            <div class="value-item">
              <span>节省人力(小时)</span>
              <strong>{{ execution.savedManHours || 0 }}</strong>
            </div>
          </div>
          <v-chart class="chart chart--radar" :option="rateChartOption" autoresize />
        </a-card>
      </a-col>
    </a-row>

    <a-card title="指标明细" :bordered="false">
      <a-descriptions :column="{ xs: 1, md: 2, xl: 4 }" bordered size="small">
        <a-descriptions-item label="模块总数">{{ moduleMetric.totalCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="场景总数">{{ sceneMetric.totalCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="测试计划">{{ data.testPlanCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="测试报告">{{ data.testReportCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="已执行场景">{{ sceneMetric.executedCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="通过场景">{{ sceneMetric.passedCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="失败场景">{{ sceneMetric.failedCount || 0 }}</a-descriptions-item>
        <a-descriptions-item label="跳过场景">{{ sceneMetric.skippedCount || 0 }}</a-descriptions-item>
      </a-descriptions>
    </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { BarChart, PieChart, RadarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, RadarComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { getTestMetricOverview, type TestMetricResp } from '@/apis/test/testMetric'

use([BarChart, PieChart, RadarChart, GridComponent, LegendComponent, RadarComponent, TooltipComponent, CanvasRenderer])

defineOptions({ name: 'TestTestMetric' })

const queryForm = reactive({
  projectId: undefined as string | undefined,
  versionId: undefined as string | undefined,
})

const loading = ref(false)
const data = ref<Partial<TestMetricResp>>({})

const moduleMetric = computed(() => data.value.moduleMetric || {})
const sceneMetric = computed(() => data.value.sceneMetric || {})
const execution = computed(() => data.value.executionMetric || {})

const overviewCards = computed(() => [
  { title: '测试计划', value: data.value.testPlanCount || 0, desc: '当前筛选范围内计划总数' },
  { title: '测试报告', value: data.value.testReportCount || 0, desc: '自动化执行沉淀报告数' },
  { title: '定时任务', value: data.value.timedTaskCount || 0, desc: '已配置自动执行任务' },
  { title: '自动化通过率', value: Number(data.value.automationPassRate || 0), suffix: '%', desc: '按最新统计结果汇总' },
])

const moduleChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 24, left: 36, right: 16, bottom: 28 },
  xAxis: { type: 'category', data: ['总量', '本周新增', '本月新增', '本年新增'] },
  yAxis: { type: 'value' },
  series: [{
    name: '模块数',
    type: 'bar',
    barWidth: 34,
    itemStyle: { color: '#2563eb', borderRadius: [6, 6, 0, 0] },
    data: [
      moduleMetric.value.totalCount || 0,
      moduleMetric.value.weekAddedCount || 0,
      moduleMetric.value.monthAddedCount || 0,
      moduleMetric.value.yearAddedCount || 0,
    ],
  }],
}))

const sceneLevelChartOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{
    name: '场景等级',
    type: 'pie',
    radius: ['42%', '66%'],
    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
    color: ['#ef4444', '#f97316', '#3b82f6', '#94a3b8'],
    data: [
      { name: 'P0', value: sceneMetric.value.p0Count || 0 },
      { name: 'P1', value: sceneMetric.value.p1Count || 0 },
      { name: 'P2', value: sceneMetric.value.p2Count || 0 },
      { name: 'P3', value: sceneMetric.value.p3Count || 0 },
    ],
  }],
}))

const executionChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { top: 0 },
  grid: { top: 40, left: 36, right: 16, bottom: 28 },
  xAxis: { type: 'category', data: ['场景'] },
  yAxis: { type: 'value' },
  series: [
    { name: '通过', type: 'bar', stack: 'total', color: '#22c55e', data: [sceneMetric.value.passedCount || 0] },
    { name: '失败', type: 'bar', stack: 'total', color: '#ef4444', data: [sceneMetric.value.failedCount || 0] },
    { name: '跳过', type: 'bar', stack: 'total', color: '#f59e0b', data: [sceneMetric.value.skippedCount || 0] },
    { name: '未执行', type: 'bar', stack: 'total', color: '#cbd5e1', data: [Math.max((sceneMetric.value.totalCount || 0) - (sceneMetric.value.executedCount || 0), 0)] },
  ],
}))

const rateChartOption = computed(() => ({
  tooltip: {},
  radar: {
    radius: '62%',
    indicator: [
      { name: '覆盖率', max: 100 },
      { name: '执行率', max: 100 },
      { name: '通过率', max: 100 },
      { name: '缺陷率', max: 100 },
    ],
  },
  series: [{
    type: 'radar',
    areaStyle: { color: 'rgba(37, 99, 235, 0.18)' },
    lineStyle: { color: '#2563eb' },
    itemStyle: { color: '#2563eb' },
    data: [{
      name: '质量指标',
      value: [
        execution.value.automationCoverageRate || 0,
        execution.value.automationExecuteRate || 0,
        execution.value.automationPassRate || 0,
        execution.value.defectRate || 0,
      ],
    }],
  }],
}))

const search = async () => {
  loading.value = true
  try {
    const params = {
      projectId: queryForm.projectId?.trim() || undefined,
      versionId: queryForm.versionId?.trim() || undefined,
    }
    const { data: resp } = await getTestMetricOverview(params)
    data.value = resp || {}
  } finally {
    loading.value = false
  }
}

const reset = () => {
  queryForm.projectId = undefined
  queryForm.versionId = undefined
  search()
}

onMounted(search)
</script>

<style scoped lang="scss">
@use '../legacy.scss';

.metric_page {
  :deep(.arco-row) {
    margin-bottom: 14px;
  }
}

.filter-card,
.metric-card,
:deep(.arco-card) {
  border-radius: 4px;
}

.metric-search-form {
  grid-template-columns: repeat(2, minmax(240px, 1fr)) 188px;
}

.metric-card__desc {
  margin-top: 8px;
  color: var(--color-text-3);
  font-size: 13px;
}

.chart {
  width: 100%;
  height: 280px;
}

.chart--wide {
  height: 300px;
  margin-top: 12px;
}

.chart--radar {
  height: 300px;
}

.run-grid {
  margin-bottom: 4px;
}

.run-tile,
.value-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  background: var(--color-bg-1);
}

.run-tile span,
.value-item span {
  color: var(--color-text-3);
}

.run-tile strong,
.value-item strong {
  color: var(--color-text-1);
  font-size: 24px;
}

.value-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}
</style>
