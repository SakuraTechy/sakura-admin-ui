<template>
  <div class="test-report-func-detail">
    <a-row :gutter="[16, 16]">
      <a-col :span="24">
        <a-descriptions title="基本信息" :column="3" bordered size="small">
          <a-descriptions-item label="报告 ID">{{ detailData?.id || '-' }}</a-descriptions-item>
          <a-descriptions-item label="报告名称">{{ detailData?.name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="所属项目">{{ detailData?.projectName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="所属计划">{{ detailData?.testPlanName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="版本名称">{{ detailData?.versionName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="触发方式">{{ detailData?.triggerMode || '-' }}</a-descriptions-item>
          <a-descriptions-item label="执行方式">{{ detailData?.executeMode || '-' }}</a-descriptions-item>
          <a-descriptions-item label="状态">{{ detailData?.status || '-' }}</a-descriptions-item>
          <a-descriptions-item label="构建号">{{ detailData?.buildNumber || '-' }}</a-descriptions-item>
          <a-descriptions-item label="耗时(ms)">{{ detailData?.runTime ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="控制台日志">
            <a-link v-if="detailData?.consoleUrl" :href="detailData.consoleUrl" target="_blank">打开日志</a-link>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="测试报告">
            <a-link v-if="detailData?.reportUrl" :href="detailData.reportUrl" target="_blank">打开报告</a-link>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="视频回放" :span="2">
            <a-link v-if="detailData?.videoUrl" :href="detailData.videoUrl" target="_blank">打开视频</a-link>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="描述" :span="3">{{ detailData?.description || '-' }}</a-descriptions-item>
        </a-descriptions>
      </a-col>

      <a-col :span="24">
        <a-card title="运行配置 - 项目配置" :bordered="false">
          <pre class="json-block">{{ formatJson(detailData?.projectConfig) }}</pre>
        </a-card>
      </a-col>

      <a-col :span="24">
        <a-card title="运行配置 - 自动化配置" :bordered="false">
          <pre class="json-block">{{ formatJson(detailData?.automationConfig) }}</pre>
        </a-card>
      </a-col>

      <a-col :span="24">
        <a-card title="运行配置 - 运行环境" :bordered="false">
          <pre class="json-block">{{ formatJson(detailData?.runtimeEnvironment) }}</pre>
        </a-card>
      </a-col>

      <a-col :span="24">
        <a-card title="原始统计数据" :bordered="false">
          <pre class="json-block">{{ formatJson(detailData?.statisticAnalysis) }}</pre>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import type { TestReportDetailResp } from '@/apis/test/testReport'

defineOptions({ name: 'TestReportFuncDetail' })

defineProps<{
  detailData?: TestReportDetailResp
}>()

const formatJson = (value: unknown) => {
  if (!value) return '-'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
</script>

<style scoped lang="scss">
.test-report-func-detail {
  padding: 0;
}

.json-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.6;
}
</style>