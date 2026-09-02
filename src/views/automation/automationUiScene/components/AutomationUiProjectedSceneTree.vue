<template>
  <div class="projected-scene-tree">
    <div class="projected-scene-tree__search">
      <a-input
        v-model="searchInput"
        size="small"
        allow-clear
        :maxlength="50"
        placeholder="搜索用例名称"
        @input="applySearch"
        @clear="applySearch"
        @press-enter="applySearch"
      >
        <template #prefix><icon-search /></template>
      </a-input>
    </div>
    <a-spin :loading="loading" class="projected-scene-tree__content">
      <div
        ref="scrollRef"
        class="projected-scene-tree__scroll"
        :style="{ overflow: virtualListProps ? 'hidden' : undefined }"
        @scroll="closeActionMenu"
      >
        <a-tree
          v-model:expanded-keys="expandedKeys"
          :class="{ 'projected-scene-tree__virtual': virtualListProps }"
          :selected-keys="selectedKeys"
          size="mini"
          :data="treeData"
          :show-line="true"
          :block-node="true"
          :draggable="!props.readonly"
          :load-more="onLoadMoreNode"
          :virtual-list-props="virtualListProps"
          @select="onSelect"
          @expand="onExpand"
          @drop="onDrop"
        >
          <!-- Arco 把 title 插槽当作 nodeTitle(treeNodeData, nodeStatus) 调用，
               插槽作用域就是节点数据本身，没有 node 这一层，写成 { node } 会拿到 undefined。 -->
          <template #title="node">
            <span class="projected-scene-tree__title" :title="String(node.title ?? '')">{{ node.title }}</span>
            <!-- 每行只留触发按钮，菜单本体是下方的单实例，避免每行一个 Trigger。 -->
            <a-button
              v-if="!props.readonly"
              size="mini"
              type="text"
              class="projected-scene-tree__action"
              @click.stop="openActionMenu($event, node)"
            >
              <icon-more />
            </a-button>
          </template>
        </a-tree>
      </div>
      <a-pagination v-if="total > pageSize" v-model:current="page" size="small" :total="total" :page-size="pageSize" show-total @change="loadCases" />
    </a-spin>
    <!-- 全树共用一个下拉菜单：锚点是固定定位的零尺寸元素，点击行按钮时移到该按钮处。 -->
    <a-dropdown
      v-model:popup-visible="actionMenuVisible"
      @select="onActionSelect"
    >
      <div class="projected-scene-tree__anchor" :style="actionAnchorStyle"></div>
      <template #content>
        <a-doption value="add">新增</a-doption>
        <a-doption value="edit">编辑</a-doption>
        <a-doption value="copy">复制</a-doption>
        <a-doption value="delete">删除</a-doption>
        <template v-if="actionNode?.type === 'case'">
          <a-doption value="recording:appendCase">追加录制</a-doption>
          <a-doption value="recording:replaceCase">替换录制</a-doption>
        </template>
        <template v-if="actionNode?.type === 'step'">
          <a-doption value="recording:appendStep">追加步骤</a-doption>
          <a-doption value="recording:replaceStep">替换步骤</a-doption>
        </template>
      </template>
    </a-dropdown>
    <a-alert v-if="errorMessage" type="error" class="projected-scene-tree__error">{{ errorMessage }}</a-alert>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn, useElementSize } from '@vueuse/core'
import {
  loadAutomationUiDefinitionCase,
  loadAutomationUiDefinitionCases,
  loadAutomationUiDefinitionSteps,
  mapWithConcurrency,
} from '../queryCache'
import { moveCaseTree } from '@/apis/automation/automationUiScene'
import { canDropCaseTreeNode, createStepNumberIcon, nodeRefOf, toMovePosition } from '../caseTree'

interface TreeNode {
  key: string
  treeKey: string
  title: string
  type: 'case' | 'step'
  caseId: string
  stepId?: string
  isLeaf?: boolean
  children?: TreeNode[]
  stepCount?: number
  loaded?: boolean
}

