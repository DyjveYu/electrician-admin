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
          label="账号"
          placeholder="请输入管理员账号"
          :rules="[{ required: true, message: '请输入账号' }]"
          clearable
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
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
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 32px 0;
}

.login-header {
  text-align: center;
  margin-bottom: 48px;
}

.title {
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0;
}

.login-form {
  width: 100%;
  max-width: 360px;
}

.login-btn-wrapper {
  margin-top: 32px;
  padding: 0 16px;
}

.error-msg {
  color: #ff6b6b;
  text-align: center;
  font-size: 14px;
  margin-top: 16px;
}
</style>
