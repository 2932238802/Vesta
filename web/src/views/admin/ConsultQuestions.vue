<template>
  <div class="questions-page">
    <AdminPageHeader eyebrow="咨询" title="有效的提问">
      <template #actions>
        <span class="count">{{ questions.length }} 个提问</span>
        <button
          class="btn"
          type="button"
          :disabled="!displayCategories.length"
          :title="displayCategories.length ? '' : '先新建一个分类'"
          @click="startCreate"
        >新增提问</button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取提问…</div>
    <div v-else-if="loadError" class="card empty">
      <p class="empty-title">{{ loadError }}</p>
      <p class="quiet">请检查网络后重试。</p>
      <button class="btn ghost small empty-action" type="button" @click="load">重新读取</button>
    </div>

    <div v-else class="question-layout">
      <aside class="card category-panel" aria-label="提问分类">
        <button
          class="cat-item"
          :class="{ on: selected === 'all' }"
          type="button"
          @click="selected = 'all'"
        >
          <span class="cat-name">全部提问</span>
          <span class="cat-count">{{ questions.length }}</span>
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
        <p v-if="!displayCategories.length" class="cat-hint">先新建一个分类</p>
        <button class="manage-btn" type="button" @click="openCategoryModal">管理分类</button>
      </aside>

      <section class="question-main">
        <div class="card toolbar question-toolbar">
          <input
            v-model="query"
            class="input search"
            type="search"
            maxlength="200"
            placeholder="搜索正文、备注或分类名…"
            aria-label="搜索提问"
          >
          <span class="result-count">
            {{ query.trim() ? '匹配 ' : '共 ' }}{{ filteredQuestions.length }} 个
          </span>
        </div>

        <p v-if="pageError" class="notice">{{ pageError }}</p>

        <div v-if="!filteredQuestions.length" class="card empty">
          <p class="empty-title">{{ emptyTitle }}</p>
          <p class="quiet">{{ emptyHint }}</p>
        </div>
        <div v-else class="question-grid">
          <QuestionCard
            v-for="question in filteredQuestions"
            :key="question.id"
            :question="question"
            :category-name="categoryName(question.categoryId)"
            @pin="pinQuestion"
            @note="openNote"
            @edit="startEdit"
            @delete="askDelete"
          />
        </div>
      </section>
    </div>

    <QuestionFormModal
      :open="formOpen"
      :question="editing"
      :categories="displayCategories"
      :default-category-id="defaultCategory"
      :saving="saving"
      :error="formError"
      @close="closeForm"
      @submit="submitQuestion"
    />

    <QuestionNoteModal
      :open="noteOpen"
      :question="noteTarget"
      :saving="noteSaving"
      :error="noteError"
      @close="closeNote"
      @submit="submitNote"
    />

    <QuestionCategoryModal
      :open="categoryOpen"
      :categories="displayCategories"
      :busy="categoryBusy"
      :error="categoryError"
      @close="closeCategoryModal"
      @add="onAddCategory"
      @rename="onRenameCategory"
      @move="onMoveCategory"
      @remove="onRemoveCategory"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ConsultQuestion, ConsultQuestionInput } from '@/api'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { confirmAction } from '@/useConfirm'
import QuestionCard from './questions/QuestionCard.vue'
import QuestionFormModal from './questions/QuestionFormModal.vue'
import QuestionNoteModal from './questions/QuestionNoteModal.vue'
import QuestionCategoryModal from './questions/QuestionCategoryModal.vue'
import { useQuestionShelf } from './questions/useQuestionShelf'

const shelf = useQuestionShelf()
const {
  questions,
  loading,
  loadError,
  selected,
  query,
  displayCategories,
  pinnedCount,
  filteredQuestions,
  categoryName,
  load
} = shelf

const pageError = ref('')
const formOpen = ref(false)
const editing = ref<ConsultQuestion | null>(null)
const saving = ref(false)
const formError = ref('')
const noteOpen = ref(false)
const noteTarget = ref<ConsultQuestion | null>(null)
const noteSaving = ref(false)
const noteError = ref('')
const categoryOpen = ref(false)
const categoryBusy = ref(false)
const categoryError = ref('')

const defaultCategory = computed(() =>
  selected.value !== 'all' && selected.value !== 'pinned' ? selected.value : undefined
)
const emptyTitle = computed(() => {
  if (query.value.trim()) return '没有匹配的提问'
  if (!displayCategories.value.length && !questions.value.length) return '还没有分类'
  if (selected.value === 'pinned') return '还没有置顶提问'
  if (selected.value !== 'all') return '这个分类还没有提问'
  return '还没有提问'
})
const emptyHint = computed(() => {
  if (query.value.trim()) return '换个词试试，或清空搜索。'
  if (!displayCategories.value.length && !questions.value.length) {
    return '点左侧「管理分类」新建分类，再添加提问。'
  }
  if (selected.value === 'pinned') return '在任意提问卡片上点 ☆ 即可置顶。'
  if (selected.value !== 'all') return '点右上角“新增提问”，把问题放进这个分类。'
  return '点右上角“新增提问”添加第一条。'
})

function startCreate() {
  if (!displayCategories.value.length) return
  editing.value = null
  formError.value = ''
  formOpen.value = true
}

function startEdit(question: ConsultQuestion) {
  editing.value = question
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  if (saving.value) return
  formOpen.value = false
  formError.value = ''
}

async function submitQuestion(input: ConsultQuestionInput) {
  saving.value = true
  formError.value = ''
  pageError.value = ''
  try {
    if (editing.value) await shelf.updateQuestion(editing.value.id, input)
    else await shelf.createQuestion(input)
    formOpen.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function pinQuestion(question: ConsultQuestion) {
  pageError.value = ''
  try {
    await shelf.togglePin(question)
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '置顶失败'
  }
}

function openNote(question: ConsultQuestion) {
  noteTarget.value = question
  noteError.value = ''
  noteOpen.value = true
}

function closeNote() {
  if (noteSaving.value) return
  noteOpen.value = false
  noteError.value = ''
}

async function submitNote(note: string) {
  const target = noteTarget.value
  if (!target) return
  noteSaving.value = true
  noteError.value = ''
  pageError.value = ''
  try {
    await shelf.updateQuestion(target.id, { note })
    noteOpen.value = false
  } catch (error) {
    noteError.value = error instanceof Error ? error.message : '备注保存失败'
  } finally {
    noteSaving.value = false
  }
}

async function askDelete(question: ConsultQuestion) {
  const preview = question.text.length > 40 ? `${question.text.slice(0, 40)}…` : question.text
  const ok = await confirmAction({
    title: '删除提问',
    message: `删除「${preview}」？删除后不能恢复。`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true
  })
  if (!ok) return
  pageError.value = ''
  try {
    await shelf.removeQuestion(question.id)
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '删除失败'
  }
}

function openCategoryModal() {
  categoryError.value = ''
  categoryOpen.value = true
}

function closeCategoryModal() {
  categoryOpen.value = false
  categoryError.value = ''
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

onMounted(load)
</script>

<style scoped src="./consultQuestions.css"></style>
