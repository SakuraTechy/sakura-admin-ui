<template>
  <div
    :data-history-expand="record.rowKey"
    class="step-history"
    :class="[`step-history--${variant}`, { 'step-history--embedded': embedded }]"
  >
    <div v-if="!embedded" class="step-summary">
      <div class="step-summary__identity">
        <a-tag :color="executionResultColor(record.executeResult)">{{ executionAggregateResultLabel(record.executeResult) }}</a-tag>
        <strong>{{ record.caseName }}</strong>
        <!-- <div class="step-summary__metrics">
          <strong>{{ record.caseName }}</strong>
          <small>{{ record.caseId }} · {{ record.executionId }} · {{ sessionModeLabel(record.sessionMode) }}</small>
          <span class="duration">总步骤 <strong>{{ record.stepTotal }}</strong></span>
          <span class="success">通过 <strong>{{ record.stepPass }}</strong></span>
          <span class="danger">失败 <strong>{{ record.stepFail }}</strong></span>
          <span>跳过 <strong>{{ record.stepSkip }}</strong></span>
          <span>失败步骤 <strong>{{ record.failedStepIndex }}</strong></span>
          <span class="duration">耗时 <strong>{{ formatExecutionDuration(record.duration) }}</strong></span>
        </div> -->
      </div>
      <!-- <div class="step-summary__metrics">
        <span>总步骤 <strong>{{ record.stepTotal }}</strong></span>
        <span class="success">通过 <strong>{{ record.stepPass }}</strong></span>
        <span class="danger">失败 <strong>{{ record.stepFail }}</strong></span>
        <span>跳过 <strong>{{ record.stepSkip }}</strong></span>
        <span>失败步骤 <strong>{{ record.failedStepIndex }}</strong></span>
      </div>
      <span>耗时 <strong>{{ formatExecutionDuration(record.duration) }}</strong></span> -->
      <a-space>
        <a-button size="small" @click="emit('open', record, 'log')">日志</a-button>
        <a-button
          v-if="record.executionType === 'playwright-runner'"
          size="small"
          @click="emit('open', record, 'live')"
        >
          实时画面
        </a-button>
        <a-button size="small" type="primary" @click="emit('open', record, 'report')">报告</a-button>
      </a-space>
    </div>

    <div
      v-if="record.browserSessionSource !== '-' || record.sessionNavigationDecision !== '-'"
      class="session-audit"
    >
      <span><small>请求模式</small><strong>{{ sessionModeLabel(record.sessionMode) }}</strong></span>
      <span><small>实际模式</small><strong>{{ sessionModeLabel(record.appliedSessionMode) }}</strong></span>
      <span><small>会话来源</small><strong>{{ browserSessionSourceLabel(record.browserSessionSource) }}</strong></span>
      <span>
        <small>失败重置</small>
        <strong>{{ record.sessionReset ? `是（累计 ${record.sessionResetCount} 次）` : '否' }}</strong>
      </span>
      <span v-if="record.sessionNavigationDecision !== '-'">
        <small>导航决策</small><strong>{{ navigationDecisionLabel(record.sessionNavigationDecision) }}</strong>
      </span>
    </div>

    <!-- <a-alert v-if="record.error !== '-'" type="error" class="record-alert">
      {{ record.errorCode !== '-' ? `[${record.errorCode}] ` : '' }}{{ record.error }}
    </a-alert> -->
    <a-alert v-if="record.summaryOnly" type="info" class="record-alert">
      该记录仅包含场景汇总，未保存用例步骤明细。
    </a-alert>
    <a-spin v-if="loadingSteps" class="step-loading" />
    <a-alert v-else-if="loadError" type="error" class="record-alert">{{ loadError }}</a-alert>
    <a-empty v-else-if="record.steps.length === 0" description="该执行记录未回传步骤明细" />

    <div v-else-if="variant === 'table'" class="step-inspector">
      <nav class="step-inspector__nav">
        <button
          v-for="step in record.steps"
          :key="step.rowKey"
          type="button"
          :class="{ active: activeStepKey === step.rowKey, failed: stepState(step) === 'failed' }"
          @click="selectStep(step.rowKey)"
        >
          <i :class="`state-${stepState(step)}`">{{ step.stepNumber }}</i>
          <span>
            <strong :title="step.stepName">{{ step.stepName }}</strong>
            <small style="margin-top: 5px;" :title="step.actionType">{{ step.actionType }}</small>
          </span>
          <div style="display: flex; align-items: center; gap: 16px;">
            <em>{{ formatExecutionDuration(step.duration) }}</em>
            <a-tag :color="executionResultColor(step.status)">{{ executionResultLabel(step.status) }}</a-tag>
          </div>
        </button>
      </nav>
      <section v-if="activeStep" class="step-inspector__content">
        <!-- <header>
          <div>
            <strong>{{ activeStep.stepName }}</strong>
            <span>{{ activeStep.description }}</span>
          </div>
          <a-tag :color="executionResultColor(activeStep.status)">{{ executionResultLabel(activeStep.status) }}</a-tag>
        </header> -->
        <AutomationExecutionStepDiagnostic :step="activeStep" />
      </section>
    </div>

    <div v-else-if="variant === 'compact'" class="step-compact">
      <div v-for="step in record.steps" :key="step.rowKey" class="step-compact__item" :class="{ failed: stepState(step) === 'failed' }">
        <button type="button" @click="toggleStep(step.rowKey)">
          <i :class="`state-${stepState(step)}`">{{ step.stepNumber }}</i>
          <strong>{{ step.stepName }}</strong>
          <span>{{ step.actionType }}</span>
          <small>{{ formatExecutionDuration(step.duration) }}</small>
          <icon-down :class="{ active: activeStepKey === step.rowKey }" />
        </button>
        <Transition name="step-expand"><AutomationExecutionStepDiagnostic v-if="activeStepKey === step.rowKey" :step="step" /></Transition>
      </div>
    </div>

    <div v-else-if="variant === 'timeline'" class="step-timeline">
      <div v-for="step in record.steps" :key="step.rowKey" class="step-timeline__item" :class="`is-${stepState(step)}`">
        <i>{{ step.stepNumber }}</i>
        <div>
          <button type="button" @click="toggleStep(step.rowKey)">
            <span>
              <strong>{{ step.stepName }}</strong>
              <small>{{ step.description }}</small>
            </span>
            <a-tag :color="executionResultColor(step.status)">{{ executionResultLabel(step.status) }}</a-tag>
            <em>{{ formatExecutionDuration(step.duration) }}</em>
          </button>
          <Transition name="step-expand"><AutomationExecutionStepDiagnostic v-if="activeStepKey === step.rowKey" :step="step" /></Transition>
        </div>
      </div>
    </div>

    <div v-else class="step-card-grid">
      <article v-for="step in record.steps" :key="step.rowKey" :class="{ active: activeStepKey === step.rowKey, failed: stepState(step) === 'failed' }">
        <button type="button" @click="toggleStep(step.rowKey)">
          <span class="step-card-grid__number" :class="`state-${stepState(step)}`">{{ step.stepNumber }}</span>
          <span class="step-card-grid__title"><strong>{{ step.stepName }}</strong><small>{{ step.description }}</small></span>
          <a-tag :color="executionResultColor(step.status)">{{ executionResultLabel(step.status) }}</a-tag>
          <em>{{ formatExecutionDuration(step.duration) }}</em>
        </button>
        <Transition name="step-expand"><AutomationExecutionStepDiagnostic v-if="activeStepKey === step.rowKey" :step="step" /></Transition>
      </article>
    </div>
    <a-pagination
      v-if="!loadingSteps && !loadError && stepTotal > stepPageSize"
      v-model:current="stepPage"
      v-model:page-size="stepPageSize"
      class="step-pagination"
      size="small"
      :total="stepTotal"
      :page-size-options="[20, 50, 100]"
      show-page-size
      show-total
      @change="changeStepPage"
      @page-size-change="changeStepPageSize"
    />
  </div>
