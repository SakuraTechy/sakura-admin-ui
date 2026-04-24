<template>
  <a-drawer v-model:visible="visible" title="自动化管理-环境配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="环境ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="环境类型">
        <GiCellTag :value="dataDetail?.type" :dict="automation_type" />
      </a-descriptions-item>
      <a-descriptions-item label="环境名称">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="环境描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="环境项目信息">
        <GiCellKeyValue :data="projectConfig ?? []" title="环境项目信息" />
      </a-descriptions-item>
      <a-descriptions-item label="环境Jenkins信息">
        <GiCellKeyValue :data="jenkinsConfig ?? []" title="环境Jenkins信息" />
      </a-descriptions-item>
      <a-descriptions-item label="环境浏览器信息">
        <GiCellKeyValue :data="browserConfig ?? []" title="环境浏览器信息" />
      </a-descriptions-item>
      <a-descriptions-item label="环境节点信息">
        <GiCellKeyValue :data="nodeConfig ?? []" title="环境节点信息" />
      </a-descriptions-item>

      <a-descriptions-item label="状态">
        <GiCellTag :value="dataDetail?.status" :dict="status_type" />
      </a-descriptions-item>
      <a-descriptions-item label="删除标志（3正常 4异常）">
        <GiCellTag :value="dataDetail?.delFlag" :dict="status_type" />
      </a-descriptions-item>
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type AutomationEnvironmentConfigDetailResp, getAutomationEnvironmentConfig as getDetail } from '@/apis/automation/automationEnvironmentConfig'
import { useDict } from '@/hooks/app'

