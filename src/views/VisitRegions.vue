<template>
  <div v-if="desktop" class="page-card visit-regions">
    <h2>地域分析</h2>
    <p>按访问流水 IP 归属省市统计页面访问量（PV）与去重访客数（UV）；地域 UV 按地区去重，同一浏览者跨地区会分别计入。</p>
    <el-form :inline="true" @submit.prevent="search">
      <el-form-item label="统计日期">
        <el-date-picker v-model="filters.range" type="daterange" value-format="YYYY-MM-DD"
          range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :clearable="false" />
      </el-form-item>
      <el-form-item label="维度">
        <el-radio-group v-model="filters.level" @change="changeLevel">
          <el-radio-button label="province">按省</el-radio-button>
          <el-radio-button label="city">按市</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="filters.level === 'city'" label="省份">
        <el-select v-model="filters.province" placeholder="选择省份" style="width: 160px" @change="changeProvince">
          <el-option v-for="name in provinceOptions" :key="name" :label="name" :value="name" />
        </el-select>
      </el-form-item>
      <el-form-item label="指标">
        <el-radio-group v-model="metric">
          <el-radio-button label="pv">PV</el-radio-button>
          <el-radio-button label="uv">UV</el-radio-button>
        </el-radio-group>
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
            <div class="stat-number">{{ applied ? totalPv : '—' }}</div>
            <div class="stat-label">总 PV（页面访问量）</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12">
          <div class="stat-card">
            <div class="stat-number">{{ applied ? totalUv : '—' }}</div>
            <div class="stat-label">总 UV（去重访客）</div>
          </div>
        </el-col>
      </el-row>
      <el-card>
        <template #header>{{ filters.level === 'province' ? '省级分布' : (filters.province || '城市分布') }}</template>
        <el-empty v-if="filters.level === 'city' && !filters.province" description="请先选择省份" />
        <el-empty v-else-if="sortedRegions.length === 0" description="当前筛选范围内没有访问记录" />
        <v-chart v-else class="region-chart" :option="chartOption" autoresize />
      </el-card>
      <el-table v-loading="loading" :data="sortedRegions" empty-text="当前筛选范围内没有访问记录" class="region-table">
        <el-table-column prop="name" label="地域" min-width="140" />
        <el-table-column prop="pv" label="PV" width="130" />
        <el-table-column prop="uv" label="UV" width="130" />
      </el-table>
    </template>
  </div>
  <div v-else class="page-card"><el-empty description="请在桌面后台查看地域分析" /></div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import request from '@/utils/request'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'

use([BarChart, CanvasRenderer, AriaComponent, GridComponent, TooltipComponent])

const viewport = window.matchMedia('(min-width: 900px)')
const desktop = ref(viewport.matches)
const updateViewport = event => { desktop.value = event.matches }
const dayFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
const beijingDate = ms => dayFmt.format(new Date(ms))
function rangeFor(days) { return [beijingDate(Date.now() - (days - 1) * 86400000), beijingDate(Date.now())] }

const filters = reactive({ range: rangeFor(7), level: 'province', province: '' })
const metric = ref('pv')
const applied = ref(null)
const regions = ref([])
const totalPv = ref(0)
const totalUv = ref(0)
const provinceOptions = ref([])
const loading = ref(false)
const error = ref('')
let generation = 0

const sortedRegions = computed(() => [...regions.value].sort((a, b) => (b[metric.value] ?? 0) - (a[metric.value] ?? 0)))

const chartOption = computed(() => {
  const top = sortedRegions.value.slice(0, 15).reverse()
  return {
    aria: { enabled: true },
    color: ['#2563eb'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 20, right: 45, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'value', name: metric.value === 'pv' ? 'PV' : 'UV', min: 0, minInterval: 1 },
    yAxis: { type: 'category', data: top.map(row => row.name), axisLabel: { interval: 0 } },
    series: [{ type: 'bar', barMaxWidth: 28, label: { show: true, position: 'right' }, data: top.map(row => row[metric.value] ?? 0) }]
  }
})

async function load() {
  if (!desktop.value || !applied.value) return
  if (filters.level === 'city' && !filters.province) {
    generation += 1
    loading.value = false
    error.value = ''
    regions.value = []
    totalPv.value = 0
    totalUv.value = 0
    return
  }
  const current = ++generation
  loading.value = true
  error.value = ''
  const params = { ...applied.value, level: filters.level }
  if (filters.level === 'city') params.province = filters.province
  try {
    const { data } = await request.get('/admin/visit-regions', { params })
    if (current !== generation) return
    regions.value = data.regions
    totalPv.value = data.totalPv
    totalUv.value = data.totalUv
    if (filters.level === 'province') provinceOptions.value = data.regions.map(row => row.name).filter(name => name !== '未知')
  } catch (_) {
    if (current === generation) error.value = '地域分析加载失败，请重试'
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

function quick(days) { filters.range = rangeFor(days); search() }
function changeLevel() { filters.province = ''; if (applied.value) load() }
function changeProvince() { if (applied.value) load() }

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
.visit-regions h2 { margin-top: 0; }
.visit-regions p { margin-bottom: 20px; color: var(--ops-muted); }
.summary-row { margin-bottom: 18px; }
.stat-card { padding: 20px; border-radius: 8px; background: var(--ops-primary-soft); }
.stat-number { font-size: 30px; font-weight: 600; color: var(--ops-primary); }
.stat-label { margin-top: 8px; font-size: 13px; color: var(--ops-muted); }
.region-chart { height: 440px; }
.region-table { margin-top: 18px; }
</style>