</template>

<script setup lang="ts">
import type { ExecutionHistoryCaseRow, ExecutionHistoryStepRow, ExecutionViewType } from '../execution'
import { executionAggregateResultLabel, executionResultColor, executionResultLabel, formatExecutionDuration } from '../execution'
import AutomationExecutionStepDiagnostic from './AutomationExecutionStepDiagnostic.vue'

const props = withDefaults(defineProps<{
  record: ExecutionHistoryCaseRow
  variant?: 'table' | 'compact' | 'timeline' | 'cards'
  embedded?: boolean
  loadSteps?: (record: ExecutionHistoryCaseRow, page?: number, size?: number) => Promise<void>
  loadStepDetail?: (step: ExecutionHistoryStepRow) => Promise<void>
}>(), { variant: 'timeline', embedded: false })

const emit = defineEmits<{
  (e: 'open', record: ExecutionHistoryCaseRow, view: Exclude<ExecutionViewType, 'record'>): void
}>()
const activeStepKey = ref('')
const loadingSteps = ref(false)
const loadError = ref('')
const loadingStepKeys = new Set<string>()
const stepPage = ref(props.record.stepPage || 1)
const stepPageSize = ref(props.record.stepPageSize || 20)
const stepTotal = computed(() => props.record.stepPageTotal ?? (Number(props.record.stepTotal) || 0))
const activeStep = computed(() => props.record.steps.find((step) => step.rowKey === activeStepKey.value))

