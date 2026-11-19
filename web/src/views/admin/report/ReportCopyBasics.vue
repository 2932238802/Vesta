<template>
  <section class="card section-card">
    <header class="section-head">
      <h2>九项现状</h2>
    </header>
    <div class="form-grid">
      <label class="field">
        <span>标题</span>
        <input v-model="template.copy.radar.title" class="input" type="text" maxlength="120" />
      </label>
      <label class="field">
        <span>说明</span>
        <input v-model="template.copy.radar.subtitle" class="input" type="text" maxlength="300" />
      </label>
    </div>
  </section>

  <section class="card section-card">
    <header class="section-head">
      <h2>三项最高分</h2>
    </header>
    <div class="form-grid">
      <label class="field">
        <span>标题</span>
        <input
          v-model="template.copy.strengths.title"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field">
        <span>说明</span>
        <input
          v-model="template.copy.strengths.subtitle"
          class="input"
          type="text"
          maxlength="300"
        />
      </label>
      <label class="field full">
        <span>单项默认文案</span>
        <input
          v-model="template.copy.strengths.item"
          class="input"
          type="text"
          maxlength="300"
        />
      </label>
    </div>
  </section>

  <section class="card section-card">
    <header class="section-head">
      <h2>三项最低分</h2>
    </header>
    <div class="form-grid">
      <label class="field">
        <span>标题</span>
        <input v-model="template.copy.gaps.title" class="input" type="text" maxlength="120" />
      </label>
      <label class="field">
        <span>说明</span>
        <input v-model="template.copy.gaps.subtitle" class="input" type="text" maxlength="300" />
      </label>
    </div>
  </section>

  <section class="card section-card">
    <header class="section-head">
      <h2>自评与行为对照</h2>
    </header>
    <div class="form-grid">
      <label class="field">
        <span>标题</span>
        <input
          v-model="template.copy.consistency.title"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field">
        <span>收尾</span>
        <input
          v-model="template.copy.consistency.closing"
          class="input"
          type="text"
          maxlength="300"
        />
      </label>
      <label class="field full">
        <span>引导语</span>
        <textarea
          v-model="template.copy.consistency.intro"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>单项默认文案</span>
        <textarea
          v-model="template.copy.consistency.item"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ReportTemplate } from '@shared/types'

defineProps<{
  template: ReportTemplate
}>()
</script>

<style scoped src="./reportSection.css"></style>
