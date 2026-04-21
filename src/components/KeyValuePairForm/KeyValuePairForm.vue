<template>
  <div class="key-value-pair-form">
    <a-form ref="formRef" :model="formData" :label-col-props="{ span: 0 }" :wrapper-col-props="{ span: 24 }">
      <div :class="{ 'key-value-pair-list': addKeyValue }">
        <div v-for="(item, index) in formData.items" :key="index" class="key-value-pair-item">
          <a-row :gutter="colGap" align="center">
            <a-col :span="nameColSpan">
              <a-form-item :field="`items[${index}].paramsName`" class="no-margin">
                <a-input v-model="item.paramsName" placeholder="参数名称" allow-clear :disabled="disabled" @change="handleItemChange" />
              </a-form-item>
            </a-col>
            <a-col :span="valueColSpan">
              <a-form-item :field="`items[${index}].paramsValue`" class="no-margin">
                <a-input v-model="item.paramsValue" placeholder="参数值" allow-clear :disabled="disabled" @change="handleItemChange" />
              </a-form-item>
            </a-col>
            <a-col :span="actionColSpan" class="item-actions">
              <a-button type="text" status="danger" :disabled="disabled" @click="() => removeItem(index)">
                <template #icon><icon-delete /></template>
              </a-button>
            </a-col>
          </a-row>
        </div>
      </div>
      <a-row v-if="addKeyValue">
        <a-col :span="24">
          <div class="key-value-pair-actions">
            <a-button type="dashed" long @click="addItem">
              <template #icon><icon-plus /></template>
              添加参数
            </a-button>
          </div>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { computed, defineExpose, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance } from '@arco-design/web-vue'

interface KeyValueParam {
  paramsName: string
  paramsValue: string
}

interface Props {
  modelValue?: KeyValueParam[]
  nameColSpan?: number
  valueColSpan?: number
  actionColSpan?: number
  colGap?: number
  labelWidth?: number
  addKeyValue?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  nameColSpan: 10,
  valueColSpan: 10,
  actionColSpan: 4,
  colGap: 8,
  labelWidth: 0,
  addKeyValue: true,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: KeyValueParam[]): void
}>()

// 计算实际列宽，确保合计为24
const nameColSpan = computed(() => {
  const total = props.nameColSpan + props.valueColSpan + props.actionColSpan
  return Math.round((props.nameColSpan / total) * 24)
})

const valueColSpan = computed(() => {
  const total = props.nameColSpan + props.valueColSpan + props.actionColSpan
  return Math.round((props.valueColSpan / total) * 24)
})

const actionColSpan = computed(() => {
  return 24 - nameColSpan.value - valueColSpan.value
})

const formRef = ref<FormInstance>()
const formData = reactive({
  items: [] as KeyValueParam[],
})

// 不通过watch触发的状态更新
let isInternalUpdate = false

// 更新值
const updateModelValue = () => {
  // 只过滤掉完全为空的项
  const validItems = formData.items.filter((item) => item.paramsName || item.paramsValue)
  isInternalUpdate = true
  emit('update:modelValue', validItems)
}

// 添加项
const addItem = () => {
  formData.items.push({ paramsName: '', paramsValue: '' })
}

// 删除项
const removeItem = (index: number) => {
  formData.items.splice(index, 1)
  if (formData.items.length === 0) {
    addItem()
  }
  nextTick(() => {
    updateModelValue()
  })
}

// 处理项变化
const handleItemChange = () => {
  nextTick(() => {
    updateModelValue()
  })
}

// 初始化数据
const initFormData = () => {
  if (!isInternalUpdate) {
    // 处理不同字段名的数据兼容
    const convertedItems = props.modelValue.map((item) => {
      if ('key' in item && 'value' in item) {
        return { paramsName: item.key, paramsValue: item.value } as KeyValueParam
      } else if ('paramsName' in item && 'paramsValue' in item) {
        return item as KeyValueParam
      }
      return { paramsName: '', paramsValue: '' }
    })

    formData.items = convertedItems.length > 0 ? [...convertedItems] : []
    if (formData.items.length === 0) {
      addItem()
    }
  }
  isInternalUpdate = false
}

// 监听 props.modelValue 变化
watch(() => props.modelValue, () => {
  initFormData()
}, { deep: true })

// 表单验证
const validate = async () => {
  try {
    const isInvalid = await formRef.value?.validate()
    return !isInvalid
  } catch {
    return false
  }
}

// 重置表单
const reset = () => {
  formRef.value?.resetFields()
  initFormData()
}

// 初始加载数据
initFormData()

defineExpose({
  validate,
  reset,
  formRef,
})
</script>

<style lang="scss" scoped>
.key-value-pair-form {
  width: 100%;

  .key-value-pair-list {
    margin-bottom: 16px;
  }

  .key-value-pair-item {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .item-actions {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .key-value-pair-actions {
    margin-top: 8px;
    width: 100%;
  }

  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  .no-margin {
    margin-bottom: 0;
  }

  :deep(.arco-form-item-wrapper) {
    width: 100%;
  }

  :deep(.arco-form-item-content-inner) {
    display: flex;
  }

  :deep(.arco-input-wrapper) {
    width: 100%;
  }
}
</style>
