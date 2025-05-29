import http from '@/utils/http'

const BASE_URL = '/automation/automationBrowserConfig'

export interface AutomationBrowserConfigResp {
  id: string
  type: string
  version: string
  name: string
  officialDownload: string
  driverDownload: string
  exePath: string
  driverPath: string
  profilePath: string
  description: string
  status: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  delFlag: number
  createUserString: string
  updateUserString: string
  disabled: boolean
}
export interface AutomationBrowserConfigDetailResp {
  id: string
  type: string
  version: string
  name: string
  officialDownload: string
  driverDownload: string
  exePath: string
  driverPath: string
  profilePath: string
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
export interface AutomationBrowserConfigQuery {
  id?: string | undefined
  type?: string | undefined
  name?: string | undefined
  sort?: Array<string>
}
export interface AutomationBrowserConfigPageQuery extends AutomationBrowserConfigQuery, PageQuery {}

/** @desc 查询自动化管理-浏览器配置列表 */
export function listAutomationBrowserConfig(query?: AutomationBrowserConfigPageQuery) {
  return http.get<PageRes<AutomationBrowserConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 查询自动化管理-浏览器配置详情 */
export function getAutomationBrowserConfig(id: string) {
  return http.get<AutomationBrowserConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增自动化管理-浏览器配置 */
export function addAutomationBrowserConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改自动化管理-浏览器配置 */
export function updateAutomationBrowserConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除自动化管理-浏览器配置 */
export function deleteAutomationBrowserConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出自动化管理-浏览器配置 */
export function exportAutomationBrowserConfig(query: AutomationBrowserConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}
