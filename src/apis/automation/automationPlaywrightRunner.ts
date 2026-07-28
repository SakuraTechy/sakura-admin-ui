import http from '@/utils/http'
import type { SilentAxiosRequestConfig } from '@/utils/http'

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
  /** 计划异步调度时显式透传执行人，避免后台线程丢失用户上下文。 */
  executeName?: string
  /** 计划异步调度时显式透传执行邮箱。 */
  executeEmail?: string
  testPlanId?: string
  testReportId?: string
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
  executeEmail?: string
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

export interface AutomationPlaywrightCaseCancellationResp {
  batchCancelRequested: boolean
  caseCancelRequested: boolean
}

export interface AutomationPlaywrightRunnerOptions {
  browser: 'chromium' | 'firefox' | 'webkit'
  liveFrameQuality: 'smooth' | 'high' | 'ultra' | '8k'
  sessionMode: 'isolated' | 'reuse-auth'
  headed: boolean
  ignoreHttpsErrors: boolean
  pageErrorCheckEnabled?: boolean
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
  logs?: AutomationPlaywrightRunnerLog[]
  liveAvailable?: boolean
}

export interface AutomationPlaywrightRunnerLog {
  sequence: number
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  phase: string
  message: string
  detail: boolean
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

export function cancelAutomationPlaywrightBatchCase(sceneKey: string, batchId: string, caseId: string) {
  return http.patch<void>(
    `/automation/playwright/execution-batches/${encodeURIComponent(sceneKey)}/${encodeURIComponent(batchId)}/cases/${encodeURIComponent(caseId)}/cancel`,
  )
}

export function getAutomationPlaywrightBatchCaseCancellation(sceneKey: string, batchId: string, caseId: string) {
  return http.get<AutomationPlaywrightCaseCancellationResp>(
    `/automation/playwright/execution-batches/${encodeURIComponent(sceneKey)}/${encodeURIComponent(batchId)}/cases/${encodeURIComponent(caseId)}/cancellation`,
  )
}

export function getAutomationPlaywrightCase(caseKey: string, projectEnvironmentId: string) {
  return http.get<any>(
    `/automation/playwright/testcases/${encodeAdminCasePath(caseKey)}`,
    { projectEnvironmentId },
  )
}

export function getAutomationPlaywrightRunnerJob(
  jobId: string,
  config?: SilentAxiosRequestConfig,
  afterSequence?: number,
) {
  const params = afterSequence === undefined ? undefined : { afterSequence }
  return http.get<AutomationPlaywrightRunnerJobResp>(`${BASE_URL}/${encodeURIComponent(jobId)}`, params, config)
}

export function cancelAutomationPlaywrightRunnerJob(jobId: string) {
  return http.delete<AutomationPlaywrightRunnerJobResp>(`${BASE_URL}/${encodeURIComponent(jobId)}`)
}

export function getAutomationPlaywrightRunnerLiveUrl(jobId: string, afterSequence?: string) {
  const base = String(import.meta.env.VITE_API_PREFIX || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const query = afterSequence && /^\d+$/.test(afterSequence)
    ? `?afterSequence=${encodeURIComponent(afterSequence)}`
    : ''
  return `${base}${BASE_URL}/${encodeURIComponent(jobId)}/live-frame${query}`
}

function encodeAdminCasePath(caseKey: string) {
  const [sceneKey, ...caseParts] = caseKey.split(':')
  return `${encodeURIComponent(sceneKey)}/${encodeURIComponent(caseParts.join(':'))}`
}
