<template>
  <Modal
    :open="open"
    :title="article ? '编辑知识点' : '新增知识点'"
    eyebrow="专业知识汇总"
    wide
    @close="emit('close')"
  >
    <div class="article-form">
      <div class="form-row">
        <label class="field">
          <span>专业</span>
          <select v-model="form.majorId" class="select">
            <option v-for="major in majors" :key="major.id" :value="major.id">
              {{ major.name }}
            </option>
          </select>
        </label>
        <label class="field title-field">
          <span>标题</span>
          <input
            v-model="form.title"
            class="input"
            :maxlength="KNOWLEDGE_ARTICLE_TITLE_MAX"
            placeholder="例如：专科和本科的就业对比"
          >
        </label>
      </div>

      <div class="mode-tabs" role="tablist" aria-label="正文模式">
        <button
          class="mode-tab"
          :class="{ on: mode === 'edit' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'edit'"
          @click="mode = 'edit'"
        >编辑</button>
        <button
          class="mode-tab"
          :class="{ on: mode === 'preview' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'preview'"
          @click="mode = 'preview'"
        >预览</button>
      </div>

      <label v-if="mode === 'edit'" class="field">
        <span>正文（支持 Markdown：标题、加粗、列表、链接、代码）</span>
        <textarea
          v-model="form.body"
          class="textarea article-body-input"
          rows="14"
          :maxlength="KNOWLEDGE_ARTICLE_BODY_MAX"
          placeholder="把要讲的内容写在这里；引用真实案例时请先脱敏。"
        ></textarea>
      </label>
      <div v-else class="preview-pane">
        <p v-if="!form.body.trim()" class="quiet">正文为空，没有可预览的内容。</p>
        <!-- 预览与阅读页共用同一个渲染函数，先转义再插入固定标签。 -->
        <div v-else class="knowledge-body" v-html="previewHtml"></div>
      </div>

      <p class="char-count">{{ form.body.length }} / {{ KNOWLEDGE_ARTICLE_BODY_MAX }}</p>
      <p v-if="localError || error" class="knowledge-form-error">{{ localError || error }}</p>
    </div>

    <template #footer>
      <button class="btn ghost small" type="button" :disabled="saving" @click="emit('close')">
        取消
      </button>
      <button class="btn small" type="button" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { KNOWLEDGE_ARTICLE_BODY_MAX, KNOWLEDGE_ARTICLE_TITLE_MAX } from '@shared/knowledge'
import Modal from '@/components/Modal.vue'
import type { KnowledgeArticle, KnowledgeArticleInput, KnowledgeMajor } from '@/api'
import { renderMarkdown } from '@/markdown'

const props = defineProps<{
  open: boolean
  article: KnowledgeArticle | null
  majors: KnowledgeMajor[]
  defaultMajorId?: string
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', input: KnowledgeArticleInput): void
}>()

const form = ref({ majorId: '', title: '', body: '' })
const mode = ref<'edit' | 'preview'>('edit')
const localError = ref('')
const previewHtml = computed(() => renderMarkdown(form.value.body))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.value = {
      majorId:
        props.article?.majorId ?? props.defaultMajorId ?? props.majors[0]?.id ?? '',
      title: props.article?.title ?? '',
      body: props.article?.body ?? ''
    }
    mode.value = 'edit'
    localError.value = ''
  }
)

function save() {
  localError.value = ''
  const majorId = form.value.majorId
  const title = form.value.title.trim()
  const body = form.value.body.trim()
  if (!majorId) {
    localError.value = '请选择专业'
    return
  }
  if (!title) {
    localError.value = '标题不能为空'
    return
  }
  if (!body) {
    localError.value = '正文不能为空'
    return
  }
  emit('submit', { majorId, title, body })
}
</script>
