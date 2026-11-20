<template>
  <el-container class="layout-container" :class="{ 'nav-open': mobileMenuOpen }">
    <button v-if="isNarrow && mobileMenuOpen" class="nav-backdrop" aria-label="关闭导航" @click="mobileMenuOpen = false"></button>
    <!-- 侧边栏 -->
    <el-aside :width="isNarrow ? '224px' : isCollapse ? '64px' : '224px'" class="sidebar">
      <div class="logo">
        <el-icon v-if="!(isCollapse && !isNarrow)" class="logo-icon-large"><Tools /></el-icon>
        <span v-if="!(isCollapse && !isNarrow)" class="logo-text">电工维修平台</span>
        <el-icon v-else class="logo-icon"><Tools /></el-icon>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        :default-openeds="openedMenus"
        @select="mobileMenuOpen = false"
        :collapse="isCollapse && !isNarrow"
        :unique-opened="true"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>

        <el-sub-menu v-if="!isNarrow" index="visit-statistics">
          <template #title>
            <el-icon><DataBoard /></el-icon>
            <span>访问统计</span>
          </template>
          <el-menu-item index="/visit-statistics/details">访问明细</el-menu-item>
          <el-menu-item index="/visit-statistics/daily">日访问统计</el-menu-item>
          <el-menu-item index="/visit-statistics/regions">地域分析</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>

        <el-sub-menu index="electrician-management">
          <template #title>
            <el-icon><Tools /></el-icon>
            <span>电工管理</span>
          </template>
          <el-menu-item index="/electricians/region-stats">统计概览</el-menu-item>
          <el-menu-item index="/electricians">电工管理</el-menu-item>
          <el-menu-item index="/electricians/region-changes">区域变更审核</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/enterprises">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>企业用户管理</template>
        </el-menu-item>

        <el-menu-item index="/partners">
          <el-icon><Connection /></el-icon>
          <template #title>合作伙伴管理</template>
        </el-menu-item>

        <el-menu-item index="/referrers">
          <el-icon><Star /></el-icon>
          <template #title>推荐达人管理</template>
        </el-menu-item>

        <el-menu-item index="/referrer-applications">
          <el-icon><Check /></el-icon>
          <template #title>推荐达人申请审核</template>
        </el-menu-item>

        <el-menu-item index="/orders">
          <el-icon><Document /></el-icon>
          <template #title>工单管理</template>
        </el-menu-item>

        <el-menu-item index="/orders/non-five-star">
          <el-icon><Star /></el-icon>
          <template #title>非五星订单</template>
        </el-menu-item>

        <el-sub-menu index="/home-information" class="home-information-menu">
          <template #title><el-icon><Document /></el-icon><span>首页信息管理</span></template>
          <el-menu-item index="/home-information/electrician-home">电工之家</el-menu-item>
          <el-menu-item index="/home-information/safety-knowledge">用电安全知识</el-menu-item>
          <el-menu-item index="/home-information/notices">信息栏通知</el-menu-item>
          <el-menu-item index="/home-information/ads">广告维护</el-menu-item>
        </el-sub-menu>


        <el-menu-item index="/deposits">
          <el-icon><Wallet /></el-icon>
          <template #title>押金管理</template>
        </el-menu-item>

        <el-menu-item index="/system/time-period-fees">
          <el-icon><Clock /></el-icon>
          <template #title>时段计费配置</template>
        </el-menu-item>

        <el-sub-menu index="administrator-center">
          <template #title><el-icon><UserFilled /></el-icon><span>管理员中心</span></template>
          <el-menu-item index="/admins">管理员列表</el-menu-item>
          <el-menu-item v-if="testTools.wechatIdEditEnabled" index="/admins/wechat-id">微信ID修改</el-menu-item>
        </el-sub-menu>
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
            :aria-label="isNarrow ? '打开导航' : isCollapse ? '展开导航' : '收起导航'"
            :aria-expanded="isNarrow ? mobileMenuOpen : !isCollapse"
          >
            <el-icon><Expand v-if="isCollapse" /><Fold v-else /></el-icon>
          </el-button>
          
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="parentTitle" :to="parentPath ? { path: parentPath } : undefined">{{ parentTitle }}</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <!-- 待办通知 -->
          <el-dropdown trigger="click" @command="handleTodoCommand" @visible-change="visible => visible && loadTodoCounts()">
            <button type="button" class="todo-trigger" aria-label="查看待办通知">
              <el-badge :value="todoCounts.total" :max="99" :hidden="todoCounts.total === 0">
                <el-icon :size="20"><Bell /></el-icon>
              </el-badge>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="enterpriseNew">
                  <span>企业新认证</span>
                  <el-badge :value="todoCounts.enterpriseNewCertifications" :hidden="!todoCounts.enterpriseNewCertifications" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="enterpriseChange">
                  <span>企业信息变更</span>
                  <el-badge :value="todoCounts.enterpriseInfoChanges" :hidden="!todoCounts.enterpriseInfoChanges" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="depositRefund">
                  <span>押金退款申请</span>
                  <el-badge :value="todoCounts.depositRefunds" :hidden="!todoCounts.depositRefunds" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="electricianNew">
                  <span>电工新认证</span>
                  <el-badge :value="todoCounts.electricianNewCertifications" :hidden="!todoCounts.electricianNewCertifications" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="electricianChange">
                  <span>电工信息变更</span>
                  <el-badge :value="todoCounts.electricianInfoChanges" :hidden="!todoCounts.electricianInfoChanges" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="regionChange">
                  <span>区域变更申请</span>
                  <el-badge :value="todoCounts.regionChanges" :hidden="!todoCounts.regionChanges" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="regionAddition">
                  <span>新增区域申请</span>
                  <el-badge :value="todoCounts.regionAdditions" :hidden="!todoCounts.regionAdditions" class="item-badge" />
                </el-dropdown-item>
                <el-dropdown-item command="unfreeze">
                  <span>解冻申请</span>
                  <el-badge :value="todoCounts.unfreezeApplications" :hidden="!todoCounts.unfreezeApplications" class="item-badge" />
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-dropdown @command="handleCommand">
            <button type="button" class="user-info" aria-label="管理员账号菜单">
              <el-avatar :size="32" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="username">{{ authStore.adminInfo?.real_name || '管理员' }}</span>
              <el-icon class="arrow-down"><ArrowDown /></el-icon>
            </button>
            
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">
                  <el-icon><Lock /></el-icon>
                  修改密码
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
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTestToolsStore } from '@/stores/testTools'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getTodoCounts } from '@/api/todo'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const testTools = useTestToolsStore()

