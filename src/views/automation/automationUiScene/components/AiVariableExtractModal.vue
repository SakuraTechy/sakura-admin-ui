<template>
  <a-modal
    v-model:visible="modalVisible"
    title="AI 智能提取变量"
    width="700px"
    :mask-closable="false"
    @before-ok="handleConfirm"
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="vertical">
      <a-form-item label="原始值示例" required>
        <a-textarea
          v-model="form.rawValue"
          placeholder="粘贴命令输出结果或响应内容示例"
          :auto-size="{ minRows: 4, maxRows: 8 }"
          :max-length="4096"
        />
        <template #extra>
          <span class="form-extra-text">
            提供实际的输出示例，AI 将分析并生成提取规则
          </span>
        </template>
      </a-form-item>

      <a-form-item label="提取指令" required>
        <a-textarea
          v-model="form.instruction"
          placeholder="例如：提取订单号、提取 token 字段、提取第一个数字"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          :max-length="512"
        />
        <template #extra>
          <span class="form-extra-text">
            用自然语言描述要提取的内容
          </span>
        </template>
      </a-form-item>

      <a-divider v-if="result" orientation="left">生成结果</a-divider>

      <div v-if="result" class="result-section">
        <a-alert type="success" :closable="false">
          <template #icon><icon-check-circle /></template>
          AI 已生成提取规则
        </a-alert>

        <div class="result-item">
          <div class="result-label">正则表达式</div>
          <a-input v-model="result.pattern" readonly>
            <template #append>
              <a-button type="text" @click="copyToClipboard(result.pattern)">
                <template #icon><icon-copy /></template>
              </a-button>
            </template>
          </a-input>
        </div>

        <div class="result-item">
          <div class="result-label">捕获组</div>
          <a-input-number v-model="result.group" readonly :style="{ width: '100%' }" />
        </div>

        <div class="result-item">
          <div class="result-label">生成原因</div>
          <a-textarea v-model="result.reason" readonly :auto-size="{ minRows: 2, maxRows: 4 }" />
        </div>

        <a-alert v-if="testResult" type="info" :closable="false" class="test-result">
          <template #icon><icon-info-circle /></template>
          <div class="test-result-content">
            <div class="test-result-label">实时测试</div>
            <div class="test-result-value">{{ testResult }}</div>
          </div>
        </a-alert>
      </div>

      <a-spin v-if="loading" :loading="loading" tip="AI 正在分析..." style="width: 100%; padding: 24px 0;" />
    </a-form>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="loading" :disabled="!canGenerate" @click="handleGenerate">
          <template #icon><icon-robot /></template>
          生成规则
        </a-button>
        <a-button v-if="result" type="primary" status="success" @click="handleConfirm">
          <template #icon><icon-check /></template>
          应用到表单
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconRobot } from '@arco-design/web-vue/es/icon'
import { generateVariableExtractRule } from '@/apis/automation/automationAi'
import type { AutomationVariableExtractRuleResp } from '@/apis/automation/automationAi'

const props = defineProps<{
  visible: boolean
  defaultRawValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', result: AutomationVariableExtractRuleResp): void
}>()

const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const form = reactive({
  rawValue: '',
  instruction: '',
})

const loading = ref(false)
const result = ref<AutomationVariableExtractRuleResp | null>(null)

// 实时测试：使用生成的正则验证原始值
const testResult = computed(() => {
  if (!result.value || !form.rawValue) return null
  try {
    const regex = new RegExp(result.value.pattern)
    const match = form.rawValue.match(regex)
    if (!match) return '未匹配到内容'
    const group = result.value.group
    return match[group] || '捕获组为空'
  } catch (e) {
    return '正则表达式无效'
  }
})

const canGenerate = computed(() => {
  return form.rawValue.trim() !== '' && form.instruction.trim() !== ''
})

watch(() => props.visible, (visible) => {
  if (visible) {
    form.rawValue = props.defaultRawValue || ''
    form.instruction = ''
    result.value = null
  }
})

async function handleGenerate() {
  if (!canGenerate.value) {
    Message.warning('请填写原始值和提取指令')
    return
  }

  loading.value = true
  try {
    const resp = await generateVariableExtractRule({
      raw_value: form.rawValue.trim(),
      instruction: form.instruction.trim(),
    })
    result.value = resp.data
    Message.success('规则生成成功')
  } catch (error: any) {
    Message.error(error.message || '生成失败')
  } finally {
    loading.value = false
  }
}

function handleConfirm() {
  if (!result.value) {
    Message.warning('请先生成提取规则')
    return false
  }
  emit('confirm', result.value)
  modalVisible.value = false
  return true
}

function handleCancel() {
  modalVisible.value = false
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    Message.success('已复制到剪贴板')
  }).catch(() => {
    Message.error('复制失败')
  })
}
</script>

<style scoped lang="less">
.form-extra-text {
  color: var(--color-text-3);
  font-size: 13px;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: var(--color-fill-2);
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-label {
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 500;
}

.test-result {
  margin-top: 4px;
}

.test-result-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.test-result-label {
  color: var(--color-text-3);
  font-size: 12px;
}

.test-result-value {
  color: var(--color-text-1);
  font-weight: 500;
  font-family: var(--font-family-mono, 'Consolas', 'Monaco', monospace);
  word-break: break-all;
}
</style>
