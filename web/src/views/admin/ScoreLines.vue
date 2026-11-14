<template>
  <div class="score-page">
    <AdminPageHeader
      eyebrow="分数线"
      title="分数线"
      subtitle="内部查询参考，不进入报告；分数线请以官方来源为准。"
    >
      <template #actions>
        <span class="quiet tiny">{{ items.length }} 条</span>
        <button class="btn" type="button" @click="startCreate">新增分数线</button>
      </template>
    </AdminPageHeader>

    <section class="card toolbar score-toolbar">
      <div class="tabs" role="tablist" aria-label="分数线类型">
        <button
          class="tab"
          :class="{ on: filterCategory === '' }"
          type="button"
          role="tab"
          :aria-selected="filterCategory === ''"
          @click="filterCategory = ''"
        >
          全部
          <span class="tab-count">{{ countFor('') }}</span>
        </button>
        <button
          v-for="category in categories"
          :key="category.id"
          class="tab"
          :class="{ on: filterCategory === category.id }"
          type="button"
          role="tab"
          :aria-selected="filterCategory === category.id"
          @click="filterCategory = category.id"
        >
          {{ category.name }}
          <span class="tab-count">{{ countFor(category.id) }}</span>
        </button>
      </div>

      <div class="filters">
        <select v-model="filterYear" class="select year-select" aria-label="按年份筛选">
          <option value="">全部年份</option>
          <option v-for="year in yearOptions" :key="year" :value="String(year)">
            {{ year === 0 ? '未标年份' : `${year} 年` }}
          </option>
        </select>
        <input
          v-model="query"
          class="input search-input"
          type="search"
          placeholder="搜索标题、地区、来源…"
          aria-label="搜索分数线"
        >
      </div>
    </section>

    <p v-if="actionError" class="state-line error">{{ actionError }}</p>

    <p v-if="loading" class="state-line">正在读取分数线…</p>
    <p v-else-if="loadError" class="state-line error">
      {{ loadError }}
      <button class="retry" type="button" @click="load()">重新加载</button>
    </p>

    <div v-else-if="!filtered.length" class="card empty">
      <p class="empty-title">
        {{ items.length ? '没有匹配的分数线' : '还没有录入分数线' }}
      </p>
      <p class="quiet">
        {{
          items.length
            ? '换个类型、年份或搜索词试试。'
            : '录入第一条后，这里会按类型和年份汇总，方便随时核对。'
        }}
      </p>
      <button v-if="!items.length" class="btn empty-action" type="button" @click="startCreate">
        新增第一条
      </button>
    </div>

    <div v-else class="set-list">
      <ScoreLineCard
        v-for="item in filtered"
        :key="item.id"
        :set="item"
        @edit="startEdit(item)"
        @delete="remove(item)"
      />
    </div>

    <ScoreLineEditor
      v-if="editor"
      :set="editor.set"
      :categories="categories"
      :default-category="editor.defaultCategory"
      @close="editor = null"
      @saved="onSaved"
    />

    <p v-if="notice" class="toast">{{ notice }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '@/api'
import type { ScoreLineCategory, ScoreLineSet } from '@/api'
import { scoreLineCategories } from '@shared/score-line'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import { confirmAction } from '@/useConfirm'
import ScoreLineCard from './score-lines/ScoreLineCard.vue'
import ScoreLineEditor from './score-lines/ScoreLineEditor.vue'

type CategoryWithCount = ScoreLineCategory & { count: number }

interface EditorState {
  set: ScoreLineSet | null
  defaultCategory: string
}

const items = ref<ScoreLineSet[]>([])
const categories = ref<CategoryWithCount[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const filterCategory = ref('')
const filterYear = ref('')
const query = ref('')
const editor = ref<EditorState | null>(null)
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined

const yearOptions = computed(() => {
  const years = [...new Set(items.value.map((item) => item.year))]
  // 未标年份（0）固定排最后。
  return years.sort((a, b) => (a === 0 ? 1 : 0) - (b === 0 ? 1 : 0) || b - a)
})

const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (filterCategory.value && item.categoryId !== filterCategory.value) return false
    if (filterYear.value !== '' && item.year !== Number(filterYear.value)) return false
    if (!keyword) return true
    return [item.title, item.region, item.sourceName]
      .join('\n')
      .toLowerCase()
      .includes(keyword)
  })
})

