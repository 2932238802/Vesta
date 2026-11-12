<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <ul class="check-list">
    <li v-for="item in block.items" :key="item.key" class="check-item">
      <span class="check-box" aria-hidden="true"></span>
      <div class="check-body">
        <p class="check-title">{{ item.title }}</p>
        <p class="check-detail">{{ item.detail }}</p>
        <p class="check-search">搜索：{{ item.search }}</p>
      </div>
    </li>
  </ul>
  <p class="closing">{{ block.note }}</p>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'checklist' }
  index: number
}>()
</script>

<style scoped>
.check-list {
  margin-top: 20px;
  display: grid;
  gap: 10px;
  list-style: none;
  padding: 0;
}

.check-item {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.check-box {
  width: 16px;
  height: 16px;
  margin-top: 3px;
  border: 1.5px solid color-mix(in srgb, var(--accent) 45%, var(--line));
  border-radius: 4px;
  background: color-mix(in srgb, var(--accent) 3%, var(--surface));
}

.check-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.check-detail {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-2);
}

.check-search {
  margin-top: 8px;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ink) 5%, var(--surface));
  font-size: 12px;
  color: var(--ink-3);
}
</style>

<style scoped src="./shared/closing.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped>
.check-item {
  padding: 18px 20px;
  border: 0;
  background: color-mix(in srgb, var(--accent) 2.8%, var(--surface));
}

.check-title {
  font-size: 15.5px;
}

.check-search {
  padding: 5px 10px;
  font-size: 13px;
}
</style>

<style scoped src="./shared/media-cards.css"></style>
<style scoped src="./shared/media-text.css"></style>

<style scoped>
@media (max-width: 720px) {
  .check-search {
    font-size: 13.5px;
  }
}
</style>
