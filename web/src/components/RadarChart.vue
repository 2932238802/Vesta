<template>
  <div class="radar">
    <div class="plot" @pointerleave="hover = -1">
      <svg viewBox="0 0 400 340" role="img" :aria-label="ariaLabel">
        <polygon
          v-for="level in levels"
          :key="level"
          :points="ringPoints(level)"
          fill="none"
          stroke="var(--line)"
          stroke-width="1"
        />
        <line
          v-for="(_, i) in dimensions"
          :key="`axis-${i}`"
          :x1="center.x"
          :y1="center.y"
          :x2="pointAt(i, 1).x"
          :y2="pointAt(i, 1).y"
          stroke="var(--line)"
          stroke-width="1"
        />

        <polygon
          :points="shapePoints"
          :fill="accent"
          fill-opacity="0.12"
          :stroke="accent"
          stroke-width="2"
          stroke-linejoin="round"
        />

        <g v-for="(dimension, i) in dimensions" :key="dimension.key">
          <circle
            :cx="pointAt(i, dimension.score / 100).x"
            :cy="pointAt(i, dimension.score / 100).y"
            r="4.5"
            :fill="accent"
            stroke="var(--surface)"
            stroke-width="2"
          />
          <circle
            :cx="pointAt(i, dimension.score / 100).x"
            :cy="pointAt(i, dimension.score / 100).y"
            r="14"
            fill="transparent"
            class="hit"
            @pointerenter="hover = i"
          >
            <title>{{ dimension.name }} {{ dimension.score }} 分</title>
          </circle>
          <text
            :x="labelAt(i).x"
            :y="labelAt(i).y"
            :text-anchor="labelAt(i).anchor"
            :dy="labelAt(i).dy"
            class="axis-label"
          >
            {{ shortName(dimension) }}
          </text>
        </g>
      </svg>

      <div
        v-if="hover >= 0"
        class="tooltip"
        :style="{ left: tooltip.x, top: tooltip.y }"
      >
        <span class="tooltip-name">{{ dimensions[hover].name }}</span>
        <span class="tooltip-value">{{ dimensions[hover].score }}</span>
      </div>
    </div>

    <details class="data">
      <summary>查看数据</summary>
      <div class="data-grid">
        <div v-for="dimension in dimensions" :key="dimension.key" class="data-row">
          <span>{{ dimension.name }}</span>
          <span class="data-value">{{ dimension.score }}</span>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DimScore } from '@shared/types'

const props = defineProps<{
  dimensions: DimScore[]
  accent: string
}>()

const hover = ref(-1)
const center = { x: 200, y: 168 }
const radius = 108
const labelRadius = 136
const levels = [0.25, 0.5, 0.75, 1]

const shortNames: Record<string, string> = {
  b1: '方向',
  b2: '学业',
  b3: '实践',
  b4: '技能',
  b5: '方法',
  b6: '执行',
  b7: '信息',
  b8: '家庭',
  b9: '英语'
}

function shortName(dimension: DimScore): string {
  return shortNames[dimension.key] ?? dimension.name
}

function angleAt(index: number): number {
  return -Math.PI / 2 + (index * Math.PI * 2) / props.dimensions.length
}

function pointAt(index: number, ratio: number) {
  const angle = angleAt(index)
  return {
    x: center.x + Math.cos(angle) * radius * ratio,
    y: center.y + Math.sin(angle) * radius * ratio
  }
}

function labelAt(index: number) {
  const angle = angleAt(index)
  const x = center.x + Math.cos(angle) * labelRadius
  const y = center.y + Math.sin(angle) * labelRadius
  const cos = Math.cos(angle)
  const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle'
  const dy = Math.sin(angle) > 0.4 ? '0.9em' : Math.sin(angle) < -0.4 ? '-0.35em' : '0.32em'
  return { x, y, anchor, dy }
}

function ringPoints(ratio: number): string {
  return props.dimensions
    .map((_, i) => pointAt(i, ratio))
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
}

const shapePoints = computed(() =>
  props.dimensions
    .map((dimension, i) => {
      const point = pointAt(i, Math.max(0, Math.min(100, dimension.score)) / 100)
      return `${point.x},${point.y}`
    })
    .join(' ')
)

const ariaLabel = computed(() =>
  props.dimensions.map((d) => `${d.name} ${d.score} 分`).join('，')
)

const tooltip = computed(() => {
  if (hover.value < 0) return { x: '0%', y: '0%' }
  const dim = props.dimensions[hover.value]
  const point = pointAt(hover.value, dim.score / 100)
  return {
    x: `${(point.x / 400) * 100}%`,
    y: `${(point.y / 340) * 100}%`
  }
})
</script>

<style scoped>
.radar {
  width: 100%;
}

.plot {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 8px 6px 0;
  border-radius: 24px;
  background: radial-gradient(
    ellipse at 50% 42%,
    color-mix(in srgb, var(--accent) 4%, transparent),
    transparent 68%
  );
}

svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

.axis-label {
  fill: var(--ink-3);
  font-size: 11px;
  font-family: var(--sans);
  letter-spacing: 0.02em;
}

.hit {
  cursor: default;
}

.tooltip {
  position: absolute;
  transform: translate(-50%, -130%);
  display: flex;
  align-items: baseline;
  gap: 6px;
  background: var(--ink);
  color: #fff;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 11px;
  box-shadow: 0 8px 20px -12px rgba(20, 19, 16, 0.5);
  pointer-events: none;
  white-space: nowrap;
}

.tooltip-value {
  font-family: var(--mono);
  font-size: 12px;
}

.data {
  margin-top: 10px;
  text-align: center;
}

.data summary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  list-style: none;
  cursor: pointer;
  padding: 7px 13px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  font-size: 12px;
  color: var(--ink-2);
  letter-spacing: 0.04em;
}

.data summary:hover {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.data summary::-webkit-details-marker {
  display: none;
}

.data summary::after {
  content: "＋";
  margin-left: 2px;
  opacity: 0.6;
}

.data[open] summary::after {
  content: "－";
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 28px;
  padding: 8px 6px 8px;
  text-align: left;
}

.data-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--ink-2);
}

.data-value {
  font-family: var(--mono);
  color: var(--ink);
}

@media (max-width: 480px) {
  .axis-label {
    font-size: 10px;
  }

  .data-grid {
    grid-template-columns: 1fr;
  }
}
</style>
