import http from '@/utils/http'

const BASE_URL = '/automation/playwright/runner/jobs'

export interface AutomationPlaywrightRunnerJobReq {
  caseKey: string
  batchId?: string
  executionId?: string
  projectEnvironmentId: string
  startStep?: number
  options: AutomationPlaywrightRunnerOptions
}

export interface AutomationPlaywrightBatchCreateReq {
  sceneKey: string
  executionType: 'playwright-runner' | 'extension-cdp'
  caseIds: string[]
  projectEnvironmentId: string
  executionConfig?: Record<string, unknown>
}

export interface AutomationPlaywrightBatchCase {
  caseId: string
  caseName: string
  executionId: string
  status: string
  stepTotal: number
}

export interface AutomationPlaywrightBatchResp {
  batchId: string
  executionType: string
  executeName: string
  startedAt: string
  cases: AutomationPlaywrightBatchCase[]
}

export interface AutomationPlaywrightBatchCaseStatusReq {
  status: 'waiting' | 'starting' | 'queued' | 'running' | 'failed' | 'cancelled'
  jobId?: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  error?: string
}

export interface AutomationPlaywrightRunnerOptions {
  browser: 'chromium' | 'firefox' | 'webkit'
  headed: boolean
  ignoreHttpsErrors: boolean
  trace: 'off' | 'on' | 'retain-on-failure'
  video: 'off' | 'on' | 'retain-on-failure'
  stepTimeoutMs: number
  caseTimeoutMs: number
  slowMoMs: number
  finishDelayMs: number
}

export interface AutomationPlaywrightRunnerJobResp {
  jobId: string
  caseKey: string
  projectEnvironmentId?: string
  status: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled'
  exitCode?: number
  startedAt?: string
  finishedAt?: string
  error?: string
  artifactDir?: string
  outputTail?: string[]
}

export function createAutomationPlaywrightRunnerJob(req: AutomationPlaywrightRunnerJobReq) {
  return http.post<AutomationPlaywrightRunnerJobResp>(BASE_URL, req)
}

export function createAutomationPlaywrightBatch(req: AutomationPlaywrightBatchCreateReq) {
  return http.post<AutomationPlaywrightBatchResp>('/automation/playwright/execution-batches', req)
}

export function updateAutomationPlaywrightBatchCase(
  sceneKey: string,
  batchId: string,
  caseId: string,
  req: AutomationPlaywrightBatchCaseStatusReq,
) {
  return http.patch<void>(
    `/automation/playwright/execution-batches/${encodeURIComponent(sceneKey)}/${encodeURIComponent(batchId)}/cases/${encodeURIComponent(caseId)}`,
    req,
  )
}

export function cancelAutomationPlaywrightBatch(sceneKey: string, batchId: string) {
  return http.patch<void>(
    `/automation/playwright/execution-batches/${encodeURIComponent(sceneKey)}/${encodeURIComponent(batchId)}/cancel`,
  )
}

export function getAutomationPlaywrightCase(caseKey: string, projectEnvironmentId: string) {
  return http.get<any>(
    `/automation/playwright/testcases/${encodeAdminCasePath(caseKey)}`,
    { projectEnvironmentId },
  )
}

export function getAutomationPlaywrightRunnerJob(jobId: string) {
  return http.get<AutomationPlaywrightRunnerJobResp>(`${BASE_URL}/${encodeURIComponent(jobId)}`)
}

export function cancelAutomationPlaywrightRunnerJob(jobId: string) {
  return http.delete<AutomationPlaywrightRunnerJobResp>(`${BASE_URL}/${encodeURIComponent(jobId)}`)
}

function encodeAdminCasePath(caseKey: string) {
  const [sceneKey, ...caseParts] = caseKey.split(':')
  return `${encodeURIComponent(sceneKey)}/${encodeURIComponent(caseParts.join(':'))}`
}
