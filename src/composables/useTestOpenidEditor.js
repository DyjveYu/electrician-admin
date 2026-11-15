import { ref, watch, onUnmounted } from 'vue'
export function useTestOpenidEditor(api, allowed, onSaved) {
  const visible = ref(false), target = ref(null), value = ref(''), error = ref('')
  const loading = ref(false), saving = ref(false), saved = ref(false), refreshError = ref(false)
  let generation = 0, active = true, targetId = null
  const token = () => localStorage.getItem('admin_token') || ''
  const current = (request, auth) => active && visible.value && generation === request && token() === auth && allowed()
  async function load(id, preserve = false) {
    if (!active || !allowed() || saving.value) return
    const request = ++generation, auth = token()
    targetId = id; visible.value = true; loading.value = true; error.value = ''; target.value = null
    saved.value = false; refreshError.value = false
    if (!preserve) value.value = ''
    try {
      const response = await api.getUserDetail(id)
      if (!current(request, auth)) return
      if (response.code !== 200 || Number(response.data?.id) !== Number(id)) throw new Error('读取失败')
      target.value = response.data
      if (!preserve) value.value = response.data.openid ?? ''
    } catch { if (current(request, auth)) error.value = '用户资料读取失败，请重新加载' }
    finally { if (current(request, auth)) loading.value = false }
  }
  const reload = () => targetId !== null ? load(targetId, true) : Promise.resolve()
  async function refresh() {
    const request = generation, auth = token(), user = target.value
    try {
      const okay = await onSaved(user)
      if (!current(request, auth)) return
      refreshError.value = okay === false
      if (!refreshError.value) visible.value = false
    } catch { if (current(request, auth)) refreshError.value = true }
  }
  async function save() {
    if (!visible.value || !allowed() || !target.value || loading.value || saving.value || saved.value) return
    const request = generation, auth = token(), user = target.value
    saving.value = true; error.value = ''
    try {
      const response = await api.updateTestOpenid(user.id, { openid: value.value, expectedOpenid: user.openid ?? null })
      if (!current(request, auth)) return
      if (response.code !== 200 || Number(response.data?.id) !== Number(user.id)) throw new Error('保存未确认')
      user.openid = response.data.openid; saved.value = true
      await refresh()
    } catch (failure) {
      if (current(request, auth)) error.value = failure.response?.data?.message || failure.message || '保存未确认，请重新加载核对或重试'
    } finally { if (active && generation === request) saving.value = false }
  }
  watch(visible, state => { if (!state) { generation++; target.value = null; loading.value = false; saving.value = false } }, { flush: 'sync' })
  onUnmounted(() => { active = false; generation++ })
  return { visible, target, value, error, loading, saving, saved, refreshError, load, reload, save, refresh }
}
