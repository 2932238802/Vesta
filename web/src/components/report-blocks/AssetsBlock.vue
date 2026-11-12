<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <div class="asset-list">
    <article v-for="(item, i) in block.items" :key="item.key" class="asset">
      <span class="asset-index">{{ String(i + 1).padStart(2, '0') }}</span>
      <div class="asset-body">
        <h3>{{ item.name }}</h3>
        <p v-if="item.text">{{ item.text }}</p>
        <p v-if="item.source" class="asset-source">来源：{{ item.source }}</p>
      </div>
    </article>
  </div>
  <p class="closing">{{ block.note }}</p>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'assets' }
  index: number
}>()
</script>

<style scoped>
.asset-list {
  display: grid;
  gap: 12px;
}

.asset {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--line));
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 5%, var(--surface)) 0%,
      var(--surface) 58%
    );
}

.asset-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 9%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
}

.asset-body h3 {
  font-size: 15px;
  font-weight: 550;
  line-height: 1.4;
}

.asset-body p {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-2);
  max-width: 38em;
}
</style>

<style scoped>
@media (max-width: 720px) {
  .asset {
    padding: 16px;
  }
}
</style>

<style scoped src="./shared/closing.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped>
.asset {
  padding: 22px 24px;
}

.asset-body p {
  margin-top: 9px;
}

.asset-source {
  margin-top: 8px !important;
  font-size: 12.5px !important;
  color: var(--ink-3) !important;
}
</style>

<style scoped src="./shared/media-cards.css"></style>
<style scoped src="./shared/media-text.css"></style>
