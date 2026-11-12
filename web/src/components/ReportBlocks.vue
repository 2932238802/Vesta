<template>
  <article class="report">
    <header class="report-head">
      <div v-if="payload.theme.brand" class="brand">{{ payload.theme.brand }}</div>
      <div class="meta">
        <span>{{ payload.name || '学员' }}</span>
        <span class="dot-sep">·</span>
        <span>{{ dateText }}</span>
      </div>
    </header>

    <section
      v-for="(block, index) in payload.blocks"
      :key="index"
      class="block"
      :class="`block-${block.type}`"
    >
      <template v-if="block.type === 'hero'">
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

      <template v-else-if="block.type === 'target'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <dl class="target-facts">
          <div>
            <dt>{{ block.labels.city }}</dt>
            <dd>{{ block.city || '还没填' }}</dd>
          </div>
          <div>
            <dt>{{ block.labels.role }}</dt>
            <dd>{{ block.role || '还没填' }}</dd>
          </div>
          <div>
            <dt>{{ block.labels.salary }}</dt>
            <dd>{{ block.salary || '还没填' }}</dd>
          </div>
          <div v-if="block.hometown">
            <dt>{{ block.labels.hometown }}</dt>
            <dd>{{ block.hometown }}</dd>
          </div>
        </dl>
        <p v-if="block.cityReason" class="target-goal">
          <span>
            <b>{{ block.labels.reason }}</b>{{ block.cityReason }}
          </span>
        </p>
        <p v-if="block.priority || block.goal" class="target-goal">
          <span v-if="block.priority">
            <b>{{ block.labels.priority }}</b>{{ block.priority }}
          </span>
          <span v-if="block.goal">
            <b>{{ block.labels.goal }}</b>{{ block.goal }}
            <template v-if="block.goalNote"> · {{ block.goalNote }}</template>
          </span>
        </p>
        <p v-if="block.cityNote" class="target-note">{{ block.cityNote }}</p>

        <div class="target-lists">
          <section class="target-list">
            <h3>{{ block.advantageTitle }}</h3>
            <div v-for="item in block.advantages" :key="item.key" class="target-item">
              <ScoreBar :name="item.name" :score="item.score" />
            </div>
          </section>
          <section class="target-list">
            <h3>{{ block.gapTitle }}</h3>
            <div v-for="item in block.gaps" :key="item.key" class="target-item">
              <ScoreBar :name="item.name" :score="item.score" />
            </div>
          </section>
        </div>

        <div v-if="block.salaryNote" class="target-salary">
          <p class="eyebrow">{{ block.salaryTitle }}</p>
          <p>{{ block.salaryNote }}</p>
        </div>
        <p class="closing">{{ block.closing }}</p>
      </template>

      <template v-else-if="block.type === 'radar'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <RadarChart :dimensions="block.dimensions" :accent="payload.theme.accent" />
      </template>

      <template v-else-if="block.type === 'strengths'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <div class="strength-list">
          <div v-for="(item, i) in block.items" :key="item.key" class="strength">
            <div class="strength-top">
              <span class="rank">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="strength-body">
                <ScoreBar :name="item.name" :score="item.score" />
                <p class="strength-text">{{ item.text }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="block.type === 'assets'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <div class="asset-list">
          <article v-for="(item, i) in block.items" :key="item.key" class="asset">
            <span class="asset-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="asset-body">
              <h3>{{ item.name }}</h3>
              <p v-if="item.text">{{ item.text }}</p>
              <p v-if="item.source" class="asset-source">来源：{{ item.source }}</p>
            </div>
          </article>
        </div>
        <p class="closing">{{ block.note }}</p>
      </template>

      <template v-else-if="block.type === 'gaps'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <div class="gap-list">
          <article v-for="(item, i) in block.items" :key="item.key" class="gap">
            <header class="gap-head">
              <span class="gap-index">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="gap-heading">
                <h3>{{ item.name }}</h3>
                <span class="gap-meter" aria-hidden="true">
                  <i :style="{ width: `${item.score}%` }"></i>
                </span>
              </div>
              <span class="gap-score">{{ item.score }}<em>分</em></span>
            </header>
            <dl>
              <div class="gap-step what">
                <dt>补什么</dt>
                <dd>{{ item.what }}</dd>
              </div>
              <div class="gap-step how">
                <dt>怎么补</dt>
                <dd>{{ item.how }}</dd>
              </div>
              <div class="gap-step when">
                <dt>什么时候开始</dt>
                <dd>{{ item.when }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </template>

      <template v-else-if="block.type === 'consistency'">
        <SectionHead :index="index" :title="block.title" />
        <p class="lead">{{ block.intro }}</p>
        <div class="quotes">
          <p v-for="(paragraph, i) in block.paragraphs" :key="i" class="quote">{{ paragraph }}</p>
        </div>
        <p class="closing">{{ block.closing }}</p>
      </template>

      <template v-else-if="block.type === 'cognition'">
        <SectionHead :index="index" :title="block.title" />
        <div class="prose">
          <p v-for="(paragraph, i) in block.paragraphs" :key="i" :class="{ first: i === 0 }">
            {{ paragraph }}
          </p>
        </div>
      </template>

      <template v-else-if="block.type === 'actions'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <ol class="action-list">
          <li v-for="(item, i) in block.items" :key="i">
            <span class="action-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <p>{{ item }}</p>
          </li>
        </ol>
        <p class="closing">{{ block.closing }}</p>
      </template>

      <template v-else-if="block.type === 'sources'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />

        <div v-if="block.queries?.length" class="source-queries">
          <p class="source-label">本次实际检索词</p>
          <ul>
            <li v-for="query in block.queries" :key="query">{{ query }}</li>
          </ul>
        </div>

        <div v-if="block.error" class="source-error" role="status">
          <p class="source-label">检索状态</p>
          <p class="source-error-text">{{ block.error }}</p>
          <p v-if="block.configured === false" class="source-error-hint">
            这是服务端配置问题，不是报告内容判断。{{
              allowRetry === false
                ? '配置修复后，新建报告即可重新检索。'
                : '配置修复后可以重新生成。'
            }}
          </p>
          <button
            v-if="block.retryable && allowRetry !== false"
            class="source-retry"
            type="button"
            @click="emit('retry')"
          >
            重新检索并生成
          </button>
          <p v-else-if="block.error && allowRetry === false" class="source-error-hint">
            报告已经生成；要重新检索需要新建一份报告。
          </p>
        </div>

        <ul v-if="block.items.length" class="source-list">
          <li v-for="(item, i) in block.items" :key="item.url" class="source">
            <span class="source-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="source-body">
              <a class="source-title" :href="item.url" target="_blank" rel="noopener noreferrer">
                {{ item.title }}
              </a>
              <p v-if="item.usedFor" class="source-use">{{ item.usedFor }}</p>
              <p v-if="item.site" class="source-site">{{ item.site }}</p>
            </div>
          </li>
        </ul>
        <p v-else-if="!block.error && !block.queries?.length" class="source-empty">
          本次没有调用外部检索，报告只依据问卷回答和系统计算。
        </p>
        <p v-else-if="!block.error" class="source-empty">
          检索已执行，但没有返回可用的原文链接。
        </p>
        <p v-if="block.searchedAt" class="source-time">
          检索时间：{{ block.searchedAt.replace('T', ' ').slice(0, 16) }}
        </p>
      </template>

      <template v-else-if="block.type === 'note'">
        <div class="note">
          <p class="eyebrow">{{ block.title }}</p>
          <p class="note-text">{{ block.text }}</p>
        </div>
      </template>

      <template v-else-if="block.type === 'scorecard'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <div class="score-groups">
          <section class="score-group">
            <h3>背景与积累（现在的位置）</h3>
            <div class="score-group-body">
              <div class="score-radar">
                <RadarChart
                  :dimensions="radarDimensions(block.background)"
                  :accent="payload.theme.accent"
                  :max="10"
                  compact
                  :show-data="false"
                />
              </div>
              <div class="score-rows">
                <div v-for="item in block.background" :key="item.key" class="score-row">
                  <div class="score-head">
                    <span>{{ item.label }}</span>
                    <b>{{ item.score }}</b>
                  </div>
                  <div class="score-track"><i :style="{ width: `${item.score * 10}%` }" /></div>
                  <p v-if="item.benchmark" class="score-benchmark">入场线：{{ item.benchmark }}</p>
                  <p class="score-note">{{ item.note }}<template v-if="item.source"> · {{ item.source }}</template></p>
                </div>
              </div>
            </div>
          </section>
          <section class="score-group">
            <h3>个人四维（方法和习惯）</h3>
            <div class="score-group-body">
              <div class="score-radar">
                <RadarChart
                  :dimensions="radarDimensions(block.personal)"
                  :accent="payload.theme.accent"
                  :max="10"
                  compact
                  :show-data="false"
                />
              </div>
              <div class="score-rows">
                <div v-for="item in block.personal" :key="item.key" class="score-row">
                  <div class="score-head">
                    <span>{{ item.label }}</span>
                    <b>{{ item.score }}</b>
                  </div>
                  <div class="score-track personal"><i :style="{ width: `${item.score * 10}%` }" /></div>
                  <p class="score-note">{{ item.note }}<template v-if="item.source"> · {{ item.source }}</template></p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="potential">
          <span class="potential-level">可提升空间 · {{ block.potential.label }}</span>
          <p>{{ block.potential.text }}</p>
        </div>
      </template>

      <template v-else-if="block.type === 'gap'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <dl class="gap-lines">
          <div v-for="line in block.lines" :key="line.label">
            <dt>{{ line.label }}</dt>
            <dd>{{ line.value }}</dd>
          </div>
        </dl>
        <div v-if="block.paragraphs?.length" class="gap-analysis">
          <p v-for="(text, i) in block.paragraphs" :key="i">{{ text }}</p>
        </div>
        <p v-if="block.jobs.length" class="job-caption">
          下面几条招聘原文用于核对：学历 / 经验{{ hasSalary(block.jobs) ? ' / 薪资' : '' }}，点标题看原文；具体以原文为准。
        </p>
        <ul v-if="block.jobs.length" class="job-list">
          <li v-for="job in block.jobs" :key="job.url" class="job">
            <a :href="job.url" target="_blank" rel="noopener noreferrer">{{ job.title }}</a>
            <p class="job-meta">
              {{ jobMeta(job) }}
              <span v-if="job.stale" class="job-old">（信息较早，以原文为准）</span>
            </p>
            <p v-if="job.usedFor" class="job-use">{{ job.usedFor }}</p>
            <div v-if="job.meets?.length || job.missing?.length" class="job-match">
              <p v-if="job.meets?.length" class="job-meet">
                <span>{{ job.stale ? '按原文对照' : '你符合' }}</span>{{ job.meets.join('；') }}
              </p>
              <p v-if="job.missing?.length" class="job-miss">
                <span>你还缺</span>{{ job.missing.join('；') }}
              </p>
            </div>
            <p v-if="job.requirement" class="job-req">{{ job.requirement }}</p>
          </li>
        </ul>
        <p class="closing">{{ block.note }}</p>
      </template>

      <template v-else-if="block.type === 'jobmap'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <div class="direction-list">
          <article
            v-for="direction in block.directions"
            :key="direction.key"
            class="direction"
          >
            <header class="direction-head">
              <h3>{{ direction.name }}</h3>
              <span v-if="direction.salary" class="direction-salary">{{ direction.salary }}</span>
            </header>
            <dl v-if="direction.what || direction.entry || direction.fit" class="direction-facts">
              <div v-if="direction.what">
                <dt>做什么</dt>
                <dd>{{ direction.what }}</dd>
              </div>
              <div v-if="direction.entry">
                <dt>入场线</dt>
                <dd>{{ direction.entry }}</dd>
              </div>
              <div v-if="direction.fit">
                <dt>和你</dt>
                <dd>{{ direction.fit }}</dd>
              </div>
            </dl>
            <ul v-if="direction.jobs.length" class="job-list direction-jobs">
              <li v-for="job in direction.jobs" :key="job.url" class="job">
                <a :href="job.url" target="_blank" rel="noopener noreferrer">
                  {{ job.title }}
                </a>
                <p class="job-meta">
                  {{ jobMeta(job) }}
                  <span v-if="job.stale" class="job-old">
                    （信息较早，以原文为准）
                  </span>
                </p>
                <p v-if="job.usedFor" class="job-use">{{ job.usedFor }}</p>
                <div v-if="job.meets?.length || job.missing?.length" class="job-match">
                  <p v-if="job.meets?.length" class="job-meet">
                    <span>{{ job.stale ? '按原文对照' : '你符合' }}</span>{{ job.meets.join('；') }}
                  </p>
                  <p v-if="job.missing?.length" class="job-miss">
                    <span>你还缺</span>{{ job.missing.join('；') }}
                  </p>
                </div>
                <p v-if="job.requirement" class="job-req">{{ job.requirement }}</p>
              </li>
            </ul>
            <p
              v-else-if="!hasDirectionJobs(block.directions) && !block.relatedJobs.length"
              class="direction-empty"
            >
              这个方向暂时没抓到具体招聘原文；先按上面的门槛去招聘网站核对。
            </p>
          </article>
        </div>
        <template v-if="block.relatedJobs.length">
          <p class="job-caption">
            下面几条是专业相关招聘原文，用于核对上面的方向；不直接对应某一个方向。
          </p>
          <ul class="job-list">
            <li v-for="job in block.relatedJobs" :key="job.url" class="job">
              <a :href="job.url" target="_blank" rel="noopener noreferrer">{{ job.title }}</a>
              <p class="job-meta">
                {{ jobMeta(job) }}
                <span v-if="job.stale" class="job-old">
                  （信息较早，以原文为准）
                </span>
              </p>
              <p v-if="job.usedFor" class="job-use">{{ job.usedFor }}</p>
              <div v-if="job.meets?.length || job.missing?.length" class="job-match">
                <p v-if="job.meets?.length" class="job-meet">
                  <span>{{ job.stale ? '按原文对照' : '你符合' }}</span>{{ job.meets.join('；') }}
                </p>
                <p v-if="job.missing?.length" class="job-miss">
                  <span>你还缺</span>{{ job.missing.join('；') }}
                </p>
              </div>
              <p v-if="job.requirement" class="job-req">{{ job.requirement }}</p>
            </li>
          </ul>
        </template>
        <p class="closing">{{ block.note }}</p>
      </template>

      <template v-else-if="block.type === 'roadmap'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <ol class="roadmap-list">
          <li v-for="phase in block.phases" :key="phase.key" class="roadmap-item">
            <span class="roadmap-dot" aria-hidden="true" />
            <div class="roadmap-body">
              <header class="roadmap-head">
                <h3 v-if="phase.label">{{ phase.label }}</h3>
                <span class="roadmap-period">{{ phase.period }}</span>
              </header>
              <p class="roadmap-goal">主目标：{{ phase.goal }}</p>
              <p class="roadmap-output">验证：{{ phase.output }}</p>
            </div>
          </li>
        </ol>
        <p class="closing">{{ block.note }}</p>
      </template>

      <template v-else-if="block.type === 'checklist'">
        <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />
        <ul class="check-list">
          <li v-for="item in block.items" :key="item.key" class="check-item">
            <span class="check-box" aria-hidden="true"></span>
            <div class="check-body">
              <p class="check-title">{{ item.title }}</p>
              <p class="check-detail">{{ item.detail }}</p>
              <p class="check-search">搜索：{{ item.search }}</p>
            </div>
          </li>
        </ul>
        <p class="closing">{{ block.note }}</p>
      </template>

      <template v-else-if="block.type === 'section'">
        <SectionHead :index="index" :title="block.title" />
        <div class="prose">
          <p v-for="(paragraph, i) in block.paragraphs" :key="i" :class="{ first: i === 0 }">
            {{ paragraph }}
          </p>
        </div>
      </template>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DimScore, JobCard, ReportPayload, ScoreItem } from '@shared/types'
import RadarChart from './RadarChart.vue'
import ScoreBar from './ScoreBar.vue'
import SectionHead from './SectionHead.vue'
import { formatDate } from '../format'

const props = defineProps<{
  payload: ReportPayload
  claimLink?: boolean
  allowRetry?: boolean
}>()
const emit = defineEmits<{ retry: [] }>()

function jobMeta(job: JobCard): string {
  const parts: string[] = []
  if (job.company) parts.push(`来源：${job.company}`)
  if (job.city) parts.push(job.city)
  if (job.salary) parts.push(job.salary)
  if (job.date) parts.push(`发布：${formatDate(job.date, false)}`)
  return parts.join(' · ')
}

function hasDirectionJobs(directions: { jobs: JobCard[] }[]): boolean {
  return directions.some((direction) => direction.jobs.length > 0)
}

function hasSalary(jobs: JobCard[]): boolean {
  return jobs.some((job) => Boolean(job.salary))
}

function radarDimensions(items: ScoreItem[]): DimScore[] {
  return items.map((item) => ({
    key: item.key,
    name: item.label,
    weight: 0,
    score: item.score
  }))
}

const dateText = computed(() => {
  const date = new Date(props.payload.createdAt)
  if (Number.isNaN(date.getTime())) return props.payload.createdAt.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
})
</script>

<style scoped>
.report-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.brand {
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.meta {
  display: flex;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.dot-sep {
  color: var(--line-strong);
}

.block {
  padding: 52px 0;
  border-bottom: 1px solid var(--line);
}

.block:last-child {
  border-bottom: 0;
  padding-bottom: 24px;
}

.block-hero {
  padding-top: 44px;
}

.eyebrow {
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}

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

.target-facts {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.target-facts > div {
  padding: 14px 15px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 3%, var(--surface));
}

.target-facts dt {
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.target-facts dd {
  margin: 6px 0 0;
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--ink);
}

.target-goal {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.7;
}

.target-goal b {
  margin-right: 8px;
  font-weight: 400;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--ink-3);
}

.target-note {
  margin-top: 20px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-2);
  max-width: 36em;
}

.target-lists {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.target-list {
  border: 1px solid color-mix(in srgb, var(--accent) 9%, var(--line));
  border-radius: 18px;
  padding: 20px 20px 10px;
  background: color-mix(in srgb, var(--accent) 2.5%, var(--surface));
}

.target-list h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 550;
  margin-bottom: 14px;
}

.target-list h3::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.55;
}

