# Config.js 使用示例

本目录包含了使用动态加载配置文件的各种示例。

## 示例列表

1. `BasicUsage.vue` - 基本使用方式，展示了多种获取配置的方法，使用getConfig()、getGiteeConfig()和getConfigValue()函数
2. `ApiService.ts` - 展示如何在服务中使用配置，创建基于配置的HTTP客户端
3. `ConfigInTemplate.vue` - 展示在模板中直接使用全局$config属性，使用条件渲染和样式
4. `ConfigHooks.ts` - 自定义组合式函数(Composable)处理配置，提供响应式配置访问
5. `EnvConfig.vue` - 基于环境使用不同配置的示例，条件性UI展示
6. `AuthExample.vue` - 使用配置进行认证的实际案例，显示掩码处理的敏感信息

## 使用方法

这些示例文件展示了不同的配置获取和使用方式，可以根据需要复制到您的项目中使用。

## 配置文件示例

`public/config.js` 配置文件示例如下：

```javascript
window.config = {
  // API相关配置
  api: {
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    key: 'your-api-key'
  },
  
  // Gitee相关配置
  gitee: {
    baseURL: 'https://gitee.com',
    username: 'your-username',
    password: 'your-password',
    client_id: 'your-client-id',
    client_secret: 'your-client-secret',
    scope: 'user_info pull_requests issues notes'
  },
  
  // 环境配置
  env: 'development', // 'development', 'test', 'production'
  
  // 功能开关
  features: {
    debug: true,
    analytics: false
  },
  
  // 认证配置
  auth: {
    url: 'https://auth.example.com/oauth',
    clientId: 'your-client-id',
    redirectUri: 'https://your-app.com/callback'
  }
}
```

### 注意事项

- 生产环境部署时应使用环境变量或其他安全的配置管理方式
- 设置`.gitignore`忽略敏感配置文件是额外的安全措施
