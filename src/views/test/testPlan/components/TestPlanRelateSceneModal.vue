<template>
  <a-modal
    v-model:visible="visible"
    title="关联测试场景"
    :width="1600"
    :mask-closable="false"
    unmount-on-close
    modal-class="test-plan-relate-modal"
    @close="handleClose"
  >
    <GiPageLayout
      :default-collapsed="true"
      :gutter="16"
      :margin="false"
      :padding="false"
      :left-style="{ width: 280 }"
      class="relate-scene-layout"
    >
      <template #left>
        <div class="relate-left">
          <a-select
            v-model="selectedProjectId"
            size="small"
            class="project-select"
            :options="projectOptions"
            placeholder="请选择项目"
            disabled
            allow-search
            :fallback-option="false"
            @change="onProjectChange"
          />
          <div class="relate-tree-wrap">
            <GiTree
              title="功能模块"
              :searchable="false"
              :tree-data="displayTreeList"
              :loading="treeLoading"
              :selected-keys="treeSelectedKeys"
              :multiple="false"
              :check-strictly="true"
              :draggable="false"
              @update:selected-keys="(val) => (treeSelectedKeys = val)"
              @node-click="onNodeClick"
            >
              <template #right-menu />
            </GiTree>
          </div>
          <div class="relate-tree-search-wrap">
            <a-input
              v-model="treeKeyword"
              size="small"
              class="relate-tree-search"
              allow-clear
              :maxlength="20"
              placeholder="请输入关键词"
            >
              <template #prefix><icon-search /></template>
            </a-input>
          </div>
        </div>
      </template>

      <div class="relate-scene-body">
        <div class="scene-type-bar">
          <span class="scene-type-bar__item scene-type-bar__item--active">UI 自动化测试</span>
        </div>

        <GiTable
          v-if="modalContentReady"
          v-model:selected-keys="selectedKeys"
          class="relate-scene-table"
          size="small"
          title=""
          row-key="id"
          :data="tableData"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: '100%', y: '100%'}"
          :row-selection="{ type: 'checkbox', showCheckedAll: true }"
          :show-selection-alert="false"
          @select="select"
          @select-all="selectAll"
          @refresh="search"
        >
          <template #top>
            <GiForm
              v-model="queryForm"
              :columns="queryFormColumns"
              size="medium"
              search
              :search-card="true"
              :search-columns-per-row="3"
              :search-control-min-width="210"
              :search-label-width="60"
              :grid-props="queryGridProps"
              search-btn-text="查询"
              :search-on-change="!modalInitializing"
              @search="onFormSearch"
              @reset="reset"
            />
          </template>

          <template #toolbar-left>
            <a-button type="primary" :loading="relateAllLoading" @click="onRelateAll">
              关联所有场景
            </a-button>
          </template>

          <template #executeStatus="{ record }">
            <GiCellTag
              v-if="pickSceneExecuteField(record, 'executeStatus', status_type)"
              :value="pickSceneExecuteField(record, 'executeStatus', status_type)"
              :dict="status_type"
            />
            <span v-else>-</span>
          </template>
          <template #executeResult="{ record }">
            <GiCellTag
              v-if="pickSceneExecuteField(record, 'executeResult', status_type)"
              :value="pickSceneExecuteField(record, 'executeResult', status_type)"
              :dict="status_type"
            />
            <span v-else>-</span>
          </template>
        </GiTable>
      </div>
    </GiPageLayout>

    <template #footer>
      <div class="relate-modal-footer">
        <span class="relate-modal-footer__tip">已选中 {{ selectedKeys.length }} 条数据</span>
        <a-space>
          <a-button @click="handleClose">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="handleOk">确定</a-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="tsx">
