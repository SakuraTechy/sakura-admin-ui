<template>
  <section class="review-section">
    <header class="section-header">
      <div>
        <strong>自动检查</strong>
        <span>{{ visibleChecks.length }} 项</span>
      </div>
      <a-space>
        <a-radio-group v-model="filter" type="button" size="mini">
          <a-radio value="risk">风险</a-radio>
          <a-radio value="all">全部</a-radio>
          <a-radio value="pass">通过</a-radio>
        </a-radio-group>
        <a-tooltip content="重新运行自动检查">
          <a-button v-if="canRecheck" size="mini" :loading="loading" @click="$emit('recheck')">
            <template #icon><icon-refresh /></template>
          </a-button>
        </a-tooltip>
      </a-space>
    </header>

    <a-empty v-if="!checks.length" description="提交评审后运行自动检查" />
    <div v-else class="check-list">
      <button
        v-for="item in visibleChecks"
        :key="item.id"
        type="button"
        class="check-row"
        :class="`is-${item.result.toLowerCase()}`"
        @click="item.anchors[0] && $emit('anchor', item.anchors[0])"
      >
        <span class="check-icon">
          <icon-check-circle-fill v-if="item.result === 'PASS'" />
          <icon-exclamation-circle-fill v-else-if="item.result === 'WARNING'" />
          <icon-close-circle-fill v-else />
        </span>
        <span class="check-copy">
          <span class="check-title">
            {{ ruleLabels[item.ruleCode] || item.ruleCode }}
            <a-tag size="small" :color="severityColor[item.effectiveSeverity]">{{ severityLabels[item.effectiveSeverity] }}</a-tag>
          </span>
          <span class="check-message">{{ item.message }}</span>
          <span v-if="item.anchors.length" class="check-anchor">
            {{ item.anchors.map(anchor => anchor.stepName || anchor.stepId).join('、') }}
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ReviewCheck, ReviewSeverity } from '@/apis/automation/automationUiCaseReview'

const props = defineProps<{
  checks: ReviewCheck[]
  canRecheck: boolean
  loading?: boolean
}>()

defineEmits<{
  (e: 'recheck'): void
  (e: 'anchor', anchor: ReviewCheck['anchors'][number]): void
}>()

const filter = ref<'risk' | 'all' | 'pass'>('risk')
const visibleChecks = computed(() => props.checks.filter((item) => {
  if (filter.value === 'pass') return item.result === 'PASS'
  if (filter.value === 'risk') return item.result !== 'PASS'
  return true
}))

const severityColor: Record<ReviewSeverity, string> = {
  BLOCKER: 'red',
  MAJOR: 'orangered',
  MINOR: 'gold',
  SUGGESTION: 'gray',
}
const severityLabels: Record<ReviewSeverity, string> = {
  BLOCKER: '阻断',
  MAJOR: '重要',
  MINOR: '一般',
  SUGGESTION: '建议',
}
const ruleLabels: Record<string, string> = {
  CASE_HAS_ENABLED_STEPS: '可执行步骤',
  CASE_HAS_ASSERTION: '结果断言',
  PLAYWRIGHT_STEP_PRESERVED: '录制事实完整性',
  LOCATOR_META_PRESERVED: '定位元数据完整性',
  CUSTOM_ACTION_PRESERVED: '自定义动作兼容性',
  SCREENSHOT_NOT_INLINE: '截图存储安全',
  MASKED_VALUE_NOT_EXPOSED: '敏感值保护',
  LOCATOR_RESILIENCE: '定位器韧性',
  FIXED_WAIT_RISK: '固定等待风险',
  ENVIRONMENT_HARDCODED: '环境硬编码',
  CURRENT_REVISION_VALIDATED: '当前版本验证',
  RECENT_FLAKY_RISK: '近期稳定性',
}
</script>

<style scoped lang="scss">
.review-section { min-width: 0; }
.section-header, .section-header > div { display: flex; align-items: center; }
.section-header { min-height: 38px; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--color-border-2); }
.section-header > div { gap: 8px; }
.section-header strong { font-size: 14px; }
.section-header span { color: var(--color-text-3); font-size: 12px; }
.check-list { display: flex; flex-direction: column; }
.check-row { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 8px; width: 100%; min-height: 58px; padding: 10px 4px; border: 0; border-bottom: 1px solid var(--color-border-1); background: transparent; color: inherit; text-align: left; cursor: default; }
.check-row:has(.check-anchor) { cursor: pointer; }
.check-row:hover { background: var(--color-fill-1); }
.check-icon { padding-top: 2px; font-size: 15px; }
.is-pass .check-icon { color: rgb(var(--green-6)); }
.is-warning .check-icon { color: rgb(var(--orange-6)); }
.is-fail .check-icon { color: rgb(var(--red-6)); }
.check-copy { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.check-title { display: flex; align-items: center; gap: 6px; color: var(--color-text-1); font-weight: 500; }
.check-message, .check-anchor { overflow-wrap: anywhere; font-size: 12px; line-height: 1.5; }
.check-message { color: var(--color-text-2); }
.check-anchor { color: rgb(var(--primary-6)); }
</style>
