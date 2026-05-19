<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="项目管理-数据库配置管理"
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
        <a-input-search v-model="queryForm.id" placeholder="请输入数据库ID" allow-clear @search="search" />
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
          :options="database_type"
          placeholder="请选择数据库类型"
          allow-clear
          allow-search
          style="width: 160px"
          @change="search"
        />
        <a-input-search v-model="queryForm.ip" placeholder="请输入数据库IP" allow-clear @search="search" />
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
        <a-button v-permission="['project:projectDataBaseConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['project:projectDataBaseConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['project:projectDataBaseConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #type="{ record }">
        <GiCellTag :value="record.type" :dict="database_type" />
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #passWord="{ record }">
        <GiCellPassword
          :value="record.passWord"
          permission="project:projectDataBaseConfig:get"
          :on-show="() => onSecret(record)"
          :on-hide="() => onSecretHide(record)"
        />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['project:projectDataBaseConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['project:projectDataBaseConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['project:projectDataBaseConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link v-permission="['project:projectDataBaseConfig:test']" title="测试" @click="onTest(record)">测试</a-link>
          <a-link
            v-permission="['project:projectDataBaseConfig:delete']"
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

    <ProjectDataBaseConfigAddModal ref="ProjectDataBaseConfigAddModalRef" :project-list="projectList" @save-success="search" />
    <ProjectDataBaseConfigDetailDrawer ref="ProjectDataBaseConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import ProjectDataBaseConfigAddModal from './ProjectDataBaseConfigAddModal.vue'
import ProjectDataBaseConfigDetailDrawer from './ProjectDataBaseConfigDetailDrawer.vue'
import { type ProjectDataBaseConfigQuery, type ProjectDataBaseConfigResp, deleteProjectDataBaseConfig, exportProjectDataBaseConfig, getProjectDataBaseConfig, listProjectDataBaseConfig } from '@/apis/project/projectDataBaseConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { getProjectConfigList } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTags, GiCellVersion } from '@/components/GiCell'

defineOptions({ name: 'ProjectDataBaseConfig' })

const { database_type, status_type } = useDict('database_type', 'status_type')

const queryForm = reactive<ProjectDataBaseConfigQuery>({
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
} = useTable((page) => listProjectDataBaseConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: 'ID', dataIndex: 'id', slotName: 'id', width: 185, ellipsis: true, tooltip: true },
  {
    title: '所属项目',
    dataIndex: 'projectName',
    slotName: 'projectName',
    width: 240,
    render: ({ record }) => {
      return (
        <GiCellTags data={[record?.projectName]} />
      )
    },
  },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 120, ellipsis: true, tooltip: true },
  { title: '版本', dataIndex: 'version', slotName: 'version', width: 160, ellipsis: true, tooltip: true },
  { title: '驱动', dataIndex: 'driver', slotName: 'driver', width: 340, ellipsis: true, tooltip: true },
  { title: 'IP', dataIndex: 'ip', slotName: 'ip', width: 120, ellipsis: true, tooltip: true },
  { title: '端口', dataIndex: 'port', slotName: 'port', width: 80, ellipsis: true, tooltip: true },
  { title: '数据库/模式', dataIndex: 'dataBase', slotName: 'dataBase', width: 120, ellipsis: true, tooltip: true },
  { title: '用户名', dataIndex: 'userName', slotName: 'userName', width: 130, ellipsis: true, tooltip: true },
  { title: '密码', dataIndex: 'passWord', slotName: 'passWord', width: 160, ellipsis: true, tooltip: true },
  { title: 'URL', dataIndex: 'url', slotName: 'url', width: 700, ellipsis: true, tooltip: true },
  { title: '描述', dataIndex: 'description', slotName: 'description', width: 150, ellipsis: true, tooltip: true },
  {
    title: '数据库参数配置',
    dataIndex: 'configList',
    slotName: 'configList',
    width: 160,
    render: ({ record }) => {
      return (
        <GiCellTags data={record.configListNames} />
      )
    },
  },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true, tooltip: true },
  { title: '修改人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120, ellipsis: true, tooltip: true },
  { title: '修改时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 250,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['project:projectDataBaseConfig:get', 'project:projectDataBaseConfig:update', 'project:projectDataBaseConfig:delete']),
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
const onSecret = async (record: ProjectDataBaseConfigResp) => {
  const { data } = await getProjectDataBaseConfig(record.id)
  return record.passWord = data.passWord
}

// 隐藏密码
const onSecretHide = (record: ProjectDataBaseConfigResp) => {
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
const onDelete = (record?: ProjectDataBaseConfigResp) => {
  return handleDelete(() => deleteProjectDataBaseConfig(
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
  return handleExport(() => exportProjectDataBaseConfig(
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
interface ProjectDataBaseConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
  onTest: (record: any) => void
}
interface ProjectDataBaseConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const ProjectDataBaseConfigAddModalRef = ref<ProjectDataBaseConfigAddModalType>()
// 新增
const onAdd = () => {
  ProjectDataBaseConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: ProjectDataBaseConfigResp) => {
  ProjectDataBaseConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: ProjectDataBaseConfigResp) => {
  ProjectDataBaseConfigAddModalRef.value?.onCopy(record.id)
}

// 测试
const onTest = (record: ProjectDataBaseConfigResp) => {
  ProjectDataBaseConfigAddModalRef.value?.onTest(record)
}

const ProjectDataBaseConfigDetailDrawerRef = ref<ProjectDataBaseConfigDetailDrawerType>()
// 详情
const onDetail = (record: ProjectDataBaseConfigResp) => {
  ProjectDataBaseConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss"></style>
