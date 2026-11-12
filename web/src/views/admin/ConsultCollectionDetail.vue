<template>
  <div class="detail-page">
    <nav class="crumbs" aria-label="路径">
      <RouterLink :to="{ name: 'admin-consult-collections' }">收藏栏</RouterLink>
      <span class="sep">/</span>
      <span>{{ item ? kindLabel(item.kind) : '条目' }}</span>
    </nav>

    <p v-if="loading" class="state-line">正在读取…</p>
    <p v-else-if="loadError" class="state-line error">{{ loadError }}</p>

    <div v-else-if="!item" class="card empty">
      <p class="empty-title">这条收藏不存在或已被删除。</p>
      <RouterLink class="btn ghost" :to="{ name: 'admin-consult-collections' }">返回收藏栏</RouterLink>
    </div>

    <div v-else class="wiki">
      <article class="card wiki-article">
        <header class="article-head">
          <span class="kind-badge" :class="item.kind">{{ kindLabel(item.kind) }}</span>
          <span v-if="item.pinned" class="pin-flag">置顶</span>
          <h1>{{ displayTitle(item) }}</h1>
          <p v-if="item.summary" class="lede">{{ item.summary }}</p>
        </header>

        <template v-if="item.kind === 'link'">
          <a
            class="link-card"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="link-host">{{ hostOf(item.url) }}</span>
            <span class="link-url">{{ item.url }}</span>
            <span class="link-open">打开原文 →</span>
          </a>
        </template>
        <div v-else class="article-body md-body" v-html="renderMarkdown(item.content)"></div>

        <div class="article-actions">
          <button class="btn ghost" type="button" @click="startEdit">编辑</button>
          <button class="btn ghost" type="button" @click="copy">
            {{ copied ? '已复制' : '复制原文' }}
          </button>
          <a
            v-if="item.url"
            class="btn ghost"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
          >打开原文</a>
        </div>
      </article>

      <aside class="card wiki-info">
        <h2>条目信息</h2>
        <dl>
          <dt>类型</dt>
          <dd>{{ kindLabel(item.kind) }}</dd>
          <template v-if="item.source">
            <dt>出处 / 作者</dt>
            <dd>{{ item.source }}</dd>
          </template>
          <dt>收藏时间</dt>
          <dd>{{ formatDate(item.createdAt) }}</dd>
          <dt>最近更新</dt>
          <dd>{{ formatDate(item.updatedAt) }}</dd>
          <template v-if="item.tags.length">
            <dt>标签</dt>
            <dd class="tags">
              <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
            </dd>
          </template>
          <template v-if="item.url">
            <dt>原文链接</dt>
            <dd class="url-cell">
              <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.url }}</a>
            </dd>
          </template>
        </dl>
        <button class="danger-link" type="button" @click="remove">删除这条收藏</button>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import type { ConsultCollectionItem, ConsultCollectionKind } from '@/api'
import { consultCollectionKindLabels } from '@shared/consult-collection'
import { formatDate } from '@/format'
import { renderMarkdown } from '@/markdown'
import { confirmAction } from '@/useConfirm'

const route = useRoute()
const router = useRouter()
const item = ref<ConsultCollectionItem | null>(null)
const loading = ref(true)
const loadError = ref('')
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

function idFromRoute(): string {
  const value = route.params.id
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

async function load() {
  const id = idFromRoute()
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const result = await api.consultCollection(id)
    item.value = result.item
  } catch (error) {
    item.value = null
    loadError.value = error instanceof Error ? error.message : '读取收藏失败'
  } finally {
    loading.value = false
  }
}

function kindLabel(kind: ConsultCollectionKind): string {
  return consultCollectionKindLabels[kind] ?? kind
}

function displayTitle(entry: ConsultCollectionItem): string {
  const title = entry.title.trim()
  if (title) return title
  if (entry.kind === 'link') return hostOf(entry.url) || '未命名链接'
  const firstLine = entry.content.split('\n').find((line) => line.trim())?.trim() ?? ''
  return firstLine.slice(0, 48) || '未命名收藏'
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function startEdit() {
  if (!item.value) return
  router.push({
    name: 'admin-consult-collections',
    query: { edit: item.value.id }
  })
}

async function copy() {
  const entry = item.value
  if (!entry) return
  const text = entry.kind === 'link' ? entry.url : entry.content
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    loadError.value = '复制失败，请手动选中内容复制'
  }
}

