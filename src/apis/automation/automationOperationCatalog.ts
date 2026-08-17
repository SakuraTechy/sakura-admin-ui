import http from '@/utils/http'

/**
 * 操作目录是手工新增步骤的唯一配置来源。字段使用 snake_case 与后端契约保持一致，
 * 避免前端再根据字典 description 推导执行语义。
 */
export interface AutomationOperationFormField {
  name: string
  label: string
  component: string
  required?: boolean
  default?: unknown
  placeholder?: string
  help?: string
  tooltip?: string
  min?: number
  max?: number
  options?: Array<{ label: string, value: string | number | boolean, help?: string }>
  visible_when?: AutomationOperationFormCondition
  required_when?: AutomationOperationFormCondition
  [key: string]: unknown
}

export type AutomationOperationConditionValue = string | number | boolean
  | Array<string | number | boolean>
export type AutomationOperationFormCondition = Record<string, AutomationOperationConditionValue>

export interface AutomationOperationMethod {
  method_code: string
  method_version: number
  label: string
  description?: string
  legacy_action: string
  action_type: string
  diagnostic_profile?: string
  aliases?: string[]
  form_schema: AutomationOperationFormField[]
  capabilities?: Record<string, string>
  requirements?: Record<string, unknown>
  implemented?: boolean
  runtime_ready?: boolean
  permission_granted?: boolean
  disabled_code?: string
  authoring_enabled: boolean
  enabled: boolean
  disabled_reason?: string
}

export interface AutomationOperationType {
  type_code: string
  label: string
  sort?: number
  methods: AutomationOperationMethod[]
}

export interface AutomationOperationCatalog {
  catalog_version: string
  diagnostic_profiles?: Record<string, string[]>
  diagnostic_field_defaults?: Record<string, {
    diagnostic_role: string
    sensitivity: string
    result_display: string
  }>
  v2_enabled?: boolean
  types: AutomationOperationType[]
}

const cloneConfigValue = <T>(value: T): T => {
  if (value == null || typeof value !== 'object') return value
  return JSON.parse(JSON.stringify(value)) as T
}

export const isAutomationOperationValueEmpty = (value: unknown) => value == null
  || (typeof value === 'string' && value.trim() === '')
  || (Array.isArray(value) && value.length === 0)

export const matchesAutomationOperationCondition = (condition: AutomationOperationFormCondition | undefined, values: Record<string, unknown>) => {
  if (!condition || Object.keys(condition).length === 0) return false
  return Object.entries(condition).every(([name, expected]) => {
    const actual = String(values[name] ?? '')
    const expectedValues = Array.isArray(expected) ? expected : [expected]
    return expectedValues.some((value) => String(value) === actual)
  })
}

export const isAutomationOperationFieldVisible = (field: AutomationOperationFormField, values: Record<string, unknown>) => !field.visible_when
  || matchesAutomationOperationCondition(field.visible_when, values)

export const isAutomationOperationFieldRequired = (field: AutomationOperationFormField, values: Record<string, unknown>) => field.required === true
  || matchesAutomationOperationCondition(field.required_when, values)

export const createAutomationOperationDefaultConfig = (method?: AutomationOperationMethod) => {
  const defaults: Record<string, unknown> = {}
  for (const field of method?.form_schema || []) {
    if (field.default !== undefined) defaults[field.name] = cloneConfigValue(field.default)
  }
  return defaults
}

export const mergeAutomationOperationDefaults = (method: AutomationOperationMethod, values: Record<string, unknown>) => ({
  ...createAutomationOperationDefaultConfig(method),
  ...cloneConfigValue(values),
})

export const normalizeAutomationOperationConfig = (method: AutomationOperationMethod, values: Record<string, unknown>) => {
  const schemaNames = new Set(method.form_schema.map((field) => field.name))
  // 编辑旧步骤时保留目录外扩展字段，避免仅因表单升级静默丢失历史数据。
  const normalized = Object.fromEntries(Object.entries(values)
    .filter(([name, value]) => !schemaNames.has(name) && !isAutomationOperationValueEmpty(value)))
  for (const field of method.form_schema) {
    if (!isAutomationOperationFieldVisible(field, values)) continue
    const value = values[field.name]
    if (!isAutomationOperationValueEmpty(value)) normalized[field.name] = cloneConfigValue(value)
  }
  return normalized
}

export const validateAutomationOperationConfig = (method: AutomationOperationMethod, values: Record<string, unknown>) => {
  for (const field of method.form_schema) {
    if (!isAutomationOperationFieldVisible(field, values)) continue
    const value = values[field.name]
    if (isAutomationOperationFieldRequired(field, values) && isAutomationOperationValueEmpty(value)) {
      return `请填写${field.label || field.name}`
    }
    if (isAutomationOperationValueEmpty(value)) continue
    if (field.component === 'number') {
      const number = Number(value)
      if (!Number.isFinite(number)) return `${field.label || field.name}必须是数字`
      if (typeof field.min === 'number' && number < field.min) return `${field.label || field.name}不能小于 ${field.min}`
      if (typeof field.max === 'number' && number > field.max) return `${field.label || field.name}不能大于 ${field.max}`
    }
    if (field.component === 'select' && Array.isArray(field.options)
      && !field.options.some((option) => String(option.value) === String(value))) {
      return `${field.label || field.name}不是有效选项`
    }
  }
  return ''
}

/** 获取当前场景可用的手工步骤操作目录。 */
export function getAutomationOperationCatalog(sceneId?: string | number, projectEnvironmentId?: string | number, executorInstanceId?: string, sessionId?: string) {
  return http.get<AutomationOperationCatalog>('/automation/operation-catalog', {
    sceneId,
    projectEnvironmentId,
    executorInstanceId,
    sessionId,
  })
}
