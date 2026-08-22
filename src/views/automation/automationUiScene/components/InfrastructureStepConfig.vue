<template>
  <div class="infrastructure-step-config">
    <a-form :model="form" layout="vertical" class="config-form">
      <a-row :gutter="16" class="config-columns">
        <a-col :span="10">
          <a-card title="目标配置" size="small" class="config-card target-config-card">
            <template #extra>
              <a-button type="outline" size="small" @click="goTargetConfig">去配置</a-button>
            </template>
            <a-form-item :label="kind === 'server' ? '服务器角色' : '数据库角色'" required class="target-item">
              <a-select
                v-model="form.targetConfigId"
                :loading="targetConfigLoading"
                :disabled="!projectId"
                :placeholder="kind === 'server' ? '请选择服务器角色' : '请选择数据库角色'"
                allow-search
              >
                <a-option
                  v-for="item in targetConfigOptions"
                  :key="item.value"
                  :value="item.value"
                  :label="item.label"
                >
                  <div class="option-row"><span class="option-main">{{ item.label }}</span><code>{{ item.code }}</code></div>
                </a-option>
              </a-select>
            </a-form-item>
            <div v-if="selectedTarget" class="summary-list">
              <div class="summary-item">
                <span class="summary-label">资源角色</span>
                <a-tag size="small" color="arcoblue">{{ selectedTarget.label }}</a-tag>
              </div>
              <div class="summary-item">
                <span class="summary-label">角色编码</span>
                <span class="summary-value">{{ selectedTarget.code }}</span>
              </div>
              <div v-if="kind === 'database'" class="summary-item">
                <span class="summary-label">数据库信息</span>
                <span class="summary-value">{{ selectedTarget.resourceLabel || '未绑定' }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">启用状态</span>
                <a-tag size="small" color="green">启用</a-tag>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :span="14">
          <a-card title="执行配置" size="small" class="config-card">
            <a-row :gutter="[12, 0]">
              <template v-if="kind === 'server'">
                <a-col :span="16">
                  <a-form-item required>
                    <template #label>
                      <span class="form-label-with-help">
                        Shell 脚本类型
                        <a-tooltip
                          v-if="!selectedServerType.includes('windows')"
                          position="top"
                          size="medium"
                          :content-style="{ width: 'max-content', maxWidth: 'calc(100vw - 32px)' }"
                        >
                          <template #content>
                            <pre class="powershell-install-hint">{{ linuxPowerShellInstallHint }}</pre>
                          </template>
                          <icon-question-circle class="form-label-help-icon" />
                        </a-tooltip>
                      </span>
                    </template>
                    <a-select v-model="form.shell" :options="shellOptions" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="超时（毫秒）">
                    <a-input-number v-model="form.timeoutMs" :min="1000" :max="600000" :precision="0" />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="服务器命令" required>
                    <a-textarea v-model="form.command" :auto-size="{ minRows: 6, maxRows: 6 }" :placeholder="commandPlaceholder" />
                  </a-form-item>
                </a-col>
              </template>
              <template v-else-if="actionType === 'database_sql'">
                <a-col :span="16">
                  <a-form-item label="SQL 执行模式" required>
                    <a-select v-model="form.sqlMode" :options="sqlModeOptions" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="超时（毫秒）">
                    <a-input-number v-model="form.timeoutMs" :min="1000" :max="600000" :precision="0" />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="SQL / 原生操作内容" required>
                    <a-textarea v-model="form.sql" :auto-size="{ minRows: 6, maxRows: 6 }" :placeholder="sqlPlaceholder" />
                  </a-form-item>
                </a-col>
              </template>
              <template v-else>
                <a-col :span="12">
                  <a-form-item label="MongoDB 原生操作" required>
                    <a-select v-model="form.mongoOperation" :options="mongoOperationOptions" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="集合名称" required>
                    <a-input v-model="form.collection" placeholder="例如：users" :max-length="128" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="超时（毫秒）">
                    <a-input-number v-model="form.timeoutMs" :min="1000" :max="600000" :precision="0" />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="过滤条件（JSON）">
                    <a-textarea v-model="form.filter" :auto-size="{ minRows: 2, maxRows: 6 }" :placeholder="mongoFilterPlaceholder" />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="写入文档 / 更新内容（JSON）">
                    <a-textarea v-model="form.document" :auto-size="{ minRows: 3, maxRows: 8 }" :placeholder="mongoDocumentPlaceholder" />
                  </a-form-item>
                </a-col>
              </template>
            </a-row>
          </a-card>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { AutomationUiStepConfig } from '@/apis/automation/automationUiScene'
import { listEnvironmentResourceSlots } from '@/apis/automation/environmentResources'

type InfrastructureActionType = 'server_command' | 'database_sql' | 'database_native'

interface TargetConfigOption {
  value: string
  label: string
  code: string
  databaseIp?: string
  databasePort?: number
  databaseName?: string
  resourceLabel?: string
}

const props = defineProps<{
  modelValue?: AutomationUiStepConfig[]
  actionType: InfrastructureActionType
  /** 目录方法存在时由后端组装 canonical step，前端不得生成 playwright_step。 */
  methodCode?: string
  methodVersion?: number
  projectId?: string | number
  environmentId?: string | number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AutomationUiStepConfig[]): void
  (e: 'go-target-config', kind: 'server' | 'database'): void
}>()

