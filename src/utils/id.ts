/** 雪花 ID 等须用字符串，避免 JS Number 精度丢失 */
export const toIdString = (id?: string | number | null) => {
  if (id == null || id === '') return ''
  return String(id)
}

/** 规范化 ID 列表为去重后的字符串数组 */
export const toIdStringList = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const v of raw) {
    const s = toIdString(v as string | number | null)
    if (s) out.push(s)
  }
  return [...new Set(out)]
}
