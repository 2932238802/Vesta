<template>
  <Modal
    :open="open"
    :title="question ? '编辑提问' : '新增提问'"
    eyebrow="有效的提问"
    wide
    @close="emit('close')"
  >
    <div class="question-form">
      <label class="field">
        <span>提问正文</span>
        <textarea
          v-model="form.text"
          class="textarea question-textarea"
          rows="4"
          maxlength="2000"
          placeholder="例如：你最近一次觉得时间过得特别快是什么时候？"
        ></textarea>
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
        还没有分类。先去「管理分类」新建一个分类，再添加提问。
      </p>

      <label class="field">
        <span>备注（选填）</span>
        <textarea
          v-model="form.note"
          class="textarea note-textarea"
          rows="3"
          maxlength="2000"
          placeholder="记下什么时候用、怎么追问；涉及真实学员时请先脱敏。"
        ></textarea>
      </label>

      <label class="check">
        <input v-model="form.pinned" type="checkbox">
        <span>置顶这个提问</span>
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
import type {
  ConsultQuestion,
  ConsultQuestionCategory,
  ConsultQuestionInput
} from '@/api'

const props = defineProps<{
  open: boolean
  question: ConsultQuestion | null
  categories: ConsultQuestionCategory[]
  defaultCategoryId?: string
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', input: ConsultQuestionInput): void
}>()

const form = ref({ categoryId: '', text: '', note: '', pinned: false })
const localError = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const question = props.question
    form.value = {
      categoryId:
        question?.categoryId ?? props.defaultCategoryId ?? props.categories[0]?.id ?? '',
      text: question?.text ?? '',
      note: question?.note ?? '',
      pinned: question?.pinned ?? false
    }
    localError.value = ''
  }
)

function save() {
  localError.value = ''
  const text = form.value.text.trim()
  const note = form.value.note.trim()
  if (!form.value.categoryId) {
    localError.value = props.categories.length ? '请选择分类' : '请先新增一个分类'
    return
  }
  if (!text) {
    localError.value = '正文不能为空'
    return
  }
  if (text.length > 2000) {
    localError.value = '正文最多 2000 字'
    return
  }
  if (note.length > 2000) {
    localError.value = '备注最多 2000 字'
    return
  }
  emit('submit', {
    categoryId: form.value.categoryId,
    text,
    note,
    pinned: form.value.pinned
  })
}
</script>

<style scoped>
.question-form {
  display: grid;
  gap: 16px;
}

.question-textarea {
  min-height: 120px;
}

.note-textarea {
  min-height: 96px;
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
