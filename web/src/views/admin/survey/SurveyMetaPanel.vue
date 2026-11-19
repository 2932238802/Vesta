<template>
  <div class="meta-grid">
    <section class="card panel">
      <header class="panel-head">
        <h2>问卷信息</h2>
      </header>
      <div class="form-grid">
        <label class="field full">
          <span>标题</span>
          <input v-model="survey.title" class="input" type="text" maxlength="80" />
        </label>
        <label class="field">
          <span>预计用时（分钟）</span>
          <input v-model.number="survey.estimatedMinutes" class="input" type="number" min="1" max="60" />
        </label>
        <label class="field full">
          <span>说明，一行一句</span>
          <textarea v-model="survey.intro" class="textarea" rows="4" />
        </label>
      </div>
    </section>

    <section class="card panel">
      <header class="panel-head">
        <h2>维度与权重</h2>
        <button class="btn quiet" type="button" @click="actions.addDimension">+ 维度</button>
      </header>
      <div class="dim-list">
        <div v-for="dim in survey.dimensions" :key="dim.key" class="dim-row">
          <span class="dim-key">{{ dim.key }}</span>
          <input v-model="dim.name" class="input" type="text" maxlength="40" />
          <input
            v-model.number="dim.weight"
            class="input weight-input"
            type="number"
            min="0"
            step="1"
          />
          <button class="btn quiet danger-text" type="button" @click="actions.removeDimension(dim.key)">
            删除
          </button>
        </div>
      </div>
    </section>

    <section class="card panel">
      <header class="panel-head">
        <h2>档位</h2>
      </header>
      <div class="tier-list">
        <div v-for="tier in survey.tiers" :key="tier.tier" class="tier-row">
          <span class="tier-mark">{{ tier.tier }}</span>
          <input
            v-model.number="tier.min"
            class="input tier-min"
            type="number"
            min="0"
            max="100"
          />
          <input v-model="tier.label" class="input" type="text" maxlength="60" />
          <input v-model="tier.line" class="input" type="text" maxlength="120" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Survey } from '@shared/types'
import type { SurveyEditorActions } from './useSurveyEditor'

defineProps<{
  survey: Survey
  actions: SurveyEditorActions
}>()
</script>

<style scoped src="./surveyMetaPanel.css"></style>
