<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="自动化管理-浏览器配置管理"
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
        <a-input-search v-model="queryForm.id" placeholder="请输入浏览器ID" allow-clear @search="search" />
        <a-select
          v-model="queryForm.type"
          :options="browser_type"
          placeholder="请选择浏览器类型"
          allow-clear
          allow-search
          style="width: 200px"
          @change="search"
        />
        <a-input-search v-model="queryForm.name" placeholder="请输入浏览器名称" allow-clear @search="search" />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          <template #default>重置</template>
        </a-button>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['automation:automationBrowserConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['automation:automationBrowserConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['automation:automationBrowserConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <template #type="{ record }">
        <GiCellTag :value="record.type" :dict="browser_type" />
      </template>
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['automation:automationBrowserConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['automation:automationBrowserConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['automation:automationBrowserConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link
            v-permission="['automation:automationBrowserConfig:delete']"
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

    <AutomationBrowserConfigAddModal ref="AutomationBrowserConfigAddModalRef" @save-success="search" />
    <AutomationBrowserConfigDetailDrawer ref="AutomationBrowserConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import AutomationBrowserConfigAddModal from './AutomationBrowserConfigAddModal.vue'
import AutomationBrowserConfigDetailDrawer from './AutomationBrowserConfigDetailDrawer.vue'
import { type AutomationBrowserConfigQuery, type AutomationBrowserConfigResp, deleteAutomationBrowserConfig, exportAutomationBrowserConfig, getAutomationBrowserConfig, listAutomationBrowserConfig } from '@/apis/automation/automationBrowserConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { listProjectConfig } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTags, GiCellVersion } from '@/components/GiCell'

defineOptions({ name: 'AutomationBrowserConfig' })

const { status_type, browser_type } = useDict('status_type', 'browser_type')

const queryForm = reactive<AutomationBrowserConfigQuery>({
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
} = useTable((page) => listAutomationBrowserConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: '浏览器ID', dataIndex: 'id', slotName: 'id', width: 185, ellipsis: true, tooltip: true },
  { title: '浏览器类型', dataIndex: 'type', slotName: 'type', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  { title: '浏览器版本', dataIndex: 'version', slotName: 'version', width: 160, ellipsis: true, tooltip: true },
  { title: '浏览器名称', dataIndex: 'name', slotName: 'name', width: 120, ellipsis: true, tooltip: true },
  {
    title: '浏览器配置',
    dataIndex: 'description',
    slotName: 'description',
    width: 110,
    align: 'center',
    render: ({ record }) => {
      const map = [
        { paramsName: '官方下载地址', paramsValue: record?.officialDownload },
        { paramsName: '驱动下载地址', paramsValue: record?.driverDownload },
        { paramsName: '本地程序路径', paramsValue: record?.exePath },
        { paramsName: '本地驱动路径', paramsValue: record?.driverPath },
        { paramsName: '配置文件路径', paramsValue: record?.profilePath },
        { paramsName: '浏览器描述', paramsValue: record?.description },
      ]
      return (
        <GiCellKeyValue data={map} slotName={false} title="浏览器配置" />
      )
    },
  },
  // { title: '浏览器程序下载地址', dataIndex: 'officialDownload', slotName: 'officialDownload', width: 120, ellipsis: true, tooltip: true },
  // { title: '浏览器驱动下载地址', dataIndex: 'driverDownload', slotName: 'driverDownload', width: 120, ellipsis: true, tooltip: true },
  // { title: '浏览器程序路径', dataIndex: 'exePath', slotName: 'exePath', width: 120, ellipsis: true, tooltip: true },
  // { title: '浏览器驱动路径', dataIndex: 'driverPath', slotName: 'driverPath', width: 120, ellipsis: true, tooltip: true },
  // { title: '浏览器配置文件路径', dataIndex: 'profilePath', slotName: 'profilePath', width: 120, ellipsis: true, tooltip: true },
  // { title: '浏览器描述', dataIndex: 'description', slotName: 'description', width: 120, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true, tooltip: true },
  { title: '修改人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120, ellipsis: true, tooltip: true },
  { title: '修改时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true, tooltip: true },
  // { title: '删除标志（3正常 4异常）', dataIndex: 'delFlag', slotName: 'delFlag', width: 120, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 200,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['automation:automationBrowserConfig:get', 'automation:automationBrowserConfig:update', 'automation:automationBrowserConfig:delete']),
  },
]

// 表格引用
const tableRef = ref()

// 重置
const reset = () => {
  queryForm.id = undefined
  queryForm.type = undefined
  queryForm.name = undefined
  search()
}

// 删除
const onDelete = (record?: AutomationBrowserConfigResp) => {
  return handleDelete(() => deleteAutomationBrowserConfig(
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
  return handleExport(() => exportAutomationBrowserConfig(
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
interface AutomationBrowserConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface AutomationBrowserConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const AutomationBrowserConfigAddModalRef = ref<AutomationBrowserConfigAddModalType>()
// 新增
const onAdd = () => {
  AutomationBrowserConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: AutomationBrowserConfigResp) => {
  AutomationBrowserConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: AutomationBrowserConfigResp) => {
  AutomationBrowserConfigAddModalRef.value?.onCopy(record.id)
}

const AutomationBrowserConfigDetailDrawerRef = ref<AutomationBrowserConfigDetailDrawerType>()
// 详情
const onDetail = (record: AutomationBrowserConfigResp) => {
  AutomationBrowserConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss"></style>
