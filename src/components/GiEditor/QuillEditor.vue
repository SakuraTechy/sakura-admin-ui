<template>
  <VueQuillEditor
    v-model="editorContent"
    :theme="theme"
    :toolbar="toolbar"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { QuillEditor as VueQuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import '@vueup/vue-quill/dist/vue-quill.bubble.css'

defineOptions({ name: 'GiQuillEditor' })

const props = withDefaults(defineProps<{
  theme?: 'snow' | 'bubble'
  toolbar?: 'full' | 'minimal' | 'none' | object | boolean
  content?: string
}>(), {
  theme: 'snow',
  toolbar: 'minimal',
  content: '11111111',
})

const emit = defineEmits(['update:content'])

const editorContent = ref(props.content ?? '')

// 保证父 prop 变化时，编辑器内容同步
watch(() => props.content, (val) => {
  if (val !== editorContent.value) {
    editorContent.value = val ?? ''
  }
}, { immediate: true })

// 编辑器内容变化时，通知父组件
watch(editorContent, (val) => {
  if (val !== props.content) {
    emit('update:content', val)
  }
})
</script>
