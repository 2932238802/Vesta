<template>
  <Modal
    :open="open"
    :title="topic ? '编辑话题' : '新建话题'"
    eyebrow="大学常识"
    wide
    @close="emit('close')"
  >
    <div class="basics-page basics-modal-body">
      <div class="topic-form">
        <label class="field">
          <span>标题</span>
          <input
            v-model="form.title"
            class="input"
            :maxlength="CONSULT_TOPIC_TITLE_MAX"
            placeholder="例如：入党的流程"
          >
        </label>

        <div class="field">
          <span>正文</span>
          <RichTextEditor
            v-model="form.body"
            :maxlength="CONSULT_TOPIC_BODY_MAX"
            :disabled="saving"
            placeholder="把要讲的内容写在这里；引用真实政策时请先核对时效。"
          />
        </div>

        <p class="char-count">{{ form.body.length }} / {{ CONSULT_TOPIC_BODY_MAX }}</p>
        <p v-if="localError || error" class="form-error">{{ localError || error }}</p>
      </div>
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
import { CONSULT_TOPIC_BODY_MAX, CONSULT_TOPIC_TITLE_MAX } from '@shared/consult-topic'
import Modal from '@/components/Modal.vue'
import RichTextEditor from '../components/RichTextEditor.vue'
import type { ConsultTopic, ConsultTopicInput } from '@/api'

const props = defineProps<{
  open: boolean
  topic: ConsultTopic | null
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', input: ConsultTopicInput): void
}>()

const form = ref({ title: '', body: '' })
const localError = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.value = {
      title: props.topic?.title ?? '',
      body: props.topic?.body ?? ''
    }
    localError.value = ''
  }
)

function save() {
  localError.value = ''
  const title = form.value.title.trim()
  const body = form.value.body.trim()
  if (!title) {
    localError.value = '标题不能为空'
    return
  }
  if (!body) {
    localError.value = '正文不能为空'
    return
  }
  emit('submit', { title, body })
}
</script>
