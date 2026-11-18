// 有效的提问：按主题分类的提问库，供咨询师通话中查找、复制与备注。
// 与金句栏（consult_quotes）、故事集（consult_stories）、收藏栏（consult_collections）完全独立。

export const CONSULT_QUESTION_MAX_TEXT = 2000
export const CONSULT_QUESTION_MAX_NOTE = 2000
export const CONSULT_QUESTION_MAX_CATEGORY_NAME = 30

export interface ConsultQuestionCategory {
  id: string
  name: string
  sortOrder: number
  /** 该分类下的提问数（列表接口与分类写接口都会返回）。 */
  count: number
}

export interface ConsultQuestion {
  id: string
  categoryId: string
  /** 提问正文，复制时只取这一段。 */
  text: string
  /** 咨询师备注，可为空；仅后台可见，不进入复制内容。 */
  note: string
  pinned: boolean
  /** 最近一次置顶的时间（ISO 字符串）；未置顶为空字符串。置顶组按此倒序排列。 */
  pinnedAt: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ConsultQuestionInput {
  categoryId: string
  text: string
  note?: string
  pinned?: boolean
}

export interface ConsultQuestionUpdateInput {
  categoryId?: string
  text?: string
  note?: string
  pinned?: boolean
}

export interface ConsultQuestionCategoryInput {
  name: string
}
