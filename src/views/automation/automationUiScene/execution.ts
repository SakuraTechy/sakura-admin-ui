import type { ExecutionType, ExecutionViewType } from '@/apis/automation/automationUiScene'
import type {
  AutomationUiExecutionCaseHistory,
  AutomationUiExecutionCase,
  AutomationUiExecutionStep,
  AutomationUiExecutionSummary,
  AutomationUiSceneSummary,
} from '@/apis/automation/automationUiQuery'

export type { ExecutionType, ExecutionViewType } from '@/apis/automation/automationUiScene'

export type ExecutionRecordSource = 'debug' | 'test'
export type ExecutionRecordScope = ExecutionRecordSource | 'all'

export interface ExecutionContext {
  recordSource?: ExecutionRecordSource
  testPlanId?: string
  testReportId?: string
}

export interface ExecutionCaseOpenOptions extends ExecutionContext {
  caseIds?: string[]
  /** 按服务端冻结定义执行全部用例，不依赖浏览器枚举 caseIds。 */
  selectAllCases?: boolean
  expectedDefinitionVersion?: number
  /** 批量场景执行先选择场景，再进入产品环境和执行参数配置。 */
  sceneSelection?: boolean
  /** 场景范围已由入口确定时，展示当前执行范围的说明文案。 */
  sceneSelectionSummary?: string
  /** 测试计划执行时用例范围由计划决定，不允许在弹窗内再次调整。 */
  selectionDisabled?: boolean
  /** 测试计划批量执行使用统一计划接口提交，弹窗只负责收集配置。 */
  planExecution?: boolean
  projectEnvironmentId?: string
  autoStart?: boolean
  cdpOptions?: import('@/apis/automation/automationPlaywrightRunner').AutomationCdpPlaybackOptions
}

export interface ExecutionRecordTarget {
  executionDbId?: number
  recordKey?: string
  executionId?: string
  buildNumber?: string | number
  caseId?: string
}

export interface ExecutionResultOpenOptions {
  source?: ExecutionRecordScope
  target?: ExecutionRecordTarget
  testPlanId?: string
  testReportId?: string
}

export interface ExecutionHistoryStepRow {
  stepExecutionDbId?: number
  detailLoaded?: boolean
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
  visibleCount: number | string
  configuredLocators: Array<{ type: string, value: string }>
  hasActualLocator: boolean
  valueMasked: boolean
  targetSelector: string
  targetXpath: string
  infrastructureTaskId: string
  details: unknown
}

export interface ExecutionHistoryCaseRow {
  caseExecutionDbId?: number
  stepsLoaded?: boolean
  stepPage?: number
  stepPageSize?: number
  stepPageTotal?: number
  rowKey: string
  recordKey: string
  recordTarget: ExecutionRecordTarget
  executionType: ExecutionType
  executionId: string
  jobId: string
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
  liveFrameQuality: string
  sessionMode: string
  appliedSessionMode: string
  browserSessionSource: string
  sessionReset: boolean
  sessionResetCount: number
  sessionResetReason: string
  sessionNavigationDecision: string
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
  artifactReportUrl: string
  artifactTraceUrl: string
  artifactScreenshotUrl: string
  artifactVideoUrl: string
  executionLogArtifactUrl: string
  artifactScreenshot: string
  artifactUploadError: string
  playwrightCaseKey: string
  steps: ExecutionHistoryStepRow[]
  summaryOnly: boolean
  live?: boolean
  batchId: string
  progress: number | null
  progressIndeterminate: boolean
  testReportId?: string
  sceneKey?: string
  sceneId?: string
  sceneName?: string
  recordSource?: ExecutionRecordSource
  liveLogs?: LiveExecutionLog[]
}

export interface ExecutionHistorySceneSummary {
  key: string
  sceneId: string
  sceneName: string
  caseTotal: number
  caseCompleted: number
  casePass: number
  caseFail: number
  caseCancelled: number
  caseBlocked: number
  caseSkip: number
  executeStatus: unknown
  executeResult: unknown
  duration: unknown
  progress: number | null
  progressIndeterminate: boolean
}

export interface ExecutionHistoryBatchRow {
  executionDbId?: number
  casesLoaded?: boolean
  casePage?: number
  casePageSize?: number
  casePageTotal?: number
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
  /** 批次内各用例端到端耗时之和，用于和批次墙钟耗时区分展示。 */
  caseDurationTotal?: unknown
  projectEnvironmentId: string
  projectEnvironmentName: string
  cases: ExecutionHistoryCaseRow[]
  live?: boolean
  testReportId?: string
  sceneCount?: number
  sceneTotal?: number
  sceneCompleted?: number
  scenePass?: number
  sceneFail?: number
  sceneCancelled?: number
  sceneBlocked?: number
  sceneSkip?: number
  sceneIds?: string[]
  sceneNames?: string[]
  sceneSummaries?: ExecutionHistorySceneSummary[]
  sceneKey?: string
  sceneId?: string
  sceneName?: string
  recordSource?: ExecutionRecordSource
}

export interface LiveExecutionCase {
  batchId: string
  executionId: string
  jobId?: string
  liveFrameQuality?: string
  executeName: string
  executionType: Exclude<ExecutionType, 'jenkins'>
  caseId: string
  caseName: string
  stepTotal: number
  stepCompleted?: number
  stepPass?: number
  stepFail?: number
  stepSkip?: number
  status: 'waiting' | 'starting' | 'queued' | 'running' | 'cancelling' | 'passed' | 'failed' | 'skipped' | 'cancelled'
  error?: string
  durationMs?: number
  startedAt?: number
  finishedAt?: number
  sceneKey?: string
  sceneId?: string
  sceneName?: string
  recordSource?: ExecutionRecordSource
  testPlanId?: string
  testReportId?: string
  liveLogs?: LiveExecutionLog[]
  lastEventSequence?: number
}

export interface LiveExecutionLog {
  sequence: number
  timestamp?: string
  level: 'info' | 'success' | 'warning' | 'error'
  phase: string
  message: string
  detail?: boolean
}

export const executionTypeOptions: Array<{ label: string, value: ExecutionType }> = [
  { label: 'Selenium Runner', value: 'jenkins' },
  { label: 'Playwright Runner', value: 'playwright-runner' },
  { label: 'Chrome DevTools Protocol', value: 'extension-cdp' },
]

