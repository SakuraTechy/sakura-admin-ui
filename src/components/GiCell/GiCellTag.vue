<template>
  <span v-if="!dictItem"></span>
  <span v-else-if="!dictItem.extra">{{ dictItem.label }}</span>
  <a-tag v-else-if="extraObj && extraObj.color === 'primary'" color="arcoblue">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="extraObj && extraObj.color === 'success'" color="green">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="extraObj && extraObj.color === 'warning'" color="orangered">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="extraObj && extraObj.color === 'error'" color="red">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="extraObj && extraObj.color === 'default'" color="gray">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'primary'" color="arcoblue">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'success'" color="green">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'warning'" color="orangered">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'error'" color="red">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'default'" color="gray">{{ dictItem.label }}</a-tag>
  <a-tag v-else :color="extraObj?.color || dictItem.extra">{{ dictItem.label }}</a-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LabelValueState } from '@/types/global'
import type { GiCellTagType } from '@/components/GiCell/type'

defineOptions({ name: 'GiCellTag' })
const props = withDefaults(defineProps<Partial<GiCellTagType>>(), {
  dict: () => [{
    label: '',
    value: '',
  }],
  value: '',
})

const dictItem = computed((): LabelValueState => {
  try {
    return props.dict.find(
      (d) => d.value === String(props.value) || d.value === Number(props.value) || d.label === props.value,
    ) || { label: '', value: '' }
  } catch (error) {
    return { label: '', value: '' }
  }
})

// Parse extra field if it's a JSON string
const extraObj = computed(() => {
  if (!dictItem.value?.extra) return null

  try {
    // Check if extra is a JSON string
    if (typeof dictItem.value.extra === 'string'
      && (dictItem.value.extra.startsWith('{') || dictItem.value.extra.startsWith('['))) {
      return JSON.parse(dictItem.value.extra)
    }
  } catch (error) {
    console.error('Failed to parse extra field as JSON:', error)
  }

  return null
})
</script>

<style scoped lang="scss"></style>
