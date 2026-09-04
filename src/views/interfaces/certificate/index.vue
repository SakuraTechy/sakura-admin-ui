<template>
  <div class="gi_table_page certificate-page">
    <GiTable
      ref="tableRef"
      v-model:selectedKeys="selectedKeys"
      title=""
      row-key="licenseId"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :scroll="{ x: 1500, y: '100%' }"
      :pagination="pagination"
      :row-selection="{ type: 'checkbox', showCheckedAll: true }"
      :show-selection-alert="true"
      :selection-message="`已选中 ${selectedKeys.length} 条记录(可跨页)`"
      no-selection-message="未选中任何记录"
      @select="onSelect"
      @select-all="onSelectAll"
      @refresh="getList"
    >
      <template #top>
        <div class="certificate-query-top-slot">
          <GiForm
            v-model="queryForm"
            :columns="queryFormColumns"
            size="medium"
            search
            :search-card="true"
            :search-columns-per-row="3"
            :search-control-min-width="200"
            :search-label-width="65"
            search-btn-text="查询"
            :search-on-change="true"
            :grid-props="certificateQueryGridProps"
            hide-fold-btn
            class="query-form certificate-query-form"
            @search="search"
            @reset="reset"
          />
        </div>
      </template>

      <template #toolbar-left>
        <a-button v-permission="['interfaces:certificate:create']" type="primary" @click="onAdd">
          <template #icon><icon-plus /></template>
          申请证书
        </a-button>
      </template>

      <template #toolbar-right>
        <a-button
          v-permission="['interfaces:certificate:submit']"
          type="primary"
          :disabled="!canSubmit"
          :title="!canSubmit ? '请选择待提交状态的证书' : ''"
          @click="onBatchSubmit"
        >
          <template #icon><icon-send /></template>
          批量提交
        </a-button>
        <a-button
          v-permission="['interfaces:certificate:approve']"
          type="primary"
          status="success"
          :disabled="!canApprove"
          :title="!canApprove ? '请选择待审批状态的证书' : ''"
          @click="onBatchApprove"
        >
          <template #icon><icon-check /></template>
          批量审批
        </a-button>
        <a-button
          v-permission="['interfaces:certificate:download']"
          :disabled="!canDownload"
          :title="!canDownload ? '请选择已通过状态的证书' : ''"
          @click="onBatchDownload"
        >
          <template #icon><icon-download /></template>
          批量下载
        </a-button>
      </template>

      <template #productName="{ record }">
        <a-tooltip :content="record.productName">
          <span class="ellipsis-text">{{ record.productName || '-' }}</span>
        </a-tooltip>
      </template>

      <template #versionName="{ record }">
        {{ record.versionName || '-' }}
      </template>

      <template #modelName="{ record }">
        <a-tooltip :content="record.modelName">
          <span class="ellipsis-text">{{ record.modelName || '-' }}</span>
        </a-tooltip>
      </template>

      <template #licenseNo="{ record }">
        <a-tooltip :content="record.licenseNo">
          <span class="ellipsis-text">{{ record.licenseNo }}</span>
        </a-tooltip>
      </template>

      <template #machineCodeFile="{ record }">
        <a-tooltip :content="record.licenseFile ? record.licenseFile.split('/').pop() : record.machineCode">
          <span class="ellipsis-text">
            {{ record.licenseFile ? record.licenseFile.split('/').pop() : record.machineCode }}
          </span>
        </a-tooltip>
      </template>

      <template #status="{ record }">
        <a-tag :color="getCertificateStatusColor(record.status)">
          {{ getCertificateStatus(record.status) }}
        </a-tag>
      </template>

      <template #submitByName="{ record }">
        {{ record.submitByName || '-' }}
      </template>

      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['interfaces:certificate:detail']" @click="onDetail(record)">
            详情
          </a-link>
          <a-link
            v-if="String(record.status) === '0'"
            v-permission="['interfaces:certificate:submit']"
            @click="onSubmit(record)"
          >
            提交
          </a-link>
          <a-link
            v-if="String(record.status) === '1'"
            v-permission="['interfaces:certificate:approve']"
            status="success"
            @click="onApprove(record)"
          >
            审批
          </a-link>
          <a-link
            v-permission="['interfaces:certificate:download']"
            :disabled="String(record.status) !== '2'"
            @click="onDownload(record)"
          >
            下载
          </a-link>
        </a-space>
      </template>
    </GiTable>

    <CertificateAddModal
      ref="CertificateAddModalRef"
      :project-options="projectOptions"
      :config="config"
      @save-success="handleAddFormOk"
    />
    <CertificateDetailDrawer ref="CertificateDetailDrawerRef" :config="config" />
  </div>
