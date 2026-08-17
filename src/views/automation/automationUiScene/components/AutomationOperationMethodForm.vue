<template>
  <div class="automation-operation-method-form">
    <div v-if="method" class="method-toolbar" :class="{ 'method-toolbar--workbench': workbench }">
      <div class="method-heading">
        <div class="method-title-row">
          <span class="method-title">{{ method.label }}</span>
          <a-tooltip v-if="method.description" :content="method.description" position="top">
            <icon-question-circle class="method-help-icon" aria-label="方法说明" />
          </a-tooltip>
        </div>
        <span v-if="workbench && contextLabel" class="method-context">{{ contextLabel }}</span>
      </div>
      <a-tooltip v-if="!disabled && schemaFields.length > 0" content="重置为默认值">
        <a-button type="text" size="small" shape="circle" aria-label="重置为默认值" @click="handleReset">
          <template #icon><icon-refresh /></template>
        </a-button>
      </a-tooltip>
    </div>
    <a-alert v-if="compatibilityFieldNames.length > 0" type="warning" class="compatibility-alert">
      兼容保留参数：{{ compatibilityFieldNames.join('、') }}。当前目录未提供编辑控件，保存时由后端校验兼容性。
    </a-alert>
    <a-empty
      v-if="method && visibleSchemaFields.length === 0"
      description="此方法无需配置参数"
      class="empty-config"
    />
    <a-form v-if="method && visibleSchemaFields.length > 0" :model="formValues" layout="vertical" class="method-config-form">
      <a-row :gutter="16">
        <a-col
          v-for="field in visibleSchemaFields"
          :key="field.name"
          :span="fieldSpan(field)"
        >
          <a-form-item :required="fieldRequired(field)">
            <template #label>
              <span class="field-label-row">
                <span>{{ field.label || field.name }}</span>
                <a-tooltip v-if="fieldTooltip(field)" position="top" content-class="automation-operation-tooltip-content">
                  <icon-question-circle class="field-help-icon" aria-label="字段说明" />
                  <template #content>
                    <div class="automation-operation-tooltip">
                      <div
                        v-for="line in tooltipLines(fieldTooltip(field))"
                        :key="line.key"
                        class="automation-operation-tooltip__line"
                        :class="{ 'automation-operation-tooltip__line--nested': line.depth > 0 }"
                      >
                        <span v-if="line.bullet" class="automation-operation-tooltip__bullet">{{ line.depth > 0 ? '◦' : '•' }}</span>
                        <span class="automation-operation-tooltip__content">
                          <template v-for="(segment, index) in line.segments" :key="`${line.key}-${index}`">
                            <code v-if="segment.kind === 'code'">{{ segment.text }}</code>
                            <strong v-else-if="segment.kind === 'strong'">{{ segment.text }}</strong>
                            <template v-else>{{ segment.text }}</template>
                          </template>
                        </span>
                      </div>
                    </div>
                  </template>
                </a-tooltip>
              </span>
            </template>
            <div v-if="isLocatorField(field)" class="locator-control">
              <a-select
                v-model="formValues[field.name].strategy"
                class="locator-strategy"
                :disabled="disabled"
                aria-label="定位策略"
              >
                <a-option
                  v-for="strategy in locatorStrategies"
                  :key="strategy.value"
                  :value="strategy.value"
                  :label="strategy.label"
                />
              </a-select>
              <a-input
                v-model="formValues[field.name].value"
                class="locator-value"
                :disabled="disabled"
                :placeholder="locatorPlaceholder(formValues[field.name].strategy)"
                allow-clear
              />
              <a-checkbox
                v-if="locatorSupportsExact(formValues[field.name].strategy)"
                v-model="formValues[field.name].exact"
                :disabled="disabled"
              >
                精确
              </a-checkbox>
            </div>
            <a-input-number
              v-else-if="field.component === 'number'"
              v-model="formValues[field.name]"
              :disabled="disabled"
              :precision="0"
              :min="fieldMin(field)"
              :max="fieldMax(field)"
              :placeholder="fieldPlaceholder(field)"
              style="width: 100%"
            />
            <a-select
              v-else-if="field.component === 'select' && selectOptions(field).length > 0"
              v-model="formValues[field.name]"
              :disabled="disabled"
              :placeholder="fieldPlaceholder(field)"
              allow-search
              allow-clear
            >
              <a-option
                v-for="option in selectOptions(field)"
                :key="String(option.value)"
                :value="option.value"
                :label="option.label"
              />
              <template #option="{ data }">
                <span class="select-option-row">
                  <span>{{ data.label }}</span>
                  <a-tooltip v-if="selectOptionHelp(field, data.value)" position="right" content-class="automation-operation-tooltip-content">
                    <icon-question-circle class="select-option-help-icon" aria-label="选项说明" />
                    <template #content>
                      <div class="automation-operation-tooltip">
                        <div
                          v-for="line in tooltipLines(selectOptionHelp(field, data.value))"
                          :key="line.key"
                          class="automation-operation-tooltip__line"
                          :class="{ 'automation-operation-tooltip__line--nested': line.depth > 0 }"
                        >
                          <span v-if="line.bullet" class="automation-operation-tooltip__bullet">{{ line.depth > 0 ? '◦' : '•' }}</span>
                          <span class="automation-operation-tooltip__content">
                            <template v-for="(segment, index) in line.segments" :key="`${line.key}-${index}`">
                              <code v-if="segment.kind === 'code'">{{ segment.text }}</code>
                              <strong v-else-if="segment.kind === 'strong'">{{ segment.text }}</strong>
                              <template v-else>{{ segment.text }}</template>
                            </template>
                          </span>
                        </div>
                      </div>
                    </template>
                  </a-tooltip>
                </span>
              </template>
            </a-select>
            <div v-else-if="isCertificateReferenceField(field)" class="certificate-reference-control">
              <a-select
                :model-value="resourceSlotId(formValues[field.name])"
                :disabled="disabled"
                :loading="resourceSlotsLoading"
                placeholder="请选择证书角色"
                allow-search
                allow-clear
                @change="value => setEnvironmentResourceRef(field.name, value)"
              >
                <a-option
                  v-for="slot in certificateSlots"
                  :key="slot.slotId"
                  :value="String(slot.slotId)"
                  :label="slot.resourceName"
                />
              </a-select>
            </div>
            <a-textarea
              v-else-if="isLongText(field)"
              v-model="formValues[field.name]"
              :disabled="disabled"
              :placeholder="fieldPlaceholder(field)"
              :auto-size="{ minRows: field.component === 'code' ? 5 : 2, maxRows: 12 }"
            />
            <a-input
              v-else
              v-model="formValues[field.name]"
              :disabled="disabled"
              :placeholder="fieldPlaceholder(field)"
              allow-clear
            />
            <!-- <div v-if="fieldHelp(field)" class="field-help">{{ fieldHelp(field) }}</div> -->
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
    <div v-if="workbench && referenceHint" class="method-result-hint">
      <span>保存后可在后续步骤中引用</span>
      <code>{{ referenceHint }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Modal } from '@arco-design/web-vue'
