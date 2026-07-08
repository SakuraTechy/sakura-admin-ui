import http from '@/utils/http'

const BASE_URL = '/project/projectModuleConfig'

export interface ProjectModuleConfigResp {
  id: string
  projectId: string
  versionId: string
  parentId: string
  name: string
  description: string
  sort: number
  path: string
  count: string
  status: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  delFlag: number
  createUserString: string
  updateUserString: string
  disabled: boolean
  children: ProjectModuleConfigResp[]
}
export interface ProjectModuleConfigDetailResp {
  id: string
  projectId: string
  versionId: string
  versionName: string
  parentId: string
  parentName: string
  name: string
  description: string
  sort: number
  path: string
  count: string
  status: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  delFlag: number
  createUserString: string
  updateUserString: string
}
export interface ProjectModuleConfigQuery {
  id?: string | undefined
  projectId?: string | undefined
  versionId?: string | undefined
  parentId?: string | undefined
  name?: string | undefined
  status?: string | number | undefined
  sort?: Array<string>
}
export interface ProjectModuleConfigPageQuery extends ProjectModuleConfigQuery, PageQuery {}

/** @desc 分页查询项目管理-模块配置列表 */
export function listProjectModuleConfig(query?: ProjectModuleConfigPageQuery) {
  return http.get<PageRes<ProjectModuleConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 全部查询项目管理-模块配置树列表 */
export function listProjectModuleConfigTree(query?: ProjectModuleConfigPageQuery) {
  return http.get<ProjectModuleConfigResp[]>(`${BASE_URL}/tree`, query)
}

/** @desc 全部查询项目管理-模块配置列表 */
export function getProjectModuleConfigList(query?: ProjectModuleConfigQuery) {
  return http.get<ProjectModuleConfigResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 查询项目管理-模块配置详情 */
export function getProjectModuleConfig(id: string) {
  return http.get<ProjectModuleConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增项目管理-模块配置 */
export function addProjectModuleConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改项目管理-模块配置 */
export function updateProjectModuleConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除项目管理-模块配置 */
export function deleteProjectModuleConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出项目管理-模块配置 */
export function exportProjectModuleConfig(query: ProjectModuleConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

/** @desc 拖拽项目管理-模块配置 */
export function dragProjectModuleConfig(data: any) {
  return http.post(`${BASE_URL}/drag`, data)
}
