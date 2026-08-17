<template>
  <a-drawer v-model:visible="visible" title="UI 自动化场景详情" :width="width >= 960 ? 960 : '100%'" :footer="false">
      <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="basic" title="基础信息">
        <a-space direction="vertical" fill>
          <a-card :bordered="false">
            <a-space wrap>
              <a-button v-if="primaryPlanId" type="primary" @click="goToPlan(primaryPlanId)">查看测试计划</a-button>
              <a-button v-if="dataDetail?.reportId" @click="goToReport(dataDetail.reportId)">查看测试报告</a-button>
              <a-link v-if="dataDetail?.consoleUrl" :href="dataDetail.consoleUrl" target="_blank">打开日志</a-link>
              <a-link v-if="dataDetail?.testReportUrl" :href="dataDetail.testReportUrl" target="_blank">打开报告</a-link>
              <a-link v-if="sceneVideoUrl" :href="sceneVideoUrl" target="_blank">打开视频</a-link>
            </a-space>
          </a-card>
          <a-descriptions :column="2" size="large" class="general-description">
            <a-descriptions-item label="主键 ID">{{ dataDetail?.id || '-' }}</a-descriptions-item>
            <a-descriptions-item label="场景 ID">{{ dataDetail?.sceneId || '-' }}</a-descriptions-item>
            <a-descriptions-item label="场景名称">{{ dataDetail?.name || '-' }}</a-descriptions-item>
            <a-descriptions-item label="所属项目">{{ dataDetail?.projectName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="所属版本">{{ dataDetail?.versionName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="模块路径">{{ dataDetail?.modulePath || '-' }}</a-descriptions-item>
            <a-descriptions-item label="场景等级">{{ dataDetail?.level || '-' }}</a-descriptions-item>
            <a-descriptions-item label="场景状态">
              <GiCellTag :value="dataDetail?.status" :dict="status_type" />
            </a-descriptions-item>
            <a-descriptions-item label="执行状态">
              <GiCellTag v-if="executeStatusValue" :value="executeStatusValue" :dict="status_type" />
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="执行结果">
              <GiCellTag v-if="executeResultValue" :value="executeResultValue" :dict="status_type" />
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="通过率">{{ dataDetail?.passRate || '-' }}</a-descriptions-item>
            <a-descriptions-item label="最新结果">
              <GiCellTag v-if="lastResultValue" :value="lastResultValue" :dict="status_type" />
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="关联测试计划">{{ formatList(dataDetail?.testPlanId) }}</a-descriptions-item>
            <a-descriptions-item label="所属测试报告 ID">{{ dataDetail?.reportId || '-' }}</a-descriptions-item>
            <a-descriptions-item label="控制台日志">
              <a-link v-if="dataDetail?.consoleUrl" :href="dataDetail.consoleUrl" target="_blank">打开日志</a-link>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="测试报告">
              <a-link v-if="dataDetail?.testReportUrl" :href="dataDetail.testReportUrl" target="_blank">打开报告</a-link>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="视频回放" :span="2">
              <a-link v-if="sceneVideoUrl" :href="sceneVideoUrl" target="_blank">打开视频</a-link>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="描述" :span="2">{{ dataDetail?.description || '-' }}</a-descriptions-item>
          </a-descriptions>
        </a-space>
      </a-tab-pane>

      <a-tab-pane key="history" title="执行历史">
        <a-space direction="vertical" fill>
          <a-card :bordered="false">
            <template #title>调试记录</template>
            <a-table :data="normalizeRecords(dataDetail?.debugRecord)" :pagination="false" :columns="historyColumns" size="small" />
          </a-card>
          <a-card :bordered="false">
            <template #title>计划记录</template>
            <a-table :data="normalizeRecords(dataDetail?.testRecord)" :pagination="false" :columns="historyColumns" size="small" />
          </a-card>
          <a-card v-if="playbackCaseResult" :bordered="false">
            <template #title>Playwright 用例执行明细</template>
            <a-descriptions :column="3" size="small" bordered>
              <a-descriptions-item label="用例 ID">{{ playbackCaseResult.case_id || '-' }}</a-descriptions-item>
              <a-descriptions-item label="用例名称">{{ playbackCaseResult.case_name || '-' }}</a-descriptions-item>
              <a-descriptions-item label="执行结果">
                <a-tag :color="stepStatusColor(playbackCaseResult.status)">{{ stepStatusLabel(playbackCaseResult.status) }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="步骤总数">{{ playbackCaseResult.step_total ?? playbackStepResults.length }}</a-descriptions-item>
              <a-descriptions-item label="步骤通过">{{ playbackCaseResult.step_pass ?? '-' }}</a-descriptions-item>
              <a-descriptions-item label="步骤失败">{{ playbackCaseResult.step_fail ?? '-' }}</a-descriptions-item>
            </a-descriptions>
            <a-table
              :data="playbackStepResults"
              :pagination="false"
              :columns="playbackStepColumns"
              size="small"
              row-key="step_index"
              style="margin-top: 12px"
            />
          </a-card>
        </a-space>
      </a-tab-pane>

      <a-tab-pane key="stats" title="统计数据">
        <a-descriptions :column="2" size="large" class="general-description">
          <a-descriptions-item label="构建号">{{ dataDetail?.buildNumber || '-' }}</a-descriptions-item>
          <a-descriptions-item label="用例总数">{{ dataDetail?.caseTotal ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="用例通过">{{ dataDetail?.casePass ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="用例失败">{{ dataDetail?.caseFail ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="用例跳过">{{ dataDetail?.caseSkip ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="步骤总数">{{ dataDetail?.stepTotal ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="步骤通过">{{ dataDetail?.stepPass ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="步骤失败">{{ dataDetail?.stepFail ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="步骤跳过">{{ dataDetail?.stepSkip ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建人">{{ dataDetail?.createUserString || dataDetail?.createUser || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ dataDetail?.createTime || '-' }}</a-descriptions-item>
          <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString || dataDetail?.updateUser || '-' }}</a-descriptions-item>
          <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime || '-' }}</a-descriptions-item>
        </a-descriptions>
      </a-tab-pane>

      <a-tab-pane key="recording" title="录制数据">
        <a-empty v-if="recordingCaseList.length === 0" description="暂无 Playwright 录制数据" />
        <a-collapse v-else :bordered="false">
          <a-collapse-item
            v-for="caseItem in recordingCaseList"
            :key="caseItem.id"
            :header="`${caseItem.name || caseItem.id}（${getRecordingSteps(caseItem).length} 步）`"
          >
            <a-space direction="vertical" fill>
              <div v-for="step in getRecordingSteps(caseItem)" :key="step.id" class="recording-step">
                <div class="recording-step-header">
                  <a-space wrap>
                    <a-tag color="arcoblue">#{{ step.order || '-' }}</a-tag>
                    <span class="recording-step-title">{{ step.name || step.id }}</span>
                    <a-tag v-if="getConfigValue(step, 'action_type')">{{ getConfigValue(step, 'action_type') }}</a-tag>
                    <a-tag v-if="getConfigValue(step, 'source')" color="green">{{ getConfigValue(step, 'source') }}</a-tag>
                  </a-space>
                </div>
                <a-descriptions :column="2" size="small" bordered>
                  <a-descriptions-item label="步骤 ID">{{ step.id || '-' }}</a-descriptions-item>
                  <a-descriptions-item label="操作值">{{ step.operationValue || '-' }}</a-descriptions-item>
                  <a-descriptions-item label="CSS 选择器">{{ getConfigValue(step, 'target_selector') || '-' }}</a-descriptions-item>
                  <a-descriptions-item label="XPath">{{ getConfigValue(step, 'target_xpath') || '-' }}</a-descriptions-item>
                  <a-descriptions-item label="页面地址" :span="2">{{ getConfigValue(step, 'url') || '-' }}</a-descriptions-item>
                  <a-descriptions-item label="输入值">{{ formatStepValue(step) }}</a-descriptions-item>
                  <a-descriptions-item label="录制 ID">{{ getConfigValue(step, 'recording_id') || '-' }}</a-descriptions-item>
                  <a-descriptions-item label="截图" :span="2">
                    <a-space v-if="getConfigValue(step, 'screenshot_url')" direction="vertical" fill>
                      <a-link @click="openScreenshot(getConfigValue(step, 'screenshot_url'))">
                        打开截图
                      </a-link>
                      <div class="recording-path-line">
                        <span class="muted">接口路径：</span>{{ getConfigValue(step, 'screenshot_url') }}
                      </div>
                      <div v-if="getConfigValue(step, 'screenshot_file_id')" class="recording-path-line">
                        <span class="muted">文件 ID：</span>{{ getConfigValue(step, 'screenshot_file_id') }}
                      </div>
                    </a-space>
                    <span v-else-if="getConfigValue(step, 'screenshot_present')">已记录截图存在标记，未保存 artifact</span>
                    <span v-else>-</span>
                  </a-descriptions-item>
                </a-descriptions>
                <a-tabs size="small" class="recording-json-tabs">
                  <a-tab-pane v-if="getConfigValue(step, 'playwright_step')" key="playwright_step" title="playwright_step">
                    <JsonPretty :json="formatConfigJson(step, 'playwright_step')" />
                  </a-tab-pane>
                  <a-tab-pane v-if="getConfigValue(step, 'locator_meta')" key="locator_meta" title="locator_meta">
                    <JsonPretty :json="formatConfigJson(step, 'locator_meta')" />
                  </a-tab-pane>
                  <a-tab-pane key="configList" title="configList">
                    <JsonPretty :json="formatJson(step.configList || [])" />
                  </a-tab-pane>
                </a-tabs>
              </div>
            </a-space>
          </a-collapse-item>
        </a-collapse>
      </a-tab-pane>
    </a-tabs>
  </a-drawer>
</template>

<script setup lang="tsx">
import { useWindowSize } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { type AutomationUiSceneDetailResp, getAutomationUiScene as getDetail } from '@/apis/automation/automationUiScene'
import { useDict } from '@/hooks/app'
import { resolveSceneResultValue, resolveSceneStatusValue } from '@/utils/automationUiSceneStatus'
import http from '@/utils/http'

const { status_type } = useDict('status_type')

const executeStatusValue = computed(() => resolveSceneStatusValue(dataDetail.value?.executeStatus, status_type.value))
const executeResultValue = computed(() => resolveSceneResultValue(dataDetail.value?.executeResult, status_type.value))
const lastResultValue = computed(() => resolveSceneResultValue(dataDetail.value?.lastResult, status_type.value))
const { width } = useWindowSize()
const router = useRouter()

const dataId = ref('')
const dataDetail = ref<AutomationUiSceneDetailResp>()
const visible = ref(false)
const activeTab = ref('basic')

const recordingCaseList = computed(() => {
  const caseList = dataDetail.value?.caseList
  if (!Array.isArray(caseList)) return []
  return caseList.filter(caseItem => getRecordingSteps(caseItem).length > 0)
})

const primaryPlanId = computed(() => {
  const planIds = dataDetail.value?.testPlanId
  if (!Array.isArray(planIds) || planIds.length === 0) return ''
  return String(planIds[0])
})

const sceneVideoUrl = computed(() => resolveVideoUrl(dataDetail.value))

const historyColumns = [
  {
    title: '计划 ID',
    dataIndex: 'testPlanId',
    width: 120,
  },
  {
    title: '构建号',
    dataIndex: 'buildNumber',
    width: 100,
  },
  {
    title: '执行人',
    dataIndex: 'executeName',
    width: 120,
  },
  {
    title: '执行状态',
    dataIndex: 'executeStatus',
    width: 120,
  },
  {
    title: '执行结果',
    dataIndex: 'executeResult',
    width: 120,
  },
  {
    title: '耗时',
    dataIndex: 'duration',
    width: 120,
    render: ({ record }: any) => formatDuration(record.duration),
  },
  {
    title: '日志',
    dataIndex: 'consoleUrl',
    width: 90,
    render: ({ record }: any) => record.consoleUrl ? <a-link href={record.consoleUrl} target="_blank">日志</a-link> : '-',
  },
  {
    title: '报告',
    dataIndex: 'testReportUrl',
    width: 90,
    render: ({ record }: any) => record.testReportUrl ? <a-link href={record.testReportUrl} target="_blank">报告</a-link> : '-',
  },
  {
    title: '视频',
    dataIndex: 'videoUrl',
    width: 90,
    render: ({ record }: any) => {
      const videoUrl = resolveVideoUrl(record)
      return videoUrl ? <a-link href={videoUrl} target="_blank">视频</a-link> : '-'
    },
  },
  {
    title: '跳转',
    dataIndex: 'action',
    width: 160,
    render: ({ record }: any) => (
      <a-space size="mini">
        {record.testPlanId ? <a-link onClick={() => goToPlan(record.testPlanId)}>计划</a-link> : null}
        {record.testReportId ? <a-link onClick={() => goToReport(record.testReportId, record.testPlanId)}>报告</a-link> : null}
      </a-space>
    ),
  },
]

const formatList = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.map(item => String(item)).join(', ')
}

const getRecordingSteps = (caseItem: any) => {
  const stepList = Array.isArray(caseItem?.stepList) ? caseItem.stepList : []
  return stepList.filter((step: any) => {
    // canonical playwright_step 也会由 Admin 手工目录步骤生成，不能据此推断录制来源。
    const source = getConfigValue(step, 'source').trim().toLowerCase()
    const recordingId = getConfigValue(step, 'recording_id').trim()
    return source === 'sakura-playwright' || Boolean(recordingId)
  })
}

const getDirectConfigValue = (step: any, name: string) => {
  const configList = Array.isArray(step?.configList) ? step.configList : []
  const config = configList.find((item: any) => item?.paramsName === name)
  return config?.paramsValue == null ? '' : String(config.paramsValue)
}

const getConfigValue = (step: any, name: string) => {
  const directValue = getDirectConfigValue(step, name)
  if (directValue) return directValue
  if (!['target_selector', 'target_xpath', 'url', 'locator_meta', 'value'].includes(name)) return ''
  if (name === 'value' && ['1', 'true'].includes(getDirectConfigValue(step, 'value_masked').toLowerCase())) return ''
  if (name === 'locator_meta') {
    const originalLocatorMeta = getDirectConfigValue(step, 'original_locator_meta')
    if (originalLocatorMeta) return originalLocatorMeta
  }
  try {
    const originalStep = JSON.parse(getDirectConfigValue(step, 'original_playwright_step') || '{}')
    const value = originalStep?.[name]
    return value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    return ''
  }
}

const formatJson = (value: unknown) => {
  return JSON.stringify(value ?? {}, null, 2)
}

const formatConfigJson = (step: any, name: string) => {
  const value = getConfigValue(step, name)
  if (!value) return '{}'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return JSON.stringify({ raw: value }, null, 2)
  }
}

const formatStepValue = (step: any) => {
  if (getConfigValue(step, 'value_masked') === '1') return '******'
  return getConfigValue(step, 'value') || '-'
}

const resolveResourceUrl = (url: string) => {
  const value = String(url || '').trim()
  if (!value || /^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value
  const apiPrefix = import.meta.env.VITE_API_PREFIX || ''
  if (apiPrefix && value.startsWith(apiPrefix)) return value
  if (apiPrefix && value.startsWith('/')) return `${apiPrefix}${value}`
  return value
}

const openScreenshot = async (url: string) => {
  const resolvedUrl = resolveResourceUrl(url)
  if (!resolvedUrl) return
  if (/^(https?:)?\/\//i.test(resolvedUrl)) {
    window.open(resolvedUrl, '_blank')
    return
  }
  try {
    const response = await http.requestNative({
      method: 'get',
      url: resolvedUrl,
      responseType: 'blob',
    })
    const objectUrl = URL.createObjectURL(response.data)
    window.open(objectUrl, '_blank')
  } catch (e: any) {
    Message.error(e?.message || '打开截图失败')
  }
}

const normalizeRecords = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => ({
    key: index,
    ...(typeof item === 'object' && item ? item : { value: String(item) }),
  }))
}

const latestDebugRecord = computed(() => normalizeRecords(dataDetail.value?.debugRecord)[0] || {})
const playbackCaseResult = computed(() => {
  const record: any = latestDebugRecord.value
  if (Array.isArray(record.caseResults) && record.caseResults.length > 0) return record.caseResults[0]
  if (record.playwrightCaseKey || record.caseId) {
    return {
      case_id: record.caseId,
      case_name: record.caseName,
      status: record.executeResult,
      step_total: record.stepTotal,
      step_pass: record.stepPass,
      step_fail: record.stepFail,
      steps: record.stepResults,
    }
  }
  return null
})
const playbackStepResults = computed(() => {
  const steps = playbackCaseResult.value?.steps
  return Array.isArray(steps) ? steps : []
})
const stepStatusLabel = (status: unknown) => {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'passed' || normalized === '14') return '通过'
  if (normalized === 'failed' || normalized === '15') return '失败'
  if (normalized === 'skipped' || normalized === '16') return '跳过'
  return normalized || '-'
}
const stepStatusColor = (status: unknown) => {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'passed' || normalized === '14') return 'green'
  if (normalized === 'failed' || normalized === '15') return 'red'
  if (normalized === 'skipped' || normalized === '16') return 'orange'
  return 'gray'
}
const playbackStepColumns = [
  { title: '步骤序号', dataIndex: 'step_index', width: 90 },
  { title: '步骤 ID', dataIndex: 'step_id', width: 140 },
  { title: '动作', dataIndex: 'action_type', width: 130 },
  { title: '描述', dataIndex: 'description', ellipsis: true },
  {
    title: '结果',
    dataIndex: 'status',
    width: 90,
    render: ({ record }: any) => <a-tag color={stepStatusColor(record.status)}>{stepStatusLabel(record.status)}</a-tag>,
  },
  {
    title: '耗时',
    dataIndex: 'duration_ms',
    width: 100,
    render: ({ record }: any) => formatDuration(record.duration_ms),
  },
  { title: '错误', dataIndex: 'error', ellipsis: true },
]

const formatDuration = (value: unknown) => {
  const total = Number(value)
  if (!Number.isFinite(total) || total < 0) return '-'
  if (total < 1000) return `${total} ms`
  const seconds = Math.floor(total / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  if (minutes <= 0) return `${seconds} s`
  return `${minutes} m ${remainSeconds} s`
}

const resolveVideoUrl = (record?: Record<string, any>) => {
  if (!record) return ''
  if (record.videoUrl) return String(record.videoUrl)
  const reportUrl = record.testReportUrl
  const sceneId = record.sceneId || dataDetail.value?.sceneId
  if (!reportUrl || !sceneId) return ''
  if (String(reportUrl).includes('/index.html')) {
    return String(reportUrl).replace('/index.html', `/video/${sceneId}.mp4`)
  }
  return `${String(reportUrl).replace(/\/$/, '')}/video/${sceneId}.mp4`
}

const goToPlan = async (planId: string | number) => {
  await router.push({
    path: '/test/testPlan',
    query: { id: String(planId) },
  })
  visible.value = false
}

const goToReport = async (reportId: string | number, planId?: string | number) => {
  await router.push({
    path: '/test/testReport',
    query: {
      id: String(reportId),
      ...(planId ? { testPlanId: String(planId) } : {}),
    },
  })
  visible.value = false
}

const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data
}

const onOpen = async (id: string, tab = 'basic') => {
  dataId.value = id
  activeTab.value = tab
  await getDataDetail()
  visible.value = true
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.recording-step {
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
}

.recording-step-header {
  margin-bottom: 12px;
}

.recording-step-title {
  font-weight: 600;
}

.recording-path-line {
  max-width: 100%;
  overflow-wrap: anywhere;
  line-height: 1.5;
}

.muted {
  color: var(--color-text-3);
}

.recording-json-tabs {
  margin-top: 12px;

  :deep(.json_pretty_container) {
    max-height: 320px;
    padding: 12px;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    background: var(--color-fill-1);
  }
}
</style>
