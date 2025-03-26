/**
 * 安全地获取配置值
 * @param path 配置路径，使用点号分隔，例如 'gitee.baseURL'
 * @param defaultValue 默认值，当配置不存在时返回
 * @returns 配置值或默认值
 */
export function getConfigValue<T>(path: string, defaultValue: T): T {
  if (!window.config) {
    return defaultValue
  }

  const keys = path.split('.')
  let current: any = window.config

  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return defaultValue
    }
    current = current[key]
  }

  return (current === undefined || current === null) ? defaultValue : current as T
}

/**
 * 获取整个配置对象
 * @returns 配置对象
 */
export function getConfig(): Record<string, any> {
  return window.config || {}
}

/**
 * 获取Gitee配置
 * 不强制定义结构，直接返回window.config.gitee对象
 * @returns Gitee配置对象
 */
export function getGiteeConfig() {
  return window.config?.gitee || {}
}
