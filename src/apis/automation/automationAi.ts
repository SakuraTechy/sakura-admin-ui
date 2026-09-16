import http from '@/utils/http'

const BASE_URL = '/automation/ai'

/**
 * 变量提取规则请求参数
 */
export interface AutomationVariableExtractRuleReq {
  /** 原始值，用于提取变量的源数据 */
  raw_value: string
  /** 提取指令，描述如何从原始值中提取变量 */
  instruction: string
}

/**
 * 变量提取规则响应
 */
export interface AutomationVariableExtractRuleResp {
  /** 提取模式，当前仅支持 "regex" */
  mode: string
  /** 正则表达式 */
  pattern: string
  /** 捕获组索引，0 表示整体匹配 */
  group: number
  /** 生成此规则的原因说明 */
  reason: string
}

/**
 * 生成变量提取规则
 * 根据原始值和提取指令，通过 AI 生成正则表达式提取规则
 */
export function generateVariableExtractRule(data: AutomationVariableExtractRuleReq) {
  return http.post<AutomationVariableExtractRuleResp>(`${BASE_URL}/variable-extract-rule`, data)
}
