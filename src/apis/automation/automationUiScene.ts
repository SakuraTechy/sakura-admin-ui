import http from '@/utils/http'

const BASE_URL = '/automation/automationUiScene'

export type ExecutionType = 'jenkins' | 'extension-cdp' | 'playwright-runner'
export type ExecutionViewType = 'record' | 'log' | 'live' | 'report' | 'video'

export interface AutomationExecutionRecord {
  executionType?: ExecutionType
  executionId?: string
  startedAt?: string
  finishedAt?: string
  artifactUrls?: Record<string, unknown>
  executeName?: string
  executeStatus?: string
  executeResult?: string
  duration?: string | number
  [key: string]: unknown
}

export interface AutomationUiSceneResp {
  id: string
  sceneId: string
  name: string
  description: string
  projectId: string
  projectName: string
  versionId: string
  versionName: string
  moduleId: string
  modulePath: string
  level: string
  status: number
  tags: Array<object>
  caseList: AutomationUiCase[]
  definitionVersion: number
  testPlanId: Array<object>
  reportId: string
  debugRecord: AutomationExecutionRecord[]
  executeStatus: string
  executeResult: string
  testRecord: AutomationExecutionRecord[]
  buildNumber: number
  consoleUrl: string
  testReportUrl: string
  caseTotal: number
  casePass: number
  caseFail: number
  caseSkip: number
  passRate: string
  lastResult: string
  stepTotal: number
  stepPass: number
  stepFail: number
  stepSkip: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  /** 执行状态窄表的单调版本，轮询不得依赖场景定义 updateTime。 */
  executionRevision?: number
  delFlag: number
  createUserString: string
  updateUserString: string
  disabled: boolean
  /** 后端能力协商结果；旧场景未返回时前端按步骤 action_type 兼容判断。 */
  requiresInfrastructure?: boolean
  requiredCapabilities?: string[]
  supportedExecutors?: ExecutionType[]
}
export interface AutomationUiSceneDetailResp {
  id: string
  sceneId: string
  name: string
  description: string
  projectId: string
  projectName: string
  versionId: string
  versionName: string
  moduleId: string
  modulePath: string
  level: string
  status: number
  tags: Array<object>
  caseList: AutomationUiCase[]
  definitionVersion: number
  testPlanId: Array<object>
  reportId: string
  debugRecord: AutomationExecutionRecord[]
  executeStatus: string
  executeResult: string
  testRecord: AutomationExecutionRecord[]
  buildNumber: number
  consoleUrl: string
  testReportUrl: string
  caseTotal: number
  casePass: number
  caseFail: number
  caseSkip: number
  passRate: string
  lastResult: string
  stepTotal: number
  stepPass: number
  stepFail: number
  stepSkip: number
  createUser: string
  createTime: string
  updateUser: string
  updateTime: string
  updateIp: string
  /** 执行状态窄表的单调版本，轮询不得依赖场景定义 updateTime。 */
  executionRevision?: number
  delFlag: number
  createUserString: string
  updateUserString: string
  requiresInfrastructure?: boolean
  requiredCapabilities?: string[]
  supportedExecutors?: ExecutionType[]
}
export interface AutomationUiSceneQuery {
  id?: string | undefined
  sceneId?: string | undefined
  name?: string | undefined
  projectId?: string | undefined
  versionId?: string | undefined
  moduleId?: string | undefined
  level?: string | undefined
  executeStatus?: string | undefined
  executeResult?: string | undefined
  status?: number | undefined
  createUser?: string
  updateUser?: string
  createTime?: Array<string>
  /** 排除的场景主键 ID（如测试计划已关联场景） */
  excludeIds?: Array<string | number>
  sort?: Array<string>
  /** 测试计划ID */
  testPlanId?: string
  /** 构建号 */
  buildNumber?: number
  /** 执行结果类型: report-计划执行, debug-调试 */
  executeResultType?: 'report' | 'debug'
}
export interface AutomationUiScenePageQuery extends AutomationUiSceneQuery, PageQuery {}

