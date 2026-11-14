import * as cheerio from 'cheerio'
import { POSTGRAD_TRACKS, normalizeDimension } from '../../../../shared/src/score-line-dimension'
import { decodeHtml, pageShape } from './html-shape'
import { extractPdfText } from './pdf'
import { normalizeCell, parseScore, yearFromText } from './table'
import type { Parser, ParsedBatch, ParsedMetric, ParserContext } from './types'

type Triple = [number, number, number]

interface LineRow {
  track: string
  a: Triple
  b: Triple
}

const TRACK_NAMES = POSTGRAD_TRACKS.map((item) => item.value)
/** 这三类在公告里用「其他学科专业」行表示总体要求，单科体育 / 照顾专业不是主线。 */
const MULTI_ROW_TRACKS = new Set(['教育学', '工学', '管理学'])

function canonicalTrack(value: string): string {
  const normalized = normalizeDimension('track', 'postgrad', value)
  return normalized.matched ? normalized.value : ''
}

function cleanTrack(value: string): string {
  return normalizeCell(value)
    .replace(/\[\d+\]/g, '')
    .replace(/[①-⑳]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function scoreStart(cells: string[]): number {
  for (let index = 1; index < cells.length; index += 1) {
    if (parseScore(cells[index])) return index
  }
  return -1
}

function tripleAt(cells: string[], start: number): Triple | null {
  const values = cells
    .slice(start, start + 3)
    .map((cell) => parseScore(cell)?.value ?? null)
  if (values.some((value) => value === null)) return null
  return [values[0] as number, values[1] as number, values[2] as number]
}

/** 国家线表格 → 14 个学科门类的 A/B 三数；只取「各学科专业 / 其他学科专业」总行。 */
export function nationalRowsFromTable(rows: string[][]): {
  rows: LineRow[]
  issues: string[]
} {
  const issues: string[] = []
  const best = new Map<string, { row: LineRow; priority: number }>()
  let current = ''
  for (const raw of rows) {
    const cells = raw.map((cell) => normalizeCell(cell))
    const start = scoreStart(cells)
    if (start < 1) continue
    let track = current
    let sub = '各学科专业'
    if (start > 1) {
      // 完整行：[学科门类, 一级学科, A 三数, B 三数, …]
      if (cells[0] && !/总分|学科门类|备注/.test(cells[0])) {
        current = cleanTrack(cells[0])
      }
      track = current
      sub = cells[1] ?? ''
    } else {
      // rowspan 续行只有一级学科列；若无一级学科列，首列本身就是学科门类。
      const asTrack = canonicalTrack(cleanTrack(cells[0] ?? ''))
      if (asTrack) {
        current = asTrack
        track = asTrack
      } else {
        sub = cells[0] ?? ''
      }
    }
    const a = tripleAt(cells, start)
    const b = tripleAt(cells, start + 3)
    if (!a || !b) continue
    const priority = /各学科专业/.test(sub) ? 2 : /其他学科专业/.test(sub) ? 1 : 0
    if (!priority) continue
    const canonical = canonicalTrack(track)
    if (!canonical) {
      if (track) issues.push(`学科门类认不出：${track}`)
      continue
    }
    const existing = best.get(canonical)
    if (!existing || priority > existing.priority) {
      best.set(canonical, { row: { track: canonical, a, b }, priority })
    }
  }
  const missing = TRACK_NAMES.filter((name) => !best.has(name))
  if (missing.length) issues.push(`国家线缺学科门类：${missing.join('、')}`)
  return {
    rows: TRACK_NAMES.map((name) => best.get(name)?.row).filter(
      (row): row is LineRow => Boolean(row)
    ),
    issues
  }
}

function metricsOf(triple: Triple): ParsedMetric[] {
  return [
    { subjectCode: 'total', subjectName: '总分', value: triple[0], fullScore: null },
    {
      subjectCode: 'single100',
      subjectName: '单科（满分=100分）',
      value: triple[1],
      fullScore: 100
    },
    {
      subjectCode: 'single150',
      subjectName: '单科（满分>100分）',
      value: triple[2],
      fullScore: null
    }
  ]
}

function toBatches(rows: LineRow[], context: ParserContext, year: number): ParsedBatch[] {
  const sourceName = context.sourceName || '中国研究生招生信息网'
  return rows.flatMap((row) => [
    {
      scope: 'national' as const,
      exam: 'postgrad' as const,
      year,
      province: '全国',
      region: 'A区',
      category: '',
      track: row.track,
      title: `${year} 全国硕士研究生招生考试国家线 ${row.track}`,
      sourceName,
      sourceUrl: context.sourceUrl,
      publishedAt: context.publishedAt ?? '',
      confidence: 0.9,
      metrics: metricsOf(row.a)
    },
    {
      scope: 'national' as const,
      exam: 'postgrad' as const,
      year,
      province: '全国',
      region: 'B区',
      category: '',
      track: row.track,
      title: `${year} 全国硕士研究生招生考试国家线 ${row.track}`,
      sourceName,
      sourceUrl: context.sourceUrl,
      publishedAt: context.publishedAt ?? '',
      confidence: 0.9,
      metrics: metricsOf(row.b)
    }
  ])
}

function tablesOf(html: string): string[][][] {
  const $ = cheerio.load(html)
  return $('table')
    .toArray()
    .map((table) =>
      $(table)
        .find('tr')
        .toArray()
        .map((tr) =>
          $(tr)
            .find('th,td')
            .toArray()
            .map((cell) => $(cell).text().trim())
        )
        .filter((row) => row.some(Boolean))
    )
    .filter((rows) => rows.length > 0)
}

function isNationalLineTable(rows: string[][]): boolean {
  const text = rows
    .slice(0, 2)
    .flat()
    .join(' ')
  return /学科门类/.test(text) && /A类考生/.test(text) && /B类考生/.test(text)
}

export function nationalLinesFromHtml(
  html: string,
  context: ParserContext
): { batches: ParsedBatch[]; issues: string[]; shape: ReturnType<typeof pageShape> } {
  const shape = pageShape(html)
  const table = tablesOf(html).find((rows) => isNationalLineTable(rows))
  if (!table) {
    return { batches: [], issues: ['没有识别到国家线表格'], shape }
  }
  const $ = cheerio.load(html)
  const title = ($('title').first().text() || $('h1').first().text() || '').trim()
  const parsed = nationalRowsFromTable(table)
  const year = yearFromText(`${title} ${context.sourceName}`, context.year)
  return { batches: toBatches(parsed.rows, context, year), issues: parsed.issues, shape }
}

function textTriples(text: string, name: string): { a: Triple; b: Triple } | null {
  const pattern = new RegExp(
    `${name}\\s*\\[\\d{2}\\][^\\d]{0,30}(\\d{1,3})\\s+(\\d{1,3})\\s+(\\d{1,3})\\s+(\\d{1,3})\\s+(\\d{1,3})\\s+(\\d{1,3})`
  )
  const match = pattern.exec(text)
  if (!match) return null
  return {
    a: [Number(match[1]), Number(match[2]), Number(match[3])],
    b: [Number(match[4]), Number(match[5]), Number(match[6])]
  }
}

/** PDF 文本兜底：11 个单行门类按「门类 [code]」取数，3 个多行门类按「其他学科专业」顺序补。 */
export function nationalLinesFromText(
  text: string,
  context: ParserContext
): { batches: ParsedBatch[]; issues: string[] } {
  const normalized = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  const found = new Map<string, Triple[]>()
  for (const name of TRACK_NAMES) {
    if (MULTI_ROW_TRACKS.has(name)) continue
    const triples = textTriples(normalized, name)
    if (triples) found.set(name, [triples.a, triples.b])
  }
  const others = [
    ...normalized.matchAll(
      /其他学科专业\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/g
    )
  ]
  const missingMulti = ['教育学', '工学', '管理学'].filter((name) => !found.has(name))
  missingMulti.forEach((name, index) => {
    const match = others[index]
    if (!match) return
    found.set(name, [
      [Number(match[1]), Number(match[2]), Number(match[3])],
      [Number(match[4]), Number(match[5]), Number(match[6])]
    ])
  })
  const issues = TRACK_NAMES.filter((name) => !found.has(name)).map(
    (name) => `国家线文本缺学科门类：${name}`
  )
  const rows: LineRow[] = TRACK_NAMES.flatMap((name) => {
    const values = found.get(name)
    return values ? [{ track: name, a: values[0], b: values[1] }] : []
  })
  const year = yearFromText(normalized, context.year)
  return { batches: toBatches(rows, context, year), issues }
}

export const nationalLineParser: Parser = {
  id: 'national-line@1',
  async parse({ content, contentType, context }) {
    const type = (contentType || '').toLowerCase()
    if (type.includes('pdf')) {
      let text = ''
      try {
        text = await extractPdfText(content)
      } catch (error) {
        return {
          batches: [],
          issues: [`PDF 解析失败：${(error as Error).message}`],
          failure: { code: 'parse', detail: '国家线 PDF 解析失败' }
        }
      }
      if (!text.trim()) {
        return {
          batches: [],
          issues: ['该 PDF 无文本层（扫描件），需人工导入'],
          failure: { code: 'no_text_layer', detail: '国家线 PDF 无文本层' }
        }
      }
      const parsed = nationalLinesFromText(text, context)
      if (!parsed.batches.length) {
        return {
          batches: [],
          issues: parsed.issues,
          failure: { code: 'unsupported_table', detail: parsed.issues[0] ?? '国家线 PDF 未识别' }
        }
      }
      return { batches: parsed.batches, issues: parsed.issues }
    }
    const html = decodeHtml(content, contentType)
    const parsed = nationalLinesFromHtml(html, context)
    if (!parsed.batches.length) {
      return {
        batches: [],
        issues: parsed.issues,
        shape: parsed.shape,
        failure: {
          code: 'unsupported_table',
          detail: parsed.issues[0] ?? '没有识别到国家线表格'
        }
      }
    }
    return { batches: parsed.batches, issues: parsed.issues, shape: parsed.shape }
  }
}
