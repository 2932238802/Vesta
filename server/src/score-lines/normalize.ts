import type { ExamType, NormalizedBatch, School } from '../../../shared/src/score-line'
import {
  normalizeImportBatch,
  resolveSubject,
  validateImportPayload
} from '../../../shared/src/score-line'
import {
  POSTGRAD_CATEGORIES,
  POSTGRAD_TRACKS,
  UPGRADE_CATEGORIES,
  UPGRADE_TRACKS,
  normalizeDimension
} from '../../../shared/src/score-line-dimension'
import type { DimensionKind, DimensionValue } from '../../../shared/src/score-line-dimension'
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

function inferFrom(table: DimensionValue[], text: string): string {
  let best: { value: string; length: number } | null = null
  for (const item of table) {
    for (const token of [item.value, item.label, ...item.aliases]) {
      const key = token.replace(/\s+/g, '')
      if (!key || !text.includes(key)) continue
      if (!best || key.length > best.length) best = { value: item.value, length: key.length }
    }
  }
  return best?.value ?? ''
}

function tablesFor(kind: DimensionKind, exam?: ExamType): DimensionValue[][] {
  if (kind === 'category') {
    return exam === 'postgrad'
      ? [POSTGRAD_CATEGORIES]
      : exam === 'upgrade'
        ? [UPGRADE_CATEGORIES]
        : [POSTGRAD_CATEGORIES, UPGRADE_CATEGORIES]
  }
  return exam === 'postgrad'
    ? [POSTGRAD_TRACKS]
    : exam === 'upgrade'
      ? [UPGRADE_TRACKS]
      : [POSTGRAD_TRACKS, UPGRADE_TRACKS]
}

/** 从标题里认学硕 / 专硕 / 普通类 / 建档立卡，避免同一唯一键互相覆盖；认不出留空。 */
export function inferCategory(title: string, exam?: ExamType): string {
  const text = String(title ?? '')
  for (const table of tablesFor('category', exam)) {
    const found = inferFrom(table, text)
    if (found) return found
  }
  return ''
}

/** 从标题里认学科门类 / 科类；按考试分表，取最长命中，认不出留空。 */
export function inferTrack(title: string, exam?: ExamType): string {
  const text = String(title ?? '')
  for (const table of tablesFor('track', exam)) {
    const found = inferFrom(table, text)
    if (found) return found
  }
  return ''
}

const DIMENSION_LABELS: Record<DimensionKind, string> = {
  category: '批次 / 学位类型',
  track: '科类 / 学科门类'
}

/** canonical 化维度值；认不出保留原文并记 issue（不猜）。 */
function canonicalDimension(
  kind: DimensionKind,
  exam: ExamType,
  value: string,
  issues: string[]
): string {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const normalized = normalizeDimension(kind, exam, text)
  if (normalized.matched) return normalized.value
  issues.push(`${DIMENSION_LABELS[kind]}认不出：${text}`)
  return text
}

/** 人工导入 / 旧数据补写时也走同一套维度字典；认不出保留原文。 */
export function normalizeBatchDimensions(batch: NormalizedBatch): NormalizedBatch {
  return {
    ...batch,
    category: canonicalDimension('category', batch.exam, batch.category, []),
    track: canonicalDimension('track', batch.exam, batch.track, [])
  }
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

  const dimensionIssues: string[] = []
  const category = canonicalDimension(
    'category',
    raw.exam,
    raw.category || inferCategory(title, raw.exam),
    dimensionIssues
  )
  const track = canonicalDimension(
    'track',
    raw.exam,
    raw.track || inferTrack(title, raw.exam),
    dimensionIssues
  )
  const confidence = dimensionIssues.length
    ? Math.min(raw.confidence ?? 0.7, 0.7)
    : raw.confidence ?? 0.7
  const input = {
    scope: raw.scope,
    exam: raw.exam,
    year: raw.year,
    province: province === '全国' ? '' : province,
    region: raw.region ?? '',
    schoolId,
    programId: raw.programId ?? '',
    category,
    track,
    title,
    sourceName: raw.sourceName || context.sourceName,
    sourceUrl: raw.sourceUrl || context.sourceUrl,
    publishedAt: raw.publishedAt ?? '',
    confidence,
    note: [...issues, ...dimensionIssues].slice(0, 5).join('；'),
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
