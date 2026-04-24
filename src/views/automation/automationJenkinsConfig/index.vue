<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="自动化管理-Jenkins配置管理"
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
        <a-input-search v-model="queryForm.id" placeholder="请输入ID" allow-clear @search="search" />
        <a-input-search v-model="queryForm.ip" placeholder="请输入IP" allow-clear @search="search" />
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
        <a-button v-permission="['automation:automationJenkinsConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['automation:automationJenkinsConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['automation:automationJenkinsConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #passWord="{ record }">
        <GiCellPassword
          :value="record.passWord"
          permission="automation:automationJenkinsConfig:get"
          :on-show="() => onSecret(record)"
          :on-hide="() => onSecretHide(record)"
        />
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['automation:automationJenkinsConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['automation:automationJenkinsConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['automation:automationJenkinsConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link
            v-permission="['automation:automationJenkinsConfig:delete']"
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

    <AutomationJenkinsConfigAddModal ref="AutomationJenkinsConfigAddModalRef" @save-success="search" />
    <AutomationJenkinsConfigDetailDrawer ref="AutomationJenkinsConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import AutomationJenkinsConfigAddModal from './AutomationJenkinsConfigAddModal.vue'
import AutomationJenkinsConfigDetailDrawer from './AutomationJenkinsConfigDetailDrawer.vue'
import { type AutomationJenkinsConfigQuery, type AutomationJenkinsConfigResp, deleteAutomationJenkinsConfig, exportAutomationJenkinsConfig, getAutomationJenkinsConfig, listAutomationJenkinsConfig } from '@/apis/automation/automationJenkinsConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { listProjectConfig } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTags, GiCellVersion } from '@/components/GiCell'

defineOptions({ name: 'AutomationJenkinsConfig' })

const { status_type, automation_type } = useDict('status_type', 'automation_type')

const queryForm = reactive<AutomationJenkinsConfigQuery>({
  id: undefined,
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
} = useTable((page) => listAutomationJenkinsConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: 'ID', dataIndex: 'id', slotName: 'id', width: 180, ellipsis: true, tooltip: true },
  { title: '版本', dataIndex: 'version', slotName: 'version', width: 140, ellipsis: true, tooltip: true },
  // { title: 'IP', dataIndex: 'ip', slotName: 'ip', width: 120, ellipsis: true, tooltip: true },
  {
    title: 'IP',
    dataIndex: 'description',
    slotName: 'description',
    width: 120,
    align: 'center',
    render: ({ record }) => {
      const list = [
        { paramsName: 'IP', paramsValue: record?.ip ?? '' },
        { paramsName: '端口', paramsValue: record?.port ?? '' },
        { paramsName: '用户名', paramsValue: record?.userName ?? '' },
        { paramsName: '密码', paramsValue: record?.passWord ?? '' },
        { paramsName: '地址', paramsValue: record?.url ?? '' },
        { paramsName: '描述', paramsValue: record?.description ?? '' },
      ]
      return (
        <GiCellKeyValue data={list} slotName={true} title="Jenkins" />
      )
    },
  },
  // { title: '端口', dataIndex: 'port', slotName: 'port', width: 80, ellipsis: true, tooltip: true },
  // { title: '用户名', dataIndex: 'userName', slotName: 'userName', width: 80, ellipsis: true, tooltip: true },
  // { title: '密码', dataIndex: 'passWord', slotName: 'passWord', width: 140, ellipsis: true, tooltip: true },
  // { title: '地址', dataIndex: 'url', slotName: 'url', width: 140, ellipsis: true, tooltip: true },
  {
    title: '关联项目',
    dataIndex: 'jobList',
    slotName: 'jobList',
    width: 250,
    align: 'center',
    render: ({ record }) => {
      const jobData = Array.isArray(record.jobList)
        ? record.jobList
        : [record.jobList]
      const jobList = jobData.flatMap((item: any) => [
        { paramsName: '项目ID', paramsValue: item?.id ?? '' },
        { paramsName: '项目类型', paramsValue: item?.type ?? '', paramsType: automation_type?.value },
        { paramsName: '项目名称', paramsValue: item?.name ?? '' },
        { paramsName: '项目地址', paramsValue: item?.url ?? '' },
        { paramsName: '脚本路径', paramsValue: item?.scriptPath ?? '' },
        { paramsName: '项目描述', paramsValue: item?.description ?? '' },
        { paramsName: '项目状态', paramsValue: item?.status ?? '' },
      ])
      return (
        <GiCellKeyValue data={jobList} slotName={true} title="自动化项目配置" />
      )
    },
  },
  // {
  //   title: '节点信息',
  //   dataIndex: 'nodeList',
  //   slotName: 'nodeList',
  //   width: 160,
  //   render: ({ record }) => {
  //     return (
  //       <GiCellTags data={record.nodeList} />
  //     )
  //   },
  // },
  // { title: '描述', dataIndex: 'description', slotName: 'description', width: 150, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true, tooltip: true },
  { title: '修改人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120, ellipsis: true, tooltip: true },
  { title: '修改时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 210,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['automation:automationJenkinsConfig:get', 'automation:automationJenkinsConfig:update', 'automation:automationJenkinsConfig:delete']),
  },
]

// 表格引用
const tableRef = ref()

// 显示密码
const onSecret = async (record: AutomationJenkinsConfigResp) => {
  const { data } = await getAutomationJenkinsConfig(record.id)
  return record.passWord = data.passWord
}

// 隐藏密码
const onSecretHide = (record: AutomationJenkinsConfigResp) => {
  return record.passWord = ''
}

// 重置
const reset = () => {
  queryForm.id = undefined
  queryForm.ip = undefined
  queryForm.status = undefined
  search()
}

// 删除
const onDelete = (record?: AutomationJenkinsConfigResp) => {
  return handleDelete(() => deleteAutomationJenkinsConfig(
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
  return handleExport(() => exportAutomationJenkinsConfig(
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
interface AutomationJenkinsConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface AutomationJenkinsConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const AutomationJenkinsConfigAddModalRef = ref<AutomationJenkinsConfigAddModalType>()
// 新增
const onAdd = () => {
  AutomationJenkinsConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: AutomationJenkinsConfigResp) => {
  AutomationJenkinsConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: AutomationJenkinsConfigResp) => {
  AutomationJenkinsConfigAddModalRef.value?.onCopy(record.id)
}

const AutomationJenkinsConfigDetailDrawerRef = ref<AutomationJenkinsConfigDetailDrawerType>()
// 详情
const onDetail = (record: AutomationJenkinsConfigResp) => {
  AutomationJenkinsConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss">
:deep(.gi-cell-key-value) {
  display: flex;
  align-items: center;
  justify-content: space-around;
}
</style>
