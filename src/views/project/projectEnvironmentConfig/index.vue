<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="项目管理-环境配置管理"
      row-key="id"
      :data="dataList"
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
      <template #toolbar-left>
        <a-input-search v-model="queryForm.id" placeholder="请输入环境ID" allow-clear @search="search" />
        <a-select
          v-model="queryForm.projectId"
          :options="projectList"
          placeholder="请选择所属项目"
          allow-clear
          allow-search
          style="width: 260px"
          @change="search"
        />
        <a-input-search v-model="queryForm.name" placeholder="请输入环境名称" allow-clear @search="search" />
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
        <a-button v-permission="['project:projectEnvironmentConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['project:projectEnvironmentConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['project:projectEnvironmentConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['project:projectEnvironmentConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['project:projectEnvironmentConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['project:projectEnvironmentConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link
            v-permission="['project:projectEnvironmentConfig:delete']"
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

    <ProjectEnvironmentConfigAddModal ref="ProjectEnvironmentConfigAddModalRef" :project-list="projectList" @save-success="search" />
    <ProjectEnvironmentConfigDetailDrawer ref="ProjectEnvironmentConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import ProjectEnvironmentConfigAddModal from './ProjectEnvironmentConfigAddModal.vue'
import ProjectEnvironmentConfigDetailDrawer from './ProjectEnvironmentConfigDetailDrawer.vue'
import { type ProjectEnvironmentConfigQuery, type ProjectEnvironmentConfigResp, deleteProjectEnvironmentConfig, exportProjectEnvironmentConfig, listProjectEnvironmentConfig } from '@/apis/project/projectEnvironmentConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { getProjectConfigList } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTags, GiCellVersion } from '@/components/GiCell'

defineOptions({ name: 'ProjectEnvironmentConfig' })

const { version_type, server_type, database_type, status_type } = useDict('version_type', 'server_type', 'database_type', 'status_type')

const queryForm = reactive<ProjectEnvironmentConfigQuery>({
  id: undefined,
  projectId: undefined,
  name: undefined,
  status: undefined,
  sort: ['createTime,desc'],
})

