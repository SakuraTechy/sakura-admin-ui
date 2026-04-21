<template>
  <a-drawer v-model:visible="visible" title="自动化管理-UI自动化场景详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="主键ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="场景ID">{{ dataDetail?.sceneId }}</a-descriptions-item>
      <a-descriptions-item label="场景名称">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="场景描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="所属项目ID">{{ dataDetail?.projectId }}</a-descriptions-item>
      <a-descriptions-item label="所属项目名称">{{ dataDetail?.projectName }}</a-descriptions-item>
      <a-descriptions-item label="所属项目版本ID">{{ dataDetail?.versionId }}</a-descriptions-item>
      <a-descriptions-item label="所属项目版本名称">{{ dataDetail?.versionName }}</a-descriptions-item>
      <a-descriptions-item label="所属模块ID">{{ dataDetail?.moduleId }}</a-descriptions-item>
      <a-descriptions-item label="所属模块路径">{{ dataDetail?.modulePath }}</a-descriptions-item>
      <a-descriptions-item label="场景等级">{{ dataDetail?.level }}</a-descriptions-item>
      <a-descriptions-item label="场景状态">{{ dataDetail?.status }}</a-descriptions-item>
      <a-descriptions-item label="状态">
        <GiCellTag :value="dataDetail?.status" :dict="status_type" />
      </a-descriptions-item>
      <a-descriptions-item label="场景标签">{{ dataDetail?.tags }}</a-descriptions-item>
      <a-descriptions-item label="场景标签">
        <GiCellTags :data="dataDetail?.tagsNames || []" />
      </a-descriptions-item>
      <a-descriptions-item label="场景用例信息">{{ dataDetail?.caseList }}</a-descriptions-item>
      <a-descriptions-item label="场景用例信息">
        <GiCellTags :data="dataDetail?.caseListNames || []" />
      </a-descriptions-item>
      <a-descriptions-item label="关联的测试计划">{{ dataDetail?.testPlanId }}</a-descriptions-item>
      <a-descriptions-item label="关联的测试计划">
        <GiCellTags :data="dataDetail?.testPlanIdNames || []" />
      </a-descriptions-item>
      <a-descriptions-item label="所属测试报告ID">{{ dataDetail?.reportId }}</a-descriptions-item>
      <a-descriptions-item label="调试记录">{{ dataDetail?.debugRecord }}</a-descriptions-item>
      <a-descriptions-item label="调试记录">
        <GiCellTags :data="dataDetail?.debugRecordNames || []" />
      </a-descriptions-item>
      <a-descriptions-item label="测试记录">{{ dataDetail?.testRecord }}</a-descriptions-item>
      <a-descriptions-item label="测试记录">
        <GiCellTags :data="dataDetail?.testRecordNames || []" />
      </a-descriptions-item>
      <a-descriptions-item label="Jenkins构建编号">{{ dataDetail?.buildNumber }}</a-descriptions-item>
      <a-descriptions-item label="Jenkins控制台日志地址">{{ dataDetail?.consoleUrl }}</a-descriptions-item>
      <a-descriptions-item label="Jenkins测试报告地址">{{ dataDetail?.testReportUrl }}</a-descriptions-item>
      <a-descriptions-item label="场景用例总数">{{ dataDetail?.caseTotal }}</a-descriptions-item>
      <a-descriptions-item label="场景用例通过数">{{ dataDetail?.casePass }}</a-descriptions-item>
      <a-descriptions-item label="场景用例失败数">{{ dataDetail?.caseFail }}</a-descriptions-item>
      <a-descriptions-item label="场景用例跳过数">{{ dataDetail?.caseSkip }}</a-descriptions-item>
      <a-descriptions-item label="场景用例通过率（场景用例通过数/场景用例总数）">{{ dataDetail?.passRate }}</a-descriptions-item>
      <a-descriptions-item label="最后执行结果">{{ dataDetail?.lastResult }}</a-descriptions-item>
      <a-descriptions-item label="场景用例步骤总数">{{ dataDetail?.stepTotal }}</a-descriptions-item>
      <a-descriptions-item label="场景用例步骤成功数">{{ dataDetail?.stepPass }}</a-descriptions-item>
      <a-descriptions-item label="场景用例步骤失败数">{{ dataDetail?.stepFail }}</a-descriptions-item>
      <a-descriptions-item label="场景用例步骤跳过数">{{ dataDetail?.stepSkip }}</a-descriptions-item>
      <a-descriptions-item label="创建人">{{ dataDetail?.createUser }}</a-descriptions-item>
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUser }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人IP">{{ dataDetail?.updateIp }}</a-descriptions-item>
      <a-descriptions-item label="删除标志（3正常 4异常）">{{ dataDetail?.delFlag }}</a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type AutomationUiSceneDetailResp, getAutomationUiScene as getDetail } from '@/apis/automation/automationUiScene'
import { useDict } from '@/hooks/app'

const { status_type } = useDict('status_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<AutomationUiSceneDetailResp>()
const visible = ref(false)

// 查询详情
const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data
}

// 打开
const onOpen = async (id: string) => {
  dataId.value = id
  await getDataDetail()
  visible.value = true
}

defineExpose({ onOpen })
</script>

<script lang="ts">
export default {}
</script>

<style scoped lang="scss">
</style>