.target-list + .target-list h3::before {
  background: #b1843c;
  opacity: 0.65;
}

.target-item {
  padding: 9px 0;
}

.target-item + .target-item {
  border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
}

.target-salary {
  margin-top: 24px;
  padding: 20px 22px;
  border: 1px solid color-mix(in srgb, var(--accent) 9%, var(--line));
  border-left: 3px solid color-mix(in srgb, var(--accent) 55%, transparent);
  border-radius: 4px 16px 16px 4px;
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.target-salary p:last-child {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-2);
}

.strength-list {
  display: grid;
  gap: 12px;
}

.strength {
  padding: 18px 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 2.5%, var(--surface));
}

.strength-top {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 12px;
  align-items: start;
}

.rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.strength-body {
  display: grid;
  gap: 10px;
}

.strength-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-2);
  max-width: 36em;
}

.asset-list {
  display: grid;
  gap: 12px;
}

.asset {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--line));
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 5%, var(--surface)) 0%,
      var(--surface) 58%
    );
}

.asset-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 9%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
}

.asset-body h3 {
  font-size: 15px;
  font-weight: 550;
  line-height: 1.4;
}

.asset-body p {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-2);
  max-width: 38em;
}

.direction-list {
  display: grid;
  gap: 16px;
}

.direction {
  padding: 22px 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--line));
  border-radius: 18px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent) 4%, var(--surface)) 0%,
      var(--surface) 52%
    );
}

