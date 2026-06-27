<template>
  <div class="enterprises-page">
    <div class="page-card">
      <!-- 页面标题和搜索栏 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>企业用户管理</h2>
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索企业名称或手机号"
            style="width: 280px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
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

      <!-- 企业用户列表表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="companyName" label="企业名称" min-width="160">
          <template #default="{ row }">
            <span>{{ row.companyName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="creditCode" label="统一社会信用代码" width="200">
          <template #default="{ row }">
            <span>{{ row.creditCode || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="contactName" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="手机号" width="130" />
        <el-table-column prop="certStatus" label="认证状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="certStatusType(row.certStatus)" size="small">
              {{ certStatusText(row.certStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="账号状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : row.status === 'frozen' ? '已冻结' : row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewOrders(row)">
              查看工单
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              type="danger"
              link
              size="small"
              @click="handleFreeze(row)"
            >
              冻结
            </el-button>
            <el-button
              v-else-if="row.status === 'frozen'"
              type="success"
              link
              size="small"
              @click="handleUnfreeze(row)"
            >
              解冻
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap" v-if="total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 工单查看对话框 -->
    <el-dialog
      v-model="ordersDialogVisible"
      title="企业工单列表"
      width="1300px"
      destroy-on-close
    >
      <el-table :data="ordersData" v-loading="ordersLoading" max-height="500">
        <el-table-column prop="orderNo" label="工单号" width="200" />
        <el-table-column prop="orderType" label="工单类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="orderTypeTag(row.orderType)" size="small">
              {{ orderTypeText(row.orderType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="工单总额" width="110" align="right">
          <template #default="{ row }">
            {{ row.totalAmount ? row.totalAmount.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="platformFee" label="平台服务费(15%)" width="130" align="right">
          <template #default="{ row }">
            {{ row.orderType === 'enterprise_project' ? row.platformFee.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="projectFee" label="工程费(85%)" width="120" align="right">
          <template #default="{ row }">
            {{ row.orderType === 'enterprise_project' ? row.projectFee.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="electricianCount" label="电工人数" width="90" align="center">
          <template #default="{ row }">
            {{ row.orderType === 'enterprise_project' ? row.electricianCount : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="electricianFee" label="电工费用/人" width="120" align="right">
          <template #default="{ row }">
            {{ row.orderType === 'enterprise_project' ? row.electricianFee.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap" v-if="ordersTotal > 0" style="margin-top: 16px">
        <el-pagination
          v-model:current-page="ordersPagination.page"
          v-model:page-size="ordersPagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="ordersTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleOrdersPageSizeChange"
          @current-change="handleOrdersPageChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import request from '@/utils/request';

// 搜索表单
const searchForm = reactive({
  keyword: ''
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20
});

const loading = ref(false);
const tableData = ref([]);
const total = ref(0);

// 获取列表
const fetchList = async () => {
  loading.value = true;
  try {
    const res = await request.get('/admin/enterprises', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword
      }
    });
    if (res.code === 200) {
      tableData.value = res.data.list || [];
      total.value = res.data.total || 0;
    }
  } catch (err) {
    console.error('获取企业列表失败:', err);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchList();
};

const handleReset = () => {
  searchForm.keyword = '';
  pagination.page = 1;
  fetchList();
};

const handlePageChange = (page) => {
  pagination.page = page;
  fetchList();
};

const handlePageSizeChange = (size) => {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchList();
};

// 冻结/解冻
const handleFreeze = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认冻结企业「${row.companyName || row.contactPhone}」？冻结后该企业无法登录和下单。`,
      '确认冻结',
      { confirmButtonText: '确认冻结', cancelButtonText: '取消', type: 'warning' }
    );
    const res = await request.patch(`/admin/enterprises/${row.id}/freeze`, { action: 'freeze' });
    if (res.code === 200) {
      ElMessage.success('已冻结');
      fetchList();
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('冻结失败:', err);
    }
  }
};

const handleUnfreeze = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认解冻企业「${row.companyName || row.contactPhone}」？`,
      '确认解冻',
      { confirmButtonText: '确认解冻', cancelButtonText: '取消', type: 'info' }
    );
    const res = await request.patch(`/admin/enterprises/${row.id}/freeze`, { action: 'unfreeze' });
    if (res.code === 200) {
      ElMessage.success('已解冻');
      fetchList();
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('解冻失败:', err);
    }
  }
};

// 工单查看
const ordersDialogVisible = ref(false);
const ordersData = ref([]);
const ordersLoading = ref(false);
const ordersTotal = ref(0);
const currentEnterpriseId = ref(null);
const ordersPagination = reactive({ page: 1, pageSize: 20 });

const viewOrders = (row) => {
  currentEnterpriseId.value = row.id;
  ordersPagination.page = 1;
  ordersDialogVisible.value = true;
  fetchOrders();
};

const fetchOrders = async () => {
  ordersLoading.value = true;
  try {
    const res = await request.get(`/admin/enterprises/${currentEnterpriseId.value}/orders`, {
      params: { page: ordersPagination.page, pageSize: ordersPagination.pageSize }
    });
    if (res.code === 200) {
      ordersData.value = res.data.list || [];
      ordersTotal.value = res.data.total || 0;
    }
  } catch (err) {
    console.error('获取工单列表失败:', err);
  } finally {
    ordersLoading.value = false;
  }
};

const handleOrdersPageChange = (page) => {
  ordersPagination.page = page;
  fetchOrders();
};

const handleOrdersPageSizeChange = (size) => {
  ordersPagination.pageSize = size;
  ordersPagination.page = 1;
  fetchOrders();
};

// 认证状态文本
const certStatusText = (status) => {
  const map = { approved: '已认证', pending: '认证中', not_submitted: '未认证' };
  return map[status] || status || '未认证';
};

const certStatusType = (status) => {
  const map = { approved: 'success', pending: 'warning', not_submitted: 'info' };
  return map[status] || 'info';
};

// 工单类型文本
const orderTypeText = (type) => {
  const map = {
    personal_quick: '个人快修',
    enterprise_quick: '企业快修',
    enterprise_project: '多日工程'
  };
  return map[type] || type || '-';
};

const orderTypeTag = (type) => {
  const map = {
    personal_quick: 'info',
    enterprise_quick: '',
    enterprise_project: 'warning'
  };
  return map[type] || 'info';
};

// 状态文本和标签（与 Orders.vue 保持一致）
const getStatusText = (status) => {
  const map = {
    pending_payment: '待支付', pending: '待接单', accepted: '已接单',
    pending_repair_payment: '待支付维修费', in_progress: '进行中',
    pending_review: '待评价', pending_second_review: '待二次评价',
    completed_settled: '已完成已结算', completed_unsettle: '已完成未结算',
    completed_settle_failed: '结算失败', cancelled: '已取消',
    cancel_pending: '取消中', closed: '已关闭',
    recruiting: '招募中', full: '名额已满', reviewing: '评价中'
  };
  return map[status] || status || '未知';
};

const getStatusTagType = (status) => {
  const map = {
    pending_payment: 'warning', pending: 'info', accepted: '',
    pending_repair_payment: 'warning', in_progress: '',
    pending_review: 'warning', pending_second_review: 'warning',
    completed_settled: 'success', completed_unsettle: 'info',
    completed_settle_failed: 'danger', cancelled: 'info',
    cancel_pending: 'warning', closed: 'info',
    recruiting: 'warning', full: 'primary', reviewing: 'warning'
  };
  return map[status] || 'info';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
};

onMounted(() => {
  fetchList();
});
</script>

<style scoped>
.enterprises-page {
  padding: 20px;
}

.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-toolbar .left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-toolbar .left h2 {
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
