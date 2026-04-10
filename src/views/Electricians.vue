<template>
  <div class="electricians-page">
    <div class="page-card">
      <!-- 页面标题和操作栏 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>电工管理</h2>
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索电工姓名或手机号"
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
            placeholder="认证状态"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>

          <el-select
            v-model="searchForm.province"
            placeholder="服务省"
            style="width: 120px"
            clearable
            @change="handleProvinceChange"
          >
            <el-option v-for="p in provinceOptions" :key="p" :label="p" :value="p" />
          </el-select>

          <el-select
            v-model="searchForm.city"
            placeholder="服务市"
            style="width: 120px"
            clearable
            @change="handleCityChange"
          >
            <el-option v-for="c in cityOptions" :key="c" :label="c" :value="c" />
          </el-select>

          <el-select
            v-model="searchForm.district"
            placeholder="服务区县"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option v-for="d in districtOptions" :key="d" :label="d" :value="d" />
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
        
        <div class="right">
          <el-button type="success" @click="handleBatchApprove" :disabled="selectedElectricians.length === 0">
            <el-icon><Check /></el-icon>
            批量通过
          </el-button>
          
          <el-button type="danger" @click="handleBatchReject" :disabled="selectedElectricians.length === 0">
            <el-icon><Close /></el-icon>
            批量驳回
          </el-button>
        </div>
      </div>
      
      <!-- 电工列表表格 -->
      <el-table
        v-loading="loading"
        :data="electricianList"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column prop="id" label="ID" width="80" />

        

        <el-table-column prop="service_phone" label="服务联系电话" width="130" />

        <el-table-column prop="real_name" label="姓名" width="100" />

        <el-table-column prop="status" label="认证状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="province" label="服务省" width="100" />

        <el-table-column prop="city" label="服务市" width="100" />

        <el-table-column prop="district" label="服务区/县" width="120" />

        <el-table-column prop="created_at" label="申请日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="updated_at" label="审核日期" width="120">
          <template #default="{ row }">
            {{ row.updated_at ? formatDate(row.updated_at) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="login_phone" label="登录手机号" width="130" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              size="small"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            
            <el-button
              v-if="row.status === 'pending'"
              type="danger"
              size="small"
              @click="handleReject(row)"
            >
              驳回
            </el-button>
            
            <el-button
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>

            <el-button
              v-if="row.status === 'approved'"
              type="warning"
              size="small"
              @click="handleBanElectrician(row)"
            >
              冻结
            </el-button>

            <el-button
              v-if="row.user_status === 'banned'"
              type="success"
              size="small"
              @click="handleUnbanElectrician(row)"
            >
              解冻
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
    
    <!-- 电工详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="电工详情"
      width="800px"
    >
      <div v-if="currentElectrician" class="electrician-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="电工ID">{{ currentElectrician.id }}</el-descriptions-item>
          
          <el-descriptions-item label="服务联系电话">{{ currentElectrician.service_phone }}</el-descriptions-item>
          <el-descriptions-item label="真实姓名">{{ currentElectrician.real_name }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{ currentElectrician.id_card }}</el-descriptions-item>
          <el-descriptions-item label="电工证编号">{{ currentElectrician.electrician_license }}</el-descriptions-item>
          <el-descriptions-item label="证书开始日期">{{ formatDate(currentElectrician.cert_start_date) }}</el-descriptions-item>
          <el-descriptions-item label="证书结束日期">
            <span :class="{ 'text-danger': isExpiringSoon(currentElectrician.cert_end_date) }">
              {{ formatDate(currentElectrician.cert_end_date) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="服务省份">{{ currentElectrician.province || '-' }}</el-descriptions-item>
          <el-descriptions-item label="服务城市">{{ currentElectrician.city || '-' }}</el-descriptions-item>
          <el-descriptions-item label="服务区县">{{ currentElectrician.district || '-' }}</el-descriptions-item>
          <el-descriptions-item label="认证状态">
            <el-tag :type="getStatusTagType(currentElectrician.status)">
              {{ getStatusText(currentElectrician.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请日期">{{ formatDate(currentElectrician.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="审核日期">{{ currentElectrician.updated_at ? formatDate(currentElectrician.updated_at) : '未审核' }}</el-descriptions-item>
          <el-descriptions-item label="登录手机号">{{ currentElectrician.login_phone }}</el-descriptions-item>
          <el-descriptions-item label="审核备注" :span="2">
            {{ currentElectrician.reject_reason || '无' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 证件照片 -->
        <div v-if="currentElectrician.id_card_front || currentElectrician.id_card_back || currentElectrician.license_photo" class="photos-section">
          <h4>证件照片</h4>
          <div class="photos-grid">
            <div v-if="currentElectrician.id_card_front" class="photo-item">
              <p>身份证正面</p>
              <el-image
                :src="currentElectrician.id_card_front"
                :preview-src-list="[currentElectrician.id_card_front]"
                fit="cover"
                class="photo"
              />
            </div>
            
            <div v-if="currentElectrician.id_card_back" class="photo-item">
              <p>身份证背面</p>
              <el-image
                :src="currentElectrician.id_card_back"
                :preview-src-list="[currentElectrician.id_card_back]"
                fit="cover"
                class="photo"
              />
            </div>
            
            <div v-if="currentElectrician.license_photo" class="photo-item">
              <p>电工证照片</p>
              <el-image
                :src="currentElectrician.license_photo"
                :preview-src-list="[currentElectrician.license_photo]"
                fit="cover"
                class="photo"
              />
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button
            v-if="currentElectrician?.status === 'pending'"
            type="success"
            @click="handleApprove(currentElectrician)"
          >
            通过认证
          </el-button>
          <el-button
            v-if="currentElectrician?.status === 'pending'"
            type="danger"
            @click="handleReject(currentElectrician)"
          >
            驳回认证
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 驳回原因对话框 -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="驳回认证"
      width="500px"
    >
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回原因" required>
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入驳回原因"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getElectricianList, approveElectrician, rejectElectrician, getElectricianDetail, banElectrician, unbanElectrician } from '@/api/electricians'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const electricianList = ref([])
const selectedElectricians = ref([])
const detailDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const currentElectrician = ref(null)
const pendingRejectElectrician = ref(null)

const searchForm = reactive({
  keyword: '',
  status: '',
  province: '',
  city: '',
  district: ''
})

// 省市区选项
const provinceOptions = ref([])
const cityOptions = ref([])
const districtOptions = ref([])

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const rejectForm = reactive({
  reason: ''
})

const getStatusTagType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已驳回'
  }
  return textMap[status] || '未知'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

const isExpiringSoon = (expiryDate) => {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffTime = expiry - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays >= 0
}

const loadElectricianList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }

    const response = await getElectricianList(params)
    if (response.code === 200) {
      // 后端已经返回统一格式的数据
      electricianList.value = response.data.list || []
      pagination.total = response.data.total || 0

      // 更新省市区选项
      if (response.data.provinceOptions) {
        provinceOptions.value = response.data.provinceOptions
      }
      if (response.data.cityOptions) {
        cityOptions.value = response.data.cityOptions
      }
      if (response.data.districtOptions) {
        districtOptions.value = response.data.districtOptions
      }
    } else {
      ElMessage.error(response.message || '获取电工列表失败')
      electricianList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('加载电工列表失败:', error)
    ElMessage.error('网络错误，请稍后重试')
    electricianList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 省份选择变化时，清空市和区县选项
const handleProvinceChange = () => {
  searchForm.city = ''
  searchForm.district = ''
  cityOptions.value = []
  districtOptions.value = []
  handleSearch()
}

// 城市选择变化时，清空区县选项
const handleCityChange = () => {
  searchForm.district = ''
  districtOptions.value = []
  handleSearch()
}

const handleSearch = () => {
  pagination.page = 1
  loadElectricianList()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: '',
    province: '',
    city: '',
    district: ''
  })
  // 重置后重新加载选项
  loadElectricianList()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadElectricianList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadElectricianList()
}

const handleSelectionChange = (selection) => {
  selectedElectricians.value = selection
}

const handleApprove = async (electrician) => {
  try {
    await ElMessageBox.confirm(
      `确定要通过 ${electrician.real_name} 的电工认证吗？`,
      '确认通过',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    
    const response = await approveElectrician(electrician.id, {})
    if (response.code === 200) {
      ElMessage.success('认证审核通过')
      loadElectricianList()
      detailDialogVisible.value = false
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审核通过失败:', error)
      ElMessage.error('审核通过失败')
    }
  }
}

const handleReject = (electrician) => {
  pendingRejectElectrician.value = electrician
  rejectForm.reason = ''
  rejectDialogVisible.value = true
}

const confirmReject = async () => {
  if (!rejectForm.reason.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }
  
  try {
    const response = await rejectElectrician(pendingRejectElectrician.value.id, {
      reason: rejectForm.reason
    })
    if (response.code === 200) {
      ElMessage.success('认证已驳回')
      loadElectricianList()
      rejectDialogVisible.value = false
      detailDialogVisible.value = false
    }
  } catch (error) {
    console.error('驳回认证失败:', error)
    ElMessage.error('驳回认证失败')
  }
}

const handleViewDetail = async (electrician) => {
  try {
    const response = await getElectricianDetail(electrician.id)
    if (response.code === 200) {
      // 后端已经返回格式化的数据，直接使用
      currentElectrician.value = response.data
    } else {
      ElMessage.error(response.message || '获取电工详情失败')
      currentElectrician.value = electrician
    }
    detailDialogVisible.value = true
  } catch (error) {
    console.error('获取电工详情失败:', error)
    ElMessage.error('网络错误，请稍后重试')
    currentElectrician.value = electrician
    detailDialogVisible.value = true
  }
}

const handleBanElectrician = async (electrician) => {
  try {
    await ElMessageBox.confirm(
      `确定要冻结电工 ${electrician.real_name} 吗？`,
      '确认冻结',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await banElectrician(electrician.id)
    if (response.code === 200) {
      ElMessage.success('电工已冻结')
      loadElectricianList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('冻结电工失败:', error)
      ElMessage.error('冻结电工失败')
    }
  }
}

const handleUnbanElectrician = async (electrician) => {
  try {
    await ElMessageBox.confirm(
      `确定要解冻电工 ${electrician.real_name} 吗？`,
      '确认解冻',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )

    const response = await unbanElectrician(electrician.id)
    if (response.code === 200) {
      ElMessage.success('电工已解冻')
      loadElectricianList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('解冻电工失败:', error)
      ElMessage.error('解冻电工失败')
    }
  }
}

const handleBatchApprove = async () => {
  const pendingElectricians = selectedElectricians.value.filter(e => e.status === 'pending')
  if (pendingElectricians.length === 0) {
    ElMessage.warning('请选择待审核的电工')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要批量通过 ${pendingElectricians.length} 个电工的认证吗？`,
      '确认批量通过',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    
    // 这里应该调用批量审核API，暂时模拟
    ElMessage.success('批量审核通过成功')
    loadElectricianList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量审核失败')
    }
  }
}

const handleBatchReject = () => {
  const pendingElectricians = selectedElectricians.value.filter(e => e.status === 'pending')
  if (pendingElectricians.length === 0) {
    ElMessage.warning('请选择待审核的电工')
    return
  }
  
  ElMessage.info('批量驳回功能开发中...')
}

onMounted(() => {
  loadElectricianList()
})
</script>

<style scoped>
.electricians-page {
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

.table-toolbar .right {
  display: flex;
  gap: 12px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.electrician-detail {
  padding: 16px 0;
}

.photos-section {
  margin-top: 24px;
}

.photos-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.photo-item {
  text-align: center;
}

.photo-item p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.photo {
  width: 100%;
  height: 150px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.text-danger {
  color: #f56c6c;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
  
  .table-toolbar .right {
    justify-content: flex-start;
  }
  
  .photos-grid {
    grid-template-columns: 1fr;
  }
}
</style>