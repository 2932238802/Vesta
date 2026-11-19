<template>
  <div v-if="question.type === 'single'" class="sub-block">
    <label class="check">
      <input
        type="checkbox"
        :checked="question.display === 'rating'"
        @change="actions.toggleRating"
      />
      五分制刻度（1 到 5 分）
    </label>

    <div v-if="question.display === 'rating'" class="form-grid">
      <label class="field">
        <span>1 分是什么样</span>
        <input
          :value="question.anchors?.low ?? ''"
          class="input"
          type="text"
          @input="actions.setAnchor('low', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="field">
        <span>5 分是什么样</span>
        <input
          :value="question.anchors?.high ?? ''"
          class="input"
          type="text"
          @input="actions.setAnchor('high', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </div>

  <div
    v-if="
      question.type === 'single' ||
      question.type === 'choiceText' ||
      question.type === 'multi'
    "
    class="options-block"
  >
    <div class="options-head">
      <span>选项与分值</span>
      <button class="btn quiet" type="button" @click="actions.addOption">+ 选项</button>
    </div>
    <div
      v-for="(option, index) in question.options"
      :key="option.id"
      class="option-row"
    >
      <span class="option-index">{{ String(index + 1).padStart(2, '0') }}</span>
      <input v-model="option.label" class="input" type="text" maxlength="120" />
      <input
        class="input score-input"
        type="number"
        step="0.5"
        placeholder="不计分"
        :value="option.score ?? ''"
        @input="actions.setOptionScore(option, ($event.target as HTMLInputElement).value)"
      />
      <button
        class="btn quiet danger-text"
        type="button"
        :disabled="(question.options?.length ?? 0) <= 2"
        @click="actions.removeOption(option.id)"
      >
        删除
      </button>
    </div>
  </div>

  <div v-if="question.type === 'choiceText'" class="sub-block">
    <div class="form-grid">
      <label class="field">
        <span>描述标签</span>
        <input
          v-model="question.noteLabel"
          class="input"
          type="text"
          maxlength="60"
        />
      </label>
      <label class="field">
        <span>描述提示</span>
        <input
          v-model="question.notePlaceholder"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
      <label class="field">
        <span>其他项标签</span>
        <input
          v-model="question.otherLabel"
          class="input"
          type="text"
          maxlength="60"
        />
      </label>
      <label class="field">
        <span>其他项提示</span>
        <input
          v-model="question.otherPlaceholder"
          class="input"
          type="text"
          maxlength="120"
        />
      </label>
    </div>
  </div>

  <div v-if="question.type === 'multi'" class="sub-block">
    <label class="field narrow">
      <span>最多可选</span>
      <input
        :value="question.maxSelect ?? ''"
        class="input"
        type="number"
        min="1"
        @input="actions.setMaxSelect(($event.target as HTMLInputElement).value)"
      />
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

<style scoped src="./questionOptionsEditor.css"></style>
