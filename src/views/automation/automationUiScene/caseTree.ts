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

/**
 * 复用未变化的节点对象重建树。
 *
 * buildCaseTree 每次都产出全新对象，于是任何一次改名都让 a-tree 重新生成内部节点、
 * 重绘所有可见行，treeKey -> node 索引也整体失效。这里逐层按 treeKey + name 比对：
 * 用例的子列表完全一致就沿用旧用例对象，整棵树都没变则直接返回旧数组引用，
 * 让下游 watch 与渲染彻底跳过。
 *
 * 注意仍会先调用一次 buildCaseTree，省下的是渲染与响应式开销，不是对象分配；
 * 分配本身很便宜，为省它而重写一份映射逻辑不值得。
 */
export function reconcileCaseTree(
  prev: AutomationUiCaseTreeNode[] | undefined,
  caseList: AutomationUiCase[],
): AutomationUiCaseTreeNode[] {
  const next = buildCaseTree(caseList)
  if (!prev?.length) return next

  const prevCaseByKey = new Map(prev.map((node) => [node.treeKey, node]))
  let changed = next.length !== prev.length

  const merged = next.map((nextCase, index) => {
    // 同 key 换了位置也算变化，否则拖动排序不会反映到树上。
    if (prev[index]?.treeKey !== nextCase.treeKey) changed = true
    const oldCase = prevCaseByKey.get(nextCase.treeKey)
    if (!oldCase || oldCase.name !== nextCase.name) {
      changed = true
      return nextCase
    }

    const oldSteps = oldCase.children || []
    const nextSteps = nextCase.children || []
    let stepsChanged = oldSteps.length !== nextSteps.length
    const mergedSteps = nextSteps.map((nextStep, stepIndex) => {
      const oldStep = oldSteps[stepIndex]
      if (!oldStep || oldStep.treeKey !== nextStep.treeKey || oldStep.name !== nextStep.name) {
        stepsChanged = true
        return nextStep
      }
      return oldStep
    })
    if (!stepsChanged) return oldCase
    changed = true
    return { ...nextCase, children: mergedSteps }
  })

  return changed ? merged : prev
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
