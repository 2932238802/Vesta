<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <div class="strength-list">
    <div v-for="(item, i) in block.items" :key="item.key" class="strength">
      <div class="strength-top">
        <span class="rank">{{ String(i + 1).padStart(2, '0') }}</span>
        <div class="strength-body">
          <ScoreBar :name="item.name" :score="item.score" />
          <p class="strength-text">{{ item.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import ScoreBar from '../ScoreBar.vue'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'strengths' }
  index: number
}>()
</script>

<style scoped>
.strength-list {
  display: grid;
  gap: 12px;
}

.strength {
  padding: 18px 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 2.5%, var(--surface));
}

.strength-top {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 12px;
  align-items: start;
}

.rank {
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

.strength-body {
  display: grid;
  gap: 10px;
}

.strength-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-2);
  max-width: 36em;
}
</style>

<style scoped>
@media (max-width: 720px) {
  .strength {
    padding: 16px 17px;
  }
}
</style>

<style scoped src="./shared/reading.css"></style>

<style scoped>
.strength {
  padding: 22px 24px;
}
</style>

<style scoped src="./shared/media-cards.css"></style>
<style scoped src="./shared/media-text.css"></style>

<style scoped src="./shared/print.css"></style>
