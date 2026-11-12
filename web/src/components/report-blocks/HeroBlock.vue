<template>
  <p class="eyebrow">{{ block.title }} · {{ block.eyebrow }}</p>
  <h1 class="hero-title">{{ block.summary }}</h1>
  <div v-if="block.tierLabel || block.total !== null" class="hero-foot">
    <span v-if="block.tierLabel" class="tier-chip">
      <b>{{ block.tier }}</b>
      {{ block.tierLabel }}
    </span>
    <span v-if="block.total !== null" class="hero-total">
      {{ block.total }}<em>/ 100</em>
    </span>
  </div>
  <p v-if="block.tierLine" class="hero-line">{{ block.tierLine }}</p>
  <a v-if="claimLink" class="hero-claim" href="#claim">
    读完后，如果愿意，可以到末尾留一个方便的时间
  </a>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'

defineProps<{
  block: ReportBlock & { type: 'hero' }
  claimLink?: boolean
}>()
</script>

<style scoped>
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
</style>

<style scoped src="./shared/eyebrow.css"></style>

<style scoped>
.hero-title {
  margin-top: 24px;
  max-width: 22em;
  font-size: clamp(30px, 4.6vw, 44px);
  line-height: 1.42;
}

.hero-line {
  margin-top: 22px;
  max-width: 32em;
  font-size: 15.5px;
  line-height: 1.95;
}

.hero-claim {
  min-height: 44px;
  padding: 10px 16px;
  font-size: 14px;
}
</style>

<style scoped>
@media (max-width: 720px) {
  .hero-title {
    margin-top: 18px;
    font-size: 27px;
    line-height: 1.5;
  }

  .hero-line {
    font-size: 15px;
  }
}
</style>

<style scoped>
@media print {
  .hero-claim {
    display: none;
  }
}
</style>
