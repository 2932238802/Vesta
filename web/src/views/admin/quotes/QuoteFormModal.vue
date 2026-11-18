<template>
  <Modal
    :open="open"
    :title="quote ? '编辑金句' : '新增金句'"
    eyebrow="金句栏"
    @close="emit('close')"
  >
    <div class="quote-form">
      <label class="field">
        <span>分类</span>
        <select v-model="form.categoryId" class="select">
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>正文</span>
        <textarea
          v-model="form.text"
          class="textarea"
          rows="6"
          maxlength="10000"
          placeholder="粘贴要收藏的金句正文，原样保留"
        ></textarea>
      </label>

      <label class="field">
        <span>出处（可选）</span>
        <input
          v-model="form.source"
          class="input"
          maxlength="200"
          placeholder="例如：9.18 吕新蕊咨询稿"
        >
      </label>

      <label class="check">
        <input v-model="form.pinned" type="checkbox">
        <span>置顶这条金句</span>
      </label>

      <p v-if="localError || error" class="form-error">{{ localError || error }}</p>
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
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import type { ConsultQuote, ConsultQuoteCategory, ConsultQuoteInput } from '@/api'

const props = defineProps<{
  open: boolean
  quote: ConsultQuote | null
  categories: ConsultQuoteCategory[]
  defaultCategoryId?: string
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', input: ConsultQuoteInput): void
}>()

const form = ref({ categoryId: '', text: '', source: '', pinned: false })
const localError = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const quote = props.quote
    form.value = {
      categoryId:
        quote?.categoryId ?? props.defaultCategoryId ?? props.categories[0]?.id ?? '',
      text: quote?.text ?? '',
      source: quote?.source ?? '',
      pinned: quote?.pinned ?? false
    }
    localError.value = ''
  }
)

function save() {
  localError.value = ''
  const text = form.value.text.trim()
  if (!form.value.categoryId) {
    localError.value = '请选择分类'
    return
  }
  if (!text) {
    localError.value = '正文不能为空'
    return
  }
  emit('submit', {
    categoryId: form.value.categoryId,
    text,
    source: form.value.source.trim(),
    pinned: form.value.pinned
  })
}
</script>

<style scoped>
.quote-form {
  display: grid;
  gap: 16px;
}

.quote-form .textarea {
  min-height: 150px;
}

.form-error {
  color: var(--danger);
  font-size: 13px;
}
</style>
