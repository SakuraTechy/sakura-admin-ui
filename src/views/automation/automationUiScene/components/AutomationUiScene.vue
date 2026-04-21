<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selected-keys="selectedKeys"
      size="small"
      title=""
      row-key="id"
      :data="tableData"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: '100%', y: '100%', minWidth: 1000 }"
      :pagination="pagination"
      :disabled-tools="['']"
      :disabled-column-keys="['name']"
      :row-selection="{ type: 'checkbox', showCheckedAll: true }"
      :show-selection-alert="true"
      :selection-message="`已选中 ${selectedKeys.length} 条记录(可跨页)`"
      no-selection-message="未选中任何记录"
      @select="select"
      @select-all="selectAll"
      @refresh="search"
    >
      <template #top>
        <GiForm v-model="queryForm" :columns="queryFormColumns" size="medium" search @search="search" @reset="reset"></GiForm>
        <a-divider style="margin: 15px 0px 20px 0px;"></a-divider>
      </template>
      <!-- <template #toolbar-left>
        <a-input-search v-model="queryForm.id" placeholder="请输入主键ID" allow-clear @search="search" />
        <a-input-search v-model="queryForm.sceneId" placeholder="请输入场景ID" allow-clear @search="search" />
        <a-input-search v-model="queryForm.name" placeholder="请输入场景名称" allow-clear @search="search" />
        <a-select
          v-model="queryForm.versionId"
          :options="versionList"
          placeholder="请选择场景版本"
          allow-clear
          allow-search
          style="width: 150px"
          @change="search"
        />
        <a-select
          v-model="queryForm.level"
          :options="scene_level"
          placeholder="请选择场景等级"
          allow-clear
          allow-search
          style="width: 150px"
          @change="search"
        />
        <a-select
          v-model="queryForm.debugRecord"
          :options="status_type.filter(item => ['10', '11', '12'].includes(item.value))"
          placeholder="请选择执行状态"
          allow-clear
          allow-search
          style="width: 150px"
          @change="search"
        />
        <a-select
          v-model="queryForm.debugRecord"
          :options="status_type.filter(item => ['13', '14', '15'].includes(item.value))"
          placeholder="请选择执行结果"
          allow-clear
          allow-search
          style="width: 150px"
          @change="search"
        />
        <a-select
          v-model="queryForm.status"
          :options="status_type.filter(item => ['1', '2'].includes(item.value))"
          placeholder="请选择场景状态"
          allow-clear
          style="width: 150px"
          @change="search"
        />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          <template #default>重置</template>
        </a-button>
      </template> -->
      <template #toolbar-right>
        <a-button v-permission="['automation:automationUiScene:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['automation:automationUiScene:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['automation:automationUiScene:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['automation:automationUiScene:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['automation:automationUiScene:update']" title="编辑" @click="onUpdate(record)">编辑</a-link>
          <a-link v-permission="['automation:automationUiScene:copy']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link v-permission="['automation:automationUiScene:execute']" title="执行" @click="onExecute(record)">执行</a-link>
          <a-dropdown>
            <a-button v-if="has.hasPermOr(['automation:automationUiScene:delete'])" type="text" size="mini" title="更多">
              <template #icon>
                <icon-more :size="16" />
              </template>
            </a-button>
            <template #content>
              <a-doption 
                v-permission="['automation:automationUiScene:delete']"
                status="danger"
                :disabled="record.disabled" 
                :title="record.disabled ? '禁止删除' : '删除'"
                @click="onDelete(record)"
              >
                删除
              </a-doption>
            </template>
          </a-dropdown>
          <!-- <a-link
            v-permission="['automation:automationUiScene:delete']"
            status="danger"
            :disabled="record.disabled"
            :title="record.disabled ? '禁止删除' : '删除'"
            @click="onDelete(record)"
          >
            删除
          </a-link> -->
        </a-space>
      </template>
    </GiTable>

    <AutomationUiSceneAddModal ref="AutomationUiSceneAddModalRef" @save-success="search" />
    <AutomationUiSceneDetailDrawer ref="AutomationUiSceneDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { FormInstance, TableInstance } from '@arco-design/web-vue'
