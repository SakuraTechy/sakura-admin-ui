<template>
  <a-form-item
    v-bind="item.formItemProps"
    :field="item.field"
    :rules="rules"
    :disabled="disabled"
    :layout="searchCell ? 'horizontal' : layout"
    :hide-label="searchCell || item.formItemProps?.hideLabel"
    :class="{ 'gi-form-field-item--search-cell': searchCell }"
    :style="item?.style"
  >
    <template v-if="!searchCell" #label>
      <template v-if="typeof item.label === 'string'">
        <span :style="item?.style">{{ item.label }}</span>
      </template>
      <component :is="item.label" v-else :style="item.style" />
    </template>
    <div v-if="searchCell" class="gi-form__search-cell">
      <span class="gi-form__search-cell-label">
        <template v-if="typeof item.label === 'string'">{{ item.label }}</template>
        <component :is="item.label" v-else />
      </span>
      <div class="gi-form__search-cell-control">
        <slot
          v-if="!['group-title'].includes(item.type || '')"
          :name="item.field"
          v-bind="{ disabled }"
        >
          <GiFormFieldControl
            :item="item"
            :model-value="modelValue"
            :bind-props="bindProps"
            @update:model-value="emit('update:modelValue', $event)"
          />
        </slot>
      </div>
    </div>
    <template v-else>
      <slot
        v-if="!['group-title'].includes(item.type || '')"
        :name="item.field"
        v-bind="{ disabled }"
      >
        <GiFormFieldControl
          :item="item"
          :model-value="modelValue"
          :bind-props="bindProps"
          @update:model-value="emit('update:modelValue', $event)"
        />
      </slot>
      <slot v-else name="group-title">
        <a-alert v-bind="item.props">{{ item.label }}</a-alert>
      </slot>
    </template>
    <template v-for="(slotValue, slotKey) in item?.formItemSlots" :key="slotKey" #[slotKey]>
      <template v-if="typeof slotValue === 'string'">{{ slotValue }}</template>
      <component :is="slotValue" v-else />
    </template>
  </a-form-item>
</template>

<script setup lang="ts">
import GiFormFieldControl from './GiFormFieldControl.vue'
import type { ColumnItem } from './type'

defineProps<{
  item: ColumnItem
  modelValue: Record<string, any>
  disabled?: boolean
  bindProps?: Record<string, any>
  rules?: ColumnItem['rules']
  layout?: 'horizontal' | 'vertical' | 'inline'
  /** 双行搜索：标签 + 控件行内排列（对齐 plan-query-cell） */
  searchCell?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()
</script>

<style lang="scss" scoped>
.gi-form-field-item--search-cell {
  width: 100%;
  margin-bottom: 0;

  :deep(.arco-form-item-content) {
    flex: 1;
    min-width: 0;
  }
}

.gi-form__search-cell {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--gi-form-search-cell-gap, 8px);
  align-items: center;
  width: 100%;
  min-width: 0;
}

.gi-form__search-cell-label {
  box-sizing: border-box;
  flex: 0 0 var(--gi-form-search-label-width, 80px);
  width: var(--gi-form-search-label-width, 80px);
  padding: 0 4px 0 0;
  color: var(--color-text-2);
  font-weight: 500;
  font-size: 14px;
  line-height: 32px;
  text-align: right;
  white-space: nowrap;
}

.gi-form__search-cell-control {
  flex: 1 1 0;
  min-width: var(--gi-form-search-control-min-width, 180px);

  :deep(.arco-select),
  :deep(.arco-input-wrapper),
  :deep(.arco-input-number),
  :deep(.arco-picker) {
    width: 100%;
    max-width: 100%;
  }
}
</style>
