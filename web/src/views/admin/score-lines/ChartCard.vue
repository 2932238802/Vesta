<template>
  <section class="card chart-card">
    <header class="chart-head">
      <div>
        <p class="eyebrow">趋势</p>
        <h2 class="chart-title">同一科目跨年份对比</h2>
      </div>
      <div class="subject-chips" role="tablist" aria-label="选择科目">
        <button
          v-for="subject in subjects"
          :key="subject.code"
          class="subject-chip"
          :class="{ on: selected === subject.code }"
          type="button"
          role="tab"
          :aria-selected="selected === subject.code"
          @click="selected = subject.code"
        >
          {{ subject.name }}
        </button>
      </div>
    </header>

    <div class="legend">
      <label v-if="hasLine('main')" class="legend-item">
        <input v-model="visible.main" type="checkbox">
        <span class="swatch main"></span>主线
      </label>
      <label v-if="hasLine('school')" class="legend-item">
        <input v-model="visible.school" type="checkbox">
        <span class="swatch school"></span>校线
      </label>
      <label v-if="hasLine('program')" class="legend-item">
        <input v-model="visible.program" type="checkbox">
        <span class="swatch program"></span>专业线
      </label>
      <span v-for="type in minimumTypes" :key="type" class="legend-item static">
        <span class="marker" :class="`marker-${type}`"></span>{{ minimumLabel(type) }}
      </span>
    </div>

    <LineChart
      :series="chartSeries"
      :years="chartYears"
      :y-max="yMax"
      :aria-label="ariaLabel"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MinimumType, ScoreLineQueryResult } from '@/api'
import { MINIMUM_TYPE_LABELS, SCOPE_LABELS, subjectNameOf } from '@shared/score-line'
import LineChart from '@/components/LineChart.vue'
import type { ChartSeries } from '@/components/LineChart.vue'

const props = defineProps<{ result: ScoreLineQueryResult }>()

const colors = {
  main: '#2f5d46',
  school: '#94621c',
  program: '#a33a2c'
}
const minimumColors: Record<MinimumType, string> = {
  '': '#8a867d',
  admit: '#8a867d',
  retest: '#3a6ea3',
  transfer: '#7a4b9a',
  other: '#8a867d'
}
const minimumMarkers: Record<MinimumType, ChartSeries['marker']> = {
  '': 'hollow-circle',
  admit: 'hollow-circle',
  retest: 'triangle',
  transfer: 'diamond',
  other: 'hollow-circle'
}

const subjects = computed(() => {
  const map = new Map<string, string>()
  for (const series of props.result.series) {
    map.set(series.subjectCode, subjectNameOf(series.subjectCode, series.name.split('·').pop()?.trim()))
  }
  for (const point of props.result.minimums) map.set(point.subjectCode, point.name)
  return [...map.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => {
      if (a.code === 'total') return -1
      if (b.code === 'total') return 1
      return a.name.localeCompare(b.name)
    })
})

const selected = ref(subjects.value[0]?.code ?? 'total')
watch(subjects, (list) => {
  if (list.length && !list.some((item) => item.code === selected.value)) {
    selected.value = list[0].code
  }
})

const visible = ref({ main: true, school: true, program: true })

function hasLine(kind: 'main' | 'school' | 'program'): boolean {
  return props.result.series.some((series) => series.lineType === kind)
}

const minimumTypes = computed(() => {
  const set = new Set<MinimumType>()
  for (const point of props.result.minimums) {
    if (point.subjectCode === selected.value) set.add(point.minimumType)
  }
  return [...set]
})

const chartSeries = computed<ChartSeries[]>(() => {
  const list: ChartSeries[] = []
  for (const kind of ['main', 'school', 'program'] as const) {
    if (!visible.value[kind]) continue
    const series = props.result.series.find(
      (item) => item.lineType === kind && item.subjectCode === selected.value
    )
    if (!series?.points.length) continue
    list.push({
      key: series.key,
      name: `${lineLabel(kind)} · ${subjectNameOf(series.subjectCode)}`,
      color: colors[kind],
      connect: true,
      marker: 'circle',
      points: series.points.map((point) => ({
        year: point.year,
        value: point.value,
        label: point.fullScore ? `满分 ${point.fullScore}` : undefined
      }))
    })
  }
  for (const type of minimumTypes.value) {
    const points = props.result.minimums
      .filter((point) => point.subjectCode === selected.value && point.minimumType === type)
      .map((point) => ({
        year: point.year,
        value: point.value,
        label: point.fullScore ? `满分 ${point.fullScore}` : undefined
      }))
    if (!points.length) continue
    list.push({
      key: `minimum:${type}`,
      name: minimumLabel(type),
      color: minimumColors[type] ?? '#8a867d',
      connect: false,
      marker: minimumMarkers[type] ?? 'hollow-circle',
      points
    })
  }
  return list
})

function lineLabel(kind: 'main' | 'school' | 'program'): string {
  if (kind === 'main') return props.result.main?.scope === 'national' ? '国家线' : '省控线'
  return SCOPE_LABELS[kind]
}

function minimumLabel(type: MinimumType): string {
  return MINIMUM_TYPE_LABELS[type as Exclude<MinimumType, ''>] ?? '最低分'
}

const chartYears = computed(() => {
  const set = new Set<number>()
  for (const series of chartSeries.value) {
    for (const point of series.points) set.add(point.year)
  }
  if (set.size === 0) set.add(props.result.selection.year)
  return [...set].sort((a, b) => a - b).slice(-10)
})

const yMax = computed(() => {
  let max = 100
  for (const series of chartSeries.value) {
    for (const point of series.points) max = Math.max(max, point.value)
  }
  // 选一个能被 4 等分、刻度是整十 / 整百的上限，避免出现 263、88 这类零碎刻度。
  const steps = [10, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000]
  const target = max * 1.05
  const step = steps.find((value) => value * 4 >= target) ?? 1000
  return step * 4
})

const ariaLabel = computed(
  () =>
    `${props.result.selection.year} 年 ${subjectNameOf(selected.value)} 分数线趋势，共 ${chartSeries.value.length} 条线`
)
</script>

<style scoped>
.chart-card {
  padding: 18px 20px;
}

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.chart-title {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
}

.subject-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  max-width: 100%;
}

.subject-chip {
  flex-shrink: 0;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  padding: 5px 11px;
  font-size: 12.5px;
  cursor: pointer;
}

.subject-chip.on {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent);
  font-weight: 500;
}

.legend {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin: 14px 0 6px;
  color: var(--ink-3);
  font-size: 12px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-item.static {
  cursor: default;
}

.swatch {
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.swatch.main {
  background: #2f5d46;
}

.swatch.school {
  background: #94621c;
}

.swatch.program {
  background: #a33a2c;
}

.marker {
  width: 9px;
  height: 9px;
  border: 2px solid #8a867d;
  border-radius: 50%;
  display: inline-block;
}

.marker-retest {
  border-color: #3a6ea3;
  border-radius: 0;
  transform: rotate(45deg);
}

.marker-transfer {
  border-color: #7a4b9a;
  border-radius: 0;
  transform: rotate(45deg);
}
</style>
