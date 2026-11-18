import { computed, ref } from 'vue'
import { api } from '@/api'
import type {
  ConsultQuestion,
  ConsultQuestionCategory,
  ConsultQuestionInput,
  ConsultQuestionUpdateInput
} from '@/api'

export type QuestionShelfFilter = 'all' | 'pinned' | (string & {})

function sortQuestions(items: ConsultQuestion[]): ConsultQuestion[] {
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

function sortCategories(items: ConsultQuestionCategory[]): ConsultQuestionCategory[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

/** 有效的提问的本地状态：一次读取全部数据，筛选、搜索与计数都在浏览器完成。 */
export function useQuestionShelf() {
  const categories = ref<ConsultQuestionCategory[]>([])
  const questions = ref<ConsultQuestion[]>([])
  const loading = ref(true)
  const loadError = ref('')
  const selected = ref<QuestionShelfFilter>('all')
  const query = ref('')

  const sortedCategories = computed(() => sortCategories(categories.value))
  const categoryNames = computed(
    () => new Map(categories.value.map((category) => [category.id, category.name]))
  )
  const counts = computed(() => {
    const map = new Map<string, number>()
    for (const question of questions.value) {
      map.set(question.categoryId, (map.get(question.categoryId) ?? 0) + 1)
    }
    return map
  })
  const displayCategories = computed(() =>
    sortedCategories.value.map((category) => ({
      ...category,
      count: counts.value.get(category.id) ?? 0
    }))
  )
  const pinnedCount = computed(
    () => questions.value.filter((question) => question.pinned).length
  )
  const filteredQuestions = computed(() => {
    let list = questions.value
    if (selected.value === 'pinned') list = list.filter((question) => question.pinned)
    else if (selected.value !== 'all') {
      list = list.filter((question) => question.categoryId === selected.value)
    }
    const keyword = query.value.trim().toLocaleLowerCase()
    if (keyword) {
      list = list.filter((question) => {
        const categoryName = categoryNames.value.get(question.categoryId) ?? ''
        return [question.text, question.note, categoryName]
          .join('\n')
          .toLocaleLowerCase()
          .includes(keyword)
      })
    }
    return sortQuestions(list)
  })

  function categoryName(categoryId: string): string {
    return categoryNames.value.get(categoryId) ?? '未分类'
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await api.consultQuestions()
      categories.value = result.categories
      questions.value = result.questions
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
        ? '读取提问失败，请检查网络后重试'
        : message || '读取提问失败'
    } finally {
      loading.value = false
    }
  }

  async function createQuestion(input: ConsultQuestionInput): Promise<ConsultQuestion> {
    const result = await api.createConsultQuestion(input)
    questions.value = [...questions.value, result.item]
    return result.item
  }

  async function updateQuestion(
    id: string,
    input: ConsultQuestionUpdateInput
  ): Promise<ConsultQuestion> {
    const result = await api.updateConsultQuestion(id, input)
    questions.value = questions.value.map((question) =>
      question.id === id ? result.item : question
    )
    return result.item
  }

  async function removeQuestion(id: string): Promise<void> {
    await api.deleteConsultQuestion(id)
    questions.value = questions.value.filter((question) => question.id !== id)
  }

  async function togglePin(question: ConsultQuestion): Promise<void> {
    await updateQuestion(question.id, { pinned: !question.pinned })
  }

  async function addCategory(name: string): Promise<void> {
    const result = await api.createConsultQuestionCategory(name)
    categories.value = sortCategories([...categories.value, result.category])
  }

  async function renameCategory(id: string, name: string): Promise<void> {
    const result = await api.updateConsultQuestionCategory(id, name)
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
    const result = await api.reorderConsultQuestionCategories(ids)
    categories.value = result.categories
  }

  async function removeCategory(id: string): Promise<void> {
    await api.deleteConsultQuestionCategory(id)
    categories.value = categories.value.filter((category) => category.id !== id)
    if (selected.value === id) selected.value = 'all'
  }

  return {
    categories,
    questions,
    loading,
    loadError,
    selected,
    query,
    sortedCategories,
    displayCategories,
    pinnedCount,
    filteredQuestions,
    categoryName,
    load,
    createQuestion,
    updateQuestion,
    removeQuestion,
    togglePin,
    addCategory,
    renameCategory,
    moveCategory,
    removeCategory
  }
}