export const executionViewLabels: Record<ExecutionViewType, string> = {
  record: '执行记录',
  log: '执行日志',
  live: '实时画面',
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

  const numericTimestamp = /^-?\d+$/.test(raw) ? Number(raw) : NaN
  const timestamp = Number.isFinite(numericTimestamp)
    ? (Math.abs(numericTimestamp) < 100000000000 ? numericTimestamp * 1000 : numericTimestamp)
    : undefined
  const date = new Date(timestamp ?? raw)
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

export const getExecutionRecords = (
  scene: any,
  type: ExecutionType,
  scope: ExecutionRecordScope = 'all',
  testPlanId?: string,
) => {
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
  const scopedTestRecords = testRecords.filter((record) => matchesTestPlan(record, testPlanId) && isExecutionRecord(record))
  const records = scope === 'debug'
    ? debugRecords
    : scope === 'test'
      ? scopedTestRecords
      : [...debugRecords, ...scopedTestRecords]
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
  return getExecutionHistoryRows(scene, 'debug')
}

export const getDebugExecutionBatchRows = (scene: any): ExecutionHistoryBatchRow[] => {
  return getExecutionBatchRows(scene, 'debug')
}

export const getExecutionHistoryRows = (
  scene: any,
  source: ExecutionRecordSource,
  testPlanId?: string,
): ExecutionHistoryCaseRow[] => {
  const records = getHistoryRecords(scene, source, testPlanId)
  const rows = dedupeExecutionHistoryRows(records.flatMap((record) => buildExecutionHistoryRows(record)))
  return rows.map((row) => attachSceneIdentity(row, scene, source))
}

export const getExecutionBatchRows = (
  scene: any,
  source: ExecutionRecordSource,
  testPlanId?: string,
): ExecutionHistoryBatchRow[] => {
  const rows = getHistoryRecords(scene, source, testPlanId).map((record) => buildExecutionHistoryBatchRow(record))
  return dedupeExecutionBatchRows(rows).map((row) => ({
    ...attachSceneIdentity(row, scene, source),
    cases: row.cases.map((item) => attachSceneIdentity(item, scene, source)),
  }))
}

/** 将新分层查询 DTO 转成历史视图行；子节点保持未加载状态。 */
export function buildLayeredExecutionBatchRow(
  record: AutomationUiExecutionSummary,
  scene: AutomationUiSceneSummary,
): ExecutionHistoryBatchRow {
  const sceneKey = String(scene.sceneDbId)
  const caseTotal = numericValue(record.caseTotal)
  const casePass = numericValue(record.casePass)
  const caseFail = numericValue(record.caseFail)
  const caseSkip = numericValue(record.caseSkip)
  const caseCancelled = numericValue(record.caseCancelled)
  const caseCompleted = Math.min(caseTotal, casePass + caseFail + caseSkip + caseCancelled)
  const batchId = String(record.batchId || record.executionKey || record.executionDbId)
  const progress = caseTotal > 0 ? Math.round(caseCompleted * 10000 / caseTotal) / 100 : null
  const executionType = layeredExecutionType(record.executionEngine)
  const row: ExecutionHistoryBatchRow = {
    executionDbId: record.executionDbId,
    casesLoaded: false,
    rowKey: `execution-${record.executionDbId}`,
    recordKey: String(record.executionKey || record.executionDbId),
    recordTarget: {
      executionDbId: record.executionDbId,
      recordKey: String(record.executionKey || record.executionDbId),
      executionId: String(record.executionKey || record.executionDbId),
      buildNumber: record.buildNumber,
    },
    batchId,
    executionType,
    caseTotal,
    caseCompleted,
    casePass,
    caseFail,
    caseCancelled,
    caseBlocked: 0,
    caseSkip,
    progress,
    progressIndeterminate: progress == null,
    executeStatus: record.status || 'not_started',
    executeResult: record.result || 'not_executed',
    executeName: record.executeName || record.executeUsername || '-',
    startedAt: record.startedAt || record.createTime,
    finishedAt: record.finishedAt,
    duration: executionDurationMs(record.startedAt || record.createTime, record.finishedAt, record.durationMs),
    projectEnvironmentId: record.projectEnvironmentId == null ? '-' : String(record.projectEnvironmentId),
    projectEnvironmentName: record.projectEnvironmentName || '-',
    cases: [],
    testReportId: record.testReportId == null ? undefined : String(record.testReportId),
    sceneCount: 1,
    sceneIds: [scene.sceneKey || sceneKey],
    sceneNames: [scene.name || '-'],
    sceneKey,
    sceneId: scene.sceneKey || sceneKey,
    sceneName: scene.name || '-',
    recordSource: record.recordSource,
  }
  row.sceneSummaries = [buildSceneSummary(row, sceneKey, row.sceneId || sceneKey, row.sceneName || '-')]
  return row
}

export function buildLayeredExecutionCaseRow(
  record: AutomationUiExecutionCase,
  batch: ExecutionHistoryBatchRow,
): ExecutionHistoryCaseRow {
  const caseId = record.definitionCaseId || record.caseKey || String(record.caseExecutionDbId)
  const stepTotal = numericValue(record.stepTotal)
  const stepPass = numericValue(record.stepPass)
  const stepFail = numericValue(record.stepFail)
  const stepSkip = numericValue(record.stepSkip)
  const completed = stepPass + stepFail + stepSkip
  return {
    caseExecutionDbId: record.caseExecutionDbId,
    stepsLoaded: false,
    rowKey: `case-execution-${record.caseExecutionDbId}`,
    recordKey: batch.recordKey,
    recordTarget: { ...batch.recordTarget, executionDbId: batch.executionDbId, caseId },
    executionType: batch.executionType,
    executionId: record.caseExecutionKey || batch.recordTarget.executionId || String(batch.executionDbId || ''),
    jobId: record.jobId || '',
    startedAt: record.startedAt || record.createTime,
    finishedAt: record.finishedAt,
    caseId,
    caseName: record.caseName || caseId,
    executeStatus: record.executeStatus || record.status || 'not_started',
    executeResult: record.executeResult || record.result || 'not_executed',
    duration: executionDurationMs(record.startedAt || record.createTime, record.finishedAt,
      record.wallClockDurationMs ?? record.durationMs),
    executeName: batch.executeName,
    buildNumber: String(batch.recordTarget.buildNumber ?? '-'),
    stepPassRate: stepTotal > 0 ? `${Math.round(stepPass * 10000 / stepTotal) / 100}%` : '0%',
    stepTotal,
    stepPass,
    stepFail,
    stepSkip,
    projectEnvironmentId: batch.projectEnvironmentId,
    projectEnvironmentName: batch.projectEnvironmentName,
    browser: '-',
    liveFrameQuality: '',
    sessionMode: '',
    appliedSessionMode: '',
    browserSessionSource: '-',
    sessionReset: false,
    sessionResetCount: 0,
    sessionResetReason: '-',
    sessionNavigationDecision: '-',
    headed: '-',
    startUrl: '-',
    windowSizeMode: '-',
    viewport: '-',
    failedStepIndex: '-',
    errorCode: record.errorCode || '-',
    error: record.errorMessage || '-',
    artifactTrace: '-',
    artifactVideo: '-',
    artifactReport: '-',
    artifactReportUrl: '',
    artifactTraceUrl: '',
    artifactScreenshotUrl: '',
    artifactVideoUrl: '',
    executionLogArtifactUrl: '',
    artifactScreenshot: '-',
    artifactUploadError: '-',
    playwrightCaseKey: record.caseKey || caseId,
    steps: [],
    summaryOnly: false,
    batchId: batch.batchId,
    progress: stepTotal > 0 ? Math.min(100, Math.round(completed * 10000 / stepTotal) / 100) : null,
    progressIndeterminate: stepTotal <= 0,
    testReportId: batch.testReportId,
    sceneKey: batch.sceneKey,
    sceneId: batch.sceneId,
    sceneName: batch.sceneName,
    recordSource: batch.recordSource,
  }
}

/** 单用例历史接口已携带父级上下文，直接构造成现有历史行，避免先请求批次再请求用例。 */
export function buildLayeredExecutionCaseHistoryRow(
  record: AutomationUiExecutionCaseHistory,
  scene: AutomationUiSceneSummary,
): ExecutionHistoryCaseRow {
  const batch: ExecutionHistoryBatchRow = buildLayeredExecutionBatchRow({
    executionDbId: record.executionDbId,
    executionKey: record.executionKey || record.caseExecutionKey || String(record.executionDbId),
    sceneDbId: record.sceneDbId || scene.sceneDbId,
    sceneKey: record.sceneKey || scene.sceneKey,
    batchId: record.batchId,
    recordSource: record.recordSource || 'debug',
    testPlanId: record.testPlanId,
    testReportId: record.testReportId,
    buildNumber: record.buildNumber,
    executionEngine: record.executionEngine,
    status: record.status,
    result: record.result,
    executeUsername: record.executeUsername,
    executeName: record.executeName,
    projectEnvironmentId: record.projectEnvironmentId,
    projectEnvironmentName: record.projectEnvironmentName,
    caseTotal: 1,
    casePass: record.stepPass,
    caseFail: record.stepFail,
    caseSkip: record.stepSkip,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    durationMs: record.durationMs,
    createTime: record.createTime,
  }, scene)
  return buildLayeredExecutionCaseRow(record, batch)
}

/** 后端 duration 为空或旧数据为 0 时，以开始/结束时间补齐墙钟耗时。 */
function executionDurationMs(startedAt: unknown, finishedAt: unknown, duration: unknown) {
  const stored = Number(duration)
  if (Number.isFinite(stored) && stored > 0) return stored
  const start = new Date(startedAt as string | number).getTime()
  const finish = new Date(finishedAt as string | number).getTime()
  if (!Number.isFinite(start)) return 0
  // 执行中记录通常还没有 finishedAt，使用当前时间显示实时墙钟耗时。
  const end = Number.isFinite(finish) && finish >= start ? finish : Date.now()
  return Math.max(0, end - start)
}

/** 将受控 diagnostics 展开为报告组件需要的定位事实和候选策略。 */
export function applyLayeredExecutionStepDetail(
  step: ExecutionHistoryStepRow,
  detail: { locatorValue?: string, diagnostics?: unknown },
) {
  const diagnosticEnvelope = parseObjectValue(detail.diagnostics)
  // 分层接口返回完整步骤诊断包，operation 等类型化详情仍位于原始 details 中。
  // 合并时保留外层定位候选和执行事实，避免两类诊断只能显示其中一类。
  const diagnostics = {
    ...diagnosticEnvelope,
    ...parseObjectValue(diagnosticEnvelope.details),
  }
  const locatorDiagnostics = objectValue(diagnostics.locator_diagnostics || diagnostics.locatorDiagnostics)
  const selected = objectValue(locatorDiagnostics.selected)
  const attempts = Array.isArray(locatorDiagnostics.attempts) ? locatorDiagnostics.attempts : []
  const candidates = Array.isArray(diagnostics.configured_locators)
    ? diagnostics.configured_locators
    : Array.isArray(diagnostics.configuredLocators)
      ? diagnostics.configuredLocators
      : Array.isArray(diagnostics.locator_meta?.candidates)
        ? diagnostics.locator_meta.candidates
        : Array.isArray(locatorDiagnostics.meta?.candidates)
          ? locatorDiagnostics.meta.candidates
        : []
  const configuredLocators = candidates.map((item: any) => ({
    type: stringValue(item?.type || item?.locator_type || item?.locatorType),
    value: stringValue(item?.value || item?.locator_value || item?.locatorValue),
  })).filter(item => item.type && item.value)
  step.locatorValue = detail.locatorValue || stringValue(selected.effective_target || selected.value) || step.locatorValue || '-'
  step.matchedCount = valueOrDash(diagnostics.matched_count ?? diagnostics.matchedCount
    ?? selected.matched_count ?? selected.matchedCount ?? attempts[0]?.matched_count)
  step.visibleCount = valueOrDash(diagnostics.visible_count ?? diagnostics.visibleCount
    ?? selected.visible_count ?? selected.visibleCount ?? attempts[0]?.visible_count)
  step.infrastructureTaskId = step.infrastructureTaskId
    || stringValue(diagnostics.infrastructure_task_id || diagnostics.infrastructureTaskId)
    || stringValue(diagnosticEnvelope.infrastructure_task_id || diagnosticEnvelope.infrastructureTaskId)
    || stringValue(diagnosticEnvelope.details?.infrastructure_task_id || diagnosticEnvelope.details?.infrastructureTaskId)
  step.configuredLocators = configuredLocators.length ? configuredLocators : step.configuredLocators
  step.hasActualLocator = step.hasActualLocator || Boolean(step.locatorValue && step.locatorValue !== '-')
  step.details = diagnostics
  step.detailLoaded = true
}

export function buildLayeredExecutionStepRow(record: AutomationUiExecutionStep): ExecutionHistoryStepRow {
  const stepIndex = record.stepIndex ?? 0
  const stepId = record.definitionStepId || record.sourceStepId || String(record.stepExecutionDbId)
  return {
    stepExecutionDbId: record.stepExecutionDbId,
    detailLoaded: false,
    rowKey: `step-execution-${record.stepExecutionDbId}`,
    stepIndex,
    stepNumber: stepIndex + 1,
    stepId,
    stepName: record.stepName || record.description || stepId,
    actionType: record.actionType || '-',
    description: record.description || '',
    status: record.status || 'not_executed',
    duration: record.durationMs || 0,
    error: record.errorMessage || '-',
    errorCode: record.errorCode || '-',
    locatorSource: record.locatorSource || '-',
    locatorType: record.locatorType || '-',
    locatorValue: '-',
    matchedCount: '-',
    visibleCount: '-',
    configuredLocators: [],
    hasActualLocator: Boolean(record.locatorSource || record.locatorType),
    valueMasked: false,
    targetSelector: '-',
    targetXpath: '-',
    infrastructureTaskId: '',
    details: undefined,
  }
}

function layeredExecutionType(value?: string): ExecutionType {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('playwright')) return 'playwright-runner'
  if (normalized.includes('cdp') || normalized.includes('extension')) return 'extension-cdp'
  return 'jenkins'
}