import { Message, type TableInstance } from '@arco-design/web-vue'
import type { TestPlanResp } from '@/apis/test/testPlan'
import { getTestPlan, relateTestPlanScenes } from '@/apis/test/testPlan'
import {
  type AutomationUiSceneQuery,
} from '@/apis/automation/automationUiScene'
import { getAutomationUiSceneSummaryPage, postAutomationUiSceneSummaryPage } from '@/apis/automation/automationUiQuery'
import { mapDebugSceneSummary } from '@/views/automation/automationUiScene/sceneSummary'
import { useUiStore } from '@/stores/modules/uiStore'
import { useDict } from '@/hooks/app'
import { useResetReactive, useTable } from '@/hooks'
import type { ColumnItem } from '@/components/GiForm'
import { GiCellTag, GiCellTags } from '@/components/GiCell'
import { formatDuration } from '@/utils/sakura'
import {
  filterSceneResultOptions,
  filterSceneStatusOptions,
  pickSceneExecuteField,
} from '@/utils/automationUiSceneStatus'
import {
  buildProjectSelectOptions,
  initUiStoreForPlan,
  loadModuleTree,
  resolveVersionId,
  toIdString,
} from '../utils/projectContext'
import { toIdStringList } from '@/utils/id'
import type { TreeCateItem } from '@/stores/modules/uiStore'

defineOptions({ name: 'TestPlanRelateSceneModal' })

const props = defineProps<{
  plan: TestPlanResp | null
}>()

const emit = defineEmits<{
  (e: 'success'): void
}>()

const visible = defineModel<boolean>('visible', { default: false })

const uiStore = useUiStore()
const { scene_level, status_type } = useDict('scene_level', 'status_type')

const treeSelectedKeys = ref<string[]>([])
const treeList = ref<TreeCateItem[]>([])
const treeKeyword = ref('')
const treeLoading = ref(false)
const submitting = ref(false)
const relateAllLoading = ref(false)
const selectedProjectId = ref('')
const versionIdStr = ref('')
const excludeSceneIds = ref<string[]>([])
/** 批量同步 queryForm 期间抑制 uiStore.versionId watch 的重复 search */
const modalInitializing = ref(false)
/** 初始化完成前拦截 pagination 挂载触发的空查询，避免与 initModal.search 重复请求 */
const sceneListEnabled = ref(false)
const modalContentReady = ref(false)

const loadExcludeSceneIds = async () => {
  if (!props.plan?.id) {
    excludeSceneIds.value = []
    return
  }
  try {
    const { data } = await getTestPlan(props.plan.id)
    excludeSceneIds.value = toIdStringList(data?.uiTestScene ?? props.plan.uiTestScene ?? [])
  } catch {
    excludeSceneIds.value = toIdStringList(props.plan?.uiTestScene ?? [])
  }
}

const buildSceneQuery = (page?: Record<string, unknown>) => ({
  ...queryForm,
  projectId: selectedProjectId.value || queryForm.projectId,
  versionId: queryForm.versionId || uiStore.versionId,
  recordSource: 'debug' as const,
  ...(excludeSceneIds.value.length ? { excludeIds: excludeSceneIds.value } : {}),
  ...page,
})

const querySummaryPage = (query: AutomationUiSceneQuery, signal?: AbortSignal) =>
  query.excludeIds?.length
    ? postAutomationUiSceneSummaryPage(query, signal)
    : getAutomationUiSceneSummaryPage(query, signal)

const projectOptions = computed(() =>
  buildProjectSelectOptions(
    uiStore.projectList,
    selectedProjectId.value || props.plan?.projectId,
    props.plan?.projectName,
  ),
)

const filterTreeByKeyword = (nodes: TreeCateItem[], keyword: string): TreeCateItem[] => {
  const key = keyword.trim().toLowerCase()
  if (!key) return nodes
  const loop = (data: TreeCateItem[]): TreeCateItem[] => {
    const result: TreeCateItem[] = []
    data.forEach((item) => {
      const name = String(item.name || '').toLowerCase()
      const children = item.children?.length ? loop(item.children as TreeCateItem[]) : []
      if (name.includes(key) || children.length) {
        result.push({ ...item, children: children.length ? children : item.children })
      }
    })
    return result
  }
  return loop(nodes)
}

const displayTreeList = computed(() => filterTreeByKeyword(treeList.value, treeKeyword.value))

const [queryForm, resetForm] = useResetReactive<AutomationUiSceneQuery>({
  sceneId: undefined,
  name: undefined,
  projectId: undefined,
  versionId: undefined,
  moduleId: undefined,
  level: undefined,
  executeStatus: undefined,
  executeResult: undefined,
  createUser: undefined,
  updateUser: undefined,
  createTime: [],
  sort: ['createTime,desc'],
})

