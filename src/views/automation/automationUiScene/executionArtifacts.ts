import type { ExecutionHistoryCaseRow } from './execution'
import type { AutomationUiExecutionArtifact } from '@/apis/automation/automationUiQuery'
import { getAutomationUiExecutionArtifactContentUrl } from '@/apis/automation/automationUiQuery'

export type ExecutionArtifactKind = 'report' | 'trace' | 'screenshot' | 'video'
export type ExecutionArtifactContext = Pick<ExecutionHistoryCaseRow, 'rowKey' | 'caseId' | 'executionId' | 'executionType' | 'recordTarget' | 'caseExecutionDbId'
  | 'artifactReportUrl' | 'artifactTraceUrl' | 'artifactScreenshotUrl' | 'artifactVideoUrl' | 'artifactUploadError' | 'executeStatus'>
export interface ExecutionArtifactItem {
  kind: ExecutionArtifactKind
  title: string
  description: string
  url: string
  state: 'available' | 'missing' | 'expired'
  reason: string
}

const definitions = [
  { kind: 'report', title: 'HTML report', description: '用例结果、逐步骤明细与错误汇总', field: 'artifactReportUrl', aliases: ['report_html', 'report'] },
  { kind: 'trace', title: 'Trace', description: '动作轨迹、页面快照与定位过程', field: 'artifactTraceUrl', aliases: ['trace'] },
  { kind: 'screenshot', title: '失败截图', description: '失败时的页面状态', field: 'artifactScreenshotUrl', aliases: ['failure_screenshot', 'screenshot', 'screenshots'] },
  { kind: 'video', title: '执行录屏', description: '当前用例的整段执行录屏', field: 'artifactVideoUrl', aliases: ['video', 'videos'] },
] as const

export function buildExecutionArtifacts(record: ExecutionArtifactContext, index: AutomationUiExecutionArtifact[], now = Date.now()): ExecutionArtifactItem[] {
  return definitions.map((definition) => {
    const matches = index.filter((item) => (
      record.caseExecutionDbId != null && String(item.caseExecutionDbId) === String(record.caseExecutionDbId)
      && (definition.aliases as readonly string[]).includes(String(item.artifactType || '').toLowerCase().replaceAll('-', '_'))
    ))
    const usable = (item: AutomationUiExecutionArtifact) => (
      (!item.storageStatus || item.storageStatus.toLowerCase() === 'active')
      && (!item.expiresAt || Date.parse(item.expiresAt) > now)
    )
    const artifact = matches.find(usable) || matches[0]
    const expired = Boolean(artifact && !usable(artifact))
    const legacyUrl = String(record[definition.field] || '')
    // 截图与视频仅引用文件地址，绝不把二进制写回 caseList 或执行记录。
    const url = artifact && record.recordTarget.executionDbId && !expired
      ? getAutomationUiExecutionArtifactContentUrl(record.recordTarget.executionDbId, artifact.artifactDbId)
      : expired ? '' : legacyUrl === '-' ? '' : legacyUrl
    const unsupported = record.executionType === 'extension-cdp' && definition.kind === 'video'
    return {
      kind: definition.kind,
      title: definition.title,
      description: definition.description,
      url: unsupported ? '' : url,
      state: unsupported ? 'missing' : expired ? 'expired' : url ? 'available' : 'missing',
      reason: unsupported
        ? '扩展 CDP 回放当前不支持录屏'
        : expired
          ? '该产物已过期或不可用，请重新执行生成'
          : `本次执行暂无${definition.title}；执行中或仅失败时保留的产物可能尚未生成`,
    }
  })
}
