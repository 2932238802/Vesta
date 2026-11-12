<template>
  <div class="collections-page">
    <AdminPageHeader eyebrow="咨询" title="收藏栏">
      <template #actions>
        <span class="count">{{ items.length }} 条收藏</span>
        <button class="btn ghost" type="button" :disabled="importing" @click="pickDocx">
          {{ importing ? '导入中…' : '导入 Word' }}
        </button>
        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          @change="onFilesPicked"
        >
        <button class="btn" type="button" @click="startCreate(filter)">新增收藏</button>
      </template>
    </AdminPageHeader>

    <section class="card toolbar">
      <div class="kind-tabs" role="tablist" aria-label="收藏类型">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="kind-tab"
          :class="{ on: filter === tab.value }"
          type="button"
          role="tab"
          :aria-selected="filter === tab.value"
          @click="filter = tab.value"
        >
          {{ tab.label }}
          <span class="tab-count">{{ countFor(tab.value) }}</span>
        </button>
      </div>
      <input
        v-model="query"
        class="search"
        type="search"
        placeholder="搜索金句、咨询稿、出处、标签…"
        aria-label="搜索收藏"
      />
    </section>

    <p v-if="importMessage" class="state-line">{{ importMessage }}</p>
    <p v-if="importError" class="state-line error">{{ importError }}</p>

    <p v-if="loading" class="state-line">正在读取收藏…</p>
    <p v-else-if="loadError" class="state-line error">{{ loadError }}</p>

    <div v-else-if="!filtered.length" class="card empty">
      <p class="empty-title">
        {{ query.trim() ? '没有匹配的收藏' : items.length ? '这个分类还没有收藏' : '还没有收藏' }}
      </p>
      <p class="quiet">
        可以把咨询里的金句、成交稿片段、公众号文章放到这里。之后咨询稿生成器也可以读取这些内容。
      </p>
      <button v-if="!items.length" class="btn" type="button" @click="startCreate(filter)">
        新增第一条
      </button>
    </div>

    <div v-else class="collection-grid">
      <article
        v-for="item in filtered"
        :key="item.id"
        class="card collection-card"
        :class="[item.kind, { pinned: item.pinned }]"
        title="单击查看详情"
        tabindex="0"
        role="link"
        @click="onCardClick($event, item)"
        @keydown.enter="onCardClick($event, item)"
      >
        <div class="card-top">
          <span class="kind-badge" :class="item.kind">{{ kindLabel(item.kind) }}</span>
          <span v-if="item.pinned" class="pin-flag">置顶</span>
          <div class="card-actions">
            <button
              class="icon-btn"
              type="button"
              :title="item.pinned ? '取消置顶' : '置顶'"
              @click="togglePin(item)"
            >
              {{ item.pinned ? '★' : '☆' }}
            </button>
            <button class="icon-btn" type="button" @click="startEdit(item)">编辑</button>
            <button class="icon-btn danger" type="button" @click="remove(item)">删除</button>
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
          <button class="link-btn" type="button" @click="copy(item)">
            {{ copiedId === item.id ? '已复制' : item.kind === 'link' ? '复制链接' : '复制内容' }}
          </button>
        </div>
      </article>
    </div>

    <div v-if="form" class="modal-backdrop" @mousedown.self="closeForm">
      <form class="modal card" @submit.prevent="save">
        <header class="modal-head">
          <h2>{{ form.id ? '编辑收藏' : '新增收藏' }}</h2>
          <button class="icon-btn" type="button" aria-label="关闭" @click="closeForm">×</button>
        </header>

        <div class="kind-picker" role="group" aria-label="收藏类型">
          <button
            v-for="kind in kinds"
            :key="kind"
            class="kind-choice"
            :class="{ on: form.kind === kind }"
            type="button"
            @click="form.kind = kind"
          >
            {{ kindLabel(kind) }}
          </button>
        </div>

        <label class="field">
          <span>标题</span>
          <input v-model="form.title" maxlength="200" placeholder="可不填，默认取内容开头">
        </label>

        <label v-if="form.kind === 'link'" class="field">
          <span>链接</span>
          <input
            v-model="form.url"
            type="url"
            maxlength="2000"
            placeholder="https://mp.weixin.qq.com/..."
          >
        </label>

        <div v-else class="field">
          <span class="field-head">
            <span>{{ form.kind === 'script' ? '咨询稿原文' : '内容' }} · 支持 Markdown</span>
            <span class="md-switch">
              <button
                class="md-switch-btn"
                :class="{ on: !previewing }"
                type="button"
                @click="previewing = false"
              >编辑</button>
              <button
                class="md-switch-btn"
                :class="{ on: previewing }"
                type="button"
                @click="previewing = true"
              >预览</button>
            </span>
          </span>
          <textarea
            v-if="!previewing"
            v-model="form.content"
            :rows="form.kind === 'script' ? 14 : 6"
            :placeholder="form.kind === 'script' ? '粘贴完整咨询稿，保留原始对话和分段；支持 Markdown' : '粘贴金句或片段；支持 **加粗**、列表、链接等 Markdown'"
          ></textarea>
          <div
            v-else
            class="md-preview md-body"
            v-html="renderMarkdown(form.content || '（还没有内容）')"
          ></div>
        </div>

        <div class="form-row">
          <label class="field">
            <span>出处 / 作者</span>
            <input v-model="form.source" maxlength="200" placeholder="例如：9.18 吕新蕊咨询稿">
          </label>
          <label class="field">
            <span>标签</span>
            <input v-model="form.tagsText" placeholder="用逗号分隔，例如：开场, 信任">
          </label>
        </div>

        <label class="field">
          <span>备注</span>
          <textarea
            v-model="form.summary"
            rows="3"
            maxlength="2000"
            placeholder="为什么收藏 / 适合什么场景用"
          ></textarea>
        </label>

        <label v-if="form.kind !== 'link'" class="field">
          <span>原文链接（可选）</span>
          <input v-model="form.url" type="url" maxlength="2000" placeholder="https://...">
        </label>

        <label class="check-row">
          <input v-model="form.pinned" type="checkbox">
          <span>置顶</span>
        </label>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <footer class="modal-actions">
          <button class="btn ghost" type="button" @click="closeForm">取消</button>
          <button class="btn" type="submit" :disabled="saving">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import type {
  ConsultCollectionInput,
  ConsultCollectionItem,
  ConsultCollectionKind
} from '@/api'
import {
  consultCollectionKindLabels,
  consultCollectionKinds
} from '@shared/consult-collection'
import { formatDate } from '@/format'
import { renderMarkdown } from '@/markdown'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { confirmAction } from '@/useConfirm'

