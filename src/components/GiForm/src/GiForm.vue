<template>
  <div
    class="gi-form-root"
    :class="[attrs.class, { 'gi-form-search-card': showSearchCard }]"
    :style="rootStyle"
    v-bind="rootBindAttrs"
  >
  <a-form
    ref="formRef"
    v-bind="formProps"
    class="gi-form"
    :class="{
      'gi-form--search': props.search,
      'gi-form--search-rows': props.search && !!props.searchColumnsPerRow,
    }"
    :model="modelValue"
    :size="props.size ?? 'large'"
    :layout="resolvedLayout"
  >
    <!-- 搜索模式：左侧按行字段 + 右侧纵向操作栏（查询/重置/收起，对齐原筛选区） -->
    <div
      v-if="props.search && props.searchColumnsPerRow"
      class="gi-form__search-rows-layout"
      :style="searchRowsLayoutStyle"
    >
      <div class="gi-form__search-fields">
        <div
          v-for="(rowColumns, rowIndex) in columnRows"
          :key="rowIndex"
          class="gi-form__search-row"
        >
        <div
          class="gi-form__search-row-fields"
          :style="searchRowFieldsStyle"
        >
          <div
            v-for="entry in rowColumns"
            :key="entry.item.field"
            class="gi-form__search-field"
          >
            <GiFormFieldItem
              v-if="entry.visible"
              :item="entry.item"
              :model-value="modelValue"
              :disabled="isDisabled(entry.item)"
              :bind-props="getComponentBindProps(entry.item)"
              :rules="getFormItemRules(entry.item)"
              search-cell
              @update:model-value="updateValue($event, entry.item.field)"
            >
              <template v-if="$slots[entry.item.field]" #[entry.item.field]="slotData">
                <slot :name="entry.item.field" v-bind="slotData || {}" />
              </template>
            </GiFormFieldItem>
          </div>
        </div>
        </div>
      </div>
      <div class="gi-form__search-actions-rail">
        <div class="gi-form__search-actions-rail__btns">
          <a-button type="primary" class="gi-form__search-rail-query" :size="buttonSize" @click="emit('search')">
            <template #icon><icon-search /></template>
            <template #default>{{ props.searchBtnText }}</template>
          </a-button>
          <a-button class="gi-form__search-rail-reset" :size="buttonSize" @click="emit('reset')">
            <template #icon><icon-refresh /></template>
            <template #default>重置</template>
          </a-button>
          <a-button
            v-if="showFoldBtn"
            class="gi-form__fold-btn gi-form__search-rail-fold"
            type="text"
            size="mini"
            @click="collapsed = !collapsed"
          >
            <template #icon>
              <icon-up v-if="!collapsed" />
              <icon-down v-else />
            </template>
            <template #default>{{ collapsed ? '展开' : '收起' }}</template>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 搜索模式：默认网格 + 右侧纵向按钮 -->
    <template v-else-if="props.search">
      <a-grid class="gi-form__search-grid w-full" :col-gap="8" :row-gap="0" v-bind="props.gridProps">
        <template v-for="entry in visibleColumnEntries" :key="entry.item.field">
          <a-grid-item
            v-if="entry.visible"
            v-bind="entry.item.gridItemProps || defaultGridItemProps"
            :span="entry.item.span || entry.item.gridItemProps?.span || defaultGridItemProps?.span"
          >
            <GiFormFieldItem
              :item="entry.item"
              :model-value="modelValue"
              :disabled="isDisabled(entry.item)"
              :bind-props="getComponentBindProps(entry.item)"
              :rules="getFormItemRules(entry.item)"
              @update:model-value="updateValue($event, entry.item.field)"
            >
              <template v-if="$slots[entry.item.field]" #[entry.item.field]="slotData">
                <slot :name="entry.item.field" v-bind="slotData || {}" />
              </template>
            </GiFormFieldItem>
          </a-grid-item>
        </template>
      </a-grid>
      <div class="gi-form__search-actions">
        <a-button type="primary" :size="buttonSize" @click="emit('search')">
          <template #icon><icon-search /></template>
          <template #default>{{ props.searchBtnText }}</template>
        </a-button>
        <a-button :size="buttonSize" @click="emit('reset')">
          <template #icon><icon-refresh /></template>
          <template #default>重置</template>
        </a-button>
        <a-button
          v-if="showFoldBtn"
          class="gi-form__fold-btn"
          type="text"
          size="mini"
          @click="collapsed = !collapsed"
        >
          <template #icon>
            <icon-up v-if="!collapsed" />
            <icon-down v-else />
          </template>
          <template #default>{{ collapsed ? '展开' : '收起' }}</template>
        </a-button>
      </div>
    </template>

    <!-- 普通表单 -->
    <a-grid v-else class="w-full" :col-gap="8" :row-gap="0" v-bind="props.gridProps">
      <template v-for="entry in visibleColumnEntries" :key="entry.item.field">
        <a-grid-item
          v-if="entry.visible"
          v-bind="entry.item.gridItemProps || defaultGridItemProps"
          :span="entry.item.span || entry.item.gridItemProps?.span || defaultGridItemProps?.span"
        >
          <GiFormFieldItem
            :item="entry.item"
            :model-value="modelValue"
            :disabled="isDisabled(entry.item)"
            :bind-props="getComponentBindProps(entry.item)"
            :rules="getFormItemRules(entry.item)"
            @update:model-value="updateValue($event, entry.item.field)"
          >
            <template v-if="$slots[entry.item.field]" #[entry.item.field]="slotData">
              <slot :name="entry.item.field" v-bind="slotData || {}" />
            </template>
          </GiFormFieldItem>
        </a-grid-item>
      </template>
    </a-grid>
  </a-form>
  </div>
