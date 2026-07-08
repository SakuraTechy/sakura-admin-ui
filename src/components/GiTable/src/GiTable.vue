<template>
  <div
    class="gi-table" :class="{
      'gi-table--fullscreen': isFullscreen,
      'gi-table--has-selection': hasSelectedItems,
    }"
  >
    <a-row v-if="props.title" justify="space-between" align="center" class="gi-table__header">
      <a-space wrap>
        <slot name="custom-title">
          <div class="gi-table__header-title">{{ props.title }}</div>
        </slot>
      </a-space>
    </a-row>
    <a-row>
      <slot name="top"></slot>
    </a-row>
    <a-row justify="space-between" align="center" class="gi-table__toolbar">
      <a-space wrap class="gi-table__toolbar-left" :size="[8, 8]">
        <slot name="toolbar-left"></slot>
      </a-space>
      <a-space wrap class="gi-table__toolbar-right" :size="[8, 8]">
        <slot name="toolbar-right"></slot>
        <!-- 斑马纹开关 -->
        <a-tooltip content="斑马纹">
          <a-switch v-model="stripe" size="small" type="round" />
        </a-tooltip>
        <!-- 边框显示按钮 -->
        <a-tooltip content="显示边框">
          <a-button size="mini" class="gi_hover_btn" @click="toggleBorder">
            <template #icon><icon-borders /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip content="刷新">
          <a-button v-if="showRefreshBtn" @click="handleRefresh">
            <template #icon><icon-refresh /></template>
          </a-button>
        </a-tooltip>
        <!-- 表格尺寸设置 -->
        <a-dropdown v-if="showSizeBtn" @select="handleSizeChange">
          <a-tooltip content="尺寸">
            <a-button>
              <template #icon><icon-table-size style="width: 14px; height: 14px" /></template>
            </a-button>
          </a-tooltip>
          <template #content>
            <a-doption v-for="item in TABLE_SIZE_OPTIONS" :key="item.value" :value="item.value" :active="item.value === size">
              {{ item.label }}
            </a-doption>
          </template>
        </a-dropdown>
        <!-- 列设置按钮 -->
        <a-tooltip content="列设置">
          <ColumnSetting
            v-if="showSettingColumnBtn"
            ref="columnSettingRef"
            v-model:columns="innerColumns"
            :disabled-keys="disabledColumnKeys"
            :table-id="tableId"
            @visible-columns-change="handleVisibleColumnsChange"
          />
        </a-tooltip>
        <a-tooltip content="全屏">
          <a-button v-if="showFullscreenBtn" @click="toggleFullscreen">
            <template #icon>
              <icon-fullscreen v-if="!isFullscreen" />
              <icon-fullscreen-exit v-else />
            </template>
          </a-button>
        </a-tooltip>
      </a-space>
    </a-row>
    <!-- <a-row class="gi-table__toolbar-bottom">
      <template v-if="props.showSelectionAlert && selectedKeys?.length > 0">
        <a-alert :type="props.selectionAlertType">
          <template v-if="selectedKeys && selectedKeys.length > 0">
            {{ props.selectionMessage || `已选中 ${selectedKeys.length} 条记录(可跨页)` }}
          </template>
          <template v-else>
            {{ props.noSelectionMessage || '未选中任何记录' }}
          </template>
          <template v-if="selectedKeys && selectedKeys.length > 0" #action>
            <a-link @click="handleClearSelected">清空</a-link>
          </template>
        </a-alert>
      </template>
      <slot name="toolbar-bottom"></slot>
    </a-row> -->
    <div class="gi-table__body" :class="`gi-table__body-pagination-${tableProps['page-position']}`">
      <div class="gi-table__container">
        <a-table
          ref="tableRef"
          v-bind="tableProps"
          :loading="false"
          :stripe="stripe"
          :size="size"
          :bordered="{ cell: isBordered }"
          :columns="visibleColumns"
          :scrollbar="true"
          :data="data"
          column-resizable
          :pagination="props.pagination === false ? false : {
            ...props.pagination,
            showJumper: true,
            showMore: true,
            pageSizeOptions: props.pagination?.pageSizeOptions ?? [10, 20, 30, 40, 50, 100],
            size: 'small',
          }"
          @change="handleTableChange"
        >
          <template v-for="key in forwardedSlotKeys" :key="key" #[key]="scope">
            <slot :key="key" :name="key" v-bind="scope" />
          </template>
          <!-- 自定义分页左侧的选中提示 -->
          <template v-if="selectedKeys && selectedKeys.length > 0" #pagination-left>
            <div class="gi-table-selection-info">
              <span>{{ props.selectionMessage || `已选中 ${selectedKeys.length} 条记录(可跨页)` }}</span>
              <a-link class="clear-link" @click="handleClearSelected">清空</a-link>
            </div>
          </template>
        </a-table>
        <GiLoading :loading="tableLoading.loading" :tip="tableLoading.tip">
          <template v-if="slots['loading-icon']" #icon>
            <slot name="loading-icon" />
          </template>
        </GiLoading>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends TableData">
