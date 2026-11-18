<template>
  <article class="question-card card" :class="{ pinned: question.pinned }">
    <header class="question-head">
      <span class="category-chip">{{ categoryName }}</span>
      <span v-if="question.pinned" class="pin-flag">置顶</span>
      <button
        class="pin-btn"
        type="button"
        :title="question.pinned ? '取消置顶' : '置顶'"
        :aria-label="question.pinned ? '取消置顶' : '置顶'"
        @click="emit('pin', question)"
      >{{ question.pinned ? '★' : '☆' }}</button>
    </header>

    <p class="question-text">{{ question.text }}</p>

    <div class="note-block">
      <template v-if="question.note">
        <span class="note-label">备注</span>
        <p class="question-note">{{ question.note }}</p>
      </template>
      <button v-else class="note-empty" type="button" @click="emit('note', question)">
        加备注
      </button>
    </div>

    <footer class="question-foot">
      <div class="question-actions">
        <button class="link-btn" type="button" @click="copy">
          {{ copyError ? '复制失败' : copied ? '已复制' : '复制' }}
        </button>
        <button class="link-btn" type="button" @click="emit('note', question)">编辑备注</button>
        <button class="link-btn" type="button" @click="emit('edit', question)">编辑</button>
        <button class="link-btn danger" type="button" @click="emit('delete', question)">删除</button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { ConsultQuestion } from '@/api'
import { copyPlainText } from '@/clipboard'

const props = defineProps<{
  question: ConsultQuestion
  categoryName: string
}>()

const emit = defineEmits<{
  (event: 'pin', question: ConsultQuestion): void
  (event: 'note', question: ConsultQuestion): void
  (event: 'edit', question: ConsultQuestion): void
  (event: 'delete', question: ConsultQuestion): void
}>()

const copied = ref(false)
const copyError = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

// 复制只取提问正文：备注与分类都不进入剪贴板。
async function copy() {
  const ok = await copyPlainText(props.question.text)
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
.question-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 16px 17px 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.question-card:hover {
  border-color: var(--line-strong);
  box-shadow: 0 6px 18px rgba(27, 26, 23, 0.05);
}

.question-card.pinned {
  border-color: color-mix(in srgb, var(--amber) 34%, var(--line));
  background: #fffdf6;
}

.question-head {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.category-chip {
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}

.pin-flag {
  font-size: 10px;
  color: var(--amber);
  border: 1px solid color-mix(in srgb, var(--amber) 30%, transparent);
  border-radius: 999px;
  padding: 0 7px;
  line-height: 18px;
}

.pin-btn {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-3);
  font-size: 17px;
  line-height: 1;
}

.pin-btn:hover {
  background: rgba(0, 0, 0, 0.045);
  color: var(--amber);
}

.question-card.pinned .pin-btn {
  color: var(--amber);
}

.question-text {
  min-width: 0;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--ink);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  overflow: hidden;
}

.note-block {
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.028);
}

.note-label {
  display: block;
  margin-bottom: 2px;
  color: var(--ink-3);
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

.question-note {
  margin: 0;
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.65;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.note-empty {
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--ink-3);
  font-size: 12px;
}

.note-empty:hover {
  color: var(--accent);
}

.question-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--line) 75%, transparent);
}

.question-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.link-btn {
  border: 0;
  background: transparent;
  padding: 3px 7px;
  border-radius: 7px;
  color: var(--ink-2);
  font-size: 12px;
}

.link-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ink);
}

.link-btn.danger:hover {
  color: var(--danger);
  background: #f8eae6;
}

@media (max-width: 640px) {
  .question-card {
    padding: 14px 14px 10px;
  }
}
</style>
