<template>
  <div class="partner-stats-page">
    <div class="page-card" v-loading="loading">
      <!-- 返回 + 标题 -->
      <div class="page-header">
        <el-button @click="$router.back()" text>
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2>合作伙伴统计</h2>
      </div>

      <LoadFeedback :message="loadError" :loading="loading" @retry="loadStats(selectedMonth)" />
      <el-empty v-if="!loading && !loadError && !partnerInfo" description="暂无合作伙伴资料" />
      <template v-if="partnerInfo">
        <!-- 合作伙伴信息 -->
        <div class="partner-card">
          <div class="partner-name">{{ partnerInfo.name }}</div>
          <div class="partner-rate">提成比例：{{ partnerInfo.commissionRate }}%</div>
          <div class="partner-areas">
            <span class="area-label">负责区域：</span>
            <el-tag v-for="(a, i) in partnerInfo.areas" :key="i" size="small" style="margin: 2px 4px 2px 0">
              {{ a.province }}{{ a.city }}{{ a.district }}
            </el-tag>
          </div>
        </div>

        <!-- 月份选择 + 统计 -->
        <div class="stats-section">
          <div class="section-header">
            <h3>数据统计</h3>
            <el-select v-model="selectedMonth" placeholder="选择月份" style="width: 160px" @change="loadStats" :disabled="months.length === 0">
              <el-option v-for="m in months" :key="m" :label="m" :value="m" />
            </el-select>
          </div>

          <el-empty v-if="!current" description="暂无统计数据" />

          <!-- 第一行：原有统计 -->
          <el-row v-if="current" :gutter="16" class="stats-grid">
            <el-col :xs="24" :sm="12" :lg="6">
              <el-statistic title="区域电工人数" :value="current.totalElectricians" />
            </el-col>
            <el-col :xs="24" :sm="12" :lg="6">
              <el-statistic title="当月接单数" :value="current.totalOrders" />
            </el-col>
            <el-col :xs="24" :sm="12" :lg="6">
              <el-statistic title="当月总金额" :value="current.totalAmount" prefix="¥" />
            </el-col>
            <el-col :xs="24" :sm="12" :lg="6">
              <el-statistic title="当月提成金额" :value="current.totalCommission" prefix="¥" :value-style="{ color: 'var(--ops-success)' }" />
            </el-col>
          </el-row>
          <!-- 第二行：V1.1.2 新增统计 -->
          <el-row v-if="current" :gutter="16" class="stats-grid" style="margin-top: 16px;">
            <el-col :xs="24" :sm="12" :lg="8">
              <el-statistic title="无推荐达人订单数" :value="current.noReferrerOrders" />
            </el-col>
            <el-col :xs="24" :sm="12" :lg="8">
              <el-statistic title="无推荐达人订单总额" :value="current.noReferrerAmount || 0" prefix="¥" />
            </el-col>
            <el-col :xs="24" :sm="12" :lg="8">
              <el-statistic title="实际应付佣金（3%）" :value="current.actualCommission || 0" prefix="¥" :value-style="{ color: 'var(--ops-success)' }" />
            </el-col>
          </el-row>
        </div>

        <!-- 电工列表 -->
        <div class="electrician-section">
          <h3>区域电工列表（{{ electricians.length }}人）</h3>
          <el-empty v-if="electricians.length === 0" description="暂无电工" />
          <el-table v-else :data="electricians" style="width: 100%">
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="phone" label="电话" width="140" />
            <el-table-column show-overflow-tooltip prop="workNo" label="工号" width="130" />
            <el-table-column prop="district" label="所属区县" />
          </el-table>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import LoadFeedback from '@/components/LoadFeedback.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const partnerId = route.params.id

const loading = ref(true), loadError = ref('')
let requestId = 0, active = true
onUnmounted(() => { active = false; requestId++ })
const months = ref([])
const selectedMonth = ref('')
const partnerInfo = ref(null)
const current = ref(null)
const electricians = ref([])

const loadStats = async (month) => {
  const currentRequest = ++requestId
  loading.value = true; loadError.value = ''
  try {
    const params = month ? { month } : {}
    const res = await request({ url: `/admin/partners/${partnerId}/stats`, method: 'get', params })
    if (!active || currentRequest !== requestId) return
    if (res.code === 200) {
      const d = res.data
      partnerInfo.value = d.partnerInfo
      months.value = d.months || []
      current.value = d.current
      electricians.value = d.electricians || []
      if (!month && months.value.length > 0) {
        selectedMonth.value = months.value[0]
      }
    }
  } catch (error) {
    if (active && currentRequest === requestId) loadError.value = partnerInfo.value ? '刷新失败，当前显示上次加载的数据' : '统计加载失败，请重新加载'
  } finally {
    if (active && currentRequest === requestId) loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.page-header { justify-content: flex-start; }
.partner-card { background: var(--ops-primary-soft); border: 1px solid #dbe6fc; border-radius: 10px; padding: 24px; margin-bottom: 24px; }
.partner-name { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
.partner-rate { color: var(--ops-primary); margin-bottom: 12px; }
.area-label { color: var(--ops-muted); margin-right: 8px; }
.stats-section { margin-bottom: 24px; }
.stats-grid { row-gap: 16px; }
.stats-grid :deep(.el-statistic) { padding: 20px; border: 1px solid var(--ops-border); border-radius: 10px; height: 100%; }
.electrician-section h3 { margin-bottom: 16px; }
</style>
