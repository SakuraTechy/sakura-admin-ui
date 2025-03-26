/**
 * 在服务中使用配置的示例
 *
 * 这个示例展示了如何在API服务中使用配置信息
 */

import type { AxiosInstance, AxiosResponse } from 'axios'
import axios, { AxiosRequestConfig } from 'axios'
import { getConfigValue } from '@/utils/config'

/**
 * 创建基于配置的axios实例
 */
const createApiClient = (): AxiosInstance => {
  // 从配置中获取API相关设置
  const baseURL = getConfigValue('api.baseUrl', '')
  const timeout = getConfigValue('api.timeout', 5000)
  const apiKey = getConfigValue('api.key', '')

  // 创建axios实例
  const apiClient = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  })

  // 响应拦截器 - 提取数据
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response.data,
    (error) => Promise.reject(error),
  )

  return apiClient
}

// 导出API客户端单例
export const apiClient = createApiClient()

// 用户API服务
export const userService = {
  /**
   * 获取用户列表
   */
  async getUsers(params?: Record<string, any>) {
    return apiClient.get('/users', { params })
  },

  /**
   * 获取用户详情
   */
  async getUserById(id: string) {
    return apiClient.get(`/users/${id}`)
  },

  /**
   * 创建用户
   */
  async createUser(userData: Record<string, any>) {
    return apiClient.post('/users', userData)
  },

  /**
   * 更新用户
   */
  async updateUser(id: string, userData: Record<string, any>) {
    return apiClient.put(`/users/${id}`, userData)
  },

  /**
   * 删除用户
   */
  async deleteUser(id: string) {
    return apiClient.delete(`/users/${id}`)
  },
}

// Gitee API服务示例
export const giteeService = {
  /**
   * 获取组织事件
   */
  async getOrgEvents(org: string, accessToken: string) {
    // 动态获取Gitee baseURL配置
    const baseURL = getConfigValue('gitee.baseURL', 'https://gitee.com')

    return apiClient.get(`${baseURL}/api/v5/orgs/${org}/events`, {
      params: { access_token: accessToken, page: 1, limit: 100 },
    })
  },

  /**
   * 获取访问令牌
   */
  async getAccessToken(username: string, password: string) {
    const baseURL = getConfigValue('gitee.baseURL', 'https://gitee.com')
    const clientId = getConfigValue('gitee.client_id', '')
    const clientSecret = getConfigValue('gitee.client_secret', '')

    return axios.post(`${baseURL}/oauth/token`, {
      grant_type: 'password',
      username,
      password,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'user_info pull_requests issues notes',
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
}

// 使用示例
/*
import { userService, giteeService } from './ApiService'

// 获取用户列表
async function fetchUsers() {
  try {
    const users = await userService.getUsers()
    console.log('Users:', users)
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

// 获取Gitee事件
async function fetchGiteeEvents() {
  try {
    // 先获取访问令牌
    const tokenResponse = await giteeService.getAccessToken('your-username', 'your-password')
    const accessToken = tokenResponse.data.access_token

    // 使用令牌获取组织事件
    const events = await giteeService.getOrgEvents('YourOrg', accessToken)
    console.log('Gitee Events:', events)
  } catch (error) {
    console.error('Failed to fetch Gitee events:', error)
  }
}
*/