const props = defineProps<{
  sceneDbId: string | number
  definitionVersion: number
  selectedNode?: { type: 'CASE' | 'STEP', caseId: string, stepId?: string } | null
  /** 仅展开当前页第一个含步骤的用例。整页展开会在打开场景时触发 50 个步骤请求。 */
  defaultExpandFirst?: boolean
  readonly?: boolean
}>()
const emit = defineEmits<{
  (e: 'get-case', data: { node: { type: 'case', id: string, caseId: string }, caseData?: Record<string, unknown> }): void
  (e: 'get-step', data: { node: { type: 'step', id: string, stepId: string, caseId: string, pid: string, stepData?: Record<string, unknown> } }): void
  (e: 'nodes-change', nodes: Array<{ id: string, name: string, stepList: unknown[] }>): void
  (e: 'action', data: { mode: string, node: TreeNode }): void
  (e: 'refresh', selection?: { type: 'CASE' | 'STEP', caseId: string, stepId?: string }): void
}>()

// shallowRef：节点的 children 由 loadExpandedCases 就地写入，靠 triggerRef 统一提交，
// 避免每个用例展开都触发一次全树重渲染。
const treeData = shallowRef<TreeNode[]>([])
const scrollRef = ref<HTMLElement>()
const { height: scrollHeight } = useElementSize(scrollRef)
const VIRTUAL_THRESHOLD = 100
const page = ref(1)
const pageSize = 50
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')
const inFlight = new Map<string, Promise<Array<Record<string, unknown>>>>()
const stepCache = new Map<string, Array<Record<string, unknown>>>()
const stepDetails = new Map<string, Record<string, unknown>>()
const expandedKeys = ref<Array<string | number>>([])
// 投影模式的用例分页在后端，前端只持有当前页，无法本地过滤，
// 所以搜索必须走后端 keyword；loadAutomationUiDefinitionCases 已把它计入请求缓存键。
const keyword = ref('')
const searchInput = ref('')
const selectedKeys = computed(() => {
  const node = props.selectedNode
  if (!node) return []
  return [node.type === 'CASE' ? `case:${node.caseId}` : `step:${node.caseId}:${node.stepId}`]
})
let loadedSceneId = ''
const expandedPages = new Set<number>()

// 折叠用例的步骤不进 DOM，只按展开后的可见行数决定是否虚拟化。
const visibleRowCount = computed(() => {
  const expanded = new Set(expandedKeys.value.map(String))
  return treeData.value.reduce((total, node) => {
    const childCount = expanded.has(node.key) ? (node.children?.length || 0) : 0
    return total + 1 + childCount
  }, 0)
})

const virtualListProps = computed(() => {
  // 高度未测量时不能虚拟化，否则滚动容器高度为 0。
  if (scrollHeight.value <= 0 || visibleRowCount.value <= VIRTUAL_THRESHOLD) return undefined
  return { height: scrollHeight.value, estimatedSize: 26, buffer: 15 }
})

// 单实例操作菜单状态
const actionMenuVisible = ref(false)
const actionNode = shallowRef<TreeNode | null>(null)
const actionAnchor = ref({ left: 0, top: 0 })
const actionAnchorStyle = computed(() => ({
  left: `${actionAnchor.value.left}px`,
  top: `${actionAnchor.value.top}px`,
}))

const openActionMenu = (event: MouseEvent, node: TreeNode) => {
  const target = event.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  if (rect) actionAnchor.value = { left: rect.left, top: rect.bottom }
  actionNode.value = node
  actionMenuVisible.value = true
}

const closeActionMenu = () => {
  if (actionMenuVisible.value) actionMenuVisible.value = false
}

const onActionSelect = (mode: string | number | Record<string, any> | undefined) => {
  const node = actionNode.value
  if (!node) return
  actionMenuVisible.value = false
  emit('action', { mode: String(mode), node })
}

const loadCases = async (nextPage = page.value) => {
  page.value = nextPage
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await loadAutomationUiDefinitionCases(props.sceneDbId, page.value, pageSize, undefined, keyword.value)
    if (!response) return
    total.value = response.total
    treeData.value = response.items.map(item => ({
      key: `case:${item.caseId}`,
      treeKey: `case:${item.caseId}`,
      title: `${item.caseName || item.caseId} (${item.stepCount || 0})`,
      type: 'case',
      caseId: item.caseId,
      stepCount: item.stepCount || 0,
      isLeaf: !item.stepCount,
      children: [],
    }))
    if (props.defaultExpandFirst && !expandedPages.has(page.value)) {
      const firstKey = treeData.value.find(node => node.stepCount)?.key
      if (firstKey) expandedKeys.value = [...new Set([...expandedKeys.value, firstKey])]
      expandedPages.add(page.value)
    }
    // 定义版本刷新后节点对象会重建；只恢复用户当前页已经展开的用例，避免整场景预加载。
    await loadExpandedCases(expandedKeys.value)
    emit('nodes-change', response.items.map(item => ({ id: item.caseId, name: item.caseName || item.caseId, stepList: [] })))
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '投影用例读取失败'
  } finally {
    loading.value = false
  }
}

