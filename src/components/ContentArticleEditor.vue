<template>
  <div class="article-editor">
    <div v-if="readonly" class="article-preview">
      <template v-for="(block, index) in modelValue" :key="index">
        <p v-if="block.type === 'text'">{{ block.text }}</p>
        <img v-else-if="block.type === 'image'" :src="block.url" alt="文章插图" />
      </template>
    </div>
    <template v-else>
      <p class="hint">按顺序添加文字段落和图片。文字以纯文本显示，不支持 HTML。每图 JPG/PNG ≤5MiB；最多30张图片、200块、30000字。</p>
      <div v-for="(block, index) in modelValue" :key="index" class="block">
        <div class="block-heading">
          <span>{{ index + 1 }} · {{ block.type === 'text' ? '文字段落' : '图片' }}</span>
          <span>
            <el-button size="small" :disabled="disabled || index === 0" @click="move(index, -1)">上移</el-button>
            <el-button size="small" :disabled="disabled || index === modelValue.length - 1" @click="move(index, 1)">下移</el-button>
            <el-button size="small" type="danger" text :disabled="disabled" @click="remove(index)">删除</el-button>
          </span>
        </div>
        <el-input v-if="block.type === 'text'" :model-value="block.text" :disabled="disabled" type="textarea" :autosize="{ minRows: 3, maxRows: 12 }" maxlength="30000" @update:model-value="text => setText(index, text)" />
        <img v-else :src="block.url" alt="文章插图" />
      </div>
      <div class="toolbar">
        <el-button :disabled="disabled || modelValue.length >= 200" @click="append({ type: 'text', text: '' })">添加段落</el-button>
        <el-upload :show-file-list="false" accept="image/jpeg,image/png" :disabled="disabled || uploading || modelValue.length >= 200 || imageCount >= 30" :http-request="upload" :before-upload="beforeUpload">
          <el-button :loading="uploading" :disabled="disabled || modelValue.length >= 200 || imageCount >= 30">上传并插入图片</el-button>
        </el-upload>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadImage } from '@/api/content'
const props = defineProps({ modelValue: { type: Array, default: () => [] }, readonly: Boolean, disabled: Boolean })
const emit = defineEmits(['update:modelValue', 'uploading'])
const uploading = ref(false)
const imageCount = computed(() => props.modelValue.filter(block => block.type === 'image').length)
const change = blocks => emit('update:modelValue', blocks)
const append = block => change([...props.modelValue, block])
const remove = index => change(props.modelValue.filter((_, i) => i !== index))
const setText = (index, text) => change(props.modelValue.map((block, i) => i === index ? { type: 'text', text } : block))
function move(index, direction) {
  const blocks = [...props.modelValue]
  const other = index + direction
  ;[blocks[index], blocks[other]] = [blocks[other], blocks[index]]
  change(blocks)
}
function beforeUpload(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    ElMessage.warning('请上传不超过5MiB的JPG/PNG图片')
    return false
  }
  return true
}
async function upload({ file, onSuccess, onError }) {
  uploading.value = true
  emit('uploading', true)
  try {
    const result = await uploadImage(file)
    if (props.modelValue.length >= 200 || imageCount.value >= 30) throw new Error('已达到正文块数或图片数量上限')
    append({ type: 'image', url: result.data.url })
    onSuccess(result)
  } catch (error) {
    ElMessage.error(error.message || '图片上传失败')
    onError(error)
  } finally {
    uploading.value = false
    emit('uploading', false)
  }
}
</script>

<style scoped>
.hint { color: #72767b; font-size: 13px; line-height: 1.6; }
.block { border: 1px solid #dcdfe6; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
.block-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
.toolbar { display: flex; gap: 12px; flex-wrap: wrap; }
img { display: block; max-width: 100%; height: auto; margin: 12px auto; }
.block img { max-height: 320px; object-fit: contain; }
.article-preview p { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; }
</style>