const {
  tableData: dataList,
  loading,
  pagination,
  search,
  select,
  selectAll,
  selectedKeys,
  handleDelete,
  handleExport,
} = useTable((page) => listProjectEnvironmentConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: '环境ID', dataIndex: 'id', slotName: 'id', width: 185, ellipsis: true, tooltip: true },
  {
    title: '所属项目',
    dataIndex: 'projectName',
    slotName: 'projectName',
    width: 240,
    render: ({ record }) => {
      return (
        <GiCellTags data={[record.projectName]} />
      )
    },
  },
  { title: '环境名称', dataIndex: 'name', slotName: 'name', width: 120, ellipsis: true, tooltip: true },
  { title: '环境描述', dataIndex: 'description', slotName: 'description', width: 150, ellipsis: true, tooltip: true },
  {
    title: '版本配置',
    dataIndex: 'versionConfig',
    slotName: 'versionConfig',
    width: 130,
    align: 'center',
    render: ({ record }) => {
      const versionData = Array.isArray(record.versionConfig)
        ? record.versionConfig
        : [record.versionConfig]
      const versionConfig = versionData.flatMap((item: any) => [
        { paramsName: '版本ID', paramsValue: item?.id ?? '' },
        { paramsName: '版本名称', paramsValue: item?.name ?? '' },
        { paramsName: '版本描述', paramsValue: item?.description ?? '' },
        { paramsName: '版本类型', paramsValue: item?.type ?? '', paramsType: version_type.value },
        { paramsName: '版本状态', paramsValue: item?.status ?? '' },
      ])
      return (
        <GiCellKeyValue data={versionConfig} slotName={true} title="版本配置" />
      )
    },
  },
  {
    title: '服务器配置',
    dataIndex: 'serverConfig',
    slotName: 'serverConfig',
    width: 120,
    align: 'center',
    render: ({ record }) => {
      const serverData = Array.isArray(record.serverConfig)
        ? record.serverConfig
        : [record.serverConfig]
      const serverConfig = serverData.flatMap((item: any) => [
        { paramsName: '服务器ID', paramsValue: item?.id ?? '' },
        { paramsName: '服务器类型', paramsValue: item?.type ?? '', paramsType: server_type.value },
        { paramsName: '服务器版本', paramsValue: item?.version ?? '' },
        { paramsName: '服务器IP', paramsValue: item?.ip ?? '' },
        { paramsName: '服务器端口', paramsValue: item?.port ?? '' },
        { paramsName: '服务器用户名', paramsValue: item?.userName },
        { paramsName: '服务器密码', paramsValue: item?.passWord },
        { paramsName: '服务器描述', paramsValue: item?.description ?? '' },
        { paramsName: '服务器参数配置', paramsValue: item?.configList ?? '' },
        { paramsName: '服务器状态', paramsValue: item?.status ?? '' },
      ])
      return (
        <GiCellKeyValue data={serverConfig} slotName={true} title="服务器配置" />
      )
    },
  },
  {
    title: '数据库配置',
    dataIndex: 'dataBaseConfig',
    slotName: 'dataBaseConfig',
    width: 120,
    align: 'center',
    render: ({ record }) => {
      const dataBaseData = Array.isArray(record.dataBaseConfig)
        ? record.dataBaseConfig
        : [record.dataBaseConfig]
      const dataBaseConfig = dataBaseData.flatMap((item: any) => [
        { paramsName: '数据库ID', paramsValue: item?.id ?? '' },
        { paramsName: '数据库类型', paramsValue: item?.type ?? '', paramsType: database_type.value },
        { paramsName: '数据库版本', paramsValue: item?.version ?? '' },
        { paramsName: '数据库驱动', paramsValue: item?.driver ?? '' },
        { paramsName: '数据库IP', paramsValue: item?.ip ?? '' },
        { paramsName: '数据库端口', paramsValue: item?.port ?? '' },
        { paramsName: '数据库/模式', paramsValue: item?.dataBase ?? '' },
        { paramsName: '数据库用户名', paramsValue: item?.userName ?? '' },
        { paramsName: '数据库密码', paramsValue: item?.passWord ?? '' },
        { paramsName: '数据库URL', paramsValue: item?.url ?? '' },
        { paramsName: '数据库描述', paramsValue: item?.description ?? '' },
        { paramsName: '数据库参数配置', paramsValue: item?.configList ?? '' },
        { paramsName: '数据库状态', paramsValue: item?.status ?? '' },
      ])
      return (
        <GiCellKeyValue data={dataBaseConfig} slotName={true} title="数据库配置" />
      )
    },
  },
  // { title: '主线版本', dataIndex: 'lastVersion', slotName: 'lastVersion', width: 120, ellipsis: true, tooltip: true },
  // { title: '环境域名', dataIndex: 'lastDomain', slotName: 'lastDomain', width: 120, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120, ellipsis: true, tooltip: true },
  // { title: '创建部门', dataIndex: 'deptId', slotName: 'deptId', width: 120, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true, tooltip: true },
  { title: '修改人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120, ellipsis: true, tooltip: true },
  { title: '修改时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true, tooltip: true },
  // { title: '更新IP', dataIndex: 'updateIp', slotName: 'updateIp', width: 120, ellipsis: true, tooltip: true },
  // { title: '备注', dataIndex: 'remark', slotName: 'remark', width: 120, ellipsis: true, tooltip: true },
  // { title: '版本', dataIndex: 'version', slotName: 'version', width: 120, ellipsis: true, tooltip: true },
  // { title: '删除标志（3正常 4异常）', dataIndex: 'delFlag', slotName: 'delFlag', width: 120, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 210,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['project:projectEnvironmentConfig:get', 'project:projectEnvironmentConfig:update', 'project:projectEnvironmentConfig:delete']),
  },
]

const projectList = ref<LabelValueState[]>([])

const getProjectConfig = async () => {
  try {
    const res = await getProjectConfigList()
    projectList.value = (res.data || []).map((item) => ({
      label: item.name,
      value: item.id,
    }))
  } catch (error) {
    console.error('获取项目列表失败', error)
  }
}

// 组件挂载时自动调用
onMounted(() => {
  getProjectConfig()
})

// 表格引用
const tableRef = ref()

// 重置
const reset = () => {
  queryForm.id = undefined
  queryForm.projectId = undefined
  queryForm.name = undefined
  queryForm.status = undefined
  search()
}

// 删除
const onDelete = (record?: ProjectEnvironmentConfigResp) => {
  return handleDelete(() => deleteProjectEnvironmentConfig(
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
  return handleExport(() => exportProjectEnvironmentConfig(
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
interface ProjectEnvironmentConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface ProjectEnvironmentConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const ProjectEnvironmentConfigAddModalRef = ref<ProjectEnvironmentConfigAddModalType>()
// 新增
const onAdd = () => {
  ProjectEnvironmentConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: ProjectEnvironmentConfigResp) => {
  ProjectEnvironmentConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: ProjectEnvironmentConfigResp) => {
  ProjectEnvironmentConfigAddModalRef.value?.onCopy(record.id)
}

const ProjectEnvironmentConfigDetailDrawerRef = ref<ProjectEnvironmentConfigDetailDrawerType>()
// 详情
const onDetail = (record: ProjectEnvironmentConfigResp) => {
  ProjectEnvironmentConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss">
:deep(.gi-cell-key-value) {
  display: flex;
  align-items: center;
  justify-content: space-around;
}
</style>
