import { onUnmounted, reactive } from 'vue'

// 独立展示模块的读取状态；迟到响应与离开页面后不更新界面。
export function useReadTask() {
  const state = reactive({ loading: true, loaded: false, error: '' })
  let generation = 0, active = true
  async function run(read, apply) {
    const current = ++generation
    state.loading = true
    state.error = ''
    try {
      const response = await read()
      if (!active || current !== generation) return false
      apply(response.data)
      state.loaded = true
      return true
    } catch {
      if (active && current === generation) state.error = state.loaded ? '刷新失败，当前显示上次加载的数据' : '数据加载失败，请重新加载'
      return false
    } finally {
      if (active && current === generation) state.loading = false
    }
  }
  onUnmounted(() => { active = false; generation++ })
  return { state, run }
}
