import http from '@/utils/http'

const BASE_URL = '/automation/automationUiScene/recordings'

export interface RecordingSceneReq {
  sceneId: string
  name: string
  description?: string
  projectId: string | number
  projectName?: string
  versionId: string | number
  versionName?: string
  moduleId: string | number
  modulePath?: string
  level?: string
  tags?: Array<unknown>
}

export type AutomationLocatorStrategy = 'css' | 'xpath' | 'text' | 'role' | 'label' | 'placeholder' | 'testid'

export interface AutomationLocatorCandidate {
  type: string
  value: string
  score?: number
  context?: Record<string, unknown>
}

export interface AutomationLocatorMeta {
  version?: number
  candidates: AutomationLocatorCandidate[]
  context?: Record<string, unknown>
  assertion?: Record<string, unknown>
  [key: string]: unknown
}

export interface AutomationTypedTargetRef {
  strategy: AutomationLocatorStrategy
  value: string
  exact?: boolean
  target_selector?: string
  target_xpath?: string
  locator_meta?: AutomationLocatorMeta | string
  [key: string]: unknown
}

export interface PlaywrightRecordedStepReq {
  id?: unknown
  step_index?: number
  action_type?: string
  target_selector?: string
  target_xpath?: string
  target_ref?: AutomationTypedTargetRef | string
  locator_meta?: AutomationLocatorMeta | string
  value?: unknown
  value_masked?: unknown
  url?: string
  description?: string
  wait_before?: unknown
  is_overlay?: unknown
  screenshot?: string
  screenshot_focus?: unknown
  screenshot_focus_rect?: unknown
  [key: string]: unknown
}

export interface PlaywrightRecordedCaseReq {
  id?: unknown
  name: string
  status?: string
  start_url?: string
  end_url?: string
  description?: string
  screenshot_mode?: string
  page_error_check_enabled?: number
  window_size_mode?: string
  viewport_width?: number
  viewport_height?: number
  steps: PlaywrightRecordedStepReq[]
  [key: string]: unknown
}

export interface AutomationRecordingImportReq {
  mode: 'createScene' | 'appendCase' | 'replaceCase' | 'appendStep' | 'replaceStep'
  targetSceneDbId?: string | number
  expectedDefinitionVersion?: number
  targetCaseId?: string
  targetStepId?: string
  appendPosition?: 'FIRST' | 'LAST' | 'AFTER'
  appendAfterCaseId?: string
  stepAppendPosition?: 'FIRST' | 'LAST' | 'AFTER'
  appendAfterStepId?: string
  scene: RecordingSceneReq
  recordedCase: PlaywrightRecordedCaseReq
  persistScreenshots?: boolean
  keepRawScreenshotInStep?: boolean
}

export interface AutomationRecordingImportResp {
  sceneDbId: string | number
  sceneId: string
  caseId: string
  recordingId: string
  stepCount: number
  mode: string
}

/** @desc 导入 Playwright 录制结果 */
export function importRecording(data: AutomationRecordingImportReq) {
  return http.post<AutomationRecordingImportResp>(`${BASE_URL}/import`, data)
}