</template>

<script setup lang="ts">
import { cloneDeep, omit } from 'lodash-es'
import type { FormInstance, GridItemProps, GridProps } from '@arco-design/web-vue'
import type { CSSProperties } from 'vue'
import { computed, useAttrs } from 'vue'
import GiFormFieldItem from './GiFormFieldItem.vue'
import type { ColumnItem } from './type'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

interface Props {
  modelValue: any
  layout?: FormInstance['layout']
  size?: FormInstance['size']
  style?: CSSProperties
  labelColProps?: FormInstance['labelColProps']
  wrapperColProps?: FormInstance['wrapperColProps']
  labelAlign?: FormInstance['labelAlign']
  disabled?: FormInstance['disabled']
  rules?: FormInstance['rules']
  autoLabelWidth?: FormInstance['autoLabelWidth']
  id?: FormInstance['id']
  scrollToFirstError?: FormInstance['scrollToFirstError']
  columns: ColumnItem[]
  gridProps?: GridProps
  gridItemProps?: GridItemProps
  search?: boolean
  /** 搜索区每行字段数；设置后首行右侧为查询、末行右侧为重置 */
  searchColumnsPerRow?: number
  /** 筛选值变化时是否自动触发 search（默认 false，仅按钮触发） */
  searchOnChange?: boolean
  defaultCollapsed?: boolean
  searchBtnText?: string
  hideFoldBtn?: boolean
  suffix?: boolean
  /** search 模式下是否包裹边框卡片（GiTable #top 统一样式，默认开启） */
  searchCard?: boolean
  /** 双行搜索：控件区最小宽度，如 200 或 '12rem'，映射为 --gi-form-search-control-min-width */
  searchControlMinWidth?: number | string
  /** 双行搜索：标签列宽度，如 72，映射为 --gi-form-search-label-width */
  searchLabelWidth?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  autoLabelWidth: true,
  scrollToFirstError: true,
  defaultCollapsed: false,
  search: false,
  searchOnChange: true,
  gridItemProps: { span: { xs: 24, sm: 8, xxl: 8 } },
  searchBtnText: '查询',
  hideFoldBtn: false,
  suffix: true,
  searchCard: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'search'): void
  (e: 'reset'): void
}>()

