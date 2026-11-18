<template>
  <article class="article-view">
    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink :to="{ name: 'admin-knowledge' }">专业知识汇总</RouterLink>
      <span class="crumb-sep">/</span>
      <RouterLink :to="{ name: 'admin-knowledge-major', params: { majorId: article.majorId } }">
        {{ majorName || '专业' }}
      </RouterLink>
      <span class="crumb-sep">/</span>
      <span class="crumb-current">{{ article.title }}</span>
    </nav>

    <div class="article-head">
      <div>
        <p class="eyebrow">{{ majorName || '专业知识' }}</p>
        <h2 class="article-title">{{ article.title }}</h2>
        <p class="article-meta">更新于 {{ formatDate(article.updatedAt) }}</p>
      </div>
      <RouterLink
        class="btn ghost small"
        :to="{ name: 'admin-knowledge-major', params: { majorId: article.majorId } }"
      >返回</RouterLink>
    </div>

    <!-- 正文由 web/src/markdown.ts 先转义再生成固定标签，链接限 http/https。 -->
    <div class="knowledge-body" v-html="rendered"></div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { KnowledgeArticle } from '@/api'
import { formatDate } from '@/format'
import { renderMarkdown } from '@/markdown'

const props = defineProps<{
  article: KnowledgeArticle
  majorName: string
}>()

const rendered = computed(() => renderMarkdown(props.article.body))
</script>
