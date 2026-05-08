<template>
  <div class="page">
    <van-nav-bar title="电工认证审核" />

    <!-- 搜索栏 -->
    <van-search
      v-model="keyword"
      placeholder="搜索姓名或手机号"
      @search="onSearch"
      @clear="onSearch"
    />

    <!-- 状态筛选标签 -->
    <van-tabs v-model:active="activeTab" @change="onTabChange" sticky>
      <van-tab title="全部" name="" />
      <van-tab title="待审核" name="pending" />
      <van-tab title="已通过" name="approved" />
      <van-tab title="已驳回" name="rejected" />
    </van-tabs>

    <!-- 列表 -->
    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
      :immediate-check="false"
    >
      <div v-for="item in list" :key="item.id" class="card" @click="goDetail(item)">
        <div class="card-header">
          <div class="card-header-left">
            <span class="name">{{ item.real_name || '未填写' }}</span>
            <van-tag :type="statusTagType(item.status)" size="medium">
              {{ statusText(item.status) }}
            </van-tag>
          </div>
          <van-icon name="arrow" color="#999" />
        </div>

        <div class="card-body">
          <div class="info-row">
            <span class="label">服务电话：</span>
            <span>{{ item.service_phone || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">服务区域：</span>
            <span>{{ [item.province, item.city, item.district].filter(Boolean).join(' ') || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">申请时间：</span>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
        </div>

        <div class="card-actions">
          <van-button
            v-if="item.status === 'pending'"
            type="primary"
            size="small"
            round
            @click.stop="goDetail(item)"
          >
            审核
          </van-button>
          <van-button
            v-if="item.status === 'approved' && item.user_status !== 'banned'"
            type="warning"
            size="small"
            round
            @click.stop="handleBan(item)"
          >
            冻结
          </van-button>
          <van-button
            v-if="item.user_status === 'banned'"
            type="success"
            size="small"
            round
            @click.stop="handleUnban(item)"
          >
            解冻
          </van-button>
          <van-button size="small" round @click.stop="goDetail(item)">
            详情
          </van-button>
        </div>
      </div>

      <div v-if="!loading && !finished && list.length === 0" class="empty-state">
        <van-icon name="info-o" size="48" color="#ccc" />
        <p>暂无数据</p>
      </div>
    </van-list>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getElectricianList, banElectrician, unbanElectrician } from '../api/electricians'

const router = useRouter()

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const keyword = ref('')
const activeTab = ref('')
const pagination = ref({ page: 1, limit: 20, total: 0 })

function statusTagType(status) {
  return { pending: 'warning', approved: 'success', rejected: 'danger' }[status] || 'default'
}

function statusText(status) {
  return { pending: '待审核', approved: '已通过', rejected: '已驳回' }[status] || '未知'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchList() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      keyword: keyword.value,
      status: activeTab.value
    }

    const res = await getElectricianList(params)
    if (res.code === 200) {
      const newList = res.data.list || []
      list.value = pagination.value.page === 1 ? newList : [...list.value, ...newList]
      pagination.value.total = res.data.total || 0
      finished.value = list.value.length >= pagination.value.total
    } else {
      showToast(res.message || '加载失败')
    }
  } catch {
    showToast('网络错误')
  } finally {
    loading.value = false
  }
}

function onLoad() {
  if (!finished.value) {
    pagination.value.page++
    fetchList()
  }
}

function onSearch() {
  pagination.value.page = 1
  finished.value = false
  list.value = []
  fetchList()
}

function onTabChange() {
  pagination.value.page = 1
  finished.value = false
  list.value = []
  fetchList()
}

function goDetail(item) {
  router.push({ path: '/electrician-detail', query: { id: item.id } })
}

async function handleBan(item) {
  try {
    await showConfirmDialog({ title: '提示', message: `确定要冻结电工 ${item.real_name} 吗？` })
    const res = await banElectrician(item.id)
    if (res.code === 200) {
      showToast('已冻结')
      item.user_status = 'banned'
    }
  } catch {
    // user cancelled
  }
}

async function handleUnban(item) {
  try {
    await showConfirmDialog({ title: '提示', message: `确定要解冻电工 ${item.real_name} 吗？` })
    const res = await unbanElectrician(item.id)
    if (res.code === 200) {
      showToast('已解冻')
      item.user_status = 'active'
    }
  } catch {
    // user cancelled
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}

.card {
  background: #fff;
  margin: 8px 12px;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.card-body {
  font-size: 13px;
  color: #666;
  line-height: 1.8;
}

.info-row .label {
  color: #999;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: #999;
}
</style>
