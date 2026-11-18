<template>
  <article class="quote-card card" :class="{ pinned: quote.pinned }">
    <header class="quote-head">
      <span v-if="quote.no" class="no-badge">{{ quote.no }}</span>
      <span class="category-chip">{{ categoryName }}</span>
      <span v-if="quote.pinned" class="pin-flag">置顶</span>
      <button
        class="pin-btn"
        type="button"
        :title="quote.pinned ? '取消置顶' : '置顶'"
        :aria-label="quote.pinned ? '取消置顶' : '置顶'"
        @click="emit('pin', quote)"
      >{{ quote.pinned ? '★' : '☆' }}</button>
    </header>

    <p class="quote-text" :class="{ clamped: canExpand && !expanded }">{{ quote.text }}</p>
    <button v-if="canExpand" class="expand-btn" type="button" @click="expanded = !expanded">
      {{ expanded ? '收起' : '展开' }}
    </button>

    <footer class="quote-foot">
      <span v-if="quote.source" class="quote-source">{{ quote.source }}</span>
      <span v-else class="quote-source quiet">—</span>
      <div class="quote-actions">
        <button class="link-btn" type="button" @click="copy">
          {{ copyError ? '复制失败' : copied ? '已复制' : '复制' }}
        </button>
        <button class="link-btn" type="button" @click="emit('edit', quote)">编辑</button>
        <button class="link-btn danger" type="button" @click="emit('delete', quote)">删除</button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { ConsultQuote } from '@/api'
import { copyPlainText } from './clipboard'

const props = defineProps<{
  quote: ConsultQuote
  categoryName: string
}>()

const emit = defineEmits<{
  (event: 'pin', quote: ConsultQuote): void
  (event: 'edit', quote: ConsultQuote): void
  (event: 'delete', quote: ConsultQuote): void
}>()

const expanded = ref(false)
const copied = ref(false)
const copyError = ref(false)
const canExpand = computed(() => props.quote.text.length > 140)
let copyTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  const ok = await copyPlainText(props.quote.text)
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
.quote-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 17px 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.quote-card:hover {
  border-color: var(--line-strong);
  box-shadow: 0 6px 18px rgba(27, 26, 23, 0.05);
}

.quote-card.pinned {
  border-color: color-mix(in srgb, var(--amber) 34%, var(--line));
  background: #fffdf6;
}

.quote-head {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.no-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 7px;
  border-radius: 6px;
  background: rgba(27, 26, 23, 0.06);
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: 11px;
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

.quote-card.pinned .pin-btn {
  color: var(--amber);
}

.quote-text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.quote-text.clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

.expand-btn {
  align-self: flex-start;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--accent);
  font-size: 12px;
}

.quote-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--line) 75%, transparent);
}

.quote-source {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  color: var(--ink-3);
}

.quote-actions {
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
  .quote-card {
    padding: 14px 14px 10px;
  }
}
</style>
