<template>
  <div :data-history-expand="batch.rowKey" class="batch-detail">
    <div class="batch-case-list">
      <article
        v-for="record in batch.cases"
        :key="record.rowKey"
        class="batch-case-card"
        :class="{
          'batch-case-card--expanded': expandedKey === record.rowKey,
          'batch-case-card--failed': executionResultLabel(record.executeResult) === '失败',
        }"
      >
        <div class="batch-case-summary">
          <button type="button" class="batch-case-toggle" @click="toggleCase(record)">
            <icon-down :class="{ active: expandedKey === record.rowKey }" />
            <a-tag :color="executionResultColor(record.executeResult)">
              {{ executionResultLabel(record.executeResult) }}
            </a-tag>
            <span class="batch-case-identity">
              <strong>{{ record.caseName }}</strong>
              <small>{{ record.caseId }} · {{ record.executionId }}</small>
            </span>
            <span class="batch-case-metrics">
              <span>总步骤 <strong>{{ record.stepTotal }}</strong></span>
              <span class="success">通过 <strong>{{ record.stepPass }}</strong></span>
              <span class="danger">失败 <strong>{{ record.stepFail }}</strong></span>
              <span>跳过 <strong>{{ record.stepSkip }}</strong></span>
              <span>失败步骤 <strong>{{ record.failedStepIndex }}</strong></span>
            </span>
            <AutomationExecutionProgress
              class="batch-case-progress"
              :progress="record.progress"
              :indeterminate="record.progressIndeterminate"
            />
            <span class="batch-case-duration">耗时 <strong>{{ formatExecutionDuration(record.duration) }}</strong></span>
          </button>
          <a-space class="batch-case-actions" size="mini">
            <a-button size="small" @click="emit('open', record, 'log')">日志</a-button>
            <a-button size="small" type="primary" @click="emit('open', record, 'report')">报告</a-button>
          </a-space>
        </div>

        <Transition name="batch-case-expand">
          <AutomationExecutionHistoryDetail
            v-if="expandedKey === record.rowKey"
            :record="record"
            variant="table"
            embedded
            @open="openDetail"
          />
        </Transition>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExecutionHistoryBatchRow, ExecutionHistoryCaseRow, ExecutionViewType } from '../execution'
import { executionResultColor, executionResultLabel, formatExecutionDuration } from '../execution'
import AutomationExecutionHistoryDetail from './AutomationExecutionHistoryDetail.vue'
import AutomationExecutionProgress from './AutomationExecutionProgress.vue'

const props = defineProps<{ batch: ExecutionHistoryBatchRow }>()
const emit = defineEmits<{ (e: 'open', record: ExecutionHistoryCaseRow, view: Exclude<ExecutionViewType, 'record'>): void }>()
const expandedKey = ref('')

watch(() => props.batch.rowKey, () => {
  const failed = props.batch.cases.find((record) => executionResultLabel(record.executeResult) === '失败')
  expandedKey.value = failed?.rowKey || props.batch.cases[0]?.rowKey || ''
}, { immediate: true })

function toggleCase(record: ExecutionHistoryCaseRow) {
  expandedKey.value = expandedKey.value === record.rowKey ? '' : record.rowKey
}

function openDetail(record: ExecutionHistoryCaseRow, view: Exclude<ExecutionViewType, 'record'>) {
  emit('open', record, view)
}
</script>

<style scoped lang="scss">
.batch-detail {
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 0 0 12px 12px;
  background: var(--color-fill-1);
  animation: batch-expand 200ms ease-out;
}

.batch-case-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-case-card {
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.batch-case-card--expanded {
  border-color: rgb(var(--primary-3));
  box-shadow: 0 8px 22px rgb(0 0 0 / 6%);
}

.batch-case-card--failed {
  border-color: rgb(var(--danger-3));
}

.batch-case-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}

.batch-case-toggle {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: 18px auto minmax(180px, 1.2fr) minmax(300px, 1.8fr) minmax(140px, .8fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.batch-case-toggle > svg {
  color: var(--color-text-3);
  transition: transform 180ms ease, color 180ms ease;
}

.batch-case-toggle > svg.active {
  transform: rotate(180deg);
  color: rgb(var(--primary-6));
}

.batch-case-identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.batch-case-identity strong,
.batch-case-identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-case-identity small,
.batch-case-metrics,
.batch-case-duration {
  color: var(--color-text-3);
  font-size: 12px;
}

.batch-case-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
}

.batch-case-metrics strong,
.batch-case-duration strong {
  color: var(--color-text-1);
}

.batch-case-metrics .success strong {
  color: rgb(var(--success-6));
}

.batch-case-metrics .danger strong {
  color: rgb(var(--danger-6));
}

.batch-case-progress {
  min-width: 140px;
}

.batch-case-duration {
  white-space: nowrap;
}

.batch-case-actions {
  flex-shrink: 0;
}

.batch-case-card :deep(.step-history--embedded) {
  border-width: 1px 0 0;
  border-radius: 0;
}

.batch-case-expand-enter-active,
.batch-case-expand-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.batch-case-expand-enter-from,
.batch-case-expand-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@keyframes batch-expand {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1100px) {
  .batch-case-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .batch-case-toggle {
    grid-template-columns: 18px auto minmax(180px, 1fr) minmax(220px, 1.4fr);
  }

  .batch-case-progress,
  .batch-case-duration {
    grid-column: 3 / -1;
  }

  .batch-case-actions {
    align-self: flex-end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .batch-detail,
  .batch-case-card,
  .batch-case-toggle > svg,
  .batch-case-expand-enter-active,
  .batch-case-expand-leave-active {
    animation: none;
    transition: none;
  }
}
</style>
