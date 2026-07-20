<template>
  <div class="partners-page">
    <div class="page-card">
      <!-- 页面标题和搜索栏 -->
      <div class="table-toolbar">
        <div class="left">
          <h2>合作伙伴管理</h2>
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索姓名或工号"
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
        <div class="right">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增合作伙伴
          </el-button>
          <el-button @click="openRecalculate">
            <el-icon><Refresh /></el-icon>
            手动补算
          </el-button>
        </div>
      </div>

      <!-- 合作伙伴列表表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="workNo" label="工号" width="120" />
        <el-table-column label="负责区域" min-width="260">
          <template #default="{ row }">
            <el-tag
              v-for="(area, i) in row.areas"
              :key="i"
              size="small"
              style="margin: 2px 4px 2px 0"
            >
              {{ area.province }} {{ area.city }} {{ area.district }}
            </el-tag>
            <span v-if="!row.areas || row.areas.length === 0" style="color: #999">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="commissionRate" label="提成比例" width="100" align="center">
          <template #default="{ row }">
            {{ row.commissionRate }}%
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '活跃' : '已冻结' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              修改
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="$router.push(`/partners/${row.id}/stats`)"
            >
              <el-icon><DataAnalysis /></el-icon>
              统计
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              type="warning"
              size="small"
              @click="handleFreeze(row)"
            >
              <el-icon><Lock /></el-icon>
              冻结
            </el-button>
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

    <!-- 新增/修改合作伙伴弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <!-- 电工选择器 -->
        <el-form-item label="选择电工" prop="electricianId">
          <el-select
            v-model="form.electricianId"
            filterable
            remote
            reserve-keyword
            placeholder="搜索电工姓名或工号"
            :remote-method="handleElectricianSearch"
            :loading="electricianLoading"
            clearable
            style="width: 100%"
            @change="handleElectricianChange"
          >
            <el-option
              v-for="item in electricianOptions"
              :key="item.id"
              :label="`${item.name} (工号: ${item.workNo || '暂无'})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <!-- 负责区域（提成比例固定 3%） -->
        <el-form-item label="负责区域" prop="areas">
          <div class="area-manager">
            <!-- 已添加的区域列表 -->
            <div v-for="(area, i) in form.areas" :key="i" class="area-row">
              <el-select
                v-model="area.province"
                placeholder="省"
                style="width: 160px"
                @change="(v) => handleProvinceChange(i, v)"
              >
                <el-option v-for="p in provinceOptions" :key="p.code" :label="p.name" :value="p.name" />
              </el-select>
              <el-select
                v-model="area.city"
                placeholder="市"
                style="width: 160px"
                :disabled="!area.province"
                @change="(v) => handleCityChange(i, v)"
              >
                <el-option v-for="c in areaCityOptions[i]" :key="c.code" :label="c.name" :value="c.name" />
              </el-select>
              <el-select
                v-model="area.district"
                placeholder="区县"
                style="width: 160px"
                :disabled="!area.city"
              >
                <el-option v-for="d in areaDistrictOptions[i]" :key="d.code" :label="d.name" :value="d.name" />
              </el-select>
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="removeArea(i)"
                :disabled="form.areas.length <= 1"
              />
            </div>
            <el-button type="primary" link @click="addArea">
              <el-icon><Plus /></el-icon>
              添加区域
            </el-button>
          </div>
          <div style="margin-top: 8px; color: #909399; font-size: 13px;">
            提成比例：3%（固定）
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 手动补算弹窗 -->
    <el-dialog v-model="recalcVisible" title="手动补算" width="400px" :close-on-click-modal="false">
      <el-form :model="recalcForm" label-width="80px">
        <el-form-item label="统计月份">
          <el-input v-model="recalcForm.month" placeholder="如 202605，留空则补算上月" maxlength="6" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recalcVisible = false">取消</el-button>
        <el-button type="primary" :loading="recalcLoading" @click="handleRecalculate">开始补算</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Edit, Delete, Lock, DataAnalysis } from '@element-plus/icons-vue'
