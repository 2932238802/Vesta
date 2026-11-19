<template>
  <header class="panel-head">
    <div>
      <p class="eyebrow">编辑分组</p>
      <h2>{{ group.code }} · {{ group.title }}</h2>
    </div>
    <div class="row-actions">
      <button class="btn quiet" type="button" @click="actions.moveGroup(group.id, -1)">
        上移
      </button>
      <button class="btn quiet" type="button" @click="actions.moveGroup(group.id, 1)">
        下移
      </button>
      <button class="btn quiet danger-text" type="button" @click="actions.removeGroup(group.id)">
        删除
      </button>
    </div>
  </header>

  <div class="form-grid">
    <label class="field">
      <span>分组代号</span>
      <input v-model="group.code" class="input" type="text" maxlength="4" />
    </label>
    <label class="field">
      <span>分组名称</span>
      <input v-model="group.title" class="input" type="text" maxlength="80" />
    </label>
    <label class="field full">
      <span>说明（可选）</span>
      <input v-model="group.subtitle" class="input" type="text" maxlength="200" />
    </label>
  </div>

  <div class="sub-block">
    <button class="btn ghost small" type="button" @click="actions.addQuestion(group.id)">
      加一道题
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Survey } from '@shared/types'
import type { SurveyEditorActions } from './useSurveyEditor'

defineProps<{
  group: Survey['groups'][number]
  actions: SurveyEditorActions
}>()
</script>

<style scoped src="./groupEditor.css"></style>
