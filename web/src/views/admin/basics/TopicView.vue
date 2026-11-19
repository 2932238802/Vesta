<template>
  <article class="topic-view">
    <button class="btn ghost small back-btn" type="button" @click="emit('back')">
      ← 返回话题列表
    </button>

    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink :to="{ name: 'admin-consult-basics' }">大学常识</RouterLink>
      <span class="crumb-sep">/</span>
      <span class="crumb-current">{{ topic.title }}</span>
    </nav>

    <div class="topic-head">
      <div class="topic-head-main">
        <p class="eyebrow">大学常识</p>
        <h2 class="topic-title">{{ topic.title }}</h2>
        <p class="topic-meta">
          <span>更新于 {{ formatDate(topic.updatedAt) }}</span>
          <span aria-hidden="true">·</span>
          <span>管理员维护</span>
        </p>
      </div>
      <div class="topic-tools">
        <button class="tool-btn" type="button" @click="emit('edit')">编辑</button>
        <button class="tool-btn danger" type="button" @click="emit('delete')">删除</button>
      </div>
    </div>

    <!-- 正文只来自 renderMarkdown：先转义原文，再拼接固定标签，链接限 http/https。 -->
    <div class="topic-body" v-html="rendered"></div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { ConsultTopic } from '@/api'
import { formatDate } from '@/format'
import { renderMarkdown } from '@/markdown'

const props = defineProps<{ topic: ConsultTopic }>()

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'edit'): void
  (event: 'delete'): void
}>()

const rendered = computed(() => renderMarkdown(props.topic.body))
</script>
