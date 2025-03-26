/**
 * 配置相关的组合式函数
 *
 * 这个文件提供了一组可重用的组合式函数(Composables)，用于在组件中使用配置
 */

import { computed, onMounted, readonly, ref, watchEffect } from 'vue'
import { getConfig, getConfigValue } from '../utils/config'

/**
 * 使用配置钩子，提供响应式的配置访问
 * @returns 包含配置相关方法和状态的对象
 */
export function useConfig() {
  // 存储整个配置的响应式引用
  const config = ref(getConfig())

  // 表示配置是否已加载
  const isLoaded = computed(() => Object.keys(config.value).length > 0)

  // 刷新配置的方法
  function refreshConfig() {
    config.value = getConfig()
  }

  // 获取嵌套配置值的方法
  function getValue<T>(path: string, defaultValue: T): T {
    return getConfigValue(path, defaultValue)
  }

  // 仅暴露只读版本的config
  const safeConfig = readonly(config)

  // 在组件挂载时刷新配置
  onMounted(() => {
    refreshConfig()
  })

  return {
    config: safeConfig,
    isLoaded,
    refreshConfig,
    getValue,
  }
}

/**
 * 使用API配置的钩子
 * @returns API配置相关的状态和方法
 */
export function useApiConfig() {
  const { config, getValue } = useConfig()

  // 获取API相关配置
  const baseUrl = computed(() => getValue('api.baseUrl', ''))
  const timeout = computed(() => getValue('api.timeout', 5000))
  const apiKey = computed(() => getValue('api.key', ''))

  // 检查API配置是否有效
  const isValid = computed(() => !!baseUrl.value)

  return {
    baseUrl,
    timeout,
    apiKey,
    isValid,
    apiConfig: computed(() => config.value.api),
  }
}

/**
 * 使用Gitee配置的钩子
 * @returns Gitee配置相关的状态和方法
 */
export function useGiteeConfig() {
  const { config, getValue } = useConfig()

  // 获取Gitee相关配置
  const baseURL = computed(() => getValue('gitee.baseURL', 'https://gitee.com'))
  const username = computed(() => getValue('gitee.username', ''))
  const clientId = computed(() => getValue('gitee.client_id', ''))
  const clientSecret = computed(() => getValue('gitee.client_secret', ''))
  const scope = computed(() => getValue('gitee.scope', 'user_info pull_requests issues notes'))

  // 检查Gitee配置是否包含必要的认证信息
  const hasAuthInfo = computed(() => !!clientId.value && !!clientSecret.value)

  return {
    baseURL,
    username,
    clientId,
    clientSecret,
    scope,
    hasAuthInfo,
    giteeConfig: computed(() => config.value.gitee),
  }
}

/**
 * 使用环境配置的钩子
 * @returns 环境配置相关的状态和方法
 */
export function useEnvConfig() {
  const { getValue } = useConfig()

  // 获取环境配置
  const env = computed(() => getValue('env', 'development'))
  const isProduction = computed(() => env.value === 'production')
  const isTest = computed(() => env.value === 'test')
  const isDevelopment = computed(() => env.value === 'development')

  // 获取功能开关
  const debugEnabled = computed(() => getValue('features.debug', false))
  const analyticsEnabled = computed(() => getValue('features.analytics', false))

  return {
    env,
    isProduction,
    isTest,
    isDevelopment,
    debugEnabled,
    analyticsEnabled,
  }
}

/**
 * 使用示例：
 *
 * 在组件中：
 *
 * ```ts
 * import { useApiConfig, useGiteeConfig, useEnvConfig } from '@/composables/useConfig'
 *
 * // 在setup中
 * const { baseUrl, timeout } = useApiConfig()
 * const { username, clientId } = useGiteeConfig()
 * const { env, isProduction, debugEnabled } = useEnvConfig()
 *
 * // 使用这些响应式属性
 * console.log('API URL:', baseUrl.value)
 * console.log('环境:', env.value)
 * console.log('调试模式:', debugEnabled.value ? '已启用' : '已禁用')
 * ```
 */
