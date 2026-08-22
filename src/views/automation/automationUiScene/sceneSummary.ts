import type { AutomationUiSceneResp } from '@/apis/automation/automationUiScene'
import type { AutomationUiExecutionSummary, AutomationUiSceneSummary } from '@/apis/automation/automationUiQuery'

const buildExecutionRecord = (latest?: AutomationUiExecutionSummary) => {
  if (!latest) return undefined
  const caseTotal = Number(latest.caseTotal || 0)
  const casePass = Number(latest.casePass || 0)
  return {
    executionId: latest.executionKey,
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