.direction-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px 16px;
  flex-wrap: wrap;
}

.direction-head h3 {
  font-size: 16px;
  font-weight: 550;
  line-height: 1.4;
}

.direction-salary {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-size: 12px;
  line-height: 1.4;
}

.direction-facts {
  margin: 18px 0 0;
  display: grid;
  gap: 10px;
}

.direction-facts > div {
  display: grid;
  grid-template-columns: 4.5em minmax(0, 1fr);
  gap: 12px;
  align-items: baseline;
}

.direction-facts dt {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--ink-3);
}

.direction-facts dd {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink-2);
}

.direction-jobs {
  margin-top: 14px;
}

.direction-empty {
  margin-top: 14px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.job-use {
  color: color-mix(in srgb, var(--accent) 72%, var(--ink-3)) !important;
}

.job-match {
  display: grid;
  gap: 3px;
  margin: 6px 0 2px;
}

.job-match p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.7;
}

.job-match span {
  display: inline-block;
  margin-right: 6px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  vertical-align: 1px;
}

.job-meet {
  color: var(--ink-2);
}

.job-meet span {
  color: #2f7a52;
  background: color-mix(in srgb, #2f7a52 10%, transparent);
}

.job-miss {
  color: var(--ink-2);
}

.job-miss span {
  color: #a35a1f;
  background: color-mix(in srgb, #a35a1f 10%, transparent);
}

.roadmap-list {
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: grid;
}

.roadmap-item {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 14px;
  padding-bottom: 18px;
}

.roadmap-item:last-child {
  padding-bottom: 0;
}

.roadmap-item::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 18px;
  bottom: 0;
  width: 1px;
  background: var(--line);
}

.roadmap-item:last-child::before {
  display: none;
}

.roadmap-dot {
  width: 10px;
  height: 10px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 10%, transparent);
}

