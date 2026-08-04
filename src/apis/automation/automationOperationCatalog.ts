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
  placeholder?: string
  options?: Array<{ label: string, value: string | number }>
  [key: string]: unknown
}

export interface AutomationOperationMethod {
  method_code: string
  method_version: number
  label: string
  legacy_action: string
  action_type: string
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
  v2_enabled?: boolean
  types: AutomationOperationType[]
}

/** 获取当前场景可用的手工步骤操作目录。 */
export function getAutomationOperationCatalog(sceneId?: string | number, projectEnvironmentId?: string | number,
  executorInstanceId?: string, sessionId?: string) {
  return http.get<AutomationOperationCatalog>('/automation/operation-catalog', {
    sceneId,
    projectEnvironmentId,
    executorInstanceId,
    sessionId,
  })
}
