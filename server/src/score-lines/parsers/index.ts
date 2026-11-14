import type { Parser, ParserInput, ParserResult } from './types'
import { htmlTableParser } from './html'
import { htmlCategoryParser } from './category-table'
import { jsonParser } from './json'
import { nationalLineParser } from './national-line'
import { pdfTextParser } from './pdf'
import { xlsxParser } from './xlsx'
import { yzTopicParser } from './yz-topic'

const registry = new Map<string, Parser>(
  [
    htmlTableParser,
    htmlCategoryParser,
    xlsxParser,
    pdfTextParser,
    jsonParser,
    yzTopicParser,
    nationalLineParser
  ].map((parser) => [parser.id, parser])
)

export function getParser(id: string): Parser | null {
  return registry.get(id) ?? null
}

/**
 * 按响应 Content-Type 分派解析器：PDF / Excel / JSON 不再被当 HTML 解。
 * 例外：研招网来源（yz-topic / national-line）的 PDF 走 national-line，需按学科门类拆行。
 */
export function resolveParserId(input: ParserInput): string {
  const type = (input.contentType || '').toLowerCase()
  if (type.includes('pdf') || /\.pdf(?:$|\?)/i.test(input.url)) {
    return input.parserId === 'yz-topic@1' || input.parserId === 'national-line@1'
      ? 'national-line@1'
      : 'pdf-text@1'
  }
  if (/sheet|excel|spreadsheet/.test(type)) return 'xlsx@1'
  if (type.includes('json')) return 'json@1'
  return input.parserId || 'html-table@1'
}

export async function parseContent(input: ParserInput): Promise<ParserResult> {
  const parserId = resolveParserId(input)
  const parser = getParser(parserId)
  if (!parser) {
    return { batches: [], issues: [`没有注册解析器：${parserId}`], parserId }
  }
  const result = await parser.parse({ ...input, parserId })
  return { ...result, parserId: result.parserId ?? parserId }
}

export type { Parser, ParserContext, ParserInput, ParserResult, ParsedBatch, ParsedMetric } from './types'
