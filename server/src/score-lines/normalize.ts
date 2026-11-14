import type { NormalizedBatch, School } from '../../../shared/src/score-line'
import {
  normalizeImportBatch,
  resolveSubject,
  validateImportPayload
} from '../../../shared/src/score-line'
import { normalizeProvince } from '../../../shared/src/score-line-region'
import { db } from '../db/connection'
import type { ParsedBatch, ParserContext } from './parsers/types'

interface SchoolRow {
  id: string
  name: string
  province: string
  city: string
}

function schoolKey(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[（）()【】[\]]/g, '')
    .replace(/（.*?）|\(.*?\)/g, '')
}

/** 校名精确 → 别名 → 去括号 / 空格后再精确；不猜近似校名。 */
export function matchSchoolName(name: string): School | null {
  const raw = String(name ?? '').trim()
  if (!raw) return null
  const exact = db.prepare('SELECT * FROM schools WHERE name = ?').get(raw) as SchoolRow | undefined
  if (exact) return exact as School
  const alias = db
    .prepare(
      'SELECT s.* FROM school_aliases a JOIN schools s ON s.id = a.school_id WHERE a.alias = ?'
    )
    .get(raw) as SchoolRow | undefined
  if (alias) return alias as School
  const key = schoolKey(raw)
  const rows = db.prepare('SELECT * FROM schools').all() as unknown as SchoolRow[]
  const matched = rows.find((row) => schoolKey(row.name) === key)
  return (matched as School | undefined) ?? null
}

/** 从标题里认学硕 / 专硕 / 普通类 / 建档立卡，避免同一唯一键互相覆盖。 */
export function inferCategory(title: string): string {
  const text = String(title ?? '')
  for (const value of ['学硕', '专硕', '普通类', '建档立卡', '退役士兵', '免试']) {
    if (text.includes(value)) return value
  }
  return ''
}

/** 从标题里认学科门类 / 科类；认不出留空。 */
export function inferTrack(title: string): string {
  const text = String(title ?? '')
  const tracks = [
    '哲学',
    '经济学',
    '法学',
    '教育学',
    '文学',
    '历史学',
    '理学',
    '工学',
    '农学',
    '医学',
    '军事学',
    '管理学',
    '艺术学',
    '交叉学科',
    '文史',
    '理工',
    '经管',
    '艺术',
    '医药'
  ]
  return tracks.find((track) => text.includes(track)) ?? ''
}

/** 旧数据里认不出的科目名给一个稳定 code，避免每次迁移都变。 */
export function legacySubjectCode(label: string): string {
  let hash = 0
  for (const char of String(label ?? '')) hash = (hash * 31 + char.charCodeAt(0)) % 0x7fffffff
  return `legacy_${hash.toString(36)}`
}

export interface NormalizedParsedBatch {
  batch: NormalizedBatch | null
  issues: string[]
}

/**
 * 抓取/解析结果 → 可写库批次。学校名匹配不中、科目认不出、分值越界都只记 issue，
 * 不写 0、不猜满分；有 issue 的批次仍可保存为 pending，交给复核页处理。
 */
export function normalizeParsedBatch(
  raw: ParsedBatch,
  context: ParserContext
): NormalizedParsedBatch {
  const issues: string[] = []
  let schoolId = raw.schoolId ?? context.schoolId ?? ''
  const schoolName = raw.schoolName ?? context.schoolName ?? ''
  if (!schoolId && schoolName) {
    const school = matchSchoolName(schoolName)
    if (school) schoolId = school.id
    else issues.push(`院校未收录：${schoolName}`)
  }
  if ((raw.scope === 'school' || raw.scope === 'program') && !schoolId) {
    issues.push('院校线 / 专业线缺少可匹配的院校，未写库')
    return { batch: null, issues }
  }

  const province =
    raw.scope === 'national' || raw.province === '全国'
      ? raw.province === '全国'
        ? '全国'
        : normalizeProvince(context.province)
      : normalizeProvince(raw.province || context.province)
  const title = raw.title || `${raw.year} ${context.sourceName}`
  const metrics = raw.metrics
    .map((metric) => {
      const subject = resolveSubject(metric.subjectCode) ?? resolveSubject(metric.subjectName)
      if (!subject) {
        issues.push(`科目认不出：${metric.subjectName}`)
        return null
      }
      return {
        subjectCode: subject.code,
        subjectName: subject.name,
        fullScore: metric.fullScore ?? null,
        value: metric.value,
        isMinimum: metric.isMinimum === true,
        minimumType: metric.minimumType ?? (metric.isMinimum ? 'other' : ''),
        note: metric.note ?? ''
      }
    })
    .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric))

  if (metrics.length === 0) {
    issues.push('没有可写库的科目分数')
    return { batch: null, issues }
  }

  const input = {
    scope: raw.scope,
    exam: raw.exam,
    year: raw.year,
    province: province === '全国' ? '' : province,
    region: raw.region ?? '',
    schoolId,
    programId: raw.programId ?? '',
    category: raw.category || inferCategory(title),
    track: raw.track || inferTrack(title),
    title,
    sourceName: raw.sourceName || context.sourceName,
    sourceUrl: raw.sourceUrl || context.sourceUrl,
    publishedAt: raw.publishedAt ?? '',
    confidence: raw.confidence ?? 0.7,
    note: issues.slice(0, 5).join('；'),
    metrics
  }
  const errors = validateImportPayload({ batches: [input] })
  if (errors.length) {
    return { batch: null, issues: [...issues, ...errors] }
  }
  return { batch: normalizeImportBatch(input), issues }
}

export function emptyContext(overrides: Partial<ParserContext> = {}): ParserContext {
  return {
    sourceId: '',
    sourceName: '',
    sourceUrl: '',
    exam: 'upgrade',
    province: '',
    ...overrides
  }
}
