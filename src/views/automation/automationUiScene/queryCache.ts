import type {
  AutomationUiDefinitionCase,
  AutomationUiDefinitionCaseNode,
  AutomationUiDefinitionCasePage,
  AutomationUiDefinitionStepPage,
  RawQueryResponse,
  AutomationUiSceneDefinition,
} from '@/apis/automation/automationUiQuery'
import {
  getAutomationUiDefinitionCase,
  getAutomationUiSceneDefinition,
  listAutomationUiDefinitionCases,
  listAutomationUiDefinitionSteps,
} from '@/apis/automation/automationUiQuery'

const MAX_DEFINITION_SCENES = 10
const MAX_DEFINITION_BYTES = 20 * 1024 * 1024
// 与后端 definition/cases 的硬上限保持一致，避免兼容全量分页或外部调用传入 100 后被拒绝。
const MAX_PROJECTED_CASE_PAGE_SIZE = 50
const NODE_CACHE_TTL_MS = 30_000

interface DefinitionCacheEntry {
  key: string
  sceneDbId: string
  etag?: string
  value: AutomationUiSceneDefinition
  bytes: number
  accessedAt: number
}

interface DefinitionNodeCacheEntry<T = unknown> {
  key: string
  requestKey: string
  sceneDbId: string
  etag?: string
  value: T
  bytes: number
  accessedAt: number
}

const inFlight = new Map<string, Promise<unknown>>()
const definitionCache = new Map<string, DefinitionCacheEntry>()
const definitionNodeCache = new Map<string, DefinitionNodeCacheEntry>()
const signalIds = new WeakMap<AbortSignal, number>()
let nextSignalId = 1

function signalKey(signal?: AbortSignal) {
  if (!signal) return 'shared'
  let id = signalIds.get(signal)
  if (!id) {
    id = nextSignalId++
    signalIds.set(signal, id)
  }
  return `signal-${id}`
}

export function requestOnce<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const current = inFlight.get(key) as Promise<T> | undefined
  if (current) return current
  const request = loader().finally(() => {
    if (inFlight.get(key) === request) inFlight.delete(key)
  })
  inFlight.set(key, request)
  return request
}

function definitionKey(value: AutomationUiSceneDefinition) {
  return [value.sceneDbId, value.definitionVersion, value.maskPolicyVersion, value.representationScopeDigest].join(':')
}

function estimateBytes(value: unknown) {
  return new Blob([JSON.stringify(value)]).size
}

function trimDefinitionCache() {
  const allEntries = () => [...definitionCache.values(), ...definitionNodeCache.values()]
  let totalBytes = allEntries().reduce((total, item) => total + item.bytes, 0)
  const sceneCount = () => new Set(allEntries().map(item => item.sceneDbId)).size
  while (sceneCount() > MAX_DEFINITION_SCENES || totalBytes > MAX_DEFINITION_BYTES) {
    const sceneAccess = new Map<string, number>()
    allEntries().forEach((entry) => {
      sceneAccess.set(entry.sceneDbId, Math.max(sceneAccess.get(entry.sceneDbId) || 0, entry.accessedAt))
    })
    const oldestSceneId = [...sceneAccess.entries()]
      .sort((left, right) => left[1] - right[1])[0]?.[0]
    if (!oldestSceneId) break
    for (const entry of definitionCache.values()) {
      if (entry.sceneDbId !== oldestSceneId) continue
      definitionCache.delete(entry.key)
      totalBytes -= entry.bytes
    }
    for (const entry of definitionNodeCache.values()) {
      if (entry.sceneDbId !== oldestSceneId) continue
      definitionNodeCache.delete(entry.key)
      totalBytes -= entry.bytes
    }
  }
}

function latestSceneDefinition(sceneDbId: string) {
  return [...definitionCache.values()]
    .filter(item => item.sceneDbId === sceneDbId)
    .sort((left, right) => right.accessedAt - left.accessedAt)[0]
}

export async function loadAutomationUiDefinition(sceneDbId: string | number, signal?: AbortSignal) {
  const normalizedSceneId = String(sceneDbId)
  const cached = latestSceneDefinition(normalizedSceneId)
  let response: RawQueryResponse<AutomationUiSceneDefinition>
  let retryCount = 0
  do {
    response = await requestOnce<RawQueryResponse<AutomationUiSceneDefinition>>(
      `definition:${normalizedSceneId}:${cached?.etag || 'initial'}:${retryCount}:${signalKey(signal)}`,
      () => getAutomationUiSceneDefinition(sceneDbId, signal, cached?.etag) as Promise<RawQueryResponse<AutomationUiSceneDefinition>>,
    )
    if (response.status !== 202 || retryCount >= 2) break
    retryCount += 1
    await waitForRetry(Math.min(5, Math.max(1, response.retryAfter || 2)) * 1000, signal)
  } while (!signal?.aborted)
  if (response.status === 304 && cached) {
    cached.accessedAt = Date.now()
    return cached.value
  }
  if (response.status === 202 || !response.data || !('mode' in response.data)) return response.data

  const value = response.data
  const key = definitionKey(value)
  for (const entry of definitionCache.values()) {
    if (entry.sceneDbId === normalizedSceneId && entry.key !== key) definitionCache.delete(entry.key)
  }
  definitionCache.set(key, {
    key,
    sceneDbId: normalizedSceneId,
    etag: response.etag,
    value,
    bytes: estimateBytes(value),
    accessedAt: Date.now(),
  })
  trimDefinitionCache()
  return value
}

