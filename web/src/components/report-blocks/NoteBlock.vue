<template>
  <div class="note">
    <p class="eyebrow">{{ block.title }}</p>
    <p class="note-text">{{ block.text }}</p>
  </div>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'

defineProps<{
  block: ReportBlock & { type: 'note' }
}>()
</script>

<style scoped>
.note {
  padding: 22px 24px;
  border: 1px solid color-mix(in srgb, var(--accent) 9%, var(--line));
  border-radius: 18px;
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.note-text {
  margin-top: 10px;
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--ink-2);
}
</style>

<style scoped src="./shared/eyebrow.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped>
.note {
  padding: 26px 28px;
}

.note-text {
  font-size: var(--report-text);
}
</style>

<style scoped src="./shared/media-cards.css"></style>
