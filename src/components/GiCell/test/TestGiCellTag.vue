<template>
  <div>
    <h2>GiCellTag Test</h2>
    
    <h3>Test with JSON string in extra field</h3>
    <GiCellTag :dict="dictWithJsonExtra" value="1" />
    
    <h3>Test with direct color string in extra field</h3>
    <GiCellTag :dict="dictWithDirectExtra" value="2" />
    
    <h3>Test with no extra field</h3>
    <GiCellTag :dict="dictWithNoExtra" value="3" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GiCellTag from '../GiCellTag.vue'

const dictWithJsonExtra = ref([
  {
    label: "启用",
    value: "1",
    disabled: null,
    extra: "{\"color\": \"success\", \"description\": null}"
  },
  {
    label: "禁用",
    value: "2",
    disabled: null,
    extra: "{\"color\": \"error\", \"description\": null}"
  }
])

const dictWithDirectExtra = ref([
  {
    label: "直接颜色1",
    value: "1",
    disabled: null,
    extra: "primary"
  },
  {
    label: "直接颜色2",
    value: "2",
    disabled: null,
    extra: "warning"
  }
])

const dictWithNoExtra = ref([
  {
    label: "无颜色",
    value: "3",
    disabled: null
  }
])
</script>
