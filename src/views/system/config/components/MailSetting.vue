<template>
  <a-spin :loading="loading">
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      auto-label-width
      label-align="left"
      :layout="width >= 500 ? 'horizontal' : 'vertical'"
      :disabled="!isUpdate"
      scroll-to-first-error
      class="form"
    >
      <a-form-item
        field="MAIL_PROTOCOL"
        :label="mailConfig.MAIL_PROTOCOL.name"
        :help="mailConfig.MAIL_PROTOCOL.description"
        hide-asterisk
      >
        <a-select v-model.trim="form.MAIL_PROTOCOL">
          <a-option label="SMTP" value="smtp" />
        </a-select>
      </a-form-item>
      <a-form-item
        field="MAIL_HOST"
        :label="mailConfig.MAIL_HOST.name"
        :help="mailConfig.MAIL_HOST.description"
        hide-asterisk
      >
        <a-input v-model.trim="form.MAIL_HOST" />
      </a-form-item>
      <a-form-item
        field="MAIL_PORT"
        :label="mailConfig.MAIL_PORT.name"
        :help="mailConfig.MAIL_PORT.description"
        hide-asterisk
      >
        <a-input-number v-model="form.MAIL_PORT" :min="0" />
      </a-form-item>
      <a-form-item
        field="MAIL_USERNAME"
        :label="mailConfig.MAIL_USERNAME.name"
        :help="mailConfig.MAIL_USERNAME.description"
        hide-asterisk
      >
        <a-input v-model.trim="form.MAIL_USERNAME" />
      </a-form-item>
      <a-form-item
        field="MAIL_PASSWORD"
        :label="mailConfig.MAIL_PASSWORD?.name"
        :help="mailConfig.MAIL_PASSWORD.description"
        hide-asterisk
      >
        <a-input-password v-model.trim="form.MAIL_PASSWORD" />
      </a-form-item>
      <a-form-item
        field="MAIL_SSL_ENABLED"
        :label="mailConfig.MAIL_SSL_ENABLED?.name"
        :help="mailConfig.MAIL_SSL_ENABLED.description"
        hide-asterisk
      >
        <a-switch
          v-model="form.MAIL_SSL_ENABLED"
          type="round"
          checked-value="1"
          unchecked-value="0"
        >
          <template #checked>启用</template>
          <template #unchecked>禁用</template>
        </a-switch>
      </a-form-item>
      <a-form-item
        v-if="form.MAIL_SSL_ENABLED === '1'"
        field="MAIL_SSL_PORT"
        :label="mailConfig.MAIL_SSL_PORT.name"
        :help="mailConfig.MAIL_SSL_PORT.description"
        hide-asterisk
      >
        <a-input-number v-model="form.MAIL_SSL_PORT" :min="0" />
      </a-form-item>
      <a-space style="margin-bottom: 16px">
        <a-button v-if="!isUpdate" v-permission="['system:config:update']" type="primary" @click="onUpdate">
          <template #icon><icon-edit /></template>修改
        </a-button>
        <a-button v-if="!isUpdate" v-permission="['system:config:reset']" @click="onResetValue">
          <template #icon><icon-undo /></template>恢复默认
        </a-button>
        <a-button v-if="isUpdate" type="primary" @click="handleSave">
          <template #icon><icon-save /></template>保存
        </a-button>
        <a-button v-if="isUpdate" v-permission="['system:config:update']" @click="openTestMailModal">
          <template #icon><icon-send /></template>测试连接
        </a-button>
        <a-button v-if="isUpdate" @click="reset">
          <template #icon><icon-refresh /></template>重置
        </a-button>
        <a-button v-if="isUpdate" @click="handleCancel">
          <template #icon><icon-undo /></template>取消
        </a-button>
      </a-space>
    </a-form>
    <a-modal
      v-model:visible="testMailVisible"
      title="测试邮件配置"
      :mask-closable="false"
      :esc-to-close="false"
      :width="width >= 500 ? 500 : '100%'"
      @before-ok="handleTestMail"
      @close="resetTestMail"
    >
      <a-form ref="testMailFormRef" :model="testMailForm" :rules="testMailRules">
        <a-form-item field="recipient" label="收件人">
          <a-input v-model.trim="testMailForm.recipient" placeholder="请输入实际收件人邮箱" />
        </a-form-item>
      </a-form>
      <div class="test-mail-tip">将使用当前页面填写的配置发送测试邮件，测试不会保存配置。</div>
    </a-modal>
  </a-spin>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type FormInstance, Message, Modal } from '@arco-design/web-vue'
import {
  type MailConfig,
  type MailTestReq,
  type OptionResp,
  listOption,
  resetOptionValue,
  testMailConfig,
  updateOption,
} from '@/apis/system'
import { useResetReactive } from '@/hooks'

