<template>
  <div class="referrer-applications-page">
    <div class="page-card">
      <!-- 页面标题 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>推荐达人申请审核</h2>
          <el-button type="success" @click="handleGenerateQRCode" :loading="qrGenerating">
            <el-icon><Picture /></el-icon>
            生成申请二维码
          </el-button>
        </div>
      </div>

      <!-- 申请列表表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="申请人姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="current_role" label="用户当前角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="roleTagType(row.current_role)">
              {{ roleLabel(row.current_role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="审核状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button
                type="success"
                size="small"
                @click="handleApprove(row)"
              >
                <el-icon><Select /></el-icon>
                通过
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="handleReject(row)"
              >
                <el-icon><CloseBold /></el-icon>
                驳回
              </el-button>
            </template>
            <span v-else style="color: #999">-</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </div>

    <!-- 二维码弹窗 -->
    <el-dialog
      v-model="qrDialogVisible"
      title="推荐达人申请二维码"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="qr-dialog-body">
        <p class="qr-tip">扫描二维码进入推荐达人申请页</p>
        <div class="qr-image-wrapper" v-if="qrImageUrl">
          <img :src="qrImageUrl" alt="推荐达人申请二维码" class="qr-image" />
        </div>
        <div class="qr-loading" v-else-if="qrGenerating">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在生成...</span>
        </div>
        <p class="qr-info" v-if="qrImageUrl">
          路径：pages/referrer/apply/apply<br/>
          场景值：referrer_apply
        </p>
      </div>
      <template #footer>
        <el-button @click="qrDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Select, CloseBold, Picture, Loading } from '@element-plus/icons-vue'
import { getReferrerApplications, approveApplication, rejectApplication, generateQRCode } from '@/api/referrer-applications'

const loading = ref(false)
const tableData = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const loadList = async () => {
  loading.value = true
  try {
    const res = await getReferrerApplications({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.code === 200) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('加载申请列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 通过
const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定通过「${row.name}」（${row.phone}）的推荐达人申请吗？`,
      '审核通过确认',
      { confirmButtonText: '确定通过', cancelButtonText: '取消', type: 'success' }
    )

    const res = await approveApplication(row.id)
    if (res.code === 200) {
      ElMessage.success('审核通过，已开通推荐达人身份')
      loadList()
    } else {
      ElMessage.warning(res.message || '操作未成功')
    }
  } catch (error) {
    if (error === 'cancel') return
    // 后端返回的业务错误（如企业/电工拦截）
    if (error.response?.data?.message) {
      ElMessage.warning(error.response.data.message)
    } else {
      console.error('审核通过失败:', error)
    }
  }
}

// 驳回
const handleReject = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定驳回「${row.name}」（${row.phone}）的申请吗？`,
      '驳回确认',
      { confirmButtonText: '确定驳回', cancelButtonText: '取消', type: 'warning' }
    )

    const res = await rejectApplication(row.id)
    if (res.code === 200) {
      ElMessage.success('已驳回申请')
      loadList()
    }
  } catch (error) {
    if (error === 'cancel') return
    console.error('驳回失败:', error)
  }
}

// 工具方法
const roleLabel = (role) => {
  const map = { user: '普通用户', enterprise: '企业用户', electrician: '电工' }
  return map[role] || role || '普通用户'
}

const roleTagType = (role) => {
  return role === 'user' ? '' : role === 'enterprise' ? 'warning' : 'danger'
}

const statusLabel = (status) => {
  const map = { pending: '待审核', approved: '已通过', rejected: '已驳回' }
  return map[status] || status
}

const statusTagType = (status) => {
  return status === 'pending' ? 'warning' : status === 'approved' ? 'success' : 'info'
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

// ─── 生成二维码 ───

const qrDialogVisible = ref(false)
const qrImageUrl = ref('')
const qrGenerating = ref(false)

const handleGenerateQRCode = async () => {
  qrGenerating.value = true
  qrImageUrl.value = ''
  qrDialogVisible.value = true

  try {
    const res = await generateQRCode({
      scene: 'referrer_apply',
      page: 'pages/referrer/apply/apply'
    })
    if (res.code === 200 && res.data.qrcode_url) {
      // 拼接完整 URL（后端返回相对路径）
      const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
      qrImageUrl.value = baseUrl + res.data.qrcode_url
    } else {
      ElMessage.error(res.message || '生成失败')
      qrDialogVisible.value = false
    }
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败')
    qrDialogVisible.value = false
  } finally {
    qrGenerating.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.referrer-applications-page {
  height: 100%;
}

.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
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
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 二维码弹窗 */
.qr-dialog-body {
  text-align: center;
}

.qr-tip {
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;
}

.qr-image-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.qr-image {
  width: 260px;
  height: 260px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.qr-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: #999;
  font-size: 14px;
}

.qr-info {
  color: #999;
  font-size: 12px;
  line-height: 1.6;
}
</style>