const {
  tableData,
  loading,
  pagination,
  search: tableSearch,
  select,
  selectAll,
  selectedKeys,
} = useTable(
  (page) => {
    if (!sceneListEnabled.value) {
      return Promise.resolve({ data: { list: [], total: 0 } } as any)
    }
    return querySummaryPage(buildSceneQuery(page)).then(response => ({
      data: {
        list: (response.data?.list || []).map(mapDebugSceneSummary),
        total: response.data?.total || 0,
      },
    }) as any)
  },
  { immediate: false },
)

const search = () => {
  sceneListEnabled.value = true
  tableSearch()
}

/** GiForm 自动/手动查询入口，初始化批量改表单时不重复触发 */
const onFormSearch = () => {
  if (modalInitializing.value) return
  search()
}

const queryGridProps = { cols: 24, colGap: 16, rowGap: 0 }
const queryFieldSpan = { xs: 24, sm: 8, xxl: 8 }

const queryFormColumns = computed<ColumnItem[]>(() => [
  { type: 'input', label: '场景 ID', field: 'sceneId', span: queryFieldSpan, props: { allowClear: true } },
  { type: 'input', label: '场景名称', field: 'name', span: queryFieldSpan, props: { allowClear: true } },
  {
    type: 'select',
    label: '场景版本',
    field: 'versionId',
    span: queryFieldSpan,
    props: { options: uiStore.versionList, allowClear: true },
  },
  { type: 'select', label: '场景等级', field: 'level', span: queryFieldSpan, props: { options: scene_level.value, allowClear: true } },
  {
    type: 'select',
    label: '执行状态',
    field: 'executeStatus',
    span: queryFieldSpan,
    props: { options: filterSceneStatusOptions(status_type.value), allowClear: true },
  },
  {
    type: 'select',
    label: '执行结果',
    field: 'executeResult',
    span: queryFieldSpan,
    props: { options: filterSceneResultOptions(status_type.value), allowClear: true },
  },
  {
    type: 'select',
    label: '创建人',
    field: 'createUser',
    span: queryFieldSpan,
    foldable: true,
    props: { options: uiStore.userList, allowClear: true },
  },
  {
    type: 'select',
    label: '更新人',
    field: 'updateUser',
    span: queryFieldSpan,
    foldable: true,
    props: { options: uiStore.userList, allowClear: true },
  },
  {
    type: 'range-picker',
    label: '创建时间',
    field: 'createTime',
    span: queryFieldSpan,
    foldable: true,
    props: { showTime: true, format: 'YYYY-MM-DD HH:mm:ss' },
  },
])

const columns: TableInstance['columns'] = [
  { title: '场景 ID', dataIndex: 'sceneId', width: 170, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '场景名称', dataIndex: 'name', width: 330, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '场景版本', dataIndex: 'versionName', width: 120, align: 'center' },
  { title: '场景等级', dataIndex: 'level', width: 90, align: 'center' },
  {
    title: '标签',
    dataIndex: 'tags',
    width: 100,
    align: 'center',
    render: ({ record }) => (Array.isArray(record.tags) ? <GiCellTags data={record.tags} /> : '-'),
  },
  { title: '执行状态', dataIndex: 'executeStatus', slotName: 'executeStatus', width: 90, align: 'center' },
  { title: '执行结果', dataIndex: 'executeResult', slotName: 'executeResult', width: 100, align: 'center' },
  {
    title: '通过率',
    dataIndex: 'scenePassRate',
    width: 80,
    align: 'center',
    render: ({ record }) =>
      Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].scenePassRate : '-',
  },
  {
    title: '运行耗时',
    width: 90,
    align: 'center',
    render: ({ record }) =>
      formatDuration(Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].duration : '-'),
  },
  {
    title: '用例数',
    width: 80,
    align: 'center',
    render: ({ record }) =>
      Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseTotal : '-',
  },
  {
    title: '通过',
    width: 70,
    align: 'center',
    render: ({ record }) =>
      Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].casePass : '-',
  },
  { title: '失败', dataIndex: 'caseFail', width: 70, align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseFail : '-' },
  { title: '跳过', dataIndex: 'caseSkip', width: 70, align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseSkip : '-' },
  { title: '步骤数', dataIndex: 'stepTotal', width: 80, align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepTotal : '-' },
  { title: '通过', dataIndex: 'stepPass', width: 70, align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepPass : '-' },
  { title: '失败', dataIndex: 'stepFail', width: 70, align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepFail : '-' },
  { title: '跳过', dataIndex: 'stepSkip', width: 70, align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepSkip : '-' },
  // { title: '创建人', dataIndex: 'createUserString', slotName: 'createUserString', width: 120 },
  // { title: '更新人', dataIndex: 'updateUserString', slotName: 'updateUserString', width: 120 },
  { title: '执行人', dataIndex: 'executeName', width: 110, align: 'center', render: ({ record }) => Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].executeName : '-' },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true },
  { title: '更新时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true },
]

