<template>
  <section class="threads">
    <header>
      <strong>评审意见</strong>
      <a-button v-if="canComment" size="small" type="outline" @click="$emit('add')">
        <template #icon><icon-plus /></template>新增意见
      </a-button>
    </header>
    <a-empty v-if="!roots.length" description="暂无评审意见" />
    <article v-for="root in roots" :key="root.id" class="thread" :class="{ resolved: root.resolution !== 'OPEN' }">
      <div class="thread-meta">
        <a-tag size="small" :color="severityColor[root.severity || 'SUGGESTION']">{{ severityLabel[root.severity || 'SUGGESTION'] }}</a-tag>
        <span>{{ root.stepId || '用例级' }}</span>
        <span>{{ root.authorName }}</span>
        <span>{{ formatTime(root.createTime) }}</span>
        <a-tag v-if="root.resolution !== 'OPEN'" size="small" color="green">已处理</a-tag>
      </div>
      <p>{{ root.content }}</p>
      <div v-for="reply in replies(root.threadId)" :key="reply.id" class="reply">
        <strong>{{ reply.authorName }}</strong><span>{{ reply.content }}</span><time>{{ formatTime(reply.createTime) }}</time>
      </div>
      <footer v-if="canComment">
        <a-link v-if="root.resolution === 'OPEN'" @click="$emit('reply', root)">回复</a-link>
        <a-link v-if="canManage(root) && root.resolution === 'OPEN'" @click="$emit('resolve', root)">标记处理</a-link>
        <a-link v-else-if="canManage(root)" @click="$emit('reopen', root)">重新打开</a-link>
      </footer>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { ReviewComment, ReviewSeverity } from '@/apis/automation/automationUiCaseReview'

const props = defineProps<{ comments: ReviewComment[], canComment: boolean, canAdmin: boolean, currentUserId: string }>()
defineEmits<{
  (e: 'add'): void
  (e: 'reply', comment: ReviewComment): void
  (e: 'resolve', comment: ReviewComment): void
  (e: 'reopen', comment: ReviewComment): void
}>()
const roots = computed(() => props.comments.filter(item => !item.parentId))
const replies = (threadId: string) => props.comments.filter(item => item.parentId && item.threadId === threadId)
const canManage = (comment: ReviewComment) => props.canAdmin || String(comment.authorId) === props.currentUserId
const formatTime = (value?: string) => value ? dayjs(value).format('MM-DD HH:mm') : '-'
const severityColor: Record<ReviewSeverity, string> = { BLOCKER: 'red', MAJOR: 'orangered', MINOR: 'gold', SUGGESTION: 'gray' }
const severityLabel: Record<ReviewSeverity, string> = { BLOCKER: '阻断', MAJOR: '重要', MINOR: '一般', SUGGESTION: '建议' }
</script>

<style scoped lang="scss">
.threads > header { display: flex; min-height: 42px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border-2); }
.thread { padding: 12px 4px; border-bottom: 1px solid var(--color-border-2); }
.thread.resolved { opacity: .72; }
.thread-meta { display: flex; align-items: center; gap: 8px; color: var(--color-text-3); font-size: 12px; }
.thread p { margin: 8px 0; color: var(--color-text-1); line-height: 1.6; overflow-wrap: anywhere; }
.reply { display: grid; grid-template-columns: max-content minmax(0, 1fr) max-content; gap: 8px; margin: 6px 0 6px 16px; padding-left: 10px; border-left: 2px solid var(--color-border-2); color: var(--color-text-2); font-size: 12px; }
.reply time { color: var(--color-text-3); }
footer { display: flex; gap: 12px; margin-top: 8px; }
@media (max-width: 640px) { .thread-meta { align-items: flex-start; flex-wrap: wrap; } .reply { grid-template-columns: 1fr; } }
</style>
