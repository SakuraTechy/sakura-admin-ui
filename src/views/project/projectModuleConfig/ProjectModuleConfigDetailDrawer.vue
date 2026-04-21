<template>
  <a-drawer v-model:visible="visible" title="项目管理-模块配置详情" :width="width >= 800 ? 800 : '100%'" :footer="false">
    <a-descriptions :column="2" size="large" class="general-description">
      <a-descriptions-item label="模块ID">{{ dataDetail?.id }}</a-descriptions-item>
      <a-descriptions-item label="所属项目">
        <GiCellTags :data="[props.projectList?.find((item) => item.value === dataDetail?.projectId)?.label ?? '']" />
      </a-descriptions-item>
      <a-descriptions-item label="所属版本">
        <GiCellTags :data="[dataDetail?.versionName ?? '']" />
      </a-descriptions-item>
      <a-descriptions-item label="所属模块">
        <GiCellTags :data="[dataDetail?.parentId === 0 ? '全部模块' : dataDetail?.parentName ?? '']" />
      </a-descriptions-item>
      <a-descriptions-item label="模块名称">{{ dataDetail?.name }}</a-descriptions-item>
      <a-descriptions-item label="模块描述">{{ dataDetail?.description }}</a-descriptions-item>
      <a-descriptions-item label="模块排序">{{ dataDetail?.sort }}</a-descriptions-item>
      <!-- <a-descriptions-item label="模块路径">{{ dataDetail?.path }}</a-descriptions-item> -->
      <!-- <a-descriptions-item label="模块下数据总数">{{ dataDetail?.count }}</a-descriptions-item> -->
      <a-descriptions-item label="状态">
        <GiCellTag :value="dataDetail?.status" :dict="status_type" />
      </a-descriptions-item>
      <a-descriptions-item label="创建人">{{ dataDetail?.createUserString }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">{{ dataDetail?.createTime }}</a-descriptions-item>
      <a-descriptions-item label="修改人">{{ dataDetail?.updateUserString }}</a-descriptions-item>
      <a-descriptions-item label="更新时间">{{ dataDetail?.updateTime }}</a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import { type ProjectModuleConfigDetailResp, getProjectModuleConfig as getDetail } from '@/apis/project/projectModuleConfig'
import { useDict } from '@/hooks/app'
import type { LabelValueState } from '@/types/global'

const props = defineProps({
  projectList: {
    type: Array as PropType<LabelValueState[]>,
    default: () => [],
  },
})

const { status_type } = useDict('status_type')

const { width } = useWindowSize()

const dataId = ref('')
const dataDetail = ref<ProjectModuleConfigDetailResp>()
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
