<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="项目管理-服务器配置管理"
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
        <a-input-search v-model="queryForm.id" placeholder="请输入服务器ID" allow-clear @search="search" />
        <a-select
          v-model="queryForm.projectId"
          :options="projectList"
          placeholder="请选择所属项目"
          allow-clear
          allow-search
          style="width: 260px"
          @change="search"
        />
        <a-select
          v-model="queryForm.type"
          :options="server_type"
          placeholder="请选择服务器类型"
          allow-clear
          style="width: 160px"
          @change="search"
        />
        <a-input-search v-model="queryForm.ip" placeholder="请输入服务器IP" allow-clear @search="search" />
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
        <a-button v-permission="['project:projectServerConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['project:projectServerConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['project:projectServerConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #type="{ record }">
        <GiCellTag :value="record.type" :dict="server_type" />
      </template>
      <!-- <template #version="{ record }">
        <GiCellVersion :version="record.version" />
      </template> -->
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #passWord="{ record }">
        <GiCellPassword
          :value="record.passWord"
          permission="project:projectServerConfig:get"
          :on-show="() => onSecret(record)"
          :on-hide="() => onSecretHide(record)"
        />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['project:projectServerConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['project:projectServerConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['project:projectServerConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link v-permission="['project:projectServerConfig:test']" title="测试" @click="onTest(record)">测试</a-link>
          <a-link
            v-permission="['project:projectServerConfig:delete']"
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

    <ProjectServerConfigAddModal ref="ProjectServerConfigAddModalRef" :project-list="projectList" @save-success="search" />
    <ProjectServerConfigDetailDrawer ref="ProjectServerConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import ProjectServerConfigAddModal from './ProjectServerConfigAddModal.vue'
import ProjectServerConfigDetailDrawer from './ProjectServerConfigDetailDrawer.vue'
import { type ProjectServerConfigQuery, type ProjectServerConfigResp, deleteProjectServerConfig, exportProjectServerConfig, getProjectServerConfig, listProjectServerConfig } from '@/apis/project/projectServerConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { getProjectConfigList } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTags, GiCellVersion } from '@/components/GiCell'

defineOptions({ name: 'ProjectServerConfig' })

const { server_type, status_type } = useDict('server_type', 'status_type')

const queryForm = reactive<ProjectServerConfigQuery>({
  id: undefined,
  projectId: undefined,
  type: undefined,
  ip: undefined,
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
} = useTable((page) => listProjectServerConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: 'ID', dataIndex: 'id', slotName: 'id', fixed: 'left', width: 185, ellipsis: true, tooltip: true },
  // { title: '所属项目', dataIndex: 'projectId', slotName: 'projectId', width: 120, ellipsis: true, tooltip: true },
  {
    title: '所属项目',
    dataIndex: 'projectName',
    slotName: 'projectName',
    fixed: 'left',
    width: 240,
    render: ({ record }) => {
      return (
        <GiCellTags data={[record?.projectName]} />
      )
    },
  },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 100, ellipsis: true, tooltip: true },
  { title: '版本', dataIndex: 'version', slotName: 'version', width: 180, ellipsis: true, tooltip: true },
  { title: 'IP', dataIndex: 'ip', slotName: 'ip', width: 120, ellipsis: true, tooltip: true },
  { title: '端口', dataIndex: 'port', slotName: 'port', width: 80, ellipsis: true, tooltip: true },
  { title: '用户名', dataIndex: 'userName', slotName: 'userName', width: 80, ellipsis: true, tooltip: true },
  { title: '密码', dataIndex: 'passWord', slotName: 'passWord', width: 140, ellipsis: true, tooltip: true },
  { title: '描述', dataIndex: 'description', slotName: 'description', width: 150, ellipsis: true, tooltip: true },
  {
    title: '参数配置',
    dataIndex: 'configList',
    slotName: 'configList',
    width: 120,
    align: 'center',
    render: ({ record }) => {
      return (
        <GiCellKeyValue data={record.configList} title="服务器参数配置" />
        // <GiCellKeyValue data={record?.configList ?? []} title="服务器参数配置" />
      )
    },
  },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true, tooltip: true },
  { title: '修改人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120, ellipsis: true, tooltip: true },
  { title: '修改时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true, tooltip: true },
  // { title: '更新人IP', dataIndex: 'updateIp', slotName: 'updateIp', width: 120, ellipsis: true, tooltip: true },
  // { title: '删除标志（3正常 4异常）', dataIndex: 'delFlag', slotName: 'delFlag', width: 120, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 250,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['project:projectServerConfig:get', 'project:projectServerConfig:update', 'project:projectServerConfig:delete']),
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
// 显示密码
const onSecret = async (record: ProjectServerConfigResp) => {
  const { data } = await getProjectServerConfig(record.id)
  return record.passWord = data.passWord
}

// 隐藏密码
const onSecretHide = (record: ProjectServerConfigResp) => {
  return record.passWord = ''
}

// 重置
const reset = () => {
  queryForm.id = undefined
  queryForm.projectId = undefined
  queryForm.type = undefined
  queryForm.ip = undefined
  queryForm.status = undefined
  search()
}

// 删除
const onDelete = (record?: ProjectServerConfigResp) => {
  return handleDelete(() => deleteProjectServerConfig(
    selectedKeys.value.length
      ? selectedKeys.value.map((id) => String(id))
      : record!.id,
  ), {
    content: selectedKeys.value.length ? '是否确定删除批量选中的数据？' : `是否确定删除「${record!.ip}」？`,
    showModal: true,
    multiple: true,
  })
}

// 导出
const onExport = async () => {
  return handleExport(() => exportProjectServerConfig(
    selectedKeys.value.length
      ? {
          ...queryForm,
          id: selectedKeys.value.join(','),
          ip: '批量选择导出',
        }
      : queryForm,
  ), {
    content: selectedKeys.value.length ? '是否确定导出批量选中的数据？' : `是否确定导出全部数据？`,
    showModal: true,
    multiple: true,
  })
}

// 组件引用类型
interface ProjectServerConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
  onTest: (record: any) => void
}
interface ProjectServerConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const ProjectServerConfigAddModalRef = ref<ProjectServerConfigAddModalType>()
// 新增
const onAdd = () => {
  ProjectServerConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: ProjectServerConfigResp) => {
  ProjectServerConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: ProjectServerConfigResp) => {
  ProjectServerConfigAddModalRef.value?.onCopy(record.id)
}

// 测试
const onTest = (record: ProjectServerConfigResp) => {
  ProjectServerConfigAddModalRef.value?.onTest(record)
}

const ProjectServerConfigDetailDrawerRef = ref<ProjectServerConfigDetailDrawerType>()
// 详情
const onDetail = (record: ProjectServerConfigResp) => {
  ProjectServerConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss">
:deep(.gi-cell-key-value) {
  display: flex;
  align-items: center;
  justify-content: space-around;
}
</style>