/**
 * 测试计划一次执行共用一个 testReportId，但每个场景可能有独立 batchId。
 * 计划历史需要按报告聚合，旧记录没有报告 ID 时保持场景级隔离。
 */
export const aggregateExecutionBatchRows = (
  rows: ExecutionHistoryBatchRow[],
): ExecutionHistoryBatchRow[] => {
  const groups = new Map<string, ExecutionHistoryBatchRow[]>()
  rows.forEach((row) => {
    const reportId = String(row.testReportId || '').trim()
    const key = reportId
      ? `report:${reportId}`
      : `scene:${row.sceneKey || ''}:batch:${row.batchId}`
    groups.set(key, [...(groups.get(key) || []), row])
  })
  return [...groups.entries()].map(([key, items]) => mergeExecutionBatchRows(key, items))
}

function getHistoryRecords(scene: any, source: ExecutionRecordSource, testPlanId?: string) {
  const value = source === 'test' ? scene?.testRecord : scene?.debugRecord
  return normalizeRecordList(value)
    .filter((record) => isExecutionRecord(record) && (source !== 'test' || matchesTestPlan(record, testPlanId)))
    .map((record, index) => ({
      ...record,
      __source: source,
      __key: executionRecordKey(source, record, index),
    }))
    .sort((left, right) => executionTime(right) - executionTime(left))
}