.roadmap-body {
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 2.5%, var(--surface));
}

.roadmap-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 14px;
  flex-wrap: wrap;
}

.roadmap-head h3 {
  font-size: 15px;
  font-weight: 550;
}

.roadmap-period {
  font-size: 11.5px;
  color: var(--ink-3);
}

.roadmap-goal {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink);
}

.roadmap-output {
  margin-top: 4px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.gap-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.gap {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px 20px 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--line));
  border-radius: 20px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent) 5%, var(--surface)) 0%,
      var(--surface) 46%
    );
  box-shadow: 0 14px 34px -30px rgba(27, 26, 23, 0.45);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.gap:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 38px -28px rgba(27, 26, 23, 0.4);
}

.gap-head {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.gap-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.gap-heading {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.gap-heading h3 {
  font-size: 15px;
  font-weight: 550;
  line-height: 1.3;
}

.gap-meter {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 9%, var(--line));
  overflow: hidden;
}

.gap-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: color-mix(in srgb, var(--accent) 62%, #ffffff);
}

.gap-score {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
}

.gap-score em {
  font-family: var(--sans);
  font-style: normal;
  font-size: 9.5px;
  color: color-mix(in srgb, var(--accent) 65%, var(--ink-3));
}

.gap dl {
  margin: 0;
  display: grid;
  gap: 15px;
}

.gap-step {
  display: grid;
  gap: 5px;
}

.gap-step dt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.gap-step dt::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.65;
}