const showSearchCard = computed(() => Boolean(props.search) && props.searchCard)
const buttonSize = computed(() => props.size ?? 'medium')
const rootBindAttrs = computed(() => {
  const { class: _cls, style: _style, ...rest } = attrs
  return rest
})

const toCssSize = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

const rootStyle = computed(() => {
  const base = { ...(attrs.style as CSSProperties | undefined) }
  if (props.searchControlMinWidth != null) {
    base['--gi-form-search-control-min-width'] = toCssSize(props.searchControlMinWidth)
  }
  if (props.searchLabelWidth != null) {
    base['--gi-form-search-label-width'] = toCssSize(props.searchLabelWidth)
  }
  return base
})

const resolvedLayout = computed(() => {
  if (props.search && props.searchColumnsPerRow) return 'vertical'
  if (props.layout) return props.layout
  if (props.search) return 'inline'
  return 'horizontal'
})

const searchRowFieldsStyle = computed(() => {
  const gap = props.gridProps?.colGap
  return typeof gap === 'number' ? { gap: `${gap}px` } : undefined
})

const formProps = computed(() => {
  const baseProps = omit(props, [
    'columns',
    'gridProps',
    'gridItemProps',
    'search',
    'searchColumnsPerRow',
    'searchOnChange',
    'defaultCollapsed',
    'searchBtnText',
    'hideFoldBtn',
    'suffix',
    'layout',
    'searchCard',
    'searchControlMinWidth',
    'searchLabelWidth',
  ])
  return { ...baseProps }
})

const defaultGridItemProps = computed(() => props.gridItemProps)

const formRef = useTemplateRef('formRef')
const collapsed = ref(props.defaultCollapsed)
const dicData: Record<string, any> = reactive({})

const STATIC_PROPS = new Map<ColumnItem['type'], Partial<ColumnItem['props']>>([
  ['input', { allowClear: true, maxLength: 255, showWordLimit: !props.search }],
  ['input-password', { allowClear: true, showWordLimit: !props.search }],
  ['textarea', { allowClear: false, maxLength: 200, showWordLimit: !props.search, autoSize: { minRows: 3, maxRows: 5 } }],
  ['input-tag', { allowClear: true }],
  ['mention', { allowClear: true }],
  ['select', { allowClear: true, allowSearch: true }],
  ['tree-select', { allowClear: true }],
  ['cascader', { allowClear: true }],
  ['date-picker', { allowClear: true }],
  ['time-picker', { allowClear: true }],
])

const labelPlain = (label: ColumnItem['label']) => {
  if (typeof label !== 'string') return ''
  return label.replace(/[：:]\s*$/, '')
}

const getPlaceholder = (item: ColumnItem) => {
  if (!item.type) return undefined
  const name = labelPlain(item.label)
  if (['input', 'input-number', 'input-password', 'textarea', 'input-tag', 'mention'].includes(item.type)) {
    return `请输入${name}`
  }
  if (['select', 'tree-select', 'cascader'].includes(item.type)) {
    return `请选择${name}`
  }
  if (['date-picker'].includes(item.type)) {
    return '请选择日期'
  }
  if (['time-picker'].includes(item.type)) {
    return '请选择时间'
  }
  return undefined
}

const getOptions = (item: ColumnItem): any[] | undefined => {
  if (!item.type) return undefined
  const arr = ['select', 'tree-select', 'cascader', 'radio-group', 'checkbox-group']
  if (arr.includes(item.type)) {
    return dicData[item.field] || []
  }
  return undefined
}

const getComponentBindProps = (item: ColumnItem) => {
  return {
    ...STATIC_PROPS.get(item.type) || {},
    placeholder: getPlaceholder(item),
    options: getOptions(item),
    ...item.props,
  }
}

const updateValue = (value: any, field: string) => {
  emit('update:modelValue', Object.assign(props.modelValue, { [field]: value }))
}

