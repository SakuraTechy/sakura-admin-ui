<template>
  <div class="gi_table_page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title="自动化管理-节点配置管理"
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
        <a-input-search v-model="queryForm.id" style="width: 200px" placeholder="请输入节点ID" allow-clear @search="search" />
        <a-select
          v-model="queryForm.jenkinsId"
          :options="jenkinsList"
          placeholder="请选择Jenkins"
          allow-clear
          allow-search
          style="width: 150px"
          @change="search"
        />
        <a-input-search v-model="queryForm.name" style="width: 150px" placeholder="请输入节点名称" allow-clear @search="search" />
        <a-select
          v-model="queryForm.offlineStatus"
          :options="status_type.filter(item => item.value === '5' || item.value === '6')"
          placeholder="请选择在线状态"
          allow-clear
          allow-search
          style="width: 140px"
          @change="search"
        />
        <a-select
          v-model="queryForm.idleStatus"
          :options="status_type.filter(item => item.value === '7' || item.value === '8' || item.value === '9')"
          placeholder="请选择使用状态"
          allow-clear
          allow-search
          style="width: 140px"
          @change="search"
        />
        <a-select
          v-model="queryForm.status"
          :options="status_type.filter(item => item.value === '1' || item.value === '2')"
          placeholder="请选择状态"
          allow-clear
          style="width: 120px"
          @change="search"
        />
        <a-button @click="reset">
          <template #icon><icon-refresh /></template>
          <template #default>重置</template>
        </a-button>
      </template>
      <template #toolbar-right>
        <a-popconfirm
          content="是否确定同步最新节点数据？同步后会从Jenkins获取节点数据存入数据库。"
          type="warning"
          @ok="onSync"
        >
          <a-tooltip content="请选择所属Jenkins，批量同步最新节点数据">
            <a-button
              v-permission="['automation:automationNodeConfig:syncAllNode']"
              type="primary"
              status="success"
              size="small"
              title="同步"
              :disabled="!selectedKeys.length && !queryForm.jenkinsId || loading === true"
            >
              <template #icon><icon-sync /></template>同步
            </a-button>
          </a-tooltip>
        </a-popconfirm>
        <a-dropdown position="bottom">
          <a-button v-permission="['automation:automationNodeConfig:create']" type="primary">
            <template #icon><icon-plus /></template>
            <template #default>新增</template>
          </a-button>
          <template #content>
            <a-doption @click="opAdd">远程新增</a-doption>
            <a-doption @click="onAdd">本地新增</a-doption>
          </template>
        </a-dropdown>
        <a-button
          v-permission="['automation:automationNodeConfig:delete']"
          type="primary"
          status="danger"
          :disabled="!selectedKeys.length"
          :title="!selectedKeys.length ? '请选择' : ''"
          @click="() => onDelete()"
        >
          <template #icon><icon-delete /></template>
          <template #default>删除</template>
        </a-button>
        <a-button v-permission="['automation:automationNodeConfig:export']" @click="onExport">
          <template #icon><icon-download /></template>
          <template #default>导出</template>
        </a-button>
      </template>
      <!-- <template #active="{ record }">
        <GiCellTag :value="record.active.offline.status" :dict="status_type" />
      </template> -->
      <template #status="{ record }">
        <GiCellTag :value="record.status" :dict="status_type" />
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['automation:automationNodeConfig:sync']" title="同步" @click="onSync(record)">同步</a-link>
          <a-link v-permission="['automation:automationNodeConfig:get']" title="详情" @click="onDetail(record)">详情</a-link>
          <a-link v-permission="['automation:automationNodeConfig:update']" title="修改" @click="onUpdate(record)">修改</a-link>
          <a-link v-permission="['automation:automationNodeConfig:create']" title="复制" @click="onCopy(record)">复制</a-link>
          <a-link
            v-permission="['automation:automationNodeConfig:delete']"
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

    <AutomationNodeConfigAddModal ref="AutomationNodeConfigAddModalRef" :jenkins-list="jenkinsList" @save-success="search" />
    <AutomationNodeConfigDetailDrawer ref="AutomationNodeConfigDetailDrawerRef" />
  </div>
</template>

