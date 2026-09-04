import type {
  CertificateDetailResp,
  CertificatePageQuery,
  CertificateQuery,
  CertificateResp,
} from '@/types/interfaces/certificate'
import http from '@/utils/http'

const BASE_URL = '/interfaces/certificate'

/** @desc 分页查询证书列表 */
export function listCertificate(query?: CertificatePageQuery) {
  return http.get<PageRes<CertificateResp[]>>(BASE_URL, query)
}

/** @desc 全部查询证书列表 */
export function getCertificateList(query?: CertificateQuery) {
  return http.get<CertificateResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 查询证书详情 */
export function getCertificate(id: string) {
  return http.get<CertificateDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增证书申请 */
export function addCertificate(data: any) {
  return http.post(BASE_URL, data)
}

/** @desc 批量申请证书 */
export function batchApplications(data: any) {
  return http.post(`${BASE_URL}/batchApplications`, data)
}

/** @desc 提交审核 */
export function submitCertificate(licenseId: string) {
  return http.put(`${BASE_URL}/submit`, { licenseId })
}

/** @desc 批量提交审核 */
export function batchSubmitCertificate(licenseIds: string[]) {
  return http.post(`${BASE_URL}/batchSubmit`, { licenseIds })
}

/** @desc 审批通过 */
export function approveCertificate(licenseId: string) {
  return http.put(`${BASE_URL}/approve`, { licenseId })
}

/** @desc 批量审批 */
export function batchApproveCertificate(licenseIds: string[]) {
  return http.post(`${BASE_URL}/batchApprove`, { licenseIds })
}

/** @desc 下载证书 */
export function downloadCertificate(licenseId: string) {
  return http.download(`${BASE_URL}/download/${licenseId}`)
}

/** @desc 删除证书 */
export function deleteCertificate(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出证书列表 */
export function exportCertificate(query: CertificateQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

/** @desc 查询产品列表 - 已废弃，请在组件中直接使用 axios 调用证书系统 */
export function getProductList() {
  return http.get<any[]>('/product/list', { pageNum: 1, pageSize: 9999 })
}

/** @desc 查询产品版本列表 - 已废弃，请在组件中直接使用 axios 调用证书系统 */
export function getProductVersionList(productId: string) {
  return http.get<any[]>('/product/versions', { productId, pageNum: 1, pageSize: 9999 })
}

/** @desc 查询产品型号列表 - 已废弃，请在组件中直接使用 axios 调用证书系统 */
export function getProductTypeList(productId: string, versionId: string) {
  return http.get<any[]>('/product/types', { productId, versionId, status: 0 })
}

/** @desc 查询产品模块列表 - 已废弃，请在组件中直接使用 axios 调用证书系统 */
export function getProductModuleList(productId: string, versionId: string) {
  return http.get<any[]>(`/product/modules/${productId}/${versionId}`)
}
