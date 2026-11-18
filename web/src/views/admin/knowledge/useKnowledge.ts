import { computed, ref } from 'vue'
import { api } from '@/api'
import type {
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeArticleSummary,
  KnowledgeArticleUpdateInput,
  KnowledgeMajor
} from '@/api'

function sortMajors(items: KnowledgeMajor[]): KnowledgeMajor[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}

function sortArticles(items: KnowledgeArticleSummary[]): KnowledgeArticleSummary[] {
  return [...items].sort(
    (a, b) =>
      a.majorId.localeCompare(b.majorId) ||
      a.sortOrder - b.sortOrder ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id)
  )
}

function toSummary(article: KnowledgeArticle): KnowledgeArticleSummary {
  const { body: _body, ...summary } = article
  return summary
}

/** 专业知识汇总的本地状态：一次读取专业与知识点摘要，正文按篇读取。 */
export function useKnowledge() {
  const majors = ref<KnowledgeMajor[]>([])
  const articles = ref<KnowledgeArticleSummary[]>([])
  const loading = ref(true)
  const loadError = ref('')
  const article = ref<KnowledgeArticle | null>(null)
  const articleLoading = ref(false)
  const articleError = ref('')

  const sortedMajors = computed(() => sortMajors(majors.value))
  const articleCounts = computed(() => {
    const map = new Map<string, number>()
    for (const item of articles.value) {
      map.set(item.majorId, (map.get(item.majorId) ?? 0) + 1)
    }
    return map
  })
  const displayMajors = computed(() =>
    sortedMajors.value.map((major) => ({
      ...major,
      count: articleCounts.value.get(major.id) ?? 0
    }))
  )

  function majorName(id: string): string {
    return majors.value.find((major) => major.id === id)?.name ?? ''
  }

  function articlesOf(majorId: string): KnowledgeArticleSummary[] {
    return sortArticles(articles.value.filter((item) => item.majorId === majorId))
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await api.knowledge()
      majors.value = result.majors
      articles.value = result.articles
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      loadError.value = /failed to fetch|networkerror|load failed/i.test(message)
        ? '读取知识库失败，请检查网络后重试'
        : message || '读取知识库失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchArticle(id: string): Promise<KnowledgeArticle> {
    const result = await api.knowledgeArticle(id)
    return result.article
  }

  async function loadArticle(id: string): Promise<void> {
    articleLoading.value = true
    articleError.value = ''
    try {
      const loaded = await fetchArticle(id)
      article.value = loaded
      // 深链打开时列表可能还没加载，顺手把摘要补进本地状态。
      if (!articles.value.some((item) => item.id === loaded.id)) {
        articles.value = sortArticles([...articles.value, toSummary(loaded)])
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      article.value = null
      articleError.value =
        message || '读取知识点失败，请检查网络后重试'
    } finally {
      articleLoading.value = false
    }
  }

  function clearArticle() {
    article.value = null
    articleError.value = ''
  }

  async function addMajor(name: string): Promise<KnowledgeMajor> {
    const result = await api.createKnowledgeMajor(name)
    majors.value = sortMajors([...majors.value, result.major])
    return result.major
  }

  async function renameMajor(id: string, name: string): Promise<void> {
    const result = await api.updateKnowledgeMajor(id, name)
    majors.value = majors.value.map((major) => (major.id === id ? result.major : major))
  }

  async function moveMajor(id: string, offset: -1 | 1): Promise<void> {
    const list = sortedMajors.value
    const index = list.findIndex((major) => major.id === id)
    const target = index + offset
    if (index < 0 || target < 0 || target >= list.length) return
    const ids = list.map((major) => major.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    const result = await api.reorderKnowledgeMajors(ids)
    majors.value = result.majors
  }

  async function removeMajor(id: string): Promise<void> {
    await api.deleteKnowledgeMajor(id)
    majors.value = majors.value.filter((major) => major.id !== id)
  }

  async function createArticle(input: KnowledgeArticleInput): Promise<KnowledgeArticle> {
    const result = await api.createKnowledgeArticle(input)
    articles.value = sortArticles([...articles.value, toSummary(result.article)])
    return result.article
  }

  async function updateArticle(
    id: string,
    input: KnowledgeArticleUpdateInput
  ): Promise<KnowledgeArticle> {
    const result = await api.updateKnowledgeArticle(id, input)
    articles.value = sortArticles(
      articles.value.map((item) => (item.id === id ? toSummary(result.article) : item))
    )
    if (article.value?.id === id) article.value = result.article
    return result.article
  }

  async function removeArticle(id: string): Promise<void> {
    await api.deleteKnowledgeArticle(id)
    articles.value = articles.value.filter((item) => item.id !== id)
    if (article.value?.id === id) article.value = null
  }

  return {
    majors,
    articles,
    loading,
    loadError,
    article,
    articleLoading,
    articleError,
    displayMajors,
    majorName,
    articlesOf,
    load,
    loadArticle,
    fetchArticle,
    clearArticle,
    addMajor,
    renameMajor,
    moveMajor,
    removeMajor,
    createArticle,
    updateArticle,
    removeArticle
  }
}
