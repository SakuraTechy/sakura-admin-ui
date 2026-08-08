import http from '@/utils/http'

const BASE_URL = '/test/testReport'

export type TestReportType = 'SELENIUM' | 'PLAYWRIGHT_RUNNER' | 'CHROME_DEVTOOLS_PROTOCOL'

export interface TestReportResp {
  id: string
  projectId: string
  versionId?: string
  projectName: string
  versionName?: string
  testPlanId?: string
  testPlanName?: string
  name: string
  description?: string
  triggerMode?: string
  executeMode?: string
  reportType?: TestReportType
  runTime?: number
  buildNumber?: string
  consoleUrl?: string
  reportUrl?: string
  videoUrl?: string
  status?: string
  createTime?: string
}

export interface TestReportDetailResp extends TestReportResp {
  projectConfig?: Record<string, any>
  automationConfig?: Record<string, any>
  runtimeEnvironment?: Record<string, any>
  statisticAnalysis?: Record<string, any>
}

export interface TestReportUiStatistic {
  testPlanId?: string
  buildNumber?: number | string
  consoleUrl?: string
  testReportUrl?: string
  videoUrl?: string
  sceneTotal?: number
  scenePass?: number
  sceneFail?: number
  sceneSkip?: number
  scenePassRate?: string
  caseTotal?: number
  casePass?: number
  caseFail?: number
  caseSkip?: number
  casePassRate?: string
  stepTotal?: number
  stepPass?: number
  stepFail?: number
  stepSkip?: number
  stepPassRate?: string
  executeName?: string
  executeStatus?: string
  executeResult?: string
  duration?: string | number
  durationStartTime?: string
  durationEndTime?: string
}

export interface TestReportQuery {
  id?: string
  projectId?: number
  versionId?: string
  testPlanId?: string
  name?: string
  triggerMode?: string
  executeMode?: string
  reportType?: TestReportType
  status?: string
  sort?: Array<string>
}

export interface TestReportPageQuery extends TestReportQuery, PageQuery {}

export function listTestReport(query?: TestReportPageQuery) {
  return http.get<PageRes<TestReportResp[]>>(BASE_URL, query)
}

export function getTestReport(id: string) {
  return http.get<TestReportDetailResp>(`${BASE_URL}/${id}`)
}

export function addTestReport(data: any) {
  return http.post(BASE_URL, data)
}

export function updateTestReport(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

export function deleteTestReport(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

export function exportTestReport(query: TestReportQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

export function uploadTestReportResult(data: any) {
  return http.post(`${BASE_URL}/uploadResult`, data)
}
