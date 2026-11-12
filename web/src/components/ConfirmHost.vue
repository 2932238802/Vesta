<template>
  <Modal
    :open="!!job"
    :title="job?.options.title ?? ''"
    :z-index="100"
    :close-on-overlay="false"
    @close="cancel"
  >
    <p v-if="job?.options.message" class="confirm-message">{{ job.options.message }}</p>

    <label v-if="input" class="field confirm-field">
      <span>{{ input.label }}</span>
      <input
        ref="inputEl"
        v-model="inputValue"
        class="input"
        type="text"
        :placeholder="input.placeholder"
        :maxlength="input.maxlength"
        @keydown.enter.prevent="submit"
      />
    </label>

    <template #footer>
      <button class="btn ghost small" type="button" @click="cancel">
        {{ job?.options.cancelText || '取消' }}
      </button>
      <button
        class="btn small"
        :class="{ 'danger-solid': job?.options.danger }"
        type="button"
        :disabled="confirmDisabled"
        @click="submit"
      >
        {{ job?.options.confirmText || '确定' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Modal from './Modal.vue'
import { answerConfirm, confirmState } from '@/useConfirm'

const job = computed(() => confirmState.current)
const input = computed(() => job.value?.options.input ?? null)
const inputValue = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

const confirmDisabled = computed(() => {
  if (!input.value?.required) return false
  return inputValue.value.trim().length === 0
})

function resetInput() {
  inputValue.value = input.value?.value ?? ''
}

watch(
  () => job.value?.options,
  () => {
    resetInput()
    if (input.value) {
      void nextTick(() => {
        inputEl.value?.focus()
        inputEl.value?.select()
      })
    }
  },
  { immediate: true }
)

function submit() {
  if (!job.value) return
  if (confirmDisabled.value) return
  if (job.value.mode === 'prompt') answerConfirm(inputValue.value.trim())
  else answerConfirm(true)
}

function cancel() {
  if (!job.value) return
  answerConfirm(job.value.mode === 'prompt' ? null : false)
}
</script>

<style scoped>
.confirm-message {
  color: var(--ink-2);
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.confirm-field {
  margin-top: 14px;
}
</style>
