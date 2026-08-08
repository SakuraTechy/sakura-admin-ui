<template>
  <a-menu class="right-menu">
    <a-menu-item @click="onClick('add')">
      <template #icon><icon-plus-circle :size="16" :stroke-width="3" /></template>
      <span>新增</span>
    </a-menu-item>
    <a-menu-item @click="onClick('edit')">
      <template #icon><icon-edit :size="16" :stroke-width="3" /></template>
      <span>编辑</span>
    </a-menu-item>
    <a-menu-item @click="onClick('copy')">
      <template #icon><icon-copy :size="16" :stroke-width="3" /></template>
      <span>复制</span>
    </a-menu-item>
    <a-popover
      v-if="props.recordingOptions.length"
      position="right"
      trigger="hover"
      :content-style="{ padding: 0, overflow: 'hidden' }"
      :unmount-on-close="true"
    >
      <a-menu-item>
        <template #icon><icon-play-arrow :size="16" :stroke-width="3" /></template>
        <a-row justify="space-between" align="center">
          <span>{{ props.recordingLabel }}</span>
          <icon-right class="arrow-icon" />
        </a-row>
      </a-menu-item>
      <template #content>
        <a-doption v-for="item in props.recordingOptions" :key="item.mode" @click="onClick(item.mode)">
          {{ item.label }}
        </a-doption>
      </template>
    </a-popover>
    <a-popover
      v-if="props.executionOptions.length && canExecute"
      position="right"
      trigger="hover"
      :content-style="{ padding: 0, overflow: 'hidden' }"
      :unmount-on-close="true"
    >
      <a-menu-item :disabled="props.executionDisabled">
        <template #icon><icon-play-arrow :size="16" :stroke-width="3" /></template>
        <a-row class="submenu-row" justify="space-between" align="center">
          <span>{{ props.executionLabel }}</span>
          <icon-right class="arrow-icon" />
        </a-row>
      </a-menu-item>
      <template #content>
        <a-doption
          v-for="item in props.executionOptions"
          :key="item.mode"
          :disabled="props.executionDisabled"
          @click="onClick(item.mode)"
        >
          {{ item.label }}
        </a-doption>
      </template>
    </a-popover>
    <a-popover
      v-model:popup-visible="popupVisible"
      position="right"
      trigger="hover"
      :content-style="{ padding: 0, overflow: 'hidden' }"
      :unmount-on-close="true"
    >
      <a-menu-item @click="onClick('move')" @mouseenter="onClick('move')">
        <template #icon><icon-export :size="16" :stroke-width="3" /></template>
        <a-row justify="space-between" align="center">
          <span>移动</span>
          <icon-right class="arrow-icon" />
        </a-row>
      </a-menu-item>
      <template #content>
        <a-scrollbar style="height: 100%; overflow: auto" outer-style="width: 260px;height: 500px">
          <a-tree
            show-line
            size="mini"
            :data="props.treeData"
            :field-names="treeFieldNames"
            @select="onTreeSelect"
          >
            <template #title="node">
              <a-typography-paragraph :ellipsis="{ rows: 1, showTooltip: true, css: true }">
                {{ node?.name }}
              </a-typography-paragraph>
            </template>
          </a-tree>
        </a-scrollbar>
      </template>
    </a-popover>
    <a-popover
      position="right"
      trigger="hover"
      :content-style="{ padding: 0, overflow: 'hidden' }"
      :unmount-on-close="true"
    >
      <a-menu-item>
        <template #icon><icon-delete :size="16" :stroke-width="3" /></template>
        <!-- <span>删除</span> -->
        <a-row justify="space-between" align="center">
          <span>删除</span>
          <icon-right class="arrow-icon" />
        </a-row>
      </a-menu-item>
      <template #content>
        <a-doption @click="onClick('delete')">单个删除</a-doption>
        <a-doption @click="onClick('delete2')">多个删除（配合 Delete 使用）</a-doption>
        <!-- <a-dsubmenu value="option-1">
          <template #default>Option 2</template>
          <template #content>
            <a-doption>Option 2-1</a-doption>
            <a-doption>Option 2-3</a-doption>
          </template>
        </a-dsubmenu> -->
      </template>
    </a-popover>
  </a-menu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TreeInstance } from '@arco-design/web-vue'
import has from '@/utils/has'

defineOptions({ name: 'GiMenu' })

const props = defineProps({
  treeData: { type: Array, default: () => [] },
  recordingLabel: { type: String, default: '录制' },
  recordingOptions: { type: Array, default: () => [] },
  executionLabel: { type: String, default: '执行' },
  executionOptions: { type: Array, default: () => [] },
  executionDisabled: { type: Boolean, default: false },
})

const emit = defineEmits([
  'on-menu-item-click',
  'on-tree-node-click',
])

const popupVisible = ref(false)
const canExecute = computed(() => has.hasPerm('automation:automationUiScene:execute'))
const treeFieldNames = computed(() => props.treeData.some((item: any) => item?.treeKey)
  ? { key: 'treeKey', title: 'name', children: 'children' }
  : { key: 'id', title: 'name', children: 'children' })

const onClick = (mode: any) => {
  emit('on-menu-item-click', mode)
}

const onTreeSelect: TreeInstance['onSelect'] = (selectedKeys, data) => {
  popupVisible.value = false
  emit('on-tree-node-click', data.node)
}
</script>

<script lang="ts">
export default {}
</script>

<style lang="scss" scoped>
  :deep(.arco-menu-inner) {
    padding: 4px;
    .arco-menu-item {
      height: 34px;
      &:not(.arco-menu-selected) {
        color: $color-text-1;
      }
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  .right-menu {
    width: 132px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    border: 1px solid var(--color-border-2);
    box-sizing: border-box;
    .arrow-icon {
      flex: 0 0 auto;
      margin-right: 0;
    }
    .submenu-row {
      flex: 1;
      flex-wrap: nowrap;
      min-width: 0;
    }
  }
  </style>
