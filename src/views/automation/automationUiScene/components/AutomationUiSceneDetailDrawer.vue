<template>
  <a-drawer v-model:visible="visible" title="UI 自动化场景详情" :width="width >= 960 ? 960 : '100%'" :footer="false">
    <a-tabs>
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
    </a-tabs>
  </a-drawer>
</template>

<script setup lang="tsx">
import { useWindowSize } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { type AutomationUiSceneDetailResp, getAutomationUiScene as getDetail } from '@/apis/automation/automationUiScene'
import { useDict } from '@/hooks/app'
import { resolveSceneResultValue, resolveSceneStatusValue } from '@/utils/automationUiSceneStatus'

const { status_type } = useDict('status_type')

const executeStatusValue = computed(() => resolveSceneStatusValue(dataDetail.value?.executeStatus, status_type.value))
const executeResultValue = computed(() => resolveSceneResultValue(dataDetail.value?.executeResult, status_type.value))
const lastResultValue = computed(() => resolveSceneResultValue(dataDetail.value?.lastResult, status_type.value))
const { width } = useWindowSize()
const router = useRouter()

const dataId = ref('')
const dataDetail = ref<AutomationUiSceneDetailResp>()
const visible = ref(false)

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

const normalizeRecords = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => ({
    key: index,
    ...(typeof item === 'object' && item ? item : { value: String(item) }),
  }))
}

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

const onOpen = async (id: string) => {
  dataId.value = id
  await getDataDetail()
  visible.value = true
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss"></style>
