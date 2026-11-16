<template>
  <div class="referrers-page">
    <div class="page-card">
      <!-- 页面标题和搜索栏 -->
      <header class="page-heading"><h2>推荐达人管理</h2></header>
      <div class="table-toolbar">
        <div class="left">

          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索用户昵称或手机号"
            style="width: 280px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
      </div>

      <!-- 推荐达人列表表格 -->
      <LoadFeedback :message="listError" :loading="loading" @retry="loadList" />
      <el-table :empty-text="loading ? '正在加载…' : listError ? '读取失败，请重新加载' : (Object.values(searchForm).some(value => value !== '' && value != null && (!Array.isArray(value) || value.length))) ? '未找到符合条件的数据' : '暂无数据'"
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="nickname" label="用户昵称" min-width="140" />
        <el-table-column show-overflow-tooltip prop="phone" label="手机号" width="130" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '活跃' : '已冻结' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="activatedAt" label="激活日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.activatedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalCommission" label="累计佣金" width="120" align="right">
          <template #default="{ row }">
            ¥{{ Number(row.totalCommission || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'active'"
              type="warning"
              size="small"
              @click="handleFreeze(row)"
            >
              <el-icon><Lock /></el-icon>
              冻结
            </el-button>
            <span v-else style="color: #999">-</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import LoadFeedback from '@/components/LoadFeedback.vue'
const listError = ref('')
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Lock } from '@element-plus/icons-vue'
import { getReferrerList, freezeReferrer } from '@/api/referrers'

// ===== 列表相关 =====
const loading = ref(false)
const tableData = ref([])

const searchForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const loadList = async () => {
  loading.value = true; listError.value = ''
  try {
    const res = await getReferrerList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword
    })
    if (res.code === 200) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    listError.value = tableData.value.length ? '刷新失败，当前显示上次加载的数据' : '列表加载失败，请重新加载'
    console.error('加载推荐达人列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadList()
}

const handleReset = () => {
  searchForm.keyword = ''
  handleSearch()
}

// ===== 冻结 =====
const handleFreeze = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要冻结推荐达人「${row.nickname}」吗？冻结后该用户不再享有推荐达人权限。`,
      '冻结确认',
      {
        confirmButtonText: '确定冻结',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await freezeReferrer(row.id)
    if (res.code === 200) {
      ElMessage.success('冻结成功')
      loadList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('冻结推荐达人失败:', error)
    }
  }
}

// ===== 工具方法 =====
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.referrers-page {
  height: 100%;
}

</style>
