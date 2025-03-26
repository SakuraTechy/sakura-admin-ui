// 使用示例：D:\King\Cursor\sakura-admin-ui\demo\全局动态加载配置文件\README.md
window.config = {
  gitee: {
    baseURL: 'https://gitee.com',
    // Gitee OAuth2 获取 AccessToken：https://gitee.com/api/v5/oauth_doc#/list-item-2
    username: '用户名',
    password: '密码',
    // 获取第三方应用授权：https://gitee.com/oauth/applications
    client_id: '客户端ID',
    client_secret: '客户端密码',
    scope: 'user_info pull_requests issues notes',
    // 获取组织的公开动态：https://gitee.com/api/v5/swagger#/getV5OrgsOrgEvents
    events: 'https://gitee.com/api/v5/orgs/SakuraTechy/events?access_token=',
    limit: 1000,
  },
}
