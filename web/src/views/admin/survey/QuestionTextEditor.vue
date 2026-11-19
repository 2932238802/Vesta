<template>
  <div class="sub-block form-grid">
    <label class="field">
      <span>输入框（逗号分隔）</span>
      <input
        :value="(question.fields ?? []).join('，')"
        class="input"
        type="text"
        placeholder="例：家乡，读书城市"
        @input="actions.setFields(($event.target as HTMLInputElement).value)"
      />
    </label>
    <label class="field">
      <span>占位提示</span>
      <input v-model="question.placeholder" class="input" type="text" />
    </label>
  </div>
</template>

<script setup lang="ts">
import type { Question } from '@shared/types'
import type { SurveyEditorActions } from './useSurveyEditor'

defineProps<{
  question: Question
  actions: SurveyEditorActions
}>()
</script>

<style scoped>
.sub-block {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
