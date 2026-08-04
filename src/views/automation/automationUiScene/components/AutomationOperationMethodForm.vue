<template>
  <div class="automation-operation-method-form">
    <a-alert
      v-if="method"
      type="info"
      :show-icon="false"
      class="method-summary"
    >
      <template #title>{{ method.label }}</template>
      <template #default>方法版本 {{ method.method_version }}；保存时由后端统一生成执行快照。</template>
    </a-alert>
    <a-form v-if="method" :model="formValues" layout="vertical" class="method-config-form">
      <a-row :gutter="16">
        <a-col
          v-for="field in schemaFields"
          :key="field.name"
          :span="fieldSpan(field)"
        >
          <a-form-item :label="field.label || field.name" :required="field.required === true">
            <a-input-number
              v-if="field.component === 'number'"
              v-model="formValues[field.name]"
              :precision="0"
              :min="fieldMin(field)"
              :max="fieldMax(field)"
              :placeholder="fieldPlaceholder(field)"
              style="width: 100%"
            />
            <a-select
              v-else-if="field.component === 'select' && selectOptions(field).length > 0"
              v-model="formValues[field.name]"
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
              :placeholder="fieldPlaceholder(field)"
              :auto-size="{ minRows: field.component === 'code' ? 5 : 2, maxRows: 12 }"
            />
            <a-input
              v-else
              v-model="formValues[field.name]"
              :placeholder="fieldPlaceholder(field)"
              allow-clear
            />
            <div v-if="fieldHelp(field)" class="field-help">{{ fieldHelp(field) }}</div>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { AutomationOperationFormField, AutomationOperationMethod } from '@/apis/automation/automationOperationCatalog'
import type { AutomationUiStepConfig } from '@/apis/automation/automationUiScene'

const props = defineProps<{
  method?: AutomationOperationMethod
  modelValue?: AutomationUiStepConfig[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AutomationUiStepConfig[]): void
}>()

const formValues = reactive<Record<string, any>>({})
const extraMethodConfig = ref<Record<string, unknown>>({})
const schemaFields = computed(() => props.method?.form_schema || [])
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

const syncFromModel = () => {
  syncing = true
  const methodConfig = parseObject(getConfig(props.modelValue, 'method_config'))
  const schemaNames = new Set(schemaFields.value.map((field) => field.name))
  extraMethodConfig.value = Object.fromEntries(Object.entries(methodConfig).filter(([name]) => !schemaNames.has(name)))
  Object.keys(formValues).forEach((name) => delete formValues[name])
  schemaFields.value.forEach((field) => {
    let value = methodConfig[field.name]
    if (value === undefined) value = getConfig(props.modelValue, field.name)
    if (value === '' && field.name === 'target_ref') {
      const rawTargetRef = getConfig(props.modelValue, 'target_ref')
      value = Object.keys(parseObject(rawTargetRef)).length > 0 ? parseObject(rawTargetRef) : getConfig(props.modelValue, 'locator')
    }
    formValues[field.name] = editableValue(field, value)
  })
  syncing = false
}

const normalizeMethodConfig = () => {
  const result: Record<string, unknown> = { ...extraMethodConfig.value }
  schemaFields.value.forEach((field) => {
    const value = configValue(field, formValues[field.name])
    if (!isEmpty(value)) result[field.name] = value
    else delete result[field.name]
  })
  return result
}

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

const isLongText = (field: AutomationOperationFormField) => ['textarea', 'code', 'locator', 'target_ref'].includes(field.component)
const fieldSpan = (field: AutomationOperationFormField) => isLongText(field) ? 24 : 12
const fieldPlaceholder = (field: AutomationOperationFormField) => String(field.placeholder || `请输入${field.label || field.name}`)
const fieldHelp = (field: AutomationOperationFormField) => String(field.help || '')
const fieldMin = (field: AutomationOperationFormField) => typeof field.min === 'number' ? field.min : undefined
const fieldMax = (field: AutomationOperationFormField) => typeof field.max === 'number' ? field.max : undefined
const selectOptions = (field: AutomationOperationFormField) => Array.isArray(field.options) ? field.options : []

watch(() => [props.method?.method_code, props.method?.method_version, props.modelValue], syncFromModel, {
  deep: true,
  immediate: true,
})
watch(() => [props.method?.method_code, props.method?.method_version, props.modelValue], emitConfig, {
  deep: true,
  immediate: true,
  flush: 'post',
})
watch(formValues, emitConfig, { deep: true, flush: 'sync' })
</script>

<style scoped>
.automation-operation-method-form {
  width: 100%;
}

.method-summary {
  margin-bottom: 12px;
}

.field-help {
  margin-top: 4px;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 1.5;
}
</style>
