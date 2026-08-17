<template>
  <div class="metric-page">
    <section class="metric-toolbar">
      <div class="metric-toolbar__title">
        <h2>测试度量 <a-tooltip :content="metricHelp.scope"><icon-question-circle class="metric-help-icon" /></a-tooltip></h2>
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
            :disabled="isLocalDemoProject()"
          />
        </a-form-item>
        <a-form-item label="日期">
          <a-range-picker
            v-model="dateRange"
            value-format="YYYY-MM-DD"
            :allow-clear="false"
            :shortcuts="dateShortcuts"
            :disabled="isLocalDemoProject()"
          />
        </a-form-item>
        <a-form-item label="引擎">
          <a-select
            v-model="queryForm.executionEngine"
            :options="engineOptions"
            placeholder="全部引擎"
            allow-clear
            :disabled="isLocalDemoProject()"
          />
        </a-form-item>
        <a-form-item label="触发">
          <a-select
            v-model="queryForm.triggerType"
            :options="triggerOptions"
            placeholder="全部方式"
            allow-clear
            :disabled="isLocalDemoProject()"
          />
        </a-form-item>
        <a-form-item label="环境">
          <a-select
            v-model="queryForm.environmentId"
            :options="environmentOptions"
            placeholder="全部环境"
            allow-clear
            allow-search
            :disabled="isLocalDemoProject()"
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
        <section class="asset-grid">
          <div class="metric-panel asset-panel">
            <header class="metric-panel__header">
              <div><h3>功能模块资产 <a-tooltip :content="metricHelp.moduleInventory"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>当前项目版本的启用模块与场景归属</span></div>
            </header>
            <div v-if="inventory.moduleTotal" class="asset-module-content">
              <VChart class="asset-chart asset-module-chart" :option="moduleInventoryOption" autoresize />
              <div class="asset-module-tree">
                <div class="asset-module-tree__header">
                  <span>模块层级</span>
                  <div>
                    <small>{{ moduleTreeSummary }}</small>
                    <a-link v-if="selectedModuleNode" class="asset-module-tree__reset" @click="clearModuleSelection">查看全部</a-link>
                  </div>
                </div>
                <a-input
                  v-if="moduleTreeNodes.length > 8"
                  v-model="moduleTreeSearch"
                  size="small"
                  allow-clear
                  placeholder="搜索模块"
                >
                  <template #prefix><icon-search /></template>
                </a-input>
                <a-scrollbar class="asset-module-tree__scroll" outer-style="height: 100%; overflow: auto">
                  <a-tree
                    v-if="filteredModuleTreeNodes.length"
                    size="small"
                    block-node
                    show-line
                    default-expand-all
                    :data="filteredModuleTreeNodes"
                    :field-names="{ key: 'key', title: 'label', children: 'children' }"
                    :selected-keys="selectedModuleKey ? [selectedModuleKey] : []"
                    @select="onModuleTreeSelect"
                  >
                    <template #title="node">
                      <div class="asset-module-tree__node">
                        <a-typography-paragraph :ellipsis="{ rows: 1, showTooltip: true, css: true }">
                          {{ node.label }}
                        </a-typography-paragraph>
                        <span>{{ formatNumber(node.totalSceneCount) }}</span>
                      </div>
                    </template>
                  </a-tree>
                  <a-empty v-else description="未找到匹配模块" />
                </a-scrollbar>
                <div class="asset-module-selection">
                  <template v-if="selectedModuleNode">
                    <span>当前模块场景占比</span>
                    <strong>{{ selectedModuleShare }}</strong>
                    <small>{{ selectedModuleNode.label }} · {{ formatNumber(selectedModuleNode.totalSceneCount) }} / {{ formatNumber(inventory.sceneTotal) }} 个场景</small>
                  </template>
                  <span v-else>点击模块查看对应场景占比</span>
                </div>
              </div>
            </div>
            <div v-else class="asset-empty"><a-empty description="当前版本暂无启用模块" /></div>
          </div>
          <div class="metric-panel asset-panel">
            <header class="metric-panel__header">
              <div><h3>测试场景资产 <a-tooltip :content="metricHelp.sceneInventory"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>按场景等级统计当前启用库存</span></div>
            </header>
            <VChart v-if="inventory.sceneTotal" class="asset-chart" :option="sceneInventoryOption" autoresize />
            <div v-else class="asset-empty"><a-empty description="当前版本暂无启用场景" /></div>
          </div>
        </section>

        <section class="kpi-grid">
          <article class="kpi-card">
            <div class="kpi-card__header">
              <span>自动化通过率 <a-tooltip :content="metricHelp.passRate"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
              <a-tag :color="rateChangeColor(summary.passRate)">{{ rateChangeText(summary.passRate) }}</a-tag>
            </div>
            <strong>{{ formatRate(summary.passRate) }}</strong>
            <p>{{ summary.passRate?.numerator || 0 }} 通过 / {{ summary.passRate?.denominator || 0 }} 有效结果</p>
          </article>
          <article class="kpi-card">
            <div class="kpi-card__header">
              <span>执行覆盖率 <a-tooltip :content="metricHelp.executionCoverage"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
              <a-tag :color="rateChangeColor(summary.executionCoverage)">{{ rateChangeText(summary.executionCoverage) }}</a-tag>
            </div>
            <strong>{{ formatRate(summary.executionCoverage) }}</strong>
            <p>{{ summary.executionCoverage?.numerator || 0 }} 已执行 / {{ summary.executionCoverage?.denominator || 0 }} 可执行场景</p>
          </article>
          <article class="kpi-card">
            <div class="kpi-card__header"><span>运行批次 <a-tooltip :content="metricHelp.runCount"><icon-question-circle class="metric-help-icon" /></a-tooltip></span></div>
            <strong>{{ formatNumber(summary.runCount) }}</strong>
            <p>{{ formatNumber(summary.sceneExecutionCount) }} 次场景执行</p>
          </article>
          <article class="kpi-card">
            <div class="kpi-card__header"><span>平均耗时 <a-tooltip :content="metricHelp.averageDuration"><icon-question-circle class="metric-help-icon" /></a-tooltip></span></div>
            <strong class="kpi-card__duration">{{ formatAverageDuration() }}</strong>
            <p>{{ formatNumber(summary.caseTotal) }} 用例 / {{ formatNumber(summary.stepTotal) }} 步骤</p>
          </article>
        </section>

        <section class="status-strip" aria-label="执行结果汇总">
          <div v-for="item in statusItems" :key="item.key" class="status-item">
            <i :style="{ backgroundColor: item.color }" />
            <span>{{ item.label }} <a-tooltip :content="statusHelp[item.key]"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
            <strong>{{ formatNumber(item.value) }}</strong>
          </div>
        </section>

        <section class="snapshot-grid">
          <div class="metric-panel snapshot-panel">
            <header class="metric-panel__header">
              <div><h3>执行效能 <a-tooltip :content="metricHelp.executionSignals"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>范围累计、近期活跃与执行密度</span></div>
            </header>
            <div class="snapshot-stats">
              <div v-for="item in executionSignals" :key="item.label" class="snapshot-stat">
                <span class="metric-stat-label">{{ item.label }} <a-tooltip :content="item.help"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.note }}</small>
              </div>
            </div>
          </div>
          <div class="metric-panel snapshot-panel">
            <header class="metric-panel__header">
              <div><h3>质量信号 <a-tooltip :content="metricHelp.qualitySignals"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>只展示可审计的执行事实指标</span></div>
            </header>
            <div class="snapshot-stats">
              <div v-for="item in qualitySignals" :key="item.label" class="snapshot-stat">
                <span class="metric-stat-label">{{ item.label }} <a-tooltip :content="item.help"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.note }}</small>
              </div>
            </div>
          </div>
        </section>

        <section class="metric-panel value-panel">
          <header class="metric-panel__header">
            <div><h3>自动化价值产出 <a-tooltip :content="metricHelp.valueSignals"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>兼容历史测试报告口径，失败场景与标准人力估算分开呈现</span></div>
          </header>
          <div class="value-layout">
            <article class="value-primary">
              <div class="value-title">
                <span>缺陷数（失败场景次数）</span>
                <a-tooltip :content="metricHelp.defectCount">
                  <icon-question-circle class="metric-help-icon" />
                </a-tooltip>
              </div>
              <strong>{{ formatNumber(valueSignals.current.defectCount) }}</strong>
              <div class="value-period-grid">
                <div v-for="item in [valueSignals.current, valueSignals.recent, valueSignals.daily]" :key="item.period" class="value-period">
                  <span>{{ item.period }}（个）</span>
                  <strong>{{ formatNumber(item.defectCount) }}</strong>
                </div>
              </div>
            </article>
            <article class="value-primary">
              <div class="value-title">
                <span>标准人工工作量估算（人天）</span>
                <a-tooltip :content="metricHelp.laborEstimate(valueSignals.baseline)">
                  <icon-question-circle class="metric-help-icon" />
                </a-tooltip>
              </div>
              <strong>{{ valueSignals.current.laborDays.toFixed(2) }}</strong>
              <div class="value-period-grid">
                <div v-for="item in [valueSignals.current, valueSignals.recent, valueSignals.daily]" :key="item.period" class="value-period">
                  <span>{{ item.period }}（人天）</span>
                  <strong>{{ item.laborDays.toFixed(2) }}</strong>
                </div>
              </div>
            </article>
            <div class="value-rate-grid">
              <div class="value-rate-item">
                <span>执行效率 <a-tooltip :content="metricHelp.executionRate"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
                <strong>{{ formatExecutionRate(valueSignals.current.executeRate) }} <small>个/小时</small></strong>
                <small>{{ formatNumber(valueSignals.current.executions) }} 次执行 / {{ valueSignals.current.durationSampleCount }} 个样本 / {{ valueSignals.current.durationSampleCount > 0 ? formatDuration(valueSignals.current.durationMs) : '--' }}</small>
              </div>
              <div class="value-rate-item">
                <span>失败场景率 <a-tooltip :content="metricHelp.failureRate"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
                <strong>{{ formatRateValue(valueSignals.current.defectRate) }}</strong>
                <small>功能失败 / 场景执行次数</small>
              </div>
              <div class="value-rate-item">
                <span>人力估算基线 <a-tooltip :content="metricHelp.laborBaseline"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
                <strong>{{ formatNumber(valueSignals.baseline) }} <small>场景/人天</small></strong>
                <small>全局标准基线，不代表实际节省</small>
              </div>
            </div>
          </div>
        </section>

        <section v-if="!hasExecutionData" class="metric-panel metric-empty-state">
          <a-empty description="当前筛选范围暂无执行数据" />
        </section>

        <template v-else>
          <section class="metric-panel metric-panel--trend">
            <header class="metric-panel__header">
              <div>
                <h3>质量趋势 <a-tooltip :content="metricHelp.trend"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3>
                <span>按完成日期统计</span>
              </div>
            </header>
            <VChart class="trend-chart" :option="trendOption" autoresize />
          </section>

          <section class="chart-grid">
            <div class="metric-panel">
              <header class="metric-panel__header">
                <div><h3>执行结果 <a-tooltip :content="metricHelp.resultBreakdown"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>{{ formatNumber(resultBreakdown.total) }} 次终态执行</span></div>
              </header>
              <VChart class="breakdown-chart" :option="resultOption" autoresize />
            </div>
            <div class="metric-panel">
              <header class="metric-panel__header">
                <div><h3>维度分布 <a-tooltip :content="metricHelp.dimensionBreakdown"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>{{ formatNumber(secondaryBreakdown.total) }} 次终态执行</span></div>
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
        </template>

        <section class="metric-panel orchestration-panel">
          <header class="metric-panel__header">
            <div><h3>测试计划概览 <a-tooltip :content="metricHelp.planOverview"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>当前项目最近更新的测试计划</span></div>
            <a-link @click="openManagementPage('/test/testPlan')">查看全部 <icon-right /></a-link>
          </header>
          <a-table
            :columns="planColumns"
            :data="testPlans"
            :pagination="false"
            row-key="id"
            size="small"
            :scroll="{ x: 1140 }"
            class="overview-table"
          >
            <template #scene="{ record }">
              <strong>{{ formatNumber(record.executedCount) }}</strong> / {{ formatNumber(record.sceneCount) }}
            </template>
            <template #progress="{ record }">
              <div class="progress-cell">
                <a-progress :percent="Math.min(100, Number(record.testProgress || 0)) / 100" :show-text="false" size="small" />
                <span>{{ Number(record.testProgress || 0).toFixed(0) }}%</span>
              </div>
            </template>
            <template #status="{ record }">
              <a-tag :color="planStatusMeta(record.status).color">{{ planStatusMeta(record.status).label }}</a-tag>
            </template>
            <template #period="{ record }">{{ formatPlanPeriod(record) }}</template>
          </a-table>
        </section>

        <section class="metric-panel orchestration-panel">
          <header class="metric-panel__header">
            <div><h3>启用中的定时任务 <a-tooltip :content="metricHelp.timedTaskOverview"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>执行周期、运行环境与最近调度结果</span></div>
            <a-link @click="openManagementPage('/test/timedTask')">查看全部 <icon-right /></a-link>
          </header>
          <a-table
            :columns="timedTaskColumns"
            :data="timedTasks"
            :pagination="false"
            row-key="id"
            size="small"
            :scroll="{ x: 1240 }"
            class="overview-table"
          >
            <template #schedule="{ record }">
              <div class="stacked-cell"><span>{{ scheduleLabel(record.cronExpression) }}</span><small>{{ record.cronExpression }}</small></div>
            </template>
            <template #engine="{ record }">
              <div class="stacked-cell"><span>{{ engineLabel(record.executionEngine) }}</span><small>{{ record.environmentName || '-' }}</small></div>
            </template>
            <template #lastRun="{ record }">
              <div class="stacked-cell">
                <a-tag :color="taskStatusMeta(record.lastRunStatus).color">{{ taskStatusMeta(record.lastRunStatus).label }}</a-tag>
                <small>{{ formatDateTime(record.lastRunTime) }}</small>
              </div>
            </template>
            <template #status="{ record }">
              <a-tag :color="taskStatusMeta(record.status).color">{{ taskStatusMeta(record.status).label }}</a-tag>
            </template>
          </a-table>
        </section>

        <template v-if="hasExecutionData">
          <section class="metric-panel">
            <header class="metric-panel__header">
              <div><h3>失败场景排行 <a-tooltip :content="metricHelp.failureRanking"><icon-question-circle class="metric-help-icon" /></a-tooltip></h3><span>功能失败与基础设施失败分别计数</span></div>
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
            <span>维度质量 <a-tooltip :content="metricHelp.dimensionQuality"><icon-question-circle class="metric-help-icon" /></a-tooltip></span>
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
import demoDataJson from './testMetricDemoData.json'
import { type AutomationUiSceneResp, getAutomationUiSceneList } from '@/apis/automation/automationUiScene'
import { getProjectConfigList } from '@/apis/project/projectConfig'
import { getProjectEnvironmentConfigList } from '@/apis/project/projectEnvironmentConfig'
import { type ProjectModuleConfigResp, getProjectModuleConfigList } from '@/apis/project/projectModuleConfig'
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
import { type TestPlanResp, listTestPlan } from '@/apis/test/testPlan'
import { type TestTimedTaskResp, listTimedTask } from '@/apis/test/timedTask'
import { formatDuration } from '@/utils/sakura'