function waitForRetry(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('请求已取消', 'AbortError'))
      return
    }
    let settled = false
    const onAbort = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(new DOMException('请求已取消', 'AbortError'))
    }
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function latestNode<T>(requestKey: string) {
  return [...definitionNodeCache.values()]
    .filter(item => item.requestKey === requestKey)
    .sort((left, right) => right.accessedAt - left.accessedAt)[0] as DefinitionNodeCacheEntry<T> | undefined
}

async function loadDefinitionNode<T>(
  sceneDbId: string | number,
  requestKey: string,
  loader: (etag?: string) => Promise<RawQueryResponse<T>>,
  signal?: AbortSignal,
) {
  const cached = latestNode<T>(requestKey)
  // 节点详情在短时间内直接复用本地结果，避免每次点击都产生 304 请求和服务端查询。
  if (cached && Date.now() - cached.accessedAt < NODE_CACHE_TTL_MS) {
    cached.accessedAt = Date.now()
    return cached.value
  }
  const response = await requestOnce(
    `${requestKey}:${cached?.etag || 'initial'}:${signalKey(signal)}`,
    () => loader(cached?.etag),
  )
  if (response.status === 304 && cached) {
    cached.accessedAt = Date.now()
    return cached.value
  }
  if (!response.data) return undefined

  const normalizedSceneId = String(sceneDbId)
  const definition = latestSceneDefinition(normalizedSceneId)?.value
  const scopeDigest = definition?.representationScopeDigest || 'server-scope-pending'
  const version = (response.data as any).definitionVersion ?? definition?.definitionVersion ?? 'unknown'
  const projectionId = (response.data as any).projectionId ?? (definition?.mode === 'projected' ? definition.projectionId : 'inline')
  const key = `${scopeDigest}:${normalizedSceneId}:${version}:${projectionId}:${requestKey}:${response.etag || 'no-etag'}`
  for (const entry of definitionNodeCache.values()) {
    if (entry.requestKey === requestKey && entry.key !== key) definitionNodeCache.delete(entry.key)
  }
  definitionNodeCache.set(key, {
    key,
    requestKey,
    sceneDbId: normalizedSceneId,
    etag: response.etag,
    value: response.data,
    bytes: estimateBytes(response.data),
    accessedAt: Date.now(),
  })
  trimDefinitionCache()
  return response.data
}

export function loadAutomationUiDefinitionCases(
  sceneDbId: string | number,
  page = 1,
  size = 50,
  signal?: AbortSignal,
  keyword = '',
) {
  const normalizedKeyword = keyword.trim()
  const requestKey = `definition-cases:${sceneDbId}:${page}:${size}:${encodeURIComponent(normalizedKeyword)}`
  return loadDefinitionNode<AutomationUiDefinitionCasePage>(
    sceneDbId,
    requestKey,
    etag => listAutomationUiDefinitionCases(sceneDbId, page, size, normalizedKeyword, signal, etag),
    signal,
  )
}

export function loadAutomationUiDefinitionCase(sceneDbId: string | number, caseId: string, signal?: AbortSignal) {
  const requestKey = `definition-case:${sceneDbId}:${caseId}`
  return loadDefinitionNode<AutomationUiDefinitionCase>(
    sceneDbId,
    requestKey,
    etag => getAutomationUiDefinitionCase(sceneDbId, caseId, signal, etag),
    signal,
  )
}

export function loadAutomationUiDefinitionSteps(sceneDbId: string | number, caseId: string, page = 1, size = 100, signal?: AbortSignal) {
  const requestKey = `definition-steps:${sceneDbId}:${caseId}:${page}:${size}`
  return loadDefinitionNode<AutomationUiDefinitionStepPage>(
    sceneDbId,
    requestKey,
    etag => listAutomationUiDefinitionSteps(sceneDbId, caseId, page, size, signal, etag),
    signal,
  )
}