</template>

<script setup lang="tsx">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import type { TableInstance } from '@arco-design/web-vue'
import axios from 'axios'
import { getToken } from '@/utils/auth'
import { randomUUID } from '@/utils'
import type { ColumnItem } from '@/components/GiForm'
import CertificateAddModal from './components/CertificateAddModal.vue'
import CertificateDetailDrawer from './components/CertificateDetailDrawer.vue'
import type {
  CertificateQuery,
  CertificateResp,
} from '@/types/interfaces/certificate'
import { getCertificateStatus, getCertificateStatusColor, certificateStatusOptions } from './components/config'

defineOptions({ name: 'Certificate' })

// 证书系统配置
const config = ref<any>(null)
const token = ref('')
const projectOptions = ref<any[]>([])

// 证书列表和 Markdown 列表（用于企业微信推送）
const certificateList = ref<CertificateResp[]>([])
const markdownList = ref<any[]>([])

// 表格数据管理（复刻老项目的实现）
const loading = ref(false)
const dataList = ref<CertificateResp[]>([])
const total = ref(0)
const selectedKeys = ref<string[]>([])
const selectedRows = ref<CertificateResp[]>([])

const queryForm = reactive<CertificateQuery & { createTime?: [string, string] }>({
  productId: undefined,
  versionId: undefined,
  licenseNo: undefined,
  status: undefined,
  submitByName: undefined,
  createStartTime: undefined,
  createEndTime: undefined,
  createTime: undefined,
})

// 产品版本列表
const productVersions = ref<any[]>([])

// 搜索表单配置
const certificateQueryGridProps = { cols: 24, colGap: 16, rowGap: 0 }
const certificateQueryFieldSpan = { xs: 24, sm: 8, xxl: 8 }

// 比较版本号（降序排列）
const compareVersionNo = (left: string, right: string): number => {
  const leftParts = String(left || '').replace(/^v/i, '').split('.')
  const rightParts = String(right || '').replace(/^v/i, '').split('.')
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index++) {
    const leftPart = leftParts[index] || ''
    const rightPart = rightParts[index] || ''
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null

    if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
      return rightNumber - leftNumber
    }

    if (leftPart !== rightPart) {
      return rightPart.localeCompare(leftPart, undefined, { numeric: true, sensitivity: 'base' })
    }
  }

  return 0
}

// 处理产品变化
const handleProductChange = async (productId?: string) => {
  queryForm.versionId = undefined
  productVersions.value = []

  if (!productId) return

  try {
    if (!config.value?.environment?.productVersions) {
      console.error('证书系统配置未加载')
      return
    }

    const response = await axios.get(buildUrl(config.value.environment.productVersions), {
      params: { productId, pageNum: 1, pageSize: 9999 },
      headers: { Authorization: `Bearer ${token.value}` },
    })

    const value = response.data?.data !== undefined ? response.data.data : response.data
    const list = Array.isArray(value) ? value : (value && (value.rows || value.list)) || []

    productVersions.value = list
      .filter((item: any) => String(item.certVersion || '').trim() !== '')
      .sort((a: any, b: any) => compareVersionNo(a.versionNo, b.versionNo))
  } catch (error) {
    console.error('获取产品版本失败:', error)
  }
}