function matchesTestPlan(record: any, testPlanId?: string) {
  return !testPlanId || String(record?.testPlanId || '') === String(testPlanId)
}

/** 初始化生成的默认 debugRecord/testRecord 不是执行历史，不能作为空批次展示。 */
function isExecutionRecord(record: any) {
  return Boolean(
    record?.executionId
    || record?.batchId
    || record?.buildNumber
    || record?.startedAt
    || record?.finishedAt
    || record?.consoleUrl
    || record?.testReportUrl
    || record?.playwrightResult
    || (Array.isArray(record?.caseResults) && record.caseResults.length > 0),
  )
}

function attachSceneIdentity<T extends ExecutionHistoryCaseRow | ExecutionHistoryBatchRow>(
  row: T,
  scene: any,
  source: ExecutionRecordSource,
): T {
  const sceneKey = String(scene?.id || '')
  return {
    ...row,
    rowKey: sceneKey ? `${sceneKey}-${row.rowKey}` : row.rowKey,
    sceneKey,
    sceneId: String(scene?.sceneId || sceneKey || ''),
    sceneName: String(scene?.name || scene?.sceneId || sceneKey || '-'),
    sceneSummaries: row.sceneSummaries?.length
      ? row.sceneSummaries
      : [buildSceneSummary(row, sceneKey, String(scene?.sceneId || sceneKey || ''), String(scene?.name || scene?.sceneId || sceneKey || '-'))],
    recordSource: source,
  }
}

function mergeExecutionBatchRows(groupKey: string, rows: ExecutionHistoryBatchRow[]): ExecutionHistoryBatchRow {
  const first = rows[0]
  const reportId = String(first.testReportId || '').trim()
  const cases = rows.flatMap(row => row.cases)
  const sceneSummaries = mergeSceneSummaries(rows)
  const sceneList = sceneSummaries.map(item => ({ id: item.sceneId, name: item.sceneName }))
  const caseTotal = rows.reduce((total, row) => total + numericValue(row.caseTotal), 0)
  const caseCompleted = rows.reduce((total, row) => total + numericValue(row.caseCompleted), 0)
  const casePass = rows.reduce((total, row) => total + numericValue(row.casePass), 0)
  const caseFail = rows.reduce((total, row) => total + numericValue(row.caseFail), 0)
  const caseCancelled = rows.reduce((total, row) => total + numericValue(row.caseCancelled), 0)
  const caseBlocked = rows.reduce((total, row) => total + numericValue(row.caseBlocked), 0)
  const caseSkip = rows.reduce((total, row) => total + numericValue(row.caseSkip), 0)
  const caseDurationTotal = rows.reduce((total, row) => total + numericValue(row.caseDurationTotal), 0)
  const startedAt = minHistoryTime(rows.map(row => row.startedAt))
  const allFinished = rows.every(row => isTerminalExecutionStatus(row.executeStatus))
  const finishedAt = allFinished ? maxHistoryTime(rows.map(row => row.finishedAt)) : undefined
  // 计划批次由多个场景串行执行，按各场景批次耗时累加；单场景批次仍以日志首尾墙钟时间为准。
  const duration = rows.reduce((total, row) => total + numericValue(row.duration), 0)
  // 测试报告 ID 只用于计划聚合和报告跳转，批次列必须展示实际执行批次号。
  // 每个场景批次由 Runner 生成类似 20260721153208 的 batchId，不能用报告数据库 ID 替代。
  const batchId = first.batchId
  const sceneIds = sceneList.map(item => item.id).filter(Boolean)
  const sceneNames = sceneList.map(item => item.name).filter(Boolean)
  const sceneCompleted = sceneSummaries.filter(item => isTerminalExecutionStatus(item.executeStatus)).length
  const scenePass = sceneSummaries.filter(item => executionResultLabel(item.executeResult) === '通过').length
  const sceneFail = sceneSummaries.filter(item => executionResultLabel(item.executeResult) === '失败').length
  const sceneCancelled = sceneSummaries.filter(item => executionResultLabel(item.executeResult) === '已取消').length
  const sceneBlocked = sceneSummaries.filter(item => executionResultLabel(item.executeResult) === '阻塞').length
  const sceneSkip = sceneSummaries.filter(item => executionResultLabel(item.executeResult) === '跳过').length
  const progress = calculateBatchProgress(cases, caseTotal, caseCompleted)
  return {
    ...first,
    rowKey: `plan-batch-${groupKey}`,
    recordKey: first.recordKey,
    recordTarget: first.recordTarget,
    batchId,
    testReportId: reportId || first.testReportId,
    caseTotal,
    caseCompleted,
    casePass,
    caseFail,
    caseCancelled,
    caseBlocked,
    caseSkip,
    progress,
    progressIndeterminate: progress == null,
    executeStatus: aggregateExecutionStatus(rows),
    executeResult: aggregateExecutionResult(rows),
    startedAt,
    finishedAt,
    duration,
    caseDurationTotal,
    cases,
    sceneCount: sceneSummaries.length,
    sceneTotal: sceneSummaries.length,
    sceneCompleted,
    scenePass,
    sceneFail,
    sceneCancelled,
    sceneBlocked,
    sceneSkip,
    sceneIds,
    sceneNames,
    sceneSummaries,
    sceneKey: sceneList.length === 1 ? rows[0].sceneKey : undefined,
    sceneId: sceneIds.join('、'),
    sceneName: sceneNames.join('、'),
  }
}

