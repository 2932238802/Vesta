<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <div class="gap-list">
    <article v-for="(item, i) in block.items" :key="item.key" class="gap">
      <header class="gap-head">
        <span class="gap-index">{{ String(i + 1).padStart(2, '0') }}</span>
        <div class="gap-heading">
          <h3>{{ item.name }}</h3>
          <span class="gap-meter" aria-hidden="true">
            <i :style="{ width: `${item.score}%` }"></i>
          </span>
        </div>
        <span class="gap-score">{{ item.score }}<em>分</em></span>
      </header>
      <dl>
        <div class="gap-step what">
          <dt>补什么</dt>
          <dd>{{ item.what }}</dd>
        </div>
        <div class="gap-step how">
          <dt>怎么补</dt>
          <dd>{{ item.how }}</dd>
        </div>
        <div class="gap-step when">
          <dt>什么时候开始</dt>
          <dd>{{ item.when }}</dd>
        </div>
      </dl>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'gaps' }
  index: number
}>()
</script>

<style scoped>
.gap-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.gap {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px 20px 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--line));
  border-radius: 20px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent) 5%, var(--surface)) 0%,
      var(--surface) 46%
    );
  box-shadow: 0 14px 34px -30px rgba(27, 26, 23, 0.45);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.gap:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 38px -28px rgba(27, 26, 23, 0.4);
}

.gap-head {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.gap-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.gap-heading {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.gap-heading h3 {
  font-size: 15px;
  font-weight: 550;
  line-height: 1.3;
}

.gap-meter {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 9%, var(--line));
  overflow: hidden;
}

.gap-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: color-mix(in srgb, var(--accent) 62%, #ffffff);
}

.gap-score {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
}

.gap-score em {
  font-family: var(--sans);
  font-style: normal;
  font-size: 9.5px;
  color: color-mix(in srgb, var(--accent) 65%, var(--ink-3));
}

.gap dl {
  margin: 0;
  display: grid;
  gap: 15px;
}

.gap-step {
  display: grid;
  gap: 5px;
}

.gap-step dt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.gap-step dt::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.65;
}

.gap-step.how dt::before {
  background: #4a7ba6;
}

.gap-step.when dt::before {
  background: #b1843c;
}

.gap-step dd {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink-2);
}
</style>

<style scoped>
@media (max-width: 720px) {
  .gap-list {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped src="./shared/closing.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped>
.gap-list {
  gap: 20px;
}

.gap {
  border: 0;
  padding: 26px 24px;
  background: color-mix(in srgb, var(--accent) 3.2%, var(--surface));
  box-shadow: none;
}

.gap:hover {
  transform: none;
  box-shadow: none;
}

.gap-heading h3 {
  font-size: 16px;
}

.gap-step dt {
  font-size: var(--report-label);
}
</style>

<style scoped src="./shared/media-cards.css"></style>
<style scoped src="./shared/media-text.css"></style>

<style scoped>
@media (max-width: 720px) {
  .gap-list {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped src="./shared/print.css"></style>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .gap {
    transition: none;
  }

  .gap:hover {
    transform: none;
  }
}
</style>
