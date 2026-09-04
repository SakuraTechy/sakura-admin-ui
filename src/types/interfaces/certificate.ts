/**
 * 证书管理相关类型定义
 */

import type { FileItem } from '@arco-design/web-vue'

// ==================== 证书相关 ====================

/**
 * 证书响应数据
 */
export interface CertificateResp {
  /** 证书ID */
  licenseId: string
  /** 证书编号 */
  licenseNo: string
  /** 机器码 */
  machineCode: string
  /** 机器码文件路径 */
  licenseFile?: string
  /** 产品ID */
  productId: string
  /** 产品名称 */
  productName: string
  /** 版本ID */
  versionId: string
  /** 版本名称 */
  versionName: string
  /** 型号ID */
  modelId: string
  /** 型号名称 */
  modelName: string
  /** 客户ID */
  customerId: number
  /** 客户名称 */
  customerName: string
  /** 客户简称 */
  customerShort: string
  /** 授权模块ID列表 */
  authModuleIdList?: number[] | null
  /** 授权生效时间 */
  effectDate: string
  /** 授权结束时间 */
  expiryDate: string
  /** 维保结束时间 */
  maintenanceExpiry: string
  /** 授权天数 */
  authDays: number
  /** 状态 0-待提交 1-待审批 2-已通过 3-已驳回 */
  status: string
  /** 申请人 */
  createBy: string
  /** 提交人 */
  submitByName?: string
  /** 审批人 */
  auditByName?: string
  /** 测试单号 */
  testNo?: string
  /** 申请时间 */
  createTime: string
  /** 更新时间 */
  updateTime?: string
  /** 订单编号 */
  orderNo?: string
  /** 提交人账号 */
  submitBy?: string
  /** 提交时间 */
  submitTime?: string
  /** 审批人账号 */
  auditBy?: string
  /** 审批时间 */
  auditTime?: string
  /** 审批意见 */
  auditComment?: string
  /** OEM ID */
  oemId?: number
  /** OEM 名称 */
  oemName?: string
  /** 产品系列 ID */
  seriesId?: number
  /** 产品系列名称 */
  seriesName?: string
  /** 授权模块 ID 字符串 */
  authModuleIds?: string
  /** 机器码列表 */
  machineCodeList?: string[] | null
  /** 证书编号列表 */
  certNoList?: string[] | null
  /** 证书文件内容 */
  licenseContent?: string
  /** 删除标记 */
  delFlag?: string
  /** 已生成证书数量 */
  licenseCount?: number
  /** 出货型号 */
  shipmentModel?: string
  /** 出货型号映射 */
  modelMapping?: string
  /** 证书数量 */
  totalCount?: number
  /** 授权模块名称列表 */
  authModuleNameList?: string[]
  /** 授权模块对象或名称列表 */
  authModuleList?: Array<string | number | Record<string, any>>
}

/**
 * 证书详情响应
 */
export interface CertificateDetailResp extends CertificateResp {
  /** 证书版本 */
  certVersion?: string
  /** 是否中性版本 */
  isNeutral?: string
  /** 是否有系统信息菜单 */
  hasSysinfoMenu?: string
  /** 是否集群证书 */
  isClusterLicense?: string
  /** 授权类型 */
  authType?: string
  /** 性能配置 */
  perfConfig?: string
  /** 备注 */
  remark?: string
}

/**
 * 证书查询参数
 */
export interface CertificateQuery {
  /** 产品ID */
  productId?: string
  /** 版本ID */
  versionId?: string
  /** 证书编号 */
  licenseNo?: string
  /** 状态 */
  status?: string
  /** 申请人 */
  createBy?: string
  /** 提交人 */
  submitByName?: string
  /** 申请开始时间 */
  createStartTime?: string
  /** 申请结束时间 */
  createEndTime?: string
}

/**
 * 证书分页查询参数
 */
export interface CertificatePageQuery extends CertificateQuery, PageQuery {}

/**
 * 证书申请表单
 */
export interface CertificateForm {
  /** 产品ID */
  productId?: string
  /** 版本ID */
  versionId?: string
  /** 型号ID */
  modelId?: string
  /** 客户ID */
  customerId: number
  /** 客户名称 */
  customerName: string
  /** 客户简称 */
  customerShort: string
  /** 授权模块ID列表 */
  authModuleIdList: number[]
  /** 授权生效时间 */
  effectDate: string
  /** 授权结束时间 */
  expiryDate: string
  /** 维保结束时间 */
  maintenanceExpiry: string
  /** 授权天数 */
  authDays: number
  /** 总数量 */
  totalCount: number
  /** 机器码文件列表 */
  machineCodeFiles: FileItem[]
}

// ==================== 产品相关 ====================

/**
 * 产品选项
 */
export interface ProductOption {
  productId: string
  productName: string
  productDesc?: string
}

/**
 * 产品版本选项
 */
export interface ProductVersionOption {
  versionId: string
  versionNo: string
  certVersion?: string
}

/**
 * 产品型号选项
 */
export interface ProductModelOption {
  modelId: string
  modelName: string
  modelMapping?: string
  moduleIds?: number[]
  performanceConfig?: string
}

/**
 * 产品模块选项
 */
export interface ProductModuleOption {
  moduleId: number
  moduleName: string
}

// ==================== 配置相关 ====================

/**
 * 证书系统配置
 */
export interface CertificateConfig {
  /** 环境配置 */
  environment: {
    /** 系统URL */
    url: string
    /** 开发环境URL */
    devUrl?: string
    /** 登录接口 */
    login: string
    /** 用户名 */
    username: string
    /** 密码 */
    password: string
    /** 产品列表接口 */
    products: string
    /** 产品版本接口 */
    productVersions: string
    /** 产品型号接口 */
    productTypes: string
    /** 产品模块接口 */
    productModules: string
    /** 证书列表接口 */
    makes: string
    /** 证书详情接口 */
    detail?: string
    /** 批量申请接口 */
    batchApplications: string
    /** 提交审核接口 */
    submit: string
    /** 审批接口 */
    approve: string
    /** 下载接口 */
    download: string
    /** 证书默认配置 */
    certificateDefaults?: {
      customerId?: number
      customerName?: string
      customerShort?: string
      certVersion?: string
      isNeutral?: string
      hasSysinfoMenu?: string
      isClusterLicense?: string
      authType?: string
    }
  }
  /** 产品特殊配置 */
  [productName: string]: any
}

/**
 * 机器码信息
 */
export interface MachineCodeInfo {
  /** 机器码 */
  machineCode: string
  /** 证书编号 */
  licenseNo: string
}

/**
 * 批量申请参数
 */
export interface BatchApplicationPayload {
  /** 测试单号 */
  testNo: string
  licenseNo: string
  customerId: number
  customerName: string
  customerShort: string
  productId: string
  productName: string
  versionId: string
  versionName: string
  certVersion: string
  modelId: string
  modelName: string
  shipmentModel: string
  isNeutral: string
  hasSysinfoMenu: string
  isClusterLicense: string
  maintenanceExpiry: string
  authType: string
  totalCount: number
  effectDate: string
  expiryDate: string
  authDays: number
  authModuleIdList: number[]
  machineCode: string
  authModuleIds: string
  perfConfig: string
  machineCodeList: string[]
  certNoList: string[]
}
