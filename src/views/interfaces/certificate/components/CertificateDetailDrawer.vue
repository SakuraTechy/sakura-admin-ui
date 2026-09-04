<template>
  <a-modal
    v-model:visible="visible"
    title="证书信息详情"
    :width="width >= 960 ? 900 : 'calc(100% - 24px)'"
    :mask-closable="false"
    class="certificate-detail-modal"
  >
    <a-spin :loading="detailLoading" class="certificate-detail-spin">
      <div class="certificate-detail-content">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">订单编号</span>
            <span class="detail-value">{{ displayValue(detail?.orderNo) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">状态</span>
            <span class="detail-value" :class="statusClass">{{ getCertificateStatus(detail?.status) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">客户名称</span>
            <span class="detail-value">{{ displayValue(detail?.customerName) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">客户简称</span>
            <span class="detail-value">{{ displayValue(detail?.customerShort) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">产品名称</span>
            <span class="detail-value">{{ displayValue(detail?.productName) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">产品版本</span>
            <span class="detail-value">{{ displayValue(detail?.versionName) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">产品型号</span>
            <span class="detail-value">{{ displayValue(detail?.modelName) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">出货型号</span>
            <span class="detail-value">{{ displayValue(detail?.shipmentModel || detail?.modelMapping) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">证书数量</span>
            <span class="detail-value">{{ displayValue(detail?.totalCount) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">证书ID</span>
            <span class="detail-value">{{ displayValue(detail?.licenseId) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">证书编号</span>
            <span class="detail-value">{{ displayValue(detail?.licenseNo) }}</span>
          </div>
          <div class="detail-item detail-item--machine-code">
            <span class="detail-label">机器码</span>
            <span class="detail-value detail-value--break">{{ displayValue(detail?.licenseFile ? detail?.licenseFile.split('/').pop() : detail?.machineCode) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">申请人</span>
            <span class="detail-value">{{ displayValue(detail?.createBy) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">申请时间</span>
            <span class="detail-value">{{ displayValue(detail?.createTime) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">提交人</span>
            <span class="detail-value">{{ displayValue(detail?.submitByName) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">提交时间</span>
            <span class="detail-value">{{ displayValue(detail?.submitTime) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">审批人</span>
            <span class="detail-value">{{ displayValue(detail?.auditByName) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">审批时间</span>
            <span class="detail-value">{{ displayValue(detail?.auditTime) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">授权生效</span>
            <span class="detail-value">{{ displayValue(detail?.effectDate) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">授权结束</span>
            <span class="detail-value">{{ displayValue(detail?.expiryDate) }}</span>
          </div>

          <div class="detail-item">
            <span class="detail-label">维保结束</span>
            <span class="detail-value">{{ displayValue(detail?.maintenanceExpiry) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">授权天数</span>
            <span class="detail-value">{{ displayValue(detail?.authDays) }}</span>
          </div>

          <div class="detail-item detail-item--full detail-item--content">
            <span class="detail-label ">授权模块</span>
            <span v-if="moduleNames.length" class="detail-value module-list">
              <a-tag v-for="moduleName in moduleNames" :key="moduleName" size="small" class="module-tag">
                {{ moduleName }}
              </a-tag>
            </span>
            <span v-else class="detail-value">-</span>
          </div>
          
          <div class="detail-item detail-item--full">
            <span class="detail-label">性能配置</span>
            <pre class="detail-value detail-value--config">{{ formatPerfConfig(detail?.perfConfig) }}</pre>
          </div>
          
          <!-- <div class="detail-item detail-item--full detail-item--extra">
            <span class="detail-label">OEM名称</span>
            <span class="detail-value">{{ displayValue(detail?.oemName) }}</span>
            <span class="detail-label">产品系列</span>
            <span class="detail-value">{{ displayValue(detail?.seriesName) }}</span>
          </div>

          <div class="detail-item detail-item--full detail-item--extra">
            <span class="detail-label">授权类型</span>
            <span class="detail-value">{{ getAuthType(detail?.authType) }}</span>
            <span class="detail-label">审批意见</span>
            <span class="detail-value">{{ displayValue(detail?.auditComment) }}</span>
          </div>

          <div class="detail-item detail-item--full detail-item--extra">
            <span class="detail-label">中性版本</span>
            <span class="detail-value">{{ displayFlag(detail?.isNeutral) }}</span>
            <span class="detail-label">系统信息菜单</span>
            <span class="detail-value">{{ displayFlag(detail?.hasSysinfoMenu) }}</span>
          </div>

          <div class="detail-item detail-item--full detail-item--extra">
            <span class="detail-label">集群证书</span>
            <span class="detail-value">{{ displayFlag(detail?.isClusterLicense) }}</span>
            <span class="detail-label">已生成数量</span>
            <span class="detail-value">{{ displayValue(detail?.licenseCount) }}</span>
          </div>

          <div class="detail-item detail-item--full detail-item--extra">
            <span class="detail-label">证书文件</span>
            <span class="detail-value detail-value--break">{{ displayValue(detail?.licenseFile) }}</span>
            <span class="detail-label">更新时间</span>
            <span class="detail-value">{{ displayValue(detail?.updateTime) }}</span>
          </div> -->

          <div v-if="detail?.licenseContent" class="detail-item detail-item--full detail-item--content">
            <span class="detail-label">证书内容</span>
            <pre class="detail-value detail-value--config">{{ detail?.licenseContent }}</pre>
          </div>
        </div>
      </div>
    </a-spin>

    <!-- <template #footer>
      <a-button type="primary" @click="visible = false">确定</a-button>
    </template> -->
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'
import axios from 'axios'
import { getCertificateStatus } from './config'
import type { CertificateDetailResp } from '@/types/interfaces/certificate'

interface ModuleOption {
  moduleId: string | number
  moduleName: string
}

const props = defineProps<{
  config?: {
    environment?: {
      url?: string
      detail?: string
      productModules?: string
    }
  } | null
}>()

const { width } = useWindowSize()

const dataDetail = ref<CertificateDetailResp>()
const visible = ref(false)
const detailLoading = ref(false)
const moduleOptions = ref<ModuleOption[]>([])

const detail = computed(() => dataDetail.value)
const statusClass = computed(() => {
  const status = String(detail.value?.status || '')
  return status === '2' ? 'detail-value--success' : status === '3' ? 'detail-value--danger' : ''
})

const displayValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '-'
  return String(value)
}

const displayFlag = (value?: string) => {
  if (value === undefined || value === null || value === '') return '-'
  return ['1', 'true', 'TRUE'].includes(String(value)) ? '是' : '否'
}

const getAuthType = (type?: string) => {
  const types: Record<string, string> = {
    1: '普通授权',
    2: '试用授权',
    3: '永久授权',
  }
  return types[type || ''] || displayValue(type)
}

const moduleNames = computed(() => {
  const source = detail.value as (CertificateDetailResp & Record<string, any>) | undefined
  const explicitNames = source?.authModuleNameList || source?.authModuleNames || source?.moduleNameList
  if (Array.isArray(explicitNames) && explicitNames.length)
    return explicitNames.map(String)

  const moduleIds = source?.authModuleIdList || source?.authModuleIds
  const ids = Array.isArray(moduleIds)
    ? moduleIds
    : moduleIds ? String(moduleIds).split(',').map((item) => item.trim()).filter(Boolean) : []
  const nameMap = new Map(moduleOptions.value.map((item) => [String(item.moduleId), item.moduleName]))

  if (ids.length)
    return ids.map((item) => nameMap.get(String(item)) || String(item))

  const modules = source?.authModuleList || source?.authModules
  if (Array.isArray(modules)) {
    return modules
      .map((item: any) => item && typeof item === 'object' ? item.moduleName || item.name || item.label || item.moduleId : item)
      .filter((item: any) => item !== undefined && item !== null && item !== '')
      .map(String)
  }

  return modules ? String(modules).split(',').map((item) => item.trim()).filter(Boolean) : []
})

const loadModuleOptions = async (value: CertificateDetailResp) => {
  const environment = props.config?.environment
  if (!environment?.url || !environment.productModules || !value.productId || !value.versionId)
    return

  let endpoint = environment.productModules
    .replace('{productId}', encodeURIComponent(String(value.productId)))
    .replace('{versionId}', encodeURIComponent(String(value.versionId)))
  if (!endpoint.includes('{productId}') && !environment.productModules.includes('{productId}')) {
    const pathHasVersionParams = environment.productModules.endsWith(`/${value.productId}/${value.versionId}`)
    if (!pathHasVersionParams)
      endpoint = `${endpoint}/${encodeURIComponent(String(value.productId))}/${encodeURIComponent(String(value.versionId))}`
  }

  try {
    const response = await axios.get(`${environment.url}${endpoint}`, {
      headers: sessionStorage.getItem('certificate_token')
        ? { Authorization: `Bearer ${sessionStorage.getItem('certificate_token')}` }
        : {},
    })
    const result = response.data?.data !== undefined ? response.data.data : response.data
    const list = Array.isArray(result) ? result : (result?.rows || result?.list || [])
    moduleOptions.value = list
      .filter((item: any) => item?.moduleId !== undefined && item?.moduleName)
      .map((item: any) => ({ moduleId: item.moduleId, moduleName: item.moduleName }))
  } catch {
    moduleOptions.value = []
  }
}

const loadDetail = async (value: CertificateDetailResp) => {
  const environment = props.config?.environment
  if (!environment?.url || !environment.detail || !value.licenseId)
    return value

  const endpoint = environment.detail.replace('{licenseId}', encodeURIComponent(String(value.licenseId)))
  try {
    const response = await axios.get(`${environment.url}${endpoint}`, {
      headers: sessionStorage.getItem('certificate_token')
        ? { Authorization: `Bearer ${sessionStorage.getItem('certificate_token')}` }
        : {},
    })
    const result = response.data?.data !== undefined ? response.data.data : response.data
    if (result && typeof result === 'object') {
      dataDetail.value = { ...value, ...result }
      return dataDetail.value
    }
  } catch {
    // 详情接口不可用时保留列表中的完整记录，保证弹窗仍可打开。
  }
  return value
}

const formatPerfConfig = (value?: string | Record<string, any>) => {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)

  try {
    return JSON.stringify(JSON.parse(value))
  } catch {
    return value
  }
}

// 打开详情。证书列表已包含详情所需字段，避免请求不存在的 /interfaces/certificate/{id}。
const onOpen = async (value: CertificateDetailResp) => {
  dataDetail.value = value
  moduleOptions.value = []
  visible.value = true
  detailLoading.value = true
  try {
    const fullDetail = await loadDetail(value)
    await loadModuleOptions(fullDetail)
  } finally {
    detailLoading.value = false
  }
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.certificate-detail-content {
  max-height: min(660px, calc(100vh - 210px));
  overflow-y: auto;
  // padding: 0 14px 14px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  column-gap: 16px;
  row-gap: 0;
  padding: 5px 15px 15px 15px;
  background: #f3f6fc;
}

.detail-item {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
  min-height: 35px;
  align-items: start;
  padding: 7px 0;
}

.detail-item--machine-code,
.detail-item--modules {
  // min-height: 58px;
}

.detail-item--full {
  grid-column: 1 / -1;
  min-height: 50px;
  border-bottom: 1px solid var(--color-border-2);
}

.detail-item--extra {
  grid-template-columns: 76px minmax(0, 1fr) 76px minmax(0, 1fr);
}

.detail-label {
  color: var(--color-text-2);
  font-weight: 600;
  line-height: 22px;
  white-space: nowrap;
}

.detail-value {
  min-width: 0;
  color: var(--color-text-1);
  line-height: 22px;
  overflow-wrap: anywhere;
}

.detail-value--break {
  word-break: break-all;
}

.detail-value--success {
  color: rgb(var(--green-6));
}

.detail-value--danger {
  color: rgb(var(--red-6));
}

.module-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.module-tag {
  margin: 0;
  color: var(--color-text-2);
  background: var(--color-bg-2);
  border-color: var(--color-border-3);
}

.detail-value--config {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font: inherit;
}

:deep(.arco-modal-body) {
  padding: 20px !important;
}

:deep(.arco-modal-footer) {
  padding: 12px 16px;
}

@media (max-width: 720px) {
  .certificate-detail-content {
    padding: 0 12px 12px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
    padding: 14px;
  }

  .detail-item,
  .detail-item--full {
    grid-column: 1;
  }
}
</style>
