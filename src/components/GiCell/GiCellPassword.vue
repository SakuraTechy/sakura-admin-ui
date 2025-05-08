<template>
  <a-space v-if="showPassword && value" :size="[2]">
    <CellCopy :content="value" />
    <a-tooltip :content="hideTooltip">
      <a-button type="text" size="mini" @click="togglePassword(false)">
        <template #icon><icon-eye-invisible size="16" /></template>
      </a-button>
    </a-tooltip>
  </a-space>
  <a-space v-else :size="[2]">
    <span>**********</span>
    <a-tooltip :content="showTooltip">
      <a-button v-if="permission" v-permission="[permission]" type="text" size="mini" @click="togglePassword(true)">
        <template #icon><icon-eye size="16" /></template>
      </a-button>
      <a-button v-else type="text" size="mini" @click="togglePassword(true)">
        <template #icon><icon-eye size="16" /></template>
      </a-button>
    </a-tooltip>
  </a-space>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CellCopy from '../CellCopy/index.vue'
import type { GiCellPasswordType } from './type'

defineOptions({ name: 'GiCellPassword' })

const props = withDefaults(defineProps<Partial<GiCellPasswordType>>(), {
  value: '',
  onShow: undefined,
  onHide: undefined,
  showTooltip: '显示',
  hideTooltip: '隐藏',
  permission: '',
})

const emit = defineEmits(['update:value', 'show', 'hide'])
const showPassword = ref(false)

const togglePassword = async (show: boolean) => {
  if (show) {
    if (props.onShow) {
      const result = await props.onShow(show)
      if (typeof result === 'string') {
        emit('update:value', result)
      }
    }
    emit('show')
  } else {
    if (props.onHide) {
      props.onHide()
    }
    emit('hide')
  }
  showPassword.value = show
}
</script>

<style scoped lang="scss"></style>
