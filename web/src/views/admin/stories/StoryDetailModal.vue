<template>
  <Modal
    :open="open"
    :title="story ? story.title : '故事全文'"
    :eyebrow="categoryName || '故事集'"
    wide
    @close="emit('close')"
  >
    <div v-if="story" class="story-detail">
      <p v-if="story.source" class="detail-source">出处：{{ story.source }}</p>
      <div class="detail-text">{{ story.text }}</div>
    </div>

    <template #footer>
      <button class="btn ghost small" type="button" @click="emit('close')">关闭</button>
      <button class="btn small" type="button" @click="copy">
        {{ copyError ? '复制失败' : copied ? '已复制' : '复制正文' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { ConsultStory } from '@/api'
import { copyPlainText } from '@/clipboard'
import Modal from '@/components/Modal.vue'

const props = defineProps<{
  open: boolean
  story: ConsultStory | null
  categoryName: string
}>()

const emit = defineEmits<{ (event: 'close'): void }>()

const copied = ref(false)
const copyError = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.open,
  () => {
    copied.value = false
    copyError.value = false
  }
)

async function copy() {
  if (!props.story) return
  const ok = await copyPlainText(props.story.text)
  copied.value = ok
  copyError.value = !ok
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
    copyError.value = false
  }, 1600)
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<style scoped>
.story-detail {
  display: grid;
  gap: 12px;
}

.detail-source {
  color: var(--ink-3);
  font-size: 12.5px;
}

.detail-text {
  max-height: 58vh;
  overflow-y: auto;
  padding-right: 6px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overscroll-behavior: contain;
}

@media (max-width: 600px) {
  .detail-text {
    max-height: 52vh;
  }
}
</style>
