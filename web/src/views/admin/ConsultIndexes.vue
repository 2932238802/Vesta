<template>
  <div class="index-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">咨询</p>
        <h1 class="page-title">路径索引</h1>
      </div>
      <button class="btn ghost small" type="button" :disabled="loading" @click="load">
        {{ loading ? '正在计算' : '重新计算' }}
      </button>
    </header>

    <p class="quiet intro">
      每一条从开场到结束的路径都会生成一个固定索引。成交率、样本量和学生特点都来自实际生成与反馈记录，不需要人工填写。
    </p>

    <section class="card query-card">
      <div class="query-grid">
        <label class="field">
          <span>学生特点（可选，用逗号隔开）</span>
          <input
            v-model="tagsText"
            class="input"
            type="text"
            maxlength="300"
            placeholder="例：求职, 城市, 实习"
          />
        </label>
        <label class="field">
          <span>来访者情况（可选）</span>
          <textarea
            v-model="profile"
            class="textarea"
            rows="3"
            maxlength="20000"
            placeholder="粘贴问卷内容，系统会从路径已有的特点里匹配，不需要手填成交率。"
          />
        </label>
      </div>
      <div class="query-actions">
        <button class="btn small" type="button" :disabled="loading" @click="query">
          {{ loading ? '正在查' : '找匹配路径' }}
        </button>
        <button v-if="querying" class="btn quiet small" type="button" :disabled="loading" @click="load">
          查看全部
        </button>
        <span class="quiet tiny">索引按学生特点覆盖率、路径覆盖率和成交率置信下界排序。</span>
      </div>
      <p v-if="error" class="notice">{{ error }}</p>
    </section>

    <div class="summary-strip">
      <div>
        <strong>{{ pathCount }}</strong>
        <span>条路径（当前显示）</span>
      </div>
      <div>
        <strong>{{ runsScanned }}</strong>
        <span>次历史生成</span>
      </div>
      <div>
        <strong>{{ decidedTotal }}</strong>
        <span>次已反馈结果</span>
      </div>
      <div>
        <strong>{{ vocabulary.length }}</strong>
        <span>个可匹配特点</span>
      </div>
    </div>

    <div v-if="loading && paths.length === 0" class="card empty">正在根据历史记录计算索引</div>
    <div v-else-if="paths.length === 0" class="card empty">还没有可计算的完整路径</div>
    <div v-else class="index-list">
      <article v-for="item in paths" :key="item.id" class="card index-card">
        <header class="index-head">
          <div>
            <code class="index-id">{{ item.id }}</code>
            <p class="index-title">{{ item.pathText.at(-1) || '未命名结束节点' }}</p>
          </div>
          <div class="index-score">
            <strong>{{ percent(item.conversionRate) }}</strong>
            <span>成交率</span>
          </div>
        </header>

        <div class="metric-row">
          <span><b>{{ item.runCount }}</b> 次生成</span>
          <span><b>{{ item.decidedCount }}</b> 次已决策</span>
          <span><b>{{ item.won }}</b> 成交</span>
          <span><b>{{ item.lost }}</b> 未成交</span>
          <span><b>{{ item.abandoned }}</b> 中途退出</span>
          <span>置信下界 <b>{{ percent(item.conversionLowerBound) }}</b></span>
          <span>最近使用 <b>{{ item.lastUsedAt ? formatDate(item.lastUsedAt, false) : '暂无' }}</b></span>
        </div>

        <div class="feature-block">
          <p class="feature-label">路径特点</p>
          <div v-if="item.features.length" class="feature-list">
            <span v-for="feature in item.features" :key="feature.tag" class="feature-chip">
              {{ feature.tag }}
              <em>{{ feature.studentRuns }} 人命中 · {{ percent(feature.share) }}</em>
            </span>
          </div>
          <p v-else class="quiet tiny">这条路径还没有可统计的特点。</p>
        </div>

        <div class="feature-block">
          <p class="feature-label">历史学生特点</p>
          <div v-if="item.studentFeatures.length" class="feature-list">
            <span v-for="feature in item.studentFeatures" :key="feature.tag" class="feature-chip student">
              {{ feature.tag }}
              <em>{{ feature.runs }} 次 · {{ percent(feature.share) }}</em>
            </span>
          </div>
          <p v-else class="quiet tiny">还没有学生在这条路径上留下足够记录。</p>
        </div>

        <details class="path-detail">
          <summary>查看完整路径（{{ item.nodeCount }} 步）</summary>
          <ol class="path-steps">
            <li v-for="(text, index) in item.pathText" :key="index">{{ text }}</li>
          </ol>
        </details>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api, type ConsultContext, type ConsultPathIndex, type ConsultPathRank } from '@/api'
