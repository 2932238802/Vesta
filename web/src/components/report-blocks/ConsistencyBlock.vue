<template>
  <SectionHead :index="index" :title="block.title" />
  <p class="lead">{{ block.intro }}</p>
  <div class="quotes">
    <p v-for="(paragraph, i) in block.paragraphs" :key="i" class="quote">{{ paragraph }}</p>
  </div>
  <p class="closing">{{ block.closing }}</p>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'consistency' }
  index: number
}>()
</script>

<style scoped>
.lead {
  font-size: 15.5px;
  line-height: 1.85;
  color: var(--ink);
  max-width: 34em;
}

.quotes {
  margin-top: 20px;
  display: grid;
  gap: 10px;
}

.quote {
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
  border-left: 3px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: color-mix(in srgb, var(--accent) 3%, var(--surface));
  border-radius: 4px 14px 14px 4px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink-2);
}
</style>

<style scoped>
@media (max-width: 720px) {
  .quote {
    padding: 15px 16px;
  }
}
</style>

<style scoped src="./shared/closing.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped src="./shared/media-text.css"></style>
