<template>
  <div class="config-template-demo">
    <h2>在模板中使用全局 $config 属性</h2>

    <div class="card">
      <h3>API配置信息</h3>
      <table v-if="$config && $config.api" class="config-table">
        <tr>
          <th>基础URL:</th>
          <td>{{ $config.api.baseUrl || '未设置' }}</td>
        </tr>
        <tr>
          <th>超时设置:</th>
          <td>{{ $config.api.timeout || 0 }}ms</td>
        </tr>
        <tr>
          <th>API密钥:</th>
          <td>{{ hideApiKey($config.api.key) }}</td>
        </tr>
      </table>
      <div v-else class="empty-message">未找到API配置</div>
    </div>

    <div class="card">
      <h3>Gitee配置信息</h3>
      <table v-if="$config && $config.gitee" class="config-table">
        <tr>
          <th>基础URL:</th>
          <td>{{ $config.gitee.baseURL || '未设置' }}</td>
        </tr>
        <tr>
          <th>用户名:</th>
          <td>{{ $config.gitee.username || '未设置' }}</td>
        </tr>
        <tr>
          <th>Client ID:</th>
          <td>{{ hideSecret($config.gitee.client_id) }}</td>
        </tr>
        <tr>
          <th>Client Secret:</th>
          <td>{{ hideSecret($config.gitee.client_secret) }}</td>
        </tr>
      </table>
      <div v-else class="empty-message">未找到Gitee配置</div>
    </div>

    <div class="card">
      <h3>环境设置</h3>
      <div class="env-display">
        <p class="env-badge" :class="envClass">{{ $config?.env || '未设置环境' }}</p>
        <p v-if="$config?.features?.debug" class="feature-badge debug">调试模式已启用</p>
        <p v-if="$config?.features?.analytics" class="feature-badge analytics">分析功能已启用</p>
      </div>
    </div>

    <div class="card">
      <h3>全部配置 (JSON)</h3>
      <pre class="config-json">{{ JSON.stringify($config || {}, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 隐藏API密钥，只显示前后几个字符
function hideApiKey(key?: string): string {
  if (!key) return '未设置'
  if (key.length <= 8) return '********'
  return `${key.substring(0, 4)}....${key.substring(key.length - 4)}`
}

// 隐藏敏感信息
function hideSecret(secret?: string): string {
  if (!secret) return '未设置'
  return `******${secret.length > 6 ? secret.substring(secret.length - 4) : ''}`
}

// 根据环境获取CSS类
const envClass = computed(() => {
  const env = window.config?.env

  switch (env) {
    case 'production':
      return 'env-prod'
    case 'test':
      return 'env-test'
    case 'development':
      return 'env-dev'
    default:
      return 'env-unknown'
  }
})
</script>

<style scoped>
.config-template-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

h3 {
  color: #555;
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.config-table {
  width: 100%;
  border-collapse: collapse;
}

.config-table th, .config-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.config-table th {
  width: 30%;
  color: #666;
}

.empty-message {
  color: #999;
  font-style: italic;
  padding: 10px 0;
}

.env-display {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.env-badge, .feature-badge {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: bold;
}

.env-prod {
  background-color: #28a745;
  color: white;
}

.env-test {
  background-color: #fd7e14;
  color: white;
}

.env-dev {
  background-color: #17a2b8;
  color: white;
}

.env-unknown {
  background-color: #6c757d;
  color: white;
}

.feature-badge.debug {
  background-color: #dc3545;
  color: white;
}

.feature-badge.analytics {
  background-color: #6610f2;
  color: white;
}

.config-json {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  overflow: auto;
  max-height: 300px;
  color: #333;
  font-size: 14px;
  line-height: 1.5;
}
</style>