const getFormItemRules = (item: ColumnItem) => {
  if (item.required) {
    const defaultProps = getComponentBindProps(item)
    return [{ required: true, message: defaultProps.placeholder || `请输入${labelPlain(item.label)}` }, ...(Array.isArray(item.rules) ? item.rules : [])]
  }
  return item.rules
}

const isHide = (item: ColumnItem, index?: number) => {
  if (item.hide === undefined) return false
  if (typeof item.hide === 'boolean') return item.hide
  if (typeof item.hide === 'function') {
    return item.hide({
      ...props.modelValue,
      collapsed: collapsed.value,
      index,
    })
  }
  return false
}

const isShow = (item: ColumnItem, index?: number) => {
  if (item.show !== undefined) {
    if (typeof item.show === 'boolean') return item.show
    if (typeof item.show === 'function') {
      return item.show({
        ...props.modelValue,
        collapsed: collapsed.value,
        index,
      })
    }
  }
  return !isHide(item, index)
}

const isColumnVisible = (item: ColumnItem, index: number) => {
  if (item.foldable === true && collapsed.value) return false
  return item.show !== undefined ? isShow(item, index) : !isHide(item, index)
}

type ColumnEntry = { item: ColumnItem; index: number; visible: boolean }

const visibleColumnEntries = computed<ColumnEntry[]>(() =>
  props.columns.map((item, index) => ({
    item,
    index,
    visible: isColumnVisible(item, index),
  })).filter((entry) => entry.visible),
)

const columnRows = computed<ColumnEntry[][]>(() => {
  const per = props.searchColumnsPerRow
  const entries = visibleColumnEntries.value
  if (!per || per < 1) return [entries]
  const rows: ColumnEntry[][] = []
  for (let i = 0; i < entries.length; i += per) {
    rows.push(entries.slice(i, i + per))
  }
  return rows
})

/** 是否存在可被收起的字段 */
const hasFoldableColumn = computed(() => props.columns.some((item) => item.foldable === true))

/**
 * 是否展示收起/展开：存在 foldable 字段；双行布局且未收起时超过 2 行才显示（收起后仍保留按钮以便展开）
 */
const showFoldBtn = computed(() => {
  if (props.hideFoldBtn || !props.search) return false
  if (!hasFoldableColumn.value) return false
  if (collapsed.value) return true
  if (props.searchColumnsPerRow && columnRows.value.length <= 2) return false
  return true
})

/** 双行搜索：左侧行数 + 右侧操作栏行数（查询/重置/收起各占一行） */
const searchRowsLayoutStyle = computed(() => {
  const fieldRows = columnRows.value.length
  const railRows = showFoldBtn.value ? Math.max(fieldRows, 3) : Math.max(fieldRows, 2)
  return {
    '--search-row-count': fieldRows,
    '--search-rail-row-count': railRows,
  }
})

const isDisabled = (item: ColumnItem) => {
  if (item.disabled === undefined) return false
  if (typeof item.disabled === 'boolean') return item.disabled
  if (typeof item.disabled === 'function') {
    return item.disabled(props.modelValue)
  }
}

props.columns.forEach((item) => {
  if (item.request && typeof item.request === 'function' && item?.init) {
    item.request(props.modelValue).then((res) => {
      dicData[item.field] = item.resultFormat ? item.resultFormat(res) : res.data
    })
  }
})

const hasCascaderColumns: ColumnItem[] = []
props.columns.forEach((item) => {
  const arr = hasCascaderColumns.map((i) => i.field)
  if (item.cascader?.length && !arr.includes(item.field)) {
    hasCascaderColumns.push(item)
  }
})

