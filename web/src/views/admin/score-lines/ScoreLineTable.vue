<template>
  <div class="table-wrap">
    <table class="table score-table">
      <thead>
        <tr>
          <th class="subject-col">科目</th>
          <th v-for="year in years" :key="year">{{ year }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key" :class="row.kind">
          <td class="subject-col">{{ row.label }}</td>
          <td v-for="(value, index) in row.values" :key="index" class="num">
            {{ value ?? '—' }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!rows.length" class="empty-line">还没有可展示的数据。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MinimumType, QueryLine, ScoreLineQueryResult } from '@/api'
import { MINIMUM_TYPE_LABELS, SCOPE_LABELS, subjectNameOf } from '@shared/score-line'

const props = defineProps<{ result: ScoreLineQueryResult }>()

interface Row {
  key: string
  label: string
  kind: string
  values: (number | null)[]
}

const lines = computed<{ key: 'main' | 'school' | 'program'; line: QueryLine | null; label: string }[]>(
  () => [
    { key: 'main', line: props.result.main, label: lineLabel('main', props.result.main) },
    { key: 'school', line: props.result.schoolLine, label: '校线' },
    { key: 'program', line: props.result.programLine, label: '专业线' }
  ]
)

function lineLabel(kind: 'main' | 'school' | 'program', line: QueryLine | null): string {
  if (kind === 'main') return line?.scope === 'national' ? '国家线' : '省控线'
  return SCOPE_LABELS[kind]
}

const years = computed(() => {
  const set = new Set<number>()
  for (const entry of lines.value) {
    for (const year of entry.line?.years ?? []) set.add(year.year)
  }
  for (const point of props.result.minimums) set.add(point.year)
  return [...set].sort((a, b) => a - b).slice(-10)
})

const subjectCodes = computed(() => {
  const names = new Map<string, string>()
  for (const entry of lines.value) {
    for (const year of entry.line?.years ?? []) {
      for (const metric of year.metrics) {
        if (metric.isMinimum === 1) continue
        names.set(metric.subjectCode, metric.subjectName || subjectNameOf(metric.subjectCode))
      }
    }
  }
  for (const point of props.result.minimums) {
    names.set(point.subjectCode, point.name)
  }
  return [...names.entries()].sort((a, b) => {
    if (a[0] === 'total') return -1
    if (b[0] === 'total') return 1
    return a[1].localeCompare(b[1])
  })
})

function valueAt(line: QueryLine | null, year: number, subjectCode: string): number | null {
  const entry = line?.years.find((item) => item.year === year)
  const metric = entry?.metrics.find(
    (item) => item.subjectCode === subjectCode && item.isMinimum === 0
  )
  return metric ? metric.value : null
}

const minimumTypes = computed(() => {
  const set = new Set<MinimumType>()
  for (const point of props.result.minimums) set.add(point.minimumType)
  return [...set]
})

const rows = computed<Row[]>(() => {
  const list: Row[] = []
  for (const entry of lines.value) {
    if (!entry.line) continue
    for (const [code, name] of subjectCodes.value) {
      const values = years.value.map((year) => valueAt(entry.line, year, code))
      if (values.every((value) => value === null)) continue
      list.push({
        key: `${entry.key}:${code}`,
        label: `${entry.label} · ${name}`,
        kind: entry.key,
        values
      })
    }
  }
  for (const type of minimumTypes.value) {
    for (const [code, name] of subjectCodes.value) {
      const values = years.value.map((year) => {
        const point = props.result.minimums.find(
          (item) => item.year === year && item.subjectCode === code && item.minimumType === type
        )
        return point ? point.value : null
      })
      if (values.every((value) => value === null)) continue
      list.push({
        key: `minimum:${type}:${code}`,
        label: `${MINIMUM_TYPE_LABELS[type] ?? '最低分'} · ${name}`,
        kind: 'minimum',
        values
      })
    }
  }
  return list
})
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}

.score-table {
  min-width: 520px;
}

.subject-col {
  position: sticky;
  left: 0;
  background: var(--surface);
  z-index: 1;
}

.score-table th:first-child,
.score-table td:first-child {
  min-width: 150px;
}

.score-table td {
  font-variant-numeric: tabular-nums;
}

.score-table tr.main td:first-child {
  color: var(--accent);
}

.score-table tr.school td:first-child {
  color: var(--amber);
}

.score-table tr.program td:first-child {
  color: var(--danger);
}

.score-table tr.minimum td {
  color: var(--ink-2);
}

.empty-line {
  padding: 20px;
  text-align: center;
  color: var(--ink-3);
  font-size: 13px;
}
</style>
