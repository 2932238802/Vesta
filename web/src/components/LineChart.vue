<template>
  <div class="chart-wrap">
    <svg
      v-if="series.length"
      class="chart"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="ariaLabel"
    >
      <g class="grid">
        <line
          v-for="tick in ticks"
          :key="`grid-${tick.value}`"
          :x1="padLeft"
          :x2="width - padRight"
          :y1="tick.y"
          :y2="tick.y"
        />
        <text
          v-for="tick in ticks"
          :key="`tick-${tick.value}`"
          :x="padLeft - 8"
          :y="tick.y + 4"
          text-anchor="end"
        >{{ tick.value }}</text>
      </g>

      <g class="axis">
        <line :x1="padLeft" :x2="width - padRight" :y1="plotBottom" :y2="plotBottom" />
        <text
          v-for="year in years"
          :key="`year-${year}`"
          :x="xOf(year)"
          :y="height - 10"
          text-anchor="middle"
        >{{ year }}</text>
      </g>

      <g v-for="item in series" :key="item.key">
        <path
          v-if="item.connect"
          :d="pathOf(item)"
          :stroke="item.color"
          fill="none"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <g v-for="point in item.points" :key="`${item.key}-${point.year}`">
          <circle
            v-if="item.marker === 'circle' || item.marker === 'hollow-circle'"
            :cx="xOf(point.year)"
            :cy="yOf(point.value)"
            :r="item.marker === 'hollow-circle' ? 5 : 4"
            :fill="item.marker === 'hollow-circle' ? 'var(--surface)' : item.color"
            :stroke="item.color"
            stroke-width="2"
          >
            <title>{{ pointLabel(item, point) }}</title>
          </circle>
          <polygon
            v-else-if="item.marker === 'triangle'"
            :points="trianglePoints(xOf(point.year), yOf(point.value))"
            fill="var(--surface)"
            :stroke="item.color"
            stroke-width="2"
          >
            <title>{{ pointLabel(item, point) }}</title>
          </polygon>
          <polygon
            v-else-if="item.marker === 'diamond'"
            :points="diamondPoints(xOf(point.year), yOf(point.value))"
            fill="var(--surface)"
            :stroke="item.color"
            stroke-width="2"
          >
            <title>{{ pointLabel(item, point) }}</title>
          </polygon>
        </g>
      </g>
    </svg>
    <p v-else class="chart-empty">当前科目没有可绘制的数据</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface ChartPoint {
  year: number
  value: number
  label?: string
}

export interface ChartSeries {
  key: string
  name: string
  color: string
  points: ChartPoint[]
  connect: boolean
  marker: 'circle' | 'hollow-circle' | 'triangle' | 'diamond' | 'none'
}

const props = withDefaults(
  defineProps<{
    series: ChartSeries[]
    years: number[]
    yMax: number
    ariaLabel: string
    height?: number
  }>(),
  { height: 280 }
)

const width = 760
const padLeft = 48
const padRight = 18
const padTop = 16
const padBottom = 34
const height = computed(() => props.height)
const plotBottom = computed(() => height.value - padBottom)

const minYear = computed(() => Math.min(...props.years))
const maxYear = computed(() => Math.max(...props.years))
const safeYMax = computed(() => (props.yMax > 0 ? props.yMax : 100))

function xOf(year: number): number {
  if (maxYear.value === minYear.value) return padLeft + (width - padLeft - padRight) / 2
  return (
    padLeft +
    ((year - minYear.value) / (maxYear.value - minYear.value)) * (width - padLeft - padRight)
  )
}

function yOf(value: number): number {
  const ratio = Math.min(Math.max(value / safeYMax.value, 0), 1)
  return plotBottom.value - ratio * (plotBottom.value - padTop)
}

const ticks = computed(() =>
  [0, 1, 2, 3, 4].map((step) => {
    const value = Math.round((safeYMax.value / 4) * step)
    return { value, y: yOf(value) }
  })
)

function pathOf(item: ChartSeries): string {
  const points = [...item.points].sort((a, b) => a.year - b.year)
  let path = ''
  let previous: ChartPoint | null = null
  for (const point of points) {
    const command = !previous || point.year !== previous.year + 1 ? 'M' : 'L'
    path += `${command}${xOf(point.year).toFixed(1)},${yOf(point.value).toFixed(1)} `
    previous = point
  }
  return path.trim()
}

function pointLabel(item: ChartSeries, point: ChartPoint): string {
  return `${point.year} ${item.name} ${point.value}${point.label ? `（${point.label}）` : ''}`
}

function trianglePoints(x: number, y: number): string {
  return `${x},${y - 6} ${x - 6},${y + 5} ${x + 6},${y + 5}`
}

function diamondPoints(x: number, y: number): string {
  return `${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`
}
</script>

<style scoped>
.chart-wrap {
  overflow-x: auto;
}

.chart {
  width: 100%;
  min-width: 560px;
  display: block;
}

.grid line {
  stroke: var(--line);
  stroke-width: 1;
}

.grid text,
.axis text {
  fill: var(--ink-3);
  font-size: 11px;
}

.axis line {
  stroke: var(--line-strong);
  stroke-width: 1;
}

.chart-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--ink-3);
  font-size: 13px;
}
</style>
