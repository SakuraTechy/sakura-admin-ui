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
          <a-option value="未执行">未执行</a-option>
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
            <a-table-column title="场景 ID" data-index="sceneId" :width="200" ellipsis tooltip />
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
                {{ selectionStatusLabel(record.executeStatus) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="上次结果" :width="100" align="center">
            <template #cell="{ record }">
              <a-tag v-if="record.lastResult" :color="executionResultColor(record.lastResult)">
                {{ executionAggregateResultLabel(record.lastResult) }}
              </a-tag>
              <span v-else>未执行</span>
            </template>
          </a-table-column>
          <a-table-column title="运行耗时" :width="120" align="center">
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
        <a-button type="primary" :disabled="loading || selectedCaseKeys.length === 0" @click="nextStep">
          下一步
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import {
  type SelectionExecutionState,
  caseSelectionExecution,
  emptySelectionExecution,
  sceneSelectionExecution,
  selectionDuration,
  selectionStatusLabel,
  withSelectionLiveExecution,
} from '../executionSelectionState'
import {
  type ExecutionCaseOpenOptions,
  type ExecutionContext,
  type ExecutionType,
  type LiveExecutionCase,
  executionAggregateResultLabel,
  executionResultColor,
  executionStatusColor,
  executionTypeLabel,
  executableStepCount,
  formatExecutionDuration,
  isExecutableCase,
} from '../execution'
import { loadAutomationUiExecutionSelectionScene, mapWithConcurrency } from '../queryCache'
import { getAutomationUiExecutionCaseHistory, getAutomationUiExecutions } from '@/apis/automation/automationUiQuery'

interface SelectableCase extends SelectionExecutionState {
  sceneDbId: string
  rowKey: string
  sceneKey: string
  sceneId: string
  sceneName: string
  sceneCaseTotal: number
  caseId: string
  name: string
  stepTotal: number
}

interface SelectableScene extends SelectionExecutionState {
  sceneDbId: string
  rowKey: string
  sceneKey: string
  sceneId: string
  sceneName: string
  caseTotal: number
  caseIds: string[]
  selectAllCases: boolean
  definitionVersion?: number
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
const clock = ref(Date.now())
let loadController: AbortController | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined

function stopLoading() {
  loadController?.abort()
  loadController = undefined
  loading.value = false
}

watch(visible, (open) => {
  if (clockTimer) clearInterval(clockTimer)
  clockTimer = undefined
  if (open) {
    clock.value = Date.now()
    clockTimer = setInterval(() => {
      clock.value = Date.now()
    }, 1000)
  } else {
    stopLoading()
  }
})
onBeforeUnmount(() => {
  stopLoading()
  if (clockTimer) clearInterval(clockTimer)
})
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

const scopedLiveExecutions = computed(() => props.liveExecutions.filter((item) => (
  item.executionType === executionType.value
  && (item.recordSource || 'debug') === (executionContext.value.recordSource || 'debug')
  && (executionContext.value.recordSource !== 'test'
    || String(item.testPlanId || '') === String(executionContext.value.testPlanId || ''))
  && (!executionContext.value.testReportId
    || String(item.testReportId || '') === String(executionContext.value.testReportId))
)))
const casesWithLiveStatus = computed(() => cases.value.map((item) => {
  // 旧实时消息的 sceneKey 可能是数据库 ID，也可能是业务 ID；不能只凭 caseId 跨场景匹配。
  const sceneIds = [item.sceneDbId, item.sceneId, item.sceneKey].filter(Boolean)
  const liveRows = scopedLiveExecutions.value.filter((live) => live.caseId === item.caseId
    && [live.sceneKey, live.sceneId].some((id) => id && sceneIds.includes(String(id))))
  const state = liveRows.reduce<SelectionExecutionState>(withSelectionLiveExecution, item)
  return { ...item, ...state, duration: selectionDuration(state, clock.value) }
}))
const scenesWithDuration = computed(() => sceneRows.value.map((item) => ({
  ...item,
  duration: selectionDuration(item, clock.value),
})))
const filteredCases = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return casesWithLiveStatus.value.filter((item) => (
    (!search
      || item.sceneId.toLowerCase().includes(search)
      || item.sceneName.toLowerCase().includes(search)
      || item.caseId.toLowerCase().includes(search)
      || item.name.toLowerCase().includes(search))
    && (!statusFilter.value || selectionStatusLabel(item.executeStatus) === statusFilter.value)
    && matchesResultFilter(item.lastResult)
  ))
})
const filteredScenes = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return scenesWithDuration.value.filter((item) => (
    (!search || item.sceneId.toLowerCase().includes(search) || item.sceneName.toLowerCase().includes(search))
    && (!statusFilter.value || selectionStatusLabel(item.executeStatus) === statusFilter.value)
    && matchesResultFilter(item.lastResult)
  ))
})
const filteredRows = computed(() => isSceneSelection.value ? filteredScenes.value : filteredCases.value)

