<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-kicker">运营管理中心</div>
      <div class="login-header">
        <div class="logo">
          <el-icon class="logo-icon"><Tools /></el-icon>
          <h1 class="title">电工维修平台</h1>
        </div>
        <p class="subtitle">管理后台</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username" label="管理员账号">
          <el-input
            v-model="loginForm.username"
            autocomplete="username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="password" label="登录密码">
          <el-input
            v-model="loginForm.password"
            autocomplete="current-password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="authStore.loading"
            @click="handleLogin"
          >
            {{ authStore.loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
    
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const loginFormRef = ref()

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return
    
    const result = await authStore.login(loginForm)
    if (result.success) {
      ElMessage.success('登录成功')
      router.push('/')
    } else {
      ElMessage.error(result.message || '登录失败')
    }
  } catch (error) {
    console.error('登录错误:', error)
  }
}
</script>

<style scoped>
.login-container { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 32px 20px; background: var(--ops-bg); }
.login-box { width: 440px; max-width: 100%; padding: 40px; background: white; border: 1px solid var(--ops-border); border-radius: 16px; box-shadow: 0 16px 48px rgb(15 23 42 / 6%); }
.login-kicker { color: var(--ops-primary); font-size: 13px; font-weight: 600; margin-bottom: 24px; }
.logo { display: flex; align-items: center; gap: 12px; }
.logo-icon { background: var(--ops-primary-soft); color: var(--ops-primary); border-radius: 10px; padding: 10px; box-sizing: content-box; font-size: 28px; }
.title { font-size: 24px; font-weight: 600; color: var(--ops-text); }
.subtitle { font-size: 14px; color: var(--ops-muted); margin: 12px 0 32px; }
.login-form :deep(.el-form-item__label) { color: var(--ops-text); font-weight: 500; }
.login-btn { width: 100%; height: 44px; margin-top: 12px; }
@media (max-width: 480px) { .login-box { padding: 28px 24px; } }
</style>
