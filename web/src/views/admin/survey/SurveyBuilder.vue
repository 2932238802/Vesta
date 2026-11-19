<template>
  <aside class="card builder">
    <header class="builder-head">
      <span>分组与题目</span>
      <button class="btn quiet" type="button" @click="actions.addGroup">+ 分组</button>
    </header>

    <div v-for="group in survey.groups" :key="group.id" class="group-block">
      <div
        class="group-row"
        :class="{ on: selected?.kind === 'group' && selected.id === group.id }"
        @click="actions.select('group', group.id)"
      >
        <span class="code">{{ group.code }}</span>
        <span class="group-title">{{ group.title }}</span>
        <span class="count">{{ actions.questionsOf(group.id).length }}</span>
      </div>
      <div class="q-rows">
        <button
          v-for="question in actions.questionsOf(group.id)"
          :key="question.id"
          type="button"
          class="q-row"
          :class="{ on: selected?.kind === 'question' && selected.id === question.id }"
          @click="actions.select('question', question.id)"
        >
          <span class="code">{{ question.code }}</span>
          <span class="q-title">{{ question.title || '未命名题目' }}</span>
        </button>
        <button type="button" class="add-q" @click="actions.addQuestion(group.id)">
          + 加一道题
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { Survey } from '@shared/types'
import type { SurveyEditorActions } from './useSurveyEditor'

defineProps<{
  survey: Survey
  selected: { kind: 'group' | 'question'; id: string } | null
  actions: SurveyEditorActions
}>()
</script>

<style scoped src="./surveyBuilder.css"></style>