async function fetchSteps() {
  if (!props.loadSteps) return
  loadingSteps.value = true
  loadError.value = ''
  try {
    await props.loadSteps(props.record, stepPage.value, stepPageSize.value)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '执行步骤加载失败'
  } finally {
    loadingSteps.value = false
  }
}

watch(() => [props.record.rowKey, props.variant, props.record.steps.map(step => step.rowKey).join('|')], () => {
  const failed = props.record.steps.find((step) => stepState(step) === 'failed')
  activeStepKey.value = failed?.rowKey || (props.variant === 'table' ? props.record.steps[0]?.rowKey || '' : '')
}, { immediate: true })

watch(
  () => `${props.record.caseExecutionDbId || ''}:${props.record.stepsLoaded === true}`,
  async () => {
    if (!props.loadSteps || props.record.stepsLoaded) return
    await fetchSteps()
  },
  { immediate: true },
)

function changeStepPage(page: number) {
  stepPage.value = page
  void fetchSteps()
}

function changeStepPageSize(size: number) {
  stepPageSize.value = size
  stepPage.value = 1
  void fetchSteps()
}

watch(activeStep, (step) => {
  if (!step || step.detailLoaded || !props.loadStepDetail || loadingStepKeys.has(step.rowKey)) return
  loadingStepKeys.add(step.rowKey)
  void props.loadStepDetail(step).finally(() => loadingStepKeys.delete(step.rowKey))
}, { immediate: true })

function selectStep(rowKey: string) {
  activeStepKey.value = rowKey
}
function toggleStep(rowKey: string) {
  activeStepKey.value = activeStepKey.value === rowKey ? '' : rowKey
}
function stepState(step: ExecutionHistoryStepRow) {
  const label = executionResultLabel(step.status)
  return label === '通过' ? 'passed' : label === '失败' ? 'failed' : 'skipped'
}
function sessionModeLabel(value: string) {
  if (value === 'reuse-browser') return '同一浏览器窗口'
  if (value === 'reuse-auth') return '复用登录态'
  if (value === 'legacy-profile') return '当前浏览器兼容模式'
  return value === 'isolated' ? '独立登录' : value || '-'
}

function browserSessionSourceLabel(value: string) {
  if (value === 'managed-context') return '受控隔离会话'
  if (value === 'current-profile') return '当前 Chrome Profile'
  return value || '-'
}

function navigationDecisionLabel(value: string) {
  const labels: Record<string, string> = {
    'reused-browser-page': '接管上一用例页面，不重新导航',
    'reused-browser-navigated': '复用浏览器并导航到用例起始页',
    'auth-restored': '恢复上一条成功用例登录态',
    'clean-context-created': '创建全新受控会话',
    'browser-not-required': '纯基础设施用例，无需浏览器会话',
  }
  return labels[value] || value || '-'
}
</script>

<style scoped lang="scss">
.step-history {
  padding: 16px 18px 18px;
  border: 1px solid var(--color-border-2);
  border-radius: 0 0 12px 12px;
  background: var(--color-fill-1);
  animation: history-expand-in 200ms ease-out;
}

