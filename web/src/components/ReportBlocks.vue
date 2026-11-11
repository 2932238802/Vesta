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
          <span v-if="block.tierLabel" class="tier-chip">
            <b>{{ block.tier }}</b>
            {{ block.tierLabel }}
          </span>
          <span v-if="block.total !== null" class="hero-total">
            {{ block.total }}<em>/ 100</em>
          </span>
        </div>
        <p class="hero-line">{{ block.tierLine }}</p>
        <a v-if="claimLink" class="hero-claim" href="#claim">
          读完后，如果愿意，可以到末尾留一个方便的时间
        </a>
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

      <template v-else-if="block.type === 'scorecard'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <div class="score-groups">
          <section class="score-group">
            <h3>起点（改不了，但要知道）</h3>
            <div class="score-group-body">
              <div class="score-radar">
                <RadarChart
                  :dimensions="radarDimensions(block.background)"
                  :accent="payload.theme.accent"
                  :max="10"
                  compact
                  :show-data="false"
                />
              </div>
              <div class="score-rows">
                <div v-for="item in block.background" :key="item.key" class="score-row">
                  <div class="score-head">
                    <span>{{ item.label }}</span>
                    <b>{{ item.score }}</b>
                  </div>
                  <div class="score-track"><i :style="{ width: `${item.score * 10}%` }" /></div>
                  <p v-if="item.benchmark" class="score-benchmark">入场线：{{ item.benchmark }}</p>
                  <p class="score-note">{{ item.note }}<template v-if="item.source"> · {{ item.source }}</template></p>
                </div>
              </div>
            </div>
          </section>
          <section class="score-group">
            <h3>能改的四项</h3>
            <div class="score-group-body">
              <div class="score-radar">
                <RadarChart
                  :dimensions="radarDimensions(block.personal)"
                  :accent="payload.theme.accent"
                  :max="10"
                  compact
                  :show-data="false"
                />
              </div>
              <div class="score-rows">
                <div v-for="item in block.personal" :key="item.key" class="score-row">
                  <div class="score-head">
                    <span>{{ item.label }}</span>
                    <b>{{ item.score }}</b>
                  </div>
                  <div class="score-track personal"><i :style="{ width: `${item.score * 10}%` }" /></div>
                  <p class="score-note">{{ item.note }}<template v-if="item.source"> · {{ item.source }}</template></p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="potential">
          <span class="potential-level">可提升空间 · {{ block.potential.label }}</span>
          <p>{{ block.potential.text }}</p>
        </div>
      </template>

      <template v-else-if="block.type === 'gap'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <dl class="gap-lines">
          <div v-for="line in block.lines" :key="line.label">
            <dt>{{ line.label }}</dt>
            <dd>{{ line.value }}</dd>
          </div>
        </dl>
        <ul v-if="block.jobs.length" class="job-list">
          <li v-for="job in block.jobs" :key="job.url" class="job">
            <a :href="job.url" target="_blank" rel="noopener noreferrer">{{ job.title }}</a>
            <p>{{ job.company }} · {{ job.city }} · {{ job.salary }}</p>
            <p class="job-req">{{ job.requirement }}</p>
          </li>
        </ul>
        <p class="closing">{{ block.note }}</p>
      </template>

      <template v-else-if="block.type === 'checklist'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <ul class="check-list">
          <li v-for="item in block.items" :key="item.title" class="check-item">
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

      <template v-else-if="block.type === 'section'">
        <SectionHead :index="index" :title="block.title" />
        <div class="prose">
          <p v-for="(paragraph, i) in block.paragraphs" :key="i" :class="{ first: i === 0 }">
            {{ paragraph }}
          </p>
        </div>
      </template>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DimScore, ReportPayload, ScoreItem } from '@shared/types'
import RadarChart from './RadarChart.vue'
import ScoreBar from './ScoreBar.vue'
import SectionHead from './SectionHead.vue'

const props = defineProps<{ payload: ReportPayload; claimLink?: boolean }>()

function radarDimensions(items: ScoreItem[]): DimScore[] {
  return items.map((item) => ({
    key: item.key,
    name: item.label,
    weight: 0,
    score: item.score
  }))
}

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

.hero-claim {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 22px;
  padding: 7px 13px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  font-size: 12.5px;
  color: var(--accent);
  line-height: 1.6;
  text-decoration: none;
}

.hero-claim::after {
  content: '→';
  font-size: 12px;
  opacity: 0.65;
}

.hero-claim:hover {
  background: color-mix(in srgb, var(--accent) 11%, transparent);
}

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

.lead {
  font-size: 15.5px;
  line-height: 1.85;
  color: var(--ink);
  max-width: 34em;
}

.score-groups {
  margin-top: 22px;
  display: grid;
  gap: 26px;
}

.score-group h3 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  margin-bottom: 14px;
}

.score-group-body {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 18px 22px;
  align-items: start;
}

.score-radar,
.score-rows {
  min-width: 0;
}

.score-row {
  margin-bottom: 16px;
}

.score-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 14px;
  color: var(--ink);
}

.score-head b {
  font-family: var(--mono);
  font-size: 15px;
  color: var(--accent);
}

.score-track {
  margin-top: 7px;
  height: 6px;
  border-radius: 99px;
  background: var(--line);
  overflow: hidden;
}

.score-track i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: color-mix(in srgb, var(--accent) 45%, #b8b0a0);
}

.score-track.personal i {
  background: var(--accent);
}

.score-note {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--ink-3);
}

.score-benchmark {
  margin-top: 5px;
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--accent) 70%, var(--ink-3));
}

.potential {
  margin-top: 20px;
  padding: 16px 18px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--line));
}

.potential-level {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.potential p {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-2);
}

.gap-lines {
  margin-top: 20px;
  display: grid;
  gap: 12px;
}

.gap-lines div {
  display: grid;
  grid-template-columns: 8.5em 1fr;
  gap: 12px;
  align-items: baseline;
}

.gap-lines dt {
  font-size: 12.5px;
  color: var(--ink-3);
}

.gap-lines dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink);
}

.job-list {
  margin-top: 20px;
  display: grid;
  gap: 10px;
  list-style: none;
  padding: 0;
}

.job {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.job a {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
}

.job p {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--ink-3);
}

.job-req {
  color: var(--ink-2) !important;
}

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

.closing {
  margin-top: 22px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-3);
}

.prose {
  display: grid;
  gap: 16px;
  max-width: 36em;
}

.prose p {
  font-size: 14.5px;
  line-height: 1.95;
  color: var(--ink-2);
}

.prose p.first {
  font-size: 16.5px;
  line-height: 1.85;
  color: var(--ink);
}

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

.source-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.source {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
}

.source:hover {
  background: color-mix(in srgb, var(--accent) 3%, transparent);
}

.source-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
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

  .score-group-body {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .target-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .target-lists {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .strength {
    padding: 16px 17px;
  }

  .quote {
    padding: 15px 16px;
  }

  .action-list li {
    padding: 14px;
  }

  .source {
    padding: 11px 10px;
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

  .gap,
  .strength,
  .target-list,
  .action-list li {
    box-shadow: none;
    transform: none;
    break-inside: avoid;
  }

  .hero-claim {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gap {
    transition: none;
  }

  .gap:hover {
    transform: none;
  }
}
</style>
