<template>
  <a-card class="general-card" title="我的项目">
    <template #extra>
      <a-dropdown>
        <a-link>更多</a-link>
        <template #content>
          <a-doption>
            <a-link href="https://gitee.com/SakuraTechy" target="_blank" rel="noopener">Gitee</a-link>
          </a-doption>
          <a-doption>
            <a-link href="https://github.com/SakuraTechy" target="_blank" rel="noopener">GitHub</a-link>
          </a-doption>
          <a-doption>
            <a-link href="https://gitcode.com/SakuraTechy" target="_blank" rel="noopener">GitCode</a-link>
          </a-doption>
        </template>
      </a-dropdown>
    </template>
    <a-row :gutter="[14, 14]">
      <a-col
        v-for="(item, index) in list"
        :key="index"
        :xs="24"
        :sm="24"
        :md="12"
        :lg="12"
        :xl="8"
        :xxl="8"
      >
        <a-card :bordered="true" hoverable>
          <div class="badge badge-right" :style="`background-color: ${item.statusColor}`">{{ item.status }}</div>
          <a-card-meta>
            <template #title>
              <a-space>
                <img :src="item.logo" style="margin: -10px;" width="45px" height="45px" alt="logo" />
                <a-typography-paragraph
                  :ellipsis="{
                    rows: 1,
                    showTooltip: true,
                    css: true,
                  }"
                >
                  {{ item.alias }}
                </a-typography-paragraph>
              </a-space>
            </template>
            <template #description>
              <a-typography-paragraph
                :ellipsis="{
                  rows: 2,
                  showTooltip: true,
                  css: true,
                }"
              >
                <a-typography-text type="secondary">
                  {{ item.desc }}
                </a-typography-text>
              </a-typography-paragraph>
            </template>
          </a-card-meta>
          <template #actions>
            <a-tooltip content="点个 Star 吧">
              <span class="icon-hover">
                <a :href="item.url" target="_blank" rel="noopener"><IconThumbUp :size="20" /></a>
              </span>
            </a-tooltip>
          </template>
        </a-card>
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup lang="ts">
const list = [
  {
    alias: 'Sakura Admin',
    name: 'sakura-admin',
    owner: 'sakura-org',
    desc: '🔥Sakura Automation Platform🔥后端项目，基于ContiNew Admin，目标是打造一站式持续自动化平台，涵盖 WEB自动化、APP自动化、API接口自动化、性能自动化，并且支持分布式测试，全面兼容 Appium、Selenium、Rest Assured、JMeter 等主流开源框架，加速高质量的软件交付，推动测试整体效率的提升。',
    logo: '/sakura1.svg',
    url: 'https://gitee.com/SakuraTechy/sakura-admin/stargazers',
    status: '迭代',
    statusColor: 'rgb(var(--primary-6))',
    // statusColor: 'rgb(var(--danger-6))',
    // statusColor: 'rgb(var(--warning-6))',
  },
  {
    alias: 'Sakura Starter',
    name: 'sakura-starter',
    owner: 'sakura-org',
    desc: '🔥Sakura Automation Platform🔥组件项目，基于ContiNew Starter，包含了一系列经过企业实践优化的依赖包（如 MyBatis-Plus、SaToken），可轻松集成到应用中，为开发人员减少手动引入依赖及配置的麻烦，为 Spring Boot Web 项目的灵活快速构建提供支持。',
    logo: '/sakura1.svg',
    url: 'https://gitee.com/SakuraTechy/sakura-starter/stargazers',
    status: '迭代',
    statusColor: 'rgb(var(--primary-6))',
  },
  {
    alias: 'Sakura Admin UI',
    name: 'sakura-admin-ui',
    owner: 'sakura-org',
    desc: '🔥Sakura Automation Platform🔥前端项目，基于ContiNew Admin UI，包含 Vue3、Vite、TypeScript、Arco Design Vue、Pinia、VueUse 等的免费中后台模版，它使用了最新的前端技术栈，内置丰富的主题配置，有着极高的代码规范，基于 mock 实现的动态数据展示，开箱即用的模板，也可用于学习参考。',
    logo: '/sakura1.svg',
    url: 'https://gitee.com/SakuraTechy/sakura-admin-ui/stargazers',
    status: '迭代',
    statusColor: 'rgb(var(--primary-6))',
  },
  {
    alias: 'Sakura Selenium',
    name: 'sakura-selenium',
    owner: 'sakura-org',
    desc: '🔥Sakura Selenium🔥是一个基于Selenium改造过后的新一代Web自动化测试框架，主要用于Web应用程序的自动化测试，支持Edge、Firefox、Chrome等多个浏览器，开箱即可使用。',
    logo: '/sakura1.svg',
    url: 'https://gitee.com/SakuraTechy/sakura-selenium/stargazers',
    status: '迭代',
    statusColor: 'rgb(var(--primary-6))',
  },
  {
    alias: 'Sakura Agiletc',
    name: 'sakura-agiletc',
    owner: 'sakura-org',
    desc: '🔥Sakura AgileTC🔥是一个基于AgileTC改造过后的新一代测试场景用例管理平台，支持测试用例管理、执行计划管理、进度计算、多人实时协同等能力，方便测试人员对用例进行管理和沉淀。产品以脑图方式编辑可快速上手，用例关联需求形成流程闭环，并支持组件化引用，可在各个平台嵌入使用，是测试人员的贴心助手！',
    logo: '/sakura1.svg',
    url: 'https://gitee.com/SakuraTechy/sakura-agiletc/stargazers',
    status: '迭代',
    statusColor: 'rgb(var(--primary-6))',
  },
  {
    alias: 'Sakura Docs',
    name: 'sakura-docs',
    owner: 'sakura-org',
    desc: '🔥Sakura Docs🔥是自动化平台官方文档，采用 VitePress 技术构建，专注于打造快速、现代化且以内容为核心的文档站点，兼具高效开发体验与优雅展示效果。全面介绍了自动化平台的基础功能、核心功能及产品优势，涵盖系统管理、项目管理，测试管理，接口管理，自动化管理等模块，突出其在提升研发效率与优化用户体验方面的卓越能力，展现了一站式持续自动化平台的强大实力与专业价值。',
    logo: '/sakura1.svg',
    url: 'https://gitee.com/SakuraTechy/sakura-docs/stargazers',
    status: '归档',
    statusColor: 'rgb(var(--warning-6))',
  },
]
</script>

<style scoped lang="less">
:deep(.arco-card-body) {
  position: relative;
  overflow: hidden;
  .badge {
    position: absolute;
    font-size: 11px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    width: 74px;
    color: #fff;
  }
  .badge-left {
    -moz-transform: rotate(-45deg);
    -ms-transform: rotate(-45deg);
    -o-transform: rotate(-45deg);
    -webkit-transform: rotate(-45deg);
    transform: rotate(-45deg);
    left: -20px;
    top: 6px;
  }
  .badge-right {
    -moz-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    -o-transform: rotate(45deg);
    -webkit-transform: rotate(45deg);
    transform: rotate(45deg);
    right: -20px;
    top: 6px;
  }
  .arco-card-meta-description {
    margin-top: 0px;
  }
  .arco-card-meta-footer {
    margin: 10px 0px -5px 0px;
  }
}

.icon-hover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: rgba(var(--primary-6));
  border-radius: 50%;
  transition: all 0.1s;
  animation: icon-hover-animated 1.2s ease-in-out infinite;
}
.icon-hover:hover {
  background-color: rgb(var(--gray-2));
}

@keyframes icon-hover-animated {
  50% {
    transform: scale(0.8);
  }
}
</style>
