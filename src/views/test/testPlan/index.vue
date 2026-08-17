<template>
  <div class="gi_table_page test-plan-page">
    <a-tabs
      v-model:active-key="activeTab"
      type="card-gutter"
      size="medium"
      class="test-plan-tabs"
      :class="{ 'test-plan-tabs--scene': isSceneTabActive }"
      editable
      :show-add-button="false"
      destroy-on-hide
      @delete="onSceneTabDelete"
    >
      <a-tab-pane key="plan-list" title="计划列表" :closable="false">
        <GiTable
          v-model:selected-keys="selectedKeys"
          class="plan-list-table"
          row-key="id"
          title=""
          :data="dataList"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          :row-selection="{ type: 'checkbox', showCheckedAll: true }"
          :show-selection-alert="true"
          :scroll="{ x: 1980, y: '100%' }"
          @refresh="search"
          @select="select"
          @select-all="selectAll"
        >
          <template #top>
            <div class="plan-query-top-slot">
              <GiForm
                v-model="queryForm"
                :columns="queryFormColumns"
                size="medium"
                search
                :search-card="true"
                :search-columns-per-row="3"
                :search-control-min-width="200"
                :search-label-width="65"
                search-btn-text="查询"
                :search-on-change="true"
                :grid-props="planQueryGridProps"
                hide-fold-btn
                class="query-form plan-query-form"
                @search="search"
                @reset="reset"
              />
            </div>
          </template>

          <template #toolbar-left>
            <a-button type="primary" @click="openForm()">
              <template #icon><icon-plus /></template>
              新建计划
            </a-button>
          </template>

          <template #toolbar-right>
            <a-button type="primary" @click="Message.info('批量导入功能待接入')">
              <template #icon><icon-upload /></template>
              批量导入
            </a-button>
            <a-button @click="onExport">
              <template #icon><icon-download /></template>
              批量导出
            </a-button>
            <a-button type="primary" status="danger" :disabled="!selectedKeys.length" @click="onDelete()">
              <template #icon><icon-delete /></template>
              批量删除
            </a-button>
          </template>

          <template #members="{ record }">
            <a-link @click="openListModal('计划成员', record.memberIds)">查看</a-link>
          </template>
          <template #principals="{ record }">
            <a-link @click="openListModal('计划负责人', record.principalIds)">查看</a-link>
          </template>
          <template #status="{ record }">
            <GiCellTag :value="record.status" :dict="planStatusOptions" />
          </template>
          <template #executeResult="{ record }">
            <GiCellTag :value="resolvePlanExecuteResult(record)" :dict="planExecuteResultOptions" />
          </template>
          <template #progress="{ record }">
            <div class="progress-cell">
              <a-progress :percent="Number(record.testProgress || 0)" size="mini" />
              <span>{{ Number(record.testProgress || 0) }}%</span>
            </div>
          </template>
          <template #action="{ record }">
            <a-space>
              <a-link @click="openForm(record)">修改</a-link>
              <a-link @click="openForm(record, true)">复制</a-link>
              <a-dropdown>
                <a-link>执行</a-link>
                <template #content>
                  <a-doption @click="openExecModal(record)">功能测试</a-doption>
                  <a-doption @click="openSceneTab(record)">UI 自动化测试</a-doption>
                </template>
              </a-dropdown>
              <a-dropdown trigger="click">
                <a-link class="more-link">
                  更多
                  <icon-down class="more-link__caret" />
                </a-link>
                <template #content>
                  <a-doption @click="openDetail(record)">详情</a-doption>
                  <a-doption @click="goToReports(record)">报告</a-doption>
                  <a-doption @click="openSceneModal(record)">关联场景</a-doption>
                  <a-doption v-permission="['test:timedTask:create']" @click="timedTaskDrawerRef?.open({ plan: record })">设置定时执行</a-doption>
                  <a-doption status="danger" @click="onDelete(record)">删除</a-doption>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </GiTable>
      </a-tab-pane>

      <a-tab-pane
        v-for="tab in sceneTabs"
        :key="tab.key"
        :title="tab.record.name"
        :closable="true"
      >
        <div class="scene-tab-pane">
          <TestPlanSceneWorkspace
            :ref="(el) => setSceneWorkspaceRef(tab.key, el)"
            :plan="tab.record"
            :plan-options="scenePlanOptions"
            :live-executions="liveExecutions"
            @switch-plan="onSwitchScenePlan"
            @relate="openRelateSceneModal(tab.record)"
            @batch-execute="(rows, executionType) => onBatchExecuteScene(tab, rows, executionType)"
            @execute-all="(executionType) => onExecuteAllScene(tab, executionType)"
            @execute-one="(row, executionType) => onExecuteOneScene(tab, row, executionType)"
            @refresh="search"
          />
        </div>
      </a-tab-pane>
    </a-tabs>

    <TestPlanRelateSceneModal
      v-model:visible="relateSceneVisible"
      :plan="relateScenePlan"
      @success="onRelateSceneSuccess"
    />

    <ExecuteSceneModal
      ref="executeSceneModalRef"
      @started="onSingleSceneExecutionStarted"
      @success="onExecuteSceneSuccess"
    />
    <TimedTaskDrawer ref="timedTaskDrawerRef" :plans="dataList" />
    <AutomationExecutionCaseSelectModal
      ref="executionCaseSelectModalRef"
      :live-executions="liveExecutions"
      @next="openExecutionConfig"
    />
    <AutomationExecutionCaseModal
      ref="executionCaseModalRef"
      @back="reopenExecutionCaseSelect"
      @batch-update="liveExecutions = $event"
      @started="onSingleSceneExecutionStarted"
      @finished="onPlaywrightExecutionFinished"
      @plan-start="onPlanExecutionStart"
      @startup-failed="onCdpPlanStartupFailed"
    />

    <a-modal v-model:visible="formVisible" :title="formTitle" width="660px" :body-style="{ padding: '20px' }" @before-ok="submitForm">
      <a-form
        ref="planFormRef"
        :model="formState"
        layout="horizontal"
        class="plan-edit-form"
        auto-label-width
        scroll-to-first-error
        :label-col-props="{ flex: '108px' }"
        :wrapper-col-props="{ flex: '1' }"
        :rules="planFormRules"
      >
        <a-form-item field="projectId" label="所属项目" required>
          <a-select
            v-model="formState.projectId"
            :options="projectSelectOptions"
            placeholder="请选择"
            allow-search
            @change="onFormProjectChange"
          />
        </a-form-item>
        <a-form-item field="versionId" label="项目版本" required>
          <a-select
            v-model="formState.versionId"
            :options="formVersionOptions"
            placeholder="请选择"
            allow-search
          />
        </a-form-item>
        <a-form-item field="type" label="计划类型" required>
          <a-select v-model="formState.type" :options="planTypeSelectOptions" placeholder="请选择" allow-search />
        </a-form-item>
        <a-form-item field="name" label="计划名称" required>
          <a-input v-model="formState.name" placeholder="请输入" allow-clear />
        </a-form-item>
        <a-form-item field="abbreviate" label="计划简称" required>
          <a-input v-model="formState.abbreviate" placeholder="请输入" allow-clear />
        </a-form-item>
        <a-form-item field="description" label="计划描述" required>
          <a-textarea v-model="formState.description" placeholder="请输入" :auto-size="{ minRows: 3, maxRows: 6 }" allow-clear />
        </a-form-item>
        <a-form-item field="memberIds" label="计划成员" required>
          <a-select
            v-model="formState.memberIds"
            :options="userSelectOptions"
            placeholder="请选择"
            multiple
            allow-search
            :max-tag-count="3"
          />
        </a-form-item>
        <a-form-item field="principalId" label="主负责人" required>
          <a-select v-model="formState.principalId" :options="userSelectOptions" placeholder="请选择" allow-search />
        </a-form-item>
        <a-form-item field="planTimeRange" label="计划时间" required>
          <a-range-picker
            v-model="formState.planTimeRange"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
          />
        </a-form-item>
        <a-form-item field="status" label="计划状态">
          <a-select v-model="formState.status" :options="planStatusOptions" placeholder="请选择" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="execVisible"
      title="执行测试计划"
      width="920px"
      ok-text="开始执行"
      :mask-closable="false"
      :esc-to-close="false"
      @before-ok="submitExecute"
    >
      <a-spin :loading="execConfigLoading" style="width: 100%">
        <div class="plan-execute-modal">
          <a-alert type="info" show-icon>
            {{ execScopeMode === 'selected'
              ? `本次将执行已选中的 ${execSceneIds.length} 个场景`
              : '本次将执行当前计划全部关联场景' }}
          </a-alert>
          <a-descriptions :column="2" bordered size="medium">
            <a-descriptions-item label="测试计划">{{ currentRecord?.name || '-' }}</a-descriptions-item>
            <a-descriptions-item label="所属项目">{{ currentRecord?.projectName || '-' }}</a-descriptions-item>
          </a-descriptions>
          <a-form :model="execState" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="执行引擎" required>
                  <a-select
                    v-model="execState.executionEngine"
                    :options="executionEngineOptions"
                    :disabled="execScopeMode !== 'plan'"
                    @change="onExecEngineChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="产品环境" required>
                  <a-select
                    v-model="execState.projectEnvironmentId"
                    placeholder="请选择在线产品环境"
                    allow-search
                    @change="onExecProjectEnvironmentChange"
                  >
                    <a-option
                      v-for="item in execProjectEnvironmentOptions"
                      :key="item.value"
                      :value="item.value"
                      :label="item.label"
                    >
                      <div class="exec-option-row">
                        <span>{{ item.label }}</span>
                        <a-tag :color="item.statusColor">{{ item.statusLabel }}</a-tag>
                      </div>
                    </a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item v-if="execState.executionEngine === 'SELENIUM'" label="自动化环境" required>
              <a-select
                v-model="execState.automationEnvironmentId"
                placeholder="请选择空闲自动化节点"
                allow-search
                @change="onExecAutomationEnvironmentChange"
              >
                <a-option
                  v-for="item in execAutomationEnvironmentOptions"
                  :key="item.value"
                  :value="item.value"
                  :label="item.label"
                >
                  <div class="exec-option-row">
                    <span>{{ item.label }}</span>
                    <a-space size="mini">
                      <a-tag :color="item.onlineStatusColor">{{ item.onlineStatusLabel }}</a-tag>
                      <a-tag :color="item.useStatusColor">{{ item.useStatusLabel }}</a-tag>
                    </a-space>
                  </div>
                </a-option>
              </a-select>
            </a-form-item>

            <a-card
              v-if="execState.executionEngine === 'PLAYWRIGHT_RUNNER'"
              title="Playwright Runner 配置"
              size="small"
            >
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="浏览器">
                    <a-select v-model="execRunnerConfig.browser">
                      <a-option value="chromium">Chromium</a-option>
                      <a-option value="firefox">Firefox</a-option>
                      <a-option value="webkit">WebKit</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="实时画面质量">
                    <a-select v-model="execRunnerConfig.liveFrameQuality" :options="liveFrameQualityOptions" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="用例会话">
                    <a-select
                      v-model="execRunnerConfig.sessionMode"
                      :options="runnerSessionModeOptions"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="显示浏览器窗口">
                    <a-switch v-model="execRunnerConfig.headed" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="忽略 HTTPS 错误">
                    <a-switch v-model="execRunnerConfig.ignoreHttpsErrors" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="页面错误检测">
                    <a-switch v-model="execRunnerConfig.pageErrorCheckEnabled" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="Trace 保留策略">
                    <a-select v-model="execRunnerConfig.trace" :options="artifactPolicyOptions" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="录屏保留策略">
                    <a-select
                      v-model="execRunnerConfig.video"
                      :options="artifactPolicyOptions"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="步骤超时（ms）">
                    <a-input-number v-model="execRunnerConfig.stepTimeoutMs" :min="1000" :max="600000" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="用例超时（ms）">
                    <a-input-number v-model="execRunnerConfig.caseTimeoutMs" :min="1000" :max="3600000" />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-card>

            <a-card
              v-if="execState.executionEngine === 'CHROME_DEVTOOLS_PROTOCOL'"
              title="Chrome DevTools Protocol 配置"
              size="small"
            >
              <a-alert type="warning" show-icon>
                {{ execCdpConfig.sessionMode === 'legacy-profile'
                  ? '默认新建并复用一个普通 Chrome 回放窗口；共享登录态和站点存储，不提供无痕隔离。'
                  : execCdpManagedContextAvailable && execCdpGrayEnabled
                    ? '将由 CueCast 在受控无痕会话中串行执行，请保持页面和浏览器连接开启。'
                    : `当前只能使用浏览器兼容模式。${execCdpManagedContextAvailable ? execCdpGrayReason : execCdpCapabilitiesReason}` }}
              </a-alert>
              <a-form-item label="用例会话">
                <a-select
                  v-model="execCdpConfig.sessionMode"
                  :options="execCdpSessionModeOptions"
                  :loading="execCdpCapabilityLoading"
                  :disabled="execCdpCapabilityLoading"
                />
              </a-form-item>
              <a-form-item label="忽略 HTTPS 证书错误">
                <a-switch v-model="execCdpConfig.ignoreHttpsErrors" />
              </a-form-item>
              <a-form-item label="执行窗口尺寸">
                <a-radio-group v-model="execCdpConfig.windowSizeMode">
                  <a-radio value="maximized">默认最大化</a-radio>
                  <a-radio value="current">当前窗口尺寸</a-radio>
                  <a-radio value="custom">自定义尺寸</a-radio>
                </a-radio-group>
              </a-form-item>
              <a-row v-if="execCdpConfig.windowSizeMode === 'custom'" :gutter="16">
                <a-col :span="12">
                  <a-form-item label="宽度">
                    <a-input-number v-model="execCdpConfig.viewportWidth" :min="320" :max="10000" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="高度">
                    <a-input-number v-model="execCdpConfig.viewportHeight" :min="320" :max="10000" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="页面错误检测">
                <a-switch v-model="execCdpConfig.pageErrorCheckEnabled" />
              </a-form-item>
            </a-card>

            <a-row :gutter="16" class="executor-row">
              <a-col :span="12">
                <a-form-item label="执行人"><a-input v-model="execState.executeName" allow-clear /></a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="执行邮箱"><a-input v-model="execState.executeEmail" allow-clear /></a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>
      </a-spin>
    </a-modal>

    <a-modal v-model:visible="detailVisible" title="测试计划详情" width="1040px" :footer="false">
      <a-space direction="vertical" fill>
        <a-card :bordered="false" class="detail-actions">
          <a-space>
            <a-button type="primary" @click="detailRecord && openSceneTab(detailRecord)">查看场景视图</a-button>
            <a-button @click="detailRecord && goToReports(detailRecord)">查看报告</a-button>
            <a-button @click="detailRecord && openExecModal(detailRecord)">立即执行</a-button>
          </a-space>
        </a-card>
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="计划 ID">{{ detailRecord?.id || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划名称">{{ detailRecord?.name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="所属项目">{{ detailRecord?.projectName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="版本 ID">{{ detailRecord?.versionId || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划类型">{{ detailRecord?.type || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划简称">{{ detailRecord?.abbreviate || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划状态">
            <GiCellTag v-if="detailRecord?.status" :value="detailRecord.status" :dict="planStatusOptions" />
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="创建人">{{ detailRecord?.createUserString || '-' }}</a-descriptions-item>
          <a-descriptions-item label="计划成员" :span="2">{{ formatUserIds(detailRecord?.memberIds) }}</a-descriptions-item>
          <a-descriptions-item label="计划负责人" :span="2">{{ formatUserIds(detailRecord?.principalIds) }}</a-descriptions-item>
          <a-descriptions-item label="关联场景 ID" :span="2">{{ formatList(detailRecord?.uiTestScene) }}</a-descriptions-item>
          <a-descriptions-item label="场景数">{{ detailRecord?.sceneCount ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="测试进度">{{ detailRecord?.testProgress ?? 0 }}%</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatPlanDateTime(detailRecord?.createTime ?? null) }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ formatPlanDateTime(detailRecord?.updateTime ?? null) }}</a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">{{ detailRecord?.description || '-' }}</a-descriptions-item>
        </a-descriptions>
      </a-space>
    </a-modal>

    <a-modal v-model:visible="listModalVisible" :title="listModalTitle" width="520px" :footer="false">
      {{ listModalContent }}
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { type FormInstance, Message, Modal, type TableInstance } from '@arco-design/web-vue'
import { useRoute, useRouter } from 'vue-router'
import TestPlanSceneWorkspace from './components/TestPlanSceneWorkspace.vue'
import TestPlanRelateSceneModal from './components/TestPlanRelateSceneModal.vue'
import { buildProjectSelectOptions, toIdString } from './utils/projectContext'
import {
  type TestExecutionEngine,
  type TestPlanExecuteResp,
  type TestPlanQuery,
  type TestPlanResp,
  addTestPlan,
  cancelTestPlanExecution,
  deleteTestPlan,
  executeTestPlan,
  exportTestPlan,
  getTestPlan,
  listTestPlan,
  updateTestPlan,
} from '@/apis/test/testPlan'
import { type ProjectConfigResp, getProjectConfigList } from '@/apis/project/projectConfig'
import { getProjectVersionConfigList } from '@/apis/project/projectVersionConfig'
import {
  getProjectEnvironmentConfigList,
  getProjectEnvironmentRuntimeStatus,
} from '@/apis/project/projectEnvironmentConfig'
import {
  getAutomationEnvironmentConfigList,
  getAutomationEnvironmentRuntimeStatus,
} from '@/apis/automation/automationEnvironmentConfig'
import {
  getAutomationCdpPlaybackAvailability,
  type AutomationCdpPlaybackOptions,
  type AutomationPlaywrightRunnerOptions,
} from '@/apis/automation/automationPlaywrightRunner'
import { getAutomationUiSceneSelected } from '@/apis/automation/automationUiScene'
import { getExtensionCdpCapabilities } from '@/views/automation/automationUiScene/extensionPlayback'
import { getUser, listAllUser, listSystemUser, type UserResp } from '@/apis/system/user'
import { useTable } from '@/hooks'
import type { ColumnItem } from '@/components/GiForm'
import TimedTaskDrawer from '@/views/test/timedTask/components/TimedTaskDrawer.vue'
import ExecuteSceneModal from '@/views/automation/automationUiScene/components/ExecuteSceneModal.vue'
import AutomationExecutionCaseSelectModal from '@/views/automation/automationUiScene/components/AutomationExecutionCaseSelectModal.vue'
import AutomationExecutionCaseModal from '@/views/automation/automationUiScene/components/AutomationExecutionCaseModal.vue'
import type {
  ExecutionCaseOpenOptions,
  ExecutionContext,
  ExecutionType,
  LiveExecutionCase,
} from '@/views/automation/automationUiScene/execution'
import { useUserStore } from '@/stores/modules/user'

defineOptions({ name: 'TestTestPlan' })

interface SceneTab {
  key: string
  record: TestPlanResp
}

interface SceneWorkspaceExpose {
  reload?: () => Promise<void>
  openHistory?: (sceneId?: string) => Promise<void>
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const planStatusOptions = [
  { label: '未开始', value: 'NOT_STARTED' },
  { label: '进行中', value: 'RUNNING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已归档', value: 'ARCHIVED' },
]
const planExecuteResultOptions = [
  { label: '未执行', value: 'NOT_EXECUTED', extra: 'default' },
  { label: '执行中', value: 'RUNNING', extra: 'primary' },
  { label: '通过', value: 'PASSED', extra: 'success' },
  { label: '失败', value: 'FAILED', extra: 'error' },
]
const planTypeBaseOptions = [
  { label: '冒烟测试', value: '冒烟测试' },
  { label: '全量测试', value: '全量测试' },
  { label: '回归测试', value: '回归测试' },
]

const queryForm = reactive<TestPlanQuery>({
  name: undefined,
  projectId: undefined,
  type: undefined,
  status: undefined,
  createUser: undefined,
  createTime: undefined,
  sort: ['createTime,desc'],
})

const serializeCreateTime = (range?: TestPlanQuery['createTime']) => {
  if (!Array.isArray(range) || range.length !== 2) return undefined
  const [a, b] = range
  if (a == null || b == null || a === '' || b === '') return undefined
  const day = (v: string) => {
    const s = String(v)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s.slice(0, 10)
  }
  const startDay = day(a)
  const endDay = day(b)
  return [`${startDay} 00:00:00`, `${endDay} 23:59:59`]
}

/** 列表/导出与后端对齐的查询对象（含创建时间序列化） */
const pickQueryForBackend = (): TestPlanQuery => {
  const createTime = serializeCreateTime(queryForm.createTime)
  return {
    name: queryForm.name,
    projectId: queryForm.projectId,
    type: queryForm.type,
    status: queryForm.status,
    createUser: queryForm.createUser,
    ...(createTime ? { createTime } : {}),
    sort: queryForm.sort,
  }
}

const {
  tableData: dataList,
  loading,
  pagination,
  search,
  selectedKeys,
  select,
  selectAll,
} = useTable((page) => listTestPlan({ ...pickQueryForBackend(), ...page }), { immediate: true })

const projectConfigList = ref<ProjectConfigResp[]>([])
const userList = ref<UserResp[]>([])

const loadProjectConfigOptions = async () => {
  try {
    const { data } = await getProjectConfigList()
    projectConfigList.value = Array.isArray(data) ? data : []
  } catch {
    projectConfigList.value = []
  }
}

const loadSystemUserOptions = async () => {
  try {
    const { data } = await listSystemUser()
    userList.value = Array.isArray(data) ? data : []
  } catch {
    userList.value = []
  }
}

const mergeUsers = (users: UserResp[]) => {
  if (!users.length) return
  const map = new Map<string, UserResp>()
  for (const u of userList.value) map.set(String(u.id), u)
  for (const u of users) map.set(String(u.id), u)
  userList.value = [...map.values()]
}

onMounted(() => {
  void loadProjectConfigOptions()
  void loadSystemUserOptions()
})

const userLabelMap = computed(() => {
  const map = new Map<string, string>()
  for (const u of userList.value) {
    const id = String(u.id)
    map.set(id, u.nickname || u.username || id)
  }
  return map
})

interface PlanFormModel {
  id: string
  projectId?: string
  versionId?: string
  projectName: string
  name: string
  abbreviate: string
  type: string
  description: string
  status: string
  memberIds: string[]
  principalId?: string
  planTimeRange?: string[]
}

const formState = reactive<PlanFormModel>({
  id: '',
  projectId: undefined,
  versionId: undefined,
  projectName: '',
  name: '',
  abbreviate: '',
  type: '',
  description: '',
  status: 'NOT_STARTED',
  memberIds: [],
  principalId: undefined,
  planTimeRange: undefined,
})

const userSelectOptions = computed(() => {
  const map = new Map<string, { label: string, value: string }>()
  for (const u of userList.value) {
    const id = String(u.id)
    map.set(id, { value: id, label: userLabelMap.value.get(id) ?? id })
  }
  const extraIds = [
    ...formState.memberIds,
    ...(formState.principalId ? [formState.principalId] : []),
  ]
  for (const id of extraIds) {
    if (!map.has(id)) {
      map.set(id, { value: id, label: userLabelMap.value.get(id) ?? id })
    }
  }
  return [...map.values()]
})

const projectSelectOptions = computed(() => {
  const map = new Map<string, { label: string, value: string }>()
  for (const row of projectConfigList.value) {
    const id = toIdString(row.id)
    if (!id) continue
    const label = row.name && row.name !== '' ? row.name : id
    if (!map.has(id)) map.set(id, { label, value: id })
  }
  for (const row of dataList.value) {
    const id = toIdString(row.projectId)
    if (!id || row.projectName == null || row.projectName === '') continue
    if (!map.has(id)) map.set(id, { label: row.projectName, value: id })
  }
  const list = [...map.values()].map((o) => ({ label: o.label, value: o.value }))
  return buildProjectSelectOptions(list, formState.projectId, formState.projectName).sort((a, b) =>
    a.label.localeCompare(b.label, 'zh-CN'),
  )
})

const planTypeSelectOptions = computed(() => {
  const seen = new Set(planTypeBaseOptions.map((o) => String(o.value)))
  const extra: { label: string, value: string }[] = []
  for (const row of dataList.value) {
    const t = row.type
    if (t != null && t !== '' && !seen.has(String(t))) {
      seen.add(String(t))
      extra.push({ label: String(t), value: String(t) })
    }
  }
  extra.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
  return [...planTypeBaseOptions, ...extra]
})

const planQueryGridProps = { cols: 24, colGap: 16, rowGap: 0 }
const planQueryFieldSpan = { xs: 24, sm: 8, xxl: 8 }

const queryFormColumns = computed<ColumnItem[]>(() => [
  {
    type: 'select',
    label: '所属项目',
    field: 'projectId',
    span: planQueryFieldSpan,
    props: {
      options: projectSelectOptions.value,
      placeholder: '请选择',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'select',
    label: '计划类型',
    field: 'type',
    span: planQueryFieldSpan,
    props: {
      options: planTypeSelectOptions.value,
      placeholder: '请选择',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'input',
    label: '计划名称',
    field: 'name',
    span: planQueryFieldSpan,
    props: {
      placeholder: '请输入计划名称',
      allowClear: true,
      showWordLimit: true,
    },
  },
  {
    type: 'select',
    label: '计划状态',
    field: 'status',
    span: planQueryFieldSpan,
    props: {
      options: planStatusOptions,
      placeholder: '请选择',
      allowClear: true,
    },
  },
  {
    type: 'select',
    label: '创建人',
    field: 'createUser',
    span: planQueryFieldSpan,
    props: {
      options: userSelectOptions.value,
      placeholder: '请选择',
      allowClear: true,
      allowSearch: true,
    },
  },
  {
    type: 'range-picker',
    label: '创建时间',
    field: 'createTime',
    span: planQueryFieldSpan,
    props: {
      class: 'plan-query-range gi-form__search-range',
      showTime: true,
      format: 'YYYY-MM-DD HH:mm:ss',
    },
  },
])

const columns: TableInstance['columns'] = [
  { title: '所属项目', dataIndex: 'projectName', width: 200, fixed: 'left', ellipsis: true, tooltip: true },
  { title: '计划类型', dataIndex: 'type', width: 100, align: 'center' },
  { title: '计划名称', dataIndex: 'name', width: 300, ellipsis: true, tooltip: true },
  { title: '计划成员', dataIndex: 'memberIds', slotName: 'members', width: 100, align: 'center' },
  { title: '计划负责人', dataIndex: 'principalIds', slotName: 'principals', width: 110, align: 'center' },
  { title: '计划状态', dataIndex: 'status', slotName: 'status', width: 100, align: 'center' },
  { title: '执行结果', dataIndex: 'executeResult', slotName: 'executeResult', width: 100, align: 'center' },
  { title: '测试进度', dataIndex: 'testProgress', slotName: 'progress', width: 100, align: 'center' },
  {
    title: '计划开始时间',
    dataIndex: 'plannedStartTime',
    width: 180,
    render: ({ record }) => formatPlanDateTime(record.plannedStartTime),
  },
  {
    title: '计划结束时间',
    dataIndex: 'plannedEndTime',
    width: 180,
    render: ({ record }) => formatPlanDateTime(record.plannedEndTime),
  },
  { title: '创建人', dataIndex: 'createUserString', width: 110, ellipsis: true, tooltip: true },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    width: 180,
    render: ({ record }) => formatPlanDateTime(record.createTime),
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    width: 180,
    render: ({ record }) => formatPlanDateTime(record.updateTime),
  },
  { title: '操作', dataIndex: 'action', slotName: 'action', width: 220, align: 'center', fixed: 'right' },
]

const activeTab = ref('plan-list')
const isSceneTabActive = computed(() => activeTab.value !== 'plan-list')
const sceneTabs = ref<SceneTab[]>([])
const scenePlanOptions = computed(() =>
  dataList.value.map((row) => ({
    label: row.name,
    value: String(row.id),
  })),
)
const sceneWorkspaceRefs = new Map<string, SceneWorkspaceExpose>()
const relateSceneVisible = ref(false)
const relateScenePlan = ref<TestPlanResp | null>(null)
const formVisible = ref(false)
const formCopyMode = ref(false)
const execVisible = ref(false)
const detailVisible = ref(false)
const listModalVisible = ref(false)
const listModalTitle = ref('')
const listModalContent = ref('')
const currentRecord = ref<TestPlanResp | null>(null)
const detailRecord = ref<TestPlanResp | null>(null)

const planFormRef = ref<FormInstance>()
const timedTaskDrawerRef = ref<InstanceType<typeof TimedTaskDrawer>>()

const planFormRules: FormInstance['rules'] = {
  projectId: [{ required: true, message: '请选择所属项目' }],
  versionId: [{ required: true, message: '请选择项目版本' }],
  type: [{ required: true, message: '请选择计划类型' }],
  name: [{ required: true, message: '请输入计划名称' }],
  abbreviate: [{ required: true, message: '请输入计划简称' }],
  description: [{ required: true, message: '请输入计划描述' }],
  memberIds: [
    {
      required: true,
      validator: (value: unknown, cb: (error?: string) => void) => {
        if (!Array.isArray(value) || value.length === 0) cb('请选择计划成员')
        else cb()
      },
    },
  ],
  principalId: [
    {
      required: true,
      validator: (value: unknown, cb: (error?: string) => void) => {
        if (value == null || value === '') cb('请选择主负责人')
        else cb()
      },
    },
  ],
  planTimeRange: [
    {
      required: true,
      validator: (value: unknown, cb: (error?: string) => void) => {
        if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) cb('请选择计划时间')
        else cb()
      },
    },
  ],
}

const formVersionOptions = ref<{ label: string, value: string, extra?: string }[]>([])

const loadFormVersions = async (projectId?: string, selectDefault = true) => {
  formVersionOptions.value = []
  if (!projectId) return
  const { data } = await getProjectVersionConfigList({ projectId, status: 1, sort: ['name,desc'] })
  formVersionOptions.value = (data || []).map((item) => ({ label: item.name, value: item.id, extra: item.type }))
  if (selectDefault && !formState.versionId) {
    formState.versionId = formVersionOptions.value.find((item) => item.extra === '1')?.value
      || formVersionOptions.value[0]?.value
  }
}

const onFormProjectChange = async () => {
  const id = formState.projectId
  const opt = projectSelectOptions.value.find((o) => o.value === id)
  formState.projectName = opt?.label ?? ''
  formState.versionId = undefined
  await loadFormVersions(id)
}

const slicePlanDate = (value?: string | null) => {
  if (value == null || value === '') return undefined
  const s = String(value).trim()
  const day = s.includes('T') ? s.slice(0, 10) : s.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

const serializePlanTimeRange = (range?: string[]) => {
  if (!Array.isArray(range) || range.length !== 2) return {}
  const [a, b] = range
  if (a == null || b == null || a === '' || b === '') return {}
  const day = (v: string) => {
    const s = String(v)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s.slice(0, 10)
  }
  const startDay = day(a)
  const endDay = day(b)
  return {
    plannedStartTime: `${startDay} 00:00:00`,
    plannedEndTime: `${endDay} 23:59:59`,
  }
}

/** 规范化为数字字符串用户 ID（避免 Number 精度丢失；过滤日期等非 ID 值） */
const normalizeUserIds = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const v of raw) {
    if (v == null || v === '') continue
    const t = typeof v === 'number' && Number.isInteger(v) && v > 0 ? String(v) : String(v).trim()
    if (/^\d+$/.test(t)) out.push(t)
  }
  return [...new Set(out)]
}

const collectPlanUserIds = (record?: TestPlanResp | null) => [
  ...normalizeUserIds(record?.memberIds),
  ...normalizeUserIds(record?.principalIds),
]

/** 按 ID 补全用户（含禁用用户），供下拉与昵称展示 */
const ensureUsersLoaded = async (ids: string[]) => {
  const missing = [...new Set(ids)].filter((id) => id && !userLabelMap.value.has(id))
  if (!missing.length) return
  try {
    const { data } = await listAllUser({ userIds: missing })
    if (Array.isArray(data) && data.length) mergeUsers(data)
  } catch {
    /* ignore */
  }
  const stillMissing = missing.filter((id) => !userLabelMap.value.has(id))
  await Promise.all(
    stillMissing.map(async (id) => {
      try {
        const { data } = await getUser(id)
        if (data) mergeUsers([data as UserResp])
      } catch {
        /* ignore */
      }
    }),
  )
}

watch(
  () => dataList.value,
  (list) => {
    const ids: string[] = []
    for (const row of list) {
      ids.push(...collectPlanUserIds(row))
    }
    if (ids.length) void ensureUsersLoaded(ids)
  },
  { deep: true },
)

const execState = reactive<{
  executionEngine: TestExecutionEngine
  projectEnvironmentId?: string
  automationEnvironmentId?: string
  executeName: string
  executeEmail: string
}>({
  executionEngine: 'SELENIUM',
  projectEnvironmentId: undefined,
  automationEnvironmentId: undefined,
  executeName: '',
  executeEmail: '',
})

const fillCurrentExecutor = () => {
  execState.executeName = userStore.userInfo.nickname || userStore.userInfo.username || ''
  execState.executeEmail = userStore.userInfo.email || ''
}

const execScopeMode = ref<'plan' | 'selected' | 'all'>('plan')
const execSceneIds = ref<string[]>([])
const execConfigLoading = ref(false)

interface ExecProjectEnvironmentOption {
  value: string
  label: string
  statusLabel: string
  statusColor: string
}

interface ExecAutomationEnvironmentOption {
  value: string
  label: string
  onlineStatusLabel: string
  onlineStatusColor: string
  useStatusLabel: string
  useStatusColor: string
}

const execProjectEnvironmentOptions = ref<ExecProjectEnvironmentOption[]>([])
const execAutomationEnvironmentOptions = ref<ExecAutomationEnvironmentOption[]>([])
const execRunnerConfig = reactive<AutomationPlaywrightRunnerOptions>({
  browser: 'chromium',
  liveFrameQuality: 'high',
  sessionMode: 'isolated',
  headed: false,
  ignoreHttpsErrors: true,
  pageErrorCheckEnabled: true,
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
  stepTimeoutMs: 6000,
  caseTimeoutMs: 600000,
  slowMoMs: 0,
  finishDelayMs: 0,
})
const execCdpConfig = reactive<AutomationCdpPlaybackOptions>({
  browserSessionSource: 'current-profile',
  sessionMode: 'legacy-profile',
  ignoreHttpsErrors: false,
  windowSizeMode: 'maximized' as 'maximized' | 'current' | 'custom',
  viewportWidth: 1920,
  viewportHeight: 1080,
  pageErrorCheckEnabled: true,
})
const liveFrameQualityOptions = [
  { label: '流畅（1080P）', value: 'smooth' },
  { label: '高清（推荐）', value: 'high' },
  { label: '超清（4K）', value: 'ultra' },
  { label: '8K', value: '8k' },
]
const runnerSessionModeOptions = [
  { label: '每条用例独立登录（默认）', value: 'isolated' },
  { label: '复用上一条成功用例登录态', value: 'reuse-auth' },
  { label: '同一浏览器窗口连续执行', value: 'reuse-browser' },
]
const execCdpManagedContextAvailable = ref(false)
const execCdpGrayEnabled = ref(false)
const execCdpCapabilityLoading = ref(false)
const execCdpCapabilitiesReason = ref('尚未完成 CueCast 能力探测。')
const execCdpGrayReason = ref('')
const execCdpSessionModeOptions = computed(() => [
  { label: '当前浏览器兼容模式（非隔离）', value: 'legacy-profile' },
  ...(execCdpManagedContextAvailable.value && execCdpGrayEnabled.value ? runnerSessionModeOptions : []),
])
const artifactPolicyOptions = [
  { label: '关闭', value: 'off' },
  { label: '始终保留', value: 'on' },
  { label: '仅失败保留', value: 'retain-on-failure' },
]
const selectedExecProjectEnvironment = computed(() => execProjectEnvironmentOptions.value
  .find((item) => item.value === toIdString(execState.projectEnvironmentId)))
const selectedExecAutomationEnvironment = computed(() => execAutomationEnvironmentOptions.value
  .find((item) => item.value === toIdString(execState.automationEnvironmentId)))

const executionEngineOptions = [
  { label: 'Selenium 自动化', value: 'SELENIUM' },
  { label: 'Playwright Runner', value: 'PLAYWRIGHT_RUNNER' },
  { label: 'Chrome DevTools Protocol', value: 'CHROME_DEVTOOLS_PROTOCOL' },
]

const formTitle = computed(() => {
  if (formCopyMode.value) return '复制测试计划'
  return formState.id ? '修改测试计划' : '新建测试计划'
})

const reset = () => {
  queryForm.name = undefined
  queryForm.projectId = undefined
  queryForm.type = undefined
  queryForm.status = undefined
  queryForm.createUser = undefined
  queryForm.createTime = undefined
  search()
}

const fillPlanForm = (record?: TestPlanResp | null, copy = false) => {
  formState.id = copy ? '' : record?.id || ''
  const pid = toIdString(record?.projectId)
  formState.projectId = pid || undefined
  formState.versionId = toIdString(record?.versionId) || undefined
  formState.projectName = record?.projectName || ''
  formState.name = copy && record?.name ? `${record.name}-副本` : record?.name || ''
  formState.abbreviate = record?.abbreviate || ''
  formState.type = record?.type || ''
  formState.description = record?.description || ''
  formState.status = record?.status || 'NOT_STARTED'
  formState.memberIds = normalizeUserIds(record?.memberIds)
  formState.principalId = normalizeUserIds(record?.principalIds ?? [])[0]
  const ps = slicePlanDate(record?.plannedStartTime ?? null)
  const pe = slicePlanDate(record?.plannedEndTime ?? null)
  formState.planTimeRange = ps && pe ? [ps, pe] : undefined
  const project = projectSelectOptions.value.find((option) => option.value === formState.projectId)
  if (project) formState.projectName = project.label
}

const openForm = async (record?: TestPlanResp, copy = false) => {
  currentRecord.value = record || null
  formCopyMode.value = copy
  if (!userList.value.length) await loadSystemUserOptions()
  let source: TestPlanResp | undefined = record
  if (record?.id) {
    try {
      const { data } = await getTestPlan(record.id)
      if (data) source = data
    } catch {
      /* 列表行兜底 */
    }
  }
  await ensureUsersLoaded(collectPlanUserIds(source))
  fillPlanForm(source, copy)
  await loadFormVersions(formState.projectId, false)
  if (!formState.versionId) {
    formState.versionId = formVersionOptions.value.find((item) => item.extra === '1')?.value
      || formVersionOptions.value[0]?.value
  }
  formVisible.value = true
  nextTick(() => planFormRef.value?.clearValidate())
}

const openDetail = async (record: TestPlanResp) => {
  const { data } = await getTestPlan(record.id)
  const source = data || record
  await ensureUsersLoaded(collectPlanUserIds(source))
  detailRecord.value = source
  detailVisible.value = true
  await router.replace({ path: '/test/testPlan', query: { id: record.id } })
}

watch(detailVisible, async (visible) => {
  if (!visible && route.query.id) {
    await router.replace({ path: '/test/testPlan', query: {} })
  }
})

const openRelateSceneModal = (record: TestPlanResp) => {
  relateScenePlan.value = record
  relateSceneVisible.value = true
}

const openSceneModal = (record: TestPlanResp) => {
  openRelateSceneModal(record)
}

const isRuntimeOnline = (status: unknown) => String(status) === '5' || status === '在线'
const isRuntimeIdle = (status: unknown) => String(status) === '7' || status === '空闲'

const resetExecRuntimeConfig = () => {
  Object.assign(execRunnerConfig, {
    browser: 'chromium',
    liveFrameQuality: 'high',
    sessionMode: 'isolated',
    headed: false,
    ignoreHttpsErrors: true,
    pageErrorCheckEnabled: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    stepTimeoutMs: 6000,
    caseTimeoutMs: 600000,
    slowMoMs: 0,
    finishDelayMs: 0,
  })
  Object.assign(execCdpConfig, {
    browserSessionSource: 'current-profile',
    sessionMode: 'legacy-profile',
    ignoreHttpsErrors: false,
    windowSizeMode: 'maximized',
    viewportWidth: 1920,
    viewportHeight: 1080,
    pageErrorCheckEnabled: true,
  })
  execCdpManagedContextAvailable.value = false
  execCdpGrayEnabled.value = false
  execCdpCapabilitiesReason.value = '尚未完成 CueCast 能力探测。'
  execCdpGrayReason.value = ''
}

const probeExecCdpCapabilities = async () => {
  execCdpCapabilityLoading.value = true
  try {
    const [capabilityResult, availabilityResult] = await Promise.allSettled([
      getExtensionCdpCapabilities(),
      getAutomationCdpPlaybackAvailability().then((response) => response.data),
    ])
    if (capabilityResult.status === 'fulfilled') {
      execCdpManagedContextAvailable.value = capabilityResult.value.managedBrowserContext
      execCdpCapabilitiesReason.value = capabilityResult.value.reason || ''
    } else {
      execCdpManagedContextAvailable.value = false
      execCdpCapabilitiesReason.value = capabilityResult.reason?.message || '未检测到扩展受控浏览器能力'
    }
    if (availabilityResult.status === 'fulfilled') {
      execCdpGrayEnabled.value = availabilityResult.value.managedContextEnabled
      execCdpGrayReason.value = availabilityResult.value.reason || ''
    } else {
      execCdpGrayEnabled.value = false
      execCdpGrayReason.value = availabilityResult.reason?.message || '无法确认 Admin 灰度资格'
    }
  } finally {
    Object.assign(execCdpConfig, {
      browserSessionSource: 'current-profile',
      sessionMode: 'legacy-profile',
    })
    execCdpCapabilityLoading.value = false
  }
}

watch(() => execCdpConfig.sessionMode, (sessionMode) => {
  execCdpConfig.browserSessionSource = sessionMode === 'legacy-profile'
    ? 'current-profile'
    : 'managed-context'
})

const refreshExecProjectEnvironmentStatus = async (environmentId: string) => {
  const option = execProjectEnvironmentOptions.value.find((item) => item.value === environmentId)
  if (!option) return
  option.statusLabel = '检测中'
  option.statusColor = 'arcoblue'
  try {
    const { data } = await getProjectEnvironmentRuntimeStatus(environmentId)
    const online = isRuntimeOnline(data?.onlineStatus)
    option.statusLabel = online ? '在线' : '离线'
    option.statusColor = online ? 'green' : 'red'
    if (data?.serverIp) option.label = data.serverIp
  } catch {
    option.statusLabel = '检测失败'
    option.statusColor = 'red'
  }
}

const refreshExecAutomationEnvironmentStatus = async (environmentId: string) => {
  const option = execAutomationEnvironmentOptions.value.find((item) => item.value === environmentId)
  if (!option) return
  try {
    const { data } = await getAutomationEnvironmentRuntimeStatus(environmentId)
    const online = isRuntimeOnline(data?.onlineStatus)
    const idle = isRuntimeIdle(data?.useStatus)
    option.onlineStatusLabel = online ? '在线' : '离线'
    option.onlineStatusColor = online ? 'green' : 'red'
    option.useStatusLabel = idle ? '空闲' : String(data?.useStatus) === '8' ? '使用中' : '不可用'
    option.useStatusColor = idle ? 'green' : 'orange'
    if (data?.nodeName) option.label = data.nodeName
  } catch {
    option.onlineStatusLabel = '检测失败'
    option.onlineStatusColor = 'red'
    option.useStatusLabel = '不可用'
    option.useStatusColor = 'red'
  }
}

const loadExecProjectEnvironments = async (projectId: string) => {
  // 项目 ID 为空时不要把空字符串作为 EQ 条件发送，否则后端会返回空列表。
  const { data } = await getProjectEnvironmentConfigList({
    id: undefined,
    projectId: projectId || undefined,
    name: undefined,
    status: 1,
    sort: ['name,asc'],
  })
  const environments = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.list) ? (data as any).list : []
  execProjectEnvironmentOptions.value = environments.map((item: any) => {
    const servers = Array.isArray(item?.serverConfig) ? item.serverConfig : []
    const server = servers.find((candidate: any) => Number(candidate?.status) === 1) || servers[0] || {}
    return {
      value: toIdString(item.id),
      label: server.ip || item.name || toIdString(item.id),
      statusLabel: '未检测',
      statusColor: 'gray',
    }
  })
  execState.projectEnvironmentId = execProjectEnvironmentOptions.value[0]?.value
  if (execState.projectEnvironmentId) {
    await refreshExecProjectEnvironmentStatus(execState.projectEnvironmentId)
  }
}

const loadExecAutomationEnvironments = async () => {
  const { data } = await getAutomationEnvironmentConfigList({
    status: 1,
    sort: ['name,asc'],
  })
  execAutomationEnvironmentOptions.value = (Array.isArray(data) ? data : []).map((item: any) => {
    const nodes = Array.isArray(item?.nodeConfig) ? item.nodeConfig : []
    const node = nodes.find((candidate: any) => Number(candidate?.status) === 1) || nodes[0] || {}
    return {
      value: toIdString(item.id),
      label: node.name || item.name || toIdString(item.id),
      onlineStatusLabel: '未检测',
      onlineStatusColor: 'gray',
      useStatusLabel: '未检测',
      useStatusColor: 'gray',
    }
  })
  execState.automationEnvironmentId = execAutomationEnvironmentOptions.value[0]?.value
  if (execState.automationEnvironmentId) {
    await refreshExecAutomationEnvironmentStatus(execState.automationEnvironmentId)
  }
}

const loadExecEnvironmentOptions = async (record: TestPlanResp) => {
  execConfigLoading.value = true
  execProjectEnvironmentOptions.value = []
  execAutomationEnvironmentOptions.value = []
  try {
    // 列表行可能没有带完整项目字段，打开执行弹窗时重新读取计划详情，确保环境按真实项目查询。
    let source = record
    if (record?.id) {
      try {
        const { data } = await getTestPlan(record.id)
        if (data) source = data
      } catch {
        // 详情读取失败时继续使用列表行，避免阻断弹窗。
      }
    }
    const tasks: Promise<void>[] = [loadExecProjectEnvironments(toIdString(source.projectId))]
    if (execState.executionEngine === 'SELENIUM') tasks.push(loadExecAutomationEnvironments())
    await Promise.all(tasks)
  } catch {
    Message.error('加载执行环境失败，请检查环境配置后重试')
  } finally {
    execConfigLoading.value = false
  }
}

const onExecProjectEnvironmentChange = async (value: unknown) => {
  const environmentId = toIdString(value)
  if (environmentId) await refreshExecProjectEnvironmentStatus(environmentId)
}

const onExecAutomationEnvironmentChange = async (value: unknown) => {
  const environmentId = toIdString(value)
  if (environmentId) await refreshExecAutomationEnvironmentStatus(environmentId)
}

const onExecEngineChange = async () => {
  if (execState.executionEngine === 'CHROME_DEVTOOLS_PROTOCOL') {
    await probeExecCdpCapabilities()
  }
  if (execState.executionEngine === 'SELENIUM' && !execAutomationEnvironmentOptions.value.length) {
    execConfigLoading.value = true
    try {
      await loadExecAutomationEnvironments()
    } catch {
      Message.error('加载自动化环境失败，请检查环境配置后重试')
    } finally {
      execConfigLoading.value = false
    }
  }
}

const openExecModal = (record: TestPlanResp) => {
  currentRecord.value = record
  execScopeMode.value = 'plan'
  execSceneIds.value = []
  execState.executionEngine = 'SELENIUM'
  execState.projectEnvironmentId = undefined
  execState.automationEnvironmentId = undefined
  fillCurrentExecutor()
  resetExecRuntimeConfig()
  execVisible.value = true
  void loadExecEnvironmentOptions(record)
}

const setSceneWorkspaceRef = (key: string, el: unknown) => {
  if (el) sceneWorkspaceRefs.set(key, el as SceneWorkspaceExpose)
  else sceneWorkspaceRefs.delete(key)
}

const reloadSceneTable = async (tabKey: string) => {
  await nextTick()
  await sceneWorkspaceRefs.get(tabKey)?.reload?.()
}

const onRelateSceneSuccess = async () => {
  const planId = relateScenePlan.value?.id
  if (planId) {
    const tab = sceneTabs.value.find((item) => String(item.record.id) === String(planId))
    if (tab) await reloadSceneTable(tab.key)
  }
  void search()
}

const executeSceneModalRef = ref()
const executionCaseSelectModalRef = ref<{
  onOpen: (
    record: any,
    type: Exclude<ExecutionType, 'jenkins'>,
    options?: ExecutionCaseOpenOptions,
  ) => void
}>()
const executionCaseModalRef = ref<{
  onOpen: (
    record: any,
    type: Exclude<ExecutionType, 'jenkins'>,
    options?: ExecutionCaseOpenOptions,
  ) => Promise<void>
}>()
const liveExecutions = ref<LiveExecutionCase[]>([])
const activeExecutionTabKey = ref('')
const pendingHistorySceneId = ref('')
const cdpPlanDispatch = ref<{
  plan: TestPlanResp
  reportId: string
  projectEnvironmentId: string
  cdpOptions: AutomationCdpPlaybackOptions
  queue: Array<{ scene: any, caseIds: string[] }>
} | null>(null)

interface PlanExecutionCaseSelection extends ExecutionContext {
  scene: any
  executionType: Exclude<ExecutionType, 'jenkins'>
  caseIds: string[]
  selectionDisabled?: boolean
}

interface PlanCaseExecutionTask {
  scene: any
  executionType: Exclude<ExecutionType, 'jenkins'>
  testPlanId: string
}

const planCaseExecutionQueue = ref<PlanCaseExecutionTask[]>([])
const planCaseExecutionMode = ref(false)
const planCaseExecutionSceneIds = ref<string[]>([])

const buildPlanExecutionScene = (scenes: any[]) => {
  const first = scenes[0]
  if (!first) return undefined
  return {
    ...first,
    // 计划批量执行在一个配置弹窗中展示所有目标场景的可执行用例；实际执行范围仍由 sceneIds 提交。
    __planAggregate: true,
    // 保留场景边界，选择弹窗必须按场景读取历史，避免重复用例 ID 串场。
    __planScenes: scenes,
    caseList: scenes.flatMap((scene) => Array.isArray(scene?.caseList) ? scene.caseList : []),
  }
}

const openNextPlanCaseSelection = () => {
  const next = planCaseExecutionQueue.value.shift()
  if (!next) return false
  executionCaseSelectModalRef.value?.onOpen(next.scene, next.executionType, {
    recordSource: 'test',
    testPlanId: next.testPlanId,
    selectionDisabled: true,
  })
  return true
}

const onBatchExecuteScene = async (tab: SceneTab, rows: any[], executionType: ExecutionType) => {
  if (!rows.length) {
    Message.warning('请选择场景')
    return
  }
  activeExecutionTabKey.value = tab.key
  pendingHistorySceneId.value = ''
  planCaseExecutionQueue.value = []
  if (executionType !== 'jenkins') {
    const testPlanId = toIdString(tab.record.id)
    const sceneIds = rows.map((scene) => toIdString(scene.id))
    const { data: sceneData } = await getAutomationUiSceneSelected(sceneIds)
    const scenes = Array.isArray(sceneData) && sceneData.length ? sceneData : rows
    const aggregateScene = buildPlanExecutionScene(scenes)
    if (!aggregateScene) {
      Message.warning('当前测试计划关联场景不存在，请刷新后重试')
      return
    }
    planCaseExecutionMode.value = true
    planCaseExecutionSceneIds.value = sceneIds
    planCaseExecutionQueue.value = [{ scene: aggregateScene, executionType, testPlanId }]
    openNextPlanCaseSelection()
    return
  }
  executeSceneModalRef.value?.onOpen(rows, {
    mode: 'selected',
    source: 'plan',
    testPlanId: toIdString(tab.record.id),
  })
}
const onExecuteAllScene = async (tab: SceneTab, executionType: ExecutionType) => {
  activeExecutionTabKey.value = tab.key
  pendingHistorySceneId.value = ''
  planCaseExecutionQueue.value = []
  if (executionType !== 'jenkins') {
    const plan = tab.record
    const { data: planData } = await getTestPlan(plan.id)
    const sceneIds: string[] = planData?.uiTestScene || plan.uiTestScene || []
    if (!sceneIds.length) {
      Message.warning('当前测试计划未关联 UI 自动化场景')
      return
    }
    const { data: sceneData } = await getAutomationUiSceneSelected(sceneIds)
    const scenes = Array.isArray(sceneData) ? sceneData : []
    if (!scenes.length) {
      Message.warning('当前测试计划关联场景不存在，请刷新后重试')
      return
    }
    const testPlanId = toIdString(plan.id)
    const aggregateScene = buildPlanExecutionScene(scenes)
    if (!aggregateScene) {
      Message.warning('当前测试计划关联场景不存在，请刷新后重试')
      return
    }
    planCaseExecutionMode.value = true
    planCaseExecutionSceneIds.value = scenes.map((scene) => toIdString(scene.id))
    planCaseExecutionQueue.value = [{ scene: aggregateScene, executionType, testPlanId }]
    openNextPlanCaseSelection()
    return
  }
  const plan = tab.record
  const { data: planData } = await getTestPlan(plan.id)
  const sceneIds: string[] = planData?.uiTestScene || plan.uiTestScene || []
  if (!sceneIds.length) {
    Message.warning('当前测试计划未关联 UI 自动化场景')
    return
  }
  const { data: sceneData } = await getAutomationUiSceneSelected(sceneIds)
  const scenes = Array.isArray(sceneData) ? sceneData : []
  if (!scenes.length) {
    Message.warning('当前测试计划关联场景不存在，请刷新后重试')
    return
  }
  const workspaceRef = sceneWorkspaceRefs.get(tab.key)
  const ws = workspaceRef as any
  const queryForm = ws?.queryForm
  executeSceneModalRef.value?.onOpen(scenes, {
    mode: 'all',
    query: { ...queryForm, projectId: plan.projectId },
    source: 'plan',
    testPlanId: toIdString(plan.id),
  })
}
const onExecuteOneScene = async (tab: SceneTab, row: any, executionType: ExecutionType) => {
  activeExecutionTabKey.value = tab.key
  const sceneId = toIdString(row.id)
  pendingHistorySceneId.value = sceneId
  planCaseExecutionQueue.value = []
  planCaseExecutionMode.value = false
  planCaseExecutionSceneIds.value = []
  const testPlanId = toIdString(tab.record.id)
  if (executionType === 'jenkins') {
    executeSceneModalRef.value?.onOpen([row], { source: 'plan', testPlanId })
    return
  }
  executionCaseSelectModalRef.value?.onOpen(row, executionType, {
    recordSource: 'test',
    testPlanId,
  })
}
const onSingleSceneExecutionStarted = async () => {
  const targetKey = activeExecutionTabKey.value
  const sceneId = pendingHistorySceneId.value
  if (!targetKey || !sceneId) return
  await sceneWorkspaceRefs.get(targetKey)?.openHistory?.(sceneId)
  pendingHistorySceneId.value = ''
}
const openExecutionConfig = (payload: PlanExecutionCaseSelection) => {
  executionCaseModalRef.value?.onOpen(payload.scene, payload.executionType, {
    caseIds: payload.caseIds,
    recordSource: payload.recordSource,
    testPlanId: payload.testPlanId,
    selectionDisabled: payload.selectionDisabled,
    planExecution: planCaseExecutionMode.value,
  })
}
const reopenExecutionCaseSelect = (payload: PlanExecutionCaseSelection) => {
  executionCaseSelectModalRef.value?.onOpen(payload.scene, payload.executionType, {
    caseIds: payload.caseIds,
    recordSource: payload.recordSource,
    testPlanId: payload.testPlanId,
    selectionDisabled: payload.selectionDisabled,
    planExecution: planCaseExecutionMode.value,
  })
}
const onExecuteSceneSuccess = async () => {
  const targetKey = activeExecutionTabKey.value || activeTab.value
  const historySceneId = pendingHistorySceneId.value
  pendingHistorySceneId.value = ''
  if (targetKey && targetKey !== 'plan-list') {
    if (historySceneId) {
      // 先切换视图，再刷新数据；避免刷新过程中组件重建导致历史页跳转请求丢失。
      await sceneWorkspaceRefs.get(targetKey)?.openHistory?.(historySceneId)
    }
    await reloadSceneTable(targetKey)
  }
  void search()
}

const onPlanExecutionStart = async (payload: {
  executionType: Exclude<ExecutionType, 'jenkins'>
  projectEnvironmentId: string
  runnerOptions?: AutomationPlaywrightRunnerOptions
  cdpOptions?: AutomationCdpPlaybackOptions
}) => {
  const planTab = sceneTabs.value.find((tab) => tab.key === activeExecutionTabKey.value)
  if (!planTab || !planCaseExecutionSceneIds.value.length) {
    Message.error('测试计划执行范围已失效，请重新打开执行弹窗')
    return
  }
  currentRecord.value = planTab.record
  // 批量执行/执行所有不会经过计划执行配置弹窗，执行人信息需要在异步调度前重新取当前登录用户。
  fillCurrentExecutor()
  execScopeMode.value = 'selected'
  execSceneIds.value = [...planCaseExecutionSceneIds.value]
  execState.executionEngine = payload.executionType === 'playwright-runner'
    ? 'PLAYWRIGHT_RUNNER'
    : 'CHROME_DEVTOOLS_PROTOCOL'
  execConfigLoading.value = true
  try {
    await loadExecProjectEnvironments(toIdString(planTab.record.projectId))
  } catch {
    Message.error('加载产品环境失败，请稍后重试')
    planCaseExecutionMode.value = false
    planCaseExecutionSceneIds.value = []
    planCaseExecutionQueue.value = []
    execConfigLoading.value = false
    return
  }
  execState.projectEnvironmentId = payload.projectEnvironmentId
  execState.automationEnvironmentId = undefined
  execConfigLoading.value = false
  await refreshExecProjectEnvironmentStatus(payload.projectEnvironmentId)
  if (payload.runnerOptions) Object.assign(execRunnerConfig, payload.runnerOptions)
  if (payload.cdpOptions) Object.assign(execCdpConfig, payload.cdpOptions)
  planCaseExecutionMode.value = false
  planCaseExecutionSceneIds.value = []
  planCaseExecutionQueue.value = []
  await submitExecute()
}

const onPlaywrightExecutionFinished = async (payload?: { cancelled?: boolean }) => {
  if (cdpPlanDispatch.value) {
    if (payload?.cancelled) {
      const cancelled = cdpPlanDispatch.value
      await cancelTestPlanExecution(cancelled.plan.id, cancelled.reportId)
      cdpPlanDispatch.value = null
      liveExecutions.value = []
      Message.warning('Chrome DevTools Protocol 测试计划执行已取消')
      await goToReports(cancelled.plan, cancelled.reportId)
      return
    }
    await onExecuteSceneSuccess()
    const next = cdpPlanDispatch.value.queue.shift()
    if (next) {
      void executionCaseModalRef.value?.onOpen(next.scene, 'extension-cdp', {
        caseIds: next.caseIds,
        recordSource: 'test',
        testPlanId: toIdString(cdpPlanDispatch.value.plan.id),
        testReportId: cdpPlanDispatch.value.reportId,
        projectEnvironmentId: cdpPlanDispatch.value.projectEnvironmentId,
        cdpOptions: cdpPlanDispatch.value.cdpOptions,
        autoStart: true,
      })
      return
    }
    const completed = cdpPlanDispatch.value
    cdpPlanDispatch.value = null
    Message.success('Chrome DevTools Protocol 测试计划执行完成')
    await goToReports(completed.plan, completed.reportId)
    return
  }
  if (payload?.cancelled) {
    planCaseExecutionQueue.value = []
    await onExecuteSceneSuccess()
    liveExecutions.value = []
    Message.warning('测试计划场景执行已取消')
    return
  }
  if (planCaseExecutionQueue.value.length) {
    await onExecuteSceneSuccess()
    openNextPlanCaseSelection()
    return
  }
  // 完成态实时日志保留到下一次批次开始，避免历史 artifact 覆盖完整运行时日志。
  await onExecuteSceneSuccess()
}

const onCdpPlanStartupFailed = async (error: string) => {
  if (!cdpPlanDispatch.value) {
    planCaseExecutionQueue.value = []
    liveExecutions.value = []
    Message.error(`CDP 执行启动失败：${error}`)
    return
  }
  const failed = cdpPlanDispatch.value
  await cancelTestPlanExecution(failed.plan.id, failed.reportId)
  cdpPlanDispatch.value = null
  liveExecutions.value = []
  Message.error(`CDP 计划调度失败：${error}`)
  await goToReports(failed.plan, failed.reportId)
}

const openSceneTab = async (record: TestPlanResp) => {
  let source = record
  if (record?.id) {
    try {
      const { data } = await getTestPlan(record.id)
      if (data) source = data
    } catch {
      /* 列表行兜底 */
    }
  }
  const key = `scene-${source.id}`
  let tab = sceneTabs.value.find((item) => item.key === key)
  if (!tab) {
    tab = { key, record: source }
    sceneTabs.value.push(tab)
  } else {
    tab.record = source
  }
  activeTab.value = key
}

const onSwitchScenePlan = async (planId: string) => {
  const key = `scene-${planId}`
  const existing = sceneTabs.value.find((item) => item.key === key)
  if (existing) {
    activeTab.value = key
    return
  }
  const record = dataList.value.find((item) => String(item.id) === String(planId))
  if (record) await openSceneTab(record)
}

const onSceneTabDelete = (key: string) => {
  closeSceneTab(String(key))
}

function closeSceneTab(key: string) {
  sceneTabs.value = sceneTabs.value.filter((item) => item.key !== key)
  sceneWorkspaceRefs.delete(key)
  if (activeTab.value === key) activeTab.value = 'plan-list'
}

async function goToReports(record: TestPlanResp, reportId?: string) {
  await router.push({
    path: '/test/testReport',
    query: {
      testPlanId: record.id,
      returnView: 'scene-history',
      ...(reportId ? { id: reportId } : {}),
    },
  })
}

watch(
  () => [route.query.id, route.query.view] as const,
  async ([id, view]) => {
    if (!id) return
    let record = dataList.value.find((item) => String(item.id) === String(id))
    if (!record) {
      const { data } = await getTestPlan(String(id))
      record = data || undefined
    }
    if (!record) return
    if (view === 'scene-history') {
      await openSceneTab(record)
      const tabKey = `scene-${record.id}`
      for (let attempt = 0; attempt < 3 && !sceneWorkspaceRefs.has(tabKey); attempt += 1) {
        await nextTick()
      }
      await sceneWorkspaceRefs.get(tabKey)?.openHistory?.()
      return
    }
    await openDetail(record)
  },
  { immediate: true },
)

const submitForm = async (): Promise<boolean> => {
  if (await planFormRef.value?.validate()) {
    Message.warning('请检查必填项')
    return false
  }
  const memberIds = normalizeUserIds(formState.memberIds)
  const principalIds = formState.principalId ? normalizeUserIds([formState.principalId]) : []
  const timePayload = serializePlanTimeRange(formState.planTimeRange)
  const projectId = toIdString(formState.projectId)
  if (!projectId) {
    Message.warning('请选择所属项目')
    return false
  }
  const payload = {
    projectId,
    versionId: toIdString(formState.versionId),
    projectName: formState.projectName,
    name: formState.name?.trim(),
    abbreviate: formState.abbreviate?.trim(),
    type: formState.type,
    description: formState.description?.trim(),
    status: formState.status,
    memberIds,
    principalIds,
    ...timePayload,
  }
  try {
    if (formState.id) await updateTestPlan(payload, formState.id)
    else await addTestPlan(payload)
  } catch {
    return false
  }
  Message.success('保存成功')
  search()
  return true
}

async function submitExecute(): Promise<boolean> {
  if (!currentRecord.value) return false
  if (execConfigLoading.value) {
    Message.warning('执行环境正在加载，请稍后')
    return false
  }
  const current = currentRecord.value
  const projectEnvironmentId = toIdString(execState.projectEnvironmentId)
  const automationEnvironmentId = toIdString(execState.automationEnvironmentId)
  if (!projectEnvironmentId) {
    Message.warning('请选择产品环境')
    return false
  }
  if (execState.executionEngine === 'SELENIUM' && !automationEnvironmentId) {
    Message.warning('请选择自动化环境')
    return false
  }
  if (execState.executionEngine === 'CHROME_DEVTOOLS_PROTOCOL' && cdpPlanDispatch.value) {
    Message.warning('当前已有 Chrome DevTools Protocol 测试计划正在执行')
    return false
  }
  await refreshExecProjectEnvironmentStatus(projectEnvironmentId)
  if (selectedExecProjectEnvironment.value?.statusLabel !== '在线') {
    Message.warning('当前产品环境服务器不在线，请切换为在线环境后再执行')
    return false
  }
  if (execState.executionEngine === 'SELENIUM') {
    await refreshExecAutomationEnvironmentStatus(automationEnvironmentId)
    if (selectedExecAutomationEnvironment.value?.onlineStatusLabel !== '在线'
      || selectedExecAutomationEnvironment.value?.useStatusLabel !== '空闲') {
      Message.warning('当前自动化执行节点不在线或非空闲状态，请切换节点后再执行')
      return false
    }
  }
  if (execState.executionEngine === 'PLAYWRIGHT_RUNNER'
    && execRunnerConfig.caseTimeoutMs < execRunnerConfig.stepTimeoutMs) {
    Message.warning('用例总超时不能小于单步骤超时')
    return false
  }
  if (execState.executionEngine === 'CHROME_DEVTOOLS_PROTOCOL'
    && execCdpConfig.windowSizeMode === 'custom'
    && (execCdpConfig.viewportWidth < 320 || execCdpConfig.viewportHeight < 320)) {
    Message.warning('自定义窗口宽高不能小于 320')
    return false
  }
  let data: TestPlanExecuteResp | undefined
  try {
    const response = await executeTestPlan(current.id, {
      executionEngine: execState.executionEngine,
      projectEnvironmentId,
      automationEnvironmentId: execState.executionEngine === 'SELENIUM'
        ? automationEnvironmentId || undefined
        : undefined,
      sceneIds: execScopeMode.value === 'selected' ? execSceneIds.value : undefined,
      runnerOptions: execState.executionEngine === 'PLAYWRIGHT_RUNNER'
        ? { ...execRunnerConfig }
        : undefined,
      cdpOptions: execState.executionEngine === 'CHROME_DEVTOOLS_PROTOCOL'
        ? { ...execCdpConfig }
        : undefined,
      executeName: execState.executeName,
      executeEmail: execState.executeEmail,
    })
    data = response.data
  } catch {
    return false
  }
  const executeResp = (data || {}) as TestPlanExecuteResp
  const buildMessage = data?.buildNumber ? `，构建号 ${data.buildNumber}` : ''
  Message.success(`执行已触发${buildMessage}`)
  await search()
  const nextRecord = dataList.value.find((item) => item.id === current.id) || current
  await openSceneTab(nextRecord)
  if (detailVisible.value && detailRecord.value?.id === current.id) detailRecord.value = nextRecord
  if (executeResp.dispatchMode === 'CLIENT_CDP' && executeResp.testReportId) {
    const executable = (executeResp.sceneExecutions || []).filter((item) => item.caseIds?.length)
    if (!executable.length) {
      Message.warning('当前测试计划无可执行 CDP 用例')
      await goToReports(nextRecord, String(executeResp.testReportId))
      return true
    }
    let scenes: any[] = []
    try {
      const { data } = await getAutomationUiSceneSelected(executable.map((item) => item.sceneKey))
      scenes = Array.isArray(data) ? data : []
    } catch {
      await cancelTestPlanExecution(nextRecord.id, String(executeResp.testReportId))
      Message.error('加载 CDP 执行场景失败，本次执行已终止')
      await goToReports(nextRecord, String(executeResp.testReportId))
      return true
    }
    const sceneMap = new Map(scenes.map((scene) => [String(scene.id), scene]))
    const queue = executable
      .map((item) => ({ scene: sceneMap.get(String(item.sceneKey)), caseIds: item.caseIds.map(String) }))
      .filter((item) => Boolean(item.scene))
    if (queue.length !== executable.length) {
      await cancelTestPlanExecution(nextRecord.id, String(executeResp.testReportId))
      Message.error('测试计划中的部分 CDP 场景已不存在，执行已终止')
      await goToReports(nextRecord, String(executeResp.testReportId))
      return true
    }
    cdpPlanDispatch.value = {
      plan: nextRecord,
      reportId: String(executeResp.testReportId),
      projectEnvironmentId,
      cdpOptions: { ...execCdpConfig },
      queue,
    }
    const first = cdpPlanDispatch.value.queue.shift()
    if (first) {
      void executionCaseModalRef.value?.onOpen(first.scene, 'extension-cdp', {
        caseIds: first.caseIds,
        recordSource: 'test',
        testPlanId: toIdString(nextRecord.id),
        testReportId: String(executeResp.testReportId),
        projectEnvironmentId,
        cdpOptions: cdpPlanDispatch.value.cdpOptions,
        autoStart: true,
      })
    } else {
      await cancelTestPlanExecution(nextRecord.id, String(executeResp.testReportId))
      cdpPlanDispatch.value = null
      Message.error('测试计划中的 CDP 场景已不存在，执行已终止')
      await goToReports(nextRecord, String(executeResp.testReportId))
    }
    return true
  }
  if (executeResp.testReportId) await goToReports(nextRecord, String(executeResp.testReportId))
  return true
}

onUnmounted(() => {
  const active = cdpPlanDispatch.value
  if (active) void cancelTestPlanExecution(active.plan.id, active.reportId)
})

const onDelete = (record?: TestPlanResp) => {
  const ids = selectedKeys.value.length ? selectedKeys.value.map((item) => String(item)) : record ? record.id : ''
  Modal.warning({
    title: '确认删除',
    content: selectedKeys.value.length ? '确认删除选中的测试计划吗？' : `确认删除测试计划“${record?.name || ''}”吗？`,
    hideCancel: false,
    onOk: async () => {
      await deleteTestPlan(ids)
      Message.success('删除成功')
      search()
    },
  })
}

const onExport = async () => {
  const base = pickQueryForBackend()
  await exportTestPlan(selectedKeys.value.length ? { ...base, id: selectedKeys.value.join(',') } : base)
}

const formatUserIds = (value?: Array<string | number>) => {
  const ids = normalizeUserIds(value)
  if (!ids.length) return '-'
  return ids.map((id) => userLabelMap.value.get(id) ?? id).join('、')
}

const openListModal = async (title: string, value?: Array<string | number>) => {
  const ids = normalizeUserIds(value)
  await ensureUsersLoaded(ids)
  listModalTitle.value = title
  listModalContent.value = formatUserIds(value)
  listModalVisible.value = true
}

const formatList = (value?: Array<string | number>) => {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.join(', ')
}

/** 与参考列表一致的时间展示：YYYY-MM-DD HH:mm:ss */
function formatPlanDateTime(value?: string | null) {
  if (value == null || value === '') return '-'
  const s = String(value).trim()
  const normalized = s.includes('T') ? s.replace('T', ' ') : s
  return normalized.length > 19 ? normalized.slice(0, 19) : normalized
}

const resolvePlanExecuteResult = (record: TestPlanResp) => {
  const status = String(record.status || '').toUpperCase()
  if (status === 'RUNNING') return 'RUNNING'
  if (status === 'NOT_STARTED') return 'NOT_EXECUTED'
  const executedCount = Number(record.executedCount || 0)
  const passedCount = Number(record.passedCount || 0)
  if (!executedCount) return 'NOT_EXECUTED'
  return passedCount >= executedCount ? 'PASSED' : 'FAILED'
}
</script>

<style scoped lang="scss">
.test-plan-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
  min-height: 0;
  padding: 0;
  background: var(--color-bg-1);
}

.plan-edit-form :deep(.arco-form-item) {
  margin-bottom: 16px;
}

.test-plan-page .plan-list-table {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.test-plan-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  margin-top: 5px;
  background: transparent;

  :deep(.arco-tabs) {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }

  :deep(.arco-tabs-nav) {
    flex: none;
    margin-bottom: 0;
  }

  :deep(.arco-tabs-nav-tab) {
    padding: 0 2px;
  }

  :deep(.arco-tabs-content) {
    box-sizing: border-box;
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: 0;
    height: calc(100% - 42px);
    min-height: 480px;
    padding: 16px;
    background: var(--color-bg-1);
    border: 1px solid var(--color-border-2);
    border-top: 0;
    border-radius: 0 4px 4px 4px;
    box-shadow: 0 2px 6px rgb(0 0 0 / 4%);
  }

  :deep(.arco-tabs-content-list) {
    height: 100%;
    width: 100%;
  }

  :deep(.arco-tabs-pane) {
    height: 100%;
    width: 100%;
    min-width: 0;
    overflow: visible;
  }

  &--scene {
    :deep(.arco-tabs-content) {
      padding: 6px 6px 6px 0px;
      background: var(--color-bg-2);
      box-shadow: none;
    }
  }
}

.scene-tab-pane {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 220px);
}

