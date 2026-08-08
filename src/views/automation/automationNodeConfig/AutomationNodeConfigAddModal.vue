<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 1200 ? 1200 : '100%'"
    draggable
    @before-ok="save"
    @close="reset"
  >
    <GiForm ref="formRef" v-model="form" :columns="columns" />
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { addAutomationNodeConfig, addNode, getAutomationNodeConfig, updateAutomationNodeConfig, updateNode } from '@/apis/automation/automationNodeConfig'
import type { ColumnItem, GiForm } from '@/components/GiForm'
import { useResetReactive } from '@/hooks'
import { useDict } from '@/hooks/app'
import GiCodeMirror from '@/components/GiCode/CodeMirror/index.vue'

const props = defineProps({
  jenkinsList: {
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
const title = ref('')

const formRef = ref<InstanceType<typeof GiForm>>()
const { server_type, status_type } = useDict('server_type', 'status_type')

const [form, resetForm] = useResetReactive({
  id: '',
  type: '',
  mode: '',
  json: '',
  status: 1,
})

const linux_json = {
  'name': '172.19.5.47',
  'nodeDescription': '{"name":"数审产品环境1","systemType":"Linux","userName":"root","passWord":"@1fw#2soc$3vpn"}',
  'numExecutors': '1',
  'remoteFS': '/data/jenkins',
  'labelString': '172.19.5.47',
  'mode': 'EXCLUSIVE',
  '': [
    'hudson.plugins.sshslaves.SSHLauncher',
    '0',
  ],
  'launcher': {
    'oldCommand': '',
    'stapler-class': 'hudson.plugins.sshslaves.SSHLauncher',
    '$class': 'hudson.plugins.sshslaves.SSHLauncher',
    'host': '172.19.5.47',
    'includeUser': 'false',
    'credentialsId': 'fcaef557-298d-496f-a2f7-ada5048ff6b9',
    '': '3',
    'sshHostKeyVerificationStrategy': {
      'stapler-class': 'hudson.plugins.sshslaves.verifiers.NonVerifyingKeyVerificationStrategy',
      '$class': 'hudson.plugins.sshslaves.verifiers.NonVerifyingKeyVerificationStrategy',
    },
    'port': '22',
    'javaPath': '',
    'jvmOptions': '',
    'prefixStartSlaveCmd': '',
    'suffixStartSlaveCmd': '',
    'launchTimeoutSeconds': '',
    'maxNumRetries': '',
    'retryWaitTime': '',
    'tcpNoDelay': true,
    'workDir': '',
  },
  'retentionStrategy': {
    'stapler-class': 'hudson.slaves.RetentionStrategy$Always',
    '$class': 'hudson.slaves.RetentionStrategy$Always',
  },
  'nodeProperties': {
    'stapler-class-bag': 'true',
    'hudson-tools-ToolLocationNodeProperty': {
      locations: [
        {
          key: 'hudson.model.JDK$DescriptorImpl@JDK',
          home: '/data/jenkins/java/jdk1.8.0_202',
        },
        {
          key: 'hudson.tasks.Maven$MavenInstallation$DescriptorImpl@Maven',
          home: '/data/jenkins/maven/apache-maven-3.8.7',
        },
        {
          key: 'hudson.tasks.Ant$AntInstallation$DescriptorImpl@Ant',
          home: '/data/jenkins/ant/apache-ant-1.9.16',
        },
      ],
    },
    'hudson-slaves-EnvironmentVariablesNodeProperty': {
      env: {
        key: 'LANG',
        value: 'en_US.UTF-8',
      },
    },
  },
  'type': 'hudson.slaves.DumbSlave',
}

const windows_json = {
  'name': '172.19.5.229',
  'nodeDescription': '{"name":"数审自动化环境1","systemType":"Windows","userName":"Ankki","passWord":"${NODE_PASSWORD}"}',
  'numExecutors': '1',
  'remoteFS': 'D:\\Jenkins',
  'labelString': '数审自动化环境1',
  'mode': 'EXCLUSIVE',
  '': [
    'hudson.slaves.JNLPLauncher',
    '0',
  ],
  'launcher': {
    'oldCommand': '',
    'stapler-class': 'hudson.slaves.JNLPLauncher',
    '$class': 'hudson.slaves.JNLPLauncher',
    'workDirSettings': {
      disabled: false,
      workDirPath: 'D:\\Jenkins',
      internalDir: 'remoting',
      failIfWorkDirIsMissing: false,
    },
    'webSocket': true,
    'tunnel': '',
    'vmargs': '',
  },
  'retentionStrategy': {
    'stapler-class': 'hudson.slaves.RetentionStrategy$Always',
    '$class': 'hudson.slaves.RetentionStrategy$Always',
  },
  'nodeProperties': {
    'stapler-class-bag': 'true',
    'hudson-tools-ToolLocationNodeProperty': {
      locations: [
        {
          key: 'hudson.model.JDK$DescriptorImpl@JDK',
          home: 'C:\\Program Files\\Java\\jdk1.8.0_112',
        },
        {
          key: 'hudson.plugins.git.GitTool$DescriptorImpl@Git',
          home: 'D:\\Program\\Git\\cmd\\git.exe',
        },
        {
          key: 'hudson.tasks.Maven$MavenInstallation$DescriptorImpl@Maven',
          home: 'D:\\Program\\Maven',
        },
        {
          key: 'hudson.tasks.Ant$AntInstallation$DescriptorImpl@Ant',
          home: 'D:\\Program\\Ant\\org.apache.ant_1.9.6.v201510161327',
        },
        {
          key: 'hudson.tasks.Ant$AntInstallation$DescriptorImpl@Ant',
          home: 'D:/Program/Python/3.9.0/python.exe',
        },
      ],
    },
    'hudson-slaves-EnvironmentVariablesNodeProperty': {
      env: {
        key: 'LANG',
        value: 'zh_CN.UTF-8',
      },
    },
  },
  'type': 'hudson.slaves.DumbSlave',
}

// watch(() => form.type, async (newType) => {
//   if (newType === 'Linux') {
//     form.json = JSON.stringify(linux_json, null, 2)
//   } else {
//     form.json = JSON.stringify(windows_json, null, 2)
//   }
// }, { immediate: true })
const codeEditorRef = ref()
const columns = computed<ColumnItem[]>(() => [
  {
    label: '所属Jenkins',
    field: 'jenkinsId',
    span: 24,
    required: true,
    type: 'select',
    props: {
      options: props.jenkinsList,
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    label: '节点类型',
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
    label: '节点名称',
    field: 'name',
    span: 24,
    required: true,
    type: 'input',
    props: {
      maxLength: 30,
      allowClear: true,
    },
  },
  {
    label: '节点配置',
    field: 'json',
    span: 24,
    required: true,
    type: 'custom',
    slots: {
      default: () => h(GiCodeMirror, {
        'ref': (el) => { codeEditorRef.value = el },
        'example': form.type === 'Linux' ? JSON.stringify(linux_json, null, 2) : JSON.stringify(windows_json, null, 2),
        'value': form.json,
        'onUpdate:value': (val: any) => {
          form.json = val
        },
        'options': {
          theme: 'default',
          mode: form.mode,
          readOnly: false,
          lint: true,
          lineNumbers: true,
          lineWrapping: true,
          lineWiseCopyCut: true,
          styleActiveLine: true,
          viewportMargin: Infinity,
          placeholder: '',
        },
        'height': '400px',
        'width': '100%',
        'border': true,
      }),
    },
  },
  // {
  //   label: '节点描述',
  //   field: 'description',
  //   span: 24,
  //   required: true,
  //   type: 'input',
  //   props: {
  //     allowClear: true,
  //   },
  // },
  // {
  //   label: '节点环境状态',
  //   field: 'active',
  //   span: 24,
  //   required: true,
  //   type: 'input',
  //   props: {
  //     allowClear: true,
  //   },
  // },
  // {
  //   label: '节点参数列表',
  //   field: 'configList',
  //   span: 24,
  //   required: true,
  //   type: 'input',
  //   props: {
  //     allowClear: true,
  //   },
  // },
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
])

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
    if (isUpdate.value) {
      const { data } = await updateNode(form)
      Message.success('修改成功')
    } else {
      const perform = {
        ...form,
        type: 'hudson.slaves.DumbSlave',
      // json: JSON.stringify(form.json),
      }
      await addNode(perform)
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
  title.value = '新增节点配置'
  reset()
  dataId.value = ''
  visible.value = true
  form.mode = 'json'
}

// 修改
const onUpdate = async (id: string) => {
  title.value = '修改节点配置'
  reset()
  dataId.value = id
  const { data } = await getAutomationNodeConfig(id)
  // data.json = JSON.stringify(JSON.parse(data.json || '{}'), null, 2)
  Object.assign(form, data)
  visible.value = true
  // 等待DOM更新后再调用formatCode
  form.mode = 'xml'
  form.json = data.xml
  await nextTick()
  if (codeEditorRef.value) {
    codeEditorRef.value.formatCode()
  }
}

// 复制
const onCopy = async (id: string) => {
  title.value = '复制节点配置'
  reset()
  dataId.value = ''
  const { data } = await getAutomationNodeConfig(id)
  data.json = data.json ? data.json : ''
  Object.assign(form, data)
  form.id = ''
  form.mode = 'json'
  await nextTick()
  if (data.json && codeEditorRef.value) {
    codeEditorRef.value.formatCode()
  }
  visible.value = true
}

// 在modal显示时也刷新CodeMirror
// watch(() => visible.value, (newVal) => {
//   if (newVal) {
//     setTimeout(() => {
//       const cmElements = document.querySelectorAll('.CodeMirror')
//       cmElements.forEach((cm: any) => {
//         if (cm && cm.CodeMirror) {
//           cm.CodeMirror.refresh()
//         }
//       })
//     }, 300)
//   }
// })

defineExpose({ onAdd, onUpdate, onCopy })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss">
:deep(.CodeMirror-gutters){
  left: auto !important;
}
</style>
