<template>
  <div class="admins-page">
    <div class="page-card">
      <!-- 页面标题和操作栏 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>管理员中心</h2>
          <el-input
            v-model="searchForm.search"
            placeholder="搜索用户名或姓名"
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
            placeholder="状态"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option label="正常" value="active" />
            <el-option label="停用" value="inactive" />
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
          <el-button type="primary" @click="handleAddAdmin">
            <el-icon><Plus /></el-icon>
            新增管理员
          </el-button>
        </div>
      </div>

      <!-- 管理员列表表格 -->
      <el-table
        v-loading="loading"
        :data="adminList"
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column prop="username" label="用户名" width="150" />

        <el-table-column prop="real_name" label="姓名" width="120" />

        <el-table-column prop="email" label="邮箱" width="200">
          <template #default="{ row }">
            <span>{{ row.email || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="last_login_at" label="最后登录" width="180">
          <template #default="{ row }">
            {{ row.last_login_at ? formatDate(row.last_login_at) : '从未登录' }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleEditAdmin(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              type="danger"
              size="small"
              @click="handleDeactivateAdmin(row)"
            >
              停用
            </el-button>
            <el-button
              v-else
              type="success"
              size="small"
              @click="handleActivateAdmin(row)"
            >
              激活
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

    <!-- 新增/编辑管理员对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="450px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="密码" :prop="isEdit ? '' : 'password'">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password
          />
          <span v-if="isEdit" class="form-tip">不填则保持原密码</span>
        </el-form-item>
        <el-form-item label="姓名" prop="real_name">
          <el-input
            v-model="form.real_name"
            placeholder="请输入真实姓名"
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getAdminList, createAdmin, updateAdmin, deactivateAdmin, activateAdmin } from '@/api/admins'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const adminList = ref([])
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const isEdit = ref(false)
const currentAdminId = ref(null)
const formRef = ref(null)

const searchForm = reactive({
  search: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const form = reactive({
  username: '',
  password: '',
  real_name: '',
  email: ''
})

const formRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名至少3个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

const loadAdminList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }

    const response = await getAdminList(params)
    if (response.code === 200) {
      adminList.value = response.data.list || []
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('加载管理员列表失败:', error)
    ElMessage.error('加载管理员列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadAdminList()
}

const handleReset = () => {
  Object.assign(searchForm, {
    search: '',
    status: ''
  })
  handleSearch()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadAdminList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadAdminList()
}

const resetForm = () => {
  Object.assign(form, {
    username: '',
    password: '',
    real_name: '',
    email: ''
  })
}

const handleAddAdmin = () => {
  isEdit.value = false
  currentAdminId.value = null
  resetForm()
  dialogTitle.value = '新增管理员'
  // 编辑模式下密码非必填
  formRules.password[0].required = false
  dialogVisible.value = true
}

const handleEditAdmin = (admin) => {
  isEdit.value = true
  currentAdminId.value = admin.id
  Object.assign(form, {
    username: admin.username,
    password: '',
    real_name: admin.real_name,
    email: admin.email || ''
  })
  dialogTitle.value = '编辑管理员'
  // 编辑模式下密码非必填
  formRules.password[0].required = false
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      dialogLoading.value = true
      try {
        const data = {
          real_name: form.real_name,
          email: form.email || undefined
        }

        // 新增时需要 username 和 password
        if (!isEdit.value) {
          data.username = form.username
          data.password = form.password
        } else if (form.password) {
          // 编辑时如果填了密码才传
          data.password = form.password
        }

        const response = isEdit.value
          ? await updateAdmin(currentAdminId.value, data)
          : await createAdmin(data)

        if (response.code === 200) {
          ElMessage.success(isEdit.value ? '管理员更新成功' : '管理员创建成功')
          dialogVisible.value = false
          loadAdminList()
        } else {
          ElMessage.error(response.message || '操作失败')
        }
      } catch (error) {
        console.error('操作失败:', error)
        ElMessage.error(error.message || '操作失败')
      } finally {
        dialogLoading.value = false
      }
    }
  })
}

const handleDeactivateAdmin = async (admin) => {
  try {
    await ElMessageBox.confirm(
      `确定要停用管理员 "${admin.real_name}" 吗？`,
      '确认停用',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await deactivateAdmin(admin.id)
    if (response.code === 200) {
      ElMessage.success('管理员停用成功')
      loadAdminList()
    } else {
      ElMessage.error(response.message || '停用失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('停用管理员失败:', error)
      ElMessage.error(error.message || '停用管理员失败')
    }
  }
}

const handleActivateAdmin = async (admin) => {
  try {
    await ElMessageBox.confirm(
      `确定要激活管理员 "${admin.real_name}" 吗？`,
      '确认激活',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await activateAdmin(admin.id)
    if (response.code === 200) {
      ElMessage.success('管理员激活成功')
      loadAdminList()
    } else {
      ElMessage.error(response.message || '激活失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('激活管理员失败:', error)
      ElMessage.error(error.message || '激活管理员失败')
    }
  }
}

const dialogTitle = ref('新增管理员')

onMounted(() => {
  loadAdminList()
})
</script>

<style scoped>
.admins-page {
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

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

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
}
</style>