import type { AutomationOperationFormField, AutomationOperationMethod } from '@/apis/automation/automationOperationCatalog'
import { createAutomationOperationDefaultConfig, isAutomationOperationFieldRequired, isAutomationOperationFieldVisible, normalizeAutomationOperationConfig } from '@/apis/automation/automationOperationCatalog'
import type { AutomationUiStepConfig } from '@/apis/automation/automationUiScene'
import { listEnvironmentResourceSlots } from '@/apis/automation/environmentResources'
import type { EnvironmentResource } from '@/apis/automation/environmentResources'

const props = defineProps<{
  method?: AutomationOperationMethod
  modelValue?: AutomationUiStepConfig[]
  draftValue?: Record<string, unknown>
  disabled?: boolean
  confirmReset?: boolean
  workbench?: boolean
  contextLabel?: string
  sceneDbId?: string | number
  projectId?: string | number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AutomationUiStepConfig[]): void
  (e: 'update:draftValue', value: Record<string, unknown>): void
}>()

const formValues = reactive<Record<string, any>>({})
const extraMethodConfig = ref<Record<string, unknown>>({})
const schemaFields = computed(() => props.method?.form_schema || [])
const visibleSchemaFields = computed(() => schemaFields.value
  .filter((field) => isAutomationOperationFieldVisible(field, formValues)))
