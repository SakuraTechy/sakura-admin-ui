import http from '@/utils/http'

const BASE_URL = '/project/projectVersionConfig'

export interface ProjectVersionConfigResp {
  id: string
  projectId: string
  name: string
  description: string
  status: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  delFlag: string
  createUserString: string
  updateUserString: string
  disabled: boolean
}
export interface ProjectVersionConfigDetailResp {
  id: string
  projectId: string
  projectName: string
  name: string
  description: string
  status: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  delFlag: string
  createUserString: string
  updateUserString: string
}
export interface ProjectVersionConfigQuery {
  id: string | undefined
  projectId: string | undefined
  name: string | undefined
  status: number | undefined
  sort: Array<string>
}
export interface ProjectVersionConfigPageQuery extends ProjectVersionConfigQuery, PageQuery {}

/** @desc 查询项目管理-版本配置列表 */
export function listProjectVersionConfig(query: ProjectVersionConfigPageQuery) {
  return http.get<PageRes<ProjectVersionConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 查询项目管理-版本配置详情 */
export function getProjectVersionConfig(id: string) {
  return http.get<ProjectVersionConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增项目管理-版本配置 */
export function addProjectVersionConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改项目管理-版本配置 */
export function updateProjectVersionConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除项目管理-版本配置 */
export function deleteProjectVersionConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出项目管理-版本配置 */
export function exportProjectVersionConfig(query: ProjectVersionConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}
