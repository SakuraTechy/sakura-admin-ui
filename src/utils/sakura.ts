/**
 * 通用ts方法封装处理
 * Copyright (c) 2019 sakura
 */

import log from './log'

const baseURL = process.env.VUE_APP_BASE_API

interface DictItem {
  dictValue: string
  dictLabel: string
}

interface TreeNode {
  id: string
  parentId: string
  children?: TreeNode[]
  [key: string]: any
}

interface JsonArrayItem {
  [key: string]: any
}

// 日期格式化
export function parseTime(time: Date | string | number, pattern?: string): string | null {
  if (arguments.length === 0 || !time) {
    return null
  }
  const format = pattern || '{y}-{m}-{d} {h}:{i}:{s}'
  let date: Date
  if (time instanceof Date) {
    date = time
  } else {
    if (typeof time === 'string' && /^\d+$/.test(time)) {
      time = Number.parseInt(time)
    } else if (typeof time === 'string') {
      time = time.replace(new RegExp(/-/g), '/')
    }
    if (typeof time === 'number' && time.toString().length === 10) {
      time = time * 1000
    }
    date = new Date(time)
  }
  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay(),
  }
  const timeStr = format.replace(/\{([ymdhisa])+\}/g, (result, key) => {
    let value = formatObj[key]
    // Note: getDay() returns 0 on Sunday
    if (key === 'a') {
      return ['日', '一', '二', '三', '四', '五', '六'][value]
    }
    if (result.length > 0 && value < 10) {
      value = `0${value}`
    }
    return value || 0
  })
  return timeStr
}

// 毫秒转时分秒，例如： 378230毫秒==>1时4分钟33秒
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(seconds / 3600)
  const remainingSeconds = seconds % 3600
  const minutes = Math.floor(remainingSeconds / 60)
  const remainingSecondsAfterMinutes = remainingSeconds % 60

  let formattedDuration: string
  if (minutes === 0) {
    formattedDuration = `${remainingSecondsAfterMinutes}秒`
  } else if (hours === 0) {
    formattedDuration = `${minutes}分${remainingSecondsAfterMinutes}秒`
  } else {
    formattedDuration = `${hours}时${minutes}分${remainingSecondsAfterMinutes}秒`
  }

  return !isNaN(remainingSecondsAfterMinutes) ? formattedDuration : '-'
}

// 获取本周开始和结束时间（ISO 格式）
export function getWeekStartAndEnd(): { weekStart: string, weekEnd: string } {
  const currentDate = new Date()
  const startOfWeek = new Date(currentDate)
  const endOfWeek = new Date(currentDate)

  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() || 7) - 1))
  startOfWeek.setHours(0, 0, 0, 0)

  endOfWeek.setDate(endOfWeek.getDate() + (7 - (endOfWeek.getDay() || 7)))
  endOfWeek.setHours(23, 59, 59, 999)

  return {
    weekStart: formatDate(startOfWeek),
    weekEnd: formatDate(endOfWeek),
  }

  function formatDate(date: Date): string {
    return (
      `${date.getFullYear()
      }-${
      (`0${date.getMonth() + 1}`).slice(-2)
      }-${
      (`0${date.getDate()}`).slice(-2)
      } ${
      (`0${date.getHours()}`).slice(-2)
      }:${
      (`0${date.getMinutes()}`).slice(-2)
      }:${
      (`0${date.getSeconds()}`).slice(-2)}`
    )
  }
}

// 当前时间戳+?天数
export function addDaysToDate(date: Date, days: number): number {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.getTime()
}

// 表单重置
export function resetForm(refName: string): void {
  if (this[refName]) {
    this[refName].resetFields()
  }
}

// 添加日期范围
export function addDateRange(params: Record<string, any>, dateRange: [string, string], propName?: string): Record<string, any> {
  const search = { ...params }
  search.params = {}
  if (dateRange !== null && dateRange !== '' && dateRange.length === 2) {
    if (typeof propName === 'undefined') {
      search.params.beginTime = dateRange[0]
      search.params.endTime = dateRange[1]
    } else {
      search.params[`${propName}BeginTime`] = dateRange[0]
      search.params[`${propName}EndTime`] = dateRange[1]
    }
  }
  return search
}

// 回显数据字典
export function selectDictLabel(datas: DictItem[], value: string): string {
  const actions: string[] = []
  Object.keys(datas).some((key) => {
    if (datas[key].dictValue === value) {
      actions.push(datas[key].dictLabel)
      return true
    }
  })
  return actions.join('')
}

// 构造树型结构数据
export function handleTree(data: TreeNode[], id = 'id', parentId = 'parentId', children = 'children', rootId = '0'): TreeNode[] {
  const cloneData = JSON.parse(JSON.stringify(data))
  const treeData = cloneData.filter((father: any) => {
    const branchArr = cloneData.filter((child: any) => father[id] === child[parentId])
    if (branchArr.length > 0) {
      father[children] = branchArr
    } else {
      father[children] = ''
    }
    return father[parentId] === rootId
  })
  return treeData !== '' && treeData == null ? treeData : data
}

// 从树中移除指定节点
export function removeTreeNode(list: TreeNode[], node: { parentIds: string, id: string }): void {
  const parentList = list
  const parentIds = node.parentIds.split('/')
  const currentNodeId = node.id
  deleteTreeNode(parentList, list, parentIds, currentNodeId)
}

function deleteTreeNode(parentList: TreeNode, list: TreeNode[], parentIds: string[], currentNodeId: string): void {
  for (let s = 0; s < list.length; s++) {
    if (list[s].id === currentNodeId) {
      list.splice(s, 1)
      if (list.length === 0) {
        parentList.treeLeaf = 'y'
      }
      return
    } else if (list[s].children && list[s].children.length > 0) {
      parentIds.splice(0, 1)
      deleteTreeNode(list[s], list[s].children, parentIds, currentNodeId)
    }
  }
}

// 找寻选中节点的子节点数组
export function findChildItem(data: TreeNode[], activeId: string): TreeNode[] | undefined {
  let result: TreeNode[] | undefined
  if (!data) return
  data.forEach((item) => {
    if (item.id === activeId) {
      result = item.children
    } else if (item.children && item.children.length > 0) {
      if (!result) {
        result = findChildItem(item.children, activeId)
      }
    }
  })
  return result
}

/**
 * 查找树结构中匹配节点的完整路径
 * @param tree 树形结构数据
 * @param key 匹配字段名（如 'key'）
 * @param value 匹配字段值
 * @param labelKey 路径拼接字段（默认 'title'）
 * @returns {string|null} 格式如 '/层级一/层级二/层级三'
 */
export function findNodePath(tree: any[], key: string, value: any, labelKey = 'title') {
  const path: any[] = []
  function dfs(nodes: any[]): boolean {
    for (const node of nodes) {
      path.push(node[labelKey])
      if (node[key] === value) {
        return true
      }
      if (node.children && dfs(node.children)) {
        return true
      }
      path.pop()
    }
    return false
  }
  dfs(tree)
  return path.join(' / ')
}

// 深度遍历对象
export function traverseDeep(obj: Record<string, any>, callback: (key: string, value: any) => void): void {
  function recurse(currentObj: Record<string, any>) {
    for (const key in currentObj) {
      if (currentObj.hasOwnProperty(key)) {
        const value = currentObj[key]
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item) => {
              if (typeof item === 'object' && item !== null) {
                recurse(item)
              } else {
                callback(key, item)
              }
            })
          } else {
            recurse(value)
          }
        } else {
          callback(key, value)
        }
      }
    }
  }
  recurse(obj)
}
