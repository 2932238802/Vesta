import type { ExamType, MinimumType, ScoreLineScope, SchoolProgram } from '../../../../shared/src/score-line'

export interface ParserContext {
  sourceId: string
  sourceName: string
  sourceUrl: string
  exam: ExamType
  province: string
  schoolId?: string
  schoolName?: string
  year?: number
  scopeHint?: ScoreLineScope
  /** 候选链接正则；为空用内置关键词 */
  urlInclude?: string
}

export interface ParsedMetric {
  subjectCode?: string
  subjectName: string
  fullScore?: number | null
  value: number
  isMinimum?: boolean
  minimumType?: MinimumType
  note?: string
}

export interface ParsedBatch {
  scope: ScoreLineScope
  exam: ExamType
  year: number
  province: string
  region?: string
  schoolId?: string
  schoolName?: string
  programId?: string
  category?: string
  track?: string
  title?: string
  sourceName: string
  sourceUrl: string
  publishedAt?: string
  confidence?: number
  metrics: ParsedMetric[]
}

export type ParserFailureCode =
  | 'no_table'
  | 'unsupported_table'
  | 'decode'
  | 'entry_redirect'

export interface ParserResult {
  batches: ParsedBatch[]
  issues: string[]
  /** 实际执行的解析器；委托（如 yz-topic → national-line）时覆盖来源配置。 */
  parserId?: string
  /** HTML 索引页里发现的候选链接，交给抓取器继续抓取。 */
  links?: string[]
  /** 候选链接的可见文字，用于判断列表页和选最新年份。 */
  linkItems?: { url: string; text: string }[]
  /** 页面形状；写进 crawl_documents.shape，排障用。 */
  shape?: { tables: number; rows: number; cols: number; links: number }
  /** 引导页跳转目标；抓取器最多跟 1 跳。 */
  redirect?: string
  /** 机读失败码；crawl_documents.error 会写成 `code: detail`。 */
  failure?: { code: ParserFailureCode; detail: string }
}

export interface ParserInput {
  parserId: string
  content: string | Uint8Array
  contentType: string
  url: string
  context: ParserContext
}

export interface Parser {
  id: string
  parse(input: ParserInput): Promise<ParserResult>
}

export type ProgramRow = SchoolProgram
