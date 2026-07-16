import http from '@/utils/http'

const BASE_URL = '/automation/playwright/runner/jobs'

export interface AutomationPlaywrightRunnerJobReq {
  caseKey: string
  projectEnvironmentId: string
  startStep?: number
  options: AutomationPlaywrightRunnerOptions
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
