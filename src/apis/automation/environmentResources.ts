import http from '@/utils/http'

const BASE_URL = '/automation/environment-resources'

export type EnvironmentResourceKind = 'SERVER' | 'DATABASE' | 'CERTIFICATE'

export interface EnvironmentResource {
  slotId: string
  resourceCode: string
  resourceName: string
  resourceKind: EnvironmentResourceKind
  required: boolean
  resourceId?: string
  resourceLabel?: string
  databaseIp?: string
  databasePort?: number
  databaseName?: string
  fileName?: string
  fileSize?: number
  sha256?: string
  bindingVersion?: number
  bound: boolean
}

export function listEnvironmentResourceSlots(projectId: string | number, kind?: EnvironmentResourceKind, environmentId?: string | number) {
  return http.get<EnvironmentResource[]>(`${BASE_URL}/slots`, { projectId, kind, environmentId })
}

export function createCustomDatabaseSlot(projectId: string | number) {
  return http.post<EnvironmentResource>(`${BASE_URL}/slots/custom-database`, undefined, { params: { projectId } })
}

export function deleteCustomDatabaseSlot(slotId: string | number) {
  return http.del(`${BASE_URL}/slots/${slotId}`)
}

export function listEnvironmentResources(environmentId: string | number) {
  return http.get<EnvironmentResource[]>(`${BASE_URL}/environments/${environmentId}`)
}

export function bindEnvironmentResource(environmentId: string | number, slotId: string | number, resourceId: string | number) {
  return http.put<EnvironmentResource>(`${BASE_URL}/environments/${environmentId}/bindings/${slotId}`, { resourceId })
}

export function uploadEnvironmentCertificate(environmentId: string | number, slotId: string | number, data: FormData, signal?: AbortSignal) {
  return http.post<EnvironmentResource>(`${BASE_URL}/environments/${environmentId}/bindings/${slotId}/certificate`, data, { signal })
}

export function unbindEnvironmentResource(environmentId: string | number, slotId: string | number) {
  return http.del(`${BASE_URL}/environments/${environmentId}/bindings/${slotId}`)
}