const queryFormColumns = computed<ColumnItem[]>(() => [
  {
    type: 'select',
    label: '产品名称',
    field: 'productId',
    span: certificateQueryFieldSpan,
    props: {
      options: projectOptions.value.map(item => ({
        label: item.productName,
        value: item.productId
      })),
      placeholder: '请选择产品',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'select',
    label: '产品版本',
    field: 'versionId',
    span: certificateQueryFieldSpan,
    props: {
      options: productVersions.value.map(item => ({
        label: item.versionNo,
        value: item.versionId
      })),
      placeholder: '请选择版本',
      allowClear: true,
      allowSearch: true,
      disabled: !queryForm.productId,
    },
  },
  {
    type: 'input',
    label: '证书编号',
    field: 'licenseNo',
    span: certificateQueryFieldSpan,
    props: {
      placeholder: '请输入证书编号',
      allowClear: true,
    },
  },
  {
    type: 'select',
    label: '状态',
    field: 'status',
    span: certificateQueryFieldSpan,
    props: {
      options: certificateStatusOptions,
      placeholder: '请选择状态',
      allowClear: true,
    },
  },
  {
    type: 'input',
    label: '申请人',
    field: 'submitByName',
    span: certificateQueryFieldSpan,
    props: {
      placeholder: '请输入申请人',
      allowClear: true,
    },
  },
  {
    type: 'range-picker',
    label: '申请时间',
    field: 'createTime',
    span: certificateQueryFieldSpan,
    props: {
      class: 'certificate-query-range gi-form__search-range',
      showTime: true,
      format: 'YYYY-MM-DD HH:mm:ss',
    },
  },
])

// 分页参数
const queryParam = reactive({
  pageNum: 1,
  pageSize: 10,
})

// 分页配置
const pagination = computed(() => ({
  current: queryParam.pageNum,
  pageSize: queryParam.pageSize,
  total: total.value,
  showTotal: true,
  showPageSize: true,
  onChange: (page: number) => {
    queryParam.pageNum = page
    getList()
  },
  onPageSizeChange: (pageSize: number) => {
    queryParam.pageSize = pageSize
    queryParam.pageNum = 1
    getList()
  },
}))

// 表格选择变化
function onSelect(rowKeys: string[], rowKey: string, record: CertificateResp) {
  const index = selectedRows.value.findIndex((item) => item.licenseId === record.licenseId)
  if (index > -1) {
    selectedRows.value.splice(index, 1)
  } else {
    selectedRows.value.push(record)
  }
}

function onSelectAll(checked: boolean) {
  if (checked) {
    // 全选：添加当前页所有未选中的记录
    dataList.value?.forEach((record) => {
      const exists = selectedRows.value.some((item) => item.licenseId === record.licenseId)
      if (!exists) {
        selectedRows.value.push(record)
      }
    })
  } else {
    // 取消全选：移除当前页的所有记录
    const currentPageIds = dataList.value?.map((item) => item.licenseId) || []
    selectedRows.value = selectedRows.value.filter((item) => !currentPageIds.includes(item.licenseId))
  }
}

// 同步 selectedKeys 和 selectedRows
watch(selectedRows, (newRows) => {
  selectedKeys.value = newRows.map((item) => item.licenseId)
}, { deep: true })

// 监听产品变化，自动加载版本
watch(() => queryForm.productId, (productId) => {
  if (productId) {
    handleProductChange(productId)
  } else {
    queryForm.versionId = undefined
    productVersions.value = []
  }
})

// 监听日期范围变化
watch(() => queryForm.createTime, (value: any) => {
  if (value && Array.isArray(value) && value.length === 2) {
    queryForm.createStartTime = value[0]
    queryForm.createEndTime = value[1]
  } else {
    queryForm.createStartTime = undefined
    queryForm.createEndTime = undefined
  }
})

// 是否可以提交审核
const canSubmit = computed(() => {
  return selectedRows.value.some((item: CertificateResp) => String(item.status) === '0')
})

// 是否可以审批
const canApprove = computed(() => {
  return selectedRows.value.some((item: CertificateResp) => String(item.status) === '1')
})

// 是否可以下载
const canDownload = computed(() => {
  return selectedRows.value.some((item: CertificateResp) => String(item.status) === '2')
})

const columns: TableInstance['columns'] = [
  {
    title: '产品名称',
    dataIndex: 'productName',
    slotName: 'productName',
    width: 120,
    ellipsis: true,
    tooltip: true,
    align: 'center',
  },
  {
    title: '产品版本',
    dataIndex: 'versionName',
    slotName: 'versionName',
    width: 80,
    align: 'center',
  },
  {
    title: '产品型号',
    dataIndex: 'modelName',
    slotName: 'modelName',
    width: 120,
    ellipsis: true,
    tooltip: true,
    align: 'center',
  },
  {
    title: '证书编号',
    dataIndex: 'licenseNo',
    slotName: 'licenseNo',
    width: 120,
    ellipsis: true,
    tooltip: true,
    align: 'center',
  },
  {
    title: '机器码',
    dataIndex: 'licenseFile',
    slotName: 'machineCodeFile',
    width: 160,
    ellipsis: true,
    tooltip: true,
    align: 'center',
  },
  {
    title: '状态',
    dataIndex: 'status',
    slotName: 'status',
    width: 60,
    align: 'center',
  },
  {
    title: '申请人',
    dataIndex: 'submitByName',
    slotName: 'submitByName',
    width: 60,
    align: 'center',
  },
  {
    title: '申请时间',
    dataIndex: 'createTime',
    width: 130,
    align: 'center',
  },
  {
    title: '授权结束',
    dataIndex: 'expiryDate',
    width: 130,
    align: 'center',
  },
  {
    title: '操作',
    slotName: 'action',
    width: 110,
    fixed: 'right',
    align: 'center',
  },
]

// 构建URL
function buildUrl(endpoint: string) {
  return `${config.value.environment.url}${endpoint}`
}

function buildPlatformUrl(endpoint: string) {
  const baseUrl = import.meta.env.VITE_API_PREFIX || import.meta.env.VITE_API_BASE_URL || ''
  return `${baseUrl}${endpoint}`
}

function normalizeCertificateList(value: any): CertificateResp[] {
  if (Array.isArray(value))
    return value

  return value?.rows || value?.list || value?.records || value?.licenseList || []
}

function isSuccessResponse(data: any) {
  return data?.success === true || [0, '0', 200, '200'].includes(data?.code)
}

// 调用证书系统状态接口，不走平台自身的 /interfaces/certificate 路由
async function updateCertificateStatus(endpoint: string, licenseId: string) {
  const response = await axios.put(buildUrl(endpoint), { licenseId }, {
    headers: { Authorization: `Bearer ${token.value}` },
  })

  if (!isSuccessResponse(response.data))
    throw new Error(response.data?.msg || '证书状态更新失败')

  return response
}

// 加载配置
async function loadConfig() {
  const applyConfig = () => {
    const cfg = window.config
    if (!cfg?.environment)
      throw new Error('config.js 中未找到有效的 environment 配置')

    const environment = { ...cfg.environment }

    // 保存原始的生产环境URL，用于后端下载证书文件
    environment.productionUrl = cfg.environment.url

    if (import.meta.env.DEV && environment.devUrl)
      environment.url = environment.devUrl

    config.value = { ...cfg, environment }
  }

  if (window.config?.environment) {
    applyConfig()
    return
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/config.js'
    script.onload = () => {
      if (!window.config?.environment) {
        reject(new Error('config.js 中未找到有效的 environment 配置'))
        return
      }
      applyConfig()
      resolve(true)
    }
    script.onerror = () => reject(new Error('config.js 加载失败'))
    document.head.appendChild(script)
  })
}

