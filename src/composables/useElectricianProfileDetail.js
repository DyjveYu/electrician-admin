import { ref, watch, nextTick, onUnmounted } from 'vue'

// 桌面与手机复用展示后确认；请求由各入口自己的鉴权模块提供。
export function useElectricianProfileDetail(api, onViewed = () => {}) {
  const visible = ref(false), detail = ref(null), loading = ref(false), error = ref('')
  const readError = ref(false), reading = ref(false)
  let generation = 0, active = true, currentId = null, currentToken = ''
  const token = () => localStorage.getItem('admin_token') || ''
  const current = (request, auth) => active && visible.value && request === generation && auth === token()

  async function confirmViewed() {
    const snapshot = detail.value, request = generation, auth = currentToken
    if (!current(request, auth) || !snapshot?.profileNoticePending || reading.value) return
    reading.value = true
    try {
      const response = await api.markElectricianProfileViewed(snapshot.id, snapshot.profileNoticeVersion)
      if (response.code !== 200) throw new Error('查看确认失败')
      window.dispatchEvent(new Event('electrician-profile-viewed'))
      if (current(request, auth) && detail.value === snapshot) {
        // 服务端可能已有更新版本；此处只确认已展示快照，最新提醒由重新查询保留。
        snapshot.profileNoticePending = false
        readError.value = false
        await onViewed()
      }
    } catch {
      if (current(request, auth) && detail.value === snapshot) readError.value = true
    } finally { if (current(request, auth)) reading.value = false }
  }
  async function load(id) {
    const request = ++generation, auth = token()
    currentId = id; currentToken = auth
    visible.value = true; detail.value = null; loading.value = true
    error.value = ''; readError.value = false; reading.value = false
    try {
      const response = await api.getElectricianDetail(id)
      if (!current(request, auth)) return
      if (response.code !== 200 || !response.data || Number(response.data.id) !== Number(id)) throw new Error('详情读取失败')
      detail.value = response.data
      loading.value = false
      await nextTick()
      if (current(request, auth)) await confirmViewed()
    } catch {
      if (current(request, auth)) error.value = '电工详情读取失败，请重新加载'
    } finally { if (current(request, auth)) loading.value = false }
  }
  const reload = () => visible.value && currentId ? load(currentId) : Promise.resolve()
  watch(visible, value => { if (!value) { generation++; detail.value = null; loading.value = false; reading.value = false } }, { flush: 'sync' })
  onUnmounted(() => { active = false; generation++ })
  return { visible, detail, loading, error, readError, reading, load, reload, confirmViewed }
}
