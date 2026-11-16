<template>
  <div class="page-card">
    <div class="region-toolbar">
      <h2>区域变更审核</h2>
      <el-select v-model="operation" aria-label="区域申请类型" style="width: 150px" @change="filterChanged">
        <el-option label="全部类型" value="" />
        <el-option label="变更区域" value="change" />
        <el-option label="新增区域" value="add" />
      </el-select>
      <el-select v-model="status" aria-label="申请状态" style="width: 160px" @change="filterChanged">
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
        <el-option label="全部" value="" />
      </el-select>
      <el-button @click="loadList">刷新</el-button>
    </div>
    <LoadFeedback :message="listError" :loading="loading" @retry="loadList" />
    <el-table :empty-text="loading ? '正在加载…' : listError ? '读取失败，请重新加载' : '暂无数据'" v-loading="loading" :data="rows" row-key="id" empty-text="暂无区域变更记录">
      <el-table-column label="申请类型" width="110">
        <template #default="{ row }">{{ row.operation === 'add' ? '新增区域' : '变更区域' }}</template>
      </el-table-column>
      <el-table-column label="电工" min-width="120">
        <template #default="{ row }">{{ row.certification?.real_name || row.user_id }}</template>
      </el-table-column>
      <el-table-column label="原区域" min-width="180">
        <template #default="{ row }">{{ row.old_province }}{{ row.old_city }}{{ row.old_district }}</template>
      </el-table-column>
      <el-table-column label="目标区域" min-width="180">
        <template #default="{ row }">{{ row.province }}{{ row.city }}{{ row.district }}</template>
      </el-table-column>
      <el-table-column label="状态" min-width="150">
        <template #default="{ row }">{{ row.operation === 'add' && row.status === 'pending' ? '新增区域待审核' : (row.source === 'self' ? '信息自行变更' : statusLabels[row.status]) }}</template>
      </el-table-column>
      <el-table-column label="提交时间" min-width="170">
        <template #default="{ row }">{{ formatTime(row.submitted_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90">
        <template #default="{ row }"><el-button link type="primary" @click="openDetail(row.id)">查看</el-button></template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" :page-size="20"
      layout="total, prev, pager, next" @current-change="loadList" />

    <RegionChangeReview v-model="detailVisible" :change-id="selectedId" :api="regionReviewApi" @reviewed="loadList" />
  </div>
</template>

<script setup>
import LoadFeedback from '@/components/LoadFeedback.vue'
import { onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import RegionChangeReview from '@/components/RegionChangeReview.vue'
import * as regionReviewApi from '@/api/electricians'
import { getRegionChanges } from '@/api/electricians'
const statusLabels = { pending: '区域变更待审核', approved: '审核通过', rejected: '审核拒绝' }
const route = useRoute()
const status = ref('pending')
const operation = ref('')
const page = ref(1)
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const listError = ref('')
const detailVisible = ref(false)
const selectedId = ref(null)
let listRequest = 0
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '未记录'
async function loadList() {
  const request = ++listRequest
  loading.value = true
  listError.value = ''
  try {
    const { data } = await getRegionChanges({ status: status.value || undefined, operation: operation.value || undefined, page: page.value, limit: 20 })
    if (request !== listRequest) return
    rows.value = data.list
    total.value = data.total
  } catch {
    if (request === listRequest) listError.value = '列表加载失败，请刷新重试'
  } finally {
    if (request === listRequest) loading.value = false
  }
}
function filterChanged() { page.value = 1; loadList() }
function openDetail(id) {
  selectedId.value = id
  detailVisible.value = true
}
watch(() => [route.query.operation, route.query.status], ([type, state]) => {
  operation.value = ['change', 'add'].includes(type) ? type : ''
  status.value = ['pending', 'approved', 'rejected'].includes(state) ? state : 'pending'
  page.value = 1
  loadList()
}, { immediate: true })
onUnmounted(() => { listRequest += 1 })
</script>

<style scoped>
.region-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }

.el-pagination { margin-top: 20px; }
</style>
