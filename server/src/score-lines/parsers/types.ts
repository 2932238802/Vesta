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

export interface ParserResult {
  batches: ParsedBatch[]
  issues: string[]
  /** HTML 索引页里发现的候选链接，交给抓取器继续抓取。 */
  links?: string[]
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
