<template>
  <div class="non-five-star-orders-page">
    <div class="page-card">
      <!-- 页面标题和操作栏 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>非五星订单</h2>
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索工单号或描述"
            style="width: 300px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="searchForm.status"
            placeholder="订单状态"
            style="width: 180px"
            clearable
            @change="handleSearch"
          >
            <el-option label="待二次评价" value="pending_second_review" />
            <el-option label="已完成未结算" value="completed_unsettle" />
          </el-select>

          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>

          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="8">
          <div class="stat-card">
            <div class="stat-number">{{ orderStats.total }}</div>
            <div class="stat-label">非五星订单总数</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card warning">
            <div class="stat-number">{{ orderStats.pendingSecondReview }}</div>
            <div class="stat-label">待二次评价</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card danger">
            <div class="stat-number">{{ orderStats.completedUnsettle }}</div>
            <div class="stat-label">已完成未结算</div>
          </div>
        </el-col>
      </el-row>

      <!-- 订单列表表格 -->
      <el-table
        v-loading="loading"
        :data="orderList"
        style="width: 100%"
      >
        <el-table-column prop="order_no" label="工单号" width="150" />

        <el-table-column prop="user_phone" label="用户账号" width="130">
          <template #default="{ row }">
            <span>{{ row.user?.phone || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="electrician_phone" label="电工账号" width="130">
          <template #default="{ row }">
            <span>{{ row.electrician?.phone || '未分配' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="rating" label="评价星级" width="100">
          <template #default="{ row }">
            <el-rate v-if="row.Review" v-model="row.Review.rating" disabled text-color="#ff9900" />
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="服务描述" width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.description || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="service_address" label="服务地址" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.service_address || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="final_amount" label="订单金额" width="100">
          <template #default="{ row }">
            <span>¥{{ row.final_amount || 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="review" label="评价内容" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.Review?.content || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 订单详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="订单详情"
      width="900px"
    >
      <div v-if="currentOrder" class="order-detail">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-descriptions title="基本信息" :column="1" border>
              <el-descriptions-item label="工单号">{{ currentOrder.order_no }}</el-descriptions-item>
              <el-descriptions-item label="服务类型">{{ currentOrder.serviceType?.name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="问题描述">{{ currentOrder.description }}</el-descriptions-item>
              <el-descriptions-item label="服务地址">{{ currentOrder.service_address }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ currentOrder.contact_name }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ currentOrder.contact_phone }}</el-descriptions-item>
            </el-descriptions>
          </el-col>

          <el-col :span="12">
            <el-descriptions title="状态与费用" :column="1" border>
              <el-descriptions-item label="当前状态">
                <el-tag :type="getStatusTagType(currentOrder.status)">
                  {{ getStatusText(currentOrder.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="用户">{{ currentOrder.user?.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="电工">{{ currentOrder.electrician?.phone || '未分配' }}</el-descriptions-item>
              <el-descriptions-item label="订单金额">
                <span>¥{{ currentOrder.final_amount || 0 }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDateTime(currentOrder.created_at) }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">
                {{ currentOrder.completed_at ? formatDateTime(currentOrder.completed_at) : '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>

        <!-- 评价信息 -->
        <div v-if="currentOrder.Review" class="review-section">
          <h4>用户评价</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="评分">
              <el-rate v-model="currentOrder.Review.rating" disabled text-color="#ff9900" />
            </el-descriptions-item>
            <el-descriptions-item label="评价内容">{{ currentOrder.Review.content || '无' }}</el-descriptions-item>
            <el-descriptions-item label="评价时间">{{ formatDateTime(currentOrder.Review.created_at) }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getNonFiveStarOrders } from '@/api/orders'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const orderList = ref([])
const detailDialogVisible = ref(false)
const currentOrder = ref(null)

const searchForm = reactive({
  keyword: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const orderStats = reactive({
  total: 0,
  pendingSecondReview: 0,
  completedUnsettle: 0
})

const getStatusTagType = (status) => {
  const typeMap = {
    'pending_second_review': 'warning',
    'completed_unsettle': 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'pending_second_review': '待二次评价',
    'completed_unsettle': '已完成未结算'
  }
  return textMap[status] || '未知'
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

const loadOrderList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.keyword
    }

    if (searchForm.status) {
      params.status = searchForm.status
    }

    const response = await getNonFiveStarOrders(params)
    if (response.code === 200) {
      orderList.value = response.data.orders || []
      pagination.total = response.data.total || 0
      if (response.data.stats) {
        Object.assign(orderStats, response.data.stats)
      }
    } else {
      ElMessage.error(response.message || '加载失败')
      orderList.value = []
    }
  } catch (error) {
    console.error('加载非五星订单列表失败:', error)
    ElMessage.error('加载非五星订单列表失败')
    orderList.value = []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadOrderList()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: ''
  })
  handleSearch()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadOrderList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadOrderList()
}

const handleViewDetail = (order) => {
  currentOrder.value = order
  detailDialogVisible.value = true
}

onMounted(() => {
  loadOrderList()
})
</script>

<style scoped>
.non-five-star-orders-page {
  padding: 0;
}

.table-toolbar {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.table-toolbar .left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.table-toolbar .left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  transition: box-shadow 0.3s;
}

.stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-card.warning {
  border-color: #e6a23c;
}

.stat-card.warning .stat-number {
  color: #e6a23c;
}

.stat-card.danger {
  border-color: #f56c6c;
}

.stat-card.danger .stat-number {
  color: #f56c6c;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.order-detail {
  padding: 16px 0;
}

.review-section {
  margin-top: 24px;
}

.review-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}
</style>
