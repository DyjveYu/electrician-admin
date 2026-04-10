<template>
  <div class="deposits-page">
    <div class="page-card">
      <!-- 页面标题 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>押金管理</h2>
          <el-input
            v-model="filters.search"
            placeholder="搜索电工ID"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
          />
          <el-select
            v-model="filters.status"
            placeholder="状态"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option label="待支付" value="pending" />
            <el-option label="已支付" value="paid" />
            <el-option label="退款中" value="refunding" />
            <el-option label="已退款" value="refunded" />
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

      <!-- 押金列表表格 -->
      <el-table
        v-loading="loading"
        :data="depositList"
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="electricianId" label="电工ID" width="100" />
        <el-table-column label="电工信息" width="180">
          <template #default="{ row }">
            <div>
              <div>手机号：{{ row.electricianPhone || '-' }}</div>
              <div>昵称：{{ row.electricianNickname || '-' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transactionId" label="交易号" width="200">
          <template #default="{ row }">
            <span class="transaction-id">{{ row.transactionId || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="paidAt" label="支付时间" width="180">
          <template #default="{ row }">
            {{ row.paidAt ? formatDate(row.paidAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="viewDetail(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'refunding'"
              type="danger"
              size="small"
              @click="handleRefund(row)"
            >
              处理退款
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

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="押金详情"
      width="500px"
    >
      <el-descriptions v-if="currentDeposit" :column="2" border>
        <el-descriptions-item label="押金ID">{{ currentDeposit.id }}</el-descriptions-item>
        <el-descriptions-item label="电工ID">{{ currentDeposit.electricianId }}</el-descriptions-item>
        <el-descriptions-item label="电工手机">{{ currentDeposit.electricianPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="电工昵称">{{ currentDeposit.electricianNickname || '-' }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ currentDeposit.amount }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(currentDeposit.status)">
            {{ getStatusText(currentDeposit.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="交易单号" :span="2">{{ currentDeposit.transactionId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="商户订单号" :span="2">{{ currentDeposit.outTradeNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ currentDeposit.paidAt ? formatDate(currentDeposit.paidAt) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="退款时间">{{ currentDeposit.refundedAt ? formatDate(currentDeposit.refundedAt) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(currentDeposit.createdAt) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 退款处理对话框 -->
    <el-dialog
      v-model="refundDialogVisible"
      title="处理退款"
      width="400px"
    >
      <el-form :model="refundForm" label-width="80px">
        <el-form-item label="押金ID">{{ currentDeposit?.id }}</el-form-item>
        <el-form-item label="退款金额">¥{{ currentDeposit?.amount }}</el-form-item>
        <el-form-item label="操作">
          <el-radio-group v-model="refundForm.action">
            <el-radio label="approve">批准退款</el-radio>
            <el-radio label="reject">拒绝退款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="refundForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="refundLoading" @click="submitRefund">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getDepositList, getDepositDetail, processRefund } from '@/api/deposits'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const depositList = ref([])
const detailDialogVisible = ref(false)
const refundDialogVisible = ref(false)
const refundLoading = ref(false)
const currentDeposit = ref(null)

const filters = reactive({
  search: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const refundForm = reactive({
  action: 'approve',
  reason: ''
})

const getStatusTagType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'paid': 'success',
    'refunding': 'danger',
    'refunded': 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'pending': '待支付',
    'paid': '已支付',
    'refunding': '退款中',
    'refunded': '已退款'
  }
  return textMap[status] || '未知'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

const loadDeposits = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    }
    if (filters.search) {
      params.electricianId = filters.search
    }

    const response = await getDepositList(params)
    if (response.code === 200) {
      depositList.value = response.data.list || []
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('加载押金列表失败:', error)
    ElMessage.error('加载押金列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadDeposits()
}

const handleReset = () => {
  Object.assign(filters, {
    search: '',
    status: ''
  })
  handleSearch()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadDeposits()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadDeposits()
}

const viewDetail = async (row) => {
  try {
    const response = await getDepositDetail(row.id)
    if (response.code === 200) {
      currentDeposit.value = response.data
      detailDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取押金详情失败:', error)
    ElMessage.error('获取押金详情失败')
  }
}

const handleRefund = (row) => {
  currentDeposit.value = row
  refundForm.action = 'approve'
  refundForm.reason = ''
  refundDialogVisible.value = true
}

const submitRefund = async () => {
  if (!currentDeposit.value) return

  refundLoading.value = true
  try {
    const response = await processRefund(currentDeposit.value.id, {
      action: refundForm.action,
      reason: refundForm.reason
    })

    if (response.code === 200) {
      ElMessage.success(refundForm.action === 'approve' ? '退款处理成功' : '已拒绝退款')
      refundDialogVisible.value = false
      loadDeposits()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    console.error('处理退款失败:', error)
    ElMessage.error('处理退款失败')
  } finally {
    refundLoading.value = false
  }
}

onMounted(() => {
  loadDeposits()
})
</script>

<style scoped>
.deposits-page {
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

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.transaction-id {
  font-size: 12px;
  word-break: break-all;
}
</style>
