<template>
  <a-modal
    v-model:visible="localVisible"
    :title="title"
    :width="modalWidth"
    :modal-class="modalClass"
    :body-class="bodyClass"
    :mask-closable="maskClosable"
    :esc-to-close="escToClose"
    :draggable="draggable"
    :body-style="bodyStyle"
    :on-before-ok="handleSave"
    @before-ok="handleSave"
    @close="handleClose"
    @update:visible="val => emit('update:visible', val)"
  >
    <template #title>
      <slot name="title">{{ title }}</slot>
    </template>
    <slot v-if="customBody" name="body" :form="localForm" />
    <slot v-else>
      <GiForm ref="formRef" v-model="localForm" :columns="columns" @change="onFormChange" />
    </slot>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { ColumnItem, GiForm } from '@/components/GiForm'

defineOptions({ name: 'GiFormModal' })

const props = defineProps({
  visible: Boolean,
  title: String,
  width: { type: [Number, String], default: 600 },
  modalClass: { type: [String, Array, Object], default: '' },
  bodyClass: { type: [String, Array, Object], default: '' },
  maskClosable: { type: Boolean, default: false },
  escToClose: { type: Boolean, default: false },
  draggable: { type: Boolean, default: true },
  maxBodyHeight: { type: [Number, String], default: '' },
  form: { type: Object, required: true },
  columns: { type: Array as () => ColumnItem<any>[], default: () => [] },
  customBody: Boolean,
  customValidate: Function,
  clear: Boolean,
  onSave: Function,
})

const emit = defineEmits(['update:visible', 'update:form', 'save', 'close'])

const formRef = ref()
const localVisible = ref(props.visible)
const localForm = ref(props.form)
// const clear = ref(props.clear)
// const modalWidth = computed(() => (typeof props.width === 'number' && props.width >= 600 ? props.width : '100%'))
const modalWidth = computed(() => props.width || '600px')
const bodyStyle = computed(() => {
  if (!props.maxBodyHeight) return undefined
  const maxHeight = typeof props.maxBodyHeight === 'number' ? `${props.maxBodyHeight}px` : String(props.maxBodyHeight)
  return {
    maxHeight,
    overflow: 'auto',
  } as const
})

watch(() => props.visible, (val) => {
//   console.log(val)
  localVisible.value = val
//   if (localVisible.value && props.clear) {
//     localForm.value = { name: '', description: '', sort: 999 }
//   }
})

watch(() => props.form, (val) => {
//   console.log('props.form', val)
  localForm.value = { ...val }
}, { deep: true })

// watch(() => props.clear, (newVal, oldVal) => {
//   console.log(newVal, oldVal)
//   if (newVal) {
//     localForm.value = { }
//   }
// }, { immediate: true })

// 表单变更时同步到父组件
const onFormChange = (val: any) => {
//   console.log('update.form', val)
//   emit('update:form', val)
}

const handleSave = async () => {
  if (await formRef.value?.formRef.validate()) {
    Message.warning('请检查必填项')
    return false
  }
  if (props.customBody && props.customValidate && await props.customValidate(localForm.value) === false) {
    return false
  }
  //   await new Promise((resolve) => setTimeout(resolve, 500))
  emit('save', localForm.value)
  return true
//   if (props.onSave) {
//     return props.onSave(localForm.value)
//   }
}

const handleClose = () => {
  // 重置表单数据为初始值
  localForm.value = { ...props.form }
  // 如果需要重置表单验证状态，可以调用表单的 resetFields 方法
  nextTick(() => {
    if (formRef.value?.formRef?.resetFields) {
      formRef.value.formRef.resetFields()
    }
  })
  // 触发关闭事件
  emit('close')
}
</script>

<script lang="ts">
export default {}
</script>

<style lang="scss" scoped>
:deep(.w-full) {
  width: 100%;
  display: flex;
  flex-direction: column;
}
:deep(.aie-container-panel) {
  max-width: 600px !important;
}
</style>
