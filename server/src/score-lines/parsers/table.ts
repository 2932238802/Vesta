import type { MinimumType, ScoreLineScope } from '../../../../shared/src/score-line'
import { resolveSubject, subjectDefinitions } from '../../../../shared/src/score-line'
import { normalizeProvince, provinceRegion } from '../../../../shared/src/score-line-region'
import type { ParsedBatch, ParsedMetric, ParserContext } from './types'

/** 全角数字 / 中文标点归一，便于从公告文本里读分数。 */
export function normalizeCell(value: unknown): string {
  return String(value ?? '')
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[，,]/g, '')
    .replace(/ /g, ' ')
    .trim()
}

export interface ScoreCell {
  value: number
  fullScore: number | null
}

/** 「320」「320/500」「320 分」「320分/500」→ 数值 + 可选满分。 */
export function parseScore(value: unknown): ScoreCell | null {
  const text = normalizeCell(value).replace(/\s+/g, '')
  if (!text) return null
  const pair = /^(-?\d+(?:\.\d+)?)\s*(?:\/|／)\s*(\d+(?:\.\d+)?)$/.exec(text)
  if (pair) {
    return { value: Number(pair[1]), fullScore: Number(pair[2]) }
  }
  const single = /^(-?\d+(?:\.\d+)?)/.exec(text)
  if (!single) return null
  return { value: Number(single[1]), fullScore: null }
}

function minimumTypeOf(text: string): MinimumType {
  if (/录取/.test(text)) return 'admit'
  if (/复试/.test(text)) return 'retest'
  if (/投档/.test(text)) return 'transfer'
  if (/最低/.test(text)) return 'other'
  return ''
}

interface ColumnMap {
  subject: number
  value: number
  full: number
  minimum: number
  note: number
}

function headerMap(row: string[]): ColumnMap | null {
  const normalized = row.map((cell) => normalizeCell(cell))
  const subject = normalized.findIndex((cell) => /科目|名称|项目|专业/.test(cell))
  if (subject < 0) return null
  const value = normalized.findIndex(
    (cell, index) => index !== subject && /分数|成绩|线|分值|要求/.test(cell) && !/满分|总分/.test(cell)
  )
  const full = normalized.findIndex((cell) => /满分/.test(cell))
  const minimum = normalized.findIndex((cell) => /最低|录取|复试|投档/.test(cell))
  const note = normalized.findIndex((cell) => /备注|说明/.test(cell))
  return {
    subject,
    value: value >= 0 ? value : subject + 1,
    full,
    minimum,
    note
  }
}

function cell(row: string[], index: number): string {
  return index >= 0 ? normalizeCell(row[index]) : ''
}

/** 把任意「表格行」尽量读成科目分数；认不出的行跳过，不编造 0。 */
export function rowsToMetrics(rows: unknown[][]): { metrics: ParsedMetric[]; issues: string[] } {
  const table = rows
    .map((row) => (Array.isArray(row) ? row.map((cellValue) => normalizeCell(cellValue)) : []))
    .filter((row) => row.some(Boolean))
  const metrics: ParsedMetric[] = []
  const issues: string[] = []
  const seen = new Set<string>()

  const push = (metric: ParsedMetric) => {
    const subject = resolveSubject(metric.subjectCode) ?? resolveSubject(metric.subjectName)
    if (!subject) {
      issues.push(`未识别的科目：${metric.subjectName}`)
      return
    }
    const isMinimum = metric.isMinimum === true
    const minimumType = isMinimum ? metric.minimumType ?? 'other' : ''
    const key = `${subject.code}|${isMinimum ? 1 : 0}|${minimumType}`
    if (seen.has(key)) return
    seen.add(key)
    metrics.push({
      ...metric,
      subjectCode: subject.code,
      subjectName: subject.name,
      isMinimum,
      minimumType
    })
  }

  let headerIndex = -1
  let map: ColumnMap | null = null
  for (let index = 0; index < Math.min(table.length, 5); index += 1) {
    const found = headerMap(table[index])
    if (found) {
      headerIndex = index
      map = found
      break
    }
  }

  if (map) {
    for (const row of table.slice(headerIndex + 1)) {
      const subjectText = cell(row, map.subject)
      if (!subjectText || !resolveSubject(subjectText)) continue
      const score = parseScore(cell(row, map.value)) ?? parseScore(cell(row, map.value + 1))
      if (!score) continue
      const full = map.full >= 0 ? parseScore(cell(row, map.full)) : null
      const marker = `${cell(row, map.minimum)} ${row.join(' ')}`
      const minimumType = minimumTypeOf(marker)
      push({
        subjectName: subjectText,
        value: score.value,
        fullScore: full?.value ?? score.fullScore,
        isMinimum: minimumType !== '',
        minimumType,
        note: cell(row, map.note)
      })
    }
  }

  if (metrics.length === 0) {
    // 没识别到表头时退化为「一行里第一个认识的科目 + 第一个数字」。
    for (const row of table) {
      const subjectIndex = row.findIndex((value) => Boolean(resolveSubject(value)))
      if (subjectIndex < 0) continue
      let score: ScoreCell | null = null
      for (let index = subjectIndex + 1; index < row.length; index += 1) {
        score = parseScore(row[index])
        if (score) break
      }
      if (!score) continue
      const marker = row.join(' ')
      const minimumType = minimumTypeOf(marker)
      push({
        subjectName: row[subjectIndex],
        value: score.value,
        fullScore: score.fullScore,
        isMinimum: minimumType !== '',
        minimumType
      })
    }
  }

  if (metrics.length === 0) issues.push('没有识别到科目分数')
  return { metrics, issues }
}

