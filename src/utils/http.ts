import axios from 'axios'
import qs from 'query-string'
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useUserStore } from '@/stores'
import { getToken } from '@/utils/auth'
import modalErrorWrapper from '@/utils/modal-error-wrapper'
import messageErrorWrapper from '@/utils/message-error-wrapper'
import notificationErrorWrapper from '@/utils/notification-error-wrapper'
import router from '@/router'

export type SilentAxiosRequestConfig = AxiosRequestConfig & {
  /** 轮询和可回退的资源请求由业务组件展示局部状态，避免全局重复提示。 */
  silentError?: boolean
  /** 新分层查询接口直接返回 DTO，由调用方显式声明后跳过旧 R 包装校验。 */
  rawResponse?: boolean
}

interface ICodeMessage {
  [propName: number]: string
}

const StatusCodeMessage: ICodeMessage = {
  200: '服务器成功返回请求的数据',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）',
  204: '删除数据成功',
  400: '请求错误(400)',
  401: '未授权，请重新登录(401)',
  403: '拒绝访问(403)',
  404: '请求出错(404)',
  408: '请求超时(408)',
  500: '服务器错误(500)',
  501: '服务未实现(501)',
  502: '网络错误(502)',
  503: '服务不可用(503)',
  504: '网络超时(504)',
}

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_PREFIX ?? import.meta.env.VITE_API_BASE_URL,
  timeout: 30 * 1000,
})

const normalizeErrorMessage = (msg: unknown) => {
  if (typeof msg === 'string' && msg.trim()) return msg.trim()
  if (msg instanceof Error && msg.message.trim()) return msg.message.trim()
  return '服务器端错误'
}

const handleError = (msg: unknown) => {
  const message = normalizeErrorMessage(msg)
  if (message.length >= 15) {
    return notificationErrorWrapper({
      content: message,
      duration: 5 * 1000,
    })
  }
  return messageErrorWrapper({
    content: message,
    duration: 5 * 1000,
  })
}

const shouldHandleError = (config?: SilentAxiosRequestConfig) => config?.silentError !== true

const handleBlobResponse = async (response: AxiosResponse): Promise<AxiosResponse> => {
  const { data } = response
  if (!(data instanceof Blob)) return response

  // JSON 结果附件也是正常下载内容，不能按通用 API 错误包解析。
  const contentDisposition = String(response.headers?.['content-disposition'] || '')
  if (contentDisposition) return response

  const contentType = String(data.type || response.headers?.['content-type'] || '').toLowerCase()
  if (!contentType.includes('application/json')) return response

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(await data.text()) as Record<string, unknown>
  } catch {
    return response
  }
  if (payload.success !== false) return response

  const message = normalizeErrorMessage(payload.msg || payload.message || payload.error)
  if (shouldHandleError(response.config)) handleError(message)
  return Promise.reject(new Error(message))
}

// 请求拦截器
http.interceptors.request.use(
  (config: SilentAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      if (!config.headers) {
        config.headers = {}
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器
http.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    if (response.config.responseType === 'blob') return handleBlobResponse(response)
    if ((response.config as SilentAxiosRequestConfig).rawResponse) return response

    const { success, code, msg } = data

    if (success) {
      return response
    }

    // Token 失效
    if (code === '401' && response.config.url !== '/auth/user/info') {
      modalErrorWrapper({
        title: '提示',
        content: msg,
        maskClosable: false,
        escToClose: false,
        okText: '重新登录',
        async onOk() {
          const userStore = useUserStore()
          await userStore.logoutCallBack()
          await router.replace('/login')
        },
      })
    } else {
      if (shouldHandleError(response.config)) handleError(msg)
    }
    return Promise.reject(new Error(msg || '服务器端错误'))
  },
  (error: AxiosError) => {
    const config = error.config as SilentAxiosRequestConfig | undefined
    if (error.code === AxiosError.ERR_CANCELED) return Promise.reject(error)
    if (!error.response) {
      const message = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED'
        ? '请求超时，请稍后重试'
        : navigator.onLine === false
          ? '无法连接服务，请检查服务状态和网络'
          : '无法连接服务，请检查服务状态和网络'
      if (shouldHandleError(config)) handleError(message)
      return Promise.reject(error)
    }
    const status = error.response?.status
    const errorMsg = status === 401
      ? '登录已失效，请重新登录'
      : StatusCodeMessage[status] || '服务器暂时未响应，请刷新页面并重试。若无法解决，请联系管理员'
    if (shouldHandleError(config)) handleError(errorMsg)
    return Promise.reject(error)
  },
)

const request = async <T = unknown>(config: SilentAxiosRequestConfig): Promise<ApiRes<T>> => {
  return http.request<T>(config)
    .then((res: AxiosResponse) => res.data)
    .catch((err: { msg: string }) => Promise.reject(err))
}

const requestNative = async <T = unknown>(config: SilentAxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return http.request<T>(config)
    .then((res: AxiosResponse<T>) => res)
    .catch((err: { msg: string }) => Promise.reject(err))
}

const createRequest = (method: string) => {
  return <T = any>(url: string, params?: object, config?: SilentAxiosRequestConfig): Promise<ApiRes<T>> => {
    return request({
      method,
      url,
      [method === 'get' ? 'params' : 'data']: params,
      ...(method === 'get'
        ? {
            paramsSerializer: (obj) => qs.stringify(obj),
          }
        : {}),
      ...config,
    })
  }
}

const download = (url: string, params?: object, config?: SilentAxiosRequestConfig): Promise<AxiosResponse> => {
  return requestNative({
    method: 'get',
    url,
    responseType: 'blob',
    params,
    paramsSerializer: (obj) => qs.stringify(obj),
    ...config,
  })
}

export default {
  get: createRequest('get'),
  post: createRequest('post'),
  put: createRequest('put'),
  patch: createRequest('patch'),
  del: createRequest('delete'),
  request,
  requestNative,
  download,
}
