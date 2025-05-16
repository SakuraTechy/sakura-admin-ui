import type { b } from 'vite/dist/node/types.d-aGj9QkWt'
import http from '@/utils/http'

const BASE_URL = '/project/projectServerConfig'

export interface ProjectServerConfigResp {
  id: string
  projectId: string
  type: string
  version: string
  ip: string
  port: string
  userName: string
  passWord: string
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
  disabled: boolean
}
export interface ProjectServerConfigDetailResp {
  id: string
  projectId: string
  projectName: string
  type: string
  version: string
  ip: string
  port: string
  userName: string
  passWord: string
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
export interface ProjectServerConfigQuery {
  id?: string | undefined
  projectId?: string | undefined
  type?: string | undefined
  ip?: string | undefined
  status?: number | undefined
  sort?: Array<string>
}
export interface ProjectServerConfigPageQuery extends ProjectServerConfigQuery, PageQuery {}

/** @desc 查询项目管理-服务器配置列表 */
export function listProjectServerConfig(query?: ProjectServerConfigPageQuery) {
  return http.get<PageRes<ProjectServerConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 查询项目管理-服务器配置详情 */
export function getProjectServerConfig(id: string) {
  return http.get<ProjectServerConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增项目管理-服务器配置 */
export function addProjectServerConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改项目管理-服务器配置 */
export function updateProjectServerConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除项目管理-服务器配置 */
export function deleteProjectServerConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出项目管理-服务器配置 */
export function exportProjectServerConfig(query: ProjectServerConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

/** @desc 测试项目管理-服务器配置 */
export function testProjectServerConfig(data: any) {
  return http.post(`${BASE_URL}/test`, data)
}
