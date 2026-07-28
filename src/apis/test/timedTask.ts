import http from '@/utils/http'

const BASE_URL = '/test/timedTask'

export interface TimedTaskRunSummary {
  id: string
  triggerMode: 'SCHEDULE' | 'MANUAL'
  status: 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED'
  startTime: string
  endTime?: string
  runTime?: number
}

export interface TestTimedTaskResp {
  id: string
  testPlanId: string
  testPlanName: string
  projectId?: string
  projectName?: string
  name: string
  description?: string
  cronExpression: string
  allowConcurrent: number
  projectEnvironmentId: string
  projectEnvironmentName?: string
  automationEnvironmentId: string
  automationEnvironmentName?: string
  notificationEmails: string[]
  nextExecuteTime?: string
  status: 'ENABLED' | 'DISABLED'
  lastRun?: TimedTaskRunSummary
  createTime: string
}

export interface TestTimedTaskRunResp extends TimedTaskRunSummary {
  timedTaskId: string
  taskName: string
  testPlanId: string
  testPlanName: string
  testReportId?: string
  notificationEmails: string[]
  buildNumber?: string
  consoleUrl?: string
  reportUrl?: string
  failureReason?: string
  notificationStatus?: 'PENDING' | 'SENT' | 'FAILED'
  notificationError?: string
}

export interface TestTimedTaskLogResp {
  id: string
  jobId: number
  taskBatchStatus?: string
  operationReason?: string
  executorInfo?: string
  executionAt?: string
  createDt?: string
}

export interface TestTimedTaskQuery {
  id?: string
  projectId?: string
  testPlanId?: string
  name?: string
  status?: string
  sort?: string[]
}

export interface TestTimedTaskPageQuery extends TestTimedTaskQuery, PageQuery {}

export interface TestTimedTaskRunQuery extends PageQuery {
  status?: string
  triggerMode?: string
  startTime?: string
  endTime?: string
}

export interface TestTimedTaskReq {
  testPlanId: string
  name: string
  description?: string
  cronExpression: string
  allowConcurrent: number
  projectEnvironmentId: string
  automationEnvironmentId: string
  notificationEmails: string[]
}

export function listTimedTask(query?: TestTimedTaskPageQuery) {
  return http.get<PageRes<TestTimedTaskResp[]>>(BASE_URL, query)
}

export function getTimedTask(id: string) {
  return http.get<TestTimedTaskResp>(`${BASE_URL}/${id}`)
}

export function addTimedTask(data: TestTimedTaskReq) {
  return http.post(BASE_URL, data)
}

export function updateTimedTask(data: TestTimedTaskReq, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

export function deleteTimedTask(ids: string | string[]) {
  return http.del(`${BASE_URL}/${ids}`)
}

export function exportTimedTask(query: TestTimedTaskQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

export function updateTimedTaskStatus(id: string, status: string) {
  return http.post(`${BASE_URL}/${id}/status?status=${status}`)
}

export function triggerTimedTask(id: string) {
  return http.post(`${BASE_URL}/${id}/trigger`)
}

export function listTimedTaskRuns(id: string, query?: TestTimedTaskRunQuery) {
  return http.get<PageRes<TestTimedTaskRunResp[]>>(`${BASE_URL}/${id}/runs`, query)
}

export function listTimedTaskLogs(id: string, query?: { page?: number, size?: number }) {
  return http.get<PageRes<TestTimedTaskLogResp[]>>(`${BASE_URL}/${id}/logs`, query)
}
