<template>
  <Modal :open="open" title="编辑备注" eyebrow="有效的提问" @close="emit('close')">
    <div class="note-form">
      <p class="note-context">{{ question?.text }}</p>
      <label class="field">
        <span>备注</span>
        <textarea
          v-model="note"
          class="textarea note-textarea"
          rows="5"
          maxlength="2000"
          placeholder="记下什么时候用、怎么追问；留空即删除备注。"
        ></textarea>
      </label>
      <p class="form-hint">
        备注只有后台可见，不会进入复制内容；涉及真实学员时请先脱敏。
      </p>
      <p v-if="localError || error" class="form-error">{{ localError || error }}</p>
    </div>

    <template #footer>
      <button class="btn ghost small" type="button" :disabled="saving" @click="emit('close')">
        取消
      </button>
      <button class="btn small" type="button" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存备注' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import type { ConsultQuestion } from '@/api'

const props = defineProps<{
  open: boolean
  question: ConsultQuestion | null
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', note: string): void
}>()

const note = ref('')
const localError = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    note.value = props.question?.note ?? ''
    localError.value = ''
  }
)

function save() {
  localError.value = ''
  const value = note.value.trim()
  if (value.length > 2000) {
    localError.value = '备注最多 2000 字'
    return
  }
  emit('submit', value)
}
</script>

<style scoped>
.note-form {
  display: grid;
  gap: 14px;
}

.note-context {
  padding: 9px 12px;
  border-left: 3px solid var(--line-strong);
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.note-textarea {
  min-height: 130px;
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
