import http from '@/utils/http'

const BASE_URL = '/test/testPlan'

export interface TestPlanResp {
  id: string
  projectId: number
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
  createTime: string
  updateTime: string
}

export interface TestPlanQuery {
  id?: string
  projectId?: number
  name?: string
  type?: string
  status?: string
  sort?: Array<string>
}

export interface TestPlanPageQuery extends TestPlanQuery, PageQuery {}

export interface TestPlanExecuteResp {
  testReportId?: string
  buildNumber?: number
  consoleUrl?: string
  testReportUrl?: string
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

export function relateTestPlanScenes(id: string, sceneIds: number[]) {
  return http.post(`${BASE_URL}/${id}/relateScenes`, { sceneIds })
}

export function removeTestPlanScenes(id: string, sceneIds: number[]) {
  return http.post(`${BASE_URL}/${id}/removeScenes`, { sceneIds })
}

export function executeTestPlan(id: string, data: any) {
  return http.post<TestPlanExecuteResp>(`${BASE_URL}/${id}/execute`, data)
}
