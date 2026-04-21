<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 800 ? 800 : '100%'"
    draggable
    @before-ok="save"
    @close="reset"
  >
    <GiForm
      ref="formRef"
      v-model="form"
      :columns="columns"
      :label-col-props="{ span: 6 }"
      :wrapper-col-props="{ span: 18 }"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { IconInfoCircle, IconQuestionCircle } from '@arco-design/web-vue/es/icon'
import { useWindowSize } from '@vueuse/core'
import { h, ref, watch } from 'vue'
import { addProjectServerConfig, getProjectServerConfig, testProjectServerConfig, updateProjectServerConfig } from '@/apis/project/projectServerConfig'
import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'
import KeyValuePairForm from '@/components/KeyValuePairForm'

const props = defineProps({
  projectList: {
    type: Array,
  },
})

const emit = defineEmits<{
  (e: 'save-success'): void
}>()

const { width } = useWindowSize()

const dataId = ref('')
const visible = ref(false)
const isUpdate = computed(() => !!dataId.value)
const title = computed(() => (isUpdate.value ? '修改项目管理-服务器配置' : '新增项目管理-服务器配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { server_type, status_type } = useDict('server_type', 'status_type')

const [form, resetForm] = useResetReactive({
  status: 1,
  type: '',
  version: '',
  configList: [] as { paramsName: string, paramsValue: string }[],
})

// 服务器版本查看帮助信息
const getServerHelp = (typeValue: string) => {
  // 查找类型对应的值和标签
  const typeInfo = server_type.value?.find((item: any) => item.value === typeValue) || { label: '' }
  const typeLabel = typeInfo.label || ''

  if (typeLabel.includes('Windows') || typeValue === 'Windows') {
    return {
      title: 'Windows如何开启远程连接？',
      content: h('div', {}, [
        h('div', {}, `工具：FreeSShd 或 Bitvise SSH Client`),
        h('div', {}, `教程：https://zhuanlan.zhihu.com/p/115563492`),
        h('div', {}, `下载：https://download.cnet.com/freessh/3000-2085_4-75937656.html`),
        h('div', { style: 'font-weight: 500; margin-top: 5px; display: flex; align-items: center;' }, [
          h(IconInfoCircle, { style: 'margin-right: 5px; color: #165dff;' }),
          `Windows如何查看服务器版本？`,
        ]),
        h('div', {}, `教程：https://yuanbao.tencent.com/bot/app/share/chat/FoS1iyKhCjqY`),
        h('div', {}, `方法一：【PowerShell专用命令】`),
        h('div', {}, `执行：Get-WmiObject Win32_OperatingSystem | Select-Object Caption, Version`),
        h('div', { style: 'margin-top: 5px;' }, '方法二：【​通过​系统属性查看】'),
        h('div', {}, `右键点击"此电脑" → 选择"属性"`),
        h('div', {}, `在"Windows 规格"区域直接显示版本信息（如：Windows Server 2022 Datacenter 21H2）`),
      ]),
    }
  } else if (typeLabel.includes('Linux') || typeValue === 'Linux') {
    return {
      title: 'Linux如何开启远程连接？',
      content: h('div', {}, [
        h('div', {}, `执行: sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config`),
        h('div', {}, `执行: systemctl reload sshd`),
        h('div', { style: 'font-weight: 500; margin-top: 5px; display: flex; align-items: center;' }, [
          h(IconInfoCircle, { style: 'margin-right: 5px; color: #165dff;' }),
          `Linux如何查看服务器版本？`,
        ]),
        h('div', {}, `方法一：【lsb_release】`),
        h('div', {}, `下载: wget https://downloads.sourceforge.net/lsb/lsb-release-1.4.tar.gz`),
        h('div', {}, `解压: tar -zxvf lsb-release-1.4.tar.gz &&  cd lsb-release-1.4`),
        h('div', {}, `安装: sudo make install`),
        h('div', {}, `执行: lsb_release -a`),
        h('div', {}, `查看: CentOS Linux release 7.9.2009 (Core)`),
        h('div', { style: 'margin-top: 5px;' }, `方法二：【cat /etc/*-release】`),
        h('div', {}, `查看: CentOS Linux release 7.9.2009 (Core)`),
      ]),
    }
  } else {
    return {
      title: '服务器版本查看帮助',
      content: h('div', {}, [
        h('div', {}, `请先选择服务器类型获取对应的版本查看方法`),
      ]),
    }
  }
}

// 当前显示的帮助信息
const versionHelpTitle = ref('服务器版本查看帮助')
const versionHelpContent = ref(h('div', {}, [
  h('div', {}, `请先选择服务器类型获取对应的版本查看方法`),
]))

// 类型变更标志
const typeChanged = ref(false)

// 监听服务器类型变化
watch(() => form.type, (newType) => {
  if (newType) {
    const help = getServerHelp(newType)
    versionHelpTitle.value = help.title
    versionHelpContent.value = help.content
  }
  if (form.version) {
    typeChanged.value = false
  } else {
    typeChanged.value = true
  }
}, { immediate: true })

watch(() => form.version, (newType) => {
  if (newType) {
    typeChanged.value = false
  } else {
    typeChanged.value = true
  }
}, { immediate: true })

const columns = computed<ColumnItem[]>(() => {
  const baseColumns: ColumnItem[] = [
    {
      label: '所属项目',
      field: 'projectId',
      span: 24,
      required: true,
      type: 'select',
      props: {
        options: props.projectList,
        allowClear: true,
        allowSearch: true,
      },
    },
    {
      label: '服务器类型',
      field: 'type',
      span: 24,
      required: true,
      type: 'select',
      props: {
        options: server_type.value,
        allowClear: true,
        allowSearch: true,
      },
    },
    {
      label: '服务器版本',
      field: 'version',
      span: 24,
      required: true,
      type: 'input',
      props: {
        maxLength: 30,
        allowClear: true,
      },
    },
    {
      label: '服务器IP',
      field: 'ip',
      span: 24,
      required: true,
      type: 'input',
      props: {
        maxLength: 30,
        allowClear: true,
      },
    },
    {
      label: '服务器端口',
      field: 'port',
      span: 24,
      required: true,
      type: 'input-number',
      props: {
        allowClear: true,
      },
    },
    {
      label: '服务器用户名',
      field: 'userName',
      span: 24,
      required: true,
      type: 'input',
      props: {
        maxLength: 30,
        allowClear: true,
      },
    },
    {
      label: '服务器密码',
      field: 'passWord',
      span: 24,
      required: true,
      type: 'input-password',
      props: {
        maxLength: 30,
        allowClear: true,
      },
    },
    {
      label: '服务器描述',
      field: 'description',
      span: 24,
      type: 'textarea',
      props: {
        maxLength: 255,
        autoSize: true,
        allowClear: true,
      },
    },
    {
      label: '服务器参数配置',
      field: 'configList',
      span: 24,
      type: 'custom',
      slots: {
        default: () => h(KeyValuePairForm, {
          'modelValue': form.configList,
          'onUpdate:modelValue': (val: any) => {
            form.configList = val
          },
          'nameColSpan': 5,
          'valueColSpan': 13,
          'actionColSpan': 2,
          'colGap': 10,
        }),
      },
    },
    {
      label: '状态',
      field: 'status',
      span: 24,
      type: 'switch',
      props: {
        options: status_type.value,
        type: 'round',
        checkedValue: 1,
        uncheckedValue: 2,
        checkedText: '启用',
        uncheckedText: '禁用',
      },
    },
  ]

  // 如果选择了服务器类型，在服务器类型和服务器版本之间插入帮助信息
  if (form.type && typeChanged.value) {
    // 获取对应的服务器类型标签
    const typeInfo = server_type.value?.find((item: any) => item.value === form.type) || { label: '' }
    const typeLabel = typeInfo.label || form.type

    // 创建帮助信息组件
    const helpColumn: ColumnItem = {
      field: 'versionHelp',
      span: 24,
      type: 'custom',
      slots: {
        default: () => h('div', {
          style: 'padding: 8px 12px; background-color: #f2f3f5; border-radius: 4px; color: #333;',
        }, [
          h('div', { style: 'font-weight: 500; margin-bottom: 4px; display: flex; align-items: center;' }, [
            h(IconInfoCircle, { style: 'margin-right: 5px; color: #165dff;' }),
            `${typeLabel}${versionHelpTitle.value.replace('Windows', '').replace('Linux', '')}`,
            // `${typeLabel}${versionHelpTitle.value}`,
          ]),
          versionHelpContent.value,
        ]),
      },
    }

    // 在服务器版本之后插入帮助信息
    baseColumns.splice(3, 0, helpColumn)
  }

  return baseColumns
})

// 重置
const reset = () => {
  formRef.value?.formRef?.resetFields()
  resetForm()
}

// 保存
const save = async () => {
  try {
    const isInvalid = await formRef.value?.formRef?.validate()
    if (isInvalid) return false
    await testProjectServerConfig(form)
    if (isUpdate.value) {
      await updateProjectServerConfig(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addProjectServerConfig(form)
      Message.success('新增成功')
    }
    emit('save-success')
    return true
  } catch (error) {
    return false
  }
}

// 新增
const onAdd = async () => {
  reset()
  dataId.value = ''
  visible.value = true
}

// 修改
const onUpdate = async (id: string) => {
  reset()
  dataId.value = id
  const { data } = await getProjectServerConfig(id)
  Object.assign(form, data)
  visible.value = true
}

// 复制
const onCopy = async (id: string) => {
  reset()
  dataId.value = ''
  const { data } = await getProjectServerConfig(id)
  data.id = ''
  Object.assign(form, data)
  visible.value = true
}

// 测试
const onTest = async (record: any) => {
  // Object.assign(form, (await getProjectServerConfig(record.id)).data)
  const { msg } = await testProjectServerConfig(record)
  msg === 'ok' ? Message.success('测试连接成功') : Message.error(msg)
}

defineExpose({ onAdd, onUpdate, onCopy, onTest })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss"></style>