<script setup lang="tsx">
import { Message, type TableInstance } from '@arco-design/web-vue'
import AutomationNodeConfigAddModal from './AutomationNodeConfigAddModal.vue'
import AutomationNodeConfigDetailDrawer from './AutomationNodeConfigDetailDrawer.vue'
import { type AutomationNodeConfigQuery, type AutomationNodeConfigResp, deleteAutomationNodeConfig, exportAutomationNodeConfig, getAutomationNodeConfig, listAutomationNodeConfig, syncAllNode, syncNode } from '@/apis/automation/automationNodeConfig'
import { useDownload, useTable } from '@/hooks'
import { useDict } from '@/hooks/app'
import { isMobile } from '@/utils'
import has from '@/utils/has'
import type { LabelValueState } from '@/types/global'
import { listProjectConfig } from '@/apis/project/projectConfig'
import { GiCellKeyValue, GiCellPassword, GiCellTag, GiCellTags, GiCellVersion } from '@/components/GiCell'
import { listAutomationJenkinsConfig } from '@/apis/automation/automationJenkinsConfig'

defineOptions({ name: 'AutomationNodeConfig' })

const { status_type } = useDict('status_type')

const queryForm = reactive<AutomationNodeConfigQuery>({
  id: undefined,
  jenkinsId: undefined,
  name: undefined,
  offlineStatus: undefined,
  idleStatus: undefined,
  status: undefined,
  sort: ['name,asc'],
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
  handleSync,
} = useTable((page) => listAutomationNodeConfig({ ...queryForm, ...page }), { immediate: true })

const columns: TableInstance['columns'] = [
  { title: '节点ID', dataIndex: 'id', slotName: 'id', width: 185, ellipsis: true, tooltip: true },
  {
    title: 'Jenkins',
    dataIndex: 'jenkinsName',
    slotName: 'jenkinsName',
    width: 130,
    render: ({ record }) => {
      return (
        <GiCellTags data={[record.jenkinsName]} />
      )
    },
  },
  { title: '节点名称', dataIndex: 'name', slotName: 'name', width: 120, ellipsis: true, tooltip: true, align: 'center' },
  // { title: '节点地址', dataIndex: 'url', slotName: 'url', width: 360, ellipsis: true, tooltip: true },
  {
    title: '节点描述',
    dataIndex: 'description',
    slotName: 'description',
    width: 320,
    align: 'center',
    render: ({ record }) => {
      const data = Array.isArray(record.description)
        ? record.description
        : [record.description]
      const map = data.flatMap((item: any) => [
        { paramsName: '名称', paramsValue: item?.name },
        { paramsName: '类型', paramsValue: item?.systemType },
        { paramsName: '用户名', paramsValue: item?.userName },
        { paramsName: '密码', paramsValue: item?.passWord },
        { paramsName: '凭据', paramsValue: record?.description?.credentialsId },
        { paramsName: '地址', paramsValue: record?.url },
      ])
      return (
        <GiCellKeyValue data={map} slotName={true} title="节点描述" />
      )
    },
  },
  {
    title: '在线状态',
    dataIndex: 'active',
    slotName: 'active',
    width: 120,
    align: 'center',
    render: ({ record }) => {
      const { offline } = record.active
      const isOnline = offline.status === 5
      return (
        isOnline
          ? <GiCellTag value={offline.status} dict={status_type.value} />
          : (
            <a-popover
              content-style={{ maxWidth: '800px', padding: '12px 16px' }}
              v-slots={{
                content: () => offline.offlineCauseReason,
              }}
            >
              <GiCellTag value={offline.status} dict={status_type.value} />
            </a-popover>
            )
      )
    },
  },
  {
    title: '使用状态',
    dataIndex: 'active',
    slotName: 'active',
    width: 120,
    align: 'center',
    render: ({ record }) => {
      const { idle, offline } = record.active
      const data = Array.isArray(idle.currentExecutable)
        ? idle.currentExecutable
        : [idle.currentExecutable]
      const map = data.flatMap((item: any) => [
        { paramsName: '姓名', paramsValue: item?.user },
        { paramsName: '地址', paramsValue: item?.url },
        { paramsName: '状态', paramsValue: idle.status },
      ])
      return (
        offline.status === 5 && idle.status === 7
          ? <GiCellTag value={idle.status} dict={status_type.value} />
          : idle.status === 8
            ? <GiCellKeyValue data={map} slotTag={true} title="节点使用状态" />
            : <GiCellTag value={offline.status} dict={status_type.value} />
            // : '-'
      )
    },
  },
  {
    title: '参数列表',
    dataIndex: 'configList',
    slotName: 'configList',
    width: 130,
    align: 'center',
    render: ({ record }) => {
      return (
        <GiCellKeyValue data={record.configList} slotName={false} title="节点参数列表" />
      )
    },
  },
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
    width: 250,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['automation:automationNodeConfig:get', 'automation:automationNodeConfig:update', 'automation:automationNodeConfig:delete']),
  },
]

