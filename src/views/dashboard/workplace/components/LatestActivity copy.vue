<template>
  <a-card class="general-card" title="最新动态" style="margin-bottom: 14px">
    <template #extra>
      <a-dropdown>
        <a-link>更多</a-link>
        <template #content>
          <a-doption>
            <a-link href="https://gitee.com/organizations/continew/events" target="_blank" rel="noopener">Gitee</a-link>
          </a-doption>
          <a-doption>
            <a-link href="https://gitcode.com/org/continew/discussion" target="_blank" rel="noopener">GitCode</a-link>
          </a-doption>
          <a-doption>
            <a-link href="https://github.com/orgs/continew-org/discussions" target="_blank" rel="noopener">GitHub</a-link>
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
        :author="item.actor.login"
        :class="`animated-fade-up-${index}`"
      >
        <template #avatar>
          <a-badge>
            <template #content>
              <GiSvgIcon v-if="item.platform === 'GitHub'" name="github" :size="15" />
              <GiSvgIcon v-else-if="item.platform === 'Gitee'" name="gitee" :size="15" />
            </template>
            <a :href="item.actor.url" target="_blank" rel="noopener">
              <a-avatar :size="30">
                <img :src="item.actor.avatar_url" alt="avatar" />
              </a-avatar>
            </a>
          </a-badge>
        </template>
        <template #datetime>
          <span :title="item.created_at">{{ item.createTimeString }}</span>
        </template>
        <template #content>
          <div class="content">
            <p v-if="item.type === 'PushEvent'">
              推送到了 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              {{ `的 ${item.payload.ref} 分支 ${item.payload.commits.length} 个提交` }}
              <a-comment
                v-for="(commit, idx) in item.payload.commits"
                :key="idx"
                class="commit"
              >
                <template #content>
                  <a-link :href="commit.url" target="_blank" rel="noopener" style="font-size: 12px" :title="commit.message">{{ commit.sha.substring(0, 7) }}</a-link>
                  <a :href="commit.url" target="_blank" rel="noopener" :title="commit.message">{{ commit.message }}</a>
                </template>
              </a-comment>
            </p>
            <p v-else-if="item.type === 'IssueEvent' && item.payload.action === 'open'">
              在 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              创建了 Issue <a-link :href="item.payload.html_url" target="_blank" rel="noopener">#{{ item.payload.number }}  {{ item.payload.title }}</a-link>
            </p>
            <p v-else-if="item.type === 'IssueEvent' && item.payload.action === 'rejected'">
              更改了 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              的 Issue <a-link :href="item.payload.html_url" target="_blank" rel="noopener">#{{ item.payload.number }}  {{ item.payload.title }}</a-link>
              状态为 {{ item.payload.issue_state ? '已关闭' : '已取消' }}
            </p>
            <p v-else-if="item.type === 'IssueCommentEvent'">
              评论了 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              的 Issue <a-link :href="item.payload.comment.html_url" target="_blank" rel="noopener">#{{ item.payload.issue.number }}  {{ item.payload.issue.title }}</a-link>
            </p>
            <p v-else-if="item.type === 'PullRequestEvent' && item.payload.action === 'opened'">
              在 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              创建了 Pull Request <a-link :href="item.payload.html_url" target="_blank" rel="noopener">{{ item.payload.title }}</a-link>
            </p>
            <p v-else-if="item.type === 'PullRequestEvent' && item.payload.action === 'merged'">
              接受了 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              的 Pull Request <a-link :href="item.payload.html_url" target="_blank" rel="noopener">{{ item.payload.title }}</a-link>
            </p>
            <p v-else-if="item.type === 'PullRequestEvent' && item.payload.action === 'closed'">
              更改了 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              的 Pull Request <a-link :href="item.payload.html_url" target="_blank" rel="noopener">{{ item.payload.title }}</a-link>
              状态为 {{ item.payload.action ? '已关闭' : 'closed' }}
            </p>
            <p v-else-if="item.type === 'PullRequestEvent' && item.payload.action === 'reopened'">
              更改了 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              的 Pull Request <a-link :href="item.payload.html_url" target="_blank" rel="noopener">{{ item.payload.title }}</a-link>
              状态为 {{ item.payload.action ? '重新打开' : 'reopened' }}
            </p>
            <p v-else-if="item.type === 'CreateEvent'">
              推送了新的 {{ item.payload.ref_type }}
              <a-link :href="`${item.repo.url}/tree/${item.payload.ref}`" target="_blank" rel="noopener">{{ item.payload.ref }}</a-link>
              到 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
            </p>
            <p v-else-if="item.type === 'DeleteEvent'">
              删除了 <a-link :href="item.repo.url" target="_blank" rel="noopener">{{ item.repo.human_name }}</a-link>
              的 {{ item.payload.ref }} {{ item.payload.refType }}
            </p>
            <p v-else>暂无</p>
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
import relativeTime from 'dayjs/plugin/relativeTime'
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import qs from 'query-string'
import { Message } from '@arco-design/web-vue'
import { computed, watch } from 'vue'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')
export interface DataItem {
  type: string
  actor: {
    username: string
    nickname: string
    avatar: string
    url: string
  }
  repo: {
    name: string
    alias: string
    url: string
  }
  payload: object
  createTime: string
  createTimeString: string
}

