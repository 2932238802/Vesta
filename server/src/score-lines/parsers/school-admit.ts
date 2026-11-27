/**
 * 校级专升本录取表解析器（首批吉林两所接收本科院校）。
 *
 * 识别两类官方表头：
 * - 长春工程学院：专业代号 | 专业名称 | 学制 | 计划数 | 录取数 | 最高分 | 最低分
 * - 长春师范大学：录取专业 | 录取人数 | 投档成绩最高分 | 投档成绩最低分
 *
 * 每个专业输出一条 `scope='program'` 批次：
 * - 指标只放最低分（subject_code=total、is_minimum=1、minimum_type=admit）；
 * - 最高分 / 录取数 / 计划数写指标 note，不混成普通指标；
 * - 学制写 category（两年制 / 三年制），并附 programName / programCode 等专业信息，
 *   由抓取器 upsert `school_programs` 后回填 programId。
 *
 * 表头认不出时返回 `unsupported_table`，不猜分数、不写伪数据。
 */

import * as cheerio from 'cheerio'
import type { ParsedBatch, Parser } from './types'
import { decodeHtml, pageShape } from './html-shape'
import { normalizeCell, parseScore, yearFromText } from './table'

interface ColumnMap {
  majorCode: number
  majorName: number
  degreeType: number
  planCount: number
  admitCount: number
  maxScore: number
  minScore: number
}

function findColumn(cells: string[], include: RegExp[], exclude: RegExp[] = []): number {
  return cells.findIndex((cell) => {
    if (!cell) return false
    if (exclude.some((pattern) => pattern.test(cell))) return false
    return include.some((pattern) => pattern.test(cell))
  })
}

/** 认表头；两类官方表头都要命中，且至少带「最高分 / 录取数」中的一个区分列。 */
function headerMap(row: string[]): ColumnMap | null {
  const cells = row.map((cell) => normalizeCell(cell))
  const majorName = findColumn(
    cells,
    [/专业名称/, /录取专业/, /^专业$/],
    [/代号/, /代码/, /编号/]
  )
  const minScore = findColumn(cells, [/最低/])
  if (majorName < 0 || minScore < 0) return null
  const maxScore = findColumn(cells, [/最高/])
  const admitCount = findColumn(cells, [/录取数/, /录取人数/, /人数/])
  if (maxScore < 0 && admitCount < 0) return null
  return {
    majorCode: findColumn(cells, [/专业代号/, /专业代码/, /专业编号/]),
    majorName,
    degreeType: findColumn(cells, [/学制/]),
    planCount: findColumn(cells, [/计划数/, /计划人数/]),
    admitCount,
    maxScore,
    minScore
  }
}

/** 学制归一：两年 / 二年 / 2年 / 两年制 → 两年制；三年 / 3年 / 三年制 → 三年制；其它原样保留。 */
export function normalizeDegreeType(value: string): string {
  const text = normalizeCell(value).replace(/\s+/g, '')
  if (!text) return ''
  if (/^(两|二)年(制)?$/.test(text) || /^2年(制)?$/.test(text)) return '两年制'
  if (/^三年(制)?$/.test(text) || /^3年(制)?$/.test(text)) return '三年制'
  return text
}

/** 专业名末尾的学制后缀：汉语言文学（二年制）、计算机(3年)。 */
const DEGREE_SUFFIX = /[（(]\s*((?:两|二|三|2|3)年(?:制)?)\s*[)）]\s*$/

/** 汇总行（总计 / 合计 / 共 N 个专业）不是专业，不能生成 program / batch。 */
function isSummaryRow(rawName: string, row: string[]): boolean {
  if (/(总计|合计|小计|累计)/.test(rawName)) return true
  if (/^共\s*\d+\s*个专业/.test(rawName)) return true
  const joined = row.join(' ')
  return /共\s*\d+\s*个专业|(总计|合计|小计|累计)/.test(joined)
}

/** 人数列取第一个整数；空 / 非数字返回 null，不写 0。 */
function countOf(value: string): number | null {
  const match = /(\d+)/.exec(normalizeCell(value))
  if (!match) return null
  const count = Number(match[1])
  return Number.isFinite(count) ? count : null
}

function cellAt(row: string[], index: number): string {
  return index >= 0 ? normalizeCell(row[index] ?? '') : ''
}