/**
 * 关键字变化后回到第 1 页：结果集换了，旧页码可能越界。
 * expandedKeys / expandedPages 也要清，否则上一批用例的展开态会让
 * defaultExpandFirst 判定为「本页已展开过」，新结果的首个用例反而不展开。
 */
const applySearch = useDebounceFn(() => {
  const next = searchInput.value.trim()
  if (next === keyword.value) return
  keyword.value = next
  expandedKeys.value = []
  expandedPages.clear()
  void loadCases(1)
}, 300)

const onExpand = async (keys: Array<string | number>) => {
  await loadExpandedCases(keys)
}

/** 拉取单个用例的步骤并写入 children，同一用例的并发请求共享一次网络往返。 */
async function attachSteps(node: TreeNode) {
  if (node.loaded || !node.stepCount) return
  const requestKey = `steps:${props.sceneDbId}:${props.definitionVersion}:${node.caseId}`
  let request = inFlight.get(requestKey)
  if (!request) {
    request = loadCaseSteps(node.caseId, node.stepCount)
    inFlight.set(requestKey, request)
    void request.finally(() => inFlight.delete(requestKey))
  }
  const steps = await request
  node.children = steps.map((step: any, index: number) => {
    const stepId = String(step.id || step.stepId || step.sourceStepId || `${node.caseId}-step-${index + 1}`)
    return {
      key: `step:${node.caseId}:${stepId}`,
      treeKey: `step:${node.caseId}:${stepId}`,
      title: step.name || step.stepName || stepId,
      type: 'step',
      caseId: node.caseId,
      stepId,
      isLeaf: true,
      switcherIcon: createStepNumberIcon(index + 1),
    } as TreeNode
  })
  node.loaded = true
}

/**
 * a-tree 的 load-more 回调。有了它，generateNode 才会采用节点自带的 isLeaf，
 * 否则 children 为空的折叠用例会被判成叶子，switcher 点击直接 return，用例永远展不开。
 * 步骤到位后 Arco 会自己把该节点标记为展开。
 */
const onLoadMoreNode = async (nodeData: Record<string, any>) => {
  const node = treeData.value.find(item => item.key === nodeData?.key)
  if (!node) return
  await attachSteps(node)
  treeData.value = [...treeData.value]
}

async function loadExpandedCases(keys: Array<string | number>) {
  const expanded = new Set(keys.map(String))
  const nodes = treeData.value.filter(node => expanded.has(node.key) && !node.loaded && node.stepCount)
  await mapWithConcurrency(nodes, 3, async (node) => {
    await attachSteps(node)
    return undefined
  })
  // 所有展开的用例写完 children 后只提交一次，取代原先每次赋值各触发一轮渲染。
  // 必须换掉顶层数组引用：a-tree 内部用 watchEffect 读 data 这一个 ref，
  // shallowRef 下就地改 children 不会被它感知，triggerRef 只能重渲染本组件。
  if (nodes.length) treeData.value = [...treeData.value]
}

async function loadCaseSteps(caseId: string, stepCount: number) {
  const cacheKey = `${props.sceneDbId}:${props.definitionVersion}:${caseId}`
  const cached = stepCache.get(cacheKey)
  if (cached) return cached
  const size = 100
  const pages = Math.max(1, Math.ceil(stepCount / size))
  const responses = await mapWithConcurrency(
    Array.from({ length: pages }, (_, index) => index + 1),
    3,
    current => loadAutomationUiDefinitionSteps(props.sceneDbId, caseId, current, size),
  )
  const items = responses.flatMap(response => response?.items || [])
  stepCache.set(cacheKey, items)
  items.forEach((step: any) => {
    const stepId = String(step.id || step.stepId || step.sourceStepId || '')
    if (stepId) stepDetails.set(`${caseId}:${stepId}`, step)
  })
  return items
}