function countFor(categoryId: string): number {
  return items.value.filter((item) => {
    if (filterYear.value !== '' && item.year !== Number(filterYear.value)) return false
    return !categoryId || item.categoryId === categoryId
  }).length
}

function sortItems() {
  const order = new Map(scoreLineCategories.map((item, index) => [item.id, index]))
  items.value.sort(
    (a, b) =>
      (order.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER) ||
      (a.year === 0 ? 1 : 0) - (b.year === 0 ? 1 : 0) ||
      b.year - a.year ||
      b.updatedAt.localeCompare(a.updatedAt)
  )
}

async function load(silent = false) {
  if (!silent) loading.value = true
  loadError.value = ''
  try {
    const result = await api.scoreLines()
    items.value = result.sets
    categories.value = result.categories
    sortItems()
    // 数据被删光后，筛选条件可能指向不存在的类型 / 年份，回到「全部」。
    if (filterCategory.value && !categories.value.some((item) => item.id === filterCategory.value)) {
      filterCategory.value = ''
    }
    if (filterYear.value !== '' && !yearOptions.value.some((year) => String(year) === filterYear.value)) {
      filterYear.value = ''
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取分数线失败'
  } finally {
    loading.value = false
  }
}

function flash(message: string) {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    notice.value = ''
  }, 2200)
}

function startCreate() {
  actionError.value = ''
  editor.value = {
    set: null,
    defaultCategory: filterCategory.value || categories.value[0]?.id || ''
  }
}

function startEdit(item: ScoreLineSet) {
  actionError.value = ''
  editor.value = { set: item, defaultCategory: item.categoryId }
}

function onSaved(value: ScoreLineSet) {
  editor.value = null
  const index = items.value.findIndex((item) => item.id === value.id)
  if (index >= 0) items.value[index] = value
  else items.value.push(value)
  sortItems()
  flash('已保存')
}

async function remove(item: ScoreLineSet) {
  actionError.value = ''
  const confirmed = await confirmAction({
    title: '删除这条分数线？',
    message: `「${item.title}」删除后不能恢复。`,
    confirmText: '删除',
    danger: true
  })
  if (!confirmed) return
  try {
    await api.deleteScoreLine(item.id)
    items.value = items.value.filter((row) => row.id !== item.id)
    flash('已删除')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败，请稍后重试'
  }
}

onMounted(() => {
  void load()
})

onBeforeUnmount(() => {
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<style scoped>
.score-toolbar {
  padding: 14px 16px;
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  max-width: 100%;
  padding-bottom: 2px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  padding: 7px 12px;
  font-size: 13px;
  cursor: pointer;
}

.tab:hover {
  background: rgba(0, 0, 0, 0.035);
}

.tab.on {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: transparent;
  font-weight: 500;
}

.tab-count {
  font-size: 11px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.tab.on .tab-count {
  color: var(--accent);
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}

.year-select {
  width: 132px;
}

.search-input {
  width: 240px;
}

.set-list {
  display: grid;
  gap: 14px;
}

.retry {
  border: 0;
  background: transparent;
  color: var(--accent);
  text-decoration: underline;
  cursor: pointer;
  font-size: 13px;
  margin-left: 6px;
}

@media (max-width: 700px) {
  .score-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filters {
    margin-left: 0;
    width: 100%;
  }

  .year-select,
  .search-input {
    flex: 1;
    width: auto;
    min-width: 0;
  }
}
</style>