const compatibilityFieldNames = computed(() => Object.keys(extraMethodConfig.value))
const certificateSlots = ref<EnvironmentResource[]>([])
const resourceSlotsLoading = ref(false)
const referenceHint = computed(() => {
  if (!schemaFields.value.some((field) => field.name === 'variable_name')) return ''
  const variableName = String(formValues.variable_name || '').trim()
  return variableName ? `{{${variableName}}}` : ''
})
let syncing = false

type LocatorStrategy = 'css' | 'xpath' | 'text' | 'role' | 'label' | 'placeholder' | 'testid'
type TypedLocatorValue = Record<string, unknown> & {
  strategy: LocatorStrategy
  value: string
  exact: boolean
}
const locatorStrategies: Array<{ label: string; value: LocatorStrategy }> = [
  { label: 'CSS', value: 'css' },
  { label: 'XPath', value: 'xpath' },
  { label: '文本', value: 'text' },
  { label: 'Role', value: 'role' },
  { label: 'Label', value: 'label' },
  { label: 'Placeholder', value: 'placeholder' },
  { label: 'TestId', value: 'testid' },
]
const locatorPlaceholders: Record<LocatorStrategy, string> = {
  css: "button[type='submit']",
  xpath: "(//span[@class='user-title'])[1]",
  text: '系统管理平台',
  role: 'button',
  label: '用户名',
  placeholder: '请输入用户名',
  testid: 'user-title',
}
const isLocatorField = (field: AutomationOperationFormField) => field.component === 'locator'
const locatorPlaceholder = (strategy: LocatorStrategy) => locatorPlaceholders[strategy] || locatorPlaceholders.css
const locatorSupportsExact = (strategy: LocatorStrategy) => ['text', 'label'].includes(strategy)

const isCertificateReferenceField = (field: AutomationOperationFormField) => field.name === 'certificate_ref'
const resourceSlotId = (value: unknown) => value && typeof value === 'object'
  ? String((value as Record<string, unknown>).slot_id || '')
  : ''
const setEnvironmentResourceRef = (name: string, value: unknown) => {
  const slotId = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  formValues[name] = slotId
    ? { scope: 'project_environment', kind: 'certificate', slot_id: slotId }
    : ''
}
const loadCertificateSlots = async () => {
  if (!props.projectId) {
    certificateSlots.value = []
    return
  }
  resourceSlotsLoading.value = true
  try {
    const { data } = await listEnvironmentResourceSlots(props.projectId, 'CERTIFICATE')
    certificateSlots.value = data || []
  } finally {
    resourceSlotsLoading.value = false
  }
}

const getConfig = (items: AutomationUiStepConfig[] | undefined, name: string) => {
  const item = (items || []).find((value) => value?.paramsName === name)
  return item?.paramsValue == null ? '' : String(item.paramsValue)
}

