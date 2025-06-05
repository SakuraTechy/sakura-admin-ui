import http from '@/utils/http'

const BASE_URL = '/automation/automationJenkinsConfig'

export interface AutomationJenkinsConfigResp {
  id: string
  version: string
  ip: string
  port: number
  userName: string
  passWord: string
  url: string
  jobList: Array<object>
  description: string
  node: Array<object>
  status: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  createUserString: string
  updateUserString: string
  disabled: boolean
}
export interface AutomationJenkinsConfigDetailResp {
  id: string
  version: string
  ip: string
  port: number
  userName: string
  passWord: string
  url: string
  jobList: Array<object>
  description: string
  node: Array<object>
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
export interface AutomationJenkinsConfigQuery {
  id?: string | undefined
  ip?: string | undefined
  status?: number | undefined
  sort?: Array<string>
}
export interface AutomationJenkinsConfigPageQuery extends AutomationJenkinsConfigQuery, PageQuery {}

/** @desc 分页查询自动化管理-Jenkins配置列表 */
export function listAutomationJenkinsConfig(query?: AutomationJenkinsConfigPageQuery) {
  return http.get<PageRes<AutomationJenkinsConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 全部查询自动化管理-Jenkins配置列表 */
export function getAutomationJenkinsConfigList(query?: AutomationJenkinsConfigQuery) {
  return http.get<AutomationJenkinsConfigResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 查询自动化管理-Jenkins配置详情 */
export function getAutomationJenkinsConfig(id: string) {
  return http.get<AutomationJenkinsConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增自动化管理-Jenkins配置 */
export function addAutomationJenkinsConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改自动化管理-Jenkins配置 */
export function updateAutomationJenkinsConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除自动化管理-Jenkins配置 */
export function deleteAutomationJenkinsConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出自动化管理-Jenkins配置 */
export function exportAutomationJenkinsConfig(query: AutomationJenkinsConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}
