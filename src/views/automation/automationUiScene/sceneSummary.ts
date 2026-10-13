import { type LiveExecutionCase, executableStepCount, isExecutableCase } from './execution'
import type { AutomationUiSceneResp } from '@/apis/automation/automationUiScene'
import type { AutomationUiExecutionSummary, AutomationUiSceneSummary } from '@/apis/automation/automationUiQuery'

const buildExecutionRecord = (latest?: AutomationUiExecutionSummary) => {
  if (!latest) return undefined
  const caseTotal = Number(latest.caseTotal || 0)
  const casePass = Number(latest.casePass || 0)
  return {
    executionId: latest.executionKey,
    batchId: latest.batchId,
    executionDbId: latest.executionDbId,
    buildNumber: latest.buildNumber,
    executeStatus: latest.status,
    executeResult: latest.result,
    status: latest.status,
    result: latest.result,
    executeName: latest.executeName || latest.executeUsername,
    executeUsername: latest.executeUsername,
    startedAt: latest.startedAt,
    finishedAt: latest.finishedAt,
    duration: latest.durationMs,
    caseTotal: latest.caseTotal,
    casePass: latest.casePass,
    caseFail: latest.caseFail,
    caseSkip: latest.caseSkip,
    stepTotal: latest.stepTotal,
    stepPass: latest.stepPass,
    stepFail: latest.stepFail,
    stepSkip: latest.stepSkip,
    scenePassRate: caseTotal > 0 ? `${Math.round(casePass * 10000 / caseTotal) / 100}%` : '-',
  }
}

/** 将作用域窄摘要映射为旧表格兼容行；定义和历史正文保持未加载。 */
export function mapScopedSceneSummary(
  summary: AutomationUiSceneSummary,
  recordSource: 'debug' | 'test',
): AutomationUiSceneResp {
  const executionRecord = buildExecutionRecord(summary.latestExecution)
  const caseTotal = Number(summary.latestExecution?.caseTotal || 0)
  const casePass = Number(summary.latestExecution?.casePass || 0)
  const passRate = caseTotal > 0 ? String(Math.round(casePass * 10000 / caseTotal) / 100) : ''
  const row: AutomationUiSceneResp = {
    id: String(summary.sceneDbId),
    sceneId: summary.sceneKey,
    name: summary.name,
    description: summary.description || '',
    projectId: String(summary.projectDbId),
    projectName: summary.projectName || '',
    versionId: summary.versionDbId == null ? '' : String(summary.versionDbId),
    versionName: summary.versionName || '',
    moduleId: summary.moduleDbId == null ? '' : String(summary.moduleDbId),
    modulePath: summary.modulePath || '',
    level: summary.level || '',
    status: Number(summary.status || 0),
    tags: Array.isArray(summary.tags) ? summary.tags as Array<object> : [],
    caseList: [],
    definitionVersion: summary.definitionVersion,
    testPlanId: [],
    reportId: '',
    debugRecord: recordSource === 'debug' && executionRecord ? [executionRecord] : [],
    executeStatus: summary.latestExecution?.status || '',
    executeResult: summary.latestExecution?.result || '',
    testRecord: recordSource === 'test' && executionRecord ? [executionRecord] : [],
    buildNumber: Number(summary.latestExecution?.buildNumber || 0),
    consoleUrl: '',
    testReportUrl: '',
    caseTotal,
    casePass,
    caseFail: Number(summary.latestExecution?.caseFail || 0),
    caseSkip: Number(summary.latestExecution?.caseSkip || 0),
    passRate,
    lastResult: summary.latestExecution?.result || '',
    stepTotal: Number(summary.latestExecution?.stepTotal || 0),
    stepPass: Number(summary.latestExecution?.stepPass || 0),
    stepFail: Number(summary.latestExecution?.stepFail || 0),
    stepSkip: Number(summary.latestExecution?.stepSkip || 0),
    createUser: '',
    createTime: summary.createTime || '',
    updateUser: '',
    updateTime: summary.updateTime || '',
    updateIp: '',
    executionRevision: summary.globalExecutionRevision,
    delFlag: 3,
    createUserString: summary.createUserString || '-',
    updateUserString: summary.updateUserString || '-',
    disabled: false,
  }
  Object.assign(row, {
    duration: summary.latestExecution?.durationMs,
    casePassRate: executionRecord?.scenePassRate || '-',
    executeName: summary.latestExecution?.executeName || summary.latestExecution?.executeUsername || '-',
    durationStartTime: summary.latestExecution?.startedAt,
    durationEndTime: summary.latestExecution?.finishedAt,
  })
  return row
}

