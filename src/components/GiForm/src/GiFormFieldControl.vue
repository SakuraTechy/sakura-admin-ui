<template>
  <template v-if="item.type === 'range-picker'">
    <DateRangePicker
      v-bind="(item.props as A.RangePickerInstance['$props'])"
      :model-value="modelValue[item.field as keyof typeof modelValue]"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </template>
  <template v-else-if="item.type === 'custom' && item.slots?.default">
    <component :is="item.slots.default" />
  </template>
  <component
    :is="`a-${item.type}`"
    v-else
    v-bind="bindProps"
    :model-value="modelValue[item.field as keyof typeof modelValue]"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-for="(slotValue, slotKey) in item?.slots" :key="slotKey" #[slotKey]="scope">
      <template v-if="typeof slotValue === 'string'">{{ slotValue }}</template>
      <template v-else-if="slotValue">
        <component :is="slotValue(scope)" />
      </template>
    </template>
  </component>
</template>

<script setup lang="ts">
import type * as A from '@arco-design/web-vue'
import type { ColumnItem } from './type'

defineProps<{
  item: ColumnItem
  modelValue: Record<string, any>
  bindProps?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()
</script>
