<template>
  <div v-if="loading" class="gi-loading" :class="{ 'gi-loading--blur': blur }">
    <div class="gi-loading__content">
      <slot name="icon">
        <span class="gi-loading__spinner" />
      </slot>
      <span v-if="tip" class="gi-loading__tip">{{ tip }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'GiLoading' })

withDefaults(defineProps<{
  loading: boolean
  tip?: string
  blur?: boolean
}>(), {
  tip: '加载中...',
  blur: true,
})
</script>

<style lang="scss" scoped>
.gi-loading {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.28);
  pointer-events: all;

  &--blur {
    backdrop-filter: blur(1px);
  }

  &__content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(var(--primary-6), 0.15);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  &__spinner {
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(var(--primary-6), 0.2);
    border-top-color: rgb(var(--primary-6));
    box-sizing: border-box;
    transform-origin: center center;
    animation: gi-loading-spin 0.8s linear infinite;
  }

  &__tip {
    color: var(--color-text-2);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: 0.2px;
  }
}

@keyframes gi-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
