import type { AutomationUiCase, AutomationUiStep, AutomationUiTreeMovePosition, AutomationUiTreeNodeRef } from '@/apis/automation/automationUiScene'

export interface AutomationUiCaseTreeNode {
  treeKey: string
  type: 'case' | 'step'
  caseId: string
  stepId?: string
  name: string
  children?: AutomationUiCaseTreeNode[]
}

export const treeKeyOf = (ref: AutomationUiTreeNodeRef) => ref.type === 'CASE'
  ? `case:${ref.caseId}`
  : `step:${ref.caseId}:${ref.stepId}`

export function parseTreeKey(key: string): AutomationUiTreeNodeRef | null {
  const parts = String(key).split(':')
  if (parts.length === 2 && parts[0] === 'case' && parts[1]) return { type: 'CASE', caseId: parts[1] }
  if (parts.length === 3 && parts[0] === 'step' && parts[1] && parts[2]) return { type: 'STEP', caseId: parts[1], stepId: parts[2] }
  return null
}

export function buildCaseTree(caseList: AutomationUiCase[]): AutomationUiCaseTreeNode[] {
  return (caseList || []).map((caseItem) => {
    const caseId = String(caseItem.id)
    return {
      treeKey: treeKeyOf({ type: 'CASE', caseId }),
      type: 'case', caseId, name: caseItem.name,
      children: (caseItem.stepList || []).map((step) => {
        const stepId = String(step.id)
        return {
          treeKey: treeKeyOf({ type: 'STEP', caseId, stepId }),
          type: 'step' as const, caseId, stepId, name: step.name,
        }
      }),
    }
  })
}

export function nodeRefOf(node: AutomationUiCaseTreeNode): AutomationUiTreeNodeRef {
  return node.type === 'case'
    ? { type: 'CASE', caseId: String(node.caseId) }
    : { type: 'STEP', caseId: String(node.caseId), stepId: String(node.stepId) }
}

export function canDropCaseTreeNode(source?: AutomationUiCaseTreeNode, target?: AutomationUiCaseTreeNode, position?: number): boolean {
  if (!source || !target || source.treeKey === target.treeKey) return false
  if (source.type === 'case') return target.type === 'case' && (position === -1 || position === 1)
  if (target.type === 'case') return position === 0
  return target.type === 'step' && (position === -1 || position === 1)
}

export function toMovePosition(position: number): AutomationUiTreeMovePosition | null {
  return position === -1 ? 'BEFORE' : position === 0 ? 'INSIDE_LAST' : position === 1 ? 'AFTER' : null
}

export function normalizeDeleteSelection(nodes: AutomationUiTreeNodeRef[]): AutomationUiTreeNodeRef[] {
  const caseIds = new Set(nodes.filter(node => node.type === 'CASE').map(node => node.caseId))
  const seen = new Set<string>()
  return nodes.filter((node) => {
    if (node.type === 'STEP' && caseIds.has(node.caseId)) return false
    const key = treeKeyOf(node)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function findNodeDetail(caseList: AutomationUiCase[], ref: AutomationUiTreeNodeRef): AutomationUiCase | AutomationUiStep | undefined {
  const caseItem = caseList.find(item => String(item.id) === String(ref.caseId))
  return ref.type === 'CASE'
    ? caseItem
    : caseItem?.stepList.find(step => String(step.id) === String(ref.stepId))
}

/** 兼容历史 JSON 中的数字、枚举名和枚举对象，统一供状态开关和字典标签使用。 */
export function normalizeAutomationNodeStatus(status: unknown): number | string {
  const raw = status && typeof status === 'object'
    ? ((status as any).value ?? (status as any).code ?? (status as any).name)
    : status
  const text = String(raw ?? '').trim()
  if (!text) return ''
  if (text === 'ENABLE' || text === '启用') return 1
  if (text === 'DISABLE' || text === '禁用') return 2
  const numberValue = Number(text)
  return Number.isNaN(numberValue) ? text : numberValue
}
