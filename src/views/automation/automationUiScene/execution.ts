import type { ExecutionType, ExecutionViewType } from '@/apis/automation/automationUiScene'

export type { ExecutionType, ExecutionViewType } from '@/apis/automation/automationUiScene'

export type ExecutionRecordSource = 'debug' | 'test'
export type ExecutionRecordScope = ExecutionRecordSource | 'all'

export interface ExecutionRecordTarget {
  recordKey?: string
  executionId?: string
  buildNumber?: string | number
  caseId?: string
}

export interface ExecutionResultOpenOptions {
  source?: ExecutionRecordScope
  target?: ExecutionRecordTarget
}

export interface ExecutionHistoryStepRow {
  rowKey: string
  stepIndex: string | number
  stepNumber: number
  stepId: string
  stepName: string
  actionType: string
  description: string
  status: unknown
  duration: unknown
  error: string
  errorCode: string
  locatorSource: string
  locatorType: string
  locatorValue: string
  matchedCount: number | string
  configuredLocators: Array<{ type: string, value: string }>
  hasActualLocator: boolean
  valueMasked: boolean
  targetSelector: string
  targetXpath: string
  details: unknown
}

export interface ExecutionHistoryCaseRow {
  rowKey: string
  recordKey: string
  recordTarget: ExecutionRecordTarget
  executionType: ExecutionType
  executionId: string
  startedAt: unknown
  finishedAt: unknown
  caseId: string
  caseName: string
  executeStatus: unknown
  executeResult: unknown
  duration: unknown
  executeName: string
  buildNumber: string
  stepPassRate: string
  stepTotal: number | string
  stepPass: number | string
  stepFail: number | string
  stepSkip: number | string
  projectEnvironmentId: string
  projectEnvironmentName: string
  browser: string
  headed: string
  startUrl: string
  windowSizeMode: string
  viewport: string
  failedStepIndex: string
  errorCode: string
  error: string
  artifactTrace: string
  artifactVideo: string
  artifactReport: string
  artifactScreenshot: string
  artifactUploadError: string
  playwrightCaseKey: string
  steps: ExecutionHistoryStepRow[]
  summaryOnly: boolean
  live?: boolean
  batchId: string
  progress: number | null
  progressIndeterminate: boolean
}

export interface ExecutionHistoryBatchRow {
  rowKey: string
  recordKey: string
  recordTarget: ExecutionRecordTarget
  batchId: string
  executionType: ExecutionType
  caseTotal: number
  caseCompleted: number
  casePass: number
  caseFail: number
  caseCancelled: number
  caseBlocked: number
  caseSkip: number
  progress: number | null
  progressIndeterminate: boolean
  executeStatus: unknown
  executeResult: unknown
  executeName: string
  startedAt: unknown
  finishedAt: unknown
  duration: unknown
  projectEnvironmentId: string
  projectEnvironmentName: string
  cases: ExecutionHistoryCaseRow[]
  live?: boolean
}

export interface LiveExecutionCase {
  batchId: string
  executionId: string
  executeName: string
  executionType: Exclude<ExecutionType, 'jenkins'>
  caseId: string
  caseName: string
  stepTotal: number
  status: 'waiting' | 'starting' | 'queued' | 'running' | 'passed' | 'failed' | 'cancelled'
  error?: string
  startedAt?: number
  finishedAt?: number
}

export const executionTypeOptions: Array<{ label: string, value: ExecutionType }> = [
  { label: 'Selenium Runner', value: 'jenkins' },
  { label: 'Playwright Runner', value: 'playwright-runner' },
  { label: 'Chrome DevTools Protocol', value: 'extension-cdp' },
]

export const executionViewLabels: Record<ExecutionViewType, string> = {
  record: '执行记录',
  log: '执行日志',
  report: '执行报告',
  video: '执行录屏',
}

export const executionTypeLabel = (type: ExecutionType) => {
  return executionTypeOptions.find((item) => item.value === type)?.label || type
}

/**
 * 执行记录统一按平台时区展示，同时兼容历史 ISO 时间数据。
 */