const linuxShellOptions = [
  { label: 'bash', value: 'bash' },
  { label: 'sh', value: 'sh' },
  { label: 'PowerShell', value: 'powershell' },
]
const linuxPowerShellInstallHint = `# Linux PowerShell 安装
## CentOS 7 安装 PowerShell 替换为阿里云镜像（国内速度快，推荐）
1. 备份并创建新的 Base repo
mkdir -p /etc/yum.repos.d/backup
mv /etc/yum.repos.d/*.repo /etc/yum.repos.d/backup/
2. 下载阿里云 CentOS 7 仓库文件
curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.re
3. 清空缓存并生成新的缓存
yum clean all && yum makecache
4. 重新安装 PowerShell（Microsoft 的 repo 需要重新添加）
curl https://packages.microsoft.com/config/rhel/7/prod.repo | tee /etc/yum.repos.d/microsoft.repo
5. 安装 PowerShell
yum install -y powershell
6. 安装完成后验证
pwsh --version`

const windowsShellOptions = [{ label: 'PowerShell', value: 'powershell' }]
const sqlModeOptions = [
  { label: '查询类型语句（executeQuery）', value: 'query' },
  { label: '更新类型语句（executeUpdate）', value: 'update' },
  { label: '调用存储过程（prepareCall）', value: 'call' },
]
const mongoOperationOptions = [
  { label: '查询（find）', value: 'find' },
  { label: '新增（insert）', value: 'insert' },
  { label: '更新（update）', value: 'update' },
  { label: '删除（delete）', value: 'delete' },
]

