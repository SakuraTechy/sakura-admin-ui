<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 800 ? 800 : '100%'"
    draggable
    @close="reset"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      auto-label-width
    >
      <a-row :gutter="16">
        <a-col :span="24">
          <a-form-item label="产品项目" field="productId">
            <a-select
              v-model="form.productId"
              placeholder="请选择产品"
              allow-search
              allow-clear
              @change="handleProductChange"
            >
              <a-option
                v-for="item in projectOptions"
                :key="item.productId"
                :value="item.productId"
                :label="item.productName"
              />
            </a-select>
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <a-form-item label="产品版本" field="versionId">
            <a-select
              v-model="form.versionId"
              placeholder="请选择版本"
              allow-search
              allow-clear
              :disabled="!form.productId"
              @change="handleVersionChange"
            >
              <a-option
                v-for="item in productVersions"
                :key="item.versionId"
                :value="item.versionId"
                :label="item.versionNo"
              />
            </a-select>
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <a-form-item label="产品型号" field="modelId">
            <a-select
              v-model="form.modelId"
              placeholder="请选择型号"
              allow-search
              allow-clear
              :disabled="!form.versionId"
              @change="handleModelChange"
            >
              <a-option
                v-for="item in productModels"
                :key="item.modelId"
                :value="item.modelId"
                :label="item.modelName"
              />
            </a-select>
          </a-form-item>
        </a-col>

        <a-col :span="24">
          <a-form-item label="授权模块">
            <a-select
              v-model="form.authModuleIdList"
              placeholder="请选择授权模块"
              multiple
              allow-search
              allow-clear
              :max-tag-count="50"
              :disabled="!form.modelId"
            >
              <a-option
                v-for="item in productModules"
                :key="item.moduleId"
                :value="item.moduleId"
                :label="item.moduleName"
              />
            </a-select>
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <a-form-item label="授权生效" field="effectDate">
            <a-date-picker
              v-model="form.effectDate"
              show-time
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择授权生效时间"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <a-form-item label="授权结束" field="expiryDate">
            <a-date-picker
              v-model="form.expiryDate"
              show-time
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择授权结束时间"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <a-form-item label="维保结束" field="maintenanceExpiry">
            <a-date-picker
              v-model="form.maintenanceExpiry"
              show-time
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择维保结束时间"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <a-form-item label="授权天数" field="authDays">
            <a-input-number
              v-model="form.authDays"
              :min="1"
              :precision="0"
              style="width: 100%"
              placeholder="请输入授权天数"
            />
          </a-form-item>
        </a-col>

        <a-col :span="24">
          <a-form-item label="机器码文件" field="machineCodeFiles" required>
            <a-upload
              v-model:file-list="fileList"
              :custom-request="customUpload"
              :before-upload="beforeUpload"
              accept=".info,.txt"
              multiple
              draggable
              :limit="10"
              @change="handleFileChange"
            >
              <template #upload-button>
                <div class="upload-trigger">
                  <icon-upload />
                  <div class="upload-text">
                    可批量将文件拖到此处，或<span class="upload-link">点击上传</span>
                  </div>
                  <div class="upload-tip">只能上传 .info 或 .txt 文件，单个文件不超过 500KB</div>
                </div>
              </template>
            </a-upload>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button
        type="primary"
        :loading="applyLoading"
        :disabled="applyAndMakeLoading"
        @click="handleApply"
      >
        立即申请
      </a-button>
      <a-button
        type="primary"
        status="success"
        :loading="applyAndMakeLoading"
        :disabled="applyLoading"
        @click="handleApplyAndMake"
      >
        一键制作
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import type { FileItem, RequestOption } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import dayjs from 'dayjs'
import md5 from 'md5'
import axios from 'axios'
import { randomUUID } from '@/utils'
import type {
  BatchApplicationPayload,
  CertificateForm,
  MachineCodeInfo,
  ProductModelOption,
  ProductModuleOption,
  ProductOption,
  ProductVersionOption,
} from '@/types/interfaces/certificate'

interface Props {
  projectOptions: ProductOption[]
  config: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'save-success', licenseIds?: string[]): void
}>()

const { width } = useWindowSize()

const visible = ref(false)
const applyLoading = ref(false)
const applyAndMakeLoading = ref(false)
const title = ref('证书申请')
const formRef = ref()

// 获取证书系统配置
const getCertificateConfig = () => {
  return window.config
}

// 构建证书系统 URL
const buildCertificateUrl = (endpoint: string, pathParams: Record<string, string | number> = {}) => {
  const config = getCertificateConfig()
  if (!config?.environment) return endpoint
  let resolvedEndpoint = endpoint
  Object.entries(pathParams).forEach(([key, value]) => {
    resolvedEndpoint = resolvedEndpoint.replace(`{${key}}`, encodeURIComponent(String(value)))
  })
  // 开发环境优先使用 devUrl（代理），生产环境使用 url
  const baseUrl = (import.meta.env.DEV && config.environment.devUrl)
    ? config.environment.devUrl
    : (config.environment.url || '')
  return `${baseUrl}${resolvedEndpoint}`
}