export interface GiteeItem {
  platform: string
  type: string
  actor: {
    login: string
    name: string
    avatar_url: string
    url: string
  }
  repo: {
    full_name: string
    human_name: string
    url: string
  }
  payload: object
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

const dataList = ref<DataItem[]>([])
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

// Gitee OAuth2 获取 AccessToken：https://gitee.com/api/v5/oauth_doc#/list-item-2
const getGiteeList = async () => {
  try {
    loading.value = true
    await post('/oauth/token', {
      grant_type: 'password',
      username: 'hagyao520',
      password: 'lz612425',
      client_id: 'e3f673e62d8f6c4c9af73d4e9d002a82e860180a904c14f476eb0aba4e612d7d',
      client_secret: '148d283945c3c634030ffebfe85c32037b6ceab1a732272027ef7fc4a2e2c6fa',
      scope: 'user_info pull_requests issues notes',
    }, {
      baseURL: 'https://gitee.com',
    }).then(async (res) => {
      // 获取组织的公开动态：https://gitee.com/api/v5/swagger#/getV5OrgsOrgEvents
      const eventsRes = await get(`https://gitee.com/api/v5/orgs/SakuraTechy/events?access_token=${res.access_token}&limit=${pageSize.value}`)
      const events = Array.isArray(eventsRes) ? eventsRes : (eventsRes as any).data || []
      events.forEach((item: any) => {
        if (item.repo && item.repo.url) {
          item.repo.url = item.repo.url.replace('/api/v5/repos', '')
        }
        if (item.payload && item.payload.ref) {
          item.payload.ref = item.payload.ref.replace('refs/heads/', '')
        }
        if (item.payload && item.payload.commits) {
          item.payload.commits.forEach((commit: any) => {
            if (commit.url) {
              commit.url = commit.url.replace('/api/v5/repos', '').replace('commits', 'commit')
            }
          })
        }
        giteeList.value.push({
          ...item,
          platform: 'Gitee',
          createTimeString: dayjs(item.created_at).fromNow(),
        })
      })
    })
  } catch (err) {
    Message.error(String(err))
  } finally {
    loading.value = false
  }
}

// 查询列表数据
const getDataList = async () => {
  try {
    loading.value = true
    const { data } = await get('https://api.charles7c.top/git/orgs/events/continew')
    data.forEach((item) => {
      dataList.value.push({
        ...item,
        createTimeString: dayjs(new Date(item.createTime)).fromNow(),
      })
    })
  } catch (err) {
    // console.log(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getGiteeList()
})

// 监听页面大小变化，重新获取数据
watch(pageSize, (newSize) => {
  // 清空当前列表
  giteeList.value = []
  // 重置页码
  currentPage.value = 1
  // 重新获取对应数量的数据
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

.gi-table__body-pagination-br {
  :deep(.arco-pagination) {
    margin-top: 16px;
    justify-content: flex-end;
  }
}
</style>
