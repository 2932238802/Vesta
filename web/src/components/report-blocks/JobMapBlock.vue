<template>
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

<script setup lang="ts">
import type { JobCard, ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'
import { jobMeta } from './jobMeta'

defineProps<{
  block: ReportBlock & { type: 'jobmap' }
  index: number
}>()

function hasDirectionJobs(directions: { jobs: JobCard[] }[]): boolean {
  return directions.some((direction) => direction.jobs.length > 0)
}
</script>

<style scoped>
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
</style>

<style scoped>
@media (max-width: 720px) {
  .direction {
    padding: 17px;
  }

  .direction-facts > div {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}
</style>

<style scoped src="./shared/closing.css"></style>
<style scoped src="./shared/jobs.css"></style>
<style scoped src="./shared/reading.css"></style>

<style scoped>
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
</style>

<style scoped src="./shared/media-cards.css"></style>
<style scoped src="./shared/media-text.css"></style>

<style scoped>
@media (max-width: 720px) {
  .job {
    padding: 16px 16px;
  }

  .direction-facts > div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
