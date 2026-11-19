<template>
  <div class="shot-mask" @click.self="$emit('close')">
    <div class="shot-panel">
      <p class="shot-hint">长按图片可保存到相册；电脑上也可以直接下载</p>
      <div class="shot-frame">
        <img :src="src" alt="报告图片" />
      </div>
      <div class="shot-actions">
        <a class="btn" :href="src" :download="`vesta-report-${slug}.png`">下载图片</a>
        <button class="btn ghost" type="button" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  src: string
  slug: string
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped src="./reportShot.css"></style>