let loginPromise: Promise<void> | null = null

function isCertificateUnauthorizedResponse(response: any) {
  return response?.status === 401 || [401, '401'].includes(response?.data?.code)
}

function isCertificateUnauthorizedError(error: any) {
  return error?.certificateAuthExpired === true
    || error?.response?.status === 401
    || [401, '401'].includes(error?.response?.data?.code)
}

function createCertificateUnauthorizedError() {
  const error = new Error('证书系统登录已失效') as Error & { certificateAuthExpired?: boolean }
  error.certificateAuthExpired = true
  return error
}

// 自动登录，仅负责获取并缓存 token
async function login() {
  loading.value = true

  try {
    const response = await axios.post(buildUrl(config.value.environment.login), {
      username: config.value.environment.username,
      password: config.value.environment.password,
      code: '',
      uuid: '',
    })

    if (response.data.code !== 200 || !response.data.token)
      throw new Error(response.data.msg || '登录失败')

    token.value = response.data.token
    sessionStorage.setItem('certificate_token', response.data.token)
  }
  catch (error: any) {
    Message.error(error.message || '登录失败，请重试')
    throw error
  }
  finally {
    loading.value = false
  }
}

function loginOnce() {
  if (!loginPromise) {
    loginPromise = login().finally(() => {
      loginPromise = null
    })
  }
  return loginPromise
}

