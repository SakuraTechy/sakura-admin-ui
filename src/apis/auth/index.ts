/*
 * @Author: liuzhi 1306086303@qq.com
 * @Date: 2025-03-12 11:00:21
 * @LastEditors: liuzhi 1306086303@qq.com
 * @LastEditTime: 2025-03-12 11:56:52
 * @FilePath: \continew-admin-ui\src\apis\auth\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type * as T from './type'
import http from '@/utils/http'

export type * from './type'

const BASE_URL = '/auth'

/** @desc 账号登录 */
export function accountLogin(req: T.AccountLoginReq) {
  return http.post<T.LoginResp>(`${BASE_URL}/login`, req)
}

/** @desc 手机号登录 */
export function phoneLogin(req: T.PhoneLoginReq) {
  return http.post<T.LoginResp>(`${BASE_URL}/login`, req)
}

/** @desc 邮箱登录 */
export function emailLogin(req: T.EmailLoginReq) {
  return http.post<T.LoginResp>(`${BASE_URL}/login`, req)
}

/** @desc 三方账号登录 */
export function socialLogin(req: any) {
  return http.post<T.LoginResp>(`${BASE_URL}/login`, req)
}

/** @desc 三方账号登录授权 */
export function socialAuth(source: string) {
  return http.get<T.SocialAuthAuthorizeResp>(`${BASE_URL}/${source}`)
}

/** @desc 退出登录 */
export function logout() {
  return http.post(`${BASE_URL}/logout`)
}

/** @desc 获取用户信息 */
export const getUserInfo = () => {
  return http.get<T.UserInfo>(`${BASE_URL}/user/info`)
}

/** @desc 获取路由信息 */
export const getUserRoute = () => {
  return http.get<T.RouteItem[]>(`${BASE_URL}/user/route`)
}

/** @desc 获取手机区号 */
export const getPhoneCountryCode = () => {
  return http.get(`https://restcountries.com/v3.1/all`)
}