const jenkinsList = ref<LabelValueState[]>([])

const getJenkinsConfig = async () => {
  try {
    const res = await listAutomationJenkinsConfig()
    jenkinsList.value = res.data.list.map((item) => ({
      label: item.ip,
      value: item.id,
      extra: item.url,
    }))
  } catch (error) {
    console.error('获取Jenkins列表失败', error)
  }
}

// 组件挂载时自动调用
onMounted(() => {
  getJenkinsConfig()
})

// 表格引用
const tableRef = ref()

// 重置
const reset = () => {
  queryForm.id = undefined
  queryForm.jenkinsId = undefined
  queryForm.name = undefined
  queryForm.offlineStatus = undefined
  queryForm.idleStatus = undefined
  queryForm.status = undefined
  search()
}

// 同步
const onSync1 = async (record?: AutomationNodeConfigResp) => {
  return handleSync(() => syncNode(
    selectedKeys.value.length
      ? selectedKeys.value.map((id) => String(id))
      : record!.id,
  ), {
    content: selectedKeys.value.length ? '是否确定同步批量选中的数据？' : `是否确定同步「${record!.name}」？`,
    showModal: true,
    multiple: true,
  })
}

const onSync = async (record?: AutomationNodeConfigResp) => {
  try {
    loading.value = true
    if (selectedKeys.value.length || record) {
      handleSync(() => syncNode(
        selectedKeys.value.length
          ? selectedKeys.value.map((id) => String(id))
          : record!.id,
      ), {
        content: selectedKeys.value.length ? '是否确定同步批量选中的数据？' : `是否确定同步「${record!.name}」？`,
        showModal: true,
        multiple: true,
      })
    } else {
      const { success, msg } = await syncAllNode(queryForm.jenkinsId ?? '')
      success ? Message.success(msg) : Message.error(msg)
      search()
    }
  } finally {
    loading.value = false
  }
}

// 删除
const onDelete = (record?: AutomationNodeConfigResp) => {
  return handleDelete(() => deleteAutomationNodeConfig(
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
  return handleExport(() => exportAutomationNodeConfig(
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
interface AutomationNodeConfigAddModalType {
  onAdd: () => void
  onUpdate: (id: string) => void
  onCopy: (id: string) => void
}
interface AutomationNodeConfigDetailDrawerType {
  onOpen: (id: string) => void
}

const AutomationNodeConfigAddModalRef = ref<AutomationNodeConfigAddModalType>()
// 新增
const opAdd = () => {
  if (queryForm.jenkinsId) {
    window.open(`${jenkinsList.value.find((item) => item.value === queryForm.jenkinsId)?.extra}/computer/new`)
  } else {
    Message.warning('请在搜索栏选择所属Jenkins！')
  }
}
const onAdd = () => {
  AutomationNodeConfigAddModalRef.value?.onAdd()
}

// 修改
const onUpdate = async (record: AutomationNodeConfigResp) => {
  const { success } = await syncNode(record.id)
  if (success) {
    AutomationNodeConfigAddModalRef.value?.onUpdate(record.id)
  }
}

// 复制
const onCopy = (record: AutomationNodeConfigResp) => {
  AutomationNodeConfigAddModalRef.value?.onCopy(record.id)
}

const AutomationNodeConfigDetailDrawerRef = ref<AutomationNodeConfigDetailDrawerType>()
// 详情
const onDetail = (record: AutomationNodeConfigResp) => {
  AutomationNodeConfigDetailDrawerRef.value?.onOpen(record.id)
}
</script>

<style scoped lang="scss">
:deep(.gi-cell-key-value) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
