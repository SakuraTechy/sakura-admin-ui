import type { AutomationPlaywrightRunnerOptions } from '@/apis/automation/automationPlaywrightRunner'

export const playwrightRunnerLiveFrameQualityOptions = [
  { label: '流畅（1080P，低带宽）', value: 'smooth' },
  { label: '高清（推荐）', value: 'high' },
  { label: '超清（4K，高带宽）', value: 'ultra' },
  { label: '原画（8K，极高资源占用）', value: '8k' },
]

export const playwrightRunnerSessionModeOptions = [
  { label: '同一浏览器窗口（默认）', value: 'reuse-browser' },
  { label: '复用登录态', value: 'reuse-auth' },
  { label: '独立登录', value: 'isolated' },
]

export const playwrightRunnerArtifactPolicyOptions = [
  { label: '仅失败保留（推荐）', value: 'retain-on-failure' },
  { label: '始终保留', value: 'on' },
  { label: '关闭', value: 'off' },
]

export const playwrightRunnerPageErrorPolicyOptions = [
  { label: '跟随录制用例（推荐）', value: 'inherit' },
  { label: '本次任务开启', value: 'enabled' },
  { label: '本次任务关闭', value: 'disabled' },
] as const

export type PlaywrightRunnerPageErrorPolicy = (typeof playwrightRunnerPageErrorPolicyOptions)[number]['value']

export const createDefaultPlaywrightRunnerOptions = (): AutomationPlaywrightRunnerOptions => ({
  browser: 'chromium',
  liveFrameQuality: 'high',
  sessionMode: 'reuse-browser',
  headed: false,
  ignoreHttpsErrors: true,
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
  stepTimeoutMs: 6000,
  caseTimeoutMs: 600000,
  slowMoMs: 0,
  finishDelayMs: 0,
})
