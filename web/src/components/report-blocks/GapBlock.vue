<template>
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

<script setup lang="ts">
import type { JobCard, ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'
import { jobMeta } from './jobMeta'

defineProps<{
  block: ReportBlock & { type: 'gap' }
  index: number
}>()

function hasSalary(jobs: JobCard[]): boolean {
  return jobs.some((job) => Boolean(job.salary))
}
</script>

<style scoped>
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
</style>

<style scoped src="./shared/closing.css"></style>
<style scoped src="./shared/jobs.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped>
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
</style>

<style scoped src="./shared/media-text.css"></style>

<style scoped>
@media (max-width: 720px) {
  .job {
    padding: 16px 16px;
  }

  .gap-lines div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
