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

interface CatalogCacheEntry {
  etag?: string
  catalog: AutomationOperationCatalog
}

const catalogCache = new Map<string, CatalogCacheEntry>()
const catalogRequests = new Map<string, Promise<ApiRes<AutomationOperationCatalog>>>()

if (typeof window !== 'undefined') {
  window.addEventListener('session-cache-clear', () => {
    catalogCache.clear()
    catalogRequests.clear()
  })
}

const catalogRequestKey = (
  sceneId?: string | number,
  projectEnvironmentId?: string | number,
  executorInstanceId?: string,
  sessionId?: string,
) => [sceneId, projectEnvironmentId, executorInstanceId, sessionId].map(value => String(value ?? '')).join(':')

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
    if (method.method_code === 'server.shell' && ['replace_regex', 'replace_value'].includes(field.name)
      && typeof value === 'string' && (value !== '' || field.name === 'replace_value' && values.replace_regex !== undefined && values.replace_regex !== '')) {
      // 替换内容的空字符串和空格都是有效数据，其他方法仍沿用原有规范化规则。
      normalized[field.name] = value
      continue
    }
    if (!isAutomationOperationValueEmpty(value)) normalized[field.name] = cloneConfigValue(value)
  }
  return normalized
}

export const validateAutomationOperationConfig = (method: AutomationOperationMethod, values: Record<string, unknown>) => {
  if (method.method_code === 'server.shell') {
    for (const name of ['replace_regex', 'replace_value', 'variable_name']) {
      if (values[name] != null && typeof values[name] !== 'string') return '结果处理参数必须是字符串'
    }
    const regex = String(values.replace_regex ?? '')
    const replacement = String(values.replace_value ?? '')
    const variable = String(values.variable_name ?? '').trim()
    if (regex.length > 512 || replacement.length > 4096) return '替换正则最多 512 字符，替换内容最多 4096 字符'
    if (regex && !variable) return '配置结果替换后，请填写全局变量名'
    if (!regex && replacement) return '请先填写替换正则'
    if ([regex, replacement].some(value => value.includes('${') || value.includes('{{'))) return '替换字段不支持平台变量插值或命名组引用'
    if (variable && (!/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(variable)
      || ['system.', 'secret.', 'execution.'].some(prefix => variable.startsWith(prefix)))) return '全局变量名不合法或使用了保留前缀'
  }
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
  const key = catalogRequestKey(sceneId, projectEnvironmentId, executorInstanceId, sessionId)
  const running = catalogRequests.get(key)
  if (running) return running
  const cached = catalogCache.get(key)
  const request = http.requestNative<ApiRes<AutomationOperationCatalog>>({
    method: 'get',
    url: '/automation/operation-catalog',
    params: { sceneId, projectEnvironmentId, executorInstanceId, sessionId },
    headers: cached?.etag ? { 'If-None-Match': cached.etag } : undefined,
    rawResponse: true,
    silentError: true,
    validateStatus: status => (status >= 200 && status < 300) || status === 304,
  }).then((response) => {
    if (response.status === 304 && cached) {
      return { success: true, data: cloneConfigValue(cached.catalog) } as ApiRes<AutomationOperationCatalog>
    }
    const payload = response.data
    if (!payload?.success || !payload.data) throw new Error(payload?.msg || '操作目录响应无效')
    const catalog = cloneConfigValue(payload.data)
    catalogCache.set(key, { etag: response.headers?.etag, catalog })
    return { ...payload, data: cloneConfigValue(catalog) }
  }).finally(() => {
    if (catalogRequests.get(key) === request) catalogRequests.delete(key)
  })
  catalogRequests.set(key, request)
  return request
}
