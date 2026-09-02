<template>
  <div class="review-workbench">
    <a-empty v-if="!caseId" description="请从左侧选择一个用例" />
    <a-skeleton v-else-if="loading && !review" :animation="true"><a-skeleton-line :rows="8" /></a-skeleton>
    <a-result v-else-if="loadError" status="error" title="评审数据加载失败" :subtitle="loadError">
      <template #extra><a-button @click="loadReview">重新加载</a-button></template>
    </a-result>
    <template v-else-if="review">
      <header class="review-header">
        <div class="review-identity">
          <div class="title-line">
            <strong>{{ review.caseName }}</strong>
            <span>{{ review.caseId }}</span>
            <a-tag :color="statusMeta.color">{{ statusMeta.label }}</a-tag>
          </div>
          <div class="review-meta">
            <span>定义 v{{ review.definitionVersion }}</span>
            <span v-if="review.roundNo">第 {{ review.roundNo }} 轮</span>
            <span v-if="review.submitterName">{{ review.submitterName }} · {{ formatTime(review.submittedAt) }}</span>
            <span v-if="review.policy.mode === 'OBSERVE'">观测模式</span>
          </div>
        </div>
        <div class="review-header-right">
          <a-space class="review-actions" wrap>
            <a-button v-if="canWithdraw" size="small" @click="confirmWithdraw">撤回</a-button>
            <a-button v-if="canRemind" size="small" @click="handleRemind">
              <template #icon><icon-notification /></template>催办
            </a-button>
            <a-button v-if="canRequestChanges" size="small" status="danger" @click="openDecision('CHANGES_REQUESTED')">要求修改</a-button>
            <a-dropdown v-if="canApprove">
              <a-button size="small">
                <template #icon><icon-more /></template>
                更多
              </a-button>
              <template #content>
                <a-doption @click="openDecision('REJECTED')">拒绝</a-doption>
              </template>
            </a-dropdown>
            <a-button v-if="canApprove" size="small" type="primary" @click="openDecision('APPROVED')">
              <template #icon><icon-check /></template>通过评审
            </a-button>
            <a-button v-if="canRevoke" size="small" @click="confirmRevoke">撤销批准</a-button>
            <a-button v-if="canSubmit" size="small" type="primary" @click="openSubmit">
              {{ ['OUTDATED', 'CHANGES_REQUESTED', 'REJECTED'].includes(review.status) ? '提交新版本' : '提交评审' }}
            </a-button>
          </a-space>
          <a-radio-group v-model="displayMode" type="button" size="small" class="review-mode-switch" aria-label="评审工作台模式">
            <a-radio value="full">完整</a-radio>
            <a-radio value="simple">简洁</a-radio>
          </a-radio-group>
        </div>
      </header>

      <template v-if="displayMode === 'simple'">
        <a-alert v-if="review.outdated" type="warning" class="context-alert">
          当前用例内容已不同于本轮评审快照，旧结论和意见保留只读，请提交新版本。
        </a-alert>
        <a-alert v-if="!review.outdated && review.checkRunStatus === 'FAILED'" type="error" class="context-alert">
          最新自动检查执行失败，当前显示的是上一次成功结果。请重试检查；持续失败时联系管理员。
        </a-alert>
        <a-alert v-if="!review.outdated && selectedStepId" type="info" class="context-alert">
          当前只显示步骤 {{ selectedStepId }} 相关风险与意见，评审结论仍作用于父用例。
        </a-alert>

        <section class="simple-decision-bar">
          <div>
            <span>当前结论</span>
            <strong :class="`simple-status-${statusMeta.color}`">{{ statusMeta.label }}</strong>
            <small v-if="review.submitterName">提交人：{{ review.submitterName }}</small>
          </div>
          <a-link @click="switchToFull('history')">查看评审记录</a-link>
        </section>

        <div class="simple-metrics">
          <button type="button" @click="switchToFull('overview')">
            <span>自动检查</span><strong>{{ review.metrics.checkPassed }}/{{ review.metrics.checkTotal }}</strong><small>通过</small>
          </button>
          <button type="button" :class="{ 'simple-metric-danger': review.metrics.blockerCount > 0 }" @click="switchToFull('overview')">
            <span>待处理阻断</span><strong>{{ review.metrics.blockerCount }}</strong><small>项</small>
          </button>
          <button type="button" @click="switchToFull('comments')">
            <span>开放意见</span><strong>{{ review.metrics.openCommentCount }}</strong><small>线程</small>
          </button>
          <button type="button" @click="switchToFull('overview')">
            <span>执行证据</span><strong :class="review.evidence ? evidenceFresh ? 'success' : 'warning' : 'muted'">{{ !review.evidence ? '无' : evidenceFresh ? '有效' : '过期' }}</strong><small>{{ review.evidence ? formatTime(review.evidence.finishedAt) : '当前版本' }}</small>
          </button>
        </div>

        <div class="simple-content-grid">
          <section class="simple-section">
            <header>
              <div><strong>需要关注的问题</strong><small>只显示影响决策的检查项</small></div>
              <a-link @click="switchToFull('overview')">查看完整检查</a-link>
            </header>
            <div v-if="simpleIssues.length" class="simple-issue-list">
              <div v-for="item in simpleIssues" :key="item.id" class="simple-issue-row">
                <a-tag size="small" :color="item.effectiveSeverity === 'BLOCKER' ? 'red' : 'orangered'">{{ item.effectiveSeverity }}</a-tag>
                <span>{{ item.message }}</span>
                <a-link v-if="item.anchors.length" @click="handleAnchor(item.anchors[0])">定位</a-link>
              </div>
            </div>
            <a-empty v-else description="暂无阻断检查项" />
          </section>

          <section class="simple-section">
            <header>
              <div><strong>本次变更</strong><small>{{ diff?.baseline === 'PREVIOUS_APPROVED' ? '相对上一个已批准版本' : '首次提交' }}</small></div>
              <a-link @click="switchToFull('diff')">查看完整 Diff</a-link>
            </header>
            <div v-if="diff" class="simple-change-counts">
              <span>新增 <strong>{{ diff.added }}</strong></span>
              <span>修改 <strong>{{ diff.modified }}</strong></span>
              <span>删除 <strong>{{ diff.deleted }}</strong></span>
            </div>
            <a-skeleton v-else-if="diffLoading" :animation="true"><a-skeleton-line :rows="1" /></a-skeleton>
            <a-empty v-else description="提交评审后生成结构化变更" />
          </section>

          <section class="simple-section">
            <header>
              <div><strong>执行证据</strong><small>只认可当前内容版本</small></div>
              <a-link v-if="review.evidence?.reportUrl" :href="review.evidence.reportUrl" target="_blank" rel="noopener noreferrer">查看报告</a-link>
            </header>
            <div v-if="review.evidence" class="simple-evidence">
              <icon-check-circle-fill />
              <div><strong>{{ review.evidence.result }}</strong><span>{{ review.evidence.triggerType }} · {{ review.evidence.environmentName || '未标记环境' }} · {{ formatDuration(review.evidence.durationMs) }}</span></div>
              <time>{{ formatTime(review.evidence.finishedAt) }}</time>
            </div>
            <a-empty v-else description="当前版本暂无成功执行证据" />
          </section>

          <section class="simple-section simple-next-step">
            <header><div><strong>下一步</strong><small>{{ review.metrics.approvedCount }}/{{ review.requiredApprovals || 1 }} 名评审人已批准</small></div><a-link @click="switchToFull('overview')">查看评审清单</a-link></header>
            <p>{{ simpleNextStep }}</p>
            <a-button v-if="canComment" size="small" @click="openComment()"><template #icon><icon-message /></template>新增意见</a-button>
          </section>
        </div>
      </template>
      <template v-else>
      <a-alert v-if="review.outdated" type="warning" class="context-alert">
        当前用例内容已不同于本轮评审快照，旧结论和意见保留只读，请提交新版本。
      </a-alert>
      <a-alert v-if="!review.outdated && review.checkRunStatus === 'FAILED'" type="error" class="context-alert">
        最新自动检查执行失败，当前显示的是上一次成功结果。请重试检查；持续失败时联系管理员。
      </a-alert>
      <a-alert v-if="!review.outdated && selectedStepId" type="info" class="context-alert">
        当前只显示步骤 {{ selectedStepId }} 相关风险与意见，评审结论仍作用于父用例。
      </a-alert>

      <div class="risk-strip">
        <button type="button" @click="view = 'overview'">
          <span>自动检查</span><strong>{{ review.metrics.checkPassed }}/{{ review.metrics.checkTotal }}</strong><small>通过</small>
        </button>
        <button type="button" @click="view = 'overview'">
          <span>阻断项</span><strong :class="{ danger: review.metrics.blockerCount > 0 }">{{ review.metrics.blockerCount }}</strong><small>待处理</small>
        </button>
        <button type="button" @click="view = 'comments'">
          <span>开放意见</span><strong>{{ review.metrics.openCommentCount }}</strong><small>线程</small>
        </button>
        <button type="button" @click="view = 'overview'">
          <span>版本验证</span><strong :class="review.evidence ? 'success' : 'muted'">{{ review.evidence ? '已验证' : '无证据' }}</strong><small>{{ review.evidence ? formatTime(review.evidence.finishedAt) : '当前哈希' }}</small>
        </button>
      </div>

      <a-tabs v-model:active-key="view" size="small" class="review-tabs" @change="handleViewChange">
        <a-tab-pane key="overview" title="评审概览">
          <div v-if="compactReviewSidebar" class="compact-sidebar-trigger">
            <a-button size="small" @click="sidebarVisible = true">
              <template #icon><icon-list /></template>
              评审清单与结论
            </a-button>
          </div>
          <div class="overview-layout">
            <main>
              <AutomationCaseReviewChecks
                :checks="contextChecks"
                :can-recheck="canRecheck"
                :loading="actionLoading"
                @recheck="handleRecheck"
                @anchor="handleAnchor"
              />
              <section class="change-summary">
                <header><strong>本次变更</strong><a-link v-if="review.id" @click="openDiff">查看完整变更</a-link></header>
                <div v-if="diff">
                  <span>新增 {{ diff.added }}</span><span>修改 {{ diff.modified }}</span><span>删除 {{ diff.deleted }}</span>
                  <small>{{ diff.baseline === 'PREVIOUS_APPROVED' ? '相对上一个已批准版本' : '首次提交' }}</small>
                </div>
                <a-skeleton v-else-if="diffLoading" :animation="true"><a-skeleton-line :rows="1" /></a-skeleton>
                <a-empty v-else description="提交评审后生成结构化变更" />
              </section>
              <section class="evidence-section">
                <header><strong>执行证据</strong><a-tag v-if="review.evidence" :color="evidenceFresh ? 'green' : 'orange'">{{ evidenceFresh ? '版本与时效有效' : '版本一致但已过期' }}</a-tag></header>
                <div v-if="review.evidence" class="evidence-row">
                  <icon-check-circle-fill />
                  <div><strong>{{ review.evidence.result }}</strong><span>{{ review.evidence.triggerType }} · {{ review.evidence.environmentName || '未标记环境' }} · {{ formatDuration(review.evidence.durationMs) }}</span></div>
                  <time>{{ formatTime(review.evidence.finishedAt) }}</time>
                  <a-link v-if="review.evidence.reportUrl" :href="review.evidence.reportUrl" target="_blank" rel="noopener noreferrer">报告</a-link>
                </div>
                <a-empty v-else description="当前评审版本暂无成功执行证据" />
              </section>
            </main>
            <aside v-if="!compactReviewSidebar">
              <AutomationCaseReviewSidebar
                :items="review.checklist"
                :reviewers="review.reviewers"
                :editable="canEditChecklist"
                :loading="actionLoading"
                :approved-count="review.metrics.approvedCount"
                :required-approvals="review.requiredApprovals || 1"
                @change="handleChecklist"
              />
            </aside>
          </div>
        </a-tab-pane>
        <a-tab-pane key="diff" title="变更对比">
          <AutomationCaseReviewDiff :diff="diff" :loading="diffLoading" />
        </a-tab-pane>
        <a-tab-pane key="comments" title="全部意见">
              <AutomationCaseReviewThreads
                :comments="contextComments"
                :can-comment="canComment"
                :can-admin="isReviewAdmin"
                :current-user-id="currentUserId"
                @add="openComment()"
            @reply="openComment"
            @resolve="openResolve"
            @reopen="handleReopen"
          />
        </a-tab-pane>
        <a-tab-pane key="history" title="评审记录">
          <a-skeleton v-if="historyLoading" :animation="true"><a-skeleton-line :rows="5" /></a-skeleton>
          <a-empty v-else-if="!history.length" description="暂无评审记录" />
          <a-timeline v-else class="history-timeline">
            <a-timeline-item v-for="item in history" :key="item.id" :label="formatTime(item.submittedAt)">
              <strong>第 {{ item.roundNo }} 轮 · {{ statusOptions[item.status]?.label || item.status }}</strong>
              <p>{{ item.submitterName }}<span v-if="item.summary"> · {{ item.summary }}</span></p>
            </a-timeline-item>
          </a-timeline>
        </a-tab-pane>
      </a-tabs>

      <a-drawer
        v-model:visible="sidebarVisible"
        title="评审清单与结论"
        :width="width >= 520 ? 380 : '100%'"
        :footer="false"
        unmount-on-close
      >
        <AutomationCaseReviewSidebar
          :items="review.checklist"
          :reviewers="review.reviewers"
          :editable="canEditChecklist"
          :loading="actionLoading"
          :approved-count="review.metrics.approvedCount"
          :required-approvals="review.requiredApprovals || 1"
          @change="handleChecklist"
        />
      </a-drawer>
      </template>
    </template>

    <a-modal v-model:visible="submitVisible" title="提交用例评审" :ok-loading="actionLoading" @before-ok="handleSubmit">
      <a-form :model="submitForm" layout="vertical">
        <a-form-item label="评审人" required>
          <a-select v-model="submitForm.reviewerIds" multiple allow-search :loading="userLoading" :placeholder="`选择至少 ${requiredReviewerCount} 名评审人`">
            <a-option v-for="item in reviewerOptions" :key="item.value" :value="item.value">{{ item.label }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="提交说明"><a-textarea v-model="submitForm.summary" :max-length="2000" show-word-limit /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="decisionVisible" :title="decisionForm.decision === 'APPROVED' ? '通过评审' : decisionForm.decision === 'REJECTED' ? '拒绝评审' : '要求修改'" :ok-loading="actionLoading" @before-ok="handleDecision">
      <a-form :model="decisionForm" layout="vertical">
        <a-form-item label="结论说明" :required="decisionForm.decision === 'REJECTED'">
          <a-textarea v-model="decisionForm.comment" :max-length="2000" show-word-limit />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="commentVisible" :title="commentForm.parentId ? '回复意见' : '新增评审意见'" :ok-loading="actionLoading" @before-ok="handleComment">
      <a-form :model="commentForm" layout="vertical">
        <a-form-item v-if="!commentForm.parentId" label="严重级别" required>
          <a-radio-group v-model="commentForm.severity" type="button">
            <a-radio value="BLOCKER">阻断</a-radio><a-radio value="MAJOR">重要</a-radio><a-radio value="MINOR">一般</a-radio><a-radio value="SUGGESTION">建议</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="!commentForm.parentId" label="锚定步骤"><a-input v-model="commentForm.stepId" placeholder="可选，默认当前步骤" /></a-form-item>
        <a-form-item label="意见内容" required><a-textarea v-model="commentForm.content" :max-length="4000" show-word-limit /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="resolveVisible" title="处理评审意见" :ok-loading="actionLoading" @before-ok="handleResolve">
      <a-form :model="resolveForm" layout="vertical">
        <a-form-item label="处理方式" required>
          <a-radio-group v-model="resolveForm.resolutionType" type="button">
            <a-radio value="FIXED">已修改</a-radio><a-radio value="EVIDENCED">已有证据</a-radio><a-radio value="WONT_FIX">不处理</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="说明" :required="resolveForm.resolutionType === 'WONT_FIX'">
          <a-textarea v-model="resolveForm.reason" :max-length="1000" show-word-limit />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import dayjs from 'dayjs'
import { Message, Modal } from '@arco-design/web-vue'
import AutomationCaseReviewChecks from './AutomationCaseReviewChecks.vue'
import AutomationCaseReviewDiff from './AutomationCaseReviewDiff.vue'
import AutomationCaseReviewSidebar from './AutomationCaseReviewSidebar.vue'
import AutomationCaseReviewThreads from './AutomationCaseReviewThreads.vue'
import {
  type AutomationUiCaseReview,
  type ReviewComment,
  type ReviewCheck,
  type ReviewDiff,
  type ReviewStatus,
  addAutomationUiCaseReviewComment,
  decideAutomationUiCaseReview,
  getAutomationUiCaseReview,
  getAutomationUiCaseReviewDiff,
  listAutomationUiCaseReviews,
  listAutomationUiCaseReviewEligibleReviewers,
  recheckAutomationUiCaseReview,
  remindAutomationUiCaseReview,
  resolveAutomationUiCaseReviewComment,
  revokeAutomationUiCaseReviewApproval,
  submitAutomationUiCaseReview,
  updateAutomationUiCaseReviewChecklist,
  withdrawAutomationUiCaseReview,
} from '@/apis/automation/automationUiCaseReview'
import { useUserStore } from '@/stores'
import has from '@/utils/has'

const props = defineProps<{
  sceneId?: string | number
  projectId?: string | number
  definitionVersion?: number
  caseId?: string
  selectedStepId?: string
  readonly?: boolean
}>()
const emit = defineEmits<{ (e: 'select-step', stepId: string): void }>()
const userStore = useUserStore()
const { width } = useWindowSize()
const compactReviewSidebar = computed(() => width.value < 980)
const sidebarVisible = ref(false)
type ReviewDisplayMode = 'full' | 'simple'
const readDisplayMode = (): ReviewDisplayMode => {
  try { return typeof window !== 'undefined' && window.localStorage.getItem('automation-case-review-display-mode') === 'simple' ? 'simple' : 'full' } catch { return 'full' }
}
const displayMode = ref<ReviewDisplayMode>(readDisplayMode())
const review = ref<AutomationUiCaseReview>()
const diff = ref<ReviewDiff>()
const history = ref<AutomationUiCaseReview[]>([])
const loading = ref(false)
const actionLoading = ref(false)
const diffLoading = ref(false)
const historyLoading = ref(false)
const loadError = ref('')
const view = ref('overview')
const reviewerOptions = ref<Array<{ label: string, value: string }>>([])
const userLoading = ref(false)
let requestSequence = 0

const statusOptions: Record<ReviewStatus, { label: string, color: string }> = {
  NOT_SUBMITTED: { label: '未提交', color: 'gray' }, IN_REVIEW: { label: '待评审', color: 'arcoblue' }, CHANGES_REQUESTED: { label: '需修改', color: 'orangered' }, APPROVED: { label: '已通过', color: 'green' }, REJECTED: { label: '已拒绝', color: 'red' }, OUTDATED: { label: '已过期', color: 'gold' }, WITHDRAWN: { label: '已撤回', color: 'gray' },
}
const statusMeta = computed(() => statusOptions[review.value?.status || 'NOT_SUBMITTED'])
const currentUserId = computed(() => String(userStore.userInfo.id || ''))
const isSubmitter = computed(() => Boolean(review.value?.submitterId) && String(review.value?.submitterId) === currentUserId.value)
const isReviewer = computed(() => review.value?.reviewers.some(item => String(item.id) === currentUserId.value) || false)
const currentReviewer = computed(() => review.value?.reviewers.find(item => String(item.id) === currentUserId.value))
const isReviewAdmin = computed(() => has.hasPerm('automation:automationUiScene:review:admin'))
const canWrite = computed(() => !props.readonly && Boolean(review.value))
const hasBlockingReviewFeedback = computed(() => Boolean(review.value?.reviewers.some(item => ['CHANGES_REQUESTED', 'REJECTED'].includes(item.decision))
  || review.value?.comments.some(item => !item.parentId && ['BLOCKER', 'MAJOR'].includes(item.severity || '') && item.resolution === 'OPEN')))
const canSubmit = computed(() => {
  if (!canWrite.value || !review.value?.currentCaseContentHash || !has.hasPerm('automation:automationUiScene:review:submit')) return false
  const status = review.value.status || ''
  if (!['NOT_SUBMITTED', 'OUTDATED', 'CHANGES_REQUESTED', 'REJECTED', 'WITHDRAWN'].includes(status)) return false
  if (status === 'WITHDRAWN' && hasBlockingReviewFeedback.value && review.value.currentCaseContentHash === review.value.caseContentHash) return false
  return !['CHANGES_REQUESTED', 'REJECTED'].includes(status) || review.value.currentCaseContentHash !== review.value.caseContentHash
})
const canWithdraw = computed(() => canWrite.value && has.hasPerm('automation:automationUiScene:review:submit') && (isSubmitter.value || isReviewAdmin.value) && ['IN_REVIEW', 'CHANGES_REQUESTED'].includes(review.value?.status || ''))
const canRemind = computed(() => canWrite.value && has.hasPerm('automation:automationUiScene:review:submit') && (isSubmitter.value || isReviewAdmin.value) && review.value?.status === 'IN_REVIEW')
const canApprove = computed(() => canWrite.value && has.hasPerm('automation:automationUiScene:review:approve') && !isSubmitter.value && review.value?.status === 'IN_REVIEW' && (currentReviewer.value?.decision === 'PENDING' || (isReviewAdmin.value && !isReviewer.value)))
const canRequestChanges = canApprove
const canRevoke = computed(() => canWrite.value && has.hasPerm('automation:automationUiScene:review:approve') && ['IN_REVIEW', 'APPROVED'].includes(review.value?.status || '') && currentReviewer.value?.decision === 'APPROVED')
const canRecheck = computed(() => canWrite.value && has.hasPerm('automation:automationUiScene:review:submit') && review.value?.status === 'IN_REVIEW')
const canComment = computed(() => canWrite.value && has.hasPerm('automation:automationUiScene:review:comment') && Boolean(review.value?.id) && ['IN_REVIEW', 'CHANGES_REQUESTED'].includes(review.value?.status || ''))
const canEditChecklist = computed(() => canWrite.value && has.hasPerm('automation:automationUiScene:review:approve') && isReviewer.value && currentReviewer.value?.decision === 'PENDING' && review.value?.status === 'IN_REVIEW')
const contextChecks = computed(() => !props.selectedStepId ? review.value?.checks || [] : (review.value?.checks || []).filter(item => !item.anchors.length || item.anchors.some(anchor => anchor.stepId === props.selectedStepId)))
const contextComments = computed(() => {
  const comments = review.value?.comments || []
  if (!props.selectedStepId) return comments
  const rootIds = new Set(comments.filter(item => !item.parentId && item.stepId === props.selectedStepId).map(item => item.threadId))
  return comments.filter(item => rootIds.has(item.threadId))
})
const simpleIssues = computed<ReviewCheck[]>(() => (review.value?.checks || []).filter(item => item.result === 'FAIL' && ['BLOCKER', 'MAJOR'].includes(item.effectiveSeverity)).slice(0, 5))
const requiredReviewerCount = computed(() => Math.max(1, review.value?.policy.requiredApprovals || 1))
const evidenceFresh = computed(() => {
  if (!review.value?.evidence?.finishedAt) return false
  if (!review.value.policy.executionEvidenceRequired) return true
  const maxAgeHours = Math.max(1, review.value.policy.executionEvidenceMaxAgeHours || 1)
  return dayjs(review.value.evidence.finishedAt).isAfter(dayjs().subtract(maxAgeHours, 'hour'))
})
const simpleNextStep = computed(() => {
  if (review.value?.outdated || review.value?.status === 'OUTDATED') return '当前版本已过期，请提交新版本后重新评审。'
  if (review.value?.status === 'IN_REVIEW') return '请处理关注项并完成评审结论。'
  if (review.value?.status === 'CHANGES_REQUESTED') return '请处理评审意见，修改用例后提交新版本。'
  if (review.value?.status === 'REJECTED') return '评审已拒绝；如需继续，请修改用例后提交新版本。'
  if (review.value?.status === 'APPROVED') return '当前版本已通过评审，可按项目策略执行。'
  if (review.value?.status === 'WITHDRAWN') return hasBlockingReviewFeedback.value ? '本轮反馈仍然有效，请修改用例内容后再提交。' : '本轮已撤回，可重新提交评审。'
  return '请选择评审人并提交当前版本。'
})

const formatTime = (value?: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
const formatDuration = (value?: number) => value == null ? '-' : value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`

const loadReview = async () => {
  const sequence = ++requestSequence
  review.value = undefined
  reviewerOptions.value = []
  diff.value = undefined
  history.value = []
  diffLoading.value = false
  historyLoading.value = false
  loadError.value = ''
  if (!props.sceneId || !props.caseId) return
  loading.value = true
  try {
    const { data } = await getAutomationUiCaseReview(props.sceneId, props.caseId)
    if (sequence === requestSequence) {
      review.value = data
      if (data.id) void loadDiff(data.id, sequence)
    }
  } catch (error: any) {
    if (sequence === requestSequence) loadError.value = error?.message || '无法读取评审数据'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}
const loadDiff = async (reviewId: string, sequence = requestSequence) => {
  if (!props.sceneId || !props.caseId) return
  diffLoading.value = true
  try {
    const data = (await getAutomationUiCaseReviewDiff(props.sceneId, props.caseId, reviewId)).data
    if (sequence === requestSequence && review.value?.id === reviewId) diff.value = data
  } finally {
    if (sequence === requestSequence) diffLoading.value = false
  }
}
const loadHistory = async () => {
  if (!props.sceneId || !props.caseId || historyLoading.value) return
  const sequence = requestSequence
  historyLoading.value = true
  try {
    const data = (await listAutomationUiCaseReviews(props.sceneId, props.caseId)).data
    if (sequence === requestSequence) history.value = data
  } finally {
    if (sequence === requestSequence) historyLoading.value = false
  }
}
watch(displayMode, value => {
  try { if (typeof window !== 'undefined') window.localStorage.setItem('automation-case-review-display-mode', value) } catch { /* storage may be disabled */ }
})
watch(() => [props.sceneId, props.caseId, props.definitionVersion], loadReview, { immediate: true })
const handleViewChange = (key: string | number) => { if (key === 'history') void loadHistory(); if (key === 'diff' && review.value?.id && !diff.value) void loadDiff(review.value.id) }
const openDiff = () => { view.value = 'diff'; if (review.value?.id && !diff.value) void loadDiff(review.value.id) }
const switchToFull = (target: string) => { displayMode.value = 'full'; view.value = target; handleViewChange(target) }
const handleAnchor = (anchor: { stepId?: string }) => { if (anchor.stepId) emit('select-step', anchor.stepId) }

const submitVisible = ref(false)
const submitForm = reactive({ reviewerIds: [] as string[], summary: '' })
const openSubmit = async () => {
  submitForm.reviewerIds = []
  submitForm.summary = ''
  submitVisible.value = true
  userLoading.value = true
  try {
    if (!props.projectId) return
    const { data } = await listAutomationUiCaseReviewEligibleReviewers(props.projectId)
    reviewerOptions.value = data
      .map(item => ({ label: item.name, value: String(item.id) }))
      .filter(item => item.value !== currentUserId.value)
  } finally { userLoading.value = false }
}
const handleSubmit = async () => {
  if (!props.sceneId || !props.caseId || submitForm.reviewerIds.length < requiredReviewerCount.value) { Message.warning(`请选择至少 ${requiredReviewerCount.value} 名评审人`); return false }
  actionLoading.value = true
  try {
    review.value = (await submitAutomationUiCaseReview(props.sceneId, props.caseId, { expectedDefinitionVersion: props.definitionVersion || review.value?.definitionVersion || 0, reviewerIds: submitForm.reviewerIds, summary: submitForm.summary })).data
    if (review.value.checkRunStatus === 'FAILED') Message.warning('评审已提交，但自动检查失败，请稍后重新检查')
    else Message.success('已提交评审')
    diff.value = undefined
    if (review.value.id) void loadDiff(review.value.id)
    return true
  } catch { return false } finally { actionLoading.value = false }
}

const decisionVisible = ref(false)
const decisionForm = reactive<{ decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED', comment: string }>({ decision: 'APPROVED', comment: '' })
const openDecision = (decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED') => { decisionForm.decision = decision; decisionForm.comment = ''; decisionVisible.value = true }
const handleDecision = async () => {
  if (!props.sceneId || !props.caseId || !review.value?.id || review.value.version == null) return false
  if (decisionForm.decision === 'REJECTED' && !decisionForm.comment.trim()) { Message.warning('拒绝评审必须填写原因'); return false }
  if (decisionForm.decision === 'CHANGES_REQUESTED' && !decisionForm.comment.trim()) {
    const hasOpenIssue = review.value.comments.some(item => !item.parentId && ['BLOCKER', 'MAJOR'].includes(item.severity || '') && item.resolution === 'OPEN')
    if (!hasOpenIssue) { Message.warning('请填写修改说明，或先创建阻断/重要意见'); return false }
  }
  actionLoading.value = true
  try {
    review.value = (await decideAutomationUiCaseReview(props.sceneId, props.caseId, review.value.id, { decision: decisionForm.decision, comment: decisionForm.comment, expectedReviewVersion: review.value.version })).data
    Message.success(decisionForm.decision === 'APPROVED' ? '评审已通过' : decisionForm.decision === 'REJECTED' ? '评审已拒绝' : '已要求修改')
    return true
  } catch { await loadReview(); return false } finally { actionLoading.value = false }
}
const handleRecheck = async () => {
  if (!props.sceneId || !props.caseId || !review.value?.id || review.value.version == null) return
  actionLoading.value = true
  try {
    review.value = (await recheckAutomationUiCaseReview(props.sceneId, props.caseId, review.value.id, review.value.version)).data
    if (review.value.checkRunStatus === 'FAILED') Message.warning('自动检查执行失败，请检查错误信息后重试')
    else Message.success('自动检查已更新')
  } finally { actionLoading.value = false }
}
const handleChecklist = async (code: AutomationUiCaseReview['checklist'][number]['code'], checked: boolean) => {
  if (!props.sceneId || !props.caseId || !review.value?.id) return
  actionLoading.value = true
  try { review.value = (await updateAutomationUiCaseReviewChecklist(props.sceneId, props.caseId, review.value.id, { itemCode: code, checked })).data } finally { actionLoading.value = false }
}

const commentVisible = ref(false)
const commentForm = reactive({ parentId: '', severity: 'MAJOR', stepId: '', content: '' })
const openComment = (root?: ReviewComment) => { commentForm.parentId = root?.id || ''; commentForm.severity = 'MAJOR'; commentForm.stepId = root?.stepId || props.selectedStepId || ''; commentForm.content = ''; commentVisible.value = true }
const handleComment = async () => {
  if (!props.sceneId || !props.caseId || !review.value?.id || !commentForm.content.trim()) { Message.warning('请输入意见内容'); return false }
  actionLoading.value = true
  try {
    review.value = (await addAutomationUiCaseReviewComment(props.sceneId, props.caseId, review.value.id, { parentId: commentForm.parentId || undefined, nodeType: commentForm.stepId ? 'STEP' : 'CASE', stepId: commentForm.stepId || undefined, severity: commentForm.parentId ? undefined : commentForm.severity, content: commentForm.content })).data
    return true
  } catch { return false } finally { actionLoading.value = false }
}
const resolveVisible = ref(false)
const resolvingComment = ref<ReviewComment>()
const resolveForm = reactive<{ resolutionType: 'FIXED' | 'EVIDENCED' | 'WONT_FIX', reason: string }>({ resolutionType: 'FIXED', reason: '' })
const openResolve = (comment: ReviewComment) => { resolvingComment.value = comment; resolveForm.resolutionType = 'FIXED'; resolveForm.reason = ''; resolveVisible.value = true }
const handleResolve = async () => {
  if (!props.sceneId || !props.caseId || !review.value?.id || !resolvingComment.value) return false
  if (resolveForm.resolutionType === 'WONT_FIX' && !resolveForm.reason.trim()) { Message.warning('选择不处理时必须填写理由'); return false }
  actionLoading.value = true
  try { review.value = (await resolveAutomationUiCaseReviewComment(props.sceneId, props.caseId, review.value.id, resolvingComment.value.id, resolveForm)).data; return true } catch { return false } finally { actionLoading.value = false }
}
const handleReopen = async (comment: ReviewComment) => {
  if (!props.sceneId || !props.caseId || !review.value?.id) return
  review.value = (await resolveAutomationUiCaseReviewComment(props.sceneId, props.caseId, review.value.id, comment.id, { resolutionType: 'REOPEN' })).data
}

const confirmWithdraw = () => Modal.warning({ title: '撤回评审', content: '撤回后本轮保留在评审记录中。', hideCancel: false, onOk: async () => {
  if (!props.sceneId || !props.caseId || !review.value?.id || review.value.version == null) return
  review.value = (await withdrawAutomationUiCaseReview(props.sceneId, props.caseId, review.value.id, review.value.version)).data
} })
const handleRemind = async () => { if (props.sceneId && props.caseId && review.value?.id) { await remindAutomationUiCaseReview(props.sceneId, props.caseId, review.value.id); Message.success('已通知待评审人') } }
const confirmRevoke = () => Modal.warning({ title: '撤销批准', content: review.value?.status === 'APPROVED' ? '评审将回到待评审状态。' : '将撤销本人已提交的批准结论。', hideCancel: false, onOk: async () => {
  if (!props.sceneId || !props.caseId || !review.value?.id || review.value.version == null) return
  review.value = (await revokeAutomationUiCaseReviewApproval(props.sceneId, props.caseId, review.value.id, review.value.version)).data
} })
</script>

<style scoped lang="scss">
.review-workbench { min-width: 0; min-height: 360px; color: var(--color-text-1); }
.review-header { display: flex; min-height: 60px; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--color-border-2); }
.review-identity { min-width: 0; }
.review-header-right { display: flex; flex-shrink: 0; align-items: center; gap: 10px; }
.title-line, .review-meta { display: flex; align-items: center; gap: 8px; }
.title-line strong { max-width: 420px; overflow: hidden; font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
.title-line > span, .review-meta { color: var(--color-text-3); font-size: 12px; }
.review-meta { margin-top: 5px; flex-wrap: wrap; }
.review-actions { flex-shrink: 0; }
.context-alert { margin-top: 10px; }
.risk-strip { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); margin-top: 10px; border: 1px solid var(--color-border-2); border-radius: 4px; }
.risk-strip button { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; min-width: 0; min-height: 58px; padding: 8px 12px; border: 0; border-right: 1px solid var(--color-border-2); background: transparent; color: inherit; text-align: left; cursor: pointer; }
.risk-strip button:last-child { border-right: 0; }
.risk-strip button:hover { background: var(--color-fill-1); }
.risk-strip span { grid-column: 1 / -1; color: var(--color-text-3); font-size: 12px; }
.risk-strip strong { font-size: 16px; letter-spacing: 0; }
.risk-strip small { align-self: end; color: var(--color-text-3); }
.danger { color: rgb(var(--red-6)); }.success { color: rgb(var(--green-6)); }.warning { color: rgb(var(--orange-6)); }.muted { color: var(--color-text-3); }
.review-tabs { margin-top: 8px; }
.overview-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; min-height: 380px; }
.overview-layout main { min-width: 0; padding-right: 18px; }
.overview-layout aside { min-width: 0; padding-left: 18px; border-left: 1px solid var(--color-border-2); }
.compact-sidebar-trigger { display: flex; justify-content: flex-end; padding: 0 0 8px; }
.change-summary, .evidence-section { padding-top: 10px; border-top: 1px solid var(--color-border-2); }
.change-summary > header, .evidence-section > header { display: flex; min-height: 38px; align-items: center; justify-content: space-between; }
.change-summary > div { display: flex; align-items: center; gap: 16px; min-height: 52px; color: var(--color-text-2); }
.change-summary small { margin-left: auto; color: var(--color-text-3); }
.evidence-row { display: grid; grid-template-columns: 22px minmax(0, 1fr) max-content max-content; gap: 10px; min-height: 58px; align-items: center; }
.evidence-row > svg { color: rgb(var(--green-6)); font-size: 16px; }
.evidence-row > div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.evidence-row span, .evidence-row time { color: var(--color-text-3); font-size: 12px; }
.history-timeline { padding: 16px 8px; }
.history-timeline p { margin: 4px 0 0; color: var(--color-text-3); }
.simple-decision-bar { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 16px; margin-top: 12px; padding: 0 14px; border: 1px solid var(--color-border-2); background: var(--color-fill-1); }
.simple-decision-bar > div { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.simple-decision-bar span, .simple-decision-bar small, .simple-section header small { color: var(--color-text-3); font-size: 12px; }
.simple-decision-bar strong { font-size: 17px; }
.simple-status-green, .simple-status-success { color: rgb(var(--green-6)); }
.simple-status-orangered, .simple-status-gold { color: rgb(var(--orange-6)); }
.simple-status-red { color: rgb(var(--red-6)); }
.simple-status-arcoblue { color: rgb(var(--arcoblue-6)); }
.simple-metrics { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); margin-top: 12px; border: 1px solid var(--color-border-2); }
.simple-metrics button { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; min-height: 64px; padding: 9px 12px; border: 0; border-right: 1px solid var(--color-border-2); background: transparent; color: inherit; text-align: left; cursor: pointer; }
.simple-metrics button:last-child { border-right: 0; }
.simple-metrics button:hover { background: var(--color-fill-1); }
.simple-metrics span { grid-column: 1 / -1; color: var(--color-text-3); font-size: 12px; }
.simple-metrics strong { font-size: 18px; }
.simple-metrics small { align-self: end; color: var(--color-text-3); }
.simple-metric-danger strong { color: rgb(var(--red-6)); }
.simple-content-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.simple-section { min-width: 0; padding: 12px 14px; border: 1px solid var(--color-border-2); }
.simple-section > header { display: flex; min-height: 32px; align-items: flex-start; justify-content: space-between; gap: 12px; }
.simple-section > header > div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.simple-issue-list { display: flex; flex-direction: column; gap: 8px; }
.simple-issue-row { display: grid; grid-template-columns: max-content minmax(0, 1fr) max-content; gap: 8px; align-items: center; min-height: 32px; color: var(--color-text-2); font-size: 13px; }
.simple-issue-row > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.simple-change-counts { display: flex; align-items: center; gap: 20px; min-height: 52px; color: var(--color-text-2); }
.simple-change-counts strong { margin-left: 4px; font-size: 17px; }
.simple-evidence { display: grid; grid-template-columns: 20px minmax(0, 1fr) max-content; gap: 8px; min-height: 52px; align-items: center; }
.simple-evidence > svg { color: rgb(var(--green-6)); font-size: 16px; }
.simple-evidence > div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.simple-evidence span, .simple-evidence time { color: var(--color-text-3); font-size: 12px; }
.simple-next-step p { min-height: 32px; margin: 7px 0 10px; color: var(--color-text-2); font-size: 13px; }
@media (max-width: 979px) { .overview-layout { grid-template-columns: 1fr; }.overview-layout main { padding-right: 0; } }
@media (max-width: 760px) { .review-header { align-items: flex-start; flex-direction: column; padding: 8px 0; }.review-header-right { width: 100%; align-items: flex-start; flex-direction: column; }.review-actions { width: 100%; }.review-mode-switch { align-self: flex-end; }.risk-strip, .simple-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }.risk-strip button:nth-child(2), .simple-metrics button:nth-child(2) { border-right: 0; }.risk-strip button:nth-child(-n+2), .simple-metrics button:nth-child(-n+2) { border-bottom: 1px solid var(--color-border-2); }.evidence-row { grid-template-columns: 22px minmax(0, 1fr); }.evidence-row time, .evidence-row > a { grid-column: 2; }.simple-content-grid { grid-template-columns: 1fr; }.simple-decision-bar { align-items: flex-start; flex-direction: column; padding: 10px 12px; } }
</style>
