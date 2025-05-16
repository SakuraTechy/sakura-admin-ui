/** 接口返回数据格式 */
interface ApiRes<T> {
  access_token: any
  forEach: any
  code: number
  data: T
  msg: string
  success: boolean
  timestamp: string
}

/** 分页响应数据格式 */
interface PageRes<T> {
  list: T
  total: number
}

/** 分页请求数据格式 */
interface PageQuery {
  page?: number
  size?: number
}
