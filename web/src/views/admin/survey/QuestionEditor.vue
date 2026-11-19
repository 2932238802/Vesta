<template>
  <header class="panel-head">
    <div>
      <p class="eyebrow">编辑题目</p>
      <h2>{{ question.code }} · {{ question.title || '未命名' }}</h2>
    </div>
    <div class="row-actions">
      <button class="btn quiet" type="button" @click="actions.moveQuestion(question.id, -1)">
        上移
      </button>
      <button class="btn quiet" type="button" @click="actions.moveQuestion(question.id, 1)">
        下移
      </button>
      <button class="btn quiet danger-text" type="button" @click="actions.removeQuestion(question.id)">
        删除
      </button>
    </div>
  </header>

  <div class="form-grid">
    <label class="field">
      <span>题号</span>
      <input v-model="question.code" class="input" type="text" maxlength="12" />
    </label>
    <label class="field">
      <span>所属分组</span>
      <select v-model="question.groupId" class="select">
        <option v-for="group in groups" :key="group.id" :value="group.id">
          {{ group.code }} · {{ group.title }}
        </option>
      </select>
    </label>
    <label class="field full">
      <span>题目</span>
      <input v-model="question.title" class="input" type="text" maxlength="200" />
    </label>
    <label class="field full">
      <span>提示（可选）</span>
      <input v-model="question.hint" class="input" type="text" maxlength="200" />
    </label>
    <label class="field">
      <span>题型</span>
      <select
        v-model="question.type"
        class="select"
        @change="actions.onTypeChange"
      >
        <option value="single">单选</option>
        <option value="choiceText">单选 + 一句描述</option>
        <option value="multi">多选</option>
        <option value="text">文本</option>
        <option value="number">数字</option>
        <option value="matrix">矩阵打分</option>
      </select>
    </label>
    <label class="field">
      <span>计入维度</span>
      <select
        :value="question.dimension ?? ''"
        class="select"
        @change="actions.setDimension(($event.target as HTMLSelectElement).value)"
      >
        <option value="">不计分</option>
        <option v-for="dim in dimensions" :key="dim.key" :value="dim.key">
          {{ dim.name }}
        </option>
      </select>
    </label>
    <label class="field">
      <span>题目作用</span>
      <select
        :value="question.role ?? ''"
        class="select"
        @change="actions.setRole(($event.target as HTMLSelectElement).value)"
      >
        <option value="">普通</option>
        <option value="self">自评</option>
        <option value="behavior">行为锚点</option>
        <option value="context">背景信息</option>
      </select>
    </label>
    <label class="field">
      <span>是否必答</span>
      <span class="check inline-check">
        <input v-model="question.required" type="checkbox" />
        必答
      </span>
    </label>
  </div>

  <QuestionOptionsEditor :question="question" :actions="actions" />

  <QuestionMatrixEditor
    v-if="question.type === 'matrix'"
    :question="question"
    :dimensions="dimensions"
    :actions="actions"
  />

  <QuestionTextEditor
    v-if="question.type === 'text'"
    :question="question"
    :actions="actions"
  />
</template>

<script setup lang="ts">
import type { Question, Survey } from '@shared/types'
import type { SurveyEditorActions } from './useSurveyEditor'
import QuestionOptionsEditor from './QuestionOptionsEditor.vue'
import QuestionMatrixEditor from './QuestionMatrixEditor.vue'
import QuestionTextEditor from './QuestionTextEditor.vue'

defineProps<{
  question: Question
  groups: Survey['groups']
  dimensions: Survey['dimensions']
  actions: SurveyEditorActions
}>()
</script>

<style scoped src="./questionEditor.css"></style>
