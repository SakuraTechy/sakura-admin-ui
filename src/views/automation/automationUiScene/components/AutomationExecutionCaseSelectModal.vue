<template>
  <a-modal
    v-model:visible="visible"
    :title="`${executionTypeLabel(executionType)} - ${isSceneSelection ? '选择执行场景' : '选择执行用例'}`"
    :width="1180"
    :mask-closable="false"
    unmount-on-close
  >
    <div class="case-select-modal">
      <a-alert type="info" show-icon>
        {{ isSceneSelection
          ? '请选择需要执行的测试场景。下一步将配置产品环境和执行参数，场景按列表顺序串行执行。'
          : '请选择需要执行的用例。下一步将配置产品环境和执行参数，批量任务按列表顺序串行执行。' }}
      </a-alert>

      <div class="case-select-search">
        <a-input
          v-model="keyword"
          allow-clear
          :placeholder="isSceneSelection ? '搜索场景 ID、场景名称' : '搜索用例 ID、用例名称'"
        >
          <template #prefix><icon-search /></template>
        </a-input>
        <a-select v-model="statusFilter" allow-clear placeholder="执行状态" :style="{ width: '150px' }">
          <a-option value="排队中">排队中</a-option>
          <a-option value="启动中">启动中</a-option>
          <a-option value="执行中">执行中</a-option>
          <a-option value="取消中">取消中</a-option>
          <a-option value="已完成">已完成</a-option>
          <a-option value="已取消">已取消</a-option>
        </a-select>
        <a-select v-model="resultFilter" allow-clear placeholder="上次结果" :style="{ width: '140px' }">
          <a-option value="未执行">未执行</a-option>
          <a-option value="全部通过">全部通过</a-option>
          <a-option value="不通过">不通过</a-option>
          <a-option value="阻塞">阻塞</a-option>
          <a-option value="跳过">跳过</a-option>
          <a-option value="已取消">已取消</a-option>
        </a-select>
        <a-space v-if="!selectionDisabled">
          <a-button :disabled="filteredRows.length === 0" @click="selectFilteredCases">
            {{ isRemoteProjectedCases ? '全选当前页结果' : '全选当前结果' }}
          </a-button>
          <a-button :disabled="selectedCaseKeys.length === 0" @click="selectedCaseKeys = []">清空</a-button>
        </a-space>
      </div>

      <a-table
        v-model:selected-keys="selectedCaseKeys"
        :data="filteredRows"
        :loading="loading"
        :pagination="caseTablePagination"
        :row-selection="selectionDisabled ? undefined : { type: 'checkbox', showCheckedAll: true }"
        row-key="rowKey"
        size="small"
        :scroll="{ y: 430 }"
      >
        <template #columns>
          <template v-if="isSceneSelection">
            <a-table-column title="场景 ID" data-index="sceneId" :width="170" ellipsis tooltip />
            <a-table-column title="场景名称" data-index="sceneName" ellipsis tooltip />
            <a-table-column title="用例数" data-index="caseTotal" :width="82" align="center" />
          </template>
          <template v-else>
            <!-- <a-table-column title="场景 ID" data-index="sceneId" :width="150" ellipsis tooltip />
            <a-table-column title="场景名称" data-index="sceneName" :width="150" ellipsis tooltip />
            <a-table-column title="场景用例数" data-index="sceneCaseTotal" :width="90" align="center" /> -->
            <a-table-column title="用例 ID" data-index="caseId" :width="170" ellipsis tooltip />
            <a-table-column title="用例名称" data-index="name" ellipsis tooltip />
            <a-table-column title="步骤数" data-index="stepTotal" :width="82" align="center" />
          </template>
          <a-table-column title="执行状态" :width="105" align="center">
            <template #cell="{ record }">
              <a-tag :color="executionStatusColor(record.executeStatus)">
                {{ executionStatusLabel(record.executeStatus) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="上次结果" :width="100" align="center">
            <template #cell="{ record }">
              <a-tag v-if="record.lastResult" :color="executionResultColor(record.lastResult)">
                {{ executionAggregateResultLabel(record.lastResult) }}
              </a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column title="运行耗时" :width="105" align="center">
            <template #cell="{ record }">{{ formatExecutionDuration(record.duration) }}</template>
          </a-table-column>
          <a-table-column title="执行编号" data-index="executionId" :width="190" ellipsis tooltip />
        </template>
      </a-table>

      <div class="case-select-summary">
        <template v-if="isSceneSelection">
          <template v-if="selectionDisabled">
            {{ sceneSelectionSummary || '本次将执行测试计划指定的' }} <strong>{{ sceneRows.length }}</strong> 个场景
          </template>
          <template v-else>
            已选择 <strong>{{ selectedCaseKeys.length }}</strong> 个场景，共 {{ sceneRows.length }} 个可执行场景
          </template>
        </template>
        <template v-else-if="selectionDisabled">
          本次将执行测试计划指定的 <strong>{{ selectedCaseCount }}</strong> 个用例
        </template>
        <template v-else>
          已选择 <strong>{{ selectedCaseKeys.length }}</strong> 个用例，共 {{ caseTotal }} 个可执行用例
        </template>
      </div>
    </div>

    <template #footer>
      <a-space>
        <a-button @click="visible = false">取消</a-button>
        <a-button type="primary" :disabled="selectedCaseKeys.length === 0" @click="nextStep">
          下一步
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import {
  type ExecutionCaseOpenOptions,
  type ExecutionContext,
  type ExecutionType,
  type ExecutionHistoryCaseRow,
  type LiveExecutionCase,
  executionResultColor,
  executionAggregateResultLabel,
  executionResultLabel,
  executionStatusColor,
  executionStatusLabel,
  executionTypeLabel,
  executableStepCount,
  formatExecutionDuration,
  getExecutionBatchRows,
  getExecutionHistoryRows,
  isExecutableCase,
} from '../execution'
import { loadAutomationUiExecutionSelectionScene } from '../queryCache'

interface SelectableCase {
  rowKey: string
  sceneKey: string
  sceneId: string
  sceneName: string
  sceneCaseTotal: number
  caseId: string
  name: string
  stepTotal: number
  executeStatus: unknown
  lastResult: unknown
  duration: unknown
  executionId: string
}

interface SelectableScene {
  rowKey: string
  sceneKey: string
  sceneId: string
  sceneName: string
  caseTotal: number
  caseIds: string[]
  selectAllCases: boolean
  definitionVersion?: number
  executeStatus: unknown
  lastResult: unknown
  duration: unknown
  executionId: string
}

interface CaseSelectionPayload extends ExecutionContext {
  scene: any
  executionType: Exclude<ExecutionType, 'jenkins'>
  caseIds: string[]
  sceneIds?: string[]
  selectionDisabled?: boolean
}

const props = withDefaults(defineProps<{
  liveExecutions?: LiveExecutionCase[]
}>(), { liveExecutions: () => [] })
const emit = defineEmits<{
  (e: 'next', payload: CaseSelectionPayload): void
}>()

const visible = ref(false)
const loading = ref(false)
const scene = ref<any>()
const executionType = ref<Exclude<ExecutionType, 'jenkins'>>('extension-cdp')
const keyword = ref('')
const statusFilter = ref('')
const resultFilter = ref('')
const selectedCaseKeys = ref<Array<string | number>>([])
const cases = ref<SelectableCase[]>([])
const sceneRows = ref<SelectableScene[]>([])
const executionContext = ref<ExecutionContext>({})
const selectionDisabled = ref(false)
const sceneSelection = ref(false)
const sceneSelectionSummary = ref('')
const isSceneSelection = computed(() => sceneSelection.value)
const caseRowsByKey = new Map<string, SelectableCase>()
const projectedPagination = reactive({ current: 1, pageSize: 20, total: 0 })
const isRemoteProjectedCases = computed(() => Boolean(
  !isSceneSelection.value
  && scene.value?.__projectedDefinition
  && !scene.value?.__projectedSelectionScoped
  && !scene.value?.__planAggregate
  && !scene.value?.__sceneAggregate,
))
const caseTotal = computed(() => isRemoteProjectedCases.value ? projectedPagination.total : cases.value.length)
const selectedCaseCount = computed(() => selectionDisabled.value && Number(scene.value?.__caseTotal || 0) > 0
  ? Number(scene.value.__caseTotal)
  : selectedCaseKeys.value.length)
const caseTablePagination = computed(() => isRemoteProjectedCases.value
  ? {
      current: projectedPagination.current,
      pageSize: projectedPagination.pageSize,
      total: projectedPagination.total,
      showTotal: true,
      showPageSize: true,
      pageSizeOptions: [10, 20, 50, 100],
      onChange: (page: number) => void loadProjectedCasePage(page, projectedPagination.pageSize),
      onPageSizeChange: (size: number) => void loadProjectedCasePage(1, size),
    }
  : { pageSize: 10, showTotal: true, showPageSize: true })

const casesWithLiveStatus = computed(() => {
  const recordSource = executionContext.value.recordSource || 'debug'
  const liveByCase = new Map(props.liveExecutions
    .filter((item) => (
      (item.recordSource || 'debug') === recordSource
      && (recordSource !== 'test'
        || String(item.testPlanId || '') === String(executionContext.value.testPlanId || ''))
    ))
    .map((item) => [`${String(item.sceneKey || item.sceneId || '')}:${item.caseId}`, item]))
  return cases.value.map((item) => {
    const live = liveByCase.get(`${item.sceneKey}:${item.caseId}`)
      || liveByCase.get(`:${item.caseId}`)
    if (!live) return item
    const terminal = ['passed', 'failed', 'cancelled'].includes(live.status)
    return {
      ...item,
      executeStatus: live.status,
      lastResult: terminal ? live.status : item.lastResult,
      duration: live.startedAt ? Math.max(0, (live.finishedAt || Date.now()) - live.startedAt) : item.duration,
      executionId: live.executionId || item.executionId,
    }
  })
})
const filteredCases = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return casesWithLiveStatus.value.filter((item) => (
    (!search
      || item.sceneId.toLowerCase().includes(search)
      || item.sceneName.toLowerCase().includes(search)
      || item.caseId.toLowerCase().includes(search)
      || item.name.toLowerCase().includes(search))
    && (!statusFilter.value || executionStatusLabel(item.executeStatus) === statusFilter.value)
    && matchesResultFilter(item.lastResult)
  ))
})
const filteredScenes = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return sceneRows.value.filter((item) => (
    (!search || item.sceneId.toLowerCase().includes(search) || item.sceneName.toLowerCase().includes(search))
    && (!statusFilter.value || executionStatusLabel(item.executeStatus) === statusFilter.value)
    && matchesResultFilter(item.lastResult)
  ))
})
const filteredRows = computed(() => isSceneSelection.value ? filteredScenes.value : filteredCases.value)

