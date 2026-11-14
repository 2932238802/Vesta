<template>
  <section class="card plan-card">
    <header class="plan-head">
      <div>
        <p class="eyebrow">招生计划</p>
        <h2 class="plan-title">专业 / 计划数 / 学费</h2>
      </div>
      <a
        v-if="program?.sourceUrl"
        class="source-link"
        :href="program.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
      >来源原文 ↗</a>
    </header>

    <p v-if="!program" class="plan-empty">选择专业后显示招生计划、学费和考试科目。</p>
    <template v-else>
      <dl class="plan-grid">
        <div><dt>专业</dt><dd>{{ program.majorName }}</dd></div>
        <div><dt>计划数</dt><dd>{{ program.planCount ?? '未公布' }}</dd></div>
        <div><dt>学费</dt><dd>{{ program.tuition || '未公布' }}</dd></div>
        <div><dt>学习方式</dt><dd>{{ program.studyMode || '未标注' }}</dd></div>
        <div><dt>学位类型</dt><dd>{{ program.degreeType || '未标注' }}</dd></div>
        <div><dt>招生省份</dt><dd>{{ program.province || '未标注' }}</dd></div>
      </dl>
      <div v-if="program.examSubjects.length" class="subjects">
        <span class="subjects-label">考试科目</span>
        <span v-for="subject in program.examSubjects" :key="subject.code" class="chip">
          {{ subject.name }}<template v-if="subject.fullScore"> · {{ subject.fullScore }}</template>
        </span>
      </div>
      <p v-if="program.note" class="plan-note">{{ program.note }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { SchoolProgram } from '@/api'

defineProps<{ program: SchoolProgram | null }>()
</script>

<style scoped>
.plan-card {
  padding: 18px 20px;
}

.plan-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.plan-title {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
}

.source-link {
  color: var(--accent);
  font-size: 12.5px;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.plan-empty {
  margin-top: 12px;
  color: var(--ink-3);
  font-size: 13px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 20px;
  margin-top: 14px;
}

.plan-grid dt {
  color: var(--ink-3);
  font-size: 11px;
}

.plan-grid dd {
  margin-top: 3px;
  font-size: 14px;
}

.subjects {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.subjects-label {
  color: var(--ink-3);
  font-size: 11px;
}

.plan-note {
  margin-top: 12px;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

@media (max-width: 700px) {
  .plan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