function matchesResultFilter(value: unknown) {
  return !resultFilter.value || executionAggregateResultLabel(value) === resultFilter.value
}

async function onOpen(
  record: any,
  type: Exclude<ExecutionType, 'jenkins'>,
  options: ExecutionCaseOpenOptions = {},
) {
  stopLoading()
  const controller = new AbortController()
  loadController = controller
  executionType.value = type
  executionContext.value = {
    recordSource: options.recordSource || 'debug',
    testPlanId: options.testPlanId,
    testReportId: options.testReportId,
  }
  keyword.value = ''
  statusFilter.value = ''
  resultFilter.value = ''
  selectedCaseKeys.value = []
  caseRowsByKey.clear()
  projectedPagination.current = 1
  projectedPagination.pageSize = 20
  projectedPagination.total = 0
  scene.value = undefined
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
          ? await loadAutomationUiExecutionSelectionScene(String(record.id), record, controller.signal, (
              options.selectionDisabled && options.caseIds?.length
                ? { projectedCaseIds: options.caseIds }
                : { projectedPage: 1, projectedPageSize: projectedPagination.pageSize }
            ))
          : record
    if (controller.signal.aborted) return
    scene.value = detail || record
    if (scene.value?.__projectedDefinition) {
      existingCases.forEach((item: any) => rememberProjectedCase(scene.value, item))
      projectedPagination.current = Number(scene.value.__projectedCasePage || 1)
      projectedPagination.pageSize = Number(scene.value.__projectedCasePageSize || projectedPagination.pageSize)
      projectedPagination.total = Number(scene.value.__caseTotal || 0)
    }
    await loadSelectionRows(scene.value, options.caseIds || [], controller.signal)
    if (controller.signal.aborted) return
    if (scene.value?.__projectedDefinition && !selectionDisabled.value && options.caseIds?.length) {
      const sceneKey = getSceneKey(scene.value)
      selectedCaseKeys.value = options.caseIds
        .map(caseId => `${sceneKey}:${String(caseId)}`)
        .filter(key => caseRowsByKey.has(key))
    }
  } catch (error: any) {
    if (!controller.signal.aborted) Message.error(error?.message || '读取场景用例和执行记录失败')
  } finally {
    if (loadController === controller) loading.value = false
  }
}

async function loadSelectionRows(record: any, preferredCaseIds: string[], signal: AbortSignal) {
  if (isSceneSelection.value) {
    await loadScenes(record, signal)
    return
  }
  await loadCases(record, preferredCaseIds, signal)
}

async function loadScenes(record: any, signal: AbortSignal) {
  const sourceScenes = Array.isArray(record?.__planScenes) && record.__planScenes.length
    ? record.__planScenes
    : [record]
  const rows = await mapWithConcurrency<any, SelectableScene>(sourceScenes, 6, async (sourceScene) => {
    const sceneKey = getSceneKey(sourceScene)
    const sceneId = String(sourceScene?.sceneId || sourceScene?.id || sceneKey || '-')
    const sceneName = String(sourceScene?.name || sourceScene?.sceneName || sceneId)
    const caseIds = (Array.isArray(sourceScene?.caseList) ? sourceScene.caseList : [])
      .filter(isExecutableCase)
      .map((item: any) => String(item.id))
    const selectAllCases = Boolean(sourceScene?.__projectedDefinition)
    const sceneDbId = String(sourceScene?.id || '')
    if (signal.aborted) throw new Error('执行记录请求已取消')
    const response = sceneDbId
      ? await getAutomationUiExecutions({
        sceneDbId,
        recordSource: executionContext.value.recordSource || 'debug',
        testPlanId: executionContext.value.testPlanId,
        testReportId: executionContext.value.testReportId,
        executionEngine: executionType.value,
        page: 1,
        size: 1,
        sort: ['createTime,desc'],
      }, signal)
      : undefined
    return {
      ...sceneSelectionExecution(response?.data.list[0]),
      sceneDbId,
      rowKey: sceneKey,
      sceneKey,
      sceneId,
      sceneName,
      caseTotal: selectAllCases ? Number(sourceScene?.__caseTotal || caseIds.length) : caseIds.length,
      caseIds,
      selectAllCases,
      definitionVersion: sourceScene?.definitionVersion,
    }
  })
  if (signal.aborted) return
  sceneRows.value = rows.filter((item) => item.selectAllCases || item.caseIds.length > 0)
  selectedCaseKeys.value = sceneRows.value.map((item) => item.rowKey)
}

