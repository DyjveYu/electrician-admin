<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo">
        <el-icon v-if="!isCollapse" class="logo-icon-large"><Tools /></el-icon>
        <span v-if="!isCollapse" class="logo-text">电工维修平台</span>
        <el-icon v-else class="logo-icon"><Tools /></el-icon>
      </div>
      
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapse"
        :unique-opened="true"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>

        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>

        <el-menu-item index="/electricians">
          <el-icon><Tools /></el-icon>
          <template #title>电工管理</template>
        </el-menu-item>

        <el-menu-item index="/orders">
          <el-icon><Document /></el-icon>
          <template #title>工单管理</template>
        </el-menu-item>

        <el-menu-item index="/orders/non-five-star">
          <el-icon><Star /></el-icon>
          <template #title>非五星订单</template>
        </el-menu-item>

        <el-menu-item index="/messages">
          <el-icon><Bell /></el-icon>
          <template #title>系统通知</template>
        </el-menu-item>

        <el-menu-item index="/deposits">
          <el-icon><Wallet /></el-icon>
          <template #title>押金管理</template>
        </el-menu-item>

        <el-menu-item index="/admins">
          <el-icon><UserFilled /></el-icon>
          <template #title>管理员中心</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-button
            type="text"
            @click="toggleCollapse"
            class="collapse-btn"
          >
            <el-icon><Expand v-if="isCollapse" /><Fold v-else /></el-icon>
          </el-button>
          
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <!-- 待办通知 -->
          <el-dropdown trigger="hover" @command="handleTodoCommand">
            <span class="todo-trigger">
              <el-badge :value="todoCounts.total" :max="99" :hidden="todoCounts.total === 0">
                <el-icon :size="20"><Bell /></el-icon>
              </el-badge>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="depositRefund">
                  <span>押金退款申请</span>
                  <el-badge :value="todoCounts.depositRefunds" :hidden="!todoCounts.depositRefunds" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="certification">
                  <span>电工认证申请</span>
                  <el-badge :value="todoCounts.certifications" :hidden="!todoCounts.certifications" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="unfreeze">
                  <span>解冻申请</span>
                  <el-badge :value="todoCounts.unfreezeApplications" :hidden="!todoCounts.unfreezeApplications" class="item-badge" />
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="username">{{ authStore.adminInfo?.real_name || '管理员' }}</span>
              <el-icon class="arrow-down"><ArrowDown /></el-icon>
            </span>
            
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">
                  <el-icon><Lock /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人信息
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 主内容 -->
      <el-main class="layout-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="changePasswordDialogVisible"
      title="修改密码"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="80px"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入旧密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changePasswordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="changePasswordLoading" @click="handleChangePassword">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getTodoCounts } from '@/api/todo'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isCollapse = ref(false)

// 待办数量
const todoCounts = reactive({
  depositRefunds: 0,
  certifications: 0,
  unfreezeApplications: 0,
  get total() {
    return this.depositRefunds + this.certifications + this.unfreezeApplications
  }
})

let todoTimer = null

const loadTodoCounts = async () => {
  try {
    const res = await getTodoCounts()
    if (res.code === 200) {
      todoCounts.depositRefunds = res.data.depositRefunds || 0
      todoCounts.certifications = res.data.certifications || 0
      todoCounts.unfreezeApplications = res.data.unfreezeApplications || 0
    }
  } catch (error) {
    console.error('获取待办数量失败:', error)
  }
}

const handleTodoCommand = (command) => {
  const routes = {
    depositRefund: '/deposits',
    certification: '/electricians',
    unfreeze: '/electricians?filter=unfreeze'
  }
  router.push(routes[command])
}

onMounted(() => {
  loadTodoCounts()
  todoTimer = setInterval(loadTodoCounts, 30000)
})

onUnmounted(() => {
  if (todoTimer) {
    clearInterval(todoTimer)
  }
})

// 修改密码相关
const changePasswordDialogVisible = ref(false)
const changePasswordLoading = ref(false)
const passwordFormRef = ref(null)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码验证规则
const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.value.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const currentPageTitle = computed(() => {
  const titleMap = {
    '/dashboard': '仪表盘',
    '/admins': '管理员中心',
    '/users': '用户管理',
    '/electricians': '电工管理',
    '/orders': '工单管理',
    '/orders/non-five-star': '非五星订单',
    '/messages': '系统通知',
    '/deposits': '押金管理'
  }
  return titleMap[route.path] || '未知页面'
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleCommand = async (command) => {
  switch (command) {
    case 'changePassword':
      passwordForm.value = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      changePasswordDialogVisible.value = true
      break
    case 'profile':
      // 个人信息页面
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        authStore.logout()
        router.push('/login')
      } catch {
        // 用户取消
      }
      break
  }
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      changePasswordLoading.value = true
      try {
        const result = await authStore.changeUserPassword(
          passwordForm.value.oldPassword,
          passwordForm.value.newPassword
        )
        if (result.success) {
          ElMessage.success('密码修改成功')
          changePasswordDialogVisible.value = false
        } else {
          ElMessage.error(result.message || '修改密码失败')
        }
      } catch (error) {
        ElMessage.error(error.message || '修改密码失败')
      } finally {
        changePasswordLoading.value = false
      }
    }
  })
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background: #001529;
  transition: width 0.3s;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-bottom: 1px solid #1f1f1f;
}

.logo-icon-large {
  color: #fff;
  font-size: 24px;
  margin-right: 8px;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.logo-icon {
  color: #fff;
  font-size: 24px;
}

.sidebar-menu {
  border-right: none;
  background: #001529;
}

.sidebar-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.65);
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background-color: #1890ff;
  color: #fff;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background-color: #1890ff;
  color: #fff;
}

.layout-header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 18px;
  color: #666;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.todo-trigger {
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
  display: inline-flex;
  align-items: center;
}

.todo-trigger:hover {
  background-color: #f5f5f5;
}

.item-badge {
  margin-left: 8px;
}

.no-todo {
  color: #999;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.username {
  color: #333;
  font-size: 14px;
}

.arrow-down {
  color: #999;
  font-size: 12px;
}

.layout-content {
  background: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
}
</style>