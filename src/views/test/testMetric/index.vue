<template>
  <div class="metric_page">
    <a-card :bordered="false">
      <template #title>测试度量</template>
      <a-space wrap>
        <a-input-number v-model="queryForm.projectId" placeholder="项目ID" />
        <a-input-number v-model="queryForm.versionId" placeholder="版本ID" />
        <a-button type="primary" @click="search">查询</a-button>
      </a-space>
    </a-card>

    <a-row :gutter="16">
      <a-col :xs="24" :sm="12" :lg="6"><a-card><a-statistic title="测试计划" :value="data.testPlanCount || 0" /></a-card></a-col>
      <a-col :xs="24" :sm="12" :lg="6"><a-card><a-statistic title="测试报告" :value="data.testReportCount || 0" /></a-card></a-col>
      <a-col :xs="24" :sm="12" :lg="6"><a-card><a-statistic title="定时任务" :value="data.timedTaskCount || 0" /></a-card></a-col>
      <a-col :xs="24" :sm="12" :lg="6"><a-card><a-statistic title="自动化通过率" :value="Number(data.automationPassRate || 0)" suffix="%" /></a-card></a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :xs="24" :xl="8">
        <a-card title="模块统计" :bordered="false">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="模块总数">{{ data.moduleMetric?.totalCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="本周新增">{{ data.moduleMetric?.weekAddedCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="本月新增">{{ data.moduleMetric?.monthAddedCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="本年新增">{{ data.moduleMetric?.yearAddedCount || 0 }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="8">
        <a-card title="场景统计" :bordered="false">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="场景总数">{{ data.sceneMetric?.totalCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="P0/P1/P2/P3">{{ formatLevels() }}</a-descriptions-item>
            <a-descriptions-item label="本周新增">{{ data.sceneMetric?.weekAddedCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="本月新增">{{ data.sceneMetric?.monthAddedCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="本年新增">{{ data.sceneMetric?.yearAddedCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="执行结果">{{ formatSceneResult() }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="8">
        <a-card title="执行指标" :bordered="false">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="报告总数">{{ data.executionMetric?.totalReportCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="本周/本月/本年运行">{{ formatRunPeriod() }}</a-descriptions-item>
            <a-descriptions-item label="累计运行场景">{{ data.executionMetric?.totalRunSceneCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="发现缺陷数">{{ data.executionMetric?.discoveredDefectCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="节省人力(小时)">{{ data.executionMetric?.savedManHours || 0 }}</a-descriptions-item>
            <a-descriptions-item label="覆盖率/执行率/通过率/缺陷率">{{ formatRates() }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { getTestMetricOverview, type TestMetricResp } from '@/apis/test/testMetric'

defineOptions({ name: 'TestTestMetric' })

const queryForm = reactive({
  projectId: undefined as number | undefined,
  versionId: undefined as number | undefined,
})

const data = ref<Partial<TestMetricResp>>({})

const search = async () => {
  const { data: resp } = await getTestMetricOverview(queryForm)
  data.value = resp || {}
}

const formatLevels = () => {
  const scene = data.value.sceneMetric
  return `P0 ${scene?.p0Count || 0} / P1 ${scene?.p1Count || 0} / P2 ${scene?.p2Count || 0} / P3 ${scene?.p3Count || 0}`
}

const formatSceneResult = () => {
  const scene = data.value.sceneMetric
  return `执行 ${scene?.executedCount || 0} / 通过 ${scene?.passedCount || 0} / 失败 ${scene?.failedCount || 0} / 跳过 ${scene?.skippedCount || 0}`
}

const formatRunPeriod = () => {
  const execution = data.value.executionMetric
  return `${execution?.weekRunCount || 0} / ${execution?.monthRunCount || 0} / ${execution?.yearRunCount || 0}`
}

const formatRates = () => {
  const execution = data.value.executionMetric
  return `${execution?.automationCoverageRate || 0}% / ${execution?.automationExecuteRate || 0}% / ${execution?.automationPassRate || 0}% / ${execution?.defectRate || 0}%`
}

onMounted(search)
</script>

<style scoped lang="scss">
.metric_page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
