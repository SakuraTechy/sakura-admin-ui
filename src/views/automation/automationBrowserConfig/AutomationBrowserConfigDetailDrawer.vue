<template>
  <a-drawer v-model:visible="visible" title="自动化管理-浏览器配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="浏览器ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="浏览器类型">
        <GiCellTag :value="dataDetail?.type" :dict="browser_type" />
      </a-descriptions-item>
      <a-descriptions-item label="浏览器版本">
        <GiCellVersion :version="dataDetail?.version ?? ''" />
      </a-descriptions-item>
      <a-descriptions-item label="浏览器名称">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="浏览器配置">
        <GiCellKeyValue :data="browserConfig ?? []" title="浏览器配置" />
      </a-descriptions-item>
      <!-- <a-descriptions-item label="浏览器程序下载地址">{{ dataDetail?.officialDownload }}</a-descriptions-item>
      <a-descriptions-item label="浏览器驱动下载地址">{{ dataDetail?.driverDownload }}</a-descriptions-item>
      <a-descriptions-item label="浏览器程序路径">{{ dataDetail?.exePath }}</a-descriptions-item>
      <a-descriptions-item label="浏览器驱动路径">{{ dataDetail?.driverPath }}</a-descriptions-item>
      <a-descriptions-item label="浏览器配置文件路径">{{ dataDetail?.profilePath }}</a-descriptions-item>
      <a-descriptions-item label="浏览器描述">{{ dataDetail?.description }}</a-descriptions-item> -->
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
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type AutomationBrowserConfigDetailResp, getAutomationBrowserConfig as getDetail } from '@/apis/automation/automationBrowserConfig'
import { useDict } from '@/hooks/app'

const { status_type, browser_type } = useDict('status_type', 'browser_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<AutomationBrowserConfigDetailResp>()
const visible = ref(false)

let browserConfig = [{ paramsName: '', paramsValue: '' }]
// 查询详情
const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data
  browserConfig = [
    { paramsName: '官方下载地址', paramsValue: data?.officialDownload },
    { paramsName: '驱动下载地址', paramsValue: data?.driverDownload },
    { paramsName: '本地程序路径', paramsValue: data?.exePath },
    { paramsName: '本地驱动路径', paramsValue: data?.driverPath },
    { paramsName: '配置文件路径', paramsValue: data?.profilePath },
    { paramsName: '浏览器描述', paramsValue: data?.description },
  ]
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
