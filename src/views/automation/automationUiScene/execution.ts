import type { ExecutionType, ExecutionViewType } from '@/apis/automation/automationUiScene'

export type { ExecutionType, ExecutionViewType } from '@/apis/automation/automationUiScene'

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
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
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

export const getExecutionRecords = (scene: any, type: ExecutionType) => {
  const debugRecords = normalizeRecordList(scene?.debugRecord).map((record, index) => ({
    ...record,
    __source: 'debug',
    __key: `debug-${index}-${record?.executionId || record?.buildNumber || index}`,
  }))
  const testRecords = normalizeRecordList(scene?.testRecord).map((record, index) => ({
    ...record,
    __source: 'test',
    __key: `test-${index}-${record?.executionId || record?.buildNumber || index}`,
  }))
  return [...debugRecords, ...testRecords]
    .filter((record) => inferExecutionType(record, record.__source) === type)
    .sort((left, right) => executionTime(right) - executionTime(left))
}

export const isExecutableCase = (caseItem: any) => {
  const enabled = caseItem?.status == null || ['1', 'true', 'enabled', 'enable'].includes(String(caseItem.status).toLowerCase())
  return enabled && Array.isArray(caseItem?.stepList) && caseItem.stepList.length > 0
}

export const getArtifactMap = (record: any): Record<string, any> => {
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

export const getArtifactUrl = (record: any, ...keys: string[]) => {
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
