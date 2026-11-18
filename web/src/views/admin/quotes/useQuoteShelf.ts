import { computed, ref } from 'vue'
import { api } from '@/api'
import type {
  ConsultQuote,
  ConsultQuoteCategory,
  ConsultQuoteInput,
  ConsultQuoteUpdateInput
} from '@/api'

export type QuoteShelfFilter = 'all' | 'pinned' | (string & {})

function sortQuotes(items: ConsultQuote[]): ConsultQuote[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  })
}

function sortCategories(items: ConsultQuoteCategory[]): ConsultQuoteCategory[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

/** 金句栏的本地状态：一次读取全部数据，筛选、搜索与计数都在浏览器完成。 */
export function useQuoteShelf() {
  const categories = ref<ConsultQuoteCategory[]>([])
  const quotes = ref<ConsultQuote[]>([])
  const loading = ref(true)
  const loadError = ref('')
  const selected = ref<QuoteShelfFilter>('all')
  const query = ref('')

  const sortedCategories = computed(() => sortCategories(categories.value))
  const categoryNames = computed(
    () => new Map(categories.value.map((category) => [category.id, category.name]))
  )
  const counts = computed(() => {
    const map = new Map<string, number>()
    for (const quote of quotes.value) {
      map.set(quote.categoryId, (map.get(quote.categoryId) ?? 0) + 1)
    }
    return map
  })
  const displayCategories = computed(() =>
    sortedCategories.value.map((category) => ({
      ...category,
      count: counts.value.get(category.id) ?? 0
    }))
  )
  const pinnedCount = computed(() => quotes.value.filter((quote) => quote.pinned).length)
  const filteredQuotes = computed(() => {
    let list = quotes.value
    if (selected.value === 'pinned') list = list.filter((quote) => quote.pinned)
    else if (selected.value !== 'all') {
      list = list.filter((quote) => quote.categoryId === selected.value)
    }
    const keyword = query.value.trim().toLocaleLowerCase()
    if (keyword) {
      list = list.filter((quote) => {
        const categoryName = categoryNames.value.get(quote.categoryId) ?? ''
        return [quote.text, quote.no, categoryName]
          .join('\n')
          .toLocaleLowerCase()
          .includes(keyword)
      })
    }
    return sortQuotes(list)
  })

  function categoryName(categoryId: string): string {
    return categoryNames.value.get(categoryId) ?? '未分类'
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await api.consultQuotes()
      categories.value = result.categories
      quotes.value = result.quotes
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
        ? '读取金句失败，请检查网络后重试'
        : message || '读取金句失败'
    } finally {
      loading.value = false
    }
  }

  async function createQuote(input: ConsultQuoteInput): Promise<ConsultQuote> {
    const result = await api.createConsultQuote(input)
    quotes.value = [...quotes.value, result.item]
    return result.item
  }

  async function updateQuote(
    id: string,
    input: ConsultQuoteUpdateInput
  ): Promise<ConsultQuote> {
    const result = await api.updateConsultQuote(id, input)
    quotes.value = quotes.value.map((quote) => (quote.id === id ? result.item : quote))
    return result.item
  }

  async function removeQuote(id: string): Promise<void> {
    await api.deleteConsultQuote(id)
    quotes.value = quotes.value.filter((quote) => quote.id !== id)
  }

  async function togglePin(quote: ConsultQuote): Promise<void> {
    await updateQuote(quote.id, { pinned: !quote.pinned })
  }

  async function addCategory(name: string): Promise<void> {
    const result = await api.createConsultQuoteCategory(name)
    categories.value = sortCategories([...categories.value, result.category])
  }

  async function renameCategory(id: string, name: string): Promise<void> {
    const result = await api.updateConsultQuoteCategory(id, name)
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
    const result = await api.reorderConsultQuoteCategories(ids)
    categories.value = result.categories
  }

  async function removeCategory(id: string): Promise<void> {
    await api.deleteConsultQuoteCategory(id)
    categories.value = categories.value.filter((category) => category.id !== id)
    if (selected.value === id) selected.value = 'all'
  }

  return {
    categories,
    quotes,
    loading,
    loadError,
    selected,
    query,
    sortedCategories,
    displayCategories,
    pinnedCount,
    filteredQuotes,
    categoryName,
    load,
    createQuote,
    updateQuote,
    removeQuote,
    togglePin,
    addCategory,
    renameCategory,
    moveCategory,
    removeCategory
  }
}
