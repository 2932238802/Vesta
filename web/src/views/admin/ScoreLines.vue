<template>
  <div class="score-page">
    <AdminPageHeader
      eyebrow="内部查询"
      title="分数线"
      subtitle="内部查询参考；主线永远显示，校线 / 专业线在选院校后叠加。抓取数据默认待复核。"
    >
      <template #actions>
        <span v-if="crawlHint" class="quiet tiny">{{ crawlHint }}</span>
        <button class="btn ghost" type="button" @click="queueOpen = true">抓取队列</button>
        <button class="btn ghost" type="button" @click="reviewOpen = true">
          复核{{ reviewCount ? ` ${reviewCount}` : '' }}
        </button>
        <button class="btn ghost" type="button" @click="coverageOpen = true">覆盖看板</button>
        <button class="btn ghost" type="button" @click="importOpen = true">人工导入</button>
        <button
          class="btn"
          type="button"
          :disabled="!filters.province || crawling"
          @click="triggerCrawl"
        >{{ crawling ? '抓取中…' : '立即抓取本省' }}</button>
      </template>
    </AdminPageHeader>

    <ScoreLineFilters
      v-model="filters"
      :loading="querying"
      :can-query="Boolean(filters.province)"
      @open-school="schoolOpen = true"
      @open-program="programOpen = true"
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
          有多条同类分数线，系统不会自动混在一起画。
        </p>
      </div>

      <template v-else>
        <p v-if="result.coverage.pendingCount" class="pending-badge">
          这个范围有 {{ result.coverage.pendingCount }} 条待复核数据，复核通过后才会显示数字。
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
            v-if="result.school"
            :line="result.schoolLine"
            kind="school"
            :title="`${result.school.name} · 校线`"
            :subtitle="schoolSubtitle"
            :year="result.selection.year"
            :empty-text="emptySchoolText"
          />
          <LineCard
            v-if="result.program"
            :line="result.programLine"
            kind="program"
            :title="`${result.program.majorName} · 专业线`"
            :subtitle="result.school?.name"
            :year="result.selection.year"
            :empty-text="emptyProgramText"
          />
        </div>

        <p v-if="result.school && !result.program" class="select-hint">
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

        <ChartCard v-if="result.series.length" :result="result" />

        <section v-if="result.series.length" class="card table-card">
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
    <CoverageView
      :open="coverageOpen"
      :exam="filters.exam"
      :year="filters.year"
      :province="filters.province"
      @close="coverageOpen = false"
    />
    <ReviewView
      :open="reviewOpen"
      :province="filters.province"
      :year="filters.year"
      @close="reviewOpen = false"
      @changed="onReviewed"
    />
    <ImportDialog :open="importOpen" @close="importOpen = false" @imported="onImported" />

    <Modal :open="queueOpen" title="抓取队列" eyebrow="一次只抓一个省" @close="queueOpen = false">
      <p v-if="!queue.running && !queue.queue.length" class="state-line">当前没有抓取任务。</p>
      <template v-else>
        <p v-if="queue.running" class="queue-line">
          正在抓取：{{ queue.running.province }}
          <span class="quiet tiny">（已保存 {{ queue.running.saved }} 条）</span>
        </p>
        <p v-for="item in queue.queue" :key="item.id" class="queue-line">
          {{ item.position }}. {{ item.province }}
          <button class="link-btn" type="button" @click="cancelQueued(item.id)">取消排队</button>
        </p>
      </template>
    </Modal>

    <p v-if="toast" class="toast">{{ toast }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api'
import type {
  AdminCrawlQueueResponse,
  CoverageStatus,
  SchoolProgram,
  SchoolSearchItem,
  ScoreLineQueryResult
} from '@/api'
import { COVERAGE_LABELS } from '@shared/score-line'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import Modal from '@/components/Modal.vue'
import { formatDate } from '@/format'
import ChartCard from './score-lines/ChartCard.vue'
import CoverageView from './score-lines/CoverageView.vue'
import ImportDialog from './score-lines/ImportDialog.vue'
import LineCard from './score-lines/LineCard.vue'
import PlanTable from './score-lines/PlanTable.vue'
import ProgramPicker from './score-lines/ProgramPicker.vue'
import ReviewView from './score-lines/ReviewView.vue'
import SchoolPicker from './score-lines/SchoolPicker.vue'
import ScoreLineFilters from './score-lines/ScoreLineFilters.vue'
import ScoreLineTable from './score-lines/ScoreLineTable.vue'
import { emptyFilters } from './score-lines/types'
import type { ScoreLineFilterState } from './score-lines/types'

const filters = ref<ScoreLineFilterState>(emptyFilters())
const result = ref<ScoreLineQueryResult | null>(null)
const schools = ref<SchoolSearchItem[]>([])
const querying = ref(false)
const error = ref('')
const reviewCount = ref(0)
const schoolOpen = ref(false)
const programOpen = ref(false)
const coverageOpen = ref(false)
const reviewOpen = ref(false)
const importOpen = ref(false)
const queueOpen = ref(false)
const crawling = ref(false)
const crawlHint = ref('')
const toast = ref('')
const queue = ref<AdminCrawlQueueResponse>({ running: null, queue: [] })
let toastTimer: ReturnType<typeof setTimeout> | undefined

const schoolList = computed(() =>
  filters.value.exam === 'upgrade' || !filters.value.school ? schools.value : []
)
const schoolSubtitle = computed(() =>
  result.value?.school ? [result.value.school.city, result.value.school.nature].filter(Boolean).join(' · ') : ''
)
const emptyMainText = computed(() =>
  result.value?.coverage.status === 'pending'
    ? '主线数据正在复核，暂不显示数字。'
    : '主线未收录；可点右上角「立即抓取本省」或人工导入。'
)
const emptySchoolText = '该校当年校线未收录；不拿主线或专业线冒充校线。'
const emptyProgramText = '该专业当年专业线未收录；校线仍然保留。'

function requireLabel(key: string): string {
  return key === 'province' ? '省份' : key === 'category' ? '批次 / 学位类型' : '科类 / 学科门类'
}

function coverageLabel(status: CoverageStatus | ''): string {
  return status ? COVERAGE_LABELS[status] ?? status : ''
}

function flash(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2400)
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

async function triggerCrawl() {
  if (!filters.value.province || crawling.value) return
  crawling.value = true
  error.value = ''
  try {
    const started = await api.scoreLineCrawl({
      province: filters.value.province,
      years: [filters.value.year]
    })
    crawlHint.value = `已加入队列：${started.province}（第 ${started.position || 1} 位）`
    await pollRun(started.runId)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '触发抓取失败'
  } finally {
    crawling.value = false
    void loadQueue()
  }
}

async function pollRun(runId: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const detail = await api.scoreLineCrawlRun(runId)
    if (!['queued', 'running'].includes(detail.run.status)) {
      crawlHint.value =
        detail.run.status === 'failed'
          ? `抓取失败：${detail.run.message || '未知原因'}`
          : detail.run.status === 'index'
            ? '抓取完成：只发现索引页，没有可写库数据；请补栏目 URL 或人工导入。'
            : `抓取完成：保存 ${detail.run.saved} 条，失败 ${detail.run.failed} 条`
      if (detail.run.status !== 'failed' && result.value) await search()
      return
    }
    crawlHint.value = `正在抓取 ${detail.run.province}…（已保存 ${detail.run.saved}）`
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  crawlHint.value = '抓取仍在进行，可稍后在「抓取队列」查看。'
}

async function loadQueue() {
  try {
    queue.value = await api.scoreLineCrawlQueue()
  } catch {
    // 队列读取失败不阻塞页面。
  }
}

async function cancelQueued(id: string) {
  try {
    await api.cancelScoreLineCrawl(id)
    await loadQueue()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '取消失败'
  }
}

async function loadReviewCount() {
  try {
    const count = await api.scoreLineReviewCount({ province: filters.value.province })
    reviewCount.value = count.total
  } catch {
    reviewCount.value = 0
  }
}

function onReviewed() {
  flash('已复核')
  void loadReviewCount()
  if (result.value) void search()
}

function onImported() {
  flash('已导入')
  void search()
}

onMounted(() => {
  void loadQueue()
  void loadReviewCount()
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

.queue-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13.5px;
}

.queue-line:last-child {
  border-bottom: 0;
}

.link-btn {
  border: 0;
  background: transparent;
  color: var(--danger);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

@media (max-width: 700px) {
  .score-page {
    gap: 12px;
  }
}
</style>
