<template>
  <div class="time-period-fees-page">
    <div class="page-card">
      <!-- 页面标题 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>时段计费配置</h2>
        </div>
        <div class="right">
          <el-button type="primary" @click="loadData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <el-alert
        title="配置说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        时段上门费根据用户下单时间自动计算。白天时段 08:00-17:00 上门费 20 元，晚间时段 17:00-22:00 上门费 50 元，夜间时段 22:00-次日 05:00 上门费 80 元。
      </el-alert>

      <!-- 时段费率表格 -->
      <el-table
        v-loading="loading"
        :data="feeList"
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="period_name" label="时段名称" width="150">
          <template #default="{ row }">
            <el-tag :type="getPeriodTagType(row.period_key)">
              {{ row.period_name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="time_range" label="时间段" width="180">
          <template #default="{ row }">
            {{ row.time_range }}
          </template>
        </el-table-column>
        <el-table-column label="上门费（元）" width="180">
          <template #default="{ row }">
            <div v-if="!row.editing">
              <span class="amount-display">¥{{ row.amount }}</span>
              <el-button
                type="primary"
                link
                size="small"
                @click="startEdit(row)"
                style="margin-left: 10px;"
              >
                编辑
              </el-button>
            </div>
            <div v-else>
              <el-input-number
                v-model="row.editAmount"
                :precision="2"
                :min="0"
                :max="9999"
                size="small"
                style="width: 120px;"
              />
              <el-button
                type="success"
                size="small"
                @click="saveEdit(row)"
                :loading="row.saving"
                style="margin-left: 5px;"
              >
                保存
              </el-button>
              <el-button
                size="small"
                @click="cancelEdit(row)"
              >
                取消
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="最后更新时间" width="180">
          <template #default="{ row }">
            {{ row.updated_at ? formatDate(row.updated_at) : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTimePeriodFees, updateTimePeriodFee } from '@/api/system'

const loading = ref(false)
const feeList = ref([])

const getPeriodTagType = (periodKey) => {
  const types = {
    day: '',
    evening: 'warning',
    night: 'danger'
  }
  return types[periodKey] || ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await getTimePeriodFees()
    if (res.code === 200) {
      feeList.value = (res.data.fees || []).map(fee => ({
        ...fee,
        editing: false,
        editAmount: fee.amount,
        saving: false
      }))
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (error) {
    console.error('加载时段费率失败:', error)
    ElMessage.error('加载时段费率失败')
  } finally {
    loading.value = false
  }
}

const startEdit = (row) => {
  row.editAmount = row.amount
  row.editing = true
}

const cancelEdit = (row) => {
  row.editing = false
  row.editAmount = row.amount
}

const saveEdit = async (row) => {
  if (row.editAmount === row.amount) {
    row.editing = false
    return
  }

  row.saving = true
  try {
    const res = await updateTimePeriodFee(row.id, { amount: row.editAmount })
    if (res.code === 200) {
      row.amount = row.editAmount
      row.editing = false
      ElMessage.success('更新成功')
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } catch (error) {
    console.error('更新时段费率失败:', error)
    ElMessage.error('更新时段费率失败')
  } finally {
    row.saving = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.time-period-fees-page {
  padding: 20px;
}

.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-toolbar .left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.table-toolbar .left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.table-toolbar .right {
  display: flex;
  gap: 10px;
}

.amount-display {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}

.transaction-id {
  font-family: monospace;
  font-size: 12px;
}
</style>
