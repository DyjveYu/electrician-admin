<template>
  <div class="page">
    <van-nav-bar title="电工详情" left-arrow @click-left="router.back()" />
    <van-cell v-if="detailError" :title="detailError" is-link @click="profileDetail.reload" value="重新加载" />
    <van-cell v-if="profileReadError" title="提醒未消除，请重试" is-link @click="profileDetail.confirmViewed" :value="profileReading ? '处理中' : '重试'" />

    <div v-if="loading" class="loading-state">
      <van-loading size="24px">加载中...</van-loading>
    </div>

    <template v-else-if="detail">
      <div class="content">
        <!-- 基本信息卡片 -->
        <van-cell-group title="基本信息" inset>
          <van-cell title="资料提交" :value="profileTypeText(detail.profileChangeType) + (detail.profileNoticePending ? ' · 未查看' : '')" />
          <van-cell title="认证／资料变更时间" :value="profileTime(detail.profileChangeTime)" />
          <van-cell title="工号" :value="detail.work_no || '-'" />
          <van-cell title="真实姓名" :value="detail.real_name || '-'" />
          <van-cell title="服务电话" :value="detail.service_phone || '-'" />
          <van-cell title="登录手机号" :value="detail.login_phone || '-'" />
          <van-cell title="身份证号" :value="maskIdCard(detail.id_card) || '-'" />
          <van-cell title="开始从业" :value="detail.career_started_month || '未填写'" />
          <van-cell title="从业年限" :value="detail.career_years == null ? '未填写' : detail.career_years + ' 年'" />
        </van-cell-group>

        <!-- 证书有效期 -->
        <van-cell-group title="服务区域" inset>
          <van-cell title="服务省份" :value="detail.province || '-'" />
          <van-cell title="服务城市" :value="detail.city || '-'" />
          <van-cell title="服务区县" :value="detail.district || '-'" />
        </van-cell-group>
        <van-cell-group title="工费信息" inset>
          <van-cell title="小时工费" :value="detail.hourly_rate == null ? '未填写' : detail.hourly_rate + ' 元/小时'" />
          <van-cell title="日工工费" :value="detail.daily_rate == null ? '未填写' : detail.daily_rate + ' 元/日'" />
        </van-cell-group>

        <!-- 认证结果 -->
        <van-cell-group title="认证结果" inset>
          <van-cell title="认证状态">
            <template #value>
              <van-tag :type="statusTagType(detail)">
                {{ detail.status_text || statusText(detail.status) }}
              </van-tag>
              <van-tag v-if="detail.pending_region_request?.operation === 'add'" type="warning">新增区域待审核</van-tag>
            </template>
          </van-cell>
          <van-cell title="申请日期" :value="formatDate(detail.created_at)" />
          <van-cell title="资料更新时间" :value="detail.updated_at ? formatDate(detail.updated_at) : '未记录'" />
          <van-cell v-if="detail.reject_reason" title="未通过原因" :value="detail.reject_reason" />
        </van-cell-group>
        <van-cell-group title="已增加接单区域" inset>
          <van-cell v-for="area in detail.service_regions" :key="area.id" :title="area.province + area.city + area.district" />
          <van-cell v-if="!detail.service_regions?.length" title="暂无新增区域" />
        </van-cell-group>

        <!-- 证件照片 -->
        <div class="photos-section">
          <div class="section-title">证件照片</div>
          <div class="photos-grid">
            <div v-if="detail.id_card_front" class="photo-item" role="button" tabindex="0" @keydown.enter="previewImage(detail.id_card_front)" @click="previewImage(detail.id_card_front)">
              <p class="photo-label">身份证正面</p>
              <van-image :src="detail.id_card_front" fit="contain" class="photo" />
            </div>
            <div v-if="detail.id_card_back" class="photo-item" role="button" tabindex="0" @keydown.enter="previewImage(detail.id_card_back)" @click="previewImage(detail.id_card_back)">
              <p class="photo-label">身份证背面</p>
              <van-image :src="detail.id_card_back" fit="contain" class="photo" />
            </div>
            <div v-for="license in detail.licenses" :key="license.license_type" class="photo-item">
              <p class="photo-label">{{ license.label }}</p>
              <p>证号 {{ license.certificate_number || '未记录' }}</p>
              <p>{{ license.start_date || '未记录' }} 至 {{ license.end_date || '未记录' }}</p>
              <van-image v-if="license.photo_url" :src="license.photo_url" fit="contain" class="photo" @click="previewImage(license.photo_url)" />
            </div>
          </div>
          <div v-if="!detail.id_card_front && !detail.id_card_back && !detail.licenses?.length" class="no-photos">
            暂无证件照片
          </div>
        </div>
      </div>

      <div v-if="detail.region_change_pending_id || detail.status === 'approved' || detail.user_status === 'banned'" class="bottom-actions">
        <van-button v-if="detail.region_change_pending_id" type="primary" block round @click="openReview">
          {{ detail.pending_region_request?.operation === 'add' ? '审核新增区域' : '审核区域变更' }}
        </van-button>
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

    <!-- 图片预览 -->
    <van-image-preview v-model:show="showPreview" :images="previewImages" :start-position="previewIndex" />
    <RegionChangeReview v-model="reviewVisible" :change-id="reviewId" :api="regionReviewApi" @reviewed="loadDetail" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { banElectrician, unbanElectrician } from '../api/electricians'
import RegionChangeReview from '../../components/RegionChangeReview.vue'
import * as regionReviewApi from '../api/electricians'
import { profileTypeText, profileTime } from '../../utils/electricianProfileNotice'
import { useElectricianProfileDetail } from '../../composables/useElectricianProfileDetail'

const route = useRoute()
const router = useRouter()

const profileDetail = useElectricianProfileDetail(regionReviewApi)
const { loading, detail, error: detailError, readError: profileReadError, reading: profileReading } = profileDetail
const reviewVisible = ref(false)
const reviewId = ref(null)
function openReview() { reviewId.value = detail.value.region_change_pending_id; reviewVisible.value = true }

// 图片预览
const showPreview = ref(false)
const previewImages = ref([])
const previewIndex = ref(0)

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

function maskIdCard(idCard) {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

function previewImage(url) {
  previewImages.value = [url]
  previewIndex.value = 0
  showPreview.value = true
}

async function loadDetail() {
  if (!route.query.id) { showToast('缺少电工ID'); router.back(); return }
  await profileDetail.load(route.query.id)
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

watch(() => route.query.id, loadDetail, { immediate: true })
</script>

<style scoped>
.content { padding-bottom: 200px; }
.loading-state { padding: 56px 16px; text-align: center; }
.photos-section { margin: 24px 16px; }
.section-title { font-weight: 600; margin-bottom: 12px; }
.photos-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.photo-item { background: white; border: 1px solid var(--ops-border); border-radius: 10px; padding: 12px; overflow-wrap: anywhere; }
.photo-label { margin: 0 0 8px; font-weight: 600; font-size: 13px; }
.photo { width: 100%; height: 100px; margin-top: 8px; border-radius: 6px; }
.photo-item p { font-size: 12px; color: var(--ops-muted); }
.no-photos { padding: 32px; text-align: center; color: var(--ops-muted); }
.bottom-actions { position: fixed; bottom: 0; left: 0; right: 0; z-index: 10; display: flex; flex-wrap: wrap; gap: 10px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: white; border-top: 1px solid var(--ops-border); }
.bottom-actions .van-button { flex: 1 1 140px; }
@media (max-height: 500px) { .bottom-actions { position: static; } .content { padding-bottom: 16px; } }
</style>
