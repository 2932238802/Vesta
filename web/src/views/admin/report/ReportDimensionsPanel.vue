<template>
  <div class="dimension-grid">
    <details v-for="row in rows" :key="row.key" class="card dim-card">
      <summary>
        <span class="dim-name">{{ row.name }}</span>
        <span class="mono quiet">{{ row.key }}</span>
      </summary>
      <div class="form-grid">
        <label class="field full">
          <span>优势文案</span>
          <textarea
            v-model="template.dimensions[row.key].strength"
            class="textarea"
            rows="2"
            maxlength="1000"
          />
        </label>
        <label class="field full">
          <span>补什么</span>
          <input
            v-model="template.dimensions[row.key].gap.what"
            class="input"
            type="text"
            maxlength="500"
          />
        </label>
        <label class="field full">
          <span>怎么补</span>
          <textarea
            v-model="template.dimensions[row.key].gap.how"
            class="textarea"
            rows="2"
            maxlength="1000"
          />
        </label>
        <label class="field">
          <span>什么时候开始</span>
          <input
            v-model="template.dimensions[row.key].gap.when"
            class="input"
            type="text"
            maxlength="300"
          />
        </label>
        <label class="field">
          <span>30 天动作</span>
          <input
            v-model="template.dimensions[row.key].action30"
            class="input"
            type="text"
            maxlength="500"
          />
        </label>
        <label class="field full">
          <span>自评与行为对照（可选）</span>
          <textarea
            v-model="template.dimensions[row.key].consistency"
            class="textarea"
            rows="2"
            maxlength="1000"
          />
        </label>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { ReportTemplate } from '@shared/types'

defineProps<{
  template: ReportTemplate
  rows: { key: string; name: string }[]
}>()
</script>

<style scoped src="./reportDimensionsPanel.css"></style>
