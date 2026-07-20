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

      <template v-if="!loading && partnerInfo">
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
          <el-row :gutter="16" class="stats-grid">
            <el-col :span="6">
              <el-statistic title="区域电工人数" :value="current.totalElectricians" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="当月接单数" :value="current.totalOrders" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="当月总金额" :value="current.totalAmount" prefix="¥" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="当月提成金额" :value="current.totalCommission" prefix="¥" value-style="color: #0F9D58" />
            </el-col>
          </el-row>
          <!-- 第二行：V1.1.2 新增统计 -->
          <el-row :gutter="16" class="stats-grid" style="margin-top: 16px;">
            <el-col :span="8">
              <el-statistic title="无推荐达人订单数" :value="current.noReferrerOrders" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="无推荐达人订单总额" :value="current.noReferrerAmount || 0" prefix="¥" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="实际应付佣金（3%）" :value="current.actualCommission || 0" prefix="¥" value-style="color: #0F9D58" />
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
            <el-table-column prop="workNo" label="工号" width="130" />
            <el-table-column prop="district" label="所属区县" />
          </el-table>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const partnerId = route.params.id

const loading = ref(true)
const months = ref([])
const selectedMonth = ref('')
const partnerInfo = ref(null)
const current = ref(null)
const electricians = ref([])

const loadStats = async (month) => {
  loading.value = true
  try {
    const params = month ? { month } : {}
    const res = await request({ url: `/admin/partners/${partnerId}/stats`, method: 'get', params })
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
    console.error('加载统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.partner-stats-page { height: 100%; }
.page-card { background: #fff; border-radius: 8px; padding: 20px; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.page-header h2 { margin: 0; font-size: 18px; }

.partner-card {
  background: linear-gradient(135deg, #0F9D58, #81C784);
  border-radius: 12px; padding: 24px; margin-bottom: 24px; color: #fff;
}
.partner-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
.partner-rate { font-size: 16px; opacity: 0.9; margin-bottom: 12px; }
.area-label { opacity: 0.8; margin-right: 6px; }

.stats-section { margin-bottom: 24px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h3 { margin: 0; font-size: 16px; }
.stats-grid { margin-top: 16px; }

.electrician-section { }
.electrician-section h3 { font-size: 16px; margin-bottom: 16px; }
</style>
