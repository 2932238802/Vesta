// 专业知识汇总：按「专业 → 知识点」两级组织知识库，正文为轻量 Markdown。
// 与金句栏、故事集、收藏栏独立；专业存在性与非空删除限制在接口层校验。

export const KNOWLEDGE_MAJOR_NAME_MAX = 30
export const KNOWLEDGE_ARTICLE_TITLE_MAX = 120
export const KNOWLEDGE_ARTICLE_BODY_MAX = 50_000

export interface KnowledgeMajor {
  id: string
  name: string
  sortOrder: number
  /** 该专业下的知识点数（列表接口返回）。 */
  count: number
}

/** 列表摘要不包含正文，正文按篇读取。 */
export interface KnowledgeArticleSummary {
  id: string
  majorId: string
  title: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface KnowledgeArticle extends KnowledgeArticleSummary {
  body: string
}

export interface KnowledgeMajorInput {
  name: string
}

export interface KnowledgeArticleInput {
  majorId: string
  title: string
  body: string
}

export interface KnowledgeArticleUpdateInput {
  majorId?: string
  title?: string
  body?: string
}