function mergeSceneSummaries(rows: ExecutionHistoryBatchRow[]): ExecutionHistorySceneSummary[] {
  const groups = new Map<string, ExecutionHistorySceneSummary[]>()
  rows.forEach((row) => {
    const summaries = row.sceneSummaries?.length
      ? row.sceneSummaries
      : [buildSceneSummary(row, row.sceneKey || row.sceneId || '', row.sceneId || '', row.sceneName || '-')]
    summaries.forEach((summary) => {
      groups.set(summary.key, [...(groups.get(summary.key) || []), summary])
    })
  })
  return [...groups.entries()].map(([key, items]) => ({
    key,
    sceneId: items[0].sceneId,
    sceneName: items[0].sceneName,
    caseTotal: items.reduce((total, item) => total + item.caseTotal, 0),
    caseCompleted: items.reduce((total, item) => total + item.caseCompleted, 0),
    casePass: items.reduce((total, item) => total + item.casePass, 0),
    caseFail: items.reduce((total, item) => total + item.caseFail, 0),
    caseCancelled: items.reduce((total, item) => total + item.caseCancelled, 0),
    caseBlocked: items.reduce((total, item) => total + item.caseBlocked, 0),
    caseSkip: items.reduce((total, item) => total + item.caseSkip, 0),
    executeStatus: aggregateExecutionStatus(items as unknown as ExecutionHistoryBatchRow[]),
    executeResult: aggregateExecutionResult(items as unknown as ExecutionHistoryBatchRow[]),
    duration: items.reduce((max, item) => Math.max(max, numericValue(item.duration)), 0),
    progress: calculateSummaryProgress(items),
    progressIndeterminate: false,
  }))
}

function calculateSummaryProgress(summaries: ExecutionHistorySceneSummary[]) {
  const totalCases = summaries.reduce((total, item) => total + numericValue(item.caseTotal), 0)
  if (totalCases > 0) {
    const completedCases = summaries.reduce((total, item) => (
      total + numericValue(item.caseTotal) * Math.min(100, Math.max(0, Number(item.progress) || 0)) / 100
    ), 0)
    return Math.min(100, Math.round(completedCases * 10000 / totalCases) / 100)
  }
  return summaries.length > 0 ? 0 : null
}

function buildSceneSummary(
  row: ExecutionHistoryBatchRow,
  key: string,
  sceneId: string,
  sceneName: string,
): ExecutionHistorySceneSummary {
  return {
    key: key || sceneId || sceneName,
    sceneId: sceneId || '-',
    sceneName: sceneName || '-',
    caseTotal: numericValue(row.caseTotal),
    caseCompleted: numericValue(row.caseCompleted),
    casePass: numericValue(row.casePass),
    caseFail: numericValue(row.caseFail),
    caseCancelled: numericValue(row.caseCancelled),
    caseBlocked: numericValue(row.caseBlocked),
    caseSkip: numericValue(row.caseSkip),
    executeStatus: row.executeStatus,
    executeResult: row.executeResult,
    duration: row.duration,
    progress: row.progress,
    progressIndeterminate: row.progressIndeterminate,
  }
}

function aggregateExecutionStatus(rows: ExecutionHistoryBatchRow[]) {
  const hasCancellation = rows.some(row => ['cancelled', 'cancelling'].includes(String(row.executeStatus || '').toLowerCase())
    || executionResultLabel(row.executeResult) === '已取消')
  if (hasCancellation && rows.some(row => !isTerminalExecutionStatus(row.executeStatus))) return 'cancelling'
  if (rows.some(row => ['running', 'starting', 'queued'].includes(String(row.executeStatus || '').toLowerCase()))) {
    return 'running'
  }
  if (rows.every(row => isTerminalExecutionStatus(row.executeStatus))) return hasCancellation ? 'cancelled' : 'completed'
  if (rows.some(row => ['waiting', 'not_started'].includes(String(row.executeStatus || '').toLowerCase()))) return 'queued'
  return rows[0]?.executeStatus || 'queued'
}

function aggregateExecutionResult(rows: ExecutionHistoryBatchRow[]) {
  // 聚合批次尚未全部结束时不能提前泄漏某个子场景的终态结果。
  if (rows.some(row => !isTerminalExecutionStatus(row.executeStatus))) {
    return rows.every(row => ['waiting', 'not_started', 'queued', '10'].includes(String(row.executeStatus || '').toLowerCase()))
      ? 'not_executed'
      : 'pending'
  }
  const results = rows.map(row => executionResultLabel(row.executeResult))
  if (results.includes('已取消')) return 'cancelled'
  if (results.includes('阻塞')) return 'blocked'
  if (results.includes('失败')) return 'failed'
  if (results.includes('跳过')) return 'skipped'
  if (results.length > 0 && results.every(result => result === '通过')) return 'passed'
  if (results.some(result => result === '未执行')) return 'not_executed'
  return rows[0]?.executeResult || 'not_executed'
}

function minHistoryTime(values: unknown[]) {
  const times = values.map(value => historyTimestamp(value)).filter(Boolean)
  return times.length ? Math.min(...times) : undefined
}

function maxHistoryTime(values: unknown[]) {
  const times = values.map(value => historyTimestamp(value)).filter(Boolean)
  return times.length ? Math.max(...times) : undefined
}

