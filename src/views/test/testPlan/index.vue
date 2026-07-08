<template>
  <div class="gi_table_page test-plan-page">
    <a-tabs
      v-model:active-key="activeTab"
      type="card-gutter"
      size="medium"
      class="test-plan-tabs"
      :class="{ 'test-plan-tabs--scene': isSceneTabActive }"
      editable
      :show-add-button="false"
      destroy-on-hide
      @delete="onSceneTabDelete"
    >
      <a-tab-pane key="plan-list" title="计划列表" :closable="false">
        <GiTable
          class="plan-list-table"
          v-model:selectedKeys="selectedKeys"
          row-key="id"
          title=""
          :data="dataList"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          :row-selection="{ type: 'checkbox', showCheckedAll: true }"
          :show-selection-alert="true"
          :scroll="{ x: 1980, y: '100%' }"
          @refresh="search"
          @select="select"
          @select-all="selectAll"
        >
          <template #top>
            <div class="plan-query-top-slot">
              <GiForm
                v-model="queryForm"
                :columns="queryFormColumns"
                size="medium"
                search
                :search-card="true"
                :search-columns-per-row="3"
                :search-control-min-width="200"
                :search-label-width="65"
                search-btn-text="查询"
                :search-on-change="true"
                :grid-props="planQueryGridProps"
                hide-fold-btn
                class="query-form plan-query-form"
                @search="search"
                @reset="reset"
              />
            </div>
          </template>

          <template #toolbar-left>
            <a-button type="primary" @click="openForm()">
              <template #icon><icon-plus /></template>
              新建计划
            </a-button>
          </template>

          <template #toolbar-right>
            <a-button type="primary" @click="Message.info('批量导入功能待接入')">
              <template #icon><icon-upload /></template>
              批量导入
            </a-button>
            <a-button @click="onExport">
              <template #icon><icon-download /></template>
              批量导出
            </a-button>
            <a-button type="primary" status="danger" :disabled="!selectedKeys.length" @click="onDelete()">
              <template #icon><icon-delete /></template>
              批量删除
            </a-button>
          </template>

          <template #members="{ record }">
            <a-link @click="openListModal('计划成员', record.memberIds)">查看</a-link>
          </template>
          <template #principals="{ record }">
            <a-link @click="openListModal('计划负责人', record.principalIds)">查看</a-link>
          </template>
          <template #status="{ record }">
            <GiCellTag :value="record.status" :dict="planStatusOptions" />
          </template>
          <template #progress="{ record }">
            <div class="progress-cell">
              <a-progress :percent="Number(record.testProgress || 0)" size="mini" />
              <span>{{ Number(record.testProgress || 0) }}%</span>
            </div>
          </template>
          <template #action="{ record }">
            <a-space>
              <a-link @click="openForm(record)">修改</a-link>
              <a-link @click="openForm(record, true)">复制</a-link>
              <a-dropdown>
                <a-link>执行</a-link>
                <template #content>
                  <a-doption @click="openExecModal(record)">功能测试</a-doption>
                  <a-doption @click="openSceneTab(record)">UI 自动化测试</a-doption>
                </template>
              </a-dropdown>
              <a-dropdown trigger="click">
                <a-link class="more-link">
                  更多
                  <icon-down class="more-link__caret" />
                </a-link>
                <template #content>
                  <a-doption @click="openDetail(record)">详情</a-doption>
                  <a-doption @click="goToReports(record)">报告</a-doption>
                  <a-doption @click="openSceneModal(record)">关联场景</a-doption>
                  <a-doption status="danger" @click="onDelete(record)">删除</a-doption>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </GiTable>
      </a-tab-pane>

      <a-tab-pane
        v-for="tab in sceneTabs"
        :key="tab.key"
        :title="tab.record.name"
        :closable="true"
      >
        <div class="scene-tab-pane">
          <TestPlanSceneWorkspace
            :ref="(el) => setSceneWorkspaceRef(tab.key, el)"
            :plan="tab.record"
            :plan-options="scenePlanOptions"
            @switch-plan="onSwitchScenePlan"
            @relate="openRelateSceneModal(tab.record)"
            @batch-execute="(rows) => onBatchExecuteScene(rows)"
            @execute-all="() => onExecuteAllScene()"
            @execute-one="(row) => onExecuteOneScene(row)"
            @refresh="search"
          />
        </div>
      </a-tab-pane>
    </a-tabs>

    <TestPlanRelateSceneModal
      v-model:visible="relateSceneVisible"
      :plan="relateScenePlan"
      @success="onRelateSceneSuccess"
    />

    <ExecuteSceneModal ref="executeSceneModalRef" @success="onExecuteSceneSuccess" />

    <a-modal v-model:visible="formVisible" :title="formTitle" width="660px" :body-style="{ padding: '20px' }" @before-ok="submitForm">
      <a-form
        ref="planFormRef"
        :model="formState"
        layout="horizontal"
        class="plan-edit-form"
        auto-label-width
        scroll-to-first-error
        :label-col-props="{ flex: '108px' }"
        :wrapper-col-props="{ flex: '1' }"
        :rules="planFormRules"
      >
        <a-form-item field="projectId" label="所属项目" required>
          <a-select
            v-model="formState.projectId"
            :options="projectSelectOptions"
            placeholder="请选择"
            allow-search
            @change="onFormProjectChange"
          />
        </a-form-item>
        <a-form-item field="type" label="计划类型" required>
          <a-select v-model="formState.type" :options="planTypeSelectOptions" placeholder="请选择" allow-search />
        </a-form-item>
        <a-form-item field="name" label="计划名称" required>
          <a-input v-model="formState.name" placeholder="请输入" allow-clear />
        </a-form-item>
        <a-form-item field="abbreviate" label="计划简称" required>
          <a-input v-model="formState.abbreviate" placeholder="请输入" allow-clear />
        </a-form-item>
        <a-form-item field="description" label="计划描述" required>
          <a-textarea v-model="formState.description" placeholder="请输入" :auto-size="{ minRows: 3, maxRows: 6 }" allow-clear />
        </a-form-item>
        <a-form-item field="memberIds" label="计划成员" required>
          <a-select
            v-model="formState.memberIds"
            :options="userSelectOptions"
            placeholder="请选择"
            multiple
            allow-search
            :max-tag-count="3"
          />
        </a-form-item>
        <a-form-item field="principalId" label="主负责人" required>
          <a-select v-model="formState.principalId" :options="userSelectOptions" placeholder="请选择" allow-search />
        </a-form-item>
        <a-form-item field="planTimeRange" label="计划时间" required>
          <a-range-picker
            v-model="formState.planTimeRange"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
          />
        </a-form-item>
        <a-form-item field="status" label="计划状态">
          <a-select v-model="formState.status" :options="planStatusOptions" placeholder="请选择" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="execVisible" title="执行测试计划" width="560px" @ok="submitExecute">
      <a-form :model="execState" layout="vertical">
        <a-form-item label="项目环境 ID"><a-input v-model="execState.projectEnvironmentId" style="width: 100%" allow-clear /></a-form-item>
        <a-form-item label="自动化环境 ID"><a-input v-model="execState.automationEnvironmentId" style="width: 100%" allow-clear /></a-form-item>
        <a-form-item label="执行人"><a-input v-model="execState.executeName" /></a-form-item>
        <a-form-item label="执行邮箱"><a-input v-model="execState.executeEmail" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="detailVisible" title="测试计划详情" width="1040px" :footer="false">
      <a-space direction="vertical" fill>
        <a-card :bordered="false" class="detail-actions">
          <a-space>
            <a-button type="primary" @click="detailRecord && openSceneTab(detailRecord)">查看场景视图</a-button>
            <a-button @click="detailRecord && goToReports(detailRecord)">查看报告</a-button>
            <a-button @click="detailRecord && openExecModal(detailRecord)">立即执行</a-button>
          </a-space>
        </a-card>
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="计划 ID">{{ detailRecord?.id || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划名称">{{ detailRecord?.name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="所属项目">{{ detailRecord?.projectName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划类型">{{ detailRecord?.type || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划简称">{{ detailRecord?.abbreviate || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划状态">
            <GiCellTag v-if="detailRecord?.status" :value="detailRecord.status" :dict="planStatusOptions" />
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="创建人">{{ detailRecord?.createUserString || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划成员" :span="2">{{ formatUserIds(detailRecord?.memberIds) }}</a-descriptions-item>
          <a-descriptions-item label="计划负责人" :span="2">{{ formatUserIds(detailRecord?.principalIds) }}</a-descriptions-item>
          <a-descriptions-item label="关联场景 ID" :span="2">{{ formatList(detailRecord?.uiTestScene) }}</a-descriptions-item>
          <a-descriptions-item label="场景数">{{ detailRecord?.sceneCount ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="测试进度">{{ detailRecord?.testProgress ?? 0 }}%</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatPlanDateTime(detailRecord?.createTime ?? null) }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ formatPlanDateTime(detailRecord?.updateTime ?? null) }}</a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">{{ detailRecord?.description || '-' }}</a-descriptions-item>
        </a-descriptions>
      </a-space>
    </a-modal>

    <a-modal v-model:visible="listModalVisible" :title="listModalTitle" width="520px" :footer="false">
      {{ listModalContent }}
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Message, Modal, type FormInstance, type TableInstance } from '@arco-design/web-vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addTestPlan,
  deleteTestPlan,
  executeTestPlan,
  exportTestPlan,
  getTestPlan,
  listTestPlan,
  type TestPlanExecuteResp,
  type TestPlanQuery,
  type TestPlanResp,
  updateTestPlan,
} from '@/apis/test/testPlan'
import { getProjectConfigList, type ProjectConfigResp } from '@/apis/project/projectConfig'
import { getUser, listAllUser, listSystemUser, type UserResp } from '@/apis/system/user'
import { useTable } from '@/hooks'
import type { ColumnItem } from '@/components/GiForm'
import TestPlanSceneWorkspace from './components/TestPlanSceneWorkspace.vue'
import TestPlanRelateSceneModal from './components/TestPlanRelateSceneModal.vue'
import ExecuteSceneModal from '@/views/automation/automationUiScene/components/ExecuteSceneModal.vue'
import { buildProjectSelectOptions, toIdString } from './utils/projectContext'

defineOptions({ name: 'TestTestPlan' })

interface SceneTab {
  key: string
  record: TestPlanResp
}

type SceneWorkspaceExpose = {
  reload?: () => Promise<void>
}

const route = useRoute()
const router = useRouter()

const planStatusOptions = [
  { label: '未开始', value: 'NOT_STARTED' },
  { label: '进行中', value: 'RUNNING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已归档', value: 'ARCHIVED' },
]
const planTypeBaseOptions = [
  { label: '冒烟测试', value: '冒烟测试' },
  { label: '全量测试', value: '全量测试' },
  { label: '回归测试', value: '回归测试' },
]

const queryForm = reactive<TestPlanQuery>({
  name: undefined,
  projectId: undefined,
  type: undefined,
  status: undefined,
  createUser: undefined,
  createTime: undefined,
  sort: ['createTime,desc'],
})

const serializeCreateTime = (range?: TestPlanQuery['createTime']) => {
  if (!Array.isArray(range) || range.length !== 2) return undefined
  const [a, b] = range
  if (a == null || b == null || a === '' || b === '') return undefined
  const day = (v: string) => {
    const s = String(v)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s.slice(0, 10)
  }
  const startDay = day(a)
  const endDay = day(b)
  return [`${startDay} 00:00:00`, `${endDay} 23:59:59`]
}

/** 列表/导出与后端对齐的查询对象（含创建时间序列化） */
const pickQueryForBackend = (): TestPlanQuery => {
  const createTime = serializeCreateTime(queryForm.createTime)
  return {
    name: queryForm.name,
    projectId: queryForm.projectId,
    type: queryForm.type,
    status: queryForm.status,
    createUser: queryForm.createUser,
    ...(createTime ? { createTime } : {}),
    sort: queryForm.sort,
  }
}

const {
  tableData: dataList,
  loading,
  pagination,
  search,
  selectedKeys,
  select,
  selectAll,
} = useTable((page) => listTestPlan({ ...pickQueryForBackend(), ...page }), { immediate: true })

const projectConfigList = ref<ProjectConfigResp[]>([])
const userList = ref<UserResp[]>([])

const loadProjectConfigOptions = async () => {
  try {
    const { data } = await getProjectConfigList()
    projectConfigList.value = Array.isArray(data) ? data : []
  } catch {
    projectConfigList.value = []
  }
}

const loadSystemUserOptions = async () => {
  try {
    const { data } = await listSystemUser()
    userList.value = Array.isArray(data) ? data : []
  } catch {
    userList.value = []
  }
}

const mergeUsers = (users: UserResp[]) => {
  if (!users.length) return
  const map = new Map<string, UserResp>()
  for (const u of userList.value) map.set(String(u.id), u)
  for (const u of users) map.set(String(u.id), u)
  userList.value = [...map.values()]
}

onMounted(() => {
  void loadProjectConfigOptions()
  void loadSystemUserOptions()
})

const userLabelMap = computed(() => {
  const map = new Map<string, string>()
  for (const u of userList.value) {
    const id = String(u.id)
    map.set(id, u.nickname || u.username || id)
  }
  return map
})

const userSelectOptions = computed(() => {
  const map = new Map<string, { label: string; value: string }>()
  for (const u of userList.value) {
    const id = String(u.id)
    map.set(id, { value: id, label: userLabelMap.value.get(id) ?? id })
  }
  const extraIds = [
    ...formState.memberIds,
    ...(formState.principalId ? [formState.principalId] : []),
  ]
  for (const id of extraIds) {
    if (!map.has(id)) {
      map.set(id, { value: id, label: userLabelMap.value.get(id) ?? id })
    }
  }
  return [...map.values()]
})

const projectSelectOptions = computed(() => {
  const map = new Map<string, { label: string; value: string }>()
  for (const row of projectConfigList.value) {
    const id = toIdString(row.id)
    if (!id) continue
    const label = row.name && row.name !== '' ? row.name : id
    if (!map.has(id)) map.set(id, { label, value: id })
  }
  for (const row of dataList.value) {
    const id = toIdString(row.projectId)
    if (!id || row.projectName == null || row.projectName === '') continue
    if (!map.has(id)) map.set(id, { label: row.projectName, value: id })
  }
  const list = [...map.values()].map((o) => ({ label: o.label, value: o.value }))
  return buildProjectSelectOptions(list, formState.projectId, formState.projectName).sort((a, b) =>
    a.label.localeCompare(b.label, 'zh-CN'),
  )
})

const planTypeSelectOptions = computed(() => {
  const seen = new Set(planTypeBaseOptions.map((o) => String(o.value)))
  const extra: { label: string; value: string }[] = []
  for (const row of dataList.value) {
    const t = row.type
    if (t != null && t !== '' && !seen.has(String(t))) {
      seen.add(String(t))
      extra.push({ label: String(t), value: String(t) })
    }
  }
  extra.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
  return [...planTypeBaseOptions, ...extra]
})

const planQueryGridProps = { cols: 24, colGap: 16, rowGap: 0 }
const planQueryFieldSpan = { xs: 24, sm: 8, xxl: 8 }

const queryFormColumns = computed<ColumnItem[]>(() => [
  {
    type: 'select',
    label: '所属项目',
    field: 'projectId',
    span: planQueryFieldSpan,
    props: {
      options: projectSelectOptions.value,
      placeholder: '请选择',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'select',
    label: '计划类型',
    field: 'type',
    span: planQueryFieldSpan,
    props: {
      options: planTypeSelectOptions.value,
      placeholder: '请选择',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'input',
    label: '计划名称',
    field: 'name',
    span: planQueryFieldSpan,
    props: {
      placeholder: '请输入计划名称',
      allowClear: true,
      showWordLimit: true,
    },
  },
  {
    type: 'select',
    label: '计划状态',
    field: 'status',
    span: planQueryFieldSpan,
    props: {
      options: planStatusOptions,
      placeholder: '请选择',
      allowClear: true,
    },
  },
  {
    type: 'select',
    label: '创建人',
    field: 'createUser',
    span: planQueryFieldSpan,
    props: {
      options: userSelectOptions.value,
      placeholder: '请选择',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'range-picker',
    label: '创建时间',
    field: 'createTime',
    span: planQueryFieldSpan,
    props: {
      class: 'plan-query-range gi-form__search-range',
      showTime: true,
      format: 'YYYY-MM-DD HH:mm:ss',
    },
  },
])

const columns: TableInstance['columns'] = [
  { title: '所属项目', dataIndex: 'projectName', width: 200, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '计划类型', dataIndex: 'type', width: 100, align: 'center' },
  { title: '计划名称', dataIndex: 'name', width: 300, ellipsis: true, tooltip: true },
  { title: '计划成员', dataIndex: 'memberIds', slotName: 'members', width: 100, align: 'center' },
  { title: '计划负责人', dataIndex: 'principalIds', slotName: 'principals', width: 110, align: 'center' },
  { title: '计划状态', dataIndex: 'status', slotName: 'status', width: 100, align: 'center' },
  { title: '测试进度', dataIndex: 'testProgress', slotName: 'progress', width: 100, align: 'center' },
  {
    title: '计划开始时间',
    dataIndex: 'plannedStartTime',
    width: 180,
    render: ({ record }) => formatPlanDateTime(record.plannedStartTime),
  },
  {
    title: '计划结束时间',
    dataIndex: 'plannedEndTime',
    width: 180,
    render: ({ record }) => formatPlanDateTime(record.plannedEndTime),
  },
  { title: '创建人', dataIndex: 'createUserString', width: 110, ellipsis: true, tooltip: true },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    width: 180,
    render: ({ record }) => formatPlanDateTime(record.createTime),
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    width: 180,
    render: ({ record }) => formatPlanDateTime(record.updateTime),
  },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 220, align: 'center', fixed: 'right' },
]

const activeTab = ref('plan-list')
const isSceneTabActive = computed(() => activeTab.value !== 'plan-list')
const sceneTabs = ref<SceneTab[]>([])
const scenePlanOptions = computed(() =>
  dataList.value.map((row) => ({
    label: row.name,
    value: String(row.id),
  })),
)
const sceneWorkspaceRefs = new Map<string, SceneWorkspaceExpose>()
const relateSceneVisible = ref(false)
const relateScenePlan = ref<TestPlanResp | null>(null)
const formVisible = ref(false)
const formCopyMode = ref(false)
const execVisible = ref(false)
const detailVisible = ref(false)
const listModalVisible = ref(false)
const listModalTitle = ref('')
const listModalContent = ref('')
const currentRecord = ref<TestPlanResp | null>(null)
const detailRecord = ref<TestPlanResp | null>(null)

interface PlanFormModel {
  id: string
  projectId?: string
  projectName: string
  name: string
  abbreviate: string
  type: string
  description: string
  status: string
  memberIds: string[]
  principalId?: string
  planTimeRange?: string[]
}

const planFormRef = ref<FormInstance>()
const formState = reactive<PlanFormModel>({
  id: '',
  projectId: undefined,
  projectName: '',
  name: '',
  abbreviate: '',
  type: '',
  description: '',
  status: 'NOT_STARTED',
  memberIds: [],
  principalId: undefined,
  planTimeRange: undefined,
})

const planFormRules: FormInstance['rules'] = {
  projectId: [{ required: true, message: '请选择所属项目' }],
  type: [{ required: true, message: '请选择计划类型' }],
  name: [{ required: true, message: '请输入计划名称' }],
  abbreviate: [{ required: true, message: '请输入计划简称' }],
  description: [{ required: true, message: '请输入计划描述' }],
  memberIds: [
    {
      required: true,
      validator: (value: unknown, cb: (error?: string) => void) => {
        if (!Array.isArray(value) || value.length === 0) cb('请选择计划成员')
        else cb()
      },
    },
  ],
  principalId: [
    {
      required: true,
      validator: (value: unknown, cb: (error?: string) => void) => {
        if (value == null || value === '') cb('请选择主负责人')
        else cb()
      },
    },
  ],
  planTimeRange: [
    {
      required: true,
      validator: (value: unknown, cb: (error?: string) => void) => {
        if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) cb('请选择计划时间')
        else cb()
      },
    },
  ],
}

const onFormProjectChange = () => {
  const id = formState.projectId
  const opt = projectSelectOptions.value.find((o) => o.value === id)
  formState.projectName = opt?.label ?? ''
}

const slicePlanDate = (value?: string | null) => {
  if (value == null || value === '') return undefined
  const s = String(value).trim()
  const day = s.includes('T') ? s.slice(0, 10) : s.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

const serializePlanTimeRange = (range?: string[]) => {
  if (!Array.isArray(range) || range.length !== 2) return {}
  const [a, b] = range
  if (a == null || b == null || a === '' || b === '') return {}
  const day = (v: string) => {
    const s = String(v)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s.slice(0, 10)
  }
  const startDay = day(a)
  const endDay = day(b)
  return {
    plannedStartTime: `${startDay} 00:00:00`,
    plannedEndTime: `${endDay} 23:59:59`,
  }
}

/** 规范化为数字字符串用户 ID（避免 Number 精度丢失；过滤日期等非 ID 值） */
const normalizeUserIds = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const v of raw) {
    if (v == null || v === '') continue
    const t = typeof v === 'number' && Number.isInteger(v) && v > 0 ? String(v) : String(v).trim()
    if (/^\d+$/.test(t)) out.push(t)
  }
  return [...new Set(out)]
}

const collectPlanUserIds = (record?: TestPlanResp | null) => [
  ...normalizeUserIds(record?.memberIds),
  ...normalizeUserIds(record?.principalIds),
]

/** 按 ID 补全用户（含禁用用户），供下拉与昵称展示 */
const ensureUsersLoaded = async (ids: string[]) => {
  const missing = [...new Set(ids)].filter((id) => id && !userLabelMap.value.has(id))
  if (!missing.length) return
  try {
    const { data } = await listAllUser({ userIds: missing })
    if (Array.isArray(data) && data.length) mergeUsers(data)
  } catch {
    /* ignore */
  }
  const stillMissing = missing.filter((id) => !userLabelMap.value.has(id))
  await Promise.all(
    stillMissing.map(async (id) => {
      try {
        const { data } = await getUser(id)
        if (data) mergeUsers([data as UserResp])
      } catch {
        /* ignore */
      }
    }),
  )
}

watch(
  () => dataList.value,
  (list) => {
    const ids: string[] = []
    for (const row of list) {
      ids.push(...collectPlanUserIds(row))
    }
    if (ids.length) void ensureUsersLoaded(ids)
  },
  { deep: true },
)

const execState = reactive<{
  projectEnvironmentId?: string
  automationEnvironmentId?: string
  executeName: string
  executeEmail: string
}>({
  projectEnvironmentId: undefined,
  automationEnvironmentId: undefined,
  executeName: '',
  executeEmail: '',
})

const formTitle = computed(() => {
  if (formCopyMode.value) return '复制测试计划'
  return formState.id ? '修改测试计划' : '新建测试计划'
})

const reset = () => {
  queryForm.name = undefined
  queryForm.projectId = undefined
  queryForm.type = undefined
  queryForm.status = undefined
  queryForm.createUser = undefined
  queryForm.createTime = undefined
  search()
}

const fillPlanForm = (record?: TestPlanResp | null, copy = false) => {
  formState.id = copy ? '' : record?.id || ''
  const pid = toIdString(record?.projectId)
  formState.projectId = pid || undefined
  formState.projectName = record?.projectName || ''
  formState.name = copy && record?.name ? `${record.name}-副本` : record?.name || ''
  formState.abbreviate = record?.abbreviate || ''
  formState.type = record?.type || ''
  formState.description = record?.description || ''
  formState.status = record?.status || 'NOT_STARTED'
  formState.memberIds = normalizeUserIds(record?.memberIds)
  formState.principalId = normalizeUserIds(record?.principalIds ?? [])[0]
  const ps = slicePlanDate(record?.plannedStartTime ?? null)
  const pe = slicePlanDate(record?.plannedEndTime ?? null)
  formState.planTimeRange = ps && pe ? [ps, pe] : undefined
  onFormProjectChange()
}

const openForm = async (record?: TestPlanResp, copy = false) => {
  currentRecord.value = record || null
  formCopyMode.value = copy
  if (!userList.value.length) await loadSystemUserOptions()
  let source: TestPlanResp | undefined = record
  if (record?.id) {
    try {
      const { data } = await getTestPlan(record.id)
      if (data) source = data
    } catch {
      /* 列表行兜底 */
    }
  }
  await ensureUsersLoaded(collectPlanUserIds(source))
  fillPlanForm(source, copy)
  formVisible.value = true
  nextTick(() => planFormRef.value?.clearValidate())
}

const openDetail = async (record: TestPlanResp) => {
  const { data } = await getTestPlan(record.id)
  const source = data || record
  await ensureUsersLoaded(collectPlanUserIds(source))
  detailRecord.value = source
  detailVisible.value = true
  await router.replace({ path: '/test/testPlan', query: { id: record.id } })
}

watch(detailVisible, async (visible) => {
  if (!visible && route.query.id) {
    await router.replace({ path: '/test/testPlan', query: {} })
  }
})

const openRelateSceneModal = (record: TestPlanResp) => {
  relateScenePlan.value = record
  relateSceneVisible.value = true
}

const openSceneModal = (record: TestPlanResp) => {
  openRelateSceneModal(record)
}

const openExecModal = (record: TestPlanResp) => {
  currentRecord.value = record
  execState.projectEnvironmentId = undefined
  execState.automationEnvironmentId = undefined
  execState.executeName = ''
  execState.executeEmail = ''
  execVisible.value = true
}

const setSceneWorkspaceRef = (key: string, el: unknown) => {
  if (el) sceneWorkspaceRefs.set(key, el as SceneWorkspaceExpose)
  else sceneWorkspaceRefs.delete(key)
}

const reloadSceneTable = async (tabKey: string) => {
  await nextTick()
  await sceneWorkspaceRefs.get(tabKey)?.reload?.()
}

const onRelateSceneSuccess = async () => {
  const planId = relateScenePlan.value?.id
  if (planId) {
    const tab = sceneTabs.value.find((item) => String(item.record.id) === String(planId))
    if (tab) await reloadSceneTable(tab.key)
  }
  void search()
}

const executeSceneModalRef = ref()
const onBatchExecuteScene = (rows: any[]) => {
  executeSceneModalRef.value?.onOpen(rows, { mode: 'selected', source: 'plan' })
}
const onExecuteAllScene = async () => {
  const currentKey = activeTab.value
  const tab = sceneTabs.value.find((item) => item.key === currentKey)
  if (!tab) return
  const plan = tab.record
  const { data: planData } = await getTestPlan(plan.id)
  const sceneIds: string[] = planData?.uiTestScene || plan.uiTestScene || []
  const { getAutomationUiSceneSelected } = await import('@/apis/automation/automationUiScene')
  const { data: sceneData } = await getAutomationUiSceneSelected(sceneIds)
  const scenes = Array.isArray(sceneData) ? sceneData : []
  const workspaceRef = sceneWorkspaceRefs.get(tab.key)
  const ws = workspaceRef as any
  const queryForm = ws?.queryForm
  executeSceneModalRef.value?.onOpen(scenes, { mode: 'all', query: { ...queryForm, projectId: plan.projectId }, source: 'plan' })
}
const onExecuteOneScene = (row: any) => {
  executeSceneModalRef.value?.onOpen([row], { source: 'plan' })
}
const onExecuteSceneSuccess = async () => {
  const currentKey = activeTab.value
  if (currentKey && currentKey !== 'plan-list') {
    await reloadSceneTable(currentKey)
  }
  void search()
}

const openSceneTab = async (record: TestPlanResp) => {
  let source = record
  if (record?.id) {
    try {
      const { data } = await getTestPlan(record.id)
      if (data) source = data
    } catch {
      /* 列表行兜底 */
    }
  }
  const key = `scene-${source.id}`
  let tab = sceneTabs.value.find((item) => item.key === key)
  if (!tab) {
    tab = { key, record: source }
    sceneTabs.value.push(tab)
  } else {
    tab.record = source
  }
  activeTab.value = key
}

const onSwitchScenePlan = async (planId: string) => {
  const key = `scene-${planId}`
  const existing = sceneTabs.value.find((item) => item.key === key)
  if (existing) {
    activeTab.value = key
    return
  }
  const record = dataList.value.find((item) => String(item.id) === String(planId))
  if (record) await openSceneTab(record)
}

const onSceneTabDelete = (key: string) => {
  closeSceneTab(String(key))
}

const closeSceneTab = (key: string) => {
  sceneTabs.value = sceneTabs.value.filter((item) => item.key !== key)
  sceneWorkspaceRefs.delete(key)
  if (activeTab.value === key) activeTab.value = 'plan-list'
}

const goToReports = async (record: TestPlanResp, reportId?: string) => {
  await router.push({
    path: '/test/testReport',
    query: {
      testPlanId: record.id,
      ...(reportId ? { id: reportId } : {}),
    },
  })
}

watch(
  () => route.query.id,
  async (id) => {
    if (!id) return
    const record = dataList.value.find(item => String(item.id) === String(id))
    if (record) {
      await openDetail(record)
      return
    }
    const { data } = await getTestPlan(String(id))
    if (!data) return
    detailRecord.value = data
    detailVisible.value = true
  },
  { immediate: true },
)

const submitForm = async (): Promise<boolean> => {
  if (await planFormRef.value?.validate()) {
    Message.warning('请检查必填项')
    return false
  }
  const memberIds = normalizeUserIds(formState.memberIds)
  const principalIds = formState.principalId ? normalizeUserIds([formState.principalId]) : []
  const timePayload = serializePlanTimeRange(formState.planTimeRange)
  const projectId = toIdString(formState.projectId)
  if (!projectId) {
    Message.warning('请选择所属项目')
    return false
  }
  const payload = {
    projectId,
    projectName: formState.projectName,
    name: formState.name?.trim(),
    abbreviate: formState.abbreviate?.trim(),
    type: formState.type,
    description: formState.description?.trim(),
    status: formState.status,
    memberIds,
    principalIds,
    ...timePayload,
  }
  try {
    if (formState.id) await updateTestPlan(payload, formState.id)
    else await addTestPlan(payload)
  } catch {
    return false
  }
  Message.success('保存成功')
  search()
  return true
}

const submitExecute = async () => {
  if (!currentRecord.value) return
  const current = currentRecord.value
  const projectEnvironmentId = toIdString(execState.projectEnvironmentId)
  const automationEnvironmentId = toIdString(execState.automationEnvironmentId)
  const { data } = await executeTestPlan(current.id, {
    projectEnvironmentId: projectEnvironmentId || undefined,
    automationEnvironmentId: automationEnvironmentId || undefined,
    executeName: execState.executeName,
    executeEmail: execState.executeEmail,
  })
  const executeResp = (data || {}) as TestPlanExecuteResp
  const buildMessage = data?.buildNumber ? `，构建号 ${data.buildNumber}` : ''
  Message.success(`执行已触发${buildMessage}`)
  execVisible.value = false
  await search()
  const nextRecord = dataList.value.find(item => item.id === current.id) || current
  await openSceneTab(nextRecord)
  if (detailVisible.value && detailRecord.value?.id === current.id) detailRecord.value = nextRecord
  if (executeResp.testReportId) await goToReports(nextRecord, String(executeResp.testReportId))
}

const onDelete = (record?: TestPlanResp) => {
  const ids = selectedKeys.value.length ? selectedKeys.value.map(item => String(item)) : record ? record.id : ''
  Modal.warning({
    title: '确认删除',
    content: selectedKeys.value.length ? '确认删除选中的测试计划吗？' : `确认删除测试计划“${record?.name || ''}”吗？`,
    hideCancel: false,
    onOk: async () => {
      await deleteTestPlan(ids)
      Message.success('删除成功')
      search()
    },
  })
}

const onExport = async () => {
  const base = pickQueryForBackend()
  await exportTestPlan(selectedKeys.value.length ? { ...base, id: selectedKeys.value.join(',') } : base)
}

const formatUserIds = (value?: Array<string | number>) => {
  const ids = normalizeUserIds(value)
  if (!ids.length) return '-'
  return ids.map((id) => userLabelMap.value.get(id) ?? id).join('、')
}

const openListModal = async (title: string, value?: Array<string | number>) => {
  const ids = normalizeUserIds(value)
  await ensureUsersLoaded(ids)
  listModalTitle.value = title
  listModalContent.value = formatUserIds(value)
  listModalVisible.value = true
}

const formatList = (value?: Array<string | number>) => {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.join(', ')
}

/** 与参考列表一致的时间展示：YYYY-MM-DD HH:mm:ss */
const formatPlanDateTime = (value?: string | null) => {
  if (value == null || value === '') return '-'
  const s = String(value).trim()
  const normalized = s.includes('T') ? s.replace('T', ' ') : s
  return normalized.length > 19 ? normalized.slice(0, 19) : normalized
}
</script>

<style scoped lang="scss">
.test-plan-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
  min-height: 0;
  padding: 0;
  background: var(--color-bg-1);
}

.plan-edit-form :deep(.arco-form-item) {
  margin-bottom: 16px;
}

.test-plan-page .plan-list-table {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.test-plan-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  margin-top: 5px;
  background: transparent;

  :deep(.arco-tabs) {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }

  :deep(.arco-tabs-nav) {
    flex: none;
    margin-bottom: 0;
  }

  :deep(.arco-tabs-nav-tab) {
    padding: 0 2px;
  }

  :deep(.arco-tabs-content) {
    box-sizing: border-box;
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: 0;
    height: calc(100% - 42px);
    min-height: 480px;
    padding: 16px;
    background: var(--color-bg-1);
    border: 1px solid var(--color-border-2);
    border-top: 0;
    border-radius: 0 4px 4px 4px;
    box-shadow: 0 2px 6px rgb(0 0 0 / 4%);
  }

  :deep(.arco-tabs-content-list) {
    height: 100%;
    width: 100%;
  }

  :deep(.arco-tabs-pane) {
    height: 100%;
    width: 100%;
    min-width: 0;
    overflow: visible;
  }

  &--scene {
    :deep(.arco-tabs-content) {
      padding: 6px 6px 6px 0px;
      background: var(--color-bg-2);
      box-shadow: none;
    }
  }
}

.scene-tab-pane {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 220px);
}

