<template>
  <header class="bar">
    <div class="actions">
      <button
        v-if="hasPayload"
        class="btn quiet"
        type="button"
        :disabled="exporting"
        @click="$emit('save-image')"
      >
        {{ exporting ? '正在生成' : '保存图片' }}
      </button>
      <button
        v-if="hasPayload"
        class="btn quiet"
        type="button"
        :disabled="exportingPdf"
        @click="$emit('save-pdf')"
      >
        {{ exportingPdf ? '正在生成 PDF' : '保存为 PDF' }}
      </button>
      <button class="btn quiet" type="button" @click="$emit('copy-link')">复制链接</button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  hasPayload: boolean
  exporting: boolean
  exportingPdf: boolean
}>()

defineEmits<{
  (e: 'save-image'): void
  (e: 'save-pdf'): void
  (e: 'copy-link'): void
}>()
</script>

<style scoped src="./reportActions.css"></style>
