<template>
  <div class="test-report-ui-detail">
    <a-descriptions class="env-info-descriptions" title="产品环境信息" size="medium" :column="5" bordered>
      <a-descriptions-item label="产品名称">{{ projectConfig?.name || '-' }}</a-descriptions-item>
      <a-descriptions-item label="产品简称">{{ projectConfig?.abbreviate || '-' }}</a-descriptions-item>
      <a-descriptions-item label="产品版本">{{ projectConfig?.version?.name || '-' }}</a-descriptions-item>
      <a-descriptions-item label="版本描述">{{ projectConfig?.version?.description || '-' }}</a-descriptions-item>
      <a-descriptions-item label="访问域名">
        <a v-if="serverDomain" :href="serverDomain" target="_blank">{{ serverDomain }}</a>
        <span v-else>-</span>
      </a-descriptions-item>
      <a-descriptions-item label="环境名称">{{ projectConfig?.server?.description || '-' }}</a-descriptions-item>
      <a-descriptions-item label="IP">{{ projectConfig?.server?.host || '-' }}</a-descriptions-item>
      <a-descriptions-item label="端口">{{ serverPort || '-' }}</a-descriptions-item>
      <a-descriptions-item label="前端账号">{{ serverConfigVal('前端账号') || '-' }}</a-descriptions-item>
      <a-descriptions-item label="前端密码">{{ serverConfigVal('前端密码') || '-' }}</a-descriptions-item>
      <a-descriptions-item label="系统类型">{{ projectConfig?.server?.type || '-' }}</a-descriptions-item>
      <a-descriptions-item label="IP">{{ projectConfig?.server?.host || '-' }}</a-descriptions-item>
      <a-descriptions-item label="端口">{{ projectConfig?.server?.port || '-' }}</a-descriptions-item>
      <a-descriptions-item label="服务器账号">{{ projectConfig?.server?.userName || '-' }}</a-descriptions-item>
      <a-descriptions-item label="服务器密码">{{ projectConfig?.server?.passWord || '-' }}</a-descriptions-item>
    </a-descriptions>

    <a-descriptions class="env-info-descriptions" title="自动化环境信息" size="medium" :column="5" bordered>
      <a-descriptions-item label="自动化名称">{{ automationConfig?.name || '-' }}</a-descriptions-item>
      <a-descriptions-item label="自动化描述">{{ automationConfig?.description || '-' }}</a-descriptions-item>
      <a-descriptions-item label="自动化项目">{{ automationConfig?.project?.name || '-' }}</a-descriptions-item>
      <a-descriptions-item label="Jenkins">
        <a v-if="automationConfig?.jenkins?.url" :href="automationConfig.jenkins.url" target="_blank">{{
          automationConfig.jenkins.url }}</a>
        <span v-else>-</span>
      </a-descriptions-item>
      <a-descriptions-item label="浏览器">{{ automationConfig?.browser?.name || '-' }}</a-descriptions-item>
      <a-descriptions-item label="自动化环境">{{ automationConfig?.environment?.description?.systemType || '-'
        }}</a-descriptions-item>
      <a-descriptions-item label="环境名称">{{ automationConfig?.environment?.description?.name || '-'
        }}</a-descriptions-item>
      <a-descriptions-item label="IP">{{ automationConfig?.environment?.name || '-' }}</a-descriptions-item>
      <a-descriptions-item label="账号">{{ automationConfig?.environment?.description?.userName || '-'
        }}</a-descriptions-item>
      <a-descriptions-item label="密码">{{ automationConfig?.environment?.description?.passWord || '-'
        }}</a-descriptions-item>
    </a-descriptions>

    <div class="tab-list-wrapper">
      <a-tabs v-model:active-key="innerActiveKey" type="card-gutter" class="inner-tabs">
        <a-tab-pane key="0">
          <template #title>报表统计</template>
          <div class="charts-wrapper">
            <div class="chart-flex">
              <v-chart class="chart" :option="getPieOption()" autoresize />
              <v-chart class="chart" :option="getBarOption()" autoresize />
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="1">
          <template #title>所有场景 {{ sceneTotal }}</template>
          <GiTable 
            size="medium" 
            :data="allData" 
            :columns="columns" 
            :pagination="tablePagination" 
            :scroll="{ x: '100%', y: '100%' }"
            
            :loading="loading" 
            row-key="id"
            @refresh="fetchSceneList(currentSceneType)">
            <template #operation="{ record }">
              <a-space size="small">
                <a-link @click="handleConsoleUrl(record)">日志</a-link>
                <a-link @click="handleTestReportUrl(record)">报告</a-link>
                <a-link @click="handleTestVideoUrl(record)">回放</a-link>
              </a-space>
            </template>
          </GiTable>
        </a-tab-pane>

        <a-tab-pane key="2">
          <template #title>通过场景 {{ scenePass }}</template>
          <div class="table-wrapper">
            <GiTable 
              size="medium" 
              :data="passData" 
              :columns="columns" 
              :pagination="tablePagination" 
              :loading="loading"
              :scroll="{ x: '100%', y: '100%' }" 
              row-key="id" 
              @refresh="fetchSceneList(currentSceneType)">
              <template #operation="{ record }">
                <a-space size="small">
                  <a-link @click="handleConsoleUrl(record)">日志</a-link>
                  <a-link @click="handleTestReportUrl(record)">报告</a-link>
                  <a-link @click="handleTestVideoUrl(record)">回放</a-link>
                </a-space>
              </template>
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'tags'">
                  {{ getTagsText(record.tags) }}
                </template>
                <template v-else-if="column.dataIndex === 'executeStatus'">
                  {{ getRecordField(record, 'executeStatus') || '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'casePassRate'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'casePassRate') || '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'executeResult'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'executeResult') || '-'
                  : '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'duration'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? formatDuration(getRecordField(record,
                  'duration')) : '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'caseTotal'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseTotal') ?? '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'casePass'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'casePass') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'caseFail'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseFail') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'caseSkip'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseSkip') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepTotal'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepTotal') ?? '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'stepPass'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepPass') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepFail'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepFail') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepSkip'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepSkip') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'executeName'">
                  {{ getRecordField(record, 'executeName') || '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'createTime'">
                  {{ parseTime(record.createTime) }}
                </template>
                <template v-else-if="column.dataIndex === 'updateTime'">
                  {{ parseTime(record.updateTime) }}
                </template>
                <template v-else-if="column.dataIndex === 'operation'">
                  <a-link @click="handleConsoleUrl(record)">日志</a-link>
                  <a-link @click="handleTestReportUrl(record)">报告</a-link>
                  <a-link @click="handleTestVideoUrl(record)">回放</a-link>
                </template>
              </template>
            </GiTable>
          </div>
        </a-tab-pane>

        <a-tab-pane key="3">
          <template #title>失败场景 {{ sceneFail }}</template>
          <div class="table-wrapper">
            <GiTable :data="failData" :columns="columns" :pagination="tablePagination" :loading="loading"
              :scroll="{ x: '100%', y: '100%' }" size="medium" row-key="id" @refresh="fetchSceneList(currentSceneType)">
              <template #operation="{ record }">
                <a-space size="small">
                  <a-link @click="handleConsoleUrl(record)">日志</a-link>
                  <a-link @click="handleTestReportUrl(record)">报告</a-link>
                  <a-link @click="handleTestVideoUrl(record)">回放</a-link>
                </a-space>
              </template>
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'tags'">
                  {{ getTagsText(record.tags) }}
                </template>
                <template v-else-if="column.dataIndex === 'executeStatus'">
                  {{ getRecordField(record, 'executeStatus') || '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'casePassRate'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'casePassRate') || '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'executeResult'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'executeResult') || '-'
                  : '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'duration'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? formatDuration(getRecordField(record,
                  'duration')) : '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'caseTotal'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseTotal') ?? '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'casePass'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'casePass') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'caseFail'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseFail') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'caseSkip'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseSkip') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepTotal'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepTotal') ?? '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'stepPass'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepPass') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepFail'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepFail') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepSkip'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepSkip') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'executeName'">
                  {{ getRecordField(record, 'executeName') || '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'durationStartTime'">
                  {{ getRecordField(record, 'durationStartTime') }}
                </template>
                <template v-else-if="column.dataIndex === 'durationEndTime'">
                  {{ getRecordField(record, 'durationEndTime') }}
                </template>
                <template v-else-if="column.dataIndex === 'operation'">
                  <a-link @click="handleConsoleUrl(record)">日志</a-link>
                  <a-link @click="handleTestReportUrl(record)">报告</a-link>
                  <a-link @click="handleTestVideoUrl(record)">回放</a-link>
                </template>
              </template>
            </GiTable>
          </div>
        </a-tab-pane>

        <a-tab-pane key="4">
          <template #title>跳过场景 {{ sceneSkip }}</template>
          <div class="table-wrapper">
            <GiTable :columns="columns" :data="skipData" :pagination="tablePagination" :loading="loading"
              :scroll="{ x: '100%', y: '100%' }" size="medium" row-key="id" @refresh="fetchSceneList(currentSceneType)">
              <template #operation="{ record }">
                <a-space size="small">
                  <a-link @click="handleConsoleUrl(record)">日志</a-link>
                  <a-link @click="handleTestReportUrl(record)">报告</a-link>
                  <a-link @click="handleTestVideoUrl(record)">回放</a-link>
                </a-space>
              </template>
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'tags'">
                  {{ getTagsText(record.tags) }}
                </template>
                <template v-else-if="column.dataIndex === 'executeStatus'">
                  {{ getRecordField(record, 'executeStatus') || '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'casePassRate'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'casePassRate') || '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'executeResult'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'executeResult') || '-'
                  : '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'duration'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? formatDuration(getRecordField(record,
                  'duration')) : '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'caseTotal'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseTotal') ?? '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'casePass'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'casePass') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'caseFail'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseFail') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'caseSkip'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'caseSkip') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepTotal'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepTotal') ?? '-' :
                  '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'stepPass'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepPass') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepFail'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepFail') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'stepSkip'">
                  {{ getRecordField(record, 'executeStatus') === '已完成' ? getRecordField(record, 'stepSkip') ?? '-' : '-'
                  }}
                </template>
                <template v-else-if="column.dataIndex === 'executeName'">
                  {{ getRecordField(record, 'executeName') || '-' }}
                </template>
                <template v-else-if="column.dataIndex === 'createTime'">
                  {{ parseTime(record.createTime) }}
                </template>
                <template v-else-if="column.dataIndex === 'updateTime'">
                  {{ parseTime(record.updateTime) }}
                </template>
                <template v-else-if="column.dataIndex === 'operation'">
                  <a-space size="small">
                    <a-link @click="handleConsoleUrl(record)">日志</a-link>
                    <a-link @click="handleTestReportUrl(record)">报告</a-link>
                    <a-link @click="handleTestVideoUrl(record)">回放</a-link>
                  </a-space>
                </template>
              </template>
            </GiTable>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { Message, Modal, type TableInstance } from '@arco-design/web-vue'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import GiTable from '@/components/GiTable'
