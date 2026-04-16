<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="24" class="stats-row">
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon user-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon electrician-icon">
            <el-icon><Tools /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.pendingElectricians }}</div>
            <div class="stat-label">待审核电工</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon electrician-icon">
            <el-icon><Tools /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.approvedElectricians }}</div>
            <div class="stat-label">已认证电工</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon order-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalOrders }}</div>
            <div class="stat-label">总工单数</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 财务统计卡片 -->
    <el-row :gutter="24" class="stats-row">
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon revenue-icon">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">¥{{ formatNumber(stats.totalPaymentIncome) }}</div>
            <div class="stat-label">用户支付总收入</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon electrician-share-icon">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">¥{{ formatNumber(stats.electricianShare) }}</div>
            <div class="stat-label">电工分成总金额(85%)</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon platform-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">¥{{ formatNumber(stats.platformRevenue) }}</div>
            <div class="stat-label">平台运营净收益(15%)</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon refund-icon">
            <el-icon><RefreshLeft /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">¥{{ formatNumber(stats.totalRefunds) }}</div>
            <div class="stat-label">用户退款总金额</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 押金统计卡片 -->
    <el-row :gutter="24" class="stats-row">
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon deposit-paid-icon">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">¥{{ formatNumber(stats.totalDepositsPaid) }}</div>
            <div class="stat-label">电工已缴押金合计</div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon deposit-refunded-icon">
            <el-icon><Postcard /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">¥{{ formatNumber(stats.totalDepositsRefunded) }}</div>
            <div class="stat-label">电工已退押金合计</div>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 图表区域 -->
    <el-row :gutter="24" class="charts-row">
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <div class="card-header">
            <h3>工单趋势</h3>
          </div>
          <div class="chart-container" ref="orderTrendChart"></div>
        </div>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <div class="card-header">
            <h3>工单状态分布</h3>
          </div>
          <div class="chart-container" ref="orderStatusChart"></div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 最近活动 -->
    <div class="recent-activity">
      <div class="card-header">
        <h3>最近活动</h3>
        <el-button type="text" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
      
      <el-table :data="recentActivities" style="width: 100%">
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getActivityTagType(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="user" label="用户" width="120" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { getStatistics, getRecentActivities } from '@/api/orders'
import * as echarts from 'echarts'

const orderTrendChart = ref()
const orderStatusChart = ref()

const stats = reactive({
  totalUsers: 0,
  pendingElectricians: 0,
  approvedElectricians: 0,
  totalOrders: 0,
  totalPaymentIncome: 0,
  electricianShare: 0,
  platformRevenue: 0,
  totalRefunds: 0,
  totalDepositsPaid: 0,
  totalDepositsRefunded: 0
})

const formatNumber = (num) => {
  if (!num) return '0.00'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const recentActivities = ref([])

const getActivityTagType = (type) => {
  const typeMap = {
    '新用户注册': 'success',
    '电工认证': 'warning',
    '电工认证通过': 'success',
    '电工认证驳回': 'danger',
    '新工单': 'primary',
    '工单完成': 'success',
    '工单取消': 'info',
    '押金缴纳': 'warning',
    '押金退款': 'info',
    '支付成功': 'success',
    '系统通知': 'info'
  }
  return typeMap[type] || 'info'
}

const loadRecentActivities = async () => {
  try {
    const response = await getRecentActivities({ limit: 10 })
    if (response.code === 200) {
      recentActivities.value = response.data.map(item => ({
        ...item,
        time: item.time ? new Date(item.time).toLocaleString('zh-CN') : ''
      }))
    }
  } catch (error) {
    console.error('加载最近活动失败:', error)
  }
}

const initOrderTrendChart = () => {
  const chart = echarts.init(orderTrendChart.value)
  const option = {
    title: {
      text: '最近7天工单趋势',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['1/9', '1/10', '1/11', '1/12', '1/13', '1/14', '1/15']
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: [12, 19, 15, 22, 18, 25, 20],
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#1890ff'
      }
    }]
  }
  chart.setOption(option)
}

const initOrderStatusChart = () => {
  const chart = echarts.init(orderStatusChart.value)
  const option = {
    title: {
      text: '工单状态分布',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: '60%',
      data: [
        { value: 35, name: '待接单' },
        { value: 25, name: '进行中' },
        { value: 20, name: '待支付' },
        { value: 20, name: '已完成' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  chart.setOption(option)
}

const loadStatistics = async () => {
  try {
    const response = await getStatistics()
    if (response.code === 200) {
      // 后端返回结构: { users: { total_users, approved_electricians, pending_electricians }, orders: { total_orders }, revenue: {...}, finance: {...} }
      const data = response.data
      Object.assign(stats, {
        totalUsers: data.users?.total_users || 0,
        pendingElectricians: data.users?.pending_electricians || 0,
        approvedElectricians: data.users?.approved_electricians || 0,
        totalOrders: data.orders?.total_orders || 0,
        totalPaymentIncome: data.finance?.total_payment_income || 0,
        electricianShare: data.finance?.electrician_share || 0,
        platformRevenue: data.finance?.platform_revenue || 0,
        totalRefunds: data.finance?.total_refunds || 0,
        totalDepositsPaid: data.finance?.total_deposits_paid || 0,
        totalDepositsRefunded: data.finance?.total_deposits_refunded || 0
      })
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    // 使用模拟数据
    Object.assign(stats, {
      totalUsers: 0,
      pendingElectricians: 0,
      approvedElectricians: 0,
      totalOrders: 0,
      totalPaymentIncome: 0,
      electricianShare: 0,
      platformRevenue: 0,
      totalRefunds: 0,
      totalDepositsPaid: 0,
      totalDepositsRefunded: 0
    })
  }
}

const refreshData = () => {
  loadStatistics()
  loadRecentActivities()
}

onMounted(async () => {
  await loadStatistics()
  await loadRecentActivities()
  await nextTick()
  initOrderTrendChart()
  initOrderStatusChart()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02);
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
}

.user-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.electrician-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.order-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.revenue-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.electrician-share-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.platform-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.refund-icon {
  background: linear-gradient(135deg, #ff6b6b 0%, #ffa07a 100%);
}

.deposit-paid-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.deposit-refunded-icon {
  background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.charts-row {
  margin-bottom: 24px;
}

.chart-card,
.recent-activity {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.chart-container {
  height: 300px;
}

.recent-activity {
  margin-top: 24px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stat-card {
    padding: 16px;
    height: 80px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .chart-container {
    height: 250px;
  }
}
</style>