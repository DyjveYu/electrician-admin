<template>
    <el-dialog v-model="detailVisible" title="区域变更详情" width="680px" :close-on-click-modal="!saving" :show-close="!saving">
      <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" />
      <el-button v-if="detailError" @click="openDetail(props.changeId)">重新加载</el-button>
      <div v-loading="detailLoading">
        <el-descriptions v-if="detail" :column="1" border>
          <el-descriptions-item label="电工">{{ detail.certification?.real_name }} {{ detail.certification?.work_no }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detail.certification?.phone }}</el-descriptions-item>
          <el-descriptions-item label="原区域">{{ detail.old_province }}{{ detail.old_city }}{{ detail.old_district }}</el-descriptions-item>
          <el-descriptions-item label="目标区域">{{ detail.province }}{{ detail.city }}{{ detail.district }}</el-descriptions-item>
          <el-descriptions-item label="申请原因">{{ detail.reason || '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.source === 'self' ? '信息自行变更' : statusLabels[detail.status] }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatTime(detail.submitted_at) }}</el-descriptions-item>
          <el-descriptions-item label="处理时间">{{ formatTime(detail.decided_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.reject_reason" label="拒绝原因">{{ detail.reject_reason }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.notification" label="微信订阅通知">
            {{ notificationLabels[detail.notification.status] }}
            <div v-if="detail.notification.last_error">{{ notificationError(detail.notification.last_error) }}</div>
            <el-button :disabled="saving || detailLoading" @click="openDetail(props.changeId)">刷新通知状态</el-button>
            <el-button v-if="['retry', 'failed', 'unknown'].includes(detail.notification.status)"
              :disabled="saving" @click="retryNotification">重试发送</el-button>
          </el-descriptions-item>
        </el-descriptions>
        <el-input v-if="detail?.status === 'pending'" v-model="rejectReason" type="textarea"
          :rows="3" maxlength="500" show-word-limit placeholder="拒绝申请时请填写原因" :disabled="saving" class="reason-input" />
      </div>
      <template #footer>
        <el-button :disabled="saving" @click="detailVisible = false">关闭</el-button>
        <el-button v-if="detail?.status === 'pending'" type="danger" :loading="saving" @click="decide('rejected')">拒绝申请</el-button>
        <el-button v-if="detail?.status === 'pending'" type="primary" :loading="saving" @click="decide('approved')">通过申请</el-button>
      </template>
    </el-dialog>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRegionChange, reviewRegionChange, retryRegionNotification } from '@/api/electricians'
const props = defineProps({ modelValue: Boolean, changeId: [Number, String] })
const emit = defineEmits(['update:modelValue', 'reviewed'])
const detailVisible = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const statusLabels = { pending: '区域变更待审核', approved: '审核通过', rejected: '审核拒绝' }
const notificationLabels = { pending: '等待发送', sending: '发送中', retry: '等待重试', failed: '发送失败',
  unknown: '发送结果待核对', sent: '微信接口已接收' }
const notificationError = value => {
  if (!/^WECHAT_47003(?::|$)/.test(value)) return value
  const field = /:FIELD_([a-z_]+\d+)$/.exec(value)?.[1]
  return '微信模板参数不符合要求' + (field ? '（字段 ' + field + '）' : '') + '，请核对微信模板配置'
}
const detail = ref(null)
const detailLoading = ref(false)
const detailError = ref('')
const rejectReason = ref('')
const saving = ref(false)
let detailRequest = 0
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '未记录'
async function openDetail(id) {
  const request = ++detailRequest
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  rejectReason.value = ''
  try {
    const { data } = await getRegionChange(id)
    if (request === detailRequest) detail.value = data
  } catch {
    if (request === detailRequest) detailError.value = '详情读取失败，请重新加载'
  } finally {
    if (request === detailRequest) detailLoading.value = false
  }
}
async function decide(decision) {
  if (saving.value || !detail.value) return
  if (decision === 'rejected' && !rejectReason.value.trim()) {
    ElMessage.warning('请填写拒绝原因')
    return
  }
  const current = detail.value
  try {
    await ElMessageBox.confirm(decision === 'approved' ? '审核通过后启用目标区域并恢复有效认证资格。' : '拒绝后保留原区域并恢复有效认证资格。', '确认审核')
  } catch { return }
  saving.value = true
  try {
    await reviewRegionChange(current.id, {
      decision, reject_reason: decision === 'rejected' ? rejectReason.value.trim() : undefined,
      review_version: current.review_version, business_revision: current.certification.business_revision
    })
    ElMessage.success('审核结果已保存')
    await openDetail(current.id)
    emit('reviewed')
  } catch {
    detail.value = null
    detailError.value = '审核未完成或资料已变化，请重新加载详情核对后处理'
  } finally { saving.value = false }
}
async function retryNotification() {
  if (saving.value || !detail.value) return
  const current = detail.value
  try {
    await ElMessageBox.confirm(current.notification.status === 'unknown'
      ? '上次发送结果尚未确认，重试可能造成重复通知。请核对后确认。' : '确认重新安排微信订阅通知发送？', '重试通知')
  } catch { return }
  saving.value = true
  try {
    await retryRegionNotification(current.id, { confirm_unknown: current.notification.status === 'unknown' })
    await openDetail(current.id)
    ElMessage.success('已加入发送队列')
  } catch { detailError.value = '重试安排失败，请刷新详情核对通知状态' }
  finally { saving.value = false }
}
watch(() => [props.modelValue, props.changeId], ([visible, id]) => {
  if (visible && id) openDetail(id)
  else { detailRequest += 1; detail.value = null }
}, { immediate: true })
onUnmounted(() => { detailRequest += 1 })
</script>

<style scoped>
.reason-input { margin-top: 20px; }
</style>