async function remove() {
  const entry = item.value
  if (!entry) return
  const ok = await confirmAction({
    title: '删除收藏',
    message: `删除「${displayTitle(entry)}」？`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true
  })
  if (!ok) return
  try {
    await api.deleteConsultCollection(entry.id)
    router.push({ name: 'admin-consult-collections' })
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '删除失败'
  }
}

onMounted(load)
watch(
  () => route.params.id,
  () => {
    void load()
  }
)
</script>

<style scoped>
.detail-page {
  display: grid;
  gap: 14px;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--ink-3);
}

.crumbs a {
  color: var(--ink-2);
}

.crumbs a:hover {
  color: var(--accent);
}

.sep {
  color: var(--line-strong);
}

.state-line {
  margin: 0;
  color: var(--ink-2);
  font-size: 13px;
}

.state-line.error {
  color: #a33a2c;
}

.empty {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 28px;
}

.empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.wiki {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 268px;
  gap: 18px;
  align-items: start;
}

.wiki-article {
  padding: 30px 34px 24px;
  min-width: 0;
}

.article-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-bottom: 16px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.article-head h1 {
  flex-basis: 100%;
  margin: 6px 0 0;
  font-size: 28px;
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: -0.015em;
  overflow-wrap: anywhere;
}

.lede {
  flex-basis: 100%;
  margin: 8px 0 0;
  color: var(--ink-2);
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.kind-badge {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink-2);
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

.kind-badge.quote {
  background: #f6efe2;
  color: #6e522c;
}

.kind-badge.script {
  background: var(--accent-soft);
  color: var(--accent-ink, #2f5d46);
}

.kind-badge.link {
  background: #e8f0f5;
  color: #335a78;
}

.pin-flag {
  color: #8a6a3b;
  font-size: 10.5px;
}

.article-body {
  max-width: 780px;
  font-size: 14.5px;
  line-height: 1.9;
}

.article-body :deep(p) {
  margin: 0 0 14px;
}

.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3) {
  margin: 26px 0 10px;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.article-body :deep(h1) {
  font-size: 24px;
}

.article-body :deep(h2) {
  font-size: 20px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line);
}

.article-body :deep(h3) {
  font-size: 17px;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 10px 0 14px;
  padding-left: 24px;
}

.article-body :deep(li) {
  margin: 5px 0;
}

.article-body :deep(blockquote) {
  margin: 14px 0;
  padding: 2px 0 2px 16px;
  border-left: 3px solid #d8c7a8;
  color: var(--ink-2);
}

.article-body :deep(pre) {
  padding: 14px 16px;
  font-size: 12.5px;
}

.link-card {
  display: grid;
  gap: 6px;
  max-width: 640px;
  padding: 18px 20px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--paper);
  color: var(--ink);
}

.link-card:hover {
  border-color: var(--accent);
}

.link-host {
  font-size: 16px;
  font-weight: 600;
}

.link-url {
  color: var(--ink-3);
  font-family: var(--mono);
  font-size: 11.5px;
  overflow-wrap: anywhere;
}

.link-open {
  margin-top: 4px;
  color: var(--accent);
  font-size: 12.5px;
}

.article-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 18px;
  margin-top: 26px;
  border-top: 1px solid var(--line);
}

.wiki-info {
  position: sticky;
  top: 24px;
  padding: 20px;
}

.wiki-info h2 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.wiki-info dl {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 9px 12px;
  margin: 0;
  font-size: 12.5px;
}

.wiki-info dt {
  color: var(--ink-3);
}

.wiki-info dd {
  margin: 0;
  color: var(--ink-2);
  overflow-wrap: anywhere;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink-2);
  font-size: 11px;
}

.url-cell a {
  color: var(--accent);
  text-decoration: underline;
}

.danger-link {
  margin-top: 20px;
  padding: 0;
  border: 0;
  background: none;
  color: #a33a2c;
  font-size: 12px;
  cursor: pointer;
}

.danger-link:hover {
  text-decoration: underline;
}

@media (max-width: 980px) {
  .wiki {
    grid-template-columns: minmax(0, 1fr);
  }

  .wiki-info {
    position: static;
  }
}

@media (max-width: 640px) {
  .wiki-article {
    padding: 20px 18px;
  }

  .article-head h1 {
    font-size: 23px;
  }
}
</style>
