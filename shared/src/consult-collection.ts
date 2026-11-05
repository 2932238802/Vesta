// 咨询收藏栏：金句、优秀咨询稿、公众号链接等。
//
// 这里的数据既给咨询师阅读，也给之后的咨询稿生成器当参考资料读取。
// content 保留原文，不做改写；tags 用于人工检索和后续 AI 筛选。

export type ConsultCollectionKind = 'quote' | 'script' | 'link' | 'other'

export const consultCollectionKinds: ConsultCollectionKind[] = [
  'quote',
  'script',
  'link',
  'other'
]

export const consultCollectionKindLabels: Record<ConsultCollectionKind, string> = {
  quote: '金句',
  script: '优秀咨询稿',
  link: '公众号链接',
  other: '其他'
}

export interface ConsultCollectionItem {
  id: string
  kind: ConsultCollectionKind
  title: string
  content: string
  url: string
  source: string
  summary: string
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface ConsultCollectionInput {
  kind?: ConsultCollectionKind
  title?: string
  content?: string
  url?: string
  source?: string
  summary?: string
  tags?: string[]
  pinned?: boolean
}
