// 使用示例：D:\King\Cursor\sakura-admin-ui\demo\全局动态加载配置文件\README.md
window.config = {
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
