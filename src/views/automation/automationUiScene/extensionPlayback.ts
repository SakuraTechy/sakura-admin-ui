import { getToken } from '@/utils/auth'

const buildExtensionApiBase = () => {
  const prefix = import.meta.env.VITE_API_PREFIX || ''
  if (import.meta.env.DEV && prefix.startsWith('/')) return `${window.location.origin.replace(/\/$/, '')}${prefix}`
  const backendBase = import.meta.env.VITE_API_BASE_URL || ''
  if (/^https?:\/\//i.test(backendBase)) return backendBase.replace(/\/$/, '')
  if (/^https?:\/\//i.test(prefix)) return prefix.replace(/\/$/, '')
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
      } else if (type !== 'AT_PLATFORM_PING' && data.type === 'AT_PLATFORM_ACK' && data.original === type) {
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

export interface ExtensionCdpPlaybackOptions {
  caseKey: string
  caseId: string
  batchId: string
  executionCapability?: string
  executionId: string
  projectEnvironmentId: string
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
    dataSource: 'admin',
    executionSource: 'extension-cdp',
    locale: 'zh',
  }, 8000)
  if (response?.ok === false) throw new Error(response.error || '扩展 CDP 回放启动失败')
  return response
}

export const stopExtensionCdpPlayback = async () => {
  const response = await waitForExtensionAck('AT_PLATFORM_STOP_PLAYBACK', {}, 6000)
  if (response?.ok === false) throw new Error(response.error || '停止扩展 CDP 回放失败')
  return response
}
