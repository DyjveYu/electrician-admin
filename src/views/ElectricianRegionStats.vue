<template>
  <div>
    <div class="stats-header">
      <h2>统计概览</h2>
      <el-button type="primary" @click="loadStats">刷新</el-button>
    </div>

    <div v-if="loading" role="status">正在加载统计数据…</div>
    <div v-else-if="failed" class="stats-error">
      <el-alert title="加载地区统计失败" type="error" :closable="false" show-icon />
      <el-button @click="loadStats">重试</el-button>
    </div>
    <template v-else-if="stats">
      <el-row :gutter="24">
        <el-col v-for="metric in metrics" :key="metric.label" :xs="24" :sm="12" :lg="6">
          <div class="stat-card">
            <div class="stat-icon" :class="metric.color">
              <el-icon><component :is="metric.icon" /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ metric.value }}</div>
              <div class="stat-label">{{ metric.label }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
      <el-card>
        <template #header>地区分布</template>
        <el-empty v-if="stats.total === 0" description="暂无认证通过的电工" />
        <v-chart v-else class="region-chart" :option="chartOption" autoresize />
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Tools, User, Money, Postcard } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { AriaComponent, DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { getElectricianRegionStats } from '@/api/electricians'

use([BarChart, CanvasRenderer, AriaComponent, DataZoomComponent, GridComponent, TooltipComponent])

const loading = ref(true)
const failed = ref(false)
const stats = ref(null)
let latestRequest = 0

const regionRows = computed(() => {
  if (!stats.value) return []
  const { provinces, unclassifiedCount } = stats.value
  if (unclassifiedCount === 0) return provinces
  return [...provinces, { code: 'unclassified', name: '未归类', count: unclassifiedCount }]
})

const formatMoney = value => '¥' + Number(value).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const metrics = computed(() => [
  { label: '已认证电工数', value: stats.value.total, icon: Tools, color: 'certified' },
  { label: '已注册未认证电工数', value: stats.value.uncertifiedCount, icon: User, color: 'uncertified' },
  { label: '电工已缴纳押金合计', value: formatMoney(stats.value.totalDepositsPaid), icon: Money, color: 'paid' },
  { label: '电工已退押金合计', value: formatMoney(stats.value.totalDepositsRefunded), icon: Postcard, color: 'refunded' }
])

const chartOption = computed(() => ({
  aria: { enabled: true },
  color: ['#409eff'],
  tooltip: { trigger: 'axis', renderMode: 'richText', axisPointer: { type: 'shadow' } },
  grid: { left: 20, right: 35, top: 45, bottom: 65, containLabel: true },
  xAxis: {
    type: 'category',
    name: '区域',
    data: regionRows.value.map(row => row.name),
    axisLabel: { interval: 0, rotate: 35 }
  },
  yAxis: { type: 'value', name: '数量', min: 0, minInterval: 1 },
  dataZoom: [{
    type: 'slider',
    show: regionRows.value.length > 12,
    start: 0,
    end: Math.min(100, 1200 / regionRows.value.length),
    bottom: 5
  }],
  series: [{
    name: '已认证电工数',
    type: 'bar',
    barMaxWidth: 48,
    label: { show: true, position: 'top' },
    data: regionRows.value.map(row => row.count)
  }]
}))

async function loadStats() {
  const requestId = ++latestRequest
  loading.value = true
  failed.value = false

  try {
    const { data } = await getElectricianRegionStats()
    if (requestId === latestRequest) stats.value = data
  } catch {
    if (requestId === latestRequest) failed.value = true
  } finally {
    if (requestId === latestRequest) loading.value = false
  }
}

onMounted(loadStats)
onUnmounted(() => { latestRequest += 1 })
</script>

<style scoped>
.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.stats-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 120px;
  padding: 20px;
  box-sizing: border-box;
  margin-bottom: 24px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 24px;
}

.certified {
  color: #67c23a;
  background: #f0f9eb;
}

.uncertified {
  color: #409eff;
  background: #ecf5ff;
}

.paid {
  color: #e6a23c;
  background: #fdf6ec;
}

.refunded {
  color: #909399;
  background: #f4f4f5;
}

.stat-content {
  min-width: 0;
}

.stat-number {
  overflow-wrap: anywhere;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  margin-top: 6px;
  font-size: 14px;
  color: #909399;
}

.region-chart {
  height: 480px;
}

.stats-error .el-button {
  margin-top: 12px;
}
</style>
