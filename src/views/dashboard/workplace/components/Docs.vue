<template>
  <a-card
    class="general-card"
    title="帮助文档"
    :header-style="{ paddingBottom: 0 }"
    :body-style="{ paddingTop: '5px' }"
    style="height: 166px"
  >
    <template #extra>
      <a-link href="https://sakura.hk.cn" target="_blank" rel="noopener">更多</a-link>
    </template>
    <a-row>
      <a-col v-for="link in links" :key="link.text" :span="12">
        <a-link
          :href="link.url"
          target="_blank"
          rel="noopener"
        >
          {{ link.text }}
        </a-link>
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup lang="ts">
const links = [
  { text: '产品简介', url: 'https://sakura.hk.cn/src/zh/1.使用指南/1.产品简介' },
  { text: '快速开始', url: 'https://sakura.hk.cn/src/zh/1.使用指南/2.快速开始' },
  { text: '本地开发', url: 'https://sakura.hk.cn/src/zh/1.使用指南/3.本地开发' },
  { text: '常见问题', url: 'https://sakura.hk.cn/src/zh/3.其它/1.常见问题' },
  { text: '问卷调查', url: 'https://sakura.hk.cn/src/zh/3.其它/2.问卷调查' },
  { text: '赞助支持 💖', url: 'https://sakura.hk.cn/src/zh/3.其它/3.赞助支持' },
]
</script>

<style lang="less" scoped>
.arco-card-body .arco-link {
  margin: 5px 0;
  color: rgb(var(--gray-8));
}
</style>
