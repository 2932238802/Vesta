<template>
  <section class="card filter-card">
    <div class="exam-tabs" role="tablist" aria-label="考试类型">
      <button
        v-for="exam in exams"
        :key="exam.value"
        class="exam-tab"
        :class="{ on: filters.exam === exam.value }"
        type="button"
        role="tab"
        :aria-selected="filters.exam === exam.value"
        @click="selectExam(exam.value)"
      >{{ exam.label }}</button>
    </div>

    <div class="filter-grid">
      <label class="field">
        <span>年份</span>
        <select class="select" :value="filters.year" @change="onYear">
          <option v-for="year in years" :key="year" :value="year">{{ year }} 年</option>
        </select>
      </label>

      <label class="field">
        <span>省份{{ filters.exam === 'upgrade' ? '（必填）' : '' }}</span>
        <select class="select" :value="filters.province" @change="onProvince">
          <option value="">选择省份</option>
          <option v-for="province in provinceNames" :key="province" :value="province">
            {{ province }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>批次 / 学位类型</span>
        <input
          class="input"
          :value="filters.category"
          maxlength="40"
          :placeholder="filters.exam === 'postgrad' ? '学硕 / 专硕' : '普通类 / 建档立卡'"
          @input="onCategory"
        >
      </label>

      <label class="field">
        <span>科类 / 学科门类</span>
        <input
          class="input"
          :value="filters.track"
          maxlength="60"
          :placeholder="filters.exam === 'postgrad' ? '工学 / 理学…' : '文史 / 理工…'"
          @input="onTrack"
        >
      </label>

      <div class="field">
        <span>院校</span>
        <div class="picker-row">
          <button class="picker" type="button" @click="$emit('open-school')">
            <span :class="{ muted: !filters.school }">
              {{ filters.school?.name ?? '搜索院校…' }}
            </span>
            <span class="picker-meta" v-if="filters.school">
              {{ filters.school.city || filters.school.province }}
            </span>
          </button>
          <button
            v-if="filters.school"
            class="clear"
            type="button"
            aria-label="清除院校"
            @click="clearSchool"
          >×</button>
        </div>
      </div>

      <div class="field">
        <span>专业</span>
        <div class="picker-row">
          <button
            class="picker"
            type="button"
            :disabled="!filters.school"
            @click="$emit('open-program')"
          >
            <span :class="{ muted: !filters.program }">
              {{ filters.program?.majorName ?? (filters.school ? '搜索专业…' : '先选院校') }}
            </span>
            <span class="picker-meta" v-if="filters.program">
              {{ filters.program.degreeType }} {{ filters.program.studyMode }}
            </span>
          </button>
          <button
            v-if="filters.program"
            class="clear"
            type="button"
            aria-label="清除专业"
            @click="clearProgram"
          >×</button>
        </div>
      </div>
    </div>

    <footer class="filter-foot">
      <span v-if="filters.exam === 'postgrad' && filters.province" class="chip accent">
        {{ regionLabel }}
      </span>
      <span class="quiet tiny">主线永远显示；选院校 / 专业后叠加校线和专业线。</span>
      <button
        class="btn"
        type="button"
        :disabled="!canQuery || loading"
        @click="$emit('search')"
      >{{ loading ? '查询中…' : '查询' }}</button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExamType, School, SchoolProgram } from '@/api'
import { provinceNames, provinceRegion } from '@shared/score-line-region'
import type { ScoreLineFilterState } from './types'
import { yearOptions } from './types'

const props = defineProps<{ loading?: boolean; canQuery?: boolean }>()
const filters = defineModel<ScoreLineFilterState>({ required: true })
const emit = defineEmits<{
  (event: 'open-school'): void
  (event: 'open-program'): void
  (event: 'search'): void
}>()

const exams: { value: ExamType; label: string }[] = [
  { value: 'upgrade', label: '专升本' },
  { value: 'postgrad', label: '考研' }
]
const years = yearOptions()
const regionLabel = computed(() => provinceRegion(filters.value.province) || '全国')

function update(patch: Partial<ScoreLineFilterState>) {
  filters.value = { ...filters.value, ...patch }
}

function selectExam(value: ExamType) {
  update({
    exam: value,
    category: '',
    track: '',
    school: null,
    program: null
  })
}

function onYear(event: Event) {
  update({ year: Number((event.target as HTMLSelectElement).value) })
}

function onProvince(event: Event) {
  update({ province: (event.target as HTMLSelectElement).value })
}

function onCategory(event: Event) {
  update({ category: (event.target as HTMLInputElement).value })
}

function onTrack(event: Event) {
  update({ track: (event.target as HTMLInputElement).value })
}

function clearSchool() {
  update({ school: null, program: null })
}

function clearProgram() {
  update({ program: null })
}

defineExpose({
  setSchool(school: School) {
    update({ school, program: null, province: school.province || filters.value.province })
  },
  setProgram(program: SchoolProgram) {
    update({ program })
  }
})
</script>

<style scoped>
.filter-card {
  padding: 16px 18px;
  margin-bottom: 16px;
}

.exam-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.exam-tab {
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
}

.exam-tab.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 500;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 14px;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.picker {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  padding: 9px 11px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.picker:disabled {
  background: #f3f0e8;
  color: var(--ink-3);
  cursor: not-allowed;
}

.picker > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-meta {
  margin-left: auto;
  color: var(--ink-3);
  font-size: 11px;
  white-space: nowrap;
}

.muted {
  color: var(--ink-3);
}

.clear {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
}

.filter-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.filter-foot .btn {
  margin-left: auto;
}

@media (max-width: 900px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-foot .btn {
    width: 100%;
  }
}
</style>
