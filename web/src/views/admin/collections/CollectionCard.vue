<template>
  <article
    class="card collection-card"
    :class="[item.kind, { pinned: item.pinned }]"
    title="单击查看详情"
    tabindex="0"
    role="link"
    @click="onCardClick"
    @keydown.enter="onCardClick"
  >
    <div class="card-top">
      <span class="kind-badge" :class="item.kind">{{ kindLabel(item.kind) }}</span>
      <span v-if="item.pinned" class="pin-flag">置顶</span>
      <div class="card-actions">
        <button
          class="icon-btn"
          type="button"
          :title="item.pinned ? '取消置顶' : '置顶'"
          @click="emit('pin', item)"
        >
          {{ item.pinned ? '★' : '☆' }}
        </button>
        <button class="icon-btn" type="button" @click="emit('edit', item)">编辑</button>
        <button class="icon-btn danger" type="button" @click="emit('delete', item)">删除</button>
      </div>
    </div>

    <h2 class="item-title">{{ displayTitle(item) }}</h2>
    <p v-if="item.kind === 'link'" class="item-host">{{ hostOf(item.url) }}</p>
    <p class="item-summary one-line">{{ synopsis(item) }}</p>

    <div class="meta-row">
      <a
        v-if="item.url && item.kind !== 'link'"
        class="source-link"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >原文链接</a>
      <span v-if="item.source" class="source-text">{{ item.source }}</span>
      <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>

    <div class="card-foot">
      <span>
        {{ formatDate(item.updatedAt, false) }}
        <span class="card-hint">· 查看详情</span>
      </span>
      <button class="link-btn" type="button" @click="emit('copy', item)">
        {{ copiedId === item.id ? '已复制' : item.kind === 'link' ? '复制链接' : '复制内容' }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ConsultCollectionItem } from '@/api'
import { formatDate } from '@/format'
import { displayTitle, hostOf, kindLabel, synopsis } from './useCollections'

const props = defineProps<{
  item: ConsultCollectionItem
  copiedId: string
}>()

const emit = defineEmits<{
  (event: 'open', item: ConsultCollectionItem): void
  (event: 'pin', item: ConsultCollectionItem): void
  (event: 'edit', item: ConsultCollectionItem): void
  (event: 'delete', item: ConsultCollectionItem): void
  (event: 'copy', item: ConsultCollectionItem): void
}>()

function onCardClick(event: MouseEvent | KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('button, a, input, textarea, select')) return
  event.preventDefault()
  emit('open', props.item)
}
</script>

<style scoped src="./collectionCard.css"></style>
