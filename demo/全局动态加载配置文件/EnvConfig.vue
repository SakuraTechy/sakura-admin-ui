<template>
  <div class="env-config-demo">
    <h2>基于环境的配置使用示例</h2>

    <div class="current-env">
      <div class="env-badge" :class="envClass">
        当前环境: {{ currentEnv }}
      </div>
    </div>

    <div class="env-features">
      <h3>环境特性</h3>
      <table>
        <tr>
          <th>调试模式:</th>
          <td>
            <span class="feature-status" :class="{ enabled: debugEnabled }">
              {{ debugEnabled ? '已启用' : '已禁用' }}
            </span>
          </td>
        </tr>
        <tr>
          <th>分析功能:</th>
          <td>
            <span class="feature-status" :class="{ enabled: analyticsEnabled }">
              {{ analyticsEnabled ? '已启用' : '已禁用' }}
            </span>
          </td>
        </tr>
        <tr>
          <th>API地址:</th>
          <td>{{ apiEndpoint }}</td>
        </tr>
        <tr>
          <th>日志级别:</th>
          <td>{{ logLevel }}</td>
        </tr>
      </table>
    </div>

    <div class="conditional-ui">
      <h3>条件性UI元素</h3>

      <!-- 只在开发环境显示 -->
      <div v-if="isDevelopment" class="conditional-section dev-only">
        <h4>开发者工具</h4>
        <p>这个部分只在开发环境中显示</p>
        <button class="dev-button">重新生成测试数据</button>
        <button class="dev-button">模拟API错误</button>
      </div>

      <!-- 只在测试环境显示 -->
      <div v-if="isTest" class="conditional-section test-only">
        <h4>测试工具</h4>
        <p>这个部分只在测试环境中显示</p>
        <div class="test-controls">
          <label>
            <input type="checkbox"> 启用自动测试
          </label>
          <button class="test-button">运行所有测试</button>
        </div>
      </div>

      <!-- 只在生产环境隐藏 -->
      <div v-if="!isProduction" class="conditional-section non-prod">
        <h4>非生产环境功能</h4>
        <p>这个部分在生产环境中被隐藏</p>
        <div class="mock-data-controls">
          <button class="mock-button">使用模拟数据</button>
          <button class="mock-button">重置应用状态</button>
        </div>
      </div>

      <!-- 在所有环境都显示，但配置不同 -->
      <div class="conditional-section all-env">
        <h4>所有环境通用(但配置不同)</h4>
        <div class="api-info">
          <p>API基础URL: <code>{{ apiEndpoint }}</code></p>
          <p>超时设置: <code>{{ timeout }}ms</code></p>
          <p>错误重试: <code>{{ retries }}次</code></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getConfigValue } from '@/utils/config'

// 获取环境配置
const currentEnv = computed(() => getConfigValue('env', 'development'))

// 环境判断
const isProduction = computed(() => currentEnv.value === 'production')
const isTest = computed(() => currentEnv.value === 'test')
const isDevelopment = computed(() => currentEnv.value === 'development')

// 基于环境的CSS类
const envClass = computed(() => {
  switch (currentEnv.value) {
    case 'production': return 'env-prod'
    case 'test': return 'env-test'
    case 'development': return 'env-dev'
    default: return 'env-unknown'
  }
})

// 功能开关
const debugEnabled = computed(() => {
  // 在生产环境中强制关闭调试模式，否则使用配置
  if (isProduction.value) return false
  return getConfigValue('features.debug', false)
})

const analyticsEnabled = computed(() => {
  // 在生产环境中总是启用分析，在开发环境中默认禁用
  if (isProduction.value) return true
  if (isDevelopment.value) return getConfigValue('features.analytics', false)
  // 测试环境使用配置值
  return getConfigValue('features.analytics', false)
})

// 基于环境的API端点
const apiEndpoint = computed(() => {
  switch (currentEnv.value) {
    case 'production':
      return getConfigValue('api.prod', 'https://api.example.com')
    case 'test':
      return getConfigValue('api.test', 'https://test-api.example.com')
    default:
      return getConfigValue('api.dev', 'http://localhost:3000')
  }
})

// 基于环境的日志级别
const logLevel = computed(() => {
  if (isProduction.value) return 'error'
  if (isTest.value) return 'warn'
  return 'debug'
})

// 基于环境的超时设置
const timeout = computed(() => {
  if (isProduction.value) return getConfigValue('api.timeout.prod', 10000)
  if (isTest.value) return getConfigValue('api.timeout.test', 8000)
  return getConfigValue('api.timeout.dev', 5000)
})

// 基于环境的重试次数
const retries = computed(() => {
  if (isProduction.value) return getConfigValue('api.retries.prod', 3)
  if (isTest.value) return getConfigValue('api.retries.test', 2)
  return getConfigValue('api.retries.dev', 1)
})
</script>

<style scoped>
.env-config-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h2 {
  margin-bottom: 20px;
  color: #333;
}

h3 {
  margin-top: 30px;
  margin-bottom: 15px;
  color: #444;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #555;
}

.current-env {
  margin-bottom: 20px;
}

.env-badge {
  display: inline-block;
  padding: 10px 15px;
  border-radius: 4px;
  font-weight: bold;
  color: white;
}

.env-prod {
  background-color: #28a745;
}

.env-test {
  background-color: #fd7e14;
}

.env-dev {
  background-color: #17a2b8;
}

.env-unknown {
  background-color: #6c757d;
}

.env-features table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.env-features th, .env-features td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.env-features th {
  width: 120px;
  color: #666;
}

.feature-status {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 3px;
  background-color: #dc3545;
  color: white;
}

.feature-status.enabled {
  background-color: #28a745;
}

.conditional-section {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 4px;
}

.dev-only {
  background-color: rgba(23, 162, 184, 0.1);
  border: 1px solid rgba(23, 162, 184, 0.3);
}

.test-only {
  background-color: rgba(253, 126, 20, 0.1);
  border: 1px solid rgba(253, 126, 20, 0.3);
}

.non-prod {
  background-color: rgba(108, 117, 125, 0.1);
  border: 1px solid rgba(108, 117, 125, 0.3);
}

.all-env {
  background-color: rgba(0, 123, 255, 0.1);
  border: 1px solid rgba(0, 123, 255, 0.3);
}

button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  margin-right: 10px;
  cursor: pointer;
  color: white;
}

.dev-button {
  background-color: #17a2b8;
}

.test-button {
  background-color: #fd7e14;
}

.mock-button {
  background-color: #6c757d;
}

.test-controls, .mock-data-controls {
  margin-top: 10px;
}

.api-info {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
}

.api-info p {
  margin: 5px 0;
}

code {
  background-color: #eee;
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
}
</style>
