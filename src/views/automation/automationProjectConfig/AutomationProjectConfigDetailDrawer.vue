<template>
  <a-drawer v-model:visible="visible" title="自动化管理-项目配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="项目ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="项目名称">
        <GiCellTags :data="[dataDetail?.name ?? '']" />
      </a-descriptions-item>
      <a-descriptions-item label="项目类型">
        <GiCellTag :value="dataDetail?.type" :dict="automation_type" />
      </a-descriptions-item>
      <a-descriptions-item label="项目地址">
        <GiCellKeyValue :data="[{ paramsName: '地址', paramsValue: dataDetail?.url ?? '' }]" title="项目地址" />
      </a-descriptions-item>
      <a-descriptions-item label="项目描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="状态">
        <GiCellTag :value="dataDetail?.status" :dict="status_type" />
      </a-descriptions-item>
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
      <!-- <a-descriptions-item label="更新IP">{{ dataDetail?.updateIp }}</a-descriptions-item> -->
      <!-- <a-descriptions-item label="删除标志（3正常 4异常）">{{ dataDetail?.delFlag }}</a-descriptions-item> -->
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type AutomationProjectConfigDetailResp, getAutomationProjectConfig as getDetail } from '@/apis/automation/automationProjectConfig'
import { useDict } from '@/hooks/app'

const { automation_type, status_type } = useDict('automation_type', 'status_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<AutomationProjectConfigDetailResp>()
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