interface CollectionForm {
  id: string
  kind: ConsultCollectionKind
  title: string
  content: string
  url: string
  source: string
  summary: string
  tagsText: string
  pinned: boolean
}

const route = useRoute()
const router = useRouter()
const kinds = consultCollectionKinds
const items = ref<ConsultCollectionItem[]>([])
const loading = ref(true)
const loadError = ref('')
const filter = ref<ConsultCollectionKind>('quote')
const query = ref('')
const copiedId = ref('')
const form = ref<CollectionForm | null>(null)
const formError = ref('')
const saving = ref(false)
const previewing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const importMessage = ref('')
const importError = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined

const tabs = computed<{ value: ConsultCollectionKind; label: string }[]>(() =>
  kinds.map((kind) => ({ value: kind, label: consultCollectionKindLabels[kind] }))
)

const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (item.kind !== filter.value) return false
    if (!keyword) return true
    return [item.title, item.content, item.source, item.summary, item.url, item.tags.join(' ')]
      .join('\n')
      .toLowerCase()
      .includes(keyword)
  })
})

function countFor(value: ConsultCollectionKind): number {
  return items.value.filter((item) => item.kind === value).length
}

function kindLabel(kind: ConsultCollectionKind): string {
  return consultCollectionKindLabels[kind] ?? kind
}

