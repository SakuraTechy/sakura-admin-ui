<template>
  <div class="review-governance-page">
    <header class="page-toolbar">
      <div>
        <h2>用例评审</h2>
        <span>个人待办、质量趋势与项目门禁策略</span>
      </div>
      <a-space wrap>
        <a-select v-model="projectId" :options="projectOptions" allow-search allow-clear placeholder="全部项目" class="project-select" @change="handleProjectChange" />
        <a-tooltip content="刷新">
          <a-button :loading="loading" @click="reloadActive">
            <template #icon><icon-refresh /></template>
          </a-button>
        </a-tooltip>
      </a-space>
    </header>

    <a-tabs v-model:active-key="activeTab" class="governance-tabs" @change="handleTabChange">
      <a-tab-pane key="queue" title="我的队列">
        <section class="queue-toolbar">
          <a-radio-group v-model="queueScope" type="button" size="small">
            <a-radio value="pending">待我评审 {{ queue.pending.length }}</a-radio>
            <a-radio value="submitted">我提交的 {{ queue.submitted.length }}</a-radio>
            <a-radio value="outdated">已过期 {{ queue.outdated.length }}</a-radio>
            <a-radio value="dueSoon">临近超时 {{ queue.dueSoon.length }}</a-radio>
          </a-radio-group>
          <a-button
            v-if="queueScope === 'pending'"
            v-permission="['automation:automationUiScene:review:admin']"
            type="primary"
            size="small"
            :disabled="!selectedReviewIds.length"
            @click="openAssign"
          >
            <template #icon><icon-user-add /></template>
            分配评审人
          </a-button>
        </section>
        <a-table
          v-model:selected-keys="selectedReviewIds"
          :data="visibleQueue"
          :loading="queueLoading"
          :pagination="{ pageSize: 20, showTotal: true }"
          :row-selection="queueScope === 'pending' && canAdmin ? { type: 'checkbox', showCheckedAll: true } : undefined"
          row-key="reviewId"
          size="small"
          :scroll="{ x: 980 }"
        >
          <template #columns>
            <a-table-column title="用例" :width="250">
              <template #cell="{ record }">
                <div class="primary-cell"><strong>{{ record.caseName }}</strong><span>{{ record.caseId }}</span></div>
              </template>
            </a-table-column>
            <a-table-column title="场景" :width="210">
              <template #cell="{ record }"><div class="primary-cell"><span>{{ record.sceneName }}</span><small>{{ record.projectName || record.projectId }}</small></div></template>
            </a-table-column>
            <a-table-column title="状态" :width="100" align="center">
              <template #cell="{ record }"><a-tag :color="statusMeta[record.status]?.color || 'gray'">{{ statusMeta[record.status]?.label || record.status }}</a-tag></template>
            </a-table-column>
            <a-table-column title="轮次" data-index="roundNo" :width="80" align="center" />
            <a-table-column title="批准" :width="90" align="center">
              <template #cell="{ record }">{{ record.approvedCount }}/{{ record.requiredApprovals }}</template>
            </a-table-column>
            <a-table-column title="提交人" data-index="submitterName" :width="120" />
            <a-table-column title="提交时间" :width="150"><template #cell="{ record }">{{ formatTime(record.submittedAt) }}</template></a-table-column>
            <a-table-column title="时限" :width="150">
              <template #cell="{ record }"><span :class="{ overdue: record.overdue }">{{ formatTime(record.dueAt) }}</span></template>
            </a-table-column>
            <a-table-column title="操作" :width="90" fixed="right">
              <template #cell="{ record }"><a-link @click="openScene(record)">查看场景</a-link></template>
            </a-table-column>
          </template>
          <template #empty><a-empty description="当前范围没有评审任务" /></template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="metrics" title="质量度量">
        <section class="metrics-filter">
          <a-range-picker v-model="dateRange" value-format="YYYY-MM-DD" :allow-clear="false" />
          <a-button type="primary" :disabled="!projectId" :loading="metricsLoading" @click="loadMetrics">
            <template #icon><icon-search /></template>查询
          </a-button>
        </section>
        <a-empty v-if="!projectId" description="请选择项目查看评审度量" />
        <template v-else>
          <section class="metric-strip">
            <div><span>评审单</span><strong>{{ metrics?.reviewCount ?? 0 }}</strong><small>{{ metrics?.completedCount ?? 0 }} 已完成</small></div>
            <div><span>平均时长</span><strong>{{ formatMetric(metrics?.averageReviewDurationHours, 'h') }}</strong><small>提交至本轮结论</small></div>
            <div><span>一次通过率</span><strong>{{ formatMetric(metrics?.firstPassApprovalRate, '%') }}</strong><small>首轮评审</small></div>
            <div><span>过期率</span><strong>{{ formatMetric(metrics?.outdatedRate, '%') }}</strong><small>目标版本发生变化</small></div>
          </section>
          <section class="blocker-section">
            <header><h3>常见阻断规则</h3><span>{{ dateRange[0] }} 至 {{ dateRange[1] }}</span></header>
            <a-table :data="metrics?.commonBlockerRules || []" :pagination="false" size="small">
              <template #columns>
                <a-table-column title="规则" data-index="ruleCode" />
                <a-table-column title="阻断评审数" data-index="count" :width="140" align="right" />
              </template>
              <template #empty><a-empty description="当前周期无阻断规则" /></template>
            </a-table>
          </section>
        </template>
      </a-tab-pane>

      <a-tab-pane key="policy" title="项目策略">
        <a-empty v-if="!projectId" description="请选择项目配置评审策略" />
        <section v-else class="policy-section">
          <header><div><h3>评审与执行门禁</h3><span>策略版本 {{ policy.version ?? 0 }} · {{ policy.updateTime ? `更新于 ${formatTime(policy.updateTime)}` : '使用默认策略' }}</span></div><a-tag :color="policy.mode === 'ENFORCE' ? 'orangered' : 'arcoblue'">{{ policy.mode === 'ENFORCE' ? '强制门禁' : '观测模式' }}</a-tag></header>
          <a-form :model="policy" layout="vertical" class="policy-form">
            <a-form-item label="运行模式">
              <a-radio-group v-model="policy.mode" type="button" :disabled="!canAdmin"><a-radio value="OBSERVE">观测</a-radio><a-radio value="ENFORCE">强制</a-radio></a-radio-group>
            </a-form-item>
            <a-form-item label="最少批准人数"><a-input-number v-model="policy.requiredApprovals" :min="1" :max="20" :disabled="!canAdmin" /></a-form-item>
            <a-form-item label="评审时限（小时）"><a-input-number v-model="policy.reviewSlaHours" :min="1" :max="720" :disabled="!canAdmin" /></a-form-item>
            <a-form-item label="要求当前版本执行证据"><a-switch v-model="policy.executionEvidenceRequired" :disabled="!canAdmin" /></a-form-item>
            <a-form-item label="证据有效期（小时）"><a-input-number v-model="policy.executionEvidenceMaxAgeHours" :min="1" :max="8760" :disabled="!canAdmin || !policy.executionEvidenceRequired" /></a-form-item>
          </a-form>
          <footer v-if="canAdmin"><a-button type="primary" :loading="policySaving" @click="savePolicy"><template #icon><icon-save /></template>保存策略</a-button></footer>
        </section>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:visible="assignVisible" title="分配评审人" :ok-loading="assignLoading" @before-ok="assignReviewers">
      <a-form layout="vertical">
        <a-form-item label="已选评审单"><a-tag>{{ selectedReviewIds.length }} 项</a-tag></a-form-item>
        <a-form-item label="新增评审人" required>
          <a-select v-model="assignReviewerIds" :options="reviewerOptions" multiple allow-search placeholder="选择至少一名评审人" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import type { ReviewGovernanceMetrics, ReviewPolicy, ReviewQueue, ReviewQueueItem, ReviewStatus } from '@/apis/automation/automationUiCaseReview'
