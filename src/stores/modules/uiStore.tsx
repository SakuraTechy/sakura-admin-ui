import { defineStore } from 'pinia'
import { mapTree } from 'xe-utils'
import { IconCaretDown, IconCaretRight } from '@arco-design/web-vue/es/icon'
import GiSvgIcon from '@/components/GiSvgIcon/index.vue'
import { listUserDict } from '@/apis'
import { getProjectConfigList } from '@/apis/project/projectConfig'
import { getProjectVersionConfigList } from '@/apis/project/projectVersionConfig'
import type { LabelValueState } from '@/types/global'
import { type ProjectModuleConfigResp, listProjectModuleConfigTree } from '@/apis/project/projectModuleConfig'

export interface TreeCateItem extends ProjectModuleConfigResp {
  switcherIcon?: (node: TreeCateItem) => VNode
  icon?: (node: TreeCateItem) => VNode
  popupVisible?: boolean
  isEdit?: boolean
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    projectId: undefined as string | undefined,
    versionId: undefined as string | undefined,
    moduleId: undefined as string | undefined,
    projectList: [] as LabelValueState[],
    versionList: [] as LabelValueState[],
    userList: [] as LabelValueState[],
    treeList: [] as TreeCateItem[],
    loading: false,
    activeKey: '0',
    activeId: '',
    activeReadonly: false,
    activeCopy: false,
  }),
  persist: {
    key: 'ui-store', // 存储的键名
    storage: localStorage, // 使用 localStorage 进行存储
    // paths: ['projectId'], // 只对 projectId 字段进行持久化
  },
  actions: {
    resolveDefaultModuleId(treeList: TreeCateItem[]) {
      const exists = (items: TreeCateItem[], target?: string): boolean => {
        if (!target)
          return false
        return items.some((item) => String(item.id) === String(target) || exists(item.children as TreeCateItem[] || [], target))
      }
      if (exists(treeList, this.moduleId))
        return this.moduleId
      return treeList[0]?.id ? String(treeList[0].id) : ''
    },

    async fetchProjects() {
      const res = await getProjectConfigList({ status: 1, sort: ['name,desc'] })
      this.projectList = res.data.map((item) => ({ label: item.name, value: `${item.id}` }))
      // const uiStoreStr = localStorage.getItem('ui-store')
      // if (uiStoreStr) {
      //   const uiStore = JSON.parse(uiStoreStr)
      //   this.projectId = uiStore.projectId
      // }
      this.projectId = JSON.parse(localStorage.getItem('ui-store') ?? '{}').projectId ?? this.projectList[0]?.value
      // localStorage.setItem('projectId', this.projectId ?? '')
    },

    async fetchVersions(projectId?: string) {
      const res = await getProjectVersionConfigList({
        projectId: projectId ?? this.projectId,
        status: 1,
      })
      this.versionList = res.data.map((item) => ({
        label: item.name,
        value: `${item.id}`,
        extra: item.type,
      }))
      const preferred = this.versionList.find((item) => item.extra === 1 || item.extra === '1')
      this.versionId = preferred?.value ?? this.versionList[0]?.value
      // this.fetchTrees()
    },

    async fetchUsers() {
      const res = await listUserDict()
      this.userList = res.data.map((item) => ({ ...item, value: `${item.value}` }))
    },

    async fetchTrees(projectId?: string, versionId?: string) {
      try {
        this.loading = true
        const res = await listProjectModuleConfigTree({
          projectId: projectId ?? this.projectId,
          versionId: versionId ?? this.versionId,
          status: 1,
        })
        const data = Array.isArray(res.data) ? res.data : []
        if (!data.length) {
          this.treeList = []
          return
        }
        this.treeList = mapTree(data, (i) => ({
          ...i,
          popupVisible: false,
          isEdit: false,
          // switcherIcon: (node: any) => {
          //   if (node.expanded && !node.isLeaf) return <icon-tree-add />
          //   if (!node.expanded && !node.isLeaf) return <icon-tree-reduce style={{ transform: 'none' }} />
          //   if (node.expanded && !node.isLeaf) return <IconCaretDown />
          //   if (!node.expanded && !node.isLeaf) return <IconCaretRight />
          //   return null
          // },
          // icon: (node: any) => {
          //   if (node.expanded && !node.isLeaf) return <GiSvgIcon name="file-open" size={16}></GiSvgIcon>
          //   if (!node.expanded && !node.isLeaf) return <GiSvgIcon name="file-close" size={16}></GiSvgIcon>
          //   // return <GiSvgIcon name="folder" size={16}></GiSvgIcon>
          //   return <GiSvgIcon name="file" size={16}></GiSvgIcon>
          // },
        }))
        this.moduleId = this.resolveDefaultModuleId(this.treeList)
      } finally {
        this.loading = false
      }
    },

    refreshScene() {
      console.log('执行场景刷新逻辑')
    },
  },
})
