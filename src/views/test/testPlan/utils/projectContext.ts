import { mapTree } from 'xe-utils'
import { listProjectModuleConfigTree } from '@/apis/project/projectModuleConfig'
import type { LabelValueState } from '@/types/global'
import type { TreeCateItem } from '@/stores/modules/uiStore'
import { toIdString } from '@/utils/id'

export { toIdString }

/** 项目下拉：保证当前计划在列表中且 value 均为字符串 */
export const buildProjectSelectOptions = (
  list: LabelValueState[],
  currentId?: string | number | null,
  currentLabel?: string,
): LabelValueState[] => {
  const opts = list.map((item) => ({
    label: item.label,
    value: toIdString(item.value),
  }))
  const pid = toIdString(currentId)
  if (pid && !opts.some((o) => o.value === pid)) {
    opts.unshift({ label: currentLabel || pid, value: pid })
  }
  return opts
}

const isMainVersionType = (extra: unknown) => extra === 1 || extra === '1'

/** 解析默认场景版本（type=1 优先，否则首项，再尝试与计划名匹配） */
export const resolveVersionId = (
  versionList: LabelValueState[],
  plan?: { name?: string; abbreviate?: string },
): string => {
  if (!versionList.length) return ''
  const byType = versionList.find((item) => isMainVersionType(item.extra))
  if (byType) return toIdString(byType.value)
  const planName = plan?.name || plan?.abbreviate || ''
  if (planName) {
    const byName = versionList.find((item) => {
      const label = String(item.label || '')
      return label && (planName.includes(label) || label.includes(planName))
    })
    if (byName) return toIdString(byName.value)
  }
  return toIdString(versionList[0].value)
}

const moduleTreeCache = new Map<string, TreeCateItem[]>()

const buildModuleTreeCacheKey = (projectId: string, versionId: string) => `${projectId}|${versionId}`

/** 清除模块树缓存（项目/版本变更或模块结构变更后调用） */
export const invalidateModuleTreeCache = (projectId?: string, versionId?: string) => {
  if (projectId && versionId) {
    moduleTreeCache.delete(buildModuleTreeCacheKey(projectId, versionId))
    return
  }
  moduleTreeCache.clear()
}

/** 加载功能模块树（同 projectId+versionId 复用内存缓存，避免弹窗重复请求） */
export const loadModuleTree = async (
  projectId: string,
  versionId: string,
  options?: { force?: boolean },
): Promise<TreeCateItem[]> => {
  if (!projectId || !versionId) return []
  const cacheKey = buildModuleTreeCacheKey(projectId, versionId)
  if (!options?.force && moduleTreeCache.has(cacheKey)) {
    return moduleTreeCache.get(cacheKey)!
  }
  const res = await listProjectModuleConfigTree({
    projectId,
    versionId,
    status: 1,
  })
  const data = Array.isArray(res.data) ? res.data : []
  if (!data.length) {
    moduleTreeCache.set(cacheKey, [])
    return []
  }
  const list = mapTree(data, (i) => ({
    ...i,
    popupVisible: false,
    isEdit: false,
  })) as TreeCateItem[]
  moduleTreeCache.set(cacheKey, list)
  return list
}

/** 按测试计划初始化 uiStore 项目/版本（模块树由页面本地加载） */
export const initUiStoreForPlan = async (
  uiStore: ReturnType<typeof import('@/stores/modules/uiStore').useUiStore>,
  plan: { projectId?: string | number | null; projectName?: string; name?: string; abbreviate?: string },
) => {
  const projectId = toIdString(plan.projectId)
  if (!projectId) {
    return { projectId: '', versionId: '' }
  }

  const prevProjectId = toIdString(uiStore.projectId)
  if (!uiStore.projectList.length) {
    await uiStore.fetchProjects()
  }
  uiStore.projectId = projectId

  if (prevProjectId !== projectId || !uiStore.versionList.length) {
    await uiStore.fetchVersions(projectId)
  }
  let versionId = toIdString(uiStore.versionId)
  if (!versionId) {
    versionId = resolveVersionId(uiStore.versionList, plan)
    if (versionId) uiStore.versionId = versionId
  }

  if (!uiStore.userList.length) {
    await uiStore.fetchUsers()
  }
  return { projectId, versionId }
}