defineOptions({ name: 'TestTestMetric' })

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const CHART_FONT_FAMILY = '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif'

interface SelectOption { label: string, value: string, extra?: string }

interface InventoryItem { key: string, label: string, count: number }
interface MetricModuleTreeNode extends InventoryItem {
  parentId?: string
  totalSceneCount: number
  children?: MetricModuleTreeNode[]
}
interface MetricInventory {
  moduleTotal: number
  sceneTotal: number
  moduleItems: InventoryItem[]
  levelItems: InventoryItem[]
  moduleTree?: MetricModuleTreeNode[]
}
interface MetricPlanItem {
  id: string
  name: string
  type: string
  status: string
  sceneCount: number
  executedCount: number
  testProgress: number
  owner: string
  plannedStartTime?: string | null
  plannedEndTime?: string | null
}
interface MetricTimedTaskItem {
  id: string
  name: string
  testPlanName: string
  cronExpression: string
  executionEngine?: string
  environmentName?: string
  nextExecuteTime?: string
  status: string
  lastRunStatus?: string
  lastRunTime?: string
}
interface ValueMetricConfig {
  baselineScenesPerPersonDay: number
  defectMetricDefinition?: string
  laborMetricDefinition?: string
}

type BreakdownDimension = 'engine' | 'trigger' | 'level' | 'module'
type DemoBreakdownDimension = 'result' | BreakdownDimension