const onSelect = async (_keys: Array<string | number>, data: { node?: TreeNode }) => {
  const node = data.node
  if (!node) return
  if (node.type === 'case') {
    const [caseResponse, steps] = await Promise.all([
      loadAutomationUiDefinitionCase(props.sceneDbId, node.caseId),
      loadCaseSteps(node.caseId, node.stepCount || 0),
    ])
    emit('get-case', {
      node: { type: 'case', id: node.caseId, caseId: node.caseId },
      caseData: { ...(caseResponse?.caseBody || {}), id: node.caseId, stepList: steps },
    })
  } else {
    emit('get-step', {
      node: {
        type: 'step',
        id: node.stepId || '',
        stepId: node.stepId || '',
        caseId: node.caseId,
        pid: node.caseId,
        stepData: stepDetails.get(`${node.caseId}:${node.stepId || ''}`),
      },
    })
  }
}

const onDrop = async (data: { dragNode?: TreeNode, dropNode?: TreeNode, dropPosition?: number }) => {
  if (props.readonly || !data.dragNode || !data.dropNode || data.dropPosition == null) return
  if (!canDropCaseTreeNode(data.dragNode as any, data.dropNode as any, data.dropPosition)) return
  const position = toMovePosition(data.dropPosition)
  if (!position) return
  try {
    const response = await moveCaseTree({
      source: nodeRefOf(data.dragNode as any),
      target: nodeRefOf(data.dropNode as any),
      position,
      expectedDefinitionVersion: props.definitionVersion,
    }, props.sceneDbId)
    if (response.data?.changed) emit('refresh', response.data.selectedNode || undefined)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '移动节点失败'
  }
}

watch(() => `${props.sceneDbId}:${props.definitionVersion}`, () => {
  const sceneChanged = loadedSceneId !== String(props.sceneDbId)
  loadedSceneId = String(props.sceneDbId)
  stepCache.clear()
  stepDetails.clear()
  if (sceneChanged) expandedKeys.value = []
  if (sceneChanged) expandedPages.clear()
  // 关键字属于上一个场景的检索意图，跨场景保留会让新场景只显示被旧词过滤后的用例。
  if (sceneChanged) {
    keyword.value = ''
    searchInput.value = ''
  }
  void loadCases(sceneChanged ? 1 : page.value)
}, { immediate: true })
</script>

<style scoped lang="scss">
// 在 flex 列容器中用 flex 撑满而非 height: 100%，配合 min-height: 0 才能让内部滚动区收缩。
.projected-scene-tree { flex: 1; height: 100%; min-height: 0; padding: 8px; box-sizing: border-box; display: flex; flex-direction: column; }
// flex: none 让搜索框保持自身高度，剩余空间全给下面的滚动区。
.projected-scene-tree__search { flex: none; margin-bottom: 8px; }
.projected-scene-tree__content { display: flex; flex: 1; min-height: 0; flex-direction: column; }
.projected-scene-tree__scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}
.projected-scene-tree__scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
.projected-scene-tree :deep(.arco-pagination) { justify-content: flex-end; margin-top: 10px; }
.projected-scene-tree__error { margin-top: 8px; }
.projected-scene-tree__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
// 标题与操作按钮共用一行，需要让标题可收缩才能出现省略号。
.projected-scene-tree :deep(.arco-tree-node-title-text) {
  display: flex;
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  overflow: visible;
}
.projected-scene-tree :deep(.arco-tree-node-title) { display: flex; width: 100%; min-width: 0; }
// 虚拟列表内部默认使用 overflow:auto，需同步关闭其横向滚动。
.projected-scene-tree :deep(.arco-virtual-list) { overflow-x: hidden !important; overflow-y: auto !important; }
.projected-scene-tree :deep(.automation-step-number) {
  display: inline-flex;
  width: 16px;
  justify-content: center;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 16px;
}
.projected-scene-tree__action {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  margin-left: 6px;
  padding: 0;
}
// 零尺寸固定定位锚点：菜单靠它定位，本身不可见也不参与布局与命中。
.projected-scene-tree__anchor {
  position: fixed;
  width: 0;
  height: 0;
  pointer-events: none;
}
// 仅虚拟滚动时需要撑满：虚拟列表自己是滚动容器，必须拿到确定高度。
.projected-scene-tree :deep(.projected-scene-tree__virtual) { height: 100%; }
</style>