import { GiCellTag, GiCellTags } from '@/components/GiCell'
import { listAutomationUiScene, type AutomationUiSceneResp } from '@/apis/automation/automationUiScene'
import { usePagination } from '@/hooks'
import { pickSceneExecuteField } from '@/utils/automationUiSceneStatus'
import { useDict } from '@/hooks/app'
import { formatDuration } from '@/utils/sakura'

use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

interface Props {
  detailData: Record<string, any>
}

const props = defineProps<Props>()
const { scene_level, status_type } = useDict('scene_level', 'status_type')

const innerActiveKey = ref('0')
const loading = ref(false)

const projectConfig = computed(() => props.detailData?.projectConfig)
const automationConfig = computed(() => props.detailData?.automationConfig)

const uiStatistic = computed(() => {
  const statistic = props.detailData?.statisticAnalysis
  if (!statistic) return {}
  if (statistic.ui && typeof statistic.ui === 'object') return statistic.ui
  if (Array.isArray(statistic.uiList) && statistic.uiList[0]) return statistic.uiList[0]
  return {}
})

const scenePass = computed(() => toNumber(uiStatistic.value.scenePass))
const sceneFail = computed(() => toNumber(uiStatistic.value.sceneFail))
const sceneSkip = computed(() => toNumber(uiStatistic.value.sceneSkip))
const sceneTotal = computed(() => toNumber(uiStatistic.value.sceneTotal))