const cloneForm = computed(() => cloneDeep(props.modelValue))
watch(cloneForm as any, (newVal, oldVal) => {
  hasCascaderColumns.forEach((item) => {
    if (newVal[item.field] !== oldVal[item.field]) {
      const arr = props.columns.filter((a) => item?.cascader?.includes(a.field))
      arr.forEach((i) => {
        if (i.request && Boolean(newVal[item.field])) {
          i.request(props.modelValue).then((res) => {
            dicData[i.field] = i.resultFormat ? i.resultFormat(res) : res.data
            if (!dicData[i.field].map((i: any) => i.value).includes(props.modelValue[i.field])) {
              emit('update:modelValue', Object.assign(props.modelValue, { [i.field]: Array.isArray(props.modelValue[i.field]) ? [] : '' }))
            }
          })
        } else if (i.request && !newVal[item.field]) {
          dicData[i.field] = []
          emit('update:modelValue', Object.assign(props.modelValue, { [i.field]: Array.isArray(props.modelValue[i.field]) ? [] : '' }))
        }
      })
    }
  })
  if (props.searchOnChange) {
    emit('search')
  }
})

defineExpose({ formRef })
</script>

<style lang="scss" scoped>
.gi-form-root {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.gi-form__fold-btn {
  padding: 0 5px;
}

.gi-form--search:not(.gi-form--search-rows) {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 12px;
  width: 100%;

  .gi-form__search-grid {
    flex: 1 1 0;
    min-width: 0;
  }

  .gi-form__search-actions {
    display: flex;
    flex: 0 0 100px;
    flex-direction: column;
    flex-shrink: 0;
    gap: 16px;
    align-items: stretch;
    justify-content: flex-start;
    min-width: 100px;

    :deep(.arco-btn) {
      width: 100%;
    }
  }
}

.gi-form--search-rows {
  --gi-form-search-control-min-width: 180px;
  --gi-form-search-cell-gap: 8px;
  display: block;
  width: 100%;

  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }

  .gi-form__search-rows-layout {
    display: flex;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 28px;
    width: 100%;
    min-width: 0;
  }

  .gi-form__search-fields {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .gi-form__search-row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-width: 0;
  }

  .gi-form__search-row-fields {
    display: flex;
    flex: 1 1 0;
    flex-wrap: nowrap;
    gap: 16px;
    align-items: center;
    min-width: 0;
  }

  .gi-form__search-field {
    flex: 1 1 0;
    min-width: max(
      0px,
      calc(
        var(--gi-form-search-label-width, 80px) + var(--gi-form-search-cell-gap, 8px)
          + var(--gi-form-search-control-min-width, 180px)
      )
    );
  }

  .gi-form__search-field :deep(.arco-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  .gi-form__search-actions-rail {
    display: flex;
    flex: 0 0 100px;
    flex-shrink: 0;
    align-items: stretch;
    min-width: 100px;
  }

  .gi-form__search-actions-rail__btns {
    display: grid;
    grid-template-rows: repeat(var(--search-rail-row-count, 2), minmax(32px, auto));
    row-gap: 16px;
    width: 100%;
    align-content: start;
  }

  .gi-form__search-rail-query {
    grid-row: 1;
    align-self: center;
    width: 100%;
  }

  .gi-form__search-rail-reset {
    grid-row: 2;
    align-self: center;
    width: 100%;
  }

  .gi-form__search-rail-fold {
    grid-row: 3;
    align-self: center;
    justify-self: center;
    width: auto;
    padding: 10px;
    white-space: nowrap;
  }
}

:deep(.arco-col) {
  overflow: revert !important;
}
</style>

<!-- 筛选卡片边框：非 scoped，避免动态 class 在部分场景下未命中 -->
<style lang="scss">
.gi-form-search-card {
  --gi-form-search-label-width: 80px;
  --gi-form-search-control-min-width: 180px;
  --gi-form-search-cell-gap: 8px;
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 12px;
  padding: 16px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);

  .gi-form--search-rows,
  .gi-form--search {
    :deep(.arco-form-item) {
      margin-bottom: 0;
    }

    :deep(.arco-form-item-content) {
      margin-left: 0 !important;
    }
  }
}
</style>
