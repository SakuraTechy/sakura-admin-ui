<template>
  <div class="automation-operation-method-form">
    <div v-if="method" class="method-toolbar" :class="{ 'method-toolbar--workbench': workbench }">
      <div class="method-heading">
        <span class="method-title">{{ method.label }}</span>
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
          <a-form-item :label="field.label || field.name" :required="fieldRequired(field)">
            <a-input-number
              v-if="field.component === 'number'"
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
            </a-select>
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
            <div v-if="fieldHelp(field)" class="field-help">{{ fieldHelp(field) }}</div>
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

const props = defineProps<{
  method?: AutomationOperationMethod
  modelValue?: AutomationUiStepConfig[]
  draftValue?: Record<string, unknown>
  disabled?: boolean
  confirmReset?: boolean
  workbench?: boolean
  contextLabel?: string
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
const referenceHint = computed(() => {
  if (!schemaFields.value.some((field) => field.name === 'variable_name')) return ''
  const variableName = String(formValues.variable_name || '').trim()
  return variableName ? `\${${variableName}}` : ''
})
let syncing = false

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

const targetRefToText = (value: unknown) => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const target = value as Record<string, unknown>
  if (typeof target.target_xpath === 'string' && target.target_xpath) return `xpath=${target.target_xpath}`
  if (typeof target.xpath === 'string' && target.xpath) return `xpath=${target.xpath}`
  if (typeof target.target_selector === 'string' && target.target_selector) return `css=${target.target_selector}`
  if (typeof target.selector === 'string' && target.selector) return `css=${target.selector}`
  return JSON.stringify(target)
}

const editableValue = (field: AutomationOperationFormField, value: unknown) => {
  if (field.name === 'target_ref' || field.component === 'locator' || field.component === 'target_ref') {
    return targetRefToText(value)
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
  if (field.name !== 'target_ref' || typeof value !== 'string') return value
  const text = value.trim()
  if (!text.startsWith('{')) return text
  const parsed = parseObject(text)
  return Object.keys(parsed).length > 0 ? parsed : text
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
const fieldPlaceholder = (field: AutomationOperationFormField) => String(field.placeholder || `请输入${field.label || field.name}`)
const fieldHelp = (field: AutomationOperationFormField) => {
  const help = String(field.help || '')
  if (field.name !== 'variable_name') return help
  const variableName = String(formValues[field.name] || '').trim()
  return variableName ? `后续步骤使用 \${${variableName}} 引用该值。` : help
}
const fieldMin = (field: AutomationOperationFormField) => field.min
const fieldMax = (field: AutomationOperationFormField) => field.max
const fieldRequired = (field: AutomationOperationFormField) => isAutomationOperationFieldRequired(field, formValues)
const selectOptions = (field: AutomationOperationFormField) => Array.isArray(field.options) ? field.options : []

watch(() => [props.method?.method_code, props.method?.method_version, props.modelValue, props.draftValue], syncFromModel, {
  deep: true,
  immediate: true,
})
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

@media (max-width: 768px) {
  .method-config-form :deep(.arco-col-12) {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
