<template>
  <div v-if="message" class="load-feedback" role="alert">
    <p>{{ message }}</p>
    <button type="button" :disabled="loading" @click="$emit('retry')">{{ loading ? '正在重试…' : '重新加载' }}</button>
  </div>
</template>
<script setup>
defineProps({ message: { type: String, default: '' }, loading: Boolean })
defineEmits(['retry'])
</script>
