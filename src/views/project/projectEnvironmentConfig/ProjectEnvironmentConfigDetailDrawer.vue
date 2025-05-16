<template>
  <a-drawer v-model:visible="visible" title="项目管理-环境配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="环境ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="所属项目">
        <GiCellTags :data="[dataDetail?.projectName ?? '']" />
      </a-descriptions-item>
      <a-descriptions-item label="环境名称">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="环境描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="环境版本配置">
        <GiCellKeyValue :data="versionConfig ?? []" title="环境版本配置" />
      </a-descriptions-item>
      <a-descriptions-item label="环境服务器配置">
        <GiCellKeyValue :data="serverConfig ?? []" title="环境服务器配置" />
      </a-descriptions-item>
      <a-descriptions-item label="环境数据库配置">
        <GiCellKeyValue :data="dataBaseConfig ?? []" title="环境数据库配置" />
      </a-descriptions-item>
      <!-- <a-descriptions-item label="主线版本">{{ dataDetail?.lastVersion }}</a-descriptions-item>
      <a-descriptions-item label="环境域名">{{ dataDetail?.lastDomain }}</a-descriptions-item> -->
      <a-descriptions-item label="状态">
        <GiCellTag :value="dataDetail?.status" :dict="status_type" />
      </a-descriptions-item>
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <!-- <a-descriptions-item label="创建部门">{{ dataDetail?.deptId }}</a-descriptions-item> -->
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
      <!-- <a-descriptions-item label="更新IP">{{ dataDetail?.updateIp }}</a-descriptions-item>
      <a-descriptions-item label="备注">{{ dataDetail?.remark }}</a-descriptions-item>
      <a-descriptions-item label="删除标志（0删除 1存在）">
        <GiCellTag :value="dataDetail?.delFlag" :dict="delete_type" />
      </a-descriptions-item> -->
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type ProjectEnvironmentConfigDetailResp, getProjectEnvironmentConfig as getDetail } from '@/apis/project/projectEnvironmentConfig'
import { useDict } from '@/hooks/app'

const { status_type, delete_type } = useDict('status_type', 'delete_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<ProjectEnvironmentConfigDetailResp>()
const visible = ref(false)

let versionConfig = [{ paramsName: '', paramsValue: '' }]
let serverConfig = [{ paramsName: '', paramsValue: '' }]
let dataBaseConfig = [{ paramsName: '', paramsValue: '' }]
// 查询详情
const getDataDetail = async () => {
  const { data } = await getDetail(dataId.value)
  dataDetail.value = data

  const versionData = Array.isArray(data.versionConfig)
    ? data.versionConfig
    : [data.versionConfig]

  versionConfig = data.versionConfig.flatMap((item: any) => [
    { paramsName: '版本ID', paramsValue: item?.id ?? '' },
    { paramsName: '版本名称', paramsValue: item?.name ?? '' },
    { paramsName: '版本描述', paramsValue: item?.description ?? '' },
    { paramsName: '版本状态', paramsValue: item?.status ?? '' },
  ])
  serverConfig = data.serverConfig.flatMap((item: any) => [
    { paramsName: '服务器ID', paramsValue: item?.id ?? '' },
    { paramsName: '服务器类型', paramsValue: item?.type ?? '' },
    { paramsName: '服务器版本', paramsValue: item?.version ?? '' },
    { paramsName: '服务器IP', paramsValue: item?.ip ?? '' },
    { paramsName: '服务器端口', paramsValue: item?.port ?? '' },
    { paramsName: '服务器用户名', paramsValue: item?.userName },
    { paramsName: '服务器密码', paramsValue: item?.passWord },
    { paramsName: '服务器描述', paramsValue: item?.description ?? '' },
    { paramsName: '服务器参数配置', paramsValue: item?.configList ?? '' },
    { paramsName: '服务器状态', paramsValue: item?.status ?? '' },
  ])
  dataBaseConfig = data.dataBaseConfig.flatMap((item: any) => [
    { paramsName: '数据库ID', paramsValue: item?.id ?? '' },
    { paramsName: '数据库类型', paramsValue: item?.type ?? '' },
    { paramsName: '数据库版本', paramsValue: item?.version ?? '' },
    { paramsName: '数据库驱动', paramsValue: item?.driver ?? '' },
    { paramsName: '数据库IP', paramsValue: item?.ip ?? '' },
    { paramsName: '数据库端口', paramsValue: item?.port ?? '' },
    { paramsName: '数据库/模式', paramsValue: item?.dataBase ?? '' },
    { paramsName: '数据库用户名', paramsValue: item?.userName ?? '' },
    { paramsName: '数据库密码', paramsValue: item?.passWord ?? '' },
    { paramsName: '数据库URL', paramsValue: item?.url ?? '' },
    { paramsName: '数据库描述', paramsValue: item?.description ?? '' },
    { paramsName: '数据库参数配置', paramsValue: item?.configList ?? '' },
    { paramsName: '数据库状态', paramsValue: item?.status ?? '' },
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