export function scopeForContext(context: ParserContext): ScoreLineScope {
  if (context.scopeHint) return context.scopeHint
  if (context.exam === 'postgrad' && (context.province === '全国' || context.province === '')) {
    return 'national'
  }
  if (context.schoolId) return 'school'
  return 'provincial'
}

export function yearFromText(text: string, fallback?: number): number {
  const matches = [...String(text ?? '').matchAll(/20\d{2}/g)].map((match) => Number(match[0]))
  const valid = matches.filter((year) => year >= 2000 && year <= 2100)
  if (valid.length) return valid[0]
  if (fallback && fallback >= 2000 && fallback <= 2100) return fallback
  return new Date().getFullYear()
}

export function provinceFromText(text: string, fallback?: string): string {
  const normalized = normalizeProvince(fallback ?? '')
  if (normalized) return normalized
  for (const province of [
    '北京',
    '天津',
    '河北',
    '山西',
    '内蒙古',
    '辽宁',
    '吉林',
    '黑龙江',
    '上海',
    '江苏',
    '浙江',
    '安徽',
    '福建',
    '江西',
    '山东',
    '河南',
    '湖北',
    '湖南',
    '广东',
    '广西',
    '海南',
    '重庆',
    '四川',
    '贵州',
    '云南',
    '西藏',
    '陕西',
    '甘肃',
    '青海',
    '宁夏',
    '新疆'
  ]) {
    if (String(text ?? '').includes(province)) return province
  }
  return ''
}

export function batchFromMetrics(
  metrics: ParsedMetric[],
  context: ParserContext,
  extras: { title?: string; year?: number; publishedAt?: string } = {}
): ParsedBatch {
  const year = extras.year ?? yearFromText(`${extras.title ?? ''} ${context.sourceName}`, context.year)
  const province =
    context.exam === 'postgrad' && (context.province === '全国' || context.province === '')
      ? '全国'
      : provinceFromText(context.province, context.province)
  return {
    scope: scopeForContext(context),
    exam: context.exam,
    year,
    province,
    region: context.exam === 'postgrad' && province !== '全国' ? provinceRegion(province) : '',
    schoolId: context.schoolId ?? '',
    schoolName: context.schoolName ?? '',
    title: extras.title ?? `${year} ${context.sourceName}`,
    sourceName: context.sourceName,
    sourceUrl: context.sourceUrl,
    publishedAt: extras.publishedAt ?? '',
    confidence: 0.7,
    metrics
  }
}

/** PDF / 纯文本公告：逐行找科目名，取科目名之后的第一个数字。 */
export function metricsFromText(text: string): ParsedMetric[] {
  const metrics: ParsedMetric[] = []
  const seen = new Set<string>()
  const lines = String(text ?? '')
    .replace(/\r/g, '')
    .split(/[\n。；;]+/)
  for (const line of lines) {
    let cursor = 0
    while (cursor < line.length) {
      let best: { alias: string; index: number; code: string; name: string } | null = null
      for (const def of subjectDefinitions) {
        for (const alias of [def.name, ...def.aliases]) {
          const index = line.indexOf(alias, cursor)
          if (index < 0) continue
          if (
            !best ||
            index < best.index ||
            (index === best.index && alias.length > best.alias.length)
          ) {
            best = { alias, index, code: def.code, name: def.name }
          }
        }
      }
      if (!best) break
      const score = parseScore(line.slice(best.index + best.alias.length))
      cursor = best.index + best.alias.length
      if (!score) continue
      const minimumType = minimumTypeOf(line.slice(best.index))
      const key = `${best.code}|${minimumType ? 1 : 0}|${minimumType || ''}`
      if (seen.has(key)) continue
      seen.add(key)
      metrics.push({
        subjectCode: best.code,
        subjectName: best.name,
        value: score.value,
        fullScore: score.fullScore,
        isMinimum: minimumType !== '',
        minimumType
      })
    }
  }
  return metrics
}
