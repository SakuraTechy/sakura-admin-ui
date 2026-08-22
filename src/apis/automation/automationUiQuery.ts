import type { AxiosResponse } from 'axios'
import qs from 'query-string'
import http from '@/utils/http'
import type { AutomationUiCase } from './automationUiScene'

const SCENE_URL = '/automation/automationUiScene'
const EXECUTION_URL = '/automation/executions'
// 执行子资源后端统一限制为 50，避免前端大页请求被服务端拒绝或产生不一致分页。
export const AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT = 50

const normalizeExecutionChildPageSize = (size: number) => {
  if (!Number.isFinite(size)) return AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT
  return Math.min(AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT, Math.max(1, Math.trunc(size)))
}

export type AutomationUiRecordSource = 'debug' | 'test'
export const AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT = 100

export interface AutomationUiExecutionScope {
  recordSource: AutomationUiRecordSource
  testPlanId?: string | number
  testReportId?: string | number
  buildNumber?: number
}

export interface AutomationUiExecutionSummary {
  executionDbId: number
  executionKey: string
  sceneDbId: number
  sceneKey: string
  batchId?: string
  recordSource: AutomationUiRecordSource
  testPlanId?: number
  testReportId?: number
  buildNumber?: number
  recordType?: string
  triggerType?: string
  executionEngine?: string
  status?: string
  result?: string
  executeUserId?: number
  executeUsername?: string
  executeName?: string
  executeEmail?: string
  projectEnvironmentId?: number
  projectEnvironmentName?: string
  caseTotal?: number
  casePass?: number
  caseFail?: number
  caseSkip?: number
  caseCancelled?: number
  stepTotal?: number
  stepPass?: number
  stepFail?: number
  stepSkip?: number
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  errorCode?: string
  errorMessage?: string
  createTime?: string
  updateTime?: string
}

export interface AutomationUiExecutionDetail extends AutomationUiExecutionSummary {
  definitionRevisionId?: number
  consoleUrl?: string
  testReportUrl?: string
  executorNode?: string
  heartbeatAt?: string
  leaseUntil?: string
  cancelRequested?: boolean
}

export interface AutomationUiExecutionCase {
  caseExecutionDbId: number
  executionDbId: number
  definitionCaseId?: string
  caseKey?: string
  caseExecutionKey?: string
  caseName?: string
  caseIndex?: number
  attemptNo?: number
  jobId?: string
  status?: string
  result?: string
  executeStatus?: string
  executeResult?: string
  stepTotal?: number
  stepPass?: number
  stepFail?: number
  stepSkip?: number
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  stepDurationMs?: number
  wallClockDurationMs?: number
  errorCode?: string
  errorMessage?: string
  eventSequence?: number
  createTime?: string
  updateTime?: string
}

export interface AutomationUiExecutionCaseHistory extends AutomationUiExecutionCase {
  executionKey?: string
  batchId?: string
  sceneDbId?: number
  sceneKey?: string
  recordSource?: AutomationUiRecordSource
  testPlanId?: number
  testReportId?: number
  buildNumber?: number
  executionEngine?: string
  executeUsername?: string
  executeName?: string
  projectEnvironmentId?: number
  projectEnvironmentName?: string
}

export interface AutomationUiExecutionStep {
  stepExecutionDbId: number
  caseExecutionDbId: number
  definitionStepId?: string
  sourceStepId?: string
  stepIndex?: number
  attemptNo?: number
  actionType?: string
  stepName?: string
  description?: string
  status?: string
  durationMs?: number
  locatorSource?: string
  locatorType?: string
  errorCode?: string
  errorMessage?: string
  eventSequence?: number
  createTime?: string
  updateTime?: string
}

export interface AutomationUiExecutionStepDetail extends AutomationUiExecutionStep {
  locatorValue?: string
  diagnostics?: unknown
}

export interface AutomationUiExecutionArtifact {
  artifactDbId: number
  executionDbId: number
  caseExecutionDbId?: number
  stepExecutionDbId?: number
  artifactType?: string
  storageStatus?: string
  sizeBytes?: number
  expiresAt?: string
  createTime?: string
  updateTime?: string
}