.gap-step.how dt::before {
  background: #4a7ba6;
}

.gap-step.when dt::before {
  background: #b1843c;
}

.gap-step dd {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink-2);
}

.lead {
  font-size: 15.5px;
  line-height: 1.85;
  color: var(--ink);
  max-width: 34em;
}

.score-groups {
  margin-top: 22px;
  display: grid;
  gap: 26px;
}

.score-group h3 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  margin-bottom: 14px;
}

.score-group-body {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 18px 22px;
  align-items: start;
}

.score-radar,
.score-rows {
  min-width: 0;
}

.score-row {
  margin-bottom: 16px;
}

.score-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 14px;
  color: var(--ink);
}

.score-head b {
  font-family: var(--mono);
  font-size: 15px;
  color: var(--accent);
}

.score-track {
  margin-top: 7px;
  height: 6px;
  border-radius: 99px;
  background: var(--line);
  overflow: hidden;
}

.score-track i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: color-mix(in srgb, var(--accent) 45%, #b8b0a0);
}

.score-track.personal i {
  background: var(--accent);
}

.score-note {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--ink-3);
}

.score-benchmark {
  margin-top: 5px;
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--accent) 70%, var(--ink-3));
}

.potential {
  margin-top: 20px;
  padding: 16px 18px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--line));
}

