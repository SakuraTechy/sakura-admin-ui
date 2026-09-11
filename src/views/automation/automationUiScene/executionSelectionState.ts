import { type LiveExecutionCase, executionStatusLabel } from './execution'
import type { AutomationUiExecutionCaseHistory, AutomationUiExecutionSummary } from '@/apis/automation/automationUiQuery'

export interface SelectionExecutionState {
  executeStatus: string
  lastResult: string
  duration?: number
  executionId: string
  startedAt?: number
  finishedAt?: number
  executionTime?: number
}

export function emptySelectionExecution(): SelectionExecutionState {
  return { executeStatus: 'never_executed', lastResult: '', executionId: '-' }
}

export function selectionStatusLabel(status: unknown) {
  return status === 'never_executed' ? '未执行' : executionStatusLabel(status)
}

function timestamp(value: string | number | undefined) {
  if (value == null || value === '') return undefined
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : undefined
}

function terminal(status: string) {
  return ['已完成', '已取消'].includes(executionStatusLabel(status))
}

function resultOrStatus(result: string | undefined, status: string) {
  return result || (['passed', 'failed', 'skipped', 'blocked', 'cancelled'].includes(status) ? status : '')
}

export function caseSelectionExecution(record?: AutomationUiExecutionCaseHistory): SelectionExecutionState {
  if (!record) return emptySelectionExecution()
  const status = record.executeStatus || record.status || 'not_started'
  return {
    executeStatus: status,
    lastResult: resultOrStatus(record.executeResult || record.result, status),
    executionId: record.caseExecutionKey || record.executionKey || String(record.caseExecutionDbId),
    duration: record.wallClockDurationMs ?? record.durationMs,
    startedAt: timestamp(record.startedAt),
    finishedAt: timestamp(record.finishedAt),
    executionTime: timestamp(record.createTime) ?? timestamp(record.startedAt),
  }
}

export function sceneSelectionExecution(record?: AutomationUiExecutionSummary): SelectionExecutionState {
  if (!record) return emptySelectionExecution()
  const status = record.status || 'not_started'
  return {
    executeStatus: status,
    lastResult: resultOrStatus(record.result, status),
    // 场景展示批次编号，用例展示各自的执行编号，不能混用。
    executionId: record.batchId || record.executionKey || String(record.executionDbId),
    duration: record.durationMs,
    startedAt: timestamp(record.startedAt),
    finishedAt: timestamp(record.finishedAt),
    executionTime: timestamp(record.createTime) ?? timestamp(record.startedAt),
  }
}

export function selectionDuration(state: SelectionExecutionState, now: number) {
  const stored = state.duration == null ? undefined : Number(state.duration)
  const validStored = stored != null && Number.isFinite(stored) && stored >= 0 ? stored : undefined
  const { startedAt, finishedAt } = state
  if (startedAt != null && finishedAt != null && finishedAt >= startedAt) {
    return validStored && validStored > 0 ? validStored : finishedAt - startedAt
  }
  // 创建时间不是开始时间；终态缺少结束时间也不能让耗时一直增长。
  if (!terminal(state.executeStatus) && startedAt != null
    && ['启动中', '执行中', '取消中'].includes(executionStatusLabel(state.executeStatus))) {
    return Math.max(validStored || 0, now - startedAt, 0)
  }
  return validStored
}

export function withSelectionLiveExecution(state: SelectionExecutionState, live: LiveExecutionCase): SelectionExecutionState {
  const sameExecution = state.executionId === live.executionId
  const liveTime = live.startedAt ?? live.finishedAt
  // 服务端已落库的终态优先；上一个批次遗留的实时事件不能覆盖更新的历史。
  if (sameExecution && terminal(state.executeStatus)) return state
  if (!sameExecution && state.executionId !== '-') {
    if (liveTime != null && state.executionTime != null && liveTime < state.executionTime) return state
    if (liveTime == null && terminal(live.status)) return state
  }
  return {
    executeStatus: live.status,
    lastResult: terminal(live.status) ? live.status : state.lastResult,
    executionId: live.executionId || '-',
    duration: live.durationMs,
    startedAt: live.startedAt,
    finishedAt: live.finishedAt,
    executionTime: liveTime,
  }
}