function matchesResultFilter(value: unknown) {
  if (!resultFilter.value) return true
  const label = executionAggregateResultLabel(value)
  if (resultFilter.value === '未执行') return label === '未执行'
  if (resultFilter.value === '全部通过') return label === '全部通过'
  if (resultFilter.value === '不通过') return label === '不通过'
  if (resultFilter.value === '跳过') {
    const rawLabel = executionResultLabel(value)
    return rawLabel === '跳过' || rawLabel === '已取消'
  }
  return false
}

async function onOpen(
  record: any,
  type: Exclude<ExecutionType, 'jenkins'>,
  options: ExecutionCaseOpenOptions = {},
) {
  executionType.value = type
  executionContext.value = {
    recordSource: options.recordSource || 'debug',
    testPlanId: options.testPlanId,
  }
  keyword.value = ''
  statusFilter.value = ''
  resultFilter.value = ''
  selectedCaseKeys.value = []
  caseRowsByKey.clear()
  projectedPagination.current = 1
  projectedPagination.pageSize = 20
  projectedPagination.total = 0
  cases.value = []
  sceneRows.value = []
  selectionDisabled.value = Boolean(options.selectionDisabled)
  sceneSelection.value = Boolean(options.sceneSelection || (options.selectionDisabled && record?.__planAggregate))
  sceneSelectionSummary.value = options.sceneSelectionSummary || ''
  visible.value = true
  loading.value = true
  try {
    const existingCases = Array.isArray(record?.caseList) ? record.caseList : []
    const detail = record?.__planAggregate || record?.__sceneAggregate
      ? record
      : record?.__definitionLoaded && !record?.__projectedDefinition
        ? record
        : record?.id
          ? await loadAutomationUiExecutionSelectionScene(String(record.id), record, undefined, (
              options.selectionDisabled && options.caseIds?.length
                ? { projectedCaseIds: options.caseIds }
                : { projectedPage: 1, projectedPageSize: projectedPagination.pageSize }
            ))
          : record
    scene.value = detail || record
    if (scene.value?.__projectedDefinition) {
      existingCases.forEach((item: any) => rememberProjectedCase(scene.value, item))
      projectedPagination.current = Number(scene.value.__projectedCasePage || 1)
      projectedPagination.pageSize = Number(scene.value.__projectedCasePageSize || projectedPagination.pageSize)
      projectedPagination.total = Number(scene.value.__caseTotal || 0)
    }
    loadSelectionRows(scene.value, options.caseIds || [])
    if (scene.value?.__projectedDefinition && !selectionDisabled.value && options.caseIds?.length) {
      const sceneKey = getSceneKey(scene.value)
      selectedCaseKeys.value = options.caseIds
        .map(caseId => `${sceneKey}:${String(caseId)}`)
        .filter(key => caseRowsByKey.has(key))
    }
  } catch (error: any) {
    scene.value = record
    loadSelectionRows(record, options.caseIds || [])
    Message.error(error?.message || '读取场景用例和执行记录失败')
  } finally {
    loading.value = false
  }
}

