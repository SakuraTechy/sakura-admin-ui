import { ref } from 'vue'
import { listRoleDict } from '@/apis'
import type { LabelValueState } from '@/types/global'
import { listUserDict } from '@/apis/common/common'
/** 角色模块 */
export function useRole(options?: { onSuccess?: () => void }) {
  const loading = ref(false)
  const roleList = ref<LabelValueState[]>([])
  const userList = ref<LabelValueState[]>([])
  const getRoleList = async () => {
    try {
      loading.value = true
      const res = await listRoleDict()
      roleList.value = res.data
      options?.onSuccess && options.onSuccess()
    } finally {
      loading.value = false
    }
  }

  const getUserList = async () => {
    try {
      loading.value = true
      const res = await listUserDict()
      userList.value = res.data
      options?.onSuccess && options.onSuccess()
    } finally {
      loading.value = false
    }
  }
  return { roleList, getRoleList, userList, getUserList, loading }
}
