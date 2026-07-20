<template>
  <div class="orders-page">
    <div class="page-card">
      <!-- 页面标题和操作栏 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>工单管理</h2>
                    <el-select
            v-model="searchForm.orderType"
            placeholder="订单类型"
            style="width: 150px"
            clearable
            @change="handleSearch"
          >
            <el-option label="个人快修" value="personal_quick" />
            <el-option label="企业快修" value="enterprise_quick" />
            <el-option label="多日工程" value="enterprise_project" />
          </el-select>
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索工单号或用户手机号"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-select
            v-model="searchForm.status"
            placeholder="工单状态"
            style="width: 150px"
            clearable
            @change="handleSearch"
          >
            <el-option label="待支付预付款" value="pending_payment" />
            <el-option label="待接单" value="pending" />
            <el-option label="已接单" value="accepted" />
            <el-option label="待支付维修费" value="pending_repair_payment" />
            <el-option label="维修中" value="in_progress" />
            <el-option label="待评价" value="pending_review" />
            <el-option label="待二次评价" value="pending_second_review" />
            <el-option label="已完成已支付" value="completed_settled" />
            <el-option label="已完成未支付" value="completed_unsettle" />
            <el-option label="支付失败" value="completed_settle_failed" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="取消处理中" value="cancel_pending" />
            <el-option label="交易关闭" value="closed" />
            <el-option label="招募中" value="recruiting" />
            <el-option label="名额已满" value="full" />
            <el-option label="评价中" value="reviewing" />
          </el-select>



          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
            @change="handleSearch"
          />
          
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
        
        <div class="right">
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
        </div>
      </div>
      
      <!-- 统计卡片 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-number">{{ orderStats.total }}</div>
            <div class="stat-label">总工单数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-number">{{ orderStats.pending }}</div>
            <div class="stat-label">待接单</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-number">{{ orderStats.inProgress }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-number">{{ orderStats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </el-col>
      </el-row>
      
      <!-- 工单列表表格 -->
      <el-table
        v-loading="loading"
        :data="orderList"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column prop="order_no" label="工单号" width="150" />

        <el-table-column prop="order_type" label="订单类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.order_type === 'enterprise_project'" type="warning" size="small">多日工程</el-tag>
            <el-tag v-else-if="row.order_type === 'enterprise_quick'" type="success" size="small">企业快修</el-tag>
            <el-tag v-else type="info" size="small">个人快修</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="user_phone" label="创建人账号" width="130">
          <template #default="{ row }">
            <span>{{ row.user_phone || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="electrician_name" label="电工" width="100">
          <template #default="{ row }">
            <span>{{ row.electrician_name || '未分配' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="服务类型" width="120">
          <template #default="{ row }">
            {{ row.serviceType?.name || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="description" label="服务描述" width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.description || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="服务地址" width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.service_address || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="completed_at" label="完成时间" width="160">
          <template #default="{ row }">
            {{ row.completed_at ? formatDateTime(row.completed_at) : '-' }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120" fixed="right">
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
    
    <!-- 工单详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="工单详情"
      width="1000px"
    >
      <div v-if="currentOrder" class="order-detail">
        <el-row :gutter="24">
          <el-col :span="24">
            <el-descriptions title="基本信息" :column="1" border label-width="140px">
              <el-descriptions-item label="工单号">{{ currentOrder.order_no }}</el-descriptions-item>
              <el-descriptions-item label="订单类型">
                <el-tag v-if="currentOrder.order_type === 'enterprise_project'" type="warning" size="small">多日工程</el-tag>
                <el-tag v-else-if="currentOrder.order_type === 'enterprise_quick'" type="success" size="small">企业快修</el-tag>
                <el-tag v-else type="info" size="small">个人快修</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="服务类型">{{ currentOrder.service_type_name || currentOrder.serviceType?.name }}</el-descriptions-item>
              <el-descriptions-item label="问题描述">{{ currentOrder.description }}</el-descriptions-item>
              <el-descriptions-item label="服务地址">{{ currentOrder.address?.detail_address || currentOrder.service_address || '-' }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ currentOrder.contact_name }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ currentOrder.contact_phone }}</el-descriptions-item>
              <el-descriptions-item v-if="currentOrder.order_type === 'enterprise_project'" label="当前状态">
                <el-tag :type="getStatusTagType(currentOrder.status)">
                  {{ getStatusText(currentOrder.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-if="currentOrder.order_type !== 'enterprise_project'" label="预约时间">{{ currentOrder.appointment_time ? formatDateTime(currentOrder.appointment_time) : '随时' }}</el-descriptions-item>
              <el-descriptions-item v-if="currentOrder.order_type !== 'enterprise_project'" label="预付款金额">
                <span v-if="currentOrder.prepay_amount">¥{{ currentOrder.prepay_amount }}</span>
                <span v-else-if="currentOrder.amount">¥{{ currentOrder.amount }}</span>
                <span v-else class="text-muted">-</span>
              </el-descriptions-item>
              <el-descriptions-item v-if="currentOrder.order_type !== 'enterprise_project'" label="维修金额">
                <span v-if="currentOrder.final_amount || currentOrder.repair_amount">¥{{ currentOrder.final_amount || currentOrder.repair_amount }}</span>
                <span v-else class="text-muted">-</span>
              </el-descriptions-item>
              <el-descriptions-item v-if="currentOrder.order_type !== 'enterprise_project'" label="总金额">
                <span v-if="currentOrder.prepay_amount && (currentOrder.final_amount || currentOrder.repair_amount)">
                  ¥{{ (Number(currentOrder.prepay_amount) + Number(currentOrder.final_amount || currentOrder.repair_amount)).toFixed(2) }}
                </span>
                <span v-else-if="currentOrder.amount">¥{{ currentOrder.amount }}</span>
                <span v-else class="text-muted">-</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
          
          <el-col v-if="currentOrder.order_type !== 'enterprise_project'" :span="12">
            <el-descriptions title="状态信息" :column="1" border label-width="140px">
              <el-descriptions-item label="当前状态">
                <el-tag :type="getStatusTagType(currentOrder.status)">
                  {{ getStatusText(currentOrder.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="用户">{{ currentOrder.user_phone }}</el-descriptions-item>
              <el-descriptions-item label="电工">{{ currentOrder.electrician_name || '未分配' }}</el-descriptions-item>
              <el-descriptions-item label="报价金额">
                <span v-if="currentOrder.amount">¥{{ currentOrder.amount }}</span>
                <span v-else class="text-muted">未报价</span>
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDateTime(currentOrder.created_at) }}</el-descriptions-item>
              <el-descriptions-item label="接单时间">{{ currentOrder.accepted_at ? formatDateTime(currentOrder.accepted_at) : '-' }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">{{ currentOrder.completed_at ? formatDateTime(currentOrder.completed_at) : '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
        
        <!-- 多日工程专属信息 -->
        <div v-if="currentOrder.order_type === 'enterprise_project' && currentOrder.electricians" class="project-section">
          <h4>多日工程信息</h4>
          <el-descriptions :column="2" border style="margin-bottom: 16px">
            <el-descriptions-item label="工单总额">¥{{ (currentOrder.proj_total_amount || currentOrder.final_amount || 0) }}</el-descriptions-item>
            <el-descriptions-item label="需要电工人数">{{ currentOrder.proj_required_count || '-' }}人</el-descriptions-item>
            <el-descriptions-item label="平台服务费(15%)">¥{{ currentOrder.platformFee }}</el-descriptions-item>
            <el-descriptions-item label="工程费(85%)">¥{{ currentOrder.projectFee }}</el-descriptions-item>
            <el-descriptions-item label="电工费用/人">¥{{ currentOrder.electricianFee }}</el-descriptions-item>
            <el-descriptions-item label="工程时间">{{ currentOrder.proj_start_time ? formatDateTime(currentOrder.proj_start_time) : '-' }} 至 {{ currentOrder.proj_end_time ? formatDateTime(currentOrder.proj_end_time) : '-' }}</el-descriptions-item>
          </el-descriptions>

          <h4 style="margin-top: 16px">已招募电工（{{ currentOrder.electricians.length }}人）</h4>
          <el-table :data="currentOrder.electricians" size="small" max-height="300">
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="workNo" label="工号" width="120" />
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column prop="status" label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="getProjectElectricianStatusTag(row.status)" size="small">
                  {{ getProjectElectricianStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="settledAmount" label="已结算金额" width="120" align="right">
              <template #default="{ row }">
                ¥{{ row.settledAmount ? row.settledAmount.toFixed(2) : '0.00' }}
              </template>
            </el-table-column>
            <el-table-column label="企业评价电工" width="160">
              <template #default="{ row }">
                <template v-if="row.enterpriseReview">
                  <el-rate :model-value="row.enterpriseReview.rating" disabled size="small" />
                  <span class="review-text">{{ row.enterpriseReview.content || '无内容' }}</span>
                </template>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="电工评价企业" width="160">
              <template #default="{ row }">
                <template v-if="row.electricianReview">
                  <el-rate :model-value="row.electricianReview.rating" disabled size="small" />
                  <span class="review-text">{{ row.electricianReview.content || '无内容' }}</span>
                </template>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="joinedAt" label="接单时间" min-width="160">
              <template #default="{ row }">
                {{ row.joinedAt ? formatDateTime(row.joinedAt) : '-' }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 问题图片 -->
        <div v-if="currentOrder.images && currentOrder.images.length > 0" class="images-section">
          <h4>问题图片</h4>
          <div class="images-grid">
            <el-image
              v-for="(image, index) in currentOrder.images"
              :key="index"
              :src="image"
              :preview-src-list="currentOrder.images"
              fit="cover"
              class="order-image"
            />
          </div>
        </div>
        
        <!-- 维修记录 -->
        <div v-if="currentOrder.repair_description" class="repair-section">
          <h4>维修记录</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="维修内容">{{ currentOrder.repair_description }}</el-descriptions-item>
            <el-descriptions-item label="维修时间">{{ currentOrder.repair_time ? formatDateTime(currentOrder.repair_time) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="维修费用">¥{{ currentOrder.repair_amount || 0 }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <!-- 评价信息（多日工程不显示，评价在已招募电工列表中） -->
        <div v-if="currentOrder.review && currentOrder.order_type !== 'enterprise_project'" class="review-section">
          <h4>用户评价</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="评分">
              <el-rate v-model="currentOrder.review.rating" disabled />
            </el-descriptions-item>
            <el-descriptions-item label="评价内容">{{ currentOrder.review.content }}</el-descriptions-item>
            <el-descriptions-item label="评价时间">{{ formatDateTime(currentOrder.review.created_at) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 退款信息 -->
        <div v-if="currentOrder.prepay_refund_status || currentOrder.repair_refund_status" class="refund-section">
          <h4>退款信息</h4>
          <!-- 预付款退款 -->
          <div v-if="currentOrder.prepay_refund_status">
            <el-descriptions title="预付款退款" :column="2" border>
              <el-descriptions-item label="退款状态">
                <el-tag :type="getRefundTagType(currentOrder.prepay_refund_status)">
                  {{ getRefundStatusText(currentOrder.prepay_refund_status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="退款金额">
                <span v-if="currentOrder.prepay_refund_amount">¥{{ currentOrder.prepay_refund_amount }}</span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="退款申请时间">
                {{ currentOrder.prepay_refund_requested_at ? formatDateTime(currentOrder.prepay_refund_requested_at) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="退款完成时间">
                {{ currentOrder.prepay_refund_completed_at ? formatDateTime(currentOrder.prepay_refund_completed_at) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="腾讯退款单号">
                {{ currentOrder.prepay_refund_id || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="腾讯支付交易号">
                {{ currentOrder.prepay_transaction_id || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="退款原因" :span="2">
                {{ currentOrder.prepay_refund_reason || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
          <!-- 维修费退款 -->
          <div v-if="currentOrder.repair_refund_status" style="margin-top: 16px;">
            <el-descriptions title="维修费退款" :column="2" border>
              <el-descriptions-item label="退款状态">
                <el-tag :type="getRefundTagType(currentOrder.repair_refund_status)">
                  {{ getRefundStatusText(currentOrder.repair_refund_status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="退款金额">
                <span v-if="currentOrder.repair_refund_amount">¥{{ currentOrder.repair_refund_amount }}</span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="退款申请时间">
                {{ currentOrder.repair_refund_requested_at ? formatDateTime(currentOrder.repair_refund_requested_at) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="退款完成时间">
                {{ currentOrder.repair_refund_completed_at ? formatDateTime(currentOrder.repair_refund_completed_at) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="腾讯退款单号">
                {{ currentOrder.repair_refund_id || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="腾讯支付交易号">
                {{ currentOrder.repair_transaction_id || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="退款原因" :span="2">
                {{ currentOrder.repair_refund_reason || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 工单金额分配统计（仅 completed_settled 状态展示） -->
        <div v-if="currentOrder.status === 'completed_settled' && orderFinance.totalAmount > 0" class="finance-section">
          <h4>工单金额分配统计</h4>
          <div class="finance-row">
            <div class="finance-bar">
              <div class="finance-segment electrician-seg" :style="{ width: '85%' }">
                <span class="seg-label">电工 85%</span>
              </div>
              <div v-if="orderFinance.promoterAmount > 0" class="finance-segment promoter-seg" style="width:3%">
                <span class="seg-label">推荐达人 3%</span>
              </div>
              <div v-if="orderFinance.partnerAmount > 0" class="finance-segment partner-seg" style="width:3%">
                <span class="seg-label">合作伙伴 3%</span>
              </div>
              <div class="finance-segment platform-seg" :style="{ width: orderFinance.platformPct + '%' }">
                <span class="seg-label">平台 {{ orderFinance.platformPct }}%</span>
              </div>
            </div>
          </div>
          <el-descriptions :column="5" border size="small">
            <el-descriptions-item label="工单总费用" align="center">
              <span class="amount-total">¥{{ orderFinance.totalAmount.toFixed(2) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="电工分成(85%)" align="center">
              <span class="amount-electrician">¥{{ orderFinance.electricianAmount.toFixed(2) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="推荐达人分成(3%)" align="center">
              <span class="amount-promoter">¥{{ orderFinance.promoterAmount.toFixed(2) }}</span>
              <div v-if="orderFinance.promoterAmount > 0" class="sub-tag promoter-tag">有</div>
              <div v-else class="sub-tag none-tag">无</div>
            </el-descriptions-item>
            <el-descriptions-item label="合作伙伴分成(3%)" align="center">
              <span class="amount-partner">¥{{ orderFinance.partnerAmount.toFixed(2) }}</span>
              <div v-if="orderFinance.partnerAmount > 0" class="sub-tag partner-tag">有</div>
              <div v-else class="sub-tag none-tag">无</div>
            </el-descriptions-item>
            <el-descriptions-item label="平台分成" align="center">
              <span class="amount-platform">¥{{ orderFinance.platformAmount.toFixed(2) }}</span>
              <div class="sub-tag plat-tag">{{ orderFinance.platformPct }}%</div>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      
      <template #footer>
        <div style="display:flex;justify-content:space-between;width:100%">
          <el-button
            v-if="currentOrder.order_type === 'enterprise_project' && currentOrder.status === 'full'"
            type="warning"
            :loading="triggeringReview"
            @click="handleTriggerReview"
          >
            手动触发任务到期
          </el-button>
          <span v-else></span>
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { getOrderList, updateOrderStatus, getOrderDetail, getStatistics, triggerProjectReview } from '@/api/orders'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const orderList = ref([])
const selectedOrders = ref([])
const detailDialogVisible = ref(false)
const currentOrder = ref(null)
const triggeringReview = ref(false)

const searchForm = reactive({
  keyword: '',
  status: '',
  orderType: '',
  dateRange: null
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const orderStats = reactive({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0
})

const getStatusTagType = (status) => {
  const typeMap = {
    'pending_payment': 'info',        // 待支付预付款
    'pending': 'warning',            // 待接单（已支付预付款）
    'accepted': 'primary',           // 已接单
    'pending_repair_payment': 'info', // 待支付维修费
    'in_progress': 'primary',        // 维修中
    'pending_review': 'warning',     // 待评价
    'pending_second_review': 'warning', // 待二次评价
    'completed_settled': 'success',  // 已完成已支付电工费用
    'completed_unsettle': 'warning', // 已完成未支付电工费用
    'completed_settle_failed': 'danger', // 已完成支付电工费用失败
    'cancelled': 'danger',           // 已取消
    'cancel_pending': 'warning',     // 取消处理中
    'closed': 'info',               // 交易关闭
    'recruiting': 'warning',         // 招募中（多日工程）
    'full': 'primary',              // 名额已满（多日工程）
    'reviewing': 'warning'          // 评价中（多日工程）
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'pending_payment': '待支付预付款',
    'pending': '待接单',
    'accepted': '已接单',
    'pending_repair_payment': '待支付维修费',
    'in_progress': '维修中',
    'pending_review': '待评价',
    'pending_second_review': '待二次评价',
    'completed_settled': '已完成已支付',
    'completed_unsettle': '已完成未支付',
    'completed_settle_failed': '支付失败',
    'cancelled': '已取消',
    'cancel_pending': '取消处理中',
    'closed': '交易关闭',
    'recruiting': '招募中',
    'full': '名额已满',
    'reviewing': '评价中'
  }
  return textMap[status] || '未知'
}

const getProjectElectricianStatusText = (status) => {
  const map = {
    in_progress: '施工中',
    pending_review: '待评价',
    pending_second_review: '待二次评价',
    completed_settled: '已结算',
    completed_unsettle: '未结算'
  }
  return map[status] || status || '未知'
}

const getProjectElectricianStatusTag = (status) => {
  const map = {
    in_progress: '',
    pending_review: 'warning',
    pending_second_review: 'warning',
    completed_settled: 'success',
    completed_unsettle: 'danger'
  }
  return map[status] || 'info'
}

const getRefundStatusText = (status) => {
  const textMap = {
    'processing': '退款中',
    'success': '已退款',
    'rejected': '已拒绝'
  }
  return textMap[status] || (status ? status : '无退款')
}

const getRefundTagType = (status) => {
  const typeMap = {
    'processing': 'warning',
    'success': 'success',
    'rejected': 'danger'
  }
  return typeMap[status] || 'info'
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
      search: searchForm.keyword,
      status: searchForm.status,
      order_type: searchForm.orderType
    }

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.start_date = searchForm.dateRange[0].toISOString().split('T')[0]
      params.end_date = searchForm.dateRange[1].toISOString().split('T')[0]
    }

    const response = await getOrderList(params)
    if (response.code === 200) {
      orderList.value = response.data.orders
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('加载工单列表失败:', error)
    ElMessage.error('加载工单列表失败: ' + error.message)
    orderList.value = []
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await getStatistics()
    if (response.code === 200) {
      Object.assign(orderStats, response.data.orders || {})
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadOrderList()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: '',
    orderType: '',
    dateRange: null
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

const handleSelectionChange = (selection) => {
  selectedOrders.value = selection
}

const handleViewDetail = async (order) => {
  try {
    const response = await getOrderDetail(order.id)
    if (response.code === 200) {
      currentOrder.value = response.data
    } else {
      currentOrder.value = order
    }
    detailDialogVisible.value = true
  } catch (error) {
    console.error('获取工单详情失败:', error)
    currentOrder.value = order
    detailDialogVisible.value = true
  }
}

const handleTriggerReview = async () => {
  const order = currentOrder.value
  if (!order) return

  try {
    await ElMessageBox.confirm(
      `确认手动触发工单 ${order.order_no} 进入评价阶段？此操作将通知企业和电工。`,
      '确认操作',
      { confirmButtonText: '确认触发', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  triggeringReview.value = true
  try {
    const response = await triggerProjectReview(order.id)
    if (response.code === 0 || response.code === 200) {
      ElMessage.success('已触发进入评价阶段')
      detailDialogVisible.value = false
      loadOrderList()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    console.error('触发评价失败:', error)
    ElMessage.error('操作失败')
  } finally {
    triggeringReview.value = false
  }
}

const handleOrderAction = async (command, order) => {
  switch (command) {
    case 'cancel':
      await handleCancelOrder(order)
      break
    case 'force_complete':
      await handleForceComplete(order)
      break
    case 'refund':
      await handleRefund(order)
      break
  }
}

const handleCancelOrder = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消工单 ${order.order_number} 吗？`,
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await updateOrderStatus(order.id, { status: 'cancelled' })
    if (response.code === 200) {
      ElMessage.success('工单已取消')
      loadOrderList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消工单失败:', error)
      ElMessage.error('取消工单失败')
    }
  }
}

const handleForceComplete = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确定要强制完成工单 ${order.order_number} 吗？`,
      '确认强制完成',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await updateOrderStatus(order.id, { status: 'completed' })
    if (response.code === 200) {
      ElMessage.success('工单已强制完成')
      loadOrderList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('强制完成工单失败:', error)
      ElMessage.error('强制完成工单失败')
    }
  }
}

const handleRefund = async (order) => {
  ElMessage.info('退款功能开发中...')
}

const handleExport = () => {
  ElMessage.info('导出功能开发中...')
}

// ===== 工单金额分配统计 =====
const orderFinance = computed(() => {
  const order = currentOrder.value
  if (!order) return { totalAmount: 0, electricianAmount: 0, promoterAmount: 0, partnerAmount: 0, platformAmount: 0, platformPct: 15 }

  const prepay = Number(order.prepay_amount || 0)
  const finalAmt = Number(order.final_amount || order.repair_amount || 0)
  const totalAmount = prepay + finalAmt
  const electricianAmount = Number((totalAmount * 0.85).toFixed(2))

  // 根据实际佣金记录区分推荐达人/合作伙伴
  const hasCommission = order.commission_amount != null
  const commissionType = order.referral_type // 'promoter' | 'partner' | null
  const rawCommission = hasCommission ? Number(order.commission_amount) : 0

  let promoterAmount = 0
  let partnerAmount = 0
  if (hasCommission && commissionType === 'promoter') {
    promoterAmount = rawCommission
  } else if (hasCommission && commissionType === 'partner') {
    partnerAmount = rawCommission
  }
  // 没有 commission_amount 时两者皆为 0

  const platformAmount = Number((totalAmount - electricianAmount - promoterAmount - partnerAmount).toFixed(2))
  const platformPct = hasCommission ? 12 : 15

  return { totalAmount, electricianAmount, promoterAmount, partnerAmount, platformAmount, platformPct }
})

onMounted(() => {
  loadOrderList()
  loadStats()
})
</script>

<style scoped>
.orders-page {
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

.images-section,
.repair-section,
.review-section,
.refund-section {
  margin-top: 24px;
}

.images-section h4,
.repair-section h4,
.review-section h4,
.refund-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.order-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.text-muted {
  color: #999;
}

.review-text {
  font-size: 12px;
  color: #666;
  display: block;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

/* 工单金额分配统计 */
.finance-section {
  margin-top: 24px;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
}

.finance-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.finance-row {
  margin-bottom: 12px;
}

.finance-bar {
  display: flex;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
}

.finance-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s ease;
  min-width: fit-content;
}

.seg-label {
  color: #fff;
  white-space: nowrap;
  padding: 0 8px;
}

.electrician-seg {
  background: linear-gradient(135deg, #52c41a, #73d13d);
}

.promoter-seg {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
}

.partner-seg {
  background: linear-gradient(135deg, #722ed1, #b37feb);
}

.platform-seg {
  background: linear-gradient(135deg, #fa8c16, #ffa940);
}

.amount-total {
  font-weight: 700;
  font-size: 16px;
  color: #333;
}

.amount-electrician {
  color: #52c41a;
  font-weight: 600;
}

.amount-promoter {
  color: #1890ff;
  font-weight: 600;
}

.amount-partner {
  color: #722ed1;
  font-weight: 600;
}

.amount-platform {
  color: #fa8c16;
  font-weight: 600;
}

.sub-tag {
  display: inline-block;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 3px;
  margin-top: 2px;
}

.promoter-tag {
  color: #1890ff;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
}

.partner-tag {
  color: #722ed1;
  background: #f9f0ff;
  border: 1px solid #d3adf7;
}

.none-tag {
  color: #999;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
}

.plat-tag {
  color: #fa8c16;
  background: #fff7e6;
  border: 1px solid #ffd591;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-toolbar .left {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-toolbar .left h2 {
    margin-bottom: 8px;
  }
  
  .stats-row .el-col {
    margin-bottom: 16px;
  }
  
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .order-image {
    width: 100px;
    height: 100px;
  }
}
</style>