import { render } from 'vue'
import AutomationUiSceneAddModal from './AutomationUiSceneAddModal.vue'
import AutomationUiSceneDetailDrawer from './AutomationUiSceneDetailDrawer.vue'
import { type AutomationUiSceneQuery, type AutomationUiSceneResp, deleteAutomationUiScene, exportAutomationUiScene, getAutomationUiScene, listAutomationUiScene } from '@/apis/automation/automationUiScene'
import { useDownload, useResetReactive, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { listProjectConfig } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTag, GiCellTags, GiCellVersion } from '@/components/GiCell'
import type { ColumnItem } from '@/components/GiForm'
import { useUiStore } from '@/stores/modules/uiStore'
import { formatDuration } from '@/utils/sakura'

defineOptions({ name: 'AutomationUiScene' })

const emit = defineEmits<{
  (e: 'update-scene', record: any): void
  (e: 'execute-scene', record: any): void
}>()

const uiStore = useUiStore()
const { scene_level, status_type } = useDict('scene_level', 'status_type')

const [queryForm, resetForm] = useResetReactive<AutomationUiSceneQuery>({
// const [queryForm, resetForm] = reactive<AutomationUiSceneQuery>({
  id: undefined,
  sceneId: undefined,
  name: undefined,
  projectId: undefined,
  versionId: undefined,
  moduleId: undefined,
  level: undefined,
  executeStatus: undefined,
  executeResult: undefined,
  status: undefined,
  createUser: undefined,
  updateUser: undefined,
  createTime: [],
  sort: ['createTime,desc'],
})

const {
  tableData,
  loading,
  pagination,
  search,
  select,
  selectAll,
  selectedKeys,
  handleDelete,
  handleExport,
} = useTable((page) => listAutomationUiScene({ ...queryForm, ...page }))

const queryFormColumns = computed<ColumnItem[]>(() => [
  {
    type: 'input',
    label: '场景ID',
    field: 'sceneId',
    span: { xs: 24, sm: 8, xxl: 8 },
    props: {
    },
  },
  {
    type: 'input',
    label: '场景名称',
    field: 'name',
    span: { xs: 24, sm: 8, xxl: 8 },
    props: {
    },
  },
  {
    type: 'select',
    label: '场景版本',
    field: 'versionId',
    span: { xs: 24, sm: 8, xxl: 8 },
    props: {
      options: uiStore.versionList,
    },
  },
  {
    type: 'select',
    label: '场景等级',
    field: 'level',
    span: { xs: 24, sm: 8, xxl: 8 },
    props: {
      options: scene_level.value,
    },
  },
  {
    type: 'select',
    label: '执行状态',
    field: 'executeStatus',
    span: { xs: 24, sm: 8, xxl: 8 },
    props: {
      options: status_type.value.filter((item) => ['10', '11', '12'].includes(item.value)),
    },
  },
  {
    type: 'select',
    label: '执行结果',
    field: 'executeResult',
    span: { xs: 24, sm: 8, xxl: 8 },
    props: {
      options: status_type.value.filter((item) => ['13', '14', '15'].includes(item.value)),
    },
  },
  {
    type: 'select',
    label: '创建人',
    field: 'createUser',
    span: { xs: 24, sm: 8, xxl: 8 },
    show: ({ collapsed }) => !collapsed,
    props: {
      options: uiStore.userList,
    },
  },
  {
    type: 'select',
    label: '修改人',
    field: 'updateUser',
    span: { xs: 24, sm: 8, xxl: 8 },
    show: ({ collapsed }) => !collapsed,
    props: {
      options: uiStore.userList,
    },
  },
  {
    type: 'range-picker',
    label: '创建时间',
    field: 'createTime',
    span: { xs: 24, sm: 18, xxl: 8 },
    show: ({ collapsed }) => !collapsed,
  },
])