defineOptions({ name: 'MailSetting' })
const { width } = useWindowSize()
const loading = ref<boolean>(false)
const formRef = ref<FormInstance>()
const testMailFormRef = ref<FormInstance>()
const [form] = useResetReactive({
  MAIL_PROTOCOL: '',
  MAIL_HOST: '',
  MAIL_PORT: 0,
  MAIL_USERNAME: '',
  MAIL_PASSWORD: '',
  MAIL_SSL_ENABLED: '',
  MAIL_SSL_PORT: 0,
})
const rules: FormInstance['rules'] = {
  MAIL_HOST: [{ required: true, message: '请输入值' }],
  MAIL_PORT: [{ required: true, message: '请输入值' }],
  MAIL_USERNAME: [{ required: true, message: '请输入值' }],
  MAIL_PASSWORD: [{ required: true, message: '请输入值' }],
  MAIL_SSL_PORT: [{ required: true, message: '请输入值' }],
}
const testMailRules: FormInstance['rules'] = {
  recipient: [
    { required: true, message: '请输入收件人邮箱' },
    { type: 'email', message: '收件人邮箱格式不正确' },
  ],
}
const testMailVisible = ref(false)
const testMailForm = reactive({ recipient: '' })

const mailConfig = ref<MailConfig>({
  MAIL_PROTOCOL: {},
  MAIL_HOST: {},
  MAIL_PORT: {},
  MAIL_USERNAME: {},
  MAIL_PASSWORD: {},
  MAIL_SSL_ENABLED: {},
  MAIL_SSL_PORT: {},
})

// 重置
const reset = () => {
  formRef.value?.resetFields()
  form.MAIL_PROTOCOL = mailConfig.value.MAIL_PROTOCOL.value || ''
  form.MAIL_HOST = mailConfig.value.MAIL_HOST.value || ''
  form.MAIL_PORT = mailConfig.value.MAIL_PORT.value || 0
  form.MAIL_USERNAME = mailConfig.value.MAIL_USERNAME.value || ''
  form.MAIL_PASSWORD = mailConfig.value.MAIL_PASSWORD?.value || ''
  form.MAIL_SSL_ENABLED = mailConfig.value.MAIL_SSL_ENABLED.value || ''
  form.MAIL_SSL_PORT = mailConfig.value.MAIL_SSL_PORT.value || 0
}

const isUpdate = ref(false)
// 修改
const onUpdate = () => {
  isUpdate.value = true
}

// 取消
const handleCancel = () => {
  reset()
  isUpdate.value = false
}

const queryForm = {
  category: 'MAIL',
}
// 查询列表数据
const getDataList = async () => {
  loading.value = true
  const { data } = await listOption(queryForm)
  mailConfig.value = data.reduce((obj: MailConfig, option: OptionResp) => {
    obj[option.code] = { ...option, value: ['MAIL_PORT', 'MAIL_SSL_PORT'].includes(option.code) ? Number.parseInt(option.value) : option.value }
    return obj
  }, {})
  handleCancel()
  loading.value = false
}

// 保存
const handleSave = async () => {
  const isInvalid = await formRef.value?.validate()
  if (isInvalid) return false
  await updateOption(
    Object.entries(form).map(([key, value]) => {
      return { id: mailConfig.value[key].id, code: key, value }
    }),
  )
  await getDataList()
  Message.success('保存成功')
}

const openTestMailModal = async () => {
  const isInvalid = await formRef.value?.validate()
  if (isInvalid) return
  testMailVisible.value = true
}

const resetTestMail = () => {
  testMailFormRef.value?.resetFields()
  testMailForm.recipient = ''
}

const handleTestMail = async () => {
  const isInvalid = await testMailFormRef.value?.validate()
  if (isInvalid) return false
  const request: MailTestReq = {
    recipient: testMailForm.recipient,
    protocol: form.MAIL_PROTOCOL,
    host: form.MAIL_HOST,
    port: Number(form.MAIL_PORT),
    username: form.MAIL_USERNAME,
    password: form.MAIL_PASSWORD,
    sslEnabled: form.MAIL_SSL_ENABLED === '1',
    sslPort: Number(form.MAIL_SSL_PORT),
  }
  await testMailConfig(request).then(() => {
    Message.success('测试邮件已发送，请检查收件箱')
    return true
  }).catch((error) => {
    loading.value = false
    return false
  })
}

// 恢复默认
const handleResetValue = async () => {
  await resetOptionValue(queryForm)
  Message.success('恢复成功')
  await getDataList()
}
const onResetValue = () => {
  Modal.warning({
    title: '警告',
    content: '确认恢复邮件配置为默认值吗？',
    hideCancel: false,
    maskClosable: false,
    onOk: handleResetValue,
  })
}

onMounted(() => {
  getDataList()
})
</script>

<style scoped lang="scss">
:deep(.arco-form-item.arco-form-item-has-help) {
  margin-bottom: 5px;
}

:deep(.form .arco-input-wrapper),
:deep(.arco-select-view-single) {
  width: 220px;
}

.test-mail-tip {
  color: var(--color-text-3);
  font-size: 13px;
}
</style>
