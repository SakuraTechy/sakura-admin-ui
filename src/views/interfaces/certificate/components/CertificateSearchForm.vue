<template>
  <div class="certificate-search-form">
    <a-form layout="inline" :model="queryForm">
      <a-form-item label="产品名称">
        <a-select
          v-model="queryForm.productId"
          placeholder="请选择产品"
          allow-clear
          allow-search
          style="width: 200px"
          @change="handleProductChange"
        >
          <a-option v-for="item in projectOptions" :key="item.productId" :value="item.productId">
            {{ item.productName }}
          </a-option>
        </a-select>
      </a-form-item>

      <a-form-item label="产品版本">
        <a-select
          v-model="queryForm.versionId"
          placeholder="请选择版本"
          allow-clear
          allow-search
          style="width: 200px"
          :disabled="!queryForm.productId"
        >
          <a-option v-for="item in productVersions" :key="item.versionId" :value="item.versionId">
            {{ item.versionNo }}
          </a-option>
        </a-select>
      </a-form-item>

      <a-form-item label="证书编号">
        <a-input
          v-model="queryForm.licenseNo"
          placeholder="请输入证书编号"
          allow-clear
          style="width: 200px"
        />
      </a-form-item>

      <a-form-item label="状态">
        <a-select
          v-model="queryForm.status"
          placeholder="请选择状态"
          allow-clear
          style="width: 150px"
          :options="certificateStatusOptions"
        />
      </a-form-item>

      <a-form-item label="申请人">
        <a-input
          v-model="queryForm.createBy"
          placeholder="请输入申请人"
          allow-clear
          style="width: 150px"
        />
      </a-form-item>

      <a-form-item label="申请时间">
        <a-range-picker
          v-model="dateRange"
          show-time
          format="YYYY-MM-DD HH:mm:ss"
          style="width: 380px"
          @change="handleDateChange"
        />
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-button type="primary" @click="handleSearch">
            <template #icon><icon-search /></template>
            查询
          </a-button>
          <a-button @click="handleReset">
            <template #icon><icon-refresh /></template>
            重置
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import type { CertificateQuery, ProductOption, ProductVersionOption } from '@/types/interfaces/certificate'
import { certificateStatusOptions } from './config'

interface Props {
  projectOptions: ProductOption[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  search: [query: CertificateQuery]
  reset: []
}>()

const queryForm = reactive<CertificateQuery>({
  productId: undefined,
  versionId: undefined,
  licenseNo: undefined,
  status: undefined,
  createBy: undefined,
  createStartTime: undefined,
  createEndTime: undefined,
})

const productVersions = ref<ProductVersionOption[]>([])

// 获取证书系统配置
const getCertificateConfig = () => {
  return window.config
}

// 构建证书系统 URL
const buildCertificateUrl = (endpoint: string) => {
  const config = getCertificateConfig()
  if (!config?.environment) return endpoint
  // 开发环境优先使用 devUrl（代理），生产环境使用 url
  const baseUrl = (import.meta.env.DEV && config.environment.devUrl)
    ? config.environment.devUrl
    : (config.environment.url || '')
  return `${baseUrl}${endpoint}`
}

// 获取证书系统 token（从父组件 index.vue 中获取）
const getCertificateToken = () => {
  // 这个 token 需要从父组件传递过来，或者从 sessionStorage 中获取
  // 暂时从 sessionStorage 获取（需要在 index.vue login 时保存）
  return sessionStorage.getItem('certificate_token') || ''
}
const dateRange = ref<[string, string]>()

// 处理日期范围变化
const handleDateChange = (value: [string, string] | undefined) => {
  if (value && value.length === 2) {
    queryForm.createStartTime = value[0]
    queryForm.createEndTime = value[1]
  }
  else {
    queryForm.createStartTime = undefined
    queryForm.createEndTime = undefined
  }
}

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

  if (!productId)
    return

  try {
    const config = getCertificateConfig()
    if (!config?.environment?.productVersions) {
      console.error('证书系统配置未加载')
      return
    }

    const token = getCertificateToken()
    const response = await axios.get(buildCertificateUrl(config.environment.productVersions), {
      params: { productId, pageNum: 1, pageSize: 9999 },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    // 规范化响应数据（与老项目的 normalizeList 保持一致）
    const value = response.data?.data !== undefined ? response.data.data : response.data
    const list = Array.isArray(value) ? value : (value && (value.rows || value.list)) || []

    // 过滤并排序版本列表
    productVersions.value = list
      .filter((item: any) => String(item.certVersion || '').trim() !== '')
      .sort((a: any, b: any) => compareVersionNo(a.versionNo, b.versionNo))
  }
  catch (error) {
    console.error('获取产品版本失败:', error)
  }
}

// 触发搜索
const handleSearch = () => {
  emit('search', { ...queryForm })
}

// 重置搜索
const handleReset = () => {
  queryForm.productId = undefined
  queryForm.versionId = undefined
  queryForm.licenseNo = undefined
  queryForm.status = undefined
  queryForm.createBy = undefined
  queryForm.createStartTime = undefined
  queryForm.createEndTime = undefined
  productVersions.value = []
  dateRange.value = undefined
  emit('reset')
}
</script>

<style scoped lang="scss">
.certificate-search-form {
  :deep(.arco-form-item) {
    margin-bottom: 16px;
  }
}
</style>
