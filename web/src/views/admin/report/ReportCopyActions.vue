<template>
  <section class="card section-card">
    <header class="section-head">
      <h2>接下来 30 天</h2>
    </header>
    <div class="form-grid">
      <label class="field">
        <span>标题</span>
        <input
          v-model="template.copy.actions.title"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field">
        <span>说明</span>
        <input
          v-model="template.copy.actions.subtitle"
          class="input"
          type="text"
          maxlength="300"
        />
      </label>
      <label class="field full">
        <span>收尾</span>
        <input
          v-model="template.copy.actions.closing"
          class="input"
          type="text"
          maxlength="300"
        />
      </label>
    </div>
    <div class="fallback">
      <div class="fallback-head">
        <span>默认动作</span>
        <button class="btn quiet small" type="button" @click="actions.addFallback">+ 加一条</button>
      </div>
      <div
        v-for="(_, index) in template.copy.actions.fallback"
        :key="index"
        class="fallback-row"
      >
        <input
          v-model="template.copy.actions.fallback[index]"
          class="input"
          type="text"
          maxlength="300"
        />
        <button
          class="btn quiet danger-text"
          type="button"
          @click="actions.removeFallback(index)"
        >
          删除
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ReportTemplate } from '@shared/types'
import type { ReportEditorActions } from './useReportEditor'

defineProps<{
  template: ReportTemplate
  actions: ReportEditorActions
}>()
</script>

<style scoped src="./reportSectionActions.css"></style>