.step-loading {
  display: block;
  min-height: 120px;
  padding-top: 48px;
  text-align: center;
}

.step-pagination {
  justify-content: flex-end;
  margin-top: 10px;
}

.step-history--embedded,
.step-history--table {
  min-height: 0;
  max-height: calc(100vh - 220px);
  max-height: calc(100dvh - 220px);
  padding: 12px;
  overflow-x: hidden;
  overflow-y: scroll;
  border-radius: 0 0 10px 10px;
  background: var(--color-bg-1);
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

// 单个用例展开行只保留根报告容器滚动，避免步骤栏和详情栏抢占滚轮事件。
.step-history--table:not(.step-history--embedded) {
  overflow-y: auto;
  overscroll-behavior: auto;
}

.step-history--table:not(.step-history--embedded) .step-inspector {
  height: auto;
  max-height: none;
  min-height: 0;
  overflow: visible;
}

.step-history--table:not(.step-history--embedded) .step-inspector__content {
  overflow: visible;
}

.step-summary {
  position: sticky;
  z-index: 3;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 10px;
  padding: 12px 14px;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-bg-2) 95%, transparent);
  box-shadow: 0 5px 16px rgb(0 0 0 / 5%);
  backdrop-filter: blur(8px);
}

.step-summary__identity {
  display: flex;
  min-width: 210px;
  align-items: center;
  gap: 9px;
}

.step-summary__identity strong,
.step-summary__identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-summary__identity small,
.step-summary__identity span,
.step-summary__duration {
  color: var(--color-text-3);
  font-size: 12px;
}

.step-summary__metrics {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 5px;
}

.success strong {
  color: rgb(var(--success-6));
}

.danger strong {
  color: rgb(var(--danger-6));
}

.duration strong {
  color: var(--color-text-1);
}

.record-alert {
  margin-bottom: 12px;
}

.session-audit {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-bottom: 12px;
  padding: 8px 2px;
  border-bottom: 1px solid var(--color-border-2);
}

.session-audit span {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
}

.session-audit small {
  color: var(--color-text-3);
}

.session-audit strong {
  color: var(--color-text-1);
  font-weight: 500;
}

.step-inspector {
  display: grid;
  min-height: 0;
  height: min(520px, calc(100dvh - 220px));
  max-height: 520px;
  grid-template-columns: minmax(250px, 32%) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
}

.step-inspector__nav {
  min-height: 0;
  max-height: 480px;
  overflow-x: hidden;
  overflow-y: auto;
  border-right: 1px solid var(--color-border-2);
  scrollbar-gutter: stable;
}

.step-inspector__nav button {
  display: grid;
  box-sizing: border-box;
  width: 100%;
  height: 46px;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 6.5px 11px;
  border: 0;
  border-bottom: 1px solid var(--color-border-1);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.step-inspector__nav button.active {
  background: rgb(var(--primary-1));
  box-shadow: inset 3px 0 rgb(var(--primary-6));
}

.step-inspector__nav button.failed {
  background-color: rgb(var(--danger-1));
}

.step-inspector__nav i,
.step-compact i,
.step-card-grid__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  border: 1px solid var(--color-border-2);
  border-radius: 50%;
  background: var(--color-fill-2);
  font-style: normal;
  font-weight: 700;
  transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
}

.state-passed {
  border-color: rgb(var(--success-3)) !important;
  background: rgb(var(--success-1)) !important;
  color: rgb(var(--success-7));
}

.state-failed {
  border-color: rgb(var(--danger-3)) !important;
  background: rgb(var(--danger-1)) !important;
  color: rgb(var(--danger-7));
}

.state-skipped {
  border-color: var(--color-border-3) !important;
  background: var(--color-fill-2) !important;
  color: var(--color-text-3);
}

.step-inspector__nav button.active i.state-passed {
  border-color: rgb(var(--success-6)) !important;
  background: rgb(var(--success-6)) !important;
  color: #fff;
  box-shadow: 0 0 0 3px rgb(var(--success-1));
}

.step-inspector__nav button.active i.state-failed {
  border-color: rgb(var(--danger-6)) !important;
  background: rgb(var(--danger-6)) !important;
  color: #fff;
  box-shadow: 0 0 0 3px rgb(var(--danger-1));
}

