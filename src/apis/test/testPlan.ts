import http from '@/utils/http'

const BASE_URL = '/test/testPlan'

export interface TestPlanResp {
  id: string
  /** 创建人昵称（后端 BaseResp#createUserString） */
  createUserString?: string
  /** 雪花 ID，须用字符串避免 JS Number 精度丢失 */
  projectId: string
  versionId?: string
  projectName: string
  type: string
  name: string
  abbreviate: string
  description: string
  memberIds: number[]
  principalIds: number[]
  uiTestScene: number[]
  sceneCount: number
  executedCount: number
  passedCount: number
  testProgress: number
  runTime: number
  status: string
  /** 计划开始/结束（后端 LocalDateTime，多为 `yyyy-MM-dd HH:mm:ss` 或带 T 的字符串） */
  plannedStartTime?: string | null
  plannedEndTime?: string | null
  createTime: string
  updateTime: string
}

export interface TestPlanQuery {
  id?: string
  projectId?: string
  versionId?: string
  name?: string
  type?: string
  status?: string
  /** 创建人用户 ID，与后端 BaseDO#createUser 一致 */
  createUser?: number
  /** 创建时间范围：前端选 `YYYY-MM-DD`；请求为 `yyyy-MM-dd HH:mm:ss` 二元组（与后端 Jackson 一致） */
  createTime?: string[]
  sort?: Array<string>
}

export interface TestPlanPageQuery extends TestPlanQuery, PageQuery {}

export type TestExecutionEngine = 'SELENIUM' | 'PLAYWRIGHT_RUNNER' | 'CHROME_DEVTOOLS_PROTOCOL'

export interface TestPlanSceneExecution {
  sceneKey: string
  sceneId?: string
  sceneName?: string
  caseIds: string[]
  status: 'WAITING' | 'SKIPPED'
  reason?: string
}

export interface TestPlanExecuteReq {
  projectEnvironmentId: string
  automationEnvironmentId?: string
  /** 缺省表示执行计划全部关联场景，传值表示按计划关联顺序执行指定子集。 */
  sceneIds?: string[]
  executionEngine?: TestExecutionEngine
  runnerOptions?: Record<string, unknown>
  cdpOptions?: Record<string, unknown>
  executeName?: string
  executeEmail?: string
}

export interface TestPlanExecuteResp {
  testReportId?: string
  reportType?: TestExecutionEngine
  dispatchMode?: 'SERVER' | 'CLIENT_CDP'
  status?: string
  buildNumber?: number
  consoleUrl?: string
  testReportUrl?: string
  sceneExecutions?: TestPlanSceneExecution[]
}

export function listTestPlan(query?: TestPlanPageQuery) {
  return http.get<PageRes<TestPlanResp[]>>(BASE_URL, query)
}

export function getTestPlanList(query?: TestPlanQuery) {
  return http.get<TestPlanResp[]>(`${BASE_URL}/list`, query)
}

export function getTestPlan(id: string) {
  return http.get<TestPlanResp>(`${BASE_URL}/${id}`)
}

export function addTestPlan(data: any) {
  return http.post(BASE_URL, data)
}

export function updateTestPlan(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

export function deleteTestPlan(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

export function exportTestPlan(query: TestPlanQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

export function relateTestPlanScenes(id: string, sceneIds: string[]) {
  return http.post(`${BASE_URL}/${id}/relateScenes`, { sceneIds })
}

export function removeTestPlanScenes(id: string, sceneIds: string[]) {
  return http.post(`${BASE_URL}/${id}/removeScenes`, { sceneIds })
}

export function executeTestPlan(id: string, data: TestPlanExecuteReq) {
  return http.post<TestPlanExecuteResp>(`${BASE_URL}/${id}/execute`, data)
}

export function cancelTestPlanExecution(id: string, reportId: string) {
  return http.post<void>(`${BASE_URL}/${id}/executions/${reportId}/cancel`)
}