const kind = computed(() => props.actionType === 'server_command' ? 'server' : 'database')
const form = reactive({
  targetConfigId: '',
  shell: 'bash',
  command: '',
  sqlMode: 'update',
  sql: '',
  mongoOperation: 'find',
  collection: '',
  filter: '',
  document: '',
  timeoutMs: 30000,
})
const normalizeShellValue = (value: unknown) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['bash', '/bin/bash', 'linux', 'shell', 'shell 类型', 'shell type', '脚本类型', 'shell 脚本类型'].includes(normalized)) return 'bash'
  if (['sh', '/bin/sh'].includes(normalized)) return 'sh'
  if (['powershell', 'powershell.exe', 'pwsh', 'power shell'].includes(normalized)) return 'powershell'
  // 旧表单可能保存了展示文案而不是选项值，回填受控默认值后即可正常编辑保存。
  return 'bash'
}
const commandPlaceholders: Record<string, string> = {
  bash: '例如：systemctl status nginx --no-pager',
  sh: '例如：ps -ef | grep \'[j]ava\'',
  powershell: '例如：Get-Service -Name Spooler',
}
const sqlPlaceholders: Record<string, string> = {
  query: '例如：SELECT user_id, user_name FROM `user` ORDER BY user_id DESC LIMIT 20;',
  update: '例如：UPDATE `user` SET status = ? WHERE user_id = ?;',
  call: '例如：CALL refresh_audit_summary(?, ?);',
}
const mongoFilterPlaceholders: Record<string, string> = {
  find: '例如：{ "status": "ACTIVE" }；留空表示查询全部',
  insert: '新增操作通常留空过滤条件',
  update: '例如：{ "status": "ACTIVE" }',
  delete: '例如：{ "status": "EXPIRED" }',
}
const mongoDocumentPlaceholders: Record<string, string> = {
  find: '查询操作无需填写，留空即可',
  insert: '例如：{ "name": "demo", "status": "ACTIVE" }',
  update: '例如：{ "$set": { "status": "DISABLED" } }',
  delete: '删除操作无需填写，留空即可',
}
const commandPlaceholder = computed(() => commandPlaceholders[form.shell] || '请输入要执行的 Shell 命令')
const sqlPlaceholder = computed(() => sqlPlaceholders[form.sqlMode] || '请输入单条 SQL；参数请使用 ? 占位符')
const mongoFilterPlaceholder = computed(() => mongoFilterPlaceholders[form.mongoOperation] || '请输入 JSON 对象')
const mongoDocumentPlaceholder = computed(() => mongoDocumentPlaceholders[form.mongoOperation] || '请输入 JSON 对象')
const targetConfigOptions = ref<TargetConfigOption[]>([])
const selectedTarget = computed(() => targetConfigOptions.value.find((item) => item.value === form.targetConfigId))
// 服务器操作系统由执行时环境绑定的真实资源决定；角色本身不固化系统类型。
const selectedServerType = computed(() => '')
const shellOptions = computed(() => {
  const options = selectedServerType.value.includes('windows') ? windowsShellOptions : linuxShellOptions
  const current = normalizeShellValue(form.shell)
  if (options.some((item) => item.value === current)) return options
  const label = current === 'powershell' ? 'PowerShell' : current
  return [{ label, value: current }, ...options]
})
const targetConfigLoading = ref(false)
let syncing = false
let targetConfigRequestSequence = 0

const getConfig = (items: AutomationUiStepConfig[], name: string) => {
  const item = (items || []).find((value) => value?.paramsName === name)
  return item?.paramsValue == null ? '' : String(item.paramsValue)
}

