/*
 * @Author: liuzhi 1306086303@qq.com
 * @Date: 2025-03-12 11:00:23
 * @LastEditors: liuzhi 1306086303@qq.com
 * @LastEditTime: 2025-03-18 15:42:29
 * @FilePath: \continew-admin-ui\src\config\setting.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export const defaultSettings: App.AppSettings = {
  theme: 'light',
  themeColor: '#165DFF',
  tab: true,
  tabMode: 'card-gutter',
  animate: false,
  animateMode: 'zoom-fade',
  menuCollapse: true,
  menuAccordion: true,
  menuDark: false,
  copyrightDisplay: true,
  layout: 'left',
  enableColorWeaknessMode: false,
  enableMourningMode: false,
  fontFamily: 'Microsoft YaHei',
}
// 根据环境返回配置
export const getSettings = (): App.AppSettings => {
  return defaultSettings
}
