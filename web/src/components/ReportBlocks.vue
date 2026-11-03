<template>
  <article class="report">
    <header class="report-head">
      <div v-if="payload.theme.brand" class="brand">{{ payload.theme.brand }}</div>
      <div class="meta">
        <span>{{ payload.name || '学员' }}</span>
        <span class="dot-sep">·</span>
        <span>{{ dateText }}</span>
      </div>
    </header>

    <section
      v-for="(block, index) in payload.blocks"
      :key="index"
      class="block"
      :class="`block-${block.type}`"
    >
      <template v-if="block.type === 'hero'">
        <p class="eyebrow">{{ block.title }} · {{ block.eyebrow }}</p>
        <h1 class="hero-title">{{ block.summary }}</h1>
        <div class="hero-foot">
          <span class="tier-chip">
            <b>{{ block.tier }}</b>
            {{ block.tierLabel }}
          </span>
          <span v-if="block.total !== null" class="hero-total">
            {{ block.total }}<em>/ 100</em>
          </span>
        </div>
        <p class="hero-line">{{ block.tierLine }}</p>
      </template>

      <template v-else-if="block.type === 'target'">
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

      <template v-else-if="block.type === 'radar'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <RadarChart :dimensions="block.dimensions" :accent="payload.theme.accent" />
      </template>

      <template v-else-if="block.type === 'strengths'">
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

      <template v-else-if="block.type === 'gaps'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <div class="gap-list">
          <article v-for="item in block.items" :key="item.key" class="gap">
            <header class="gap-head">
              <h3>{{ item.name }}</h3>
              <span class="gap-score">{{ item.score }}</span>
            </header>
            <dl>
              <div>
                <dt>补什么</dt>
                <dd>{{ item.what }}</dd>
              </div>
              <div>
                <dt>怎么补</dt>
                <dd>{{ item.how }}</dd>
              </div>
              <div>
                <dt>什么时候开始</dt>
                <dd>{{ item.when }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </template>

      <template v-else-if="block.type === 'consistency'">
        <SectionHead :index="index" :title="block.title" />
        <p class="lead">{{ block.intro }}</p>
        <div class="quotes">
          <p v-for="(paragraph, i) in block.paragraphs" :key="i" class="quote">{{ paragraph }}</p>
        </div>
        <p class="closing">{{ block.closing }}</p>
      </template>

      <template v-else-if="block.type === 'cognition'">
        <SectionHead :index="index" :title="block.title" />
        <div class="prose">
          <p v-for="(paragraph, i) in block.paragraphs" :key="i" :class="{ first: i === 0 }">
            {{ paragraph }}
          </p>
        </div>
      </template>

      <template v-else-if="block.type === 'actions'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <ol class="action-list">
          <li v-for="(item, i) in block.items" :key="i">
            <span class="action-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <p>{{ item }}</p>
          </li>
        </ol>
        <p class="closing">{{ block.closing }}</p>
      </template>

      <template v-else-if="block.type === 'sources'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <ul class="source-list">
          <li v-for="(item, i) in block.items" :key="item.url" class="source">
            <span class="source-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="source-body">
              <a class="source-title" :href="item.url" target="_blank" rel="noopener noreferrer">
                {{ item.title }}
              </a>
              <p v-if="item.usedFor" class="source-use">{{ item.usedFor }}</p>
              <p class="source-site">
                {{ item.site || item.url }}
              </p>
            </div>
          </li>
        </ul>
      </template>

      <template v-else-if="block.type === 'note'">
        <div class="note">
          <p class="eyebrow">{{ block.title }}</p>
          <p class="note-text">{{ block.text }}</p>
        </div>
      </template>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReportPayload } from '@shared/types'
import RadarChart from './RadarChart.vue'
import ScoreBar from './ScoreBar.vue'
import SectionHead from './SectionHead.vue'

const props = defineProps<{ payload: ReportPayload }>()

const dateText = computed(() => {
  const date = new Date(props.payload.createdAt)
  if (Number.isNaN(date.getTime())) return props.payload.createdAt.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
})
</script>

