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
      <van-tab title="待补充资料" name="pending" />
      <van-tab title="区域变更待审核" name="region_change_pending" />
      <van-tab title="新增区域待审核" name="region_add_pending" />
      <van-tab title="已通过" name="approved" />
      <van-tab title="未通过" name="rejected" />
    </van-tabs>

    <LoadFeedback :message="loadError" :loading="loading" @retry="fetchList" />
    <!-- 列表 -->
    <van-list
      v-model:loading="loading"
      :finished="finished"
      :error="!!loadError"
      error-text="加载失败，请点击上方重新加载"
      finished-text="没有更多了"
      @load="onLoad"
      :immediate-check="false"
    >
      <div v-for="item in list" :key="item.id" class="card" @click="goDetail(item)">
        <div class="card-header">
          <div class="card-header-left">
            <span class="name">{{ item.real_name || '未填写' }}</span>
            <van-tag v-if="item.profileChangeType" :type="item.profileNoticePending ? 'warning' : 'default'">{{ profileTypeText(item.profileChangeType) }}{{ item.profileNoticePending ? ' · 未查看' : '' }}</van-tag>
            <van-tag :type="statusTagType(item)" size="medium">
              {{ item.status_text || statusText(item.status) }}
            </van-tag>
            <van-tag v-if="item.pending_region_request?.operation === 'add'" type="warning">新增区域待审核</van-tag>
          </div>
          <van-icon name="arrow" color="#999" />
        </div>

        <div class="card-body">
          <div class="info-row"><span class="label">认证／变更：</span><span>{{ profileTime(item.profileChangeTime) }}</span></div>
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
          <div class="info-row">
            <span class="label">开始从业：</span>
            <span>{{ item.career_started_month || '未填写' }}</span>
          </div>
          <div class="info-row">
            <span class="label">从业年限：</span>
            <span>{{ item.career_years == null ? '未填写' : item.career_years + ' 年' }}</span>
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
          <van-button type="primary" plain size="small" round @click.stop="goDetail(item)">
            详情
          </van-button>
        </div>
      </div>

      <div v-if="!loading && !loadError && finished && list.length === 0" class="empty-state">
        <van-icon name="info-o" size="48" color="#ccc" />
        <p>暂无数据</p>
      </div>
    </van-list>
  </div>
</template>

<script setup>
import LoadFeedback from '../../components/LoadFeedback.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { profileTypeText, profileTime } from '../../utils/electricianProfileNotice'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getElectricianList, banElectrician, unbanElectrician } from '../api/electricians'

const router = useRouter()

const list = ref([])
const loadError = ref('')
let retryPage = null
const loading = ref(false)
const finished = ref(false)
const keyword = ref('')
const activeTab = ref('')
const pagination = ref({ page: 1, limit: 20, total: 0 })
let pageActive = true, listRequest = 0

function statusTagType(record) {
  if (['待补充资料', '区域变更待审核'].includes(record.status_text)) return 'warning'
  return { pending: 'warning', approved: 'success', rejected: 'danger' }[record.status] || 'default'
}

function statusText(status) {
  return { pending: '待补充资料', approved: '已通过', rejected: '未通过' }[status] || '未知'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchList() {
  const request = ++listRequest, page = pagination.value.page
  loading.value = true; loadError.value = ''
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      keyword: keyword.value,
      status: activeTab.value
    }

    const res = await getElectricianList(params)
    if (!pageActive || request !== listRequest) return
    if (res.code === 200) {
      retryPage = null
      const newList = res.data.list || []
      list.value = page === 1 ? newList : [...list.value, ...newList]
      pagination.value.total = res.data.total || 0
      finished.value = list.value.length >= pagination.value.total
    } else {
      showToast(res.message || '加载失败')
    }
  } catch {
    if (pageActive && request === listRequest) { loadError.value = '列表加载失败，请重新加载'; retryPage = page }
  } finally {
    if (pageActive && request === listRequest) loading.value = false
  }
}

function onLoad() {
  if (!finished.value) {
    if (retryPage != null) pagination.value.page = retryPage
    else pagination.value.page++
    fetchList()
  }
}

function onSearch() {
  retryPage = null
  pagination.value.page = 1
  finished.value = false
  list.value = []
  fetchList()
}

function onTabChange() {
  retryPage = null
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
onUnmounted(() => { pageActive = false; listRequest++ })
</script>

<style scoped>
.card { background: white; margin: 12px 16px; border: 1px solid var(--ops-border); border-radius: 10px; padding: 16px; box-shadow: var(--ops-shadow); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.card-header-left { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
.name { width: 100%; font-size: 18px; font-weight: 600; overflow-wrap: anywhere; color: var(--ops-text); margin-bottom: 4px; }
.card-body { display: grid; gap: 7px; }
.info-row { display: flex; gap: 8px; font-size: 13px; line-height: 1.6; }
.info-row > :last-child { min-width: 0; overflow-wrap: anywhere; }
.label { flex: 0 0 78px; color: var(--ops-muted); }
.card-actions { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--ops-border); padding-top: 12px; margin-top: 16px; }
.empty-state { padding: 48px 24px; text-align: center; color: var(--ops-muted); }
</style>