export interface AutomationUiSceneExecReq {
  sceneIds: Array<string | number>
  projectEnvironmentId: string | number
  automationEnvironmentId: string | number
  engine?: 'JENKINS' | 'PLAYWRIGHT'
  executeName?: string
  executeEmail?: string
  testPlanId?: string
  /** 测试报告ID，用于精确隔离同一计划的多次执行 */
  testReportId?: string
  testReportId?: string
}

export interface AutomationUiSceneExecAllReq {
  projectId: string | number
  versionId: string | number
  moduleId?: string | number
  level?: string
  executeStatus?: string
  executeResult?: string
  status?: number
  projectEnvironmentId: string | number
  automationEnvironmentId: string | number
  engine?: 'JENKINS' | 'PLAYWRIGHT'
  executeName?: string
  executeEmail?: string
  testPlanId?: string
  testReportId?: string
}

export interface AutomationUiStepConfig {
  paramsName: string
  paramsValue: string
}

/** 基础设施步骤下拉目标；接口不返回账号、密码或连接串。 */
export interface AutomationInfrastructureTarget {
  id: string
  kind: 'server' | 'database'
  type: string
  ip: string
  port?: number
  dataBase?: string
  description?: string
  /** Admin 执行节点到目标 IP:端口的 TCP 可达性。 */
  online?: boolean
}

export function listAutomationInfrastructureTargets(projectId: string | number, kind: AutomationInfrastructureTarget['kind']) {
  return http.get<AutomationInfrastructureTarget[]>('/automation/infrastructure/targets', { projectId, kind })
}

export interface AutomationUiStep {
  pid: string
  id: string
  name: string
  remark?: string
  type: 'step'
  operationType?: string
  operationName?: string
  operationValue?: string
  configList: AutomationUiStepConfig[]
  order: number
  status: number | string
}

export interface AutomationUiCase {
  id: string
  name: string
  remark?: string
  type: 'case'
  order: number
  status: number | string
  stepList: AutomationUiStep[]
}

export type AutomationUiTreeNodeRef =
  | { type: 'CASE', caseId: string }
  | { type: 'STEP', caseId: string, stepId: string }

export type AutomationUiTreeMovePosition = 'BEFORE' | 'AFTER' | 'INSIDE_LAST' | 'LAST'

export interface AutomationUiTreeMutationResp {
  changed: boolean
  selectedNode: AutomationUiTreeNodeRef | null
  definitionVersion: number
}

export interface AutomationUiSceneExecResp {
  testReportId: string
  buildNumber: number
  consoleUrl: string
  testReportUrl: string
}

export interface AutomationUiSceneClearReq {
  sceneIds: Array<string | number>
}

export interface AutomationUiSceneRevisionResp {
  id: string
  updateTime: string
  executionRevision?: number
}

/** @desc 分页查询自动化管理-UI自动化场景列表 */
export function listAutomationUiScene(query?: AutomationUiScenePageQuery) {
  return http.get<PageRes<AutomationUiSceneResp[]>>(`${BASE_URL}`, query)
}

