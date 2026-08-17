import http from '@/utils/http'

const BASE_URL = '/test/metrics'

export interface TestMetricScopeQuery {
  projectId: string
  versionId?: string
  startDate?: string
  endDate?: string
  executionEngine?: string
  triggerType?: string
  environmentId?: string
}

export interface MetricRate {
  numerator: number
  denominator: number
  rate: number
  previousRate: number
  changePoints: number
}

export interface TestMetricSummaryResp {
  projectId: string
  versionId?: string
  startDate: string
  endDate: string
  runCount: number
  sceneExecutionCount: number
  eligibleSceneCount: number
  executedSceneCount: number
  passCount: number
  failCount: number
  skipCount: number
  cancelCount: number
  infraFailCount: number
  otherCount: number
  caseTotal: number
  casePass: number
  caseFail: number
  caseSkip: number
  stepTotal: number
  stepPass: number
  stepFail: number
  stepSkip: number
  averageDurationMs: number
  durationTotalMs: number
  durationSampleCount: number
  exactDimensionCount: number
  inferredDimensionCount: number
  missingDimensionCount: number
  passRate: MetricRate
  executionCoverage: MetricRate
}

export interface TestMetricTrendPoint {
  date: string
  runCount: number
  sceneExecutionCount: number
  executedSceneCount: number
  passCount: number
  failCount: number
  skipCount: number
  cancelCount: number
  infraFailCount: number
  otherCount: number
  durationTotalMs: number
  durationSampleCount: number
  passRate: number
}

export interface TestMetricTrendResp {
  points: TestMetricTrendPoint[]
}

export interface TestMetricBreakdownItem {
  key: string
  label: string
  count: number
  ratio: number
}

export interface TestMetricBreakdownResp {
  dimension: string
  total: number
  items: TestMetricBreakdownItem[]
}

export interface TestMetricFailureItem {
  sceneId: string
  sceneKey: string
  sceneName: string
  moduleId?: string
  moduleName: string
  sceneLevel: string
  failCount: number
  infraFailCount: number
  lastFailedAt?: string
  lastErrorCode?: string
  lastErrorMessage?: string
}

export interface TestMetricFailureResp {
  items: TestMetricFailureItem[]
}

export function getTestMetricSummary(query: TestMetricScopeQuery) {
  return http.get<TestMetricSummaryResp>(`${BASE_URL}/summary`, query)
}

export function getTestMetricTrends(query: TestMetricScopeQuery) {
  return http.get<TestMetricTrendResp>(`${BASE_URL}/trends`, query)
}

export function getTestMetricBreakdown(query: TestMetricScopeQuery, dimension: string) {
  return http.get<TestMetricBreakdownResp>(`${BASE_URL}/breakdowns`, { ...query, dimension })
}

export function getTestMetricFailures(query: TestMetricScopeQuery, limit = 10) {
  return http.get<TestMetricFailureResp>(`${BASE_URL}/failures`, { ...query, limit })
}
