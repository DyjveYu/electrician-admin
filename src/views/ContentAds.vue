<template>
  <div class="content-ads" v-loading="loading">
    <h2>广告维护</h2>
    <p>配置后显示在登录入口、用户和企业首页、电工首页。未配置的广告位不展示。</p>
    <el-alert v-if="loadFailed" title="广告加载失败，请重试后再维护" type="error" :closable="false" />
    <el-button @click="loadAds" :loading="loading">刷新配置</el-button>
    <div class="ad-grid">
      <el-card v-for="slot in slots" :key="slot.key" :header="slot.label">
        <el-form label-position="top" :disabled="loadFailed || busy[slot.key]">
          <el-form-item label="广告图片">
            <el-image v-if="forms[slot.key].image_url" :src="forms[slot.key].image_url" fit="contain" class="preview" />
            <el-upload :show-file-list="false" :http-request="options => upload(slot.key, options)" accept=".jpg,.jpeg,.png" :disabled="loadFailed || busy[slot.key]">
              <el-button :loading="busy[slot.key]">上传 / 更换图片</el-button>
            </el-upload>
            <div class="tip">{{ slot.key === 'banner' ? '建议1000×400（5:2）' : '建议200×200（1:1）' }}，JPG/JPEG、PNG，≤5MiB。不强制裁切。</div>
          </el-form-item>
          <el-form-item label="点击目标">
            <el-radio-group v-model="forms[slot.key].link_type">
              <el-radio value="external">外部网页</el-radio>
              <el-radio value="notice">公开通知</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="forms[slot.key].link_type === 'external'" label="HTTPS 网页链接">
            <el-input v-model="forms[slot.key].external_url" placeholder="https://" maxlength="2048" />
            <div class="tip">请先配置小程序业务域名并验证真机打开效果。</div>
          </el-form-item>
          <el-form-item v-else label="全体可见的已发布通知">
            <el-select v-model="forms[slot.key].notice_id" filterable remote :remote-method="searchNotices" :loading="noticeLoading" placeholder="输入标题搜索" @visible-change="open => open && searchNotices('')">
              <el-option v-if="forms[slot.key].notice_id && !notices.some(n => n.id === forms[slot.key].notice_id)" :value="forms[slot.key].notice_id" :label="`当前通知 #${forms[slot.key].notice_id}（保存时重新校验）`" />
              <el-option v-for="notice in notices" :key="notice.id" :value="notice.id" :label="`${notice.title}（#${notice.id}）`" />
              <template #footer><el-button v-if="notices.length < noticeTotal" text :loading="noticeLoading" @click="moreNotices">加载更多</el-button></template>
            </el-select>
          </el-form-item>
          <el-button type="primary" @click="save(slot.key)" :loading="busy[slot.key]">保存此广告位</el-button>
          <el-button type="danger" plain @click="clear(slot.key)">清空</el-button>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAds, saveAd, clearAd, getNoticeOptions, uploadImage } from '@/api/content'
const slots = [1, 2, 3, 4].map(i => ({ key: `icon_${i}`, label: `图标广告 ${i}` })).concat({ key: 'banner', label: '底部长图广告' })
const empty = () => ({ image_url: '', link_type: 'external', external_url: '', notice_id: null })
const forms = reactive(Object.fromEntries(slots.map(s => [s.key, empty()])))
const busy = reactive({})
const loading = ref(false), loadFailed = ref(true)
const notices = ref([]), noticeTotal = ref(0), noticeLoading = ref(false)
let keyword = '', noticePage = 1, searchVersion = 0
async function loadAds() {
  loading.value = true
  try {
    const { data } = await getAds()
    slots.forEach(s => { forms[s.key] = { ...empty(), ...data.find(ad => ad.slot_key === s.key) } })
    loadFailed.value = false
  } catch { loadFailed.value = true } finally { loading.value = false }
}
async function searchNotices(query) {
  keyword = query; noticePage = 1
  const version = ++searchVersion
  noticeLoading.value = true
  try {
    const { data } = await getNoticeOptions({ keyword, page: 1, pageSize: 20 })
    if (version === searchVersion) { notices.value = data.list; noticeTotal.value = data.total }
  } catch { if (version === searchVersion) { notices.value = []; noticeTotal.value = 0 } }
  finally { if (version === searchVersion) noticeLoading.value = false }
}
async function moreNotices() {
  if (noticeLoading.value) return
  const version = searchVersion, page = noticePage + 1
  noticeLoading.value = true
  try {
    const { data } = await getNoticeOptions({ keyword, page, pageSize: 20 })
    if (version === searchVersion) { notices.value.push(...data.list); noticePage = page; noticeTotal.value = data.total }
  } catch { /* 请求工具显示错误，保留当前选项以便重试 */ }
  finally { if (version === searchVersion) noticeLoading.value = false }
}
async function upload(slot, options) {
  const file = options.file
  if (!/\.(jpe?g|png)$/i.test(file.name) || !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    const error = new Error('请选择≤5MiB的JPG/JPEG或PNG图片')
    ElMessage.error(error.message); options.onError(error); return
  }
  busy[slot] = true
  try { const { data } = await uploadImage(file); forms[slot].image_url = data.url; options.onSuccess(data) }
  catch (error) { options.onError(error) } finally { busy[slot] = false }
}
async function save(slot) {
  const form = forms[slot]
  if (!form.image_url) return ElMessage.warning('请先上传广告图片')
  if (form.link_type === 'external') {
    try { const url = new URL(form.external_url); if (url.protocol !== 'https:' || url.username || url.password) throw new Error() }
    catch { return ElMessage.warning('请输入有效的HTTPS网页链接') }
  } else if (!form.notice_id) return ElMessage.warning('请选择公开通知')
  busy[slot] = true
  try {
    await saveAd(slot, { image_url: form.image_url, link_type: form.link_type,
      external_url: form.link_type === 'external' ? form.external_url : null,
      notice_id: form.link_type === 'notice' ? form.notice_id : null })
    ElMessage.success('广告已保存')
  } catch { /* 请求工具显示错误 */ } finally { busy[slot] = false }
}
async function clear(slot) {
  try {
    await ElMessageBox.confirm('清空后该广告位将隐藏，图片文件保留。', '清空广告位', { type: 'warning' })
    busy[slot] = true
    await clearAd(slot); forms[slot] = empty(); ElMessage.success('广告位已清空')
  } catch { /* 取消或请求错误 */ } finally { busy[slot] = false }
}
onMounted(loadAds)
</script>

<style scoped>
.content-ads { padding: 24px; }
.ad-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 20px; }
.preview { display: block; width: 100%; height: 140px; margin-bottom: 12px; background: #f5f7fa; }
.tip { color: #606266; font-size: 12px; line-height: 1.7; margin-top: 8px; width: 100%; }
.el-select { width: 100%; }
</style>