function displayTitle(item: ConsultCollectionItem): string {
  const title = item.title.trim()
  if (title) return title
  if (item.kind === 'link') return hostOf(item.url) || '未命名链接'
  const firstLine = item.content.split('\n').find((line) => line.trim())?.trim() ?? ''
  return firstLine.slice(0, 48) || '未命名收藏'
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function plainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\s]*/gm, '')
    .replace(/[*_~`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// 列表只显示一条概要：优先用人工备注，其次取正文开头。
function synopsis(item: ConsultCollectionItem): string {
  const summary = item.summary.trim()
  if (summary) return summary
  if (item.kind === 'link') return item.url
  const text = plainText(item.content)
  return text.length > 100 ? `${text.slice(0, 100)}…` : text || '（没有内容）'
}

function openDetail(item: ConsultCollectionItem) {
  router.push({ name: 'admin-consult-collection', params: { id: item.id } })
}

function onCardClick(event: MouseEvent | KeyboardEvent, item: ConsultCollectionItem) {
  const target = event.target as HTMLElement | null
  if (target?.closest('button, a, input, textarea, select')) return
  event.preventDefault()
  openDetail(item)
}

function sortItems(list: ConsultCollectionItem[]): ConsultCollectionItem[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await api.consultCollections()
    items.value = sortItems(result.items)
    // 默认停在“金句”；如果这一类还没有内容，就落到第一个有收藏的分类，避免像导入失败。
    if (items.value.length && !items.value.some((item) => item.kind === filter.value)) {
      filter.value = items.value[0].kind
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取收藏失败'
  } finally {
    loading.value = false
  }
}

function pickDocx() {
  if (importing.value) return
  fileInput.value?.click()
}

// 一次可以选多个 .docx：逐个上传，失败的文件单独提示，成功的立即并入列表。
async function onFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length || importing.value) return
  importing.value = true
  importMessage.value = ''
  importError.value = ''
  const imported: ConsultCollectionItem[] = []
  const failed: string[] = []
  try {
    for (const [index, file] of files.entries()) {
      importMessage.value = `正在解析 ${index + 1}/${files.length}：${file.name}`
      try {
        const result = await api.importConsultCollectionDocx(file)
        imported.push(result.item)
      } catch (error) {
        failed.push(`${file.name}：${error instanceof Error ? error.message : '导入失败'}`)
      }
    }
    if (imported.length) {
      items.value = sortItems([...imported, ...items.value])
      filter.value = imported[0].kind
      importMessage.value = `已导入 ${imported.length} 个 Word 文件${
        failed.length ? `，${failed.length} 个失败` : ''
      }`
    } else {
      importMessage.value = ''
    }
    importError.value = failed.join('；')
  } finally {
    importing.value = false
  }
}

function startCreate(kind: ConsultCollectionKind = 'quote') {
  formError.value = ''
  previewing.value = false
  form.value = {
    id: '',
    kind,
    title: '',
    content: '',
    url: '',
    source: '',
    summary: '',
    tagsText: '',
    pinned: false
  }
}

function startEdit(item: ConsultCollectionItem) {
  formError.value = ''
  previewing.value = false
  form.value = {
    id: item.id,
    kind: item.kind,
    title: item.title,
    content: item.content,
    url: item.url,
    source: item.source,
    summary: item.summary,
    tagsText: item.tags.join(', '),
    pinned: item.pinned
  }
}

function closeForm() {
  if (saving.value) return
  form.value = null
  formError.value = ''
}

function parseTags(value: string): string[] {
  const tags: string[] = []
  const seen = new Set<string>()
  for (const raw of value.split(/[,，;；、\n]+/)) {
    const tag = raw.trim().slice(0, 30)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= 20) break
  }
  return tags
}

async function save() {
  const current = form.value
  if (!current || saving.value) return
  formError.value = ''
  if (current.kind === 'link' && !current.url.trim()) {
    formError.value = '请填写链接地址'
    return
  }
  if (current.kind !== 'link' && !current.content.trim()) {
    formError.value = '内容不能为空'
    return
  }
  const body: ConsultCollectionInput = {
    kind: current.kind,
    title: current.title,
    content: current.content,
    url: current.url,
    source: current.source,
    summary: current.summary,
    tags: parseTags(current.tagsText),
    pinned: current.pinned
  }
  saving.value = true
  try {
    const result = current.id
      ? await api.updateConsultCollection(current.id, body)
      : await api.createConsultCollection(body)
    items.value = sortItems([
      result.item,
      ...items.value.filter((item) => item.id !== result.item.id)
    ])
    form.value = null
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function togglePin(item: ConsultCollectionItem) {
  try {
    const result = await api.updateConsultCollection(item.id, { pinned: !item.pinned })
    items.value = sortItems(
      items.value.map((entry) => (entry.id === result.item.id ? result.item : entry))
    )
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '操作失败'
  }
}

async function remove(item: ConsultCollectionItem) {
  const ok = await confirmAction({
    title: '删除收藏',
    message: `删除「${displayTitle(item)}」？`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true
  })
  if (!ok) return
  try {
    await api.deleteConsultCollection(item.id)
    items.value = items.value.filter((entry) => entry.id !== item.id)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '删除失败'
  }
}

async function copy(item: ConsultCollectionItem) {
  const text = item.kind === 'link' ? item.url : item.content
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = item.id
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedId.value = ''
    }, 1600)
  } catch {
    loadError.value = '复制失败，请手动选中内容复制'
  }
}

onMounted(async () => {
  await load()
  const editId = typeof route.query.edit === 'string' ? route.query.edit : ''
  if (!editId) return
  const target = items.value.find((item) => item.id === editId)
  if (target) startEdit(target)
  router.replace({ name: 'admin-consult-collections' })
})
</script>

<style scoped>
.collections-page {
  display: grid;
  gap: 18px;
}

.count {
  color: var(--ink-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

@media (min-width: 901px) {
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 18;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
}

.kind-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kind-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  font-size: 12.5px;
  cursor: pointer;
}

.kind-tab:hover {
  background: var(--accent-soft);
}

.kind-tab.on {
  border-color: var(--line-strong);
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(27, 26, 23, 0.06);
}

.tab-count {
  color: var(--ink-3);
  font-family: var(--mono);
  font-size: 10px;
}

.file-input {
  display: none;
}

.search {
  width: min(280px, 40vw);
  padding: 8px 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--paper);
  color: var(--ink);
  font-size: 12.5px;
}

.search:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.state-line {
  margin: 0;
  color: var(--ink-2);
  font-size: 13px;
}

.state-line.error,
.form-error {
  color: #a33a2c;
}

.empty {
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 28px;
}

.empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  align-items: start;
}

.collection-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-top: 3px solid var(--line);
  min-width: 0;
}

.collection-card.quote {
  border-top-color: #8a6a3b;
}

.collection-card.script {
  border-top-color: var(--accent);
}

.collection-card.link {
  border-top-color: #416a8a;
}

.collection-card.other {
  border-top-color: var(--line-strong);
}

.collection-card.pinned {
  box-shadow: 0 2px 10px rgba(27, 26, 23, 0.08);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 22px;
}

.kind-badge {
  padding: 3px 8px;
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

.card-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.icon-btn {
  padding: 4px 7px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-2);
  font-size: 11.5px;
  cursor: pointer;
}

.icon-btn:hover {
  border-color: var(--line);
  background: var(--paper);
}

.icon-btn.danger:hover {
  color: #a33a2c;
  border-color: rgba(163, 58, 44, 0.35);
}

.item-title {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.item-host {
  margin: -4px 0 0;
  color: var(--ink-3);
  font-size: 11px;
  font-family: var(--mono);
  overflow-wrap: anywhere;
}

.md-preview {
  min-height: 140px;
  max-height: 360px;
  padding: 12px;
  border: 1px dashed var(--line-strong);
  border-radius: 9px;
  background: var(--paper);
  overflow: auto;
}

.item-summary {
  margin: 0;
  color: var(--ink-2);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.item-summary.one-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-hint {
  color: var(--ink-3);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.collection-card:hover .card-hint,
.collection-card:focus-visible .card-hint {
  opacity: 1;
}

.collection-card:focus-visible {
  outline: 2px solid rgba(47, 93, 70, 0.55);
  outline-offset: 2px;
}

.link-btn {
  justify-self: start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ink-3);
}

.source-text {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-link {
  color: var(--ink-2);
}

.tag {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--paper);
  border: 1px solid var(--line);
  color: var(--ink-2);
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--line);
  color: var(--ink-3);
  font-size: 11px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(27, 26, 23, 0.36);
  overflow: auto;
}

.modal {
  width: min(640px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 20px;
  display: grid;
  gap: 14px;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-head h2 {
  margin: 0;
  font-size: 17px;
}

.modal-head .icon-btn {
  font-size: 20px;
  line-height: 1;
}

.kind-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kind-choice {
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink-2);
  font-size: 12px;
  cursor: pointer;
}

.kind-choice.on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--ink);
}

.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-2);
}

.field input,
.field textarea {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.md-switch {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 999px;
  overflow: hidden;
}

.md-switch-btn {
  padding: 3px 9px;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  font-size: 11px;
  cursor: pointer;
}

.md-switch-btn.on {
  background: var(--accent-soft);
  color: var(--ink);
}

.field textarea {
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ink-2);
}

.form-error {
  margin: 0;
  font-size: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

@media (max-width: 860px) {
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .search {
    width: 100%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .collection-grid {
    grid-template-columns: 1fr;
  }

  .modal-backdrop {
    padding: 10px;
  }
}
</style>