.potential-level {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.potential p {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-2);
}

.gap-lines {
  margin-top: 20px;
  display: grid;
  gap: 12px;
}

.gap-lines div {
  display: grid;
  grid-template-columns: 8.5em 1fr;
  gap: 12px;
  align-items: baseline;
}

.gap-lines dt {
  font-size: 12.5px;
  color: var(--ink-3);
}

.gap-lines dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink);
}

.gap-analysis {
  margin-top: 20px;
  display: grid;
  gap: 12px;
}

.gap-analysis p {
  margin: 0;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-2);
}

.job-caption {
  margin-top: 18px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.job-list {
  margin-top: 20px;
  display: grid;
  gap: 10px;
  list-style: none;
  padding: 0;
}

.job-caption + .job-list {
  margin-top: 10px;
}

.job {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.job a {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
}

.job p {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--ink-3);
}

.job-req {
  color: var(--ink-2) !important;
}

.job-old {
  color: var(--amber);
}

.check-list {
  margin-top: 20px;
  display: grid;
  gap: 10px;
  list-style: none;
  padding: 0;
}

.check-item {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.check-box {
  width: 16px;
  height: 16px;
  margin-top: 3px;
  border: 1.5px solid color-mix(in srgb, var(--accent) 45%, var(--line));
  border-radius: 4px;
  background: color-mix(in srgb, var(--accent) 3%, var(--surface));
}

.check-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.check-detail {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-2);
}

.check-search {
  margin-top: 8px;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ink) 5%, var(--surface));
  font-size: 12px;
  color: var(--ink-3);
}

.quotes {
  margin-top: 20px;
  display: grid;
  gap: 10px;
}

.quote {
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
  border-left: 3px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: color-mix(in srgb, var(--accent) 3%, var(--surface));
  border-radius: 4px 14px 14px 4px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink-2);
}

.closing {
  margin-top: 22px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink-3);
}

.prose {
  display: grid;
  gap: 16px;
  max-width: 36em;
}

.prose p {
  font-size: 14.5px;
  line-height: 1.95;
  color: var(--ink-2);
}

.prose p.first {
  font-size: 16.5px;
  line-height: 1.85;
  color: var(--ink);
}

.action-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.action-list li {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 12px;
  padding: 15px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 7%, var(--line));
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 2.5%, var(--surface));
  align-items: start;
}

.action-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.action-list p {
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--ink);
}

.note {
  padding: 22px 24px;
  border: 1px solid color-mix(in srgb, var(--accent) 9%, var(--line));
  border-radius: 18px;
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.note-text {
  margin-top: 10px;
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--ink-2);
}

.source-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.source {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
}

.source:hover {
  background: color-mix(in srgb, var(--accent) 3%, transparent);
}

.source-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
}

.source-body {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.source-title {
  font-size: 14px;
  line-height: 1.65;
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 3px;
}

.source-title:hover {
  color: var(--accent);
  text-decoration-color: currentColor;
}

.source-use {
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-2);
}