export interface AutomationUiSceneSummary {
  sceneDbId: number
  sceneKey: string
  name: string
  description?: string
  projectDbId: number
  projectName?: string
  versionDbId?: number
  versionName?: string
  moduleDbId?: number
  modulePath?: string
  level?: string
  status?: number
  tags?: unknown[]
  definitionVersion: number
  globalExecutionRevision: number
  latestExecution?: AutomationUiExecutionSummary
  createUserString?: string
  updateUserString?: string
  createTime?: string
  updateTime?: string
}

interface AutomationUiDefinitionBase {
  mode: 'inline' | 'projected'
  sceneDbId: number
  sceneKey: string
  name: string
  description?: string
  projectDbId: number
  projectName?: string
  versionDbId?: number
  versionName?: string
  moduleDbId?: number
  modulePath?: string
  level?: string
  status?: number
  tags?: unknown[]
  definitionVersion: number
  maskPolicyVersion: number
  representationScopeDigest: string
  requiredCapabilities?: string[]
  supportedExecutors?: string[]
  requiresInfrastructure?: boolean
}

export interface AutomationUiInlineDefinition extends AutomationUiDefinitionBase {
  mode: 'inline'
  caseList: AutomationUiCase[]
}

export interface AutomationUiProjectedDefinition extends AutomationUiDefinitionBase {
  mode: 'projected'
  projectionId: number
  caseCount: number
  stepCount: number
  projectionStatus: string
}

export type AutomationUiSceneDefinition = AutomationUiInlineDefinition | AutomationUiProjectedDefinition

export interface AutomationUiDefinitionCaseNode {
  caseId: string
  caseIndex: number
  caseName: string
  stepCount: number
  caseBody: Record<string, unknown>
}

export interface AutomationUiDefinitionCasePage {
  sceneDbId: number
  definitionVersion: number
  projectionId: number
  page: number
  size: number
  total: number
  items: AutomationUiDefinitionCaseNode[]
}

export interface AutomationUiDefinitionCase {
  sceneDbId: number
  definitionVersion: number
  projectionId: number
  caseId: string
  stepCount: number
  caseBody: Record<string, unknown>
}

export interface AutomationUiDefinitionStepPage {
  sceneDbId: number
  definitionVersion: number
  projectionId: number
  caseId: string
  page: number
  size: number
  total: number
  items: Array<Record<string, unknown>>
}

export interface AutomationUiDefinitionProjectionPending {
  code: 'DEFINITION_PROJECTION_PENDING'
  sceneDbId?: number
  definitionVersion?: number
  projectionStatus?: string
}

export interface AutomationUiPage<T> {
  list: T[]
  total: number
}

export type AutomationUiExecutionPage = {
  mode: 'page'
  list: AutomationUiExecutionSummary[]
  total: number
  page: number
  size: number
  globalExecutionRevision: number
} | {
  mode: 'cursor'
  list: AutomationUiExecutionSummary[]
  nextCursor?: string
  hasMore: boolean
  globalExecutionRevision: number
}

export interface AutomationUiExecutionQuery {
  sceneDbId: string | number
  recordSource: AutomationUiRecordSource
  testPlanId?: string | number
  testReportId?: string | number
  buildNumber?: number
  status?: string
  result?: string
  cursor?: string
  page?: number
  size?: number
  sort?: string[]
}

export interface AutomationUiSceneSummaryQuery {
  id?: string | number
  sceneId?: string
  name?: string
  projectId?: string | number
  versionId?: string | number
  moduleId?: string | number
  moduleIds?: Array<string | number>
  level?: string
  status?: number
  createUser?: string | number
  updateUser?: string | number
  createTime?: string[]
  excludeIds?: Array<string | number>
  executeStatus?: string
  executeResult?: string
  executionMatchedOnly?: boolean
  recordSource?: AutomationUiRecordSource
  scopeTestPlanId?: string | number
  scopeTestReportId?: string | number
  scopeBuildNumber?: number
  page?: number
  size?: number
  sort?: string[]
}

export interface AutomationUiSceneRevision {
  sceneDbId: number
  globalExecutionRevision: number
  updateTime?: string
}

