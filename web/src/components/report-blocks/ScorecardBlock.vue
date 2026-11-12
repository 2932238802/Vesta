<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
  <div class="score-groups">
    <section class="score-group">
      <h3>背景与积累（现在的位置）</h3>
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
      <h3>个人四维（方法和习惯）</h3>
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

<script setup lang="ts">
import type { DimScore, ReportBlock, ReportPayload, ScoreItem } from '@shared/types'
import RadarChart from '../RadarChart.vue'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'scorecard' }
  index: number
  payload: ReportPayload
}>()

function radarDimensions(items: ScoreItem[]): DimScore[] {
  return items.map((item) => ({
    key: item.key,
    name: item.label,
    weight: 0,
    score: item.score
  }))
}
</script>

<style scoped>
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
</style>

<style scoped>
@media (max-width: 720px) {
  .score-group-body {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>

<style scoped src="./shared/reading.css"></style>

<style scoped>
.score-group h3 {
  font-size: 13px;
}

.score-head {
  font-size: 15px;
}

.score-note {
  font-size: 13.5px;
  line-height: 1.75;
}

.score-benchmark {
  font-size: 12.5px;
}

.potential {
  padding: 20px 22px;
}

.potential-level {
  font-size: 13px;
}
</style>

<style scoped src="./shared/media-text.css"></style>

<style scoped>
@media (max-width: 720px) {
  .score-group-body {
    grid-template-columns: 1fr;
  }

  .score-radar {
    max-width: 280px;
    margin: 0 auto;
  }
}
</style>