import { formatDate } from '@/format'

const loading = ref(true)
const error = ref('')
const querying = ref(false)
const tagsText = ref('')
const profile = ref('')
const vocabulary = ref<string[]>([])
const paths = ref<(ConsultPathIndex | ConsultPathRank)[]>([])
const runsScanned = ref(0)
const pathCount = ref(0)

const decidedTotal = computed(() =>
  paths.value.reduce((sum, item) => sum + item.decidedCount, 0)
)

function context(): ConsultContext {
  return {
    tags: tagsText.value
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    profile: profile.value.trim()
  }
}

function percent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '暂无'
  return `${Math.round(value * 1000) / 10}%`
}

async function load() {
  loading.value = true
  error.value = ''
  querying.value = false
  try {
    const result = await api.consultIndexes()
    paths.value = result.paths
    vocabulary.value = result.vocabulary
    runsScanned.value = result.runsScanned
    pathCount.value = result.pathCount
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '读取路径索引失败'
  } finally {
    loading.value = false
  }
}

async function query() {
  loading.value = true
  error.value = ''
  querying.value = true
  try {
    const result = await api.queryConsultIndexes(context(), 30)
    paths.value = result.matched
    runsScanned.value = result.runsScanned
    pathCount.value = result.matched.length
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '查询路径索引失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.page-title {
  margin-top: 3px;
  font-size: 27px;
  letter-spacing: -0.03em;
}

.intro {
  max-width: 760px;
  margin-bottom: 20px;
  line-height: 1.75;
}

.query-card {
  padding: 20px;
  margin-bottom: 16px;
}

.query-grid {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
  gap: 14px;
}

.query-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  margin-top: 13px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--line);
}

.summary-strip div {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 13px 15px;
  background: var(--surface);
}

.summary-strip strong {
  font-size: 21px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.summary-strip span {
  color: var(--ink-3);
  font-size: 11.5px;
}

.index-list {
  display: grid;
  gap: 12px;
}

.index-card {
  padding: 18px 20px;
}

.index-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.index-id {
  color: var(--ink-3);
  font-family: var(--mono);
  font-size: 11px;
}

.index-title {
  margin-top: 5px;
  font-size: 15px;
  line-height: 1.45;
}

.index-score {
  flex: 0 0 auto;
  text-align: right;
}

.index-score strong {
  display: block;
  color: var(--accent);
  font-size: 24px;
  font-weight: 500;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.index-score span {
  color: var(--ink-3);
  font-size: 11px;
}

.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 15px;
  margin: 13px 0;
  padding: 9px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: var(--ink-2);
  font-size: 11.5px;
}

.metric-row b {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.feature-block + .feature-block {
  margin-top: 11px;
}

.feature-label {
  margin-bottom: 6px;
  color: var(--ink-3);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.feature-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11.5px;
}

.feature-chip.student {
  background: #f1ece1;
  color: var(--ink-2);
}

.feature-chip em {
  color: var(--ink-3);
  font-size: 10px;
  font-style: normal;
}

.path-detail {
  margin-top: 13px;
}

.path-detail summary {
  color: var(--ink-3);
  font-size: 11.5px;
  cursor: pointer;
}

.path-steps {
  display: grid;
  gap: 5px;
  margin: 9px 0 0;
  padding-left: 22px;
  max-height: 340px;
  overflow: auto;
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .query-grid,
  .summary-strip {
    grid-template-columns: 1fr;
  }

  .summary-strip {
    gap: 1px;
  }

  .page-head {
    flex-direction: column;
  }
}
</style>