const syncQueryProject = () => {
  queryForm.projectId = selectedProjectId.value as any
  queryForm.versionId = uiStore.versionId as any
}

const reset = async () => {
  modalInitializing.value = true
  resetForm()
  syncQueryProject()
  uiStore.moduleId = ''
  treeSelectedKeys.value = []
  await nextTick()
  modalInitializing.value = false
  search()
}

const onNodeClick = (data: any) => {
  const id = toIdString(data?.id || data?.node?.id)
  uiStore.moduleId = id
  queryForm.moduleId = id || undefined
  treeSelectedKeys.value = id ? [id] : []
}

const refreshModuleTreeLocal = async (options?: { force?: boolean }) => {
  const projectId = selectedProjectId.value
  let versionId = versionIdStr.value || toIdString(queryForm.versionId) || toIdString(uiStore.versionId)
  if (!versionId) {
    versionId = resolveVersionId(uiStore.versionList, props.plan ?? undefined)
    versionIdStr.value = versionId
    if (versionId) uiStore.versionId = versionId
  }
  if (!projectId || !versionId) {
    treeList.value = []
    return
  }
  treeLoading.value = true
  try {
    treeList.value = await loadModuleTree(projectId, versionId, options)
  } catch {
    treeList.value = []
  } finally {
    treeLoading.value = false
  }
}

const onProjectChange = async () => {
  const projectId = selectedProjectId.value
  if (!projectId) return
  uiStore.projectId = projectId
  await uiStore.fetchVersions(projectId)
  // 切换项目后版本变化，需强制刷新模块树
  let versionId = toIdString(uiStore.versionId)
  if (!versionId && uiStore.versionList.length) {
    versionId = toIdString(uiStore.versionList[0].value)
    uiStore.versionId = versionId
  }
  versionIdStr.value = versionId || resolveVersionId(uiStore.versionList, props.plan ?? undefined)
  if (versionIdStr.value) uiStore.versionId = versionIdStr.value
  await refreshModuleTreeLocal({ force: true })
  modalInitializing.value = true
  try {
    syncQueryProject()
    uiStore.moduleId = ''
    treeSelectedKeys.value = []
  } finally {
    modalInitializing.value = false
    search()
  }
}

const relateByIds = async (ids: string[]) => {
  if (!props.plan?.id) return
  const unique = toIdStringList(ids)
  if (!unique.length) {
    Message.warning('请选择场景')
    return false
  }
  submitting.value = true
  try {
    await relateTestPlanScenes(props.plan.id, unique)
    Message.success('关联成功')
    emit('success')
    visible.value = false
    return true
  } finally {
    submitting.value = false
  }
}

const handleOk = async () => {
  await relateByIds(toIdStringList(selectedKeys.value))
}

const onRelateAll = async () => {
  relateAllLoading.value = true
  try {
    const ids: string[] = []
    const size = 50
    let page = 1
    let total = 0
    do {
      const response = await querySummaryPage(buildSceneQuery({ page, size }))
      const rows = response.data?.list || []
      total = response.data?.total || 0
      ids.push(...rows.map(row => toIdString(row.sceneDbId)))
      if (ids.length >= total) break
      if (ids.length >= 10_000) {
        throw new Error('当前筛选结果超过 10000 条，请缩小范围后关联')
      }
      page += 1
    } while (ids.length < total)
    await relateByIds(ids)
  } catch (error: any) {
    Message.error(error?.message || '读取可关联场景失败，请重试')
  } finally {
    relateAllLoading.value = false
  }
}

const handleClose = () => {
  sceneListEnabled.value = false
  modalContentReady.value = false
  visible.value = false
}