function loadSelectionRows(record: any, preferredCaseIds: string[]) {
  if (isSceneSelection.value) {
    loadScenes(record)
    return
  }
  loadCases(record, preferredCaseIds)
}

function loadScenes(record: any) {
  const sourceScenes = Array.isArray(record?.__planScenes) && record.__planScenes.length
    ? record.__planScenes
    : [record]
  sceneRows.value = sourceScenes.map((sourceScene: any) => {
    const sceneKey = getSceneKey(sourceScene)
    const sceneId = String(sourceScene?.sceneId || sourceScene?.id || sceneKey || '-')
    const sceneName = String(sourceScene?.name || sourceScene?.sceneName || sceneId)
    const caseIds = (Array.isArray(sourceScene?.caseList) ? sourceScene.caseList : [])
      .filter(isExecutableCase)
      .map((item: any) => String(item.id))
    const selectAllCases = Boolean(sourceScene?.__projectedDefinition)
    const latest = getExecutionBatchRows(
      sourceScene,
      executionContext.value.recordSource || 'debug',
      executionContext.value.testPlanId,
    ).find((item) => item.executionType === executionType.value)
    return {
      rowKey: sceneKey,
      sceneKey,
      sceneId,
      sceneName,
      caseTotal: selectAllCases ? Number(sourceScene?.__caseTotal || caseIds.length) : caseIds.length,
      caseIds,
      selectAllCases,
      definitionVersion: sourceScene?.definitionVersion,
      executeStatus: latest?.executeStatus || sourceScene?.executeStatus || 'not_started',
      lastResult: latest?.executeResult || sourceScene?.executeResult || '',
      duration: latest?.duration ?? sourceScene?.duration,
      // 场景级执行编号使用批次号，避免把某一个用例的编号误当作场景编号。
      executionId: latest?.batchId || sourceScene?.executionId || '-',
    }
  }).filter((item) => item.selectAllCases || item.caseIds.length > 0)
  selectedCaseKeys.value = sceneRows.value.map((item) => item.rowKey)
}