const parseObject = (raw: string) => {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

const cloneObject = (value: Record<string, unknown>) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>

const isEmpty = (value: unknown) => value == null || (typeof value === 'string' && value.trim() === '')

const strategyFromCandidate = (target: Record<string, unknown>): { strategy: LocatorStrategy; value: string } | null => {
  const meta = target.locator_meta && typeof target.locator_meta === 'object'
    ? target.locator_meta as Record<string, unknown>
    : null
  const candidates = Array.isArray(meta?.candidates) ? meta.candidates as Array<Record<string, unknown>> : []
  const candidate = candidates.find((item) => String(item?.value || '').trim())
  if (!candidate) return null
  const type = String(candidate.type || '')
  const value = String(candidate.value || '')
  if (type === 'text_exact') return { strategy: 'text', value }
  if (type === 'css_attr_role') return { strategy: 'role', value: String((meta?.context as any)?.role || '') || value }
  if (type === 'css_attr_placeholder') return { strategy: 'placeholder', value: String((meta?.context as any)?.placeholder || '') || value }
  if (type.startsWith('css_attr_data-')) return { strategy: 'testid', value: String((meta?.context as any)?.test_id || '') || value }
  return null
}

const typedLocatorValue = (value: unknown): TypedLocatorValue => {
  if (typeof value === 'string') {
    const text = value.trim()
    const match = /^(css|xpath|text|role|label|placeholder|testid)\s*=\s*([\s\S]*)$/i.exec(text)
    if (match) return { strategy: match[1].toLowerCase() as LocatorStrategy, value: match[2], exact: true }
    const strategy = text.startsWith('/') || text.startsWith('(') || text.startsWith('.//') ? 'xpath' : 'css'
    return { strategy, value: text, exact: true }
  }
  if (!value || typeof value !== 'object') return { strategy: 'css', value: '', exact: true }
  const target = value as Record<string, unknown>
  const configuredStrategy = String(target.strategy || target.type || '').toLowerCase()
  const configuredValue = String(target.value || target.locator_value || '')
  if (locatorStrategies.some((item) => item.value === configuredStrategy) && configuredValue) {
    return { ...target, strategy: configuredStrategy as LocatorStrategy, value: configuredValue, exact: target.exact !== false }
  }
  if (typeof target.target_xpath === 'string' && target.target_xpath) return { ...target, strategy: 'xpath', value: target.target_xpath, exact: true }
  if (typeof target.xpath === 'string' && target.xpath) return { ...target, strategy: 'xpath', value: target.xpath, exact: true }
  const semantic = strategyFromCandidate(target)
  if (semantic) return { ...target, ...semantic, exact: true }
  if (typeof target.target_selector === 'string' && target.target_selector) return { ...target, strategy: 'css', value: target.target_selector, exact: true }
  if (typeof target.selector === 'string' && target.selector) return { ...target, strategy: 'css', value: target.selector, exact: true }
  return { ...target, strategy: 'css', value: '', exact: true }
}

const editableValue = (field: AutomationOperationFormField, value: unknown) => {
  if (isLocatorField(field)) {
    return typedLocatorValue(value)
  }
  if (field.component === 'number' && value !== '' && value != null) {
    const number = Number(value)
    return Number.isFinite(number) ? number : value
  }
  if (field.component === 'select' && Array.isArray(field.options)) {
    return field.options.find((option) => String(option.value) === String(value))?.value ?? value
  }
  if (Array.isArray(value)) return value.join(',')
  return value == null ? '' : value
}

const configValue = (field: AutomationOperationFormField, value: unknown) => {
  if (!isLocatorField(field)) return value
  const locator = typedLocatorValue(value)
  if (!locator.value.trim()) return ''
  return locator
}

const buildDraftMethodConfig = () => {
  const values: Record<string, unknown> = { ...extraMethodConfig.value }
  schemaFields.value.forEach((field) => {
    const value = configValue(field, formValues[field.name])
    if (!isEmpty(value)) values[field.name] = value
    else delete values[field.name]
  })
  return values
}

const normalizeMethodConfig = () => props.method
  ? normalizeAutomationOperationConfig(props.method, buildDraftMethodConfig())
  : buildDraftMethodConfig()

const buildConfigList = () => {
  if (!props.method) return props.modelValue || []
  const methodConfig = normalizeMethodConfig()
  // 手工目录步骤只提交声明性方法配置。legacy projection 和 playwright_step
  // 必须由 Admin assembler 集中生成，避免前端与各执行器的参数语义漂移。
  return [
    { paramsName: 'method_code', paramsValue: props.method.method_code },
    { paramsName: 'method_version', paramsValue: String(props.method.method_version) },
    { paramsName: 'method_config', paramsValue: JSON.stringify(methodConfig) },
  ]
}

const emitConfig = () => {
  if (syncing || !props.method) return
  const next = buildConfigList()
  if (JSON.stringify(next) !== JSON.stringify(props.modelValue || [])) emit('update:modelValue', next)
}

const emitDraft = () => {
  if (syncing || !props.method) return
  const next = buildDraftMethodConfig()
  if (JSON.stringify(next) !== JSON.stringify(props.draftValue || {})) emit('update:draftValue', cloneObject(next))
}

const syncFromModel = () => {
  syncing = true
  // 完整草稿保留条件隐藏字段；modelValue 只承载提交时允许出现的可见字段。
  const methodConfig = props.draftValue === undefined
    ? parseObject(getConfig(props.modelValue, 'method_config'))
    : cloneObject(props.draftValue)
  const schemaNames = new Set(schemaFields.value.map((field) => field.name))
  extraMethodConfig.value = Object.fromEntries(Object.entries(methodConfig).filter(([name]) => !schemaNames.has(name)))
  Object.keys(formValues).forEach((name) => delete formValues[name])
  schemaFields.value.forEach((field) => {
    formValues[field.name] = editableValue(field, methodConfig[field.name])
  })
  syncing = false
  emitDraft()
  emitConfig()
}

const resetForm = () => {
  if (!props.method) return
  const defaults = createAutomationOperationDefaultConfig(props.method)
  syncing = true
  extraMethodConfig.value = {}
  Object.keys(formValues).forEach((name) => delete formValues[name])
  schemaFields.value.forEach((field) => {
    formValues[field.name] = editableValue(field, defaults[field.name])
  })
  syncing = false
  emitDraft()
  emitConfig()
}

const handleReset = () => {
  if (!props.confirmReset) {
    resetForm()
    return
  }
  Modal.confirm({
    title: '重置方法参数',
    content: '当前填写内容将被清空，并恢复为该方法的默认值。',
    onOk: resetForm,
  })
}

const isLongText = (field: AutomationOperationFormField) => ['textarea', 'code', 'locator', 'target_ref'].includes(field.component)
const fieldSpan = (field: AutomationOperationFormField) => isLongText(field) ? 24 : 12
const canonicalizeVariableSyntax = (value: unknown) => String(value || '').replace(/\$\{([^{}]+)}/g, '{{$1}}')
const fieldPlaceholder = (field: AutomationOperationFormField) => canonicalizeVariableSyntax(field.placeholder || `请输入${field.label || field.name}`)
const fieldHelp = (field: AutomationOperationFormField) => {
  const help = canonicalizeVariableSyntax(field.help || '')
  if (field.name !== 'variable_name') return help
  const variableName = String(formValues[field.name] || '').trim()
  return variableName ? `后续步骤使用 {{${variableName}}} 引用该值。` : help
}
const fieldTooltip = (field: AutomationOperationFormField) => canonicalizeVariableSyntax(field.tooltip || field.help || '')
type TooltipSegment = { kind: 'text' | 'code' | 'strong'; text: string }
type TooltipLine = { key: number; depth: number; bullet: boolean; segments: TooltipSegment[] }

const parseTooltipInline = (value: string): TooltipSegment[] => {
  const segments: TooltipSegment[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) segments.push({ kind: 'text', text: value.slice(lastIndex, match.index) })
    const token = match[0]
    if (token.startsWith('`')) segments.push({ kind: 'code', text: token.slice(1, -1) })
    else segments.push({ kind: 'strong', text: token.slice(2, -2) })
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < value.length) segments.push({ kind: 'text', text: value.slice(lastIndex) })
  return segments.length > 0 ? segments : [{ kind: 'text', text: value }]
}

