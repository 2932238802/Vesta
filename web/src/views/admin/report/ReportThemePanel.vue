<template>
  <div class="theme-grid">
    <section class="card section-card">
      <header class="section-head">
        <h2>主题</h2>
      </header>
      <div class="form-grid">
        <label class="field">
          <span>强调色</span>
          <div class="color-row">
            <input v-model="template.theme.accent" class="color" type="color" />
            <input v-model="template.theme.accent" class="input mono" type="text" maxlength="7" />
          </div>
        </label>
        <label class="field">
          <span>纸张底色</span>
          <div class="color-row">
            <input v-model="template.theme.paper" class="color" type="color" />
            <input v-model="template.theme.paper" class="input mono" type="text" maxlength="7" />
          </div>
        </label>
        <label class="check full">
          <input v-model="template.theme.showTotal" type="checkbox" />
          显示总分
        </label>
      </div>
    </section>

    <section class="card section-card">
      <header class="section-head">
        <h2>模块</h2>
      </header>
      <div class="module-list">
        <label v-for="module in template.modules" :key="module.key" class="module-row">
          <input v-model="module.enabled" type="checkbox" />
          <span>{{ moduleLabel(module.key) }}</span>
          <span class="mono quiet">{{ module.key }}</span>
        </label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ReportTemplate } from '@shared/types'
import { moduleLabel } from './useReportEditor'

defineProps<{
  template: ReportTemplate
}>()
</script>

<style scoped src="./reportThemePanel.css"></style>
