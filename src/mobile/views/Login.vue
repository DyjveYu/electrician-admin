<template>
  <div class="login-page">
    <div class="login-header">
      <h1 class="title">电工维修平台</h1>
      <p class="subtitle">管理员认证审核</p>
    </div>

    <van-form @submit="handleLogin" class="login-form">
      <van-cell-group inset>
        <van-field
          v-model="form.username"
          name="username"
          autocomplete="username"
          label="账号"
          placeholder="请输入管理员账号"
          :rules="[{ required: true, message: '请输入账号' }]"
          clearable
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          autocomplete="current-password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
      </van-cell-group>

      <div class="login-btn-wrapper">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          :loading="submitting"
        >
          登录
        </van-button>
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </van-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { login, checkAuth } from '../utils/auth'

const router = useRouter()

const form = reactive({
  username: '',
  password: ''
})

const submitting = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  submitting.value = true
  errorMsg.value = ''

  const result = await login(form.username, form.password)
  submitting.value = false

  if (result.success) {
    router.push('/')
  } else {
    errorMsg.value = result.message
  }
}

onMounted(() => {
  if (checkAuth()) {
    router.replace('/')
  }
})
</script>

<style scoped>
.login-page { min-height: 100dvh; display: flex; flex-direction: column; justify-content: center; padding: 32px 20px; background: var(--ops-bg); }
.login-header { padding: 0 12px; margin-bottom: 32px; }
.title { color: var(--ops-text); font-size: 26px; font-weight: 600; margin: 0 0 8px; }
.subtitle { color: var(--ops-muted); font-size: 14px; margin: 0; }
.login-form { background: white; border: 1px solid var(--ops-border); border-radius: 12px; padding: 24px 0; box-shadow: var(--ops-shadow); }
.login-btn-wrapper { margin: 24px 16px 0; }
.error-msg { color: var(--ops-danger); font-size: 13px; margin: 12px 16px 0; }
</style>