export interface RawQueryResponse<T> {
  data?: T
  status: number
  etag?: string
  retryAfter?: number
}

const rawGet = async <T>(url: string, params?: object, signal?: AbortSignal, etag?: string): Promise<RawQueryResponse<T>> => {
  const response = await http.requestNative<T>({
    method: 'get',
    url,
    params,
    paramsSerializer: value => qs.stringify(value),
    signal,
    rawResponse: true,
    silentError: true,
    headers: etag ? { 'If-None-Match': etag } : undefined,
    validateStatus: status => (status >= 200 && status < 300) || status === 304,
  }) as AxiosResponse<T>
  // 普通 Controller 响应会经过统一 R 包装，而 ResponseEntity 定义接口直出 DTO；
  // 统一在 rawGet 解包，避免调用方把外层响应误当成分页对象读取 list。
  const payload = response.data as T | { data?: T, success?: boolean, code?: string | number }
  const isApiEnvelope = payload !== null
    && typeof payload === 'object'
    && 'data' in payload
    && ('success' in payload || 'code' in payload)
  return {
    data: response.status === 304
      ? undefined
      : isApiEnvelope
        ? (payload as { data?: T }).data
        : payload as T,
    status: response.status,
    etag: response.headers?.etag,
    retryAfter: Number(response.headers?.['retry-after']) || undefined,
  }
}

export function getAutomationUiSceneSummaries(
  sceneDbIds: Array<string | number>,
  executionScope?: AutomationUiRecordSource | AutomationUiExecutionScope,
  signal?: AbortSignal,
) {
  return http.post<AutomationUiSceneSummary[]>(`${SCENE_URL}/summaries`, {
    sceneDbIds,
    executionScope: typeof executionScope === 'string' ? { recordSource: executionScope } : executionScope,
  }, { signal, silentError: true })
}

export function getAutomationUiSceneSummaryPage(query: AutomationUiSceneSummaryQuery, signal?: AbortSignal) {
  return rawGet<AutomationUiPage<AutomationUiSceneSummary>>(`${SCENE_URL}/summaries/page`, query, signal)
}

/**
 * 以请求体提交场景摘要筛选条件，避免大量 excludeIds 被展开到 URL。
 * 分页和执行 scope 仍作为普通查询参数，后端与 GET Summary 使用同一套 Service/权限。
 */
export function postAutomationUiSceneSummaryPage(query: AutomationUiSceneSummaryQuery, signal?: AbortSignal) {
  const {
    recordSource,
    scopeTestPlanId,
    scopeTestReportId,
    scopeBuildNumber,
    page,
    size,
    sort,
    ...body
  } = query
  return http.post<AutomationUiPage<AutomationUiSceneSummary>>(
    `${SCENE_URL}/summaries/page`,
    body,
    {
      params: {
        recordSource,
        scopeTestPlanId,
        scopeTestReportId,
        scopeBuildNumber,
        page,
        size,
        sort,
      },
      paramsSerializer: value => qs.stringify(value),
      signal,
      silentError: true,
    },
  )
}

export function getAutomationUiSceneDefinition(sceneDbId: string | number, signal?: AbortSignal, etag?: string) {
  return rawGet<AutomationUiSceneDefinition | AutomationUiDefinitionProjectionPending>(
    `${SCENE_URL}/${sceneDbId}/definition`, undefined, signal, etag,
  )
}

export function getAutomationUiSceneExecutionSummary(
  sceneDbId: string | number,
  recordSource: AutomationUiRecordSource,
  signal?: AbortSignal,
) {
  return http.get<AutomationUiExecutionSummary>(
    `${SCENE_URL}/${sceneDbId}/execution-summary`,
    { recordSource },
    { signal, silentError: true },
  )
}

export function listAutomationUiDefinitionCases(
  sceneDbId: string | number,
  page = 1,
  size = 50,
  keyword = '',
  signal?: AbortSignal,
  etag?: string,
) {
  return rawGet<AutomationUiDefinitionCasePage>(
    `${SCENE_URL}/${sceneDbId}/definition/cases`,
    { page, size, ...(keyword ? { keyword } : {}) },
    signal,
    etag,
  )
}

