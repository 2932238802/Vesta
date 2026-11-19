<template>
  <div class="survey-page">
    <AdminPageHeader eyebrow="设置" title="题目、选项与计分" :dirty="dirty">
      <template #actions>
        <button class="btn ghost small" type="button" @click="previewOpen = true">预览</button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取问卷</div>
    <div v-else-if="!survey" class="card empty">{{ error || '问卷加载失败' }}</div>

    <template v-else>
      <p v-if="error" class="notice">{{ error }}</p>

      <div class="tabs">
        <button type="button" :class="{ on: tab === 'questions' }" @click="tab = 'questions'">
          题目
        </button>
        <button type="button" :class="{ on: tab === 'meta' }" @click="tab = 'meta'">
          维度与档位
        </button>
      </div>

      <div v-if="tab === 'questions'" class="editor-grid">
        <SurveyBuilder :survey="survey" :selected="selected" :actions="editor" />

        <section class="card panel">
          <QuestionEditor
            v-if="selectedQuestion"
            :question="selectedQuestion"
            :groups="survey.groups"
            :dimensions="survey.dimensions"
            :actions="editor"
          />
          <GroupEditor
            v-else-if="selectedGroup"
            :group="selectedGroup"
            :actions="editor"
          />
          <div v-else class="empty">未选择</div>
        </section>
      </div>

      <SurveyMetaPanel v-else :survey="survey" :actions="editor" />
    </template>

    <Modal :open="previewOpen" title="预览问卷" eyebrow="学员看到的样子" wide @close="previewOpen = false">
      <div class="preview">
        <h2 class="preview-title serif">{{ survey?.title }}</h2>
        <div v-for="group in survey?.groups" :key="group.id" class="preview-group">
          <p class="eyebrow">{{ group.code }} · {{ group.title }}</p>
          <h3>{{ group.title }}</h3>
          <QuestionField
            v-for="(question, i) in questionsOf(group.id)"
            :key="question.id"
            v-model="previewAnswers[question.id]"
            :question="question"
            :index="i + 1"
          />
        </div>
      </div>
    </Modal>

    <SaveBar
      :dirty="dirty"
      :saving="saving"
      save-label="保存并发布"
      message="问卷修改还没有发布"
      @save="save"
      @discard="discard"
    />

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import Modal from '@/components/Modal.vue'
import QuestionField from '@/components/QuestionField.vue'
import SaveBar from '@/components/SaveBar.vue'
import SurveyBuilder from './survey/SurveyBuilder.vue'
import QuestionEditor from './survey/QuestionEditor.vue'
import GroupEditor from './survey/GroupEditor.vue'
import SurveyMetaPanel from './survey/SurveyMetaPanel.vue'
import { useSurveyEditor } from './survey/useSurveyEditor'

const editor = useSurveyEditor()
const {
  survey,
  loading,
  saving,
  error,
  toast,
  tab,
  selected,
  previewOpen,
  previewAnswers,
  selectedQuestion,
  selectedGroup,
  dirty,
  questionsOf,
  save,
  discard
} = editor
</script>

<style scoped src="./surveyEditor.css"></style>
