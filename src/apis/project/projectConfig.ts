import http from '@/utils/http'

const BASE_URL = '/project/projectConfig'

export interface ProjectConfigResp {
  id: string
  name: string
  abbreviate: string
  member: Array<string>
  memberNames: Array<string>
  description: string
  lastDomain: string
  lastVersion: string
  status: number
  createUser: string
  deptId: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  remark: string
  version: string
  delFlag: string
  createUserString: string
  updateUserString: string
  disabled: boolean
}
export interface ProjectConfigDetailResp {
  id: string
  name: string
  abbreviate: string
  member: Array<string>
  memberNames: Array<string>
  description: string
  lastDomain: string
  lastVersion: string
  status: number
  createUser: string
  deptId: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  remark: string
  version: string
  delFlag: string
  createUserString: string
  updateUserString: string
}
export interface ProjectConfigQuery {
  id: string | undefined
  name: string | undefined
  abbreviate: string | undefined
  status: number | undefined
  sort: Array<string>
}
export interface ProjectConfigPageQuery extends ProjectConfigQuery, PageQuery {}

/** @desc 查询项目配置列表 */
export function listProjectConfig(query?: ProjectConfigPageQuery) {
  return http.get<PageRes<ProjectConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 查询项目配置详情 */
export function getProjectConfig(id: string) {
  return http.get<ProjectConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增项目配置 */
export function addProjectConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改项目配置 */
export function updateProjectConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除项目配置 */
export function deleteProjectConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出项目配置 */
export function exportProjectConfig(query: ProjectConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}
