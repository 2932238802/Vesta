<template>
  <div class="stories-page">
    <AdminPageHeader eyebrow="咨询" title="故事集">
      <template #actions>
        <span class="count">{{ stories.length }} 篇故事</span>
        <button
          class="btn"
          type="button"
          :disabled="!displayCategories.length"
          :title="displayCategories.length ? '' : '先新建一个分类'"
          @click="startCreate"
        >新增故事</button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取故事…</div>
    <div v-else-if="loadError" class="card empty">
      <p class="empty-title">{{ loadError }}</p>
      <p class="quiet">请检查网络后重试。</p>
      <button class="btn ghost small empty-action" type="button" @click="load">重新读取</button>
    </div>

    <div v-else class="story-layout">
      <aside class="card category-panel" aria-label="故事分类">
        <button
          class="cat-item"
          :class="{ on: selected === 'all' }"
          type="button"
          @click="selected = 'all'"
        >
          <span class="cat-name">全部故事</span>
          <span class="cat-count">{{ stories.length }}</span>
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
        <button class="manage-btn" type="button" @click="openCategoryModal">管理分类</button>
      </aside>

      <section class="story-main">
        <div class="card toolbar story-toolbar">
          <input
            v-model="query"
            class="input search"
            type="search"
            maxlength="200"
            placeholder="搜索标题、正文或分类名…"
            aria-label="搜索故事"
          >
          <span class="result-count">
            {{ query.trim() ? '匹配 ' : '共 ' }}{{ filteredStories.length }} 篇
          </span>
        </div>

        <p v-if="pageError" class="notice">{{ pageError }}</p>

        <div v-if="!filteredStories.length" class="card empty">
          <p class="empty-title">{{ emptyTitle }}</p>
          <p class="quiet">{{ emptyHint }}</p>
        </div>
        <div v-else class="story-grid">
          <StoryCard
            v-for="story in filteredStories"
            :key="story.id"
            :story="story"
            :category-name="categoryName(story.categoryId)"
            @pin="pinStory"
            @open="openDetail"
            @edit="startEdit"
            @delete="askDelete"
          />
        </div>
      </section>
    </div>

    <StoryDetailModal
      :open="detailOpen"
      :story="detailStory"
      :category-name="detailStory ? categoryName(detailStory.categoryId) : ''"
      @close="closeDetail"
    />

    <StoryFormModal
      :open="formOpen"
      :story="editing"
      :categories="displayCategories"
      :default-category-id="defaultCategory"
      :saving="saving"
      :error="formError"
      @close="closeForm"
      @submit="submitStory"
    />

    <StoryCategoryModal
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
import type { ConsultStory, ConsultStoryInput } from '@/api'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { confirmAction } from '@/useConfirm'
import StoryCard from './stories/StoryCard.vue'
import StoryDetailModal from './stories/StoryDetailModal.vue'
import StoryFormModal from './stories/StoryFormModal.vue'
import StoryCategoryModal from './stories/StoryCategoryModal.vue'
import { useStoryShelf } from './stories/useStoryShelf'

const shelf = useStoryShelf()
const {
  stories,
  loading,
  loadError,
  selected,
  query,
  displayCategories,
  pinnedCount,
  filteredStories,
  categoryName,
  load
} = shelf

const pageError = ref('')
const formOpen = ref(false)
const editing = ref<ConsultStory | null>(null)
const saving = ref(false)
const formError = ref('')
const categoryOpen = ref(false)
const categoryBusy = ref(false)
const categoryError = ref('')
const detailOpen = ref(false)
const detailStory = ref<ConsultStory | null>(null)

const defaultCategory = computed(() =>
  selected.value !== 'all' && selected.value !== 'pinned' ? selected.value : undefined
)
const emptyTitle = computed(() => {
  if (query.value.trim()) return '没有匹配的故事'
  if (!displayCategories.value.length && !stories.value.length) return '还没有分类'
  if (selected.value === 'pinned') return '还没有置顶故事'
  if (selected.value !== 'all') return '这个分类还没有故事'
  return '还没有故事'
})
const emptyHint = computed(() => {
  if (query.value.trim()) return '换个词试试，或清空搜索。'
  if (!displayCategories.value.length && !stories.value.length) {
    return '点左侧「管理分类」新建分类，再添加故事。'
  }
  if (selected.value === 'pinned') return '在任意故事卡片上点 ☆ 即可置顶。'
  if (selected.value !== 'all') return '点右上角“新增故事”，把正文放进这个分类。'
  return '点右上角“新增故事”添加第一篇。'
})

function startCreate() {
  editing.value = null
  formError.value = ''
  formOpen.value = true
}

function startEdit(story: ConsultStory) {
  editing.value = story
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  if (saving.value) return
  formOpen.value = false
  formError.value = ''
}

function openDetail(story: ConsultStory) {
  detailStory.value = story
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
}

async function submitStory(input: ConsultStoryInput) {
  saving.value = true
  formError.value = ''
  pageError.value = ''
  try {
    if (editing.value) await shelf.updateStory(editing.value.id, input)
    else await shelf.createStory(input)
    formOpen.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function pinStory(story: ConsultStory) {
  pageError.value = ''
  try {
    await shelf.togglePin(story)
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '置顶失败'
  }
}

async function askDelete(story: ConsultStory) {
  const ok = await confirmAction({
    title: '删除故事',
    message: `删除「${story.title}」？删除后不能恢复。`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true
  })
  if (!ok) return
  pageError.value = ''
  try {
    await shelf.removeStory(story.id)
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

<style scoped src="./consultStories.css"></style>