import { batchAssignAutomationUiCaseReviewers, getAutomationUiCaseReviewMetrics, getAutomationUiCaseReviewPolicy, getMyAutomationUiCaseReviewQueue, listAutomationUiCaseReviewEligibleReviewers, updateAutomationUiCaseReviewPolicy } from '@/apis/automation/automationUiCaseReview'
import { type ProjectConfigResp, getProjectConfigList } from '@/apis/project/projectConfig'
import has from '@/utils/has'

const router = useRouter()
const activeTab = ref('queue')
const projectId = ref<string>()
const projectOptions = ref<Array<{ label: string, value: string }>>([])
const projects = ref<ProjectConfigResp[]>([])
const reviewerOptions = ref<Array<{ label: string, value: string }>>([])
const loading = computed(() => queueLoading.value || metricsLoading.value || policyLoading.value)
const queueLoading = ref(false)
const metricsLoading = ref(false)
const policyLoading = ref(false)
const policySaving = ref(false)
const assignLoading = ref(false)
const assignVisible = ref(false)
const assignReviewerIds = ref<string[]>([])
const selectedReviewIds = ref<string[]>([])
const queueScope = ref<keyof ReviewQueue>('pending')
const queue = reactive<ReviewQueue>({ pending: [], submitted: [], outdated: [], dueSoon: [] })
const metrics = ref<ReviewGovernanceMetrics>()
const dateRange = ref<[string, string]>([dayjs().subtract(29, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')])
const policy = reactive<ReviewPolicy>({ mode: 'OBSERVE', requiredApprovals: 1, executionEvidenceRequired: false, executionEvidenceMaxAgeHours: 168, reviewSlaHours: 48, version: 0 })
const defaultPolicy = (): ReviewPolicy => ({ mode: 'OBSERVE', requiredApprovals: 1, executionEvidenceRequired: false, executionEvidenceMaxAgeHours: 168, reviewSlaHours: 48, version: 0 })
let queueRequestSequence = 0
let metricsRequestSequence = 0
let policyRequestSequence = 0
const canAdmin = computed(() => has.hasPerm('automation:automationUiScene:review:admin'))
const visibleQueue = computed(() => queue[queueScope.value])

const statusMeta: Record<ReviewStatus, { label: string, color: string }> = {
  NOT_SUBMITTED: { label: '未提交', color: 'gray' }, IN_REVIEW: { label: '待评审', color: 'arcoblue' }, CHANGES_REQUESTED: { label: '需修改', color: 'orangered' }, APPROVED: { label: '已通过', color: 'green' }, REJECTED: { label: '已拒绝', color: 'red' }, OUTDATED: { label: '已过期', color: 'gold' }, WITHDRAWN: { label: '已撤回', color: 'gray' },
}

const formatTime = (value?: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
const formatMetric = (value?: number, unit = '') => value == null ? '-' : `${value}${unit}`

async function loadQueue() {
  const sequence = ++queueRequestSequence
  const requestedProjectId = projectId.value
  Object.assign(queue, { pending: [], submitted: [], outdated: [], dueSoon: [] })
  selectedReviewIds.value = []
  queueLoading.value = true
  try {
    const { data } = await getMyAutomationUiCaseReviewQueue(requestedProjectId)
    if (sequence !== queueRequestSequence || requestedProjectId !== projectId.value) return
    Object.assign(queue, data || { pending: [], submitted: [], outdated: [], dueSoon: [] })
    selectedReviewIds.value = []
  } finally { if (sequence === queueRequestSequence) queueLoading.value = false }
}

async function loadMetrics() {
  const sequence = ++metricsRequestSequence
  const requestedProjectId = projectId.value
  metrics.value = undefined
  if (!requestedProjectId) { metricsLoading.value = false; return }
  metricsLoading.value = true
  try {
    const data = (await getAutomationUiCaseReviewMetrics({ projectId: requestedProjectId, from: dateRange.value[0], to: dateRange.value[1] })).data
    if (sequence === metricsRequestSequence && requestedProjectId === projectId.value) metrics.value = data
  } finally { if (sequence === metricsRequestSequence) metricsLoading.value = false }
}

async function loadPolicy() {
  const sequence = ++policyRequestSequence
  const requestedProjectId = projectId.value
  Object.assign(policy, defaultPolicy())
  if (!requestedProjectId) { policyLoading.value = false; return }
  policyLoading.value = true
  try {
    const data = (await getAutomationUiCaseReviewPolicy(requestedProjectId)).data
    if (sequence === policyRequestSequence && requestedProjectId === projectId.value) Object.assign(policy, data)
  } finally { if (sequence === policyRequestSequence) policyLoading.value = false }
}

async function savePolicy() {
  const requestedProjectId = projectId.value
  if (!requestedProjectId) return
  policySaving.value = true
  try {
    const data = (await updateAutomationUiCaseReviewPolicy(requestedProjectId, { mode: policy.mode, requiredApprovals: policy.requiredApprovals, executionEvidenceRequired: policy.executionEvidenceRequired, executionEvidenceMaxAgeHours: policy.executionEvidenceMaxAgeHours, reviewSlaHours: policy.reviewSlaHours, expectedVersion: policy.version || 0 })).data
    if (requestedProjectId === projectId.value) Object.assign(policy, data)
    Message.success('评审策略已保存')
  } finally { policySaving.value = false }
}

async function openAssign() {
  assignReviewerIds.value = []
  reviewerOptions.value = []
  const selectedRows = queue.pending.filter(item => selectedReviewIds.value.includes(item.reviewId))
  const projectIds = [...new Set(selectedRows.map(item => item.projectId))]
  if (projectIds.length !== 1) {
    Message.warning('批量分配只能选择同一项目的评审单')
    return
  }
  const submitters = new Set(selectedRows.map(item => item.submitterId))
  const { data } = await listAutomationUiCaseReviewEligibleReviewers(projectIds[0])
  reviewerOptions.value = data
    .map(item => ({ label: item.name, value: String(item.id) }))
    .filter(item => !submitters.has(item.value))
  assignVisible.value = true
}
async function assignReviewers() {
  if (!assignReviewerIds.value.length) { Message.warning('请选择至少一名评审人'); return false }
  const rows = queue.pending.filter(item => selectedReviewIds.value.includes(item.reviewId))
  const expectedVersions = Object.fromEntries(rows.map(item => [item.reviewId, item.version]))
  assignLoading.value = true
  try {
    Object.assign(queue, (await batchAssignAutomationUiCaseReviewers({ reviewIds: selectedReviewIds.value, reviewerIds: assignReviewerIds.value, expectedVersions }, projectId.value)).data)
    selectedReviewIds.value = []
    Message.success('评审人已分配')
    return true
  } finally { assignLoading.value = false }
}

function openScene(record: ReviewQueueItem) {
  router.push({ path: '/automation/automationUiScene', query: { sceneId: record.sceneId, caseId: record.caseId, view: 'review' } })
}

async function reloadActive() {
  if (activeTab.value === 'queue') await loadQueue()
  else if (activeTab.value === 'metrics') await loadMetrics()
  else await loadPolicy()
}
function handleTabChange() { void reloadActive() }
function handleProjectChange() { void reloadActive() }

onMounted(async () => {
  const projectResponse = await getProjectConfigList({ status: 1, sort: ['name,asc'] })
  projects.value = projectResponse.data || []
  projectOptions.value = projects.value.map(item => ({ label: item.name || item.id, value: item.id }))
  projectId.value = projectOptions.value[0]?.value
  await loadQueue()
})

watch(queueScope, () => { selectedReviewIds.value = [] })
</script>

<style scoped lang="scss">
.review-governance-page { min-height: 100%; padding: 16px; background: var(--color-bg-1); }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--color-border-2); }
.page-toolbar h2, .policy-section h3, .blocker-section h3 { margin: 0; font-size: 18px; letter-spacing: 0; }
.page-toolbar span, .policy-section header span, .blocker-section header span { color: var(--color-text-3); font-size: 12px; }
.project-select { width: 240px; }
.governance-tabs { margin-top: 8px; }
.queue-toolbar, .metrics-filter, .policy-section header, .blocker-section header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.primary-cell { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.primary-cell strong, .primary-cell span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.primary-cell span, .primary-cell small { color: var(--color-text-3); }
.overdue { color: rgb(var(--red-6)); font-weight: 600; }
.metrics-filter { justify-content: flex-start; }
.metric-strip { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); border: 1px solid var(--color-border-2); }
.metric-strip > div { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 4px 12px; min-height: 82px; padding: 14px; border-right: 1px solid var(--color-border-2); }
.metric-strip > div:last-child { border-right: 0; }
.metric-strip span, .metric-strip small { color: var(--color-text-3); font-size: 12px; }
.metric-strip strong { grid-row: span 2; font-size: 24px; letter-spacing: 0; }
.blocker-section, .policy-section { margin-top: 16px; border: 1px solid var(--color-border-2); padding: 16px; }
.policy-section { max-width: 920px; }
.policy-section header > div { display: flex; flex-direction: column; gap: 3px; }
.policy-form { display: grid; grid-template-columns: repeat(2, minmax(240px, 1fr)); gap: 0 24px; max-width: 760px; }
.policy-section footer { display: flex; justify-content: flex-end; padding-top: 8px; border-top: 1px solid var(--color-border-2); }
@media (max-width: 820px) {
  .review-governance-page { padding: 12px; }
  .page-toolbar, .queue-toolbar { align-items: stretch; flex-direction: column; }
  .project-select { width: min(100%, 320px); }
  .metric-strip { grid-template-columns: repeat(2, minmax(130px, 1fr)); }
  .metric-strip > div:nth-child(2) { border-right: 0; }
  .metric-strip > div:nth-child(-n+2) { border-bottom: 1px solid var(--color-border-2); }
  .policy-form { grid-template-columns: 1fr; }
}
</style>