import {
  getPartnerList,
  createPartner,
  updatePartner,
  freezePartner,
  searchElectricians,
  getRegions,
  recalculatePartnerStats
} from '@/api/partners'

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
  loading.value = true
  try {
    const res = await getPartnerList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword
    })
    if (res.code === 200) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('加载合作伙伴列表失败:', error)
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

// ===== 新增/修改弹窗 =====
const dialogVisible = ref(false)
const dialogTitle = ref('新增合作伙伴')
const isEdit = ref(false)
const editId = ref(null)
const submitLoading = ref(false)
const formRef = ref(null)

const form = reactive({
  electricianId: null,
  areas: [{ province: '', city: '', district: '' }]
})

const formRules = {
  electricianId: [{ required: true, message: '请选择电工', trigger: 'change' }],
  areas: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('至少添加一个负责区域'))
          return
        }
        for (const area of value) {
          if (!area.province || !area.city || !area.district) {
            callback(new Error('请完善所有区域信息（省/市/区）'))
            return
          }
        }
        callback()
      },
      trigger: 'change'
    }
  ]
}

// 电工搜索
const electricianLoading = ref(false)
const electricianOptions = ref([])

const handleElectricianSearch = async (keyword) => {
  if (!keyword || keyword.trim() === '') {
    electricianOptions.value = []
    return
  }
  electricianLoading.value = true
  try {
    const res = await searchElectricians({ keyword: keyword.trim() })
    if (res.code === 200) {
      electricianOptions.value = res.data.list || []
    }
  } catch (error) {
    console.error('搜索电工失败:', error)
  } finally {
    electricianLoading.value = false
  }
}

const handleElectricianChange = (val) => {
  // 选中电工后的回调，可保留扩展
}

// 省市区选项（基于 regions 表）
const provinceOptions = ref([])                        // [{ code, name }]
const cityCache = ref({})                              // { parentCode: [{ code, name }] }
const districtCache = ref({})                          // { parentCode: [{ code, name }] }

const areaCityOptions = reactive({})                   // 每个区域行对应的城市选项
const areaDistrictOptions = reactive({})               // 每个区域行对应的区县选项

const loadAreaOptions = async () => {
  try {
    const res = await getRegions({ level: 1 })
    if (res.code === 200) {
      provinceOptions.value = res.data.list || []
    }
  } catch (error) {
    console.error('加载省份选项失败:', error)
  }
}

const loadCityOptions = async (parentCode) => {
  if (!parentCode) return []
  if (cityCache.value[parentCode]) return cityCache.value[parentCode]
  try {
    const res = await getRegions({ level: 2, parentCode })
    if (res.code === 200) {
      const cities = res.data.list || []
      cityCache.value[parentCode] = cities
      return cities
    }
  } catch (error) {
    console.error('加载城市选项失败:', error)
  }
  return []
}

const loadDistrictOptions = async (parentCode) => {
  if (!parentCode) return []
  if (districtCache.value[parentCode]) return districtCache.value[parentCode]
  try {
    const res = await getRegions({ level: 3, parentCode })
    if (res.code === 200) {
      const districts = res.data.list || []
      districtCache.value[parentCode] = districts
      return districts
    }
  } catch (error) {
    console.error('加载区县选项失败:', error)
  }
  return []
}

const findCodeByName = (options, name) => {
  const found = (options || []).find(o => o.name === name)
  return found ? found.code : null
}

const handleProvinceChange = async (index, selectedName) => {
  form.areas[index].city = ''
  form.areas[index].district = ''
  areaCityOptions[index] = []
  areaDistrictOptions[index] = []
  if (selectedName) {
    const code = findCodeByName(provinceOptions.value, selectedName)
    areaCityOptions[index] = await loadCityOptions(code)
  }
}

