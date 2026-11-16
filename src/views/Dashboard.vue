<template>
  <div class="dashboard">
    <header class="page-heading"><div><h2>仪表盘</h2><p>平台业务、财务与运营动态</p></div><el-button :loading="refreshing" @click="refreshData"><el-icon><Refresh /></el-icon>刷新数据</el-button></header>
    <LoadFeedback :message="statistics.state.error" :loading="statistics.state.loading" @retry="loadStatistics" />
    <div v-if="statistics.state.loading && !statistics.state.loaded" class="dashboard-loading" role="status"><el-skeleton :rows="4" animated /></div>
    <template v-if="statistics.state.loaded">
      <section v-for="group in metricGroups" :key="group.title" class="metric-section">
        <h3>{{ group.title }}</h3>
        <div class="metric-grid" :class="{ 'finance-grid': group.title === '财务概况' }">
          <div v-for="metric in group.items" :key="metric.key" class="metric-card">
            <div class="metric-label">{{ metric.label }}<el-icon class="metric-icon"><component :is="metric.icon" /></el-icon></div>
            <div class="metric-value" :class="{ 'money-value': metric.money }">{{ metric.money ? '¥' + formatNumber(stats[metric.key]) : stats[metric.key] }}</div>
          </div>
        </div>
      </section>
    </template>
    <section class="chart-section">
      <div class="section-header"><h3>工单分析</h3><span>最近 7 天趋势与当前状态分布</span></div>
      <LoadFeedback :message="charts.state.error" :loading="charts.state.loading" @retry="loadChartData" />
      <div v-if="charts.state.loading && !charts.state.loaded" class="read-loading" role="status">正在加载图表…</div>
      <div v-show="charts.state.loaded" class="charts-grid">
        <div class="chart-card"><h3>工单趋势</h3><el-empty v-if="!chartData.orderTrend.length" description="暂无工单趋势数据" /><div v-show="chartData.orderTrend.length" ref="orderTrendChart" class="chart-container"></div></div>
        <div class="chart-card"><h3>工单状态分布</h3><el-empty v-if="!chartData.orderStatusDistribution.length" description="暂无工单状态数据" /><div v-show="chartData.orderStatusDistribution.length" ref="orderStatusChart" class="chart-container"></div></div>
      </div>
    </section>
    <section class="recent-activity">
      <div class="section-header"><h3>最近活动</h3><span>最近 10 条平台动态</span></div>
      <LoadFeedback :message="activities.state.error" :loading="activities.state.loading" @retry="loadRecentActivities" />
      <el-table :data="recentActivities" v-loading="activities.state.loading" :empty-text="activities.state.error ? '读取失败，请重新加载' : '暂无最近活动'">
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column prop="type" label="类型" width="150"><template #default="{ row }"><el-tag :type="getActivityTagType(row.type)">{{ row.type }}</el-tag></template></el-table-column>
        <el-table-column prop="description" label="描述" min-width="240" show-overflow-tooltip />
        <el-table-column prop="user" label="用户" width="120" />
      </el-table>
    </section>
  </div>
</template>
<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { User, Tools, Document, Money, Coin, TrendCharts, RefreshLeft, Postcard } from '@element-plus/icons-vue'
import { getStatistics, getRecentActivities, getDashboardChartData } from '@/api/orders'
import LoadFeedback from '@/components/LoadFeedback.vue'
import { useReadTask } from '@/composables/useReadTask'
import * as echarts from 'echarts'