interface TestMetricDemoData {
  schemaVersion: number
  fixtureType: string
  databaseWriteRequired: boolean
  scope: { startDate: string, endDate: string }
  project: { id: string, name: string }
  versions: Array<{ id: string, name: string, type: string }>
  environments: Array<{ id: string, name: string }>
  inventory: MetricInventory
  valueMetrics: ValueMetricConfig
  summary: TestMetricSummaryResp
  trends: { points: TestMetricTrendPoint[] }
  breakdowns: Record<DemoBreakdownDimension, TestMetricBreakdownResp>
  testPlans: MetricPlanItem[]
  timedTasks: MetricTimedTaskItem[]
  failures: { items: TestMetricFailureItem[] }
}

const DEFAULT_BASELINE_SCENES_PER_PERSON_DAY = 70
const DEMO_TERMINAL_KEYS = ['PASSED', 'FAILED', 'SKIPPED', 'CANCELLED', 'INFRA_FAILED', 'OTHER']
const DEMO_TERMINAL_FIELDS = ['passCount', 'failCount', 'skipCount', 'cancelCount', 'infraFailCount', 'otherCount'] as const
const validateDemoData = (value: unknown): TestMetricDemoData => {
  const data = value as TestMetricDemoData
  if (data.schemaVersion !== 2 || data.fixtureType !== 'test-metric-v2-local-demo' || data.databaseWriteRequired !== false)
    throw new Error('测试度量本地演示数据版本不受支持')
  if (data.valueMetrics.baselineScenesPerPersonDay !== DEFAULT_BASELINE_SCENES_PER_PERSON_DAY)
    throw new Error('测试度量本地演示数据基线必须为 70 场景/人天')
  if (data.trends.points.length !== 30)
    throw new Error('测试度量本地演示数据必须包含 30 个趋势点')
  const summaryTotal = Number(data.summary.sceneExecutionCount || 0)
  const categoryTotal = Number(data.summary.passCount || 0) + Number(data.summary.failCount || 0)
    + Number(data.summary.skipCount || 0) + Number(data.summary.cancelCount || 0)
    + Number(data.summary.infraFailCount || 0) + Number(data.summary.otherCount || 0)
  if (categoryTotal !== summaryTotal)
    throw new Error('测试度量演示数据终态分类无法与场景执行总数对账')
  const trendTotals = data.trends.points.reduce((totals, point) => {
    const pointTerminalTotal = DEMO_TERMINAL_FIELDS.reduce((total, field) => total + Number(point[field] || 0), 0)
    if (pointTerminalTotal !== Number(point.sceneExecutionCount || 0))
      throw new Error(`测试度量演示数据 ${point.date} 的终态分类无法对账`)
    totals.sceneExecutionCount += Number(point.sceneExecutionCount || 0)
    totals.durationTotalMs += Number(point.durationTotalMs || 0)
    totals.durationSampleCount += Number(point.durationSampleCount || 0)
    for (const field of DEMO_TERMINAL_FIELDS)
      totals[field] += Number(point[field] || 0)
    return totals
  }, {
    sceneExecutionCount: 0,
    durationTotalMs: 0,
    durationSampleCount: 0,
    passCount: 0,
    failCount: 0,
    skipCount: 0,
    cancelCount: 0,
    infraFailCount: 0,
    otherCount: 0,
  })
  const summaryFields = ['sceneExecutionCount', 'durationTotalMs', 'durationSampleCount', ...DEMO_TERMINAL_FIELDS] as const
  if (summaryFields.some((field) => trendTotals[field] !== Number(data.summary[field] || 0)))
    throw new Error('测试度量演示数据趋势次数、耗时或样本数与汇总不一致')
  const resultKeys = data.breakdowns.result.items.map((item) => item.key).sort()
  if (resultKeys.join(',') !== [...DEMO_TERMINAL_KEYS].sort().join(','))
    throw new Error('测试度量演示数据必须包含六类终态')
  for (const dimension of ['result', 'engine', 'trigger', 'level', 'module'] as DemoBreakdownDimension[]) {
    const breakdown = data.breakdowns[dimension]
    const itemTotal = breakdown.items.reduce((total, item) => total + Number(item.count || 0), 0)
    if (Number(breakdown.total || 0) !== summaryTotal || itemTotal !== summaryTotal)
      throw new Error(`测试度量演示数据 ${dimension} 分布与场景执行总数不一致`)
  }
  return data
}

const demoData = validateDemoData(demoDataJson)
const demoProjectOption: SelectOption = { label: `${demoData.project.name}（本地 JSON）`, value: demoData.project.id }
function cloneDemoValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
const formatNumber = (value?: number) => Number(value || 0).toLocaleString('zh-CN')

const emptyRate = () => ({ numerator: 0, denominator: 0, rate: 0, previousRate: 0, changePoints: 0 })
const emptySummary = (): Partial<TestMetricSummaryResp> => ({ passRate: emptyRate(), executionCoverage: emptyRate() })
const emptyBreakdown = (): TestMetricBreakdownResp => ({ dimension: '', total: 0, items: [] })
const emptyInventory = (): MetricInventory => ({ moduleTotal: 0, sceneTotal: 0, moduleItems: [], levelItems: [], moduleTree: [] })

const loading = ref(false)
let metricRequestSequence = 0
let breakdownRequestSequence = 0
const router = useRouter()
const projectOptions = ref<SelectOption[]>([])
const versionOptions = ref<SelectOption[]>([])
const environmentOptions = ref<SelectOption[]>([])
const inventory = ref<MetricInventory>(emptyInventory())
const moduleTreeSearch = ref('')
const selectedModuleKey = ref<string>()
const testPlans = ref<MetricPlanItem[]>([])
const timedTasks = ref<MetricTimedTaskItem[]>([])
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
const breakdownDimension = ref<BreakdownDimension>('engine')
const failureVisible = ref(false)

const moduleTreeNodes = computed<MetricModuleTreeNode[]>(() => {
  if (inventory.value.moduleTree?.length)
    return inventory.value.moduleTree
  return inventory.value.moduleItems.map((item) => ({ ...item, totalSceneCount: item.count }))
})

const moduleTreeNodeCount = computed(() => {
  const countNodes = (nodes: MetricModuleTreeNode[]): number => nodes.reduce((total, node) => total + 1 + countNodes(node.children || []), 0)
  return countNodes(moduleTreeNodes.value)
})

const moduleTreeSummary = computed(() => `${formatNumber(moduleTreeNodeCount.value)} 个模块 · ${formatNumber(inventory.value.sceneTotal)} 个场景`)

const filteredModuleTreeNodes = computed(() => {
  const keyword = moduleTreeSearch.value.trim().toLocaleLowerCase()
  const filterNodes = (nodes: MetricModuleTreeNode[]): MetricModuleTreeNode[] => nodes.reduce<MetricModuleTreeNode[]>((result, node) => {
    const children = filterNodes(node.children || [])
    const matched = !keyword || node.label.toLocaleLowerCase().includes(keyword)
    if (matched || children.length)
      result.push({ ...node, children: matched && node.children?.length ? node.children : (children.length ? children : undefined) })
    return result
  }, [])
  return filterNodes(moduleTreeNodes.value)
})

const findModuleNode = (nodes: MetricModuleTreeNode[], key?: string): MetricModuleTreeNode | undefined => {
  if (!key) return undefined
  for (const node of nodes) {
    if (node.key === key) return node
    const child = findModuleNode(node.children || [], key)
    if (child) return child
  }
  return undefined
}

const selectedModuleNode = computed(() => findModuleNode(moduleTreeNodes.value, selectedModuleKey.value))
const selectedModuleShare = computed(() => {
  const total = Number(inventory.value.sceneTotal || 0)
  const count = Number(selectedModuleNode.value?.totalSceneCount || 0)
  return total > 0 ? `${(count / total * 100).toFixed(1)}%` : '--'
})

