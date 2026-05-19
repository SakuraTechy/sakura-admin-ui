import type * as T from './type'
import http from '@/utils/http'

export type * from './type'

const BASE_URL = '/system/user'

/** @desc 分页查询用户 */
export function pageUser(query: T.UserPageQuery) {
  return http.get<PageRes<T.UserResp[]>>(BASE_URL, query)
}

/** @desc 查询用户列表 */
export function listUser(query: T.UserQuery) {
  return http.get<T.UserResp[]>(`${BASE_URL}/list`, query)
}

/** @desc 按条件查询用户列表（如仅传 `userIds` 回填已选，同 `/list`） */
export function listAllUser(query: Partial<T.UserQuery>) {
  return http.get<T.UserResp[]>(`${BASE_URL}/list`, {
    sort: ['t1.createTime,desc', 't1.id,desc'],
    ...query,
  })
}

/** 下拉：启用用户（测试计划等场景） */
export function listSystemUser(params?: Partial<T.UserQuery>) {
  return http.get<T.UserResp[]>(`${BASE_URL}/list`, {
    sort: ['createTime,desc'],
    status: 1,
    ...params,
  })
}

/** @desc 查询用户详情 */
export function getUser(id: string) {
  return http.get<T.UserDetailResp>(`${BASE_URL}/${id}`)
}

/** @desc 新增用户 */
export function addUser(data: any) {
  return http.post(`${BASE_URL}`, data)
}

/** @desc 修改用户 */
export function updateUser(data: any, id: string) {
  return http.put(`${BASE_URL}/${id}`, data)
}

/** @desc 删除用户 */
export function deleteUser(ids: string | Array<string>) {
  return http.del(`${BASE_URL}/${ids}`)
}

/** @desc 导出用户 */
export function exportUser(query: T.UserQuery) {
  return http.download(`${BASE_URL}/export`, query)
}

/** @desc 用户注册 */
export function signup(data: any) {
  return http.post(`${BASE_URL}/signup`, data)
}

/** @desc 忘记密码：邮箱验证码通过后修改登录密码（POST `/system/user/password`） */
export function updatePassword(data: any) {
  return http.post(`${BASE_URL}/password`, data)
}

/** @desc 下载用户导入模板 */
export function downloadUserImportTemplate() {
  return http.download(`${BASE_URL}/import/template`, {})
}

/** @desc 解析用户导入文件 */
export function parseUserImport(data: FormData) {
  return http.post<any>(`${BASE_URL}/import/parse`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 与历史命名兼容（如 `UserImportDrawer`） */
export const parseImportUser = parseUserImport

/** 导入执行结果（与解析结果 `UserImportResp` 字段不同） */
export interface UserImportExecuteResp {
  insertRows?: number
  updateRows?: number
  totalRows?: number
}

/** @desc 导入用户 */
export function importUser(data: any) {
  return http.post<UserImportExecuteResp>(`${BASE_URL}/import`, data)
}

/** @desc 重置用户密码 */
export function resetUserPassword(id: string, data: any) {
  return http.patch(`${BASE_URL}/${id}/password`, data)
}

/** 与历史命名/参数顺序兼容（如 `UserResetPwdModal`：先 body 后 id） */
export function resetUserPwd(data: any, id: string) {
  return resetUserPassword(id, data)
}

/** @desc 分配用户角色 */
export function updateUserRole(id: string, data: any) {
  return http.patch(`${BASE_URL}/${id}/role`, data)
}
