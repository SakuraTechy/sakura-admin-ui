<template>
  <div v-if="data && data.length" class="gi-cell-key-value">
    <a-popover trigger="click" :content-style="{ maxWidth: '500px', padding: '12px 16px' }">
      <a-link class="view-params-link">
        点击查看
        <span class="params-count">+{{ data.length }}</span>
      </a-link>
      <template #content>
        <div class="popover-title">{{ title }}</div>
        <a-divider style="margin: 8px 0" />
        <table class="popover-table">
          <tbody>
            <tr v-for="item in data" :key="item.paramsName">
              <td class="key-column">{{ item.paramsName || '' }}</td>
              <td class="value-column">{{ item.paramsValue || '' }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </a-popover>
  </div>
  <span v-else class="no-data">-</span>
</template>

<script setup lang="ts">
defineOptions({ name: 'GiCellKeyValue' })

withDefaults(defineProps<Props>(), {
  data: () => [],
  showPlusIcon: true,
  title: '参数配置',
})

interface KeyValueItem {
  paramsName: string
  paramsValue: string
  [key: string]: any
}

interface Props {
  data: KeyValueItem[]
  showPlusIcon?: boolean
  title?: string
}
</script>

<style scoped lang="scss">
.gi-cell-key-value {
  display: flex;
  align-items: center;
  justify-content: space-around;
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
      width: 100px;
      font-weight: 500;
      color: var(--color-text-1);
      background-color: var(--color-fill-2);
      border-right: 1px solid var(--color-neutral-3);
    }

    &.value-column {
      min-width: 250px;
      color: var(--color-text-2);
      word-break: break-all;
    }
  }
}

.no-data {
  color: var(--color-text-3);
}
</style>