const moduleChartItems = computed<InventoryItem[]>(() => {
  const selected = selectedModuleNode.value
  if (selected) {
    const selectedCount = Math.min(Number(selected.totalSceneCount || 0), Number(inventory.value.sceneTotal || 0))
    const restCount = Math.max(Number(inventory.value.sceneTotal || 0) - selectedCount, 0)
    return [
      { key: selected.key, label: selected.label, count: selectedCount },
      ...(restCount > 0 ? [{ key: 'OTHER_MODULES', label: '其他模块', count: restCount }] : []),
    ]
  }
  return moduleTreeNodes.value.map((node) => ({ key: node.key, label: node.label, count: node.totalSceneCount }))
})

const onModuleTreeSelect = (keys: Array<string>) => {
  selectedModuleKey.value = keys[0] || undefined
}
const clearModuleSelection = () => {
  selectedModuleKey.value = undefined
}
const selectedFailure = ref<TestMetricFailureItem>()

const isLocalDemoProject = (projectId = queryForm.projectId) => import.meta.env.DEV && projectId === demoData.project.id
const applyLocalDemoDateRange = () => {
  dateRange.value = [demoData.scope.startDate, demoData.scope.endDate]
}
const applyLocalDemoMetrics = () => {
  selectedModuleKey.value = undefined
  inventory.value = cloneDemoValue(demoData.inventory)
  summary.value = cloneDemoValue(demoData.summary)
  trends.value = cloneDemoValue(demoData.trends.points)
  resultBreakdown.value = cloneDemoValue(demoData.breakdowns.result)
  secondaryBreakdown.value = cloneDemoValue(demoData.breakdowns[breakdownDimension.value])
  testPlans.value = cloneDemoValue(demoData.testPlans)
  timedTasks.value = cloneDemoValue(demoData.timedTasks)
  failures.value = cloneDemoValue(demoData.failures.items)
}

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

const metricHelp = {
  scope: '统计范围由项目、版本、日期、引擎、触发方式和环境共同决定；所有卡片和图表均只统计当前筛选范围。',
  moduleInventory: '功能模块资产统计当前项目版本下启用且未删除的模块；右侧按 parentId/path 展示层级，父节点场景数包含自身及所有子模块场景，左侧环图展示场景在模块间的占比。',
  sceneInventory: '测试场景资产 = 当前项目版本下启用且未删除的场景数量；环图按场景等级分组。',
  passRate: '自动化通过率 = 通过场景执行次数 /（通过 + 功能失败场景执行次数）× 100%；跳过、取消、基础设施失败和其他不进入有效结果分母。',
  executionCoverage: '执行覆盖率 = 范围内有终态执行的去重场景数 / 当前项目版本可执行场景数 × 100%。',
  runCount: '运行批次 = 统计范围内按 run_key 去重后的终态运行批次；同一批次的多个场景不重复计批次。',
  averageDuration: '平均耗时 = 有效耗时终态执行的 duration_ms 总和 / duration 样本数；无有效样本显示 --。',
  executionSignals: '执行效能从趋势点汇总：批次按 run_count 统计，活跃天数为有场景执行的日期数，日均场景执行 = 场景执行次数 / 活跃天数。',
  qualitySignals: '质量信号只使用可审计的执行事实，并明确各项指标的分子、分母，不把失败次数直接等同缺陷单。',
  valueSignals: '价值产出基于场景执行事实计算：功能失败次数、标准人工工作量、执行效率和失败场景率分别使用独立公式。',
  defectCount: '缺陷数（失败场景次数）= 当前筛选范围内功能失败场景执行次数；来源为执行终态事实。基础设施失败、跳过、取消和其他终态不计入，也不等同缺陷系统中的唯一缺陷单数量。',
  laborEstimate: (baseline: number) => `标准人工工作量估算 = 当前筛选范围场景执行次数 / ${baseline} 场景/人天；分母为全局标准执行基线，其他终态仍按场景执行计入，不等同已核销的实际人力节省。`,
  executionRate: '执行效率 = 场景执行次数 /（总耗时毫秒 / 3,600,000），单位为个/小时；没有有效耗时样本时显示 --。',
  failureRate: '失败场景率 = 功能失败场景次数 / 场景执行次数 × 100%；基础设施失败单独统计，不并入功能失败。',
  laborBaseline: '人力估算基线为 70 场景/人天；标准人工工作量 = 场景执行次数 / 70，不等同已核销的实际节省。',
  trend: '质量趋势按完成日期汇总通过、失败、跳过、取消、基础设施失败、其他六类终态，并叠加通过率曲线。',
  resultBreakdown: '执行结果分布按六类互斥终态统计；各类次数之和必须等于场景执行次数。',
  dimensionBreakdown: '维度分布按当前选择的引擎、触发方式、场景等级或模块分组；各分组次数之和等于终态执行总数。',
  planOverview: '测试计划表读取当前项目最近更新的计划；场景进度 = 已执行场景数 / 计划场景数 × 100%。',
  timedTaskOverview: '定时任务表展示当前项目启用任务的调度配置、引擎、环境和最近一次运行结果，不参与执行度量汇总。',
  failureRanking: '失败排行按场景聚合功能失败和基础设施失败次数，分别展示；错误文本取最近一次失败记录。',
  dimensionQuality: '维度质量按执行事实快照来源统计：EXACT 为执行时明确维度，INFERRED 为历史推断，MISSING 为无法补齐。',
} as const

const statusHelp: Record<string, string> = {
  pass: '通过：终态为 PASSED 的场景执行事实行数。',
  fail: '失败：终态为 FAILED 且不是基础设施失败的功能失败场景执行行数。',
  skip: '跳过：终态为 SKIPPED 的场景执行事实行数，不进入通过率分母。',
  cancel: '取消：终态为 CANCELLED 的场景执行事实行数，不进入通过率分母。',
  infra: '基础设施失败：终态为 INFRA_FAILED 的执行行数，例如执行节点、浏览器或环境异常。',
  other: '其他：无法归入前五类的终态执行行数，用于保持终态分类守恒。',
}

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

const planColumns = [
  { title: '计划名称', dataIndex: 'name', width: 250, ellipsis: true, tooltip: true },
  { title: '类型', dataIndex: 'type', width: 110, align: 'center' },
  { title: '负责人', dataIndex: 'owner', width: 100, align: 'center' },
  { title: '场景', dataIndex: 'sceneCount', slotName: 'scene', width: 110, align: 'center' },
  { title: '进度', dataIndex: 'testProgress', slotName: 'progress', width: 180 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100, align: 'center' },
  { title: '计划周期', dataIndex: 'plannedStartTime', slotName: 'period', width: 290 },
]

const timedTaskColumns = [
  { title: '任务名称', dataIndex: 'name', width: 230, ellipsis: true, tooltip: true },
  { title: '测试计划', dataIndex: 'testPlanName', width: 230, ellipsis: true, tooltip: true },
  { title: '执行周期', dataIndex: 'cronExpression', slotName: 'schedule', width: 190 },
  { title: '引擎 / 环境', dataIndex: 'executionEngine', slotName: 'engine', width: 230 },
  { title: '下次执行', dataIndex: 'nextExecuteTime', width: 180 },
  { title: '最近结果', dataIndex: 'lastRunStatus', slotName: 'lastRun', width: 180 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100, align: 'center' },
]

const statusItems = computed(() => [
  { key: 'pass', label: '通过', value: summary.value.passCount || 0, color: '#16a34a' },
  { key: 'fail', label: '失败', value: summary.value.failCount || 0, color: '#dc2626' },
  { key: 'skip', label: '跳过', value: summary.value.skipCount || 0, color: '#d97706' },
  { key: 'cancel', label: '取消', value: summary.value.cancelCount || 0, color: '#64748b' },
  { key: 'infra', label: '基础设施失败', value: summary.value.infraFailCount || 0, color: '#2563eb' },
  { key: 'other', label: '其他', value: summary.value.otherCount || 0, color: '#94a3b8' },
])

const percentValue = (numerator?: number, denominator?: number) => Number(denominator || 0) > 0
  ? `${(Number(numerator || 0) / Number(denominator) * 100).toFixed(2)}%`
  : '--'