import { computed, ref, watch } from 'vue'
import type { DropdownInstance, TableColumnData, TableData, TableInstance } from '@arco-design/web-vue'
import { omit } from 'lodash-es'
import type { TableProps } from './type'
import type ColumnSetting from './components/ColumnSetting.vue'
import GiLoading from '@/components/GiLoading/index.vue'

defineOptions({ name: 'GiTable' })

// Props 默认值
const props = withDefaults(defineProps<Props>(), {
  title: '',
  loadingTip: '加载中...',
  disabledColumnKeys: () => [],
  disabledTools: () => [],
  data: () => [],
  showSelectionAlert: false,
  selectionAlertType: 'info',
})

/** Emits 类型定义 */
const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'update:columns', columns: TableColumnData[]): void
  (e: 'change', ...args: any[]): void
  (e: 'clear-selected'): void
  (e: 'update:selectedKeys', keys: (string | number)[]): void
}>()

/** Slots 类型定义 */
defineSlots<{
  'th': (props: { column: TableColumnData }) => void
  'thead': () => void
  'empty': (props: { column: TableColumnData }) => void
  'summary-cell': (props: { column: TableColumnData, record: T, rowIndex: number }) => void
  'pagination-right': () => void
  'pagination-left': () => void
  'td': (props: { column: TableColumnData, record: T, rowIndex: number }) => void
  'tr': (props: { record: T, rowIndex: number }) => void
  'tbody': () => void
  'drag-handle-icon': () => void
  'footer': () => void
  'expand-row': (props: { record: T }) => void
  'expand-icon': (props: { record: T, expanded?: boolean }) => void
  'columns': () => void
  'custom-title': () => void
  'top': () => void
  'toolbar-left': () => void
  'toolbar-right': () => void
  'toolbar-bottom': () => void
  'loading-icon': () => void
  [propsName: string]: (props: { key: string, record: T, column: TableColumnData, rowIndex: number }) => void
}>()

/** Props 类型定义 */
interface Props extends TableProps {
  /** 表格标题 */
  title?: string
  size?: TableInstance['size']
  /** 禁止控制显示隐藏的列 */
  disabledColumnKeys?: string[]
  /** 禁止显示的工具 */
  disabledTools?: string[]
  /** 表格数据 */
  data: T[]
  /** 表格标识，用于存储列设置 */
  tableId?: string
  /** 加载提示文案 */
  loadingTip?: string
  /** 是否显示选中项提示 */
  showSelectionAlert?: boolean
  /** 提示类型 */
  selectionAlertType?: 'info' | 'success' | 'warning' | 'error'
  /** 选中时的提示信息 */
  selectionMessage?: string
  /** 未选中时的提示信息 */
  noSelectionMessage?: string
}

const slots = useSlots()
const attrs = useAttrs()
const forwardedSlotKeys = computed(() => Object.keys(slots).filter(key => key !== 'loading-icon'))

