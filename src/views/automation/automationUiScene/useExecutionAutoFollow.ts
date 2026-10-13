import { watch } from 'vue'

interface ExecutionFollowRow {
  key: string
  executeStatus: unknown
  executeResult?: unknown
}

function isExecutionFollowActive(row: ExecutionFollowRow) {
  return ['waiting', 'queued', 'starting', 'running', 'cancelling', '11', '执行中'].includes(String(row.executeStatus || '').toLowerCase())
}

export function isExecutionFollowTerminal(row: Pick<ExecutionFollowRow, 'executeStatus' | 'executeResult'>) {
  const status = String(row.executeStatus || '').toLowerCase()
  // 取消中仍有执行事件，不能因为结果提前写入而跳到下一项。
  if (['waiting', 'queued', 'starting', 'running', 'cancelling', '11', '执行中'].includes(status)) return false
  const terminal = ['12', '14', '15', '16', '17', 'completed', 'passed', 'failed', 'startup-failed', 'cancelled', 'blocked', 'skipped', '已完成', '已取消', '通过', '不通过', '阻塞', '跳过']
  return terminal.includes(status) || terminal.includes(String(row.executeResult || '').toLowerCase())
}

/** 场景和用例共用状态驱动的跟随规则，不依赖是否有实时日志。 */
export function useExecutionAutoFollow(options: {
  scope: () => string
  rows: () => ExecutionFollowRow[]
  selectedKey: () => string
  select: (key: string) => void
  enabled?: () => boolean
  /** 用例详情只自动跟随执行中的记录，已完成记录留给用户手动打开。 */
  activeOnly?: boolean
  preferredKey?: () => string | undefined
  nextPage?: () => void
}) {
  let scope = ''
  let initialized = false
  let previous = new Map<string, ExecutionFollowRow>()
  watch(() => ({
    scope: options.scope(),
    enabled: options.enabled?.() ?? true,
    preferred: options.preferredKey?.(),
    rows: options.rows().map((row) => ({ ...row })),
  }), (state) => {
    if (scope !== state.scope || !state.enabled) {
      scope = state.scope
      initialized = false
      previous.clear()
    }
    if (!state.enabled || !state.rows.length) return
    const rows = state.rows
    let target: ExecutionFollowRow | undefined
    let advancePage = false
    if (!initialized) {
      const active = options.activeOnly ? rows.filter(isExecutionFollowActive) : rows
      // 明确定位到某个用例属于用户导航；默认展开时优先正在运行的用例，不打开历史首条。
      target = rows.find((row) => row.key === state.preferred)
        || (options.activeOnly && active.find((row) => ['starting', 'running', 'cancelling', '11', '执行中'].includes(String(row.executeStatus || '').toLowerCase())))
        || active[0]
      initialized = true
    } else {
      const currentIndex = rows.findIndex((row) => row.key === options.selectedKey())
      const current = rows[currentIndex]
      const before = current && previous.get(current.key)
      if (current && before && !isExecutionFollowTerminal(before) && isExecutionFollowTerminal(current)) {
        const following = rows.slice(currentIndex + 1)
        target = options.activeOnly
          ? following.find(isExecutionFollowActive)
          : following.find((row) => !isExecutionFollowTerminal(row)) || following[0]
        advancePage = !target
      }
      // 轮询可能分两次收到“上一项完成”和“下一项启动”，也可能一次跨过多项。
      const started = rows.find((row) => ['starting', 'running', '11', '执行中'].includes(String(row.executeStatus))
        && previous.get(row.key)?.executeStatus !== row.executeStatus)
      if (started && (!current || isExecutionFollowTerminal(current)
        || ['waiting', 'queued', 'not_started'].includes(String(current.executeStatus)))) {
        target = started
        advancePage = false
      }
    }
    // 必须保存全部状态，不能使用 some 提前退出，否则后面的完成事件会漏掉。
    previous = new Map(rows.map((row) => [row.key, row]))
    if (target && target.key !== options.selectedKey()) options.select(target.key)
    else if (advancePage) options.nextPage?.()
  }, { immediate: true, flush: 'post' })
}
