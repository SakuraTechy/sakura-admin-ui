import http from '@/utils/http'

const BASE_URL = '/project/projectDataBaseConfig'

export interface ProjectDataBaseConfigResp {
  id: string
  projectId: string
  type: string
  version: string
  driver: string
  ip: string
  port: string
  dataBase: string
  userName: string
  passWord: string
  url: string
  description: string
  configList?: [{
    paramsName: string
    paramsValue: string
  }]
  status: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  createUserString: string
  updateUserString: string
  disabled: boolean
}
export interface ProjectDataBaseConfigDetailResp {
  id: string
  projectId: string
  projectName: string
  type: string
  version: string
  driver: string
  ip: string
  port: string
  dataBase: string
  userName: string
  passWord: string
  url: string
  description: string
  configList?: [{
    paramsName: string
    paramsValue: string
  }]
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
export interface ProjectDataBaseConfigQuery {
  id?: string | undefined
  projectId?: string | undefined
  type?: string | undefined
  ip?: string | undefined
  status?: number | undefined
  sort?: Array<string>
}
export interface ProjectDataBaseConfigPageQuery extends ProjectDataBaseConfigQuery, PageQuery {}

/** @desc 分页查询项目管理-数据库配置列表 */
export function listProjectDataBaseConfig(query?: ProjectDataBaseConfigPageQuery) {
  return http.get<PageRes<ProjectDataBaseConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 全部查询项目管理-数据库配置列表 */
export function getProjectDataBaseConfigList(query?: ProjectDataBaseConfigPageQuery) {
  return http.get<ProjectDataBaseConfigResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 查询项目管理-数据库配置详情 */
export function getProjectDataBaseConfig(id: string) {
  return http.get<ProjectDataBaseConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增项目管理-数据库配置 */
export function addProjectDataBaseConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改项目管理-数据库配置 */
export function updateProjectDataBaseConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除项目管理-数据库配置 */
export function deleteProjectDataBaseConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出项目管理-数据库配置 */
export function exportProjectDataBaseConfig(query: ProjectDataBaseConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

/** @desc 测试项目管理-数据库配置 */
export function testProjectDataBaseConfig(data: any, id?: string) {
  const query = id ? `?id=${encodeURIComponent(id)}` : ''
  return http.post(`${BASE_URL}/test${query}`, data)
}