async function loadCases(record: any, preferredCaseIds: string[], signal: AbortSignal, preserveSelection = false) {
  const sourceScenes = Array.isArray(record?.__planScenes) && record.__planScenes.length
    ? record.__planScenes
    : [record]
  const preferredIds = new Set(preferredCaseIds.map(String))
  const rows: SelectableCase[] = sourceScenes.flatMap((sourceScene: any) => {
    const sceneKey = getSceneKey(sourceScene)
    const sceneId = String(sourceScene?.sceneId || sourceScene?.id || sceneKey || '-')
    const sceneName = String(sourceScene?.name || sourceScene?.sceneName || sceneId)
    const executableCases = (Array.isArray(sourceScene?.caseList) ? sourceScene.caseList : [])
      .filter(isExecutableCase)
    const rows = executableCases
      .filter((item: any) => !selectionDisabled.value || !preferredIds.size || preferredIds.has(String(item.id)))
      .map((item: any) => {
        const caseId = String(item.id)
        return {
          ...emptySelectionExecution(),
          sceneDbId: String(sourceScene?.id || ''),
          rowKey: `${sceneKey}:${caseId}`,
          sceneKey,
          sceneId,
          sceneName,
          sceneCaseTotal: Number(sourceScene?.__caseTotal || executableCases.length),
          caseId,
          name: item.name || caseId,
          stepTotal: executableStepCount(item),
        }
      })
    rows.forEach((row) => {
      caseRowsByKey.set(row.rowKey, row)
      if (sourceScene?.__projectedDefinition) rememberProjectedCase(sourceScene, executableCases
        .find((item: any) => String(item.id) === row.caseId))
    })
    return rows
  })
  // 按引擎在服务端筛选后取最近一条，不能依赖已移除的 caseList 历史正文。
  const loaded = await mapWithConcurrency(rows, 6, async (row) => {
    if (signal.aborted) throw new Error('执行记录请求已取消')
    if (!row.sceneDbId) return row
    const response = await getAutomationUiExecutionCaseHistory({
      sceneDbId: row.sceneDbId,
      caseId: row.caseId,
      recordSource: executionContext.value.recordSource || 'debug',
      testPlanId: executionContext.value.testPlanId,
      testReportId: executionContext.value.testReportId,
      executionEngine: executionType.value,
    }, 1, 1, signal)
    return { ...row, ...caseSelectionExecution(response.data.list[0]) }
  })
  if (signal.aborted) return
  cases.value = loaded
  loaded.forEach((row) => caseRowsByKey.set(row.rowKey, row))
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
      ...emptySelectionExecution(),
      sceneDbId: String(sourceScene?.id || ''),
      rowKey,
      sceneKey,
      sceneId: String(sourceScene?.sceneId || sourceScene?.id || sceneKey || '-'),
      sceneName: String(sourceScene?.name || sourceScene?.sceneName || sceneKey || '-'),
      sceneCaseTotal: Number(sourceScene?.__caseTotal || 0),
      caseId: String(item.id),
      name: item.name || String(item.id),
      stepTotal: executableStepCount(item),
    })
  }
}

async function loadProjectedCasePage(page: number, size: number) {
  if (!scene.value?.id || loading.value) return
  const controller = new AbortController()
  loadController?.abort()
  loadController = controller
  loading.value = true
  try {
    const next = await loadAutomationUiExecutionSelectionScene(String(scene.value.id), scene.value, controller.signal, {
      projectedPage: page,
      projectedPageSize: size,
    })
    if (controller.signal.aborted) return
    await loadCases(next, [], controller.signal, true)
    if (controller.signal.aborted) return
    scene.value = next
    projectedPagination.current = Number(next.__projectedCasePage || page)
    projectedPagination.pageSize = Number(next.__projectedCasePageSize || size)
    projectedPagination.total = Number(next.__caseTotal || 0)
  } catch (error: any) {
    if (!controller.signal.aborted) Message.error(error?.message || '读取用例分页失败')
  } finally {
    if (loadController === controller) loading.value = false
  }
}

function selectFilteredCases() {
  const selected = new Set(selectedCaseKeys.value.map(String))
  filteredRows.value.forEach((item) => selected.add(item.rowKey))
  selectedCaseKeys.value = [...selected]
}

function nextStep() {
  if (loading.value || !selectedCaseKeys.value.length) return
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
  // 保留业务场景 ID 作为选择键；查询和实时匹配另行保留数据库 ID。
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
