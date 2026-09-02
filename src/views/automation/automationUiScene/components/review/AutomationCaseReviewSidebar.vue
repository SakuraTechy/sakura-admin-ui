<template>
  <div class="review-sidebar">
    <AutomationCaseReviewChecklist
      :items="items"
      :editable="editable"
      :loading="loading"
      @change="(code, checked) => emit('change', code, checked)"
    />
    <section class="reviewer-section">
      <header><strong>评审人结论</strong><span>{{ approvedCount }}/{{ requiredApprovals || 1 }} 已批准</span></header>
      <div v-for="item in reviewers" :key="item.id" class="reviewer-row">
        <a-avatar :size="26">{{ item.name?.slice(0, 1) }}</a-avatar>
        <div><strong>{{ item.name }}</strong><small>{{ decisionLabel[item.decision] }}</small></div>
        <a-tag size="small" :color="decisionColor[item.decision]">{{ decisionLabel[item.decision] }}</a-tag>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AutomationCaseReviewChecklist from './AutomationCaseReviewChecklist.vue'
import type { ReviewChecklistItem, ReviewReviewer } from '@/apis/automation/automationUiCaseReview'

defineProps<{
  items: ReviewChecklistItem[]
  reviewers: ReviewReviewer[]
  editable: boolean
  loading: boolean
  approvedCount: number
  requiredApprovals: number
}>()

const emit = defineEmits<{ (e: 'change', code: string, checked: boolean): void }>()

const decisionLabel: Record<string, string> = {
  PENDING: '待评审',
  APPROVED: '已批准',
  CHANGES_REQUESTED: '要求修改',
  REJECTED: '已拒绝',
}
const decisionColor: Record<string, string> = {
  PENDING: 'gray',
  APPROVED: 'green',
  CHANGES_REQUESTED: 'orangered',
  REJECTED: 'red',
}
</script>

<style scoped lang="scss">
.reviewer-section { padding-top: 10px; border-top: 1px solid var(--color-border-2); }
.reviewer-section header { display: flex; min-height: 38px; align-items: center; justify-content: space-between; }
.reviewer-section header span { color: var(--color-text-3); font-size: 12px; }
.reviewer-row { display: grid; grid-template-columns: 26px minmax(0, 1fr) max-content; gap: 8px; padding: 8px 0; align-items: center; }
.reviewer-row > div { display: flex; min-width: 0; flex-direction: column; }
.reviewer-row small { color: var(--color-text-3); }
</style>