const statistics = useReadTask(), charts = useReadTask(), activities = useReadTask()
const refreshing = computed(() => statistics.state.loading || charts.state.loading || activities.state.loading)
const stats = reactive({})
const chartData = reactive({ orderTrend: [], orderStatusDistribution: [] })
const orderTrendChart = ref(), orderStatusChart = ref(), recentActivities = ref([])
const metricGroups = [
  { title: '业务概况', items: [
    { key: 'totalUsers', label: '总用户数', icon: User }, { key: 'pendingElectricians', label: '待审核电工', icon: Tools },
    { key: 'approvedElectricians', label: '已认证电工', icon: Tools }, { key: 'totalOrders', label: '总工单数', icon: Document }
  ] },
  { title: '财务概况', items: [
    { key: 'totalPaymentIncome', label: '用户支付总收入', icon: Money, money: true },
    { key: 'electricianShare', label: '电工分成总金额（85%）', icon: Coin, money: true },
    { key: 'platformRevenue', label: '平台运营净收益（15%-佣金）', icon: TrendCharts, money: true },
    { key: 'commissionExpense', label: '佣金支出（3%）', icon: Coin, money: true },
    { key: 'totalRefunds', label: '用户退款总金额', icon: RefreshLeft, money: true }
  ] },
  { title: '电工押金', items: [
    { key: 'totalDepositsPaid', label: '电工已缴押金合计', icon: Money, money: true },
    { key: 'totalDepositsRefunded', label: '电工已退押金合计', icon: Postcard, money: true }
  ] }
]
const formatNumber = num => Number(num || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const getActivityTagType = type => ({ '新用户注册': 'success', '电工认证': 'warning', '电工认证通过': 'success', '电工认证驳回': 'danger', '新工单': 'primary', '工单完成': 'success', '工单取消': 'info', '押金缴纳': 'warning', '押金退款': 'info', '支付成功': 'success', '系统通知': 'info' }[type] || 'info')
const loadStatistics = () => statistics.run(getStatistics, data => Object.assign(stats, {
  totalUsers: data.users?.total_users || 0, pendingElectricians: data.users?.pending_electricians || 0,
  approvedElectricians: data.users?.approved_electricians || 0, totalOrders: data.orders?.total || 0,
  totalPaymentIncome: data.finance?.total_payment_income || 0, electricianShare: data.finance?.electrician_share || 0,
  platformRevenue: data.finance?.platform_revenue || 0, commissionExpense: data.finance?.commission_expense || 0,
  totalRefunds: data.finance?.total_refunds || 0, totalDepositsPaid: data.finance?.total_deposits_paid || 0,
  totalDepositsRefunded: data.finance?.total_deposits_refunded || 0
}))
const loadRecentActivities = () => activities.run(() => getRecentActivities({ limit: 10 }), data => {
  recentActivities.value = data.map(item => ({ ...item, time: item.time ? new Date(item.time).toLocaleString('zh-CN') : '' }))
})
let trendInstance, statusInstance, observer, active = true
const resizeCharts = () => { trendInstance?.resize(); statusInstance?.resize() }
async function loadChartData() {
  const applied = await charts.run(getDashboardChartData, data => {
    chartData.orderTrend = data.orderTrend || []; chartData.orderStatusDistribution = data.orderStatusDistribution || []
  })
  if (!applied) return
  await nextTick()
  if (!active) return
  if (chartData.orderTrend.length) {
    trendInstance ||= echarts.init(orderTrendChart.value)
    trendInstance.setOption({ animation: false, color: ['#2563eb'], tooltip: { trigger: 'axis' },
      grid: { left: 20, right: 24, top: 24, bottom: 20, containLabel: true },
      xAxis: { type: 'category', data: chartData.orderTrend.map(x => x.date), axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#64748b' } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf1f7' } } },
      series: [{ name: '工单数', type: 'line', smooth: true, symbolSize: 7, areaStyle: { color: '#eff6ff' }, data: chartData.orderTrend.map(x => x.count) }] }, true)
  } else { trendInstance?.dispose(); trendInstance = null }
  if (chartData.orderStatusDistribution.length) {
    statusInstance ||= echarts.init(orderStatusChart.value)
    statusInstance.setOption({ animation: false, color: ['#2563eb', '#15803d', '#b45309', '#64748b', '#b91c1c'], tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll', textStyle: { color: '#64748b' } },
      series: [{ type: 'pie', radius: ['40%', '65%'], center: ['50%', '44%'], label: { show: false }, data: chartData.orderStatusDistribution }] }, true)
  } else { statusInstance?.dispose(); statusInstance = null }
  resizeCharts()
}
const refreshData = () => Promise.all([loadStatistics(), loadRecentActivities(), loadChartData()])
onMounted(() => {
  refreshData()
  observer = new ResizeObserver(resizeCharts)
  observer.observe(orderTrendChart.value); observer.observe(orderStatusChart.value)
})
onUnmounted(() => { active = false; observer?.disconnect(); trendInstance?.dispose(); statusInstance?.dispose() })
</script>
<style scoped>
.metric-section { margin-bottom: 24px; }
.metric-section > h3 { margin-bottom: 12px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.finance-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.metric-card { border: 1px solid var(--ops-border); border-radius: var(--ops-radius); background: white; padding: 20px; min-width: 0; box-shadow: var(--ops-shadow); }
.metric-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--ops-muted); font-size: 13px; margin-bottom: 12px; }
.metric-icon { color: var(--ops-primary); font-size: 18px; flex-shrink: 0; }
.metric-value { color: var(--ops-text); font-weight: 600; font-size: 32px; font-variant-numeric: tabular-nums; line-height: 1.35; overflow-wrap: anywhere; }
.money-value { font-size: 28px; }
.chart-section { margin-bottom: 24px; }
.section-header { margin-bottom: 12px; }
.section-header span { color: var(--ops-muted); font-size: 13px; }
.charts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.chart-card, .recent-activity, .dashboard-loading { background: white; border: 1px solid var(--ops-border); border-radius: var(--ops-radius); padding: 20px; min-width: 0; }
.chart-container { height: 280px; width: 100%; }
@media (max-width: 1199px) { .metric-grid, .finance-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 767px) { .metric-grid, .finance-grid, .charts-grid { grid-template-columns: minmax(0, 1fr); } .metric-value { font-size: 28px; } }
</style>
