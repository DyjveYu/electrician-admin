<template>
  <div class="users-page">
    <div v-if="pageAllowed" class="page-card">
      <el-alert v-if="testOpenidMode" title="仅在测试环境可使用，严禁在生产环境使用" type="warning" :closable="false" show-icon class="test-warning" />
      <LoadFeedback :message="listError" :loading="loading" @retry="loadUserList" />
      <!-- 页面标题和操作栏 -->
      <header class="page-heading"><h2>{{ testOpenidMode ? '微信ID修改' : '用户管理' }}</h2></header>
      <div class="table-toolbar">
        <div class="left">

          <el-input
            v-model="searchForm.search"
            placeholder="搜索用户手机号或昵称"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="searchForm.status"
            placeholder="用户状态"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option label="正常" value="active" />
            <el-option label="冻结" value="banned" />
            <el-option v-if="testOpenidMode" label="已转电工" value="converted_to_electrician" />
          </el-select>

          <el-select
            v-model="searchForm.role"
            placeholder="用户角色"
            style="width: 120px"
            clearable
            @change="handleSearch"
          >
            <el-option label="普通用户" value="user" />
            <el-option label="电工" value="electrician" />
            <el-option label="企业" value="enterprise" />
          </el-select>

          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>

          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>

        <div v-if="!testOpenidMode" class="right">
          <el-button type="primary" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
        </div>
      </div>

      <!-- 用户列表表格 -->
      <el-table :empty-text="loading ? '正在加载…' : listError ? '读取失败，请重新加载' : (Object.values(searchForm).some(value => value !== '' && value != null && (!Array.isArray(value) || value.length))) ? '未找到符合条件的数据' : '暂无数据'"
        v-loading="loading"
        :data="userList"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="!testOpenidMode" type="selection" width="55" />

        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column show-overflow-tooltip prop="phone" label="手机号" width="130" />

        <el-table-column prop="current_role" label="当前角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.current_role)">
              {{ getRoleText(row.current_role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="openid" label="OpenID" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.openid || '未绑定' }}
          </template>
        </el-table-column>

        <el-table-column prop="can_be_electrician" label="电工认证" width="100">
          <template #default="{ row }">
            <el-tag :type="row.can_be_electrician ? 'success' : 'info'">
              {{ row.can_be_electrician ? '已认证' : '未认证' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="210">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="last_login_at" label="最后登录" width="160">
          <template #default="{ row }">
            {{ row.last_login_at ? formatDate(row.last_login_at) : '从未登录' }}
          </template>
        </el-table-column>

        <el-table-column prop="identity_successor_id" label="转入电工ID" width="110" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">

            <el-button
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="!testOpenidMode && row.status === 'active'"
              type="danger"
              size="small"
              @click="handleBanUser(row)"
            >
              冻结
            </el-button>

            <el-button
              v-else-if="!testOpenidMode && (row.status === 'banned' || row.status === 'frozen')"
              type="success"
              size="small"
              @click="handleUnbanUser(row)"
            >
              解封
            </el-button>
            <el-button v-if="testOpenidMode && testTools.wechatIdEditEnabled" type="warning" size="small" @click="openEditor(row)">修改</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 用户详情对话框 -->
    <el-dialog
      v-if="pageAllowed"
      v-model="detailDialogVisible"
      title="用户详情"
      width="min(600px, calc(100vw - 32px))"
    >
      <div v-if="currentUser" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ currentUser.id }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
          <el-descriptions-item label="当前角色">
            <el-tag :type="getRoleTagType(currentUser.current_role)">
              {{ getRoleText(currentUser.current_role) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="OpenID">{{ currentUser.openid || '未绑定' }}</el-descriptions-item>

          <el-descriptions-item label="电工认证">
            <el-tag :type="currentUser.can_be_electrician ? 'success' : 'info'">
              {{ currentUser.can_be_electrician ? '已认证' : '未认证' }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentUser.status)">
              {{ getStatusText(currentUser.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(currentUser.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ currentUser.last_login_at ? formatDate(currentUser.last_login_at) : '从未登录' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
    <el-dialog v-if="testOpenidMode && pageAllowed" v-model="editVisible" title="修改微信ID" width="min(620px, calc(100vw - 32px))"
      :close-on-click-modal="!editSaving" :close-on-press-escape="!editSaving" :show-close="!editSaving">
      <div v-loading="editLoading">
        <el-alert title="仅在测试环境可使用，严禁在生产环境使用" type="warning" :closable="false" />
        <template v-if="editTarget">
          <p>用户 ID：{{ editTarget.id }}　手机号：{{ editTarget.phone || '未填写' }}　昵称：{{ editTarget.nickname || '未填写' }}</p>
          <p>当前 OpenID：<span class="openid-text">{{ editTarget.openid ?? '未绑定' }}</span></p>
          <el-form label-position="top"><el-form-item label="新的微信ID（OpenID）">
            <el-input v-model="editValue" type="textarea" :rows="3" :disabled="editSaving || editSaved" placeholder="输入要保存的值；留空将保存为未绑定" />
          </el-form-item></el-form>
          <p>留空保存为未绑定。只修改当前用户记录。</p>
        </template>
        <el-alert v-if="editError" :title="editError" type="error" :closable="false" />
        <el-alert v-if="editSaved && editRefreshError" title="已保存，列表刷新失败，请重试刷新" type="warning" :closable="false" />
      </div>
      <template #footer>
        <el-button :disabled="editSaving" @click="editVisible = false">关闭</el-button>
        <el-button v-if="editError && !editSaved" :disabled="editSaving || editLoading" @click="editor.reload">重新加载当前用户</el-button>
        <el-button v-if="editSaved && editRefreshError" :disabled="editSaving" @click="editor.refresh">重试刷新</el-button>
        <el-button v-if="!editSaved" type="primary" :loading="editSaving" :disabled="!editTarget || editLoading" @click="editor.save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import LoadFeedback from '@/components/LoadFeedback.vue'
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTestToolsStore } from '@/stores/testTools'
import { useTestOpenidEditor } from '@/composables/useTestOpenidEditor'
import { updateTestOpenid } from '@/api/testTools'
import { getUserList, banUser, unbanUser, getUserDetail } from '@/api/users'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({ testOpenidMode: Boolean })
const router = useRouter(), testTools = useTestToolsStore()
const pageAllowed = computed(() => !props.testOpenidMode || testTools.wechatIdEditEnabled)
const listError = ref('')
let pageActive = true, listGeneration = 0, detailGeneration = 0
const loading = ref(false)
const userList = ref([])
const selectedUsers = ref([])
const detailDialogVisible = ref(false)
const currentUser = ref(null)

const searchForm = reactive({
  search: '',
  status: '',
  role: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const getRoleText = (role) => {
  const roleMap = {
    'user': '普通用户',
    'electrician': '电工',
    'enterprise': '企业'
  }
  return roleMap[role] || '未知'
}

const getRoleTagType = (role) => {
  const typeMap = {
    'user': 'primary',
    'electrician': 'warning',
    'enterprise': 'danger'
  }
  return typeMap[role] || 'info'
}

const getStatusTagType = (status) => {
  const typeMap = {
    'active': 'success',
    'banned': 'danger',
    'inactive': 'warning'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'active': '正常',
      'converted_to_electrician': '已转电工（原身份失效）',
    'banned': '冻结',
    'inactive': '未激活'
  }
  return textMap[status] || '未知'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

const loadUserList = async () => {
  if (!pageActive || !pageAllowed.value) return false
  const request = ++listGeneration
  loading.value = true; listError.value = ''
  try {
    const response = await getUserList({ page: pagination.page, limit: pagination.limit, ...searchForm })
    if (!pageActive || request !== listGeneration || !pageAllowed.value) return false
    if (response.code !== 200) throw new Error('读取失败')
    userList.value = response.data.users || response.data.list || []
    pagination.total = response.data.total
    return true
  } catch {
    if (pageActive && request === listGeneration) {
      userList.value = []; pagination.total = 0; listError.value = '加载用户列表失败，请重试搜索'
    }
    return false
  } finally { if (pageActive && request === listGeneration) loading.value = false }
}
const editor = useTestOpenidEditor({ getUserDetail, updateTestOpenid },
  () => props.testOpenidMode && testTools.wechatIdEditEnabled, async user => {
    detailGeneration++
    if (currentUser.value?.id === user.id) currentUser.value = { ...currentUser.value, openid: user.openid }
    return loadUserList()
  })
const { visible: editVisible, target: editTarget, value: editValue, error: editError,
  loading: editLoading, saving: editSaving, saved: editSaved, refreshError: editRefreshError } = editor
const openEditor = async user => {
  const enabled = await testTools.refresh()
  if (pageActive && enabled) await editor.load(user.id)
}
watch(pageAllowed, allowed => {
  if (!allowed) { editVisible.value = false; detailDialogVisible.value = false; router.replace('/admins') }
})
watch(detailDialogVisible, state => { if (!state) detailGeneration++ }, { flush: 'sync' })
onUnmounted(() => { pageActive = false; listGeneration++; detailGeneration++ })

const handleSearch = () => {
  pagination.page = 1
  loadUserList()
}

const handleReset = () => {
  Object.assign(searchForm, {
    search: '',
    status: '',
    role: ''
  })
  handleSearch()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadUserList()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadUserList()
}

const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

const handleBanUser = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要冻结用户 ${user.phone} 吗？`,
      '确认冻结',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await banUser(user.id)
    if (response.code === 200) {
      ElMessage.success('用户冻结成功')
      loadUserList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('冻结用户失败:', error)
      ElMessage.error('冻结用户失败')
    }
  }
}

const handleUnbanUser = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要解封用户 ${user.phone} 吗？`,
      '确认解封',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await unbanUser(user.id)
    if (response.code === 200) {
      ElMessage.success('用户解封成功')
      loadUserList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('解封用户失败:', error)
      ElMessage.error('解封用户失败')
    }
  }
}

const handleViewDetail = async user => {
  const request = ++detailGeneration
  try {
    const response = await getUserDetail(user.id)
    if (!pageActive || request !== detailGeneration || !pageAllowed.value) return
    if (response.code !== 200 || Number(response.data?.id) !== Number(user.id)) throw new Error('读取失败')
    currentUser.value = response.data; detailDialogVisible.value = true
  } catch {
    if (pageActive && request === detailGeneration) ElMessage.error('获取用户详情失败，请重试')
  }
}

const handleExport = () => {
  ElMessage.info('导出功能开发中...')
}

onMounted(() => {
  loadUserList()
})
</script>

<style scoped>
.test-warning { margin-bottom: 20px; }
.openid-text { overflow-wrap: anywhere; }
.users-page {
  padding: 0;
}

.user-detail {
  padding: 16px 0;
}

/* 响应式设计 */

</style>