const serverDomain = computed(() => {
  if (!projectConfig.value?.server?.configList) return ''
  const item = projectConfig.value.server.configList.find((c: any) => c.paramsName === '前端域名')
  return item?.paramsValue || ''
})

const serverPort = computed(() => {
  if (!projectConfig.value?.server?.configList) return ''
  const item = projectConfig.value.server.configList.find((c: any) => c.paramsName === '前端端口')
  return item?.paramsValue || ''
})

const serverConfigVal = (name: string) => {
  if (!projectConfig.value?.server?.configList) return ''
  const item = projectConfig.value.server.configList.find((c: any) => c.paramsName === name)
  return item?.paramsValue || ''
}

const getPieOption = () => ({
  tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
  textStyle: { fontFamily: 'PingFang SC' },
  legend: {
    x: 'center',
    y: 'top',
    itemGap: 10,
    top: -5,
    data: ['通过', '失败', '跳过'],
  },
  series: [{
    name: '测试场景统计',
    type: 'pie',
    color: ['#00C853', '#EF5350', '#FAC858'],
    radius: ['35%', '55%'],
    itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
    labelLine: { length: 30 },
    label: {
      formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',
      backgroundColor: '#F6F8FC',
      borderColor: '#8C8D8E',
      borderWidth: 1,
      borderRadius: 4,
      rich: {
        a: { fontFamily: 'Arial', color: '#6E7079', lineHeight: 22, align: 'center' },
        hr: { fontFamily: 'Microsoft YaHei', borderColor: '#8C8D8E', width: '100%', borderWidth: 1, height: 0 },
        b: { fontFamily: 'Microsoft YaHei', color: '#4C5058', fontSize: 14, fontWeight: 'bold', lineHeight: 33 },
        per: { fontFamily: 'Microsoft YaHei', color: '#fff', backgroundColor: '#4C5058', padding: [3, 4], borderRadius: 4 },
      },
    },
    emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
    data: [
      { value: scenePass.value, name: '通过' },
      { value: sceneFail.value, name: '失败' },
      { value: sceneSkip.value, name: '跳过' },
    ],
  }],
  grid: { top: 0, bottom: 0, left: 0, right: 0, borderWidth: 0, containLabel: true },
})

