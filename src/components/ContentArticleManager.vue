<template>
  <div class="electrician-home">
    <div class="heading"><div><h2>{{ title }}</h2><p>{{ description }}</p></div><el-button type="primary" :disabled="busy" @click="newArticle">新增文章</el-button></div>
    <el-alert title="排序：已设置的数值升序优先（0有效），未设置排在后面；同值按首次发布时间倒序，再按ID倒序。" type="info" :closable="false" />
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-button v-if="error" @click="loadList">重试</el-button>
    <el-table v-loading="loading" :data="articles" empty-text="暂无文章" style="margin-top: 16px">
      <el-table-column prop="title" label="标题" min-width="220" />
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'published' ? 'success' : 'info'">{{ states[row.status] }}</el-tag></template></el-table-column>
      <el-table-column label="排序" width="85"><template #default="{ row }">{{ row.sort_order ?? '未设置' }}</template></el-table-column>
      <el-table-column label="首次发布时间" min-width="170"><template #default="{ row }">{{ formatDate(row.published_at) }}</template></el-table-column>
      <el-table-column prop="read_count" label="阅读量" width="100" />
      <el-table-column label="操作" min-width="250"><template #default="{ row }">
        <el-button link type="primary" :disabled="busy" @click="edit(row.id)">编辑／预览</el-button>
        <el-button link :disabled="busy" @click="changeStatus(row)">{{ row.status === 'published' ? '下架' : '发布' }}</el-button>
        <el-button link type="danger" :disabled="busy" @click="remove(row)">删除</el-button>
      </template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="loadList" />
    <el-dialog v-model="visible" :title="editingId ? '编辑文章' : '新增文章'" width="min(900px, 95vw)" :close-on-click-modal="false" :before-close="closeEditor">
      <el-form label-position="top">
        <el-form-item label="标题"><el-input v-model="form.title" maxlength="100" show-word-limit :disabled="busy" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="form.status" :disabled="busy"><el-option v-for="(label, value) in states" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        <el-form-item label="排序（清空为未设置）"><el-input-number v-model="form.sort_order" :min="0" :max="4294967295" :precision="0" :disabled="busy" /></el-form-item>
        <el-alert v-if="form.status === 'published'" title="保存后将立即更新线上内容。首次发布时间和阅读量保持不变。" type="warning" :closable="false" />
        <ContentArticleEditor v-model="form.body" :disabled="busy" @uploading="uploading = $event" />
      </el-form>
      <template #footer><el-button :disabled="busy || uploading" @click="visible = false">取消</el-button><el-button :disabled="uploading" @click="preview = true">预览（不计阅读量）</el-button><el-button type="primary" :loading="busy" :disabled="uploading" @click="save">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="preview" title="文章预览（不计阅读量）" width="min(800px, 95vw)"><h2 class="preview-title">{{ form.title }}</h2><ContentArticleEditor :model-value="form.body" readonly /></el-dialog>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ContentArticleEditor from '@/components/ContentArticleEditor.vue'
import { getArticles, getArticle, createArticle, updateArticle, deleteArticle } from '@/api/content'
const props = defineProps({ category: { type: String, required: true }, title: String, description: String })
// 栏目由路由页面壳固定，异步操作始终使用创建时的栏目。
const category = props.category
const states = { draft: '草稿', published: '已发布', offline: '已下架' }
const articles = ref([]), page = ref(1), total = ref(0), loading = ref(false), error = ref('')
const visible = ref(false), preview = ref(false), busy = ref(false), uploading = ref(false), editingId = ref(null)
const form = reactive({ title: '', body: [], status: 'draft', sort_order: null })
const formatDate = date => date ? new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '未发布'
let listSequence = 0
let active = true, confirming = false
onBeforeUnmount(() => {
  active = false
  listSequence++
  visible.value = false
  preview.value = false
  if (confirming) ElMessageBox.close()
})
async function loadList() {
  if (!active) return
  const sequence = ++listSequence
  loading.value = true
  error.value = ''
  try {
    const result = await getArticles({ page: page.value, pageSize: 20, category })
    if (!active || sequence !== listSequence) return
    articles.value = result.data.list
    total.value = result.data.total
    if (page.value > 1 && !articles.value.length) { page.value--; return loadList() }
  } catch (_) { if (sequence === listSequence) error.value = '文章加载失败，请重试' }
  finally { if (sequence === listSequence) loading.value = false }
}
function newArticle() {
  if (!active || busy.value) return
  editingId.value = null
  Object.assign(form, { title: '', body: [{ type: 'text', text: '' }], status: 'draft', sort_order: null })
  visible.value = true
}
async function edit(id) {
  if (!active || busy.value) return
  busy.value = true
  try {
    const { data } = await getArticle(id, category)
    if (!active) return
    editingId.value = id
    Object.assign(form, { title: data.title, body: data.body, status: data.status, sort_order: data.sort_order })
    visible.value = true
  } finally { if (active) busy.value = false }
}
function closeEditor(done) { if (!busy.value && !uploading.value) done() }
async function save() {
  if (!active || busy.value || uploading.value) return
  if (!form.title.trim() || !form.body.some(b => b.type === 'image' || b.text.trim())) return ElMessage.warning('请填写标题和正文')
  busy.value = true
  try {
    const payload = { title: form.title.trim(), body: form.body, status: form.status, sort_order: form.sort_order ?? null }
    if (editingId.value) await updateArticle(editingId.value, payload, category)
    else await createArticle(payload, category)
    if (!active) return
    ElMessage.success('文章已保存')
    visible.value = false
    await loadList()
  } finally { if (active) busy.value = false }
}
async function changeStatus(row) {
  if (!active || busy.value) return
  busy.value = true
  try { await updateArticle(row.id, { status: row.status === 'published' ? 'offline' : 'published' }, category); if (active) await loadList() }
  finally { if (active) busy.value = false }
}
async function remove(row) {
  if (!active || busy.value || confirming) return
  confirming = true
  try { await ElMessageBox.confirm(`确定删除“${row.title}”？文章无法恢复，上传图片仍保留。`, '删除文章', { type: 'warning' }) }
  catch (_) { return }
  finally { confirming = false }
  if (!active) return
  busy.value = true
  try { await deleteArticle(row.id, category); if (active) await loadList() }
  finally { if (active) busy.value = false }
}
onMounted(loadList)
</script>

<style scoped>
.heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.heading h2 { margin: 0 0 8px; }
.heading p { color: #606266; font-size: 14px; }
.el-pagination { margin-top: 20px; }
.preview-title { overflow-wrap: anywhere; }
</style>
