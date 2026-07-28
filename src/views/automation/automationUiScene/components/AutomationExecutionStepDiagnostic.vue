<template>
  <div class="step-diagnostic">
    <div v-if="step.error !== '-'" class="step-diagnostic__error">
      {{ step.errorCode !== '-' ? `[${step.errorCode}] ` : '' }}{{ step.error }}
    </div>
    <div class="step-diagnostic__section">
      <div class="step-diagnostic__heading">
        <span>元素定位 · 候选策略（{{ step.configuredLocators.length }}）</span>
        <a-tag :color="step.hasActualLocator ? 'green' : 'orange'">
          {{ step.hasActualLocator ? '实际命中定位器' : '仅有配置定位器' }}
        </a-tag>
      </div>
      <div v-if="step.configuredLocators.length" class="step-diagnostic__locators">
        <div
          v-for="(locator, index) in step.configuredLocators"
          :key="`${locator.type}-${locator.value}-${index}`"
          :class="{ 'is-hit': isActualLocator(locator, index) }"
        >
          <span>{{ locator.type }}</span>
          <code>{{ locator.value }}</code>
          <!-- <a-tag v-if="isActualLocator(locator, index)" color="green" size="small">已命中</a-tag> -->
          <small v-if="isActualLocator(locator, index)" class="step-diagnostic__hit-meta">
            耗时 {{ locatorDiagnostics?.wait?.wall_ms ?? 0 }} ms
            <template v-if="locatorDiagnostics?.selected?.score != null">
              · 评分 {{ locatorDiagnostics.selected.score }}
            </template>
            <template v-if="shouldShowMatchedCount">
              · 匹配 {{ step.matchedCount }}
            </template>
          </small>
        </div>
      </div>
      <a-empty v-else-if="!step.hasActualLocator" description="该步骤未保存元素定位信息" />
    </div>
    <div v-if="locatorDiagnostics" class="step-diagnostic__semantic">
      <div>
        <span>定位模式</span>
        <strong>{{ locatorDiagnostics.mode || '-' }}</strong>
      </div>
      <div>
        <span>定位结果</span>
        <strong>{{ locatorDiagnostics.outcome || '-' }}</strong>
      </div>
      <div>
        <span>等待耗时</span>
        <strong>{{ locatorDiagnostics.wait?.wall_ms ?? 0 }} ms</strong>
      </div>
      <div>
        <span>语义评分</span>
        <strong>{{ locatorDiagnostics.selected?.score ?? '-' }}</strong>
      </div>
      <div 
        v-if="locatorDiagnostics.selected?.normalization_rule"
        class="step-diagnostic__semantic-target">
        <span>目标标准化</span>
        <strong>{{ locatorDiagnostics.selected.normalization_rule }}</strong>
      </div>
      <div
        v-if="locatorDiagnostics.selected?.normalization_rule && locatorDiagnostics.selected?.effective_target"
        class="step-diagnostic__semantic-target"
      >
        <span>标准化后操作目标</span>
        <code>{{ locatorDiagnostics.selected.effective_target }}</code>
      </div>
    </div>
    <a-alert v-if="step.valueMasked" type="warning">
      该步骤包含敏感输入，执行器诊断值已隐藏。
    </a-alert>
    <details v-else-if="step.details" :open="isFailed" class="step-diagnostic__raw">
      <summary>执行器诊断数据</summary>
      <pre tabindex="0" aria-label="执行器诊断数据">{{ prettyJson(step.details) }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { ExecutionHistoryStepRow } from '../execution'
import { executionResultLabel } from '../execution'

const props = defineProps<{ step: ExecutionHistoryStepRow }>()
const isFailed = computed(() => executionResultLabel(props.step.status) === '失败')
const locatorDiagnostics = computed<Record<string, any> | null>(() => {
  if (!props.step.details || typeof props.step.details !== 'object') return null
  const details = props.step.details as Record<string, any>
  const value = details.locator_diagnostics || details.locatorDiagnostics
  return value && typeof value === 'object' ? value : null
})

function isActualLocator(locator: { type: string, value: string }, index: number) {
  if (!props.step.hasActualLocator) return false
  if (locator.type === props.step.locatorType && locator.value === props.step.locatorValue) return true
  const sourceMatch = props.step.locatorSource.match(/^locator_meta\.candidates\[(\d+)\]$/)
  if (sourceMatch) return Number(sourceMatch[1]) === index
  return false
}

const shouldShowMatchedCount = computed(() => {
  const count = Number(props.step.matchedCount)
  return Number.isFinite(count) && count > 1
})

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}
</script>

<style scoped lang="scss">
.step-diagnostic {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  border-radius: 9px;
  background: var(--color-fill-1);
}

.step-diagnostic__error {
  padding: 9px 11px;
  border-left: 3px solid rgb(var(--danger-6));
  border-radius: 6px;
  background: rgb(var(--danger-1));
  color: rgb(var(--danger-7));
  font-size: 12px;
  overflow-wrap: anywhere;
}

.step-diagnostic__heading,
.step-diagnostic__actual,
.step-diagnostic__locators > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.step-diagnostic__heading {
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--color-text-2);
  font-weight: 600;
}

.step-diagnostic__actual {
  flex-wrap: wrap;
  padding: 9px 10px;
  border: 1px solid rgb(var(--success-2));
  border-radius: 7px;
  background: rgb(var(--success-1));
}

.step-diagnostic__actual span,
.step-diagnostic__locators span {
  flex-shrink: 0;
  color: rgb(var(--primary-6));
  font: 600 11px Consolas, monospace;
}

.step-diagnostic code {
  min-width: 0;
  // flex: 1;
  color: var(--color-text-2);
  font: 11px/1.55 Consolas, monospace;
  overflow-wrap: anywhere;
}

.step-diagnostic small {
  color: var(--color-text-3);
}

.step-diagnostic__semantic {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.step-diagnostic__semantic > div {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--color-bg-2);
  color: var(--color-text-2);
  font-size: 12px;
}

.step-diagnostic__semantic > div span {
  flex-shrink: 0;
  color: var(--color-text-3);
}

.step-diagnostic__semantic-target {
  grid-column: 1 / -1;
}

.step-diagnostic__locators {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 7px;
}

.step-diagnostic__locators > div {
  align-items: flex-start;
  padding: 7px 9px;
  border-radius: 6px;
  background: var(--color-bg-2);
}

.step-diagnostic__locators > div.is-hit {
  align-items: center;
  border: 1px solid rgb(var(--success-3));
  background: rgb(var(--success-1));
}

.step-diagnostic__locators > div.is-hit code {
  color: rgb(var(--success-7));
}

.step-diagnostic__locators > div.is-hit .step-diagnostic__hit-meta {
  margin-left: auto;
  color: rgb(var(--success-7));
  white-space: nowrap;
}

.step-diagnostic__raw summary {
  width: fit-content;
  cursor: pointer;
  color: rgb(var(--primary-6));
  font-size: 12px;
}

.step-diagnostic__raw pre {
  box-sizing: border-box;
  width: 100%;
  height: min(42vh, 460px);
  max-height: 460px;
  min-height: 180px;
  margin: 8px 0 0;
  padding: 10px;
  overflow-y: scroll;
  overflow-x: auto;
  border-radius: 7px;
  background: #101828;
  color: #d0d5dd;
  font: 11px/1.6 Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
</style>