/** GiTable #top 内避免 shrink-to-fit，筛选区须与表格同宽 */
.plan-query-top-slot {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.query-form {
  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }
}

/** 筛选区：GiForm searchCell 双行布局 */
.plan-query-form {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }
}

.plan-query-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.plan-query-cell__label {
  box-sizing: border-box;
  flex: 0 0 80px;
  width: 80px;
  padding: 0 4px 0 0;
  color: var(--color-text-2);
  font-weight: 500;
  font-size: 14px;
  line-height: 32px;
  text-align: right;
  white-space: nowrap;
}

.plan-query-cell__control {
  flex: 1 1 0;
  min-width: 0;

  :deep(.arco-select),
  :deep(.arco-input-wrapper),
  :deep(.arco-input-number),
  :deep(.arco-picker) {
    width: 100%;
    max-width: 100%;
  }
}

/**
 * 每行：左侧三等分字段（两行共用同一套列宽）+ 右侧按钮贴邻，避免「整行四列 1fr」在第三列与按钮间留出大块空白，
 * 并约束日期范围与上方输入同宽对齐。
 */
.plan-query-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-width: 0;
}

.plan-query-line {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.plan-query-line__fields {
  display: flex;
  flex: 1 1 0;
  gap: 16px;
  align-items: center;
  min-width: 0;
}

.plan-query-line__btn {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 100px;
  justify-content: flex-end;
  min-width: 100px;
}

.plan-query-field {
  flex: 1 1 0;
  min-width: 0;
}

.plan-query-range {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .plan-query-line {
    flex-direction: column;
    align-items: stretch;
  }

  .plan-query-line__fields {
    flex: none;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .plan-query-field {
    flex: none;
    width: 100%;
  }

  .plan-query-line__btn {
    display: flex;
    justify-content: stretch;

    :deep(.arco-btn) {
      width: 100%;
    }
  }
}

.more-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.more-link__caret {
  margin-left: 2px;
  font-size: 12px;
}

.plan-list-table {
  :deep(.gi-table) {
    width: 100%;
    max-width: 100%;
    min-height: calc(100vh - 300px);
    padding: 0;
    background: var(--color-bg-1);
    border-radius: 0;
  }

  :deep(.gi-table__top) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  :deep(.gi-table__toolbar) {
    min-height: 44px;
    padding: 4px 0 14px;
    margin-top: 0;
  }

  :deep(.gi-table__toolbar-left),
  :deep(.gi-table__toolbar-right) {
    gap: 8px;
  }

  :deep(.arco-table-container) {
    border: 1px solid var(--color-border-2);
    border-radius: 6px;
  }

  :deep(.arco-table-th) {
    height: 44px;
    background: var(--color-fill-1);
  }

  :deep(.arco-table-td) {
    height: 46px;
  }

  :deep(.arco-table-pagination) {
    margin-top: 14px;
    padding-bottom: 2px;
  }
}

.progress-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  :deep(.arco-progress) {
    width: 10px;
  }

  span {
    min-width: 36px;
    color: var(--color-text-3);
    font-size: 12px;
  }
}

.detail-actions {
  background: var(--color-fill-1);
}

.mb-3 {
  margin-bottom: 12px;
}

</style>