const handleCityChange = async (index, selectedName) => {
  form.areas[index].district = ''
  areaDistrictOptions[index] = []
  if (selectedName) {
    const code = findCodeByName(areaCityOptions[index], selectedName)
    areaDistrictOptions[index] = await loadDistrictOptions(code)
  }
}

const addArea = () => {
  form.areas.push({ province: '', city: '', district: '' })
}

const removeArea = (index) => {
  form.areas.splice(index, 1)
}

const handleAdd = () => {
  isEdit.value = false
  editId.value = null
  dialogTitle.value = '新增合作伙伴'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  isEdit.value = true
  editId.value = row.id
  dialogTitle.value = '修改合作伙伴'

  // 预填表单数据
  form.electricianId = row.electricianId

  // 预填区域
  if (row.areas && row.areas.length > 0) {
    form.areas = row.areas.map(a => ({ ...a }))
    // 为每个区域加载城市和区县选项
    for (let i = 0; i < form.areas.length; i++) {
      const area = form.areas[i]
      const provCode = findCodeByName(provinceOptions.value, area.province)
      areaCityOptions[i] = await loadCityOptions(provCode)
      const cityCode = findCodeByName(areaCityOptions[i], area.city)
      areaDistrictOptions[i] = await loadDistrictOptions(cityCode)
    }
  } else {
    form.areas = [{ province: '', city: '', district: '' }]
  }

  // 预填电工选择器显示
  electricianOptions.value = [{
    id: row.electricianId,
    name: row.name,
    workNo: row.workNo
  }]

  dialogVisible.value = true
}

const resetForm = () => {
  form.electricianId = null
  form.areas = [{ province: '', city: '', district: '' }]
  electricianOptions.value = []
  // 清理所有动态选项
  Object.keys(areaCityOptions).forEach(k => delete areaCityOptions[k])
  Object.keys(areaDistrictOptions).forEach(k => delete areaDistrictOptions[k])
  formRef.value?.resetFields()
}

const handleDialogClose = () => {
  resetForm()
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      const payload = {
        electricianId: form.electricianId,
        areas: form.areas.map(a => ({
          province: a.province,
          city: a.city,
          district: a.district
        }))
      }

      let res
      if (isEdit.value) {
        res = await updatePartner(editId.value, payload)
      } else {
        res = await createPartner(payload)
      }

      if (res.code === 200) {
        ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
        dialogVisible.value = false
        loadList()
      }
    } catch (error) {
      console.error('提交合作伙伴失败:', error)
    } finally {
      submitLoading.value = false
    }
  })
}

// ===== 冻结 =====
const handleFreeze = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要冻结合作伙伴「${row.name}」吗？冻结后小程序不再展示合作伙伴入口，但不影响该电工的账号状态。`,
      '冻结确认',
      {
        confirmButtonText: '确定冻结',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await freezePartner(row.id)
    if (res.code === 200) {
      ElMessage.success('冻结成功')
      loadList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('冻结合作伙伴失败:', error)
    }
  }
}

// ===== 手动补算 =====
const recalcVisible = ref(false)
const recalcLoading = ref(false)
const recalcForm = reactive({ month: '' })

const openRecalculate = () => {
  recalcForm.month = ''
  recalcVisible.value = true
}

const handleRecalculate = async () => {
  recalcLoading.value = true
  try {
    const res = await recalculatePartnerStats({ month: recalcForm.month || undefined })
    if (res.code === 200) {
      ElMessage.success(`补算完成，处理 ${res.data.processedCount} 条记录`)
      recalcVisible.value = false
    }
  } catch (error) {
    console.error('补算失败:', error)
  } finally {
    recalcLoading.value = false
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
  loadAreaOptions()
})
</script>

<style scoped>
.partners-page {
  height: 100%;
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
  flex-wrap: wrap;
  gap: 12px;
}

.table-toolbar .left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.table-toolbar .left h2 {
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
}

.table-toolbar .right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.area-manager {
  width: 100%;
}

.area-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