.source-site {
  font-size: 11.5px;
  color: var(--ink-3);
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .gap-list {
    grid-template-columns: 1fr;
  }

  .score-group-body {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .target-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .target-lists {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .strength {
    padding: 16px 17px;
  }

  .asset {
    padding: 16px;
  }

  .direction {
    padding: 17px;
  }

  .direction-facts > div {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .quote {
    padding: 15px 16px;
  }

  .action-list li {
    padding: 14px;
  }

  .source {
    padding: 11px 10px;
  }

  .block {
    padding: 40px 0;
  }

  .block-hero {
    padding-top: 34px;
  }
}

@media print {
  .block {
    break-inside: avoid;
  }

  .gap,
  .strength,
  .target-list,
  .action-list li {
    box-shadow: none;
    transform: none;
    break-inside: avoid;
  }

  .hero-claim {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gap {
    transition: none;
  }

  .gap:hover {
    transform: none;
  }
}

/* ---------- 阅读版式：同一套字号、间距和颜色 token ---------- */

.report {
  --report-gap: 64px;
  --report-text: 15.5px;
  --report-lead: 17px;
  --report-label: 12px;
  color: var(--ink);
}

.report-head {
  padding-bottom: 26px;
  border-bottom: 0;
}

.brand {
  font-size: 12.5px;
  letter-spacing: 0.24em;
}

.meta {
  font-size: 12.5px;
  letter-spacing: 0.03em;
}

.block {
  padding: var(--report-gap) 0;
  border-bottom: 0;
}

.block:last-child {
  padding-bottom: 8px;
}

.block-hero {
  padding-top: 40px;
}

.eyebrow {
  font-size: var(--report-label);
  letter-spacing: 0.14em;
}

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

.target-note,
.strength-text,
.asset-body p,
.direction-facts dd,
.gap-step dd,
.roadmap-goal,
.check-detail,
.potential p,
.job-req,
.lead {
  font-size: var(--report-text);
  line-height: 1.88;
}

.target-facts > div {
  padding: 18px 18px 17px;
  border: 0;
  background: color-mix(in srgb, var(--accent) 3.5%, var(--surface));
}

.target-facts dt {
  font-size: var(--report-label);
}

.target-facts dd {
  margin-top: 8px;
  font-size: 15.5px;
}

.target-goal {
  font-size: 14.5px;
  line-height: 1.85;
}

.target-list {
  border: 0;
  background: color-mix(in srgb, var(--accent) 2.8%, var(--surface));
}

.target-list h3 {
  font-size: 15px;
}

.target-salary {
  border: 0;
  border-left: 3px solid color-mix(in srgb, var(--accent) 40%, transparent);
}

.target-salary p:last-child {
  font-size: var(--report-text);
}

.strength,
.asset,
.direction,
.roadmap-body,
.potential,
.note {
  border: 0;
  background: color-mix(in srgb, var(--accent) 3.2%, var(--surface));
}

.strength {
  padding: 22px 24px;
}

.asset {
  padding: 22px 24px;
}

.asset-body h3,
.direction-head h3,
.roadmap-head h3 {
  font-size: 16.5px;
  line-height: 1.45;
}

.asset-body p {
  margin-top: 9px;
}

.asset-source {
  margin-top: 8px !important;
  font-size: 12.5px !important;
  color: var(--ink-3) !important;
}

.direction {
  padding: 26px 24px;
}

.direction-facts {
  margin-top: 20px;
  gap: 14px;
}

.direction-facts dt {
  font-size: 12.5px;
}

.direction-salary {
  font-size: 13px;
  padding: 5px 10px;
}

.gap-list {
  gap: 20px;
}

.gap {
  border: 0;
  padding: 26px 24px;
  background: color-mix(in srgb, var(--accent) 3.2%, var(--surface));
  box-shadow: none;
}

.gap:hover {
  transform: none;
  box-shadow: none;
}

.gap-heading h3 {
  font-size: 16px;
}

.gap-step dt {
  font-size: var(--report-label);
}

.roadmap-body {
  padding: 18px 20px;
}

.roadmap-head h3 {
  font-size: 16px;
}

.roadmap-period {
  font-size: 12.5px;
}

.roadmap-output {
  font-size: 14px;
  line-height: 1.8;
}

.check-item {
  padding: 18px 20px;
  border: 0;
  background: color-mix(in srgb, var(--accent) 2.8%, var(--surface));
}

.check-title {
  font-size: 15.5px;
}

.check-search {
  padding: 5px 10px;
  font-size: 13px;
}

.score-group h3 {
  font-size: 13px;
}

.score-head {
  font-size: 15px;
}

.score-note {
  font-size: 13.5px;
  line-height: 1.75;
}

.score-benchmark {
  font-size: 12.5px;
}

.potential {
  padding: 20px 22px;
}

.potential-level {
  font-size: 13px;
}

.gap-lines {
  gap: 16px;
}

.gap-lines dt {
  font-size: 13.5px;
}

.gap-lines dd {
  font-size: 15px;
}

.gap-analysis {
  margin-top: 24px;
  gap: 16px;
}

.gap-analysis p {
  font-size: 15px;
  line-height: 1.9;
}

.job-caption {
  font-size: 13.5px;
}

.job {
  padding: 18px 20px;
  border: 0;
  background: color-mix(in srgb, var(--ink) 3%, var(--surface));
}

.job a {
  display: inline-flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  font-size: 15.5px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.job p {
  font-size: 13.5px;
  line-height: 1.75;
}

.job-match p {
  font-size: 13.5px;
}

.job-match span {
  font-size: 12px;
}

.closing {
  font-size: 14.5px;
}

.prose {
  gap: 20px;
}

.prose p {
  font-size: var(--report-text);
  line-height: 2;
}

.prose p.first {
  font-size: var(--report-lead);
  line-height: 1.9;
}

.note {
  padding: 26px 28px;
}

.note-text {
  font-size: var(--report-text);
}

.source-list {
  gap: 4px;
}

.source {
  padding: 14px 12px;
  gap: 14px;
}

.source-title {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-size: 15.5px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.source-use {
  font-size: 13.5px;
}

.source-site {
  font-size: 13px;
}

.source-queries {
  margin-top: 22px;
  padding: 18px 20px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--ink) 3%, var(--surface));
}

.source-label {
  font-size: var(--report-label);
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.source-queries ul {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.source-queries li {
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 7%, var(--surface));
  color: var(--ink-2);
  font-size: 13.5px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.source-error {
  margin-top: 22px;
  padding: 20px 22px;
  border-radius: 14px;
  background: color-mix(in srgb, #b1843c 7%, var(--surface));
}

.source-error-text {
  margin-top: 8px;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--ink-2);
  overflow-wrap: anywhere;
}

.source-error-hint {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink-3);
}

.source-retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: 16px;
  padding: 0 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--line));
  border-radius: 10px;
  background: var(--surface);
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
}

.source-retry:hover {
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}

.source-empty {
  margin-top: 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-3);
}

.source-time {
  margin-top: 18px;
  font-size: 12.5px;
  color: var(--ink-3);
}

@media (max-width: 720px) {
  .report {
    --report-gap: 48px;
    --report-text: 15px;
    --report-lead: 16.5px;
  }

  .report-head {
    padding-bottom: 20px;
  }

  .hero-title {
    margin-top: 18px;
    font-size: 27px;
    line-height: 1.5;
  }

  .hero-line {
    font-size: 15px;
  }

  .block {
    padding: 48px 0;
  }

  .block-hero {
    padding-top: 26px;
  }

  .target-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .score-group-body {
    grid-template-columns: 1fr;
  }

  .score-radar {
    max-width: 280px;
    margin: 0 auto;
  }

  .gap-list {
    grid-template-columns: 1fr;
  }

  .strength,
  .asset,
  .direction,
  .gap,
  .note {
    padding: 20px 18px;
  }

  .roadmap-body,
  .check-item {
    padding: 16px 16px;
  }

  .source {
    padding: 12px 4px;
    grid-template-columns: 22px minmax(0, 1fr);
  }

  .job {
    padding: 16px 16px;
  }

  .job a,
  .source-title {
    font-size: 15px;
  }

  .source-queries,
  .source-error {
    padding: 16px 16px;
  }

  .source-queries li {
    font-size: 14px;
  }

  .job p,
  .job-match p,
  .source-use,
  .source-site,
  .asset-source,
  .score-note,
  .roadmap-output,
  .closing {
    font-size: 14px;
  }

  .check-detail,
  .roadmap-goal,
  .direction-facts dd,
  .gap-step dd,
  .gap-analysis p,
  .asset-body p,
  .strength-text,
  .target-note,
  .potential p,
  .prose p,
  .source-error-text {
    font-size: 15px;
    line-height: 1.9;
  }

  .source-error-hint {
    font-size: 14px;
  }

  .check-search {
    font-size: 13.5px;
  }

  .direction-facts > div {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .gap-lines div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}

@media print {
  .block {
    padding: 34px 0;
  }

  .source-queries,
  .source-error,
  .source-retry {
    display: none;
  }
}
</style>
