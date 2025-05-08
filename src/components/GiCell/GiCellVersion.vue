<template>
  <a-tag v-if="version" :color="getVersionColor(version)">{{ version }}</a-tag>
  <span v-else></span>
</template>

<script setup lang="ts">
import type { GiCellVersionType } from './type'

defineOptions({ name: 'GiCellVersion' })

const props = withDefaults(defineProps<GiCellVersionType>(), {
  version: '',
  presetColors: () => ({
    'CentOS': 'arcoblue',
    'Ubuntu': 'green',
    'Windows': 'purple',
    'Debian': 'orangered',
    'Alpine': 'blue',
    'Red Hat': 'red',
    'Mac': '#666',
    'iOS': '#333',
    'Android': '#87d068',
  }),
  defaultColor: 'gray',
})

// 根据系统类型获取颜色
const getVersionColor = (version: string): string => {
  // 检查版本字符串是否包含预设的颜色键
  for (const [key, color] of Object.entries(props.presetColors)) {
    if (version.includes(key)) {
      return color
    }
  }

  return props.defaultColor
}
</script>

<style scoped lang="scss"></style>
