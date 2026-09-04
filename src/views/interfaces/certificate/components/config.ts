/**
 * 证书状态枚举
 */
export enum CertificateStatus {
  /** 待提交 */
  PENDING = '0',
  /** 待审批 */
  REVIEWING = '1',
  /** 已通过 */
  APPROVED = '2',
  /** 已驳回 */
  REJECTED = '3',
}

/**
 * 证书状态选项
 */
export const certificateStatusOptions = [
  { label: '待提交', value: '0' },
  { label: '待审批', value: '1' },
  { label: '已通过', value: '2' },
  { label: '已驳回', value: '3' },
]

/**
 * 获取证书状态文本
 */
export function getCertificateStatus(status: string | number): string {
  const item = certificateStatusOptions.find(option => String(option.value) === String(status))
  return item ? item.label : '未知状态'
}

/**
 * 获取证书状态颜色
 */
export function getCertificateStatusColor(status: string | number): string {
  switch (String(status)) {
    case '0':
      return 'gray'
    case '1':
      return 'blue'
    case '2':
      return 'green'
    case '3':
      return 'red'
    default:
      return 'gray'
  }
}