export const formatExecutionDateTime = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return raw

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`
}

export const normalizeRecordList = (value: unknown): any[] => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function executionTime(record: any) {
  const value = record?.startedAt || record?.finishedAt || record?.createTime
  const timestamp = value ? new Date(value).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const inferExecutionType = (record: any, source: 'debug' | 'test' = 'debug'): ExecutionType | undefined => {
  const explicit = String(record?.executionType || '').trim().toLowerCase()
  if (executionTypeOptions.some((item) => item.value === explicit)) return explicit as ExecutionType

  const executor = String(
    record?.playwrightResult?.executor
    || record?.raw?.executor
    || record?.executeName
    || '',
  ).trim().toLowerCase()
  if (executor.includes('extension-cdp') || executor === 'cdp') return 'extension-cdp'
  if (executor.includes('playwright-runner') || executor === 'runner') return 'playwright-runner'
  if (source === 'test' || record?.buildNumber || record?.consoleUrl || record?.testReportUrl) return 'jenkins'
  return undefined
}

export const getExecutionRecords = (scene: any, type: ExecutionType, scope: ExecutionRecordScope = 'all') => {
  const debugRecords = normalizeRecordList(scene?.debugRecord).map((record, index) => ({
    ...record,
    __source: 'debug',
    __key: executionRecordKey('debug', record, index),
  }))
  const testRecords = normalizeRecordList(scene?.testRecord).map((record, index) => ({
    ...record,
    __source: 'test',
    __key: executionRecordKey('test', record, index),
  }))
  const records = scope === 'debug' ? debugRecords : scope === 'test' ? testRecords : [...debugRecords, ...testRecords]
  return records
    .filter((record) => inferExecutionType(record, record.__source) === type)
    .sort((left, right) => executionTime(right) - executionTime(left))
}

export const matchesExecutionRecord = (record: any, target?: ExecutionRecordTarget) => {
  if (!target) return false
  if (target.recordKey && record?.__key === target.recordKey) return true
  if (target.executionId) return String(record?.executionId || '') === target.executionId
  if (target.buildNumber != null) return String(record?.buildNumber || '') === String(target.buildNumber)
  return Boolean(target.recordKey && record?.__key === target.recordKey)
}

/**
 * 场景详情的执行历史只展示调试记录，测试计划记录继续由 testRecord 独立承载。
 */
export const getDebugExecutionHistoryRows = (scene: any): ExecutionHistoryCaseRow[] => {
  const records = normalizeRecordList(scene?.debugRecord)
    .map((record, index) => ({
      ...record,
      __source: 'debug' as const,
      __key: executionRecordKey('debug', record, index),
    }))
    .sort((left, right) => executionTime(right) - executionTime(left))

  return dedupeExecutionHistoryRows(records.flatMap((record) => buildExecutionHistoryRows(record)))
}

export const getDebugExecutionBatchRows = (scene: any): ExecutionHistoryBatchRow[] => {
  const rows = normalizeRecordList(scene?.debugRecord)
    .map((record, index) => ({
      ...record,
      __source: 'debug' as const,
      __key: executionRecordKey('debug', record, index),
    }))
    .sort((left, right) => executionTime(right) - executionTime(left))
    .map((record) => buildExecutionHistoryBatchRow(record))

  return dedupeExecutionBatchRows(rows)
}

/**
 * 同一执行结果可能被启动占位和最终回传重复写入，展示时仅保留信息更完整的一条。
 * 没有稳定执行标识的旧记录保持原样，避免错误合并不同历史。
 */
function dedupeExecutionHistoryRows(rows: ExecutionHistoryCaseRow[]) {
  const selected = new Map<string, ExecutionHistoryCaseRow>()
  rows.forEach((row) => {
    if (!row.executionId || row.executionId === '-' || !row.caseId || row.caseId === '-') {
      selected.set(row.rowKey, row)
      return
    }
    const identity = `${row.caseId}::${row.executionId}`
    const current = selected.get(identity)
    if (!current || caseInformationScore(row) > caseInformationScore(current)) selected.set(identity, row)
  })
  return [...selected.values()].sort((left, right) => executionTime(right) - executionTime(left))
}

function caseInformationScore(row: ExecutionHistoryCaseRow) {
  return row.steps.length * 100 + (isTerminalExecutionStatus(row.executeStatus) ? 10 : 0) + (row.finishedAt ? 1 : 0)
}

function dedupeExecutionBatchRows(rows: ExecutionHistoryBatchRow[]) {
  const selected = new Map<string, ExecutionHistoryBatchRow>()
  rows.forEach((row) => {
    if (!row.batchId || row.batchId === '-') {
      selected.set(row.rowKey, row)
      return
    }
    const current = selected.get(row.batchId)
    if (!current || batchInformationScore(row) > batchInformationScore(current)) {
      selected.set(row.batchId, row)
    }
  })
  return [...selected.values()].sort((left, right) => executionTime(right) - executionTime(left))
}

function batchInformationScore(row: ExecutionHistoryBatchRow) {
  return row.caseCompleted * 100 + row.cases.length * 10 + (row.finishedAt ? 1 : 0)
}

function buildExecutionHistoryBatchRow(record: any): ExecutionHistoryBatchRow {
  const cases = buildExecutionHistoryRows(record)
  const executionType = inferExecutionType(record, 'debug') || 'jenkins'
  const statusCounts = cases.reduce((counts, item) => {
    const status = String(item.executeStatus || '').toLowerCase()
    if (isTerminalExecutionStatus(status)) counts.completed += 1
    if (status === 'passed') counts.passed += 1
    if (status === 'failed') counts.failed += 1
    if (status === 'cancelled') counts.cancelled += 1
    if (status === 'blocked') counts.blocked += 1
    if (status === 'skipped') counts.skipped += 1
    return counts
  }, { completed: 0, passed: 0, failed: 0, cancelled: 0, blocked: 0, skipped: 0 })
  const caseTotal = numericValue(record.caseTotal) || cases.length
  const caseCompleted = valueWithFallback(record.caseCompleted, statusCounts.completed)
  const progress = caseTotal > 0
    ? Math.min(100, Math.round(caseCompleted * 10000 / caseTotal) / 100)
    : 0
  const batchId = stringValue(record.batchId || record.executionId || record.buildNumber || record.__key)
  return {
    rowKey: `${record.__key}-batch-${batchId}`,
    recordKey: record.__key,
    recordTarget: {
      recordKey: record.__key,
      executionId: stringValue(record.executionId),
      buildNumber: record.buildNumber,
    },
    batchId,
    executionType,
    caseTotal,
    caseCompleted,
    casePass: valueWithFallback(record.casePass, statusCounts.passed),
    caseFail: valueWithFallback(record.caseFail, statusCounts.failed),
    caseCancelled: valueWithFallback(record.caseCancelled, statusCounts.cancelled),
    caseBlocked: valueWithFallback(record.caseBlocked, statusCounts.blocked),
    caseSkip: valueWithFallback(record.caseSkip, statusCounts.skipped),
    progress,
    progressIndeterminate: false,
    executeStatus: record.executeStatus || (caseCompleted >= caseTotal ? 'completed' : 'running'),
    executeResult: record.executeResult,
    executeName: stringValue(record.executeName || record.executeUsername || record.executor) || '-',
    startedAt: record.startedAt || record.createTime,
    finishedAt: record.finishedAt,
    duration: record.duration,
    projectEnvironmentId: stringValue(record.projectEnvironmentId) || '-',
    projectEnvironmentName: stringValue(record.projectEnvironmentName) || '-',
    cases,
  }
}

function buildExecutionHistoryRows(record: any): ExecutionHistoryCaseRow[] {
  const executionType = inferExecutionType(record, 'debug') || 'jenkins'
  const recordTarget: ExecutionRecordTarget = {
    recordKey: record.__key,
    executionId: stringValue(record.executionId),
    buildNumber: record.buildNumber,
  }
  const rawCaseResult = record?.playwrightResult?.case_result
  const caseResults = Array.isArray(record.caseResults)
    ? record.caseResults
    : rawCaseResult && typeof rawCaseResult === 'object'
      ? [rawCaseResult]
      : []

  if (caseResults.length > 0) {
    return caseResults.map((caseResult: any, index: number) => buildExecutionHistoryRow(
      record,
      executionType,
      recordTarget,
      caseResult,
      index,
      false,
    ))
  }

  const hasCase = Boolean(record.caseId || record.caseName || record.playwrightCaseKey)
  return [buildExecutionHistoryRow(record, executionType, recordTarget, {}, 0, !hasCase)]
}

function buildExecutionHistoryRow(
  record: any,
  executionType: ExecutionType,
  recordTarget: ExecutionRecordTarget,
  caseResult: any,
  caseIndex: number,
  summaryOnly: boolean,
): ExecutionHistoryCaseRow {
  const recordPlaywrightResult = objectValue(record.playwrightResult)
  const casePlaywrightResult = objectValue(caseResult.playwright_result || caseResult.playwrightResult)
  const playwrightResult = Object.keys(casePlaywrightResult).length ? casePlaywrightResult : recordPlaywrightResult
  const rawConfig = objectValue(playwrightResult.raw)
  const executionConfig = objectValue(
    playwrightResult.execution_config
    || playwrightResult.executionConfig
    || record.executionConfig,
  )
  const caseId = stringValue(caseResult.case_id || caseResult.caseId || record.caseId)
  const caseName = stringValue(caseResult.case_name || caseResult.caseName || record.caseName)
  const rawSteps = Array.isArray(caseResult.steps)
    ? caseResult.steps
    : caseIndex === 0 && Array.isArray(record.stepResults)
      ? record.stepResults
      : Array.isArray(playwrightResult.steps)
        ? playwrightResult.steps
        : []
  const caseExecutionId = stringValue(caseResult.execution_id || caseResult.executionId)
  const rowKey = `${record.__key}-case-${caseExecutionId || caseId || caseIndex}`
  const stepTotal = valueOrDash(caseResult.step_total ?? caseResult.stepTotal ?? record.stepTotal ?? rawSteps.length)
  const stepPass = valueOrDash(caseResult.step_pass ?? caseResult.stepPass ?? record.stepPass)
  const stepFail = valueOrDash(caseResult.step_fail ?? caseResult.stepFail ?? record.stepFail)
  const stepSkip = valueOrDash(caseResult.step_skip ?? caseResult.stepSkip ?? record.stepSkip)
  const artifactUploadErrors = arrayValue(
    caseResult.artifact_upload_errors
    || playwrightResult.artifact_upload_errors
    || record.artifactUploadErrors,
  )
  const artifactRecord = {
    artifactUrls: caseResult.artifact_urls || caseResult.artifactUrls,
    playwrightResult,
  }
  const error = stringValue(caseResult.error || playwrightResult.error || record.playwrightError)
  const errorCode = stringValue(caseResult.error_code || playwrightResult.error_code)
  const projectEnvironmentId = stringValue(
    record.projectEnvironmentId
    || rawConfig.project_environment_id
    || executionConfig.project_environment_id,
  )
  const projectEnvironmentName = stringValue(
    record.projectEnvironmentName
    || rawConfig.project_environment_name
    || executionConfig.project_environment_name,
  )
  const viewportWidth = rawConfig.viewport_width ?? executionConfig.viewport_width
  const viewportHeight = rawConfig.viewport_height ?? executionConfig.viewport_height
  const resolvedStepTotal = numericValue(stepTotal)
  const resolvedStepPass = numericValue(stepPass)
  const resolvedStepFail = numericValue(stepFail)
  const resolvedStepSkip = numericValue(stepSkip)
  const executeStatus = caseResult.status || caseResult.executeStatus || record.executeStatus
  const executeResult = caseResult.executeResult
    || (isTerminalExecutionStatus(executeStatus) ? caseResult.status : undefined)
    || (isTerminalExecutionStatus(record.executeStatus) ? record.executeResult : undefined)
  const progress = caseExecutionProgress(
    executeStatus,
    resolvedStepTotal,
    resolvedStepPass,
    resolvedStepFail,
    resolvedStepSkip,
  )

  return {
    rowKey,
    recordKey: record.__key,
    recordTarget: { ...recordTarget, executionId: caseExecutionId || recordTarget.executionId, caseId },
    executionType,
    executionId: caseExecutionId || stringValue(record.executionId || record.buildNumber),
    startedAt: caseResult.started_at || caseResult.startedAt || record.startedAt || record.finishedAt || record.createTime,
    finishedAt: caseResult.finished_at || caseResult.finishedAt || record.finishedAt,
    caseId: summaryOnly ? '-' : (caseId || '-'),
    caseName: summaryOnly ? '场景汇总' : (caseName || caseId || '未命名用例'),
    executeStatus,
    executeResult,
    duration: caseResult.duration_ms ?? caseResult.duration ?? record.duration,
    executeName: stringValue(record.executeName || record.executeUsername || record.executor) || '-',
    buildNumber: stringValue(record.buildNumber) || '-',
    stepPassRate: caseResult.step_pass_rate ?? caseResult.stepPassRate ?? record.stepPassRate ?? '-',
    stepTotal,
    stepPass,
    stepFail,
    stepSkip,
    projectEnvironmentId: projectEnvironmentId || '-',
    projectEnvironmentName: projectEnvironmentName || '-',
    browser: stringValue(playwrightResult.browser || record.browser) || '-',
    headed: booleanLabel(
      playwrightResult.headed
      ?? (playwrightResult.headless == null ? undefined : !playwrightResult.headless),
    ),
    startUrl: stringValue(rawConfig.start_url || executionConfig.start_url || record.startUrl) || '-',
    windowSizeMode: stringValue(
      rawConfig.window_size_mode
      || executionConfig.window_size_mode
      || record.windowSizeMode,
    ) || '-',
    viewport: formatViewport(viewportWidth, viewportHeight),
    failedStepIndex: stringValue(
      playwrightResult.failed_step_index
      ?? caseResult.failed_step_index
      ?? record.failedStepIndex,
    ) || '-',
    errorCode: errorCode || '-',
    error: error || '-',
    artifactTrace: artifactPresence(artifactRecord, 'trace'),
    artifactVideo: artifactPresence(artifactRecord, 'video', 'videos'),
    artifactReport: artifactPresence(artifactRecord, 'report_html', 'report'),
    artifactScreenshot: artifactPresence(artifactRecord, 'failure_screenshot', 'screenshot', 'screenshots'),
    artifactUploadError: artifactUploadErrors.length
      ? artifactUploadErrors.map((item) => stringValue(objectValue(item).error || item)).filter(Boolean).join('；')
      : '-',
    playwrightCaseKey: stringValue(caseResult.case_key || record.playwrightCaseKey) || '-',
    steps: rawSteps.map((step: any, index: number) => normalizeHistoryStep(step, rowKey, index)),
    summaryOnly,
    batchId: stringValue(record.batchId) || stringValue(record.executionId || record.buildNumber),
    progress,
    progressIndeterminate: progress == null,
  }
}

function normalizeHistoryStep(step: any, parentKey: string, index: number): ExecutionHistoryStepRow {
  const stepIndex = step.step_index ?? step.stepIndex ?? index
  const locatorSource = stringValue(
    step.actual_locator_source || step.actualLocatorSource || step.locator_source || step.locatorSource,
  )
  const locatorType = stringValue(
    step.actual_locator_type || step.actualLocatorType || step.locator_type || step.locatorType,
  )
  const locatorValue = stringValue(
    step.actual_locator_value || step.actualLocatorValue || step.locator_value || step.locatorValue,
  )
  return {
    rowKey: `${parentKey}-step-${step.step_id || step.stepId || stepIndex}`,
    stepIndex,
    stepNumber: index + 1,
    stepId: stringValue(step.step_id || step.stepId || step.id) || '-',
    stepName: stringValue(step.step_name || step.stepName || step.name || step.description) || `步骤 ${index + 1}`,
    actionType: stringValue(step.action_type || step.actionType || step.operationValue) || '-',
    description: stringValue(step.description || step.name) || '-',
    status: step.status || step.executeResult,
    duration: step.duration_ms ?? step.duration,
    error: stringValue(step.error || step.message) || '-',
    errorCode: stringValue(step.error_code || step.errorCode) || '-',
    locatorSource: locatorSource || '-',
    locatorType: locatorType || '-',
    locatorValue: locatorValue || '-',
    matchedCount: valueOrDash(step.matched_count ?? step.matchedCount),
    configuredLocators: normalizeConfiguredLocators(step),
    hasActualLocator: Boolean(locatorSource),
    valueMasked: ['1', 'true'].includes(String(step.value_masked ?? step.valueMasked ?? '').toLowerCase()),
    targetSelector: stringValue(step.target_selector || step.targetSelector) || '-',
    targetXpath: stringValue(step.target_xpath || step.targetXpath) || '-',
    details: step.details,
  }
}

function normalizeConfiguredLocators(step: any) {
  const configured = arrayValue(step.configured_locators || step.configuredLocators)
    .map((item) => objectValue(item))
    .map((item) => ({ type: stringValue(item.type), value: stringValue(item.value) }))
    .filter((item) => item.type && item.value)
  const locatorMeta = parseObjectValue(step.locator_meta || step.locatorMeta)
  arrayValue(locatorMeta.candidates).forEach((item) => {
    const candidate = objectValue(item)
    const type = stringValue(candidate.type)
    const value = stringValue(candidate.value)
    if (type && value) configured.push({ type, value })
  })
  if (step.target_selector || step.targetSelector) {
    configured.push({ type: 'css', value: stringValue(step.target_selector || step.targetSelector) })
  }
  if (step.target_xpath || step.targetXpath) {
    configured.push({ type: 'xpath', value: stringValue(step.target_xpath || step.targetXpath) })
  }
  return configured.filter((item, index, list) => (
    list.findIndex((candidate) => candidate.type === item.type && candidate.value === item.value) === index
  ))
}

function parseObjectValue(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    return objectValue(JSON.parse(value))
  } catch {
    return {}
  }
}

function numericValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

function valueWithFallback(value: unknown, fallback: number) {
  return value === undefined || value === null || value === '' ? fallback : numericValue(value)
}

function isTerminalExecutionStatus(value: unknown) {
  return ['passed', 'failed', 'cancelled', 'blocked', 'skipped', 'completed'].includes(String(value || '').toLowerCase())
}

function caseExecutionProgress(
  status: unknown,
  total: number,
  passed: number,
  failed: number,
  skipped: number,
): number | null {
  const normalized = String(status || '').toLowerCase()
  if (['waiting', 'not_started', 'idle', '10', ''].includes(normalized)) return 0
  const completedSteps = passed + failed + skipped
  if (total > 0 && completedSteps > 0) {
    return Math.min(100, Math.round(completedSteps * 10000 / total) / 100)
  }
  if (isTerminalExecutionStatus(normalized)) return 100
  return null
}

function executionRecordKey(source: ExecutionRecordSource, record: any, index: number) {
  const executionId = stringValue(record?.executionId) || '-'
  const buildNumber = stringValue(record?.buildNumber) || '-'
  const fallbackIdentity = executionId === '-' && buildNumber === '-'
    ? stringValue(record?.startedAt || record?.finishedAt || index)
    : '-'
  return `${source}-execution-${executionId}-build-${buildNumber}-record-${fallbackIdentity}`
}

function objectValue(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function arrayValue(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function valueOrDash(value: unknown): number | string {
  return value === undefined || value === null || value === '' ? '-' : Number.isFinite(Number(value)) ? Number(value) : String(value)
}

function booleanLabel(value: unknown) {
  if (value === undefined || value === null || value === '') return '-'
  return value ? '是' : '否'
}

function formatViewport(width: unknown, height: unknown) {
  if (width === undefined || width === null || height === undefined || height === null) return '-'
  return `${width} × ${height}`
}

function artifactPresence(record: any, ...keys: string[]) {
  return getArtifactUrl(record, ...keys) ? '有' : '无'
}

function stringValue(value: unknown) {
  return value == null ? '' : String(value)
}

export function formatExecutionDuration(value: unknown) {
  const total = Number(value)
  if (!Number.isFinite(total) || total < 0) return '-'
  const totalMilliseconds = Math.round(total)
  if (totalMilliseconds < 1000) return `${totalMilliseconds} ms`
  if (totalMilliseconds < 60000) return `${formatDurationSeconds(totalMilliseconds)} s`
  const minutes = Math.floor(totalMilliseconds / 60000)
  const remainingMilliseconds = totalMilliseconds % 60000
  return remainingMilliseconds === 0
    ? `${minutes} m`
    : `${minutes} m ${formatDurationSeconds(remainingMilliseconds)} s`
}

function formatDurationSeconds(milliseconds: number) {
  return (milliseconds / 1000).toFixed(3).replace(/\.0+$|(\.\d*?)0+$/, '$1')
}

export function executionResultLabel(value: unknown) {
  const normalized = String(value ?? '').toLowerCase()
  if (['passed', 'success', '14'].includes(normalized)) return '通过'
  if (['failed', '15'].includes(normalized)) return '失败'
  if (normalized === 'blocked') return '阻塞'
  if (['skipped', 'cancelled', '16'].includes(normalized)) return normalized === 'cancelled' ? '已取消' : '跳过'
  if (['running', '13'].includes(normalized)) return '未执行'
  return normalized || '-'
}

export function executionResultColor(value: unknown) {
  const label = executionResultLabel(value)
  if (label === '通过') return 'green'
  if (label === '失败') return 'red'
  if (label === '阻塞') return 'orangered'
  if (label === '跳过' || label === '已取消') return 'orange'
  return 'gray'
}

export function executionStatusLabel(value: unknown) {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'waiting') return '等待执行'
  if (normalized === 'starting') return '启动中'
  if (normalized === 'queued') return '排队中'
  if (normalized === 'blocked') return '已阻塞'
  if (normalized === 'skipped') return '已跳过'
  if (['running', '11'].includes(normalized)) return '执行中'
  if (['passed', 'failed', 'cancelled'].includes(normalized)) return normalized === 'cancelled' ? '已取消' : '已完成'
  if (['completed', '12'].includes(normalized)) return '已完成'
  if (['not_started', '10'].includes(normalized)) return '未开始'
  return normalized || '-'
}

export function executionStatusColor(value: unknown) {
  const label = executionStatusLabel(value)
  if (['启动中', '排队中', '执行中'].includes(label)) return 'arcoblue'
  if (label === '等待执行') return 'gray'
  if (label === '已完成') return 'green'
  if (label === '已取消') return 'orange'
  if (label === '已阻塞') return 'red'
  return 'gray'
}

export const isExecutableCase = (caseItem: any) => {
  const enabled = caseItem?.status == null || ['1', 'true', 'enabled', 'enable'].includes(String(caseItem.status).toLowerCase())
  return enabled && Array.isArray(caseItem?.stepList) && caseItem.stepList.length > 0
}

export function getArtifactMap(record: any): Record<string, any> {
  const value = record?.artifactUrls || record?.playwrightArtifacts || record?.playwrightResult?.artifacts || {}
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

export function getArtifactUrl(record: any, ...keys: string[]) {
  const artifacts = getArtifactMap(record)
  for (const key of keys) {
    const value = artifacts[key]
    if (Array.isArray(value) && value[0]) return String(value[0])
    if (typeof value === 'string' && value) return value
  }
  return ''
}

export const resolveJenkinsVideoUrl = (record: any, sceneId: string) => {
  if (record?.videoUrl) return String(record.videoUrl)
  const reportUrl = String(record?.testReportUrl || '')
  if (!reportUrl || !sceneId) return ''
  if (reportUrl.includes('/index.html')) return reportUrl.replace('/index.html', `/video/${sceneId}.mp4`)
  return `${reportUrl.replace(/\/$/, '')}/video/${sceneId}.mp4`
}
