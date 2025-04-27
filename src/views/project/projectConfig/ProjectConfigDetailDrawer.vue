<template>
  <a-drawer v-model:visible="visible" title="项目配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="项目ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="项目名称">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="项目简称">{{ dataDetail?.abbreviate }}</a-descriptions-item>
      <a-descriptions-item label="项目成员"><GiCellTags :data="dataDetail?.memberNames || []" /></a-descriptions-item>
      <a-descriptions-item label="项目描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="项目域名">{{ dataDetail?.lastDomain }}</a-descriptions-item>
      <a-descriptions-item label="主线版本">{{ dataDetail?.lastVersion }}</a-descriptions-item>
      <!-- <a-descriptions-item label="状态"><GiCellStatus :status="dataDetail?.status" /></a-descriptions-item> -->
      <a-descriptions-item label="状态">
        <a-tag v-if="dataDetail?.status === 1" color="green">启用</a-tag>
        <a-tag v-else color="red">禁用</a-tag>
      </a-descriptions-item>
      <!-- <a-descriptions-item label="创建者">{{ dataDetail?.createUser }}</a-descriptions-item> -->
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <!-- <a-descriptions-item label="创建部门">{{ dataDetail?.deptId }}</a-descriptions-item> -->
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <!-- <a-descriptions-item label="更新者">{{ dataDetail?.updateUser }}</a-descriptions-item> -->
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="更新时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
      <a-descriptions-item label="更新IP">{{ dataDetail?.updateIp }}</a-descriptions-item>
      <a-descriptions-item label="备注">{{ dataDetail?.remark }}</a-descriptions-item>
      <a-descriptions-item label="版本">{{ dataDetail?.version }}</a-descriptions-item>
      <a-descriptions-item label="删除标志（0删除 1存在）">{{ dataDetail?.delFlag }}</a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type ProjectConfigDetailResp, getProjectConfig as getDetail } from '@/apis/project/projectConfig'

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<ProjectConfigDetailResp>()
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