/** 组件状态 */
const tableRef = useTemplateRef('tableRef')
// 定义 ColumnSetting 组件暴露的方法接口
interface ColumnSettingInstance {
  resetColumns?: () => void
  saveColumns?: () => void
}
// 使用接口标注 ref 类型
const columnSettingRef = ref<ColumnSettingInstance | null>(null)
const stripe = ref(false)
const size = ref<TableInstance['size']>(props.size ?? 'large')
const isBordered = ref(false)
const isFullscreen = ref(false)

/** 表格尺寸选项 */
const TABLE_SIZE_OPTIONS = [
  { label: '迷你', value: 'mini' },
  { label: '小型', value: 'small' },
  { label: '中等', value: 'medium' },
  { label: '大型', value: 'large' },
] as const

/** 切换边框显示 */
const toggleBorder = () => {
  isBordered.value = !isBordered.value
}

/** 处理表格尺寸变更 */
const handleSizeChange: DropdownInstance['onSelect'] = (value) => {
  if (value) {
    size.value = value as TableInstance['size']
  }
}

/** 处理表格刷新 */
const handleRefresh = () => {
  emit('refresh')
}

/** 切换全屏状态 */
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const showRefreshBtn = computed(() => !props.disabledTools?.includes('refresh'))
const showSizeBtn = computed(() => !props.disabledTools?.includes('size'))
const showFullscreenBtn = computed(() => !props.disabledTools?.includes('fullscreen'))
/** 列设置相关逻辑 */
const showSettingColumnBtn = computed(() => {
  const columns = props.columns as TableColumnData[] | undefined
  return !props.disabledTools?.includes('setting') && Boolean(columns?.length)
})

/** 内部维护列数据 */
const innerColumns = ref<TableColumnData[]>([])

/** 监听 props.columns 变化 */
watch(() => props.columns, (newColumns) => {
  if (newColumns && innerColumns.value.length === 0) {
    innerColumns.value = [...newColumns]
  }
}, { immediate: true })

/** 实际显示的列（由ColumnSetting组件计算） */
const tableColumns = ref<TableColumnData[]>([])

/** 处理列设置组件的可见列变化 */
const handleVisibleColumnsChange = (columns: TableColumnData[]) => {
  tableColumns.value = columns
}

/** 表格属性计算 */
const tableProps = computed(() => ({
  ...omit(props, ['title', 'loading', 'loadingTip', 'disabledColumnKeys', 'disabledTools', 'showSelectionAlert', 'selectionAlertType', 'selectionMessage', 'noSelectionMessage']),
  ...attrs,
}))

const tableLoading = computed<{ loading: boolean, tip?: string }>(() => {
  const loading = props.loading
  if (typeof loading === 'boolean') {
    return { loading, tip: props.loadingTip }
  }
  if (!loading) {
    return { loading: false, tip: props.loadingTip }
  }
  return {
    loading: Boolean((loading as any).loading),
    tip: props.loadingTip,
    ...(loading || {}),
  }
})

/** 获取绑定的selectedKeys */
const selectedKeys = computed(() => tableProps.value.selectedKeys)

/** 清空所有选中数据 */
const handleClearSelected = () => {
  // 直接更新selectedKeys为空数组，实现双向绑定清空
  emit('update:selectedKeys', [])
  // 触发清空选中事件，让外部也能监听到清空操作
  // emit('clear-selected')
}

/** 计算显示的列 */
const visibleColumns = computed(() => {
  // 如果tableColumns有值，使用tableColumns
  if (tableColumns.value && tableColumns.value.length > 0) {
    return tableColumns.value
  }

  // 否则使用原始的columns
  return props.columns?.filter((col) => col.show !== false) || []
})

// 处理表格变化的函数
const handleTableChange = (...args: any[]) => {
  // 将接收到的参数传递给父组件
  emit('change', ...args)
}

// 计算是否有选中项
const hasSelectedItems = computed(() => {
  return !!(selectedKeys.value && selectedKeys.value.length > 0)
})

defineExpose({
  tableRef,
  resetColumns: () => columnSettingRef.value?.resetColumns?.(),
  saveColumns: () => columnSettingRef.value?.saveColumns?.(),
})
</script>