const tooltipLines = (value: string): TooltipLine[] => String(value || '').split(/\r?\n/).map((line, index) => {
  const match = /^(\s*)-\s+(.*)$/.exec(line)
  return {
    key: index,
    depth: match && match[1].length >= 2 ? 1 : 0,
    bullet: Boolean(match),
    segments: parseTooltipInline(match ? match[2] : line),
  }
})
const normalizeOptionValue = (value: unknown) => {
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).value
  }
  return value
}
const selectOptionHelp = (field: AutomationOperationFormField, value: unknown) => {
  const normalizedValue = String(normalizeOptionValue(value) ?? '')
  return canonicalizeVariableSyntax(selectOptions(field).find((option) => String(option.value) === normalizedValue)?.help || '')
}
const fieldMin = (field: AutomationOperationFormField) => field.min
const fieldMax = (field: AutomationOperationFormField) => field.max
const fieldRequired = (field: AutomationOperationFormField) => isAutomationOperationFieldRequired(field, formValues)
const selectOptions = (field: AutomationOperationFormField) => Array.isArray(field.options) ? field.options : []

watch(() => [props.method?.method_code, props.method?.method_version, props.modelValue, props.draftValue], syncFromModel, {
  deep: true,
  immediate: true,
})
watch(() => props.projectId, () => void loadCertificateSlots(), { immediate: true })
watch(formValues, () => {
  emitDraft()
  emitConfig()
}, { deep: true, flush: 'sync' })
</script>