// 获取产品列表
async function getProjects(retryOnUnauthorized = true) {
  try {
    const response = await axios.get(buildUrl(config.value.environment.products), {
      params: { pageNum: 1, pageSize: 9999 },
      headers: { Authorization: `Bearer ${token.value}` },
    })

    if (isCertificateUnauthorizedResponse(response))
      throw createCertificateUnauthorizedError()

    const value = response.data?.data !== undefined ? response.data.data : response.data
    projectOptions.value = Array.isArray(value) ? value : (value && (value.rows || value.list)) || []
  }
  catch (error: any) {
    if (retryOnUnauthorized && isCertificateUnauthorizedError(error)) {
      token.value = ''
      sessionStorage.removeItem('certificate_token')
      await loginOnce()
      await getProjects(false)
      return
    }

    Message.error(error.message || '获取产品列表失败')
  }
}

// 获取证书列表（复刻老项目的 getList 方法）
async function getList(retryOnUnauthorized = true) {
  if (!token.value)
    return

  loading.value = true
  try {
    const response = await axios.get(buildUrl(config.value.environment.makes), {
      params: { ...queryParam, ...queryForm },
      headers: { Authorization: `Bearer ${token.value}` },
    })

    if (isCertificateUnauthorizedResponse(response))
      throw createCertificateUnauthorizedError()

    const value = response.data && response.data.data !== undefined ? response.data.data : response.data
    dataList.value = normalizeCertificateList(value)
    total.value = Number(response.data?.total ?? value?.total ?? dataList.value.length)
    selectedKeys.value = []
    selectedRows.value = []
  }
  catch (error: any) {
    if (retryOnUnauthorized && isCertificateUnauthorizedError(error)) {
      token.value = ''
      sessionStorage.removeItem('certificate_token')
      await loginOnce()
      await getList(false)
      return
    }

    Message.error(error.message || '获取证书列表失败')
  }
  finally {
    loading.value = false
  }
}

// 搜索
function search() {
  queryParam.pageNum = 1
  getList()
}

// 处理搜索
function handleSearch(query: CertificateQuery) {
  Object.assign(queryForm, query)
  search()
}

// 重置
function reset() {
  queryForm.productId = undefined
  queryForm.versionId = undefined
  queryForm.licenseNo = undefined
  queryForm.status = undefined
  queryForm.submitByName = undefined
  queryForm.createStartTime = undefined
  queryForm.createEndTime = undefined
  queryForm.createTime = undefined
  productVersions.value = []
  search()
}

// 新增
const CertificateAddModalRef = ref()
function onAdd() {
  CertificateAddModalRef.value?.onOpen()
}

// 新增成功回调
async function handleAddFormOk(licenseIds?: string[]) {
  await getList()

  // 如果是一键制作，需要保存到服务器并推送企业微信
  if (licenseIds && licenseIds.length > 0) {
    certificateList.value = (dataList.value || []).filter((record: CertificateResp) =>
      licenseIds.includes(record.licenseId),
    )
    if (certificateList.value.length > 0)
      await saveAndNotify()
  }
}

// 详情
const CertificateDetailDrawerRef = ref()
function onDetail(record: CertificateResp) {
  CertificateDetailDrawerRef.value?.onOpen(record)
}

// 提交
async function onSubmit(record: CertificateResp) {
  Modal.confirm({
    title: '确认提交',
    content: `确定要提交证书 "${record.licenseNo}" 审核吗？`,
    onOk: async () => {
      try {
        await updateCertificateStatus(config.value.environment.submit, record.licenseId)
        Message.success('提交审核成功')
        getList()
      }
      catch (error: any) {
        Message.error(error.message || '提交审核失败')
      }
    },
  })
}

// 批量提交
async function onBatchSubmit() {
  const rows = selectedRows.value.filter((item: CertificateResp) => String(item.status) === '0')

  if (!rows.length) {
    Message.warning('选中的证书中没有待提交记录')
    return
  }

  Modal.confirm({
    title: '批量提交审核',
    content: `确定要提交选中的 ${rows.length} 个证书审核吗？`,
    onOk: async () => {
      try {
        for (const record of rows)
          await updateCertificateStatus(config.value.environment.submit, record.licenseId)

        Message.success('批量提交审核成功')
        getList()
      }
      catch (error: any) {
        Message.error(error.message || '批量提交审核失败')
      }
    },
  })
}