const columns: TableInstance['columns'] = [
  { title: '场景ID', dataIndex: 'sceneId', slotName: 'sceneId', width: 180, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '场景名称', dataIndex: 'name', slotName: 'name', width: 360, fixed: 'left', ellipsis: true, tooltip: true },
  // { title: '场景描述', dataIndex: 'description', slotName: 'description', width: 120, ellipsis: true, tooltip: true },
  { title: '场景版本', dataIndex: 'versionName', slotName: 'versionName', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  // { title: '场景模块', dataIndex: 'modulePath', slotName: 'modulePath', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  // {
  //   title: '场景模块',
  //   dataIndex: 'modulePath',
  //   slotName: 'modulePath',
  //   width: 200,
  //   ellipsis: true,
  //   tooltip: true,
  //   align: 'left',
  //   customCell: () => ({ style: { maxWidth: '200px' } }),
  //   render: ({ record }) => {
  //     const path = record.modulePath || ''
  //     const parts = path.split('/').filter(Boolean) // 分割并过滤空值
  //     return (
  //       <div class="path-container">
  //         {parts.map((part, index) => (
  //           <span key={index} class="path-part">
  //             {index > 0 && <span>/</span>}
  //             <a-tooltip content={part} placement="top" show-arrow>
  //               <span class="path-text">{part}</span>
  //             </a-tooltip>
  //           </span>
  //         ))}
  //       </div>
  //     )
  //   },
  // },
  { title: '场景等级', dataIndex: 'level', slotName: 'level', width: 100, ellipsis: true, tooltip: true, align: 'center' },
  {
    title: '场景标签',
    dataIndex: 'tags',
    slotName: 'tags',
    width: 101,
    align: 'center',
    render: ({ record }) => {
      return (
        Array.isArray(record.tags)
          ? <GiCellTags data={record.tags} />
          : '-'
      )
    },
  },
  {
    title: '执行状态',
    dataIndex: 'debugRecord[0].executeStatus',
    slotName: 'executeStatus',
    width: 100,
    align: 'center',
    render: ({ record }) => {
      return (
        Array.isArray(record.debugRecord) && record.debugRecord.length > 0
          ? <GiCellTag value={status_type.value.filter((item) => item.label === record.debugRecord[0].executeStatus)[0].value} dict={status_type.value} />
          : '-'
      )
    },
  },
  {
    title: '执行结果',
    dataIndex: 'debugRecord[0].executeResult',
    slotName: 'executeResult',
    width: 100,
    ellipsis: true,
    align: 'center',
    render: ({ record }) => {
      return (
        Array.isArray(record.debugRecord) && record.debugRecord.length > 0
          ? <GiCellTag value={status_type.value.filter((item) => item.label === record.debugRecord[0].executeResult)[0].value} dict={status_type.value} />
          : '-'
      )
    },
  },
  {
    title: '通过率',
    dataIndex: 'debugRecord[0].scenePassRate',
    slotName: 'scenePassRate',
    width: 100,
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].scenePassRate : '-'
    },
  },
  {
    title: '运行耗时',
    width: 100,
    dataIndex: 'debugRecord[0].duration',
    slotName: 'duration',
    align: 'center',
    render: ({ record }) => {
      return formatDuration(Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].duration : '-')
    },
  },
  {
    title: '用例数',
    width: 80,
    dataIndex: 'debugRecord[0].caseTotal',
    slotName: 'caseTotal',
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseTotal : '-'
    },
  },
  {
    title: '通过',
    width: 80,
    dataIndex: 'debugRecord[0].casePass',
    slotName: 'casePass',
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].casePass : '-'
    },
  },
  {
    title: '失败',
    width: 80,
    dataIndex: 'debugRecord[0].caseFail',
    slotName: 'caseFail',
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseFail : '-'
    },
  },
  {
    title: '跳过',
    width: 80,
    dataIndex: 'debugRecord[0].caseSkip',
    slotName: 'caseSkip',
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].caseSkip : '-'
    },
  },
  {
    title: '步骤数',
    width: 80,
    dataIndex: 'debugRecord[0].stepTotal',
    slotName: 'stepTotal',
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepTotal : '-'
    },
  },
  {
    title: '通过',
    width: 80,
    dataIndex: 'debugRecord[0].stepPass',
    slotName: 'stepPass',
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepPass : '-'
    },
  },
  {
    title: '失败',
    width: 80,
    dataIndex: 'debugRecord[0].stepFail',
    slotName: 'stepFail',
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepFail : '-'
    },
  },
  {
    title: '跳过',
    width: 80,
    dataIndex: 'debugRecord[0].stepSkip',
    slotName: 'stepSkip',
    align: 'center',
    render: ({ record }) => {
      return Array.isArray(record.debugRecord) && record.debugRecord.length > 0 ? record.debugRecord[0].stepSkip : '-'
    },
  },
  { title: '场景状态', dataIndex: 'status', slotName: 'status', width: 100, ellipsis: true, tooltip: true, align: 'center' },
  {
    title: '创建人',
    dataIndex: 'createUserString',
    slotName: 'createUserString',
    width: 120,
  },
  {
    title: '执行人',
    dataIndex: 'debugRecord[0].executeName',
    slotName: 'executeName',
    width: 120,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    slotName: 'createTime',
    width: 180,
    ellipsis: true,
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    slotName: 'updateTime',
    width: 180,
    ellipsis: true,
  },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 240,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['automation:automationUiScene:get', 'automation:automationUiScene:update', 'automation:automationUiScene:delete']),
  },
]