const isCollapse = ref(false)
const isNarrow = ref(window.innerWidth < 900)
const mobileMenuOpen = ref(false)
const updateViewport = () => { isNarrow.value = window.innerWidth < 900; mobileMenuOpen.value = false }
watch(() => route.fullPath, () => { mobileMenuOpen.value = false })
const activeMenu = computed(() => /^\/partners\/\d+\/stats$/.test(route.path) ? '/partners' : route.path)
const openedMenus = computed(() => route.path.startsWith('/visit-statistics') ? ['visit-statistics'] : route.path.startsWith('/electricians') ? ['electrician-management'] : route.path.startsWith('/home-information') ? ['/home-information'] : route.path.startsWith('/admins') ? ['administrator-center'] : [])
const parentTitle = computed(() => route.path.startsWith('/electricians/') ? '电工管理' : route.path.startsWith('/home-information/') ? '首页信息管理' : route.path.startsWith('/admins') ? '管理员中心' : /^\/partners\/\d+\/stats$/.test(route.path) ? '合作伙伴管理' : '')
const parentPath = computed(() => parentTitle.value === '电工管理' ? '/electricians' : parentTitle.value === '管理员中心' ? '/admins' : parentTitle.value === '合作伙伴管理' ? '/partners' : '')

// 待办数量
const todoCounts = reactive({
  enterpriseNewCertifications: 0,
  enterpriseInfoChanges: 0,
  depositRefunds: 0,
  electricianNewCertifications: 0,
  electricianInfoChanges: 0,
  regionChanges: 0,
  regionAdditions: 0,
  unfreezeApplications: 0,
  get total() {
    return this.depositRefunds + this.electricianNewCertifications + this.electricianInfoChanges + this.regionChanges + this.unfreezeApplications + this.enterpriseNewCertifications + this.enterpriseInfoChanges + this.regionAdditions
  }
})

let todoTimer = null
let todoGeneration = 0
let todoActive = true

const loadTodoCounts = async () => {
  const generation = ++todoGeneration
  try {
    const res = await getTodoCounts()
    if (todoActive && generation === todoGeneration && res.code === 200) {
      todoCounts.enterpriseNewCertifications = res.data.enterpriseNewCertifications || 0
      todoCounts.enterpriseInfoChanges = res.data.enterpriseInfoChanges || 0
      todoCounts.depositRefunds = res.data.depositRefunds || 0
      todoCounts.electricianNewCertifications = res.data.electricianNewCertifications || 0
      todoCounts.electricianInfoChanges = res.data.electricianInfoChanges || 0
      todoCounts.regionChanges = res.data.regionChanges || 0
      todoCounts.regionAdditions = res.data.regionAdditions || 0
      todoCounts.unfreezeApplications = res.data.unfreezeApplications || 0
    }
  } catch (error) {
    console.error('获取待办数量失败:', error)
  }
}