function loadCases(record: any, preferredCaseIds: string[], preserveSelection = false) {
  const sourceScenes = Array.isArray(record?.__planScenes) && record.__planScenes.length
    ? record.__planScenes
    : [record]
  const latestByCase = new Map<string, ExecutionHistoryCaseRow>()
  sourceScenes.forEach((sourceScene: any) => {
    const sceneKey = getSceneKey(sourceScene)
    getExecutionHistoryRows(
      sourceScene,
      executionContext.value.recordSource || 'debug',
      executionContext.value.testPlanId,
    )
      .filter((item) => item.executionType === executionType.value)
      .forEach((item) => {
        const key = `${sceneKey}:${item.caseId}`
        if (item.caseId !== '-' && !latestByCase.has(key)) latestByCase.set(key, item)
      })
  })
  const preferredIds = new Set(preferredCaseIds.map(String))
  cases.value = sourceScenes.flatMap((sourceScene: any) => {
    const sceneKey = getSceneKey(sourceScene)
    const sceneId = String(sourceScene?.sceneId || sourceScene?.id || sceneKey || '-')
    const sceneName = String(sourceScene?.name || sourceScene?.sceneName || sceneId)
    const executableCases = (Array.isArray(sourceScene?.caseList) ? sourceScene.caseList : [])
      .filter(isExecutableCase)
    const rows = executableCases
      .filter((item: any) => !selectionDisabled.value || !preferredIds.size || preferredIds.has(String(item.id)))
      .map((item: any) => {
        const caseId = String(item.id)
        const latest = latestByCase.get(`${sceneKey}:${caseId}`)
        return {
          rowKey: `${sceneKey}:${caseId}`,
          sceneKey,
          sceneId,
          sceneName,
          sceneCaseTotal: Number(sourceScene?.__caseTotal || executableCases.length),
          caseId,
          name: item.name || caseId,
          stepTotal: executableStepCount(item),
          executeStatus: latest?.executeStatus || 'not_started',
          lastResult: latest?.executeResult || '',
          duration: latest?.duration,
          executionId: latest?.executionId || '-',
        }
      })
    rows.forEach((row) => {
      caseRowsByKey.set(row.rowKey, row)
      if (sourceScene?.__projectedDefinition) rememberProjectedCase(sourceScene, executableCases
        .find((item: any) => String(item.id) === row.caseId))
    })
    return rows
  })
  if (!preserveSelection) {
    selectedCaseKeys.value = selectionDisabled.value
      ? cases.value.map((item) => item.rowKey)
      : cases.value.filter((item) => preferredIds.has(item.caseId)).map((item) => item.rowKey)
  }
}

