import {
  AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT,
  type AutomationUiExecutionArtifact,
  getAutomationUiExecutionArtifacts,
} from './automationUiQuery'
import { getToken } from '@/utils/auth'

/** 完整翻页后按用例归属过滤，不能用批次中的第一份产物代替当前用例。 */
export async function getExecutionCaseArtifacts(executionDbId: string | number, caseExecutionDbId: string | number, signal?: AbortSignal) {
  const artifacts: AutomationUiExecutionArtifact[] = []
  const size = AUTOMATION_UI_EXECUTION_CHILD_PAGE_SIZE_LIMIT
  let seen = 0
  for (let page = 1; ; page += 1) {
    const { data } = await getAutomationUiExecutionArtifacts(executionDbId, page, size, signal)
    const items = data?.list || []
    artifacts.push(...items.filter((item) => String(item.caseExecutionDbId ?? '') === String(caseExecutionDbId)))
    seen += items.length
    if (!items.length || (data?.total != null ? seen >= data.total : items.length < size)) return artifacts
  }
}

export function resolveExecutionArtifactUrl(value: string) {
  const base = String(import.meta.env.VITE_API_PREFIX ?? import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const api = new URL(base || '/', window.location.origin)
  const path = value.startsWith('/') ? value : `/${value}`
  const resolved = /^https?:\/\//i.test(value)
    ? new URL(value)
    : new URL(!base || path.startsWith(`${base}/`) ? path : `${base}${path}`, window.location.origin)
  if (!/^https?:$/.test(resolved.protocol) || resolved.username || resolved.password || /^\/\//.test(value)
    || (/^[a-z][\w+.-]*:/i.test(value) && !/^https?:\/\//i.test(value))) {
    throw new Error('执行产物地址无效，仅允许 HTTP(S) 文件地址')
  }
  return { url: resolved.href, authenticated: resolved.origin === api.origin }
}

/** 文件通过鉴权读取，Token 不进入 URL，也不发送到外部存储或 Trace Viewer。 */
export async function getExecutionArtifactBlob(value: string, signal?: AbortSignal) {
  const target = resolveExecutionArtifactUrl(value)
  const token = target.authenticated ? getToken() : ''
  const response = await fetch(target.url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: target.authenticated ? 'same-origin' : 'omit',
    redirect: 'error',
    signal,
  })
  if (!response.ok) throw new Error(`读取产物失败（HTTP ${response.status}），请检查权限或文件是否已过期`)
  const blob = await response.blob()
  if (!blob.size) throw new Error('执行产物为空，请检查上传结果')
  const preview = await blob.slice(0, 1024).text()
  if (blob.type.includes('json') || preview.trimStart().startsWith('{')) {
    let payload: { msg?: string, message?: string } = {}
    try {
      payload = JSON.parse(await blob.text())
    } catch { /* 错误响应不能作为产物预览。 */ }
    throw new Error(payload.msg || payload.message || '读取产物失败：服务端返回了 JSON，而不是文件')
  }
  return blob
}
