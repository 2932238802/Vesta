<template>
  <div class="score-page">
    <AdminPageHeader eyebrow="内部查询" title="升学分数线查询" />

    <ScoreLineFilters
      v-model="filters"
      :loading="querying"
      :can-query="Boolean(filters.province)"
      :facets="facets"
      :facets-loading="facetsLoading"
      @open-school="schoolOpen = true"
      @open-program="programOpen = true"
      @dimension-change="onDimensionChange"
      @search="search"
    />

    <p v-if="error" class="notice">{{ error }}</p>
    <p v-if="!result && !querying" class="state-line">
      选择考试类型、年份和省份后点「查询」；专升本只看省控线，选院校 / 专业后再看校线和专业线。
    </p>

    <template v-if="result">
      <div v-if="result.requires.length" class="card require-card">
        <p class="require-title">请补选后再查询</p>
        <p class="quiet">
          {{ result.requires.map(requireLabel).join('、') }}
          有多条同类分数线，系统不会自动混在一起画。在上方选择后会自动重查。
        </p>
      </div>

      <template v-else>
        <p v-if="result.coverage.pendingCount" class="pending-badge">
          这个范围有 {{ result.coverage.pendingCount }} 条历史数据尚未通过自动校验，暂不显示数字。
        </p>

        <p v-if="isJuniorCollege" class="card junior-notice">
          该校为专科院校，不设专升本院校线；请选择接收本科院校。
        </p>

        <div class="line-stack">
          <LineCard
            :line="result.main"
            kind="main"
            :title="result.main?.title || '主线未收录'"
            :year="result.selection.year"
            :empty-text="emptyMainText"
          />
          <LineCard
            v-if="result.school && !isJuniorCollege"
            :line="result.schoolLine"
            kind="school"
            :title="`${result.school.name} · 校线`"
            :subtitle="schoolSubtitle"
            :year="result.selection.year"
            :empty-text="emptySchoolText"
          />
          <LineCard
            v-if="result.program && !isJuniorCollege"
            :line="result.programLine"
            kind="program"
            :title="`${result.program.majorName} · 专业线`"
            :subtitle="result.school?.name"
            :year="result.selection.year"
            :empty-text="emptyProgramText"
          />
        </div>

        <p v-if="result.school && !result.program && !isJuniorCollege" class="select-hint">
          已选院校；再选一个专业可以看专业线和招生计划。没有专业数据时校线仍保留。
        </p>

        <section v-if="!result.school && schoolList.length" class="card school-list-card">
          <header class="school-list-head">
            <div>
              <p class="eyebrow">可查询院校</p>
              <h2>选择院校后叠加校线 / 专业线</h2>
            </div>
            <span class="quiet tiny">{{ schoolList.length }} 所</span>
          </header>
          <div class="table-wrap">
            <table class="table school-table">
              <thead>
                <tr><th>院校</th><th>城市</th><th>性质</th><th>计划数</th><th>覆盖</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="school in schoolList" :key="school.id">
                  <td>{{ school.name }}</td>
                  <td>{{ school.city || '—' }}</td>
                  <td>{{ school.nature || '未标注' }}</td>
                  <td class="num">{{ school.planCount ?? '—' }}</td>
                  <td>
                    <span v-if="school.coverage" class="chip" :class="{ accent: school.coverage.status === 'covered' }">
                      {{ coverageLabel(school.coverage.status) }}
                    </span>
                    <span v-else class="quiet">未查询</span>
                  </td>
                  <td class="right">
                    <button class="btn ghost small" type="button" @click="selectSchool(school)">选择</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <ChartCard v-if="result.series.length || result.minimums.length" :result="result" />

        <section v-if="result.series.length || result.minimums.length" class="card table-card">
          <header class="table-head">
            <div>
              <p class="eyebrow">数据表</p>
              <h2>科目 × 年份</h2>
            </div>
            <span class="quiet tiny">缺数据的年份留空，不补 0</span>
          </header>
          <ScoreLineTable :result="result" />
        </section>

        <PlanTable :program="result.program" />

        <section v-if="result.sources.length" class="card sources-card">
          <p class="eyebrow">来源</p>
          <ul class="source-list">
            <li v-for="source in result.sources" :key="source.url || source.name">
              <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.name || source.url }} ↗</a>
              <span v-else>{{ source.name }}</span>
              <span class="quiet tiny">抓取于 {{ formatDate(source.fetchedAt) }}</span>
            </li>
          </ul>
        </section>
      </template>
    </template>

    <SchoolPicker
      :open="schoolOpen"
      :exam="filters.exam"
      :year="filters.year"
      :province="filters.province"
      :selected-id="filters.school?.id"
      @close="schoolOpen = false"
      @select="selectSchool"
    />
    <ProgramPicker
      :open="programOpen"
      :school-id="filters.school?.id ?? ''"
      :year="filters.year"
      :exam="filters.exam"
      :selected-id="filters.program?.id"
      @close="programOpen = false"
      @select="selectProgram"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api'
import type {
  CoverageStatus,
  SchoolProgram,
  SchoolSearchItem,
  ScoreLineFacets,
  ScoreLineQueryResult
} from '@/api'
import { COVERAGE_LABELS } from '@shared/score-line'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { formatDate } from '@/format'
import ChartCard from './score-lines/ChartCard.vue'
import LineCard from './score-lines/LineCard.vue'
import PlanTable from './score-lines/PlanTable.vue'
import ProgramPicker from './score-lines/ProgramPicker.vue'
import SchoolPicker from './score-lines/SchoolPicker.vue'
import ScoreLineFilters from './score-lines/ScoreLineFilters.vue'
import ScoreLineTable from './score-lines/ScoreLineTable.vue'
import { emptyFilters } from './score-lines/types'
import type { ScoreLineFilterState } from './score-lines/types'