const initModal = async () => {
  if (!props.plan) return
  sceneListEnabled.value = false
  modalContentReady.value = false
  modalInitializing.value = true
  try {
    await loadExcludeSceneIds()
    const { projectId, versionId } = await initUiStoreForPlan(uiStore, props.plan)
    selectedProjectId.value = projectId
    versionIdStr.value = versionId || resolveVersionId(uiStore.versionList, props.plan ?? undefined)
    if (versionIdStr.value) uiStore.versionId = versionIdStr.value
    await refreshModuleTreeLocal()
    syncQueryProject()
    uiStore.moduleId = ''
    treeSelectedKeys.value = []
    selectedKeys.value = []
  } finally {
    modalContentReady.value = true
    await nextTick()
    modalInitializing.value = false
    search()
  }
}

watch(visible, (val) => {
  if (val) void initModal()
})

/** 筛选区切换场景版本时刷新左侧模块树（对齐 AutomationUiScene） */
watch(
  () => queryForm.versionId,
  async (newVersionId, oldVersionId) => {
    if (modalInitializing.value) return
    if (!visible.value || !newVersionId || !oldVersionId || newVersionId === oldVersionId) return
    const vid = toIdString(newVersionId)
    versionIdStr.value = vid
    uiStore.versionId = vid
    uiStore.moduleId = ''
    treeSelectedKeys.value = []
    queryForm.moduleId = undefined
    await refreshModuleTreeLocal({ force: true })
  },
)

watch(
  () => uiStore.versionId,
  async (versionId, oldVersionId) => {
    if (modalInitializing.value) return
    if (!visible.value || !versionId || versionId === oldVersionId) return
    if (toIdString(queryForm.versionId) === toIdString(versionId)) return
    modalInitializing.value = true
    try {
      queryForm.versionId = versionId as any
      versionIdStr.value = toIdString(versionId)
      uiStore.moduleId = ''
      treeSelectedKeys.value = []
      queryForm.moduleId = undefined
      await refreshModuleTreeLocal({ force: true })
    } finally {
      modalInitializing.value = false
      search()
    }
  },
)
</script>

<script lang="tsx">
export default {}
</script>

<style scoped lang="scss">
.relate-scene-layout {
  height: min(700px, calc(100vh - 180px));
  min-height: 0;

  :deep(.gi-page-layout) {
    display: flex;
    flex-wrap: nowrap;
    height: 100%;
    min-height: 0;
  }

  :deep(.arco-col) {
    height: 100%;
  }

  :deep(.gi-page-layout__left) {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 8px 16px 8px 0px !important;
    overflow: hidden;
    box-sizing: border-box;
  }

  :deep(.gi-page-layout__body) {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    min-width: 0;
    min-height: 0;
    padding: 0px 8px 8px 8px !important;
    overflow: hidden;
  }

  :deep(.gi-page-layout--margin) {
    margin: 0;
  }

  :deep(.gi-page-layout__divider) {
    z-index: 2;
  }

  :deep(.gi-split-button) {
    z-index: 3;
  }
}

.relate-left {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;

  .project-select {
    flex: none;
    flex-shrink: 0;
    width: 100%;
    height: 30px;
    margin-bottom: 10px;
  }
}

.relate-tree-wrap {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 5px;
  overflow: hidden;

  :deep(.gi-tree) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.gi-tree__tree) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
}

.relate-tree-search-wrap {
  flex: none;
  flex-shrink: 0;
  padding-top: 8px;
  background: var(--color-bg-1);
}

.relate-tree-search {
  width: 100%;
}

.relate-scene-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.scene-type-bar {
  flex: none;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--color-border-2);

  &__item {
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 16px;
    color: var(--color-text-2);
    font-size: 14px;
    border: 1px solid var(--color-border-2);
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    background: var(--color-bg-2);

    &--active {
      margin-bottom: -1px;
      color: rgb(var(--primary-6));
      background: var(--color-bg-1);
      font-weight: 500;
    }
  }
}

.relate-scene-table {
  flex: 1;
  min-height: 0;

  :deep(.gi-table) {
    height: 100%;
    min-height: 0;
    padding: 0;
  }
}

.relate-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  &__tip {
    color: var(--color-text-2);
    font-size: 14px;
  }
}
</style>

<style lang="scss">
.test-plan-relate-modal {
  .arco-modal-body {
    padding: 8px 12px 5px 10px;
  }
}
</style>
