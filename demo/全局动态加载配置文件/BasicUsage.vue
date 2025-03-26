<template>
  <div class="config-demo">
    <h2>配置基本使用示例</h2>

    <div class="section">
      <h3>1. 获取的配置信息</h3>
      <div class="config-display">
        <div v-if="allConfig">
          <strong>所有配置：</strong>
          <pre>{{ JSON.stringify(allConfig, null, 2) }}</pre>
        </div>
        <div v-else>未加载配置</div>
      </div>
    </div>

    <div class="section">
      <h3>2. Gitee配置信息</h3>
      <div class="config-display">
        <div v-if="giteeConfig">
          <p><strong>baseURL:</strong> {{ giteeConfig.baseURL || '未设置' }}</p>
          <p><strong>用户名:</strong> {{ giteeConfig.username || '未设置' }}</p>
        </div>
        <div v-else>未配置Gitee信息</div>
      </div>
    </div>

    <div class="section">
      <h3>3. 使用默认值获取配置</h3>
      <div class="config-display">
        <p><strong>API地址:</strong> {{ apiUrl }}</p>
        <p><strong>超时时间:</strong> {{ timeout }}ms</p>
        <p><strong>Gitee用户名:</strong> {{ username }}</p>
      </div>
    </div>

    <button @click="fetchData">使用配置调用API</button>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="apiResult" class="api-result">
      <pre>{{ JSON.stringify(apiResult, null, 2) }}</pre>
    </div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { getConfig, getConfigValue, getGiteeConfig } from '@/utils/config'

// 方式1: 获取整个配置对象
const allConfig = ref(getConfig())

// 方式2: 获取特定模块配置
const giteeConfig = ref(getGiteeConfig())

// 方式3: 安全地获取特定配置项（带默认值）
const apiUrl = ref(getConfigValue('api.baseUrl', 'https://default-api.com'))
const timeout = ref(getConfigValue('api.timeout', 5000))
const username = ref(getConfigValue('gitee.username', '默认用户名'))

// 用于API调用的状态
const loading = ref(false)
const apiResult = ref(null)
const error = ref('')

// 使用配置中的值调用API
async function fetchData() {
  const url = giteeConfig.value.baseURL || 'https://gitee.com'
  if (!url) {
    error.value = '未配置API地址'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // 模拟调用API
    // 注意：这只是示例，实际情况下应替换为真实API调用
    const response = await axios.get(`${url}/api/v5/user`, {
      timeout: timeout.value,
    }).catch(() => ({
      // 模拟数据，实际中会失败因为没有认证
      data: {
        message: '这是模拟数据，实际API调用需要认证',
        api_url: url,
        timeout: timeout.value,
        configs_used: {
          api_url: apiUrl.value,
          username: username.value,
        },
      },
    }))

    apiResult.value = response.data
  } catch (err: any) {
    error.value = `获取数据失败: ${err.message || String(err)}`
  } finally {
    loading.value = false
  }
}

// 当组件挂载时尝试刷新配置
onMounted(() => {
  // 刷新获取配置，以确保使用最新值
  allConfig.value = getConfig()
  giteeConfig.value = getGiteeConfig()
  apiUrl.value = getConfigValue('api.baseUrl', 'https://default-api.com')
  timeout.value = getConfigValue('api.timeout', 5000)
  username.value = getConfigValue('gitee.username', '默认用户名')
})
</script>

<style scoped>
.config-demo {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.section {
  margin-bottom: 30px;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 15px;
}

.config-display {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

pre {
  overflow: auto;
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 20px;
}

button:hover {
  background-color: #45a049;
}

.loading {
  margin: 10px 0;
  color: #666;
}

.api-result {
  margin-top: 20px;
}

.error {
  color: #d9534f;
  margin-top: 10px;
}
</style>
