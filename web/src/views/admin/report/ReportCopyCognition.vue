<template>
  <section class="card section-card">
    <header class="section-head">
      <h2>认知提示</h2>
    </header>
    <div class="form-grid">
      <label class="field">
        <span>标题</span>
        <input
          v-model="template.copy.cognition.title"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field">
        <span>收尾</span>
        <input
          v-model="template.copy.cognition.closing"
          class="input"
          type="text"
          maxlength="300"
        />
      </label>
      <label class="field full">
        <span>权重清单句</span>
        <textarea
          v-model="template.copy.cognition.weights"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>引导语</span>
        <textarea
          v-model="template.copy.cognition.intro"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>最高权重对照</span>
        <textarea
          v-model="template.copy.cognition.compare"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>最低权重对照</span>
        <textarea
          v-model="template.copy.cognition.lightest"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>缺口权重计入总分说明</span>
        <textarea
          v-model="template.copy.cognition.needLine"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
    </div>
    <div class="form-grid option-grid">
      <label
        v-for="(_, key) in template.copy.cognition.options"
        :key="key"
        class="field full"
      >
        <span class="mono">C1 权重项 {{ key }} 的补充解读</span>
        <input
          v-model="template.copy.cognition.options[key]"
          class="input"
          type="text"
          maxlength="300"
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
