<template>
  <div v-if="appStore.tab" class="tabs">
    <a-tabs
      editable
      hide-content
      size="medium"
      :type="appStore.tabMode"
      :active-key="route.path"
      @tab-click="handleTabClick($event)"
      @delete="(path) => tabsStore.closeCurrent(String(path))"
    >
      <a-tab-pane
        v-for="item of tabsStore.tabList"
        :key="item.path"
        :title="item.meta?.title"
        :closable="Boolean(!item.meta?.affix)"
      >
        <template #title>
          <a-dropdown trigger="contextMenu">
            <span @contextmenu="(e) => handleContextMenu(e, item.path)">
              {{ item.meta?.title }}
            </span>
            <template #content>
              <a-doption @click="reload">
                <template #icon>
                  <icon-refresh class="reload-icon" :class="{ 'reload-icon--spin': loading }" />
                </template>
                <template #default>重新加载</template>
              </a-doption>
              <a-doption @click="tabsStore.closeCurrent(currentContextPath)">
                <template #icon>
                  <icon-to-bottom />
                </template>
                <template #default>关闭当前</template>
              </a-doption>
              <a-doption @click="tabsStore.closeLeft(currentContextPath)">
                <template #icon>
                  <icon-to-left />
                </template>
                <template #default>关闭左侧</template>
              </a-doption>
              <a-doption @click="tabsStore.closeRight(currentContextPath)">
                <template #icon>
                  <icon-to-right />
                </template>
                <template #default>关闭右侧</template>
              </a-doption>
              <a-doption @click="tabsStore.closeOther(currentContextPath)">
                <template #icon>
                  <icon-close />
                </template>
                <template #default>关闭其他</template>
              </a-doption>
            </template>
          </a-dropdown>
        </template>
      </a-tab-pane>
      <template #extra>
        <component :is="ReloadIcon" class="gi_mr"></component>
        <a-dropdown trigger="hover">
          <!-- <a-button type="text">
            <template #icon>
              <icon-more-vertical />
            </template>
          </a-button> -->
          <component :is="MagicIcon" class="gi_mr"></component>
          <template #content>
            <a-doption @click="tabsStore.closeCurrent(route.path)">
              <template #icon>
                <icon-to-bottom />
              </template>
              <template #default>关闭当前</template>
            </a-doption>
            <a-doption @click="tabsStore.closeLeft(currentContextPath)">
              <template #icon>
                <icon-to-left />
              </template>
              <template #default>关闭左侧</template>
            </a-doption>
            <a-doption @click="tabsStore.closeRight(currentContextPath)">
              <template #icon>
                <icon-to-right />
              </template>
              <template #default>关闭右侧</template>
            </a-doption>
            <a-doption @click="tabsStore.closeOther(route.path)">
              <template #icon>
                <icon-close />
              </template>
              <template #default>关闭其他</template>
            </a-doption>
            <a-doption @click="tabsStore.closeAll">
              <template #icon>
                <icon-minus />
              </template>
              <template #default>关闭全部</template>
            </a-doption>
          </template>
        </a-dropdown>
      </template>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationNormalized } from 'vue-router'
import ReloadIcon from './ReloadIcon.vue'
import MagicIcon from './MagicIcon.vue'
import { useAppStore, useTabsStore } from '@/stores'

defineOptions({ name: 'Tabs' })

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const tabsStore = useTabsStore()

// 菜单获取的路径
const currentContextPath = ref('')

// Initialize tabs
tabsStore.init()

// 路由发生改变触发
const handleRouteChange = () => {
  const item = { ...route } as unknown as RouteLocationNormalized
  tabsStore.addTabItem(toRaw(item))
  tabsStore.addCacheItem(toRaw(item))
}

handleRouteChange()

// 监听路由变化
watch(
  () => route.fullPath,
  () => {
    handleRouteChange()
  },
)

// 点击页签
const handleTabClick = (key: string | number) => {
  const obj = tabsStore.tabList.find((i) => i.path === String(key))
  obj ? router.push(obj.fullPath || obj.path) : router.push(String(key))
}

const handleContextMenu = (e: MouseEvent, path: string) => {
  if (!path) return
  e.preventDefault()
  currentContextPath.value = path
}

const loading = ref(false)
// 重新加载
const reload = () => {
  if (loading.value) return
  loading.value = true
  tabsStore.reloadPage()
  setTimeout(() => {
    loading.value = false
  }, 600)
}
</script>

<style scoped lang="scss">
:deep(.arco-tabs-nav-tab) {
  .arco-tabs-tab {
    svg {
      width: 0;
      transition: all 0.15s;
    }

    &:hover {
      svg {
        width: 1em;
      }
    }
  }

  &:not(.arco-tabs-nav-tab-scroll) {
    .arco-tabs-tab:first-child {
      border-left: 0;
    }
  }
}

:deep(.arco-dropdown-option-icon) {
  color: var(--color-text-3);
}

.tabs {
  padding-top: 5px;
  background-color: var(--color-bg-1);
  position: relative;
}

.reload-icon {
  cursor: pointer;

  &--spin {
    animation-name: arco-loading-circle;
    animation-duration: 0.6s;
  }
}
</style>
