<template>
  <a-drawer v-model:visible="visible" title="项目管理-版本配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="版本ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="所属项目">
        <GiCellTags :data="[dataDetail?.projectName ?? '']" />
      </a-descriptions-item>
      <a-descriptions-item label="版本名称">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="版本描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="状态">
        <GiCellTag :value="dataDetail?.status" :dict="status_type" />
      </a-descriptions-item>
      <a-descriptions-item label="删除标志（0删除 1存在）">{{ dataDetail?.delFlag }}</a-descriptions-item>
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
import { type ProjectVersionConfigDetailResp, getProjectVersionConfig as getDetail } from '@/apis/project/projectVersionConfig'
import { useDict } from '@/hooks/app'

const { status_type } = useDict('status_type')
const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<ProjectVersionConfigDetailResp>()
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

<style scoped lang="scss"></style>
