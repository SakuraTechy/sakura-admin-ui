<template>
  <div class="projected-scene-tree">
    <a-spin :loading="loading" class="projected-scene-tree__content">
      <div class="projected-scene-tree__scroll">
        <a-tree
          v-model:expanded-keys="expandedKeys"
          :selected-keys="selectedKeys"
          size="mini"
          :data="treeData"
          :show-line="true"
          :block-node="true"
          :draggable="!props.readonly"
          @select="onSelect"
          @expand="onExpand"
          @drop="onDrop"
        >
          <template #title="{ node }">
            <span class="projected-scene-tree__title">{{ node.title }}</span>
            <a-dropdown v-if="!props.readonly" @select="mode => emit('action', { mode, node })">
              <a-button size="mini" type="text" class="projected-scene-tree__action" @click.stop>
                <icon-more />
              </a-button>
              <template #content>
                <a-doption value="add">新增</a-doption>
                <a-doption value="edit">编辑</a-doption>
                <a-doption value="copy">复制</a-doption>
                <a-doption value="delete">删除</a-doption>
                <a-doption v-if="node.type === 'case'" value="recording:appendCase">追加录制</a-doption>
                <a-doption v-if="node.type === 'case'" value="recording:replaceCase">替换录制</a-doption>
                <a-doption v-if="node.type === 'step'" value="recording:appendStep">追加步骤</a-doption>
                <a-doption v-if="node.type === 'step'" value="recording:replaceStep">替换步骤</a-doption>
              </template>
            </a-dropdown>
          </template>
        </a-tree>
      </div>
      <a-pagination v-if="total > pageSize" v-model:current="page" size="small" :total="total" :page-size="pageSize" show-total @change="loadCases" />
    </a-spin>
    <a-alert v-if="errorMessage" type="error" class="projected-scene-tree__error">{{ errorMessage }}</a-alert>
  </div>
</template>

<script setup lang="ts">
import {
  loadAutomationUiDefinitionCase,
  loadAutomationUiDefinitionCases,
  loadAutomationUiDefinitionSteps,
  mapWithConcurrency,
} from '../queryCache'
import { moveCaseTree } from '@/apis/automation/automationUiScene'
import { canDropCaseTreeNode, nodeRefOf, toMovePosition } from '../caseTree'

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
  defaultExpandAll?: boolean
  readonly?: boolean
}>()
const emit = defineEmits<{
  (e: 'get-case', data: { node: { type: 'case', id: string, caseId: string }, caseData?: Record<string, unknown> }): void
  (e: 'get-step', data: { node: { type: 'step', id: string, stepId: string, caseId: string, pid: string, stepData?: Record<string, unknown> } }): void
  (e: 'nodes-change', nodes: Array<{ id: string, name: string, stepList: unknown[] }>): void
  (e: 'action', data: { mode: string, node: TreeNode }): void
  (e: 'refresh', selection?: { type: 'CASE' | 'STEP', caseId: string, stepId?: string }): void
}>()

const treeData = ref<TreeNode[]>([])
const page = ref(1)
const pageSize = 50
const total = ref(0)
const loading = ref(false)
const errorMessage = ref('')
const inFlight = new Map<string, Promise<Array<Record<string, unknown>>>>()
const stepCache = new Map<string, Array<Record<string, unknown>>>()
const stepDetails = new Map<string, Record<string, unknown>>()
const expandedKeys = ref<Array<string | number>>([])
const selectedKeys = computed(() => {
  const node = props.selectedNode
  if (!node) return []
  return [node.type === 'CASE' ? `case:${node.caseId}` : `step:${node.caseId}:${node.stepId}`]
})
let loadedSceneId = ''
const expandedPages = new Set<number>()

const loadCases = async (nextPage = page.value) => {
  page.value = nextPage
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await loadAutomationUiDefinitionCases(props.sceneDbId, page.value, pageSize)
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
    if (props.defaultExpandAll && !expandedPages.has(page.value)) {
      const pageKeys = treeData.value.filter(node => node.stepCount).map(node => node.key)
      expandedKeys.value = [...new Set([...expandedKeys.value, ...pageKeys])]
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

const onExpand = async (keys: Array<string | number>) => {
  await loadExpandedCases(keys)
}

async function loadExpandedCases(keys: Array<string | number>) {
  const expanded = new Set(keys.map(String))
  const nodes = treeData.value.filter(node => expanded.has(node.key) && !node.loaded && node.stepCount)
  await mapWithConcurrency(nodes, 3, async (node) => {
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
      } as TreeNode
    })
    node.loaded = true
    return undefined
  })
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
  void loadCases(sceneChanged ? 1 : page.value)
}, { immediate: true })
</script>

<style scoped lang="scss">
.projected-scene-tree { height: 100%; min-height: 240px; padding: 8px; box-sizing: border-box; display: flex; flex-direction: column; }
.projected-scene-tree__content { display: flex; flex: 1; min-height: 0; flex-direction: column; }
.projected-scene-tree__scroll { flex: 1; min-height: 0; overflow: auto; }
.projected-scene-tree :deep(.arco-pagination) { justify-content: flex-end; margin-top: 10px; }
.projected-scene-tree__error { margin-top: 8px; }
.projected-scene-tree__title { display: inline-flex; align-items: center; min-width: 0; }
.projected-scene-tree__action { margin-left: 6px; }
</style>
