<template>
  <section class="major-home">
    <div class="major-head">
      <div>
        <p class="eyebrow">专业</p>
        <h2 class="major-title">{{ major.name }}</h2>
        <p class="major-sub">{{ articles.length }} 个知识点</p>
      </div>
      <button class="btn small" type="button" @click="emit('create')">新增知识点</button>
    </div>

    <div v-if="!articles.length" class="card empty">      <p class="empty-title">还没有知识点</p>
      <p class="quiet">点右上角“新增知识点”，把通话里能直接讲的内容写下来。</p>
      <button class="btn ghost small empty-action" type="button" @click="emit('create')">
        新增知识点
      </button>
    </div>

    <ul v-else class="article-list">
      <li v-for="article in articles" :key="article.id" class="article-row">
        <button class="article-main" type="button" @click="emit('open', article)">
          <span class="article-title">{{ article.title }}</span>
          <span class="article-meta">更新于 {{ formatDate(article.updatedAt) }}</span>
        </button>
        <div class="knowledge-article-actions">
          <button class="link-btn" type="button" @click="emit('edit', article)">编辑</button>
          <button class="link-btn danger" type="button" @click="emit('delete', article)">
            删除
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { KnowledgeArticleSummary, KnowledgeMajor } from '@/api'
import { formatDate } from '@/format'

defineProps<{
  major: KnowledgeMajor
  articles: KnowledgeArticleSummary[]
}>()

const emit = defineEmits<{
  (event: 'open', article: KnowledgeArticleSummary): void
  (event: 'create'): void
  (event: 'edit', article: KnowledgeArticleSummary): void
  (event: 'delete', article: KnowledgeArticleSummary): void
}>()
</script>