const handleTodoCommand = (command) => {
  const routes = {
    enterpriseNew: '/enterprises?profileNotice=new_certification',
    enterpriseChange: '/enterprises?profileNotice=information_changed',
    depositRefund: '/deposits',
    electricianNew: '/electricians?profileNotice=new_certification',
    electricianChange: '/electricians?profileNotice=information_changed',
    regionChange: '/electricians/region-changes?operation=change&status=pending',
    regionAddition: '/electricians/region-changes?operation=add&status=pending',
    unfreeze: '/electricians?filter=unfreeze'
  }
  router.push(routes[command])
}

onMounted(() => {
  window.addEventListener('resize', updateViewport)
  testTools.refresh()
  window.addEventListener('enterprise-profile-viewed', loadTodoCounts)
  window.addEventListener('electrician-region-reviewed', loadTodoCounts)
  window.addEventListener('electrician-profile-viewed', loadTodoCounts)
  loadTodoCounts()
  todoTimer = setInterval(loadTodoCounts, 30000)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  todoActive = false
  todoGeneration++
  window.removeEventListener('enterprise-profile-viewed', loadTodoCounts)
  window.removeEventListener('electrician-region-reviewed', loadTodoCounts)
  window.removeEventListener('electrician-profile-viewed', loadTodoCounts)
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

const currentPageTitle = computed(() => route.path === '/admins' ? '管理员列表' : route.meta.title || '管理后台')

const toggleCollapse = () => {
  isCollapse.value = !(isCollapse && !isNarrow).value
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
.sidebar { background: var(--ops-sidebar); display: flex; flex-direction: column; flex-shrink: 0; transition: width .2s; overflow: hidden; }
.logo { height: 80px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 12px; border-bottom: 1px solid #233048; }
.logo-text { color: white; font-size: 16px; font-weight: 600; white-space: nowrap; }
.logo-icon-large, .logo-icon { color: #93b1f5; font-size: 24px; }
.sidebar-menu { border: 0; background: transparent; flex: 1; overflow-y: auto; overflow-x: hidden; padding: 16px 8px; --el-menu-bg-color: var(--ops-sidebar); --el-menu-text-color: #cbd5e1; --el-menu-hover-bg-color: #1e293b; --el-menu-active-color: #fff; --el-menu-item-height: 46px; }
.sidebar-menu :deep(.el-menu-item), .sidebar-menu :deep(.el-sub-menu__title) { border-radius: 6px; margin-bottom: 4px; }
.sidebar-menu :deep(.el-menu-item.is-active) { background: var(--ops-primary); color: white; }
.sidebar-menu :deep(.el-menu-item:hover), .sidebar-menu :deep(.el-sub-menu__title:hover) { background: #1e293b; color: white; }
.sidebar-menu :deep(.el-menu-item.is-active:hover) { background: var(--ops-primary-hover); }
.sidebar-menu :deep(.el-sub-menu .el-menu) { background: transparent; }
.sidebar-menu :deep(.el-sub-menu.is-active > .el-sub-menu__title) { color: white; }
.layout-header { background: white; height: 64px; flex-shrink: 0; border-bottom: 1px solid var(--ops-border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; gap: 16px; }
.header-left, .header-right { display: flex; align-items: center; gap: 16px; min-width: 0; }
.header-left :deep(.el-breadcrumb) { display: flex; flex-wrap: wrap; gap: 4px 0; line-height: 1.5; }
.collapse-btn { font-size: 20px; color: var(--ops-muted); min-width: 36px; }
.todo-trigger, .user-info { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; min-height: 40px; border: 0; border-radius: 6px; color: var(--ops-muted); background: transparent; cursor: pointer; }
.todo-trigger:hover, .user-info:hover { background: var(--ops-bg); }
.user-avatar { background: var(--ops-primary-soft); color: var(--ops-primary); }
.username { color: var(--ops-text); font-size: 14px; white-space: nowrap; }
.arrow-down { font-size: 12px; }
.item-badge { margin-left: 8px; }
.nav-backdrop { position: fixed; inset: 0; z-index: 1999; border: none; background: rgb(15 23 42 / 45%); }
@media (max-width: 899px) {
 .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 2000; transform: translateX(-100%); transition: transform .2s; }
 .nav-open .sidebar { transform: translateX(0); }
 .layout-header { padding: 0 16px; }
 .header-left, .header-right { gap: 8px; }
 .username { display: none; }
 .collapse-btn, .todo-trigger, .user-info { min-height: 44px; min-width: 44px; }
}
</style>
