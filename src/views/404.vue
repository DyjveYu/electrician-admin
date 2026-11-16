<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <div class="error-message">页面不存在</div>
      <div class="error-description">
        抱歉，您访问的页面不存在或已被删除
      </div>
      <div class="error-actions">
        <el-button type="primary" @click="goHome">
          <el-icon><House /></el-icon>
          返回首页
        </el-button>
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回上页
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<style scoped>
.not-found-page { min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: var(--ops-bg); }
.not-found-content { text-align: center; max-width: 100%; }
.error-code { color: var(--ops-primary); font-size: clamp(80px, 12vw, 120px); line-height: 1.3; font-weight: 600; }
.error-message { font-size: 24px; font-weight: 600; margin: 16px 0; }
.error-description { color: var(--ops-muted); margin-bottom: 32px; }
.error-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
</style>