const executionSignals = computed(() => {
  const recentPoints = trends.value.slice(-7)
  const recentRuns = recentPoints.reduce((total, item) => total + Number(item.runCount || 0), 0)
  const recentExecutions = recentPoints.reduce((total, item) => total + Number(item.sceneExecutionCount || 0), 0)
  const activeDays = trends.value.filter((item) => Number(item.sceneExecutionCount || 0) > 0).length
  const averageExecutions = activeDays > 0 ? Number(summary.value.sceneExecutionCount || 0) / activeDays : 0
  return [
    { label: '范围运行批次', value: formatNumber(summary.value.runCount), note: `${dateRange.value[0]} 至 ${dateRange.value[1]}`, help: '当前筛选范围内按 run_key 去重后的终态运行批次数。' },
    { label: '近 7 天运行日批次', value: formatNumber(recentRuns), note: `${formatNumber(recentExecutions)} 次场景执行`, help: '趋势最后 7 个日期的 runCount 之和；按批次统计，不对场景执行次数去重。' },
    { label: '活跃执行天数', value: formatNumber(activeDays), note: `共 ${formatNumber(trends.value.length)} 个自然日`, help: '趋势中 sceneExecutionCount 大于 0 的自然日数量。' },
    { label: '日均场景执行', value: averageExecutions.toFixed(1), note: '按有运行记录的日期计算', help: '日均场景执行 = 当前范围场景执行次数 / 活跃执行天数。' },
  ]
})

const qualitySignals = computed(() => [
  {
    label: '有效结果占比',
    value: percentValue(Number(summary.value.passCount || 0) + Number(summary.value.failCount || 0), summary.value.sceneExecutionCount),
    note: '通过与功能失败进入有效结果',
    help: '有效结果占比 =（通过 + 功能失败）/ 场景执行次数 × 100%；其他终态不进入分子。',
  },
  {
    label: '用例通过率',
    value: percentValue(summary.value.casePass, Number(summary.value.casePass || 0) + Number(summary.value.caseFail || 0)),
    note: `${formatNumber(summary.value.casePass)} 通过 / ${formatNumber(summary.value.casePass || 0) + Number(summary.value.caseFail || 0)} 有效用例`,
    help: '用例通过率 = 通过用例数 /（通过用例数 + 失败用例数）× 100%；跳过用例不进入分母。',
  },
  {
    label: '步骤通过率',
    value: percentValue(summary.value.stepPass, Number(summary.value.stepPass || 0) + Number(summary.value.stepFail || 0)),
    note: `${formatNumber(summary.value.stepPass)} 通过 / ${formatNumber(summary.value.stepPass || 0) + Number(summary.value.stepFail || 0)} 有效步骤`,
    help: '步骤通过率 = 通过步骤数 /（通过步骤数 + 失败步骤数）× 100%；跳过步骤不进入分母。',
  },
  {
    label: '基础设施失败占比',
    value: percentValue(summary.value.infraFailCount, summary.value.sceneExecutionCount),
    note: `${formatNumber(summary.value.infraFailCount)} 次基础设施失败`,
    help: '基础设施失败占比 = 基础设施失败次数 / 场景执行次数 × 100%。',
  },
])

const valueSignals = computed(() => {
  const recentPoints = trends.value.slice(-7)
  const recentExecutions = recentPoints.reduce((total, item) => total + Number(item.sceneExecutionCount || 0), 0)
  const recentFailures = recentPoints.reduce((total, item) => total + Number(item.failCount || 0), 0)
  const recentDurationMs = recentPoints.reduce((total, item) => total + Number(item.durationTotalMs || 0), 0)
  const executionCount = Number(summary.value.sceneExecutionCount || 0)
  const failureCount = Number(summary.value.failCount || 0)
  const baseline = DEFAULT_BASELINE_SCENES_PER_PERSON_DAY
  const durationTotalMs = Number(summary.value.durationTotalMs || 0)
  const durationHours = durationTotalMs / 3600000
  const durationSampleCount = Number(summary.value.durationSampleCount || 0)
  const recentDurationSamples = recentPoints.reduce((total, item) => total + Number(item.durationSampleCount || 0), 0)
  const toValue = (period: string, executions: number, failures: number, hours: number, durationMs: number, samples: number) => ({
    period,
    executions,
    defectCount: failures,
    laborDays: executions / baseline,
    executeRate: hours > 0 ? executions / hours : undefined,
    defectRate: executions > 0 ? failures / executions * 100 : undefined,
    durationMs,
    durationSampleCount: samples,
  })
  const activeDays = trends.value.filter((item) => Number(item.sceneExecutionCount || 0) > 0).length
  return {
    current: toValue('当前范围', executionCount, failureCount, durationHours, durationTotalMs, durationSampleCount),
    recent: toValue('近 7 天', recentExecutions, recentFailures, recentDurationMs / 3600000, recentDurationMs, recentDurationSamples),
    daily: toValue('活跃日均', activeDays > 0 ? executionCount / activeDays : 0, activeDays > 0 ? failureCount / activeDays : 0, activeDays > 0 ? durationHours / activeDays : 0, activeDays > 0 ? durationTotalMs / activeDays : 0, activeDays > 0 ? durationSampleCount / activeDays : 0),
    baseline,
  }
})

const hasExecutionData = computed(() => Number(summary.value.runCount || 0) > 0
  || Number(summary.value.sceneExecutionCount || 0) > 0
  || Number(resultBreakdown.value.total || 0) > 0
  || trends.value.some((item) => Number(item.runCount || 0) > 0 || Number(item.sceneExecutionCount || 0) > 0))

const trendOption = computed(() => ({
  color: ['#16a34a', '#dc2626', '#d97706', '#64748b', '#2563eb', '#94a3b8', '#111827'],
  textStyle: { fontFamily: CHART_FONT_FAMILY, color: '#4e5969', fontSize: 12 },
  tooltip: { trigger: 'axis' },
  legend: { top: 4, right: 8, textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 12 } },
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
    { name: '其他', type: 'line', symbol: 'none', data: trends.value.map((item) => item.otherCount) },
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

// 资产卡片保持固定高度；超过 12 个图例项后启用 ECharts 分页，避免图例挤压环图或撑高页面。
const INVENTORY_LEGEND_SCROLL_THRESHOLD = 12

const inventoryChartOption = (total: number, title: string, items: InventoryItem[], colors: string[], options: { hideLegend?: boolean, centerText?: string, centerSubtext?: string, selectedKey?: string } = {}) => ({
  color: colors,
  textStyle: { fontFamily: CHART_FONT_FAMILY, color: '#4e5969', fontSize: 12 },
  title: {
    text: options.centerText ?? formatNumber(total),
    subtext: options.centerSubtext ?? title,
    left: '31%',
    top: '36%',
    textAlign: 'center',
    textStyle: { color: '#1d2129', fontFamily: CHART_FONT_FAMILY, fontSize: 28, fontWeight: 600 },
    subtextStyle: { color: '#86909c', fontFamily: CHART_FONT_FAMILY, fontSize: 12, lineHeight: 22 },
  },
  tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
  legend: {
    show: !options.hideLegend,
    type: items.length > INVENTORY_LEGEND_SCROLL_THRESHOLD ? 'scroll' : 'plain',
    orient: 'vertical',
    right: 16,
    top: 'middle',
    height: items.length > INVENTORY_LEGEND_SCROLL_THRESHOLD ? 198 : undefined,
    itemWidth: 12,
    itemHeight: 8,
    itemGap: 14,
    pageIconSize: 10,
    pageButtonItemGap: 4,
    pageTextStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 11, color: '#86909c' },
    textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 12 },
    formatter: (name: string) => {
      const item = items.find((entry) => entry.label === name)
      return `${name}  ${formatNumber(item?.count)}`
    },
  },
  series: [{
    type: 'pie',
    selectedMode: options.selectedKey ? 'single' : undefined,
    radius: ['48%', '70%'],
    center: ['31%', '52%'],
    label: { show: false },
    itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 3 },
    data: items.map((item) => ({ name: item.label, value: item.count, selected: item.key === options.selectedKey })),
  }],
  media: [{
    query: { maxWidth: 520 },
    option: {
      title: { left: '50%', top: '27%' },
      legend: {
        orient: 'horizontal',
        left: 'center',
        right: 'auto',
        top: 'auto',
        bottom: 4,
        width: '88%',
        height: items.length > INVENTORY_LEGEND_SCROLL_THRESHOLD ? 54 : undefined,
        itemGap: 10,
      },
      series: [{ center: ['50%', '39%'], radius: ['35%', '54%'] }],
    },
  }],
})

