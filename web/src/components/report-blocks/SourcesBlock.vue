<template>
  <SectionHead :index="index" :title="block.title" :subtitle="block.subtitle" />

  <div v-if="block.error" class="source-error" role="status">
    <p class="source-label">检索状态</p>
    <p class="source-error-text">{{ block.error }}</p>
    <button
      v-if="block.retryable && allowRetry !== false"
      class="source-retry"
      type="button"
      @click="emit('retry')"
    >
      重新检索并生成
    </button>
    <p v-else-if="allowRetry === false" class="source-error-hint">
      报告已经生成；要重新检索需要新建一份报告。
    </p>
  </div>

  <ul v-if="block.items.length" class="source-list">
    <li v-for="(item, i) in block.items" :key="item.url" class="source">
      <span class="source-index">{{ String(i + 1).padStart(2, '0') }}</span>
      <div class="source-body">
        <a class="source-title" :href="item.url" target="_blank" rel="noopener noreferrer">
          {{ item.title }}
        </a>
        <p v-if="item.usedFor" class="source-use">{{ item.usedFor }}</p>
        <p v-if="item.site" class="source-site">{{ item.site }}</p>
      </div>
    </li>
  </ul>
  <p v-else-if="!block.error" class="source-empty">本次没有可核对的原文。</p>
  <p v-if="block.searchedAt" class="source-time">
    检索时间：{{ block.searchedAt.replace('T', ' ').slice(0, 16) }}
  </p>
</template>

<script setup lang="ts">
import type { ReportBlock } from '@shared/types'
import SectionHead from '../SectionHead.vue'

defineProps<{
  block: ReportBlock & { type: 'sources' }
  index: number
  allowRetry?: boolean
}>()
const emit = defineEmits<{ retry: [] }>()
</script>

<style scoped>
.source-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}

.source {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
}

.source:hover {
  background: color-mix(in srgb, var(--accent) 3%, transparent);
}

.source-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
}

.source-body {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.source-title {
  font-size: 14px;
  line-height: 1.65;
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 3px;
}

.source-title:hover {
  color: var(--accent);
  text-decoration-color: currentColor;
}

.source-use {
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-2);
}

.source-site {
  font-size: 11.5px;
  color: var(--ink-3);
  overflow-wrap: anywhere;
}
</style>

<style scoped>
@media (max-width: 720px) {
  .source {
    padding: 11px 10px;
  }
}
</style>

<style scoped>
.source-list {
  gap: 4px;
}

.source {
  padding: 14px 12px;
  gap: 14px;
}

.source-title {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-size: 15.5px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.source-use {
  font-size: 13.5px;
}

.source-site {
  font-size: 13px;
}

.source-label {
  font-size: var(--report-label);
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.source-error {
  margin-top: 22px;
  padding: 20px 22px;
  border-radius: 14px;
  background: color-mix(in srgb, #b1843c 7%, var(--surface));
}

.source-error-text {
  margin-top: 8px;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--ink-2);
  overflow-wrap: anywhere;
}

.source-error-hint {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink-3);
}

.source-retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: 16px;
  padding: 0 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--line));
  border-radius: 10px;
  background: var(--surface);
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
}

.source-retry:hover {
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}

.source-empty {
  margin-top: 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-3);
}

.source-time {
  margin-top: 18px;
  font-size: 12.5px;
  color: var(--ink-3);
}
</style>

<style scoped src="./shared/media-text.css"></style>

<style scoped>
@media (max-width: 720px) {
  .source {
    padding: 12px 4px;
    grid-template-columns: 22px minmax(0, 1fr);
  }

  .source-error {
    padding: 16px 16px;
  }

  .source-error-hint {
    font-size: 14px;
  }
}
</style>

<style scoped>
@media print {
  .source-error,
  .source-retry {
    display: none;
  }
}
</style>
