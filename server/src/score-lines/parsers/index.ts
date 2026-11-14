import type { Parser, ParserInput, ParserResult } from './types'
import { htmlTableParser } from './html'
import { jsonParser } from './json'
import { pdfTextParser } from './pdf'
import { xlsxParser } from './xlsx'

const registry = new Map<string, Parser>(
  [htmlTableParser, xlsxParser, pdfTextParser, jsonParser].map((parser) => [parser.id, parser])
)

export function getParser(id: string): Parser | null {
  return registry.get(id) ?? null
}

export async function parseContent(input: ParserInput): Promise<ParserResult> {
  const parser = getParser(input.parserId)
  if (!parser) {
    return { batches: [], issues: [`没有注册解析器：${input.parserId}`] }
  }
  return parser.parse(input)
}

export type { Parser, ParserContext, ParserInput, ParserResult, ParsedBatch, ParsedMetric } from './types'
