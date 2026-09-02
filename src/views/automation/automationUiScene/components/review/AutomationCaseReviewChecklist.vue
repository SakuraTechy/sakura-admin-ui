<template>
  <section class="side-section">
    <header><strong>人工评审清单</strong><span>{{ checkedCount }}/{{ items.length }}</span></header>
    <a-empty v-if="!items.length" description="暂无清单" />
    <label v-for="item in items" :key="item.code" class="checklist-item">
      <a-checkbox :model-value="item.checked" :disabled="!editable || loading" @change="$emit('change', item.code, Boolean($event))" />
      <span>{{ item.label }}</span>
    </label>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReviewChecklistItem } from '@/apis/automation/automationUiCaseReview'

const props = defineProps<{ items: ReviewChecklistItem[], editable: boolean, loading?: boolean }>()
defineEmits<{ (e: 'change', code: ReviewChecklistItem['code'], checked: boolean): void }>()
const checkedCount = computed(() => props.items.filter(item => item.checked).length)
</script>

<style scoped lang="scss">
.side-section { border-bottom: 1px solid var(--color-border-2); }
header { display: flex; min-height: 38px; align-items: center; justify-content: space-between; }
header span { color: var(--color-text-3); font-size: 12px; }
.checklist-item { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 7px; padding: 7px 0; color: var(--color-text-2); font-size: 12px; line-height: 1.5; cursor: pointer; }
</style>
