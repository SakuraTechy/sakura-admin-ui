<template>
  <div v-if="indeterminate" class="execution-progress execution-progress--indeterminate" aria-label="执行中">
    <span><i></i></span><small>执行中</small>
  </div>
  <div v-else class="execution-progress">
    <a-progress :percent="normalized / 100" size="small" :stroke-width="5" />
    <!-- <small>{{ formatPercent(normalized) }}</small> -->
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ progress?: number | null, indeterminate?: boolean }>()
const normalized = computed(() => Math.min(100, Math.max(0, Number(props.progress) || 0)))
function formatPercent(value: number) {
  return `${Math.round(value * 100) / 100}%`
}
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

.execution-progress small {
  min-width: 38px;
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
