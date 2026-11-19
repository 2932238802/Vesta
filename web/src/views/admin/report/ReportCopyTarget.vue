<template>
  <section class="card section-card">
    <header class="section-head">
      <h2>目标与距离</h2>
    </header>
    <div class="form-grid">
      <label class="field">
        <span>标题</span>
        <input v-model="template.copy.target.title" class="input" type="text" maxlength="120" />
      </label>
      <label class="field">
        <span>说明</span>
        <input
          v-model="template.copy.target.subtitle"
          class="input"
          type="text"
          maxlength="300"
        />
      </label>
      <label class="field">
        <span>城市标签</span>
        <input
          v-model="template.copy.target.cityLabel"
          class="input"
          type="text"
          maxlength="40"
        />
      </label>
      <label class="field">
        <span>岗位标签</span>
        <input
          v-model="template.copy.target.roleLabel"
          class="input"
          type="text"
          maxlength="40"
        />
      </label>
      <label class="field">
        <span>月薪标签</span>
        <input
          v-model="template.copy.target.salaryLabel"
          class="input"
          type="text"
          maxlength="40"
        />
      </label>
      <label class="field">
        <span>家乡标签</span>
        <input
          v-model="template.copy.target.hometownLabel"
          class="input"
          type="text"
          maxlength="40"
        />
      </label>
      <label class="field">
        <span>方向标签</span>
        <input
          v-model="template.copy.target.priorityLabel"
          class="input"
          type="text"
          maxlength="40"
        />
      </label>
      <label class="field">
        <span>目标标签</span>
        <input
          v-model="template.copy.target.goalLabel"
          class="input"
          type="text"
          maxlength="40"
        />
      </label>
      <label class="field">
        <span>原因标签</span>
        <input
          v-model="template.copy.target.reasonLabel"
          class="input"
          type="text"
          maxlength="40"
        />
      </label>
      <label class="field">
        <span>优势列表标题</span>
        <input
          v-model="template.copy.target.advantageTitle"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field">
        <span>缺口列表标题</span>
        <input
          v-model="template.copy.target.gapTitle"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field full">
        <span>未填岗位时显示</span>
        <input
          v-model="template.copy.target.missingRole"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field full">
        <span>城市提示 · 家乡是首选</span>
        <textarea
          v-model="template.copy.target.cityNoteHometown"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>城市提示 · 留在读书城市</span>
        <textarea
          v-model="template.copy.target.cityNoteStudy"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>城市提示 · 其他城市</span>
        <textarea
          v-model="template.copy.target.cityNoteOther"
          class="textarea"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>薪资门槛标题</span>
        <input
          v-model="template.copy.target.salaryTitle"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field full">
        <span>薪资门槛说明</span>
        <textarea
          v-model="template.copy.target.salaryNote"
          class="textarea"
          rows="3"
          maxlength="1000"
        />
      </label>
      <label class="field full">
        <span>收尾</span>
        <input
          v-model="template.copy.target.closing"
          class="input"
          type="text"
          maxlength="300"
        />
      </label>
    </div>
    <div class="form-grid option-grid">
      <label
        v-for="band in salaryBands"
        :key="band.key"
        class="field full"
      >
        <span class="mono">期望月薪 {{ band.label }} · 能力门槛</span>
        <input
          v-model="template.copy.target.salaryBands[band.key]"
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
import { salaryBands } from './useReportEditor'

defineProps<{
  template: ReportTemplate
}>()
</script>

<style scoped src="./reportSection.css"></style>
