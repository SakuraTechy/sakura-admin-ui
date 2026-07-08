import http from '@/utils/http'

const BASE_URL = '/test/timedTask'

export interface TestTimedTaskResp {
  id: string
  testPlanId: string
  testPlanName: string
  scheduleJobId?: number
  type: string
  name: string
  description: string
  cronExpression: string
  misfirePolicy: string
  allowConcurrent: number
  projectEnvironmentId: string
  automationEnvironmentId: string
  executeName?: string
  executeEmail?: string
  nextExecuteTime?: string
  status: string
  createTime: string
}

export interface TestTimedTaskLogResp {
  id: string
  jobId: number
  groupName?: string
  jobName?: string
  taskBatchStatus?: string
  operationReason?: string
  executorInfo?: string
  executionAt?: string
  createDt?: string
}

export interface TestTimedTaskQuery {
  id?: string
  testPlanId?: string
  name?: string
  type?: string
  status?: string
  sort?: Array<string>
}

export interface TestTimedTaskPageQuery extends TestTimedTaskQuery, PageQuery {}

export function listTimedTask(query?: TestTimedTaskPageQuery) {
  return http.get<PageRes<TestTimedTaskResp[]>>(BASE_URL, query)
}

export function getTimedTask(id: string) {
  return http.get<TestTimedTaskResp>(`${BASE_URL}/${id}`)
}

export function addTimedTask(data: any) {
  return http.post(BASE_URL, data)
}

export function updateTimedTask(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

export function deleteTimedTask(ids: string | Array<string>) {
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

export function listTimedTaskLogs(id: string, query?: { page?: number; size?: number }) {
  return http.get<PageRes<TestTimedTaskLogResp[]>>(`${BASE_URL}/${id}/logs`, query)
}
