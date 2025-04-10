<template>
  <a-card class="general-card" title="最新动态" style="margin-bottom: 14px">
    <template #extra>
      <a-dropdown>
        <a-link>更多</a-link>
        <template #content>
          <a-doption>
            <a-link href="https://gitee.com/organizations/SakuraTechy/events" target="_blank" rel="noopener">Gitee</a-link>
          </a-doption>
          <a-doption>
            <a-link href="https://gitcode.com/org/SakuraTechy/discussions" target="_blank" rel="noopener">GitHub</a-link>
          </a-doption>
          <a-doption>
            <a-link href="https://gitcode.com/org/SakuraTechy/discussion" target="_blank" rel="noopener">GitCode</a-link>
          </a-doption>
        </template>
      </a-dropdown>
    </template>
    <a-skeleton v-if="loading" :loading="loading" :animation="true">
      <a-skeleton-line :rows="10" />
    </a-skeleton>
    <div v-else>
      <a-empty v-if="giteeList.length === 0">暂无动态</a-empty>
      <a-comment
        v-for="(item, index) in paginatedGiteeList"
        v-else
        :key="index"
        :author="item.author.username"
        :class="`animated-fade-up-${index}`"
      >
        <template #avatar>
          <a-badge>
            <template #content>
              <GiSvgIcon v-if="item.platform === 'GitHub'" name="github" :size="15" />
              <GiSvgIcon v-else-if="item.platform === 'Gitee'" name="gitee" :size="15" />
            </template>
            <a :href="`${giteeConfig.baseURL + item.author.path}`" target="_blank" rel="noopener">
              <a-avatar :size="30">
                <img :src="item.author.avatar_url && !item.author.avatar_url.includes('no_portrait.png') ? item.author.avatar_url : '/src/assets/images/avatar/unknown.png'" alt="avatar" />
              </a-avatar>
            </a>
          </a-badge>
        </template>
        <template #datetime>
          <span :title="item.created_at">{{ item.createTimeString }}</span>
        </template>
        <template #content>
          <div class="content">
            <p v-if="item.type === 'push' && item.action === 'push'">
              {{ item.action_human_name }} <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              {{ `的 ${item.ref_name} 分支 ${item.commit_count} 个提交` }}
              <a-comment
                v-for="(commit, idx) in item.commits"
                :key="idx"
                class="commit"
              >
                <template #content>
                  <a :href="`${giteeConfig.baseURL + commit.author.path}`" target="_blank" rel="noopener">
                    <a-avatar :size="20">
                      <img :src="commit.author.avatar_url" alt="avatar" />
                    </a-avatar>
                  </a>
                  <a-link :href="`${giteeConfig.baseURL + commit.project_commit_path}`" target="_blank" rel="noopener" style="font-size: 12px" :title="commit.message">{{ commit.id }}</a-link>
                  <a :href="`${giteeConfig.baseURL + commit.project_commit_path}`" target="_blank" rel="noopener" :title="commit.message">{{ commit.message }}</a>
                </template>
              </a-comment>
            </p>
            <p v-if="item.type === 'push' && item.action === 'force_push'">
              {{ item.action_human_name }} <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              {{ `的 ${item.ref_name} 分支 ${item.commit_count} 个提交` }}
              <a-comment
                v-for="(commit, idx) in item.commits"
                :key="idx"
                class="commit"
              >
                <template #content>
                  <a :href="`${giteeConfig.baseURL + commit.author.path}`" target="_blank" rel="noopener">
                    <a-avatar :size="20">
                      <img :src="commit.author.avatar_url" alt="avatar" />
                    </a-avatar>
                  </a>
                  <a-link :href="commit.project_commit_path" target="_blank" rel="noopener" style="font-size: 12px" :title="commit.message">{{ commit.id }}</a-link>
                  <a :href="commit.project_commit_path" target="_blank" rel="noopener" :title="commit.message">{{ commit.message }}</a>
                </template>
              </a-comment>
            </p>
            <div v-if="item.type === 'push' && item.action === 'force_push'" class="compare">
              <p>... 以及 {{ item.commit_count - item.commits.length }} 个提交 </p>
              <a-link :href="`${giteeConfig.baseURL + item.project_compare_path}`" target="_blank" rel="noopener" :title="`${giteeConfig.baseURL + item.project_compare_path}`">比较 → {{ item.commit_from }}...{{ item.commit_to }}</a-link>
            </div>
            <p v-else-if="item.type === 'issue' && item.action === 'created'">
              在 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              创建了 Issue <a-link :href=" `${giteeConfig.baseURL + item.target.path}`" target="_blank" rel="noopener">#{{ item.target.pre_iid }}  {{ item.target.title }}</a-link>
            </p>
            <p v-else-if="item.type === 'issue' && item.action === 'changed_state'">
              更改了 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              的 Issue <a-link :href=" `${giteeConfig.baseURL + item.target.path}`" target="_blank" rel="noopener">#{{ item.target.pre_iid }}  {{ item.target.title }}</a-link>
              状态为 {{ item.payload.issue_state ? '已关闭' : '已取消' }}
            </p>
            <p v-else-if="item.type === 'note' && item.action === 'commented'">
              评论了 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              的 Issue <a-link :href="`${giteeConfig.baseURL + item.target.path}`" target="_blank" rel="noopener">#{{ item.target.pre_iid }}  {{ item.target.title }}</a-link>
            </p>
            <p v-else-if="item.type === 'pull_request' && item.action === 'created'">
              在 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              创建了 Pull Request <a-link :href=" `${giteeConfig.baseURL + item.target.path}`" target="_blank" rel="noopener">{{ item.target.title }}</a-link>
            </p>
            <p v-else-if="item.type === 'pull_request' && item.action === 'merged'">
              接受了 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              的 Pull Request <a-link :href=" `${giteeConfig.baseURL + item.target.path}`" target="_blank" rel="noopener">{{ item.target.title }}</a-link>
            </p>
            <p v-else-if="item.type === 'pull_request' && item.action === 'closed'">
              更改了 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              的 Pull Request <a-link :href=" `${giteeConfig.baseURL + item.target.path}`" target="_blank" rel="noopener">{{ item.target.title }}</a-link>
              状态为 {{ item.action ? '已关闭' : 'closed' }}
            </p>
            <p v-else-if="item.type === 'pull_request' && item.action === 'reopened'">
              更改了 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              的 Pull Request <a-link :href=" `${giteeConfig.baseURL + item.target.path}`" target="_blank" rel="noopener">{{ item.target.title }}</a-link>
              状态为 {{ item.action ? '重新打开' : 'reopened' }}
            </p>
            <p v-else-if="item.type === 'push' && item.action === 'new_ref'">
              推送了新的 {{ item.event_ref_type }}
              <a-link :href="`${`${giteeConfig.baseURL + item.project.path}`}/tree/${item.ref_name}`" target="_blank" rel="noopener">{{ item.ref_name }}</a-link>
              到 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
            </p>
            <p v-else-if="item.type === 'push' && item.action === 'rm_ref'">
              删除了 <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              的 {{ item.ref_name }} {{ item.event_ref_type }}
            </p>
            <div v-else-if="item.type === 'project' && item.action === 'synced'" class="fork">
              <GiSvgIcon name="sync" :size="18" />
              <p>
                {{ item.action_human_name }} <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              </p>
            </div>
            <div v-else-if="item.type === 'project' && item.action === 'starred'" class="fork">
              <GiSvgIcon name="star" :size="18" />
              <p>
                {{ item.action_human_name }} <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
              </p>
            </div>
            <div v-else-if="item.type === 'project' && item.action === 'forked'" class="fork">
              <GiSvgIcon name="fork" :size="15" />
              <p>
                {{ item.action_human_name }} <a-link :href="`${giteeConfig.baseURL + item.project.path}`" target="_blank" rel="noopener">{{ item.project.name_with_namespace }}</a-link>
                到 <a-link :href="`${giteeConfig.baseURL + item.forked_project.path}`" target="_blank" rel="noopener">{{ item.forked_project.name_with_namespace }}</a-link>
              </p>
            </div>
            <p v-else-if="item.type !== 'push'">暂无</p>
          </div>
        </template>
      </a-comment>

      <!-- 添加分页器 -->
      <div v-if="giteeList.length > 0" class="gi-table__body-pagination-br">
        <a-pagination
          v-model:current="currentPage"
          v-model:page-size="pageSize"
          :total="giteeList.length"
          :page-size-options="pageSizeOptions"
          show-total
          show-page-size
          size="small"
        />
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import qs from 'query-string'
import { Message } from '@arco-design/web-vue'
import { computed, onMounted, ref } from 'vue'
import { getGiteeConfig } from '@/utils/config'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 定义类型，使用可选属性
export interface GiteeItem {
  platform: string
  type: string
  author: {
    username: string
    name: string
    avatar_url: string
    path: string
  }
  project: {
    name_with_namespace: string
    path: string
  }
  ref_name?: string
  event_ref_type?: string
  refType?: string
  commits?: Array<any>
  action?: string
  target: {
    path: string
    pre_iid: string
    title?: string
    content: string
  }
  status: {
    name: string
  }
  created_at: string
  createTimeString: string
}