export const mapDebugSceneSummary = (summary: AutomationUiSceneSummary) => mapScopedSceneSummary(summary, 'debug')

export interface SceneExecutionProgress {
  requestedAt: number
  batchId?: string
  executeStatus: string
  executeResult: string
  caseTotal: number
  casePass: number
  caseFail: number
  caseSkip: number
  stepTotal: number
  stepPass: number
  stepFail: number
  stepSkip: number
  duration: number
  error?: string
}

/** 排队状态只覆盖页面展示，不能把尚未创建的批次写入历史或复用上次的结果。 */
export function queuedSceneProgress(scene: any, requestedAt = Date.now()): SceneExecutionProgress {
  const cases = (Array.isArray(scene.caseList) ? scene.caseList : []).filter(isExecutableCase)
  return {
    requestedAt,
    executeStatus: 'queued',
    executeResult: 'not_executed',
    caseTotal: scene.__projectedDefinition ? Number(scene.__caseTotal || 0) : cases.length,
    casePass: 0,
    caseFail: 0,
    caseSkip: 0,
    stepTotal: cases.reduce((total: number, item: any) => total + executableStepCount(item), 0),
    stepPass: 0,
    stepFail: 0,
    stepSkip: 0,
    duration: 0,
  }
}

/** 每次消息是当前场景完整用例快照；仅全部用例结束后公布场景最终结果。 */
export function liveSceneProgress(rows: LiveExecutionCase[], requestedAt: number, now = Date.now()): SceneExecutionProgress {
  const complete = rows.length > 0 && rows.every((item) => ['passed', 'failed', 'skipped', 'cancelled'].includes(item.status))
  const count = (status: LiveExecutionCase['status']) => rows.filter((item) => item.status === status).length
  const casePass = count('passed')
  const caseFail = count('failed')
  const caseSkip = count('skipped')
  const cancelled = count('cancelled') > 0
  const starts = rows.map((item) => item.startedAt).filter((value): value is number => value != null)
  const finishes = rows.map((item) => item.finishedAt).filter((value): value is number => value != null)
  const executeStatus = complete
    ? cancelled ? 'cancelled' : 'completed'
    : count('cancelling')
      ? 'cancelling'
      : count('running') || casePass + caseFail + caseSkip > 0 || cancelled
        ? 'running'
        : count('starting') ? 'starting' : 'queued'
  return {
    requestedAt,
    batchId: rows[0]?.batchId,
    executeStatus,
    executeResult: !complete ? 'not_executed' : cancelled ? 'cancelled' : caseFail ? 'failed' : caseSkip ? 'skipped' : 'passed',
    caseTotal: rows.length,
    casePass,
    caseFail,
    caseSkip,
    stepTotal: rows.reduce((total, item) => total + item.stepTotal, 0),
    stepPass: rows.reduce((total, item) => total + (item.stepPass || 0), 0),
    stepFail: rows.reduce((total, item) => total + (item.stepFail || 0), 0),
    stepSkip: rows.reduce((total, item) => total + (item.stepSkip || 0), 0),
    duration: starts.length ? Math.max(0, (complete ? Math.max(...finishes, ...starts) : now) - Math.min(...starts)) : 0,
  }
}

export function withSceneExecutionProgress(scene: AutomationUiSceneResp, progress?: SceneExecutionProgress): AutomationUiSceneResp {
  if (!progress) return scene
  const latest = scene.debugRecord?.[0]
  const terminal = ['completed', 'cancelled', 'startup-failed'].includes(progress.executeStatus)
  // 迟到的旧摘要不能盖掉本次状态；同批次落库终态或更新的执行记录仍以中台为准。
  if (terminal && latest && (
    (progress.batchId && latest.batchId === progress.batchId && ['completed', 'cancelled', '12', '17'].includes(String(latest.executeStatus)))
    || (latest.batchId !== progress.batchId && new Date(latest.startedAt).getTime() > progress.requestedAt)
  )) {
    return scene
  }
  return {
    ...scene,
    debugRecord: [{ ...progress, scenePassRate: progress.caseTotal > 0 ? `${Math.round(progress.casePass * 10000 / progress.caseTotal) / 100}%` : '0%' }],
    // 保留排队与启动标签，不影响存量 Jenkins 字典映射。
    __localExecutionStatus: progress.executeStatus,
  } as AutomationUiSceneResp
}
