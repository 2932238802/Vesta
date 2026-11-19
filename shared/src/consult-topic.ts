// 大学常识：咨询组内的话题式知识页，一个话题一篇 Markdown 正文。
// 与金句栏、故事集、有效的提问、收藏栏完全独立；扁平列表，无分类、无种子、无迁移。

export const CONSULT_TOPIC_TITLE_MAX = 120
export const CONSULT_TOPIC_BODY_MAX = 50_000

/** 列表摘要不包含正文，正文按篇读取。 */
export interface ConsultTopicSummary {
  id: string
  title: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ConsultTopic extends ConsultTopicSummary {
  body: string
}

export interface ConsultTopicInput {
  title: string
  body: string
}

export interface ConsultTopicUpdateInput {
  title?: string
  body?: string
}