export function getAutomationUiDefinitionCase(sceneDbId: string | number, caseId: string, signal?: AbortSignal, etag?: string) {
  return rawGet<AutomationUiDefinitionCase>(`${SCENE_URL}/${sceneDbId}/definition/case`, { caseId }, signal, etag)
}

export function listAutomationUiDefinitionSteps(sceneDbId: string | number, caseId: string, page = 1, size = 100, signal?: AbortSignal, etag?: string) {
  return rawGet<AutomationUiDefinitionStepPage>(`${SCENE_URL}/${sceneDbId}/definition/steps`, { caseId, page, size }, signal, etag)
}

export function getAutomationUiExecutions(query: AutomationUiExecutionQuery, signal?: AbortSignal) {
  return rawGet<AutomationUiExecutionPage>(EXECUTION_URL, query, signal)
}

export function getAutomationUiExecution(executionDbId: string | number, signal?: AbortSignal) {
  return rawGet<AutomationUiExecutionDetail>(`${EXECUTION_URL}/${executionDbId}`, undefined, signal)
}

export function getAutomationUiExecutionCases(executionDbId: string | number, page = 1, size = 50, signal?: AbortSignal) {
  return rawGet<AutomationUiPage<AutomationUiExecutionCase>>(
    `${EXECUTION_URL}/${executionDbId}/cases`,
    { page, size: normalizeExecutionChildPageSize(size) },
    signal,
  )
}

export function getAutomationUiExecutionCaseHistory(
  query: AutomationUiExecutionCaseHistoryQuery,
  page = 1,
  size = 50,
  signal?: AbortSignal,
) {
  return rawGet<AutomationUiPage<AutomationUiExecutionCaseHistory>>(
    `${EXECUTION_URL}/cases/history`,
    { ...query, page, size: normalizeExecutionChildPageSize(size) },
    signal,
  )
}

export function getAutomationUiExecutionArtifacts(executionDbId: string | number, page = 1, size = 50, signal?: AbortSignal) {
  return rawGet<AutomationUiPage<AutomationUiExecutionArtifact>>(
    `${EXECUTION_URL}/${executionDbId}/artifacts`,
    { page, size: normalizeExecutionChildPageSize(size) },
    signal,
  )
}

export function getAutomationUiExecutionSteps(caseExecutionDbId: string | number, page = 1, size = 50, signal?: AbortSignal) {
  return rawGet<AutomationUiPage<AutomationUiExecutionStep>>(
    `/automation/execution-cases/${caseExecutionDbId}/steps`,
    { page, size: normalizeExecutionChildPageSize(size) },
    signal,
  )
}

export function getAutomationUiExecutionStep(stepExecutionDbId: string | number, signal?: AbortSignal) {
  return rawGet<AutomationUiExecutionStepDetail>(`/automation/execution-steps/${stepExecutionDbId}`, undefined, signal)
}

export interface AutomationUiExecutionCaseHistoryQuery extends AutomationUiExecutionScope {
  sceneDbId: string | number
  caseId: string
}

export function getAutomationUiExecutionRevisions(sceneIds: Array<string | number>) {
  return http.get<AutomationUiSceneRevision[]>(
    `${EXECUTION_URL}/revisions`, { sceneIds }, { silentError: true },
  )
}

/** revision 接口最多接受 100 个场景 ID，所有轮询调用统一在 API 层分批。 */
export async function getAutomationUiExecutionRevisionsBatched(sceneIds: Array<string | number>) {
  const normalized = [...new Set(sceneIds.map(String).filter(Boolean))]
  const chunks = Array.from(
    { length: Math.ceil(normalized.length / AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT) },
    (_, index) => normalized.slice(
      index * AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
      (index + 1) * AUTOMATION_UI_SUMMARY_BATCH_SIZE_LIMIT,
    ),
  )
  const responses = await Promise.all(chunks.map(chunk => getAutomationUiExecutionRevisions(chunk)))
  return { data: responses.flatMap(response => Array.isArray(response.data) ? response.data : []) }
}
