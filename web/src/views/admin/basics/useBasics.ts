import { computed, ref } from 'vue'
import { api } from '@/api'
import type {
  ConsultTopic,
  ConsultTopicInput,
  ConsultTopicSummary,
  ConsultTopicUpdateInput
} from '@/api'

function sortTopics(items: ConsultTopicSummary[]): ConsultTopicSummary[] {
  return [...items].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id)
  )
}

function toSummary(topic: ConsultTopic): ConsultTopicSummary {
  const { body: _body, ...summary } = topic
  return summary
}

/** 大学常识的本地状态：一次读取话题摘要，正文按篇读取；排序以服务端 sortOrder 为准。 */
export function useBasics() {
  const topics = ref<ConsultTopicSummary[]>([])
  const loading = ref(true)
  const loadError = ref('')
  const topic = ref<ConsultTopic | null>(null)
  const topicLoading = ref(false)
  const topicError = ref('')
  const query = ref('')

  const filteredTopics = computed(() => {
    const keyword = query.value.trim().toLowerCase()
    if (!keyword) return topics.value
    return topics.value.filter((item) => item.title.toLowerCase().includes(keyword))
  })

  async function load(): Promise<void> {
    loading.value = true
    loadError.value = ''
    try {
      const result = await api.consultTopics()
      topics.value = sortTopics(result.topics)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      loadError.value = /failed to fetch|networkerror|load failed/i.test(message)
        ? '读取大学常识失败，请检查网络后重试'
        : message || '读取大学常识失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchTopic(id: string): Promise<ConsultTopic> {
    const result = await api.consultTopic(id)
    return result.topic
  }

  async function loadTopic(id: string): Promise<void> {
    topicLoading.value = true
    topicError.value = ''
    try {
      const loaded = await fetchTopic(id)
      topic.value = loaded
      // 深链打开时列表可能还没加载，顺手把摘要补进本地状态。
      if (!topics.value.some((item) => item.id === loaded.id)) {
        topics.value = sortTopics([...topics.value, toSummary(loaded)])
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      topic.value = null
      topicError.value = message || '读取话题失败，请检查网络后重试'
    } finally {
      topicLoading.value = false
    }
  }

  function clearTopic(): void {
    topic.value = null
    topicError.value = ''
  }

  async function createTopic(input: ConsultTopicInput): Promise<ConsultTopic> {
    const result = await api.createConsultTopic(input)
    topics.value = sortTopics([...topics.value, toSummary(result.topic)])
    return result.topic
  }

  async function updateTopic(
    id: string,
    input: ConsultTopicUpdateInput
  ): Promise<ConsultTopic> {
    const result = await api.updateConsultTopic(id, input)
    topics.value = sortTopics(
      topics.value.map((item) => (item.id === id ? toSummary(result.topic) : item))
    )
    if (topic.value?.id === id) topic.value = result.topic
    return result.topic
  }

  async function removeTopic(id: string): Promise<void> {
    await api.deleteConsultTopic(id)
    topics.value = topics.value.filter((item) => item.id !== id)
    if (topic.value?.id === id) topic.value = null
  }

  /** 拖动松手后先按新顺序更新本地列表，保存失败时回滚到拖动前顺序。 */
  async function reorderTopics(ids: string[]): Promise<void> {
    const snapshot = [...topics.value]
    const byId = new Map(topics.value.map((item) => [item.id, item]))
    if (ids.length !== topics.value.length || ids.some((id) => !byId.has(id))) return
    topics.value = ids.map((id) => byId.get(id)!)
    try {
      const result = await api.reorderConsultTopics(ids)
      topics.value = sortTopics(result.topics)
    } catch (error) {
      topics.value = snapshot
      throw error
    }
  }

  return {
    topics,
    loading,
    loadError,
    topic,
    topicLoading,
    topicError,
    query,
    filteredTopics,
    load,
    fetchTopic,
    loadTopic,
    clearTopic,
    createTopic,
    updateTopic,
    removeTopic,
    reorderTopics
  }
}