async function loadAllAutomationUiDefinitionCases(sceneDbId: string | number, signal?: AbortSignal) {
  const size = MAX_PROJECTED_CASE_PAGE_SIZE
  const firstPage = await loadAutomationUiDefinitionCases(sceneDbId, 1, size, signal)
  if (!firstPage) return []
  const items = [...firstPage.items]
  const pageCount = Math.ceil(firstPage.total / size)
  for (let page = 2; page <= pageCount; page += 1) {
    const response = await loadAutomationUiDefinitionCases(sceneDbId, page, size, signal)
    items.push(...(response?.items || []))
  }
  return items
}

export interface AutomationUiExecutionSelectionLoadOptions {
  /** projected 场景仅加载指定页；未指定时保留旧调用方的完整轻量用例列表行为。 */
  projectedPage?: number
  projectedPageSize?: number
  /** 执行配置步骤只加载已经选中的用例元数据，避免再次扫描全部页。 */
  projectedCaseIds?: string[]
}

function executionSelectionCase(item: AutomationUiDefinitionCaseNode | AutomationUiDefinitionCase) {
  return {
    ...item.caseBody,
    id: item.caseId,
    name: 'caseName' in item ? item.caseName || item.caseId : String(item.caseBody.name || item.caseId),
    stepCount: item.stepCount,
    __stepCount: item.stepCount,
  }
}

/** 执行选择只需要用例标识和步骤数；projected 模式不能下载或重组完整步骤定义。 */
export async function loadAutomationUiExecutionSelectionScene(
  sceneDbId: string | number,
  base: Record<string, unknown> = {},
  signal?: AbortSignal,
  options: AutomationUiExecutionSelectionLoadOptions = {},
) {
  const definition = await loadAutomationUiDefinition(sceneDbId, signal)
  if (!definition || !('mode' in definition)) throw new Error('场景定义投影尚未就绪')
  const normalized = {
    ...base,
    id: String(definition.sceneDbId),
    sceneId: definition.sceneKey,
    name: definition.name,
    description: definition.description,
    projectId: String(definition.projectDbId || ''),
    projectName: definition.projectName,
    versionId: definition.versionDbId == null ? '' : String(definition.versionDbId),
    versionName: definition.versionName,
    moduleId: definition.moduleDbId == null ? '' : String(definition.moduleDbId),
    modulePath: definition.modulePath,
    level: definition.level,
    status: definition.status,
    tags: definition.tags || [],
    definitionVersion: definition.definitionVersion,
    requiresInfrastructure: definition.requiresInfrastructure,
    requiredCapabilities: definition.requiredCapabilities,
    supportedExecutors: definition.supportedExecutors,
    __definitionLoaded: true,
  }
  if (definition.mode === 'inline') return { ...normalized, caseList: definition.caseList }

  const requestedCaseIds = [...new Set((options.projectedCaseIds || []).map(String).filter(Boolean))]
  if (requestedCaseIds.length) {
    const cases = (await mapWithConcurrency(requestedCaseIds, 6, caseId => (
      loadAutomationUiDefinitionCase(sceneDbId, caseId, signal)
    ))).filter((item): item is AutomationUiDefinitionCase => Boolean(item))
    return {
      ...normalized,
      __projectedDefinition: true,
      __projectedSelectionScoped: true,
      __caseTotal: definition.caseCount,
      caseList: cases.map(executionSelectionCase),
    }
  }

  if (options.projectedPage) {
    const page = Math.max(1, options.projectedPage)
    const size = Math.min(MAX_PROJECTED_CASE_PAGE_SIZE, Math.max(1, options.projectedPageSize || 20))
    const response = await loadAutomationUiDefinitionCases(sceneDbId, page, size, signal)
    return {
      ...normalized,
      __projectedDefinition: true,
      __projectedCasePage: page,
      __projectedCasePageSize: size,
      __caseTotal: response?.total ?? definition.caseCount,
      caseList: (response?.items || []).map(executionSelectionCase),
    }
  }

  // 录制导入等旧调用方仍需要完整轻量用例列表；执行入口必须显式使用分页或已选 ID 模式。
  const cases = await loadAllAutomationUiDefinitionCases(sceneDbId, signal)
  return {
    ...normalized,
    __projectedDefinition: true,
    __caseTotal: definition.caseCount,
    caseList: cases.map(executionSelectionCase),
  }
}

export function invalidateAutomationUiDefinition(sceneDbId: string | number) {
  const normalizedSceneId = String(sceneDbId)
  for (const entry of definitionCache.values()) {
    if (entry.sceneDbId === normalizedSceneId) definitionCache.delete(entry.key)
  }
  for (const entry of definitionNodeCache.values()) {
    if (entry.sceneDbId === normalizedSceneId) definitionNodeCache.delete(entry.key)
  }
}

export function clearAutomationUiQueryCache() {
  definitionCache.clear()
  definitionNodeCache.clear()
  inFlight.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('session-cache-clear', clearAutomationUiQueryCache)
}

export async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await mapper(items[index])
    }
  })
  await Promise.all(workers)
  return results
}
