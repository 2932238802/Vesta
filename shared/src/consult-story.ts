// 故事集：按主题分类的长故事，供咨询师通话中查找与复制。
// 与金句栏（consult_quotes）、收藏栏（consult_collections）完全独立，数据互不相通。

export const CONSULT_STORY_MAX_TITLE = 120
export const CONSULT_STORY_MAX_TEXT = 20_000
export const CONSULT_STORY_MAX_SOURCE = 200
export const CONSULT_STORY_MAX_CATEGORY_NAME = 30

export interface ConsultStoryCategory {
  id: string
  name: string
  sortOrder: number
  /** 该分类下的故事数（列表接口与分类写接口都会返回）。 */
  count: number
}

export interface ConsultStory {
  id: string
  categoryId: string
  title: string
  text: string
  source: string
  pinned: boolean
  /** 最近一次置顶的时间（ISO 字符串）；未置顶为空字符串。置顶组按此倒序排列。 */
  pinnedAt: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ConsultStoryInput {
  categoryId: string
  title: string
  text: string
  source?: string
  pinned?: boolean
}

export interface ConsultStoryUpdateInput {
  categoryId?: string
  title?: string
  text?: string
  source?: string
  pinned?: boolean
}

export interface ConsultStoryCategoryInput {
  name: string
}
