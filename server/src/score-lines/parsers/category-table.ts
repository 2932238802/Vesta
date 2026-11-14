import * as cheerio from 'cheerio'
import type { Parser, ParsedBatch, ParserContext } from './types'
import { batchFromMetrics, normalizeCell, parseScore } from './table'
import { candidateLinks, decodeHtml, extractRedirect, pageShape } from './html-shape'

/**
 * 专升本「招考类别 × 分数线」表：浙江等省用转置宽表，其它省可能用正置列表。
 * 只认常见类别词；认不出就返回空，交给上层标 unsupported_table。
 */
const CATEGORY_ALIASES: Record<string, string> = {
  文史: '文史',
  文史类: '文史',
  法学: '法学',
  法学类: '法学',
  教育: '教育',
  教育学: '教育',
  教育类: '教育',
  艺术: '艺术',
  艺术类: '艺术',
  理工: '理工',
  理工类: '理工',
  经管: '经管',
  经管类: '经管',
  经济管理: '经管',
  经济管理类: '经管',
  农学: '农学',
  农学类: '农学',
  医学: '医学',
  医学类: '医学',
  体育: '体育',
  体育类: '体育',
  外语: '外语',
  外语类: '外语',
  中医: '中医',
  中医类: '中医',
  护理: '护理',
  护理类: '护理',
  药学: '药学',
  药学类: '药学'
}

function categoryName(value: unknown): string {
  const text = normalizeCell(value)
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
  if (!text || text.length > 8) return ''
  return CATEGORY_ALIASES[text] ?? CATEGORY_ALIASES[text.replace(/类$/, '')] ?? ''
}

const SCORE_LABEL = /分数线|控制线|最低控制|录取线/

function scoreOf(value: unknown): number | null {
  return parseScore(value)?.value ?? null
}

interface CategoryRow {
  name: string
  index: number
}

function categoryCells(row: string[]): CategoryRow[] {
  const cells: CategoryRow[] = []
  row.forEach((cell, index) => {
    const name = categoryName(cell)
    if (name) cells.push({ name, index })
  })
  return cells
}

/** 转置表：上一行是类别，下一行首列是「分数线」，其余格是同一列的分数。 */
function transposed(
  rows: string[][]
): { name: string; value: number }[] {
  for (let index = 0; index < rows.length - 1; index += 1) {
    const categories = categoryCells(rows[index])
    if (categories.length < 3) continue
    const scoreRow = rows.slice(index + 1).find((row) => row.some(Boolean))
    if (!scoreRow || !SCORE_LABEL.test(normalizeCell(scoreRow[0]))) continue
    const aligned = categories.map((category) => ({
      name: category.name,
      value: scoreOf(scoreRow[category.index])
    }))
    const shifted = categories.map((category) => ({
      name: category.name,
      value: scoreOf(scoreRow[category.index + 1])
    }))
    const values = aligned.every((item) => item.value !== null)
      ? aligned
      : shifted.every((item) => item.value !== null)
        ? shifted
        : []
    if (values.length) {
      return values.map((item) => ({ name: item.name, value: item.value as number }))
    }
  }
  return []
}

/** 正置表：一列连续 ≥3 个类别，另一列是分数。 */
function upright(rows: string[][]): { name: string; value: number }[] {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  for (let nameColumn = 0; nameColumn < width; nameColumn += 1) {
    const matched = rows
      .map((row) => ({ name: categoryName(row[nameColumn]), row }))
      .filter((item) => item.name)
    if (matched.length < 3) continue
    for (let scoreColumn = 0; scoreColumn < width; scoreColumn += 1) {
      if (scoreColumn === nameColumn) continue
      const values = matched.map((item) => ({
        name: item.name,
        value: scoreOf(item.row[scoreColumn])
      }))
      if (values.every((item) => item.value !== null)) {
        return values.map((item) => ({ name: item.name, value: item.value as number }))
      }
    }
  }
  return []
}

export function categoryBatchesFromRows(
  rows: unknown[][],
  context: ParserContext,
  title = ''
): ParsedBatch[] {
  const table = rows
    .map((row) => (Array.isArray(row) ? row.map((cell) => normalizeCell(cell)) : []))
    .filter((row) => row.some(Boolean))
  const values = transposed(table)
  const found = values.length ? values : upright(table)
  if (!found.length) return []
  return found.map((item) => {
    const batch = batchFromMetrics(
      [{ subjectCode: 'total', subjectName: '总分', value: item.value, fullScore: null }],
      context,
      { title: title ? `${title} ${item.name}` : undefined }
    )
    return {
      ...batch,
      track: item.name,
      category: '',
      title: title ? `${title} ${item.name}` : `${batch.year} ${context.sourceName} ${item.name}`,
      confidence: 0.9
    }
  })
}

function tablesOf(html: string): string[][][] {
  const $ = cheerio.load(html)
  const tables: string[][][] = []
  $('table').each((_index, table) => {
    const rows: string[][] = []
    $(table)
      .find('tr')
      .each((_rowIndex, tr) => {
        const cells: string[] = []
        $(tr)
          .find('th,td')
          .each((_cellIndex, cell) => {
            cells.push($(cell).text().trim())
          })
        if (cells.length) rows.push(cells)
      })
    if (rows.length) tables.push(rows)
  })
  return tables
}

export function categoryBatchesFromHtml(
  html: string,
  context: ParserContext
): ParsedBatch[] {
  const $ = cheerio.load(html)
  const title = ($('title').first().text() || $('h1').first().text() || '').trim()
  return tablesOf(html).flatMap((rows) => categoryBatchesFromRows(rows, context, title))
}

/** 显式配置 parser_id = html-category@1 时只跑类别表。 */
export const htmlCategoryParser: Parser = {
  id: 'html-category@1',
  async parse({ content, context, contentType, url }) {
    const html = decodeHtml(content, contentType)
    const shape = pageShape(html)
    const items = candidateLinks(html, url, context.urlInclude)
    const base = { links: items.map((item) => item.url), linkItems: items, shape }
    const batches = categoryBatchesFromHtml(html, context)
    if (!batches.length) {
      const detail = '没有识别到类别分数线表格'
      return {
        batches: [],
        issues: [detail],
        failure: { code: shape.tables === 0 ? 'no_table' : 'unsupported_table', detail },
        redirect:
          shape.tables === 0 && shape.links === 0 ? extractRedirect(html, url) : '',
        ...base
      }
    }
    return { batches, issues: [], ...base }
  }
}