function historyTimestamp(value: unknown) {
  const timestamp = value ? new Date(value as string | number).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
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
    const result = executionResultLabel(item.executeResult)
    if (isTerminalExecutionStatus(status)) counts.completed += 1
    // 场景通过条件取决于用例聚合结果，而不是仅看用例状态字段。
    if (result === '通过') counts.passed += 1
    if (result === '失败') counts.failed += 1
    if (result === '已取消' || status === 'cancelled') counts.cancelled += 1
    if (result === '阻塞' || status === 'blocked') counts.blocked += 1
    if (result === '跳过' || status === 'skipped') counts.skipped += 1
    return counts
  }, { completed: 0, passed: 0, failed: 0, cancelled: 0, blocked: 0, skipped: 0 })
  const caseTotal = numericValue(record.caseTotal) || cases.length
  const caseCompleted = valueWithFallback(record.caseCompleted, statusCounts.completed)
  const progress = calculateBatchProgress(cases, caseTotal, caseCompleted)
  const executeStatus = record.executeStatus || (caseCompleted >= caseTotal ? 'completed' : 'running')
  const hasDetailedCases = cases.some(item => !item.summaryOnly && item.caseId !== '-')
  const resolvedCasePass = hasDetailedCases ? statusCounts.passed : valueWithFallback(record.casePass, statusCounts.passed)
  const resolvedCaseFail = hasDetailedCases ? statusCounts.failed : valueWithFallback(record.caseFail, statusCounts.failed)
  const executeResult = deriveSceneExecutionResult(
    caseTotal,
    caseCompleted,
    resolvedCasePass,
    resolvedCaseFail,
    valueWithFallback(record.caseCancelled, statusCounts.cancelled),
    valueWithFallback(record.caseBlocked, statusCounts.blocked),
    valueWithFallback(record.caseSkip, statusCounts.skipped),
    executeStatus,
    record.executeResult,
  )
  const normalizedExecuteStatus = executionResultLabel(executeResult) === '已取消'
    && (caseCompleted >= caseTotal || isTerminalExecutionStatus(executeStatus))
    ? 'cancelled'
    : executeStatus
  const batchId = stringValue(record.batchId || record.executionId || record.buildNumber || record.__key)
  const executionLogRange = executionLogTimeRange(cases.flatMap((item) => item.liveLogs || []))
  const caseDurationTotal = cases.reduce((total, item) => total + numericValue(item.duration), 0)
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
    casePass: resolvedCasePass,
    caseFail: resolvedCaseFail,
    caseCancelled: valueWithFallback(record.caseCancelled, statusCounts.cancelled),
    caseBlocked: valueWithFallback(record.caseBlocked, statusCounts.blocked),
    caseSkip: valueWithFallback(record.caseSkip, statusCounts.skipped),
    progress,
    progressIndeterminate: progress == null,
    testReportId: stringValue(record.testReportId || record.reportId) || undefined,
    executeStatus: normalizedExecuteStatus,
    executeResult,
    executeName: stringValue(record.executeName || record.executeUsername || record.executor) || '-',
    startedAt: executionLogRange?.startedAt ?? record.startedAt ?? record.createTime,
    finishedAt: executionLogRange?.finishedAt ?? record.finishedAt,
    duration: executionLogRange
      ? Math.max(0, executionLogRange.finishedAt - executionLogRange.startedAt)
      : record.wallClockDuration ?? record.duration,
    caseDurationTotal,
    projectEnvironmentId: stringValue(record.projectEnvironmentId) || '-',
    projectEnvironmentName: stringValue(record.projectEnvironmentName) || '-',
    cases,
  }
}

/**
 * 批次进度按用例步骤加权，运行中的用例也能反映已完成步骤，而不是只能显示已完成用例数。
 */
function calculateBatchProgress(
  cases: ExecutionHistoryCaseRow[],
  caseTotal: number,
  caseCompleted: number,
): number | null {
  const detailedCases = cases.filter((item) => numericValue(item.stepTotal) > 0)
  if (detailedCases.length > 0) {
    const totalSteps = detailedCases.reduce((total, item) => total + numericValue(item.stepTotal), 0)
    const completedSteps = detailedCases.reduce((total, item) => (
      total + numericValue(item.stepTotal) * Math.min(100, Math.max(0, Number(item.progress) || 0)) / 100
    ), 0)
    if (totalSteps > 0) return Math.min(100, Math.round(completedSteps * 10000 / totalSteps) / 100)
  }
  if (caseTotal > 0) return Math.min(100, Math.round(caseCompleted * 10000 / caseTotal) / 100)
  return cases.length > 0 ? 0 : null
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
  const resultDetail = objectValue(playwrightResult.detail)
  const sessionTransition = objectValue(
    caseResult.session_transition
    || caseResult.sessionTransition
    || playwrightResult.session_transition
    || playwrightResult.sessionTransition
    || rawConfig.session_transition
    || rawConfig.sessionTransition
    || resultDetail.session_transition
    || resultDetail.sessionTransition
    || record.sessionTransition,
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
  // 新记录优先读取分离后的生命周期状态；status 仅兼容旧 Runner 的混合状态字段。
  const executeStatus = caseResult.executeStatus || caseResult.status || record.executeStatus
  const rawExecuteResult = caseResult.executeResult
    || (isTerminalExecutionStatus(executeStatus) ? caseResult.status : undefined)
    || (isTerminalExecutionStatus(record.executeStatus) ? record.executeResult : undefined)
  const normalizedSteps = rawSteps.map((step: any, index: number) => normalizeHistoryStep(step, rowKey, index))
  const persistedLogs = normalizeExecutionLogs(
    playwrightResult.execution_logs
    || playwrightResult.executionLogs
    || caseResult.execution_logs
    || caseResult.executionLogs,
  )
  const executeResult = deriveCaseExecutionResult(
    normalizedSteps,
    stepTotal,
    stepPass,
    stepFail,
    stepSkip,
    executeStatus,
    rawExecuteResult,
  )
  const progress = caseExecutionProgress(
    executeStatus,
    resolvedStepTotal,
    resolvedStepPass,
    resolvedStepFail,
    resolvedStepSkip,
  )
  const defaultSessionMode = executionType === 'extension-cdp' ? 'legacy-profile' : 'isolated'
  const defaultBrowserSessionSource = executionType === 'extension-cdp' ? 'current-profile' : '-'

  return {
    rowKey,
    recordKey: record.__key,
    recordTarget: { ...recordTarget, executionId: caseExecutionId || recordTarget.executionId, caseId },
    executionType,
    executionId: caseExecutionId || stringValue(record.executionId || record.buildNumber),
    jobId: stringValue(caseResult.job_id || caseResult.jobId || record.jobId),
    startedAt: caseResult.started_at || caseResult.startedAt || record.startedAt || record.finishedAt || record.createTime,
    finishedAt: caseResult.finished_at || caseResult.finishedAt || record.finishedAt,
    caseId: summaryOnly ? '-' : (caseId || '-'),
    caseName: summaryOnly ? '场景汇总' : (caseName || caseId || '未命名用例'),
    executeStatus,
    executeResult,
    duration: caseResult.wall_clock_duration_ms
      ?? caseResult.wallClockDurationMs
      ?? record.wallClockDuration
      ?? caseResult.duration_ms
      ?? caseResult.duration
      ?? record.duration,
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
    liveFrameQuality: stringValue(
      executionConfig.liveFrameQuality
      || executionConfig.live_frame_quality
      || playwrightResult.liveFrameQuality
      || playwrightResult.live_frame_quality
      || rawConfig.live_frame_quality
      || record.liveFrameQuality,
    ) || '-',
    sessionMode: stringValue(
      sessionTransition.requestedMode
      || sessionTransition.requested_mode
      || executionConfig.sessionMode
      || executionConfig.session_mode
      || playwrightResult.sessionMode
      || playwrightResult.session_mode
      || rawConfig.session_mode,
    ) || defaultSessionMode,
    appliedSessionMode: stringValue(
      sessionTransition.appliedMode
      || sessionTransition.applied_mode,
    ) || stringValue(
      executionConfig.sessionMode
      || executionConfig.session_mode
      || playwrightResult.sessionMode
      || playwrightResult.session_mode
      || rawConfig.session_mode,
    ) || defaultSessionMode,
    browserSessionSource: stringValue(
      sessionTransition.browserSessionSource
      || sessionTransition.browser_session_source
      || executionConfig.browserSessionSource
      || executionConfig.browser_session_source
      || rawConfig.browser_session_source,
    ) || defaultBrowserSessionSource,
    sessionReset: sessionTransition.reset === true || sessionTransition.reset === 'true',
    sessionResetCount: Number(sessionTransition.resetCount ?? sessionTransition.reset_count) || 0,
    sessionResetReason: stringValue(
      sessionTransition.resetReason || sessionTransition.reset_reason,
    ) || '-',
    sessionNavigationDecision: stringValue(
      sessionTransition.navigationDecision || sessionTransition.navigation_decision,
    ) || '-',
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
    artifactReportUrl: getArtifactUrl(artifactRecord, 'report_html', 'report'),
    artifactTraceUrl: getArtifactUrl(artifactRecord, 'trace'),
    artifactScreenshotUrl: getArtifactUrl(artifactRecord, 'failure_screenshot', 'screenshot', 'screenshots'),
    artifactVideoUrl: getArtifactUrl(artifactRecord, 'video', 'videos'),
    executionLogArtifactUrl: getArtifactUrl(artifactRecord, 'execution_log'),
    artifactScreenshot: artifactPresence(artifactRecord, 'failure_screenshot', 'screenshot', 'screenshots'),
    artifactUploadError: artifactUploadErrors.length
      ? artifactUploadErrors.map((item) => stringValue(objectValue(item).error || item)).filter(Boolean).join('；')
      : '-',
    playwrightCaseKey: stringValue(caseResult.case_key || record.playwrightCaseKey) || '-',
    steps: normalizedSteps,
    summaryOnly,
    batchId: stringValue(record.batchId) || stringValue(record.executionId || record.buildNumber),
    progress,
    progressIndeterminate: progress == null,
    testReportId: stringValue(record.testReportId) || undefined,
    liveLogs: persistedLogs.length ? persistedLogs : undefined,
  }
}

function normalizeExecutionLogs(value: unknown): LiveExecutionLog[] {
  return arrayValue(value).map((item, index) => {
    const source = objectValue(item)
    const level = stringValue(source.level)
    return {
      sequence: Number(source.sequence) || index + 1,
      timestamp: stringValue(source.timestamp),
      level: ['info', 'success', 'warning', 'error'].includes(level)
        ? level as LiveExecutionLog['level']
        : 'info',
      phase: stringValue(source.phase) || 'runner',
      message: stringValue(source.message),
      detail: parseBoolean(source.detail),
    }
  }).filter(item => item.message)
}

function parseBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return ['1', 'true', 'yes'].includes(String(value || '').trim().toLowerCase())
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
    visibleCount: valueOrDash(step.visible_count ?? step.visibleCount),
    configuredLocators: normalizeConfiguredLocators(step),
    hasActualLocator: Boolean(locatorSource),
    valueMasked: ['1', 'true'].includes(String(step.value_masked ?? step.valueMasked ?? '').toLowerCase()),
    targetSelector: stringValue(step.target_selector || step.targetSelector) || '-',
    targetXpath: stringValue(step.target_xpath || step.targetXpath) || '-',
    infrastructureTaskId: stringValue(step.infrastructure_task_id || step.infrastructureTaskId),
    details: normalizeHistoryStepDetails(step),
  }
}