// 审批通过
async function onApprove(record: CertificateResp) {
  Modal.confirm({
    title: '确认审批',
    content: `确定要审批通过证书 "${record.licenseNo}" 吗？`,
    onOk: async () => {
      try {
        await updateCertificateStatus(config.value.environment.approve, record.licenseId)
        Message.success('审批通过成功')
        certificateList.value = [record]
        await saveAndNotify()
      }
      catch (error: any) {
        Message.error(error.message || '审批失败')
      }
    },
  })
}

// 批量审批
async function onBatchApprove() {
  const rows = selectedRows.value.filter((item: CertificateResp) => String(item.status) === '1')

  if (!rows.length) {
    Message.warning('选中的证书中没有待审批记录')
    return
  }

  Modal.confirm({
    title: '批量审批',
    content: `确定要审批通过选中的 ${rows.length} 个证书吗？`,
    onOk: async () => {
      try {
        for (const record of rows)
          await updateCertificateStatus(config.value.environment.approve, record.licenseId)

        Message.success('批量审批成功')
        certificateList.value = rows
        await saveAndNotify()
      }
      catch (error: any) {
        Message.error(error.message || '批量审批失败')
      }
    },
  })
}

// 下载证书
async function onDownload(record: CertificateResp) {
  if (String(record.status) !== '2') {
    Message.warning('只能下载已通过状态的证书')
    return
  }

  try {
    const response = await axios.get(`${buildUrl(config.value.environment.download)}/${record.licenseId}`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token.value}` },
    })

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${record.licenseNo || record.licenseId}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    Message.success('证书下载成功')
    certificateList.value = [record]
    // await saveAndNotify()
  }
  catch (error: any) {
    Message.error(error.message || '证书下载失败')
  }
}

// 批量下载
async function onBatchDownload() {
  const rows = selectedRows.value.filter((item: CertificateResp) => String(item.status) === '2')

  if (!rows.length) {
    Message.warning('选中的证书中没有可下载记录')
    return
  }

  try {
    for (const record of rows) {
      const response = await axios.get(`${buildUrl(config.value.environment.download)}/${record.licenseId}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token.value}` },
      })

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${record.licenseNo || record.licenseId}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }

    Message.success('批量下载成功')
    certificateList.value = rows
    // await saveAndNotify()
  }
  catch (error: any) {
    Message.error(error.message || '批量下载失败')
  }
}

// 保存并通知
async function saveAndNotify() {
  console.log('=== saveAndNotify 开始 ===')
  console.log('certificateList:', certificateList.value)

  await getList()
  console.log('刷新后的 list:', dataList.value)

  await downloadFileToServer()
  await sendWebhook()

  console.log('=== saveAndNotify 完成 ===')
}

// 下载文件到服务器
async function downloadFileToServer() {
  markdownList.value = []
  const certificateList1: CertificateResp[] = []

  console.log('开始保存证书到服务器, certificateList:', certificateList.value)

  for (const item of certificateList.value) {
    const found = (dataList.value || []).find((listItem: CertificateResp) => listItem.licenseId === item.licenseId)
    if (found)
      certificateList1.push(found)
  }

  console.log('找到的证书记录:', certificateList1)

  await Promise.all(
    certificateList1.map(async (record) => {
      const formData = new FormData()

      // 构建下载URL：
      // 开发环境：通过当前前端地址的代理访问，避免SSL证书问题
      // 生产环境：直接使用生产环境URL
      let downloadUrl
      if (import.meta.env.DEV && config.value.environment.devUrl) {
        // 使用当前浏览器地址 + 代理路径
        const origin = window.location.origin
        downloadUrl = `${origin}${config.value.environment.devUrl}${config.value.environment.download}/${record.licenseId}`
      }
      else {
        downloadUrl = `${config.value.environment.productionUrl}${config.value.environment.download}/${record.licenseId}`
      }

      formData.append('url', downloadUrl)
      formData.append('authorization', token.value)
      formData.append('savePath', config.value.environment.savePath)

      const fileName = `${record.productName}_${record.versionName}_${record.modelName}_${record.licenseNo}.zip`
      formData.append('fileName', fileName)

      console.log('正在保存文件:', fileName)
      console.log('下载URL:', downloadUrl)
      console.log('保存路径:', config.value.environment.savePath)

      try {
        const response = await axios.post(
          buildPlatformUrl(config.value.environment.downloadFile),
          formData,
          { headers: { Authorization: `Bearer ${getToken()}` } },
        )

        console.log('文件保存响应:', response.data)

        if (isSuccessResponse(response.data))
          await buildMarkdownData(record, fileName)
      }
      catch (error) {
        console.error('保存证书到服务器失败:', error)
      }
    }),
  )

  console.log('构建的 markdownList:', markdownList.value)
}

// 构建 Markdown 数据
async function buildMarkdownData(record: CertificateResp, fileName: string) {
  console.log('构建 Markdown 数据，record:', record)

  // 使用旧版本的字段名，确保与后端兼容
  const markdown = {
    orderId: record.testNo || randomUUID(), // 优先使用后端返回的testNo，确保与申请时的testNo一致
    userName: localStorage.getItem('userName') || record.createBy,
    productChName: record.productName,
    productVersionNumber: record.versionName,
    typeName: record.modelName,
    machineCodeMd: record.licenseNo,
    uploadFileName: record.licenseFile ? record.licenseFile.split('/').pop() : record.machineCode,
    makeUserName: record.auditByName || '',
    certificateState: String(record.status) === '2' ? '成功' : '失败',
    makeTime: record.createTime || '',
    authorizationDeadlineTime: record.expiryDate || '',
    maintenanceWarnDate: record.expiryDate || '',
    fileName: config.value.environment.downloadPath + fileName,
  }

  console.log('构建的 markdown 对象:', markdown)
  markdownList.value.push(markdown)
}

// 发送企业微信通知
async function sendWebhook() {
  if (!markdownList.value.length) {
    console.warn('markdownList 为空，跳过推送')
    return
  }

  try {
    const buildUrl = buildPlatformUrl(config.value.environment.webhookUrl)
    const formData = {
      webhook: config.value.environment.webhook,
      msgtype: 'markdown',
      markdownList: markdownList.value,
    }

    console.log('准备发送企业微信通知:', formData)

    const response = await axios.post(buildUrl, formData, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })

    console.log('企业微信推送响应:', response.data)

    if (isSuccessResponse(response.data))
      Message.success('推送至企业微信机器人成功！')
    else
      Message.error(`推送至企业微信机器人失败: ${response.data.msg || ''}`)
  }
  catch (error) {
    console.error('发送企业微信通知失败:', error)
    Message.error('推送至企业微信机器人失败！')
  }
}

// 初始化
onMounted(async () => {
  try {
    await loadConfig()
    token.value = sessionStorage.getItem('certificate_token') || ''
    if (!token.value)
      await loginOnce()

    await Promise.all([getProjects(), getList()])
  }
  catch (error: any) {
    Message.error(error.message || '初始化失败')
  }
})
</script>

<style scoped lang="scss">
.certificate-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
  min-height: 0;
  padding: 0;
  background: var(--color-bg-1);

  :deep(.gi-table) {
    flex: 1 1 0;
    width: 100%;
    min-width: 0;
    min-height: calc(100vh - 200px);
    padding: 20px;
    background: var(--color-bg-1);
    border-radius: 0;
  }

  :deep(.gi-table__top) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  :deep(.gi-table__toolbar) {
    min-height: 44px;
    padding: 4px 0 14px;
    margin-top: 0;
  }

  :deep(.gi-table__toolbar-left),
  :deep(.gi-table__toolbar-right) {
    gap: 8px;
  }

  :deep(.arco-table-container) {
    border: 1px solid var(--color-border-2);
    border-radius: 6px;
  }

  :deep(.arco-table-th) {
    height: 44px;
    background: var(--color-fill-1);
  }

  :deep(.arco-table-pagination) {
    margin-top: 14px;
    padding-bottom: 2px;
  }

  .ellipsis-text {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.certificate-query-top-slot {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.query-form {
  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }
}

.certificate-query-form {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }
}
</style>
