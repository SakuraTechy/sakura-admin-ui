<template>
  <div class="auth-example">
    <h2>基于配置的认证示例</h2>

    <div class="status-card">
      <div v-if="isAuthenticated" class="auth-status authenticated">
        <div class="auth-icon">✓</div>
        <div class="auth-text">
          <h3>已登录</h3>
          <p>欢迎回来, {{ userInfo.name }}</p>
        </div>
        <button class="auth-button logout-button" @click="logout">退出登录</button>
      </div>

      <div v-else class="auth-status not-authenticated">
        <div class="auth-icon">!</div>
        <div class="auth-text">
          <h3>未登录</h3>
          <p>请登录以访问更多功能</p>
        </div>
        <button class="auth-button login-button" @click="login">登录</button>
      </div>
    </div>

    <div class="config-info">
      <h3>认证配置信息</h3>
      <div class="config-table">
        <div class="config-row">
          <div class="config-label">认证服务地址:</div>
          <div class="config-value">{{ authConfig.url || '未配置' }}</div>
        </div>
        <div class="config-row">
          <div class="config-label">客户端ID:</div>
          <div class="config-value">{{ maskString(authConfig.clientId) }}</div>
        </div>
        <div class="config-row">
          <div class="config-label">重定向URI:</div>
          <div class="config-value">{{ authConfig.redirectUri }}</div>
        </div>
        <div class="config-row">
          <div class="config-label">授权范围:</div>
          <div class="config-value">{{ authConfig.scope }}</div>
        </div>
        <div class="config-row">
          <div class="config-label">授权方式:</div>
          <div class="config-value">{{ authConfig.responseType }}</div>
        </div>
      </div>
    </div>

    <div v-if="isAuthenticated" class="protected-content">
      <h3>受保护内容</h3>
      <div class="user-info">
        <img :src="userInfo.avatar" alt="用户头像" class="user-avatar">
        <div class="user-details">
          <p><strong>用户名:</strong> {{ userInfo.name }}</p>
          <p><strong>邮箱:</strong> {{ userInfo.email }}</p>
          <p><strong>角色:</strong> {{ userInfo.role }}</p>
          <p><strong>Token过期时间:</strong> {{ formatExpireTime(userInfo.expiresAt) }}</p>
        </div>
      </div>

      <div class="token-info">
        <h4>访问令牌</h4>
        <div class="token-display">
          <code>{{ maskToken(userInfo.token) }}</code>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getConfigValue } from '../utils/config'

// 认证状态
const isAuthenticated = ref(false)
const error = ref('')

// 模拟用户信息
const userInfo = ref({
  name: '',
  email: '',
  role: '',
  avatar: '',
  token: '',
  expiresAt: 0,
})

// 获取认证配置
const authConfig = computed(() => ({
  url: getConfigValue('auth.url', ''),
  clientId: getConfigValue('auth.clientId', ''),
  clientSecret: getConfigValue('auth.clientSecret', ''),
  redirectUri: getConfigValue('auth.redirectUri', window.location.origin),
  responseType: getConfigValue('auth.responseType', 'token'),
  scope: getConfigValue('auth.scope', 'profile email'),
}))

// 格式化过期时间
function formatExpireTime(timestamp: number): string {
  if (!timestamp) return '未知'
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 掩码显示敏感信息
function maskString(str?: string): string {
  if (!str) return '未设置'
  if (str.length <= 8) return '*'.repeat(str.length)
  return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`
}

// 掩码显示token
function maskToken(token?: string): string {
  if (!token) return '未获取token'
  if (token.length <= 10) return '*'.repeat(token.length)
  return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`
}

// 登录方法
function login() {
  if (!authConfig.value.url || !authConfig.value.clientId) {
    error.value = '认证配置不完整，请检查配置'
    return
  }

  // 在实际应用中，这里应该重定向到OAuth服务
  // window.location.href = buildAuthUrl()

  // 模拟登录成功
  simulateSuccessfulLogin()
}

// 构建认证URL
function buildAuthUrl(): string {
  const url = new URL(authConfig.value.url)
  url.searchParams.append('client_id', authConfig.value.clientId)
  url.searchParams.append('redirect_uri', authConfig.value.redirectUri)
  url.searchParams.append('response_type', authConfig.value.responseType)
  url.searchParams.append('scope', authConfig.value.scope)
  url.searchParams.append('state', generateRandomState())
  return url.toString()
}

// 生成随机state参数
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15)
}

// 模拟成功登录
function simulateSuccessfulLogin() {
  // 这只是一个模拟，实际应用中应通过OAuth流程获取真实令牌
  setTimeout(() => {
    isAuthenticated.value = true
    error.value = ''

    // 模拟用户信息
    userInfo.value = {
      name: '张三',
      email: 'zhangsan@example.com',
      role: '管理员',
      avatar: 'https://via.placeholder.com/60',
      token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Math.random().toString(36).substring(2, 15)}`,
      expiresAt: Date.now() + 3600000, // 1小时后过期
    }
  }, 1000)
}

// 退出登录
function logout() {
  isAuthenticated.value = false
  userInfo.value = {
    name: '',
    email: '',
    role: '',
    avatar: '',
    token: '',
    expiresAt: 0,
  }
}

// 初始检查是否已登录
onMounted(() => {
  // 在实际应用中，这里应该检查本地存储的令牌是否有效
  const hasToken = localStorage.getItem('auth_token')

  // 模拟已登录状态
  if (hasToken) {
    simulateSuccessfulLogin()
  }
})
</script>

<style scoped>
.auth-example {
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
  margin-top: 0;
  margin-bottom: 15px;
  color: #444;
}

h4 {
  margin-top: 15px;
  margin-bottom: 10px;
  color: #555;
}

.status-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  overflow: hidden;
}

.auth-status {
  display: flex;
  align-items: center;
  padding: 20px;
}

.auth-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  margin-right: 15px;
}

.authenticated .auth-icon {
  background-color: #28a745;
  color: white;
}

.not-authenticated .auth-icon {
  background-color: #ffc107;
  color: #212529;
}

.auth-text {
  flex-grow: 1;
}

.auth-text h3 {
  margin: 0 0 5px 0;
}

.auth-text p {
  margin: 0;
  color: #666;
}

.auth-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.login-button {
  background-color: #007bff;
  color: white;
}

.logout-button {
  background-color: #6c757d;
  color: white;
}

.config-info {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.config-table {
  width: 100%;
}

.config-row {
  display: flex;
  border-bottom: 1px solid #eee;
  padding: 10px 0;
}

.config-row:last-child {
  border-bottom: none;
}

.config-label {
  width: 120px;
  font-weight: bold;
  color: #666;
}

.config-value {
  flex-grow: 1;
}

.protected-content {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-right: 20px;
}

.user-details p {
  margin: 5px 0;
}

.token-info {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
}

.token-display {
  background-color: #eee;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

code {
  font-family: monospace;
  word-break: break-all;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px 15px;
  border-radius: 4px;
  margin-top: 20px;
}
</style>