<style lang="scss" scoped>
.gi-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  background: var(--color-bg-1);
  position: relative;
  box-sizing: border-box;
  &--fullscreen {
    padding: $padding;
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 1001;
  }

  // 当有选中项时强制应用两端对齐
  &--has-selection :deep(.arco-table-pagination) {
    justify-content: space-between !important;
  }

  &__container {
    max-height: 100%;
    overflow: hidden;
    flex: 1;

    // 控制table高度占满
    :deep(.arco-table-border:not(.arco-table-border-cell) .arco-table-container) {
      height: 100%;
    }

    :deep(.arco-table-container) {
      flex: 1;
    }

    :deep(.arco-table-body) {
      height: 100%;
    }

    // 控制表格最后一行的下边框显示
    :deep(.arco-table-border .arco-table-scroll-y .arco-table-body .arco-table-tr:last-of-type .arco-table-td,
      .arco-table-border .arco-table-scroll-y tfoot .arco-table-tr:last-of-type .arco-table-td) {
      border-bottom: 1px solid var(--color-border-table);
    }
  }

  &__body {

    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: auto;

    //如果为空时，将表格铺满
    :deep(.arco-table-element):has(tbody .arco-table-tr-empty) {
      height: 100%;
    }

    // 选中提示的样式
    .gi-table-selection-info {
      color: var(--color-text-2);
      font-size: 14px;
      display: flex;
      align-items: center;
      margin-right: auto;
      gap: 10px;
    }

    // 分页默认位置
    :deep(.arco-pagination) {
      margin-top: 10px;
      justify-content: end;
    }

    :deep(.arco-table-pagination) {
      display: flex;
      align-items: baseline;
      margin-top: 12px;
      justify-content: flex-end;
    }

    &-pagination-top {
      flex-direction: column-reverse;

      :deep(.arco-pagination) {
        margin-bottom: 10px;
        justify-content: center;
      }
    }

    // 上
    &-pagination-t {
      &l {
        flex-direction: column-reverse;

        :deep(.arco-pagination) {
          margin-bottom: 10px;
          justify-content: start;
        }
      }

      &r {
        flex-direction: column-reverse;

        :deep(.arco-pagination) {
          margin-bottom: 10px;
          justify-content: end;
        }
      }
    }

    //下
    &-pagination-bottom {
      :deep(.arco-pagination) {
        margin-top: 10px;
        justify-content: center;
      }
    }

    &-pagination-b {
      &l {
        :deep(.arco-pagination) {
          margin-top: 10px;
          justify-content: start;
        }
      }

      &r {
        :deep(.arco-pagination) {
          margin-top: 10px;
          justify-content: end;
        }
      }
    }

    :deep(.link-text.arco-typography) {
      color: rgb(var(--link-6));
    }
  }

  &__header {
    padding: 0 0 10px;

    &-title {
      color: var(--color-text-1);
      font-size: 18px;
      font-weight: 500;
      line-height: 1.5;
    }
  }

  &__toolbar {
    padding: 0px 0 10px 0;
    :deep(.arco-form-item-layout-inline) {
      margin-right: 8px;

      &:last-of-type {
        margin-right: 0;
      }
    }

    :deep(.arco-form-layout-inline .arco-form-item) {
      margin-bottom: 0;
    }

    &-bottom {
      margin-bottom: 8px;
    }
  }

  &__draggable {
    padding: 1px 0; // 解决 max-height 和 overflow:auto 始终显示垂直滚动条问题
    max-height: 250px;
    box-sizing: border-box;
    overflow: hidden;
    overflow-y: auto;
  }

}

.drag-item {
  display: flex;
  align-items: center;

  cursor: pointer;

  &:hover {
    background-color: var(--color-fill-2);
  }

  &__move {
    padding-left: 2px;
    padding-right: 2px;
    cursor: move;
  }

  :deep(.arco-checkbox) {
    width: 100%;
    font-size: 12px;

    .arco-checkbox-icon {
      width: 14px;
      height: 14px;
    }
  }
}
</style>
