<template>
  <div class="sub-block">
    <div class="options-head">
      <span>评分项与关联维度</span>
      <button class="btn quiet" type="button" @click="actions.addRow">+ 评分项</button>
    </div>
    <div
      v-for="(row, index) in question.rows"
      :key="row.id"
      class="option-row matrix-row-edit"
    >
      <span class="option-index">{{ String(index + 1).padStart(2, '0') }}</span>
      <input v-model="row.label" class="input" type="text" maxlength="120" />
      <select
        :value="row.dimension ?? ''"
        class="select"
        @change="actions.setRowDimension(row, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">不关联维度</option>
        <option v-for="dim in dimensions" :key="dim.key" :value="dim.key">
          {{ dim.name }}
        </option>
      </select>
      <button
        class="btn quiet danger-text"
        type="button"
        :disabled="(question.rows?.length ?? 0) <= 2"
        @click="actions.removeRow(row.id)"
      >
        删除
      </button>
    </div>
    <div class="form-grid">
      <label class="field narrow">
        <span>评分上限</span>
        <input
          :value="question.scale ?? 5"
          class="input"
          type="number"
          min="2"
          max="10"
          @input="actions.setScale(($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Question, Survey } from '@shared/types'
import type { SurveyEditorActions } from './useSurveyEditor'

defineProps<{
  question: Question
  dimensions: Survey['dimensions']
  actions: SurveyEditorActions
}>()
</script>

<style scoped src="./questionMatrixEditor.css"></style>
