<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <ol class="roadmap-list">
    <li v-for="phase in block.phases" :key="phase.key" class="roadmap-item">
      <span class="roadmap-dot" aria-hidden="true" />
      <div class="roadmap-body">
        <header class="roadmap-head">
          <h3 v-if="phase.label">{{ phase.label }}</h3>
          <span class="roadmap-period">{{ phase.period }}</span>
        </header>
        <p class="roadmap-goal">主目标：{{ phase.goal }}</p>
        <p class="roadmap-output">验证：{{ phase.output }}</p>
      </div>
    </li>
  </ol>
  <p class="closing">{{ block.note }}</p>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'roadmap' }
  index: number
}>()
</script>

<style scoped>
.roadmap-list {
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: grid;
}

.roadmap-item {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 14px;
  padding-bottom: 18px;
}

.roadmap-item:last-child {
  padding-bottom: 0;
}

.roadmap-item::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 18px;
  bottom: 0;
  width: 1px;
  background: var(--line);
}

.roadmap-item:last-child::before {
  display: none;
}

.roadmap-dot {
  width: 10px;
  height: 10px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 10%, transparent);
}

.roadmap-body {
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 2.5%, var(--surface));
}

.roadmap-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 14px;
  flex-wrap: wrap;
}

.roadmap-head h3 {
  font-size: 15px;
  font-weight: 550;
}

.roadmap-period {
  font-size: 11.5px;
  color: var(--ink-3);
}

.roadmap-goal {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink);
}

.roadmap-output {
  margin-top: 4px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-3);
}
</style>

<style scoped src="./shared/closing.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped>
.roadmap-body {
  padding: 18px 20px;
}

.roadmap-head h3 {
  font-size: 16px;
}

.roadmap-period {
  font-size: 12.5px;
}

.roadmap-output {
  font-size: 14px;
  line-height: 1.8;
}
</style>

<style scoped src="./shared/media-cards.css"></style>
<style scoped src="./shared/media-text.css"></style>
