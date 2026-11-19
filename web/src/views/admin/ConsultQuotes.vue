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
      <aside
        class="card category-panel"
        :class="{ dragging: dragActive }"
        aria-label="金句分类"
      >
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
        <template v-for="category in visibleCategories" :key="category.id">
          <div v-if="editingCategoryId === category.id" class="cat-item cat-item-editing">
            <input
              :ref="setRenameInput"
              v-model="categoryDraft"
              class="cat-rename-input"
              type="text"
              maxlength="30"
              aria-label="分类名"
              :disabled="categorySaving"
              @click.stop
              @pointerdown.stop
              @keydown.enter.prevent="commitRename"
              @keydown.esc.prevent="cancelRename"
              @blur="commitRename()"
            >
            <span class="cat-count">{{ category.count }}</span>
          </div>
          <button
            v-else
            :ref="(el) => setCategoryRef(category.id, el)"
            class="cat-item cat-item-draggable"
            :class="{
              on: selected === category.id,
              dragging: dragActive && dragCategoryId === category.id
            }"
            type="button"
            @click="selectCategory(category.id)"
            @dblclick.stop="startRename(category)"
            @pointerdown="onCategoryPointerDown($event, category.id)"
          >
            <span class="cat-name">{{ category.name }}</span>
            <span class="cat-count">{{ category.count }}</span>
          </button>
        </template>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { ConsultQuote, ConsultQuoteCategory, ConsultQuoteInput } from '@/api'
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
  load,
  reorderCategories
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

// —— 行内改名 ——
const editingCategoryId = ref<string | null>(null)
const categoryDraft = ref('')
const categorySaving = ref(false)
const renameInput = ref<HTMLInputElement | null>(null)
let renameOriginalName = ''

function setRenameInput(el: Element | ComponentPublicInstance | null) {
  renameInput.value = el instanceof HTMLInputElement ? el : null
}

async function startRename(category: ConsultQuoteCategory) {
  if (dragActive.value || categorySaving.value) return
  editingCategoryId.value = category.id
  renameOriginalName = category.name
  categoryDraft.value = category.name
  pageError.value = ''
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

function cancelRename() {
  if (!editingCategoryId.value) return
  editingCategoryId.value = null
  categoryDraft.value = ''
}

async function commitRename() {
  const id = editingCategoryId.value
  if (!id || categorySaving.value) return
  const name = categoryDraft.value.trim()
  if (!name) {
    editingCategoryId.value = null
    categoryDraft.value = ''
    pageError.value = '分类名不能为空'
    return
  }
  if (name === renameOriginalName) {
    cancelRename()
    return
  }
  categorySaving.value = true
  pageError.value = ''
  try {
    await shelf.renameCategory(id, name)
    editingCategoryId.value = null
    categoryDraft.value = ''
  } catch (error) {
    editingCategoryId.value = null
    categoryDraft.value = ''
    pageError.value = error instanceof Error ? error.message : '分类改名失败'
  } finally {
    categorySaving.value = false
  }
}

// —— 拖拽排序（仅鼠标；触屏不在保证范围，沿用 A-037 口径）——
const DRAG_THRESHOLD = 4
const dragActive = ref(false)
const dragCategoryId = ref('')
const dragList = ref<ConsultQuoteCategory[] | null>(null)
const categoryEls = new Map<string, HTMLElement>()
let dragCandidateId = ''
let dragStartX = 0
let dragStartY = 0
let suppressClickUntil = 0

const visibleCategories = computed(() => dragList.value ?? displayCategories.value)

function setCategoryRef(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) categoryEls.set(id, el)
  else categoryEls.delete(id)
}

function selectCategory(id: string) {
  if (Date.now() < suppressClickUntil) return
  if (editingCategoryId.value) return
  selected.value = id
}

function onCategoryPointerDown(event: PointerEvent, id: string) {
  if (event.pointerType !== 'mouse' || event.button !== 0) return
  if (editingCategoryId.value || categorySaving.value || dragActive.value) return
  dragCandidateId = id
  dragStartX = event.clientX
  dragStartY = event.clientY
  window.addEventListener('pointermove', onCategoryPointerMove, { passive: false })
  window.addEventListener('pointerup', onCategoryPointerUp)
  window.addEventListener('pointercancel', onCategoryPointerCancel)
}

function onCategoryPointerMove(event: PointerEvent) {
  if (!dragCandidateId) return
  if (!dragActive.value) {
    if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) < DRAG_THRESHOLD) return
    dragActive.value = true
    dragCategoryId.value = dragCandidateId
    dragList.value = displayCategories.value.map((category) => ({ ...category }))
  }
  event.preventDefault()
  moveDrag(event.clientX, event.clientY)
}

function moveDrag(clientX: number, clientY: number) {
  const list = dragList.value
  if (!list) return
  const currentIndex = list.findIndex((category) => category.id === dragCategoryId.value)
  if (currentIndex < 0) return
  const horizontal = window.matchMedia('(max-width: 1000px)').matches
  const pointer = horizontal ? clientX : clientY

  // 以其余分类的中线为界，计算拖拽项应插入的位置。
  let insertAt = 0
  for (const category of list) {
    if (category.id === dragCategoryId.value) continue
    const element = categoryEls.get(category.id)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    const middle = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2
    if (pointer < middle) break
    insertAt += 1
  }

  const dragged = list[currentIndex]
  const without = list.filter((category) => category.id !== dragCategoryId.value)
  without.splice(insertAt, 0, dragged)
  if (without.some((category, index) => category.id !== list[index].id)) {
    dragList.value = without
  }
}

function finishDrag(persist: boolean) {
  window.removeEventListener('pointermove', onCategoryPointerMove)
  window.removeEventListener('pointerup', onCategoryPointerUp)
  window.removeEventListener('pointercancel', onCategoryPointerCancel)
  dragCandidateId = ''
  if (!dragActive.value) return
  const ids = dragList.value?.map((category) => category.id) ?? []
  const originalIds = displayCategories.value.map((category) => category.id)
  dragActive.value = false
  dragCategoryId.value = ''
  dragList.value = null
  if (!persist) return
  suppressClickUntil = Date.now() + 300
  if (ids.join('\u0000') === originalIds.join('\u0000')) return
  void saveCategoryOrder(ids)
}

async function saveCategoryOrder(ids: string[]) {
  pageError.value = ''
  try {
    await reorderCategories(ids)
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '调整顺序失败'
  }
}

function onCategoryPointerUp() {
  finishDrag(true)
}

function onCategoryPointerCancel() {
  finishDrag(false)
}

onBeforeUnmount(() => {
  finishDrag(false)
})

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