export interface ApiRes<T> {
  data: T[]
  access_token?: string
}

const get = <T = unknown>(url: string, params?: object, config?: AxiosRequestConfig): Promise<ApiRes<T>> => {
  return new Promise((resolve, reject) => {
    axios
      .request<T>({
        method: 'get',
        url,
        params,
        paramsSerializer: (obj) => {
          return qs.stringify(obj)
        },
        ...config,
      })
      .then((res: AxiosResponse) => resolve(res.data))
      .catch((err: { msg: string }) => reject(err))
  })
}

const post = <T = unknown>(
  url: string,
  data?: object,
  config?: AxiosRequestConfig,
): Promise<ApiRes<T>> => {
  return new Promise((resolve, reject) => {
    axios.request<T>({
      method: 'post',
      url,
      data: qs.stringify(data || {}),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...config?.headers, // 保留自定义头
      },
      ...config,
    })
      .then((res: AxiosResponse) => resolve(res.data))
      .catch((err: { msg: string }) => reject(err))
  })
}

const giteeList = ref<GiteeItem[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(5)
const pageSizeOptions = [5, 10, 15, 20]

// 计算当前页的数据
const paginatedGiteeList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return giteeList.value.slice(start, end)
})

const giteeConfig = getGiteeConfig()

// Gitee OAuth2 获取 AccessToken
const getGiteeList = async () => {
  try {
    loading.value = true
    const giteeConfig = getGiteeConfig() // 获取配置时不要缓存，确保每次获取最新值
    const eventsUrl = `${giteeConfig.events_list}`
    const eventsRes = await get(eventsUrl)
    const events = Array.isArray(eventsRes) ? eventsRes : (eventsRes as any).data || []
    // 处理事件数据
    events.forEach((item: any) => {
      giteeList.value.push({
        ...item,
        platform: 'Gitee',
        createTimeString: dayjs(item.created_at).fromNow(),
      })
    })
  } catch (err) {
    Message.error(String(err))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getGiteeList()
})
</script>

<style scoped lang="scss">
:deep(.arco-comment:not(:first-of-type), .arco-comment-inner-comment) {
  margin-top: 10px;
}

:deep(.arco-comment:not(:last-of-type)) {
  border-bottom: 1px solid var(--color-border-1);
  padding-bottom: 10px;
}

:deep(.arco-comment-content) {
  display: flex;
  align-items: center;
  color: var(--color-text-2);
}

:deep(.arco-comment-datetime) {
  color: var(--color-text-4);
}

.commit.arco-comment {
  margin-top: 10px;
  font-size: 12px;
  border-bottom: none;
  padding-bottom: 0;
}

.fork {
  display: flex;
  align-items: center;
  gap: 5px;
}

.compare {
  display: flex;
  align-items: center;
  margin-top: 5px;
  font-size: 14px;
}

.gi-table__body-pagination-br {
  :deep(.arco-pagination) {
    margin-top: 16px;
    justify-content: flex-end;
  }
}
</style>
