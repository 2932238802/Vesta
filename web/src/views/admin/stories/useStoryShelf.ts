import { computed, ref } from 'vue'
import { api } from '@/api'
import type {
  ConsultStory,
  ConsultStoryCategory,
  ConsultStoryInput,
  ConsultStoryUpdateInput
} from '@/api'

export type StoryShelfFilter = 'all' | 'pinned' | (string & {})

function sortStories(items: ConsultStory[]): ConsultStory[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    // 与接口一致：置顶组内最近置顶优先；非置顶按分类内顺序与创建时间。
    if (a.pinned && a.pinnedAt !== b.pinnedAt) {
      return a.pinnedAt < b.pinnedAt ? 1 : -1
    }
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  })
}

function sortCategories(items: ConsultStoryCategory[]): ConsultStoryCategory[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

/** 故事集的本地状态：一次读取全部数据，筛选、搜索与计数都在浏览器完成。 */
export function useStoryShelf() {
  const categories = ref<ConsultStoryCategory[]>([])
  const stories = ref<ConsultStory[]>([])
  const loading = ref(true)
  const loadError = ref('')
  const selected = ref<StoryShelfFilter>('all')
  const query = ref('')

  const sortedCategories = computed(() => sortCategories(categories.value))
  const categoryNames = computed(
    () => new Map(categories.value.map((category) => [category.id, category.name]))
  )
  const counts = computed(() => {
    const map = new Map<string, number>()
    for (const story of stories.value) {
      map.set(story.categoryId, (map.get(story.categoryId) ?? 0) + 1)
    }
    return map
  })
  const displayCategories = computed(() =>
    sortedCategories.value.map((category) => ({
      ...category,
      count: counts.value.get(category.id) ?? 0
    }))
  )
  const pinnedCount = computed(() => stories.value.filter((story) => story.pinned).length)
  const filteredStories = computed(() => {
    let list = stories.value
    if (selected.value === 'pinned') list = list.filter((story) => story.pinned)
    else if (selected.value !== 'all') {
      list = list.filter((story) => story.categoryId === selected.value)
    }
    const keyword = query.value.trim().toLocaleLowerCase()
    if (keyword) {
      list = list.filter((story) => {
        const categoryName = categoryNames.value.get(story.categoryId) ?? ''
        return [story.title, story.text, categoryName]
          .join('\n')
          .toLocaleLowerCase()
          .includes(keyword)
      })
    }
    return sortStories(list)
  })

  function categoryName(categoryId: string): string {
    return categoryNames.value.get(categoryId) ?? '未分类'
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await api.consultStories()
      categories.value = result.categories
      stories.value = result.stories
      if (
        selected.value !== 'all' &&
        selected.value !== 'pinned' &&
        !categories.value.some((category) => category.id === selected.value)
      ) {
        selected.value = 'all'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      loadError.value = /failed to fetch|networkerror|load failed/i.test(message)
        ? '读取故事失败，请检查网络后重试'
        : message || '读取故事失败'
    } finally {
      loading.value = false
    }
  }

  async function createStory(input: ConsultStoryInput): Promise<ConsultStory> {
    const result = await api.createConsultStory(input)
    stories.value = [...stories.value, result.item]
    return result.item
  }

  async function updateStory(
    id: string,
    input: ConsultStoryUpdateInput
  ): Promise<ConsultStory> {
    const result = await api.updateConsultStory(id, input)
    stories.value = stories.value.map((story) => (story.id === id ? result.item : story))
    return result.item
  }

  async function removeStory(id: string): Promise<void> {
    await api.deleteConsultStory(id)
    stories.value = stories.value.filter((story) => story.id !== id)
  }

  async function togglePin(story: ConsultStory): Promise<void> {
    await updateStory(story.id, { pinned: !story.pinned })
  }

  async function addCategory(name: string): Promise<void> {
    const result = await api.createConsultStoryCategory(name)
    categories.value = sortCategories([...categories.value, result.category])
  }

  async function renameCategory(id: string, name: string): Promise<void> {
    const result = await api.updateConsultStoryCategory(id, name)
    categories.value = categories.value.map((category) =>
      category.id === id ? result.category : category
    )
  }

  async function moveCategory(id: string, offset: -1 | 1): Promise<void> {
    const list = sortedCategories.value
    const index = list.findIndex((category) => category.id === id)
    const target = index + offset
    if (index < 0 || target < 0 || target >= list.length) return
    const ids = list.map((category) => category.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    const result = await api.reorderConsultStoryCategories(ids)
    categories.value = result.categories
  }

  async function removeCategory(id: string): Promise<void> {
    await api.deleteConsultStoryCategory(id)
    categories.value = categories.value.filter((category) => category.id !== id)
    if (selected.value === id) selected.value = 'all'
  }

  return {
    categories,
    stories,
    loading,
    loadError,
    selected,
    query,
    sortedCategories,
    displayCategories,
    pinnedCount,
    filteredStories,
    categoryName,
    load,
    createStory,
    updateStory,
    removeStory,
    togglePin,
    addCategory,
    renameCategory,
    moveCategory,
    removeCategory
  }
}
