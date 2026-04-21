<template>
  <div v-if="data && data.length" class="gi-cell-key-value">
    <a-popover :content-style="{ maxWidth: 'auto', padding: '12px 16px' }">
      <a-link
        v-if="slotName"
        class="view-params-link"
        :href="data.find(item => ['地址'].some(keyword => item.paramsName.includes(keyword)))?.paramsValue"
        target="_blank"
      >
        {{ data.find(item => ['名称', 'IP', '状态'].some(keyword => item.paramsName.includes(keyword)))?.paramsValue ?? '-' }}
      </a-link>
      <!-- <GiCellTag v-else-if="slotTag" :value="data.find(item => ['状态'].some(keyword => item.paramsName.includes(keyword)))?.paramsValue ?? '-'" :dict="status_type" /> -->
      <a-space v-else-if="slotTag" :size="8">
        <GiCellTag v-for="item in data.filter(item => typeof item.paramsValue === 'number')" :key="item.paramsName" :value="item.paramsValue" :dict="status_type" />
      </a-space>
      <!-- <div v-for="item in data" v-else-if="slotTag" :key="item.paramsName">
        <GiCellTag :value="item.paramsValue" :dict="status_type" />
      </div> -->
      <a-link v-else class="view-params-link">
        查看更多
        <span class="params-count">+{{ data.length }}</span>
      </a-link>
      <template #content>
        <div class="popover-title">{{ title }}详情信息</div>
        <a-divider style="margin: 8px 0" />
        <table class="popover-table">
          <tbody>
            <tr v-for="item in data" :key="item.paramsName">
              <!-- <span>{{ typeof item.paramsValue }}</span> -->
              <td class="key-column">{{ item.paramsName ?? '-' }}</td>
              <td class="value-column">
                <!-- {{ item }}
                {{ typeof item.paramsName }}
                {{ Array.isArray(item.paramsName) }} -->
                <template v-if="item.paramsName.includes('类型')">
                  <!-- <a-tag color="arcoblue">{{ item.paramsValue || '-' }}</a-tag> -->
                  <GiCellTag :value="item.paramsValue || '-'" :dict="item.paramsType" />
                </template>
                <template v-else-if="item.paramsName.includes('密码')">
                  <GiCellPassword :value="item.paramsValue || '-'" />
                </template>
                <template v-else-if="item.paramsName.includes('状态')">
                  <GiCellTag :value="item.paramsValue || '-'" :dict="status_type" />
                </template>
                <template v-else-if="item.paramsName.includes('地址')">
                  <a-link :href="item.paramsValue" target="_blank">{{ item.paramsValue || '-' }}</a-link>
                </template>
                <template v-else-if="item.paramsName.includes('凭据')">
                  <a-link :href="item.paramsValue" target="_blank">{{ item.paramsValue?.split('credential/')[1]?.trim() ?? '-' }}</a-link>
                </template>
                <template v-else-if="typeof item.paramsValue === 'number'">
                  <a-tag color="arcoblue">{{ item.paramsValue || '-' }}</a-tag>
                </template>
                <template v-else-if="item.paramsName.includes('标签') && typeof item.paramsValue === 'object'">
                  <GiCellKeyValue :data="item.paramsValue || []" :slot-tag="true" :title="item.paramsName ?? ''" />
                </template>
                <template v-else-if="item.paramsName.includes('名称') && typeof item.paramsValue === 'object'">
                  <GiCellKeyValue :data="item.paramsValue || []" :slot-name="true" :title="item.paramsName ?? ''" />
                </template>
                <template v-else-if="typeof item.paramsValue === 'object'">
                  <GiCellKeyValue :data="item.paramsValue || []" :title="item.paramsName ?? ''" />
                </template>
                <template v-else>{{ item.paramsValue || '-' }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </a-popover>
  </div>
  <span v-else class="no-data">-</span>
</template>

<script setup lang="tsx">
import { useDict } from '@/hooks/app'

defineOptions({ name: 'GiCellKeyValue' })

withDefaults(defineProps<Props>(), {
  data: () => [],
  showPlusIcon: true,
  slotName: false,
  title: '参数配置',
})

const { version_type, status_type } = useDict('version_type', 'status_type')

interface KeyValueItem {
  paramsName: string
  paramsValue: string
  [key: string]: any
}

interface Props {
  data: KeyValueItem[]
  showPlusIcon?: boolean
  slotName?: boolean
  slotTag?: boolean
  title?: string
}
</script>

<style scoped lang="scss">
.gi-cell-key-value {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.view-params-link {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;

  .icon-plus {
    margin-left: 4px;
    font-size: 12px;
  }

  .params-count {
    margin-left: 4px;
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.popover-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-1);
}

.popover-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  border: 1px solid var(--color-neutral-3);

  tr {
    &:not(:last-child) {
      border-bottom: 1px solid var(--color-neutral-3);
    }
  }

  td {
    padding: 8px 12px;

    &.key-column {
      width: auto;
      font-weight: 500;
      color: var(--color-text-1);
      background-color: var(--color-fill-2);
      border-right: 1px solid var(--color-neutral-3);
    }

    &.value-column {
      width: auto;
      color: var(--color-text-2);
      word-break: break-all;
    }
  }
}

.no-data {
  color: var(--color-text-3);
}
</style>
