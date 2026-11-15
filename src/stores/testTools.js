import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { getTestToolsCapabilities } from '@/api/testTools'
export const useTestToolsStore = defineStore('testTools', () => {
  const auth = useAuthStore(), wechatIdEditEnabled = ref(false)
  let generation = 0
  watch(() => auth.token, () => { generation++; wechatIdEditEnabled.value = false }, { flush: 'sync' })
  async function refresh() {
    const request = ++generation, token = auth.token
    if (!token) { wechatIdEditEnabled.value = false; return false }
    try {
      const response = await getTestToolsCapabilities()
      if (request !== generation || token !== auth.token) return false
      wechatIdEditEnabled.value = response.code === 200 && response.data?.wechatIdEditEnabled === true
    } catch {
      if (request === generation) wechatIdEditEnabled.value = false
    }
    return request === generation && token === auth.token && wechatIdEditEnabled.value
  }
  return { wechatIdEditEnabled, refresh }
})