/** @desc 全部查询自动化管理-UI自动化场景列表 */
export function getAutomationUiSceneList(query?: AutomationUiScenePageQuery) {
  return http.get<AutomationUiSceneResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 查询自动化管理-UI自动化场景详情 */
export function getAutomationUiScene(id: string) {
  return http.get<AutomationUiSceneDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增自动化管理-UI自动化场景 */
export function addAutomationUiScene(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改自动化管理-UI自动化场景 */
export function updateAutomationUiScene(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 复制自动化管理-UI自动化场景 */
export function copyAutomationUiScene(data: any, id: string) {
  return http.post(`${BASE_URL}/${id}/copy`, data)
}

/** @desc 删除自动化管理-UI自动化场景 */
export function deleteAutomationUiScene(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出自动化管理-UI自动化场景 */
export function exportAutomationUiScene(query: AutomationUiSceneQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

/** @desc 导出选中场景 XML */
export function exportAutomationUiSceneXml(ids: string | Array<string>) {
  return http.download(`${BASE_URL}/exportXml/${ids}`)
}

/** @desc 导出当前查询范围内全部场景 XML */
export function exportAllAutomationUiSceneXml(query: AutomationUiSceneQuery) {
  return http.download(`${BASE_URL}/exportXmlAll`, query)
}

/** @desc 添加自动化管理-UI自动化场景用例 */
export function addCase(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}/addCase`, data)
}

/** @desc 修改自动化管理-UI自动化场景用例 */
export function updateCase(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}/updateCase`, data)
}

/** @desc 删除自动化管理-UI自动化场景用例 */
export function deleteCase(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}/deleteCase`, data)
}

/** @desc 拖拽自动化管理-UI自动化场景用例 */
export function dragCase(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}/dragCase`, data)
}

/** @desc 添加自动化管理-UI自动化场景用例步骤 */
export function addStep(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}/addStep`, data)
}

/** @desc 修改自动化管理-UI自动化场景用例步骤 */
export function updateStep(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}/updateStep`, data)
}

/** @desc 删除自动化管理-UI自动化场景用例步骤 */
export function deleteStep(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}/deleteStep`, data)
}

/** @desc 拖拽自动化管理-UI自动化场景用例步骤 */
export function dragStep(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}/dragStep`, data)
}

/** @desc 执行 UI 自动化场景 */
export function execAutomationUiScene(data: AutomationUiSceneExecReq) {
  return http.post<AutomationUiSceneExecResp>(`${BASE_URL}/exec`, data)
}

/** @desc 执行当前查询范围内全部 UI 自动化场景 */
export function execAllAutomationUiScene(data: AutomationUiSceneExecAllReq) {
  return http.post<AutomationUiSceneExecResp>(`${BASE_URL}/execAll`, data)
}

/** @desc 根据 ID 集合查询场景 */
export function getAutomationUiSceneSelected(ids: Array<string | number>) {
  return http.post<AutomationUiSceneResp[]>(`${BASE_URL}/selected`, ids)
}

export function copyCaseTree(data: { source: AutomationUiTreeNodeRef, name?: string, remark?: string, position: AutomationUiTreeMovePosition, anchor?: AutomationUiTreeNodeRef, expectedDefinitionVersion: number }, sceneDbId: string | number) {
  return http.post<AutomationUiTreeMutationResp>(`${BASE_URL}/${sceneDbId}/caseTree/copy`, data)
}

export function moveCaseTree(data: { source: AutomationUiTreeNodeRef, target: AutomationUiTreeNodeRef, position: Exclude<AutomationUiTreeMovePosition, 'LAST'>, expectedDefinitionVersion: number }, sceneDbId: string | number) {
  return http.put<AutomationUiTreeMutationResp>(`${BASE_URL}/${sceneDbId}/caseTree/move`, data)
}

export function deleteCaseTree(data: { nodes: AutomationUiTreeNodeRef[], expectedDefinitionVersion: number }, sceneDbId: string | number) {
  return http.put<AutomationUiTreeMutationResp>(`${BASE_URL}/${sceneDbId}/caseTree/delete`, data)
}

/** @desc 查询场景轻量版本，避免轮询时重复下载 caseList 和执行历史 */
export function getAutomationUiSceneSelectedRevisions(ids: Array<string | number>) {
  return http.post<AutomationUiSceneRevisionResp[]>(`${BASE_URL}/selected/revisions`, ids)
}

/** @desc 清空 UI 自动化场景执行结果 */
export function clearAutomationUiSceneResults(data: AutomationUiSceneClearReq) {
  return http.put(`${BASE_URL}/clearResults`, data)
}
