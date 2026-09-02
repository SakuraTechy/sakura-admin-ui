<template>
  <section class="diff-view">
    <div class="diff-summary">
      <span>基线：{{ diff?.baseline === 'PREVIOUS_APPROVED' ? '上一个已批准版本' : '空基线' }}</span>
      <a-space>
        <a-tag color="green">新增 {{ diff?.added || 0 }}</a-tag>
        <a-tag color="orangered">修改 {{ diff?.modified || 0 }}</a-tag>
        <a-tag color="red">删除 {{ diff?.deleted || 0 }}</a-tag>
      </a-space>
    </div>
    <a-skeleton v-if="loading" :animation="true"><a-skeleton-line :rows="5" /></a-skeleton>
    <a-empty v-else-if="!diff?.changes.length" description="本轮没有结构化变更" />
    <div v-else class="diff-list">
      <div v-for="(change, index) in diff.changes" :key="`${change.type}-${change.stepId || change.field}-${index}`" class="diff-row">
        <a-tag size="small" :color="changeColor(change.type)">{{ changeLabel(change.type) }}</a-tag>
        <div>
          <strong>{{ change.stepName || change.field || change.stepId || '用例定义' }}</strong>
          <span v-if="change.stepId">{{ change.stepId }}</span>
          <span v-if="change.fields?.length">字段：{{ change.fields.join('、') }}</span>
          <span v-if="change.from && change.to">顺序：{{ change.from }} → {{ change.to }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ReviewDiff, ReviewDiffChange } from '@/apis/automation/automationUiCaseReview'

defineProps<{ diff?: ReviewDiff, loading?: boolean }>()
const changeLabel = (type: ReviewDiffChange['type']) => ({
  CASE_FIELD_MODIFIED: '用例修改', STEP_ADDED: '新增步骤', STEP_DELETED: '删除步骤', STEP_MOVED: '移动步骤', STEP_MODIFIED: '修改步骤',
}[type])
const changeColor = (type: ReviewDiffChange['type']) => type === 'STEP_ADDED' ? 'green' : type === 'STEP_DELETED' ? 'red' : 'orangered'
</script>

<style scoped lang="scss">
.diff-view { min-height: 220px; }
.diff-summary { display: flex; min-height: 46px; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--color-border-2); color: var(--color-text-2); }
.diff-list { display: flex; flex-direction: column; }
.diff-row { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--color-border-1); }
.diff-row > div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.diff-row span { color: var(--color-text-3); font-size: 12px; overflow-wrap: anywhere; }
@media (max-width: 640px) { .diff-summary { align-items: flex-start; flex-direction: column; padding: 8px 0; } }
</style>