const getBarOption = () => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  textStyle: { fontFamily: 'PingFang SC' },
  legend: { itemGap: 10, top: 0 },
  grid: { top: '8%', left: '3%', right: '4%', bottom: '6%', containLabel: true },
  xAxis: { type: 'value', boundaryGap: [0, 0.01] },
  yAxis: { type: 'category', data: ['测试步骤统计', '测试用例统计', '测试场景统计'] },
  series: [
    {
      name: '通过',
      type: 'bar',
      color: '#00C853',
      label: { show: true },
      emphasis: { focus: 'series' },
      data: [toNumber(uiStatistic.value.stepPass), toNumber(uiStatistic.value.casePass), scenePass.value],
    },
    {
      name: '失败',
      type: 'bar',
      color: '#EF5350',
      label: { show: true },
      emphasis: { focus: 'series' },
      data: [toNumber(uiStatistic.value.stepFail), toNumber(uiStatistic.value.caseFail), sceneFail.value],
    },
    {
      name: '跳过',
      type: 'bar',
      color: '#FAC858',
      label: { show: true },
      emphasis: { focus: 'series' },
      data: [toNumber(uiStatistic.value.stepSkip), toNumber(uiStatistic.value.caseSkip), sceneSkip.value],
    },
  ],
})

const columns: TableInstance['columns'] = [
  { title: '场景ID', dataIndex: 'sceneId', width: 170, ellipsis: true, align: 'center', fixed: 'left' },
  { title: '场景名称', dataIndex: 'name', width: 350, ellipsis: true, align: 'center', fixed: 'left' },
  { title: '场景版本', dataIndex: 'versionName', width: 120, ellipsis: true, align: 'center' },
  { title: '场景等级', dataIndex: 'level', width: 90, align: 'center' },
  { title: '标签', dataIndex: 'tags', width: 100, ellipsis: true, align: 'center' },
  {
    title: '执行状态',
    dataIndex: 'executeStatus',
    slotName: 'executeStatus',
    width: 90,
    align: 'center',
    render: ({ record }) => {
      const value = pickSceneExecuteField(record, 'executeStatus', status_type.value, 'report')
      return value ? <GiCellTag value={value} dict={status_type.value} /> : '-'
    },
  },
  {
    title: '执行结果',
    dataIndex: 'executeResult',
    slotName: 'executeResult',
    width: 100,
    ellipsis: true,
    align: 'center',
    render: ({ record }) => {
      const value = pickSceneExecuteField(record, 'executeResult', status_type.value, 'report')
      return value ? <GiCellTag value={value} dict={status_type.value} /> : '-'
    },
  },
  { title: '通过率', dataIndex: 'casePassRate', width: 80, align: 'center' },
  { title: '运行耗时', dataIndex: 'duration', width: 90, ellipsis: true, align: 'center', render: ({ record }) => {
    return formatDuration(getRecordField(record as AutomationUiSceneResp, 'duration'))
  } },
  { title: '用例数', dataIndex: 'caseTotal', width: 80, align: 'center' },
  { title: '通过', dataIndex: 'casePass', width: 70, align: 'center' },
  { title: '失败', dataIndex: 'caseFail', width: 70, align: 'center' },
  { title: '跳过', dataIndex: 'caseSkip', width: 70, align: 'center' },
  { title: '步骤数', dataIndex: 'stepTotal', width: 80, align: 'center' },
  { title: '通过', dataIndex: 'stepPass', width: 70, align: 'center' },
  { title: '失败', dataIndex: 'stepFail', width: 70, align: 'center' },
  { title: '跳过', dataIndex: 'stepSkip', width: 70, align: 'center' },
  { title: '执行人', dataIndex: 'executeName', width: 110, align: 'center' },
  { title: '开始时间', dataIndex: 'durationStartTime', width: 180, ellipsis: true, align: 'center' },
  { title: '结束时间', dataIndex: 'durationEndTime', width: 180, ellipsis: true, align: 'center' },
  { title: '操作', dataIndex: 'operation', slotName: 'operation', width: 160, align: 'center', fixed: 'right' },
]