.step-inspector__nav button.active i.state-skipped {
  border-color: rgb(var(--primary-6)) !important;
  background: rgb(var(--primary-6)) !important;
  color: #fff;
  box-shadow: 0 0 0 3px rgb(var(--primary-1));
}

.step-inspector__nav span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.step-inspector__nav strong,
.step-inspector__nav small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.step-inspector__nav small,
.step-inspector__nav em {
  color: var(--color-text-3);
  font-size: 11px;
  font-style: normal;
}

.step-inspector__content {
  min-width: 0;
  min-height: 0;
  // padding: 10px;
  overflow: auto;
}

.step-inspector__content header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 12px;
}

.step-inspector__content header div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.step-inspector__content header span {
  color: var(--color-text-3);
  font-size: 12px;
}

.step-compact {
  max-height: 520px;
  overflow: auto;
}

.step-compact__item {
  margin-bottom: 7px;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
}

.step-compact__item.failed {
  border-color: rgb(var(--danger-3));
}

.step-compact__item>button {
  display: grid;
  width: 100%;
  grid-template-columns: 30px minmax(180px, 1fr) 130px 90px 18px;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.step-compact__item button span,
.step-compact__item button small {
  color: var(--color-text-3);
  font-size: 12px;
}

.step-compact__item :deep(.step-diagnostic) {
  margin: 0 10px 10px;
}

.step-compact svg {
  transition: transform 180ms ease;
}

.step-compact svg.active {
  transform: rotate(180deg);
}

.step-timeline {
  max-height: 540px;
  overflow: auto;
}

.step-timeline__item {
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  padding-bottom: 10px;
  // align-items: center;
}

.step-timeline__item::before {
  position: absolute;
  top: 12px;
  bottom: -12px;
  left: 14px;
  width: 2px;
  background: var(--color-border-2);
  content: '';
}

.step-timeline__item:last-child::before {
  display: none;
}

.step-timeline__item>i {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-bg-2);
  border-radius: 50%;
  background: var(--color-neutral-4);
  color: #fff;
  font-style: normal;
  font-weight: 700;
}

.step-timeline__item.is-passed>i {
  background: rgb(var(--success-6));
}

.step-timeline__item.is-failed>i {
  background: rgb(var(--danger-6));
}

.step-timeline__item>div {
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
}

.step-timeline__item.is-failed>div {
  border-color: rgb(var(--danger-3));
}

.step-timeline__item button {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto 90px;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.step-timeline__item button span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.step-timeline__item button small {
  overflow: hidden;
  color: var(--color-text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-timeline__item button em {
  color: var(--color-text-3);
  font-size: 12px;
  font-style: normal;
}

.step-timeline__item :deep(.step-diagnostic) {
  margin: 0 11px 11px;
}

.step-card-grid {
  display: grid;
  max-height: 560px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  overflow: auto;
}

.step-card-grid article {
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-2);
}

.step-card-grid article.failed {
  border-color: rgb(var(--danger-3));
}

.step-card-grid article.active {
  grid-column: 1 / -1;
  box-shadow: 0 8px 22px rgb(0 0 0 / 6%);
}

.step-card-grid article>button {
  display: grid;
  width: 100%;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  padding: 13px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.step-card-grid article>button em {
  grid-column: 2;
  color: var(--color-text-3);
  font-size: 11px;
  font-style: normal;
}

.step-card-grid__title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.step-card-grid__title strong,
.step-card-grid__title small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-card-grid__title small {
  color: var(--color-text-3);
  font-weight: 400;
}

.step-card-grid article :deep(.step-diagnostic) {
  margin: 0 12px 12px;
}

.step-expand-enter-active,
.step-expand-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.step-expand-enter-from,
.step-expand-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@keyframes history-expand-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {

  .step-history,
  .step-expand-enter-active,
  .step-expand-leave-active,
  .step-compact svg {
    animation: none;
    transition: none;
  }
}

@media (max-width: 900px) {
  .step-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .step-inspector {
    grid-template-columns: 1fr;
  }

  .step-inspector__nav {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--color-border-2);
  }

  .step-card-grid {
    grid-template-columns: 1fr;
  }

  .step-card-grid article.active {
    grid-column: auto;
  }
}
</style>
