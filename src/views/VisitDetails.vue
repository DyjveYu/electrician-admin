<template>
  <div v-if="desktop" class="page-card visit-details">
    <h2>访问明细</h2>
    <p>访问时间按北京时间显示，省市为 IP 归属地。</p>
    <el-form :inline="true" @submit.prevent="search">
      <el-form-item label="访问时间">
        <el-date-picker v-model="filters.range" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss"
          range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" :clearable="false" />
      </el-form-item>
      <el-form-item label="登录状态">
        <el-select v-model="filters.status" style="width: 120px">
          <el-option label="全部" value="all" />
          <el-option label="访客" value="visitor" />
          <el-option label="已登录" value="login" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit">查询</el-button>
        <el-button @click="reset">今天</el-button>
      </el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false">
      <el-button v-if="applied" link type="primary" @click="load">重试</el-button>
    </el-alert>
    <el-table v-else v-loading="loading" :data="rows" empty-text="当前筛选范围内没有访问记录">
      <el-table-column label="访问时间" min-width="180">
        <template #default="{ row }">{{ formatTime(row.received_at) }}</template>
      </el-table-column>
      <el-table-column prop="route" label="页面" min-width="245" show-overflow-tooltip />
      <el-table-column label="访问身份" width="108">
        <template #default="{ row }">{{ roleLabel[row.role] }}</template>
      </el-table-column>
      <el-table-column prop="masked_phone" label="手机号" width="135">
        <template #default="{ row }">{{ row.masked_phone || '—' }}</template>
      </el-table-column>
      <el-table-column label="省" min-width="105">
        <template #default="{ row }">{{ row.province || '未知' }}</template>
      </el-table-column>
      <el-table-column label="市" min-width="105">
        <template #default="{ row }">{{ row.city || '未知' }}</template>
      </el-table-column>
    </el-table>
    <el-pagination v-if="!error" class="visit-pagination" :current-page="page" :page-size="20"
      :total="total" :disabled="loading" layout="total, prev, pager, next" @current-change="changePage" />
  </div>
  <div v-else class="page-card"><el-empty description="请在桌面后台查看访问明细" /></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import request from '@/utils/request'

const viewport = window.matchMedia('(min-width: 900px)')
const desktop = ref(viewport.matches)
const updateViewport = event => { desktop.value = event.matches }
const dateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric',
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
const formatTime = date => dateFormat.format(new Date(date))
function today() {
  const now = Date.now()
  return [`${formatTime(now).slice(0, 10)} 00:00:00`,
    `${formatTime(now + 86400000).slice(0, 10)} 00:00:00`]
}
const filters = reactive({ range: today(), status: 'all' })
const roleLabel = { visitor: '访客', user: '个人', enterprise: '企业', electrician: '电工' }
const applied = ref(null)
const rows = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref('')
let generation = 0
async function load() {
  if (!desktop.value || !applied.value) return
  const current = ++generation
  loading.value = true
  error.value = ''
  rows.value = []
  try {
    const { data } = await request.get('/admin/visit-events', { params: { ...applied.value, page: page.value, size: 20 } })
    if (current !== generation) return
    rows.value = data.rows
    total.value = data.total
  } catch (_) {
    if (current === generation) error.value = '访问明细加载失败，请重试'
  } finally {
    if (current === generation) loading.value = false
  }
}
function search() {
  const [start, end] = filters.range || []
  if (!start || !end || start >= end) {
    generation += 1
    loading.value = false
    applied.value = null
    error.value = '请选择有效的访问时间范围'
    return
  }
  applied.value = { start, end, status: filters.status }
  page.value = 1
  load()
}
function reset() {
  filters.range = today()
  filters.status = 'all'
  search()
}
function changePage(value) {
  page.value = value
  load()
}
onMounted(() => {
  viewport.addEventListener('change', updateViewport)
  if (desktop.value) search()
})
watch(desktop, value => {
  if (value) search()
  else { generation += 1; loading.value = false }
})
onBeforeUnmount(() => { generation += 1; viewport.removeEventListener('change', updateViewport) })
</script>

<style scoped>
.visit-details h2 { margin-top: 0; }
.visit-details p { margin-bottom: 20px; color: var(--el-text-color-secondary); }
.visit-pagination { margin-top: 18px; justify-content: flex-end; }
</style>