// 表格引用
const tableRef = ref()

// 重置
const reset = () => {
  // queryForm.id = undefined
  // queryForm.sceneId = undefined
  // queryForm.name = undefined
  // queryForm.projectId = undefined
  // queryForm.versionId = undefined
  // queryForm.moduleId = undefined
  // queryForm.level = undefined
  // queryForm.executeStatus = undefined
  // queryForm.executeResult = undefined
  // queryForm.status = undefined
  // queryForm.createUser = undefined
  // queryForm.updateUser = undefined
  // queryForm.createTime = undefined
  // formRef.value?.resetFields()
  resetForm()
  queryForm.projectId = uiStore.projectId
  queryForm.versionId = uiStore.versionId
  // uiStore.fetchTrees()
  uiStore.moduleId = ''
}

onMounted(() => {
  // console.log('keys')
})

watch(() => uiStore.activeKey, (activeKey) => {
  // search()
})

watch(() => uiStore.versionId, async (newVersionId, oldVersionId) => {
  // console.log(newVersionId, oldVersionId)
  queryForm.projectId = uiStore.projectId
  queryForm.versionId = newVersionId
}, { immediate: true })

watch(() => queryForm.versionId, async (newVersionId, oldVersionId) => {
  // console.log(newVersionId, oldVersionId)
  if (newVersionId && oldVersionId && newVersionId !== oldVersionId) {
    await uiStore.fetchTrees(queryForm.projectId, newVersionId)
  }
})

watch(() => uiStore.moduleId, async (newModuleId) => {
  if (newModuleId) {
    queryForm.moduleId = newModuleId
  }
})

// 删除
const onDelete = (record?: AutomationUiSceneResp) => {
  return handleDelete(() => deleteAutomationUiScene(
    selectedKeys.value.length
      ? selectedKeys.value.map((id) => String(id))
      : record!.id,
  ), {
    content: selectedKeys.value.length ? '是否确定删除批量选中的数据？' : `是否确定删除「${record!.name}」？`,
    showModal: true,
    multiple: true,
  })
}

// 导出
const onExport = async () => {
  return handleExport(() => exportAutomationUiScene(
    selectedKeys.value.length
      ? {
          ...queryForm,
          id: selectedKeys.value.join(','),
          name: '批量选择导出',
        }
      : queryForm,
  ), {
    content: selectedKeys.value.length ? '是否确定导出批量选中的数据？' : `是否确定导出全部数据？`,
    showModal: true,
    multiple: true,
  })
}

// 组件引用类型
interface AutomationUiSceneAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface AutomationUiSceneDetailDrawerType {
  onOpen: (id: string) => void
}

const AutomationUiSceneAddModalRef = ref<AutomationUiSceneAddModalType>()
// 新增
const onAdd = () => {
  AutomationUiSceneAddModalRef.value?.onAdd()
}
// 详情
const onDetail = (record: AutomationUiSceneResp) => {
  emit('update-scene', { ...record, readonly: true })
}
// 修改
const onUpdate = (record: AutomationUiSceneResp) => {
  emit('update-scene', { ...record, readonly: false })
}
// 复制
const onCopy = (record: AutomationUiSceneResp) => {
  emit('update-scene', { ...record, readonly: false, copy: true })
}
// 执行
const onExecute = (record: AutomationUiSceneResp) => {
  emit('execute-scene', record)
}

const AutomationUiSceneDetailDrawerRef = ref<AutomationUiSceneDetailDrawerType>()

defineExpose({
  reset,
})
</script>

<script lang="tsx">
export default {}
</script>

<style scoped lang="scss">
:deep(.arco-space){
  display: flex;
  // flex-direction: column;
}
:deep(.w-full){
  gap: 8px 8px !important;
}
:deep(.arco-form){
  // margin-right: 100px;
  flex-direction: row;
  flex-wrap: initial;
}
:deep(.arco-picker-separator) {
  min-width: 10px;
  padding: 0px;
  color: var(--color-text-3);
}
</style>