// 获取证书系统 token
const getCertificateToken = () => {
  return sessionStorage.getItem('certificate_token') || ''
}

// 产品相关数据
const productVersions = ref<ProductVersionOption[]>([])
const productModels = ref<ProductModelOption[]>([])
const productModules = ref<ProductModuleOption[]>([])

// 文件列表
const fileList = ref<FileItem[]>([])

// 表单数据
const form = reactive<CertificateForm>({
  productId: undefined,
  versionId: undefined,
  modelId: undefined,
  customerId: 1,
  customerName: '昂楷科技内部测试',
  customerShort: 'ANKKI',
  authModuleIdList: [],
  effectDate: dayjs().format('YYYY-MM-DD 00:00:00'),
  expiryDate: dayjs().add(7, 'day').format('YYYY-MM-DD 23:59:59'),
  maintenanceExpiry: dayjs().add(7, 'day').format('YYYY-MM-DD 23:59:59'),
  authDays: 7,
  totalCount: 1,
  machineCodeFiles: [],
})

// 表单验证规则
const rules = {
  productId: [{ required: true, message: '产品项目不能为空' }],
  versionId: [{ required: true, message: '产品版本不能为空' }],
  modelId: [{ required: true, message: '产品型号不能为空' }],
  effectDate: [{ required: true, message: '生效时间不能为空' }],
  expiryDate: [{ required: true, message: '授权结束时间不能为空' }],
  maintenanceExpiry: [{ required: true, message: '维保结束时间不能为空' }],
  authDays: [{ required: true, message: '授权天数不能为空' }],
  machineCodeFiles: [{ required: true, message: '请上传机器码文件' }],
}

// 监听日期变化自动计算天数
watch([() => form.effectDate, () => form.expiryDate], () => {
  const days = calculateAuthDays()
  if (days > 0)
    form.authDays = days
})

// 监听天数变化自动更新结束日期
const updatingFromDate = ref(false)
watch(() => form.authDays, (value) => {
  if (!updatingFromDate.value && value)
    updateExpiryDate(value)
})

// 计算授权天数
function calculateAuthDays(): number {
  if (!form.effectDate || !form.expiryDate)
    return 0

  const start = dayjs(form.effectDate).startOf('day')
  const end = dayjs(form.expiryDate).startOf('day')
  return end.diff(start, 'day')
}

// 根据天数更新结束日期
function updateExpiryDate(days: number) {
  if (!form.effectDate)
    return

  const date = dayjs(form.effectDate).add(days, 'day')
  form.expiryDate = date.format('YYYY-MM-DD 23:59:59')
}

// 比较版本号
function compareVersionNo(left: string, right: string): number {
  const leftParts = String(left || '').replace(/^v/i, '').split('.')
  const rightParts = String(right || '').replace(/^v/i, '').split('.')
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index++) {
    const leftPart = leftParts[index] || ''
    const rightPart = rightParts[index] || ''
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null

    if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber)
      return rightNumber - leftNumber

    if (leftPart !== rightPart)
      return rightPart.localeCompare(leftPart, undefined, { numeric: true, sensitivity: 'base' })
  }

  return 0
}

// 处理产品变化
const handleProductChange = async (productId?: string) => {
  form.versionId = undefined
  form.modelId = undefined
  form.authModuleIdList = []
  productVersions.value = []
  productModels.value = []
  productModules.value = []

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

    productVersions.value = list
      .filter((item: any) => String(item.certVersion || '').trim() !== '')
      .sort((a: any, b: any) => compareVersionNo(a.versionNo, b.versionNo))
  }
  catch (error) {
    console.error('获取产品版本失败:', error)
    Message.error('获取产品版本失败')
  }
}

// 处理版本变化
const handleVersionChange = async (versionId?: string) => {
  form.modelId = undefined
  form.authModuleIdList = []
  productModels.value = []
  productModules.value = []

  if (!versionId || !form.productId)
    return

  try {
    await Promise.all([loadProductModels(), loadProductModules()])
  }
  catch (error) {
    console.error('获取产品数据失败:', error)
  }
}

