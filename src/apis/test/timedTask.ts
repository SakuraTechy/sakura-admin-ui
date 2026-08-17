import http from '@/utils/http'
import type { AutomationPlaywrightRunnerOptions } from '@/apis/automation/automationPlaywrightRunner'
import type { TestExecutionEngine } from '@/apis/test/testPlan'

const BASE_URL = '/test/timedTask'

export interface TestTimedTaskCapabilityResp {
  clientEnabled: boolean
  apiReachable: boolean
  groupAvailable: boolean
  ready: boolean
  groupName: string
  message: string
}

export interface TimedTaskRunSummary {
  id: string
  triggerMode: 'SCHEDULE' | 'MANUAL'
  status: 'RUNNING' | 'PASSED' | 'FAILED' | 'CANCELLED' | 'SKIPPED'
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
  executionEngine?: TestExecutionEngine
  executionConfig?: AutomationPlaywrightRunnerOptions | Record<string, unknown>
  projectEnvironmentId: string
  projectEnvironmentName?: string
  automationEnvironmentId?: string
  automationEnvironmentName?: string
  notificationEmails: string[]
  nextExecuteTime?: string
  status: 'ENABLED' | 'DISABLED' | 'DELETING'
  scheduleSyncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'DELETING'
  scheduleSyncError?: string
  scheduleSyncTime?: string
  scheduleSyncVersion?: number
  scheduleSyncRetryCount?: number
  scheduleSyncNextRetryTime?: string
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
  notificationStatus?: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED'
  notificationError?: string
}

export interface TestTimedTaskLogResp {
  id: string
  jobId: string
  groupName?: string
  jobName?: string
  taskBatchStatus?: number | string
  operationReason?: number | string
  executorType?: number
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
  runId?: string
  testReportId?: string
  status?: string
  triggerMode?: string
  startTime?: string
  endTime?: string
}

export interface TestTimedTaskLogQuery extends PageQuery {
  taskBatchStatus?: number
  startTime?: string
  endTime?: string
}

export interface TestTimedTaskReq {
  testPlanId: string
  name: string
  description?: string
  cronExpression: string
  allowConcurrent: number
  executionEngine: Exclude<TestExecutionEngine, 'CHROME_DEVTOOLS_PROTOCOL'>
  executionConfig?: Record<string, unknown>
  projectEnvironmentId: string
  automationEnvironmentId?: string
  notificationEmails: string[]
}

export function listTimedTask(query?: TestTimedTaskPageQuery) {
  return http.get<PageRes<TestTimedTaskResp[]>>(BASE_URL, query)
}

export function getTimedTaskCapability() {
  return http.get<TestTimedTaskCapabilityResp>(`${BASE_URL}/capability`)
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

export function retryTimedTaskSync(id: string) {
  return http.post(`${BASE_URL}/${id}/sync`)
}

export function triggerTimedTask(id: string) {
  return http.post(`${BASE_URL}/${id}/trigger`)
}

export function listTimedTaskRuns(id: string, query?: TestTimedTaskRunQuery) {
  return http.get<PageRes<TestTimedTaskRunResp[]>>(`${BASE_URL}/${id}/runs`, query)
}

export function listTimedTaskLogs(id: string, query?: TestTimedTaskLogQuery) {
  return http.get<PageRes<TestTimedTaskLogResp[]>>(`${BASE_URL}/${id}/logs`, query)
}
