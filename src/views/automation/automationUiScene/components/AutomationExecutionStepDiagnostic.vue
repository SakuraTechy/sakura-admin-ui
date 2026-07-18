<template>
  <div class="step-diagnostic">
    <div v-if="step.error !== '-'" class="step-diagnostic__error">
      {{ step.errorCode !== '-' ? `[${step.errorCode}] ` : '' }}{{ step.error }}
    </div>
    <div class="step-diagnostic__section">
      <div class="step-diagnostic__heading">
        <span>元素定位</span>
        <a-tag :color="step.hasActualLocator ? 'green' : 'orange'">
          {{ step.hasActualLocator ? '实际命中定位' : '仅有配置定位' }}
        </a-tag>
      </div>
      <div v-if="step.hasActualLocator" class="step-diagnostic__actual">
        <span>{{ step.locatorSource }}</span>
        <strong>{{ step.locatorType }}</strong>
        <code>{{ step.locatorValue }}</code>
        <small>匹配数量：{{ step.matchedCount }}</small>
      </div>
      <div v-if="step.configuredLocators.length" class="step-diagnostic__locators">
        <div v-for="locator in step.configuredLocators" :key="`${locator.type}-${locator.value}`">
          <span>{{ locator.type }}</span>
          <code>{{ locator.value }}</code>
        </div>
      </div>
      <a-empty v-else-if="!step.hasActualLocator" description="该步骤未保存元素定位信息" />
    </div>
    <a-alert v-if="step.valueMasked" type="warning">
      该步骤包含敏感输入，执行器诊断值已隐藏。
    </a-alert>
    <details v-else-if="step.details" :open="isFailed" class="step-diagnostic__raw">
      <summary>执行器诊断数据</summary>
      <pre>{{ prettyJson(step.details) }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { ExecutionHistoryStepRow } from '../execution'
import { executionResultLabel } from '../execution'

const props = defineProps<{ step: ExecutionHistoryStepRow }>()
const isFailed = computed(() => executionResultLabel(props.step.status) === '失败')

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
  gap: 9px;
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
  flex: 1;
  color: var(--color-text-2);
  font: 11px/1.55 Consolas, monospace;
  overflow-wrap: anywhere;
}

.step-diagnostic small {
  color: var(--color-text-3);
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

.step-diagnostic__raw summary {
  width: fit-content;
  cursor: pointer;
  color: rgb(var(--primary-6));
  font-size: 12px;
}

.step-diagnostic__raw pre {
  max-height: 210px;
  margin: 8px 0 0;
  padding: 10px;
  overflow: auto;
  border-radius: 7px;
  background: #101828;
  color: #d0d5dd;
  font: 11px/1.6 Consolas, monospace;
  white-space: pre-wrap;
}
</style>