// 加载产品型号
async function loadProductModels() {
  if (!form.productId || !form.versionId)
    return

  try {
    const config = getCertificateConfig()
    if (!config?.environment?.productModels) {
      console.error('证书系统配置未加载')
      return
    }

    const token = getCertificateToken()
    const response = await axios.get(buildCertificateUrl(config.environment.productModels), {
      params: { productId: form.productId, versionId: form.versionId, status: 0 },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    // 规范化响应数据
    const value = response.data?.data !== undefined ? response.data.data : response.data
    productModels.value = Array.isArray(value) ? value : (value && (value.rows || value.list)) || []
  }
  catch (error) {
    console.error('获取产品型号失败:', error)
  }
}

// 加载产品模块
async function loadProductModules() {
  if (!form.productId || !form.versionId)
    return

  try {
    const config = getCertificateConfig()
    if (!config?.environment?.productModules) {
      console.error('证书系统配置未加载')
      return
    }

    const token = getCertificateToken()
    const response = await axios.get(buildCertificateUrl(config.environment.productModules, {
      productId: form.productId,
      versionId: form.versionId,
    }), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    // 规范化响应数据
    const value = response.data?.data !== undefined ? response.data.data : response.data
    productModules.value = Array.isArray(value) ? value : (value && (value.rows || value.list)) || []
  }
  catch (error) {
    console.error('获取产品模块失败:', error)
  }
}

// 处理型号变化
const handleModelChange = (modelId?: string) => {
  const model = productModels.value.find(item => item.modelId === modelId)

  if (model && Array.isArray(model.moduleIds) && model.moduleIds.length > 0)
    form.authModuleIdList = [...model.moduleIds]
  else
    form.authModuleIdList = productModules.value.map(item => item.moduleId)
}

// 文件上传前验证
const beforeUpload = (file: File) => {
  const allowedExtensions = ['info', 'txt']
  const fileName = file.name
  const fileExtension = fileName.split('.').pop()?.toLowerCase()

  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    Message.error('只支持 .info 和 .txt 格式的文件')
    return false
  }

  const maxSize = 500 * 1024 // 500KB
  if (file.size > maxSize) {
    Message.error('文件大小不能超过 500KB')
    return false
  }

  return true
}

// 自定义上传
const customUpload = (option: RequestOption) => {
  const { fileItem, onSuccess } = option
  fileItem.status = 'done'
  onSuccess()
}

// 同步上传列表到表单字段，供表单校验使用
const handleFileChange = (files: FileItem[]) => {
  form.machineCodeFiles = files
}

// 读取机器码文件
async function readMachineCode(file: File): Promise<MachineCodeInfo> {
  const text = (await file.text()).replace(/^﻿/, '').trim()
  let data: any = {}

  try {
    data = JSON.parse(text)
  }
  catch (error) {
    const match = text.match(/(?:machineCode|机器码)\s*[:=]\s*([^\r\n]+)/i)
    data.machineCode = match ? match[1].trim() : text.split(/\r?\n/).map(item => item.trim()).filter(Boolean)[0]
  }

  const machineCode = data.machineCode || (Array.isArray(data.machineCodeList) && data.machineCodeList[0])
  if (!machineCode)
    throw new Error(`${file.name} 中未找到机器码`)

  const licenseNo = data.licenseNo || md5(machineCode).slice(0, 16).toUpperCase()
  return { machineCode, licenseNo }
}

// 构建URL
function buildUrl(endpoint: string) {
  return `${props.config.environment.url}${endpoint}`
}

// 构建请求头
function headers() {
  const token = getCertificateToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// 创建提交数据
function createPayload(machines: MachineCodeInfo[]): BatchApplicationPayload {
  const machine = machines[0]
  const product = props.projectOptions.find(item => item.productId === form.productId)
  const version = productVersions.value.find(item => item.versionId === form.versionId)
  const model = productModels.value.find(item => item.modelId === form.modelId)

  const defaults = props.config?.environment?.certificateDefaults || {}

  return {
    testNo: randomUUID(),
    licenseNo: machine.licenseNo,
    customerId: form.customerId || defaults.customerId || 1,
    customerName: form.customerName,
    customerShort: form.customerShort,
    productId: product?.productId || '',
    productName: product?.productName || '',
    versionId: version?.versionId || '',
    versionName: version?.versionNo || '',
    certVersion: version?.certVersion || defaults.certVersion || '',
    modelId: model?.modelId || '',
    modelName: model?.modelName || '',
    shipmentModel: model?.modelMapping || model?.modelName || '',
    isNeutral: defaults.isNeutral || '0',
    hasSysinfoMenu: defaults.hasSysinfoMenu || '0',
    isClusterLicense: defaults.isClusterLicense || '0',
    maintenanceExpiry: form.maintenanceExpiry,
    authType: defaults.authType || '1',
    totalCount: machines.length,
    effectDate: form.effectDate,
    expiryDate: form.expiryDate,
    authDays: Number(form.authDays),
    authModuleIdList: form.authModuleIdList,
    machineCode: machines.map(item => item.machineCode).join(','),
    authModuleIds: form.authModuleIdList.join(','),
    perfConfig: model?.performanceConfig || '{}',
    machineCodeList: machines.map(item => item.machineCode),
    certNoList: machines.map(item => item.licenseNo),
  }
}

// 提取证书ID列表
function extractLicenseIds(data: any): string[] {
  const value = data?.data !== undefined ? data.data : data
  if (!value)
    return []

  if (Array.isArray(value))
    return value.map(item => (typeof item === 'object' ? item.licenseId : item)).filter(Boolean)

  if (Array.isArray(value.licenseIdList))
    return value.licenseIdList.filter(Boolean)

  if (Array.isArray(value.licenseIds))
    return value.licenseIds.filter(Boolean)

  if (typeof value.licenseIds === 'string')
    return value.licenseIds.split(',').map(item => item.trim()).filter(Boolean)

  const records = value.rows || value.list || value.licenseList
  if (Array.isArray(records))
    return records.map(item => (typeof item === 'object' ? item.licenseId : item)).filter(Boolean)

  return value.licenseId ? [value.licenseId] : []
}

// 创建证书
async function createLicenses(autoMake: boolean) {
  if (!fileList.value.length) {
    Message.warning('请选择机器码文件')
    return
  }

  if (autoMake)
    applyAndMakeLoading.value = true
  else
    applyLoading.value = true

  try {
    // 读取所有机器码文件
    const machines = await Promise.all(
      fileList.value.map(item => readMachineCode(item.file as File)),
    )

    // 构建提交数据
    const payload = createPayload(machines)

    // 批量申请证书
    const response = await axios.post(buildUrl(props.config.environment.batchApplications), payload, {
      headers: { ...headers(), 'Content-Type': 'application/json' },
    })

    if (response.data.code !== 200)
      throw new Error(response.data.msg || '证书申请失败')

    const licenseIds = extractLicenseIds(response.data)

    // 如果是一键制作，需要提交审核和审批
    if (autoMake) {
      if (!licenseIds.length)
        throw new Error('批量申请成功，但未返回证书 ID')

      // 提交审核
      for (const licenseId of licenseIds) {
        await axios.put(buildUrl(props.config.environment.submit), { licenseId }, {
          headers: { ...headers(), 'Content-Type': 'application/json' },
        })
      }

      // 审批通过
      for (const licenseId of licenseIds) {
        await axios.put(buildUrl(props.config.environment.approve), { licenseId }, {
          headers: { ...headers(), 'Content-Type': 'application/json' },
        })
      }

      Message.success('一键制作成功，证书已完成审批')
      emit('save-success', licenseIds)
    }
    else {
      Message.success('添加证书申请成功')
      emit('save-success')
    }

    visible.value = false
  }
  catch (error: any) {
    Message.error(error.message || '证书申请失败')
  }
  finally {
    if (autoMake)
      applyAndMakeLoading.value = false
    else
      applyLoading.value = false
  }
}

// 立即申请
const handleApply = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (!valid)
      await createLicenses(false)
  }
  catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 一键制作
const handleApplyAndMake = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (!valid)
      await createLicenses(true)
  }
  catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
}