function rememberProjectedCase(sourceScene: any, item: any) {
  if (!item?.id) return
  const sceneKey = getSceneKey(sourceScene)
  const rowKey = `${sceneKey}:${String(item.id)}`
  if (!caseRowsByKey.has(rowKey)) {
    caseRowsByKey.set(rowKey, {
      rowKey,
      sceneKey,
      sceneId: String(sourceScene?.sceneId || sourceScene?.id || sceneKey || '-'),
      sceneName: String(sourceScene?.name || sourceScene?.sceneName || sceneKey || '-'),
      sceneCaseTotal: Number(sourceScene?.__caseTotal || 0),
      caseId: String(item.id),
      name: item.name || String(item.id),
      stepTotal: executableStepCount(item),
      executeStatus: 'not_started',
      lastResult: '',
      duration: undefined,
      executionId: '-',
    })
  }
}

async function loadProjectedCasePage(page: number, size: number) {
  if (!scene.value?.id || loading.value) return
  loading.value = true
  try {
    const next = await loadAutomationUiExecutionSelectionScene(String(scene.value.id), scene.value, undefined, {
      projectedPage: page,
      projectedPageSize: size,
    })
    scene.value = next
    projectedPagination.current = Number(next.__projectedCasePage || page)
    projectedPagination.pageSize = Number(next.__projectedCasePageSize || size)
    projectedPagination.total = Number(next.__caseTotal || 0)
    loadCases(next, [], true)
  } catch (error: any) {
    Message.error(error?.message || '读取用例分页失败')
  } finally {
    loading.value = false
  }
}

function selectFilteredCases() {
  const selected = new Set(selectedCaseKeys.value.map(String))
  filteredRows.value.forEach((item) => selected.add(item.rowKey))
  selectedCaseKeys.value = [...selected]
}

function nextStep() {
  const selectedRows = selectedCaseKeys.value.map(String)
  const selectedCaseIds = selectedRows
    .map(key => caseRowsByKey.get(key)?.caseId)
    .filter((caseId): caseId is string => Boolean(caseId))
  const payloadScene = scene.value?.__projectedDefinition && !isSceneSelection.value
    ? {
        ...scene.value,
        caseList: selectedRows
          .map(key => caseRowsByKey.get(key))
          .filter((item): item is SelectableCase => Boolean(item))
          .map(item => ({ id: item.caseId, name: item.name, stepCount: item.stepTotal, __stepCount: item.stepTotal })),
      }
    : scene.value
  emit('next', {
    scene: payloadScene,
    executionType: executionType.value,
    caseIds: isSceneSelection.value
      ? sceneRows.value
        .filter((item) => selectedRows.includes(item.rowKey))
        .flatMap((item) => item.caseIds)
      : selectedCaseIds,
    sceneIds: isSceneSelection.value
      ? sceneRows.value
        .filter((item) => selectedRows.includes(item.rowKey))
        .map((item) => item.sceneKey)
      : undefined,
    selectionDisabled: selectionDisabled.value,
    ...executionContext.value,
  })
  visible.value = false
}

function getSceneKey(record: any) {
  // Runner/CDP 的实时事件使用业务场景 ID，优先使用 sceneId 保证历史状态与实时状态能对应。
  return String(record?.sceneId || record?.id || record?.sceneKey || record?.name || 'scene-unknown')
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.case-select-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.case-select-search {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.case-select-search :deep(.arco-input-wrapper) {
  max-width: 520px;
}

.case-select-summary {
  color: var(--color-text-3);
  font-size: 13px;
}

.case-select-summary strong {
  color: rgb(var(--primary-6));
}

:deep(.arco-table-body) {
  min-height: 0px;
}

@media (max-width: 700px) {
  .case-select-search {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
