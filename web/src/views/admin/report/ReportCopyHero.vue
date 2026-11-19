<template>
  <section class="card section-card">
    <header class="section-head">
      <h2>一句话诊断</h2>
    </header>
    <div class="form-grid">
      <label class="field">
        <span>眉标</span>
        <input v-model="template.copy.hero.eyebrow" class="input" type="text" maxlength="200" />
      </label>
      <label class="field">
        <span>小标题</span>
        <input v-model="template.copy.hero.title" class="input" type="text" maxlength="120" />
      </label>
      <label class="field full">
        <span>诊断句</span>
        <textarea
          v-model="template.copy.hero.noQuote"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>档位说明行</span>
        <input v-model="template.copy.hero.tierLine" class="input" type="text" maxlength="300" />
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
