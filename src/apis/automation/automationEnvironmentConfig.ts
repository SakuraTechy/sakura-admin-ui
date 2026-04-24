import http from '@/utils/http'

const BASE_URL = '/automation/automationEnvironmentConfig'

export interface AutomationEnvironmentConfigResp {
  id: string
  type: string
  name: string
  description: string
  projectConfig: Array<object>
  jenkinsConfig: Array<object>
  nodeConfig: Array<object>
  browserConfig: Array<object>
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
export interface AutomationEnvironmentConfigDetailResp {
  id: string
  type: string
  name: string
  description: string
  projectConfig: Array<object>
  jenkinsConfig: {
    id: string
    version: string
    ip: string
    port: string
    userName: string
    passWord: string
    url: string
    description: string
    jobList: Array<object>
    status: number
  }
  nodeConfig: {
    id: string
    type: string
    name: string
    url: string
    description: string
    configList: Array<object>
    active: Array<object>
    status: number
  }
  browserConfig: Array<object>
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
export interface AutomationEnvironmentConfigQuery {
  id?: string | undefined
  type?: string | undefined
  name?: string | undefined
  status?: number | undefined
  sort?: Array<string>
}
export interface AutomationEnvironmentConfigPageQuery extends AutomationEnvironmentConfigQuery, PageQuery {}

export interface AutomationEnvironmentRuntimeStatusResp {
  environmentId: string
  nodeName: string
  onlineStatus: number | string
  useStatus: number | string
}

/** @desc 分页查询自动化管理-环境配置列表 */
export function listAutomationEnvironmentConfig(query?: AutomationEnvironmentConfigPageQuery) {
  return http.get<PageRes<AutomationEnvironmentConfigResp[]>>(`${BASE_URL}`, query)
}

/** @desc 全部查询自动化管理-环境配置列表 */
export function getAutomationEnvironmentConfigList(query?: AutomationEnvironmentConfigQuery) {
  return http.get<AutomationEnvironmentConfigResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 查询自动化管理-环境配置详情 */
export function getAutomationEnvironmentConfig(id: string) {
  return http.get<AutomationEnvironmentConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 查询自动化环境实时状态 */
export function getAutomationEnvironmentRuntimeStatus(id: string | number) {
  return http.get<AutomationEnvironmentRuntimeStatusResp>(`${BASE_URL}/${id}/runtime-status`)
}

/** @desc 新增自动化管理-环境配置 */
export function addAutomationEnvironmentConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改自动化管理-环境配置 */
export function updateAutomationEnvironmentConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除自动化管理-环境配置 */
export function deleteAutomationEnvironmentConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出自动化管理-环境配置 */
export function exportAutomationEnvironmentConfig(query: AutomationEnvironmentConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}
