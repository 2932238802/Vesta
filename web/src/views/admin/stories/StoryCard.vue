<template>
  <article class="story-card card" :class="{ pinned: story.pinned }">
    <header class="story-head">
      <span class="category-chip">{{ categoryName }}</span>
      <span v-if="story.pinned" class="pin-flag">置顶</span>
      <button
        class="pin-btn"
        type="button"
        :title="story.pinned ? '取消置顶' : '置顶'"
        :aria-label="story.pinned ? '取消置顶' : '置顶'"
        @click="emit('pin', story)"
      >{{ story.pinned ? '★' : '☆' }}</button>
    </header>

    <h3 class="story-title" :title="story.title">{{ story.title }}</h3>
    <p class="story-text">{{ story.text }}</p>

    <footer class="story-foot">
      <span v-if="story.source" class="story-source">{{ story.source }}</span>
      <span v-else class="story-source quiet">—</span>
      <div class="story-actions">
        <button class="link-btn" type="button" @click="emit('open', story)">查看全文</button>
        <button class="link-btn" type="button" @click="copy">
          {{ copyError ? '复制失败' : copied ? '已复制' : '复制' }}
        </button>
        <button class="link-btn" type="button" @click="emit('edit', story)">编辑</button>
        <button class="link-btn danger" type="button" @click="emit('delete', story)">删除</button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { ConsultStory } from '@/api'
import { copyPlainText } from '@/clipboard'

const props = defineProps<{
  story: ConsultStory
  categoryName: string
}>()

const emit = defineEmits<{
  (event: 'pin', story: ConsultStory): void
  (event: 'open', story: ConsultStory): void
  (event: 'edit', story: ConsultStory): void
  (event: 'delete', story: ConsultStory): void
}>()

const copied = ref(false)
const copyError = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
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
.story-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 16px 17px 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.story-card:hover {
  border-color: var(--line-strong);
  box-shadow: 0 6px 18px rgba(27, 26, 23, 0.05);
}

.story-card.pinned {
  border-color: color-mix(in srgb, var(--amber) 34%, var(--line));
  background: #fffdf6;
}

.story-head {
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

.story-card.pinned .pin-btn {
  color: var(--amber);
}

.story-title {
  max-width: 100%;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

.story-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--line) 75%, transparent);
}

.story-source {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  color: var(--ink-3);
}

.story-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
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
  .story-card {
    padding: 14px 14px 10px;
  }
}
</style>
