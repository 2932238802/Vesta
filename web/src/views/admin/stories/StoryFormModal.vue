<template>
  <Modal
    :open="open"
    :title="story ? '编辑故事' : '新增故事'"
    eyebrow="故事集"
    wide
    @close="emit('close')"
  >
    <div class="story-form">
      <label class="field">
        <span>标题</span>
        <input
          v-model="form.title"
          class="input"
          maxlength="120"
          placeholder="一句话说明这个故事讲什么"
        >
      </label>

      <label class="field">
        <span>分类</span>
        <select v-model="form.categoryId" class="select" :disabled="!categories.length">
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>

      <p v-if="!categories.length" class="form-hint">
        还没有分类。先去「管理分类」新建一个分类，再添加故事。
      </p>

      <label class="field">
        <span>正文</span>
        <textarea
          v-model="form.text"
          class="textarea story-textarea"
          rows="10"
          maxlength="20000"
          placeholder="粘贴或写下完整故事。涉及真实学员时请先自行脱敏。"
        ></textarea>
      </label>

      <label class="field">
        <span>出处 / 适用场景（可选）</span>
        <input
          v-model="form.source"
          class="input"
          maxlength="200"
          placeholder="例如：9.18 咨询稿 · 拖延"
        >
      </label>

      <label class="check">
        <input v-model="form.pinned" type="checkbox">
        <span>置顶这个故事</span>
      </label>

      <p v-if="localError || error" class="form-error">{{ localError || error }}</p>
    </div>

    <template #footer>
      <button class="btn ghost small" type="button" :disabled="saving" @click="emit('close')">
        取消
      </button>
      <button
        class="btn small"
        type="button"
        :disabled="saving || !categories.length"
        @click="save"
      >
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import type { ConsultStory, ConsultStoryCategory, ConsultStoryInput } from '@/api'

const props = defineProps<{
  open: boolean
  story: ConsultStory | null
  categories: ConsultStoryCategory[]
  defaultCategoryId?: string
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', input: ConsultStoryInput): void
}>()

const form = ref({ categoryId: '', title: '', text: '', source: '', pinned: false })
const localError = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const story = props.story
    form.value = {
      categoryId:
        story?.categoryId ?? props.defaultCategoryId ?? props.categories[0]?.id ?? '',
      title: story?.title ?? '',
      text: story?.text ?? '',
      source: story?.source ?? '',
      pinned: story?.pinned ?? false
    }
    localError.value = ''
  }
)

function save() {
  localError.value = ''
  const title = form.value.title.trim()
  const text = form.value.text.trim()
  if (!form.value.categoryId) {
    localError.value = props.categories.length ? '请选择分类' : '请先新增一个分类'
    return
  }
  if (!title) {
    localError.value = '标题不能为空'
    return
  }
  if (title.length > 120) {
    localError.value = '标题最多 120 字'
    return
  }
  if (!text) {
    localError.value = '正文不能为空'
    return
  }
  if (text.length > 20000) {
    localError.value = '正文最多 20000 字'
    return
  }
  emit('submit', {
    categoryId: form.value.categoryId,
    title,
    text,
    source: form.value.source.trim(),
    pinned: form.value.pinned
  })
}
</script>

<style scoped>
.story-form {
  display: grid;
  gap: 16px;
}

.story-textarea {
  min-height: 240px;
}

.form-hint {
  color: var(--ink-3);
  font-size: 12.5px;
  line-height: 1.6;
}

.form-error {
  color: var(--danger);
  font-size: 13px;
}
</style>
