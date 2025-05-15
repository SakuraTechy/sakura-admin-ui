<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 900 ? 900 : '100%'"
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
import { IconInfoCircle } from '@arco-design/web-vue/es/icon'
import { addProjectDataBaseConfig, getProjectDataBaseConfig, testProjectDataBaseConfig, updateProjectDataBaseConfig } from '@/apis/project/projectDataBaseConfig'
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
const title = computed(() => (isUpdate.value ? '修改项目管理-数据库配置' : '新增项目管理-数据库配置'))
const formRef = ref<InstanceType<typeof GiForm>>()
const { database_type, status_type } = useDict('database_type', 'status_type')

const [form, resetForm] = useResetReactive({
  status: 1,
  type: '',
  version: '',
  driver: '',
  url: '',
  ip: '',
  port: undefined,
  dataBase: '',
  userName: '',
  passWord: '',
  configList: [] as { paramsName: string, paramsValue: string }[],
})

// 数据库版本查看帮助信息
const getServerHelp = (typeValue: string) => {
  // 查找类型对应的值和标签
  const typeInfo = database_type.value?.find((item: any) => item.value === typeValue) || { label: '' }
  const typeLabel = typeInfo.label || ''

  return {
    title: '数据库如何开启远程访问？',
    content: h('div', {}, [
      h('div', {}, `执行: mysql -usroot -pAnkki_mySQL123 mysql`),
      h('div', {}, '执行: UPDATE `mysql`.`user` SET `Host` = \'%\' WHERE `User` = \'root\' And `Host` = \'localhost\';'),
      h('div', {}, `执行: quit;`),
      h('div', {}, `重启: systemctl restart mysqld`),
      h('div', {}, `Linux开放端口：firewall-cmd --zone=public --add-port=3306/tcp --permanent && firewall-cmd --reload`),
      h('div', {}, `Ubuntu开放端口：ufw allow 3306/tcp`),
      h('div', { style: 'font-weight: 500; margin-top: 5px; display: flex; align-items: center;' }, [
        h(IconInfoCircle, { style: 'margin-right: 5px; color: #165dff;' }),
            `如何查看数据库版本？`,
      ]),
      h('div', {}, `SQL：SELECT VERSION();`),
    ]),
    url: database_type.value?.find((item: any) => item.value === typeValue) || { label: '' },
  }
  if (typeLabel.includes('MySQL') || typeValue === 'MySQL') {
    return {
      title: '如何查看数据库版本？',
      content: h('div', {}, [
        h('div', {}, `SQL：SELECT VERSION();`),
      ]),
    }
  } else if (typeLabel.includes('Oracle') || typeValue === 'Oracle') {
    return {
      title: '如何查看数据库版本？',
      content: h('div', {}, [
        h('div', {}, `SQL：SELECT * FROM v$version;`),
        h('div', { style: 'font-weight: 500; margin-top: 5px; display: flex; align-items: center;' }, [
          h(IconInfoCircle, { style: 'margin-right: 5px; color: #165dff;' }),
            `数据库如何开启远程访问？`,
        ]),
        h('div', {}, `执行: mysql -usroot -pAnkki_mySQL123 mysql`),
        h('div', {}, '执行: UPDATE `mysql`.`user` SET `Host` = \'%\' WHERE `User` = \'sroot\' And `Host` = \'localhost\';'),
        h('div', {}, `执行: quit;`),
        h('div', {}, `重启: systemctl restart mysqld`),
        h('div', {}, `Linux开放端口：firewall-cmd --zone=public --add-port=3306/tcp --permanent && firewall-cmd --reload`),
        h('div', {}, `Ubuntu开放端口：ufw allow 3306/tcp`),
      ]),
    }
  } else {
    return {
      title: '数据库版本查看帮助？',
      content: h('div', {}, [
        // h('div', {}, `请先选择数据库类型获取对应的版本查看方法`),
        h('div', {}, `SQL：SELECT VERSION();`),
      ]),
    }
  }
}

// 当前显示的帮助信息
const versionHelpTitle = ref('数据库版本查看帮助')
const versionHelpContent = ref(h('div', {}, [
  h('div', {}, `请先选择数据库类型获取对应的版本查看方法`),
]))

// 类型变更标志
const typeChanged = ref(false)

// 监听数据库类型变化
watch(() => form.type, (newType) => {
  if (newType) {
    typeChanged.value = true
    const matchedItem = database_type.value?.find((item: any) => item.label === newType)
    if (matchedItem) {
      const help = getServerHelp(matchedItem.value)
      versionHelpTitle.value = help.title
      versionHelpContent.value = help.content
      form.driver = matchedItem.value
      form.url = (form.ip && form.port && form.dataBase)
        ? buildConnectionUrl(form.type, form.ip, form.port, form.dataBase, form.userName, form.passWord)
        : JSON.parse(matchedItem.extra ?? '{}').description
    }
  } else {
    typeChanged.value = false
  }
}, { immediate: true })

