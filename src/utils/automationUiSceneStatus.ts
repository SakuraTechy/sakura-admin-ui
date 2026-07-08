import type { LabelValueState } from '@/types/global'

/** UI 场景执行状态字典 value */
export const SCENE_STATUS_DICT_VALUES = ['10', '11', '12'] as const

/** UI 场景执行结果字典 value */
export const SCENE_RESULT_DICT_VALUES = ['13', '14', '15', '16'] as const

const STATUS_LEGACY_TO_VALUE: Record<string, string> = {
  NOT_STARTED: '10',
  RUNNING: '11',
  COMPLETED: '12',
  未开始: '10',
  进行中: '11',
  已完成: '12',
}

const RESULT_LEGACY_TO_VALUE: Record<string, string> = {
  NOT_EXECUTED: '13',
  PASSED: '14',
  FAILED: '15',
  SKIPPED: '16',
  RUNNING: '13',
  未执行: '13',
  全部通过: '14',
  通过: '14',
  不通过: '15',
  失败: '15',
  跳过: '16',
  '-': '13',
}

/**
 * 将接口/历史数据中的执行状态归一为字典 value，供 GiCellTag 使用。
 */
export function resolveSceneStatusValue(
  raw: string | number | undefined | null,
  dictItems: LabelValueState[] = [],
): string | undefined {
  if (raw === undefined || raw === null)
    return undefined
  const trimmed = String(raw).trim()
  if (!trimmed)
    return undefined
  if (SCENE_STATUS_DICT_VALUES.includes(trimmed as typeof SCENE_STATUS_DICT_VALUES[number]))
    return trimmed
  if (dictItems.some(item => item.value === trimmed))
    return trimmed
  const mapped = STATUS_LEGACY_TO_VALUE[trimmed] ?? STATUS_LEGACY_TO_VALUE[trimmed.toUpperCase()]
  if (mapped)
    return mapped
  const byLabel = dictItems.find(item => item.label === trimmed)
  return byLabel?.value
}

/**
 * 将接口/历史数据中的执行结果归一为字典 value，供 GiCellTag 使用。
 */
export function resolveSceneResultValue(
  raw: string | number | undefined | null,
  dictItems: LabelValueState[] = [],
): string | undefined {
  if (raw === undefined || raw === null)
    return undefined
  const trimmed = String(raw).trim()
  if (!trimmed || trimmed === '-')
    return undefined
  if (SCENE_RESULT_DICT_VALUES.includes(trimmed as typeof SCENE_RESULT_DICT_VALUES[number]))
    return trimmed
  if (dictItems.some(item => item.value === trimmed))
    return trimmed
  const mapped = RESULT_LEGACY_TO_VALUE[trimmed] ?? RESULT_LEGACY_TO_VALUE[trimmed.toUpperCase()]
  if (mapped)
    return mapped
  const byLabel = dictItems.find(item => item.label === trimmed)
  return byLabel?.value
}

export function filterSceneStatusOptions(dictItems: LabelValueState[]) {
  return dictItems.filter(item => SCENE_STATUS_DICT_VALUES.includes(item.value as typeof SCENE_STATUS_DICT_VALUES[number]))
}

export function filterSceneResultOptions(dictItems: LabelValueState[]) {
  return dictItems.filter(item => SCENE_RESULT_DICT_VALUES.includes(item.value as typeof SCENE_RESULT_DICT_VALUES[number]))
}

/**
 * 读取场景最近一次调试记录中的状态/结果，无记录时回退实体字段。
 */
export function pickSceneExecuteField(
  record: Record<string, any>,
  field: 'executeStatus' | 'executeResult',
  dictItems: LabelValueState[] = [],
  executeResultType?: 'debug' | 'report',
) {
  const sourceArray = executeResultType === 'report' ? record.testRecord : record.debugRecord
  const source = Array.isArray(sourceArray) && sourceArray.length > 0 ? sourceArray[0] : null
  const raw = source?.[field]
  if (field === 'executeStatus')
    return resolveSceneStatusValue(raw, dictItems)
  return resolveSceneResultValue(raw, dictItems)
}