const filters = ref<ScoreLineFilterState>(emptyFilters())
const result = ref<ScoreLineQueryResult | null>(null)
const facets = ref<ScoreLineFacets | null>(null)
const facetsLoading = ref(false)
const schools = ref<SchoolSearchItem[]>([])
const querying = ref(false)
const error = ref('')
const schoolOpen = ref(false)
const programOpen = ref(false)
let facetsSeq = 0

const schoolList = computed(() =>
  filters.value.exam === 'upgrade' || !filters.value.school ? schools.value : []
)
const schoolSubtitle = computed(() =>
  result.value?.school ? [result.value.school.city, result.value.school.nature].filter(Boolean).join(' · ') : ''
)
// 专科院校没有自己的专升本院校线；选中时给出说明，不显示误导性的“未收录”。
const isJuniorCollege = computed(() => result.value?.school?.level === '专科')
const emptyMainText = computed(() =>
  result.value?.coverage.status === 'pending'
    ? '主线数据正在自动校验，暂不显示数字。'
    : '主线未收录。'
)
const emptySchoolText = '该校当年校线未收录；不拿主线或专业线冒充校线。'
const emptyProgramText = '该专业当年专业线未收录；校线仍然保留。'

function requireLabel(key: string): string {
  return key === 'province' ? '省份' : key === 'category' ? '批次 / 学位类型' : '科类 / 学科门类'
}

function coverageLabel(status: CoverageStatus | ''): string {
  return status ? COVERAGE_LABELS[status] ?? status : ''
}

async function loadFacets(retry = true) {
  if (!filters.value.province) {
    facets.value = null
    facetsLoading.value = false
    return
  }
  const seq = ++facetsSeq
  facetsLoading.value = true
  try {
    const response = await api.scoreLineFacets({
      exam: filters.value.exam,
      year: filters.value.year,
      province: filters.value.province,
      category: filters.value.category || undefined,
      track: filters.value.track || undefined
    })
    if (seq !== facetsSeq) return
    facets.value = response
    if (resetMissingDimensions() && retry) await loadFacets(false)
  } catch {
    if (seq === facetsSeq) facets.value = null
  } finally {
    if (seq === facetsSeq) facetsLoading.value = false
  }
}

/** 级联后旧选择可能已不在候选里；清空它，避免「选了 0 条」的假选项。 */
function resetMissingDimensions(): boolean {
  if (!facets.value) return false
  const patch: Partial<ScoreLineFilterState> = {}
  if (
    filters.value.category &&
    !facets.value.category.some((option) => option.value === filters.value.category)
  ) {
    patch.category = ''
  }
  if (
    filters.value.track &&
    !facets.value.track.some((option) => option.value === filters.value.track)
  ) {
    patch.track = ''
  }
  if (Object.keys(patch).length === 0) return false
  filters.value = { ...filters.value, ...patch }
  return true
}

async function onDimensionChange() {
  await loadFacets()
  if (filters.value.province) await search()
}

async function search() {
  if (!filters.value.province) return
  querying.value = true
  error.value = ''
  try {
    result.value = await api.scoreLineQuery({
      exam: filters.value.exam,
      year: filters.value.year,
      province: filters.value.province,
      category: filters.value.category,
      track: filters.value.track,
      schoolId: filters.value.school?.id,
      programId: filters.value.program?.id
    })
    if (!filters.value.school) await loadSchools()
    else schools.value = []
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '查询失败'
  } finally {
    querying.value = false
  }
}

async function loadSchools() {
  try {
    const response = await api.scoreLineSchools({
      province: filters.value.province,
      exam: filters.value.exam,
      year: filters.value.year,
      limit: 50
    })
    schools.value = response.schools
  } catch {
    schools.value = []
  }
}

function selectSchool(school: SchoolSearchItem) {
  filters.value = { ...filters.value, school, program: null, province: school.province || filters.value.province }
  schoolOpen.value = false
  void search()
}

function selectProgram(program: SchoolProgram) {
  filters.value = { ...filters.value, program }
  programOpen.value = false
  void search()
}

watch(
  () => `${filters.value.exam}|${filters.value.year}|${filters.value.province}`,
  () => {
    if (filters.value.category || filters.value.track) {
      filters.value = { ...filters.value, category: '', track: '' }
    }
    void loadFacets()
  }
)

onMounted(() => {
  void loadFacets()
})
</script>

<style scoped>
.score-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.require-card {
  padding: 16px 18px;
  border-color: var(--amber);
  background: #fbf5e9;
}

.require-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.pending-badge {
  color: var(--amber);
  font-size: 12.5px;
}

.junior-notice {
  padding: 14px 18px;
  border-color: var(--amber);
  background: #fbf5e9;
  color: var(--ink-2);
  font-size: 13px;
}

.line-stack {
  display: grid;
  gap: 10px;
}

.select-hint {
  color: var(--ink-3);
  font-size: 12.5px;
}

.school-list-card,
.table-card,
.sources-card {
  padding: 16px 18px;
}

.school-list-head,
.table-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.school-list-head h2,
.table-head h2 {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
}

.table-wrap {
  overflow-x: auto;
}

.school-table {
  min-width: 620px;
}

.right {
  text-align: right;
}

.source-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
  list-style: none;
  padding: 0;
}

.source-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
}

.source-list a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 700px) {
  .score-page {
    gap: 12px;
  }
}
</style>