/** GiTable #top 内避免 shrink-to-fit，筛选区须与表格同宽 */
.plan-query-top-slot {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.query-form {
  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }
}

/** 筛选区：GiForm searchCell 双行布局 */
.plan-query-form {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-select-view-single),
  :deep(.arco-picker) {
    background: var(--color-bg-1);
  }
}

.plan-query-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.plan-query-cell__label {
  box-sizing: border-box;
  flex: 0 0 80px;
  width: 80px;
  padding: 0 4px 0 0;
  color: var(--color-text-2);
  font-weight: 500;
  font-size: 14px;
  line-height: 32px;
  text-align: right;
  white-space: nowrap;
}

.plan-query-cell__control {
  flex: 1 1 0;
  min-width: 0;

  :deep(.arco-select),
  :deep(.arco-input-wrapper),
  :deep(.arco-input-number),
  :deep(.arco-picker) {
    width: 100%;
    max-width: 100%;
  }
}

/**
 * 每行：左侧三等分字段（两行共用同一套列宽）+ 右侧按钮贴邻，避免「整行四列 1fr」在第三列与按钮间留出大块空白，
 * 并约束日期范围与上方输入同宽对齐。
 */
.plan-query-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-width: 0;
}

.plan-query-line {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.plan-query-line__fields {
  display: flex;
  flex: 1 1 0;
  gap: 16px;
  align-items: center;
  min-width: 0;
}

.plan-query-line__btn {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 100px;
  justify-content: flex-end;
  min-width: 100px;
}

.plan-query-field {
  flex: 1 1 0;
  min-width: 0;
}

.plan-query-range {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .plan-query-line {
    flex-direction: column;
    align-items: stretch;
  }

  .plan-query-line__fields {
    flex: none;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .plan-query-field {
    flex: none;
    width: 100%;
  }

  .plan-query-line__btn {
    display: flex;
    justify-content: stretch;

    :deep(.arco-btn) {
      width: 100%;
    }
  }
}

.more-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.more-link__caret {
  margin-left: 2px;
  font-size: 12px;
}

.plan-list-table {
  :deep(.gi-table) {
    width: 100%;
    max-width: 100%;
    min-height: calc(100vh - 300px);
    padding: 0;
    background: var(--color-bg-1);
    border-radius: 0;
  }

  :deep(.gi-table__top) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  :deep(.gi-table__toolbar) {
    min-height: 44px;
    padding: 4px 0 14px;
    margin-top: 0;
  }

  :deep(.gi-table__toolbar-left),
  :deep(.gi-table__toolbar-right) {
    gap: 8px;
  }

  :deep(.arco-table-container) {
    border: 1px solid var(--color-border-2);
    border-radius: 6px;
  }

  :deep(.arco-table-th) {
    height: 44px;
    background: var(--color-fill-1);
  }

  // :deep(.arco-table-td) {
  //   height: 46px;
  // }

  :deep(.arco-table-pagination) {
    margin-top: 14px;
    padding-bottom: 2px;
  }
}

.progress-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  :deep(.arco-progress) {
    width: 10px;
  }

  span {
    min-width: 36px;
    color: var(--color-text-3);
    font-size: 12px;
  }
}

.detail-actions {
  background: var(--color-fill-1);
}

.mb-3 {
  margin-bottom: 12px;
}

.plan-execute-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;

  :deep(.arco-card) {
    margin-bottom: 16px;
  }

  :deep(.arco-input-number) {
    width: 100%;
  }
}

.exec-option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.executor-row {
  margin-top: 4px;
}
</style>
