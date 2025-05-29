<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="自动化管理-项目配置管理"
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
        <a-input-search v-model="queryForm.id" placeholder="请输入项目ID" allow-clear @search="search" />
        <a-select
          v-model="queryForm.type"
          :options="automation_type"
          placeholder="请选择项目类型"
          allow-clear
          allow-search
          style="width: 150px"
          @change="search"
        />
        <a-input-search v-model="queryForm.name" placeholder="请输入项目名称" style="width: 250px" allow-clear @search="search" />
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
        <a-button v-permission="['automation:automationProjectConfig:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          <template #default>新增</template>
        </a-button>
        <a-button
          v-permission="['automation:automationProjectConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['automation:automationProjectConfig:export']" @click="onExport">
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
          <a-link v-permission="['automation:automationProjectConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['automation:automationProjectConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['automation:automationProjectConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link
            v-permission="['automation:automationProjectConfig:delete']"
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

    <AutomationProjectConfigAddModal ref="AutomationProjectConfigAddModalRef" @save-success="search" />
    <AutomationProjectConfigDetailDrawer ref="AutomationProjectConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import type { TableInstance } from '@arco-design/web-vue'
import AutomationProjectConfigAddModal from './AutomationProjectConfigAddModal.vue'
import AutomationProjectConfigDetailDrawer from './AutomationProjectConfigDetailDrawer.vue'
import { type AutomationProjectConfigQuery, type AutomationProjectConfigResp, deleteAutomationProjectConfig, exportAutomationProjectConfig, listAutomationProjectConfig } from '@/apis/automation/automationProjectConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { listProjectConfig } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTags, GiCellVersion } from '@/components/GiCell'

defineOptions({ name: 'AutomationProjectConfig' })

const { automation_type, status_type } = useDict('automation_type', 'status_type')

const queryForm = reactive<AutomationProjectConfigQuery>({
  id: undefined,
  type: undefined,
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
} = useTable((page) => listAutomationProjectConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: '项目ID', dataIndex: 'id', slotName: 'id', width: 185, ellipsis: true, tooltip: true },
  { title: '项目类型', dataIndex: 'type', slotName: 'type', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  { title: '项目名称', dataIndex: 'name', slotName: 'name', width: 250, ellipsis: true, tooltip: true },
  { title: '项目地址', dataIndex: 'url', slotName: 'url', width: 460, ellipsis: true, tooltip: true },
  { title: '项目描述', dataIndex: 'description', slotName: 'description', width: 200, ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80, ellipsis: true, tooltip: true, align: 'center' },
  { title: '创建人', dataIndex: 'createUserString', slotName: 'createUser', width: 120, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180, ellipsis: true, tooltip: true },
  { title: '修改人', dataIndex: 'updateUserString', slotName: 'updateUser', width: 120, ellipsis: true, tooltip: true },
  { title: '修改时间', dataIndex: 'updateTime', slotName: 'updateTime', width: 180, ellipsis: true, tooltip: true },
  // { title: '更新IP', dataIndex: 'updateIp', slotName: 'updateIp', width: 120, ellipsis: true, tooltip: true },
  // { title: '删除标志（3正常 4异常）', dataIndex: 'delFlag', slotName: 'delFlag', width: 120, ellipsis: true, tooltip: true },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 200,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['automation:automationProjectConfig:get', 'automation:automationProjectConfig:update', 'automation:automationProjectConfig:delete']),
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
const onDelete = (record?: AutomationProjectConfigResp) => {
  return handleDelete(() => deleteAutomationProjectConfig(
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
  return handleExport(() => exportAutomationProjectConfig(
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
interface AutomationProjectConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface AutomationProjectConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const AutomationProjectConfigAddModalRef = ref<AutomationProjectConfigAddModalType>()
// 新增
const onAdd = () => {
  AutomationProjectConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = (record: AutomationProjectConfigResp) => {
  AutomationProjectConfigAddModalRef.value?.onUpdate(record.id)
}

// 复制
const onCopy = (record: AutomationProjectConfigResp) => {
  AutomationProjectConfigAddModalRef.value?.onCopy(record.id)
}

const AutomationProjectConfigDetailDrawerRef = ref<AutomationProjectConfigDetailDrawerType>()
// 详情
const onDetail = (record: AutomationProjectConfigResp) => {
  AutomationProjectConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss"></style>
