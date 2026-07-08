<template>
  <div v-if="data && data.length" class="gi-cell-tags">
    <a-tag v-if="data.length === 1" size="small">{{ data[0] }}</a-tag>
    <a-popover v-else :content-style="{ maxWidth: '300px', padding: '8px 12px' }">
      <a-tag color="arcoblue" size="small">{{ data.length }}</a-tag>
      <template #content>
        <a-space wrap>
          <a-tag v-for="(tag, index) in data" :key="index" size="small">
            {{ tag }}
          </a-tag>
        </a-space>
      </template>
    </a-popover>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'GiCellTags' })

withDefaults(defineProps<Props>(), {
  data: () => [],
})

interface Props {
  data: string[]
}
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss">
.gi-cell-tags {
  display: flex;
  justify-content: center;
  width: 100%;
}
</style>
