import http from '@/utils/http'

const BASE_URL = '/project/projectConfig'

export interface ProjectConfigQuery {
  id?: string
  name?: string
  abbreviate?: string
  status?: number | string
  sort?: string[]
}

export interface ProjectConfigPageQuery extends ProjectConfigQuery, PageQuery {}

export interface ProjectConfigResp {
  id: string
  name?: string
  abbreviate?: string
  description?: string
  member?: string[]
  memberNames?: string[]
  status?: number
  lastVersion?: string
  lastDomain?: string
  createUserString?: string
  createTime?: string
  updateUserString?: string
  updateTime?: string
  updateIp?: string
  remark?: string
  version?: string
  delFlag?: number
  disabled?: boolean
}

export type ProjectConfigDetailResp = ProjectConfigResp

/** 分页查询（项目配置管理 GiTable） */
export function listProjectConfig(query?: ProjectConfigPageQuery) {
  return http.get<PageRes<ProjectConfigResp[]>>(`${BASE_URL}`, query)
}

/** 全量列表（下拉、筛选等，GET `/list`） */
export function getProjectConfigList(params?: Partial<ProjectConfigQuery> & { sort?: string[] }) {
  return http.get<ProjectConfigResp[]>(`${BASE_URL}/list`, {
    sort: ['createTime,desc'],
    ...params,
  })
}

/** 详情 */
export function getProjectConfig(id: string) {
  return http.get<ProjectConfigDetailResp>(`${BASE_URL}/${id}`)
}

export function addProjectConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

export function updateProjectConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

export function deleteProjectConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

export function exportProjectConfig(query: ProjectConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}