function normalizeHistoryStepDetails(step: any) {
  const details = parseObjectValue(step.details)
  const locatorError = step.locator_error || step.locatorError
  if (locatorError && typeof locatorError === 'object' && !Array.isArray(locatorError)) {
    details.locator_error = details.locator_error || locatorError
  }
  const locatorDiagnostics = step.locator_diagnostics || step.locatorDiagnostics
  if (locatorDiagnostics && typeof locatorDiagnostics === 'object' && !Array.isArray(locatorDiagnostics)) {
    details.locator_diagnostics = details.locator_diagnostics || locatorDiagnostics
  }
  const errorCode = stringValue(step.error_code || step.errorCode)
  if (errorCode) details.error_code = details.error_code || errorCode
  const directInfrastructure = step.infrastructure || parseObjectValue(step.result).infrastructure
  if (directInfrastructure && typeof directInfrastructure === 'object' && !Array.isArray(directInfrastructure)) {
    details.infrastructure = details.infrastructure || directInfrastructure
  }

  const variableName = stringValue(step.variable_name || step.variableName)
  if (variableName && (!details.variable || typeof details.variable !== 'object')) {
    const valueMasked = ['1', 'true'].includes(String(step.value_masked ?? step.valueMasked ?? '').toLowerCase())
    const valuePreview = step.value_preview ?? step.valuePreview
    details.variable = {
      variable_name: variableName,
      value_masked: valueMasked ? 1 : 0,
      ...(valuePreview != null && !valueMasked ? { value_preview: String(valuePreview) } : {}),
      source: stringValue(step.variable_source || step.variableSource),
    }
  }
  return Object.keys(details).length ? details : step.details
}

/** 用例结果优先遵循执行器最终结果；失败后继续的 skipped 步骤不阻断用例通过。 */
function deriveCaseExecutionResult(
  steps: ExecutionHistoryStepRow[],
  stepTotal: unknown,
  stepPass: unknown,
  stepFail: unknown,
  stepSkip: unknown,
  executeStatus: unknown,
  rawResult: unknown,
) {
  const statusResult = executionResultLabel(executeStatus)
  const explicitResult = executionResultLabel(rawResult)
  if (!isTerminalExecutionStatus(executeStatus)) {
    return ['waiting', 'not_started', 'queued', '10'].includes(String(executeStatus ?? '').toLowerCase())
      ? 'not_executed'
      : 'pending'
  }
  if (explicitResult === '已取消' || statusResult === '已取消') return 'cancelled'
  if (explicitResult === '阻塞' || statusResult === '阻塞') return 'blocked'
  if (explicitResult === '失败' || statusResult === '失败') return 'failed'
  if (explicitResult === '跳过' || statusResult === '跳过') return 'skipped'
  const total = numericValue(stepTotal) || steps.length
  const pass = steps.length ? steps.filter(step => isPassedLeafResult(step.status)).length : numericValue(stepPass)
  const cancelled = steps.filter(step => isCancelledLeafResult(step.status)).length
  const blocked = steps.filter(step => isBlockedLeafResult(step.status)).length
  const fail = steps.length ? steps.filter(step => isFailedLeafResult(step.status)).length : numericValue(stepFail)
  const skip = steps.length ? steps.filter(step => isSkippedLeafResult(step.status)).length : numericValue(stepSkip)
  if ((explicitResult === '通过' || statusResult === '通过') && cancelled === 0 && blocked === 0 && fail === 0) {
    return 'passed'
  }
  if (cancelled > 0) return 'cancelled'
  if (blocked > 0) return 'blocked'
  if (total > 0 && pass >= total) return 'passed'
  if (total > 0 && fail > 0) return 'failed'
  if (total > 0 && skip > 0) return 'skipped'
  if (isTerminalExecutionStatus(executeStatus)) return 'failed'
  if (rawResult && executionResultLabel(rawResult) !== '未执行') return rawResult
  return 'not_executed'
}

