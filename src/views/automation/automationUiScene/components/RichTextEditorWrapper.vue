<template>
  <div id="editor">
    <AiEditor v-model="content" />
  </div>
</template>

<script setup lang="tsx">
import { ref } from 'vue'
import AiEditor from '@/views/system/notice/add/components/index.vue'

const content = ref('<h1>欢迎使用富文本编辑器</h1><p>这是一个现代化的富文本编辑器。</p>')
</script>

<style>
#editor {
    margin: auto;
    width: 90%;
    height: 580px;
}
</style>
