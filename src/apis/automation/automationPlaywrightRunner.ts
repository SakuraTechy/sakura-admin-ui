import http from '@/utils/http'
import type { SilentAxiosRequestConfig } from '@/utils/http'

const BASE_URL = '/automation/playwright/runner/jobs'

export interface AutomationPlaywrightRunnerJobReq {
  caseKey: string
  batchId?: string
  executionId?: string
  /** 批次创建时签发的短时 capability，仅随当前 Runner 任务请求传递。 */
  executionCapability?: string
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
  reviewGateBypassReason?: string
  executionConfig?: Record<string, unknown>
  cdpOptions?: AutomationCdpPlaybackOptions
}

export type AutomationCdpSessionMode = 'legacy-profile' | 'isolated' | 'reuse-auth' | 'reuse-browser'
export type AutomationCdpBrowserSessionSource = 'current-profile' | 'managed-context'

export interface AutomationCdpPlaybackOptions {
  browserSessionSource: AutomationCdpBrowserSessionSource
  sessionMode: AutomationCdpSessionMode
  ignoreHttpsErrors: boolean
  windowSizeMode: 'maximized' | 'current' | 'custom'
  viewportWidth: number
  viewportHeight: number
  pageErrorCheckEnabled: boolean
}

export interface AutomationPlaywrightBatchCase {
  caseId: string
  caseName: string
  executionId: string
  status: string
  stepTotal: number
  /** Admin 在创建批次时冻结的最终配置，客户端不得重新合并默认值。 */
  effectiveExecutionConfig?: Record<string, unknown>
}

export interface AutomationPlaywrightBatchResp {
  batchId: string
  /** Admin 不落明文，前端只在当前批次创建后转发给 Runner Job。 */
  executionCapability?: string
  executionType: string
  executeName: string
  executeEmail?: string
  startedAt: string
  sessionConfig?: {
    browserSessionSource: AutomationCdpBrowserSessionSource
    sessionMode: AutomationCdpSessionMode
  }
  cases: AutomationPlaywrightBatchCase[]
}

/** 当前登录账号的 CDP 受控会话灰度资格；不会暴露服务端白名单。 */
export interface AutomationCdpPlaybackAvailability {
  managedContextEnabled: boolean
  reason?: string
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
  sessionMode: 'isolated' | 'reuse-auth' | 'reuse-browser'
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

export function getAutomationCdpPlaybackAvailability() {
  return http.get<AutomationCdpPlaybackAvailability>('/automation/playwright/execution-batches/cdp-playback/availability')
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

export function getAutomationPlaywrightCase(caseKey: string, projectEnvironmentId: string, batchId?: string) {
  return http.get<any>(
    `/automation/playwright/testcases/${encodeAdminCasePath(caseKey)}`,
    { projectEnvironmentId, ...(batchId ? { batchId } : {}) },
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
