<template>
  <a-drawer
    v-model:visible="visible"
    :title="form.id ? '编辑定时任务' : '设置定时执行'"
    :width="680"
    :mask-closable="false"
    unmount-on-close
    @before-ok="submit"
  >
    <a-alert v-if="!form.id" type="info" class="drawer-tip">
      新建任务保存后默认为禁用状态，请确认配置无误后手动启用。
    </a-alert>
    <a-form ref="formRef" :model="form" layout="vertical">
      <section class="form-section">
        <div class="section-title">基础信息</div>
        <a-form-item field="testPlanId" label="测试计划" required>
          <a-select
            v-model="form.testPlanId"
            placeholder="请选择测试计划"
            allow-search
            :disabled="Boolean(form.id)"
            @change="onPlanChange"
          >
            <a-option v-for="item in planOptions" :key="item.id" :value="item.id">
              {{ item.projectName }} / {{ item.name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="name" label="任务名称" required>
          <a-input v-model="form.name" :max-length="100" show-word-limit placeholder="例如：工作日回归测试" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model="form.description" :max-length="255" show-word-limit :auto-size="{ minRows: 2, maxRows: 4 }" />
        </a-form-item>
      </section>

      <section class="form-section">
        <div class="section-title">调度规则</div>
        <a-form-item label="执行周期" required>
          <a-radio-group v-model="scheduleMode" type="button" @change="applyScheduleMode">
            <a-radio value="EVERY_30_MINUTES">每 30 分钟</a-radio>
            <a-radio value="HOURLY">每小时</a-radio>
            <a-radio value="DAILY">每天</a-radio>
            <a-radio value="WEEKDAY">工作日</a-radio>
            <a-radio value="WEEKLY">每周</a-radio>
            <a-radio value="CUSTOM">Cron</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="scheduleMode === 'DAILY' || scheduleMode === 'WEEKDAY'" label="执行时间">
          <a-time-picker v-model="dailyTime" format="HH:mm" value-format="HH:mm" @change="applyScheduleMode" />
        </a-form-item>
        <a-form-item v-if="scheduleMode === 'WEEKLY'" label="每周执行">
          <a-space>
            <a-select v-model="weekDay" style="width: 140px" :options="weekOptions" @change="applyScheduleMode" />
            <a-time-picker v-model="dailyTime" format="HH:mm" value-format="HH:mm" @change="applyScheduleMode" />
          </a-space>
        </a-form-item>
        <a-form-item v-if="scheduleMode === 'CUSTOM'" field="cronExpression" label="Cron 表达式" required>
          <a-input v-model="form.cronExpression" placeholder="0 0 9 * * ?" @change="refreshNextRuns">
            <template #append><a-link @click="cronModalRef?.open(form.cronExpression)">生成</a-link></template>
          </a-input>
        </a-form-item>
        <div class="schedule-preview">
          <div><icon-clock-circle /> 时区：Asia/Shanghai</div>
          <div class="preview-title">未来 5 次执行</div>
          <ol v-if="nextRuns.length">
            <li v-for="item in nextRuns" :key="item">{{ item }}</li>
          </ol>
          <a-typography-text v-else type="danger">Cron 表达式无法解析</a-typography-text>
        </div>
      </section>

      <section class="form-section">
        <div class="section-title">执行配置</div>
        <a-form-item field="projectEnvironmentId" label="产品环境" required>
          <a-select v-model="form.projectEnvironmentId" placeholder="请选择计划所属项目的产品环境">
            <a-option v-for="item in projectEnvironments" :key="item.id" :value="item.id" :disabled="item.status !== 1">
              {{ item.name }} <a-tag size="small" :color="item.status === 1 ? 'green' : 'gray'">{{ item.status === 1 ? '启用' : '停用' }}</a-tag>
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="automationEnvironmentId" label="自动化环境" required>
          <a-select v-model="form.automationEnvironmentId" placeholder="请选择 Jenkins 自动化环境">
            <a-option v-for="item in automationEnvironments" :key="item.id" :value="item.id" :disabled="item.status !== 1">
              {{ item.name }} <a-tag size="small" :color="item.status === 1 ? 'green' : 'gray'">{{ item.status === 1 ? '启用' : '停用' }}</a-tag>
            </a-option>
          </a-select>
        </a-form-item>
      </section>

      <section class="form-section">
        <div class="section-title">高级配置</div>
        <a-form-item label="任务重叠时">
          <a-radio-group v-model="form.allowConcurrent">
            <a-radio :value="0">跳过本次执行（推荐）</a-radio>
            <a-radio :value="1">允许并行执行</a-radio>
          </a-radio-group>
        </a-form-item>
      </section>

      <section class="form-section">
        <div class="section-title">通知配置</div>
        <a-form-item field="notificationEmails" label="结果通知邮箱" required>
          <a-input-tag
            v-model="form.notificationEmails"
            allow-clear
            placeholder="输入邮箱后按回车，可添加 1–20 个邮箱"
            @change="deduplicateEmails"
          />
          <template #extra>成功、失败和跳过都会发送通知；重复邮箱会自动去除。</template>
        </a-form-item>
      </section>
    </a-form>
    <CronModal ref="cronModalRef" @ok="onCronSelected" />
  </a-drawer>
</template>

<script setup lang="ts">
import { type FormInstance, Message } from '@arco-design/web-vue'
import CronParser from 'cron-parser'
import dayjs from 'dayjs'
import { type AutomationEnvironmentConfigResp, getAutomationEnvironmentConfigList } from '@/apis/automation/automationEnvironmentConfig'
import { type ProjectEnvironmentConfigResp, getProjectEnvironmentConfigList } from '@/apis/project/projectEnvironmentConfig'
import { type TestPlanResp, getTestPlanList } from '@/apis/test/testPlan'
import { type TestTimedTaskReq, addTimedTask, getTimedTask, updateTimedTask } from '@/apis/test/timedTask'
import CronModal from '@/components/GenCron/CronModal/index.vue'
import { useUserStore } from '@/stores'

const props = defineProps<{ plans?: TestPlanResp[] }>()
const emits = defineEmits<{ success: [] }>()

type ScheduleMode = 'EVERY_30_MINUTES' | 'HOURLY' | 'DAILY' | 'WEEKDAY' | 'WEEKLY' | 'CUSTOM'
interface DrawerForm extends TestTimedTaskReq { id?: string }

const userStore = useUserStore()
const visible = ref(false)
const formRef = ref<FormInstance>()
const cronModalRef = ref<InstanceType<typeof CronModal>>()
const planOptions = ref<TestPlanResp[]>([])
const projectEnvironments = ref<ProjectEnvironmentConfigResp[]>([])
const automationEnvironments = ref<AutomationEnvironmentConfigResp[]>([])
const scheduleMode = ref<ScheduleMode>('EVERY_30_MINUTES')
const dailyTime = ref('09:00')
const weekDay = ref('MON')
const nextRuns = ref<string[]>([])
const weekOptions = [
  { label: '周一', value: 'MON' },
  { label: '周二', value: 'TUE' },
  { label: '周三', value: 'WED' },
  { label: '周四', value: 'THU' },
  { label: '周五', value: 'FRI' },
  { label: '周六', value: 'SAT' },
  { label: '周日', value: 'SUN' },
]

const emptyForm = (): DrawerForm => ({
  testPlanId: '',
  name: '',
  description: '',
  cronExpression: '0 */30 * * * ?',
  allowConcurrent: 0,
  projectEnvironmentId: '',
  automationEnvironmentId: '',
  notificationEmails: userStore.userInfo.email ? [userStore.userInfo.email] : [],
})
const form = reactive<DrawerForm>(emptyForm())

const loadOptions = async () => {
  if (props.plans?.length) planOptions.value = props.plans
  else planOptions.value = (await getTestPlanList({ sort: ['createTime,desc'] })).data || []
  automationEnvironments.value = (await getAutomationEnvironmentConfigList({ status: 1 })).data || []
}

const loadProjectEnvironments = async () => {
  const plan = planOptions.value.find((item) => item.id === form.testPlanId)
  projectEnvironments.value = plan
    ? ((await getProjectEnvironmentConfigList({ projectId: plan.projectId, status: 1, page: 1, size: 200 } as any)).data || [])
    : []
}

const open = async (options?: { id?: string, plan?: TestPlanResp }) => {
  Object.assign(form, emptyForm())
  scheduleMode.value = 'EVERY_30_MINUTES'
  dailyTime.value = '09:00'
  weekDay.value = 'MON'
  await loadOptions()
  if (options?.id) {
    const { data } = await getTimedTask(options.id)
    Object.assign(form, {
      id: data.id,
      testPlanId: data.testPlanId,
      name: data.name,
      description: data.description || '',
      cronExpression: data.cronExpression,
      allowConcurrent: data.allowConcurrent,
      projectEnvironmentId: data.projectEnvironmentId,
      automationEnvironmentId: data.automationEnvironmentId,
      notificationEmails: data.notificationEmails || [],
    })
    parseScheduleMode(data.cronExpression)
  } else if (options?.plan) {
    form.testPlanId = options.plan.id
  }
  await loadProjectEnvironments()
  refreshNextRuns()
  visible.value = true
}

const onPlanChange = async () => {
  form.projectEnvironmentId = ''
  await loadProjectEnvironments()
}

const applyScheduleMode = () => {
  const [hour, minute] = dailyTime.value.split(':')
  const expressions: Record<Exclude<ScheduleMode, 'CUSTOM'>, string> = {
    EVERY_30_MINUTES: '0 */30 * * * ?',
    HOURLY: '0 0 * * * ?',
    DAILY: `0 ${minute} ${hour} * * ?`,
    WEEKDAY: `0 ${minute} ${hour} ? * MON-FRI`,
    WEEKLY: `0 ${minute} ${hour} ? * ${weekDay.value}`,
  }
  if (scheduleMode.value !== 'CUSTOM') form.cronExpression = expressions[scheduleMode.value]
  refreshNextRuns()
}

function parseScheduleMode(cron: string) {
  if (cron === '0 */30 * * * ?') {
    scheduleMode.value = 'EVERY_30_MINUTES'
  } else if (cron === '0 0 * * * ?') {
    scheduleMode.value = 'HOURLY'
  } else {
    const daily = cron.match(/^0 (\d{1,2}) (\d{1,2}) \* \* \?$/)
    const weekday = cron.match(/^0 (\d{1,2}) (\d{1,2}) \? \* MON-FRI$/)
    const weekly = cron.match(/^0 (\d{1,2}) (\d{1,2}) \? \* (MON|TUE|WED|THU|FRI|SAT|SUN)$/)
    const commonRule = daily || weekday || weekly
    if (!commonRule) {
      scheduleMode.value = 'CUSTOM'
    } else {
      dailyTime.value = `${commonRule[2].padStart(2, '0')}:${commonRule[1].padStart(2, '0')}`
      if (weekday) {
        scheduleMode.value = 'WEEKDAY'
      } else if (weekly) {
        scheduleMode.value = 'WEEKLY'
        weekDay.value = weekly[3]
      } else {
        scheduleMode.value = 'DAILY'
      }
    }
  }
}

function refreshNextRuns() {
  try {
    const interval = CronParser.parseExpression(form.cronExpression, { tz: 'Asia/Shanghai' })
    nextRuns.value = Array.from({ length: 5 }, () => dayjs(interval.next().toDate()).format('YYYY-MM-DD HH:mm:ss'))
  } catch {
    nextRuns.value = []
  }
}

const onCronSelected = (cron: string) => {
  scheduleMode.value = 'CUSTOM'
  form.cronExpression = cron
  refreshNextRuns()
}

const deduplicateEmails = () => {
  form.notificationEmails = [...new Set(form.notificationEmails.map((item) => item.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
}

const submit = async (done: (closed: boolean) => void) => {
  deduplicateEmails()
  if (!form.testPlanId || !form.name.trim() || !form.projectEnvironmentId || !form.automationEnvironmentId) {
    Message.warning('请完整填写测试计划、任务名称和执行环境')
    done(false)
    return
  }
  if (!nextRuns.value.length) {
    Message.warning('Cron 表达式无效')
    done(false)
    return
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.notificationEmails.length || form.notificationEmails.some((item) => !emailPattern.test(item))) {
    Message.warning('请填写 1–20 个有效通知邮箱')
    done(false)
    return
  }
  const payload: TestTimedTaskReq = { ...form, name: form.name.trim() }
  if (form.id) await updateTimedTask(payload, form.id)
  else await addTimedTask(payload)
  Message.success(form.id ? '定时任务已更新' : '定时任务已保存，当前为禁用状态')
  emits('success')
  done(true)
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.drawer-tip { margin-bottom: 16px; }
.form-section { padding: 4px 0 14px; border-bottom: 1px solid var(--color-neutral-3); margin-bottom: 18px; }
.form-section:last-child { border-bottom: 0; }
.section-title { margin-bottom: 14px; color: var(--color-text-1); font-size: 15px; font-weight: 600; }
.schedule-preview { padding: 12px 16px; border-radius: 6px; background: var(--color-fill-1); color: var(--color-text-2); }
.preview-title { margin-top: 10px; font-weight: 500; }
.schedule-preview ol { margin: 6px 0 0; padding-left: 22px; line-height: 1.8; }
</style>
