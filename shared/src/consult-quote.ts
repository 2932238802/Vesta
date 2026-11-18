// 金句栏：按主题分类的金句，供咨询师通话中快速查找与复制。
// 与收藏栏（consult_collections）完全独立，数据互不相通。

export const CONSULT_QUOTE_MAX_TEXT = 10_000
export const CONSULT_QUOTE_MAX_SOURCE = 200
export const CONSULT_QUOTE_MAX_CATEGORY_NAME = 30

export interface ConsultQuoteCategory {
  id: string
  name: string
  sortOrder: number
  /** 该分类下的金句数（列表接口与分类写接口都会返回）。 */
  count: number
}

export interface ConsultQuote {
  id: string
  categoryId: string
  /** 原稿编号，仅种子条目有；人工新增留空。 */
  no: string
  text: string
  source: string
  pinned: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ConsultQuoteInput {
  categoryId: string
  text: string
  source?: string
  pinned?: boolean
}

export interface ConsultQuoteUpdateInput {
  categoryId?: string
  text?: string
  source?: string
  pinned?: boolean
}

export interface ConsultQuoteCategoryInput {
  name: string
}
