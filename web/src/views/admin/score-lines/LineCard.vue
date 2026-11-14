<template>
  <article class="card line-card" :class="kind">
    <header class="line-head">
      <div>
        <p class="line-eyebrow">{{ kindLabel }}</p>
        <h2 class="line-title">{{ title }}</h2>
        <p v-if="subtitle" class="line-sub">{{ subtitle }}</p>
      </div>
      <span v-if="line" class="line-year">{{ latest?.year }} 年</span>
    </header>

    <div v-if="line && latest" class="metric-grid">
      <div v-for="metric in latest.metrics" :key="metric.subjectCode" class="metric">
        <span class="metric-name">{{ metric.subjectName }}</span>
        <span class="metric-value">
          {{ metric.value }}
          <span v-if="metric.fullScore" class="metric-full">/ {{ metric.fullScore }}</span>
        </span>
      </div>
    </div>

    <p v-else class="line-empty">{{ emptyText || '未收录' }}</p>

    <p v-if="line && year && latest && latest.year !== year" class="line-hint">
      当前选择的 {{ year }} 年没有这条线，显示最近有数据的 {{ latest.year }} 年。
    </p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QueryLine } from '@/api'
import { SCOPE_LABELS } from '@shared/score-line'

const props = defineProps<{
  line: QueryLine | null
  kind: 'main' | 'school' | 'program'
  title: string
  subtitle?: string
  year?: number
  emptyText?: string
}>()

const kindLabel = computed(() => {
  if (props.kind === 'main') return props.line?.scope === 'national' ? '国家线' : '省控线'
  return SCOPE_LABELS[props.kind]
})

const latest = computed(() => {
  if (!props.line?.years.length) return null
  return props.line.years[props.line.years.length - 1]
})
</script>

<style scoped>
.line-card {
  padding: 18px 20px;
  border-left: 4px solid var(--line-strong);
}

.line-card.main {
  border-left-color: var(--accent);
  background: var(--accent-soft);
}

.line-card.school {
  border-left-color: var(--amber);
}

.line-card.program {
  border-left-color: var(--danger);
}

.line-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.line-eyebrow {
  color: var(--ink-3);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.line-title {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.line-sub {
  margin-top: 4px;
  color: var(--ink-3);
  font-size: 12.5px;
}

.line-year {
  flex-shrink: 0;
  color: var(--ink-3);
  font-size: 12px;
}

.metric-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin-top: 14px;
}

.metric {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.metric-name {
  color: var(--ink-3);
  font-size: 12px;
}

.metric-value {
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.metric-full {
  color: var(--ink-3);
  font-size: 12px;
  font-weight: 400;
}

.line-empty {
  margin-top: 12px;
  color: var(--ink-3);
  font-size: 13px;
  line-height: 1.7;
}

.line-hint {
  margin-top: 10px;
  color: var(--amber);
  font-size: 12px;
}
</style>
