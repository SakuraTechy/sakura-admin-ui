export type OperationDiagnosticProfile =
  | 'navigation'
  | 'element_interaction'
  | 'dialog'
  | 'assertion'
  | 'wait'
  | 'variable'
  | 'script'
  | 'infrastructure'
  | 'generic'

export interface OperationDiagnosticProfileView {
  label: string
  inputTitle: string
  factTitle: string
  targetTitle: string
  showInputs: boolean
  showFacts: boolean
  showTarget: boolean
}

const PROFILE_VIEWS: Record<OperationDiagnosticProfile, OperationDiagnosticProfileView> = {
  navigation: {
    label: '页面与窗口',
    inputTitle: '导航配置与实际值',
    factTitle: '导航结果',
    targetTitle: '实际页面目标',
    showInputs: true,
    showFacts: true,
    showTarget: true,
  },
  element_interaction: {
    label: '元素交互',
    inputTitle: '交互参数与实际值',
    factTitle: '交互结果',
    targetTitle: '实际元素目标',
    showInputs: true,
    showFacts: true,
    showTarget: true,
  },
  dialog: {
    label: '浏览器弹框',
    inputTitle: '弹框处理参数',
    factTitle: '弹框处理结果',
    targetTitle: '弹框目标',
    showInputs: true,
    showFacts: true,
    showTarget: false,
  },
  assertion: {
    label: '断言检查',
    inputTitle: '断言配置',
    factTitle: '断言运行事实',
    targetTitle: '断言目标',
    showInputs: true,
    showFacts: true,
    showTarget: true,
  },
  wait: {
    label: '等待控制',
    inputTitle: '等待配置',
    factTitle: '等待结果',
    targetTitle: '等待目标',
    showInputs: true,
    showFacts: true,
    showTarget: false,
  },
  variable: {
    label: '变量处理',
    inputTitle: '变量配置与来源',
    factTitle: '变量执行结果',
    targetTitle: '变量来源目标',
    showInputs: true,
    showFacts: true,
    showTarget: true,
  },
  script: {
    label: '脚本执行',
    inputTitle: '脚本定义',
    factTitle: '脚本返回结果',
    targetTitle: '脚本目标',
    showInputs: true,
    showFacts: true,
    showTarget: false,
  },
  infrastructure: {
    label: '基础设施',
    inputTitle: '执行参数',
    factTitle: '执行结果事实',
    targetTitle: '执行目标',
    showInputs: true,
    showFacts: true,
    showTarget: false,
  },
  generic: {
    label: '通用动作',
    inputTitle: '执行参数',
    factTitle: '执行结果事实',
    targetTitle: '执行目标',
    showInputs: true,
    showFacts: true,
    showTarget: true,
  },
}

export function getOperationDiagnosticProfileView(profile: unknown): OperationDiagnosticProfileView {
  const key = String(profile || 'generic') as OperationDiagnosticProfile
  return PROFILE_VIEWS[key] || PROFILE_VIEWS.generic
}
