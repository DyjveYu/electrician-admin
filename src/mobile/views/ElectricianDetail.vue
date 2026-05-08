<template>
  <div class="page">
    <van-nav-bar title="电工详情" left-arrow @click-left="router.back()" />

    <div v-if="loading" class="loading-state">
      <van-loading size="24px">加载中...</van-loading>
    </div>

    <template v-else-if="detail">
      <div class="content">
        <!-- 基本信息卡片 -->
        <van-cell-group title="基本信息" inset>
          <van-cell title="真实姓名" :value="detail.real_name || '-'" />
          <van-cell title="服务电话" :value="detail.service_phone || '-'" />
          <van-cell title="登录手机号" :value="detail.login_phone || '-'" />
          <van-cell title="身份证号" :value="maskIdCard(detail.id_card) || '-'" />
          <van-cell title="电工证编号" :value="detail.electrician_license || '-'" />
        </van-cell-group>

        <!-- 证书有效期 -->
        <van-cell-group title="证书信息" inset>
          <van-cell title="证书开始日期" :value="formatDate(detail.cert_start_date)" />
          <van-cell title="证书结束日期">
            <template #value>
              <span :class="{ 'text-danger': isExpiringSoon(detail.cert_end_date) }">
                {{ formatDate(detail.cert_end_date) }}
              </span>
            </template>
          </van-cell>
          <van-cell title="服务省份" :value="detail.province || '-'" />
          <van-cell title="服务城市" :value="detail.city || '-'" />
          <van-cell title="服务区县" :value="detail.district || '-'" />
        </van-cell-group>

        <!-- 审核信息 -->
        <van-cell-group title="审核信息" inset>
          <van-cell title="认证状态">
            <template #value>
              <van-tag :type="statusTagType(detail.status)">
                {{ statusText(detail.status) }}
              </van-tag>
            </template>
          </van-cell>
          <van-cell title="申请日期" :value="formatDate(detail.created_at)" />
          <van-cell title="审核日期" :value="detail.updated_at ? formatDate(detail.updated_at) : '未审核'" />
          <van-cell v-if="detail.reject_reason" title="审核备注" :value="detail.reject_reason" />
        </van-cell-group>

        <!-- 证件照片 -->
        <div class="photos-section">
          <div class="section-title">证件照片</div>
          <div class="photos-grid">
            <div v-if="detail.id_card_front" class="photo-item" @click="previewImage(detail.id_card_front)">
              <p class="photo-label">身份证正面</p>
              <van-image :src="detail.id_card_front" fit="cover" class="photo" />
            </div>
            <div v-if="detail.id_card_back" class="photo-item" @click="previewImage(detail.id_card_back)">
              <p class="photo-label">身份证背面</p>
              <van-image :src="detail.id_card_back" fit="cover" class="photo" />
            </div>
            <div v-if="detail.license_photo" class="photo-item" @click="previewImage(detail.license_photo)">
              <p class="photo-label">电工证照片</p>
              <van-image :src="detail.license_photo" fit="cover" class="photo" />
            </div>
          </div>
          <div v-if="!detail.id_card_front && !detail.id_card_back && !detail.license_photo" class="no-photos">
            暂无证件照片
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div v-if="detail.status === 'pending'" class="bottom-actions">
        <van-button type="success" block round @click="handleApprove">
          通过认证
        </van-button>
        <van-button type="danger" block round @click="showRejectDialog = true">
          驳回认证
        </van-button>
      </div>

      <div v-else class="bottom-actions">
        <van-button
          v-if="detail.status === 'approved' && detail.user_status !== 'banned'"
          type="warning"
          block
          round
          @click="handleBan"
        >
          冻结电工
        </van-button>
        <van-button
          v-if="detail.user_status === 'banned'"
          type="success"
          block
          round
          @click="handleUnban"
        >
          解冻电工
        </van-button>
      </div>
    </template>

    <!-- 驳回原因弹窗 -->
    <van-dialog
      v-model:show="showRejectDialog"
      title="驳回认证"
      show-cancel-button
      @confirm="confirmReject"
      :before-close="onRejectDialogClose"
    >
      <van-field
        v-model="rejectReason"
        type="textarea"
        rows="4"
        placeholder="请输入驳回原因"
        maxlength="200"
        show-word-limit
      />
    </van-dialog>

    <!-- 图片预览 -->
    <van-image-preview v-model:show="showPreview" :images="previewImages" :start-position="previewIndex" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast, showDialog } from 'vant'
