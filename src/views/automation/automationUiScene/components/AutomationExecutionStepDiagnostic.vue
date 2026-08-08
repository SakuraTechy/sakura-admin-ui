<template>
  <div class="step-diagnostic">
    <div v-if="step.error !== '-'" class="step-diagnostic__error">
      {{ step.errorCode !== '-' ? `[${step.errorCode}] ` : '' }}{{ step.error }}
    </div>
    <div v-if="operationDiagnostic" class="step-diagnostic__operation">
      <div class="step-diagnostic__heading">
        <span>执行摘要</span>
        <a-tag size="small" color="arcoblue">
          {{ operationProfileView.label }}
        </a-tag>
      </div>
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="操作类型">
          {{ operationDiagnostic.method?.type_label || operationDiagnostic.method?.type_code || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="操作方法">
          {{ operationDiagnostic.method?.method_label || operationDiagnostic.method?.method_code || operationDiagnostic.method?.action_type || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="执行器">
          {{ operationDiagnostic.executor || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="执行结果">
          {{ operationDiagnostic.outcome?.summary || operationDiagnostic.summary || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="operationStatusColor">
            {{ operationStatusLabel }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item v-if="operationDiagnostic.target && operationProfileView.showTarget" :label="operationProfileView.targetTitle" :span="2">
          <code>{{ operationTargetLabel(operationDiagnostic.target) }}</code>
        </a-descriptions-item>
      </a-descriptions>
      <div v-if="operationAssertion" class="step-diagnostic__assertion">
        <div class="step-diagnostic__assertion-title">断言判定</div>
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="断言对象">{{ operationAssertion.subject || '-' }}</a-descriptions-item>
          <a-descriptions-item label="操作符">{{ assertionOperatorLabel(operationAssertion.operator) }}</a-descriptions-item>
          <a-descriptions-item label="期望值">
            <code>{{ operationValueLabel(operationAssertion.expected) }}</code>
          </a-descriptions-item>
          <a-descriptions-item label="实际值">
            <code>{{ operationValueLabel(operationAssertion.actual) }}</code>
          </a-descriptions-item>
          <a-descriptions-item label="判定" :span="2">
            <a-tag :color="operationAssertion.passed === true ? 'green' : 'red'">
              {{ operationAssertion.passed === true ? '通过' : '未通过' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </div>
      <div v-if="operationProfileView.showInputs" class="step-diagnostic__operation-inputs">
        <div class="step-diagnostic__operation-subtitle">{{ operationProfileView.inputTitle }}</div>
        <div v-if="operationInputs.length" class="step-diagnostic__operation-input-grid">
          <div class="step-diagnostic__operation-input-head">
            <span>参数</span>
            <span>配置值</span>
            <span>执行值</span>
            <span>来源</span>
          </div>
          <div v-for="input in operationInputs" :key="input.key" class="step-diagnostic__operation-input">
            <div class="step-diagnostic__operation-input-name">
              <span>{{ input.label || input.key }}</span>
              <small>{{ operationInputRoleLabel(input.role) }}</small>
            </div>
            <code>{{ operationInputValue(input.configured) }}</code>
            <code>{{ operationInputValue(input.effective, input.configured ? '执行器未返回' : '-') }}</code>
            <span class="step-diagnostic__operation-input-source">{{ operationInputSourceLabel(input) }}</span>
          </div>
        </div>
        <div v-else class="step-diagnostic__operation-empty">
          该操作无需配置参数，以下展示本次执行结果。
        </div>
      </div>
      <div v-if="operationProfileView.showFacts" class="step-diagnostic__operation-facts">
        <div class="step-diagnostic__operation-subtitle">{{ operationProfileView.factTitle }}</div>
        <template v-if="operationFacts.length">
          <div v-for="fact in operationFacts" :key="fact.key">
            <span>{{ fact.label || fact.key }}</span>
            <code>{{ operationFactLabel(fact) }}</code>
          </div>
        </template>
        <div v-else class="step-diagnostic__operation-empty">
          执行器未返回额外运行事实。
        </div>
      </div>
    </div>
    <div v-if="isDefinitionStatementStep && step.infrastructureTaskId" class="step-diagnostic__statement">
      <div class="step-diagnostic__heading">
        <span>{{ definitionStatementTitle }} · 定义快照</span>
        <div>
          <a-tag v-if="statement?.definitionVersion != null" size="small">
            v{{ statement.definitionVersion }}
          </a-tag>
          <a-tag v-if="statement?.sqlMode" size="small" color="arcoblue">
            {{ statement.sqlMode }}
          </a-tag>
        </div>
      </div>
      <div v-if="statementLoading" class="step-diagnostic__loading step-diagnostic__loading--statement">
        <a-spin size="small" />
      </div>
      <a-alert v-else-if="statementError" type="warning">{{ statementError }}</a-alert>
      <pre
        v-else-if="definitionStatementContent"
        tabindex="0"
        :aria-label="definitionStatementTitle"
      >{{ definitionStatementContent }}</pre>
    </div>
    <div v-if="variableReferences.length" class="step-diagnostic__variables">
      <div class="step-diagnostic__heading">
        <span>引用变量</span>
        <a-tag size="small">{{ variableReferences.length }} 个</a-tag>
      </div>
      <div class="step-diagnostic__variable-list">
        <div v-for="item in variableReferences" :key="item.reference">
          <code>{{ variableReferenceLabel(item) }}</code>
          <span>实际值</span>
          <code :class="{ 'is-masked': isVariableMasked(item) }">
            {{ variableDisplayValue(item) }}
          </code>
        </div>
      </div>
    </div>
    <div v-if="variableResult" class="step-diagnostic__variables">
      <div class="step-diagnostic__heading">
        <span>全局变量执行结果</span>
        <a-tag v-if="variableResult.source" size="small" color="arcoblue">
          {{ variableSourceLabel(variableResult.source) }}
        </a-tag>
      </div>
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="变量名">
          <code>{{ variableResult.variable_name || '-' }}</code>
        </a-descriptions-item>
        <a-descriptions-item label="变量值">
          <code :class="{ 'is-masked': isVariableMasked(variableResult) }">
            {{ variableDisplayValue(variableResult) }}
          </code>
        </a-descriptions-item>
        <a-descriptions-item label="来源" :span="2">
          {{ variableSourceLabel(variableResult.source) }}
        </a-descriptions-item>
      </a-descriptions>
    </div>
    <div v-if="infrastructureResult" class="step-diagnostic__section step-diagnostic__section--infrastructure">
      <div class="step-diagnostic__heading">
        <span>基础设施执行结果 · {{ infrastructureResult.kind || '-' }}</span>
        <a-tag :color="infrastructureResult.exitCode == null || infrastructureResult.exitCode === 0 ? 'green' : 'red'">
          {{ infrastructureResult.exitCode == null ? '执行成功' : `退出码 ${infrastructureResult.exitCode}` }}
        </a-tag>
      </div>
      <a-descriptions v-if="infrastructureResult" :column="2" size="small" bordered>
        <a-descriptions-item label="结果版本">v{{ infrastructureResult.schemaVersion || 1 }}</a-descriptions-item>
        <a-descriptions-item label="影响行数">{{ totalAffectedRows ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="返回行数">{{ totalRowCount ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="耗时">{{ infrastructureResult.durationMs ?? '-' }} ms</a-descriptions-item>
        <a-descriptions-item label="截断">{{ infrastructureResult.truncated ? '是' : '否' }}</a-descriptions-item>
      </a-descriptions>
      <a-alert v-if="infrastructureWarnings.length" type="warning">
        {{ infrastructureWarnings.join('；') }}
      </a-alert>
      <div v-if="fullResultLoading" class="step-diagnostic__loading step-diagnostic__loading--compact">
        <a-spin size="small" />
        <span>正在加载完整结果...</span>
      </div>
      <a-alert v-else-if="fullResultError" type="warning">{{ fullResultError }}</a-alert>
      <template v-for="(result, resultIndex) in structuredResults" :key="resultIndex">
        <div v-if="result.type === 'ROW_SET'" class="step-diagnostic__resultset">
          <div class="step-diagnostic__heading">
            <div class="step-diagnostic__resultset-title">
              <icon-list />
              <span>结果集 {{ resultIndex + 1 }}</span>
            </div>
            <div class="step-diagnostic__resultset-meta">
              <a-tag size="small">{{ result.rowCount ?? rowSetRows(result).length }} 行</a-tag>
              <a-tag v-if="artifactResult" size="small" color="arcoblue">完整附件</a-tag>
              <a-tag v-if="result.truncated" size="small" color="orange">已截断</a-tag>
            </div>
          </div>
          <a-table
            :key="`${step.rowKey}-${resultIndex}`"
            size="small"
            :pagination="rowSetPagination"
            row-key="__rowKey"
            stripe
            scrollbar
            :bordered="{ cell: true }"
            :scroll="rowSetScroll(result)"
            :data="rowSetRows(result)"
            :columns="rowSetColumns(result)"
          />
        </div>
        <a-descriptions v-else-if="result.type === 'UPDATE_COUNT'" :column="1" size="small" bordered>
          <a-descriptions-item label="更新计数">{{ result.affectedRows ?? 0 }}</a-descriptions-item>
        </a-descriptions>
        <div v-else-if="result.type === 'OUT_PARAMETERS'" class="step-diagnostic__resultset">
          <div class="step-diagnostic__heading">输出参数</div>
          <a-table
            size="small"
            :pagination="false"
            :data="result.parameters || []"
            :columns="outParameterColumns"
          />
        </div>
        <div v-else-if="result.type === 'NATIVE_RESULT'" class="step-diagnostic__output">
          <div class="step-diagnostic__heading">原生结果{{ result.operation ? ` · ${result.operation}` : '' }}</div>
          <pre>{{ prettyJson(result.value) }}</pre>
        </div>
      </template>
      <div v-if="infrastructureResult.stdout" class="step-diagnostic__output">
        <div class="step-diagnostic__heading">标准输出</div>
        <pre>{{ infrastructureResult.stdout }}</pre>
      </div>
      <div v-if="infrastructureResult.stderr" class="step-diagnostic__output step-diagnostic__output--error">
        <div class="step-diagnostic__heading">错误输出</div>
        <pre>{{ infrastructureResult.stderr }}</pre>
      </div>
    </div>
    <div v-else-if="isInfrastructureStep && infrastructureLoading" class="step-diagnostic__loading">
      <a-spin size="small" />
      <span>正在读取基础设施执行结果...</span>
    </div>
    <a-alert v-else-if="isInfrastructureStep && !variableResult" type="info">
      {{ infrastructureCompatibilityMessage }}
    </a-alert>
    <div v-if="artifactAvailable" class="step-diagnostic__artifact">
      <span>{{ infrastructureResult?.artifact?.fileName || '完整结果附件' }}</span>
      <small>{{ formatBytes(infrastructureResult?.artifact?.sizeBytes) }}</small>
      <a-button
        size="small"
        type="primary"
        :loading="artifactDownloading"
        :disabled="!step.infrastructureTaskId"
        @click="downloadArtifact"
      >
        <template #icon><icon-download /></template>
        下载完整结果
      </a-button>
      <a-button
        size="small"
        :loading="fullResultLoading"
        :disabled="!step.infrastructureTaskId"
        @click="toggleArtifactPreview"
      >
        <template #icon><icon-eye /></template>
        {{ artifactPreviewVisible ? '收起预览' : '在线预览' }}
      </a-button>
    </div>
    <div v-if="artifactPreviewVisible" class="step-diagnostic__artifact-preview">
      <div class="step-diagnostic__heading">
        <span>完整结果在线预览</span>
        <small>JSON</small>
      </div>
      <div v-if="fullResultLoading" class="step-diagnostic__loading step-diagnostic__loading--compact">
        <a-spin size="small" />
        <span>正在读取完整结果...</span>
      </div>
      <a-alert v-else-if="artifactPreviewError" type="warning">
        {{ artifactPreviewError }}
      </a-alert>
      <pre v-else tabindex="0" aria-label="完整结果在线预览">{{ artifactPreviewText }}</pre>
    </div>
    <div v-if="showLocatorSection" class="step-diagnostic__section">
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
    <div v-if="!isInfrastructureStep && locatorDiagnostics" class="step-diagnostic__semantic">
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
        class="step-diagnostic__semantic-target"
      >
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
    <details v-else-if="step.details && !isInfrastructureStep" :open="isFailed" class="step-diagnostic__raw">
      <summary>执行器诊断数据</summary>
      <pre tabindex="0" aria-label="执行器诊断数据">{{ prettyJson(step.details) }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { ExecutionHistoryStepRow } from '../execution'
import { executionResultColor, executionResultLabel } from '../execution'
import {
  downloadAutomationInfrastructureTaskArtifact,
  getAutomationInfrastructureTask,
  getAutomationInfrastructureTaskStatement,
} from '@/apis/automation/automationUiScene'
import type { AutomationInfrastructureStatementResp } from '@/apis/automation/automationUiScene'
import { useDownload } from '@/hooks/modules/useDownload'
import { getOperationDiagnosticProfileView } from './operationDiagnosticProfiles'

const props = defineProps<{ step: ExecutionHistoryStepRow }>()
const isFailed = computed(() => executionResultLabel(props.step.status) === '失败')
const stepDetails = computed<Record<string, any>>(() => (
  props.step.details && typeof props.step.details === 'object'
    ? props.step.details as Record<string, any>
    : {}
))
const operationDiagnostic = computed<Record<string, any> | null>(() => {
  const value = stepDetails.value.operation
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  const actionType = String(props.step.actionType || '').trim().toLowerCase()
  if (!actionType || actionType === '-') return null
  return {
    schema_version: 0,
    profile: legacyDiagnosticProfile(actionType),
    executor: 'legacy',
    method: { action_type: actionType },
    summary: '该历史记录未保存类型化执行详情',
    outcome: { kind: 'legacy', summary: '该历史记录未保存类型化执行详情', facts: [] },
  }
})
const operationInputs = computed<Record<string, any>[]>(() => (
  Array.isArray(operationDiagnostic.value?.inputs)
    ? operationDiagnostic.value.inputs.filter((item: any) => item && typeof item === 'object')
    : []
))
const operationProfileView = computed(() => getOperationDiagnosticProfileView(operationDiagnostic.value?.profile))
const operationStatus = computed(() => operationDiagnostic.value?.outcome?.status || props.step.status)
const operationStatusLabel = computed(() => executionResultLabel(operationStatus.value))
const operationStatusColor = computed(() => executionResultColor(operationStatus.value))
const operationFacts = computed<Record<string, any>[]>(() => (
  Array.isArray(operationDiagnostic.value?.outcome?.facts)
    ? operationDiagnostic.value.outcome.facts.filter((item: any) => item && typeof item === 'object')
    : []
))
const operationAssertion = computed<Record<string, any> | null>(() => {
  const value = operationDiagnostic.value?.outcome?.assertion
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
})
const locatorDiagnostics = computed<Record<string, any> | null>(() => {
  const details = stepDetails.value
  const value = details.locator_diagnostics || details.locatorDiagnostics
  return value && typeof value === 'object' ? value : null
})

const variableResult = computed<Record<string, any> | null>(() => {
  const value = stepDetails.value.variable
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
})
const variableReferences = computed<Record<string, any>[]>(() => {
  const value = stepDetails.value.variable_references || stepDetails.value.variableReferences
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    : []
})

const embeddedInfrastructureResult = computed<Record<string, any> | null>(() => {
  const details = stepDetails.value
  const value = details.infrastructure || details.Infrastructure
  return value && typeof value === 'object' ? value : null
})
const infrastructureActionTypes = new Set([
  'server_command',
  'database_sql',
  'database_native',
  'host_command',
  'host_file_lookup',
  'host_file_delete',
  'host_pointer_move',
  'server_file_upload',
  'global_variable_system_info',
  'global_variable_available_ip',
  'global_variable_property',
])
const isInfrastructureStep = computed(() => infrastructureActionTypes.has(String(props.step.actionType).toLowerCase()))
const isDatabaseSqlStep = computed(() => String(props.step.actionType).toLowerCase() === 'database_sql')
const isServerCommandStep = computed(() => String(props.step.actionType).toLowerCase() === 'server_command')
const isDefinitionStatementStep = computed(() => isDatabaseSqlStep.value || isServerCommandStep.value)
const showLocatorSection = computed(() => !isInfrastructureStep.value && (
  props.step.configuredLocators.length > 0 || props.step.hasActualLocator || locatorDiagnostics.value != null
))
const loadedInfrastructureResult = ref<Record<string, any> | null>(null)
const infrastructureLoading = ref(false)
const infrastructureCompatibilityMessage = ref('该历史记录未保存基础设施执行结果预览。')
const previewInfrastructureResult = computed(() => embeddedInfrastructureResult.value || loadedInfrastructureResult.value)
const artifactResult = ref<Record<string, any> | null>(null)
const artifactWarnings = ref<string[]>([])
const fullResultLoading = ref(false)
const fullResultError = ref('')
const artifactContentSize = ref(0)
const artifactRawPreview = ref('')
const statement = ref<AutomationInfrastructureStatementResp | null>(null)
const statementLoading = ref(false)
const statementError = ref('')
const definitionStatementTitle = computed(() => isServerCommandStep.value ? '执行命令' : '执行 SQL')
const definitionStatementContent = computed(() => (
  isServerCommandStep.value ? statement.value?.command : statement.value?.sql
))
const infrastructureResult = computed<Record<string, any> | null>(() => {
  const preview = previewInfrastructureResult.value
  if (!preview || !artifactResult.value) return preview
  const results = normalizeArtifactResults(artifactResult.value)
  if (!results.length) return preview
  return {
    ...preview,
    results,
    resultSets: undefined,
    rowCount: undefined,
    truncated: artifactResultTruncated(artifactResult.value),
    warnings: [...new Set([
      ...(Array.isArray(preview.warnings) ? preview.warnings.map(String) : []),
      ...artifactWarnings.value,
    ])],
  }
})
let infrastructureRequestSequence = 0
const MAX_ARTIFACT_PREVIEW_BYTES = 2 * 1024 * 1024
const MAX_ARTIFACT_TABLE_BYTES = 10 * 1024 * 1024
const rowSetPagination = {
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  showTotal: true,
  showPageSize: true,
  showJumper: true,
  size: 'small' as const,
}
const artifactPreviewVisible = ref(false)
const artifactPreviewText = ref('')
const artifactPreviewError = ref('')
let artifactPreviewRequestSequence = 0

function resetArtifactState() {
  artifactPreviewRequestSequence += 1
  artifactPreviewVisible.value = false
  artifactPreviewText.value = ''
  artifactPreviewError.value = ''
  artifactResult.value = null
  artifactWarnings.value = []
  artifactContentSize.value = 0
  artifactRawPreview.value = ''
  fullResultLoading.value = false
  fullResultError.value = ''
}

watch(
  () => [props.step.rowKey, props.step.infrastructureTaskId, embeddedInfrastructureResult.value],
  async () => {
    const requestSequence = ++infrastructureRequestSequence
    resetArtifactState()
    loadedInfrastructureResult.value = null
    infrastructureLoading.value = false
    infrastructureCompatibilityMessage.value = '该历史记录未保存基础设施执行结果预览。'
    statement.value = null
    statementLoading.value = false
    statementError.value = ''
    if (!isInfrastructureStep.value || !props.step.infrastructureTaskId) return
    if (!embeddedInfrastructureResult.value) {
      infrastructureLoading.value = true
      try {
        const { data } = await getAutomationInfrastructureTask(props.step.infrastructureTaskId)
        if (requestSequence !== infrastructureRequestSequence) return
        const result = data?.result && typeof data.result === 'object'
          ? data.result as Record<string, any>
          : {}
        const preview = result.infrastructure
        if (preview && typeof preview === 'object' && !Array.isArray(preview)) {
          loadedInfrastructureResult.value = {
            ...preview,
            kind: preview.kind || String(data.actionType || props.step.actionType).toUpperCase(),
            exitCode: preview.exitCode ?? data.exitCode,
            affectedRows: preview.affectedRows ?? data.affectedRows,
          }
        } else {
          infrastructureCompatibilityMessage.value = '该历史任务未保存可展示的基础设施结果预览。'
        }
      } catch {
        if (requestSequence === infrastructureRequestSequence) {
          infrastructureCompatibilityMessage.value = '未能读取该历史任务的结果预览，请确认记录归属或任务是否已清理。'
        }
      } finally {
        if (requestSequence === infrastructureRequestSequence) infrastructureLoading.value = false
      }
    }
    if (isDefinitionStatementStep.value) {
      statementLoading.value = true
      try {
        const { data } = await getAutomationInfrastructureTaskStatement(props.step.infrastructureTaskId)
        if (requestSequence === infrastructureRequestSequence) statement.value = data
      } catch {
        if (requestSequence === infrastructureRequestSequence) {
          statementError.value = `未能读取该步骤绑定的${isServerCommandStep.value ? '服务器命令' : ' SQL'}定义快照。`
        }
      } finally {
        if (requestSequence === infrastructureRequestSequence) statementLoading.value = false
      }
    }
    const preview = previewInfrastructureResult.value
    if (requestSequence === infrastructureRequestSequence && preview?.truncated && preview?.artifact?.available === true) {
      await loadFullArtifact()
    }
  },
  { immediate: true },
)

const structuredResults = computed<any[]>(() => {
  const value = infrastructureResult.value
  if (!value) return []
  if (Array.isArray(value.results)) return value.results
  // schema v1 历史结果使用列名数组和行对象，只读转换为统一展示结构。
  if (Array.isArray(value.resultSets)) {
    return value.resultSets.map((resultSet: any) => ({ type: 'ROW_SET', ...resultSet }))
  }
  return []
})

const infrastructureWarnings = computed<string[]>(() => {
  const warnings = infrastructureResult.value?.warnings
  return Array.isArray(warnings) ? warnings.map((value) => String(value)) : []
})

const artifactAvailable = computed(() => infrastructureResult.value?.artifact?.available === true)
const artifactDownloading = ref(false)

function normalizeArtifactResults(result: Record<string, any>) {
  if (Array.isArray(result.results)) return result.results
  if (['ROW_SET', 'UPDATE_COUNT', 'OUT_PARAMETERS', 'NATIVE_RESULT'].includes(String(result.type))) return [result]
  return []
}

function artifactResultTruncated(result: Record<string, any>) {
  if (result.truncated === true) return true
  return normalizeArtifactResults(result).some((item) => item?.truncated === true)
}

async function loadFullArtifact() {
  if (fullResultLoading.value || artifactResult.value) return
  const taskId = props.step.infrastructureTaskId
  if (!taskId) return
  const requestSequence = ++artifactPreviewRequestSequence
  fullResultLoading.value = true
  fullResultError.value = ''
  try {
    const response = await downloadAutomationInfrastructureTaskArtifact(taskId)
    if (requestSequence !== artifactPreviewRequestSequence) return
    if (!(response.data instanceof Blob) || response.data.size > MAX_ARTIFACT_TABLE_BYTES) {
      throw new Error('invalid artifact')
    }
    artifactContentSize.value = response.data.size
    const content = await response.data.text()
    if (requestSequence !== artifactPreviewRequestSequence) return
    const envelope = JSON.parse(content) as Record<string, any>
    if (!envelope.result || typeof envelope.result !== 'object' || Array.isArray(envelope.result)) {
      throw new Error('invalid artifact envelope')
    }
    artifactResult.value = envelope.result as Record<string, any>
    artifactWarnings.value = Array.isArray(envelope.warnings) ? envelope.warnings.map(String) : []
    if (response.data.size <= MAX_ARTIFACT_PREVIEW_BYTES) {
      artifactRawPreview.value = JSON.stringify(envelope, null, 2)
      if (artifactPreviewVisible.value) artifactPreviewText.value = artifactRawPreview.value
    } else if (artifactPreviewVisible.value) {
      artifactPreviewError.value = '附件超过 2 MB，请下载查看完整结果。'
    }
  } catch {
    if (requestSequence === artifactPreviewRequestSequence) {
      fullResultError.value = '完整结果加载失败，当前继续显示受限预览。'
      if (artifactPreviewVisible.value) {
        artifactPreviewError.value = '完整结果读取失败，请确认附件仍有效或直接下载查看。'
      }
    }
  } finally {
    if (requestSequence === artifactPreviewRequestSequence) fullResultLoading.value = false
  }
}

async function toggleArtifactPreview() {
  if (artifactPreviewVisible.value) {
    artifactPreviewVisible.value = false
    return
  }
  artifactPreviewVisible.value = true
  if (artifactPreviewText.value || artifactPreviewError.value || fullResultLoading.value) return

  const taskId = props.step.infrastructureTaskId
  if (!taskId) {
    artifactPreviewError.value = '缺少基础设施任务 ID，无法读取完整结果。'
    return
  }
  const declaredSize = artifactContentSize.value || Number(infrastructureResult.value?.artifact?.sizeBytes)
  if (Number.isFinite(declaredSize) && declaredSize > MAX_ARTIFACT_PREVIEW_BYTES) {
    artifactPreviewError.value = '附件超过 2 MB，请下载查看完整结果。'
    return
  }

  if (!artifactResult.value) await loadFullArtifact()
  if (artifactContentSize.value > MAX_ARTIFACT_PREVIEW_BYTES) {
    artifactPreviewError.value = '附件超过 2 MB，请下载查看完整结果。'
  } else if (artifactRawPreview.value) {
    artifactPreviewText.value = artifactRawPreview.value
  } else if (fullResultError.value) {
    artifactPreviewError.value = '完整结果读取失败，请确认附件仍有效或直接下载查看。'
  }
}

async function downloadArtifact() {
  if (!props.step.infrastructureTaskId || artifactDownloading.value) return
  artifactDownloading.value = true
  try {
    await useDownload(
      () => downloadAutomationInfrastructureTaskArtifact(props.step.infrastructureTaskId),
      false,
      infrastructureResult.value?.artifact?.fileName || `${props.step.infrastructureTaskId}.json`,
      '.json',
    )
  } finally {
    artifactDownloading.value = false
  }
}

function formatBytes(value: unknown) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const rowSetRows = (result: any) => {
  const rows = Array.isArray(result?.rows) ? result.rows : []
  if (!rows.length) return rows
  if (!Array.isArray(rows[0])) {
    return rows.map((row: Record<string, unknown>, rowIndex: number) => ({ ...row, __rowKey: rowIndex }))
  }
  return rows.map((row: any[], rowIndex: number) => {
    const record: Record<string, unknown> = { __rowKey: rowIndex }
    row.forEach((value, columnIndex) => {
      record[`column_${columnIndex}`] = value
    })
    return record
  })
}

const totalAffectedRows = computed<number | null>(() => {
  const legacy = infrastructureResult.value?.affectedRows
  if (legacy != null) return Number(legacy)
  const counts = structuredResults.value
    .filter((result) => result?.type === 'UPDATE_COUNT' && result.affectedRows != null)
    .map((result) => Number(result.affectedRows))
    .filter(Number.isFinite)
  return counts.length ? counts.reduce((total, value) => total + value, 0) : null
})

const totalRowCount = computed<number | null>(() => {
  const legacy = infrastructureResult.value?.rowCount
  if (legacy != null) return Number(legacy)
  const counts = structuredResults.value
    .filter((result) => result?.type === 'ROW_SET')
    .map((result) => Number(result.rowCount ?? rowSetRows(result).length))
    .filter(Number.isFinite)
  return counts.length ? counts.reduce((total, value) => total + value, 0) : null
})

const numericJdbcTypes = new Set([-7, -6, 5, 4, -5, 6, 7, 8, 2, 3])
const temporalJdbcTypes = new Set([91, 92, 93, 2013, 2014])
const ROW_SET_COLUMN_MAX_WIDTH = 260
const ROW_SET_WIDTH_SAMPLE_SIZE = 100

const rowSetDataIndex = (result: any, metadata: Record<string, any>, columnIndex: number) => (
  Array.isArray(result?.rows?.[0])
    ? `column_${columnIndex}`
    : String(metadata.name || metadata.label || `column_${columnIndex}`)
)

const rowSetColumnMinWidth = (metadata: Record<string, any>) => {
  const jdbcType = Number(metadata.jdbcType)
  if (jdbcType === 16) return 88
  if (numericJdbcTypes.has(jdbcType)) return 96
  if (temporalJdbcTypes.has(jdbcType)) return 152
  return 112
}

const displayWidthUnits = (value: unknown) => {
  const text = formatCell(value)
  return Array.from(text).reduce((total, character) => total + (character.codePointAt(0)! > 0xFF ? 2 : 1), 0)
}

const rowSetColumnWidth = (metadata: Record<string, any>, result: any, columnIndex: number) => {
  const dataIndex = rowSetDataIndex(result, metadata, columnIndex)
  const rows = Array.isArray(result?.rows) ? result.rows.slice(0, ROW_SET_WIDTH_SAMPLE_SIZE) : []
  const contentWidthUnits = rows.reduce((maximum: number, row: any) => {
    const value = Array.isArray(row) ? row[columnIndex] : row?.[dataIndex]
    return Math.max(maximum, displayWidthUnits(value))
  }, displayWidthUnits(metadata.label || metadata.name || `列 ${columnIndex + 1}`))
  const contentWidth = Math.ceil(contentWidthUnits * 7 + 28)
  return Math.min(ROW_SET_COLUMN_MAX_WIDTH, Math.max(rowSetColumnMinWidth(metadata), contentWidth))
}

const rowSetColumns = (result: any) => {
  const columns = Array.isArray(result?.columns) ? result.columns : []
  return columns.map((column: any, index: number) => {
    const metadata = column && typeof column === 'object' ? column : { name: String(column), label: String(column) }
    const dataIndex = rowSetDataIndex(result, metadata, index)
    return {
      title: metadata.label || metadata.name || `列 ${index + 1}`,
      dataIndex,
      width: rowSetColumnWidth(metadata, result, index),
      // fixed: index === 0 && columns.length > 6 ? 'left' : undefined,
      align: 'left',
      ellipsis: false,
      render: ({ record }: any) => formatCell(record[dataIndex]),
    }
  })
}

const rowSetScroll = (result: any) => {
  const columns = Array.isArray(result?.columns) ? result.columns : []
  if (!columns.length) return undefined
  const width = columns.reduce((total: number, column: any, index: number) => {
    const metadata = column && typeof column === 'object' ? column : { name: String(column), label: String(column) }
    return total + rowSetColumnWidth(metadata, result, index)
  }, 0)
  return { x: width }
}

const outParameterColumns = [
  { title: '名称', dataIndex: 'name', ellipsis: true },
  { title: '位置', dataIndex: 'position', width: 72 },
  { title: '类型', dataIndex: 'typeName', ellipsis: true },
  { title: '值', dataIndex: 'value', ellipsis: true, render: ({ record }: any) => formatCell(record.value) },
]

function formatCell(value: unknown) {
  if (value == null) return 'NULL'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function isVariableMasked(variable: Record<string, any>) {
  return ['1', 'true'].includes(String(variable.value_masked ?? variable.valueMasked ?? '').toLowerCase())
}

function variableDisplayValue(variable: Record<string, any>) {
  if (isVariableMasked(variable)) return '******'
  const value = variable.value_preview ?? variable.valuePreview
  return value == null || value === '' ? '-' : String(value)
}

function variableReferenceLabel(variable: Record<string, any>) {
  const reference = String(variable.reference || variable.variable_name || '').trim()
  return reference ? `\${${reference}}` : '-'
}

function variableSourceLabel(source: unknown) {
  const labels: Record<string, string> = {
    date: '日期时间',
    formula: '计算公式',
    literal: '固定值',
    locator: '页面元素',
    script: '页面脚本',
    infrastructure: '执行节点',
    initial: '初始变量',
  }
  if (source && typeof source === 'object') {
    const sourceObject = source as Record<string, any>
    return String(sourceObject.label || sourceObject.code || '-')
  }
  const value = String(source || '')
  return labels[value] || value
}

function diagnosticProfileLabel(profile: unknown) {
  const labels: Record<string, string> = {
    navigation: '页面与窗口',
    element_interaction: '元素交互',
    dialog: '浏览器弹框',
    assertion: '断言检查',
    wait: '等待控制',
    variable: '变量处理',
    script: '脚本执行',
    infrastructure: '基础设施',
    generic: '通用动作',
  }
  const value = String(profile || 'generic')
  return labels[value] || value
}

function legacyDiagnosticProfile(actionType: string) {
  if (['navigate', 'switch_page', 'close_page', 'close_all_pages', 'reload', 'frame_switch', 'frame_parent', 'frame_main'].includes(actionType)) return 'navigation'
  if (['dialog_accept', 'dialog_dismiss', 'dialog_prompt'].includes(actionType)) return 'dialog'
  if (['assert_text', 'assert_text_not', 'assert_attribute', 'assert_script', 'assert_database_value', 'assert_variable_list', 'assert_variable_list_not', 'assert_text_regex'].includes(actionType)) return 'assertion'
  if (['wait', 'implicit_wait'].includes(actionType)) return 'wait'
  if (['captcha_ocr', 'global_variable_set', 'global_variable_date', 'global_variable_formula', 'global_variable_system_info', 'global_variable_available_ip', 'global_variable_property'].includes(actionType)) return 'variable'
  if (actionType === 'evaluate') return 'script'
  if (['server_command', 'database_sql', 'database_native', 'host_command', 'host_file_lookup', 'host_file_delete', 'host_pointer_move', 'server_file_upload'].includes(actionType)) return 'infrastructure'
  if (['click', 'input', 'input_date', 'file_upload', 'certificate_upload', 'clear', 'key', 'hover', 'scroll_to_element', 'pointer_move', 'select_option', 'combo_select'].includes(actionType)) return 'element_interaction'
  return 'generic'
}

function operationTargetLabel(target: Record<string, any>) {
  return target.actual_summary || target.configured_summary || target.kind || '-'
}

function operationInputValue(value: Record<string, any> | null | undefined, missingLabel = '-') {
  if (!value || typeof value !== 'object') return missingLabel
  if (value.value_state === 'masked') return '******'
  if (value.value_state === 'restricted') return '需通过定义快照查看'
  if (value.value_state === 'unavailable') return '执行器未返回'
  return value.preview == null || value.preview === '' ? '-' : String(value.preview)
}

function operationInputRoleLabel(role: unknown) {
  const labels: Record<string, string> = {
    target: '目标',
    expected: '期望',
    binding: '绑定',
    definition: '定义',
    control: '控制',
    input: '输入',
  }
  return labels[String(role || '')] || '参数'
}

function operationInputSourceLabel(input: Record<string, any>) {
  const rawSource = input.source || input.source_type || input.sourceType
  const source = rawSource && typeof rawSource === 'object'
    ? String(rawSource.code || rawSource.label || '').trim()
    : String(rawSource || '').trim()
  const labels: Record<string, string> = {
    variable_reference: '引用变量',
    literal: '固定值',
    date: '日期时间',
    formula: '计算公式',
    locator: '元素定位',
    infrastructure: '基础设施',
    runtime: '运行时',
    environment: '执行环境',
    default: '默认值',
    definition_snapshot: '定义快照',
    executor: '执行器返回',
    legacy_step: '旧步骤定义',
  }
  if (rawSource && typeof rawSource === 'object' && rawSource.label) return String(rawSource.label)
  if (source) return labels[source] || source
  if (input.configured && input.effective) return '配置并解析'
  if (input.effective) return '执行器返回'
  if (input.configured) return '用例配置'
  return '-'
}

function operationFactLabel(fact: Record<string, any>) {
  const value = fact.value
  if (value == null) return '-'
  if (typeof value !== 'object') return String(value)
  if (value.value_state === 'masked') return '******'
  if (value.value_state === 'restricted') return '需通过定义快照查看'
  return value.preview == null || value.preview === '' ? '-' : String(value.preview)
}

function operationValueLabel(value: Record<string, any> | null | undefined) {
  if (value == null) return '-'
  if (typeof value !== 'object') return String(value)
  if (value.value_state === 'masked') return '******'
  if (value.value_state === 'restricted') return '需通过定义快照查看'
  if (value.value_state === 'unavailable') return '执行器未返回'
  return value.preview == null || value.preview === '' ? '-' : String(value.preview)
}

function assertionOperatorLabel(operator: unknown) {
  const labels: Record<string, string> = {
    contains: '包含',
    not_contains: '不包含',
    equals: '等于',
    regex_match: '匹配正则',
  }
  const value = String(operator || '')
  return labels[value] || value || '-'
}

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

.step-diagnostic__operation {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(var(--primary-2));
  border-radius: 6px;
  background: var(--color-bg-2);
}

.step-diagnostic__operation > .step-diagnostic__heading {
  min-height: 38px;
  margin: 0;
  padding: 0 12px;
  border-bottom: 1px solid rgb(var(--primary-2));
  background: rgb(var(--primary-1));
}

.step-diagnostic__operation :deep(.arco-descriptions) {
  margin: 10px 12px 0;
}

.step-diagnostic__assertion {
  margin: 10px 12px 0;
  padding-top: 10px;
  border-top: 1px solid var(--color-border-2);
}

.step-diagnostic__assertion-title {
  margin-bottom: 7px;
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
}

.step-diagnostic__operation-inputs,
.step-diagnostic__operation-facts {
  display: flex;
  flex-direction: column;
  margin: 10px 12px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 5px;
  background: var(--color-bg-1);
  overflow: hidden;
}

.step-diagnostic__operation-subtitle {
  padding: 7px 10px;
  border-bottom: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
  background: var(--color-fill-1);
}

.step-diagnostic__operation-input-grid {
  min-width: 680px;
  overflow-x: auto;
}

.step-diagnostic__operation-empty {
  padding: 12px 10px;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 1.6;
}

.step-diagnostic__operation-input-head,
.step-diagnostic__operation-input,
.step-diagnostic__operation-facts > div {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(112px, 0.3fr) minmax(130px, 0.8fr) minmax(130px, 0.9fr) minmax(100px, 0.35fr);
  align-items: start;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border-1);
}

.step-diagnostic__operation-input-head {
  padding-top: 6px;
  padding-bottom: 6px;
  color: var(--color-text-3);
  font-size: 12px;
  font-weight: 600;
  background: var(--color-fill-1);
}

.step-diagnostic__operation-input:last-child,
.step-diagnostic__operation-facts > div:last-child {
  border-bottom: 0;
}

.step-diagnostic__operation-input-name,
.step-diagnostic__operation-facts > div > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  color: var(--color-text-3);
  font-size: 12px;
}

.step-diagnostic__operation-input-name > span {
  overflow: hidden;
  color: var(--color-text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-diagnostic__operation-input-name > small {
  color: var(--color-text-4);
  font-size: 11px;
}

.step-diagnostic__operation-input > code {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.step-diagnostic__operation-facts > .step-diagnostic__operation-empty {
  display: block;
  padding: 12px 10px;
}

.step-diagnostic__operation-input-source {
  color: var(--color-text-3);
  font-size: 12px;
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

.step-diagnostic__section,
.step-diagnostic__resultset,
.step-diagnostic__output {
  min-width: 0;
}

.step-diagnostic__section--infrastructure {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-diagnostic__section--infrastructure > .step-diagnostic__heading {
  margin-bottom: 0;
}

.step-diagnostic__statement {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
}

.step-diagnostic__variables {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
}

.step-diagnostic__variables > .step-diagnostic__heading {
  min-height: 38px;
  margin: 0;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-fill-1);
}

.step-diagnostic__variables code {
  color: var(--color-text-1);
  font-size: 12px;
  white-space: pre-wrap;
}

.step-diagnostic__variables code.is-masked {
  color: rgb(var(--warning-6));
}

.step-diagnostic__variable-list {
  display: flex;
  flex-direction: column;
}

.step-diagnostic__variable-list > div {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(130px, 0.7fr) 52px minmax(180px, 1.3fr);
  align-items: start;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-1);
}

.step-diagnostic__variable-list > div:last-child {
  border-bottom: 0;
}

.step-diagnostic__variable-list span {
  color: var(--color-text-3);
  font-size: 12px;
}

.step-diagnostic__statement > .step-diagnostic__heading {
  min-height: 38px;
  margin: 0;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-fill-1);
}

.step-diagnostic__statement > .step-diagnostic__heading > div {
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-diagnostic__statement pre {
  box-sizing: border-box;
  width: 100%;
  max-height: 220px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  background: #101828;
  color: #d0d5dd;
  font: 12px/1.65 Consolas, 'Courier New', monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.step-diagnostic__loading--statement {
  min-height: 72px;
}

.step-diagnostic__resultset,
.step-diagnostic__output {
  display: flex;
  flex-direction: column;
}

.step-diagnostic__resultset {
  overflow: hidden;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

// Arco 会为展开行中的嵌套小表格添加 -16px 外边距，此处必须恢复结果集自身的容器边界。
.step-diagnostic__resultset.step-diagnostic__resultset > :deep(.arco-table.arco-table-size-small) {
  margin: 0;
}

.step-diagnostic__resultset.step-diagnostic__resultset > :deep(.arco-table .arco-table-pagination) {
  margin: 0;
  padding: 10px 12px;
  border-top: 1px solid var(--color-border-2);
  background: var(--color-fill-1);
}

.step-diagnostic__resultset > .step-diagnostic__heading {
  min-height: 40px;
  margin: 0;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-fill-1);
}

.step-diagnostic__resultset-title,
.step-diagnostic__resultset-meta {
  display: flex;
  align-items: center;
  gap: 7px;
}

.step-diagnostic__resultset-title svg {
  color: rgb(var(--primary-6));
  font-size: 16px;
}

.step-diagnostic__resultset :deep(.arco-table-container) {
  border-radius: 0;
}

.step-diagnostic__resultset :deep(.arco-table-th) {
  height: 40px;
  border-bottom-color: var(--color-border-3);
  background: var(--color-fill-2);
  color: var(--color-text-1);
  font-size: 12px;
  font-weight: 600;
}

.step-diagnostic__resultset :deep(.arco-table-th .arco-table-cell) {
  justify-content: flex-start;
  padding: 10px 14px;
  font-family: Consolas, 'Courier New', monospace;
  text-align: left;
}

.step-diagnostic__resultset :deep(.arco-table-col-fixed-left) {
  background: var(--color-bg-2);
}

.step-diagnostic__resultset :deep(.arco-table-th.arco-table-col-fixed-left) {
  background: var(--color-fill-2);
}

.step-diagnostic__resultset :deep(.arco-table-col-fixed-left-last::after) {
  width: 8px;
  box-shadow: 4px 0 8px rgb(0 0 0 / 8%);
}

.step-diagnostic__resultset :deep(.arco-table-td) {
  height: 40px;
  color: var(--color-text-1);
  font-size: 12.5px;
}

.step-diagnostic__resultset :deep(.arco-table-td .arco-table-cell) {
  padding: 9px 14px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  white-space: normal;
  overflow-wrap: anywhere;
}

.step-diagnostic__resultset :deep(.arco-table-tr:hover .arco-table-td) {
  background: rgb(var(--primary-1));
}

.step-diagnostic__output {
  gap: 6px;
}

.step-diagnostic__artifact {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
}

.step-diagnostic__loading {
  display: flex;
  min-height: 96px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--color-text-3);
}

.step-diagnostic__artifact span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-diagnostic__artifact-preview {
  min-width: 0;
}

.step-diagnostic__artifact-preview pre {
  box-sizing: border-box;
  width: 100%;
  max-height: min(42vh, 460px);
  margin: 0;
  padding: 10px;
  overflow: auto;
  border-radius: 7px;
  background: #101828;
  color: #d0d5dd;
  font: 11px/1.6 Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.step-diagnostic__loading--compact {
  min-height: 120px;
  border-radius: 7px;
  background: var(--color-bg-2);
}

.step-diagnostic__output pre {
  box-sizing: border-box;
  max-height: 260px;
  margin: 0;
  padding: 9px 10px;
  overflow: auto;
  border-radius: 7px;
  background: #101828;
  color: #d0d5dd;
  font: 11px/1.55 Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.step-diagnostic__output--error pre {
  background: #2a1515;
  color: #ffb4b4;
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
