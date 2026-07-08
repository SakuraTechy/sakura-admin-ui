import http from '@/utils/http'

const BASE_URL = '/test/testMetric'

export interface MetricModule {
  totalCount: number
  weekAddedCount: number
  monthAddedCount: number
  yearAddedCount: number
}

export interface MetricScene {
  totalCount: number
  p0Count: number
  p1Count: number
  p2Count: number
  p3Count: number
  weekAddedCount: number
  monthAddedCount: number
  yearAddedCount: number
  executedCount: number
  passedCount: number
  failedCount: number
  skippedCount: number
}

export interface MetricExecution {
  totalReportCount: number
  weekRunCount: number
  monthRunCount: number
  yearRunCount: number
  totalRunSceneCount: number
  discoveredDefectCount: number
  savedManHours: number
  automationCoverageRate: number
  automationExecuteRate: number
  automationPassRate: number
  defectRate: number
}

export interface TestMetricResp {
  projectId: string
  versionId: string
  testPlanCount: number
  testReportCount: number
  timedTaskCount: number
  sceneCount: number
  passedSceneCount: number
  automationPassRate: number
  moduleMetric: MetricModule
  sceneMetric: MetricScene
  executionMetric: MetricExecution
}

export function getTestMetricOverview(query?: { projectId?: string; versionId?: string }) {
  return http.get<TestMetricResp>(`${BASE_URL}/overview`, query)
}
