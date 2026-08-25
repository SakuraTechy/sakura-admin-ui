import { getToken } from '@/utils/auth'
import type { AutomationCdpPlaybackOptions } from '@/apis/automation/automationPlaywrightRunner'

const buildExtensionApiBase = () => {
  const prefix = import.meta.env.VITE_API_PREFIX || ''
  if (import.meta.env.DEV && prefix.startsWith('/')) return `${window.location.origin.replace(/\/$/, '')}${prefix}`
  const backendBase = import.meta.env.VITE_API_BASE_URL || ''
  if (/^https?:\/\//i.test(backendBase)) return backendBase.replace(/\/$/, '')
  if (/^https?:\/\//i.test(prefix)) return prefix.replace(/\/$/, '')
  if (backendBase.startsWith('/')) {
    // 生产环境由 Nginx 通过 /api 转发后端；扩展请求不能丢失此前缀。
    return `${window.location.origin.replace(/\/$/, '')}${backendBase}`.replace(/\/$/, '')
  }
  if (prefix.startsWith('/')) {
    return `${window.location.origin.replace(/\/$/, '')}${prefix}`.replace(/\/$/, '')
  }
  return window.location.origin.replace(/\/$/, '')
}

const waitForExtensionAck = (type: string, payload: Record<string, unknown>, timeoutMs = 6000) => {
  return new Promise<any>((resolve, reject) => {
    const nonce = `${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('未检测到 CueCast Chrome 扩展，请确认扩展已安装并刷新当前页面'))
    }, timeoutMs)

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return
      const data = event.data || {}
      if (type === 'AT_PLATFORM_PING' && data.type === 'AT_PLATFORM_PONG' && data.nonce === nonce) {
        cleanup()
        resolve(data)
      } else if (type !== 'AT_PLATFORM_PING'
        && data.type === 'AT_PLATFORM_ACK'
        && data.original === type
        && (!data.nonce || data.nonce === nonce)) {
        cleanup()
        resolve(data.response)
      }
    }

    function cleanup() {
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }

    window.addEventListener('message', onMessage)
    window.postMessage({ ...payload, type, nonce }, '*')
  })
}

const extensionPlaybackError = (response: any, fallback: string) => {
  const error = new Error(response?.error || fallback) as Error & { code?: string }
  if (response?.errorCode) error.code = String(response.errorCode)
  return error
}

export interface ExtensionCdpPlaybackOptions {
  caseKey: string
  caseId: string
  batchId: string
  executionCapability?: string
  executionId: string
  projectEnvironmentId: string
  sessionMode: AutomationCdpPlaybackOptions['sessionMode']
  browserSessionSource: AutomationCdpPlaybackOptions['browserSessionSource']
}

export interface ExtensionCdpCapabilities {
  managedBrowserContext: boolean
  managedSessionStrategy?: string
  supportedSessionModes: string[]
  reason?: string
  errorCode?: string
}

export const getExtensionCdpCapabilities = async (): Promise<ExtensionCdpCapabilities> => {
  // 隔离探测会顺序创建并销毁两个无痕会话，慢环境下必须覆盖两次页面加载。
  const response = await waitForExtensionAck('AT_PLATFORM_CDP_CAPABILITIES', {}, 25000)
  const managedBrowserContext = response?.managedBrowserContext === true
  return {
    managedBrowserContext,
    managedSessionStrategy: response?.managedSessionStrategy
      ? String(response.managedSessionStrategy)
      : undefined,
    supportedSessionModes: Array.isArray(response?.supportedSessionModes)
      ? response.supportedSessionModes.map(String)
      : [],
    reason: response?.reason
      || response?.error
      || (managedBrowserContext ? '' : 'CueCast 未通过受控用例会话能力探测'),
    errorCode: response?.errorCode ? String(response.errorCode) : undefined,
  }
}

export const beginExtensionCdpBatch = async (options: {
  batchId: string
  sessionMode: AutomationCdpPlaybackOptions['sessionMode']
  browserSessionSource: AutomationCdpPlaybackOptions['browserSessionSource']
  executionCapability?: string
}) => {
  const response = await waitForExtensionAck('AT_PLATFORM_BEGIN_PLAYBACK_BATCH', options, 12000)
  if (response?.ok === false) throw extensionPlaybackError(response, '扩展 CDP 批次会话启动失败')
  return response
}

export const endExtensionCdpBatch = async (
  batchId: string,
  browserSessionSource: AutomationCdpPlaybackOptions['browserSessionSource'],
  executionCapability?: string,
) => {
  const response = await waitForExtensionAck('AT_PLATFORM_END_PLAYBACK_BATCH', {
    batchId,
    browserSessionSource,
    executionCapability,
  }, 30000)
  if (response?.ok === false) throw extensionPlaybackError(response, '扩展 CDP 批次会话清理失败')
  return response
}

export const abortExtensionCdpBatch = async (
  batchId: string,
  browserSessionSource: AutomationCdpPlaybackOptions['browserSessionSource'],
  executionCapability?: string,
) => {
  const response = await waitForExtensionAck('AT_PLATFORM_ABORT_PLAYBACK_BATCH', {
    batchId,
    browserSessionSource,
    executionCapability,
  }, 30000)
  if (response?.ok === false) throw extensionPlaybackError(response, '扩展 CDP 批次会话中止失败')
  return response
}

export const startExtensionCdpPlayback = async (options: ExtensionCdpPlaybackOptions) => {
  const { caseKey, caseId, projectEnvironmentId } = options
  const pong = await waitForExtensionAck('AT_PLATFORM_PING', {}, 3000)
  if (pong?.ok === false) throw new Error('CueCast Chrome 扩展当前不可用')

  const authToken = getToken() || ''
  if (authToken) localStorage.setItem('cc_auth_token', authToken)
  else localStorage.removeItem('cc_auth_token')
  const response = await waitForExtensionAck('AT_PLATFORM_PLAY', {
    apiBase: buildExtensionApiBase(),
    authToken,
    testCaseId: caseId,
    adminCaseKey: caseKey,
    batchId: options.batchId,
    executionCapability: options.executionCapability,
    executionId: options.executionId,
    projectEnvironmentId,
    sessionMode: options.sessionMode,
    browserSessionSource: options.browserSessionSource,
    dataSource: 'admin',
    executionSource: 'extension-cdp',
    locale: 'zh',
  }, 8000)
  if (response?.ok === false) throw extensionPlaybackError(response, '扩展 CDP 回放启动失败')
  return response
}

export const stopExtensionCdpPlayback = async () => {
  const response = await waitForExtensionAck('AT_PLATFORM_STOP_PLAYBACK', {}, 6000)
  if (response?.ok === false) throw extensionPlaybackError(response, '停止扩展 CDP 回放失败')
  return response
}
