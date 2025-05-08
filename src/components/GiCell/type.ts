import type { LabelValueState } from '@/types/global'

export interface GiCellTagType {
  dict: LabelValueState[] | any[]
  value: number | string
}

export interface GiCellPasswordType {
  value?: string
  onShow?: (show: boolean) => Promise<string | void> | void
  onHide?: () => void
  showTooltip?: string
  hideTooltip?: string
  permission?: string
}

export interface GiCellVersionType {
  version: string
  presetColors?: Record<string, string>
  defaultColor?: string
}
