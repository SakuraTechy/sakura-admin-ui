import http from '@/utils/http'

const BASE_URL = '/project/projectEnvironmentConfig'

export interface ProjectEnvironmentConfigResp {
  id: string
  projectId: string
  name: string
  description: string
  versionConfig: Array<object>
  serverConfig: Array<object>
  dataBaseConfig: Array<object>
  lastVersion: string
  lastDomain: string
  status: number
  createUser: string
  deptId: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  remark: string
  version: string
  delFlag: number
  createUserString: string
  updateUserString: string
  disabled: boolean
}
export interface ProjectEnvironmentConfigDetailResp {
  id: string
  projectId: string
  projectName: string
  name: string
  description: string
  versionConfig: Array<object>
  serverConfig: Array<object>
  dataBaseConfig: Array<object>
  lastVersion: string
  lastDomain: string
  status: number
  createUser: string
  deptId: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  remark: string
  version: string
  delFlag: number
  createUserString: string
  updateUserString: string
}
export interface ProjectEnvironmentConfigQuery {
  id: string | undefined
  projectId: string | undefined
  name: string | undefined
  status: number | undefined
  sort: Array<string>
}
export interface ProjectEnvironmentConfigPageQuery extends ProjectEnvironmentConfigQuery, PageQuery {}

export interface ProjectEnvironmentRuntimeStatusResp {
  environmentId: string
  serverIp: string
  onlineStatus: number | string
}

/** @desc 分页查询项目管理-环境配置列表 */
export function listProjectEnvironmentConfig(query: ProjectEnvironmentConfigPageQuery) {
  return http.get<PageRes<ProjectEnvironmentConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 全部查询项目管理-环境配置列表 */
export function getProjectEnvironmentConfigList(query?: ProjectEnvironmentConfigPageQuery) {
  return http.get<ProjectEnvironmentConfigResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 查询项目管理-环境配置详情 */
export function getProjectEnvironmentConfig(id: string) {
  return http.get<ProjectEnvironmentConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 查询项目环境实时状态 */
export function getProjectEnvironmentRuntimeStatus(id: string | number) {
  return http.get<ProjectEnvironmentRuntimeStatusResp>(`${BASE_URL}/${id}/runtime-status`)
}

/** @desc 新增项目管理-环境配置 */
export function addProjectEnvironmentConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改项目管理-环境配置 */
export function updateProjectEnvironmentConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除项目管理-环境配置 */
export function deleteProjectEnvironmentConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出项目管理-环境配置 */
export function exportProjectEnvironmentConfig(query: ProjectEnvironmentConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}
