import http from '@/utils/http'

const BASE_URL = '/automation/automationNodeConfig'

export interface AutomationNodeConfigResp {
  id: string
  jenkinsId: string
  name: string
  type: string
  json: string
  xml: string
  url: string
  description: {
    credentialsId: string
  }
  active: {
    offline: {
      status: number
      offlineCauseReason: string
    }
    idle: {
      status: number
      currentExecutable: {
        url: string
        user: string
      }
    }
  }
  offlineStatus: number
  idleStatus: number
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
export interface AutomationNodeConfigDetailResp {
  id: string
  jenkinsId: string
  jenkinsName: string
  name: string
  type: string
  json: string
  xml: string
  url: string
  description: {
    credentialsId: string
  }
  active: {
    offline: {
      status: number
      offlineCauseReason: string
    }
    idle: {
      status: number
      currentExecutable: {
        user: string
        url: string
      }
    }
  }
  offlineStatus: number
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
export interface AutomationNodeConfigQuery {
  id?: string | undefined
  jenkinsId?: string | undefined
  type?: string | undefined
  name?: string | undefined
  active?: string | undefined
  offlineStatus?: string | undefined
  idleStatus?: string | undefined
  status?: number | undefined
  sort?: Array<string>
}
export interface AutomationNodeConfigPageQuery extends AutomationNodeConfigQuery, PageQuery {}

/** @desc 查询自动化管理-节点配置列表 */
export function listAutomationNodeConfig(query?: AutomationNodeConfigPageQuery) {
  return http.get<PageRes<AutomationNodeConfigResp[]>>(`${BASE_URL}`, query)
}
export function getAutomationNodeConfigList(query?: AutomationNodeConfigPageQuery) {
  return http.get<AutomationNodeConfigResp[]>(`${BASE_URL}/list`, query)
}
/** @desc 查询自动化管理-节点配置详情 */
export function getAutomationNodeConfig(id: string) {
  return http.get<AutomationNodeConfigDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增自动化管理-节点配置 */
export function addAutomationNodeConfig(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改自动化管理-节点配置 */
export function updateAutomationNodeConfig(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除自动化管理-节点配置 */
export function deleteAutomationNodeConfig(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出自动化管理-节点配置 */
export function exportAutomationNodeConfig(query: AutomationNodeConfigQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

/** @desc 同步最新Jenkins节点数据 */
export function syncAllNode(jenkinsId: string) {
  return http.get(`${BASE_URL}/syncAllNode/${jenkinsId}`, {}, { timeout: 300 * 1000 })
}

/** @desc 同步单个节点数据 */
export function syncNode(ids: string | Array<string>) {
  return http.get(`${BASE_URL}/syncNode/${ids}`, {}, { timeout: 300 * 1000 })
}

/** @desc 新增自动化管理-节点配置 */
export function addNode(data: any) {
  return http.post(`${BASE_URL}/addNode`, data)
}

/** @desc 修改自动化管理-节点配置 */
export function updateNode(data: any) {
  return http.post(`${BASE_URL}/updateNode`, data)
}