const { automation_type, status_type, server_type, browser_type } = useDict('automation_type', 'status_type', 'server_type', 'browser_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<AutomationEnvironmentConfigDetailResp>()
const visible = ref(false)

let projectConfig = [{ paramsName: '', paramsValue: '' }]
let jenkinsConfig = [{ paramsName: '', paramsValue: '' }]
let nodeConfig = [{ paramsName: '', paramsValue: '' }]
let browserConfig = [{ paramsName: '', paramsValue: '' }]
// 查询详情
const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data

  const projectData = Array.isArray(data.projectConfig[0])
    ? data.projectConfig[0]
    : [data.projectConfig[0]]
  projectConfig = projectData.flatMap((item: any) => [
    { paramsName: '项目ID', paramsValue: item?.id ?? '' },
    { paramsName: '项目类型', paramsValue: item?.type ?? '', paramsType: automation_type.value },
    { paramsName: '项目名称', paramsValue: item?.name ?? '' },
    { paramsName: '项目地址', paramsValue: item?.url ?? '' },
    { paramsName: '脚本路径', paramsValue: item?.scriptPath ?? '' },
    { paramsName: '项目描述', paramsValue: item?.description ?? '' },
    { paramsName: '项目状态', paramsValue: item?.status ?? '' },
  ])

  const jenkinsData = Array.isArray(data.jenkinsConfig[0])
    ? data.jenkinsConfig[0]
    : [data.jenkinsConfig[0]]
  const jobListData = Array.isArray(data.jenkinsConfig[0]?.jobList)
    ? data.jenkinsConfig[0]?.jobList
    : [data.jenkinsConfig[0]?.jobList]
  const jobList = jobListData.flatMap((item: any) => [
    { paramsName: '项目ID', paramsValue: item?.id ?? '' },
    { paramsName: '项目类型', paramsValue: item?.type ?? '', paramsType: automation_type.value },
    { paramsName: '项目名称', paramsValue: item?.name ?? '' },
    { paramsName: '项目地址', paramsValue: item?.url ?? '' },
    { paramsName: '脚本路径', paramsValue: item?.scriptPath ?? '' },
    { paramsName: '项目描述', paramsValue: item?.description ?? '' },
    { paramsName: '项目状态', paramsValue: item?.status ?? '' },
  ])
  jenkinsConfig = jenkinsData.flatMap((item: any) => [
    { paramsName: 'Jenkins ID', paramsValue: item?.id ?? '' },
    { paramsName: 'Jenkins 版本', paramsValue: item?.version ?? '' },
    { paramsName: 'Jenkins 名称', paramsValue: item?.ip ?? '' },
    { paramsName: 'Jenkins 端口', paramsValue: item?.port ?? '' },
    { paramsName: 'Jenkins 用户名', paramsValue: item?.userName ?? '' },
    { paramsName: 'Jenkins 密码', paramsValue: item?.passWord ?? '' },
    { paramsName: 'Jenkins 地址', paramsValue: item?.url ?? '' },
    { paramsName: 'Jenkins 描述', paramsValue: item?.description ?? '' },
    { paramsName: 'Jenkins 关联项目', paramsValue: jobList ?? '' },
    { paramsName: 'Jenkins 状态', paramsValue: item?.status ?? '' },
  ])

  const nodeData = Array.isArray(data.nodeConfig[0])
    ? data.nodeConfig[0]
    : [data.nodeConfig[0]]
  const descriptionData = Array.isArray(data.nodeConfig[0]?.description)
    ? data.nodeConfig[0]?.description
    : [data.nodeConfig[0]?.description]
  const description = descriptionData.flatMap((item: any) => [
    { paramsName: '名称', paramsValue: item?.name },
    { paramsName: '类型', paramsValue: item?.systemType, paramsType: server_type.value },
    { paramsName: '用户名', paramsValue: item?.userName },
    { paramsName: '密码', paramsValue: item?.passWord },
    { paramsName: '凭据', paramsValue: item?.credentialsId },
    { paramsName: '地址', paramsValue: data.nodeConfig[0]?.url },
  ])
  let active = [{ paramsName: '', paramsValue: '' }]
  const currentExecutableData = Array.isArray(data.nodeConfig[0]?.active?.idle?.currentExecutable)
    ? data.nodeConfig[0]?.active.idle.currentExecutable
    : [data.nodeConfig[0]?.active?.idle?.currentExecutable]

  const currentExecutable = currentExecutableData.flatMap((item: any) => [
    { paramsName: '使用者名称', paramsValue: item?.user ?? '' },
    { paramsName: '使用者地址', paramsValue: item?.url ?? '' },
  ])
  const activeData = Array.isArray(data.nodeConfig[0]?.active)
    ? data.nodeConfig[0]?.active
    : [data.nodeConfig[0]?.active]
  active = activeData.flatMap((item: any) => [
    { paramsName: '在线状态', paramsValue: item.offline?.status ?? '' },
    ...(item.idle?.status === 6
      ? [{ paramsName: '离线原因', paramsValue: item?.offline?.offlineCauseReason ?? '' }]
      : []
    ),
    { paramsName: '使用状态', paramsValue: item.offline.status === 6 ? item?.offline?.status : item?.idle?.status },
    ...(item.idle?.status === 8
      ? [{ paramsName: '使用者名称', paramsValue: currentExecutable }]
      : []
    ),
  ])
  nodeConfig = nodeData.flatMap((item: any) => [
    // { paramsName: 'Jenkins', paramsValue: item?.jenkinsName ?? '' },
    { paramsName: '节点 ID', paramsValue: item?.id ?? '' },
    { paramsName: '节点类型', paramsValue: item?.type ?? '', paramsType: server_type.value },
    { paramsName: '节点名称', paramsValue: item?.name ?? '' },
    { paramsName: '节点地址', paramsValue: item?.url ?? '' },
    { paramsName: '节点描述', paramsValue: description ?? '' },
    { paramsName: '节点参数配置', paramsValue: item?.configList ?? '' },
    { paramsName: '节点活动标签', paramsValue: active ?? '' },
    { paramsName: '节点状态', paramsValue: item?.status ?? '' },
  ])

  const browserData = Array.isArray(data.browserConfig[0])
    ? data.browserConfig[0]
    : [data.browserConfig[0]]
  browserConfig = browserData.flatMap((item: any) => [
    { paramsName: '浏览器ID', paramsValue: item?.id ?? '' },
    { paramsName: '浏览器类型', paramsValue: item?.type ?? '', paramsType: browser_type.value },
    { paramsName: '浏览器版本', paramsValue: item?.version ?? '' },
    { paramsName: '浏览器名称', paramsValue: item?.name ?? '' },
    { paramsName: '官方下载地址', paramsValue: item?.officialDownload },
    { paramsName: '驱动下载地址', paramsValue: item?.driverDownload },
    { paramsName: '本地程序路径', paramsValue: item?.exePath },
    { paramsName: '本地驱动路径', paramsValue: item?.driverPath },
    { paramsName: '配置文件路径', paramsValue: item?.profilePath },
    { paramsName: '浏览器描述', paramsValue: item?.description },
    { paramsName: '浏览器状态', paramsValue: item?.status ?? '' },
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
</style>