// 重置表单
const reset = () => {
  applyLoading.value = false
  applyAndMakeLoading.value = false
  formRef.value?.resetFields()
  fileList.value = []
  productVersions.value = []
  productModels.value = []
  productModules.value = []

  form.productId = undefined
  form.versionId = undefined
  form.modelId = undefined
  form.customerId = 1
  form.customerName = '昂楷科技内部测试'
  form.customerShort = 'ANKKI'
  form.authModuleIdList = []
  form.effectDate = dayjs().format('YYYY-MM-DD 00:00:00')
  form.expiryDate = dayjs().add(7, 'day').format('YYYY-MM-DD 23:59:59')
  form.maintenanceExpiry = dayjs().add(7, 'day').format('YYYY-MM-DD 23:59:59')
  form.authDays = 7
  form.totalCount = 1
  form.machineCodeFiles = []
}

// 打开弹窗
const onOpen = () => {
  visible.value = true
}

defineExpose({ onOpen })
</script>

<style scoped lang="scss">
.upload-trigger {
  width: 100%;
  padding: 40px 0;
  text-align: center;
  border: 1px dashed var(--color-border-2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: rgb(var(--primary-6));
  }

  .arco-icon {
    font-size: 48px;
    color: var(--color-text-3);
  }

  .upload-text {
    margin-top: 12px;
    color: var(--color-text-2);
    font-size: 14px;

    .upload-link {
      color: rgb(var(--primary-6));
    }
  }

  .upload-tip {
    margin-top: 8px;
    color: var(--color-text-3);
    font-size: 12px;
  }
}
:deep(.arco-upload-list-item){
  margin: 8px !important;
}
</style>