const parseMethodConfig = (items: AutomationUiStepConfig[]) => {
  try {
    const raw = getConfig(items, 'method_config')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const syncFromModel = () => {
  syncing = true
  const items = props.modelValue || []
  const methodConfig = parseMethodConfig(items)
  const target = methodConfig?.target_ref || (() => {
    try {
      return JSON.parse(getConfig(items, 'target_ref'))
    } catch {
      return {}
    }
  })()
  form.targetConfigId = String(methodConfig?.target_ref?.slot_id || target?.slot_id || '')
  form.shell = normalizeShellValue(methodConfig?.shell || methodConfig?.shell_type || getConfig(items, 'shell') || getConfig(items, 'shell_type'))
  form.command = String(methodConfig?.command || getConfig(items, 'command') || '')
  form.sqlMode = String(methodConfig?.sql_mode || getConfig(items, 'sql_mode') || 'update')
  form.sql = String(methodConfig?.sql || getConfig(items, 'sql') || '')
  form.mongoOperation = String(methodConfig?.mongo_operation || getConfig(items, 'mongo_operation') || 'find')
  form.collection = String(methodConfig?.collection || getConfig(items, 'collection') || '')
  form.filter = String(methodConfig?.filter || getConfig(items, 'filter') || '')
  form.document = String(methodConfig?.document || getConfig(items, 'document') || '')
  const timeout = Number(methodConfig?.timeout_ms || getConfig(items, 'timeout_ms'))
  form.timeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout : 30000
  syncing = false
}

const goTargetConfig = () => emit('go-target-config', kind.value)

const loadTargetConfigOptions = async () => {
  const projectId = props.projectId == null ? '' : String(props.projectId)
  const requestSequence = ++targetConfigRequestSequence
  if (!projectId) {
    targetConfigOptions.value = []
    return
  }
  targetConfigLoading.value = true
  try {
    const { data } = await listEnvironmentResourceSlots(projectId, kind.value === 'server' ? 'SERVER' : 'DATABASE', props.environmentId)
    if (requestSequence !== targetConfigRequestSequence) return
    targetConfigOptions.value = (data || []).map((item) => ({
      label: item.resourceName,
      value: String(item.slotId),
      code: item.resourceCode,
      databaseIp: item.databaseIp,
      databasePort: item.databasePort,
      databaseName: item.databaseName,
      resourceLabel: item.resourceLabel,
    }))
  } finally {
    if (requestSequence === targetConfigRequestSequence) targetConfigLoading.value = false
  }
}

const emitStep = () => {
  if (syncing) return
  const targetRef = {
    scope: 'project_environment',
    kind: kind.value,
    slot_id: form.targetConfigId,
  }
  const methodConfig = {
    target_ref: targetRef,
    timeout_ms: form.timeoutMs,
    ...(kind.value === 'server'
      ? { shell: form.shell, command: form.command }
      : props.actionType === 'database_sql'
        ? { sql_mode: form.sqlMode, sql: form.sql }
        : {
            mongo_operation: form.mongoOperation,
            collection: form.collection,
            filter: form.filter,
            document: form.document,
          }),
  }
  if (!props.methodCode) return
  // 基础设施步骤也只提交目录方法与声明性配置。target_ref、命令/SQL 的 legacy projection
  // 以及完整执行快照只能由后端 assembler 生成，不能在前端构造。
  const next = [
    { paramsName: 'method_code', paramsValue: props.methodCode },
    { paramsName: 'method_version', paramsValue: String(props.methodVersion || 1) },
    { paramsName: 'method_config', paramsValue: JSON.stringify(methodConfig) },
  ]
  if (JSON.stringify(next) !== JSON.stringify(props.modelValue || [])) emit('update:modelValue', next)
}

watch(() => [props.modelValue, props.actionType, props.methodCode, props.methodVersion], syncFromModel, { deep: true, immediate: true })
watch(() => [props.modelValue, props.methodCode, props.methodVersion], emitStep, { deep: true, immediate: true, flush: 'post' })
watch(() => [props.projectId, kind.value], () => {
  void loadTargetConfigOptions()
}, { immediate: true })
watch(() => [form.targetConfigId, selectedServerType.value], () => {
  if (kind.value === 'server' && selectedServerType.value.includes('windows')) {
    form.shell = 'powershell'
  }
})
watch(form, emitStep, { deep: true })
</script>

<style scoped>
.infrastructure-step-config {
  flex: 1;
  width: 100%;
  min-width: 0;
}

.infrastructure-step-config :deep(.config-form .arco-form-item) {
  margin-bottom: 8px;
}

.infrastructure-step-config :deep(.config-form .target-item) {
  margin-bottom: 8px;
}

.config-card {
  height: 100%;
  border-radius: 10px;
}

.option-row,
.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.option-main {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.summary-item {
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--color-fill-2);
}

.summary-label {
  color: var(--color-text-3);
  font-size: 13px;
}

.summary-label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: help;
}

.form-label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.form-label-help-icon {
  color: var(--color-text-3);
  cursor: help;
}

.powershell-install-hint {
  max-width: 100%;
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--font-family-mono, monospace);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.summary-value {
  color: var(--color-text-1);
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}
</style>