/** 场景结果必须以场景内用例结果为准，只有全部用例通过才算场景通过。 */
function deriveSceneExecutionResult(
  caseTotal: number,
  caseCompleted: number,
  casePass: number,
  caseFail: number,
  caseCancelled: number,
  caseBlocked: number,
  caseSkipped: number,
  executeStatus: unknown,
  rawResult: unknown,
) {
  const statusResult = executionResultLabel(executeStatus)
  const explicitResult = executionResultLabel(rawResult)
  const terminal = caseTotal > 0 && caseCompleted >= caseTotal || isTerminalExecutionStatus(executeStatus)
  if (!terminal) {
    return ['waiting', 'not_started', 'queued', '10'].includes(String(executeStatus ?? '').toLowerCase())
      ? 'not_executed'
      : 'pending'
  }
  if (explicitResult === '已取消' || statusResult === '已取消') return 'cancelled'
  if (caseCancelled > 0) return 'cancelled'
  if (caseBlocked > 0 || explicitResult === '阻塞' || statusResult === '阻塞') return 'blocked'
  if (caseFail > 0 || explicitResult === '失败' || statusResult === '失败') return 'failed'
  if (caseSkipped > 0 || explicitResult === '跳过' || statusResult === '跳过') return 'skipped'
  if (caseTotal > 0 && casePass >= caseTotal) return 'passed'
  if (caseTotal > 0 && (caseCompleted >= caseTotal || isTerminalExecutionStatus(executeStatus))) return 'failed'
  return rawResult || 'not_executed'
}

function isPassedLeafResult(value: unknown) {
  return ['passed', 'success', '14', '通过', '全部通过'].includes(String(value ?? '').toLowerCase())
}

function isFailedLeafResult(value: unknown) {
  return ['failed', '15', '失败', '不通过'].includes(String(value ?? '').toLowerCase())
}

function isSkippedLeafResult(value: unknown) {
  return ['skipped', '16', '跳过'].includes(String(value ?? '').toLowerCase())
}

function isCancelledLeafResult(value: unknown) {
  return ['cancelled', '已取消'].includes(String(value ?? '').toLowerCase())
}

function isBlockedLeafResult(value: unknown) {
  return ['blocked', '阻塞'].includes(String(value ?? '').toLowerCase())
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

export function executionLogTimeRange(logs: LiveExecutionLog[] | undefined) {
  const timestamps = (logs || [])
    .map((item) => new Date(String(item.timestamp || '')).getTime())
    .filter((value) => Number.isFinite(value))
  if (!timestamps.length) return undefined
  return {
    startedAt: Math.min(...timestamps),
    finishedAt: Math.max(...timestamps),
  }
}

function formatDurationSeconds(milliseconds: number) {
  return (milliseconds / 1000).toFixed(3).replace(/\.0+$|(\.\d*?)0+$/, '$1')
}

function sessionModeLabel(value: string) {
  if (value === 'reuse-browser') return '同一浏览器窗口'
  return value === 'reuse-auth' ? '复用登录态' : '独立登录'
}

export function executionResultLabel(value: unknown) {
  const normalized = String(value ?? '').toLowerCase()
  if (['passed', 'success', '14'].includes(normalized)) return '通过'
  if (['failed', '15'].includes(normalized)) return '失败'
  if (normalized === 'blocked') return '阻塞'
  if (['skipped', 'cancelled', '16'].includes(normalized)) return normalized === 'cancelled' ? '已取消' : '跳过'
  if (['starting', 'running', 'cancelling', 'pending'].includes(normalized)) return '生成中'
  if (['waiting', 'queued', 'not_executed', '13'].includes(normalized)) return '未执行'
  return normalized || '-'
}

/** 用例和场景使用聚合结果文案，避免把单个步骤的“通过”误显示为整体通过。 */
export function executionAggregateResultLabel(value: unknown) {
  const label = executionResultLabel(value)
  if (label === '通过') return '全部通过'
  if (label === '未执行' || label === '-') return '未执行'
  if (label === '生成中') return '生成中'
  if (label === '已取消') return '已取消'
  if (label === '阻塞') return '阻塞'
  if (label === '跳过') return '跳过'
  return '不通过'
}

/** 非终态尚无业务结果，展示层结合生命周期说明当前处于哪个阶段。 */
export function executionDisplayResultLabel(result: unknown, status: unknown) {
  const statusLabel = executionStatusLabel(status)
  if (statusLabel === '排队中') return '未执行'
  if (['启动中', '执行中'].includes(statusLabel)) return '生成中'
  if (statusLabel === '取消中') return '取消处理中'
  return executionAggregateResultLabel(result)
}

export function executionDisplayResultColor(result: unknown, status: unknown) {
  const statusLabel = executionStatusLabel(status)
  if (['启动中', '执行中'].includes(statusLabel)) return 'arcoblue'
  if (statusLabel === '取消中') return 'orange'
  return executionResultColor(result)
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
  if (['waiting', 'not_started', '10'].includes(normalized)) return '排队中'
  if (normalized === 'starting') return '启动中'
  if (normalized === 'queued') return '排队中'
  if (normalized === 'cancelling') return '取消中'
  if (['running', '11'].includes(normalized)) return '执行中'
  if (['passed', 'failed', 'blocked', 'skipped', 'cancelled'].includes(normalized)) return normalized === 'cancelled' ? '已取消' : '已完成'
  if (['completed', '12'].includes(normalized)) return '已完成'
  return normalized || '-'
}

export function executionStatusColor(value: unknown) {
  const label = executionStatusLabel(value)
  if (['启动中', '排队中', '执行中'].includes(label)) return 'arcoblue'
  if (label === '取消中') return 'orange'
  if (label === '已完成') return 'green'
  if (label === '已取消') return 'orange'
  return 'gray'
}

const isEnabledDefinitionNode = (node: any) => node?.status == null
  || ['1', 'true', 'enabled', 'enable'].includes(String(node.status).toLowerCase())

export const isExecutableStep = (step: any) => isEnabledDefinitionNode(step)

export const executableStepCount = (caseItem: any) => Array.isArray(caseItem?.stepList)
  ? caseItem.stepList.filter(isExecutableStep).length
  : Math.max(0, Number(caseItem?.stepCount ?? caseItem?.__stepCount) || 0)

export const isExecutableCase = (caseItem: any) => isEnabledDefinitionNode(caseItem)
  && executableStepCount(caseItem) > 0

export function getArtifactMap(record: any): Record<string, any> {
  const value = record?.artifactUrls
    || record?.playwrightArtifacts
    || record?.playwrightResult?.artifacts
    || record?.playwrightResult?.raw?.artifacts
    || record?.artifacts
    || {}
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