import { getElectricianDetail, approveElectrician, rejectElectrician, banElectrician, unbanElectrician } from '../api/electricians'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const detail = ref(null)
const showRejectDialog = ref(false)
const rejectReason = ref('')

// 图片预览
const showPreview = ref(false)
const previewImages = ref([])
const previewIndex = ref(0)

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

function maskIdCard(idCard) {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

function isExpiringSoon(expiryDate) {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffTime = expiry - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays >= 0
}

function previewImage(url) {
  previewImages.value = [url]
  previewIndex.value = 0
  showPreview.value = true
}

async function loadDetail() {
  loading.value = true
  try {
    const id = route.query.id
    if (!id) {
      showToast('缺少电工ID')
      router.back()
      return
    }

    const res = await getElectricianDetail(id)
    if (res.code === 200) {
      detail.value = res.data
    } else {
      showToast(res.message || '获取详情失败')
    }
  } catch {
    showToast('网络错误')
  } finally {
    loading.value = false
  }
}

async function handleApprove() {
  try {
    await showConfirmDialog({
      title: '确认通过',
      message: `确定要通过 ${detail.value.real_name} 的电工认证吗？`
    })
    const res = await approveElectrician(detail.value.id)
    if (res.code === 200) {
      showToast('审核通过')
      detail.value.status = 'approved'
    }
  } catch {
    // user cancelled
  }
}

function onRejectDialogClose(action) {
  if (action === 'confirm') {
    if (!rejectReason.value.trim()) {
      showToast('请输入驳回原因')
      return false
    }
  }
  return true
}

async function confirmReject() {
  if (!rejectReason.value.trim()) {
    showToast('请输入驳回原因')
    return
  }
  try {
    const res = await rejectElectrician(detail.value.id, rejectReason.value.trim())
    if (res.code === 200) {
      showToast('已驳回')
      detail.value.status = 'rejected'
      detail.value.reject_reason = rejectReason.value
      showRejectDialog.value = false
    }
  } catch {
    showToast('驳回失败')
  }
}

async function handleBan() {
  try {
    await showConfirmDialog({
      title: '确认冻结',
      message: `确定要冻结电工 ${detail.value.real_name} 吗？`
    })
    const res = await banElectrician(detail.value.id)
    if (res.code === 200) {
      showToast('已冻结')
      detail.value.user_status = 'banned'
    }
  } catch {
    // user cancelled
  }
}

async function handleUnban() {
  try {
    await showConfirmDialog({
      title: '确认解冻',
      message: `确定要解冻电工 ${detail.value.real_name} 吗？`
    })
    const res = await unbanElectrician(detail.value.id)
    if (res.code === 200) {
      showToast('已解冻')
      detail.value.user_status = 'active'
    }
  } catch {
    // user cancelled
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 80px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.content {
  padding: 12px 0;
}

.photos-section {
  margin: 16px 12px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 12px;
}

.photos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.photo-item {
  text-align: center;
}

.photo-label {
  font-size: 12px;
  color: #999;
  margin: 0 0 6px;
}

.photo {
  width: 100%;
  height: 120px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #eee;
}

.no-photos {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 20px 0;
}

.text-danger {
  color: #ee0a24;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
}

.bottom-actions .van-button {
  flex: 1;
}
</style>
