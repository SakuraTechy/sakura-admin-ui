// 使用示例：D:\King\Cursor\sakura-admin-ui\demo\全局动态加载配置文件\README.md
window.config = {
  // 证书系统环境配置
  environment: {
    // 证书系统基础URL（生产环境）
    url: 'https://172.24.4.222',

    // 开发环境URL（可选，仅在开发环境生效）
    // 开发环境下，前端请求会使用 devUrl，但后端下载证书文件仍使用 url
    devUrl: '/api/certificate',  // 通过 vite.config.ts 代理到证书系统

    // 自动登录配置
    username: 'liuzhi',
    password: '3edc$RFV',

    // API接口路径
    login: '/prod-api/login',
    products: '/prod-api/common/product/info/list',
    productVersions: '/prod-api/common/product/version/list',
    productTypes: '/prod-api/common/product/model/list',
    productModels: '/prod-api/common/product/model/list',
    productModules: '/prod-api/common/product/module/listByVersionRange/{productId}/{versionId}',
    batchApplications: '/prod-api/certificate/make/batch',
    submit: '/prod-api/certificate/make/submit',
    makes: '/prod-api/certificate/make/list',
    detail: '/prod-api/certificate/make/{licenseId}',
    approve: '/prod-api/certificate/audit/approve',
    download: '/prod-api/certificate/make/download',

    // 下载文件到服务器的接口
    downloadFile: '/system/file/downloadFile',
    // 服务器保存路径
    savePath: '/data/ankki/Ankki.Test.Platform/automation/Ankki.Web.UI.Automation.Test/TestData/license',
    // 文件下载路径（用于企业微信通知）
    downloadPath: 'http://172.19.5.222:8079/Ankki.Test.Platform/automation/Ankki.Web.UI.Automation.Test/TestData/license/',
    // 企业微信推送接口
    webhookUrl: '/system/file/sendWebhookMessage',
    // 企业微信机器人webhook地址
    webhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=cce2c047-5c30-4d58-a7e0-8a2463cc8dc9',

    // 证书默认配置
    certificateDefaults: {
      customerId: 1,
      customerName: '昂楷科技内部测试',
      customerShort: 'ANKKI',
      certVersion: '1.0',
      isNeutral: '0',
      hasSysinfoMenu: '0',
      isClusterLicense: '0',
      authType: '1'
    }
  },
  cuecast: {
    // CueCast Chrome 扩展安装包下载地址。
    extensionDownloadUrl: 'http://172.19.5.228:5183/file/2026/8/31/6a9543c6e4b02e1bb4b59d1e.zip',
  },
  gitee: {
    baseURL: 'https://gitee.com',
    // Gitee OAuth2 获取 AccessToken：https://gitee.com/api/v5/oauth_doc#/list-item-2
    username: '******',
    password: '******',
    // 获取第三方应用授权：https://gitee.com/oauth/applications
    client_id: 'e3f673e62d8f6c4c9af73d4e9d0******904c14f476eb0aba4e612d7d',
    client_secret: '590fba7e3d45fabe40b3ed******0f746657e974c8338e23fad221',
    scope: 'user_info pull_requests issues notes',
    // 获取组织的公开动态：https://gitee.com/api/v5/swagger#/getV5OrgsOrgEvents
    events: 'https://gitee.com/api/v5/orgs/SakuraTechy/events?access_token=',
    events_list: '/api/gitee/organizations/SakuraTechy/event_list?url=%2Forganizations%2FSakuraTechy%2Fevent_list&scope=all&day=&start_date=&end_date=&year=&limit=1000&project_ids=&user_ids=&prev_id=&_=1743666747400',
    limit: 1000,
  },
}