const moduleInventoryOption = computed(() => inventoryChartOption(
  inventory.value.sceneTotal,
  '场景分布',
  moduleChartItems.value,
  ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#64748b'],
  selectedModuleNode.value
    ? {
        hideLegend: true,
        centerText: selectedModuleShare.value,
        centerSubtext: `${selectedModuleNode.value.label}\n场景占比`,
        selectedKey: selectedModuleNode.value.key,
      }
    : { hideLegend: true },
))
const sceneInventoryOption = computed(() => inventoryChartOption(
  inventory.value.sceneTotal,
  '测试场景',
  inventory.value.levelItems,
  ['#dc2626', '#2563eb', '#d97706', '#64748b'],
))

const resultOption = computed(() => ({
  textStyle: { fontFamily: CHART_FONT_FAMILY, color: '#4e5969', fontSize: 12 },
  tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
  legend: { orient: 'vertical', right: 8, top: 'middle', textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 12 } },
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
  textStyle: { fontFamily: CHART_FONT_FAMILY, color: '#4e5969', fontSize: 12 },
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

const buildInventory = (modules: ProjectModuleConfigResp[], scenes: AutomationUiSceneResp[]): MetricInventory => {
  const moduleMap = new Map<string, ProjectModuleConfigResp>()
  const collectModules = (items: ProjectModuleConfigResp[]) => items.forEach((item) => {
    if (!moduleMap.has(item.id))
      moduleMap.set(item.id, item)
    if (item.children?.length)
      collectModules(item.children)
  })
  collectModules(modules)
  const normalizedModules = [...moduleMap.values()]
  const configuredModuleIds = new Set(normalizedModules.map((item) => item.id))
  const moduleCounts = new Map(normalizedModules.map((item) => [item.id, 0]))
  scenes.forEach((scene) => moduleCounts.set(scene.moduleId, Number(moduleCounts.get(scene.moduleId) || 0) + 1))
  const moduleItems = normalizedModules.map((item) => ({
    key: item.id,
    label: item.name,
    count: Number(moduleCounts.get(item.id) || 0),
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'))
  const unmatchedSceneCount = scenes.filter((scene) => !configuredModuleIds.has(scene.moduleId)).length
  if (unmatchedSceneCount > 0)
    moduleItems.push({ key: 'UNASSIGNED', label: '未归属模块', count: unmatchedSceneCount })

  const moduleNodeMap = new Map<string, MetricModuleTreeNode>()
  normalizedModules.forEach((item) => {
    moduleNodeMap.set(item.id, {
      key: item.id,
      label: item.name,
      count: Number(moduleCounts.get(item.id) || 0),
      totalSceneCount: Number(moduleCounts.get(item.id) || 0),
      parentId: item.parentId || undefined,
      children: [],
    })
  })
  const moduleTree: MetricModuleTreeNode[] = []
  normalizedModules.forEach((item) => {
    const node = moduleNodeMap.get(item.id)
    const parent = item.parentId ? moduleNodeMap.get(item.parentId) : undefined
    if (node && parent)
      parent.children?.push(node)
    else if (node)
      moduleTree.push(node)
  })
  if (unmatchedSceneCount > 0) {
    moduleTree.push({
      key: 'UNASSIGNED',
      label: '未归属模块',
      count: unmatchedSceneCount,
      totalSceneCount: unmatchedSceneCount,
    })
  }
  const aggregateSceneCount = (node: MetricModuleTreeNode): number => {
    const childrenTotal = (node.children || []).reduce((total, child) => total + aggregateSceneCount(child), 0)
    node.totalSceneCount = node.count + childrenTotal
    if (!node.children?.length)
      delete node.children
    return node.totalSceneCount
  }
  moduleTree.forEach(aggregateSceneCount)

  const levelLabels: Record<string, string> = {
    P0: 'P0（冒烟）',
    P1: 'P1（核心）',
    P2: 'P2（全量）',
    P3: 'P3（其他）',
    UNSPECIFIED: '未指定',
  }
  const levelCounts = scenes.reduce((counts, scene) => {
    const key = scene.level || 'UNSPECIFIED'
    counts.set(key, Number(counts.get(key) || 0) + 1)
    return counts
  }, new Map<string, number>())
  const levelOrder = ['P0', 'P1', 'P2', 'P3', 'UNSPECIFIED']
  const levelItems = [...levelCounts.entries()]
    .map(([key, count]) => ({ key, label: levelLabels[key] || key, count }))
    .sort((a, b) => {
      const aIndex = levelOrder.indexOf(a.key)
      const bIndex = levelOrder.indexOf(b.key)
      return (aIndex < 0 ? levelOrder.length : aIndex) - (bIndex < 0 ? levelOrder.length : bIndex)
    })

  return {
    moduleTotal: normalizedModules.length,
    sceneTotal: scenes.length,
    moduleItems,
    levelItems,
    moduleTree,
  }
}

const mapPlan = (item: TestPlanResp): MetricPlanItem => ({
  id: item.id,
  name: item.name,
  type: item.type,
  status: item.status,
  sceneCount: Number(item.sceneCount || 0),
  executedCount: Number(item.executedCount || 0),
  testProgress: Number(item.testProgress || 0),
  owner: item.createUserString || '-',
  plannedStartTime: item.plannedStartTime,
  plannedEndTime: item.plannedEndTime,
})

const mapTimedTask = (item: TestTimedTaskResp): MetricTimedTaskItem => ({
  id: item.id,
  name: item.name,
  testPlanName: item.testPlanName,
  cronExpression: item.cronExpression,
  executionEngine: item.executionEngine,
  environmentName: item.projectEnvironmentName,
  nextExecuteTime: item.nextExecuteTime,
  status: item.status,
  lastRunStatus: item.lastRun?.status,
  lastRunTime: item.lastRun?.startTime,
})

const loadDashboardContext = async (query: TestMetricScopeQuery, requestId: number) => {
  const [moduleResult, sceneResult, planResult, taskResult] = await Promise.allSettled([
    getProjectModuleConfigList({ projectId: query.projectId, versionId: query.versionId, status: 1, sort: ['sort,asc'] }),
    getAutomationUiSceneList({ projectId: query.projectId, versionId: query.versionId, status: 1, sort: ['name,asc'] }),
    listTestPlan({ projectId: query.projectId, versionId: query.versionId, page: 1, size: 5, sort: ['updateTime,desc'] }),
    listTimedTask({ projectId: query.projectId, status: 'ENABLED', page: 1, size: 5, sort: ['nextExecuteTime,asc'] }),
  ])

  if (requestId !== metricRequestSequence) return

  selectedModuleKey.value = undefined
  inventory.value = moduleResult.status === 'fulfilled' && sceneResult.status === 'fulfilled'
    ? buildInventory(moduleResult.value.data || [], sceneResult.value.data || [])
    : emptyInventory()
  testPlans.value = planResult.status === 'fulfilled' ? (planResult.value.data?.list || []).map(mapPlan) : []
  timedTasks.value = taskResult.status === 'fulfilled' ? (taskResult.value.data?.list || []).map(mapTimedTask) : []
}

const loadMetrics = async () => {
  const query = buildQuery()
  if (!query) {
    Message.warning('请选择项目')
    return
  }
  const requestId = ++metricRequestSequence
  const breakdownRequestId = ++breakdownRequestSequence
  const requestedBreakdownDimension = breakdownDimension.value
  loading.value = true
  summary.value = emptySummary()
  trends.value = []
  resultBreakdown.value = emptyBreakdown()
  secondaryBreakdown.value = emptyBreakdown()
  failures.value = []
  selectedModuleKey.value = undefined
  inventory.value = emptyInventory()
  testPlans.value = []
  timedTasks.value = []
  try {
    if (isLocalDemoProject()) {
      applyLocalDemoMetrics()
      return
    }
    const [summaryRes, trendRes, resultRes, secondaryRes, failureRes] = await Promise.allSettled([
      getTestMetricSummary(query),
      getTestMetricTrends(query),
      getTestMetricBreakdown(query, 'result'),
      getTestMetricBreakdown(query, requestedBreakdownDimension),
      getTestMetricFailures(query, 10),
    ])
    if (requestId !== metricRequestSequence) return
    summary.value = summaryRes.status === 'fulfilled' ? (summaryRes.value.data || emptySummary()) : emptySummary()
    trends.value = trendRes.status === 'fulfilled' ? (trendRes.value.data?.points || []) : []
    resultBreakdown.value = resultRes.status === 'fulfilled' ? (resultRes.value.data || emptyBreakdown()) : emptyBreakdown()
    if (breakdownRequestId === breakdownRequestSequence && requestedBreakdownDimension === breakdownDimension.value)
      secondaryBreakdown.value = secondaryRes.status === 'fulfilled' ? (secondaryRes.value.data || emptyBreakdown()) : emptyBreakdown()
    failures.value = failureRes.status === 'fulfilled' ? (failureRes.value.data?.items || []) : []
    if ([summaryRes, trendRes, resultRes, secondaryRes, failureRes].some((item) => item.status === 'rejected'))
      Message.warning('部分核心指标加载失败，已显示可用结果')
    await loadDashboardContext(query, requestId)
  } finally {
    if (requestId === metricRequestSequence)
      loading.value = false
  }
}

const loadSecondaryBreakdown = async () => {
  const requestId = ++breakdownRequestSequence
  const dimension = breakdownDimension.value
  if (isLocalDemoProject()) {
    secondaryBreakdown.value = cloneDemoValue(demoData.breakdowns[dimension])
    return
  }
  const query = buildQuery()
  if (!query) return
  try {
    const { data } = await getTestMetricBreakdown(query, dimension)
    if (requestId === breakdownRequestSequence && dimension === breakdownDimension.value)
      secondaryBreakdown.value = data || emptyBreakdown()
  } catch {
    if (requestId === breakdownRequestSequence && dimension === breakdownDimension.value) {
      secondaryBreakdown.value = emptyBreakdown()
      Message.warning('维度分布加载失败')
    }
  }
}

const loadVersions = async (projectId?: string) => {
  versionOptions.value = []
  if (!projectId) return
  if (isLocalDemoProject(projectId)) {
    versionOptions.value = demoData.versions.map((item) => ({ label: item.name, value: item.id, extra: item.type }))
    return
  }
  const { data } = await getProjectVersionConfigList({ projectId, status: 1, sort: ['name,desc'] })
  versionOptions.value = (data || []).map((item) => ({ label: item.name, value: item.id, extra: item.type }))
}

const loadEnvironments = async (projectId?: string) => {
  environmentOptions.value = []
  if (!projectId) return
  if (isLocalDemoProject(projectId)) {
    environmentOptions.value = demoData.environments.map((item) => ({ label: item.name, value: item.id }))
    return
  }
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
  queryForm.executionEngine = undefined
  queryForm.triggerType = undefined
  queryForm.environmentId = undefined
  if (isLocalDemoProject())
    applyLocalDemoDateRange()
  else
    dateRange.value = [dayjs().subtract(29, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')]
  await Promise.all([loadVersions(queryForm.projectId), loadEnvironments(queryForm.projectId)])
  queryForm.versionId = versionOptions.value.find((item) => item.extra === '1')?.value
  await loadMetrics()
}

const resetFilters = async () => {
  queryForm.executionEngine = undefined
  queryForm.triggerType = undefined
  queryForm.environmentId = undefined
  if (isLocalDemoProject())
    applyLocalDemoDateRange()
  else
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
const formatRateValue = (value?: number) => value == null ? '--' : `${Number(value).toFixed(2)}%`
const formatExecutionRate = (value?: number) => value == null ? '--' : Number(value).toFixed(2)
const formatAverageDuration = () => Number(summary.value.durationSampleCount || 0) > 0
  ? formatDuration(summary.value.averageDurationMs || 0)
  : '--'
const planStatusMeta = (status: string) => ({
  NOT_STARTED: { label: '未开始', color: 'gray' },
  RUNNING: { label: '进行中', color: 'blue' },
  COMPLETED: { label: '已完成', color: 'green' },
  ARCHIVED: { label: '已归档', color: 'gray' },
} as Record<string, { label: string, color: string }>)[status] || { label: status || '-', color: 'gray' }
const taskStatusMeta = (status?: string) => ({
  ENABLED: { label: '已启用', color: 'green' },
  DISABLED: { label: '已禁用', color: 'gray' },
  DELETING: { label: '删除中', color: 'orange' },
  RUNNING: { label: '执行中', color: 'blue' },
  PASSED: { label: '通过', color: 'green' },
  FAILED: { label: '失败', color: 'red' },
  CANCELLED: { label: '已取消', color: 'gray' },
  SKIPPED: { label: '已跳过', color: 'orange' },
} as Record<string, { label: string, color: string }>)[status || ''] || { label: status || '-', color: 'gray' }
const engineLabel = (engine?: string) => ({
  SELENIUM: 'Selenium',
  PLAYWRIGHT_RUNNER: 'Playwright Runner',
  CHROME_DEVTOOLS_PROTOCOL: 'CDP',
} as Record<string, string>)[engine || ''] || engine || '-'
const scheduleLabel = (cron: string) => ({
  '0 */30 * * * ?': '每 30 分钟',
  '0 0 * * * ?': '每小时',
  '0 0 3 * * ?': '每天 03:00',
}[cron] || (cron?.includes('MON-FRI') ? '工作日定时' : cron || '-'))
const formatPlanPeriod = (record: MetricPlanItem) => {
  const start = formatDateTime(record.plannedStartTime || undefined)
  const end = formatDateTime(record.plannedEndTime || undefined)
  return start === '-' && end === '-' ? '-' : `${start} 至 ${end}`
}
const openManagementPage = (path: string) => router.push(path)

onMounted(async () => {
  if (import.meta.env.DEV) {
    projectOptions.value = [demoProjectOption]
    queryForm.projectId = demoData.project.id
    applyLocalDemoDateRange()
    await Promise.all([loadVersions(queryForm.projectId), loadEnvironments(queryForm.projectId)])
    queryForm.versionId = versionOptions.value.find((item) => item.extra === '1')?.value
    await loadMetrics()
  }

  try {
    const { data } = await getProjectConfigList({ status: 1, sort: ['name,asc'] })
    const backendOptions = (data || [])
      .filter((item) => item.id !== demoData.project.id)
      .map((item) => ({ label: item.name || item.id, value: item.id }))
    projectOptions.value = import.meta.env.DEV ? [demoProjectOption, ...backendOptions] : backendOptions
  } catch (error) {
    if (!import.meta.env.DEV) throw error
  }

  if (!import.meta.env.DEV) {
    queryForm.projectId = projectOptions.value[0]?.value
    if (queryForm.projectId) {
      await Promise.all([loadVersions(queryForm.projectId), loadEnvironments(queryForm.projectId)])
      queryForm.versionId = versionOptions.value.find((item) => item.extra === '1')?.value
      await loadMetrics()
    }
  }
})
</script>

<style scoped lang="scss">
.metric-page {
  --metric-font-family: "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
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
  font-family: var(--metric-font-family);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  letter-spacing: 0;
}

.metric-page strong { font-weight: 600; }
.metric-help-icon {
  display: inline-block;
  margin-left: 4px;
  color: var(--color-text-3);
  font-size: 13px;
  line-height: 1;
  vertical-align: -1px;
  cursor: help;
}
.metric-toolbar__title h2,
.metric-panel__header h3 { display: flex; align-items: center; gap: 2px; }
.kpi-card__header > span,
.status-item > span,
.metric-stat-label,
.value-rate-item > span { display: inline-flex; align-items: center; }
.metric-page :deep(.arco-form-item-label-col > .arco-form-item-label) {
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}
.metric-page :deep(.arco-select-view-value),
.metric-page :deep(.arco-picker input),
.metric-page :deep(.arco-btn),
.metric-page :deep(.arco-radio-button-content),
.metric-page :deep(.arco-link) {
  font-family: var(--metric-font-family);
  font-size: 13px;
}
.metric-page :deep(.arco-btn),
.metric-page :deep(.arco-link) { font-weight: 500; }
.metric-page :deep(.arco-tag) {
  font-family: var(--metric-font-family);
  font-size: 12px;
  font-weight: 500;
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

.metric-toolbar__title h2 {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}
.metric-toolbar__title span,
.metric-panel__header span {
  display: block;
  margin-top: 5px;
  color: var(--color-text-3);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
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

.asset-grid,
.snapshot-grid,
.chart-grid {
  display: grid;
  gap: 12px;
}

.asset-grid,
.snapshot-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.asset-panel,
.snapshot-panel { min-width: 0; }
.asset-panel { margin-top: 0; }
.asset-chart { width: 100%; height: 230px; }
.asset-empty { display: grid; place-items: center; min-height: 230px; }
.asset-module-content {
  display: grid;
  grid-template-columns: minmax(150px, 36%) minmax(0, 1fr);
  gap: 10px;
  height: 230px;
  padding: 0 14px 10px;
  box-sizing: border-box;
}
.asset-module-content .asset-module-chart { height: 220px; }
.asset-module-tree {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: 10px 0 0;
}
.asset-module-tree__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
}
.asset-module-tree__header small {
  flex: 0 0 auto;
  color: var(--color-text-3);
  font-size: 11px;
  font-weight: 400;
}
.asset-module-tree__reset { margin-left: 8px; font-size: 11px; }
.asset-module-tree > .arco-input-wrapper { flex: 0 0 auto; margin-top: 6px; }
.asset-module-tree__scroll { min-height: 0; flex: 1; margin-top: 5px; }
.asset-module-tree__node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 8px;
  width: 100%;
}
.asset-module-tree__node .arco-typography { min-width: 0; margin: 0; color: var(--color-text-2); font-size: 12px; line-height: 20px; }
.asset-module-tree__node > span { flex: 0 0 auto; color: var(--color-text-3); font-size: 11px; font-variant-numeric: tabular-nums; }
.asset-module-tree__scroll :deep(.arco-tree-node-title) { min-width: 0; padding-right: 4px; }
.asset-module-tree__scroll :deep(.arco-tree-node) { min-height: 28px; }
.asset-module-tree__scroll :deep(.arco-tree-node-title-text) { min-width: 0; flex: 1; }
.asset-module-selection {
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  gap: 2px 8px;
  min-height: 36px;
  margin-top: 6px;
  padding: 5px 8px;
  color: var(--color-text-3);
  background: var(--color-fill-2);
  border-radius: 3px;
  font-size: 11px;
  line-height: 16px;
}
.asset-module-selection strong { color: var(--color-text-1); font-size: 15px; line-height: 20px; }
.asset-module-selection small { grid-column: 1 / -1; overflow: hidden; color: var(--color-text-3); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }

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
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}

.kpi-card > strong {
  display: block;
  margin-top: 5px;
  color: var(--color-text-1);
  font-size: 28px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: 0;
}
.kpi-card > .kpi-card__duration { font-size: 24px; line-height: 30px; }
.kpi-card p {
  margin: 4px 0 0;
  color: var(--color-text-3);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
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
.status-item span { color: var(--color-text-2); font-size: 13px; font-weight: 500; }
.status-item strong { color: var(--color-text-1); font-size: 18px; font-weight: 600; line-height: 24px; }

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
.metric-panel__header h3 {
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}
.trend-chart { width: 100%; height: 260px; }
.breakdown-chart { width: 100%; height: 240px; }

.metric-empty-state {
  display: grid;
  place-items: center;
  min-height: 172px;
}
.metric-empty-state :deep(.arco-empty) { padding: 24px 0; }

.chart-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
}

.snapshot-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.snapshot-stat {
  min-width: 0;
  min-height: 104px;
  padding: 14px 18px;
  border-right: 1px solid var(--color-border-2);
  border-bottom: 1px solid var(--color-border-2);
  box-sizing: border-box;
}
.snapshot-stat:nth-child(2n) { border-right: 0; }
.snapshot-stat:nth-last-child(-n+2) { border-bottom: 0; }
.snapshot-stat span,
.snapshot-stat small { display: block; }
.snapshot-stat span { color: var(--color-text-2); font-size: 13px; font-weight: 500; line-height: 20px; }
.snapshot-stat strong {
  display: block;
  margin: 7px 0 4px;
  color: var(--color-text-1);
  font-size: 23px;
  font-weight: 600;
  line-height: 28px;
}
.snapshot-stat small {
  overflow: hidden;
  color: var(--color-text-3);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value-panel { overflow: hidden; }
.value-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.value-primary {
  min-width: 0;
  padding: 16px 18px;
  border-right: 1px solid var(--color-border-2);
  box-sizing: border-box;
}
.value-primary:nth-child(2) { border-right: 0; }
.value-title {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}
.value-title :deep(.arco-icon) { color: var(--color-text-3); cursor: help; }
.value-primary > strong {
  display: block;
  margin: 7px 0 14px;
  color: var(--color-text-1);
  font-size: 28px;
  font-weight: 600;
  line-height: 32px;
}
.value-period-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.value-period {
  min-width: 0;
  padding-right: 10px;
  border-right: 1px solid var(--color-border-2);
}
.value-period:last-child { padding-right: 0; border-right: 0; }
.value-period span { display: block; color: var(--color-text-3); font-size: 12px; font-weight: 400; line-height: 18px; }
.value-period strong { display: block; margin-top: 5px; color: var(--color-text-1); font-size: 18px; font-weight: 600; line-height: 24px; }
.value-rate-grid {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--color-border-2);
}
.value-rate-item {
  min-width: 0;
  padding: 16px 15px;
  border-right: 1px solid var(--color-border-2);
}
.value-rate-item:last-child { border-right: 0; }
.value-rate-item > span,
.value-rate-item > small { display: block; }
.value-rate-item > span { color: var(--color-text-2); font-size: 12px; font-weight: 500; line-height: 18px; }
.value-rate-item > strong {
  display: block;
  margin: 8px 0 5px;
  color: var(--color-text-1);
  font-size: 20px;
  font-weight: 600;
  line-height: 26px;
}
.value-rate-item > strong small { font-size: 12px; font-weight: 400; }
.value-rate-item > small {
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.overview-table :deep(.arco-table-th) { background: var(--color-fill-2); }
.overview-table :deep(.arco-table-border .arco-table-container) { border: 0; }
.overview-table :deep(.arco-table-th),
.failure-table :deep(.arco-table-th) {
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}
.overview-table :deep(.arco-table-td),
.failure-table :deep(.arco-table-td) {
  color: var(--color-text-1);
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
}
.overview-table :deep(.arco-table-cell),
.failure-table :deep(.arco-table-cell) { font-family: var(--metric-font-family); }
.overview-table strong,
.failure-table strong { font-weight: 600; }
.progress-cell {
  display: grid;
  grid-template-columns: minmax(80px, 1fr) 38px;
  gap: 8px;
  align-items: center;
}
.progress-cell > span { color: var(--color-text-2); font-variant-numeric: tabular-nums; text-align: right; }
.stacked-cell { min-width: 0; }
.stacked-cell > span,
.stacked-cell > small { display: block; }
.stacked-cell > small { margin-top: 3px; color: var(--color-text-3); font-size: 12px; font-weight: 400; line-height: 18px; }

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
  .asset-grid, .snapshot-grid, .chart-grid { grid-template-columns: 1fr; }
  .value-layout { grid-template-columns: 1fr; }
  .value-primary { border-right: 0; border-bottom: 1px solid var(--color-border-2); }
}

@media (max-width: 520px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .metric-panel__header { align-items: flex-start; flex-direction: column; padding: 12px 14px; }
  .asset-chart { height: 280px; }
  .asset-module-content { grid-template-columns: 1fr; height: auto; gap: 0; padding: 0 12px 12px; }
  .asset-module-content .asset-module-chart { height: 170px; }
  .asset-module-tree { height: 190px; padding-top: 4px; }
  .snapshot-stats { grid-template-columns: 1fr; }
  .snapshot-stat { border-right: 0; }
  .snapshot-stat:nth-last-child(-n+2) { border-bottom: 1px solid var(--color-border-2); }
  .snapshot-stat:last-child { border-bottom: 0; }
  .value-period-grid, .value-rate-grid { grid-template-columns: 1fr; gap: 0; }
  .value-period { padding: 9px 0; border-right: 0; border-bottom: 1px solid var(--color-border-2); }
  .value-period:last-child { border-bottom: 0; }
  .value-rate-item { border-right: 0; border-bottom: 1px solid var(--color-border-2); }
  .value-rate-item:last-child { border-bottom: 0; }
  .trend-chart, .breakdown-chart { height: 260px; }
}
</style>
