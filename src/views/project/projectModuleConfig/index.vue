<template>
  <GiPageLayout>
    <div class="header-actions">
      <a-radio-group v-model="viewType" type="button" size="small" style="margin-bottom: 16px;">
        <a-radio value="table">表格视图</a-radio>
        <a-radio value="tree1">树结构视图</a-radio>
        <a-radio value="tree2">组织架构图</a-radio>
      </a-radio-group>
    </div>
    <GiTable
      v-show="viewType === 'table' || viewType === 'tree1'"
      :key="viewType === 'table' ? 'table' : 'tree1'"
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      row-key="id"
      :data="dataList"
      :columns="viewType === 'table' ? columns : columns1"
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
      <template #expand-icon="{ expanded }">
        <IconDown v-if="expanded" />
        <IconRight v-else />
      </template>
      <template #toolbar-left>
        <a-input-search v-if="viewType === 'table'" v-model="queryForm.id" placeholder="请输入模块ID" allow-clear @search="search" />
        <a-select
          v-model="queryForm.projectId"
          :options="projectList"
          placeholder="请选择项目"
          allow-clear
          allow-search
          style="width: 250px"
        />
        <a-select
          v-model="queryForm.versionId"
          :options="versionList"
          placeholder="请选择版本"
          allow-clear
          allow-search
          style="width: 150px"
          @change="search"
        />
        <a-input-search v-model="queryForm.name" placeholder="请输入模块名称" allow-clear @search="search" />
        <a-select
          v-if="viewType === 'table'"
          v-model="queryForm.status"
          :options="status_type.filter(item => item.value === '1' || item.value === '2')"
          placeholder="请选择状态"
          allow-clear
          style="width: 150px"
          @change="search"
        />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          <template #default>重置</template>
        </a-button>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['project:projectModuleConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['project:projectModuleConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['project:projectModuleConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['project:projectModuleConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['project:projectModuleConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['project:projectModuleConfig:create']" title="新增" @click="onCopy(record)">新增</a-link>
          <a-link
            v-permission="['project:projectModuleConfig:delete']"
            status="danger"
            :disabled="record.disabled"
            :title="record.disabled ? '禁止删除' : '删除'"
            @click="onDelete(record)"
          >
            删除
          </a-link>
        </a-space>
      </template>
    </GiTable>
    <!-- 组织架构图视图 -->
    <div v-show="viewType === 'tree2'">
      <a-card>
        <div class="tree2-header">
          <a-select
            v-model="queryForm.projectId"
            :options="projectList"
            placeholder="请选择项目"
            allow-clear
            allow-search
            style="width: 280px"
            @change="search"
          />
          <a-select
            v-model="queryForm.versionId"
            :options="versionList"
            placeholder="请选择版本"
            allow-clear
            allow-search
            style="width: 200px"
            @change="search"
          />
          <a-input-search v-model="queryForm.name" style="width: 250px" placeholder="请输入模块名称" allow-clear @search="search" />
          <a-button @click="reset">
            <template #icon><icon-refresh /></template>
            <template #default>重置</template>
          </a-button>
        </div>
        <a-dropdown trigger="contextMenu">
          <Vue3TreeOrg
            v-if="transformedData"
            :data="transformedData"
            :collapsable="true"
            :horizontal="false"
            :define-menus="menus"
            :expand-all="true"
            :default-expand-level="999"
            :props="{ id: 'id', parentId: 'parentId', label: 'name', children: 'children' }"
            center
            :node-add="onCopy"
            :node-delete="onDelete"
            :node-edit="onUpdate"
            @on-expand-all="bool => nodeExpandAll = bool"
          >
          </Vue3TreeOrg>
        </a-dropdown>
      </a-card>
    </div>
    <ProjectModuleConfigAddModal ref="ProjectModuleConfigAddModalRef" :project-list="projectList" :version-list="versionList" :module-list="dataList" @get-version-list="getVersionList" @get-module-list="getModuleList" @save-success="search" />
    <ProjectModuleConfigDetailDrawer ref="ProjectModuleConfigDetailDrawerRef" :project-list="projectList" />
  </GiPageLayout>
</template>

<script setup lang="tsx">
import 'vue3-tree-org/lib/vue3-tree-org.css'
import { Vue3TreeOrg } from 'vue3-tree-org'
import type { TableInstance } from '@arco-design/web-vue'
import ProjectModuleConfigAddModal from './ProjectModuleConfigAddModal.vue'
import ProjectModuleConfigDetailDrawer from './ProjectModuleConfigDetailDrawer.vue'
import { type ProjectModuleConfigQuery, type ProjectModuleConfigResp, deleteProjectModuleConfig, exportProjectModuleConfig, getProjectModuleConfig, getProjectModuleConfigList, listProjectModuleConfig, listProjectModuleConfigTree } from '@/apis/project/projectModuleConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { getProjectConfigList } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTags, GiCellVersion } from '@/components/GiCell'
import type GiTable from '@/components/GiTable/index.vue'
import { getProjectVersionConfigList } from '@/apis/project/projectVersionConfig'

defineOptions({ name: 'ProjectModuleConfig' })

const { status_type } = useDict('status_type')

const queryForm = reactive<ProjectModuleConfigQuery>({
  projectId: undefined,
  versionId: undefined,
  name: undefined,
  status: undefined,
  sort: ['projectId,desc', 'versionId,desc', 'sort,asc'],
})

const tableKey = ref('table')
// 查看视图类型
const viewType = ref('table')
// 组织架构图右键菜单
const menus = [
  { name: '添加模块', command: 'add' },
  { name: '编辑模块', command: 'edit' },
  { name: '删除模块', command: 'delete' },
]
// 所有节点展开状态
const nodeExpandAll = ref<boolean>(true)

const tableRef = ref<InstanceType<typeof GiTable>>()
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
} = useTable((page) => viewType.value === 'table' ? listProjectModuleConfig({ ...queryForm, ...page }) : listProjectModuleConfigTree(queryForm), {
  immediate: true,
  onSuccess: () => {
    nextTick(() => {
      tableRef.value?.tableRef?.expandAll()
    })
  },
})

const projectList = ref<LabelValueState[]>([])
const versionList = ref<LabelValueState[]>([])
const moduleList = ref<LabelValueState[]>([])
const getProjectConfig = async () => {
  try {
    const res = await getProjectConfigList({
      status: 1,
      sort: ['name,desc'],
    })
    projectList.value = res.data.map((item) => ({
      label: item.name,
      value: item.id,
    }))
  } catch (error) {
    console.error('获取项目列表失败', error)
  }
}
const getVersionList = async (newProjectId?: string) => {
  versionList.value = []
  try {
    const res = await getProjectVersionConfigList({
      projectId: newProjectId,
      status: 1,
      sort: ['name,desc'],
    })
    versionList.value = res.data.map((item) => ({
      label: item.name,
      value: item.id,
      extra: item.type,
    }))
    queryForm.versionId = versionList.value.find((item) => item.extra === '1')?.value ?? undefined
    search()
  } catch (error) {
    console.error('获取版本列表失败', error)
  }
}
const getModuleList = async (newProjectId?: string, newVersionId?: string) => {
  try {
    const res = await listProjectModuleConfigTree({
      projectId: newProjectId,
      versionId: newVersionId,
      sort: ['sort,asc'],
    })
    moduleList.value = res.data.map((item) => ({
      label: item.name,
      value: item.id,
    }))
  } catch (error) {
    console.error('获取模块列表失败', error)
  }
}

// 重置
const reset = () => {
  queryForm.id = undefined
  queryForm.projectId = undefined
  queryForm.versionId = undefined
  queryForm.name = undefined
  queryForm.status = undefined
  versionList.value = []
  search()
}

// 过滤树
const searchData = (name: string) => {
  const loop = (data: ProjectModuleConfigResp[]) => {
    const result = [] as ProjectModuleConfigResp[]
    data.forEach((item: ProjectModuleConfigResp) => {
      if (item.name?.toLowerCase().includes(name.toLowerCase())) {
        result.push({ ...item })
      } else if (item.children) {
        const filterData = loop(item.children)
        if (filterData.length) {
          result.push({
            ...item,
            children: filterData,
          })
        }
      }
    })
    return result
  }
  return loop(tableData.value)
}

// const name = ref('')
const dataList = computed(() => {
  if (!queryForm.name) return tableData.value
  return searchData(queryForm.name)
})

const transformedData = computed(() => {
  const transform = (node) => {
    return {
      ...node,
      name: node.name,
      // name: node.parentId === 0 ? projectList.value.find((item) => item.value === node.projectId)?.label : node.name, // 注入 label 字段
      children: node.children?.map(transform),
    }
  }
  return dataList.value.length ? transform(dataList.value[0]) : {}
})

watch(() => viewType.value, async (newViewType) => {
  if (['tree1', 'tree2'].includes(newViewType)) {
    queryForm.status = newViewType === 'tree1' ? undefined : newViewType === 'tree2' ? '1' : queryForm.status
    tableData.value = await listProjectModuleConfigTree(queryForm).then((res) => res.data)
    nextTick(() => {
      tableRef.value?.tableRef?.expandAll()
    })
  } else {
    tableData.value = await listProjectModuleConfig(queryForm).then((res) => res.data.list)
    // reset()
  }
  tableKey.value = newViewType
}, { immediate: true })

watch(() => queryForm.projectId, async (newProjectId) => {
  if (newProjectId) {
    await getVersionList(newProjectId)
    // queryForm.versionId = undefined
    queryForm.name = undefined
    queryForm.status = viewType.value === 'tree2' ? '1' : undefined
  }
})

// 组件挂载时自动调用
onMounted(() => {
  getProjectConfig()
  // getVersionList()
  // getModuleList()
  // if (queryForm.projectId) {
  //   getVersionList(queryForm.projectId)
  // }
})

const columns: TableInstance['columns'] = [
  { title: '模块ID', dataIndex: 'id', slotName: 'id', width: 185, ellipsis: true, tooltip: true },
  {
    title: '所属项目',
    dataIndex: 'projectId',
    slotName: 'projectId',
    width: 240,
    render: ({ record }) => {
      return (
        <GiCellTags data={[projectList.value.find((item) => item.value === record.projectId)?.label ?? '']} />
      )
    },
  },
  {
    title: '所属版本',
    dataIndex: 'versionName',
    slotName: 'versionName',
    width: 120,
    render: ({ record }) => {
      return (
        <GiCellTags data={[record.versionName]} />
      )
    },
  },
  {
    title: '所属模块',
    dataIndex: 'parentName',
    slotName: 'parentName',
    width: 240,
    render: ({ record }) => {
      return (
        <GiCellTags data={[record.parentId === 0 ? '顶级模块' : record.parentName]} />
      )
    },
  },
  {
    title: '模块名称',
    dataIndex: 'name',
    slotName: 'name',
    width: 170,
    ellipsis: true,
    tooltip: true,
    render: ({ record }) => {
      return (
        record.parentId === 0 ? projectList.value.find((item) => item.value === record.projectId)?.label : record.name
      )
    },
  },
  { title: '模块描述', dataIndex: 'description', slotName: 'description', width: 120, ellipsis: true, tooltip: true },
  { title: '模块排序', dataIndex: 'sort', slotName: 'sort', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  // { title: '模块路径', dataIndex: 'path', slotName: 'path', width: 120, ellipsis: true, tooltip: true },
  // { title: '模块下数据总数', dataIndex: 'count', slotName: 'count', width: 120, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true, tooltip: true },
  { title: '更新人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120, ellipsis: true, tooltip: true },
  { title: '更新时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true, tooltip: true },
  // { title: '更新人IP', dataIndex: 'updateIp', slotName: 'updateIp', width: 120, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 210,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['project:projectModuleConfig:get', 'project:projectModuleConfig:update', 'project:projectModuleConfig:delete']),
  },
]

const columns1: TableInstance['columns1'] = [
  {
    title: '模块名称',
    dataIndex: 'name',
    slotName: 'name',
    width: 300,
    ellipsis: true,
    tooltip: true,
    // render: ({ record }) => {
    //   return (
    //     record.parentId === 0 ? projectList.value.find((item) => item.value === record.projectId)?.label : record.name
    //   )
    // },
  },
  { title: '模块描述', dataIndex: 'description', slotName: 'description', width: 200, ellipsis: true, tooltip: true },
  { title: '模块排序', dataIndex: 'sort', slotName: 'sort', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true, tooltip: true },
  { title: '更新人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120, ellipsis: true, tooltip: true },
  { title: '更新时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 210,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['project:projectModuleConfig:get', 'project:projectModuleConfig:update', 'project:projectModuleConfig:delete']),
  },
]

// 删除
const onDelete = (record?: ProjectModuleConfigResp) => {
  return handleDelete(() => deleteProjectModuleConfig(
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
  return handleExport(() => exportProjectModuleConfig(
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
interface ProjectModuleConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface ProjectModuleConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const ProjectModuleConfigAddModalRef = ref<ProjectModuleConfigAddModalType>()
// 新增
const onAdd = () => {
  ProjectModuleConfigAddModalRef.value?.onAdd()
  versionList.value = []
}

// 修改
const onUpdate = (record: ProjectModuleConfigResp) => {
  ProjectModuleConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: ProjectModuleConfigResp) => {
  ProjectModuleConfigAddModalRef.value?.onCopy(record.id)
}

const ProjectModuleConfigDetailDrawerRef = ref<ProjectModuleConfigDetailDrawerType>()
// 详情
const onDetail = (record: ProjectModuleConfigResp) => {
  ProjectModuleConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss">
.tree2-header {
  // width: 60%;
  display: flex;
  // align-items: center;
  // margin-bottom: 10px;
  gap: 10px;
}
:deep(.arco-card-size-medium .arco-card-body) {
  padding: 0px;
}
:deep(.zm-draggable) {
  margin-top: 4px;
}

:deep(.zm-tree-org .zoom-container) {
  background-color: var(--color-bg-1);
  color: var(--color-text-1);
}

:deep(.tree-org-node__content) {
  background-color: var(--color-bg-2);
  color: var(--color-text-1);
  cursor: pointer;
  position: relative;
}

.zm-tree-org {
  background-color: var(--color-bg-1);
  height: calc(100vh - 265px);
}

:global(.zm-tree-contextmenu) {
  color: var(--color-text-1) !important;
  position: fixed !important;
  background: var(--color-bg-2) !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 4px !important;
  padding: 4px 0 !important;
  min-width: 120px !important;
  z-index: 999 !important;

  ul {
    background: var(--color-bg-1) !important;
    list-style-type: none !important;
    padding: 10px !important;
    margin: 0 !important;
  }

  .zm-tree-menu-item {
    background-color: var(--color-bg-1) !important;
    padding: 5px 15px !important;
    margin-top: 10px !important;
    cursor: pointer !important;
    transition: background-color 0.1s ease !important;
    list-style: none !important;
  }
}
:deep(.tree-org-node__expand){
  background-color: var(--color-bg-1) !important;
}
</style>