const buildNumber = computed(() => {
  const val = uiStatistic.value.buildNumber
  if (val == null) return undefined
  return typeof val === 'number' ? val : parseInt(String(val), 10)
})

const testPlanId = computed(() => {
  if (uiStatistic.value.testPlanId) return uiStatistic.value.testPlanId as string | undefined
  return props.detailData?.testPlanId
})
const testReportId = computed(() => props.detailData?.id ? String(props.detailData.id) : undefined)

const allData = ref<AutomationUiSceneResp[]>([])
const passData = ref<AutomationUiSceneResp[]>([])
const failData = ref<AutomationUiSceneResp[]>([])
const skipData = ref<AutomationUiSceneResp[]>([])

const currentSceneType = ref<'all' | 'pass' | 'fail' | 'skip'>('all')

const { pagination: tablePagination, setTotal } = usePagination(() => {
  fetchSceneList(currentSceneType.value)
}, { defaultPageSize: 10, defaultSizeOptions: [10, 20, 30, 50, 100] })

const getRecordField = (record: AutomationUiSceneResp, field: string) => {
  if (record.testRecord?.length) {
    const rec = record.testRecord[0] as Record<string, any>
    if (rec?.[field]) return rec[field]
  }
  if (field in record) return (record as any)[field]
  return null
}

const handleConsoleUrl = (record: AutomationUiSceneResp) => {
  const url = getRecordField(record, 'consoleUrl')
  if (url) window.open(url, '_blank')
}

