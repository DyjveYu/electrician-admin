<template>
  <div v-if="desktop" class="page-card visit-daily">
    <h2>日访问统计</h2>
    <p>按北京时间统计每日页面访问量（PV）与去重访客数（UV），口径与访问流水一致。</p>
    <el-form :inline="true" @submit.prevent="search">
      <el-form-item label="统计日期">
        <el-date-picker v-model="filters.range" type="daterange" value-format="YYYY-MM-DD"
          range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :clearable="false" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit">查询</el-button>
        <el-button @click="quick(7)">近7天</el-button>
        <el-button @click="quick(30)">近30天</el-button>
        <el-button @click="quick(1)">今天</el-button>
      </el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false">
      <el-button v-if="applied" link type="primary" @click="load">重试</el-button>
    </el-alert>
    <template v-else>
      <el-row :gutter="16" class="summary-row">
        <el-col :xs="24" :sm="12">
          <div class="stat-card">
            <div class="stat-number">{{ applied ? totalUv : '—' }}</div>
            <div class="stat-label">区间 UV（去重访客数）</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12">
          <div class="stat-card">
            <div class="stat-number">{{ applied ? totalPv : '—' }}</div>
            <div class="stat-label">区间 PV（页面访问量）</div>
          </div>
        </el-col>
      </el-row>
      <el-table v-loading="loading" :data="rows" empty-text="当前日期范围内没有访问记录">
        <el-table-column prop="date" label="日期" width="150" />
        <el-table-column prop="uv" label="UV（去重访客）" width="160" />
        <el-table-column prop="pv" label="PV（页面访问）" />
      </el-table>
    </template>
  </div>
  <div v-else class="page-card"><el-empty description="请在桌面后台查看日访问统计" /></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import request from '@/utils/request'

const viewport = window.matchMedia('(min-width: 900px)')
const desktop = ref(viewport.matches)
const updateViewport = event => { desktop.value = event.matches }
const dayFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
const beijingDate = ms => dayFmt.format(new Date(ms))
function rangeFor(days) { return [beijingDate(Date.now() - (days - 1) * 86400000), beijingDate(Date.now())] }
function dayList(start, end) {
  const startMs = Date.parse(start + 'T00:00:00+08:00')
  const endMs = Date.parse(end + 'T00:00:00+08:00')
  const list = []
  for (let ms = startMs; ms <= endMs; ms += 86400000) list.push(beijingDate(ms))
  return list
}

const filters = reactive({ range: rangeFor(7) })
const applied = ref(null)
const rows = ref([])
const totalPv = ref(0)
const totalUv = ref(0)
const loading = ref(false)
const error = ref('')
let generation = 0

async function load() {
  if (!desktop.value || !applied.value) return
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    const { data } = await request.get('/admin/visit-daily', { params: applied.value })
    if (current !== generation) return
    const byDate = Object.fromEntries((data.days || []).map(row => [row.date, row]))
    rows.value = dayList(applied.value.start, applied.value.end).map(date => ({
      date, uv: byDate[date]?.uv ?? 0, pv: byDate[date]?.pv ?? 0
    }))
    totalPv.value = data.totalPv
    totalUv.value = data.totalUv
  } catch (_) {
    if (current === generation) error.value = '日访问统计加载失败，请重试'
  } finally {
    if (current === generation) loading.value = false
  }
}

function search() {
  const [start, end] = filters.range || []
  if (!start || !end || start > end) {
    generation += 1
    loading.value = false
    applied.value = null
    error.value = '请选择有效的统计日期范围'
    return
  }
  applied.value = { start, end }
  load()
}

function quick(days) {
  filters.range = rangeFor(days)
  search()
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
.visit-daily h2 { margin-top: 0; }
.visit-daily p { margin-bottom: 20px; color: var(--ops-muted); }
.summary-row { margin-bottom: 18px; }
.stat-card { padding: 20px; border-radius: 8px; background: var(--ops-primary-soft); }
.stat-number { font-size: 30px; font-weight: 600; color: var(--ops-primary); }
.stat-label { margin-top: 8px; font-size: 13px; color: var(--ops-muted); }
</style>
