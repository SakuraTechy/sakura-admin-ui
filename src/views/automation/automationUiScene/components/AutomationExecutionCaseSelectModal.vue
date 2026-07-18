<template>
  <a-modal
    v-model:visible="visible"
    :title="`${executionTypeLabel(executionType)} - 选择执行用例`"
    :width="1180"
    :mask-closable="false"
    unmount-on-close
  >
    <div class="case-select-modal">
      <a-alert type="info" show-icon>
        请选择需要执行的用例。下一步将配置产品环境和执行参数，批量任务按列表顺序串行执行。
      </a-alert>

      <div class="case-select-search">
        <a-input
          v-model="keyword"
          allow-clear
          placeholder="搜索用例 ID、用例名称"
        >
          <template #prefix><icon-search /></template>
        </a-input>
        <a-select v-model="statusFilter" allow-clear placeholder="执行状态" :style="{ width: '150px' }">
          <a-option value="not_started">未执行</a-option>
          <a-option value="waiting">等待执行</a-option>
          <a-option value="running">执行中</a-option>
          <a-option value="passed">已完成</a-option>
          <a-option value="failed">已失败</a-option>
          <a-option value="cancelled">已取消</a-option>
        </a-select>
        <a-select v-model="resultFilter" allow-clear placeholder="上次结果" :style="{ width: '140px' }">
          <a-option value="passed">通过</a-option>
          <a-option value="failed">失败</a-option>
          <a-option value="cancelled">取消</a-option>
        </a-select>
        <a-space>
          <a-button :disabled="filteredCases.length === 0" @click="selectFilteredCases">全选当前结果</a-button>
          <a-button :disabled="selectedCaseKeys.length === 0" @click="selectedCaseKeys = []">清空</a-button>
        </a-space>
      </div>

      <a-table
        v-model:selected-keys="selectedCaseKeys"
        :data="filteredCases"
        :pagination="{ pageSize: 10, showTotal: true, showPageSize: true }"
        :row-selection="{ type: 'checkbox', showCheckedAll: true }"
        row-key="caseId"
        size="small"
        :scroll="{ y: 430 }"
      >
        <template #columns>
          <a-table-column title="用例 ID" data-index="caseId" :width="170" ellipsis tooltip />
          <a-table-column title="用例名称" data-index="name" ellipsis tooltip />
          <a-table-column title="步骤数" data-index="stepTotal" :width="82" align="center" />
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
                {{ executionResultLabel(record.lastResult) }}
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
        已选择 <strong>{{ selectedCaseKeys.length }}</strong> 个用例，共 {{ cases.length }} 个可执行用例
      </div>
    </div>

    <template #footer>
      <a-space>
        <a-button @click="visible = false">取消</a-button>
        <a-button type="primary" :disabled="selectedCaseKeys.length === 0" @click="nextStep">
          下一步：执行配置
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import {
  type ExecutionType,
  type LiveExecutionCase,
  executionResultColor,
  executionResultLabel,
  executionStatusColor,
  executionStatusLabel,
  executionTypeLabel,
  formatExecutionDuration,
  getDebugExecutionHistoryRows,
  isExecutableCase,
} from '../execution'

interface SelectableCase {
  caseId: string
  name: string
  stepTotal: number
  executeStatus: unknown
  lastResult: unknown
  duration: unknown
  executionId: string
}

interface CaseSelectionPayload {
  scene: any
  executionType: Exclude<ExecutionType, 'jenkins'>
  caseIds: string[]
}

const props = withDefaults(defineProps<{
  liveExecutions?: LiveExecutionCase[]
}>(), { liveExecutions: () => [] })
const emit = defineEmits<{
  (e: 'next', payload: CaseSelectionPayload): void
}>()

const visible = ref(false)
const scene = ref<any>()
const executionType = ref<Exclude<ExecutionType, 'jenkins'>>('extension-cdp')
const keyword = ref('')
const statusFilter = ref('')
const resultFilter = ref('')
const selectedCaseKeys = ref<Array<string | number>>([])
const cases = ref<SelectableCase[]>([])

const casesWithLiveStatus = computed(() => {
  const liveByCase = new Map(props.liveExecutions.map((item) => [item.caseId, item]))
  return cases.value.map((item) => {
    const live = liveByCase.get(item.caseId)
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
    (!search || item.caseId.toLowerCase().includes(search) || item.name.toLowerCase().includes(search))
    && (!statusFilter.value || String(item.executeStatus || '').toLowerCase() === statusFilter.value)
    && (!resultFilter.value || String(item.lastResult || '').toLowerCase() === resultFilter.value)
  ))
})

function onOpen(
  record: any,
  type: Exclude<ExecutionType, 'jenkins'>,
  options?: { caseIds?: string[] },
) {
  scene.value = record
  executionType.value = type
  keyword.value = ''
  statusFilter.value = ''
  resultFilter.value = ''
  const latestByCase = new Map<string, ReturnType<typeof getDebugExecutionHistoryRows>[number]>()
  getDebugExecutionHistoryRows(record).forEach((item) => {
    if (item.caseId !== '-' && !latestByCase.has(item.caseId)) latestByCase.set(item.caseId, item)
  })
  cases.value = (Array.isArray(record?.caseList) ? record.caseList : [])
    .filter(isExecutableCase)
    .map((item: any) => {
      const caseId = String(item.id)
      const latest = latestByCase.get(caseId)
      return {
        caseId,
        name: item.name || caseId,
        stepTotal: Array.isArray(item.stepList) ? item.stepList.length : 0,
        executeStatus: latest?.executeStatus || 'not_started',
        lastResult: latest?.executeResult || '',
        duration: latest?.duration,
        executionId: latest?.executionId || '-',
      }
    })
  const preferredIds = new Set((options?.caseIds || []).map(String))
  selectedCaseKeys.value = cases.value
    .filter((item) => preferredIds.has(item.caseId))
    .map((item) => item.caseId)
  visible.value = true
}

function selectFilteredCases() {
  const selected = new Set(selectedCaseKeys.value.map(String))
  filteredCases.value.forEach((item) => selected.add(item.caseId))
  selectedCaseKeys.value = [...selected]
}

function nextStep() {
  emit('next', {
    scene: scene.value,
    executionType: executionType.value,
    caseIds: selectedCaseKeys.value.map(String),
  })
  visible.value = false
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

@media (max-width: 700px) {
  .case-select-search {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