<style scoped>
.automation-operation-method-form {
  width: 100%;
}

.method-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  margin-bottom: 12px;
}

.method-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.method-title-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.locator-control {
  display: grid;
  align-items: center;
  width: 100%;
  grid-template-columns: 132px minmax(0, 1fr) auto;
  gap: 8px;
}

.locator-strategy,
.locator-value {
  min-width: 0;
}

.field-label-row,
.select-option-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.field-help-icon,
.select-option-help-icon {
  color: var(--color-text-3);
  cursor: help;
  font-size: 14px;
}

.method-help-icon {
  color: var(--color-text-3);
  cursor: help;
  font-size: 14px;
}

:global(.automation-operation-tooltip) {
  width: max-content;
  max-width: min(560px, calc(100vw - 32px));
  color: #f8fafc;
  font-size: 12px;
  line-height: 1.6;
  white-space: normal;
}

:global(.arco-tooltip-content.automation-operation-tooltip-content) {
  width: max-content;
  max-width: min(560px, calc(100vw - 32px));
}

:global(.automation-operation-tooltip__line) {
  display: flex;
  align-items: flex-start;
  min-height: 20px;
}

:global(.automation-operation-tooltip__line--nested) {
  padding-left: 16px;
  color: #cbd5e1;
}

:global(.automation-operation-tooltip__bullet) {
  flex: 0 0 14px;
  color: #e2e8f0;
}

:global(.automation-operation-tooltip__content) {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}

:global(.automation-operation-tooltip code) {
  margin: 0 2px;
  padding: 1px 4px;
  border-radius: 4px;
  color: #e2e8f0;
  background: rgb(51 65 85 / 80%);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 11px;
}

.method-toolbar--workbench {
  align-items: flex-start;
  min-height: 0;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-2);
}

.method-toolbar--workbench .method-title {
  font-size: 18px;
  line-height: 28px;
}

.method-context {
  overflow: hidden;
  margin-top: 2px;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.method-title {
  color: var(--color-text-1);
  font-size: 14px;
  font-weight: 600;
}

.compatibility-alert {
  margin-bottom: 12px;
}

.empty-config {
  padding: 12px 0;
}

.field-help {
  margin-top: 4px;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 1.5;
}

.method-result-hint {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  margin-top: 8px;
  padding: 0 16px;
  border-left: 3px solid rgb(var(--success-6));
  color: var(--color-text-2);
  background: rgb(var(--success-1));
}

.method-result-hint code {
  color: rgb(var(--success-7));
  font-family: Consolas, 'Courier New', monospace;
  font-weight: 600;
}

.method-config-form :deep(.arco-form-item-content-wrapper),
.method-config-form :deep(.arco-form-item-content-flex) {
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

.certificate-reference-control {
  display: flex;
  align-items: flex-start;
  width: 100%;
  gap: 8px;
}

.certificate-reference-control :deep(.arco-input-wrapper) {
  min-width: 0;
  flex: 1;
}

.certificate-reference-control :deep(.arco-upload) {
  display: block;
  flex: 0 0 auto;
}

.certificate-upload-button {
  width: 40px;
}

@media (max-width: 768px) {
  .locator-control {
    grid-template-columns: 112px minmax(0, 1fr);
  }

  .locator-control :deep(.arco-checkbox) {
    grid-column: 1 / -1;
  }

  .method-config-form :deep(.arco-col-12) {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
