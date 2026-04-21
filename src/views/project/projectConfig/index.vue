<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="项目配置管理"
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: true, y: '100%', minWidth: 1500 }"
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
      <template #toolbar-left>
        <a-input-search v-model="queryForm.id" placeholder="请输入项目ID" allow-clear @search="search" />
        <a-input-search v-model="queryForm.name" placeholder="请输入项目名称" style="width: 260px;" allow-clear @search="search" />
        <a-input-search v-model="queryForm.abbreviate" placeholder="请输入项目简称" allow-clear @search="search" />
        <a-select
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
        <a-button v-permission="['project:projectConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['project:projectConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['project:projectConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #status="{ record }">
        <!-- <GiCellStatus :status="record.status" /> -->
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['project:projectConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['project:projectConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['project:projectConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link
            v-permission="['project:projectConfig:delete']"
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

    <ProjectConfigAddModal ref="ProjectConfigAddModalRef" @save-success="search" />
    <ProjectConfigDetailDrawer ref="ProjectConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import ProjectConfigAddModal from './ProjectConfigAddModal.vue'
import ProjectConfigDetailDrawer from './ProjectConfigDetailDrawer.vue'
import { type ProjectConfigQuery, type ProjectConfigResp, deleteProjectConfig, exportProjectConfig, listProjectConfig } from '@/apis/project/projectConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import GiCellTags from '@/components/GiCell/GiCellTags.vue'

defineOptions({ name: 'ProjectConfig' })

const { status_type } = useDict('status_type')

const queryForm = reactive<ProjectConfigQuery>({
  id: undefined,
  name: undefined,
  abbreviate: undefined,
  status: undefined,
  sort: ['createTime,desc'],
})

const {
  tableData: dataList,
  loading,
  search,
  pagination,
  select,
  selectAll,
  selectedKeys,
  handleDelete,
  handleExport,
} = useTable((page) => listProjectConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: '项目ID', dataIndex: 'id', slotName: 'id', width: 185 },
  { title: '项目名称', dataIndex: 'name', slotName: 'name', width: 250, ellipsis: true, tooltip: true },
  { title: '项目简称', dataIndex: 'abbreviate', slotName: 'abbreviate', width: 120, ellipsis: true, tooltip: true },
  {
    title: '项目成员',
    dataIndex: 'member',
    slotName: 'member',
    width: 160,
    render: ({ record }) => {
      return (
        <GiCellTags data={record.memberNames} />
      )
    },
  },
  // { title: '项目描述', dataIndex: 'description', slotName: 'description' },
  // { title: '项目域名', dataIndex: 'lastDomain', slotName: 'lastDomain', width: 250, show: true },
  // { title: '主线版本', dataIndex: 'lastVersion', slotName: 'lastVersion', width: 100, show: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120 },
  // { title: '创建部门', dataIndex: 'deptId', slotName: 'deptId' },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180 },
  { title: '修改人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120 },
  { title: '修改时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180 },
  // { title: '更新IP', dataIndex: 'updateIp', slotName: 'updateIp' },
  // { title: '备注', dataIndex: 'remark', slotName: 'remark' },
  // { title: '版本', dataIndex: 'version', slotName: 'version' },
  // { title: '删除标志', dataIndex: 'delFlag', slotName: 'delFlag' },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 210,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['project:projectConfig:get', 'project:projectConfig:update', 'project:projectConfig:delete']),
  },
]

// 表格引用
const tableRef = ref()

// 重置
const reset = () => {
  queryForm.id = undefined
  queryForm.name = undefined
  queryForm.abbreviate = undefined
  queryForm.status = undefined
  search()
}
// 删除
const onDelete = (record?: ProjectConfigResp) => {
  return handleDelete(() => deleteProjectConfig(
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
  return handleExport(() => exportProjectConfig(
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
interface ProjectConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface ProjectConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const ProjectConfigAddModalRef = ref<ProjectConfigAddModalType>()
// 新增
const onAdd = () => {
  ProjectConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: ProjectConfigResp) => {
  ProjectConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: ProjectConfigResp) => {
  ProjectConfigAddModalRef.value?.onCopy(record.id)
}

const ProjectConfigDetailDrawerRef = ref<ProjectConfigDetailDrawerType>()
// 详情
const onDetail = (record: ProjectConfigResp) => {
  ProjectConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss"></style>
