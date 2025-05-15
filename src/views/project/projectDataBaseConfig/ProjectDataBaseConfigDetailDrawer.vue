<template>
  <a-drawer v-model:visible="visible" title="项目管理-数据库配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="数据库ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="所属项目">
        <GiCellTags :data="[dataDetail?.projectName ?? '']" />
      </a-descriptions-item>
      <a-descriptions-item label="数据库类型">
        <GiCellTag :value="dataDetail?.type" :dict="database_type" />
      </a-descriptions-item>
      <a-descriptions-item label="数据库版本">
        <GiCellVersion :version="dataDetail?.version ?? ''" />
      </a-descriptions-item>
      <a-descriptions-item label="数据库驱动">{{ dataDetail?.driver }}</a-descriptions-item>
      <a-descriptions-item label="数据库IP">{{ dataDetail?.ip }}</a-descriptions-item>
      <a-descriptions-item label="数据库端口">{{ dataDetail?.port }}</a-descriptions-item>
      <a-descriptions-item label="数据库/模式">{{ dataDetail?.dataBase }}</a-descriptions-item>
      <a-descriptions-item label="数据库用户名">{{ dataDetail?.userName }}</a-descriptions-item>
      <a-descriptions-item label="数据库密码">
        <GiCellPassword :value="dataDetail?.passWord" />
      </a-descriptions-item>
      <a-descriptions-item label="数据库连接串" :span="2">{{ dataDetail?.url }}</a-descriptions-item>
      <a-descriptions-item label="数据库描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="数据库参数配置">
        <GiCellKeyValue :data="dataDetail?.configList ?? []" title="数据库参数配置" />
      </a-descriptions-item>
      <a-descriptions-item label="状态">
        <GiCellTag :value="dataDetail?.status" :dict="status_type" />
      </a-descriptions-item>
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="修改时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
      <a-descriptions-item label="删除标志（0删除 1存在）">{{ dataDetail?.delFlag }}</a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type ProjectDataBaseConfigDetailResp, getProjectDataBaseConfig as getDetail } from '@/apis/project/projectDataBaseConfig'
import { useDict } from '@/hooks/app'

const { database_type, status_type } = useDict('database_type', 'status_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<ProjectDataBaseConfigDetailResp>()
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
:deep(.gi-cell-key-value) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
</style>