export const schoolAdmitParser: Parser = {
  id: 'school-admit@1',
  async parse({ content, url, context, contentType }) {
    const html = decodeHtml(content, contentType)
    const $ = cheerio.load(html)
    const title = ($('title').first().text() || $('h1').first().text() || '').trim()
    const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 4000)
    const year = yearFromText(`${title} ${bodyText}`, context.year)
    const shape = pageShape(html)
    const issues: string[] = []
    const batches: ParsedBatch[] = []
    let tableCount = 0
    let parsedTable = false

    $('table').each((_tableIndex, table) => {
      const rows: string[][] = []
      $(table)
        .find('tr')
        .each((_rowIndex, tr) => {
          const cells: string[] = []
          $(tr)
            .find('th,td')
            .each((_cellIndex, cell) => {
              cells.push(normalizeCell($(cell).text()))
            })
          if (cells.length) rows.push(cells)
        })
      if (rows.length === 0) return
      tableCount += 1

      let headerIndex = -1
      let map: ColumnMap | null = null
      for (let index = 0; index < Math.min(rows.length, 5); index += 1) {
        const found = headerMap(rows[index])
        if (found) {
          headerIndex = index
          map = found
          break
        }
      }
      if (!map) return
      parsedTable = true

      for (const row of rows.slice(headerIndex + 1)) {
        const rawName = cellAt(row, map.majorName)
        if (!rawName || /专业名称|录取专业/.test(rawName)) continue
        if (isSummaryRow(rawName, row)) continue
        const suffix = DEGREE_SUFFIX.exec(rawName)
        const majorName = rawName.replace(DEGREE_SUFFIX, '').trim() || rawName
        const headerDegree = map.degreeType >= 0 ? normalizeDegreeType(cellAt(row, map.degreeType)) : ''
        const suffixDegree = suffix ? normalizeDegreeType(suffix[1]) : ''
        const degreeType = headerDegree || suffixDegree
        const minimum = parseScore(cellAt(row, map.minScore))
        if (!minimum) {
          issues.push(`未读到最低分：${rawName}`)
          continue
        }
        const maximum = map.maxScore >= 0 ? parseScore(cellAt(row, map.maxScore)) : null
        const planCount = map.planCount >= 0 ? countOf(cellAt(row, map.planCount)) : null
        const admitCount = map.admitCount >= 0 ? countOf(cellAt(row, map.admitCount)) : null
        const noteParts: string[] = []
        if (planCount !== null) noteParts.push(`计划 ${planCount}`)
        if (admitCount !== null) noteParts.push(`录取 ${admitCount}`)
        if (maximum) noteParts.push(`最高 ${maximum.value}`)

        batches.push({
          scope: 'program',
          exam: 'upgrade',
          year,
          province: '吉林',
          region: '',
          schoolId: context.schoolId ?? '',
          schoolName: context.schoolName ?? '',
          programId: '',
          category: degreeType,
          track: '',
          title: `${year} ${context.sourceName}`,
          sourceName: context.sourceName,
          sourceUrl: context.sourceUrl,
          publishedAt: context.publishedAt ?? '',
          confidence: 0.9,
          programName: majorName,
          programCode: cellAt(row, map.majorCode),
          degreeType,
          planCount,
          admitCount,
          maxScore: maximum ? maximum.value : null,
          metrics: [
            {
              subjectCode: 'total',
              subjectName: '总分',
              fullScore: null,
              value: minimum.value,
              isMinimum: true,
              minimumType: 'admit',
              note: noteParts.join('；')
            }
          ]
        })
      }
    })

    if (batches.length > 0) return { batches, issues, shape }
    if (tableCount === 0) {
      const detail = `${title || url}：没有识别到录取分数表`
      return {
        batches: [],
        issues: issues.length ? issues : [detail],
        failure: { code: 'no_table', detail },
        shape
      }
    }
    if (!parsedTable) {
      const detail = `${title || url}：没有可识别的专业 / 最低分表头`
      return {
        batches: [],
        issues: [detail, ...issues.slice(0, 5)],
        failure: { code: 'unsupported_table', detail },
        shape
      }
    }
    const detail = `${title || url}：表头已识别但没有可写库的专业行`
    return {
      batches: [],
      issues: issues.length ? issues : [detail],
      failure: { code: 'parse', detail },
      shape
    }
  }
}
