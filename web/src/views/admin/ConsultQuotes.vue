<template>
  <div class="quotes-page">
    <AdminPageHeader eyebrow="咨询" title="金句栏">
      <template #actions>
        <span class="count">{{ quotes.length }} 条金句</span>
        <button
          class="btn ghost"
          type="button"
          :disabled="!filteredQuotes.length"
          @click="openRandom"
        >随机三条</button>
        <button class="btn" type="button" @click="startCreate">新增金句</button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取金句…</div>
    <div v-else-if="loadError" class="card empty">
      <p class="empty-title">{{ loadError }}</p>
      <p class="quiet">请检查网络后重试。</p>
      <button class="btn ghost small empty-action" type="button" @click="load">重新读取</button>
    </div>

    <div v-else class="quote-layout">
      <aside class="card category-panel" aria-label="金句分类">
        <button
          class="cat-item"
          :class="{ on: selected === 'all' }"
          type="button"
          @click="selected = 'all'"
        >
          <span class="cat-name">全部金句</span>
          <span class="cat-count">{{ quotes.length }}</span>
        </button>
        <button
          class="cat-item"
          :class="{ on: selected === 'pinned' }"
          type="button"
          @click="selected = 'pinned'"
        >
          <span class="cat-name">置顶</span>
          <span class="cat-count">{{ pinnedCount }}</span>
        </button>
        <button
          v-for="category in displayCategories"
          :key="category.id"
          class="cat-item"
          :class="{ on: selected === category.id }"
          type="button"
          @click="selected = category.id"
        >
          <span class="cat-name">{{ category.name }}</span>
          <span class="cat-count">{{ category.count }}</span>
        </button>
        <button class="manage-btn" type="button" @click="categoryOpen = true">管理分类</button>
      </aside>

      <section class="quote-main">
        <div class="card toolbar quote-toolbar">
          <input
            v-model="query"
            class="input search"
            type="search"
            maxlength="200"
            placeholder="搜索正文、编号或分类名…"
            aria-label="搜索金句"
          >
          <span class="result-count">
            {{ query.trim() ? '匹配 ' : '共 ' }}{{ filteredQuotes.length }} 条
          </span>
        </div>

        <p v-if="pageError" class="notice">{{ pageError }}</p>

        <div v-if="!filteredQuotes.length" class="card empty">
          <p class="empty-title">{{ emptyTitle }}</p>
          <p class="quiet">{{ emptyHint }}</p>
        </div>
        <div v-else class="quote-grid">
          <QuoteCard
            v-for="quote in filteredQuotes"
            :key="quote.id"
            :quote="quote"
            :category-name="categoryName(quote.categoryId)"
            @pin="pinQuote"
            @edit="startEdit"
            @delete="askDelete"
          />
        </div>
      </section>
    </div>

    <QuoteFormModal
      :open="formOpen"
      :quote="editing"
      :categories="displayCategories"
      :default-category-id="defaultCategory"
      :saving="saving"
      :error="formError"
      @close="closeForm"
      @submit="submitQuote"
    />

    <QuoteCategoryModal
      :open="categoryOpen"
      :categories="displayCategories"
      :busy="categoryBusy"
      :error="categoryError"
      @close="categoryOpen = false"
      @add="onAddCategory"
      @rename="onRenameCategory"
      @move="onMoveCategory"
      @remove="onRemoveCategory"
    />

    <Modal :open="randomOpen" title="随机三条" eyebrow="金句栏" @close="randomOpen = false">
      <div class="random-list">
        <p v-for="(quote, index) in randomPicks" :key="quote.id" class="random-item">
          <span class="random-no">{{ index + 1 }}</span>
          <span>{{ quote.text }}</span>
        </p>
      </div>
      <template #footer>
        <button class="btn ghost small" type="button" @click="drawRandom">换一批</button>
        <button class="btn small" type="button" :disabled="!randomPicks.length" @click="copyRandom">
          {{ randomCopied ? '已复制' : '复制这三条' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ConsultQuote, ConsultQuoteInput } from '@/api'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import Modal from '@/components/Modal.vue'
import { confirmAction } from '@/useConfirm'
import QuoteCard from './quotes/QuoteCard.vue'
import QuoteFormModal from './quotes/QuoteFormModal.vue'
import QuoteCategoryModal from './quotes/QuoteCategoryModal.vue'
import { copyPlainText } from '@/clipboard'
import { useQuoteShelf } from './quotes/useQuoteShelf'

const shelf = useQuoteShelf()
const {
  quotes,
  loading,
  loadError,
  selected,
  query,
  displayCategories,
  pinnedCount,
  filteredQuotes,
  categoryName,
  load
} = shelf

const pageError = ref('')
const formOpen = ref(false)
const editing = ref<ConsultQuote | null>(null)
const saving = ref(false)
const formError = ref('')
const categoryOpen = ref(false)
const categoryBusy = ref(false)
const categoryError = ref('')
const randomOpen = ref(false)
const randomPicks = ref<ConsultQuote[]>([])
const randomCopied = ref(false)

const defaultCategory = computed(() =>
  selected.value !== 'all' && selected.value !== 'pinned' ? selected.value : undefined
)
const emptyTitle = computed(() => {
  if (query.value.trim()) return '没有匹配的金句'
  if (selected.value === 'pinned') return '还没有置顶金句'
  if (selected.value !== 'all') return '这个分类还没有金句'
  return '还没有金句'
})
const emptyHint = computed(() => {
  if (query.value.trim()) return '换个词试试，或清空搜索。'
  if (selected.value === 'pinned') return '在任意金句卡片上点 ☆ 即可置顶。'
  if (selected.value !== 'all') return '点右上角“新增金句”，把正文放进这个分类。'
  return '点右上角“新增金句”添加第一条。'
})

function startCreate() {
  editing.value = null
  formError.value = ''
  formOpen.value = true
}

function startEdit(quote: ConsultQuote) {
  editing.value = quote
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  if (saving.value) return
  formOpen.value = false
  formError.value = ''
}

async function submitQuote(input: ConsultQuoteInput) {
  saving.value = true
  formError.value = ''
  pageError.value = ''
  try {
    if (editing.value) await shelf.updateQuote(editing.value.id, input)
    else await shelf.createQuote(input)
    formOpen.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function pinQuote(quote: ConsultQuote) {
  pageError.value = ''
  try {
    await shelf.togglePin(quote)
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '置顶失败'
  }
}

async function askDelete(quote: ConsultQuote) {
  const preview = quote.text.length > 40 ? `${quote.text.slice(0, 40)}…` : quote.text
  const ok = await confirmAction({
    title: '删除金句',
    message: `删除「${preview}」？删除后不能恢复。`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true
  })
  if (!ok) return
  pageError.value = ''
  try {
    await shelf.removeQuote(quote.id)
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '删除失败'
  }
}

async function runCategoryAction(action: () => Promise<void>) {
  categoryBusy.value = true
  categoryError.value = ''
  try {
    await action()
  } catch (error) {
    categoryError.value = error instanceof Error ? error.message : '分类操作失败'
  } finally {
    categoryBusy.value = false
  }
}

function onAddCategory(name: string) {
  void runCategoryAction(() => shelf.addCategory(name))
}

function onRenameCategory(id: string, name: string) {
  void runCategoryAction(() => shelf.renameCategory(id, name))
}

function onMoveCategory(id: string, offset: -1 | 1) {
  void runCategoryAction(() => shelf.moveCategory(id, offset))
}

function onRemoveCategory(id: string) {
  void runCategoryAction(() => shelf.removeCategory(id))
}

function drawRandom() {
  const pool = [...filteredQuotes.value]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  randomPicks.value = pool.slice(0, Math.min(3, pool.length))
  randomCopied.value = false
}

function openRandom() {
  drawRandom()
  randomOpen.value = true
}

async function copyRandom() {
  const ok = await copyPlainText(randomPicks.value.map((quote) => quote.text).join('\n\n'))
  randomCopied.value = ok
}

onMounted(load)
</script>

<style scoped src="./consultQuotes.css"></style>
