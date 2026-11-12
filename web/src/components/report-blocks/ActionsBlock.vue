<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <ol class="action-list">
    <li v-for="(item, i) in block.items" :key="i">
      <span class="action-num">{{ String(i + 1).padStart(2, '0') }}</span>
      <p>{{ item }}</p>
    </li>
  </ol>
  <p class="closing">{{ block.closing }}</p>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'actions' }
  index: number
}>()
</script>

<style scoped>
.action-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.action-list li {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 12px;
  padding: 15px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 7%, var(--line));
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 2.5%, var(--surface));
  align-items: start;
}

.action-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.action-list p {
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--ink);
}
</style>

<style scoped>
@media (max-width: 720px) {
  .action-list li {
    padding: 14px;
  }
}
</style>

<style scoped src="./shared/closing.css"></style>

<style scoped src="./shared/media-text.css"></style>

<style scoped src="./shared/print.css"></style>
