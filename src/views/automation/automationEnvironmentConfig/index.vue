<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="自动化管理-环境配置管理"
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
          v-model="queryForm.type"
          :options="automation_type"
          placeholder="请选择环境类型"
          allow-clear
          allow-search
          style="width: 150px"
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
        <a-button v-permission="['automation:automationEnvironmentConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['automation:automationEnvironmentConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['automation:automationEnvironmentConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #type="{ record }">
        <GiCellTag :value="record.type" :dict="automation_type" />
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['automation:automationEnvironmentConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['automation:automationEnvironmentConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['automation:automationEnvironmentConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link
            v-permission="['automation:automationEnvironmentConfig:delete']"
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

    <AutomationEnvironmentConfigAddModal ref="AutomationEnvironmentConfigAddModalRef" @save-success="search" />
    <AutomationEnvironmentConfigDetailDrawer ref="AutomationEnvironmentConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import AutomationEnvironmentConfigAddModal from './AutomationEnvironmentConfigAddModal.vue'
import AutomationEnvironmentConfigDetailDrawer from './AutomationEnvironmentConfigDetailDrawer.vue'
import { type AutomationEnvironmentConfigQuery, type AutomationEnvironmentConfigResp, deleteAutomationEnvironmentConfig, exportAutomationEnvironmentConfig, getAutomationEnvironmentConfig, listAutomationEnvironmentConfig } from '@/apis/automation/automationEnvironmentConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { listProjectConfig } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTags, GiCellVersion } from '@/components/GiCell'

defineOptions({ name: 'AutomationEnvironmentConfig' })

const { automation_type, status_type, server_type, browser_type } = useDict('automation_type', 'status_type', 'server_type', 'browser_type')

const queryForm = reactive<AutomationEnvironmentConfigQuery>({
  id: undefined,
  type: undefined,
  name: undefined,
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
} = useTable((page) => listAutomationEnvironmentConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: '环境ID', dataIndex: 'id', slotName: 'id', width: 185, ellipsis: true, tooltip: true },
  { title: '环境类型', dataIndex: 'type', slotName: 'type', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  { title: '环境名称', dataIndex: 'name', slotName: 'name', width: 150, ellipsis: true, tooltip: true },
  { title: '环境描述', dataIndex: 'description', slotName: 'description', width: 200, ellipsis: true, tooltip: true },
  {
    title: '环境项目信息',
    dataIndex: 'projectConfig',
    slotName: 'projectConfig',
    width: 230,
    align: 'center',
    render: ({ record }) => {
      const projectData = Array.isArray(record.projectConfig[0])
        ? record.projectConfig[0]
        : [record.projectConfig[0]]
      const projectConfig = projectData.flatMap((item: any) => [
        { paramsName: '项目ID', paramsValue: item?.id ?? '' },
        { paramsName: '项目类型', paramsValue: item?.type ?? '', paramsType: automation_type.value },
        { paramsName: '项目名称', paramsValue: item?.name ?? '' },
        { paramsName: '项目地址', paramsValue: item?.url ?? '' },
        { paramsName: '项目描述', paramsValue: item?.description ?? '' },
        { paramsName: '项目状态', paramsValue: item?.status ?? '' },
      ])
      return (
        <GiCellKeyValue data={projectConfig} slotName={true} title="环境项目信息" />
      )
    },
  },
  {
    title: '环境Jenkins信息',
    dataIndex: 'jenkinsConfig',
    slotName: 'jenkinsConfig',
    width: 140,
    align: 'center',
    render: ({ record }) => {
      const jenkinsData = Array.isArray(record.jenkinsConfig[0])
        ? record.jenkinsConfig[0]
        : [record.jenkinsConfig[0]]
      const jobListData = Array.isArray(record.jenkinsConfig[0]?.jobList)
        ? record.jenkinsConfig[0]?.jobList
        : [record.jenkinsConfig[0]?.jobList]
      const jobList = jobListData.flatMap((item: any) => [
        { paramsName: '项目ID', paramsValue: item?.id ?? '' },
        { paramsName: '项目类型', paramsValue: item?.type ?? '', paramsType: automation_type.value },
        { paramsName: '项目名称', paramsValue: item?.name ?? '' },
        { paramsName: '项目地址', paramsValue: item?.url ?? '' },
        { paramsName: '项目描述', paramsValue: item?.description ?? '' },
        { paramsName: '项目状态', paramsValue: item?.status ?? '' },
      ])
      const jenkinsConfig = jenkinsData.flatMap((item: any) => [
        { paramsName: 'Jenkins ID', paramsValue: item?.id ?? '' },
        { paramsName: 'Jenkins 版本', paramsValue: item?.version ?? '' },
        { paramsName: 'Jenkins 名称', paramsValue: item?.ip ?? '' },
        { paramsName: 'Jenkins 端口', paramsValue: item?.port ?? '' },
        { paramsName: 'Jenkins 用户名', paramsValue: item?.userName ?? '' },
        { paramsName: 'Jenkins 密码', paramsValue: item?.passWord ?? '' },
        { paramsName: 'Jenkins 地址', paramsValue: item?.url ?? '' },
        { paramsName: 'Jenkins 描述', paramsValue: item?.description ?? '' },
        { paramsName: 'Jenkins 关联项目', paramsValue: jobList ?? '' },
        { paramsName: 'Jenkins 状态', paramsValue: item?.status ?? '' },
      ])
      return (
        <GiCellKeyValue data={jenkinsConfig} slotName={true} title="环境Jenkins信息" />
      )
    },
  },
  {
    title: '环境节点信息',
    dataIndex: 'nodeConfig',
    slotName: 'nodeConfig',
    width: 140,
    align: 'center',
    render: ({ record }) => {
      const nodeData = Array.isArray(record.nodeConfig[0])
        ? record.nodeConfig[0]
        : [record.nodeConfig[0]]
      const descriptionData = Array.isArray(record.nodeConfig[0]?.description)
        ? record.nodeConfig[0]?.description
        : [record.nodeConfig[0]?.description]
      const description = descriptionData.flatMap((item: any) => [
        { paramsName: '名称', paramsValue: item?.name },
        { paramsName: '类型', paramsValue: item?.systemType, paramsType: server_type.value },
        { paramsName: '用户名', paramsValue: item?.userName },
        { paramsName: '密码', paramsValue: item?.passWord },
        { paramsName: '凭据', paramsValue: item?.credentialsId },
        { paramsName: '地址', paramsValue: record.nodeConfig[0]?.url },
      ])
      // const activeData = Array.isArray(record.nodeConfig[0]?.active)
      //   ? record.nodeConfig[0]?.active
      //   : [record.nodeConfig[0]?.active]
      // const offlineData = Array.isArray(record.nodeConfig[0]?.active.offline)
      //   ? record.nodeConfig[0]?.active.offline
      //   : [record.nodeConfig[0]?.active.offline]
      // const offline = offlineData.flatMap((item: any) => [
      //   { paramsName: '在线状态', paramsValue: item?.status ?? '' },
      //   { paramsName: '离线原因', paramsValue: item?.offlineCauseReason ?? '' },
      // ])
      // const idleData = Array.isArray(record.nodeConfig[0]?.active.idle)
      //   ? record.nodeConfig[0]?.active.idle
      //   : [record.nodeConfig[0]?.active.idle]
      // const currentExecutableData = Array.isArray(record.nodeConfig[0]?.active.idle.currentExecutable)
      //   ? record.nodeConfig[0]?.active.idle.currentExecutable
      //   : [record.nodeConfig[0]?.active.idle.currentExecutable]
      // const currentExecutable = currentExecutableData.flatMap((item: any) => [
      //   { paramsName: '姓名', paramsValue: item?.user },
      //   { paramsName: '地址', paramsValue: item?.url },
      //   { paramsName: '状态', paramsValue: record.nodeConfig[0]?.active.idle.status },
      // ])
      // const idle = idleData.flatMap((item: any) => [
      //   { paramsName: '使用状态', paramsValue: item?.status ?? '' },
      //   { paramsName: '使用信息', paramsValue: currentExecutable ?? '' },
      // ])
      // const active = activeData.flatMap(() => [
      //   { paramsName: '在线信息', paramsValue: offline ?? '' },
      //   { paramsName: '使用信息', paramsValue: idle ?? '' },
      // ])
      let active = [{ paramsName: '', paramsValue: '' }]
      const currentExecutableData = Array.isArray(record.nodeConfig[0]?.active?.idle?.currentExecutable)
        ? record.nodeConfig[0]?.active?.idle?.currentExecutable
        : [record.nodeConfig[0]?.active?.idle?.currentExecutable]

      const currentExecutable = currentExecutableData.flatMap((item: any) => [
        { paramsName: '使用者名称', paramsValue: item?.user ?? '' },
        { paramsName: '使用者地址', paramsValue: item?.url ?? '' },
      ])
      const activeData = Array.isArray(record.nodeConfig[0]?.active)
        ? record.nodeConfig[0]?.active
        : [record.nodeConfig[0]?.active]
      active = activeData.flatMap((item: any) => [
        { paramsName: '在线状态', paramsValue: item?.offline?.status ?? '' },
        ...(item?.idle?.status === 6
          ? [{ paramsName: '离线原因', paramsValue: item?.offline?.offlineCauseReason ?? '' }]
          : []
        ),
        { paramsName: '使用状态', paramsValue: item?.offline.status === 6 ? item?.offline?.status : item?.idle?.status },
        ...(item?.idle?.status === 8
          ? [{ paramsName: '使用者名称', paramsValue: currentExecutable }]
          : []
        ),
      ])
      const nodeConfig = nodeData.flatMap((item: any) => [
        // { paramsName: 'Jenkins', paramsValue: item?.jenkinsName ?? '' },
        { paramsName: '节点 ID', paramsValue: item?.id ?? '' },
        { paramsName: '节点类型', paramsValue: item?.type ?? '', paramsType: server_type.value },
        { paramsName: '节点名称', paramsValue: item?.name ?? '' },
        { paramsName: '节点地址', paramsValue: item?.url ?? '' },
        { paramsName: '节点描述', paramsValue: description ?? '' },
        { paramsName: '节点参数配置', paramsValue: item?.configList ?? '' },
        { paramsName: '节点活动标签', paramsValue: active ?? '' },
        { paramsName: '节点状态', paramsValue: item?.status ?? '' },
      ])
      return (
        <GiCellKeyValue data={nodeConfig} slotName={true} title="环境节点信息" />
      )
    },
  },
  {
    title: '环境浏览器信息',
    dataIndex: 'browserConfig',
    slotName: 'browserConfig',
    width: 140,
    align: 'center',
    render: ({ record }) => {
      const browserConfig = Array.isArray(record.browserConfig[0])
        ? record.browserConfig[0]
        : [record.browserConfig[0]]
      // const config = browserConfig.flatMap((item: any) => [
      //   { paramsName: '官方下载地址', paramsValue: item?.officialDownload },
      //   { paramsName: '驱动下载地址', paramsValue: item?.driverDownload },
      //   { paramsName: '本地程序路径', paramsValue: item?.exePath },
      //   { paramsName: '本地驱动路径', paramsValue: item?.driverPath },
      //   { paramsName: '配置文件路径', paramsValue: item?.profilePath },
      //   { paramsName: '浏览器描述', paramsValue: item?.description },
      // ])
      const browserConfigList = browserConfig.flatMap((item: any) => [
        { paramsName: '浏览器ID', paramsValue: item?.id ?? '' },
        { paramsName: '浏览器类型', paramsValue: item?.type ?? '', paramsType: browser_type.value },
        { paramsName: '浏览器版本', paramsValue: item?.version ?? '' },
        { paramsName: '浏览器名称', paramsValue: item?.name ?? '' },
        { paramsName: '官方下载地址', paramsValue: item?.officialDownload },
        { paramsName: '驱动下载地址', paramsValue: item?.driverDownload },
        { paramsName: '本地程序路径', paramsValue: item?.exePath },
        { paramsName: '本地驱动路径', paramsValue: item?.driverPath },
        { paramsName: '配置文件路径', paramsValue: item?.profilePath },
        { paramsName: '浏览器描述', paramsValue: item?.description },
        // { paramsName: '浏览器配置', paramsValue: config ?? '' },
        { paramsName: '浏览器状态', paramsValue: item?.status ?? '' },
      ])
      return (
        <GiCellKeyValue data={browserConfigList} slotName={true} title="环境浏览器信息" />
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
    width: 210,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['automation:automationEnvironmentConfig:get', 'automation:automationEnvironmentConfig:update', 'automation:automationEnvironmentConfig:delete']),
  },
]

// 表格引用
const tableRef = ref()

// 重置
const reset = () => {
  queryForm.id = undefined
  queryForm.type = undefined
  queryForm.name = undefined
  queryForm.status = undefined
  search()
}

// 删除
const onDelete = (record?: AutomationEnvironmentConfigResp) => {
  return handleDelete(() => deleteAutomationEnvironmentConfig(
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
  return handleExport(() => exportAutomationEnvironmentConfig(
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
interface AutomationEnvironmentConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface AutomationEnvironmentConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const AutomationEnvironmentConfigAddModalRef = ref<AutomationEnvironmentConfigAddModalType>()
// 新增
const onAdd = () => {
  AutomationEnvironmentConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: AutomationEnvironmentConfigResp) => {
  AutomationEnvironmentConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: AutomationEnvironmentConfigResp) => {
  AutomationEnvironmentConfigAddModalRef.value?.onCopy(record.id)
}

const AutomationEnvironmentConfigDetailDrawerRef = ref<AutomationEnvironmentConfigDetailDrawerType>()
// 详情
const onDetail = (record: AutomationEnvironmentConfigResp) => {
  AutomationEnvironmentConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss">
:deep(.gi-cell-key-value) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