watch(() => form.version, (newType) => {
  if (newType) {
    typeChanged.value = false
  } else {
    typeChanged.value = true
  }
}, { immediate: true })

// 简化的URL构建函数
const buildConnectionUrl = (dbType: string, host: string, port?: string | number, database?: string, userName?: string, passWord?: string): string => {
  const defaultUrl = `jdbc:mysql://${host}:${port}/${database}`

  try {
    // 查找匹配的数据库类型并获取URL模板
    const matchedItem = database_type.value?.find((item: any) => item.label === dbType)
    if (!matchedItem?.extra) return defaultUrl

    const { description = '' } = JSON.parse(matchedItem.extra)
    if (!description) return defaultUrl

    // 替换所有占位符
    return description
      .replace('localhost', host)
      .replace(/(:port|PORT=port|DBS_PORT=port)/, (m) =>
        m === ':port'
          ? `:${port}`
          : m === 'PORT=port' ? `PORT=${port}` : `DBS_PORT=${port}`)
      .replace(/(:mydb|\/mydb|DATABASE=mydb|databaseName=mydb|schema=mydb)/, (m) =>
        m.includes('/mydb')
          ? `/${database}`
          : m.includes(':mydb')
            ? `:${database}`
            : m.includes('DATABASE=mydb')
              ? `DATABASE=${database}`
              : m.includes('databaseName=mydb')
                ? `databaseName=${database}`
                : `schema=${database}`)
      .replace('userName:passWord@', (userName && passWord) ? `${userName}:${passWord}@` : 'userName:passWord@')
  } catch (e) {
    return defaultUrl
  }
}

// 监听相关字段变化，更新URL
watch([() => form.type, () => form.ip, () => form.port, () => form.dataBase, () => form.userName, () => form.passWord], () => {
  if (form.type && form.ip && form.port && form.dataBase) {
    form.url = buildConnectionUrl(form.type, form.ip, form.port, form.dataBase, form.userName, form.passWord)
  }
})

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
      label: '数据库类型',
      field: 'type',
      span: 24,
      required: true,
      type: 'select',
      props: {
        options: database_type.value?.map((item) => ({
          ...item,
          value: item.label, // Use label as the value to avoid duplicates
        })),
        allowClear: true,
        allowSearch: true,
      },
    },
    {
      label: '数据库版本',
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
      label: '数据库驱动',
      field: 'driver',
      span: 24,
      required: true,
      type: 'input',
      props: {
        maxLength: 255,
        allowClear: true,
      },
    },
    {
      label: '数据库IP',
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
      label: '数据库端口',
      field: 'port',
      span: 24,
      required: true,
      type: 'input-number',
      props: {
        allowClear: true,
      },
    },
    {
      label: '数据库/模式',
      field: 'dataBase',
      span: 24,
      required: true,
      type: 'input',
      props: {
        maxLength: 30,
        allowClear: true,
      },
    },
    {
      label: '数据库用户名',
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
      label: '数据库密码',
      field: 'passWord',
      span: 24,
      required: true,
      type: 'input-password',
      props: {
        maxLength: 255,
        allowClear: true,
      },
    },
    {
      label: '数据库连接串',
      field: 'url',
      span: 24,
      required: true,
      type: 'input',
      props: {
        maxLength: 255,
        allowClear: true,
      },
    },
    {
      label: '数据库描述',
      field: 'description',
      span: 24,
      type: 'input',
      props: {
        maxLength: 255,
        allowClear: true,
      },
    },
    {
      label: '数据库参数配置',
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
  // 如果选择了数据库类型，在数据库类型和数据库版本之间插入帮助信息
  if (form.type && typeChanged.value) {
    // 获取对应的数据库类型标签 (form.type is now the label)
    const typeLabel = form.type

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
          ]),
          versionHelpContent.value,
        ]),
      },
    }

    // 在数据库版本之后插入帮助信息
    baseColumns.splice(2, 0, helpColumn)
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
    await testProjectDataBaseConfig(form)
    if (isUpdate.value) {
      await updateProjectDataBaseConfig(form, dataId.value)
      Message.success('修改成功')
    } else {
      await addProjectDataBaseConfig(form)
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
  const { data } = await getProjectDataBaseConfig(id)
  Object.assign(form, data)
  visible.value = true
}

defineExpose({ onAdd, onUpdate })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss"></style>