<style scoped>
.report-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.brand {
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.meta {
  display: flex;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.dot-sep {
  color: var(--line-strong);
}

.block {
  padding: 52px 0;
  border-bottom: 1px solid var(--line);
}

.block:last-child {
  border-bottom: 0;
  padding-bottom: 24px;
}

.block-hero {
  padding-top: 44px;
}

.eyebrow {
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.hero-title {
  margin-top: 22px;
  font-family: var(--serif);
  font-size: clamp(26px, 5.4vw, 36px);
  font-weight: 500;
  line-height: 1.55;
  letter-spacing: 0.01em;
  color: var(--ink);
}

.hero-foot {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.tier-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 9%, transparent);
  color: var(--accent);
  font-size: 12.5px;
  letter-spacing: 0.02em;
}

.tier-chip b {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
}

.hero-total {
  font-family: var(--serif);
  font-size: 34px;
  line-height: 1;
  color: var(--ink);
}

.hero-total em {
  font-family: var(--sans);
  font-style: normal;
  font-size: 11px;
  color: var(--ink-3);
  margin-left: 4px;
  letter-spacing: 0.08em;
}

.hero-line {
  margin-top: 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-2);
  max-width: 34em;
}

.target-facts {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.target-facts > div {
  padding: 16px 18px 16px 0;
}

.target-facts > div + div {
  padding-left: 18px;
  border-left: 1px solid var(--line);
}

.target-facts dt {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--ink-3);
}

.target-facts dd {
  margin: 6px 0 0;
  font-size: 15px;
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
  margin-top: 32px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
}

.target-list {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 22px 20px;
  background: var(--surface);
}

.target-list h3 {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 18px;
}

.target-item {
  padding: 10px 0;
}

.target-item + .target-item {
  border-top: 1px solid var(--line);
}

.target-salary {
  margin-top: 26px;
  padding: 22px 24px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 5%, transparent);
  border-left: 2px solid var(--accent);
}

.target-salary p:last-child {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-2);
}

.strength-list {
  display: grid;
  gap: 28px;
}

.strength-top {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
}

.rank {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  padding-top: 2px;
}

.strength-body {
  display: grid;
  gap: 12px;
}

.strength-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-2);
  max-width: 36em;
}

.gap-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.gap {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 22px 20px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.gap-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.gap-head h3 {
  font-size: 15px;
  font-weight: 500;
}

.gap-score {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--accent);
}

.gap dl {
  margin: 0;
  display: grid;
  gap: 14px;
}

.gap dl > div {
  display: grid;
  gap: 4px;
}

.gap dt {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--ink-3);
}

.gap dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-2);
}

.lead {
  font-size: 15px;
  line-height: 1.8;
  color: var(--ink);
  max-width: 34em;
}

.quotes {
  margin-top: 22px;
  display: grid;
  gap: 14px;
}

.quote {
  padding: 18px 20px;
  border-left: 2px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 4%, transparent);
  border-radius: 0 10px 10px 0;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-2);
}

.closing {
  margin-top: 22px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-3);
}

.prose {
  display: grid;
  gap: 14px;
  max-width: 36em;
}

.prose p {
  font-size: 14.5px;
  line-height: 1.9;
  color: var(--ink-2);
}

.prose p.first {
  font-size: 16px;
  color: var(--ink);
}

.action-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0;
}

.action-list li {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 10px;
  padding: 20px 0;
  border-top: 1px solid var(--line);
  align-items: baseline;
}

.action-list li:first-child {
  border-top: 0;
  padding-top: 0;
}

.action-num {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--accent);
  letter-spacing: 0.06em;
}

.action-list p {
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--ink);
}

.note {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
}

.note-text {
  margin-top: 10px;
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--ink-2);
}

.source-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0;
}

.source {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  padding: 16px 0;
  border-top: 1px solid var(--line);
}

.source:first-child {
  border-top: 0;
  padding-top: 0;
}

.source-index {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  padding-top: 3px;
}

.source-body {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.source-title {
  font-size: 14px;
  line-height: 1.65;
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 3px;
}

.source-title:hover {
  color: var(--accent);
  text-decoration-color: currentColor;
}

.source-use {
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-2);
}

.source-site {
  font-size: 11.5px;
  color: var(--ink-3);
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .gap-list {
    grid-template-columns: 1fr;
  }

  .target-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .target-facts > div:nth-child(3) {
    border-left: 0;
    padding-left: 0;
  }

  .target-facts > div:nth-child(n + 3) {
    border-top: 1px solid var(--line);
  }

  .target-lists {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .block {
    padding: 40px 0;
  }

  .block-hero {
    padding-top: 34px;
  }
}

@media print {
  .block {
    break-inside: avoid;
  }
}
</style>
