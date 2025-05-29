import http from '@/utils/http'

const BASE_URL = '/automation/automationProjectConfig'

export interface AutomationProjectConfigResp {
  id: string
  type: string
  name: string
  url: string
  description: string
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
export interface AutomationProjectConfigDetailResp {
  id: string
  type: string
  name: string
  url: string
  description: string
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
export interface AutomationProjectConfigQuery {
  id?: string | undefined
  type?: string | undefined
  name?: string | undefined
  status?: number | undefined
  sort?: Array<string>
}
export interface AutomationProjectConfigPageQuery extends AutomationProjectConfigQuery, PageQuery {}

/** @desc 查询自动化管理-项目配置列表 */
export function listAutomationProjectConfig(query?: AutomationProjectConfigPageQuery) {
  return http.get<PageRes<AutomationProjectConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 查询自动化管理-项目配置详情 */
export function getAutomationProjectConfig(id: string) {
  return http.get<AutomationProjectConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增自动化管理-项目配置 */
export function addAutomationProjectConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改自动化管理-项目配置 */
export function updateAutomationProjectConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除自动化管理-项目配置 */
export function deleteAutomationProjectConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出自动化管理-项目配置 */
export function exportAutomationProjectConfig(query: AutomationProjectConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}
