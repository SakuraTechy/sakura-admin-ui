<template>
  <div v-if="indeterminate" class="execution-progress execution-progress--indeterminate" aria-label="执行中">
    <span><i></i></span><small>{{ indeterminateText }}</small>
  </div>
  <div v-else class="execution-progress">
    <a-progress
      :percent="displayPercent / 100"
      :show-text="false"
      size="small"
      :stroke-width="5"
    />
    <small>{{ progressText }}</small>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  progress?: number | null
  indeterminate?: boolean
  completed?: number | string
  total?: number | string
}>()
const normalized = computed(() => {
  const value = Number(props.progress)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
})
const displayPercent = computed(() => Number(normalized.value.toFixed(2)))
const total = computed(() => Math.max(0, Number(props.total) || 0))
const completed = computed(() => Math.min(total.value, Math.max(0, Number(props.completed) || 0)))
const progressText = computed(() => total.value > 0
  ? `${completed.value}/${total.value} · ${displayPercent.value}%`
  : `${displayPercent.value}%`)
const indeterminateText = computed(() => total.value > 0
  ? `${completed.value}/${total.value} · 执行中`
  : '执行中')
</script>

<style scoped lang="scss">
.execution-progress {
  display: flex;
  min-width: 110px;
  align-items: center;
  gap: 8px;
}

.execution-progress :deep(.arco-progress) {
  flex: 1;
}

.execution-progress :deep(.arco-progress-text) {
  display: none;
}

.execution-progress > small {
  // min-width: 42px;
  color: var(--color-text-2);
  font-size: 11px;
  text-align: right;
  white-space: nowrap;
}

.execution-progress small {
  // min-width: 42px;
  color: var(--color-text-2);
  font-size: 11px;
  text-align: right;
}

.execution-progress--indeterminate>span {
  position: relative;
  height: 5px;
  flex: 1;
  overflow: hidden;
  border-radius: 5px;
  background: var(--color-fill-3);
}

.execution-progress--indeterminate i {
  position: absolute;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: rgb(var(--primary-6));
  animation: progress-slide 1.25s ease-in-out infinite;
}

@keyframes progress-slide {
  from {
    left: -42%;
  }

  to {
    left: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .execution-progress--indeterminate i {
    left: 29%;
    animation: none;
  }
}
</style>