const handleTestReportUrl = (record: AutomationUiSceneResp) => {
  const url = getRecordField(record, 'testReportUrl')
  if (url) window.open(url, '_blank')
}

const handleTestVideoUrl = (record: AutomationUiSceneResp) => {
  const url = getRecordField(record, 'testReportUrl')
  if (!url) return
  const videoUrl = url.includes('/index.html')
    ? url.replace('/index.html', `/video/${record.sceneId}.mp4`)
    : `${url.replace(/\/$/, '')}/video/${record.sceneId}.mp4`
  window.open(videoUrl, '_blank')
}

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeRecord = (record: AutomationUiSceneResp) => {
  const testRecord = record.testRecord?.[0] as Record<string, any>
  const fields = ['consoleUrl', 'testReportUrl', 'executeStatus', 'executeResult', 'duration',
    'caseTotal', 'casePass', 'caseFail', 'caseSkip', 'casePassRate',
    'stepTotal', 'stepPass', 'stepFail', 'stepSkip', 'stepPassRate',
    'scenePass', 'sceneFail', 'sceneSkip', 'scenePassRate', 'executeName', 'durationStartTime', 'durationEndTime']
  for (const field of fields) {
    const val = testRecord?.[field]
    if (val !== undefined) {
      (record as any)[field] = val
    }
  }
  return record
}

const fetchSceneList = async (type: 'all' | 'pass' | 'fail' | 'skip') => {
  if (!buildNumber.value || !testPlanId.value) {
    return
  }
  loading.value = true
  try {
    const executeResultType = props.detailData?.executeMode === 'DEBUG' ? 'debug' : 'report'
    const executeResultMap: Record<string, string | undefined> = {
      all: undefined,
      pass: '14',
      fail: '15',
      skip: '16',
    }
    const res = await listAutomationUiScene({
      testPlanId: testPlanId.value,
      testReportId: testReportId.value,
      buildNumber: buildNumber.value,
      executeResultType: executeResultType as 'report' | 'debug',
      executeResult: executeResultMap[type],
      page: tablePagination.current,
      size: tablePagination.pageSize,
    })
    const result = res.data
    const list = (result?.list || []).map(normalizeRecord)
    const total = result?.total || 0
    setTotal(total)
    if (type === 'all') {
      allData.value = toRaw(list)
    } else if (type === 'pass') {
      passData.value = toRaw(list)
    } else if (type === 'fail') {
      failData.value = toRaw(list)
    } else {
      skipData.value = toRaw(list)
    }
  } catch (e) {
    console.error('fetch scene list error', e)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.detailData, innerActiveKey.value],
  ([, tab]) => {
    if (tab !== '0' && buildNumber.value && testPlanId.value) {
      const type = tab === '1' ? 'all' : tab === '2' ? 'pass' : tab === '3' ? 'fail' : 'skip'
      currentSceneType.value = type
      tablePagination.current = 1
      fetchSceneList(type)
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.test-report-ui-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.env-info-descriptions {
  margin-top: 10px;

  :deep(.arco-descriptions-item-label) {
    width: 120px;
  }
}

.tab-list-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  margin-top: 15px;
  overflow: hidden;
}

.inner-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  :deep(.arco-tabs-nav) {
    flex: none;
    width: 100%;
  }

  :deep(.arco-tabs-content) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.arco-tabs-content-list),
  :deep(.arco-tabs-pane) {
    height: 100%;
    min-height: 0;
  }

  :deep(.arco-tabs-pane) {
    overflow: hidden;
  }

  :deep(.arco-tabs-tab) {
    text-align: center;
  }
}

.charts-wrapper {
  height: 100%;
  overflow: auto;

  .chart-flex {
    display: flex;
    height: 370px;
    margin-top: 30px;
    .chart {
      flex: 1;
    }
  }
}

.table-wrapper {
  display: flex;
  height: 100%;
  min-height: 0;
  margin-top: 0px;
  overflow: hidden;
}

:deep(.gi-table__toolbar) {
  padding: 12px 0 12px 0;
}
</style>
