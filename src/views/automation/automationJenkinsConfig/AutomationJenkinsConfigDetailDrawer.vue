<template>
  <a-drawer v-model:visible="visible" title="自动化管理-Jenkins配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="版本">
        <GiCellVersion :version="dataDetail?.version ?? ''" />
      </a-descriptions-item>
      <a-descriptions-item label="IP">{{ dataDetail?.ip }}</a-descriptions-item>
      <a-descriptions-item label="端口">{{ dataDetail?.port }}</a-descriptions-item>
      <a-descriptions-item label="用户名">{{ dataDetail?.userName }}</a-descriptions-item>
      <a-descriptions-item label="密码">
        <GiCellPassword :value="dataDetail?.passWord" />
      </a-descriptions-item>
      <a-descriptions-item label="地址">{{ dataDetail?.url }}</a-descriptions-item>
      <a-descriptions-item label="关联项目">
        <GiCellKeyValue :data="jobList ?? []" :slot-name="true" title="关联项目" />
      </a-descriptions-item>
      <a-descriptions-item label="描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="状态">
        <GiCellTag :value="dataDetail?.status" :dict="status_type" />
      </a-descriptions-item>
      <!-- <a-descriptions-item label="删除标志（3正常 4异常）">
        <GiCellTag :value="dataDetail?.delFlag" :dict="status_type" />
      </a-descriptions-item> -->
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
      <!-- <a-descriptions-item label="更新人IP">{{ dataDetail?.updateIp }}</a-descriptions-item> -->
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type AutomationJenkinsConfigDetailResp, getAutomationJenkinsConfig as getDetail } from '@/apis/automation/automationJenkinsConfig'
import { useDict } from '@/hooks/app'

const { status_type, automation_type } = useDict('status_type', 'automation_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<AutomationJenkinsConfigDetailResp>()
const visible = ref(false)

let jobList = [{ paramsName: '', paramsValue: '' }]

const resolveStatusLabel = (status: string | number | null | undefined) => {
  const matched = status_type.value?.find(item =>
    String(item.value) === String(status) || item.label === status,
  )
  return matched?.label || status || '-'
}
// 查询详情
const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data

  const jobData = Array.isArray(data.jobList)
    ? data.jobList
    : [data.jobList]
  jobList = jobData.flatMap((item: any) => [
    { paramsName: '项目ID', paramsValue: item?.id ?? '' },
    { paramsName: '项目类型', paramsValue: item?.type ?? '', paramsType: automation_type?.value },
    { paramsName: '项目名称', paramsValue: item?.name ?? '' },
    { paramsName: '项目地址1', paramsValue: item?.url ?? '' },
    { paramsName: '脚本路径', paramsValue: item?.scriptPath ?? '' },
    { paramsName: '项目描述', paramsValue: item?.description ?? '' },
    { paramsName: '项目状态', paramsValue: resolveStatusLabel(item?.status) },
  ])
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
:deep(.gi-cell-key-value) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
</style>
