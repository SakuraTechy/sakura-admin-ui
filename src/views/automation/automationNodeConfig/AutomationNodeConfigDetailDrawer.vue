<template>
  <a-drawer v-model:visible="visible" title="自动化管理-节点配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="节点ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="所属Jenkins">
        <GiCellTags :data="[dataDetail?.jenkinsName ?? '']" />
      </a-descriptions-item>
      <a-descriptions-item label="节点名称">{{ dataDetail?.name }}</a-descriptions-item>
      <!-- <a-descriptions-item label="节点地址">{{ dataDetail?.url }}</a-descriptions-item> -->
      <a-descriptions-item label="节点描述">
        <GiCellKeyValue :data="description ?? []" :slot-name="true" title="节点描述" />
      </a-descriptions-item>
      <a-descriptions-item label="节点环境状态">
        <GiCellKeyValue :data="active ?? []" :slot-tag="true" title="节点环境状态" />
      </a-descriptions-item>
      <a-descriptions-item label="节点参数列表">
        <GiCellKeyValue :data="dataDetail?.configList ?? []" title="节点参数列表" />
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
      <!-- <a-descriptions-item label="更新IP">{{ dataDetail?.updateIp }}</a-descriptions-item> -->
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type AutomationNodeConfigDetailResp, getAutomationNodeConfig as getDetail } from '@/apis/automation/automationNodeConfig'
import { useDict } from '@/hooks/app'

const { status_type, server_type } = useDict('status_type', 'server_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<AutomationNodeConfigDetailResp>()
const visible = ref(false)

let description = [{ paramsName: '', paramsValue: '' }]
let active = [{ paramsName: '', paramsValue: '' }]

// 查询详情
const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data

  const descriptionData = Array.isArray(data.description)
    ? data.description
    : [data.description]
  description = descriptionData.flatMap((item: any) => [
    { paramsName: '名称', paramsValue: item?.name },
    { paramsName: '类型', paramsValue: item?.systemType, paramsType: server_type.value },
    { paramsName: '用户名', paramsValue: item?.userName },
    { paramsName: '密码', paramsValue: item?.passWord },
    { paramsName: '凭据', paramsValue: data?.description?.credentialsId },
    { paramsName: '地址', paramsValue: data?.url },
  ])

  const activeData = Array.isArray(data.active) ? data.active : [data.active]
  const currentExecutableData = Array.isArray(data.active?.idle?.currentExecutable)
    ? data.active.idle.currentExecutable
    : [data.active?.idle?.currentExecutable]

  const currentExecutable = currentExecutableData.flatMap((item: any) => [
    { paramsName: '使用者名称', paramsValue: item?.user ?? '' },
    { paramsName: '使用者地址', paramsValue: data?.url ?? '' },
  ])

  active = activeData.flatMap((item: any) => [
    { paramsName: '在线状态', paramsValue: item.offline?.status ?? '' },
    ...(item.offline?.status === 6
      ? [{ paramsName: '离线原因', paramsValue: item?.offline?.offlineCauseReason ?? '' }]
      : []
    ),
    { paramsName: '使用状态', paramsValue: item.offline.status === 6 ? item?.offline?.status : item?.idle?.status },
    ...(item.idle?.status === 8
      ? [{ paramsName: '使用者信息', paramsValue: currentExecutable }]
      : []
    ),
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
