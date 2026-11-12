<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <dl class="target-facts">
    <div>
      <dt>{{ block.labels.city }}</dt>
      <dd>{{ block.city || '还没填' }}</dd>
    </div>
    <div>
      <dt>{{ block.labels.role }}</dt>
      <dd>{{ block.role || '还没填' }}</dd>
    </div>
    <div>
      <dt>{{ block.labels.salary }}</dt>
      <dd>{{ block.salary || '还没填' }}</dd>
    </div>
    <div v-if="block.hometown">
      <dt>{{ block.labels.hometown }}</dt>
      <dd>{{ block.hometown }}</dd>
    </div>
  </dl>
  <p v-if="block.cityReason" class="target-goal">
    <span>
      <b>{{ block.labels.reason }}</b>{{ block.cityReason }}
    </span>
  </p>
  <p v-if="block.priority || block.goal" class="target-goal">
    <span v-if="block.priority">
      <b>{{ block.labels.priority }}</b>{{ block.priority }}
    </span>
    <span v-if="block.goal">
      <b>{{ block.labels.goal }}</b>{{ block.goal }}
      <template v-if="block.goalNote"> · {{ block.goalNote }}</template>
    </span>
  </p>
  <p v-if="block.cityNote" class="target-note">{{ block.cityNote }}</p>

  <div class="target-lists">
    <section class="target-list">
      <h3>{{ block.advantageTitle }}</h3>
      <div v-for="item in block.advantages" :key="item.key" class="target-item">
        <ScoreBar :name="item.name" :score="item.score" />
      </div>
    </section>
    <section class="target-list">
      <h3>{{ block.gapTitle }}</h3>
      <div v-for="item in block.gaps" :key="item.key" class="target-item">
        <ScoreBar :name="item.name" :score="item.score" />
      </div>
    </section>
  </div>

  <div v-if="block.salaryNote" class="target-salary">
    <p class="eyebrow">{{ block.salaryTitle }}</p>
    <p>{{ block.salaryNote }}</p>
  </div>
  <p class="closing">{{ block.closing }}</p>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import ScoreBar from '../ScoreBar.vue'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'target' }
  index: number
}>()
</script>

<style scoped>
.target-facts {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.target-facts > div {
  padding: 14px 15px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 3%, var(--surface));
}

.target-facts dt {
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.target-facts dd {
  margin: 6px 0 0;
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--ink);
}

.target-goal {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.7;
}

.target-goal b {
  margin-right: 8px;
  font-weight: 400;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--ink-3);
}

.target-note {
  margin-top: 20px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-2);
  max-width: 36em;
}

.target-lists {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.target-list {
  border: 1px solid color-mix(in srgb, var(--accent) 9%, var(--line));
  border-radius: 18px;
  padding: 20px 20px 10px;
  background: color-mix(in srgb, var(--accent) 2.5%, var(--surface));
}

.target-list h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 550;
  margin-bottom: 14px;
}

.target-list h3::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.55;
}

.target-list + .target-list h3::before {
  background: #b1843c;
  opacity: 0.65;
}

.target-item {
  padding: 9px 0;
}

.target-item + .target-item {
  border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
}

.target-salary {
  margin-top: 24px;
  padding: 20px 22px;
  border: 1px solid color-mix(in srgb, var(--accent) 9%, var(--line));
  border-left: 3px solid color-mix(in srgb, var(--accent) 55%, transparent);
  border-radius: 4px 16px 16px 4px;
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.target-salary p:last-child {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-2);
}
</style>

<style scoped>
@media (max-width: 720px) {
  .target-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .target-lists {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
</style>

<style scoped src="./shared/eyebrow.css"></style>
<style scoped src="./shared/closing.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped>
.target-facts > div {
  padding: 18px 18px 17px;
  border: 0;
  background: color-mix(in srgb, var(--accent) 3.5%, var(--surface));
}

.target-facts dt {
  font-size: var(--report-label);
}

.target-facts dd {
  margin-top: 8px;
  font-size: 15.5px;
}

.target-goal {
  font-size: 14.5px;
  line-height: 1.85;
}

.target-list {
  border: 0;
  background: color-mix(in srgb, var(--accent) 2.8%, var(--surface));
}

.target-list h3 {
  font-size: 15px;
}

.target-salary {
  border: 0;
  border-left: 3px solid color-mix(in srgb, var(--accent) 40%, transparent);
}

.target-salary p:last-child {
  font-size: var(--report-text);
}
</style>

<style scoped src="./shared/media-text.css"></style>

<style scoped>
@media (max-width: 720px) {
  .target-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<style scoped src="./shared/print.css"></style>
